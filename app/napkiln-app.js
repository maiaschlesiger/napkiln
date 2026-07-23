// napkiln app shell — unified prototype: capture (6a) → recording (5a) → review (7a) → saved,
// tabs to Space (9b → 9d preview) and Library (8e folders / 8d recents).
(function () {
  const SANS = "'Figtree',sans-serif", SERIF = "'Figtree',sans-serif";
  const INK = '#3C4249', TEAL = '#1F8A96', CLAY = '#E0824E';
  const search = '<div style="margin:0 24px;height:44px;border-radius:22px;background:rgba(255,255,255,.75);border:1px solid rgba(60,66,73,.1);display:flex;align-items:center;gap:10px;padding:0 16px;flex:none">' +
    '<span style="width:13px;height:13px;border-radius:50%;border:2px solid rgba(60,66,73,.3);position:relative;flex:none"><span style="position:absolute;right:-5px;bottom:-3px;width:7px;height:2px;background:rgba(60,66,73,.3);transform:rotate(45deg);border-radius:1px"></span></span>' +
    '<span style="font:400 13.5px ' + SANS + ';color:rgba(60,66,73,.4)">Search every thought…</span></div>';
  const trash2 = (c) => '<span style="position:relative;width:11px;height:14px;display:inline-block"><span style="position:absolute;left:1px;top:3px;right:1px;bottom:0;border:1.5px solid ' + c + ';border-top:none;border-radius:0 0 3px 3px;box-sizing:border-box"></span><span style="position:absolute;left:0;top:1.5px;width:11px;height:1.5px;background:' + c + '"></span><span style="position:absolute;left:3.5px;top:-1px;width:4px;height:2.5px;border:1.5px solid ' + c + ';border-bottom:none;box-sizing:border-box"></span></span>';
  const folderCard = (f, state, editing) =>
    '<div data-folder="' + f.label + '" style="position:relative;border-radius:14px;background:' + f.bg + ';border:1px solid ' + f.border + ';padding:14px;height:150px;overflow:' + (state === 'focused' ? 'visible' : 'hidden') + ';cursor:pointer;transition:filter .25s,opacity .25s;' + (state === 'dim' ? 'filter:blur(2.5px);opacity:.4;' : '') + (state === 'focused' ? 'box-shadow:0 6px 20px rgba(60,66,73,.15);' : '') + '">' +
    (editing
      ? '<input class="nk-fedit" value="' + f.label + '" style="width:100%;box-sizing:border-box;border:none;border-bottom:1px solid ' + TEAL + ';background:none;outline:none;font:600 12px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + f.color + ';padding:0 0 2px">'
      : '<span style="font:600 12px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + f.color + '">' + f.label + '</span>') +
    '<span style="display:block;font:400 12px ' + SANS + ';color:rgba(60,66,73,.45);margin:2px 0 10px">' + f.count + '</span>' +
    (state === 'focused' && !editing
      ? '<span style="position:absolute;right:10px;top:-20px;display:flex;gap:8px;z-index:6">' +
        '<button data-fb="edit" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;font:400 15px ' + SANS + ';color:' + INK + '">✎</button>' +
        '<button data-fb="del" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;display:flex;align-items:center;justify-content:center">' + trash2(CLAY) + '</button></span>'
      : '') + '</div>';
  const trashIco = (c) => '<span style="position:relative;width:11px;height:14px;display:inline-block"><span style="position:absolute;left:1px;top:3px;right:1px;bottom:0;border:1.5px solid ' + c + ';border-top:none;border-radius:0 0 3px 3px;box-sizing:border-box"></span><span style="position:absolute;left:0;top:1.5px;width:11px;height:1.5px;background:' + c + '"></span><span style="position:absolute;left:3.5px;top:-1px;width:4px;height:2.5px;border:1.5px solid ' + c + ';border-bottom:none;box-sizing:border-box"></span></span>';
  const row = (title, meta, tag, tagC, tagBg, last, state) =>
    '<div data-open="1" data-title="' + title.replace(/"/g, '&quot;') + '" style="padding:12px 0;' + (last ? '' : 'border-bottom:1px solid rgba(60,66,73,.1);') + 'display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;transition:filter .25s,opacity .25s;' + (state === 'dim' ? 'filter:blur(2px);opacity:.45;' : '') + '">' +
    '<span style="flex:1">' +
    (state === 'editing'
      ? '<input class="nk-redit" value="' + title.replace(/"/g, '&quot;') + '" style="width:90%;border:none;border-bottom:1px solid #1F8A96;background:none;outline:none;font:500 14.5px ' + SERIF + ';color:' + INK + ';padding:0 0 2px">'
      : '<span style="display:block;font:500 14.5px ' + SERIF + ';color:' + INK + '">' + title + '</span>') +
    '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.45)">' + meta + '</span></span>' +
    (state === 'focused'
      ? '<span style="display:flex;gap:8px;flex:none">' +
        '<button data-rb="edit" style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;font:400 14px ' + SANS + ';color:' + INK + '">\u270e</button>' +
        '<button data-rb="del" style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;display:flex;align-items:center;justify-content:center">' + trashIco(CLAY) + '</button></span>'
      : (tag ? '<span style="flex:none;font:500 11px ui-monospace,Menlo,monospace;letter-spacing:.08em;color:' + tagC + ';background:' + tagBg + ';border-radius:9px;padding:4px 9px">' + tag + '</span>' : '<span style="font:400 13px ' + SANS + ';color:rgba(60,66,73,.35)">\u203a</span>')) + '</div>';
  const dayHead = (t, first) => '<span style="font:600 11.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:rgba(60,66,73,.4);padding:' + (first ? '4' : '16') + 'px 0 2px">' + t + '</span>';

  const FOLDER_DATA = {
    'PRODUCT IDEAS': { c: '#177B83', bg: 'rgba(31,138,150,.1)', items: [['ideas while moving', 'today · 5 boxes · 1 open question'], ['talking to your notes', 'May 3 · 4 boxes · linked ×2'], ['voice memos rethink', 'Apr 28 · 3 boxes']] },
    'STORY IDEAS': { c: '#C4547E', bg: 'rgba(224,130,78,.1)', items: [['narrator hears you', 'Mar 12 · echoes “ideas while moving”'], ['walking chapters', 'Feb 20 · 2 boxes']] },
    'CAREER': { c: 'rgba(60,66,73,.55)', bg: 'rgba(60,66,73,.07)', items: [['teach by voice?', 'Jun 30 · open question · continued ×2']] },
    'PERSONAL QUESTIONS': { c: 'rgba(60,66,73,.55)', bg: 'rgba(60,66,73,.07)', items: [['what should I make next?', 'Jan 8 · open question'], ['morning pages, but spoken', 'today · 3 boxes']] },
  };

  class NapkilnApp extends HTMLElement {
    connectedCallback() {
      if (this._i) return; this._i = 1;
      this.libMode = 'folders';
      this.folders = [
        { label: 'PRODUCT IDEAS', color: '#177B83', bg: 'rgba(31,138,150,.09)', border: 'rgba(31,138,150,.18)', count: '12 thoughts · active', peek: 'ideas while moving', rot: -1.5 },
        { label: 'STORY IDEAS', color: '#C4547E', bg: 'rgba(224,130,78,.09)', border: 'rgba(224,130,78,.2)', count: '5 thoughts', peek: 'narrator hears you', rot: -1 },
        { label: 'CAREER', color: 'rgba(60,66,73,.55)', bg: 'rgba(60,66,73,.05)', border: 'rgba(60,66,73,.12)', count: '3 thoughts', peek: 'teach by voice?', rot: 1.5 },
        { label: 'PERSONAL QUESTIONS', color: 'rgba(60,66,73,.55)', bg: 'rgba(60,66,73,.05)', border: 'rgba(60,66,73,.12)', count: '4 thoughts', peek: 'what should I make next?', rot: -1 },
      ];
      this.fFocus = -1; this.fEditing = -1; this.fNew = false;
      this.rowFocus = null; this.rowEditing = null;
      this.recent = [
        { day: 'TODAY', items: [['ideas while moving', '2:14 pm \u00b7 5 boxes \u00b7 1 open question', 'PRODUCT', '#177B83', 'rgba(31,138,150,.1)'], ['morning pages, but spoken', '8:02 am \u00b7 3 boxes', 'PERSONAL', 'rgba(60,66,73,.55)', 'rgba(60,66,73,.07)']] },
        { day: 'YESTERDAY', items: [['teach by voice?', '6:40 pm \u00b7 open question \u00b7 continued \u00d72', 'CAREER', 'rgba(60,66,73,.55)', 'rgba(60,66,73,.07)']] },
        { day: 'MAY', items: [['talking to your notes', 'May 3 \u00b7 4 boxes \u00b7 linked \u00d72', 'PRODUCT', '#177B83', 'rgba(31,138,150,.1)'], ['narrator hears you', 'Mar 12 \u00b7 echoes \u201cideas while moving\u201d', 'STORY', '#C4547E', 'rgba(224,130,78,.1)']] },
      ];
      Object.assign(this.style, { display: 'block', position: 'absolute', inset: '0', fontFamily: SANS, background: '#F0EFEC', overflow: 'hidden' });
      this.innerHTML = '<div class="nk-screen" style="position:absolute;inset:0"></div>' +
        '<div class="nk-tabs" style="position:absolute;bottom:56px;left:50%;transform:translateX(-50%);display:flex;gap:4px;background:rgba(255,255,255,.9);border:1px solid rgba(60,66,73,.1);border-radius:26px;padding:5px;box-shadow:0 4px 16px rgba(60,66,73,.08);z-index:25"></div>';
      this._screen = this.querySelector('.nk-screen');
      this._tabs = this.querySelector('.nk-tabs');
      this._tabs.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]');
        if (t) this.go(t.getAttribute('data-tab'));
      });
      this.addEventListener('nk-record', () => { this.recordFolder = null; this.typedMode = false; this.go('record'); });
      this.addEventListener('nk-type', () => { this.recordFolder = null; this.typedMode = true; this.go('record'); });
      this.addEventListener('nk-talk', () => { this.recordFolder = null; this.go('record'); });
      this.addEventListener('nk-space', () => this.go('space'));
      this.addEventListener('nk-saved', () => {
        this._hist = []; this.go('space');
        this._review = null;
        setTimeout(() => { if (this._space && this._space.flashNode) this._space.flashNode(0); }, 300);
      });
      this.addEventListener('nk-new', () => { this._review = null; this.go('home'); });
      this.addEventListener('nk-back', () => this.goBack());
      this.addEventListener('nk-open', () => { this._previewFrom = 'space'; this.go('preview'); });
      this.addEventListener('nk-sheet', (e) => { this._tabs.style.display = e.detail ? 'none' : 'flex'; });
      this.renderOnboard(1); this.tabs(null);
    }
    renderOnboard(step) {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0;background:#F0EFEC';
      const skip = '<span data-ob="skip" style="position:absolute;top:74px;right:24px;font:500 13px ' + SANS + ';color:rgba(60,66,73,.45);cursor:pointer;padding:6px">Skip</span>';
      const dots = '<span style="position:absolute;bottom:132px;left:0;right:0;display:flex;justify-content:center;gap:7px">' + [1, 2, 3].map(i => '<span style="width:7px;height:7px;border-radius:50%;background:' + (i === step ? INK : 'rgba(60,66,73,.2)') + '"></span>').join('') + '</span>';
      const nextBtn = (label) => '<div style="position:absolute;bottom:56px;left:24px;right:24px"><button data-ob="next" style="width:100%;height:52px;border-radius:26px;border:none;background:' + INK + ';color:#F0EFEC;font:500 15px ' + SANS + ';cursor:pointer">' + label + '</button></div>';
      if (step === 1) {
        d.innerHTML = skip +
          '<div style="position:absolute;top:0;bottom:180px;left:36px;right:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center">' +
          '<span style="position:relative;width:110px;height:110px">' +
          '<span style="position:absolute;inset:-18px;border-radius:50%;background:radial-gradient(circle,rgba(31,138,150,.12) 0%,rgba(31,138,150,0) 68%);animation:breathe 4.5s ease-in-out infinite"></span>' +
          '<span style="position:absolute;inset:10px;background:linear-gradient(150deg,rgba(31,138,150,.26),rgba(31,138,150,.08));animation:blobB 8s ease-in-out infinite"></span>' +
          '<span style="position:absolute;inset:19px;background:linear-gradient(320deg,#4FA3AE,#177B83);animation:blobA 6.5s ease-in-out infinite"></span></span>' +
          '<span style="font:600 26px ' + SANS + ';letter-spacing:-.01em;color:' + INK + '">napkiln</span>' +
          '<span style="font:400 17px/1.5 ' + SANS + ';color:rgba(60,66,73,.7)">Speak an idea.<br>We\u2019ll help you see its shape.</span></div>' +
          dots + nextBtn('Continue');
      } else if (step === 2) {
        const box = (t, c, x, delay, dashed) => '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(255,255,255,' + (dashed ? '.5' : '.8') + ');border:1px ' + (dashed ? 'dashed rgba(224,130,78,.5)' : 'solid rgba(60,66,73,.12)') + ';border-radius:10px;padding:8px 16px;animation:buildin .6s ease-out ' + delay + 's both"><span style="font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.12em;color:' + c + '">' + t + '</span><span style="font:400 13px ' + SANS + ';color:' + INK + '">' + x + '</span></div>';
        d.innerHTML = skip +
          '<div style="position:absolute;top:0;bottom:180px;left:36px;right:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">' +
          '<span style="font:400 14px/1.5 ' + SANS + ';color:rgba(60,66,73,.55);text-align:center;animation:buildin .6s ease-out both">\u201cI keep having ideas on walks\u2026<br>but I never open my voice notes again\u201d</span>' +
          '<span style="width:1px;height:26px;background:rgba(31,138,150,.4);animation:buildin .5s ease-out .5s both"></span>' +
          box('PROBLEM', '#1F8A96', 'voice notes go unheard', .8) +
          '<span style="width:1px;height:18px;background:rgba(31,138,150,.4);animation:buildin .4s ease-out 1.3s both"></span>' +
          box('OPPORTUNITY', '#1F8A96', 'see the idea take shape', 1.5) +
          '<span style="width:1px;height:18px;background:rgba(31,138,150,.4);animation:buildin .4s ease-out 2s both"></span>' +
          box('OPEN QUESTION', '#E0824E', 'where does it go next?', 2.2, true) +
          '<span style="font:400 13px ' + SANS + ';color:rgba(60,66,73,.5);text-align:center;margin-top:6px;animation:buildin .6s ease-out 2.8s both">While you talk, napkiln quietly builds<br>the structure of your thought.</span></div>' +
          dots + nextBtn('Continue');
      } else {
        d.innerHTML =
          '<div style="position:absolute;top:0;bottom:180px;left:36px;right:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center">' +
          '<span style="width:72px;height:72px;border-radius:50%;background:rgba(31,138,150,.1);display:flex;align-items:center;justify-content:center">' +
          '<span style="position:relative;width:18px;height:27px;display:inline-block"><span style="position:absolute;left:4px;top:0;width:10px;height:16px;border-radius:5px;background:#1F8A96"></span><span style="position:absolute;left:0;top:9px;width:18px;height:13px;border:2.5px solid #1F8A96;border-top:none;border-radius:0 0 10px 10px;box-sizing:border-box"></span><span style="position:absolute;left:8px;bottom:-4px;width:2.5px;height:5px;background:#1F8A96"></span></span></span>' +
          '<span style="font:500 19px ' + SANS + ';color:' + INK + '">napkiln needs your microphone</span>' +
          '<span style="font:400 14px/1.6 ' + SANS + ';color:rgba(60,66,73,.6)">Only while you\u2019re recording \u2014 never in the background. Audio is processed on your device, and you can delete any recording.</span></div>' +
          dots +
          '<div style="position:absolute;bottom:56px;left:24px;right:24px;display:flex;flex-direction:column;gap:10px">' +
          '<button data-ob="next" style="width:100%;height:52px;border-radius:26px;border:none;background:' + INK + ';color:#F0EFEC;font:500 15px ' + SANS + ';cursor:pointer">Allow microphone</button>' +
          '<button data-ob="skip" style="width:100%;height:44px;border-radius:22px;border:none;background:none;font:500 13.5px ' + SANS + ';color:rgba(60,66,73,.5);cursor:pointer">Not now \u2014 I\u2019ll type instead</button></div>';
      }
      d.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ob]');
        if (!b) return;
        const a = b.getAttribute('data-ob');
        if (a === 'skip' || (a === 'next' && step === 3)) { this._hist = []; this.go('home'); }
        else this.renderOnboard(step + 1);
      });
      this.mount(d);
      this.tabs(null);
    }
    goBack() { const prev = (this._hist && this._hist.pop()) || 'home'; this._navBack = true; this.go(prev, true); }
    tabs(active) {
      if (!active) { this._tabs.style.display = 'none'; return; }
      this._tabs.style.display = 'flex';
      this._tabs.innerHTML = [['home', 'Capture'], ['space', 'Space'], ['library', 'Library']].map(([id, l]) =>
        '<span data-tab="' + id + '" style="padding:10px 18px;border-radius:20px;font:500 13px ' + SANS + ';cursor:pointer;' + (active === id ? 'background:' + INK + ';color:#F0EFEC' : 'color:rgba(60,66,73,.55)') + '">' + l + '</span>').join('');
    }
    mount(el, swap) {
      if (swap) { this._screen.innerHTML = ''; this._screen.appendChild(el); return; }
      const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const old = this._screen.firstElementChild;
      const back = this._navBack; this._navBack = false;
      if (rm || !old) {
        this._screen.innerHTML = ''; this._screen.appendChild(el);
        if (!rm && !old) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' }); }
        return;
      }
      const dx = back ? 26 : -26;
      Object.assign(old.style, { pointerEvents: 'none' });
      const out = old.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(' + dx + 'px)' }], { duration: 190, easing: 'ease-in' });
      out.onfinish = () => { old.remove(); old.style.pointerEvents = ''; };
      this._screen.appendChild(el);
      el.animate([{ opacity: 0, transform: 'translateX(' + (-dx) + 'px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
    }
    go(s, noPush) {
      if (this._speechCap && s !== 'record') { this._speechCap.stop(); this._speechCap = null; }
      if (!noPush && this._cur && this._cur !== s) (this._hist = this._hist || []).push(this._cur);
      this._cur = s;
      if (s === 'record' || s === 'review') {
        // a fresh recording shouldn't land on a stale saved screen
        if (this._review && this._review.stage === 'saved') this._review = null;
      }
      if (s === 'home') {
        if (!this._home) { this._home = document.createElement('napkiln-capture-start'); this._home.setAttribute('embedded', ''); }
        this.mount(this._home); this.tabs('home');
      } else if (s === 'record') {
        this.renderRecord(); this.tabs(null);
      } else if (s === 'review') {
        if (this._pendingGraph) {
          this._review = document.createElement('napkiln-graph-edit2');
          this._review.graph = this._pendingGraph;
          this._pendingGraph = null;
        }
        if (!this._review) this._review = document.createElement('napkiln-graph-edit2');
        this.mount(this._review); this.tabs(null);
      } else if (s === 'space') {
        if (!this._space) { this._space = document.createElement('napkiln-space'); this._space.setAttribute('embedded', ''); }
        this.mount(this._space); this.tabs('space');
      } else if (s === 'preview') {
        if (!this._preview) { this._preview = document.createElement('napkiln-graph-edit2'); this._preview.setAttribute('mode', 'preview'); }
        this.mount(this._preview); this.tabs(null);
      } else if (s === 'library') {
        this.renderLibrary(); this.tabs('library');
      } else if (s === 'folder') {
        this.renderFolder(); this.tabs('library');
      }
    }
    renderRecord() {
      // Live AI structuring by default; ?demo keeps exploration 5a's scripted recording
      if (/[?&]demo\b/.test(location.search) || !window.NapkilnAI) { this.renderRecordDemo(); return; }
      this.renderRecordLive();
    }
    renderRecordLive() {
      const AI = window.NapkilnAI;
      const speechOK = AI.SpeechCapture && AI.SpeechCapture.available();
      let typed = this.typedMode || !speechOK;
      let structurer = AI.createStructurer();
      const tpl = this._home && this._home.sel && this._home.sel !== 'free'
        ? { ps: 'Problem → Solution', seq: 'Sequence', cmp: 'Weighing options', q: 'Around a question' }[this._home.sel] : null;
      const state = { transcript: '', interim: '', nodes: [], edges: [] };
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0';
      const engineLabel = () => structurer.engine === 'Claude' ? 'Claude' : 'on-device';
      d.innerHTML =
        '<div style="position:absolute;top:74px;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:0 24px">' +
        '<span style="font:600 15px ' + SANS + ';letter-spacing:-.01em;color:' + INK + '">napkiln</span>' +
        '<span class="nk-status" title="tap to change AI engine" style="display:flex;align-items:center;gap:6px;font:500 11px ' + SANS + ';color:' + TEAL + ';cursor:pointer"><span style="width:6px;height:6px;border-radius:50%;background:' + TEAL + ';animation:breathe 2s ease-in-out infinite"></span>' + (typed ? 'typing' : 'listening') + ' · ' + engineLabel() + '</span></div>' +
        (this.recordFolder ? '<div style="position:absolute;top:104px;left:0;right:0;text-align:center;font:400 12px ' + SANS + ';color:rgba(60,66,73,.45)">adding to <span style="color:' + TEAL + ';font-weight:500">' + this.recordFolder.toLowerCase() + '</span></div>' : '') +
        (tpl ? '<div style="position:absolute;top:' + (this.recordFolder ? 122 : 104) + 'px;left:0;right:0;text-align:center;font:400 11px ' + SANS + ';color:rgba(60,66,73,.35)">shape: ' + tpl.toLowerCase() + '</div>' : '') +
        '<div class="nk-livegraph" style="position:absolute;top:140px;bottom:' + (typed ? 270 : 235) + 'px;left:24px;right:24px;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:0"></div>' +
        (typed
          ? '<textarea class="nk-typebox" placeholder="Type your thought — napkiln structures as you go…" style="position:absolute;bottom:135px;left:24px;right:24px;height:112px;box-sizing:border-box;resize:none;border:1px solid rgba(60,66,73,.15);border-radius:14px;background:rgba(255,255,255,.75);padding:12px 14px;outline:none;font:400 13.5px/1.5 ' + SANS + ';color:' + INK + '"></textarea>'
          : '<div class="nk-transcript" style="position:absolute;bottom:160px;left:40px;right:40px;max-height:64px;overflow:hidden;text-align:center;font:400 15px/1.5 ' + SERIF + ';color:rgba(60,66,73,.45)"></div>' +
            '<div style="position:absolute;bottom:130px;left:0;right:0;display:flex;justify-content:center;align-items:flex-end;gap:3px;height:16px" class="nk-eq">' +
            [1, .8, 1.15, .9, 1.05].map((t, i) => '<span style="width:3px;height:14px;border-radius:2px;background:' + TEAL + ';animation:eq ' + t + 's ease-in-out ' + (i * 0.12) + 's infinite;transform-origin:bottom"></span>').join('') + '</div>') +
        '<div style="position:absolute;bottom:56px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:14px">' +
        '<button class="nk-rcancel" style="height:56px;padding:0 20px;border-radius:28px;border:1px solid rgba(60,66,73,.2);background:none;font:500 14px ' + SANS + ';color:rgba(60,66,73,.6);cursor:pointer">Cancel</button>' +
        (typed ? '' : '<button class="nk-pause" style="width:56px;height:56px;border-radius:50%;border:1px solid rgba(60,66,73,.18);background:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;cursor:pointer"><span class="nk-pi" style="display:flex;gap:5px"><span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span><span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span></span></button>') +
        '<button class="nk-done" style="height:56px;padding:0 30px;border-radius:28px;border:none;background:' + INK + ';color:#F0EFEC;font:500 16px ' + SANS + ';cursor:pointer">Done</button></div>';
      const graphEl = d.querySelector('.nk-livegraph');
      const emptyHint = () => {
        graphEl.innerHTML = '<div style="margin:auto;display:flex;flex-direction:column;align-items:center;gap:16px">' +
          '<span style="position:relative;width:90px;height:90px">' +
          '<span style="position:absolute;inset:-16px;border-radius:50%;background:radial-gradient(circle,rgba(31,138,150,.13) 0%,rgba(31,138,150,0) 68%);animation:breathe 3.6s ease-in-out infinite"></span>' +
          '<span style="position:absolute;inset:8px;background:linear-gradient(150deg,rgba(31,138,150,.3),rgba(31,138,150,.1));animation:blobB 6s ease-in-out infinite"></span>' +
          '<span style="position:absolute;inset:16px;background:linear-gradient(320deg,#4FA3AE,#177B83);animation:blobA 4.5s ease-in-out infinite"></span></span>' +
          '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.45)">' + (typed ? 'start typing — the structure builds as you go' : 'start talking — napkiln structures quietly') + '</span></div>';
      };
      emptyHint();
      const renderGraph = (prevCount) => {
        if (!state.nodes.length) { emptyHint(); return; }
        let h = '';
        state.nodes.forEach((n, i) => {
          const fresh = i >= prevCount;
          if (i > 0) {
            const label = (state.edges[i - 1] && state.edges[i - 1].label) || '·';
            h += '<span style="position:relative;width:1px;height:22px;flex:none;background:rgba(31,138,150,.45);' + (fresh ? 'animation:buildin .5s ease-out both;' : '') + '"><span style="position:absolute;left:9px;top:4px;font:400 11.5px ' + SANS + ';color:' + TEAL + ';white-space:nowrap">' + label + '</span></span>';
          }
          h += '<div style="flex:none;display:flex;flex-direction:column;align-items:center;gap:3px;background:rgba(255,255,255,' + (n.solid ? '.65' : '.4') + ');border:1px ' + (n.solid ? 'solid rgba(60,66,73,.12)' : 'dashed rgba(224,130,78,.5)') + ';border-radius:12px;padding:10px 20px;max-width:280px;' + (fresh ? 'animation:buildin .6s ease-out both;' : '') + '">' +
            '<span style="font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + n.c + '">' + n.type + '</span>' +
            '<span style="font:400 14px ' + SERIF + ';color:' + INK + ';text-align:center">' + n.text + '</span></div>';
        });
        graphEl.innerHTML = h;
        graphEl.scrollTop = graphEl.scrollHeight;
      };
      const delay = () => structurer.engine === 'Claude' ? 1200 : 350;
      let timer = null, busy = false, dirty = false;
      const run = async () => {
        if (busy) { dirty = true; return; }
        busy = true;
        const text = (state.transcript + ' ' + state.interim).trim();
        if (text) {
          const g = await structurer.structure(text, { template: tpl });
          if (d.isConnected) {
            const prev = state.nodes.length;
            state.nodes = g.nodes; state.edges = g.edges;
            renderGraph(prev);
          }
        } else if (d.isConnected) { state.nodes = []; state.edges = []; emptyHint(); }
        busy = false;
        if (dirty) { dirty = false; timer = setTimeout(run, delay()); }
      };
      const schedule = () => { clearTimeout(timer); timer = setTimeout(run, delay()); };
      if (typed) {
        const box = d.querySelector('.nk-typebox');
        box.addEventListener('input', () => { state.transcript = box.value; schedule(); });
        setTimeout(() => box.focus(), 300);
      } else {
        const strip = d.querySelector('.nk-transcript');
        this._speechCap = new AI.SpeechCapture();
        const ok = this._speechCap.start((final, interim) => {
          state.transcript = final; state.interim = interim;
          const tail = (final + ' ' + interim).trim();
          strip.innerHTML = tail.length > 110 ? '…' + tail.slice(-110) : tail;
          schedule();
        }, (st) => {
          if (st === 'denied' && d.isConnected) { this.typedMode = true; this.renderRecordLive(); }
        });
        if (!ok) { this.typedMode = true; this.renderRecordLive(); return; }
      }
      d.querySelector('.nk-status').addEventListener('click', () => {
        const cur = AI.getApiKey();
        const v = prompt('napkiln AI engine\n\nPaste an Anthropic API key to structure with Claude (claude-opus-4-8), or clear to use the on-device engine.', cur || '');
        if (v === null) return;
        AI.setApiKey(v.trim());
        structurer = AI.createStructurer();
        const s = d.querySelector('.nk-status');
        s.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:' + TEAL + ';animation:breathe 2s ease-in-out infinite"></span>' + (typed ? 'typing' : 'listening') + ' · ' + engineLabel();
        schedule();
      });
      d.querySelector('.nk-done').addEventListener('click', () => {
        clearTimeout(timer);
        if (this._speechCap) { this._speechCap.stop(); this._speechCap = null; }
        if (state.nodes.length) {
          const t = state.nodes.find(n => n.type === 'OPPORTUNITY' || n.type === 'IDEA') || state.nodes[0];
          let title = t.text.replace(/[?.]$/, '');
          if (title.length > 34) title = title.slice(0, 34).replace(/\s\S*$/, '') + '…';
          this._pendingGraph = { nodes: state.nodes, edges: state.edges, title: title.charAt(0).toUpperCase() + title.slice(1) };
          this._review = null;
        }
        this.recordFolder = null; this.go('review');
      });
      const pauseBtn = d.querySelector('.nk-pause');
      if (pauseBtn) {
        let paused = false;
        pauseBtn.addEventListener('click', () => {
          paused = !paused;
          if (this._speechCap) paused ? this._speechCap.pause() : this._speechCap.resume();
          pauseBtn.querySelector('.nk-pi').innerHTML = paused
            ? '<span style="width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:14px solid ' + INK + ';margin-left:3px"></span>'
            : '<span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span><span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span>';
          const st = d.querySelector('.nk-status');
          st.innerHTML = paused
            ? '<span style="width:6px;height:6px;border-radius:50%;background:rgba(60,66,73,.4)"></span>paused'
            : '<span style="width:6px;height:6px;border-radius:50%;background:' + TEAL + ';animation:breathe 2s ease-in-out infinite"></span>listening · ' + engineLabel();
        });
      }
      d.querySelector('.nk-rcancel').addEventListener('click', () => {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(60,66,73,.3);padding:0 32px';
        ov.innerHTML = '<div style="background:#FFFFFF;border-radius:18px;box-shadow:0 14px 40px rgba(60,66,73,.25);padding:22px 22px 18px;width:100%;box-sizing:border-box">' +
          '<div style="font:500 15px ' + SANS + ';color:' + INK + ';margin-bottom:6px">Discard this recording?</div>' +
          '<div style="font:400 12.5px/1.5 ' + SANS + ';color:rgba(60,66,73,.6);margin-bottom:16px">Nothing will be saved.</div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button data-c="cancel" style="height:42px;padding:0 18px;border-radius:21px;border:1px solid rgba(60,66,73,.18);background:none;font:500 13px ' + SANS + ';color:' + INK + ';cursor:pointer">Keep going</button>' +
          '<button data-c="del" style="height:42px;padding:0 20px;border-radius:21px;border:none;background:' + CLAY + ';color:#F0EFEC;font:500 13px ' + SANS + ';cursor:pointer">Discard</button></div></div>';
        ov.addEventListener('click', (e2) => {
          if (e2.target.closest('[data-c="del"]')) {
            clearTimeout(timer);
            if (this._speechCap) { this._speechCap.stop(); this._speechCap = null; }
            ov.remove(); this.recordFolder = null; this.goBack();
          } else if (e2.target.closest('[data-c="cancel"]') || e2.target === ov) ov.remove();
        });
        this.appendChild(ov);
      });
      this.mount(d);
    }
    renderRecordDemo() {
      const boxRow = (type, color, text, delay, dashed) =>
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;background:rgba(255,255,255,' + (dashed ? '.4' : '.65') + ');border:1px ' + (dashed ? 'dashed rgba(224,130,78,.5)' : 'solid rgba(60,66,73,.12)') + ';border-radius:12px;padding:10px 24px;animation:buildin .7s ease-out ' + delay + 's both">' +
        '<span style="font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + color + '">' + type + '</span>' +
        '<span style="font:400 14px ' + SERIF + ';color:' + INK + '">' + text + '</span></div>';
      const conn = (label, delay) => '<span style="position:relative;width:1px;height:22px;background:rgba(31,138,150,.45);animation:buildin .5s ease-out ' + delay + 's both"><span style="position:absolute;left:9px;top:4px;font:400 11.5px ' + SANS + ';color:' + TEAL + ';white-space:nowrap">' + label + '</span></span>';
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0';
      d.innerHTML =
        '<div style="position:absolute;top:74px;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:0 24px">' +
        '<span style="font:600 15px ' + SANS + ';letter-spacing:-.01em;color:' + INK + '">napkiln</span>' +
        '<span class="nk-status" style="display:flex;align-items:center;gap:6px;font:500 11px ' + SANS + ';color:' + TEAL + '"><span style="width:6px;height:6px;border-radius:50%;background:' + TEAL + ';animation:breathe 2s ease-in-out infinite"></span>listening · on-device</span></div>' +
        (this.recordFolder ? '<div style="position:absolute;top:104px;left:0;right:0;text-align:center;font:400 12px ' + SANS + ';color:rgba(60,66,73,.45)">adding to <span style="color:' + TEAL + ';font-weight:500">' + this.recordFolder.toLowerCase() + '</span></div>' : '') +
        '<div style="position:absolute;bottom:285px;left:0;right:0;display:flex;justify-content:center">' +
        '<button class="nk-structoggle" style="display:flex;align-items:center;gap:10px;border:1px solid rgba(60,66,73,.15);background:rgba(255,255,255,.75);border-radius:22px;padding:11px 20px;font:500 13.5px ' + SANS + ';color:rgba(60,66,73,.65);cursor:pointer"><span class="nk-sw" style="position:relative;width:36px;height:21px;border-radius:11px;background:' + TEAL + ';transition:background .2s;flex:none"><span class="nk-swdot" style="position:absolute;top:2.5px;left:18px;width:16px;height:16px;border-radius:50%;background:#FFFFFF;transition:left .2s"></span></span><span class="nk-swlabel">structure visible</span></button></div>' +
        '<div class="nk-struct" style="position:absolute;top:118px;left:36px;right:36px;display:flex;flex-direction:column;align-items:center;gap:0;transition:opacity .3s">' +
        boxRow('PROBLEM', TEAL, 'voice notes go unheard', 0.4) + conn('led to', 1) +
        '<div style="display:flex;align-items:center;gap:8px;animation:buildin .7s ease-out 1.4s both">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(255,255,255,.5);border:1px dashed rgba(60,66,73,.18);border-radius:10px;padding:7px 12px;opacity:.85">' +
        '<span style="font:600 10.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:rgba(31,138,150,.8)">CONTEXT</span>' +
        '<span style="font:400 12px ' + SERIF + ';color:rgba(60,66,73,.7)">ideas happen while moving</span></div>' +
        '<span style="width:20px;height:0;border-top:1px dashed rgba(31,138,150,.5)"></span>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;background:rgba(255,255,255,.65);border:1px solid rgba(60,66,73,.12);border-radius:12px;padding:9px 16px">' +
        '<span style="font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + TEAL + '">OPPORTUNITY</span>' +
        '<span style="font:400 14px ' + SERIF + ';color:' + INK + '">visualize how the idea develops</span></div></div>' +
        conn('but', 2.2) + boxRow('CONSTRAINT', CLAY, 'mind maps feel rigid', 2.6) +
        conn('raises', 3.3) + boxRow('OPEN QUESTION', CLAY, 'thoughts containing smaller thoughts?', 3.7, true) + '</div>' +
        '<div class="nk-quiet" style="position:absolute;top:118px;bottom:340px;left:0;right:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px">' +
        '<span style="position:relative;width:130px;height:130px">' +
        '<span style="position:absolute;inset:-20px;border-radius:50%;background:radial-gradient(circle,rgba(31,138,150,.14) 0%,rgba(31,138,150,0) 68%);animation:breathe 3.6s ease-in-out infinite"></span>' +
        '<span style="position:absolute;inset:12px;background:linear-gradient(150deg,rgba(31,138,150,.32),rgba(31,138,150,.1));animation:blobB 6s ease-in-out infinite"></span>' +
        '<span style="position:absolute;inset:22px;background:linear-gradient(320deg,#4FA3AE,#177B83);animation:blobA 4.5s ease-in-out infinite;box-shadow:0 14px 32px rgba(23,123,131,.28)"></span></span>' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.45)">napkiln is structuring quietly in the background</span></div>' +
        '<div style="position:absolute;bottom:220px;left:44px;right:44px;text-align:center;font:400 16px/1.5 ' + SERIF + ';color:rgba(60,66,73,.45)">…more like <span style="color:' + INK + '">entering a space where each thought contains smaller thoughts…</span></div>' +
        '<div style="position:absolute;bottom:160px;left:0;right:0;display:flex;justify-content:center;align-items:flex-end;gap:3px;height:16px">' +
        [1, .8, 1.15, .9, 1.05].map((t, i) => '<span style="width:3px;height:14px;border-radius:2px;background:' + TEAL + ';animation:eq ' + t + 's ease-in-out ' + (i * 0.12) + 's infinite;transform-origin:bottom"></span>').join('') + '</div>' +
        '<div style="position:absolute;bottom:56px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:14px">' +
        '<button class="nk-rcancel" style="height:56px;padding:0 20px;border-radius:28px;border:1px solid rgba(60,66,73,.2);background:none;font:500 14px ' + SANS + ';color:rgba(60,66,73,.6);cursor:pointer">Cancel</button>' +
        '<button class="nk-pause" style="width:56px;height:56px;border-radius:50%;border:1px solid rgba(60,66,73,.18);background:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;cursor:pointer"><span class="nk-pi" style="display:flex;gap:5px"><span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span><span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span></span></button>' +
        '<button class="nk-done" style="height:56px;padding:0 30px;border-radius:28px;border:none;background:' + INK + ';color:#F0EFEC;font:500 16px ' + SANS + ';cursor:pointer">Done</button></div>';
      d.querySelector('.nk-done').addEventListener('click', () => { this.recordFolder = null; this.go('review'); });
      const tog = d.querySelector('.nk-structoggle');
      let visible = true;
      tog.addEventListener('click', () => {
        visible = !visible;
        d.querySelector('.nk-struct').style.display = visible ? 'flex' : 'none';
        d.querySelector('.nk-quiet').style.display = visible ? 'none' : 'flex';
        d.querySelector('.nk-sw').style.background = visible ? TEAL : 'rgba(60,66,73,.25)';
        d.querySelector('.nk-swdot').style.left = visible ? '18px' : '2.5px';
        d.querySelector('.nk-swlabel').textContent = visible ? 'structure visible' : 'structure hidden';
      });
      let paused = false;
      d.querySelector('.nk-pause').addEventListener('click', () => {
        paused = !paused;
        d.querySelectorAll('*').forEach(el => { if (el.style && el.style.animationName) el.style.animationPlayState = paused ? 'paused' : 'running'; });
        d.querySelector('.nk-pi').innerHTML = paused
          ? '<span style="width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:14px solid ' + INK + ';margin-left:3px"></span>'
          : '<span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span><span style="width:4px;height:16px;border-radius:2px;background:' + INK + '"></span>';
        const st = d.querySelector('.nk-status');
        if (st) st.innerHTML = paused
          ? '<span style="width:6px;height:6px;border-radius:50%;background:rgba(60,66,73,.4)"></span>paused'
          : '<span style="width:6px;height:6px;border-radius:50%;background:' + TEAL + ';animation:breathe 2s ease-in-out infinite"></span>listening · on-device';
      });
      d.querySelector('.nk-rcancel').addEventListener('click', () => {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(60,66,73,.3);padding:0 32px';
        ov.innerHTML = '<div style="background:#FFFFFF;border-radius:18px;box-shadow:0 14px 40px rgba(60,66,73,.25);padding:22px 22px 18px;width:100%;box-sizing:border-box">' +
          '<div style="font:500 15px ' + SANS + ';color:' + INK + ';margin-bottom:6px">Discard this recording?</div>' +
          '<div style="font:400 12.5px/1.5 ' + SANS + ';color:rgba(60,66,73,.6);margin-bottom:16px">Nothing will be saved.</div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button data-c="cancel" style="height:42px;padding:0 18px;border-radius:21px;border:1px solid rgba(60,66,73,.18);background:none;font:500 13px ' + SANS + ';color:' + INK + ';cursor:pointer">Keep talking</button>' +
          '<button data-c="del" style="height:42px;padding:0 20px;border-radius:21px;border:none;background:' + CLAY + ';color:#F0EFEC;font:500 13px ' + SANS + ';cursor:pointer">Discard</button></div></div>';
        ov.addEventListener('click', (e2) => {
          if (e2.target.closest('[data-c="del"]')) { ov.remove(); this.recordFolder = null; this.goBack(); }
          else if (e2.target.closest('[data-c="cancel"]') || e2.target === ov) ov.remove();
        });
        this.appendChild(ov);
      });
      this.mount(d);
    }
    renderLibrary(swap) {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0';
      const foldersBody =
        '<div style="margin:24px 24px 0;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:start">' +
        this.folders.map((f, i) => folderCard(f, this.fFocus < 0 ? 'normal' : (this.fFocus === i ? 'focused' : 'dim'), this.fEditing === i)).join('') +
        (this.fNew
          ? '<div style="grid-column:1/-1;display:flex;align-items:center;gap:10px;border:1px solid ' + TEAL + ';border-radius:14px;padding:12px 14px"><input class="nk-fnew" placeholder="Folder name" style="flex:1;border:none;background:none;outline:none;font:500 13px ' + SANS + ';color:' + INK + '"><button data-fnewok="1" style="border:none;background:' + INK + ';color:#F0EFEC;border-radius:14px;padding:8px 14px;font:500 12px ' + SANS + ';cursor:pointer">Add</button></div>'
          : '<div data-fnew="1" style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(60,66,73,.2);border-radius:14px;padding:12px;font:500 12px ' + SANS + ';color:rgba(60,66,73,.45);cursor:pointer">+ new folder</div>') + '</div>';
      const rowState = (t) => this.rowEditing === t ? 'editing' : (this.rowFocus == null ? null : (this.rowFocus === t ? 'focused' : 'dim'));
      const recentBody =
        '<div style="margin:4px 24px 0;display:flex;flex-direction:column">' +
        this.recent.map((g, gi) => dayHead(g.day, gi === 0) + g.items.map((it, ii) =>
          row(it[0], it[1], it[2], it[3], it[4], gi === this.recent.length - 1 && ii === g.items.length - 1, rowState(it[0]))).join('')).join('') + '</div>';
      d.innerHTML =
        '<div style="position:absolute;top:70px;left:24px;right:24px;display:flex;justify-content:space-between;align-items:baseline">' +
        '<span style="font:500 24px ' + SERIF + ';color:' + INK + '">Library</span>' +
        '<div class="nk-libtoggle" style="display:flex;gap:2px;background:rgba(60,66,73,.06);border-radius:14px;padding:3px">' +
        ['folders', 'recent'].map(m => '<span data-lib="' + m + '" style="padding:6px 12px;border-radius:11px;font:500 11.5px ' + SANS + ';cursor:pointer;' + (this.libMode === m ? 'background:#FFFFFF;color:' + INK + ';box-shadow:0 1px 4px rgba(60,66,73,.1)' : 'color:rgba(60,66,73,.5)') + '">' + (m === 'folders' ? 'Folders' : 'Recent') + '</span>').join('') + '</div></div>' +
        '<div style="position:absolute;top:122px;left:0;right:0;bottom:126px;display:flex;flex-direction:column;overflow:hidden">' + (this.libMode === 'folders' ? search : '') +
        (this.libMode === 'folders' ? foldersBody : recentBody) + '</div>';
      d.querySelector('.nk-libtoggle').addEventListener('click', (e) => {
        const t = e.target.closest('[data-lib]');
        if (t) { this.libMode = t.getAttribute('data-lib'); this.renderLibrary(true); }
      });
      d.addEventListener('contextmenu', (e) => {
        const r = e.target.closest('[data-title]');
        if (r) { e.preventDefault(); this.rowFocus = r.getAttribute('data-title'); this.rowEditing = null; this.renderLibrary(true); return; }
        const f = e.target.closest('[data-folder]');
        if (f) { e.preventDefault(); this.fFocus = this.folders.findIndex(x => x.label === f.getAttribute('data-folder')); this.fEditing = -1; this._fLpFired = true; this.renderLibrary(true); }
      });
      d.addEventListener('pointerdown', (e) => {
        const f = e.target.closest('[data-folder]');
        if (!f || e.target.closest('[data-fb]') || e.target.closest('.nk-fedit')) return;
        this._fLp = setTimeout(() => { this.fFocus = this.folders.findIndex(x => x.label === f.getAttribute('data-folder')); this.fEditing = -1; this._fLpFired = true; this.renderLibrary(true); }, 420);
      });
      ['pointerup', 'pointerleave'].forEach(ev => d.addEventListener(ev, () => clearTimeout(this._fLp)));
      d.addEventListener('click', (e) => {
        const fb = e.target.closest('[data-fb]');
        if (fb) {
          const a = fb.getAttribute('data-fb'), i = this.fFocus;
          if (a === 'edit') {
            this.fEditing = i; this.renderLibrary(true);
            const inp = this._screen.querySelector('.nk-fedit');
            if (inp) {
              inp.focus(); inp.select();
              const commit = () => { const v = inp.value.trim(); if (v) this.folders[i].label = v.toUpperCase(); this.fEditing = -1; this.fFocus = -1; this.renderLibrary(true); };
              inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(); });
              inp.addEventListener('blur', commit);
            }
          } else if (a === 'del') this.confirmFolderDelete(i);
          e.stopPropagation(); return;
        }
        if (e.target.closest('.nk-fedit') || e.target.closest('.nk-fnew')) return;
        if (e.target.closest('[data-fnewok]')) { this.commitNewFolder(); return; }
        if (e.target.closest('[data-fnew]')) {
          this.fNew = true; this.renderLibrary(true);
          const inp = this._screen.querySelector('.nk-fnew');
          if (inp) { inp.focus(); inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') this.commitNewFolder(); }); }
          return;
        }
        const rb = e.target.closest('[data-rb]');
        if (rb) {
          const a = rb.getAttribute('data-rb'), t = this.rowFocus;
          if (a === 'edit') {
            this.rowEditing = t; this.renderLibrary(true);
            const inp = this._screen.querySelector('.nk-redit');
            if (inp) {
              inp.focus(); inp.select();
              const commit = () => { const v = inp.value.trim(); if (v) this.renameThought(t, v); this.rowEditing = null; this.rowFocus = null; this.renderLibrary(true); };
              inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(); });
              inp.addEventListener('blur', commit);
            }
          } else if (a === 'del') this.confirmThoughtDelete(t, () => this.renderLibrary(true));
          e.stopPropagation(); return;
        }
        if (e.target.closest('.nk-redit')) return;
        if (this.rowFocus != null) { this.rowFocus = null; this.rowEditing = null; this.renderLibrary(true); return; }
        if (this._fLpFired) { this._fLpFired = false; return; }
        if (this.fFocus >= 0) { this.fFocus = -1; this.fEditing = -1; this.renderLibrary(true); return; }
        const f = e.target.closest('[data-folder]');
        if (f) { this.folder = f.getAttribute('data-folder'); this.go('folder'); return; }
        if (e.target.closest('[data-open]')) { this._previewFrom = 'library'; this.go('preview'); }
      });
      this.mount(d, swap);
    }
    commitNewFolder() {
      const inp = this._screen.querySelector('.nk-fnew');
      const v = inp && inp.value.trim();
      if (v) {
        this.folders.push({ label: v.toUpperCase(), color: 'rgba(60,66,73,.55)', bg: 'rgba(60,66,73,.05)', border: 'rgba(60,66,73,.12)', count: '0 thoughts', peek: 'nothing here yet', rot: 1 });
        FOLDER_DATA[v.toUpperCase()] = { c: 'rgba(60,66,73,.55)', bg: 'rgba(60,66,73,.07)', items: [] };
      }
      this.fNew = false; this.renderLibrary(true);
    }
    renameThought(oldT, newT) {
      this.recent.forEach(g => g.items.forEach(it => { if (it[0] === oldT) it[0] = newT; }));
      Object.values(FOLDER_DATA).forEach(f => f.items.forEach(it => { if (it[0] === oldT) it[0] = newT; }));
    }
    deleteThought(t) {
      this.recent.forEach(g => g.items = g.items.filter(it => it[0] !== t));
      this.recent = this.recent.filter(g => g.items.length);
      Object.values(FOLDER_DATA).forEach(f => f.items = f.items.filter(it => it[0] !== t));
    }
    confirmThoughtDelete(t, after) {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(60,66,73,.3);padding:0 32px';
      ov.innerHTML = '<div style="background:#FFFFFF;border-radius:18px;box-shadow:0 14px 40px rgba(60,66,73,.25);padding:22px 22px 18px;width:100%;box-sizing:border-box">' +
        '<div style="font:500 15px ' + SANS + ';color:' + INK + ';margin-bottom:6px">Delete this thought?</div>' +
        '<div style="font:400 13.5px ' + SERIF + ';color:rgba(60,66,73,.65);margin-bottom:6px">\u201c' + t + '\u201d</div>' +
        '<div style="font:400 12px/1.5 ' + SANS + ';color:rgba(60,66,73,.55);margin-bottom:16px">Its recording, structure and connections go with it.</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button data-c="cancel" style="height:42px;padding:0 18px;border-radius:21px;border:1px solid rgba(60,66,73,.18);background:none;font:500 13px ' + SANS + ';color:' + INK + ';cursor:pointer">Cancel</button>' +
        '<button data-c="del" style="height:42px;padding:0 20px;border-radius:21px;border:none;background:' + CLAY + ';color:#F0EFEC;font:500 13px ' + SANS + ';cursor:pointer">Delete</button></div></div>';
      ov.addEventListener('click', (e) => {
        if (e.target.closest('[data-c="del"]')) { this.deleteThought(t); this.rowFocus = null; ov.remove(); after(); }
        else if (e.target.closest('[data-c="cancel"]') || e.target === ov) { this.rowFocus = null; ov.remove(); after(); }
      });
      this.appendChild(ov);
    }
    confirmFolderDelete(i) {
      const f = this.folders[i];
      const ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(60,66,73,.3);padding:0 32px';
      ov.innerHTML = '<div style="background:#FFFFFF;border-radius:18px;box-shadow:0 14px 40px rgba(60,66,73,.25);padding:22px 22px 18px;width:100%;box-sizing:border-box">' +
        '<div style="font:500 15px ' + SANS + ';color:' + INK + ';margin-bottom:6px">Delete “' + f.label.toLowerCase() + '”?</div>' +
        '<div style="font:400 12.5px/1.5 ' + SANS + ';color:rgba(60,66,73,.6);margin-bottom:16px">Its thoughts stay in Recent — only the folder goes away.</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button data-c="cancel" style="height:42px;padding:0 18px;border-radius:21px;border:1px solid rgba(60,66,73,.18);background:none;font:500 13px ' + SANS + ';color:' + INK + ';cursor:pointer">Cancel</button>' +
        '<button data-c="del" style="height:42px;padding:0 20px;border-radius:21px;border:none;background:' + CLAY + ';color:#F0EFEC;font:500 13px ' + SANS + ';cursor:pointer">Delete folder</button></div></div>';
      ov.addEventListener('click', (e) => {
        if (e.target.closest('[data-c="del"]')) { this.folders.splice(i, 1); this.fFocus = -1; ov.remove(); this.renderLibrary(true); }
        else if (e.target.closest('[data-c="cancel"]') || e.target === ov) { this.fFocus = -1; ov.remove(); this.renderLibrary(true); }
      });
      this.appendChild(ov);
    }
    renderFolder(swap) {
      const name = this.folder || 'PRODUCT IDEAS';
      const f = FOLDER_DATA[name] || FOLDER_DATA['PRODUCT IDEAS'];
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0';
      d.innerHTML =
        '<div style="position:absolute;top:70px;left:24px;right:24px;display:flex;align-items:center;gap:10px">' +
        '<span class="nk-fback" style="font-size:19px;color:rgba(60,66,73,.5);cursor:pointer;padding:2px 8px 2px 0">←</span>' +
        '<span style="flex:1"><span style="display:block;font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + f.c + '">' + name + '</span>' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.45)">' + f.items.length + ' thought' + (f.items.length === 1 ? '' : 's') + ' · tap one to preview</span></span></div>' +
        '<div style="position:absolute;top:122px;left:0;right:0;bottom:126px;display:flex;flex-direction:column;overflow:hidden">' + search +
        '<div style="margin:10px 24px 0;display:flex;flex-direction:column">' +
        f.items.map((it, i) => row(it[0], it[1], null, null, null, i === f.items.length - 1, this.rowEditing === it[0] ? 'editing' : (this.rowFocus == null ? null : (this.rowFocus === it[0] ? 'focused' : 'dim')))).join('') + '</div>' +
        '<div data-fnewthought="1" style="margin:18px 24px 0;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(60,66,73,.2);border-radius:14px;padding:12px;font:500 12px ' + SANS + ';color:rgba(60,66,73,.45);cursor:pointer">+ new thought in this folder</div></div>';
      d.querySelector('.nk-fback').addEventListener('click', () => this.goBack());
      d.addEventListener('contextmenu', (e) => {
        const r = e.target.closest('[data-title]');
        if (r) { e.preventDefault(); this.rowFocus = r.getAttribute('data-title'); this.rowEditing = null; this.renderFolder(true); }
      });
      d.addEventListener('click', (e) => {
        const rb = e.target.closest('[data-rb]');
        if (rb) {
          const a = rb.getAttribute('data-rb'), t = this.rowFocus;
          if (a === 'edit') {
            this.rowEditing = t; this.renderFolder(true);
            const inp = this._screen.querySelector('.nk-redit');
            if (inp) {
              inp.focus(); inp.select();
              const commit = () => { const v = inp.value.trim(); if (v) this.renameThought(t, v); this.rowEditing = null; this.rowFocus = null; this.renderFolder(true); };
              inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(); });
              inp.addEventListener('blur', commit);
            }
          } else if (a === 'del') this.confirmThoughtDelete(t, () => this.renderFolder(true));
          e.stopPropagation(); return;
        }
        if (e.target.closest('.nk-redit')) return;
        if (e.target.closest('[data-fnewthought]')) { this.recordFolder = this.folder; this.go('record'); return; }
        if (this.rowFocus != null) { this.rowFocus = null; this.rowEditing = null; this.renderFolder(true); return; }
        if (e.target.closest('[data-open]')) { this._previewFrom = 'folder'; this.go('preview'); }
      });
      this.mount(d, swap);
    }
  }
  if (!customElements.get('napkiln-app')) customElements.define('napkiln-app', NapkilnApp);
})();
