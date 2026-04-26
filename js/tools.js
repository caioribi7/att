// Despachador das ferramentas: clique no canvas conforme a ferramenta ativa
ATT.tools = {
  init(){
    const view = ATT.app.pixi.view;
    let pendingPoint = null; // para wall/door (1º clique)

    view.addEventListener('contextmenu', (e) => e.preventDefault());

    view.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const r = view.getBoundingClientRect();
      const p = ATT.app.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      const tool = ATT.state.tool;

      if (tool === 'token'){
        const s = ATT.grid.snap(p.x, p.y);
        ATT.tokens.add(s.x, s.y);
        ATT.ui.flash('Token adicionado.');
      }
      else if (tool === 'wall' || tool === 'door'){
        const s = ATT.grid.snap(p.x, p.y);
        if (!pendingPoint){
          pendingPoint = { x: s.x, y: s.y };
          ATT.ui.flash(`${tool === 'wall' ? 'Parede' : 'Porta'}: clique no segundo ponto (Esc para cancelar).`);
        } else {
          ATT.walls.add(tool, pendingPoint.x, pendingPoint.y, s.x, s.y);
          pendingPoint = null;
          ATT.ui.flash('Adicionado.');
        }
      }
      else if (tool === 'light'){
        ATT.lights.add(p.x, p.y, { radius: ATT.state.grid.size * 6 });
        ATT.ui.flash('Luz adicionada.');
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){ pendingPoint = null; }
    });
  },

  setTool(name){
    ATT.state.tool = name;
    document.querySelectorAll('.tool').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === name);
    });
    const cur = {
      select: 'default', pan: 'grab', token: 'cell',
      wall: 'crosshair', door: 'crosshair', light: 'crosshair',
      reveal: 'cell', hide: 'cell',
    }[name] || 'default';
    document.body.style.cursor = cur;
  },
};
