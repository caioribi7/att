// Bootstrap
window.addEventListener('DOMContentLoaded', async () => {
  ATT.app.init();
  ATT.grid.init();
  ATT.walls.init();
  ATT.lights.init();
  ATT.fog.init();
  ATT.tokens.init();
  ATT.selection.init();
  ATT.tools.init();
  ATT.cinematics.init();
  ATT.tokensPanel.init();
  await ATT.library.open().catch(() => {});
  ATT.libraryPanel.init();
  ATT.ui.init();
  ATT.shortcuts.init();

  // Token de exemplo no centro do mapa
  const m = ATT.state.map;
  const c = ATT.grid.snap(m.width / 2, m.height / 2);
  ATT.tokens.add(c.x, c.y, { name: 'Herói' });

  // Loop de animação (flicker em luzes animadas, throttle ~12fps p/ não pesar)
  let last = performance.now(), acc = 0;
  function tick(now){
    const dt = now - last; last = now; acc += dt;
    let any = false;
    for (const l of ATT.state.lights){
      if (!l.animate) continue;
      l._phase = (l._phase || 0) + dt * 0.005;
      l._flickerR = l.radius * (0.93 + 0.07 * Math.sin(l._phase * 3.1) + 0.03 * Math.sin(l._phase * 7.3));
      any = true;
    }
    if (any && acc > 80){ acc = 0; ATT.emit('vision:changed'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  ATT.ui.flash('Importe um mapa para começar — ou abra o Acervo.');
});
