// napkiln speech capture — thin wrapper over the Web Speech API that keeps a
// rolling final transcript plus the current interim fragment, auto-restarting
// recognition until stopped.
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class SpeechCapture {
  static available() { return !!Recognition; }

  // onUpdate(finalTranscript, interimFragment) fires on every result;
  // onState('denied'|'error'|'stopped') fires on lifecycle changes.
  start(onUpdate, onState) {
    if (!Recognition || this._active) return false;
    this._active = true;
    this._paused = false;
    this._final = '';
    this._errors = 0;
    const rec = this._rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (e) => {
      this._errors = 0; // the service is alive — reset the failure counter
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this._final += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      if (!this._paused) onUpdate(this._final, interim);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        this._active = false;
        if (onState) onState('denied');
        return;
      }
      // 'no-speech' just means silence — keep listening. Real service errors
      // ('network', 'audio-capture', …) that repeat with no result mean the
      // browser's speech service is broken (common on iOS): report instead of
      // restarting silently forever, so the caller can switch engines.
      if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        this._errors += 1;
        if (this._errors >= 3) {
          this._active = false;
          if (onState) onState('error');
        }
      }
    };
    rec.onend = () => {
      if (this._active && !this._paused) {
        try { rec.start(); } catch (e) { /* already started */ }
      } else if (!this._active && onState) onState('stopped');
    };
    try { rec.start(); } catch (e) { this._active = false; return false; }
    return true;
  }

  pause() { this._paused = true; if (this._rec) try { this._rec.stop(); } catch (e) {} }
  resume() { if (!this._active) return; this._paused = false; if (this._rec) try { this._rec.start(); } catch (e) {} }
  stop() {
    this._active = false; this._paused = false;
    if (this._rec) { try { this._rec.stop(); } catch (e) {} this._rec = null; }
  }
  get transcript() { return this._final || ''; }
}
