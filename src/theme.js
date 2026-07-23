// napkiln visual system — shared tokens and style helpers for all screens.
export const INK = '#3C4249';
export const TEAL = '#1F8A96';
export const TEAL_DEEP = '#177B83';
export const CLAY = '#E0824E';
export const PAPER = '#F0EFEC';
export const SANS = "'Figtree', sans-serif";
export const MONO = 'ui-monospace, Menlo, monospace';

export const dim = (a) => `rgba(60,66,73,${a})`;
export const teal = (a) => `rgba(31,138,150,${a})`;
export const clay = (a) => `rgba(224,130,78,${a})`;

export const sans = (weight, size, color) => ({
  fontFamily: SANS, fontWeight: weight, fontSize: size, ...(color ? { color } : {}),
});
export const mono = (size, color) => ({
  fontFamily: MONO, fontWeight: 600, fontSize: size, letterSpacing: '.14em', ...(color ? { color } : {}),
});

export const abs = (pos) => ({ position: 'absolute', ...pos });

export const pillBtn = {
  height: 42, padding: '0 18px', borderRadius: 21, border: `1px solid ${dim(.18)}`,
  background: 'none', cursor: 'pointer', ...sans(500, 13, INK),
};
export const pillBtnDark = {
  height: 42, padding: '0 20px', borderRadius: 21, border: 'none',
  background: INK, color: PAPER, cursor: 'pointer', ...sans(500, 13),
};

export const dialogWrap = {
  position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: dim(.3), padding: '0 32px',
};
export const dialogCard = {
  background: '#FFF', borderRadius: 18, boxShadow: `0 14px 40px ${dim(.25)}`,
  padding: '22px 22px 18px', width: '100%', boxSizing: 'border-box',
};

export const sheetGrip = {
  display: 'block', width: 36, height: 4, borderRadius: 2, background: dim(.18), margin: '0 auto 14px',
};
