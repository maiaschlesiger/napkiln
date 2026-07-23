// napkiln space constellation (9b) — zoomable, tappable connection lines, tweakable spacing/fade/blur.
(function () {
  const SANS = "'Figtree',sans-serif", SERIF = "'Figtree',sans-serif";
  const INK = '#3C4249', TEAL = '#1F8A96', CLAY = '#E0824E';
  const CX = 201, CY = 400;
  const NODES = [
    { id: 0, x: 120, y: 270, r: 15, c: TEAL, halo: 'rgba(31,138,150,.12)', label: 'ideas while moving', big: true },
    { id: 1, x: 295, y: 350, r: 12, c: CLAY, halo: 'rgba(224,130,78,.12)', label: 'narrator hears you' },
    { id: 2, x: 85, y: 170, r: 10, c: TEAL, label: 'talking to your notes', dim: .75 },
    { id: 3, x: 140, y: 520, r: 9, c: 'rgba(60,66,73,.45)', label: 'teach by voice?', dim: .9 },
    { id: 4, x: 330, y: 255, r: 9, c: CLAY, dim: .55 },
    { id: 5, x: 75, y: 575, r: 8, c: 'rgba(60,66,73,.3)' },
    { id: 6, x: 190, y: 205, r: 9, c: TEAL, dim: .5 },
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
  class NapkilnSpace extends HTMLElement {
    static get observedAttributes() { return ['node-spacing', 'line-fade', 'line-blur', 'nodespacing', 'linefade', 'lineblur']; }
    attributeChangedCallback() { if (this._i) this.render(); }
    num(n, d) { const v = parseFloat(this.getAttribute(n) ?? this.getAttribute(n.replace(/-/g, ''))); return isNaN(v) ? d : v; }
    connectedCallback() {
      if (this._i) return; this._i = 1;
      this.z = 1; this.sel = -1; this.links = LINKS.slice();
      this.px = 0; this.py = 0;
      this.N = NODES.map(n => Object.assign({}, n));
      this.nodeSel = -1; this.nodeEdit = -1;
      Object.assign(this.style, { display: 'block', position: 'absolute', inset: '0', fontFamily: SANS, background: '#F0EFEC', overflow: 'hidden' });
      this.innerHTML =
        '<div class="sp-scene" style="position:absolute;inset:0"></div>' +
        '<div style="position:absolute;top:70px;left:24px;right:24px;display:flex;justify-content:space-between;align-items:center;pointer-events:none">' +
        '<span style="font:500 24px ' + SERIF + ';color:' + INK + '">Space</span>' +
        '<span class="sp-count" style="display:flex;align-items:center;gap:6px;font:500 12px ui-monospace,Menlo,monospace;color:#177B83;border:1px solid rgba(31,138,150,.35);border-radius:16px;padding:8px 14px;background:rgba(255,255,255,.9);pointer-events:auto;cursor:pointer;box-shadow:0 2px 8px rgba(60,66,73,.08)"></span></div>' +
        '<span style="position:absolute;left:0;right:0;top:108px;text-align:center;font:400 12px ' + SANS + ';color:rgba(60,66,73,.4);pointer-events:none">tap a line to see why · scroll or ± to zoom</span>' +
        '<div style="position:absolute;right:20px;top:330px;width:44px;border-radius:12px;background:rgba(255,255,255,.95);border:1px solid rgba(60,66,73,.12);box-shadow:0 2px 10px rgba(60,66,73,.1);display:flex;flex-direction:column;overflow:hidden;z-index:8">' +
        '<button class="sp-in" style="height:44px;border:none;background:none;font:400 22px ' + SANS + ';color:' + INK + ';cursor:pointer">+</button>' +
        '<span style="height:1px;background:rgba(60,66,73,.12);margin:0 8px"></span>' +
        '<button class="sp-out" style="height:44px;border:none;background:none;font:400 24px ' + SANS + ';color:' + INK + ';cursor:pointer">−</button></div>' +
        '<div class="sp-corner" style="position:absolute;left:20px;right:20px;bottom:126px;display:flex;justify-content:space-between;align-items:flex-end;z-index:8;pointer-events:none">' +
        '<div style="display:flex;flex-direction:column;gap:5px;background:rgba(255,255,255,.92);border:1px solid rgba(60,66,73,.12);border-radius:10px;padding:8px 10px">' +
        '<span style="display:flex;align-items:center;gap:6px;font:400 12px ' + SANS + ';color:rgba(60,66,73,.65)"><span style="width:7px;height:7px;border-radius:50%;background:' + TEAL + ';flex:none"></span>product</span>' +
        '<span style="display:flex;align-items:center;gap:6px;font:400 12px ' + SANS + ';color:rgba(60,66,73,.65)"><span style="width:7px;height:7px;border-radius:50%;background:' + CLAY + ';flex:none"></span>story</span>' +
        '<span style="display:flex;align-items:center;gap:6px;font:400 12px ' + SANS + ';color:rgba(60,66,73,.65)"><span style="width:7px;height:7px;border-radius:50%;background:rgba(60,66,73,.4);flex:none"></span>other</span></div>' +
        '<div class="sp-mini" style="position:relative;width:56px;height:56px;background:rgba(255,255,255,.92);border:1px solid rgba(60,66,73,.15);border-radius:12px;overflow:hidden"></div></div>' +
        '<div class="sp-pop" style="position:absolute;left:14px;right:14px;bottom:126px;background:#FFFFFF;border:1px solid rgba(60,66,73,.1);border-radius:18px;box-shadow:0 10px 30px rgba(60,66,73,.15);padding:14px 16px;z-index:9;transform:translateY(140%);opacity:0;transition:transform .3s cubic-bezier(.3,.8,.4,1),opacity .3s"></div>' +
        '<div class="sp-listscrim" style="position:absolute;inset:0;background:rgba(60,66,73,.25);opacity:0;pointer-events:none;transition:opacity .25s;z-index:14"></div>' +
        '<div class="sp-list" style="position:absolute;left:0;right:0;bottom:0;background:#FFFFFF;border-radius:22px 22px 0 0;box-shadow:0 -8px 30px rgba(60,66,73,.15);padding:14px 22px 34px;transform:translateY(105%);transition:transform .3s cubic-bezier(.3,.8,.4,1);z-index:15;box-sizing:border-box"></div>' +
        '<div class="sp-snack" style="position:absolute;left:50%;transform:translateX(-50%);bottom:130px;background:' + INK + ';color:#F0EFEC;border-radius:18px;padding:9px 18px;font:400 12.5px ' + SANS + ';opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;z-index:12"></div>' +
        (this.hasAttribute('embedded') ? '' :
        '<div style="position:absolute;bottom:56px;left:50%;transform:translateX(-50%);display:flex;gap:4px;background:rgba(255,255,255,.9);border:1px solid rgba(60,66,73,.1);border-radius:26px;padding:5px;box-shadow:0 4px 16px rgba(60,66,73,.08);z-index:8">' +
        '<span style="padding:10px 18px;border-radius:20px;font:500 13px ' + SANS + ';color:rgba(60,66,73,.55)">Capture</span>' +
        '<span style="padding:10px 18px;border-radius:20px;font:500 13px ' + SANS + ';background:' + INK + ';color:#F0EFEC">Space</span>' +
        '<span style="padding:10px 18px;border-radius:20px;font:500 13px ' + SANS + ';color:rgba(60,66,73,.55)">Library</span></div>');
      this._scene = this.querySelector('.sp-scene');
      this._mini = this.querySelector('.sp-mini');
      this._pop = this.querySelector('.sp-pop');
      this._snack = this.querySelector('.sp-snack');
      this.querySelector('.sp-count').addEventListener('click', () => this.showList());
      this._listScrim = this.querySelector('.sp-listscrim');
      this._list = this.querySelector('.sp-list');
      this._listScrim.addEventListener('click', () => this.hideList());
      this._list.addEventListener('click', (e) => {
        const close = e.target.closest('[data-lclose]');
        if (close) { this.hideList(); return; }
        const r = e.target.closest('[data-li]');
        if (r) { this.hideList(); this.sel = +r.getAttribute('data-li'); this.render(); this.showPop(); }
      });
      this.querySelector('.sp-in').addEventListener('click', () => this.animateTo(this.z + 0.3));
      this.querySelector('.sp-out').addEventListener('click', () => this.animateTo(this.z - 0.3));
      this.addEventListener('wheel', (e) => { e.preventDefault(); this.animateTo((this._zt ?? this.z) + (e.deltaY > 0 ? -0.12 : 0.12)); }, { passive: false });
      // drag to pan
      this._scene.style.cursor = 'grab';
      this.dragN = -1;
      this._scene.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('[data-nb]') || e.target.closest('.sp-nedit')) return;
        const nd = e.target.closest('[data-ni]');
        if (nd) {
          const ni = +nd.getAttribute('data-ni');
          this._nHold = { ni, x: e.clientX, y: e.clientY, t: setTimeout(() => { this.dragN = ni; this._nHold = null; this.render(); }, 300) };
          return;
        }
        this._drag = { x: e.clientX, y: e.clientY, px: this.px, py: this.py, moved: false };
      });
      this._scene.addEventListener('pointermove', (e) => {
        if (this.dragN >= 0) {
          const rect = this.getBoundingClientRect();
          const sp = this.num('node-spacing', 1.2) * this.z;
          const n = this.N[this.dragN];
          n.x = ((e.clientX - rect.left) - this.px - CX) / sp + CX;
          n.y = ((e.clientY - rect.top) - this.py - CY) / sp + CY;
          this._dragged = true;
          this.render();
          return;
        }
        if (this._nHold) {
          if (Math.abs(e.clientX - this._nHold.x) + Math.abs(e.clientY - this._nHold.y) > 6) {
            clearTimeout(this._nHold.t);
            this._drag = { x: this._nHold.x, y: this._nHold.y, px: this.px, py: this.py, moved: true };
            this._nHold = null;
          }
          else return;
        }
        if (!this._drag) return;
        const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) this._drag.moved = true;
        if (this._drag.moved) {
          this.px = this._drag.px + dx; this.py = this._drag.py + dy;
          this._scene.style.cursor = 'grabbing';
          this.render();
        }
      });
      ['pointerup', 'pointercancel'].forEach(ev => this._scene.addEventListener(ev, () => {
        if (this._nHold) { clearTimeout(this._nHold.t); this._nHold = null; }
        if (this.dragN >= 0) { this.dragN = -1; this.render(); }
        if (this._drag && this._drag.moved) this._dragged = true;
        this._drag = null; this._scene.style.cursor = 'grab';
      }));
      this._scene.addEventListener('contextmenu', (e) => {
        const nd = e.target.closest('[data-ni]');
        if (nd) { e.preventDefault(); this.nodeSel = +nd.getAttribute('data-ni'); this.nodeEdit = -1; this.render(); }
      });
      this._scene.addEventListener('click', (e) => {
        if (this._dragged) { this._dragged = false; return; }
        const nb = e.target.closest('[data-nb]');
        if (nb) {
          const a = nb.getAttribute('data-nb'), i = this.nodeSel;
          if (a === 'del') this.confirmNode(i);
          else if (a === 'edit') {
            this.nodeEdit = i; this.render();
            const inp = this.querySelector('.sp-nedit');
            if (inp) {
              inp.focus(); inp.select();
              const commit = () => { const v = inp.value.trim(); if (v) this.N[i].label = v; this.nodeEdit = -1; this.nodeSel = -1; this.render(); };
              inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(); });
              inp.addEventListener('blur', commit);
            }
          }
          return;
        }
        if (e.target.closest('.sp-nedit')) return;
        if (this.nodeSel >= 0) { this.nodeSel = -1; this.nodeEdit = -1; this.render(); return; }
        const nd = e.target.closest('[data-n]');
        if (nd) { this.dispatchEvent(new CustomEvent('nk-open', { bubbles: true, detail: nd.getAttribute('data-n') })); return; }
        const l = e.target.closest('[data-l]');
        if (l) { this.sel = +l.getAttribute('data-l'); this.render(); this.showPop(); return; }
        if (this.sel >= 0) { this.sel = -1; this.hidePop(); this.render(); }
      });
      this._pop.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const a = act.getAttribute('data-act');
        if (a === 'close') { this.sel = -1; this.hidePop(); this.render(); }
        else if (a === 'capture') { this.sel = -1; this.hidePop(); this.render(); this.snack('Opening capture with this pair…'); this.dispatchEvent(new CustomEvent('nk-talk', { bubbles: true })); }
        else if (a === 'remove') {
          this.links.splice(this.sel, 1);
          this.sel = -1; this.hidePop(); this.render();
          this.snack('Connection removed — napkiln will remember');
        }
      });
      this.render();
    }
    setZ(z) { this.z = clamp(z, 0.65, 1.9); this.render(); }
    animateTo(target) {
      this._zt = clamp(target, 0.65, 1.9);
      if (this._zraf) return;
      const step = () => {
        const d = this._zt - this.z;
        if (Math.abs(d) < 0.004) { this.z = this._zt; this._zraf = null; this.render(); return; }
        this.z += d * 0.16;
        this.render();
        this._zraf = requestAnimationFrame(step);
      };
      this._zraf = requestAnimationFrame(step);
    }
    disconnectedCallback() { cancelAnimationFrame(this._zraf); }
    snack(m) { this._snack.textContent = m; this._snack.style.opacity = '1'; clearTimeout(this._st); this._st = setTimeout(() => this._snack.style.opacity = '0', 2200); }
    showPop() {
      const L = this.links[this.sel];
      const A = this.N[L.a], B = this.N[L.b];
      const chip = (n) => '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:' + n.c + '"></span><span style="font:400 12px ' + SERIF + ';color:' + INK + '">' + (n.label || 'untitled') + '</span></span>';
      this._pop.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font:600 9px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + TEAL + '">WHY THESE CONNECT</span><button data-act="close" style="border:none;background:none;font:400 15px ' + SANS + ';color:rgba(60,66,73,.4);cursor:pointer;padding:2px 6px">✕</button></div>' +
        '<div style="text-align:center;font:400 14px ' + SERIF + ';color:' + INK + ';background:rgba(31,138,150,.08);border-radius:10px;padding:7px 10px;margin-bottom:8px">' + L.phrase + '</div>' +
        '<div style="text-align:center;font:400 12.5px ' + SANS + ';color:rgba(60,66,73,.55);margin-bottom:6px">' + L.note + '</div>' +
        '<div style="display:flex;gap:12px;align-items:center;justify-content:center;margin-bottom:12px">' + chip(A) + '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.4)">×</span>' + chip(B) + '</div>' +
        '<div style="display:flex;gap:10px">' +
        '<button data-act="capture" style="flex:1;height:44px;border-radius:22px;border:none;background:' + INK + ';color:#F0EFEC;font:500 13px ' + SANS + ';cursor:pointer">Capture this</button>' +
        '<button data-act="remove" style="flex:none;height:44px;padding:0 16px;border-radius:22px;border:1px solid rgba(60,66,73,.15);background:none;color:rgba(60,66,73,.6);font:500 13px ' + SANS + ';cursor:pointer">not related</button></div>';
      this._pop.style.transform = 'translateY(0)';
      this._pop.style.opacity = '1';
    }
    hidePop() { this._pop.style.transform = 'translateY(140%)'; this._pop.style.opacity = '0'; }
    showList() {
      this.dispatchEvent(new CustomEvent('nk-sheet', { bubbles: true, detail: true }));
      const dot = (n) => '<span style="width:8px;height:8px;border-radius:50%;background:' + n.c + ';flex:none"></span>';
      this._list.style.maxHeight = '78%';
      this._list.style.overflowY = 'auto';
      this._list.innerHTML =
        '<span style="display:block;width:36px;height:4px;border-radius:2px;background:rgba(60,66,73,.18);margin:0 auto 14px"></span>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<span style="font:500 13px ' + SANS + ';color:' + INK + '">All connections</span>' +
        '<button data-lclose="1" style="border:none;background:none;font:400 15px ' + SANS + ';color:rgba(60,66,73,.4);cursor:pointer;padding:2px 6px">✕</button></div>' +
        (this.visLinks().length === 0 ? '<div style="font:400 12.5px ' + SANS + ';color:rgba(60,66,73,.5);padding:8px 0 4px">No connections yet — they appear as your thoughts share phrases.</div>' :
        this.visLinks().map(({ L, i }) =>
          '<div data-li="' + i + '" style="display:flex;flex-direction:column;gap:6px;padding:16px 0;' + (i < this.links.length - 1 ? 'border-bottom:1px solid rgba(60,66,73,.1);' : '') + 'cursor:pointer">' +
          '<span style="font:400 15px ' + SERIF + ';color:' + INK + '">' + L.phrase + '</span>' +
          '<span style="display:flex;align-items:center;gap:8px;font:400 12px ' + SANS + ';color:rgba(60,66,73,.6)">' +
          dot(NODES[L.a]) + (NODES[L.a].label || 'untitled') + '<span style="opacity:.5">×</span>' + dot(NODES[L.b]) + (NODES[L.b].label || 'untitled') + '</span></div>').join('') + '<span style="display:block;height:180px"></span>');
      this._listScrim.style.opacity = '1'; this._listScrim.style.pointerEvents = 'auto';
      this._list.style.transform = 'translateY(0)';
    }
    hideList() {
      this.dispatchEvent(new CustomEvent('nk-sheet', { bubbles: true, detail: false }));
      this._listScrim.style.opacity = '0'; this._listScrim.style.pointerEvents = 'none';
      this._list.style.transform = 'translateY(105%)';
    }
    visLinks() { return this.links.map((L, i) => ({ L, i })).filter(({ L }) => !this.N[L.a].hidden && !this.N[L.b].hidden); }
    flashNode(i) {
      this.flash = i; this.render();
      const s = this.querySelector('.sp-snack');
      if (s) { s.textContent = 'Saved — here it is in your Space'; s.style.opacity = '1'; setTimeout(() => s.style.opacity = '0', 2400); }
      clearTimeout(this._ft);
      this._ft = setTimeout(() => { this.flash = -1; this.render(); }, 2600);
    }
    confirmNode(i) {
      const n = this.N[i];
      const ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(60,66,73,.3);padding:0 32px';
      ov.innerHTML = '<div style="background:#FFFFFF;border-radius:18px;box-shadow:0 14px 40px rgba(60,66,73,.25);padding:22px 22px 18px;width:100%;box-sizing:border-box">' +
        '<div style="font:500 15px ' + SANS + ';color:' + INK + ';margin-bottom:6px">Delete this thought?</div>' +
        '<div style="font:400 13.5px ' + SERIF + ';color:rgba(60,66,73,.65);margin-bottom:6px">\u201c' + (n.label || 'untitled') + '\u201d</div>' +
        '<div style="font:400 12px/1.5 ' + SANS + ';color:rgba(60,66,73,.55);margin-bottom:16px">Its connections disappear with it.</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button data-c="cancel" style="height:42px;padding:0 18px;border-radius:21px;border:1px solid rgba(60,66,73,.18);background:none;font:500 13px ' + SANS + ';color:' + INK + ';cursor:pointer">Cancel</button>' +
        '<button data-c="del" style="height:42px;padding:0 20px;border-radius:21px;border:none;background:' + CLAY + ';color:#F0EFEC;font:500 13px ' + SANS + ';cursor:pointer">Delete</button></div></div>';
      ov.addEventListener('click', (e) => {
        if (e.target.closest('[data-c="del"]')) { n.hidden = true; this.nodeSel = -1; ov.remove(); this.render(); this.snack('Thought deleted'); }
        else if (e.target.closest('[data-c="cancel"]') || e.target === ov) { this.nodeSel = -1; ov.remove(); this.render(); }
      });
      this.appendChild(ov);
    }
    pos(n) {
      const sp = this.num('node-spacing', 1.2);
      return { x: CX + (n.x - CX) * sp * this.z + this.px, y: CY + (n.y - CY) * sp * this.z + this.py };
    }
    render() {
      const fade = this.num('line-fade', 6);
      const blur = this.num('line-blur', 0);
      const visLinks = this.visLinks();
      this.querySelector('.sp-count').innerHTML = visLinks.length + ' connection' + (visLinks.length === 1 ? '' : 's') + ' <span style="font-family:' + SANS + ';font-size:11px;opacity:.7">›</span>';
      let h = '';
      const gsp = this.num('node-spacing', 1.2) * this.z;
      GROUPS.forEach((g) => {
        const p = this.pos(g);
        const gr = 150 * gsp;
        h += '<span style="position:absolute;left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px;width:' + (gr * 2).toFixed(0) + 'px;height:' + (gr * 2).toFixed(0) + 'px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(' + g.rgb + ',.09),rgba(' + g.rgb + ',0) 68%);pointer-events:none;z-index:1"></span>';
      });
      this.links.forEach((L, li) => {
        if (this.N[L.a].hidden || this.N[L.b].hidden) return;
        const A = this.pos(this.N[L.a]), B = this.pos(this.N[L.b]);
        const gapA = (this.N[L.a].r + 22), gapB = (this.N[L.b].r + 22);
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const x1 = A.x + ux * gapA, y1 = A.y + uy * gapA;
        const tl = Math.max(20, len - gapA - gapB);
        const on = this.sel === li;
        const col = on ? 'rgba(60,66,73,.6)' : 'rgba(60,66,73,.32)';
        h += '<div data-l="' + li + '" style="position:absolute;left:' + x1.toFixed(1) + 'px;top:' + (y1 - 8).toFixed(1) + 'px;width:' + tl.toFixed(1) + 'px;height:16px;display:flex;align-items:center;transform:rotate(' + Math.atan2(dy, dx) + 'rad);transform-origin:0 8px;cursor:pointer;z-index:3">' +
          '<span style="width:100%;height:' + (on ? 2 : 1.4) + 'px;background:linear-gradient(90deg,transparent 0%,' + col + ' ' + fade + '%,' + col + ' ' + (100 - fade) + '%,transparent 100%);' + (blur > 0.05 ? 'filter:blur(' + blur + 'px);' : '') + (on ? 'box-shadow:0 0 10px rgba(60,66,73,.3);' : '') + '"></span></div>';
      });
      this.N.forEach((n, ni) => {
        if (n.hidden) return;
        const p = this.pos(n);
        const r = n.r * (0.85 + this.z * 0.25);
        const fs = (n.big ? 13 : 11.5) * (0.85 + this.z * 0.25);
        const selMe = this.nodeSel === ni;
        const bubbles = selMe && this.nodeEdit !== ni
          ? '<span style="position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);display:flex;gap:8px;z-index:7">' +
            '<button data-nb="edit" style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;font:400 14px ' + SANS + ';color:' + INK + '">\u270e</button>' +
            '<button data-nb="del" style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;display:flex;align-items:center;justify-content:center"><span style="position:relative;width:11px;height:14px;display:inline-block"><span style="position:absolute;left:1px;top:3px;right:1px;bottom:0;border:1.5px solid ' + CLAY + ';border-top:none;border-radius:0 0 3px 3px;box-sizing:border-box"></span><span style="position:absolute;left:0;top:1.5px;width:11px;height:1.5px;background:' + CLAY + '"></span><span style="position:absolute;left:3.5px;top:-1px;width:4px;height:2.5px;border:1.5px solid ' + CLAY + ';border-bottom:none;box-sizing:border-box"></span></span></button></span>'
          : '';
        const labelHtml = this.nodeEdit === ni
          ? '<input class="sp-nedit" value="' + (n.label || '') + '" style="border:none;border-bottom:1px solid ' + TEAL + ';background:rgba(240,239,236,.9);outline:none;font:400 ' + fs.toFixed(1) + 'px ' + SERIF + ';color:' + INK + ';text-align:center;width:150px;padding:0 0 2px">'
          : (n.label ? '<span style="font:' + (n.big ? 500 : 400) + ' ' + fs.toFixed(1) + 'px ' + SERIF + ';color:' + (n.big ? INK : 'rgba(60,66,73,.7)') + ';white-space:nowrap;text-shadow:0 0 4px #F0EFEC,0 0 8px #F0EFEC,0 0 12px #F0EFEC">' + n.label + '</span>' : '');
        h += '<div ' + (n.label ? 'data-n="' + n.label + '" data-ni="' + ni + '" ' : '') + 'style="position:absolute;left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px;transform:translate(-50%,-50%)' + (this.dragN === ni ? ' scale(1.15)' : '') + ';display:flex;flex-direction:column;align-items:center;gap:7px;z-index:' + (this.dragN === ni ? 8 : (selMe ? 6 : 4)) + ';' + (this.dragN === ni ? 'filter:drop-shadow(0 6px 14px rgba(60,66,73,.25));' : '') + (n.label ? 'cursor:pointer;' : 'pointer-events:none;') + (n.dim && !selMe ? 'opacity:' + n.dim + ';' : '') + (selMe ? 'filter:none;' : (this.nodeSel >= 0 ? 'filter:blur(2px);opacity:.45;' : '')) + '">' +
          '<span style="width:' + r.toFixed(1) + 'px;height:' + r.toFixed(1) + 'px;border-radius:50%;background:' + n.c + ';' + (n.halo ? 'box-shadow:0 0 0 ' + (r * 0.45).toFixed(0) + 'px ' + n.halo + ';' : '') + (this.flash === ni ? 'animation:breathe 1.2s ease-in-out infinite;box-shadow:0 0 0 ' + (r * 0.8).toFixed(0) + 'px rgba(31,138,150,.25);' : '') + '"></span>' +
          labelHtml + bubbles + '</div>';
      });
      this._scene.innerHTML = h;
      this.renderMini();
    }
    renderMini() {
      const MW = 56, MH = 56, WX0 = 20, WX1 = 380, WY0 = 100, WY1 = 620;
      const sp = this.num('node-spacing', 1.2) * this.z;
      let m = '';
      GROUPS.forEach((g) => {
        const gx = (g.x - WX0) / (WX1 - WX0) * MW, gy = (g.y - WY0) / (WY1 - WY0) * MH;
        m += '<span style="position:absolute;left:' + (gx - 9).toFixed(1) + 'px;top:' + (gy - 9).toFixed(1) + 'px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,rgba(' + g.rgb + ',.35),rgba(' + g.rgb + ',0) 70%)"></span>';
      });
      const cx = Math.max(4, Math.min(MW - 4, (CX - this.px / sp - WX0) / (WX1 - WX0) * MW));
      const cy = Math.max(4, Math.min(MH - 4, (CY - this.py / sp - WY0) / (WY1 - WY0) * MH));
      m += '<span style="position:absolute;left:' + (cx - 3).toFixed(1) + 'px;top:' + (cy - 3).toFixed(1) + 'px;width:6px;height:6px;border-radius:50%;background:rgba(60,66,73,.65)"></span>';
      this._mini.innerHTML = m;
    }  }
  if (!customElements.get('napkiln-space')) customElements.define('napkiln-space', NapkilnSpace);
})();
