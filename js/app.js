// Inicialização da PixiJS Application + câmera (pan/zoom) + camadas.
ATT.app = {
  pixi: null,
  world: null,           // Container "mundo" (sofre transform da câmera)
  layers: {},            // map, grid, walls, lights, fog, tokens, ui

  init(){
    const stage = document.getElementById('stage');
    const pixi = new PIXI.Application({
      resizeTo: stage,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      backgroundAlpha: 0,
    });
    stage.appendChild(pixi.view);
    pixi.stage.eventMode = 'static';
    pixi.stage.hitArea = pixi.screen;
    this.pixi = pixi;

    // Mundo (câmera = transform deste container)
    const world = new PIXI.Container();
    world.sortableChildren = true;
    pixi.stage.addChild(world);
    this.world = world;

    // Camadas, em ordem (zIndex)
    const make = (z) => { const c = new PIXI.Container(); c.zIndex = z; world.addChild(c); return c; };
    this.layers.map     = make(0);
    this.layers.grid    = make(10);
    this.layers.walls   = make(20);
    this.layers.lights  = make(30);
    this.layers.tokens  = make(40);
    this.layers.fog     = make(50); // o fog é desenhado por cima do mapa/tokens em modo Player
    this.layers.ui      = make(60); // overlays (caixa de seleção, marcadores)

    this.setupCamera();
    window.addEventListener('resize', () => pixi.renderer.resize(stage.clientWidth, stage.clientHeight));

    // foco no canto do mapa
    this.centerOnMap();
  },

  centerOnMap(){
    const stage = document.getElementById('stage');
    const m = ATT.state.map;
    const sx = stage.clientWidth / m.width;
    const sy = stage.clientHeight / m.height;
    const s = Math.min(sx, sy) * 0.9;
    this.world.scale.set(s);
    this.world.position.set(
      (stage.clientWidth - m.width * s) / 2,
      (stage.clientHeight - m.height * s) / 2,
    );
    ATT.state.camera = { x: this.world.x, y: this.world.y, scale: s };
    ATT.emit('camera:changed');
  },

  // converte coords da tela para coords do mundo
  screenToWorld(sx, sy){
    const w = this.world;
    return { x: (sx - w.x) / w.scale.x, y: (sy - w.y) / w.scale.y };
  },

  setupCamera(){
    const view = this.pixi.view;
    const w = this.world;

    // Pan com botão do meio ou tecla Espaço (modo pan)
    let panning = false, lastX = 0, lastY = 0;
    ATT.app._spacePressed = false;
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) { ATT.app._spacePressed = true; document.body.style.cursor = 'grab'; } });
    window.addEventListener('keyup',   (e) => { if (e.code === 'Space') { ATT.app._spacePressed = false; document.body.style.cursor = 'default'; } });

    view.addEventListener('pointerdown', (e) => {
      const isMiddle = e.button === 1;
      const isToolPan = ATT.state.tool === 'pan' && e.button === 0;
      if (isMiddle || isToolPan || (ATT.app._spacePressed && e.button === 0)) {
        panning = true; lastX = e.clientX; lastY = e.clientY;
        view.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      }
    });
    view.addEventListener('pointermove', (e) => {
      const r = view.getBoundingClientRect();
      const local = ATT.app.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      document.getElementById('coord').textContent =
        `${local.x.toFixed(0)}, ${local.y.toFixed(0)}`;
      if (panning){
        w.x += (e.clientX - lastX);
        w.y += (e.clientY - lastY);
        lastX = e.clientX; lastY = e.clientY;
        ATT.state.camera = { x: w.x, y: w.y, scale: w.scale.x };
        ATT.emit('camera:changed');
      }
    });
    const stop = (e) => {
      if (panning){
        panning = false;
        view.releasePointerCapture?.(e.pointerId);
      }
    };
    view.addEventListener('pointerup', stop);
    view.addEventListener('pointercancel', stop);
    view.addEventListener('pointerleave', stop);

    // Zoom centrado no cursor
    view.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = view.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const before = ATT.app.screenToWorld(mx, my);
      const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
      const newScale = ATT.util.clamp(w.scale.x * factor, 0.05, 8);
      w.scale.set(newScale);
      const after = ATT.app.screenToWorld(mx, my);
      w.x += (after.x - before.x) * newScale;
      w.y += (after.y - before.y) * newScale;
      ATT.state.camera = { x: w.x, y: w.y, scale: newScale };
      ATT.emit('camera:changed');
    }, { passive: false });
  },
};
