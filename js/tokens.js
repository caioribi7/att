// Tokens: sprites com borda, nome e barras de status. Suporta arrastar (com snap),
// múltipla seleção, lanterna, e edição via modal.
ATT.tokens = {
  byId: new Map(), // id -> Container

  init(){
    ATT.on('tokens:changed', () => this.redrawAll());
    ATT.on('grid:changed', () => this.redrawAll());
    ATT.on('selection:changed', () => this._refreshSelection());
    ATT.on('view:changed', () => this.redrawAll());
  },

  add(x, y, opts = {}){
    const t = {
      id: ATT.nextId(),
      x, y,
      sizeCells: opts.sizeCells ?? 1,
      name: opts.name ?? 'Token',
      image: opts.image ?? null,           // dataURL ou null (placeholder colorido)
      border: opts.border ?? 0x22d3ee,
      flashlight: opts.flashlight ?? false,
      flashRadius: opts.flashRadius ?? 6,  // em cells
      bars: opts.bars ?? [
        { name: 'HP', cur: 20, max: 20, color: 0xef4444 },
        { name: 'PE', cur: 10, max: 10, color: 0x22d3ee },
      ],
    };
    ATT.state.tokens.push(t);
    this._build(t);
    ATT.emit('tokens:changed');
    ATT.emit('vision:changed');
    return t;
  },

  get(id){ return ATT.state.tokens.find(t => t.id === id); },

  // Atualiza props parciais e re-renderiza
  update(id, patch){
    const t = this.get(id); if (!t) return;
    Object.assign(t, patch);
    const c = this.byId.get(id); if (c) this._refresh(t, c);
    ATT.emit('tokens:changed');
    if (patch.flashlight !== undefined || patch.flashRadius !== undefined || patch.x !== undefined) ATT.emit('vision:changed');
  },

  // Ajusta uma barra (índice)
  setBar(id, idx, patch){
    const t = this.get(id); if (!t || !t.bars[idx]) return;
    Object.assign(t.bars[idx], patch);
    const c = this.byId.get(id); if (c) this._refresh(t, c);
    ATT.emit('tokens:changed');
  },

  // Centraliza câmera no token (com tween)
  locate(id){
    const t = this.get(id); if (!t) return;
    ATT.app.tweenTo(t.x, t.y);
    if (!ATT.state.selection.has(id)){ ATT.state.selection.clear(); ATT.state.selection.add(id); ATT.emit('selection:changed'); }
  },

  // Duplica token (offset 1 cell)
  duplicate(id){
    const src = this.get(id); if (!src) return;
    const cell = ATT.state.grid.size;
    const copy = {
      x: src.x + cell, y: src.y, sizeCells: src.sizeCells, name: src.name + ' (cópia)',
      image: src.image, border: src.border, flashlight: src.flashlight, flashRadius: src.flashRadius,
      bars: src.bars.map(b => ({ ...b })),
    };
    return this.add(copy.x, copy.y, copy);
  },

  remove(id){
    const i = ATT.state.tokens.findIndex(t => t.id === id);
    if (i < 0) return;
    ATT.state.tokens.splice(i, 1);
    const c = this.byId.get(id);
    if (c){ c.parent?.removeChild(c); c.destroy({ children: true }); this.byId.delete(id); }
    ATT.state.selection.delete(id);
    ATT.emit('tokens:changed');
    ATT.emit('selection:changed');
    ATT.emit('vision:changed');
  },

  redrawAll(){
    for (const t of ATT.state.tokens){
      let c = this.byId.get(t.id);
      if (!c){ this._build(t); c = this.byId.get(t.id); }
      this._refresh(t, c);
    }
    this._refreshSelection();
  },

  _build(t){
    const c = new PIXI.Container();
    c.eventMode = 'static';
    c.cursor = 'grab';
    c._tokenId = t.id;
    ATT.app.layers.tokens.addChild(c);
    this.byId.set(t.id, c);
    this._wireDrag(c, t);
    this._refresh(t, c);
  },

  _refresh(t, c){
    c.removeChildren();
    const cell = ATT.state.grid.size;
    const size = cell * t.sizeCells;
    const r = size / 2;

    // base circular (placeholder se sem imagem)
    const base = new PIXI.Graphics();
    if (!t.image){
      base.beginFill(0x1f2937, 1).drawCircle(0, 0, r).endFill();
    }
    c.addChild(base);

    // imagem
    if (t.image){
      const tex = PIXI.Texture.from(t.image);
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      // Quando a textura carregar, reescala
      const fit = () => {
        const s = size / Math.max(sprite.texture.width, sprite.texture.height);
        sprite.scale.set(s);
      };
      if (sprite.texture.baseTexture.valid) fit();
      else sprite.texture.baseTexture.once('loaded', fit);
      // máscara circular
      const mask = new PIXI.Graphics();
      mask.beginFill(0xffffff, 1).drawCircle(0, 0, r).endFill();
      sprite.mask = mask;
      c.addChild(sprite); c.addChild(mask);
    }

    // borda
    const border = new PIXI.Graphics();
    const sel = ATT.state.selection.has(t.id);
    border.lineStyle({ width: sel ? 4 : 2, color: sel ? 0xfafafa : t.border, alpha: 1 });
    border.drawCircle(0, 0, r);
    c.addChild(border);

    // ícone de lanterna
    if (t.flashlight){
      const f = new PIXI.Graphics();
      f.beginFill(0xfff2cc, 1).drawCircle(r * 0.7, -r * 0.7, 6).endFill();
      f.lineStyle({ width: 1, color: 0x111111, alpha: 0.8 }).drawCircle(r * 0.7, -r * 0.7, 6);
      c.addChild(f);
    }

    // nome
    const label = new PIXI.Text(t.name, {
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: Math.max(12, cell * 0.18),
      fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, align: 'center',
    });
    label.anchor.set(0.5, 1);
    label.position.set(0, -r - 6);
    c.addChild(label);

    // barras
    const barW = size * 1.05;
    const barH = Math.max(6, cell * 0.08);
    const gap = 3;
    let by = r + 6;
    for (const b of t.bars){
      const bg = new PIXI.Graphics();
      bg.beginFill(0x000000, 0.6).drawRoundedRect(-barW/2, by, barW, barH, 3).endFill();
      const ratio = ATT.util.clamp(b.cur / Math.max(1, b.max), 0, 1);
      const fg = new PIXI.Graphics();
      fg.beginFill(b.color, 0.95).drawRoundedRect(-barW/2 + 1, by + 1, (barW - 2) * ratio, barH - 2, 2).endFill();
      const txt = new PIXI.Text(`${b.name} ${b.cur}/${b.max}`, {
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: Math.max(10, cell * 0.12),
        fill: 0xffffff, stroke: 0x000000, strokeThickness: 2,
      });
      txt.anchor.set(0.5);
      txt.position.set(0, by + barH/2);
      c.addChild(bg); c.addChild(fg); c.addChild(txt);
      by += barH + gap;
    }

    c.position.set(t.x, t.y);
  },

  _refreshSelection(){
    for (const t of ATT.state.tokens){
      const c = this.byId.get(t.id);
      if (c) this._refresh(t, c);
    }
  },

  _wireDrag(c, t){
    let dragging = false;
    let dragStart = null; // posição inicial do mundo
    let initialPositions = null; // map(id -> {x,y}) das selecionadas

    c.on('pointerdown', (e) => {
      if (ATT.state.tool !== 'select') return;
      ATT._consumedAt = performance.now();
      if (e.button === 2){ // botão direito abre modal
        ATT.ui.openTokenModal(t.id);
        e.stopPropagation();
        return;
      }
      // Se não estava selecionado: shift adiciona, senão substitui
      const sel = ATT.state.selection;
      if (e.shiftKey){
        if (sel.has(t.id)) sel.delete(t.id); else sel.add(t.id);
      } else {
        if (!sel.has(t.id)){ sel.clear(); sel.add(t.id); }
      }
      ATT.emit('selection:changed');

      dragging = true;
      const p = e.getLocalPosition(ATT.app.world);
      dragStart = { x: p.x, y: p.y };
      initialPositions = new Map();
      for (const id of sel){
        const tt = ATT.state.tokens.find(x => x.id === id);
        if (tt) initialPositions.set(id, { x: tt.x, y: tt.y });
      }
      c.cursor = 'grabbing';
      e.stopPropagation();
    });

    const move = (e) => {
      if (!dragging) return;
      const r = ATT.app.pixi.view.getBoundingClientRect();
      const p = ATT.app.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      const dx = p.x - dragStart.x;
      const dy = p.y - dragStart.y;
      for (const id of ATT.state.selection){
        const tt = ATT.state.tokens.find(x => x.id === id);
        const init = initialPositions.get(id);
        if (!tt || !init) continue;
        let nx = init.x + dx, ny = init.y + dy;
        const snap = ATT.grid.snap(nx, ny);
        tt.x = snap.x; tt.y = snap.y;
        const cc = ATT.tokens.byId.get(id);
        if (cc) cc.position.set(tt.x, tt.y);
      }
      ATT.emit('vision:changed');
    };
    const up = () => {
      if (!dragging) return;
      dragging = false; c.cursor = 'grab';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  },
};
