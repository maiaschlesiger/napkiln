// napkiln capture start — resting screen before recording, with structure picker. Plain web component.
(function () {
  const SANS = "'Figtree',sans-serif", SERIF = "'Figtree',sans-serif";
  const INK = '#3C4249', TEAL = '#1F8A96', CLAY = '#E0824E';
  const TPL = [
    { id: 'free', name: 'Free flow', desc: 'napkiln decides the shape while you talk', ghost: [] },
    { id: 'ps', name: 'Problem → Solution', desc: 'problem, audience, opportunity, constraint, open questions', ghost: ['PROBLEM', 'AUDIENCE', 'OPPORTUNITY', 'CONSTRAINT', 'OPEN QUESTION'] },
    { id: 'seq', name: 'Sequence', desc: 'purely in order — dreams, stories, how something happened', ghost: ['FIRST', 'THEN', 'THEN', 'FINALLY'] },
    { id: 'cmp', name: 'Weighing options', desc: 'options side by side with benefits and concerns', ghost: ['OPTION A', 'OPTION B', 'CONCERNS'] },
    { id: 'q', name: 'Around a question', desc: 'one open question with angles branching off it', ghost: ['QUESTION', 'ANGLE', 'ANGLE'] },
  ];
  class NapkilnCaptureStart extends HTMLElement {
    connectedCallback() {
      if (this._i) return; this._i = 1;
      if (!document.getElementById('nk-swirl-style')) {
        const st = document.createElement('style');
        st.id = 'nk-swirl-style';
        st.textContent = '@keyframes nkcurl{0%,100%{transform:scale(.7)}50%{transform:scale(1.25)}}';
        document.head.appendChild(st);
      }
      this.sel = 'free'; this.openSheet = false;
      Object.assign(this.style, { display: 'block', position: 'absolute', inset: '0', fontFamily: SANS, background: '#F0EFEC', overflow: 'hidden' });
      this.innerHTML =
        '<div style="position:absolute;top:74px;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:0 24px">' +
        '<span style="font:600 15px ' + SANS + ';letter-spacing:-.01em;color:' + INK + '">napkiln</span>' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.4)">mic off</span></div>' +
        '<div style="position:absolute;top:190px;left:0;right:0;text-align:center;font:400 22px ' + SERIF + ';color:' + INK + '">What are you thinking about?</div>' +
        '<button class="cs-pill" style="position:absolute;top:240px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;border:1px solid rgba(60,66,73,.15);background:rgba(255,255,255,.6);border-radius:18px;padding:8px 16px;font:500 12.5px ' + SANS + ';color:' + TEAL + ';cursor:pointer;white-space:nowrap"></button>' +
        '<div class="cs-ghost" style="position:absolute;top:300px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:0;pointer-events:none"></div>' +
        '<div style="position:absolute;bottom:150px;left:50%;transform:translateX(-50%);width:150px;height:150px;cursor:pointer" class="cs-orb">' +
        '<span style="position:absolute;inset:-24px;border-radius:50%;background:radial-gradient(circle,rgba(31,138,150,.12) 0%,rgba(31,138,150,0) 68%);animation:breathe 4.5s ease-in-out infinite"></span>' +
        '<span style="position:absolute;inset:14px;background:linear-gradient(150deg,rgba(31,138,150,.26),rgba(31,138,150,.08));animation:blobB 8s ease-in-out infinite"></span>' +
        '<span style="position:absolute;inset:26px;background:linear-gradient(320deg,#4FA3AE,#177B83);animation:blobA 6.5s ease-in-out infinite;box-shadow:0 14px 32px rgba(23,123,131,.25)"></span>' +
        '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:500 13px ' + SANS + ';color:rgba(240,239,236,.95)">tap to talk</span></div>' +
        '<div class="cs-type" style="position:absolute;bottom:104px;left:0;right:0;text-align:center;font:400 12.5px ' + SANS + ';color:rgba(60,66,73,.4)">or <span style="text-decoration:underline;cursor:pointer">type instead</span></div>' +
        '<div class="cs-recent" style="position:absolute;bottom:44px;left:24px;right:24px;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.5);border:1px solid rgba(60,66,73,.1);border-radius:14px;padding:10px 14px">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + TEAL + ';flex:none;opacity:.7"></span>' +
        '<span style="flex:1;font:400 13px ' + SERIF + ';color:rgba(60,66,73,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">ideas while moving</span>' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.4);flex:none">continue ›</span></div>' +
        '<div class="cs-scrim" style="position:absolute;inset:0;background:rgba(60,66,73,.25);opacity:0;pointer-events:none;transition:opacity .25s;z-index:20"></div>' +
        '<div class="cs-sheet" style="position:absolute;left:0;right:0;bottom:0;background:#FFFFFF;border-radius:22px 22px 0 0;box-shadow:0 -8px 30px rgba(60,66,73,.15);padding:14px 20px 34px;transform:translateY(105%);transition:transform .3s cubic-bezier(.3,.8,.4,1);z-index:21;box-sizing:border-box"></div>';
      this._pill = this.querySelector('.cs-pill');
      this._ghost = this.querySelector('.cs-ghost');
      this._scrim = this.querySelector('.cs-scrim');
      this._sheet = this.querySelector('.cs-sheet');
      this._pill.addEventListener('click', () => this.toggleSheet(true));
      this._scrim.addEventListener('click', () => this.toggleSheet(false));
      this._sheet.addEventListener('click', (e) => {
        const row = e.target.closest('[data-tpl]');
        if (row) { this.sel = row.getAttribute('data-tpl'); this.toggleSheet(false); this.render(); }
      });
      this._orb = this.querySelector('.cs-orb');
      this._orb.addEventListener('click', () => {
        this._orb.style.transition = 'transform .15s'; this._orb.style.transform = 'translateX(-50%) scale(.94)';
        setTimeout(() => { this._orb.style.transform = 'translateX(-50%) scale(1)'; }, 160);
        setTimeout(() => this.dispatchEvent(new CustomEvent('nk-record', { bubbles: true })), 180);
      });
      if (this.hasAttribute('embedded')) {
        const r = this.querySelector('.cs-recent'); if (r) r.style.bottom = '134px';
        const t = this.querySelector('.cs-type'); if (t) t.style.bottom = '196px';
        this._orb.style.bottom = '246px';
      }
      this.render();
    }
    swirl(c, r, n, dur, dir) {
      let dots = '';
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + k * 0.7;
        const rr = r + ((k * 7) % 9) - 4;
        const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
        const s = 1.5 + (k % 3) * 0.75;
        dots += '<span style="position:absolute;left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:rgba(31,138,150,' + (0.14 + (k % 3) * 0.06).toFixed(2) + ')"></span>';
      }
      return '<span style="position:absolute;inset:0;animation:' + (dir > 0 ? 'nkspin' : 'nkspinr') + ' ' + dur + 's linear infinite;pointer-events:none">' + dots + '</span>';
    }
    toggleSheet(open) {
      this.openSheet = open;
      this.dispatchEvent(new CustomEvent('nk-sheet', { bubbles: true, detail: open }));
      this._scrim.style.opacity = open ? '1' : '0';
      this._scrim.style.pointerEvents = open ? 'auto' : 'none';
      this._sheet.style.transform = open ? 'translateY(0)' : 'translateY(105%)';
    }
    render() {
      const t = TPL.find(x => x.id === this.sel);
      this._pill.innerHTML = '<span style="opacity:.55;color:' + INK + '">structure:</span> ' + t.name + ' <span style="opacity:.5;font-size:10px;color:' + INK + '">▾</span>';
      this._ghost.innerHTML = t.ghost.length
        ? t.ghost.map((g, i) => (i ? '<span style="width:1px;height:12px;background:rgba(31,138,150,.3)"></span>' : '') +
          '<span style="font:600 10.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:rgba(60,66,73,.3);border:1px dashed rgba(60,66,73,.18);border-radius:9px;padding:5px 12px;background:rgba(255,255,255,.35)">' + g + '</span>').join('')
        : '<span style="font:400 12.5px ' + SERIF + ';color:rgba(60,66,73,.35)">the shape will follow your thought</span>';
      this._sheet.innerHTML =
        '<span style="display:block;width:36px;height:4px;border-radius:2px;background:rgba(60,66,73,.18);margin:0 auto 14px"></span>' +
        '<div style="font:500 13px ' + SANS + ';color:' + INK + ';margin-bottom:2px">How should this thought take shape?</div>' +
        '<div style="font:400 12.5px ' + SANS + ';color:rgba(60,66,73,.45);margin-bottom:12px">You can always reshape it afterwards.</div>' +
        TPL.map(x => {
          const on = x.id === this.sel;
          return '<div data-tpl="' + x.id + '" style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;cursor:pointer;background:' + (on ? 'rgba(31,138,150,.1)' : 'transparent') + '">' +
            '<span style="flex:none;width:18px;height:18px;border-radius:50%;border:2px solid ' + (on ? TEAL : 'rgba(60,66,73,.25)') + ';box-sizing:border-box;position:relative">' + (on ? '<span style="position:absolute;inset:3px;border-radius:50%;background:' + TEAL + '"></span>' : '') + '</span>' +
            '<span style="flex:1"><span style="display:block;font:500 14px ' + SANS + ';color:' + INK + '">' + x.name + (x.id === 'free' ? ' <span style="font:400 10.5px ' + SANS + ';color:' + CLAY + ';margin-left:4px">default</span>' : '') + '</span>' +
            '<span style="display:block;font:400 12.5px ' + SANS + ';color:rgba(60,66,73,.5)">' + x.desc + '</span></span></div>';
        }).join('');
    }
  }
  if (!customElements.get('napkiln-capture-start')) customElements.define('napkiln-capture-start', NapkilnCaptureStart);
})();
