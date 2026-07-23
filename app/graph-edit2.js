// napkiln graph edit v2 — post-Done review mirroring the live-recording structure.
// Hold (long-press) or right-click a box -> edit / re-record bubbles; others blur.
// Save panel: name + description + folder dropdown; Save -> separate saved screen.
(function () {
  const SANS = "'Figtree',sans-serif", SERIF = "'Figtree',sans-serif";
  const INK = '#3C4249', TEAL = '#1F8A96', CLAY = '#E0824E';
  const RERECORD = [
    'people record and never listen back',
    'ideas show up mid-walk, mid-commute',
    'watch the thought take shape as you speak',
    'rigid diagrams kill the flow',
    'is zooming in how you go deeper?',
  ];
  const FOLDERS = ['Product ideas', 'Story ideas', 'Career', 'Personal questions', 'New folder…', 'Let napkiln decide'];
  const mic = (c) => '<span style="position:relative;width:10px;height:15px;display:inline-block"><span style="position:absolute;left:2px;top:0;width:6px;height:9px;border-radius:3px;background:' + c + '"></span><span style="position:absolute;left:0;top:5px;width:10px;height:7px;border:1.5px solid ' + c + ';border-top:none;border-radius:0 0 6px 6px;box-sizing:border-box"></span><span style="position:absolute;left:4.5px;bottom:-2px;width:1.5px;height:3px;background:' + c + '"></span></span>';
  const trash = (c) => '<span style="position:relative;width:11px;height:14px;display:inline-block"><span style="position:absolute;left:1px;top:3px;right:1px;bottom:0;border:1.5px solid ' + c + ';border-top:none;border-radius:0 0 3px 3px;box-sizing:border-box"></span><span style="position:absolute;left:0;top:1.5px;width:11px;height:1.5px;background:' + c + '"></span><span style="position:absolute;left:3.5px;top:-1px;width:4px;height:2.5px;border:1.5px solid ' + c + ';border-bottom:none;box-sizing:border-box"></span></span>';
  class NapkilnGraphEdit2 extends HTMLElement {
    connectedCallback() {
      if (this._i) return; this._i = 1;
      this.nodes = [
        { type: 'PROBLEM', c: TEAL, text: 'voice notes go unheard', solid: true },
        { type: 'CONTEXT', c: TEAL, text: 'ideas happen while moving', solid: false },
        { type: 'OPPORTUNITY', c: TEAL, text: 'visualize how the idea develops', solid: true },
        { type: 'CONSTRAINT', c: CLAY, text: 'mind maps feel rigid', solid: true },
        { type: 'OPEN QUESTION', c: CLAY, text: 'thoughts containing smaller thoughts?', solid: false },
      ];
      this.focus = -1; this.editing = -1; this.listening = -1;
      this.folder = 'Product ideas'; this.ddOpen = false;
      this.preview = this.getAttribute('mode') === 'preview';
      this.stage = this.getAttribute('stage') === 'saved' ? 'saved' : 'review';
      this.title = 'Ideas while moving'; this.desc = this.getAttribute('stage') === 'saved' ? 'an app for people whose ideas arrive mid-walk' : '';
      Object.assign(this.style, { display: 'block', position: 'absolute', inset: '0', fontFamily: SANS, background: '#F0EFEC', overflow: 'hidden' });
      this.render();
    }
    snack(m) { const s = this.querySelector('.g2-snack'); if (!s) return; s.textContent = m; s.style.opacity = '1'; clearTimeout(this._st); this._st = setTimeout(() => s.style.opacity = '0', 2400); }
    setFocus(i) { this.focus = i; this.editing = -1; this.listening = -1; this.renderGraph(); }
    updateMapDot() {
      const dot = this.querySelector('.g2-mapdot');
      if (!dot) return;
      const spots = { 'Product ideas': ['22%', '30%'], 'Story ideas': ['62%', '42%'], 'Career': ['42%', '74%'], 'Personal questions': ['48%', '70%'], 'New folder…': ['80%', '68%'], 'Let napkiln decide': ['50%', '50%'] };
      const s = spots[this.folder] || ['50%', '50%'];
      dot.style.left = s[0]; dot.style.top = s[1];
    }
    commitEdit(i, v) { if (v.trim()) this.nodes[i].text = v.trim(); this.editing = -1; this.focus = -1; this.renderGraph(); }
    showConfirm(i) {
      const n = this.nodes[i];
      const ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(60,66,73,.3);padding:0 32px';
      ov.innerHTML = '<div style="background:#FFFFFF;border-radius:18px;box-shadow:0 14px 40px rgba(60,66,73,.25);padding:22px 22px 18px;width:100%;box-sizing:border-box">' +
        '<div style="font:500 15px ' + SANS + ';color:' + INK + ';margin-bottom:6px">Delete this box?</div>' +
        '<div style="font:400 13.5px ' + SERIF + ';color:rgba(60,66,73,.65);margin-bottom:16px">\u201c' + n.text + '\u201d</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button data-c="cancel" style="height:42px;padding:0 18px;border-radius:21px;border:1px solid rgba(60,66,73,.18);background:none;font:500 13px ' + SANS + ';color:' + INK + ';cursor:pointer">Cancel</button>' +
        '<button data-c="del" style="height:42px;padding:0 20px;border-radius:21px;border:none;background:' + CLAY + ';color:#F0EFEC;font:500 13px ' + SANS + ';cursor:pointer">Delete</button></div></div>';
      ov.addEventListener('click', (e) => {
        if (e.target.closest('[data-c="del"]')) {
          this.nodes[i].hidden = true;
          this.focus = -1; this.editing = -1; this.listening = -1;
          ov.remove(); this.renderGraph(); this.snack('Box removed');
        } else if (e.target.closest('[data-c="cancel"]') || e.target === ov) ov.remove();
      });
      this.appendChild(ov);
    }
    box(i, small) {
      const n = this.nodes[i];
      const focusOn = this.focus >= 0, me = this.focus === i;
      const dim = focusOn && !me ? 'filter:blur(2.5px);opacity:.4;' : '';
      const border = n.solid ? '1px solid rgba(60,66,73,' + (me ? '.4' : '.12') + ')' : '1px dashed rgba(224,130,78,' + (me ? '.9' : '.5') + ')';
      const pad = this.preview ? (small ? '7px 11px' : '9px 14px') : (small ? '8px 13px' : '11px 18px');
      const maxw = this.preview ? 215 : 250;
      let inner = '<span style="font:600 ' + (small ? '8.5' : '9') + 'px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:' + n.c + '">' + n.type + '</span>';
      if (this.editing === i) inner += '<input class="g2-input" value="' + n.text.replace(/"/g, '&quot;') + '" style="border:none;border-bottom:1px solid ' + TEAL + ';background:none;outline:none;font:400 ' + (small ? '12' : '14') + 'px ' + SERIF + ';color:' + INK + ';text-align:center;width:' + (small ? 150 : 210) + 'px;padding:0 0 2px">';
      else inner += '<span style="font:400 ' + (small ? '12' : '14') + 'px/1.35 ' + SERIF + ';color:' + (small ? 'rgba(60,66,73,.7)' : INK) + ';text-align:center">' + n.text + '</span>';
      if (this.listening === i) inner += '<span style="display:flex;align-items:center;gap:7px;margin-top:7px;background:rgba(31,138,150,.12);border-radius:14px;padding:6px 12px"><span style="width:6px;height:6px;border-radius:50%;background:' + TEAL + ';animation:breathe 1.4s ease-in-out infinite"></span><span style="font:500 12.5px ' + SANS + ';color:' + TEAL + '">re-recording this box…</span></span>';
      const below = this.preview && (i === 1 || i === 2);
      const bubbles = me && this.editing < 0 && this.listening < 0
        ? '<span style="position:absolute;' + (below ? 'bottom:-50px;left:50%;transform:translateX(-50%);flex-direction:row;' : 'right:-52px;top:50%;transform:translateY(-50%);flex-direction:column;') + 'display:flex;gap:8px;z-index:6">' +
          '<button data-b="edit" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;font:400 15px ' + SANS + ';color:' + INK + '">✎</button>' +
          '<button data-b="mic" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;display:flex;align-items:center;justify-content:center">' + mic(TEAL) + '</button>' +
          '<button data-b="del" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(60,66,73,.15);background:#FFFFFF;box-shadow:0 4px 14px rgba(60,66,73,.18);cursor:pointer;display:flex;align-items:center;justify-content:center">' + trash(CLAY) + '</button></span>'
        : '';
      return '<div data-i="' + i + '" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;background:rgba(255,255,255,' + (n.solid ? '.65' : '.45') + ');border:' + border + ';border-radius:12px;padding:' + pad + ';cursor:pointer;max-width:' + maxw + 'px;transition:filter .25s,opacity .25s;' + dim + (me ? 'box-shadow:0 6px 20px rgba(60,66,73,.12);' : '') + '">' + inner + bubbles + '</div>';
    }
    conn(label) {
      const focusOn = this.focus >= 0;
      return '<span style="position:relative;width:1px;height:36px;background:rgba(31,138,150,.45);flex:none;' + (focusOn ? 'opacity:.35;' : '') + '"><span style="position:absolute;left:9px;top:11px;font:400 12.5px ' + SANS + ';color:' + TEAL + ';white-space:nowrap">' + label + '</span></span>';
    }
    graphHtml() {
      const focusOn = this.focus >= 0;
      const v = (i) => !this.nodes[i].hidden;
      const dash = '<span style="width:26px;height:0;border-top:1px dashed rgba(31,138,150,.5);flex:none;' + (focusOn ? 'opacity:.35;' : '') + '"></span>';
      const parts = [];
      if (v(0)) parts.push({ conn: null, html: this.box(0) });
      if (v(2) && v(1)) parts.push({ conn: 'led to', html: '<div style="display:flex;align-items:center;gap:14px">' + this.box(1, true) + dash + this.box(2) + '</div>' });
      else if (v(2)) parts.push({ conn: 'led to', html: this.box(2) });
      else if (v(1)) parts.push({ conn: 'led to', html: this.box(1, true) });
      if (v(3)) parts.push({ conn: 'but', html: this.box(3) });
      if (v(4)) parts.push({ conn: 'raises', html: this.box(4) });
      let h = '<div style="display:flex;flex-direction:column;align-items:center">';
      parts.forEach((p, idx) => { if (idx > 0) h += this.conn(p.conn || '·'); h += p.html; });
      h += '</div>';
      return h;
    }
    render() {
      if (this.stage === 'saved') { this.renderSaved(); return; }
      if (this.preview) { this.renderPreview(); return; }
      this.innerHTML =
        '<div style="position:absolute;top:70px;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:0 24px;z-index:5">' +
        '<span class="g2-rback" style="display:flex;align-items:center;gap:10px;cursor:pointer"><span style="font-size:19px;color:rgba(60,66,73,.5);padding:2px 8px 2px 0">←</span><span style="font:500 14px ' + SANS + ';color:' + INK + '">Your thought</span></span>' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.4)">hold a box to change it</span></div>' +
        '<div class="g2-graph" style="position:absolute;top:106px;bottom:318px;left:0;right:0;overflow-y:auto;padding:12px 24px;box-sizing:border-box"></div>' +
        '<div class="g2-panel" style="position:absolute;left:0;right:0;bottom:0;height:304px;background:#FFFFFF;border-top:1px solid rgba(60,66,73,.1);box-shadow:0 -6px 24px rgba(60,66,73,.06);padding:16px 24px 26px;box-sizing:border-box;z-index:10">' +
        '<input class="g2-name" placeholder="Name this thought" style="display:block;width:100%;box-sizing:border-box;border:none;border-bottom:1px solid rgba(31,138,150,.45);background:none;outline:none;font:500 18px ' + SERIF + ';color:' + INK + ';padding:0 0 6px;margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.5)">file under</span>' +
        '<span style="position:relative;flex:1">' +
        '<button class="g2-dd" style="display:flex;align-items:center;gap:8px;border:1px solid rgba(60,66,73,.15);background:rgba(255,255,255,.7);border-radius:16px;padding:8px 14px;font:500 12.5px ' + SANS + ';color:' + TEAL + ';cursor:pointer;max-width:100%"><span class="g2-ddv"></span><span style="font-size:10px;opacity:.5;color:' + INK + '">▾</span></button>' +
        '<span class="g2-ddlist" style="display:none;position:absolute;left:0;bottom:42px;min-width:200px;background:#FFFFFF;border:1px solid rgba(60,66,73,.12);border-radius:14px;box-shadow:0 10px 30px rgba(60,66,73,.16);padding:6px;z-index:30;flex-direction:column"></span></span></div>' +
        '<div style="position:relative;height:72px;border:1px solid rgba(60,66,73,.12);border-radius:12px;background:rgba(240,239,236,.6);overflow:hidden;margin-bottom:14px">' +
        '<span style="position:absolute;left:22%;top:30%;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle,rgba(31,138,150,.3),rgba(31,138,150,0) 70%);transform:translate(-50%,-50%)"></span>' +
        '<span style="position:absolute;left:62%;top:42%;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,rgba(224,130,78,.3),rgba(224,130,78,0) 70%);transform:translate(-50%,-50%)"></span>' +
        '<span style="position:absolute;left:42%;top:74%;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,rgba(120,125,130,.3),rgba(120,125,130,0) 70%);transform:translate(-50%,-50%)"></span>' +
        '<span style="position:absolute;left:30%;top:56%;width:3px;height:3px;border-radius:50%;background:rgba(60,66,73,.3)"></span>' +
        '<span style="position:absolute;left:70%;top:24%;width:3px;height:3px;border-radius:50%;background:rgba(60,66,73,.3)"></span>' +
        '<span style="position:absolute;left:52%;top:38%;width:3px;height:3px;border-radius:50%;background:rgba(60,66,73,.3)"></span>' +
        '<span class="g2-mapdot" style="position:absolute;left:22%;top:30%;transform:translate(-50%,-50%);transition:left .35s,top .35s"><span style="display:block;width:9px;height:9px;border-radius:50%;background:' + TEAL + ';box-shadow:0 0 0 4px rgba(31,138,150,.18)"></span></span>' +
        '<span style="position:absolute;right:9px;bottom:6px;font:400 11px ' + SANS + ';color:rgba(60,66,73,.45)">where it lands in your Space</span></div>' +
        '<div style="display:flex;gap:12px">' +
        '<button class="g2-talk" style="flex:none;height:50px;padding:0 20px;border-radius:25px;border:1px solid rgba(60,66,73,.18);background:none;font:500 13.5px ' + SANS + ';color:' + INK + ';cursor:pointer">Keep talking</button>' +
        '<button class="g2-save" style="flex:1;height:50px;border-radius:25px;border:none;background:' + INK + ';color:#F0EFEC;font:500 15px ' + SANS + ';cursor:pointer">Save</button></div></div>' +
        '<div class="g2-snack" style="position:absolute;left:50%;transform:translateX(-50%);bottom:322px;background:' + INK + ';color:#F0EFEC;border-radius:18px;padding:9px 18px;font:400 12.5px ' + SANS + ';opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;z-index:30"></div>';
      this._graph = this.querySelector('.g2-graph');
      const rb = this.querySelector('.g2-rback');
      if (rb) rb.addEventListener('click', () => this.dispatchEvent(new CustomEvent('nk-back', { bubbles: true })));
      const name = this.querySelector('.g2-name');
      name.value = this.title;
      name.addEventListener('input', () => this.title = name.value);
      this.querySelector('.g2-ddv').textContent = this.folder;
      const dd = this.querySelector('.g2-dd'), list = this.querySelector('.g2-ddlist');
      dd.addEventListener('click', () => {
        this.ddOpen = !this.ddOpen;
        list.style.display = this.ddOpen ? 'flex' : 'none';
        if (this.ddOpen) list.innerHTML = FOLDERS.map(f => {
          const on = f === this.folder;
          return '<button data-f="' + f + '" style="border:none;background:' + (on ? 'rgba(31,138,150,.1)' : 'none') + ';border-radius:9px;padding:9px 12px;font:500 13px ' + SANS + ';color:' + (on ? TEAL : INK) + ';cursor:pointer;text-align:left">' + (on ? '✓ ' : '') + f + '</button>';
        }).join('');
      });
      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-f]');
        if (b) { this.folder = b.getAttribute('data-f'); this.ddOpen = false; list.style.display = 'none'; this.querySelector('.g2-ddv').textContent = this.folder; this.updateMapDot(); }
      });
      this.updateMapDot();
      this.querySelector('.g2-save').addEventListener('click', () => this.dispatchEvent(new CustomEvent('nk-saved', { bubbles: true })));
      this.querySelector('.g2-talk').addEventListener('click', () => this.dispatchEvent(new CustomEvent('nk-talk', { bubbles: true })));
      // graph interactions
      this._graph.addEventListener('contextmenu', (e) => {
        const box = e.target.closest('[data-i]');
        if (box) { e.preventDefault(); this.setFocus(+box.getAttribute('data-i')); }
      });
      this._graph.addEventListener('pointerdown', (e) => {
        const box = e.target.closest('[data-i]');
        if (!box || e.target.closest('[data-b]') || e.target.closest('.g2-input')) return;
        const i = +box.getAttribute('data-i');
        this._lp = setTimeout(() => this.setFocus(i), 420);
      });
      ['pointerup', 'pointerleave'].forEach(ev => this._graph.addEventListener(ev, () => clearTimeout(this._lp)));
      this._graph.addEventListener('click', (e) => {
        const b = e.target.closest('[data-b]');
        if (b) {
          const a = b.getAttribute('data-b'), i = this.focus;
          if (a === 'edit') { this.editing = i; this.renderGraph(); const inp = this.querySelector('.g2-input'); if (inp) { inp.focus(); inp.select(); } }
          else if (a === 'mic') {
            this.listening = i; this.editing = -1; this.renderGraph();
            setTimeout(() => {
              if (this.listening !== i) return;
              this.nodes[i].text = RERECORD[i];
              this.listening = -1; this.focus = -1; this.renderGraph();
              this.snack('Box re-recorded');
            }, 1900);
          }
          else if (a === 'del') { this.showConfirm(i); }
          e.stopPropagation(); return;
        }
        if (!e.target.closest('[data-i]') && this.focus >= 0 && this.editing < 0 && this.listening < 0) { this.focus = -1; this.renderGraph(); }
      });
      this.renderGraph();
    }
    bindGraph() {
      this._graph.addEventListener('contextmenu', (e) => {
        const box = e.target.closest('[data-i]');
        if (box) { e.preventDefault(); this.setFocus(+box.getAttribute('data-i')); }
      });
      this._graph.addEventListener('pointerdown', (e) => {
        const box = e.target.closest('[data-i]');
        if (!box || e.target.closest('[data-b]') || e.target.closest('.g2-input')) return;
        const i = +box.getAttribute('data-i');
        this._lp = setTimeout(() => this.setFocus(i), 420);
      });
      ['pointerup', 'pointerleave'].forEach(ev => this._graph.addEventListener(ev, () => clearTimeout(this._lp)));
      this._graph.addEventListener('click', (e) => {
        const b = e.target.closest('[data-b]');
        if (b) {
          const a = b.getAttribute('data-b'), i = this.focus;
          if (a === 'edit') { this.editing = i; this.renderGraph(); const inp = this.querySelector('.g2-input'); if (inp) { inp.focus(); inp.select(); } }
          else if (a === 'mic') {
            this.listening = i; this.editing = -1; this.renderGraph();
            setTimeout(() => {
              if (this.listening !== i) return;
              this.nodes[i].text = RERECORD[i];
              this.listening = -1; this.focus = -1; this.renderGraph();
              this.snack('Box re-recorded');
            }, 1900);
          }
          else if (a === 'del') { this.showConfirm(i); }
          e.stopPropagation(); return;
        }
        const box = e.target.closest('[data-i]');
        if (box && this.preview && !e.target.closest('.g2-input')) {
          const i = +box.getAttribute('data-i');
          this.focus = this.focus === i ? -1 : i; this.editing = -1; this.listening = -1;
          this.renderGraph(); return;
        }
        if (!box && this.focus >= 0 && this.editing < 0 && this.listening < 0) { this.focus = -1; this.renderGraph(); }
      });
    }
    renderPreview() {
      this.innerHTML =
        '<div style="position:absolute;top:70px;left:24px;right:24px;display:flex;align-items:center;gap:10px;z-index:5">' +
        '<span class="g2-pback" style="font-size:19px;color:rgba(60,66,73,.5);cursor:pointer;padding:2px 8px 2px 0">←</span>' +
        '<span style="flex:1"><span style="display:flex;align-items:center;gap:8px"><span class="g2-ptitle" style="font:500 19px ' + SERIF + ';color:' + INK + '">' + this.title + '</span>' +
        '<button class="g2-tedit" style="border:none;background:none;cursor:pointer;font:400 16px ' + SANS + ';color:rgba(60,66,73,.55);flex:none;padding:2px 4px">✎</button></span>' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.45)">today · filed under <span style="color:' + TEAL + '">Product ideas</span> · tap a box to change it</span></span></div>' +
        '<div class="g2-graph" style="position:absolute;top:136px;bottom:196px;left:0;right:0;overflow-y:auto;padding:12px 40px;box-sizing:border-box"></div>' +
        '<div style="position:absolute;bottom:132px;left:24px;right:24px;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.5);border:1px solid rgba(60,66,73,.1);border-radius:14px;padding:10px 14px;z-index:5">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + CLAY + ';flex:none;opacity:.7"></span>' +
        '<span style="flex:1;font:400 12.5px ' + SANS + ';color:rgba(60,66,73,.6)">connects to <span style=";font-family:' + SERIF + ';color:' + INK + '">narrator hears you</span> — “a voice that walks with you”</span></div>' +
        '<div style="position:absolute;bottom:56px;left:0;right:0;display:flex;justify-content:center;z-index:5">' +
        '<button class="g2-cont" style="height:52px;padding:0 30px;border-radius:26px;border:none;background:' + INK + ';color:#F0EFEC;font:500 15px ' + SANS + ';cursor:pointer;display:flex;align-items:center;gap:9px"><span style="width:7px;height:7px;border-radius:50%;background:#8CC7CE"></span>Continue this thought</button></div>' +
        '<div class="g2-snack" style="position:absolute;left:50%;transform:translateX(-50%);bottom:200px;background:' + INK + ';color:#F0EFEC;border-radius:18px;padding:9px 18px;font:400 12.5px ' + SANS + ';opacity:0;pointer-events:none;transition:opacity .25s;white-space:nowrap;z-index:30"></div>';
      this._graph = this.querySelector('.g2-graph');
      this.querySelector('.g2-pback').addEventListener('click', () => this.dispatchEvent(new CustomEvent('nk-back', { bubbles: true })));
      this.querySelector('.g2-tedit').addEventListener('click', () => {
        const t = this.querySelector('.g2-ptitle');
        const inp = document.createElement('input');
        inp.value = this.title;
        inp.style.cssText = 'border:none;border-bottom:1px solid #1F8A96;background:none;outline:none;font:500 19px ' + SERIF + ';color:' + INK + ';padding:0 0 2px;width:220px';
        t.replaceWith(inp); inp.focus(); inp.select();
        const commit = () => { const v = inp.value.trim(); if (v) this.title = v; this.renderPreview(); };
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(); });
        inp.addEventListener('blur', commit);
      });
      this.querySelector('.g2-cont').addEventListener('click', () => this.dispatchEvent(new CustomEvent('nk-talk', { bubbles: true })));
      this.bindGraph();
      this.renderGraph();
    }
    renderGraph() {
      this._graph.innerHTML = this.graphHtml();
      const inp = this.querySelector('.g2-input');
      if (inp) {
        const i = this.editing;
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.commitEdit(i, inp.value); });
        inp.addEventListener('blur', () => this.commitEdit(i, inp.value));
      }
    }
    renderSaved() {
      const t = this.title.trim() || 'Untitled thought';
      this.innerHTML =
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 36px;text-align:center">' +
        '<span style="width:52px;height:52px;border-radius:50%;background:rgba(31,138,150,.12);display:flex;align-items:center;justify-content:center;font:400 22px ' + SANS + ';color:' + TEAL + ';margin-bottom:22px;animation:breathe 3s ease-in-out infinite">✓</span>' +
        '<span style="font:500 24px/1.3 ' + SERIF + ';color:' + INK + '">' + t + '</span>' +
        (this.desc.trim() ? '<span style="font:400 13.5px/1.5 ' + SANS + ';color:rgba(60,66,73,.55);margin-top:8px">' + this.desc + '</span>' : '') +
        '<span style="font:400 13px ' + SANS + ';color:rgba(60,66,73,.5);margin-top:14px">filed under <span style="color:' + TEAL + ';font-weight:500">' + this.folder + '</span></span>' +
        '<span style="display:flex;align-items:center;gap:8px;margin-top:28px;background:rgba(255,255,255,.6);border:1px solid rgba(60,66,73,.1);border-radius:16px;padding:10px 16px">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + TEAL + ';opacity:.7"></span>' +
        '<span style="font:400 12px ' + SANS + ';color:rgba(60,66,73,.6)">it landed near <span style=";font-family:' + SERIF + '">talking to your notes</span> in your Space</span></span>' +
        '<div style="display:flex;flex-direction:column;gap:12px;margin-top:40px;width:100%;max-width:280px">' +
        '<button class="g2-space" style="height:52px;border-radius:26px;border:none;background:' + INK + ';color:#F0EFEC;font:500 15px ' + SANS + ';cursor:pointer">See it in your Space</button>' +
        '<button class="g2-new" style="height:52px;border-radius:26px;border:1px solid rgba(60,66,73,.18);background:none;font:500 14px ' + SANS + ';color:' + INK + ';cursor:pointer">Start a new thought</button>' +
        '<button class="g2-back" style="border:none;background:none;font:400 13px ' + SANS + ';color:rgba(60,66,73,.5);cursor:pointer;text-decoration:underline">back to editing</button></div></div>';
      this.querySelector('.g2-back').addEventListener('click', () => { this.stage = 'review'; this.render(); });
      this.querySelector('.g2-space').addEventListener('click', () => this.dispatchEvent(new CustomEvent('nk-space', { bubbles: true })));
      this.querySelector('.g2-new').addEventListener('click', () => this.dispatchEvent(new CustomEvent('nk-new', { bubbles: true })));
    }
  }
  if (!customElements.get('napkiln-graph-edit2')) customElements.define('napkiln-graph-edit2', NapkilnGraphEdit2);
})();
