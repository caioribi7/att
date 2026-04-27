// Snapshot / restore da cena. Também usado para Exportar/Importar JSON.
ATT.sceneIO = {
  async snapshot(){
    const m = ATT.state.map;
    const mapDataUrl = m.dataUrl || null;
    return {
      version: 1,
      map: { width: m.width, height: m.height, dataUrl: mapDataUrl },
      grid: { ...ATT.state.grid },
      view: { ...ATT.state.view },
      tokens: ATT.state.tokens.map(t => ({ ...t, bars: t.bars.map(b => ({...b})) })),
      walls:  ATT.state.walls.map(w => ({...w})),
      doors:  ATT.state.doors.map(d => ({...d})),
      lights: ATT.state.lights.map(l => ({...l})),
    };
  },

  async applySnapshot(snap){
    if (!snap) return;
    // limpa
    for (const t of ATT.state.tokens.slice()) ATT.tokens.remove(t.id);
    ATT.state.walls.length = 0; ATT.state.doors.length = 0; ATT.state.lights.length = 0;
    ATT.state.selection.clear();

    // grid e view
    Object.assign(ATT.state.grid, snap.grid || {});
    Object.assign(ATT.state.view, snap.view || {});
    document.getElementById('grid-size').value  = ATT.state.grid.size;
    document.getElementById('grid-show').checked = ATT.state.grid.show;
    document.getElementById('grid-snap').checked = ATT.state.grid.snap;
    document.getElementById('grid-color').value  = ATT.util.numberToHex(ATT.state.grid.color);
    document.getElementById('grid-alpha').value  = Math.round(ATT.state.grid.alpha * 100);
    document.getElementById('view-mode').value   = ATT.state.view.mode;
    document.getElementById('global-darkness').value = Math.round((ATT.state.view.darkness ?? 1) * 100);

    // mapa
    if (snap.map && snap.map.dataUrl){
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = snap.map.dataUrl; });
      const tex = PIXI.Texture.from(img);
      const sprite = new PIXI.Sprite(tex);
      const old = ATT.state.map.sprite;
      if (old) ATT.app.layers.map.removeChild(old);
      ATT.app.layers.map.addChild(sprite);
      ATT.state.map = { sprite, width: img.naturalWidth, height: img.naturalHeight, dataUrl: snap.map.dataUrl };
    } else {
      ATT.state.map.width = snap.map?.width ?? ATT.state.map.width;
      ATT.state.map.height = snap.map?.height ?? ATT.state.map.height;
    }

    // walls/doors/lights
    for (const w of snap.walls || []) ATT.state.walls.push({ ...w, id: ATT.nextId() });
    for (const d of snap.doors || []) ATT.state.doors.push({ ...d, id: ATT.nextId() });
    for (const l of snap.lights || []) ATT.state.lights.push({ ...l, id: ATT.nextId() });

    // tokens
    for (const t of snap.tokens || []){
      const { id, ...rest } = t;
      ATT.tokens.add(t.x, t.y, rest);
    }

    ATT.app.centerOnMap();
    ATT.emit('map:changed');
    ATT.emit('grid:changed');
    ATT.emit('walls:changed');
    ATT.emit('lights:changed');
    ATT.emit('view:changed');
    ATT.emit('vision:changed');
  },

  async exportJson(){
    const snap = await this.snapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `att-cena-${Date.now()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  async importJson(file){
    const text = await file.text();
    const snap = JSON.parse(text);
    await this.applySnapshot(snap);
  },
};
