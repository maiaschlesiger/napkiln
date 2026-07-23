// Shared UI primitives: confirm dialog, bottom sheet, snack toast.
import { useEffect, useState } from 'react';
import { INK, dim, sans, dialogWrap, dialogCard, pillBtn, sheetGrip, CLAY, PAPER } from '../theme.js';

export function Confirm({ title, body, quote, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return (
    <div style={dialogWrap} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={dialogCard}>
        <div style={{ ...sans(500, 15, INK), marginBottom: 6 }}>{title}</div>
        {quote && <div style={{ ...sans(400, 13.5, dim(.65)), marginBottom: 6 }}>“{quote}”</div>}
        {body && <div style={{ ...sans(400, 12.5, dim(.6)), lineHeight: 1.5, marginBottom: 16 }}>{body}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: body ? 0 : 16 }}>
          <button style={pillBtn} onClick={onCancel}>{cancelLabel}</button>
          <button style={{ height: 42, padding: '0 20px', borderRadius: 21, border: 'none', background: CLAY, color: PAPER, cursor: 'pointer', ...sans(500, 13) }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, children, zIndex = 21 }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: dim(.25), opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .25s', zIndex: zIndex - 1 }}
      />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, background: '#FFF', borderRadius: '22px 22px 0 0',
        boxShadow: `0 -8px 30px ${dim(.15)}`, padding: '14px 20px 34px', boxSizing: 'border-box',
        transform: open ? 'translateY(0)' : 'translateY(105%)', transition: 'transform .3s cubic-bezier(.3,.8,.4,1)',
        zIndex, maxHeight: '78%', overflowY: 'auto',
      }}>
        <span style={sheetGrip} />
        {children}
      </div>
    </>
  );
}

// Fire-and-forget toast: pass a {text, at} object; re-renders restart the timer.
export function Snack({ msg, bottom = 130 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!msg || !msg.text) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <div style={{
      position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom,
      background: INK, color: PAPER, borderRadius: 18, padding: '9px 18px',
      ...sans(400, 12.5), opacity: visible ? 1 : 0, pointerEvents: 'none',
      transition: 'opacity .25s', whiteSpace: 'nowrap', zIndex: 30,
    }}>{msg && msg.text}</div>
  );
}

export function Orb({ size = 150, label, onClick, style, className }) {
  return (
    <div className={className} onClick={onClick} style={{ position: 'relative', width: size, height: size, cursor: onClick ? 'pointer' : 'default', ...style }}>
      <span style={{ position: 'absolute', inset: -size * .16, borderRadius: '50%', background: 'radial-gradient(circle,rgba(31,138,150,.12) 0%,rgba(31,138,150,0) 68%)', animation: 'breathe 4.5s ease-in-out infinite' }} />
      <span style={{ position: 'absolute', inset: size * .093, background: 'linear-gradient(150deg,rgba(31,138,150,.26),rgba(31,138,150,.08))', animation: 'blobB 8s ease-in-out infinite' }} />
      <span style={{ position: 'absolute', inset: size * .173, background: 'linear-gradient(320deg,#4FA3AE,#177B83)', animation: 'blobA 6.5s ease-in-out infinite', boxShadow: '0 14px 32px rgba(23,123,131,.25)' }} />
      {label && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...sans(500, 13), color: 'rgba(240,239,236,.95)' }}>{label}</span>}
    </div>
  );
}

export function SearchBar() {
  return (
    <div style={{ margin: '0 24px', height: 44, borderRadius: 22, background: 'rgba(255,255,255,.75)', border: `1px solid ${dim(.1)}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flex: 'none' }}>
      <span style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${dim(.3)}`, position: 'relative', flex: 'none' }}>
        <span style={{ position: 'absolute', right: -5, bottom: -3, width: 7, height: 2, background: dim(.3), transform: 'rotate(45deg)', borderRadius: 1 }} />
      </span>
      <span style={{ ...sans(400, 13.5, dim(.4)) }}>Search every thought…</span>
    </div>
  );
}

export function TrashIcon({ color }) {
  return (
    <span style={{ position: 'relative', width: 11, height: 14, display: 'inline-block' }}>
      <span style={{ position: 'absolute', left: 1, top: 3, right: 1, bottom: 0, border: `1.5px solid ${color}`, borderTop: 'none', borderRadius: '0 0 3px 3px', boxSizing: 'border-box' }} />
      <span style={{ position: 'absolute', left: 0, top: 1.5, width: 11, height: 1.5, background: color }} />
      <span style={{ position: 'absolute', left: 3.5, top: -1, width: 4, height: 2.5, border: `1.5px solid ${color}`, borderBottom: 'none', boxSizing: 'border-box' }} />
    </span>
  );
}

export function MicIcon({ color }) {
  return (
    <span style={{ position: 'relative', width: 10, height: 15, display: 'inline-block' }}>
      <span style={{ position: 'absolute', left: 2, top: 0, width: 6, height: 9, borderRadius: 3, background: color }} />
      <span style={{ position: 'absolute', left: 0, top: 5, width: 10, height: 7, border: `1.5px solid ${color}`, borderTop: 'none', borderRadius: '0 0 6px 6px', boxSizing: 'border-box' }} />
      <span style={{ position: 'absolute', left: 4.5, bottom: -2, width: 1.5, height: 3, background: color }} />
    </span>
  );
}

export function RoundBtn({ onClick, children, size = 40 }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%', border: `1px solid ${dim(.15)}`, background: '#FFF',
      boxShadow: `0 4px 14px ${dim(.18)}`, cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', ...sans(400, 15, INK), flex: 'none',
    }}>{children}</button>
  );
}
