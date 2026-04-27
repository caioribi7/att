// Liga o painel HTML aos sistemas: tabs, ferramentas, mapa, grid, view, modais
ATT.ui = {
  modal: null, editingId: null,
  lightModal: null, editingLightId: null,

  init(){
    // Tabs do painel direito
    document.querySelectorAll('.tabs .tab').forEach(b => {
      b.addEventListener('click', () => this.switchTab(b.dataset.tab));
    });
    // Subtabs do acervo são tratadas em library-panel.js

    // Botões de ferramenta (rail esquerda)
    document.querySelectorAll('.tool[data-tool]').forEach(b => {
      b.addEventListener('click', () => ATT.tools.setTool(b.dataset.tool));
    });

    // Mapa (input rápido na aba Cena)
    document.getElementById('map-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (f){
        await ATT.grid.loadMapFromFile(f);
        ATT.ui.flash('Mapa carregado.');
        // também salva no acervo
        try { await ATT.library.addImageAsset('map', f); } catch {}
      }
    });

    // Grid
    const gs = document.getElementById('grid-size');
    const gShow = document.getElementById('grid-show');
    const gSnap = document.getElementById('grid-snap');
    const gColor = document.getElementById('grid-color');
    const gAlpha = document.getElementById('grid-alpha');
    gs.addEventListener('input', () => { ATT.state.grid.size = +gs.value || 70; ATT.emit('grid:changed'); ATT.tokens.redrawAll(); });
    gShow.addEventListener('change', () => { ATT.state.grid.show = gShow.checked; ATT.emit('grid:changed'); });
    gSnap.addEventListener('change', () => { ATT.state.grid.snap = gSnap.checked; });
    gColor.addEventListener('input', () => { ATT.state.grid.color = ATT.util.hexToNumber(gColor.value); ATT.emit('grid:changed'); });
    gAlpha.addEventListener('input', () => { ATT.state.grid.alpha = (+gAlpha.value) / 100; ATT.emit('grid:changed'); });

    // Visão
    const vm = document.getElementById('view-mode');
    vm.addEventListener('change', () => { this._setMode(vm.value); });
    document.getElementById('global-darkness').addEventListener('input', (e) => {
      ATT.state.view.darkness = (+e.target.value) / 100;
      ATT.emit('view:changed');
    });
    document.getElementById('fog-clear-reveal').addEventListener('click', () => { ATT.fog.clearReveal(); ATT.ui.flash('Revelações limpas.'); });
    document.getElementById('fog-reveal-all').addEventListener('click', () => { ATT.fog.revealAll(); ATT.ui.flash('Tudo revelado.'); });

    // Top bar
    document.getElementById('view-toggle').addEventListener('click', () => {
      this._setMode(ATT.state.view.mode === 'gm' ? 'player' : 'gm');
    });
    document.getElementById('scene-export').addEventListener('click', () => ATT.sceneIO.exportJson());
    document.getElementById('scene-import').addEventListener('click', () => document.getElementById('scene-import-file').click());
    document.getElementById('scene-import-file').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!confirm('Importar a cena? A cena atual será substituída.')) { e.target.value=''; return; }
      await ATT.sceneIO.importJson(f);
      ATT.ui.flash('Cena importada.');
      e.target.value = '';
    });

    // FABs
    document.getElementById('zoom-in').addEventListener('click',  () => ATT.app.zoomBy(1.2));
    document.getElementById('zoom-out').addEventListener('click', () => ATT.app.zoomBy(1/1.2));
    document.getElementById('zoom-fit').addEventListener('click', () => ATT.app.centerOnMap());

    // Modal de token
    this.modal = document.getElementById('token-modal');
    this.modal.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', () => this.closeTokenModal()));
    document.getElementById('t-add-bar').addEventListener('click', () => this._addBarRow({ name: '', cur: 0, max: 10, color: '#22c55e' }));
    document.getElementById('t-save').addEventListener('click', () => this._saveTokenModal());
    document.getElementById('t-delete').addEventListener('click', () => {
      if (this.editingId != null && confirm('Apagar este token?')){ ATT.tokens.remove(this.editingId); this.closeTokenModal(); }
    });

    // Modal de luz
    this.lightModal = document.getElementById('light-modal');
    this.lightModal.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', () => this.closeLightModal()));
    document.getElementById('l-save').addEventListener('click', () => this._saveLightModal());
    document.getElementById('l-delete').addEventListener('click', () => {
      if (this.editingLightId != null && confirm('Apagar esta luz?')){ ATT.lights.remove(this.editingLightId); this.closeLightModal(); }
    });

    // Esc fecha modais
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){
        if (!this.modal.classList.contains('hidden')) this.closeTokenModal();
        else if (!this.lightModal.classList.contains('hidden')) this.closeLightModal();
      }
    });

    // Sincroniza badges
    ATT.on('tokens:changed', () => { document.getElementById('token-count').textContent = ATT.state.tokens.length; });
  },

  switchTab(name){
    document.querySelectorAll('.tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    ATT.emit('tab:' + name);
  },

  flash(msg){
    const el = document.getElementById('status');
    el.textContent = msg;
    clearTimeout(this._t);
    this._t = setTimeout(() => { el.textContent = 'Pronto.'; }, 1800);
  },

  _setMode(m){
    ATT.state.view.mode = m;
    document.getElementById('view-mode').value = m;
    document.getElementById('view-toggle-label').textContent = m === 'gm' ? 'Modo Mestre' : 'Modo Jogador';
    ATT.emit('view:changed');
    ATT.ui.flash(`Visão: ${m === 'gm' ? 'Mestre' : 'Jogador'}`);
  },

  // ── Token modal
  openTokenModal(id){
    const t = ATT.tokens.get(id); if (!t) return;
    this.editingId = id;
    document.getElementById('t-name').value = t.name;
    document.getElementById('t-size').value = t.sizeCells;
    document.getElementById('t-border').value = ATT.util.numberToHex(t.border);
    document.getElementById('t-flashlight').checked = !!t.flashlight;
    document.getElementById('t-flashradius').value = t.flashRadius;
    const barsEl = document.getElementById('t-bars'); barsEl.innerHTML = '';
    t.bars.forEach(b => this._addBarRow({ name: b.name, cur: b.cur, max: b.max, color: ATT.util.numberToHex(b.color) }));
    document.getElementById('t-image').value = '';
    this.modal.classList.remove('hidden');
  },
  closeTokenModal(){ this.modal.classList.add('hidden'); this.editingId = null; },

  _addBarRow(b){
    const wrap = document.getElementById('t-bars');
    const row = document.createElement('div');
    row.className = 'bar-edit';
    row.innerHTML = `
      <input type="text" placeholder="Nome (HP, PE...)" value="${b.name}">
      <input type="number" placeholder="Atual" value="${b.cur}">
      <input type="number" placeholder="Máx" value="${b.max}">
      <input type="color" value="${b.color}">
      <button class="rm" title="Remover">×</button>`;
    row.querySelector('.rm').addEventListener('click', () => row.remove());
    wrap.appendChild(row);
  },
  async _saveTokenModal(){
    const t = ATT.tokens.get(this.editingId); if (!t) return;
    t.name = document.getElementById('t-name').value || 'Token';
    t.sizeCells = +document.getElementById('t-size').value || 1;
    t.border = ATT.util.hexToNumber(document.getElementById('t-border').value);
    t.flashlight = document.getElementById('t-flashlight').checked;
    t.flashRadius = +document.getElementById('t-flashradius').value || 6;
    const fileInput = document.getElementById('t-image');
    if (fileInput.files[0]){
      const img = await ATT.util.loadImageFile(fileInput.files[0]);
      t.image = img.src;
    }
    t.bars = [];
    document.querySelectorAll('#t-bars .bar-edit').forEach(row => {
      const inp = row.querySelectorAll('input');
      t.bars.push({
        name: inp[0].value || 'Barra',
        cur: +inp[1].value || 0,
        max: Math.max(1, +inp[2].value || 1),
        color: ATT.util.hexToNumber(inp[3].value),
      });
    });
    ATT.emit('tokens:changed');
    ATT.emit('vision:changed');
    this.closeTokenModal();
    ATT.ui.flash('Token salvo.');
  },

  // ── Light modal
  openLightModal(id){
    const l = ATT.lights.get(id); if (!l) return;
    this.editingLightId = id;
    document.getElementById('l-color').value = ATT.util.numberToHex(l.color);
    document.getElementById('l-radius').value = l.radius;
    document.getElementById('l-intensity').value = Math.round((l.intensity ?? 1) * 100);
    document.getElementById('l-animate').checked = !!l.animate;
    this.lightModal.classList.remove('hidden');
  },
  closeLightModal(){ this.lightModal.classList.add('hidden'); this.editingLightId = null; },
  _saveLightModal(){
    const id = this.editingLightId; if (id == null) return;
    ATT.lights.update(id, {
      color: ATT.util.hexToNumber(document.getElementById('l-color').value),
      radius: Math.max(20, +document.getElementById('l-radius').value || 360),
      intensity: ATT.util.clamp((+document.getElementById('l-intensity').value)/100, 0, 1),
      animate: document.getElementById('l-animate').checked,
    });
    this.closeLightModal();
    ATT.ui.flash('Luz salva.');
  },
};
