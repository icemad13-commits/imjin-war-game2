/* ============================================================
   이미지 로드 및 그리기 도우미. 파일이 없거나 로드 실패해도
   게임이 멈추지 않도록 항상 벡터 대체 그림으로 넘어갑니다.
   ============================================================ */
const Spr = {
  img: {}, ready: false,
  load() {
    const keys = Object.keys(IMG_SRC);
    return Promise.all(keys.map(k => new Promise(res => {
      const im = new Image();
      im.onload = () => { this.img[k] = im; res(); };
      im.onerror = () => { console.warn('[이미지 로드 실패]', k, IMG_SRC[k]); res(); };
      im.src = IMG_SRC[k];
    }))).then(() => { this.ready = true; });
  },
  has(k) { return !!this.img[k]; },
  draw(g, key, r, c, x, y, s = 1, o = {}) {
    const im = this.img[key], f = FRAME_DEF[key] && FRAME_DEF[key][r] && FRAME_DEF[key][r][c];
    if (!im || !f) return false;
    const w = f[2] * s, h = f[3] * s;
    g.save();
    if (o.alpha != null) g.globalAlpha = o.alpha;
    if (o.shadow) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y - 1, o.shadow * w * 0.5, o.shadow * w * 0.12, 0, 0, 7); g.fill(); }
    g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
    const oy = o.anchor === 'c' ? -h / 2 : -h;
    g.drawImage(im, f[0], f[1], f[2], f[3], -w / 2, oy, w, h);
    g.restore();
    return true;
  },
  bg(g, key, o = {}) {
    const im = this.img[key]; if (!im) return false;
    const iw = im.naturalWidth, ih = im.naturalHeight, ar = GW / GH;
    let sw = ih * ar, sh = ih; if (sw > iw) { sw = iw; sh = iw / ar; }
    const sx = (iw - sw) * (o.px == null ? 0 : o.px), sy = (ih - sh) * (o.py == null ? 0.5 : o.py);
    g.drawImage(im, sx, sy, sw, sh, 0, 0, GW, GH);
    return true;
  }
};

function soldierFrame(pose, t) {
  const k = Math.floor(t * 8) % 4;
  switch (pose) {
    case 'front': return [0, k];
    case 'back': return [0, 4 + k];
    case 'right': return [1, k];
    case 'left': return [1, 4 + k];
    case 'shoot': return [2, k];
    case 'aim': return [2, 2 + (Math.floor(t * 6) % 2)];
    case 'fall': return [3, 6 + (Math.floor(t * 4) % 2)];
    default: return [0, 0];
  }
}
function drawSoldier(g, kind, pose, x, y, s, t, o = {}) {
  const key = kind === 'jp' ? 'sjp' : 'sjs', [r, c] = soldierFrame(pose, t);
  o = Object.assign({ shadow: 0.9 }, o);
  if (Spr.draw(g, key, r, c, x, y, s, o)) return;
  soldierVec(g, x, y, s * 1.1, t * 8, { alpha: o.alpha, rot: o.rot, jp: kind === 'jp' });
}
