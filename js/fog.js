// Fog of war:
//   - revealRT (RenderTexture): máscara persistente do que o mestre revelou manualmente
//   - fogRT  (RenderTexture):  recomposta a cada mudança; preto sobre o mapa, com buracos onde
//     há (a) revelação manual ou (b) polígono de visibilidade dinâmica.
ATT.fog = {
  fogRT: null,
  revealRT: null,
  fogSprite: null,    // sprite que exibe fogRT
  revealSprite: null, // sprite que exibe revealRT (cache, usado para erase)
  rtScale: 1,         // escala usada se mapa for muito grande

  init(){
    ATT.on('map:changed', () => this._build());
    ATT.on('vision:changed', () => this.refresh());
    ATT.on('view:changed', () => this.refresh());
    ATT.on('lights:changed', () => this.refresh());
    ATT.on('walls:changed', () => this.refresh());
    ATT.on('tokens:changed', () => this.refresh());
    this._build();
    this._installPainter();
  },

  _build(){
    const m = ATT.state.map;
    const MAX = 4096;
    this.rtScale = Math.min(1, MAX / Math.max(m.width, m.height));
    const w = Math.ceil(m.width  * this.rtScale);
    const h = Math.ceil(m.height * this.rtScale);
    if (this.revealRT) this.revealRT.destroy(true);
    if (this.fogRT)    this.fogRT.destroy(true);
    this.revealRT = PIXI.RenderTexture.create({ width: w, height: h, resolution: 1 });
    this.fogRT    = PIXI.RenderTexture.create({ width: w, height: h, resolution: 1 });

    if (!this.fogSprite){
      this.fogSprite = new PIXI.Sprite(this.fogRT);
      ATT.app.layers.fog.addChild(this.fogSprite);
    } else { this.fogSprite.texture = this.fogRT; }
    this.fogSprite.scale.set(1 / this.rtScale);

    if (!this.revealSprite) this.revealSprite = new PIXI.Sprite(this.revealRT);
    else this.revealSprite.texture = this.revealRT;

    this.refresh();
  },

  // Pinta na máscara persistente (revelar/esconder em raio)
  paintReveal(wx, wy, radius, mode = 'reveal'){
    const g = new PIXI.Graphics();
    if (mode === 'reveal'){
      g.beginFill(0xffffff, 1).drawCircle(wx * this.rtScale, wy * this.rtScale, radius * this.rtScale).endFill();
      ATT.app.pixi.renderer.render(g, { renderTexture: this.revealRT, clear: false });
    } else {
      g.blendMode = PIXI.BLEND_MODES.ERASE;
      g.beginFill(0xffffff, 1).drawCircle(wx * this.rtScale, wy * this.rtScale, radius * this.rtScale).endFill();
      ATT.app.pixi.renderer.render(g, { renderTexture: this.revealRT, clear: false });
    }
    g.destroy();
    this.refresh();
  },

  clearReveal(){
    ATT.app.pixi.renderer.render(new PIXI.Container(), { renderTexture: this.revealRT, clear: true });
    this.refresh();
  },

  revealAll(){
    const m = ATT.state.map;
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff, 1).drawRect(0, 0, m.width * this.rtScale, m.height * this.rtScale).endFill();
    ATT.app.pixi.renderer.render(g, { renderTexture: this.revealRT, clear: true });
    g.destroy();
    this.refresh();
  },

  // Recomputa a máscara final a partir de:
  //   1) preto cobrindo o mapa
  //   2) ERASE com revelações persistentes
  //   3) ERASE com polígonos de visibilidade (lanternas em tokens + luzes)
  refresh(){
    if (!this.fogRT) return;
    const m = ATT.state.map;
    const W = m.width * this.rtScale, H = m.height * this.rtScale;
    const renderer = ATT.app.pixi.renderer;

    const compose = new PIXI.Container();

    // Camada base preta. Em modo GM, semi-transparente para ele "ver através".
    const black = new PIXI.Graphics();
    const d = ATT.util.clamp(ATT.state.view.darkness ?? 1, 0, 1);
    const baseAlpha = ATT.state.view.mode === 'gm' ? d * 0.35 : d;
    black.beginFill(0x000000, baseAlpha).drawRect(0, 0, W, H).endFill();
    compose.addChild(black);

    // ERASE com a máscara persistente (revelações manuais)
    const revealCopy = new PIXI.Sprite(this.revealRT);
    revealCopy.blendMode = PIXI.BLEND_MODES.ERASE;
    compose.addChild(revealCopy);

    // ERASE com polígonos de visibilidade (lights + tokens com lanterna)
    const visG = new PIXI.Graphics();
    visG.blendMode = PIXI.BLEND_MODES.ERASE;
    visG.beginFill(0xffffff, 1);
    const cellPx = ATT.state.grid.size;

    for (const l of ATT.state.lights){
      const poly = ATT.lights.visibilityPolygon(l.x, l.y, l.radius);
      if (poly.length >= 6) visG.drawPolygon(poly.map((v, i) => i % 2 === 0 ? v * this.rtScale : v * this.rtScale));
    }
    for (const t of ATT.state.tokens){
      if (!t.flashlight) continue;
      const r = (t.flashRadius || 6) * cellPx;
      const poly = ATT.lights.visibilityPolygon(t.x, t.y, r);
      if (poly.length >= 6) visG.drawPolygon(poly.map((v, i) => i % 2 === 0 ? v * this.rtScale : v * this.rtScale));
    }
    visG.endFill();
    compose.addChild(visG);

    renderer.render(compose, { renderTexture: this.fogRT, clear: true });
    compose.destroy({ children: true });
  },

  _installPainter(){
    const view = ATT.app.pixi.view;
    let painting = false, mode = null;
    const radius = () => ATT.state.grid.size * 1.5;

    const begin = (e) => {
      if (e.button !== 0) return;
      const t = ATT.state.tool;
      if (t !== 'reveal' && t !== 'hide') return;
      painting = true; mode = (t === 'reveal') ? 'reveal' : 'hide';
      paintAt(e); e.preventDefault();
    };
    const move = (e) => { if (painting) paintAt(e); };
    const end = () => { painting = false; mode = null; };
    const paintAt = (e) => {
      const r = view.getBoundingClientRect();
      const p = ATT.app.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      this.paintReveal(p.x, p.y, radius(), mode);
    };
    view.addEventListener('pointerdown', begin);
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', end);
    view.addEventListener('pointerleave', end);
  },
};
