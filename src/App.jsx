// napkiln app shell — screen routing with slide transitions, tab bar, and the
// shared thought/folder store. Flow: capture (6a) → recording (5a, live AI) →
// review (7a) → saved → Space (9b → 9d preview) and Library (8e/8d).
import { useMemo, useRef, useState } from 'react';
import { INK, TEAL_DEEP, PAPER, dim, teal, clay, sans, abs } from './theme.js';
import Onboarding from './screens/Onboarding.jsx';
import Capture from './screens/Capture.jsx';
import Record from './screens/Record.jsx';
import Review from './screens/Review.jsx';
import Space from './screens/Space.jsx';
import Library from './screens/Library.jsx';

const INITIAL_FOLDERS = [
  { label: 'PRODUCT IDEAS', color: TEAL_DEEP, bg: teal(.09), border: teal(.18), count: '12 thoughts · active', peek: 'ideas while moving', rot: -1.5 },
  { label: 'STORY IDEAS', color: '#C4547E', bg: clay(.09), border: clay(.2), count: '5 thoughts', peek: 'narrator hears you', rot: -1 },
  { label: 'CAREER', color: dim(.55), bg: dim(.05), border: dim(.12), count: '3 thoughts', peek: 'teach by voice?', rot: 1.5 },
  { label: 'PERSONAL QUESTIONS', color: dim(.55), bg: dim(.05), border: dim(.12), count: '4 thoughts', peek: 'what should I make next?', rot: -1 },
];
const INITIAL_FOLDER_DATA = {
  'PRODUCT IDEAS': { c: TEAL_DEEP, items: [['ideas while moving', 'today · 5 boxes · 1 open question'], ['talking to your notes', 'May 3 · 4 boxes · linked ×2'], ['voice memos rethink', 'Apr 28 · 3 boxes']] },
  'STORY IDEAS': { c: '#C4547E', items: [['narrator hears you', 'Mar 12 · echoes “ideas while moving”'], ['walking chapters', 'Feb 20 · 2 boxes']] },
  'CAREER': { c: dim(.55), items: [['teach by voice?', 'Jun 30 · open question · continued ×2']] },
  'PERSONAL QUESTIONS': { c: dim(.55), items: [['what should I make next?', 'Jan 8 · open question'], ['morning pages, but spoken', 'today · 3 boxes']] },
};
const INITIAL_RECENT = [
  { day: 'TODAY', items: [['ideas while moving', '2:14 pm · 5 boxes · 1 open question', 'PRODUCT', TEAL_DEEP, teal(.1)], ['morning pages, but spoken', '8:02 am · 3 boxes', 'PERSONAL', dim(.55), dim(.07)]] },
  { day: 'YESTERDAY', items: [['teach by voice?', '6:40 pm · open question · continued ×2', 'CAREER', dim(.55), dim(.07)]] },
  { day: 'MAY', items: [['talking to your notes', 'May 3 · 4 boxes · linked ×2', 'PRODUCT', TEAL_DEEP, teal(.1)], ['narrator hears you', 'Mar 12 · echoes “ideas while moving”', 'STORY', '#C4547E', clay(.1)]] },
];

const TABS = [['home', 'Capture'], ['space', 'Space'], ['library', 'Library']];
const demo = /[?&]demo\b/.test(window.location.search);

