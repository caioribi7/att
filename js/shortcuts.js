// Atalhos globais
ATT.shortcuts = {
  init(){
    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;

      // Ferramentas
      const map = { v:'select', t:'token', w:'wall', d:'door', g:'light', r:'reveal', h:'hide' };
      const k = e.key.toLowerCase();
      if (map[k]) { ATT.tools.setTool(map[k]); return; }

      // Lanterna no(s) selecionado(s)
      if (k === 'f'){
        let any = false;
        for (const id of ATT.state.selection){
          const t = ATT.state.tokens.find(x => x.id === id);
          if (t){ t.flashlight = !t.flashlight; any = true; }
        }
        if (any){ ATT.emit('tokens:changed'); ATT.emit('vision:changed'); ATT.ui.flash('Lanterna alternada.'); }
      }

      // Alternar Mestre/Jogador
      if (k === 'l'){
        ATT.state.view.mode = ATT.state.view.mode === 'gm' ? 'player' : 'gm';
        document.getElementById('view-mode').value = ATT.state.view.mode;
        ATT.emit('view:changed');
        ATT.ui.flash(`Modo: ${ATT.state.view.mode === 'gm' ? 'Mestre' : 'Jogador'}`);
      }

      // Apagar seleção
      if (e.key === 'Delete' || e.key === 'Backspace'){
        const ids = [...ATT.state.selection];
        for (const id of ids) ATT.tokens.remove(id);
      }
    });
  },
};
