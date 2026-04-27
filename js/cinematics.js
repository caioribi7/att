// Cinematics: importa vídeos do PC, dispara em overlay com Ctrl+1..9
ATT.cinematics = {
  overlay: null, video: null, list: null,

  init(){
    this.overlay = document.getElementById('cine-overlay');
    this.video   = document.getElementById('cine-video');
    this.list    = document.getElementById('cine-list');
    document.getElementById('cine-close').addEventListener('click', () => this.close());

    document.getElementById('cine-file').addEventListener('change', (e) => {
      for (const f of e.target.files){
        const url = URL.createObjectURL(f);
        ATT.state.cinematics.push({ name: f.name, url });
      }
      this.renderList();
    });

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && /^[1-9]$/.test(e.key)){
        const i = parseInt(e.key, 10) - 1;
        if (ATT.state.cinematics[i]){ e.preventDefault(); this.play(i); }
      } else if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')){
        this.close();
      }
    });
  },

  renderList(){
    this.list.innerHTML = '';
    const badge = document.getElementById('media-count');
    if (badge) badge.textContent = ATT.state.cinematics.length;
    ATT.state.cinematics.forEach((c, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="idx">${i+1}</span><span class="name" title="${c.name}">${c.name}</span>`;
      const play = document.createElement('button'); play.textContent = '▶'; play.title = `Ctrl+${i+1}`;
      play.addEventListener('click', () => this.play(i));
      const rm   = document.createElement('button'); rm.textContent = '×'; rm.title = 'Remover';
      rm.addEventListener('click', () => { URL.revokeObjectURL(c.url); ATT.state.cinematics.splice(i, 1); this.renderList(); });
      li.appendChild(play); li.appendChild(rm);
      this.list.appendChild(li);
    });
  },

  play(i){
    const c = ATT.state.cinematics[i];
    if (!c) return;
    this.video.src = c.url;
    this.overlay.classList.remove('hidden');
    this.video.currentTime = 0;
    this.video.play().catch(() => {/* navegador pode pedir interação */});
  },

  close(){
    this.video.pause();
    this.overlay.classList.add('hidden');
  },
};
