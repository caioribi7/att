// Caixa de seleção (drag em área vazia com a ferramenta "select").
ATT.selection = {
  rect: null,
  start: null,    // { x, y } em coords do mundo
  current: null,  // { x, y } em coords do mundo
  shift: false,

  init(){
    this.rect = new PIXI.Graphics();
    ATT.app.layers.ui.addChild(this.rect);

    const view = ATT.app.pixi.view;

    view.addEventListener('pointerdown', (e) => {
      if (ATT.state.tool !== 'select') return;
      if (e.button !== 0 && e.button !== 2) return;
      if (ATT.app._spacePressed || e.button === 1) return; // pan tem prioridade
      const r = view.getBoundingClientRect();
      const p = ATT.app.screenToWorld(e.clientX - r.left, e.clientY - r.top);

      // Hit-test: se clicou em cima de um token, não inicia caixa de seleção
      const cell = ATT.state.grid.size;
      const overToken = ATT.state.tokens.some(t => {
        const r0 = (t.sizeCells * cell) / 2;
        return (p.x - t.x) ** 2 + (p.y - t.y) ** 2 <= r0 * r0;
      });
      if (overToken) return;

      // Interação com paredes/portas
      if (ATT.walls.handleClick(p, e.button)) return;

      // Remoção de luz por botão direito
      if (e.button === 2){
        const i = ATT.state.lights.findIndex(l => Math.hypot(p.x - l.x, p.y - l.y) < 14);
        if (i >= 0){
          ATT.state.lights.splice(i, 1);
          ATT.emit('lights:changed'); ATT.emit('vision:changed');
          return;
        }
      }

      if (e.button !== 0) return; // só botão esquerdo inicia caixa

      this.start = { x: p.x, y: p.y };
      this.current = { x: p.x, y: p.y };
      this.shift = e.shiftKey;
      if (!e.shiftKey){ ATT.state.selection.clear(); ATT.emit('selection:changed'); }
    });

    view.addEventListener('pointermove', (e) => {
      if (!this.start) return;
      const r = view.getBoundingClientRect();
      const p = ATT.app.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      this.current = p;
      const x = Math.min(this.start.x, p.x), y = Math.min(this.start.y, p.y);
      const w = Math.abs(p.x - this.start.x), h = Math.abs(p.y - this.start.y);
      this.rect.clear();
      if (w > 4 && h > 4){
        this.rect.lineStyle({ width: 1, color: 0x22d3ee, alpha: 0.9, native: true })
          .beginFill(0x22d3ee, 0.08).drawRect(x, y, w, h).endFill();
      }
    });

    const finish = () => {
      if (!this.start || !this.current) return;
      const x1 = Math.min(this.start.x, this.current.x);
      const x2 = Math.max(this.start.x, this.current.x);
      const y1 = Math.min(this.start.y, this.current.y);
      const y2 = Math.max(this.start.y, this.current.y);
      // Só agrega se for arrasto significativo
      if (Math.abs(x2 - x1) > 4 && Math.abs(y2 - y1) > 4){
        for (const t of ATT.state.tokens){
          if (t.x >= x1 && t.x <= x2 && t.y >= y1 && t.y <= y2){
            ATT.state.selection.add(t.id);
          }
        }
        ATT.emit('selection:changed');
      }
      this.rect.clear();
      this.start = null; this.current = null;
    };
    view.addEventListener('pointerup', finish);
    view.addEventListener('pointerleave', finish);
  },
};
