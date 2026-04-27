// Painel direito · aba "Tokens": lista, busca, edição rápida de barras, ações.
ATT.tokensPanel = {
  list: null, search: '',

  init(){
    this.list = document.getElementById('tokens-list');
    document.getElementById('t-search').addEventListener('input', (e) => {
      this.search = e.target.value.toLowerCase().trim();
      this.render();
    });
    document.getElementById('t-new').addEventListener('click', () => this._addNew());
    document.getElementById('t-new-image').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const img = await ATT.util.loadImageFile(f);
      const cell = ATT.state.grid.size;
      const m = ATT.state.map;
      const tok = ATT.tokens.add(m.width/2, m.height/2, { name: f.name.replace(/\.[^.]+$/,''), image: img.src });
      ATT.tokens.locate(tok.id);
      e.target.value = '';
    });

    ATT.on('tokens:changed', () => this.render());
    ATT.on('selection:changed', () => this.render());
    ATT.on('tab:tokens', () => this.render());
    this.render();
  },

  _addNew(){
    document.getElementById('t-new-image').click();
  },

  render(){
    const tokens = ATT.state.tokens.filter(t => !this.search || t.name.toLowerCase().includes(this.search));
    document.getElementById('token-count').textContent = ATT.state.tokens.length;
    this.list.innerHTML = '';
    if (tokens.length === 0){
      this.list.innerHTML = `
        <div class="empty">
          <div class="ill"></div>
          <h4>${this.search ? 'Nada encontrado' : 'Sem tokens ainda'}</h4>
          <p>${this.search ? 'Tente outro termo de busca.' : 'Use o botão Novo ou a ferramenta Token (T) para começar.'}</p>
        </div>`;
      return;
    }
    for (const t of tokens) this.list.appendChild(this._renderCard(t));
  },

  _renderCard(t){
    const card = document.createElement('div');
    card.className = 'token-card' + (ATT.state.selection.has(t.id) ? ' selected' : '');
    card.innerHTML = `
      <div class="top">
        <div class="thumb${t.flashlight ? ' flash':''}" style="${t.image ? `background-image:url('${t.image}')` : ''}"></div>
        <div class="info">
          <div class="name">${this._esc(t.name)}</div>
          <div class="meta">${t.sizeCells} cell${t.sizeCells>1?'s':''} · ${t.bars.length} barra${t.bars.length===1?'':'s'}</div>
        </div>
        <div class="actions">
          <button class="action" data-act="locate"  title="Centralizar (clique no card)">${this._icon('locate')}</button>
          <button class="action" data-act="flash"   title="Lanterna (F)">${this._icon('flash')}</button>
          <button class="action" data-act="dup"     title="Duplicar">${this._icon('dup')}</button>
          <button class="action" data-act="edit"    title="Editar">${this._icon('edit')}</button>
          <button class="action danger" data-act="del" title="Apagar">${this._icon('trash')}</button>
        </div>
      </div>
      <div class="bars">
        ${t.bars.map((b, i) => this._barHtml(b, i)).join('')}
      </div>
    `;
    // Ações
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      ATT.tokens.locate(t.id);
    });
    card.querySelectorAll('.action').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'locate') ATT.tokens.locate(t.id);
      else if (act === 'flash') ATT.tokens.update(t.id, { flashlight: !t.flashlight });
      else if (act === 'dup')   ATT.tokens.duplicate(t.id);
      else if (act === 'edit')  ATT.ui.openTokenModal(t.id);
      else if (act === 'del'){
        if (confirm(`Apagar "${t.name}"?`)) ATT.tokens.remove(t.id);
      }
    }));
    // +/- nas barras
    card.querySelectorAll('.tbar').forEach(row => {
      const idx = +row.dataset.idx;
      row.querySelector('.minus').addEventListener('click', (e) => { e.stopPropagation();
        const cur = Math.max(0, t.bars[idx].cur - 1); ATT.tokens.setBar(t.id, idx, { cur });
      });
      row.querySelector('.plus').addEventListener('click', (e) => { e.stopPropagation();
        const cur = Math.min(t.bars[idx].max, t.bars[idx].cur + 1); ATT.tokens.setBar(t.id, idx, { cur });
      });
      row.querySelector('.num').addEventListener('click', (e) => { e.stopPropagation();
        const n = prompt(`Novo valor para ${t.bars[idx].name} (0-${t.bars[idx].max})`, t.bars[idx].cur);
        if (n != null){
          const v = ATT.util.clamp(+n, 0, t.bars[idx].max);
          ATT.tokens.setBar(t.id, idx, { cur: v });
        }
      });
    });
    return card;
  },

  _barHtml(b, i){
    const ratio = ATT.util.clamp(b.cur / Math.max(1, b.max), 0, 1) * 100;
    const color = '#' + b.color.toString(16).padStart(6, '0');
    return `
      <div class="tbar" data-idx="${i}">
        <div class="lbl">${this._esc(b.name)}</div>
        <div class="track"><div class="fill" style="width:${ratio}%;background:${color}"></div></div>
        <button class="pm minus" title="-1">−</button>
        <div class="num" title="Definir valor">${b.cur}/${b.max}</div>
        <button class="pm plus" title="+1">+</button>
      </div>`;
  },

  _esc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); },

  _icon(name){
    const I = {
      locate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
      flash:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      dup:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      edit:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
      trash:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    };
    return I[name] || '';
  },
};
