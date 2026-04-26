ATT.util = {
  hexToNumber(hex){ return parseInt(String(hex).replace('#',''), 16) || 0 },
  numberToHex(n){ return '#' + n.toString(16).padStart(6, '0') },
  clamp(v, a, b){ return Math.max(a, Math.min(b, v)) },
  lerp(a, b, t){ return a + (b - a) * t },
  dist(ax, ay, bx, by){ const dx=bx-ax, dy=by-ay; return Math.hypot(dx, dy) },
  loadImageFile(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = r.result;
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  },
  // Intersecção de raio (ox,oy)-(ox+dx, oy+dy) com segmento (x1,y1)-(x2,y2)
  // retorna { t, x, y } onde t é a distância normalizada do raio (>=0); null se não há.
  raySegment(ox, oy, dx, dy, x1, y1, x2, y2){
    const sx = x2 - x1, sy = y2 - y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((x1 - ox) * sy - (y1 - oy) * sx) / denom;
    const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
    if (t < 0 || u < 0 || u > 1) return null;
    return { t, x: ox + dx * t, y: oy + dy * t };
  },
  uuid(){ return 'id-' + Math.random().toString(36).slice(2, 10) },
};
