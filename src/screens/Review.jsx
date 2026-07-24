// Post-Done review (7a) + saved stage + thought preview (9d).
// Hold (long-press) or right-click a box → edit / re-record / delete bubbles.
import { useEffect, useRef, useState } from 'react';
import { INK, TEAL, CLAY, PAPER, dim, teal, clay, sans, mono, abs } from '../theme.js';
import { Confirm, MicIcon, RoundBtn, Snack, TrashIcon } from '../components/ui.jsx';
import { createCapture } from '../lib/whisper.js';
import { summarizeClause } from '../lib/structurer.js';

const DEMO_NODES = [
  { type: 'PROBLEM', c: TEAL, text: 'voice notes go unheard', solid: true, source: 'People record these long voice memos and then never actually listen back to them' },
  { type: 'CONTEXT', c: TEAL, text: 'ideas happen while moving', solid: false, source: 'The best ideas always show up mid-walk or on the commute' },
  { type: 'OPPORTUNITY', c: TEAL, text: 'visualize how the idea develops', solid: true, source: "It'd be cool to watch the thought take shape as you speak" },
  { type: 'CONSTRAINT', c: CLAY, text: 'mind maps feel rigid', solid: true, source: 'But mind maps feel too rigid and kind of kill the flow' },
  { type: 'OPEN QUESTION', c: CLAY, text: 'thoughts containing smaller thoughts?', solid: false, source: 'I wonder if a thought could hold smaller thoughts inside it' },
];
const DEMO_EDGES = [{ label: 'led to' }, { label: 'so' }, { label: 'but' }, { label: 'raises' }];
const RERECORD = [
  'people record and never listen back',
  'ideas show up mid-walk, mid-commute',
  'watch the thought take shape as you speak',
  'rigid diagrams kill the flow',
  'is zooming in how you go deeper?',
];
const FOLDER_SPOTS = {
  'Product ideas': ['22%', '30%'], 'Story ideas': ['62%', '42%'], 'Career': ['42%', '74%'],
  'Personal questions': ['48%', '70%'], 'New folder…': ['80%', '68%'], 'Let napkiln decide': ['50%', '50%'],
};

function Box({ n, i, focus, editing, listening, micStatus, onCommit, onBubble, bind, preview }) {
  const me = focus === i;
  const focusOn = focus >= 0;
  const inputRef = useRef(null);
  useEffect(() => { if (editing === i && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing, i]);
  return (
    <div
      data-i={i} {...bind(i)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: `rgba(255,255,255,${n.solid ? .65 : .45})`,
        border: n.solid ? `1px solid ${dim(me ? .4 : .12)}` : `1px dashed ${clay(me ? .9 : .5)}`,
        borderRadius: 12, padding: preview ? '9px 14px' : '11px 18px', cursor: 'pointer',
        maxWidth: preview ? 215 : 250, transition: 'filter .25s,opacity .25s',
        ...(focusOn && !me ? { filter: 'blur(2.5px)', opacity: .4 } : {}),
        ...(me ? { boxShadow: `0 6px 20px ${dim(.12)}` } : {}),
      }}
    >
      <span style={mono(9, n.c)}>{n.type}</span>
      {editing === i
        ? <input
            ref={inputRef} className="g2-input" defaultValue={n.text}
            onKeyDown={(e) => { if (e.key === 'Enter') onCommit(i, e.target.value); }}
            onBlur={(e) => onCommit(i, e.target.value)}
            style={{ border: 'none', borderBottom: `1px solid ${TEAL}`, background: 'none', outline: 'none', ...sans(400, 14, INK), textAlign: 'center', width: 210, padding: '0 0 2px' }}
          />
        : <span style={{ ...sans(400, 14, INK), lineHeight: 1.35, textAlign: 'center' }}>{n.text}</span>}
      {me && n.source && editing !== i && listening !== i && (
        <span
          className="g2-source"
          style={{ marginTop: 7, paddingTop: 7, maxWidth: 226, borderTop: `1px solid ${dim(.09)}`, ...sans(400, 11.5, dim(.55)), fontStyle: 'italic', lineHeight: 1.4, textAlign: 'center' }}
        >
          <span style={{ ...mono(8, TEAL), fontStyle: 'normal', display: 'block', marginBottom: 2, letterSpacing: '.06em' }}>YOU SAID</span>
          “{n.source}”
        </span>
      )}
      {listening === i && (
        <span
          className="g2-micchip"
          onClick={(e) => { e.stopPropagation(); onBubble('micstop', i); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, background: teal(.12), borderRadius: 14, padding: '6px 12px', cursor: 'pointer' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, animation: 'breathe 1.4s ease-in-out infinite' }} />
          <span style={sans(500, 12.5, TEAL)}>{micStatus || 're-recording — tap to finish'}</span>
        </span>
      )}
      {me && editing < 0 && listening < 0 && (
        <span style={{ position: 'absolute', right: -52, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 6 }}>
          <RoundBtn onClick={() => onBubble('edit', i)}>✎</RoundBtn>
          <RoundBtn onClick={() => onBubble('mic', i)}><MicIcon color={TEAL} /></RoundBtn>
          <RoundBtn onClick={() => onBubble('del', i)}><TrashIcon color={CLAY} /></RoundBtn>
        </span>
      )}
    </div>
  );
}

