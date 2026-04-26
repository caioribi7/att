// Cálculo de polígono de visibilidade (raycasting nos endpoints).
// Uso comum: tokens com lanterna, luzes pontuais, e revelação do fog.
ATT.lights = {
  gfx: null, // marcadores (modo Mestre)

  init(){
    this.gfx = new PIXI.Graphics();
    ATT.app.layers.lights.addChild(this.gfx);
    ATT.on('lights:changed', () => this.redrawMarkers());
    ATT.on('view:changed', () => this.redrawMarkers());
  },

  add(x, y, opts = {}){
    ATT.state.lights.push({
      id: ATT.nextId(), x, y,
      radius: opts.radius ?? 360,
      color: opts.color ?? 0xfff2cc,
      intensity: opts.intensity ?? 1,
    });
    ATT.emit('lights:changed'); ATT.emit('vision:changed');
  },

  redrawMarkers(){
    const g = this.gfx;
    g.clear();
    if (ATT.state.view.mode !== 'gm') return;
    for (const l of ATT.state.lights){
      g.lineStyle({ width: 1, color: l.color, alpha: 0.6 });
      g.beginFill(l.color, 0.06).drawCircle(l.x, l.y, l.radius).endFill();
      g.lineStyle(0).beginFill(0xffe066, 1).drawCircle(l.x, l.y, 6).endFill();
    }
  },

  // Computa polígono de visibilidade do ponto (ox,oy) limitado a raio.
  // Retorna [x,y, x,y, ...] em coordenadas do mundo, pronto para drawPolygon.
  visibilityPolygon(ox, oy, maxRadius){
    const segs = ATT.walls.blockingSegments();
    // Restringe ao raio ampliado por segurança
    const points = [];
    const eps = 1e-4;
    // colete endpoints únicos
    const eps2 = 0.5;
    const uniq = [];
    const push = (x, y) => {
      for (const p of uniq) if (Math.abs(p.x-x)<eps2 && Math.abs(p.y-y)<eps2) return;
      uniq.push({x,y});
    };
    for (const s of segs){
      if (Math.hypot(s.x1-ox, s.y1-oy) <= maxRadius + 100) push(s.x1, s.y1);
      if (Math.hypot(s.x2-ox, s.y2-oy) <= maxRadius + 100) push(s.x2, s.y2);
    }
    // ângulos de "amostragem": cada endpoint + ±eps; e completa o círculo se não houver paredes próximas
    const angles = [];
    for (const p of uniq){
      const a = Math.atan2(p.y - oy, p.x - ox);
      angles.push(a - eps, a, a + eps);
    }
    // Adiciona amostras circulares para fechar o polígono em direções sem paredes
    const STEPS = 32;
    for (let i = 0; i < STEPS; i++) angles.push((i / STEPS) * Math.PI * 2 - Math.PI);

    const hits = [];
    for (const a of angles){
      const dx = Math.cos(a), dy = Math.sin(a);
      let bestT = maxRadius;
      let bx = ox + dx * maxRadius, by = oy + dy * maxRadius;
      for (const s of segs){
        const r = ATT.util.raySegment(ox, oy, dx, dy, s.x1, s.y1, s.x2, s.y2);
        if (r && r.t > 0 && r.t < bestT){ bestT = r.t; bx = r.x; by = r.y; }
      }
      hits.push({ a, x: bx, y: by });
    }
    hits.sort((p, q) => p.a - q.a);
    const flat = [];
    for (const h of hits){ flat.push(h.x, h.y); }
    return flat;
  },
};
