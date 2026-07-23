// napkiln local transcription — Whisper running fully in the browser via
// transformers.js (WebGPU when available, WASM otherwise). Audio never leaves
// the device: mic PCM is captured via MediaStreamTrackProcessor (falling back
// to an AudioWorklet where unsupported), split at pauses by simple energy
// segmentation, and each segment transcribed locally. The model
// (whisper-tiny.en, ~40 MB) is fetched once and cached by the browser.
// Same interface as SpeechCapture: start(onUpdate, onState) / pause / resume / stop.
import { SpeechCapture } from './speech.js';

const LIB_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm';
const MODEL_ID = 'onnx-community/whisper-tiny.en';
const TARGET_RATE = 16000;      // whisper's expected sample rate
const SILENCE_RMS = 0.008;      // below this, a chunk counts as silence
const SILENCE_HOLD_S = 0.75;    // this much silence after speech closes a segment
const MAX_SEG_S = 20;           // hard cap per segment (whisper works on ≤30s)
const INTERIM_EVERY_MS = 1500;
const STT_KEY = 'napkiln-stt';

let asrPromise = null;
function loadAsr() {
  if (!asrPromise) {
    asrPromise = import(/* @vite-ignore */ LIB_URL).then((tf) => {
      const device = navigator.gpu ? 'webgpu' : 'wasm';
      return tf.pipeline('automatic-speech-recognition', MODEL_ID, {
        device,
        dtype: device === 'webgpu' ? 'fp32' : 'q8',
      });
    });
    asrPromise.catch(() => { asrPromise = null; }); // allow retry after a failed load
  }
  return asrPromise;
}

