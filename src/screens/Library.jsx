// Library (8e folders / 8d recents) + folder detail view.
// Long-press (or right-click) a folder card or thought row → edit / delete.
import { useRef, useState } from 'react';
import { INK, TEAL, TEAL_DEEP, CLAY, PAPER, dim, teal, sans, mono, abs } from '../theme.js';
import { Confirm, TrashIcon, RoundBtn } from '../components/ui.jsx';

// Live search across every thought. Matches pop up below the bar: direct hits
// first, then related thoughts that share words with the query.
function SearchBox({ thoughts, onPick }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const exact = [], similar = [];
  if (query) {
    const qTokens = query.split(/\s+/).filter((w) => w.length > 2);
    for (const t of thoughts) {
      const hay = (t.title + ' ' + t.meta).toLowerCase();
      if (hay.includes(query)) exact.push(t);
      else {
        const score = qTokens.filter((w) => hay.includes(w)).length;
        if (score > 0) similar.push({ ...t, score });
      }
    }
    similar.sort((a, b) => b.score - a.score);
  }
  const row = (t, i, last) => (
    <div
      key={t.folder + t.title} data-sr={t.title}
      onClick={() => { setQ(''); onPick(t.title); }}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderBottom: last ? 'none' : `1px solid ${dim(.08)}`, cursor: 'pointer' }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.c, flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', ...sans(500, 13.5, INK), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
        <span style={{ ...sans(400, 11, dim(.45)) }}>{t.meta}</span>
      </span>
      <span style={{ flex: 'none', fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 500, fontSize: 9, letterSpacing: '.08em', color: dim(.45) }}>{t.folder.split(' ')[0]}</span>
    </div>
  );
  return (
    <div style={{ position: 'relative', margin: '0 24px', flex: 'none', zIndex: 6 }}>
      <div style={{ height: 44, borderRadius: 22, background: 'rgba(255,255,255,.75)', border: `1px solid ${query ? teal(.4) : dim(.1)}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
        <span style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${dim(.3)}`, position: 'relative', flex: 'none' }}>
          <span style={{ position: 'absolute', right: -5, bottom: -3, width: 7, height: 2, background: dim(.3), transform: 'rotate(45deg)', borderRadius: 1 }} />
        </span>
        <input
          className="nk-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search every thought…"
          style={{ flex: 1, border: 'none', background: 'none', outline: 'none', ...sans(400, 13.5, INK) }}
        />
        {query && <span onClick={() => setQ('')} style={{ ...sans(400, 13, dim(.4)), cursor: 'pointer', padding: '0 2px' }}>✕</span>}
      </div>
      {query && (
        <div className="nk-searchpop" style={{ position: 'absolute', top: 50, left: 0, right: 0, background: '#FFF', border: `1px solid ${dim(.1)}`, borderRadius: 14, boxShadow: `0 10px 30px ${dim(.15)}`, maxHeight: 300, overflowY: 'auto' }}>
          {exact.length === 0 && similar.length === 0 && (
            <div style={{ padding: '12px 14px', ...sans(400, 12.5, dim(.5)) }}>Nothing matches yet — keep typing.</div>
          )}
          {exact.slice(0, 4).map((t, i) => row(t, i, i === Math.min(exact.length, 4) - 1 && !similar.length))}
          {similar.length > 0 && (
            <div style={{ ...mono(9, dim(.4)), padding: '10px 14px 2px' }}>SIMILAR THOUGHTS</div>
          )}
          {similar.slice(0, 3).map((t, i) => row(t, i, i === Math.min(similar.length, 3) - 1))}
        </div>
      )}
    </div>
  );
}

