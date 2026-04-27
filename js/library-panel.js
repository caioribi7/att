// UI da aba Acervo: mapas, tokens, cenas
ATT.libraryPanel = {
  current: 'maps',

  init(){
    document.querySelectorAll('#lib-tabs .subtab').forEach(b => {
      b.addEventListener('click', () => this.switchTo(b.dataset.lib));
    });
    document.getElementById('lib-map-file').addEventListener('change', async (e) => {
      for (const f of e.target.files) await ATT.library.addImageAsset('map', f);
      e.target.value = ''; this.renderMaps();
      ATT.ui.flash('Mapas adicionados ao acervo.');
    });
    document.getElementById('lib-token-file').addEventListener('change', async (e) => {
      for (const f of e.target.files) await ATT.library.addImageAsset('token', f);
      e.target.value = ''; this.renderTokens();
      ATT.ui.flash('Tokens adicionados ao acervo.');
    });
    document.getElementById('lib-save-scene').addEventListener('click', () => this._saveCurrentScene());

    ATT.on('tab:library', () => this.refresh());
    this.switchTo('maps');
  },

  switchTo(name){
    this.current = name;
    document.querySelectorAll('#lib-tabs .subtab').forEach(b => b.classList.toggle('active', b.dataset.lib === name));
    document.querySelectorAll('.lib-pane').forEach(p => p.hidden = (p.dataset.libPane !== name));
    this.refresh();
  },

  refresh(){
    if (this.current === 'maps') this.renderMaps();
    else if (this.current === 'tokens') this.renderTokens();
    else if (this.current === 'scenes') this.renderScenes();
  },

  async renderMaps(){
    const list = await ATT.library.listAssets('map');
    const el = document.getElementById('lib-maps');
    if (list.length === 0){
      el.innerHTML = `<div class="empty"><div class="ill"></div><h4>Sem mapas no acervo</h4><p>Importe imagens para reaproveitar entre cenas.</p></div>`;
      return;
    }
    el.innerHTML = '';
    for (const a of list) el.appendChild(this._mapCard(a));
  },

  async renderTokens(){
    const list = await ATT.library.listAssets('token');
    const el = document.getElementById('lib-tokens');
    if (list.length === 0){
      el.innerHTML = `<div class="empty"><div class="ill"></div><h4>Sem tokens no acervo</h4><p>Importe arts (PNG transparente fica ótimo) para inserir rapidamente.</p></div>`;
      return;
    }
    el.innerHTML = '';
    for (const a of list) el.appendChild(this._tokenCard(a));
  },

  async renderScenes(){
    const list = await ATT.library.listScenes();
    const el = document.getElementById('lib-scenes');
    if (list.length === 0){
      el.innerHTML = `<div class="empty"><div class="ill"></div><h4>Sem cenas salvas</h4><p>Use “Salvar cena atual” para criar um snapshot.</p></div>`;
      return;
    }
    el.innerHTML = '';
    for (const s of list) el.appendChild(this._sceneCard(s));
  },

  _mapCard(a){
    const card = document.createElement('div');
    card.className = 'lib-card';
    card.title = `${a.name} · ${a.w}×${a.h}`;
    card.innerHTML = `
      <div class="lib-thumb" style="background-image:url('${a.dataUrl}')"></div>
      <div class="lib-foot">
        <span class="lib-name">${this._esc(a.name)}</span>
        <button class="action danger" data-act="del" title="Apagar">×</button>
      </div>`;
    card.addEventListener('click', async (e) => {
      if (e.target.closest('button')) return;
      await ATT.library.useMapAsset(a);
      ATT.ui.flash('Mapa carregado.');
    });
    card.querySelector('[data-act="del"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Apagar "${a.name}" do acervo?`)){ await ATT.library.deleteAsset(a.id); this.renderMaps(); }
    });
    return card;
  },

  _tokenCard(a){
    const card = document.createElement('div');
    card.className = 'lib-card token';
    card.title = a.name;
    card.innerHTML = `
      <div class="lib-thumb circle" style="background-image:url('${a.dataUrl}')"></div>
      <div class="lib-foot">
        <span class="lib-name">${this._esc(a.name)}</span>
        <button class="action danger" data-act="del" title="Apagar">×</button>
      </div>`;
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      ATT.library.useTokenAsset(a);
    });
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (confirm(`Apagar "${a.name}" do acervo?`)) ATT.library.deleteAsset(a.id).then(() => this.renderTokens());
    });
    card.querySelector('[data-act="del"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Apagar "${a.name}" do acervo?`)){ await ATT.library.deleteAsset(a.id); this.renderTokens(); }
    });
    return card;
  },

  _sceneCard(s){
    const row = document.createElement('div');
    row.className = 'lib-row';
    const date = new Date(s.createdAt).toLocaleString('pt-BR');
    row.innerHTML = `
      <div class="lib-row-info">
        <div class="name">${this._esc(s.name)}</div>
        <div class="meta">${date}</div>
      </div>
      <div class="lib-row-actions">
        <button class="btn sm" data-act="load">Carregar</button>
        <button class="btn sm" data-act="rename">Renomear</button>
        <button class="action danger" data-act="del">×</button>
      </div>`;
    row.querySelector('[data-act="load"]').addEventListener('click', async () => {
      if (!confirm('Carregar a cena? A cena atual será substituída.')) return;
      await ATT.sceneIO.applySnapshot(s.snapshot);
      ATT.ui.flash(`Cena "${s.name}" carregada.`);
    });
    row.querySelector('[data-act="rename"]').addEventListener('click', async () => {
      const n = prompt('Novo nome:', s.name); if (!n) return;
      s.name = n; await ATT.library.putScene(s); this.renderScenes();
    });
    row.querySelector('[data-act="del"]').addEventListener('click', async () => {
      if (confirm(`Apagar "${s.name}"?`)){ await ATT.library.deleteScene(s.id); this.renderScenes(); }
    });
    return row;
  },

  async _saveCurrentScene(){
    const name = prompt('Nome da cena:', `Cena ${new Date().toLocaleString('pt-BR')}`);
    if (!name) return;
    const snapshot = await ATT.sceneIO.snapshot();
    await ATT.library.putScene({ id: ATT.util.uuid(), name, snapshot, createdAt: Date.now() });
    this.renderScenes();
    ATT.ui.flash('Cena salva no acervo.');
  },

  _esc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); },
};