export default function App() {
  const [screen, setScreen] = useState({ name: 'onboard' });
  const [navDir, setNavDir] = useState('fwd');
  const histRef = useRef([]);
  const [template, setTemplate] = useState('free');
  const [pendingGraph, setPendingGraph] = useState(null);
  const [reviewStage, setReviewStage] = useState('review');
  const [spaceFlash, setSpaceFlash] = useState(-1);
  const [tabsHidden, setTabsHidden] = useState(false);

  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [folderData, setFolderData] = useState(INITIAL_FOLDER_DATA);
  const [recent, setRecent] = useState(INITIAL_RECENT);

  const go = (next, opts = {}) => {
    if (!opts.noPush && screen.name !== next.name) histRef.current.push(screen);
    if (opts.reset) histRef.current = [];
    setTabsHidden(false);
    setNavDir('fwd');
    setScreen(next);
  };
  const goBack = () => {
    const prev = histRef.current.pop() || { name: 'home' };
    setTabsHidden(false);
    setNavDir('back');
    setScreen(prev);
  };

  const actions = useMemo(() => ({
    addFolder: (label) => {
      setFolders((fs) => [...fs, { label, color: dim(.55), bg: dim(.05), border: dim(.12), count: '0 thoughts', peek: 'nothing here yet', rot: 1 }]);
      setFolderData((fd) => ({ ...fd, [label]: { c: dim(.55), items: [] } }));
    },
    renameFolder: (oldL, newL) => {
      setFolders((fs) => fs.map((f) => (f.label === oldL ? { ...f, label: newL } : f)));
      setFolderData((fd) => {
        const out = {};
        for (const k of Object.keys(fd)) out[k === oldL ? newL : k] = fd[k];
        return out;
      });
    },
    deleteFolder: (label) => {
      setFolders((fs) => fs.filter((f) => f.label !== label));
    },
    renameThought: (oldT, newT) => {
      setRecent((r) => r.map((g) => ({ ...g, items: g.items.map((it) => (it[0] === oldT ? [newT, ...it.slice(1)] : it)) })));
      setFolderData((fd) => {
        const out = {};
        for (const k of Object.keys(fd)) out[k] = { ...fd[k], items: fd[k].items.map((it) => (it[0] === oldT ? [newT, ...it.slice(1)] : it)) };
        return out;
      });
    },
    deleteThought: (t) => {
      setRecent((r) => r.map((g) => ({ ...g, items: g.items.filter((it) => it[0] !== t) })).filter((g) => g.items.length));
      setFolderData((fd) => {
        const out = {};
        for (const k of Object.keys(fd)) out[k] = { ...fd[k], items: fd[k].items.filter((it) => it[0] !== t) };
        return out;
      });
    },
  }), []);

  const activeTab = { home: 'home', space: 'space', library: 'library' }[screen.name];
  const showTabs = !!activeTab;

  const body = (() => {
    switch (screen.name) {
      case 'onboard':
        return <Onboarding onDone={() => go({ name: 'home' }, { reset: true })} />;
      case 'home':
        return (
          <Capture
            template={template} onTemplate={setTemplate} onSheet={setTabsHidden}
            onRecord={() => go({ name: 'record' })}
            onType={() => go({ name: 'record', typed: true })}
            onContinueRecent={() => go({ name: 'preview' })}
          />
        );
      case 'record':
        return (
          <Record
            template={template} recordFolder={screen.folder} demo={demo} typedMode={screen.typed}
            onDone={(graph) => {
              if (graph) { setPendingGraph(graph); }
              setReviewStage('review');
              go({ name: 'review' });
            }}
            onCancel={goBack}
          />
        );
      case 'review':
        return (
          <Review
            key={pendingGraph ? pendingGraph.title + pendingGraph.nodes.length : 'demo'}
            graph={pendingGraph} stage={reviewStage} folders={folders.map((f) => f.label.charAt(0) + f.label.slice(1).toLowerCase())}
            onSaved={() => setReviewStage('saved')}
            onStageChange={setReviewStage}
            onBack={goBack}
            onTalk={() => go({ name: 'record' })}
            onSpace={() => { setSpaceFlash(0); setPendingGraph(null); go({ name: 'space' }, { reset: true }); }}
            onNew={() => { setPendingGraph(null); go({ name: 'home' }, { reset: true }); }}
          />
        );
      case 'preview':
        return (
          <Review
            key="preview" graph={null} stage="review" mode="preview" folders={[]}
            onBack={goBack} onTalk={() => go({ name: 'record' })} onStageChange={() => {}} onSaved={() => {}}
          />
        );
      case 'space':
        return (
          <Space
            flash={spaceFlash} onSheet={setTabsHidden} onOpen={() => go({ name: 'preview' })}
            onTalk={() => go({ name: 'record' })}
          />
        );
      case 'library':
        return (
          <Library
            data={{ folders, folderData, recent }} actions={actions}
            onOpenThought={() => go({ name: 'preview' })}
            onRecordInFolder={(f) => go({ name: 'record', folder: f })}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div style={{ ...abs({ inset: 0 }), background: PAPER, overflow: 'hidden' }}>
      <div
        key={screen.name + (screen.folder || '') + (screen.typed ? 't' : '')}
        style={{ ...abs({ inset: 0 }), animation: `${navDir === 'back' ? 'screenback' : 'screenin'} .26s cubic-bezier(.3,.8,.4,1) both` }}
      >
        {body}
      </div>
      {showTabs && !tabsHidden && (
        <div className="nk-tabs" style={{
          ...abs({ bottom: 56, left: '50%' }), transform: 'translateX(-50%)', display: 'flex', gap: 4,
          background: 'rgba(255,255,255,.9)', border: `1px solid ${dim(.1)}`, borderRadius: 26, padding: 5,
          boxShadow: `0 4px 16px ${dim(.08)}`, zIndex: 25,
        }}>
          {TABS.map(([id, label]) => (
            <span
              key={id} data-tab={id}
              onClick={() => { if (id !== activeTab) { setSpaceFlash(-1); go({ name: id }, { reset: true }); } }}
              style={{
                padding: '10px 18px', borderRadius: 20, ...sans(500, 13), cursor: 'pointer',
                ...(activeTab === id ? { background: INK, color: PAPER } : { color: dim(.55) }),
              }}
            >{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
