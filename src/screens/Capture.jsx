// Capture start (6a) — resting screen with structure-template picker and orb.
import { useState } from 'react';
import { INK, TEAL, CLAY, dim, teal, sans, mono, abs } from '../theme.js';
import { Orb, Sheet } from '../components/ui.jsx';

export const TEMPLATES = [
  { id: 'free', name: 'Free flow', desc: 'napkiln decides the shape while you talk', ghost: [] },
  { id: 'ps', name: 'Problem → Solution', desc: 'problem, audience, opportunity, constraint, open questions', ghost: ['PROBLEM', 'AUDIENCE', 'OPPORTUNITY', 'CONSTRAINT', 'OPEN QUESTION'] },
  { id: 'seq', name: 'Sequence', desc: 'purely in order — dreams, stories, how something happened', ghost: ['FIRST', 'THEN', 'THEN', 'FINALLY'] },
  { id: 'cmp', name: 'Weighing options', desc: 'options side by side with benefits and concerns', ghost: ['OPTION A', 'OPTION B', 'CONCERNS'] },
  { id: 'q', name: 'Around a question', desc: 'one open question with angles branching off it', ghost: ['QUESTION', 'ANGLE', 'ANGLE'] },
];

export default function Capture({ template, onTemplate, onRecord, onType, onContinueRecent }) {
  const [sheet, setSheet] = useState(false);
  const [pressed, setPressed] = useState(false);
  const t = TEMPLATES.find((x) => x.id === template) || TEMPLATES[0];

  const tapOrb = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 160);
    setTimeout(onRecord, 180);
  };

  return (
    <div style={abs({ inset: 0 })}>
      <div style={{ ...abs({ top: 74, left: 0, right: 0 }), display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <span style={{ ...sans(600, 15, INK), letterSpacing: '-.01em' }}>napkiln</span>
        <span style={sans(400, 12, dim(.4))}>mic off</span>
      </div>
      <div style={{ ...abs({ top: 190, left: 0, right: 0 }), textAlign: 'center', ...sans(400, 22, INK) }}>What are you thinking about?</div>
      <button
        className="cs-pill"
        onClick={() => setSheet(true)}
        style={{
          ...abs({ top: 240, left: '50%' }), transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${dim(.15)}`, background: 'rgba(255,255,255,.6)', borderRadius: 18, padding: '8px 16px',
          ...sans(500, 12.5, TEAL), cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ opacity: .55, color: INK }}>structure:</span> {t.name} <span style={{ opacity: .5, fontSize: 10, color: INK }}>▾</span>
      </button>
      <div style={{ ...abs({ top: 300, left: 0, right: 0 }), display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
        {t.ghost.length === 0
          ? <span style={sans(400, 12.5, dim(.35))}>the shape will follow your thought</span>
          : t.ghost.map((g, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <span style={{ width: 1, height: 12, background: teal(.3) }} />}
              <span style={{ ...mono(10.5, dim(.3)), border: `1px dashed ${dim(.18)}`, borderRadius: 9, padding: '5px 12px', background: 'rgba(255,255,255,.35)' }}>{g}</span>
            </span>
          ))}
      </div>
      <Orb
        className="cs-orb"
        label="tap to talk"
        onClick={tapOrb}
        style={{
          position: 'absolute', bottom: 246, left: '50%',
          transform: `translateX(-50%) scale(${pressed ? .94 : 1})`, transition: 'transform .15s',
        }}
      />
      <div className="cs-type" style={{ ...abs({ bottom: 196, left: 0, right: 0 }), textAlign: 'center', ...sans(400, 12.5, dim(.4)) }}>
        or <span onClick={onType} style={{ textDecoration: 'underline', cursor: 'pointer' }}>type instead</span>
      </div>
      <div
        onClick={onContinueRecent}
        style={{
          ...abs({ bottom: 134, left: 24, right: 24 }), display: 'flex', alignItems: 'center', gap: 9,
          background: 'rgba(255,255,255,.5)', border: `1px solid ${dim(.1)}`, borderRadius: 14, padding: '10px 14px', cursor: 'pointer',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, flex: 'none', opacity: .7 }} />
        <span style={{ flex: 1, ...sans(400, 13, dim(.65)), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ideas while moving</span>
        <span style={{ ...sans(400, 12, dim(.4)), flex: 'none' }}>continue ›</span>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <div style={{ ...sans(500, 13, INK), marginBottom: 2 }}>How should this thought take shape?</div>
        <div style={{ ...sans(400, 12.5, dim(.45)), marginBottom: 12 }}>You can always reshape it afterwards.</div>
        {TEMPLATES.map((x) => {
          const on = x.id === (template || 'free');
          return (
            <div
              key={x.id}
              data-tpl={x.id}
              onClick={() => { onTemplate(x.id); setSheet(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, cursor: 'pointer', background: on ? teal(.1) : 'transparent' }}
            >
              <span style={{ flex: 'none', width: 18, height: 18, borderRadius: '50%', border: `2px solid ${on ? TEAL : dim(.25)}`, boxSizing: 'border-box', position: 'relative' }}>
                {on && <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: TEAL }} />}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', ...sans(500, 14, INK) }}>
                  {x.name}{x.id === 'free' && <span style={{ ...sans(400, 10.5, CLAY), marginLeft: 4 }}>default</span>}
                </span>
                <span style={{ display: 'block', ...sans(400, 12.5, dim(.5)) }}>{x.desc}</span>
              </span>
            </div>
          );
        })}
      </Sheet>
    </div>
  );
}
