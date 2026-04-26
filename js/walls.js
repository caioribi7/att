// Paredes e portas. Em modo Mestre são desenhadas; portas podem ser abertas/fechadas com clique.
ATT.walls = {
  gfx: null,

  init(){
    this.gfx = new PIXI.Graphics();
    ATT.app.layers.walls.addChild(this.gfx);

    ATT.on('walls:changed', () => this.redraw());
    ATT.on('view:changed', () => this.redraw());
  },

  // Tenta interagir com porta/parede no ponto. Retorna true se algo foi feito.
  handleClick(p, button){
    const door = this.findDoorNear(p.x, p.y, 16);
    if (door){
      if (button === 2){ this.removeNear(p.x, p.y, 16); }
      else { door.open = !door.open; ATT.emit('walls:changed'); ATT.emit('vision:changed'); }
      return true;
    }
    if (button === 2){
      const before = ATT.state.walls.length + ATT.state.doors.length;
      this.removeNear(p.x, p.y, 16);
      const after = ATT.state.walls.length + ATT.state.doors.length;
      return after !== before;
    }
    return false;
  },

  add(kind, x1, y1, x2, y2){
    const seg = { id: ATT.nextId(), x1, y1, x2, y2 };
    if (kind === 'door'){ seg.open = false; ATT.state.doors.push(seg); }
    else { ATT.state.walls.push(seg); }
    ATT.emit('walls:changed');
    ATT.emit('vision:changed');
  },

  removeNear(x, y, r = 14){
    const tryRemove = (arr) => {
      const i = arr.findIndex(w => this._distToSeg(x, y, w) < r);
      if (i >= 0){ arr.splice(i, 1); return true; }
      return false;
    };
    if (tryRemove(ATT.state.doors) || tryRemove(ATT.state.walls)){
      ATT.emit('walls:changed'); ATT.emit('vision:changed');
    }
  },

  findDoorNear(x, y, r){
    return ATT.state.doors.find(d => this._distToSeg(x, y, d) < r);
  },

  // Lista de segmentos que bloqueiam visão (paredes + portas fechadas)
  blockingSegments(){
    const out = ATT.state.walls.slice();
    for (const d of ATT.state.doors) if (!d.open) out.push(d);
    // Borda do mapa também bloqueia
    const m = ATT.state.map;
    out.push(
      { x1: 0, y1: 0, x2: m.width, y2: 0 },
      { x1: m.width, y1: 0, x2: m.width, y2: m.height },
      { x1: m.width, y1: m.height, x2: 0, y2: m.height },
      { x1: 0, y1: m.height, x2: 0, y2: 0 },
    );
    return out;
  },

  redraw(){
    const g = this.gfx;
    g.clear();
    if (ATT.state.view.mode !== 'gm') return; // jogadores não veem paredes

    g.lineStyle({ width: 3, color: 0xff3355, alpha: 0.85, native: false });
    for (const w of ATT.state.walls){ g.moveTo(w.x1, w.y1); g.lineTo(w.x2, w.y2); }

    for (const d of ATT.state.doors){
      g.lineStyle({ width: 4, color: d.open ? 0x22c55e : 0xf59e0b, alpha: 0.9 });
      g.moveTo(d.x1, d.y1); g.lineTo(d.x2, d.y2);
      // marcador
      const cx = (d.x1 + d.x2) / 2, cy = (d.y1 + d.y2) / 2;
      g.lineStyle(0); g.beginFill(d.open ? 0x22c55e : 0xf59e0b, 1).drawCircle(cx, cy, 6).endFill();
    }
  },

  _distToSeg(px, py, s){
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const wx = px - s.x1, wy = py - s.y1;
    const len2 = vx*vx + vy*vy || 1;
    const t = Math.max(0, Math.min(1, (wx*vx + wy*vy) / len2));
    const cx = s.x1 + t*vx, cy = s.y1 + t*vy;
    return Math.hypot(px - cx, py - cy);
  },
};