export default function Review({ graph, stage, mode, folders, onSaved, onBack, onTalk, onSpace, onNew, onStageChange }) {
  const dynamic = !!(graph && graph.nodes && graph.nodes.length);
  const [nodes, setNodes] = useState(() => (dynamic ? graph.nodes.map((n) => ({ ...n })) : DEMO_NODES.map((n) => ({ ...n }))));
  const edges = dynamic ? graph.edges || [] : DEMO_EDGES;
  const [title, setTitle] = useState((graph && graph.title) || 'Ideas while moving');
  const [folder, setFolder] = useState('Product ideas');
  const [focus, setFocus] = useState(-1);
  const [editing, setEditing] = useState(-1);
  const [listening, setListening] = useState(-1);
  const [ddOpen, setDdOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(-1);
  const [snack, setSnack] = useState(null);
  const [editTitle, setEditTitle] = useState(false);
  const holdRef = useRef(null);
  const preview = mode === 'preview';

  const say = (text) => setSnack({ text, at: Date.now() });
  const commitEdit = (i, v) => {
    if (v.trim()) setNodes((ns) => ns.map((n, k) => (k === i ? { ...n, text: v.trim() } : n)));
    setEditing(-1); setFocus(-1);
  };
  const micRef = useRef(null);
  const micHeardRef = useRef(false);
  const [micStatus, setMicStatus] = useState(null);
  const stopMic = (commit) => {
    if (micRef.current) { micRef.current.stop(); micRef.current = null; }
    setListening(-1); setFocus(-1); setMicStatus(null);
    if (commit && micHeardRef.current) say('Box re-recorded');
  };
  useEffect(() => () => { if (micRef.current) micRef.current.stop(); }, []);
  const startMic = (i) => {
    const cap = createCapture();
    // No capture engine (or mic denied below) → inline editing so the flow
    // never dead-ends; the demo graph keeps its scripted swap for flavor
    if (!cap) {
      if (!dynamic) {
        setListening(i);
        setTimeout(() => {
          setNodes((ns) => ns.map((n, k) => (k === i ? { ...n, text: RERECORD[i % RERECORD.length] } : n)));
          setListening(-1); setFocus(-1); say('Box re-recorded');
        }, 1900);
      } else setEditing(i);
      return;
    }
    micHeardRef.current = false;
    micRef.current = cap;
    setListening(i);
    const ok = cap.start((final, interim) => {
      const heard = (final + ' ' + interim).trim();
      if (!heard) return;
      micHeardRef.current = true;
      setMicStatus(null);
      const src = heard.charAt(0).toUpperCase() + heard.slice(1);
      setNodes((ns) => ns.map((n, k) => (k === i ? { ...n, text: summarizeClause(heard), source: src } : n)));
    }, (st) => {
      if (st === 'denied' || st === 'error') { stopMic(false); setEditing(i); }
      else if (st === 'loading') setMicStatus('loading model…');
      else if (st === 'ready') setMicStatus(null);
    });
    if (!ok) { stopMic(false); setEditing(i); }
  };
  const bubble = (a, i) => {
    if (a === 'edit') setEditing(i);
    else if (a === 'del') setConfirmDel(i);
    else if (a === 'mic') startMic(i);
    else if (a === 'micstop') stopMic(true);
  };
  const bind = (i) => ({
    onContextMenu: (e) => { e.preventDefault(); setFocus(i); setEditing(-1); },
    onPointerDown: (e) => {
      if (e.target.closest('.g2-input') || e.target.closest('button')) return;
      holdRef.current = setTimeout(() => setFocus(i), 420);
    },
    onPointerUp: () => clearTimeout(holdRef.current),
    onPointerLeave: () => clearTimeout(holdRef.current),
    onClick: preview ? (e) => { if (!e.target.closest('button') && !e.target.closest('.g2-input')) setFocus(focus === i ? -1 : i); } : undefined,
  });

  const chain = (
    <div
      className="g2-graph"
      onClick={(e) => { if (e.target.closest('[data-i]')) return; if (listening >= 0) { stopMic(true); return; } if (focus >= 0 && editing < 0) setFocus(-1); }}
      style={{ ...abs(preview ? { top: 136, bottom: 196, left: 0, right: 0 } : { top: 106, bottom: 318, left: 0, right: 0 }), overflowY: 'auto', padding: '12px 24px', boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {nodes.map((n, i) => n.hidden ? null : (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && nodes.slice(0, i).some((p) => !p.hidden) && (
              <span style={{ position: 'relative', width: 1, height: 36, background: teal(.45), flex: 'none', opacity: focus >= 0 ? .35 : 1 }}>
                <span style={{ position: 'absolute', left: 9, top: 11, ...sans(400, 12.5, TEAL), whiteSpace: 'nowrap' }}>
                  {(edges[i - 1] && edges[i - 1].label) || '·'}
                </span>
              </span>
            )}
            <Box n={n} i={i} focus={focus} editing={editing} listening={listening} micStatus={micStatus} onCommit={commitEdit} onBubble={bubble} bind={bind} preview={preview} />
          </span>
        ))}
      </div>
    </div>
  );

  if (stage === 'saved') {
    return (
      <div style={{ ...abs({ inset: 0 }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center' }}>
        <span style={{ width: 52, height: 52, borderRadius: '50%', background: teal(.12), display: 'flex', alignItems: 'center', justifyContent: 'center', ...sans(400, 22, TEAL), marginBottom: 22, animation: 'breathe 3s ease-in-out infinite' }}>✓</span>
        <span style={{ ...sans(500, 24, INK), lineHeight: 1.3 }}>{title.trim() || 'Untitled thought'}</span>
        <span style={{ ...sans(400, 13, dim(.5)), marginTop: 14 }}>filed under <span style={{ color: TEAL, fontWeight: 500 }}>{folder}</span></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 28, background: 'rgba(255,255,255,.6)', border: `1px solid ${dim(.1)}`, borderRadius: 16, padding: '10px 16px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, opacity: .7 }} />
          <span style={sans(400, 12, dim(.6))}>it landed near <span style={{ color: INK }}>talking to your notes</span> in your Space</span>
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40, width: '100%', maxWidth: 280 }}>
          <button className="g2-space" onClick={onSpace} style={{ height: 52, borderRadius: 26, border: 'none', background: INK, color: PAPER, ...sans(500, 15), cursor: 'pointer' }}>See it in your Space</button>
          <button className="g2-new" onClick={onNew} style={{ height: 52, borderRadius: 26, border: `1px solid ${dim(.18)}`, background: 'none', ...sans(500, 14, INK), cursor: 'pointer' }}>Start a new thought</button>
          <button onClick={() => onStageChange('review')} style={{ border: 'none', background: 'none', ...sans(400, 13, dim(.5)), cursor: 'pointer', textDecoration: 'underline' }}>back to editing</button>
        </div>
      </div>
    );
  }

  if (preview) {
    return (
      <div style={abs({ inset: 0 })}>
        <div style={{ ...abs({ top: 70, left: 24, right: 24 }), display: 'flex', alignItems: 'center', gap: 10, zIndex: 5 }}>
          <span className="g2-pback" onClick={onBack} style={{ fontSize: 19, color: dim(.5), cursor: 'pointer', padding: '2px 8px 2px 0' }}>←</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {editTitle
                ? <input
                    autoFocus defaultValue={title}
                    onKeyDown={(e) => { if (e.key === 'Enter') { if (e.target.value.trim()) setTitle(e.target.value.trim()); setEditTitle(false); } }}
                    onBlur={(e) => { if (e.target.value.trim()) setTitle(e.target.value.trim()); setEditTitle(false); }}
                    style={{ border: 'none', borderBottom: `1px solid ${TEAL}`, background: 'none', outline: 'none', ...sans(500, 19, INK), padding: '0 0 2px', width: 220 }}
                  />
                : <span className="g2-ptitle" style={sans(500, 19, INK)}>{title}</span>}
              <button className="g2-tedit" onClick={() => setEditTitle(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', ...sans(400, 16, dim(.55)), flex: 'none', padding: '2px 4px' }}>✎</button>
            </span>
            <span style={sans(400, 12, dim(.45))}>today · filed under <span style={{ color: TEAL }}>Product ideas</span> · tap a box to see what you said</span>
          </span>
        </div>
        {chain}
        <div style={{ ...abs({ bottom: 132, left: 24, right: 24 }), display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.5)', border: `1px solid ${dim(.1)}`, borderRadius: 14, padding: '10px 14px', zIndex: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: CLAY, flex: 'none', opacity: .7 }} />
          <span style={{ flex: 1, ...sans(400, 12.5, dim(.6)) }}>connects to <span style={{ color: INK }}>narrator hears you</span> — “a voice that walks with you”</span>
        </div>
        <div style={{ ...abs({ bottom: 56, left: 0, right: 0 }), display: 'flex', justifyContent: 'center', zIndex: 5 }}>
          <button className="g2-cont" onClick={onTalk} style={{ height: 52, padding: '0 30px', borderRadius: 26, border: 'none', background: INK, color: PAPER, ...sans(500, 15), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8CC7CE' }} />Continue this thought
          </button>
        </div>
        {confirmDel >= 0 && (
          <Confirm
            title="Delete this box?" quote={nodes[confirmDel].text}
            onConfirm={() => { setNodes((ns) => ns.map((n, k) => (k === confirmDel ? { ...n, hidden: true } : n))); setFocus(-1); setConfirmDel(-1); say('Box removed'); }}
            onCancel={() => setConfirmDel(-1)}
          />
        )}
        <Snack msg={snack} bottom={200} />
      </div>
    );
  }

  const spot = FOLDER_SPOTS[folder] || ['50%', '50%'];
  return (
    <div style={abs({ inset: 0 })}>
      <div style={{ ...abs({ top: 70, left: 0, right: 0 }), display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', zIndex: 5 }}>
        <span className="g2-rback" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 19, color: dim(.5), padding: '2px 8px 2px 0' }}>←</span>
          <span style={sans(500, 14, INK)}>Your thought</span>
        </span>
        <span style={sans(400, 12, dim(.4))}>hold a box — see what you said</span>
      </div>
      {chain}
      <div className="g2-panel" style={{ ...abs({ left: 0, right: 0, bottom: 0 }), height: 304, background: '#FFF', borderTop: `1px solid ${dim(.1)}`, boxShadow: `0 -6px 24px ${dim(.06)}`, padding: '16px 24px 26px', boxSizing: 'border-box', zIndex: 10 }}>
        <input
          className="g2-name" placeholder="Name this thought" value={title} onChange={(e) => setTitle(e.target.value)}
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: `1px solid ${teal(.45)}`, background: 'none', outline: 'none', ...sans(500, 18, INK), padding: '0 0 6px', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={sans(400, 12, dim(.5))}>file under</span>
          <span style={{ position: 'relative', flex: 1 }}>
            <button className="g2-dd" onClick={() => setDdOpen(!ddOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${dim(.15)}`, background: 'rgba(255,255,255,.7)', borderRadius: 16, padding: '8px 14px', ...sans(500, 12.5, TEAL), cursor: 'pointer', maxWidth: '100%' }}>
              <span className="g2-ddv">{folder}</span><span style={{ fontSize: 10, opacity: .5, color: INK }}>▾</span>
            </button>
            {ddOpen && (
              <span className="g2-ddlist" style={{ position: 'absolute', left: 0, bottom: 42, minWidth: 200, background: '#FFF', border: `1px solid ${dim(.12)}`, borderRadius: 14, boxShadow: `0 10px 30px ${dim(.16)}`, padding: 6, zIndex: 30, display: 'flex', flexDirection: 'column' }}>
                {[...folders, 'New folder…', 'Let napkiln decide'].map((f) => (
                  <button key={f} data-f={f} onClick={() => { setFolder(f); setDdOpen(false); }} style={{ border: 'none', background: f === folder ? teal(.1) : 'none', borderRadius: 9, padding: '9px 12px', ...sans(500, 13, f === folder ? TEAL : INK), cursor: 'pointer', textAlign: 'left' }}>
                    {f === folder ? '✓ ' : ''}{f}
                  </button>
                ))}
              </span>
            )}
          </span>
        </div>
        <div style={{ position: 'relative', height: 72, border: `1px solid ${dim(.12)}`, borderRadius: 12, background: 'rgba(240,239,236,.6)', overflow: 'hidden', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: '22%', top: '30%', width: 34, height: 34, borderRadius: '50%', background: 'radial-gradient(circle,rgba(31,138,150,.3),rgba(31,138,150,0) 70%)', transform: 'translate(-50%,-50%)' }} />
          <span style={{ position: 'absolute', left: '62%', top: '42%', width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle,rgba(224,130,78,.3),rgba(224,130,78,0) 70%)', transform: 'translate(-50%,-50%)' }} />
          <span style={{ position: 'absolute', left: '42%', top: '74%', width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle,rgba(120,125,130,.3),rgba(120,125,130,0) 70%)', transform: 'translate(-50%,-50%)' }} />
          <span className="g2-mapdot" style={{ position: 'absolute', left: spot[0], top: spot[1], transform: 'translate(-50%,-50%)', transition: 'left .35s,top .35s' }}>
            <span style={{ display: 'block', width: 9, height: 9, borderRadius: '50%', background: TEAL, boxShadow: `0 0 0 4px ${teal(.18)}` }} />
          </span>
          <span style={{ position: 'absolute', right: 9, bottom: 6, ...sans(400, 11, dim(.45)) }}>where it lands in your Space</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="g2-talk" onClick={onTalk} style={{ flex: 'none', height: 50, padding: '0 20px', borderRadius: 25, border: `1px solid ${dim(.18)}`, background: 'none', ...sans(500, 13.5, INK), cursor: 'pointer' }}>Keep talking</button>
          <button className="g2-save" onClick={() => onSaved({ title, folder })} style={{ flex: 1, height: 50, borderRadius: 25, border: 'none', background: INK, color: PAPER, ...sans(500, 15), cursor: 'pointer' }}>Save</button>
        </div>
      </div>
      {confirmDel >= 0 && (
        <Confirm
          title="Delete this box?" quote={nodes[confirmDel].text}
          onConfirm={() => { setNodes((ns) => ns.map((n, k) => (k === confirmDel ? { ...n, hidden: true } : n))); setFocus(-1); setConfirmDel(-1); say('Box removed'); }}
          onCancel={() => setConfirmDel(-1)}
        />
      )}
      <Snack msg={snack} bottom={322} />
    </div>
  );
}