export class WhisperCapture {
  static available() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.WebAssembly &&
      (window.MediaStreamTrackProcessor || (window.AudioWorkletNode && window.AudioContext)));
  }
  constructor() { this.label = 'local whisper'; }

  start(onUpdate, onState) {
    if (this._active) return false;
    this._active = true; this._paused = false; this._busy = false;
    this._final = ''; this._seg = []; this._segLen = 0; this._silence = 0; this._hasSpeech = false;
    this._rate = TARGET_RATE;
    this._onUpdate = onUpdate; this._onState = onState || (() => {});
    this._boot();
    return true;
  }

  async _boot() {
    try {
      this._onState('loading');
      const [asr, stream] = await Promise.all([
        loadAsr(),
        navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        }),
      ]);
      if (!this._active) { stream.getTracks().forEach((t) => t.stop()); return; }
      this._asr = asr; this._stream = stream;
      if (window.MediaStreamTrackProcessor) await this._captureViaTrackProcessor(stream);
      else await this._captureViaWorklet(stream);
      this._timer = setInterval(() => this._tick(), INTERIM_EVERY_MS);
      this._onState('ready');
    } catch (e) {
      this._active = false;
      this._onState(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'error');
    }
  }

  // Primary path: WebCodecs track processor — a plain ReadableStream of
  // AudioData, no audio graph that needs pulling.
  async _captureViaTrackProcessor(stream) {
    const track = stream.getAudioTracks()[0];
    const reader = this._reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
    const pump = async () => {
      try {
        while (this._active) {
          const { value, done } = await reader.read();
          if (done || !this._active) break;
          this._rate = value.sampleRate || this._rate;
          const buf = new Float32Array(value.numberOfFrames);
          try { value.copyTo(buf, { planeIndex: 0, format: 'f32-planar' }); }
          catch (e) { value.copyTo(buf, { planeIndex: 0 }); }
          value.close();
          this._push(buf);
        }
      } catch (e) { /* reader cancelled on stop */ }
    };
    pump();
  }

  // Fallback: AudioWorklet capture routed through a muted gain (the graph is
  // only pulled — and process() only called — when it reaches the destination).
  async _captureViaWorklet(stream) {
    const ctx = this._ctx = new AudioContext();
    this._rate = ctx.sampleRate;
    await ctx.resume().catch(() => {});
    const worklet = "class NkPcm extends AudioWorkletProcessor{process(i){const c=i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('nk-pcm',NkPcm)";
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([worklet], { type: 'text/javascript' })));
    const node = new AudioWorkletNode(ctx, 'nk-pcm');
    node.port.onmessage = (e) => this._push(e.data);
    ctx.createMediaStreamSource(stream).connect(node);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    node.connect(mute).connect(ctx.destination);
  }

  _push(chunk) {
    if (!this._active || this._paused) return;
    this._seg.push(chunk); this._segLen += chunk.length;
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
    if (Math.sqrt(sum / chunk.length) > SILENCE_RMS) { this._hasSpeech = true; this._silence = 0; }
    else this._silence += chunk.length / this._rate;
    const segS = this._segLen / this._rate;
    if (this._hasSpeech && (this._silence > SILENCE_HOLD_S || segS > MAX_SEG_S)) this._finalize();
    else if (!this._hasSpeech && segS > 3) { this._seg = []; this._segLen = 0; this._silence = 0; }
  }

  // Concatenate the segment and downsample from the capture rate to the
  // 16 kHz whisper expects (linear interpolation is plenty for speech)
  _audio() {
    const a = new Float32Array(this._segLen);
    let o = 0;
    for (const c of this._seg) { a.set(c, o); o += c.length; }
    if (this._rate === TARGET_RATE) return a;
    const ratio = this._rate / TARGET_RATE;
    const out = new Float32Array(Math.floor(a.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const p = i * ratio, lo = Math.floor(p), hi = Math.min(lo + 1, a.length - 1);
      out[i] = a[lo] + (a[hi] - a[lo]) * (p - lo);
    }
    return out;
  }

  async _transcribe(audio) {
    const r = await this._asr(audio);
    return (r && r.text ? r.text : '').replace(/\[[^\]]*\]|\([^)]*\)/g, '').trim();
  }

  _finalize() {
    const audio = this._audio();
    this._seg = []; this._segLen = 0; this._silence = 0; this._hasSpeech = false;
    // Chain finals so segments append in order even if inference overlaps
    this._chain = (this._chain || Promise.resolve()).then(async () => {
      if (!this._asr) return;
      const text = await this._transcribe(audio);
      if (text) { this._final += text + ' '; if (this._active) this._onUpdate(this._final, ''); }
    }).catch(() => {});
  }

  async _tick() {
    if (!this._active || this._paused || this._busy || !this._hasSpeech) return;
    if (this._segLen / this._rate < 1) return;
    this._busy = true;
    try {
      const text = await this._transcribe(this._audio());
      if (this._active && this._hasSpeech && text) this._onUpdate(this._final, text);
    } catch (e) { /* interim pass is best-effort */ }
    this._busy = false;
  }

  pause() { this._paused = true; if (this._ctx) this._ctx.suspend().catch(() => {}); }
  resume() { if (!this._active) return; this._paused = false; if (this._ctx) this._ctx.resume().catch(() => {}); }
  stop() {
    if (this._hasSpeech && this._segLen) this._finalize(); // best-effort flush of the tail
    this._active = false;
    clearInterval(this._timer);
    if (this._reader) { this._reader.cancel().catch(() => {}); this._reader = null; }
    if (this._stream) this._stream.getTracks().forEach((t) => t.stop());
    if (this._ctx) { this._ctx.close().catch(() => {}); this._ctx = null; }
    this._stream = null;
    this._onState('stopped');
  }
  get transcript() { return this._final || ''; }
}

export function getSttEngine() { try { return localStorage.getItem(STT_KEY) || 'auto'; } catch (e) { return 'auto'; } }
export function setSttEngine(v) {
  try { v && v !== 'auto' ? localStorage.setItem(STT_KEY, v) : localStorage.removeItem(STT_KEY); } catch (e) { /* private mode */ }
}
// force: 'browser' | 'local' overrides the stored preference (used when one
// engine fails at runtime and the app hops to the other).
export function createCapture(force) {
  const pref = force === true ? 'browser' : force || getSttEngine();
  const browser = () => { const c = new SpeechCapture(); c.label = 'browser speech'; return c; };
  if (pref === 'local' && WhisperCapture.available()) return new WhisperCapture();
  if (pref === 'browser' && SpeechCapture.available()) return browser();
  if (SpeechCapture.available()) return browser();
  if (WhisperCapture.available()) return new WhisperCapture();
  return null;
}
