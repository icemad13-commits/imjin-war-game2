/* ============================================================
   한반도 전황 지도: 지도 이미지(assets/images/map_korea.webp) 위에
   경로와 거점 번호를 SVG로 겹쳐 그립니다.
   ============================================================ */
const MapView = (() => {
  const MW = 512, MH = 600;
  const FX_ = [-0.689, 156.014, -18978.0], FY_ = [-206.071, -0.539, 9020.8];
  const CROP = { x: 260, y: 620 }, SCALE = 512 / 1280;
  const P = (lat, lon) => [((FX_[0] * lat + FX_[1] * lon + FX_[2]) - CROP.x) * SCALE, ((FY_[0] * lat + FY_[1] * lon + FY_[2]) - CROP.y) * SCALE];
  const pts = (arr) => arr.map(([la, lo]) => P(la, lo));
  function smooth(arr) {
    const p = pts(arr);
    if (p.length < 3) return 'M' + p.map(q => q.map(n => n.toFixed(1)).join(' ')).join('L');
    let d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + [c1, c2, p2].map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    }
    return d;
  }
  const ROUTES = {
    invA: [[35.2,129.0],[35.5,128.75],[35.87,128.6],[36.4,128.15],[36.98,127.93]],
    invB: [[36.98,127.93],[37.3,127.6],[37.57,126.98],[37.97,126.55],[39.02,125.75]],
    flee: [[37.57,126.98],[37.97,126.55],[39.02,125.75],[40.2,124.58]],
    ming: [[40.62,123.6],[40.2,124.58],[39.6,125.4],[39.02,125.75],[37.97,126.55],[37.57,126.98]],
    retreat: [[37.57,126.98],[37.05,127.6],[36.4,128.15],[35.87,128.6],[35.3,129.0]],
    navyA: [[34.74,127.62],[34.70,128.1],[34.86,128.55]],
    navyC: [[34.45,126.75],[34.55,126.45],[34.58,126.32]],
    retreatD: [[34.95,127.45],[34.93,127.83],[34.86,128.15]],
    navyD: [[34.45,127.75],[34.7,127.82],[34.92,127.84]]
  };
  const YIBYEONG = [[35.32,128.26],[36.10,127.49],[35.57,128.17],[35.97,128.94],[36.6,127.5]];
  const PIN = [
    [34, -8, 'r'], [36, 6, 'r'], [8, 24, null], [-30, -24, null],
    [-30, -6, null], [-28, -24, null], [-40, -14, 'l'], [-8, 30, 'l']
  ];
  let svg, pinEls = [], layerEls = {};
  function build() {
    let s = `<svg class="map-svg map-over" viewBox="0 0 ${MW} ${MH}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="한반도 전황 지도">`;
    s += `<defs>${[['red', '#C0392B'], ['teal', '#0E7C86'], ['blue', '#2F5FBF'], ['gold', '#B7791F']].map(([n, c]) => `<marker id="ar-${n}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs>`;
    const L = (name, inner) => `<g class="layer" data-layer="${name}">${inner}</g>`;
    const path = (d, cls, mk) => `<path d="${d}" class="route ${cls}" fill="none" marker-end="url(#ar-${mk})"/>`;
    s += L('inv-a', path(smooth(ROUTES.invA), 'r-red', 'red'));
    s += L('inv-b', path(smooth(ROUTES.invB), 'r-red', 'red'));
    s += L('flee', path(smooth(ROUTES.flee), 'r-gold', 'gold'));
    s += L('navy-a', path(smooth(ROUTES.navyA), 'r-teal', 'teal'));
    s += L('ming', path(smooth(ROUTES.ming), 'r-blue', 'blue'));
    s += L('retreat', path(smooth(ROUTES.retreat), 'r-red r-soft', 'red'));
    s += L('navy-c', path(smooth(ROUTES.navyC), 'r-teal', 'teal'));
    s += L('noryang', path(smooth(ROUTES.retreatD), 'r-red', 'red') + path(smooth(ROUTES.navyD), 'r-teal', 'teal'));
    s += L('uib', YIBYEONG.map(ll => { const [x, y] = P(...ll); return `<path class="uib-mark" d="M${x} ${y - 8}L${x + 7} ${y}L${x} ${y + 8}L${x - 7} ${y}Z"/>`; }).join(''));
    s += `<g class="m-pins">` + STAGES.map((st, i) => {
      const [tx, ty] = P(...st.latlon), [dx, dy, lab] = PIN[i];
      const px = tx + dx, py = ty + dy;
      const lx = lab === 'r' ? px + 18 : px - 18, anchor = lab === 'r' ? 'start' : 'end';
      return `<g class="pin future" data-i="${i}">
        <line class="leader" x1="${tx}" y1="${ty}" x2="${px}" y2="${py}"/><circle class="true-dot" cx="${tx}" cy="${ty}" r="2.8"/>
        <g transform="translate(${px} ${py})"><circle class="ring" r="15"/><circle class="dot" r="11.5"/><text class="num" text-anchor="middle" y="4.5">${i + 1}</text></g>
        ${lab ? `<text class="pin-label" x="${lx}" y="${py + 4.5}" text-anchor="${anchor}">${st.short}</text>` : ''}
      </g>`;
    }).join('') + `</g>`;
    s += `</svg>`;
    return `<div class="map-stack"><div class="map-base" style="background-image:url(${IMG_SRC.map})"></div>${s}</div>`;
  }
  function mount(el) {
    el.innerHTML = build();
    svg = el.querySelector('.map-over');
    pinEls = [...svg.querySelectorAll('.pin')];
    layerEls = {};
    svg.querySelectorAll('.layer').forEach(g => { layerEls[g.dataset.layer] = g; });
  }
  const LAYER_RULE = {
    'inv-a': s => s >= 4 ? 'dim' : 'on', 'inv-b': s => s < 1 ? 'off' : (s >= 4 ? 'dim' : 'on'),
    'flee': s => s < 1 ? 'off' : (s >= 5 ? 'dim' : 'on'), 'navy-a': s => s < 1 ? 'off' : (s >= 2 ? 'dim' : 'on'),
    'uib': s => s < 3 ? 'off' : (s >= 5 ? 'dim' : 'on'), 'ming': s => s < 4 ? 'off' : (s >= 6 ? 'dim' : 'on'),
    'retreat': s => s < 5 ? 'off' : (s >= 6 ? 'dim' : 'on'), 'navy-c': s => s < 6 ? 'off' : (s >= 7 ? 'dim' : 'on'),
    'noryang': s => s < 7 ? 'off' : 'on'
  };
  function update(stage, animate) {
    if (!svg) return;
    pinEls.forEach((p, i) => { p.classList.remove('done', 'active', 'future'); p.classList.add(i < stage ? 'done' : (i === stage ? 'active' : 'future')); });
    Object.entries(LAYER_RULE).forEach(([k, fn]) => {
      const st = fn(stage), el = layerEls[k]; if (!el) return;
      el.classList.toggle('on', st === 'on'); el.classList.toggle('dim', st === 'dim');
      // 이번 전투에서 새로 나타난 이동 경로는 선이 그려지듯 나타나게 합니다.
      el.classList.toggle('fresh', !!animate && st === 'on' && (stage === 0 || fn(stage - 1) !== 'on'));
    });
  }
  return { build, mount, update };
})();