function ThoughtRow({ title, meta, tag, tagC, tagBg, last, state, onOpen, onFocus, onCommit, onBubble }) {
  const holdRef = useRef(null);
  return (
    <div
      data-open="1" data-title={title}
      onContextMenu={(e) => { e.preventDefault(); onFocus(); }}
      onPointerDown={() => { holdRef.current = setTimeout(onFocus, 420); }}
      onPointerUp={() => clearTimeout(holdRef.current)}
      onPointerLeave={() => clearTimeout(holdRef.current)}
      onClick={(e) => { if (!e.target.closest('button') && !e.target.closest('input') && state !== 'focused' && state !== 'editing') onOpen(); }}
      style={{
        padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${dim(.1)}`, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', gap: 10, cursor: 'pointer',
        transition: 'filter .25s,opacity .25s', ...(state === 'dim' ? { filter: 'blur(2px)', opacity: .45 } : {}),
      }}
    >
      <span style={{ flex: 1 }}>
        {state === 'editing'
          ? <input
              className="nk-redit" autoFocus defaultValue={title}
              onKeyDown={(e) => { if (e.key === 'Enter') onCommit(e.target.value); }}
              onBlur={(e) => onCommit(e.target.value)}
              style={{ width: '90%', border: 'none', borderBottom: `1px solid ${TEAL}`, background: 'none', outline: 'none', ...sans(500, 14.5, INK), padding: '0 0 2px' }}
            />
          : <span style={{ display: 'block', ...sans(500, 14.5, INK) }}>{title}</span>}
        <span style={sans(400, 12, dim(.45))}>{meta}</span>
      </span>
      {state === 'focused'
        ? <span style={{ display: 'flex', gap: 8, flex: 'none' }}>
            <RoundBtn size={38} onClick={() => onBubble('edit')}>✎</RoundBtn>
            <RoundBtn size={38} onClick={() => onBubble('del')}><TrashIcon color={CLAY} /></RoundBtn>
          </span>
        : tag
          ? <span style={{ flex: 'none', fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 500, fontSize: 11, letterSpacing: '.08em', color: tagC, background: tagBg, borderRadius: 9, padding: '4px 9px' }}>{tag}</span>
          : <span style={sans(400, 13, dim(.35))}>›</span>}
    </div>
  );
}

export default function Library({ data, actions, onOpenThought, onRecordInFolder }) {
  const { folders, folderData, recent } = data;
  const allThoughts = Object.entries(folderData)
    .filter(([folder]) => folders.some((f) => f.label === folder))
    .flatMap(([folder, f]) => f.items.map((it) => ({ title: it[0], meta: it[1], folder, c: f.c })));
  const [mode, setMode] = useState('folders');
  const [view, setView] = useState(null); // null = library, string = folder name
  const [fFocus, setFFocus] = useState(-1);
  const [fEditing, setFEditing] = useState(-1);
  const [fNew, setFNew] = useState(false);
  const [rowFocus, setRowFocus] = useState(null);
  const [rowEditing, setRowEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // {kind:'folder'|'thought', target}
  const holdRef = useRef(null);
  const newRef = useRef(null);

  const rowState = (t) => (rowEditing === t ? 'editing' : rowFocus == null ? null : rowFocus === t ? 'focused' : 'dim');
  const clearFocus = () => { setFFocus(-1); setFEditing(-1); setRowFocus(null); setRowEditing(null); };

  const commitNewFolder = () => {
    const v = newRef.current && newRef.current.value.trim();
    if (v) actions.addFolder(v.toUpperCase());
    setFNew(false);
  };

  const bubbleRow = (a, t, back) => {
    if (a === 'edit') setRowEditing(t);
    else setConfirm({ kind: 'thought', target: t, back });
  };

  if (view) {
    const f = folderData[view] || { c: dim(.55), items: [] };
    return (
      <div style={abs({ inset: 0 })} onClick={(e) => { if (!e.target.closest('[data-open]') && rowFocus != null) clearFocus(); }}>
        <div style={{ ...abs({ top: 70, left: 24, right: 24 }), display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="nk-fback" onClick={() => { clearFocus(); setView(null); }} style={{ fontSize: 19, color: dim(.5), cursor: 'pointer', padding: '2px 8px 2px 0' }}>←</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', ...mono(11, f.c) }}>{view}</span>
            <span style={sans(400, 12, dim(.45))}>{f.items.length} thought{f.items.length === 1 ? '' : 's'} · tap one to preview</span>
          </span>
        </div>
        <div style={{ ...abs({ top: 122, left: 0, right: 0, bottom: 126 }), display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <SearchBox thoughts={allThoughts} onPick={onOpenThought} />
          <div style={{ margin: '10px 24px 0', display: 'flex', flexDirection: 'column' }}>
            {f.items.map((it, i) => (
              <ThoughtRow
                key={it[0]} title={it[0]} meta={it[1]} last={i === f.items.length - 1}
                state={rowState(it[0])}
                onOpen={() => onOpenThought(it[0])}
                onFocus={() => { setRowFocus(it[0]); setRowEditing(null); }}
                onCommit={(v) => { if (v.trim()) actions.renameThought(it[0], v.trim()); clearFocus(); }}
                onBubble={(a) => bubbleRow(a, it[0], 'folder')}
              />
            ))}
          </div>
          <div
            data-fnewthought="1" onClick={() => onRecordInFolder(view)}
            style={{ margin: '18px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${dim(.2)}`, borderRadius: 14, padding: 12, ...sans(500, 12, dim(.45)), cursor: 'pointer' }}
          >
            + new thought in this folder
          </div>
        </div>
        {confirm && confirm.kind === 'thought' && (
          <Confirm
            title="Delete this thought?" quote={confirm.target} body="Its recording, structure and connections go with it."
            onConfirm={() => { actions.deleteThought(confirm.target); clearFocus(); setConfirm(null); }}
            onCancel={() => { clearFocus(); setConfirm(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={abs({ inset: 0 })} onClick={(e) => {
      if (e.target.closest('[data-folder]') || e.target.closest('[data-open]') || e.target.closest('button') || e.target.closest('input') || e.target.closest('[data-fnew]')) return;
      if (fFocus >= 0 || rowFocus != null) clearFocus();
    }}>
      <div style={{ ...abs({ top: 70, left: 24, right: 24 }), display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={sans(500, 24, INK)}>Library</span>
        <div className="nk-libtoggle" style={{ display: 'flex', gap: 2, background: dim(.06), borderRadius: 14, padding: 3 }}>
          {['folders', 'recent'].map((m) => (
            <span key={m} data-lib={m} onClick={() => { setMode(m); clearFocus(); }} style={{
              padding: '6px 12px', borderRadius: 11, ...sans(500, 11.5, mode === m ? INK : dim(.5)), cursor: 'pointer',
              background: mode === m ? '#FFF' : 'transparent', boxShadow: mode === m ? `0 1px 4px ${dim(.1)}` : 'none',
            }}>{m === 'folders' ? 'Folders' : 'Recent'}</span>
          ))}
        </div>
      </div>
      <div style={{ ...abs({ top: 122, left: 0, right: 0, bottom: 126 }), display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {mode === 'folders' && <SearchBox thoughts={allThoughts} onPick={onOpenThought} />}
        {mode === 'folders' ? (
          <div style={{ margin: '24px 24px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignContent: 'start' }}>
            {folders.map((f, i) => {
              const state = fFocus < 0 ? 'normal' : fFocus === i ? 'focused' : 'dim';
              return (
                <div
                  key={f.label} data-folder={f.label}
                  onContextMenu={(e) => { e.preventDefault(); setFFocus(i); setFEditing(-1); }}
                  onPointerDown={(e) => { if (e.target.closest('button') || e.target.closest('input')) return; holdRef.current = setTimeout(() => { setFFocus(i); setFEditing(-1); }, 420); }}
                  onPointerUp={() => clearTimeout(holdRef.current)}
                  onPointerLeave={() => clearTimeout(holdRef.current)}
                  onClick={(e) => {
                    if (e.target.closest('button') || e.target.closest('input')) return;
                    if (fFocus >= 0) { clearFocus(); return; }
                    setView(f.label);
                  }}
                  style={{
                    position: 'relative', borderRadius: 14, background: f.bg, border: `1px solid ${f.border}`,
                    padding: 14, height: 150, overflow: state === 'focused' ? 'visible' : 'hidden', cursor: 'pointer',
                    transition: 'filter .25s,opacity .25s',
                    ...(state === 'dim' ? { filter: 'blur(2.5px)', opacity: .4 } : {}),
                    ...(state === 'focused' ? { boxShadow: `0 6px 20px ${dim(.15)}` } : {}),
                  }}
                >
                  {fEditing === i
                    ? <input
                        className="nk-fedit" autoFocus defaultValue={f.label}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) actions.renameFolder(f.label, v.toUpperCase()); clearFocus(); } }}
                        onBlur={(e) => { const v = e.target.value.trim(); if (v) actions.renameFolder(f.label, v.toUpperCase()); clearFocus(); }}
                        style={{ width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: `1px solid ${TEAL}`, background: 'none', outline: 'none', ...mono(12, f.color), padding: '0 0 2px' }}
                      />
                    : <span style={mono(12, f.color)}>{f.label}</span>}
                  <span style={{ display: 'block', ...sans(400, 12, dim(.45)), margin: '2px 0 10px' }}>{f.count}</span>
                  <div style={{ position: 'absolute', left: 14, right: -8, bottom: -14, background: '#FDFCF8', border: `1px solid ${dim(.12)}`, borderRadius: '10px 0 0 0', padding: '9px 11px', transform: `rotate(${f.rot}deg)` }}>
                    <span style={sans(400, 12, INK)}>{f.peek}</span>
                  </div>
                  {state === 'focused' && fEditing !== i && (
                    <span style={{ position: 'absolute', right: 10, top: -20, display: 'flex', gap: 8, zIndex: 6 }}>
                      <RoundBtn onClick={() => setFEditing(i)}>✎</RoundBtn>
                      <RoundBtn onClick={() => setConfirm({ kind: 'folder', target: f.label })}><TrashIcon color={CLAY} /></RoundBtn>
                    </span>
                  )}
                </div>
              );
            })}
            {fNew
              ? <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${TEAL}`, borderRadius: 14, padding: '12px 14px' }}>
                  <input ref={newRef} className="nk-fnew" autoFocus placeholder="Folder name" onKeyDown={(e) => { if (e.key === 'Enter') commitNewFolder(); }} style={{ flex: 1, border: 'none', background: 'none', outline: 'none', ...sans(500, 13, INK) }} />
                  <button data-fnewok="1" onClick={commitNewFolder} style={{ border: 'none', background: INK, color: PAPER, borderRadius: 14, padding: '8px 14px', ...sans(500, 12), cursor: 'pointer' }}>Add</button>
                </div>
              : <div data-fnew="1" onClick={() => setFNew(true)} style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${dim(.2)}`, borderRadius: 14, padding: 12, ...sans(500, 12, dim(.45)), cursor: 'pointer' }}>+ new folder</div>}
            <div style={{ gridColumn: '1/-1', height: 10 }} />
          </div>
        ) : (
          <div style={{ margin: '4px 24px 0', display: 'flex', flexDirection: 'column' }}>
            {recent.map((g, gi) => (
              <span key={g.day} style={{ display: 'contents' }}>
                <span style={{ ...mono(11.5, dim(.4)), padding: gi === 0 ? '4px 0 2px' : '16px 0 2px' }}>{g.day}</span>
                {g.items.map((it, ii) => (
                  <ThoughtRow
                    key={it[0]} title={it[0]} meta={it[1]} tag={it[2]} tagC={it[3]} tagBg={it[4]}
                    last={gi === recent.length - 1 && ii === g.items.length - 1}
                    state={rowState(it[0])}
                    onOpen={() => onOpenThought(it[0])}
                    onFocus={() => { setRowFocus(it[0]); setRowEditing(null); }}
                    onCommit={(v) => { if (v.trim()) actions.renameThought(it[0], v.trim()); clearFocus(); }}
                    onBubble={(a) => bubbleRow(a, it[0])}
                  />
                ))}
              </span>
            ))}
          </div>
        )}
      </div>
      {confirm && confirm.kind === 'folder' && (
        <Confirm
          title={`Delete “${confirm.target.toLowerCase()}”?`} body="Its thoughts stay in Recent — only the folder goes away." confirmLabel="Delete folder"
          onConfirm={() => { actions.deleteFolder(confirm.target); clearFocus(); setConfirm(null); }}
          onCancel={() => { clearFocus(); setConfirm(null); }}
        />
      )}
      {confirm && confirm.kind === 'thought' && (
        <Confirm
          title="Delete this thought?" quote={confirm.target} body="Its recording, structure and connections go with it."
          onConfirm={() => { actions.deleteThought(confirm.target); clearFocus(); setConfirm(null); }}
          onCancel={() => { clearFocus(); setConfirm(null); }}
        />
      )}
    </div>
  );
}
