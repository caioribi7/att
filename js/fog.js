// Fog of war com luz suave (radial gradient + máscara de polígono de visibilidade).
//
// Pipeline:
//   1) lightsRT   ← desenha o gradiente de cada luz (mascarado pelo polígono LOS)
//   2) fogRT      ← preto (alpha=darkness) + ERASE com revealRT + ERASE com lightsRT
//   3) fogSprite  exibe fogRT acima da cena
//
// Resultado: fade homogêneo (Owlbear/Roll20-like), bloqueio por paredes/portas,
// múltiplas luzes somam contribuição (overlap fica mais brilhante).
ATT.fog = {
  fogRT: null, revealRT: null, lightsRT: null,
  fogSprite: null,
  rtScale: 1,
  gradTexture: null,
  GRAD_SIZE: 512,

  init(){
    this._buildGradient();
    ATT.on('map:changed', () => this._build());
    ATT.on('vision:changed', () => this.refresh());
    ATT.on('view:changed', () => this.refresh());
    ATT.on('lights:changed', () => this.refresh());
    ATT.on('walls:changed', () => this.refresh());
    ATT.on('tokens:changed', () => this.refresh());
    this._build();
    this._installPainter();
  },

  // Gradiente radial branco com alpha que cai suavemente do centro até a borda.
  // Quando usado como ERASE sobre o fog preto, cria um pool de luz com falloff homogêneo.
  _buildGradient(){
    const S = this.GRAD_SIZE;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    // Curva inspirada no Owlbear: centro brilhante, cai suave, borda quase 0
    grad.addColorStop(0.00, 'rgba(255,255,255,1.00)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.96)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.82)');
    grad.addColorStop(0.72, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.86, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1.00, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    this.gradTexture = PIXI.Texture.from(c);
  },

  _build(){
    const m = ATT.state.map;
    const MAX = 4096;
    this.rtScale = Math.min(1, MAX / Math.max(m.width, m.height));
    const w = Math.ceil(m.width  * this.rtScale);
    const h = Math.ceil(m.height * this.rtScale);
    if (this.revealRT) this.revealRT.destroy(true);
    if (this.fogRT)    this.fogRT.destroy(true);
    if (this.lightsRT) this.lightsRT.destroy(true);
    this.revealRT = PIXI.RenderTexture.create({ width: w, height: h, resolution: 1 });
    this.fogRT    = PIXI.RenderTexture.create({ width: w, height: h, resolution: 1 });
    this.lightsRT = PIXI.RenderTexture.create({ width: w, height: h, resolution: 1 });

    if (!this.fogSprite){
      this.fogSprite = new PIXI.Sprite(this.fogRT);
      ATT.app.layers.fog.addChild(this.fogSprite);
    } else { this.fogSprite.texture = this.fogRT; }
    this.fogSprite.scale.set(1 / this.rtScale);

    this.refresh();
  },

  paintReveal(wx, wy, radius, mode = 'reveal'){
    const g = new PIXI.Graphics();
    if (mode === 'reveal'){
      g.beginFill(0xffffff, 1).drawCircle(wx * this.rtScale, wy * this.rtScale, radius * this.rtScale).endFill();
    } else {
      g.blendMode = PIXI.BLEND_MODES.ERASE;
      g.beginFill(0xffffff, 1).drawCircle(wx * this.rtScale, wy * this.rtScale, radius * this.rtScale).endFill();
    }
    ATT.app.pixi.renderer.render(g, { renderTexture: this.revealRT, clear: false });
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

  refresh(){
    if (this._scheduled) return;
    this._scheduled = true;
    requestAnimationFrame(() => { this._scheduled = false; this._doRefresh(); });
  },

  _doRefresh(){
    if (!this.fogRT || !this.gradTexture) return;
    const m = ATT.state.map;
    const W = m.width * this.rtScale, H = m.height * this.rtScale;
    const renderer = ATT.app.pixi.renderer;

    // ── 1) Renderiza todas as luzes em lightsRT (gradientes + máscara LOS)
    const lightsCompose = new PIXI.Container();
    const baseR = this.GRAD_SIZE / 2;
    const cellPx = ATT.state.grid.size;

    const pushLight = (x, y, radius, intensity) => {
      const poly = ATT.lights.visibilityPolygon(x, y, radius);
      if (poly.length < 6) return;
      // máscara de polígono LOS (em coords do RT)
      const polyG = new PIXI.Graphics();
      const flat = poly.map(v => v * this.rtScale);
      polyG.beginFill(0xffffff, 1).drawPolygon(flat).endFill();
      // sprite do gradiente
      const sprite = new PIXI.Sprite(this.gradTexture);
      sprite.anchor.set(0.5);
      sprite.position.set(x * this.rtScale, y * this.rtScale);
      const s = (radius / baseR) * this.rtScale;
      sprite.scale.set(s);
      sprite.alpha = ATT.util.clamp(intensity ?? 1, 0, 1);
      // mascarar com o polígono
      sprite.mask = polyG;
      lightsCompose.addChild(polyG);
      lightsCompose.addChild(sprite);
    };

    for (const l of ATT.state.lights){
      const r = (l.animate && l._flickerR) ? l._flickerR : l.radius;
      pushLight(l.x, l.y, r, l.intensity);
    }
    for (const t of ATT.state.tokens){
      if (!t.flashlight) continue;
      const r = (t.flashRadius || 6) * cellPx;
      pushLight(t.x, t.y, r, 1);
    }

    renderer.render(lightsCompose, { renderTexture: this.lightsRT, clear: true });
    lightsCompose.destroy({ children: true });

    // ── 2) Compõe fog: preto (intensidade) − reveal manual − lightsRT
    const fogCompose = new PIXI.Container();

    const black = new PIXI.Graphics();
    const d = ATT.util.clamp(ATT.state.view.darkness ?? 1, 0, 1);
    const baseAlpha = ATT.state.view.mode === 'gm' ? d * 0.35 : d;
    black.beginFill(0x000000, baseAlpha).drawRect(0, 0, W, H).endFill();
    fogCompose.addChild(black);

    const revealCopy = new PIXI.Sprite(this.revealRT);
    revealCopy.blendMode = PIXI.BLEND_MODES.ERASE;
    fogCompose.addChild(revealCopy);

    const lightsCopy = new PIXI.Sprite(this.lightsRT);
    lightsCopy.blendMode = PIXI.BLEND_MODES.ERASE;
    fogCompose.addChild(lightsCopy);

    renderer.render(fogCompose, { renderTexture: this.fogRT, clear: true });
    fogCompose.destroy({ children: true });
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
