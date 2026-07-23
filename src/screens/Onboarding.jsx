// Three-step intro: brand, how structuring works, mic permission priming.
import { useState } from 'react';
import { INK, TEAL, CLAY, PAPER, dim, teal, sans, mono, abs } from '../theme.js';
import { Orb } from '../components/ui.jsx';

const btnPrimary = {
  width: '100%', height: 52, borderRadius: 26, border: 'none', background: INK,
  color: PAPER, cursor: 'pointer', ...sans(500, 15),
};

function FlowBox({ type, color, text, delay, dashed }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      background: `rgba(255,255,255,${dashed ? .5 : .8})`,
      border: dashed ? '1px dashed rgba(224,130,78,.5)' : `1px solid ${dim(.12)}`,
      borderRadius: 10, padding: '8px 16px', animation: `buildin .6s ease-out ${delay}s both`,
    }}>
      <span style={{ ...mono(10, color), letterSpacing: '.12em' }}>{type}</span>
      <span style={{ ...sans(400, 13, INK) }}>{text}</span>
    </div>
  );
}

const Vline = ({ delay, h = 18 }) => (
  <span style={{ width: 1, height: h, background: teal(.4), animation: `buildin .5s ease-out ${delay}s both` }} />
);

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(1);
  const next = () => (step === 3 ? onDone() : setStep(step + 1));

  const dots = (
    <span style={{ ...abs({ bottom: 132, left: 0, right: 0 }), display: 'flex', justifyContent: 'center', gap: 7 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i === step ? INK : dim(.2) }} />
      ))}
    </span>
  );
  const skip = step < 3 && (
    <span data-ob="skip" onClick={onDone} style={{ ...abs({ top: 74, right: 24 }), ...sans(500, 13, dim(.45)), cursor: 'pointer', padding: 6, zIndex: 2 }}>Skip</span>
  );

  return (
    <div style={{ ...abs({ inset: 0 }), background: PAPER }}>
      {skip}
      {step === 1 && (
        <div style={{ ...abs({ top: 0, bottom: 180, left: 36, right: 36 }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center' }}>
          <Orb size={110} />
          <span style={{ ...sans(600, 26, INK), letterSpacing: '-.01em' }}>napkiln</span>
          <span style={{ ...sans(400, 17, dim(.7)), lineHeight: 1.5 }}>Speak an idea.<br />We’ll help you see its shape.</span>
        </div>
      )}
      {step === 2 && (
        <div style={{ ...abs({ top: 0, bottom: 180, left: 36, right: 36 }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <span style={{ ...sans(400, 14, dim(.55)), lineHeight: 1.5, textAlign: 'center', animation: 'buildin .6s ease-out both' }}>
            “I keep having ideas on walks…<br />but I never open my voice notes again”
          </span>
          <Vline delay={.5} h={26} />
          <FlowBox type="PROBLEM" color={TEAL} text="voice notes go unheard" delay={.8} />
          <Vline delay={1.3} />
          <FlowBox type="OPPORTUNITY" color={TEAL} text="see the idea take shape" delay={1.5} />
          <Vline delay={2} />
          <FlowBox type="OPEN QUESTION" color={CLAY} text="where does it go next?" delay={2.2} dashed />
          <span style={{ ...sans(400, 13, dim(.5)), textAlign: 'center', marginTop: 6, animation: 'buildin .6s ease-out 2.8s both' }}>
            While you talk, napkiln quietly builds<br />the structure of your thought.
          </span>
        </div>
      )}
      {step === 3 && (
        <div style={{ ...abs({ top: 0, bottom: 180, left: 36, right: 36 }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
          <span style={{ width: 72, height: 72, borderRadius: '50%', background: teal(.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ position: 'relative', width: 18, height: 27, display: 'inline-block' }}>
              <span style={{ position: 'absolute', left: 4, top: 0, width: 10, height: 16, borderRadius: 5, background: TEAL }} />
              <span style={{ position: 'absolute', left: 0, top: 9, width: 18, height: 13, border: `2.5px solid ${TEAL}`, borderTop: 'none', borderRadius: '0 0 10px 10px', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', left: 8, bottom: -4, width: 2.5, height: 5, background: TEAL }} />
            </span>
          </span>
          <span style={{ ...sans(500, 19, INK) }}>napkiln needs your microphone</span>
          <span style={{ ...sans(400, 14, dim(.6)), lineHeight: 1.6 }}>
            Only while you’re recording — never in the background. Audio is processed on your device, and you can delete any recording.
          </span>
        </div>
      )}
      {dots}
      <div style={{ ...abs({ bottom: 56, left: 24, right: 24 }), display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button data-ob="next" style={btnPrimary} onClick={next}>{step === 3 ? 'Allow microphone' : 'Continue'}</button>
        {step === 3 && (
          <button style={{ width: '100%', height: 44, borderRadius: 22, border: 'none', background: 'none', ...sans(500, 13.5, dim(.5)), cursor: 'pointer' }} onClick={onDone}>
            Not now — I’ll type instead
          </button>
        )}
      </div>
    </div>
  );
}
