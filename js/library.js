// Acervo persistente (IndexedDB).
// Stores:
//   - assets: { id, kind: 'map'|'token', name, dataUrl, createdAt, w, h }
//   - scenes: { id, name, snapshot: <state JSON>, createdAt }
ATT.library = {
  db: null,

  async open(){
    if (this.db) return this.db;
    return new Promise((res, rej) => {
      const req = indexedDB.open('att', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' }).createIndex('kind', 'kind');
        if (!db.objectStoreNames.contains('scenes')) db.createObjectStore('scenes', { keyPath: 'id' });
      };
      req.onsuccess = () => { this.db = req.result; res(this.db); };
      req.onerror = () => rej(req.error);
    });
  },

  _tx(store, mode = 'readonly'){
    return this.db.transaction(store, mode).objectStore(store);
  },

  async putAsset(asset){
    await this.open();
    return new Promise((res, rej) => {
      const r = this._tx('assets', 'readwrite').put(asset);
      r.onsuccess = () => res(asset); r.onerror = () => rej(r.error);
    });
  },

  async listAssets(kind){
    await this.open();
    return new Promise((res, rej) => {
      const out = [];
      const idx = this._tx('assets').index('kind');
      const req = idx.openCursor(IDBKeyRange.only(kind));
      req.onsuccess = () => {
        const c = req.result;
        if (c){ out.push(c.value); c.continue(); }
        else res(out.sort((a,b) => b.createdAt - a.createdAt));
      };
      req.onerror = () => rej(req.error);
    });
  },

  async deleteAsset(id){
    await this.open();
    return new Promise((res, rej) => {
      const r = this._tx('assets', 'readwrite').delete(id);
      r.onsuccess = () => res(); r.onerror = () => rej(r.error);
    });
  },

  async putScene(scene){
    await this.open();
    return new Promise((res, rej) => {
      const r = this._tx('scenes', 'readwrite').put(scene);
      r.onsuccess = () => res(scene); r.onerror = () => rej(r.error);
    });
  },

  async listScenes(){
    await this.open();
    return new Promise((res, rej) => {
      const out = [];
      const req = this._tx('scenes').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c){ out.push(c.value); c.continue(); }
        else res(out.sort((a,b) => b.createdAt - a.createdAt));
      };
      req.onerror = () => rej(req.error);
    });
  },

  async getScene(id){
    await this.open();
    return new Promise((res, rej) => {
      const r = this._tx('scenes').get(id);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },

  async deleteScene(id){
    await this.open();
    return new Promise((res, rej) => {
      const r = this._tx('scenes', 'readwrite').delete(id);
      r.onsuccess = () => res(); r.onerror = () => rej(r.error);
    });
  },

  // Helpers de alto nível
  async addImageAsset(kind, file){
    const img = await ATT.util.loadImageFile(file);
    const asset = {
      id: ATT.util.uuid(), kind,
      name: file.name.replace(/\.[^.]+$/, ''),
      dataUrl: img.src,
      w: img.naturalWidth, h: img.naturalHeight,
      createdAt: Date.now(),
    };
    await this.putAsset(asset);
    return asset;
  },

  async useMapAsset(asset){
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = asset.dataUrl; });
    const tex = PIXI.Texture.from(img);
    const sprite = new PIXI.Sprite(tex);
    const old = ATT.state.map.sprite;
    if (old) ATT.app.layers.map.removeChild(old);
    ATT.app.layers.map.addChild(sprite);
    ATT.state.map = { sprite, width: img.naturalWidth, height: img.naturalHeight, dataUrl: asset.dataUrl };
    ATT.app.centerOnMap();
    ATT.emit('map:changed');
  },

  useTokenAsset(asset){
    const m = ATT.state.map;
    const c = ATT.grid.snap(m.width / 2, m.height / 2);
    const tok = ATT.tokens.add(c.x, c.y, { name: asset.name, image: asset.dataUrl });
    ATT.tokens.locate(tok.id);
  },
};
