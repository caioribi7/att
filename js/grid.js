// Grid dinâmico (renderizado via Graphics; redesenha quando muda)
ATT.grid = {
  gfx: null,

  init(){
    this.gfx = new PIXI.Graphics();
    ATT.app.layers.grid.addChild(this.gfx);
    this.redraw();
    ATT.on('map:changed', () => this.redraw());
    ATT.on('grid:changed', () => this.redraw());
  },

  // arredonda ponto para o centro da célula mais próxima
  snap(x, y){
    if (!ATT.state.grid.snap) return { x, y };
    const s = ATT.state.grid.size;
    return { x: Math.round(x / s) * s, y: Math.round(y / s) * s };
  },

  redraw(){
    const g = this.gfx;
    g.clear();
    const { size, show, color, alpha } = ATT.state.grid;
    const m = ATT.state.map;
    if (!show) return;
    g.lineStyle({ width: 1, color, alpha, native: true });
    for (let x = 0; x <= m.width; x += size){
      g.moveTo(x, 0); g.lineTo(x, m.height);
    }
    for (let y = 0; y <= m.height; y += size){
      g.moveTo(0, y); g.lineTo(m.width, y);
    }
  },

  async loadMapFromFile(file){
    const img = await ATT.util.loadImageFile(file);
    const tex = PIXI.Texture.from(img);
    const sprite = new PIXI.Sprite(tex);
    sprite.x = 0; sprite.y = 0;

    const old = ATT.state.map.sprite;
    if (old) ATT.app.layers.map.removeChild(old);
    ATT.app.layers.map.addChild(sprite);

    ATT.state.map = { sprite, width: img.naturalWidth, height: img.naturalHeight, dataUrl: img.src };
    ATT.app.centerOnMap();
    ATT.emit('map:changed');
  },
};
