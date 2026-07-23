// Live recording (5a, made real) — speech or typed input feeds a rolling
// transcript through the structurer; the thought graph builds on screen as
// you go. ?demo feeds the exploration's scripted transcript instead of a mic.
import { useEffect, useRef, useState } from 'react';
import { INK, TEAL, CLAY, PAPER, dim, teal, sans, mono, abs } from '../theme.js';
import { Confirm, Sheet } from '../components/ui.jsx';
import { createStructurer, getApiKey, setApiKey } from '../lib/structurer.js';
import { neuralEnabled, setNeuralEnabled, neuralAvailable } from '../lib/semantic.js';
import { SpeechCapture } from '../lib/speech.js';
import { WhisperCapture, createCapture, getSttEngine, setSttEngine } from '../lib/whisper.js';
import { TEMPLATES } from './Capture.jsx';

const DEMO_LINES = [
  'The problem is people record voice notes and never listen to them again.',
  'Usually my ideas happen while I am moving around.',
  'What if napkiln could visualize how the idea develops while you talk?',
  'But mind maps always feel too rigid for that.',
  'I wonder if thoughts could contain smaller thoughts?',
];

function LiveGraph({ nodes, edges, freshFrom, typed }) {
  if (!nodes.length) {
    return (
      <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <span style={{ position: 'relative', width: 90, height: 90 }}>
          <span style={{ position: 'absolute', inset: -16, borderRadius: '50%', background: 'radial-gradient(circle,rgba(31,138,150,.13) 0%,rgba(31,138,150,0) 68%)', animation: 'breathe 3.6s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', inset: 8, background: 'linear-gradient(150deg,rgba(31,138,150,.3),rgba(31,138,150,.1))', animation: 'blobB 6s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', inset: 16, background: 'linear-gradient(320deg,#4FA3AE,#177B83)', animation: 'blobA 4.5s ease-in-out infinite' }} />
        </span>
        <span style={sans(400, 12, dim(.45))}>
          {typed ? 'start typing — the structure builds as you go' : 'start talking — napkiln structures quietly'}
        </span>
      </div>
    );
  }
  return nodes.map((n, i) => {
    const fresh = i >= freshFrom;
    return (
      <span key={i} style={{ display: 'contents' }}>
        {i > 0 && (
          <span style={{ position: 'relative', width: 1, height: 22, flex: 'none', background: teal(.45), animation: fresh ? 'buildin .5s ease-out both' : 'none' }}>
            <span style={{ position: 'absolute', left: 9, top: 4, ...sans(400, 11.5, TEAL), whiteSpace: 'nowrap' }}>
              {(edges[i - 1] && edges[i - 1].label) || '·'}
            </span>
          </span>
        )}
        <div style={{
          flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: `rgba(255,255,255,${n.solid ? .65 : .4})`,
          border: n.solid ? `1px solid ${dim(.12)}` : '1px dashed rgba(224,130,78,.5)',
          borderRadius: 12, padding: '10px 20px', maxWidth: 280,
          animation: fresh ? 'buildin .6s ease-out both' : 'none',
        }}>
          <span style={{ ...mono(11, n.c) }}>{n.type}</span>
          <span style={{ ...sans(400, 14, INK), textAlign: 'center' }}>{n.text}</span>
        </div>
      </span>
    );
  });
}

