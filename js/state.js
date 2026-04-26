// Estado central. Tudo aqui é mutável; módulos leem e escrevem.
window.ATT = window.ATT || {};

ATT.state = {
  // mapa
  map: { sprite: null, width: 4000, height: 3000 },

  // grid
  grid: { size: 70, show: true, snap: true, color: 0x000000, alpha: 0.35 },

  // visão / fog
  view: { mode: 'gm', darkness: 1.0 }, // gm | player

  // câmera (controlada por app.js, valores aqui apenas para referência)
  camera: { x: 0, y: 0, scale: 1 },

  // ferramenta atual
  tool: 'select',

  // tokens, paredes, portas, luzes
  tokens: [],   // { id, x, y, sizeCells, name, image, border, flashlight, flashRadius, bars: [{name,cur,max,color}] }
  walls: [],    // { id, x1, y1, x2, y2 }
  doors: [],    // { id, x1, y1, x2, y2, open }
  lights: [],   // { id, x, y, radius, color, intensity }

  // seleção (ids de tokens)
  selection: new Set(),

  // construção em curso (ferramentas wall/door)
  building: null, // { kind: 'wall'|'door', x1, y1 }

  // cinematics
  cinematics: [], // { name, url } urls são object URLs
};

ATT.events = new EventTarget();
ATT.emit = (name, detail) => ATT.events.dispatchEvent(new CustomEvent(name, { detail }));
ATT.on = (name, fn) => ATT.events.addEventListener(name, fn);

ATT.nextId = (() => { let i = 1; return () => i++; })();
