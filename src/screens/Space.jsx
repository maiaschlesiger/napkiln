// Space constellation (9b) — zoomable, pannable; tap a line for the
// why-these-connect popup, tap a node to open its preview, long-press a node
// to edit/delete, saved thoughts flash into place.
import { useEffect, useRef, useState } from 'react';
import { INK, TEAL, TEAL_DEEP, CLAY, PAPER, dim, teal, sans, mono, abs } from '../theme.js';
import { Confirm, RoundBtn, Sheet, Snack, TrashIcon } from '../components/ui.jsx';

const CX = 201, CY = 400, SPACING = 1.2;
export const SPACE_NODES = [
  { id: 0, x: 120, y: 270, r: 15, c: TEAL, halo: 'rgba(31,138,150,.12)', label: 'ideas while moving', big: true },
  { id: 1, x: 295, y: 350, r: 12, c: CLAY, halo: 'rgba(224,130,78,.12)', label: 'narrator hears you' },
  { id: 2, x: 85, y: 170, r: 10, c: TEAL, label: 'talking to your notes', dimmed: .75 },
  { id: 3, x: 140, y: 520, r: 9, c: 'rgba(60,66,73,.45)', label: 'teach by voice?', dimmed: .9 },
  { id: 4, x: 330, y: 255, r: 9, c: CLAY, dimmed: .55 },
  { id: 5, x: 75, y: 575, r: 8, c: 'rgba(60,66,73,.3)' },
  { id: 6, x: 190, y: 205, r: 9, c: TEAL, dimmed: .5 },
  { id: 7, x: 300, y: 555, r: 8, c: 'rgba(60,66,73,.28)' },
  { id: 8, x: 235, y: 605, r: 8, c: 'rgba(60,66,73,.28)' },
];
const LINKS = [
  { a: 0, b: 1, phrase: '“a voice that walks with you”', note: 'said in both — once as a product, once as a character' },
  { a: 0, b: 2, phrase: '“talking instead of typing”', note: 'the same wish, two months apart' },
  { a: 1, b: 3, phrase: '“explaining out loud”', note: 'both circle how speech clarifies thinking' },
];
const GROUPS = [
  { x: 130, y: 215, rgb: '31,138,150' },
  { x: 310, y: 300, rgb: '224,130,78' },
  { x: 185, y: 560, rgb: '120,125,130' },
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function Space({ flash, onOpen, onTalk }) {
  const [z, setZ] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState(() => SPACE_NODES.map((n) => ({ ...n })));
  const [links, setLinks] = useState(() => LINKS.slice());
  const [sel, setSel] = useState(-1);
  const [nodeSel, setNodeSel] = useState(-1);
  const [nodeEdit, setNodeEdit] = useState(-1);
  const [dragN, setDragN] = useState(-1);
  const [listOpen, setListOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(-1);
  const [snack, setSnack] = useState(null);
  const [flashing, setFlashing] = useState(-1);
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const holdRef = useRef(null);
  const draggedRef = useRef(false);
  const ztRef = useRef({ target: 1, raf: null });

  const say = (text) => setSnack({ text, at: Date.now() });

  useEffect(() => {
    if (flash == null || flash < 0) return;
    setFlashing(flash);
    say('Saved — here it is in your Space');
    const t = setTimeout(() => setFlashing(-1), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  const animateTo = (target) => {
    ztRef.current.target = clamp(target, 0.65, 1.9);
    if (ztRef.current.raf) return;
    const step = () => {
      setZ((cur) => {
        const d = ztRef.current.target - cur;
        if (Math.abs(d) < 0.004) { ztRef.current.raf = null; return ztRef.current.target; }
        ztRef.current.raf = requestAnimationFrame(step);
        return cur + d * 0.16;
      });
    };
    ztRef.current.raf = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(ztRef.current.raf), []);

  const pos = (n) => ({ x: CX + (n.x - CX) * SPACING * z + pan.x, y: CY + (n.y - CY) * SPACING * z + pan.y });
  const visLinks = links.map((L, i) => ({ L, i })).filter(({ L }) => !nodes[L.a].hidden && !nodes[L.b].hidden);

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('button') || e.target.closest('.sp-nedit')) return;
    const nd = e.target.closest('[data-ni]');
    if (nd) {
      const ni = +nd.getAttribute('data-ni');
      holdRef.current = { ni, x: e.clientX, y: e.clientY, t: setTimeout(() => { setDragN(ni); holdRef.current = null; }, 300) };
      return;
    }
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
  };
  const onPointerMove = (e) => {
    if (dragN >= 0) {
      const rect = rootRef.current.getBoundingClientRect();
      const sp = SPACING * z;
      setNodes((ns) => ns.map((n, i) => (i === dragN ? {
        ...n,
        x: ((e.clientX - rect.left) - pan.x - CX) / sp + CX,
        y: ((e.clientY - rect.top) - pan.y - CY) / sp + CY,
      } : n)));
      draggedRef.current = true;
      return;
    }
    if (holdRef.current) {
      if (Math.abs(e.clientX - holdRef.current.x) + Math.abs(e.clientY - holdRef.current.y) > 6) {
        clearTimeout(holdRef.current.t);
        dragRef.current = { x: holdRef.current.x, y: holdRef.current.y, px: pan.x, py: pan.y, moved: true };
        holdRef.current = null;
      } else return;
    }
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) dragRef.current.moved = true;
    if (dragRef.current.moved) {
      setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
    }
  };
  const onPointerUp = () => {
    if (holdRef.current) { clearTimeout(holdRef.current.t); holdRef.current = null; }
    if (dragN >= 0) setDragN(-1);
    if (dragRef.current && dragRef.current.moved) draggedRef.current = true;
    dragRef.current = null;
  };
  const onClick = (e) => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    if (e.target.closest('button') || e.target.closest('.sp-nedit')) return;
    if (nodeSel >= 0) { setNodeSel(-1); setNodeEdit(-1); return; }
    const nd = e.target.closest('[data-n]');
    if (nd) { onOpen(nd.getAttribute('data-n')); return; }
    const l = e.target.closest('[data-l]');
    if (l) { setSel(+l.getAttribute('data-l')); return; }
    if (sel >= 0) setSel(-1);
  };

  useEffect(() => {
    const el = rootRef.current;
    const wheel = (e) => { e.preventDefault(); animateTo(ztRef.current.target + (e.deltaY > 0 ? -0.12 : 0.12)); };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const gsp = SPACING * z;
  const L = sel >= 0 && links[sel];

  return (
    <div
      ref={rootRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClick={onClick}
      onContextMenu={(e) => {
        const nd = e.target.closest('[data-ni]');
        if (nd) { e.preventDefault(); setNodeSel(+nd.getAttribute('data-ni')); setNodeEdit(-1); }
      }}
      style={{ ...abs({ inset: 0 }), overflow: 'hidden', cursor: dragRef.current ? 'grabbing' : 'grab' }}
    >
      {/* group glows */}
      {GROUPS.map((g, gi) => {
        const p = pos(g);
        const gr = 150 * gsp;
        return <span key={gi} style={{ position: 'absolute', left: p.x, top: p.y, width: gr * 2, height: gr * 2, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle,rgba(${g.rgb},.09),rgba(${g.rgb},0) 68%)`, pointerEvents: 'none', zIndex: 1 }} />;
      })}
      {/* links */}
      {links.map((Lk, li) => {
        if (nodes[Lk.a].hidden || nodes[Lk.b].hidden) return null;
        const A = pos(nodes[Lk.a]), B = pos(nodes[Lk.b]);
        const gapA = nodes[Lk.a].r + 22, gapB = nodes[Lk.b].r + 22;
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const tl = Math.max(20, len - gapA - gapB);
        const on = sel === li;
        const col = on ? dim(.6) : dim(.32);
        return (
          <div key={li} data-l={li} style={{ position: 'absolute', left: A.x + ux * gapA, top: A.y + uy * gapA - 8, width: tl, height: 16, display: 'flex', alignItems: 'center', transform: `rotate(${Math.atan2(dy, dx)}rad)`, transformOrigin: '0 8px', cursor: 'pointer', zIndex: 3 }}>
            <span style={{ width: '100%', height: on ? 2 : 1.4, background: `linear-gradient(90deg,transparent 0%,${col} 6%,${col} 94%,transparent 100%)`, boxShadow: on ? `0 0 10px ${dim(.3)}` : 'none' }} />
          </div>
        );
      })}
      {/* nodes */}
      {nodes.map((n, ni) => {
        if (n.hidden) return null;
        const p = pos(n);
        const r = n.r * (0.85 + z * 0.25);
        const fs = (n.big ? 13 : 11.5) * (0.85 + z * 0.25);
        const selMe = nodeSel === ni;
        return (
          <div
            key={ni}
            {...(n.label ? { 'data-n': n.label, 'data-ni': ni } : {})}
            style={{
              position: 'absolute', left: p.x, top: p.y,
              transform: `translate(-50%,-50%)${dragN === ni ? ' scale(1.15)' : ''}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              zIndex: dragN === ni ? 8 : selMe ? 6 : 4,
              cursor: n.label ? 'pointer' : 'default', pointerEvents: n.label ? 'auto' : 'none',
              opacity: selMe ? 1 : nodeSel >= 0 ? .45 : (n.dimmed || 1),
              filter: dragN === ni ? `drop-shadow(0 6px 14px ${dim(.25)})` : nodeSel >= 0 && !selMe ? 'blur(2px)' : 'none',
            }}
          >
            <span style={{
              width: r, height: r, borderRadius: '50%', background: n.c,
              boxShadow: flashing === ni ? `0 0 0 ${(r * .8).toFixed(0)}px ${teal(.25)}` : n.halo ? `0 0 0 ${(r * .45).toFixed(0)}px ${n.halo}` : 'none',
              animation: flashing === ni ? 'breathe 1.2s ease-in-out infinite' : 'none',
            }} />
            {nodeEdit === ni
              ? <input
                  className="sp-nedit" autoFocus defaultValue={n.label || ''}
                  onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) setNodes((ns) => ns.map((x, k) => (k === ni ? { ...x, label: v } : x))); setNodeEdit(-1); setNodeSel(-1); } }}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v) setNodes((ns) => ns.map((x, k) => (k === ni ? { ...x, label: v } : x))); setNodeEdit(-1); setNodeSel(-1); }}
                  style={{ border: 'none', borderBottom: `1px solid ${TEAL}`, background: 'rgba(240,239,236,.9)', outline: 'none', ...sans(400, fs, INK), textAlign: 'center', width: 150, padding: '0 0 2px' }}
                />
              : n.label && (
                <span style={{ ...sans(n.big ? 500 : 400, fs, n.big ? INK : dim(.7)), whiteSpace: 'nowrap', textShadow: `0 0 4px ${PAPER},0 0 8px ${PAPER},0 0 12px ${PAPER}` }}>{n.label}</span>
              )}
            {selMe && nodeEdit !== ni && (
              <span style={{ position: 'absolute', left: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 8, zIndex: 7 }}>
                <RoundBtn size={38} onClick={() => setNodeEdit(ni)}>✎</RoundBtn>
                <RoundBtn size={38} onClick={() => setConfirmDel(ni)}><TrashIcon color={CLAY} /></RoundBtn>
              </span>
            )}
          </div>
        );
      })}

      {/* header */}
      <div style={{ ...abs({ top: 70, left: 24, right: 24 }), display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', zIndex: 8 }}>
        <span style={sans(500, 24, INK)}>Space</span>
        <span
          className="sp-count" onClick={() => setListOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 500, fontSize: 12, color: TEAL_DEEP, border: `1px solid ${teal(.35)}`, borderRadius: 16, padding: '8px 14px', background: 'rgba(255,255,255,.9)', pointerEvents: 'auto', cursor: 'pointer', boxShadow: `0 2px 8px ${dim(.08)}` }}
        >
          {visLinks.length} connection{visLinks.length === 1 ? '' : 's'} <span style={{ ...sans(400, 11), opacity: .7 }}>›</span>
        </span>
      </div>
      <span style={{ ...abs({ left: 0, right: 0, top: 108 }), textAlign: 'center', ...sans(400, 12, dim(.4)), pointerEvents: 'none', zIndex: 8 }}>
        tap a line to see why · scroll or ± to zoom
      </span>

      {/* zoom controls */}
      <div style={{ ...abs({ right: 20, top: 330 }), width: 44, borderRadius: 12, background: 'rgba(255,255,255,.95)', border: `1px solid ${dim(.12)}`, boxShadow: `0 2px 10px ${dim(.1)}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 8 }}>
        <button className="sp-in" onClick={() => animateTo(ztRef.current.target + 0.3)} style={{ height: 44, border: 'none', background: 'none', ...sans(400, 22, INK), cursor: 'pointer' }}>+</button>
        <span style={{ height: 1, background: dim(.12), margin: '0 8px' }} />
        <button className="sp-out" onClick={() => animateTo(ztRef.current.target - 0.3)} style={{ height: 44, border: 'none', background: 'none', ...sans(400, 24, INK), cursor: 'pointer' }}>−</button>
      </div>

      {/* legend */}
      <div style={{ ...abs({ left: 20, bottom: 126 }), display: 'flex', flexDirection: 'column', gap: 5, background: 'rgba(255,255,255,.92)', border: `1px solid ${dim(.12)}`, borderRadius: 10, padding: '8px 10px', zIndex: 8, pointerEvents: 'none' }}>
        {[[TEAL, 'product'], [CLAY, 'story'], [dim(.4), 'other']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, ...sans(400, 12, dim(.65)) }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flex: 'none' }} />{l}
          </span>
        ))}
      </div>

      {/* why-these-connect popup */}
      <div className="sp-pop" style={{
        ...abs({ left: 14, right: 14, bottom: 126 }), background: '#FFF', border: `1px solid ${dim(.1)}`, borderRadius: 18,
        boxShadow: `0 10px 30px ${dim(.15)}`, padding: '14px 16px', zIndex: 9,
        transform: L ? 'translateY(0)' : 'translateY(140%)', opacity: L ? 1 : 0,
        transition: 'transform .3s cubic-bezier(.3,.8,.4,1),opacity .3s',
      }}>
        {L && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ ...mono(9, TEAL) }}>WHY THESE CONNECT</span>
              <button data-act="close" onClick={() => setSel(-1)} style={{ border: 'none', background: 'none', ...sans(400, 15, dim(.4)), cursor: 'pointer', padding: '2px 6px' }}>✕</button>
            </div>
            <div style={{ textAlign: 'center', ...sans(400, 14, INK), background: teal(.08), borderRadius: 10, padding: '7px 10px', marginBottom: 8 }}>{L.phrase}</div>
            <div style={{ textAlign: 'center', ...sans(400, 12.5, dim(.55)), marginBottom: 6 }}>{L.note}</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              {[nodes[L.a], nodes[L.b]].map((n, k) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.c }} />
                  <span style={sans(400, 12, INK)}>{n.label || 'untitled'}</span>
                  {k === 0 && <span style={{ ...sans(400, 12, dim(.4)), marginLeft: 6 }}>×</span>}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button data-act="capture" onClick={() => { setSel(-1); say('Opening capture with this pair…'); onTalk(); }} style={{ flex: 1, height: 44, borderRadius: 22, border: 'none', background: INK, color: PAPER, ...sans(500, 13), cursor: 'pointer' }}>Capture this</button>
              <button data-act="remove" onClick={() => { setLinks((ls) => ls.filter((_, i) => i !== sel)); setSel(-1); say('Connection removed — napkiln will remember'); }} style={{ flex: 'none', height: 44, padding: '0 16px', borderRadius: 22, border: `1px solid ${dim(.15)}`, background: 'none', ...sans(500, 13, dim(.6)), cursor: 'pointer' }}>not related</button>
            </div>
          </>
        )}
      </div>

      <Sheet open={listOpen} onClose={() => setListOpen(false)} zIndex={15}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={sans(500, 13, INK)}>All connections</span>
          <button data-lclose="1" onClick={() => setListOpen(false)} style={{ border: 'none', background: 'none', ...sans(400, 15, dim(.4)), cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>
        {visLinks.length === 0
          ? <div style={{ ...sans(400, 12.5, dim(.5)), padding: '8px 0 4px' }}>No connections yet — they appear as your thoughts share phrases.</div>
          : visLinks.map(({ L: Lk, i }) => (
            <div key={i} data-li={i} onClick={() => { setListOpen(false); setSel(i); }} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0', borderBottom: i < links.length - 1 ? `1px solid ${dim(.1)}` : 'none', cursor: 'pointer' }}>
              <span style={sans(400, 15, INK)}>{Lk.phrase}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, ...sans(400, 12, dim(.6)) }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: nodes[Lk.a].c, flex: 'none' }} />{nodes[Lk.a].label || 'untitled'}
                <span style={{ opacity: .5 }}>×</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: nodes[Lk.b].c, flex: 'none' }} />{nodes[Lk.b].label || 'untitled'}
              </span>
            </div>
          ))}
        <span style={{ display: 'block', height: 40 }} />
      </Sheet>

      {confirmDel >= 0 && (
        <Confirm
          title="Delete this thought?" quote={nodes[confirmDel].label || 'untitled'} body="Its connections disappear with it."
          onConfirm={() => { setNodes((ns) => ns.map((n, k) => (k === confirmDel ? { ...n, hidden: true } : n))); setNodeSel(-1); setConfirmDel(-1); say('Thought deleted'); }}
          onCancel={() => { setNodeSel(-1); setConfirmDel(-1); }}
        />
      )}
      <Snack msg={snack} bottom={130} />
    </div>
  );
}