function AISettings({ open, onClose, capLabel, onApply }) {
  const speechOK = SpeechCapture.available();
  const whisperOK = WhisperCapture.available();
  const pref = getSttEngine();
  const [stt, setStt] = useState(whisperOK && (pref === 'local' || capLabel === 'local whisper' || !speechOK) ? 'local' : 'browser');
  const [key, setKey] = useState(getApiKey());
  const [neural, setNeural] = useState(neuralEnabled());

  const save = () => {
    const before = capLabel === 'local whisper' ? 'local' : 'browser';
    setSttEngine(stt);
    setApiKey(key.trim());
    setNeuralEnabled(neural);
    onClose();
    onApply(stt !== before);
  };

  const radio = (id, disabled, title, sub) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: disabled ? 'default' : 'pointer', background: stt === id ? teal(.08) : 'transparent', opacity: disabled ? .45 : 1 }}>
      <input type="radio" name="nk-stt" value={id} checked={stt === id} disabled={disabled} onChange={() => setStt(id)} style={{ marginTop: 3, accentColor: TEAL }} />
      <span>
        <span style={{ display: 'block', ...sans(500, 13.5, INK) }}>{title}</span>
        <span style={{ ...sans(400, 11.5, dim(.5)), lineHeight: 1.4 }}>{sub}</span>
      </span>
    </label>
  );

  return (
    <Sheet open={open} onClose={onClose} zIndex={45}>
      <div style={{ ...sans(500, 14, INK), marginBottom: 10 }}>AI settings</div>
      <div style={{ ...mono(10, dim(.45)), margin: '0 0 6px' }}>TRANSCRIPTION</div>
      {radio('browser', !speechOK, 'Browser speech', 'fast; audio goes to the browser’s speech service')}
      {radio('local', !whisperOK, 'Local Whisper', 'fully on-device · ~40 MB one-time model download')}
      <div style={{ ...mono(10, dim(.45)), margin: '14px 0 6px' }}>STRUCTURING</div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 12px 12px', borderRadius: 12, cursor: neuralAvailable() ? 'pointer' : 'default', opacity: neuralAvailable() ? 1 : .45 }}>
        <input type="checkbox" className="nk-neural" checked={neural} disabled={!neuralAvailable()} onChange={(e) => setNeural(e.target.checked)} style={{ marginTop: 3, accentColor: TEAL }} />
        <span>
          <span style={{ display: 'block', ...sans(500, 13.5, INK) }}>Neural boost</span>
          <span style={{ ...sans(400, 11.5, dim(.5)), lineHeight: 1.4 }}>small local models sharpen box types and cut off-topic fluff · ~50 MB one-time, fully on-device</span>
        </span>
      </label>
      <input
        className="nk-aikey" type="password" value={key} onChange={(e) => setKey(e.target.value)}
        placeholder="Anthropic API key — empty = on-device engine"
        style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${dim(.15)}`, borderRadius: 12, background: 'rgba(240,239,236,.6)', padding: '11px 13px', outline: 'none', ...sans(400, 13, INK) }}
      />
      <div style={{ ...sans(400, 11, dim(.45)), marginTop: 5 }}>With a key, structuring runs on Claude; the key is stored only in this browser.</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button data-a="cancel" onClick={onClose} style={{ height: 42, padding: '0 18px', borderRadius: 21, border: `1px solid ${dim(.18)}`, background: 'none', ...sans(500, 13, INK), cursor: 'pointer' }}>Cancel</button>
        <button data-a="save" onClick={save} style={{ height: 42, padding: '0 22px', borderRadius: 21, border: 'none', background: INK, color: PAPER, ...sans(500, 13), cursor: 'pointer' }}>Save</button>
      </div>
    </Sheet>
  );
}

export default function Record({ template, recordFolder, demo, typedMode, initialTranscript, onDone, onCancel }) {
  const [typed, setTyped] = useState(typedMode || false);
  const [attempt, setAttempt] = useState(0); // bumped to restart capture after engine change
  const forceBrowserRef = useRef(false);
  const [graph, setGraph] = useState({ nodes: [], edges: [], freshFrom: 0 });
  const [status, setStatus] = useState(null); // null = derive default
  const [paused, setPaused] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [settings, setSettings] = useState(false);
  const [strip, setStrip] = useState(initialTranscript || '');

  const structurerRef = useRef(null);
  if (!structurerRef.current) structurerRef.current = createStructurer();
  const stateRef = useRef({ transcript: initialTranscript || '', interim: '', nodes: [], edges: [] });
  const capRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef({ busy: false, dirty: false });
  const aliveRef = useRef(true);

  const tplName = template && template !== 'free' ? (TEMPLATES.find((t) => t.id === template) || {}).name : null;
  const engineLabel = () => structurerRef.current.engine;
  const defaultStatus = () => (typed ? 'typing' : 'listening') + ' · ' + engineLabel();

  const run = async () => {
    const b = busyRef.current;
    if (b.busy) { b.dirty = true; return; }
    b.busy = true;
    const s = stateRef.current;
    const text = (s.transcript + ' ' + s.interim).trim();
    if (text) {
      const g = await structurerRef.current.structure(text, { template: tplName });
      if (aliveRef.current) {
        const prev = s.nodes.length;
        s.nodes = g.nodes; s.edges = g.edges;
        setGraph({ nodes: g.nodes, edges: g.edges, freshFrom: prev });
      }
    } else if (aliveRef.current) {
      s.nodes = []; s.edges = [];
      setGraph({ nodes: [], edges: [], freshFrom: 0 });
    }
    b.busy = false;
    if (b.dirty) { b.dirty = false; schedule(); }
  };
  const schedule = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(run, structurerRef.current.engine === 'Claude' ? 1200 : 350);
  };

  // Capture lifecycle (speech mode) or demo feeder
  useEffect(() => {
    aliveRef.current = true;
    if (stateRef.current.transcript) schedule();
    if (demo) {
      let i = 0;
      const feed = setInterval(() => {
        if (i >= DEMO_LINES.length) { clearInterval(feed); return; }
        stateRef.current.transcript = (stateRef.current.transcript + ' ' + DEMO_LINES[i++]).trim();
        setStrip(stateRef.current.transcript);
        schedule();
      }, 1800);
      return () => { aliveRef.current = false; clearInterval(feed); clearTimeout(timerRef.current); };
    }
    if (!typed) {
      const cap = createCapture(forceBrowserRef.current);
      if (!cap) { setTyped(true); return; }
      capRef.current = cap;
      const base = stateRef.current.transcript ? stateRef.current.transcript.replace(/\s+$/, '') + ' ' : '';
      const ok = cap.start((final, interim) => {
        if (!aliveRef.current) return;
        stateRef.current.transcript = base + final;
        stateRef.current.interim = interim;
        setStrip((stateRef.current.transcript + ' ' + interim).trim());
        schedule();
      }, (st) => {
        if (!aliveRef.current) return;
        if (st === 'denied') setTyped(true);
        else if (st === 'error') {
          if (cap.label === 'local whisper' && SpeechCapture.available()) { forceBrowserRef.current = true; setAttempt((a) => a + 1); }
          else setTyped(true);
        }
        else if (st === 'loading') setStatus('downloading local model…');
        else if (st === 'ready') setStatus(null);
      });
      if (!ok) { setTyped(true); return; }
      return () => {
        aliveRef.current = false;
        clearTimeout(timerRef.current);
        cap.stop();
        capRef.current = null;
      };
    }
    return () => { aliveRef.current = false; clearTimeout(timerRef.current); };
  }, [typed, attempt, demo]);

  const finish = () => {
    const s = stateRef.current;
    if (capRef.current) { capRef.current.stop(); capRef.current = null; }
    if (!s.nodes.length) { onDone(null); return; }
    const t = s.nodes.find((n) => n.type === 'OPPORTUNITY' || n.type === 'IDEA') || s.nodes[0];
    let title = t.text.replace(/[?.]$/, '');
    if (title.length > 34) title = title.slice(0, 34).replace(/\s\S*$/, '') + '…';
    onDone({ nodes: s.nodes, edges: s.edges, title: title.charAt(0).toUpperCase() + title.slice(1) });
  };

  const togglePause = () => {
    const p = !paused;
    setPaused(p);
    if (capRef.current) { p ? capRef.current.pause() : capRef.current.resume(); }
  };

  const stripTail = strip.length > 110 ? '…' + strip.slice(-110) : strip;

  return (
    <div style={abs({ inset: 0 })}>
      <div style={{ ...abs({ top: 74, left: 0, right: 0 }), display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <span style={{ ...sans(600, 15, INK), letterSpacing: '-.01em' }}>napkiln</span>
        <span
          className="nk-status" title="tap for AI settings" onClick={() => setSettings(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, ...sans(500, 11, paused ? dim(.5) : TEAL), cursor: 'pointer' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: paused ? dim(.4) : TEAL, animation: paused ? 'none' : 'breathe 2s ease-in-out infinite' }} />
          {paused ? 'paused' : (status || defaultStatus())}
        </span>
      </div>
      {recordFolder && (
        <div style={{ ...abs({ top: 104, left: 0, right: 0 }), textAlign: 'center', ...sans(400, 12, dim(.45)) }}>
          adding to <span style={{ color: TEAL, fontWeight: 500 }}>{recordFolder.toLowerCase()}</span>
        </div>
      )}
      {tplName && (
        <div style={{ ...abs({ top: recordFolder ? 122 : 104, left: 0, right: 0 }), textAlign: 'center', ...sans(400, 11, dim(.35)) }}>
          shape: {tplName.toLowerCase()}
        </div>
      )}

      <div className="nk-livegraph" style={{ ...abs({ top: 140, bottom: typed ? 270 : 235, left: 24, right: 24 }), overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LiveGraph nodes={graph.nodes} edges={graph.edges} freshFrom={graph.freshFrom} typed={typed} />
      </div>

      {typed ? (
        <textarea
          className="nk-typebox" autoFocus defaultValue={stateRef.current.transcript}
          placeholder="Type your thought — napkiln structures as you go…"
          onChange={(e) => { stateRef.current.transcript = e.target.value; schedule(); }}
          style={{
            ...abs({ bottom: 135, left: 24, right: 24 }), height: 112, boxSizing: 'border-box', resize: 'none',
            border: `1px solid ${dim(.15)}`, borderRadius: 14, background: 'rgba(255,255,255,.75)',
            padding: '12px 14px', outline: 'none', ...sans(400, 13.5, INK), lineHeight: 1.5,
          }}
        />
      ) : (
        <>
          <div className="nk-transcript" style={{ ...abs({ bottom: 160, left: 40, right: 40 }), maxHeight: 64, overflow: 'hidden', textAlign: 'center', ...sans(400, 15, dim(.45)), lineHeight: 1.5 }}>
            {stripTail}
          </div>
          <div style={{ ...abs({ bottom: 130, left: 0, right: 0 }), display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 3, height: 16 }}>
            {[1, .8, 1.15, .9, 1.05].map((t, i) => (
              <span key={i} style={{ width: 3, height: 14, borderRadius: 2, background: TEAL, animation: paused ? 'none' : `eq ${t}s ease-in-out ${i * .12}s infinite`, transformOrigin: 'bottom' }} />
            ))}
          </div>
        </>
      )}

      <div style={{ ...abs({ bottom: 56, left: 0, right: 0 }), display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <button className="nk-rcancel" onClick={() => setConfirmCancel(true)} style={{ height: 56, padding: '0 20px', borderRadius: 28, border: `1px solid ${dim(.2)}`, background: 'none', ...sans(500, 14, dim(.6)), cursor: 'pointer' }}>
          Cancel
        </button>
        {!typed && !demo && (
          <button className="nk-pause" onClick={togglePause} style={{ width: 56, height: 56, borderRadius: '50%', border: `1px solid ${dim(.18)}`, background: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {paused
              ? <span style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: `14px solid ${INK}`, marginLeft: 3 }} />
              : <span style={{ display: 'flex', gap: 5 }}><span style={{ width: 4, height: 16, borderRadius: 2, background: INK }} /><span style={{ width: 4, height: 16, borderRadius: 2, background: INK }} /></span>}
          </button>
        )}
        <button className="nk-done" onClick={finish} style={{ height: 56, padding: '0 30px', borderRadius: 28, border: 'none', background: INK, color: PAPER, ...sans(500, 16), cursor: 'pointer' }}>
          Done
        </button>
      </div>

      {confirmCancel && (
        <Confirm
          title="Discard this recording?" body="Nothing will be saved."
          confirmLabel="Discard" cancelLabel="Keep going"
          onConfirm={() => { if (capRef.current) { capRef.current.stop(); capRef.current = null; } onCancel(); }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
      <AISettings
        open={settings} onClose={() => setSettings(false)}
        capLabel={capRef.current && capRef.current.label}
        onApply={(sttChanged) => {
          structurerRef.current = createStructurer();
          setStatus(null);
          if (sttChanged && !typed && !demo) { forceBrowserRef.current = false; setAttempt((a) => a + 1); }
          else schedule();
        }}
      />
    </div>
  );
}
