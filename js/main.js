// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  ATT.app.init();
  ATT.grid.init();
  ATT.walls.init();
  ATT.lights.init();
  ATT.fog.init();
  ATT.tokens.init();
  ATT.selection.init();
  ATT.tools.init();
  ATT.cinematics.init();
  ATT.ui.init();
  ATT.shortcuts.init();

  // Token de exemplo no centro do mapa
  const m = ATT.state.map;
  const c = ATT.grid.snap(m.width / 2, m.height / 2);
  ATT.tokens.add(c.x, c.y, { name: 'Herói' });

  ATT.ui.flash('Importe um mapa para começar.');
});
