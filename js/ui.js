// Liga o painel HTML aos sistemas: ferramentas, mapa, grid, view, modal de token
ATT.ui = {
  modal: null, editingId: null,

  init(){
    // Botões de ferramenta
    document.querySelectorAll('.tool').forEach(b => {
      b.addEventListener('click', () => ATT.tools.setTool(b.dataset.tool));
    });

    // Mapa
    document.getElementById('map-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (f){ await ATT.grid.loadMapFromFile(f); ATT.ui.flash('Mapa carregado.'); }
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
    vm.addEventListener('change', () => { ATT.state.view.mode = vm.value; ATT.emit('view:changed'); });
    document.getElementById('global-darkness').addEventListener('input', (e) => {
      ATT.state.view.darkness = (+e.target.value) / 100;
      ATT.emit('view:changed');
    });
    document.getElementById('fog-clear-reveal').addEventListener('click', () => { ATT.fog.clearReveal(); ATT.ui.flash('Revelações limpas.'); });
    document.getElementById('fog-reveal-all').addEventListener('click', () => { ATT.fog.revealAll(); ATT.ui.flash('Tudo revelado.'); });

    // Modal de token
    this.modal = document.getElementById('token-modal');
    this.modal.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    document.getElementById('t-add-bar').addEventListener('click', () => this._addBarRow({ name: '', cur: 0, max: 10, color: '#22c55e' }));
    document.getElementById('t-save').addEventListener('click', () => this._saveModal());
    document.getElementById('t-delete').addEventListener('click', () => {
      if (this.editingId != null){ ATT.tokens.remove(this.editingId); this.closeModal(); }
    });
  },

  flash(msg){
    const el = document.getElementById('status');
    el.textContent = msg;
    clearTimeout(this._t);
    this._t = setTimeout(() => { el.textContent = 'Pronto.'; }, 1800);
  },

  openTokenModal(id){
    const t = ATT.state.tokens.find(x => x.id === id);
    if (!t) return;
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

  closeModal(){ this.modal.classList.add('hidden'); this.editingId = null; },

  _addBarRow(b){
    const wrap = document.getElementById('t-bars');
    const row = document.createElement('div');
    row.className = 'bar-edit';
    row.innerHTML = `
      <input type="text" placeholder="Nome (HP, PE...)" value="${b.name}">
      <input type="number" placeholder="Atual" value="${b.cur}">
      <input type="number" placeholder="Máx" value="${b.max}">
      <input type="color" value="${b.color}">
      <button class="rm" title="Remover">×</button>
    `;
    row.querySelector('.rm').addEventListener('click', () => row.remove());
    wrap.appendChild(row);
  },

  async _saveModal(){
    const t = ATT.state.tokens.find(x => x.id === this.editingId);
    if (!t) return;
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
    this.closeModal();
    ATT.ui.flash('Token salvo.');
  },
};
