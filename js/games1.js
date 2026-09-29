/* ============================================================
   미니게임 공통 도구 + Stage 1~4
   각 게임 객체: { dur, t, done, update(dt), draw(g), onDown/onMove/onUp(x,y),
                  action(name,down), ui(), result(), controls }
   ============================================================ */
const GW = 728, GH = 440;
const C = { ink: '#0F1A28', por: '#E9EDE6', gold: '#C9A24B', gold2: '#E2C273', cin: '#C4432F', cel: '#7FB7A4' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function txt(g, s, x, y, o = {}) {
  g.save();
  g.font = `${o.w || 700} ${o.size || 18}px ${o.serif ? "'Noto Serif KR',serif" : "'Noto Sans KR',sans-serif"}`;
  g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  if (o.alpha != null) g.globalAlpha = o.alpha;
  if (o.stroke) { g.lineWidth = o.sw || 4; g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = o.color || C.por; g.fillText(s, x, y);
  g.restore();
}
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function vgrad(g, x, y, w, h, c1, c2) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(x, y, w, h); }
function bar(g, x, y, w, h, frac, fill, back = 'rgba(15,26,40,.65)') {
  g.fillStyle = back; rrect(g, x, y, w, h, 4); g.fill();
  g.fillStyle = fill; rrect(g, x + 2, y + 2, Math.max(0, (w - 4) * clamp(frac, 0, 1)), h - 4, 3); g.fill();
  g.strokeStyle = 'rgba(233,237,230,.35)'; g.lineWidth = 1; rrect(g, x, y, w, h, 4); g.stroke();
}
function topShade(g, h = 70, a = 0.5) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgba(11,20,31,${a})`); gr.addColorStop(1, 'rgba(11,20,31,0)'); g.fillStyle = gr; g.fillRect(0, 0, GW, h); }
const FX = {
  add(list, o) { o.t = 0; o.life = o.life || 0.6; list.push(o); },
  step(list, dt) {
    for (const f of list) {
      f.t += dt;
      if (f.k === 'debris' || f.k === 'drop') { f.vy += (f.g || 520) * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot = (f.rot || 0) + (f.vr || 0) * dt; }
      else if (f.k === 'smoke') { f.x += (f.vx || 0) * dt; f.y += (f.vy == null ? -22 : f.vy) * dt; }
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].t >= list[i].life) list.splice(i, 1);
  },
  /* 폭발 한 번에: 불꽃 + 파편 + 연기 (+선택: 화면 번쩍임) */
  explode(list, x, y, o = {}) {
    const r = o.r || 36;
    FX.add(list, { k: 'burst', x, y, r, life: 0.5, c: o.c });
    for (let i = 0; i < (o.n || 8); i++) { const a = rand(Math.PI * 1.05, Math.PI * 1.95), sp = rand(120, 260); FX.add(list, { k: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vr: rand(-10, 10), s: rand(3, 6), c: o.dc || pick(['#3A2A1C', '#5A4030', '#2A2A2A']), life: rand(0.6, 1.0) }); }
    for (let i = 0; i < (o.smoke == null ? 3 : o.smoke); i++) FX.add(list, { k: 'smoke', x: x + rand(-14, 14), y: y + rand(-10, 6), r: rand(14, 24) * (r / 36), vx: rand(-8, 8), life: rand(1.0, 1.6), c: o.sc });
    if (o.flash) FX.add(list, { k: 'flash', life: 0.18, a: o.flash });
  },
  /* 물보라 (포탄이 바다에 떨어짐, 배가 가라앉음) */
  splash(list, x, y, o = {}) {
    FX.add(list, { k: 'ring', x, y, r: o.r || 26, life: 0.6 });
    for (let i = 0; i < (o.n || 7); i++) FX.add(list, { k: 'drop', x: x + rand(-8, 8), y, vx: rand(-70, 70), vy: rand(-240, -120), s: rand(2, 4), life: rand(0.5, 0.8) });
  },
  /* 총구·포구의 화염과 연기 */
  muzzle(list, x, y, dir = 1) {
    FX.add(list, { k: 'burst', x: x + dir * 8, y, r: 14, c: '#FFD27A', life: 0.18 });
    for (let i = 0; i < 2; i++) FX.add(list, { k: 'smoke', x: x + dir * rand(8, 20), y: y + rand(-4, 4), r: rand(8, 13), vx: dir * rand(6, 16), life: rand(0.8, 1.3), c: 'rgba(225,225,215,1)' });
  },
  draw(g, list) {
    for (const f of list) {
      const k = f.t / f.life; g.save();
      if (f.k === 'smoke') { g.globalAlpha = (1 - k) * 0.45; g.fillStyle = f.c || 'rgba(70,70,72,1)'; g.beginPath(); g.arc(f.x, f.y, f.r * (0.7 + k * 1.1), 0, 7); g.fill(); }
      else if (f.k === 'debris') { g.globalAlpha = 1 - k * 0.7; g.translate(f.x, f.y); g.rotate(f.rot || 0); g.fillStyle = f.c; g.fillRect(-f.s / 2, -f.s / 2, f.s, f.s * 0.7); }
      else if (f.k === 'drop') { g.globalAlpha = 1 - k; g.fillStyle = 'rgba(225,242,250,1)'; g.beginPath(); g.arc(f.x, f.y, f.s, 0, 7); g.fill(); }
      else if (f.k === 'ring') { g.globalAlpha = (1 - k) * 0.8; g.strokeStyle = 'rgba(230,246,255,1)'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, f.y, f.r * (0.4 + k * 1.2), f.r * (0.14 + k * 0.4), 0, 0, 7); g.stroke(); }
      else if (f.k === 'flash') { g.globalAlpha = (1 - k) * (f.a || 0.5); g.fillStyle = f.c || '#FFF3D6'; g.fillRect(0, 0, GW, GH); }
      else if (f.k === 'txt') { g.globalAlpha = 1 - k * k; txt(g, f.s, f.x, f.y - 34 * k, { size: f.size || 20, align: 'center', color: f.c || C.gold2, stroke: C.ink, sw: 5 }); }
      else if (f.k === 'burst') {
        g.globalAlpha = (1 - k) * 0.9; g.fillStyle = f.c || '#F6A54A'; g.beginPath(); g.arc(f.x, f.y, (f.r || 30) * (0.35 + k * 0.8), 0, 7); g.fill();
        g.globalAlpha = (1 - k) * 0.7; g.strokeStyle = '#FFF3D0'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, (f.r || 30) * (0.5 + 1.1 * k), 0, 7); g.stroke();
      } else if (f.k === 'line') {
        const p = Math.min(1, k * 1.6), q = Math.max(0, p - 0.35);
        g.strokeStyle = f.c || '#F3E7C0'; g.lineWidth = f.w || 3; g.lineCap = 'round'; g.globalAlpha = 1 - k * 0.6;
        g.beginPath(); g.moveTo(f.x0 + (f.x1 - f.x0) * q, f.y0 + (f.y1 - f.y0) * q); g.lineTo(f.x0 + (f.x1 - f.x0) * p, f.y0 + (f.y1 - f.y0) * p); g.stroke();
      } else if (f.k === 'x') {
        g.globalAlpha = 1 - k; g.strokeStyle = '#E9EDE6'; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x - 8, f.y - 8); g.lineTo(f.x + 8, f.y + 8); g.moveTo(f.x + 8, f.y - 8); g.lineTo(f.x - 8, f.y + 8); g.stroke();
      }
      g.restore();
    }
  }
};

/* ---- 이미지가 없을 때의 대체(벡터) 그림 ---- */
function soldierVec(g, x, y, s, ph, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (o.alpha != null) g.globalAlpha = o.alpha; if (o.rot) g.rotate(o.rot);
  g.fillStyle = o.jp ? '#2B3140' : '#243B57'; g.fillRect(-9, -32, 18, 21);
  g.fillStyle = '#E0B48F'; g.beginPath(); g.arc(0, -38, 6.5, 0, 7); g.fill();
  g.fillStyle = o.jp ? '#5F4630' : '#1F3550'; g.beginPath(); g.moveTo(-13, -38); g.lineTo(13, -38); g.lineTo(0, -54); g.closePath(); g.fill();
  g.restore();
}
function shipVec(g, x, y, s, dir = 1, o = {}) {
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(s * dir, s);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.lineWidth = 2; g.strokeStyle = C.ink; g.lineJoin = 'round';
  g.fillStyle = o.hull || '#4A3324'; g.beginPath(); g.moveTo(-66, -4); g.lineTo(68, -4); g.lineTo(54, 20); g.lineTo(-52, 20); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = o.deck || '#8B6242'; g.fillRect(-42, -28, 84, 24); g.strokeRect(-42, -28, 84, 24);
  g.restore();
}
/* 일렁이는 불길 (성벽 화재, 불타는 배) */
function flame(g, x, y, s, t, o = {}) {
  g.save();
  if (o.glow !== false) { const gr = g.createRadialGradient(x, y - 10 * s, 2, x, y - 10 * s, 60 * s); gr.addColorStop(0, 'rgba(255,170,60,.45)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(x - 60 * s, y - 70 * s, 120 * s, 120 * s); }
  for (let i = 0; i < 3; i++) {
    const fl = 0.75 + 0.25 * Math.sin(t * 17 + i * 2.1 + x), h = (26 - i * 6) * s * fl, w = (11 - i * 2.5) * s, dx = (i - 1) * 7 * s;
    g.fillStyle = ['#E0442A', '#F6932E', '#FFE08A'][i];
    g.beginPath(); g.moveTo(x + dx - w, y); g.quadraticCurveTo(x + dx - w * 0.6, y - h * 0.6, x + dx + Math.sin(t * 9 + i) * 3 * s, y - h); g.quadraticCurveTo(x + dx + w * 0.6, y - h * 0.6, x + dx + w, y); g.closePath(); g.fill();
  }
  g.restore();
}
function drawShip(g, kind, x, y, s, o = {}) {
  const map = { po: ['shpo', 0, 1], jp: ['shjp', 1, 0], gb: ['shgb', 0, 1] };
  const [key, r, c] = o.frame ? o.frame : map[kind];
  if (Spr.draw(g, key, r, c, x, y, s, o)) return;
  shipVec(g, x, y, s * 0.9, o.flip ? -1 : 1, o);
}

/* ============================================================
   Stage 1. 동래성: 성벽 활쏘기 — 왜군 2배, 필연적 패배, 생존 시간 채점
   ============================================================ */
function gDefense() {
  /* [역사 체험] 전쟁 초기 조선군이 무너진 큰 까닭 중 하나는 일본군의 조총(鳥銃)이었습니다.
     조총병은 성벽에 붙지 않고 멀리 멈춰 서서 일제 사격을 합니다. 활보다 먼저 막아야 합니다. */
  const WALL_Y = 330, FIRES = [70, 210, 360, 520, 650];
  const g = { dur: 30, t: 0, hp: 100, kills: 0, gunKills: 0, volleys: 0, enemies: [], fx: [], spawnT: 0.2, over: false, overT: 0, done: false, shake: 0, anim: 0, shoot: [0, 0, 0, 0, 0, 0], controls: { kind: 'hint', hint: '느낌표(!)를 띄운 조총병을 먼저 쏘세요. 멀리서 성벽을 크게 무너뜨립니다' } };
  g.update = function (dt) {
    FX.step(g.fx, dt); g.shake = Math.max(0, g.shake - dt); g.anim += dt;
    for (let i = 0; i < g.shoot.length; i++) g.shoot[i] = Math.max(0, g.shoot[i] - dt);
    for (const e of g.enemies) if (e.dead) e.dieT += dt;
    g.enemies = g.enemies.filter(e => !e.dead || e.dieT < 0.5);
    if (g.over) { g.overT += dt; if (g.overT > 2.6) g.done = true; return; }
    g.t += dt; const p = Math.min(1, g.t / g.dur);
    g.spawnT -= dt;
    if (g.spawnT <= 0) {
      // [난이도] 적 등장 수 1.5배 → 등장 간격을 1.5로 나눔
      g.spawnT = Math.max(0.2, 0.55 - 0.34 * p) / 1.5 * rand(0.75, 1.25);
      const gun = g.t > 2.5 && Math.random() < 0.22 && g.enemies.filter(e => e.gun && !e.dead).length < 5;
      const tough = !gun && g.t > 6 && Math.random() < 0.2;
      g.enemies.push({ x: rand(40, GW - 40), y: -50, vy: (38 + 30 * p) * rand(0.85, 1.2), hp: tough ? 2 : 1, tough, gun, stopY: rand(170, 225), fireT: rand(0.6, 1.4), aim: 0, recoil: 0, ph: rand(0, 6), atk: 0, reached: false, dead: false, dieT: 0 });
    }
    for (const e of g.enemies) {
      if (e.dead) continue; e.ph += dt; e.recoil = Math.max(0, e.recoil - dt);
      if (e.gun) {
        if (e.y < e.stopY) { e.y += e.vy * dt; continue; }
        if (e.aim > 0) {
          e.aim -= dt;
          if (e.aim <= 0) { // 일제 사격!
            const sc = 0.85 + 0.35 * clamp(e.y / WALL_Y, 0, 1);
            FX.muzzle(g.fx, e.x, e.y - 44 * sc, 1);
            FX.add(g.fx, { k: 'line', x0: e.x, y0: e.y - 44 * sc, x1: e.x + rand(-30, 30), y1: WALL_Y - 6, life: 0.16, c: '#FFE9A8', w: 2 });
            FX.explode(g.fx, e.x + rand(-30, 30), WALL_Y - 4, { r: 18, n: 4, smoke: 2, dc: '#6E6A60' });
            g.hp -= 5; g.volleys++; g.shake = 0.25; e.recoil = 0.3; e.fireT = rand(2.0, 2.8);
          }
        } else { e.fireT -= dt; if (e.fireT <= 0) e.aim = 0.9; }
        continue;
      }
      if (e.reached) { e.atk += dt; if (e.atk >= 0.9) { e.atk = 0; g.hp -= e.tough ? 5 : 3; g.shake = 0.22; FX.add(g.fx, { k: 'burst', x: e.x, y: WALL_Y - 4, r: 22, c: '#C4432F', life: 0.4 }); } }
      else { e.y += e.vy * dt; if (e.y >= WALL_Y - 6) { e.y = WALL_Y - 6; e.reached = true; } }
    }
    if (g.hp < 45 && Math.random() < dt * 3) FX.add(g.fx, { k: 'smoke', x: pick(FIRES) + rand(-10, 10), y: WALL_Y - 20, r: rand(12, 20), vy: -34, life: 1.6 });
    if (g.hp <= 0) { g.hp = 0; g.over = true; } else if (g.t >= g.dur) { g.over = true; g.t = g.dur; }
  };
  g.onDown = function (x, y) {
    if (g.over) return;
    let best = null, bd = 1e9;
    for (const e of g.enemies) { if (e.dead) continue; const sc = e.gun ? 0.9 : (e.tough ? 1.25 : 1); const d = dist(x, y, e.x, e.y - 34 * sc); if (d < 50 && d < bd) { best = e; bd = d; } }
    const ai = Math.floor(clamp(x, 0, GW - 1) / (GW / 6)); g.shoot[ai] = 0.25;
    FX.add(g.fx, { k: 'line', x0: 60 + ai * 118, y0: WALL_Y + 8, x1: x, y1: y, life: 0.2, c: '#F3E7C0' });
    if (best) {
      best.hp--; FX.add(g.fx, { k: 'burst', x: best.x, y: best.y - 36, r: 18, life: 0.3 });
      if (best.hp <= 0) {
        best.dead = true; best.dieT = 0; g.kills++;
        if (best.gun) { g.gunKills++; FX.add(g.fx, { k: 'txt', s: '조총병 격퇴!', x: best.x, y: best.y - 80, size: 18, life: 0.7 }); }
        else FX.add(g.fx, { k: 'txt', s: '+1', x: best.x, y: best.y - 80, life: 0.5 });
      }
    } else FX.add(g.fx, { k: 'x', x, y, life: 0.3 });
  };
  g.ui = () => ({});
  g.result = () => ({ score: Math.min(1000, Math.floor(g.t) * 15 + g.kills * 8 + g.gunKills * 10), note: `버틴 시간 ${Math.floor(g.t)}초 · 격퇴 ${g.kills}명(조총병 ${g.gunKills})` });
  g.draw = function (c) {
    c.save(); if (g.shake > 0) c.translate(rand(-3, 3), rand(-3, 3));
    vgrad(c, 0, 0, GW, 150, '#2A3A57', '#B0785C');
    c.fillStyle = '#3A4646'; c.beginPath(); c.moveTo(0, 150); for (let x = 0; x <= GW; x += 40) c.lineTo(x, 118 + Math.sin(x * 0.02) * 22); c.lineTo(GW, 150); c.closePath(); c.fill();
    vgrad(c, 0, 148, GW, WALL_Y - 148, '#59663F', '#3D472D');
    const list = g.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of list) {
      const sc = (e.tough ? 1.3 : 1) * (0.85 + 0.35 * clamp(e.y / WALL_Y, 0, 1));
      if (e.dead) { drawSoldier(c, 'jp', 'fall', e.x, e.y, sc, g.anim, { alpha: 1 - e.dieT / 0.5 }); continue; }
      if (e.gun) {
        const standing = e.y >= e.stopY;
        if (standing && e.aim > 0) { c.fillStyle = `rgba(232,70,50,${0.25 + 0.2 * Math.sin(g.anim * 20)})`; c.beginPath(); c.arc(e.x, e.y - 34 * sc, 30, 0, 7); c.fill(); }
        drawSoldier(c, 'jp', !standing ? 'front' : (e.recoil > 0 ? 'shoot' : 'aim'), e.x, e.y, sc, e.ph * 1.2, {});
        txt(c, e.aim > 0 ? '!' : '조총', e.x, e.y - 100 * sc, { size: e.aim > 0 ? 24 : 12, align: 'center', color: e.aim > 0 ? '#FF6A55' : '#FFD7CE', stroke: C.ink, sw: 3 });
        continue;
      }
      drawSoldier(c, 'jp', e.reached ? 'shoot' : 'front', e.x, e.y, sc, e.ph * 1.2, {});
      if (e.tough) { c.fillStyle = e.hp > 1 ? C.gold2 : C.cin; c.fillRect(e.x - 14, e.y - 108 * sc / 1.3 - 4, 28, 4); }
    }
    vgrad(c, 0, WALL_Y, GW, GH - WALL_Y, '#7D7A70', '#55534C');
    c.fillStyle = '#8D8A7F'; for (let x = 0; x < GW; x += 46) c.fillRect(x + 4, WALL_Y - 14, 30, 16);
    const burning = g.hp < 70 ? (g.hp < 25 ? 5 : (g.hp < 45 ? 3 : 1)) : 0;
    for (let i = 0; i < burning; i++) flame(c, FIRES[(i * 2) % 5], WALL_Y - 6, 1.5 + 0.3 * (i % 2), g.anim + i);
    for (let i = 0; i < 6; i++) { const shot = g.shoot[i] > 0; drawSoldier(c, 'js', shot ? 'aim' : 'back', 60 + i * 118, WALL_Y + 44, 0.95, shot ? g.anim : 0, { shadow: 0 }); }
    c.fillStyle = '#8C2F2A'; c.fillRect(GW / 2 - 60, WALL_Y + 66, 120, 30); txt(c, '동래성', GW / 2, WALL_Y + 88, { size: 20, align: 'center', serif: true, w: 900, color: '#F1E9D6' });
    FX.draw(c, g.fx); c.restore();
    topShade(c, 60, 0.55);
    bar(c, 14, 12, 210, 20, g.hp / 100, g.hp > 40 ? '#7FB7A4' : '#C4432F'); txt(c, `성벽 ${Math.round(g.hp)}`, 22, 27, { size: 13, w: 700, color: C.ink });
    txt(c, `버틴 시간 ${Math.floor(g.t)}초`, GW / 2, 30, { size: 22, align: 'center', stroke: C.ink, color: C.gold2 });
    txt(c, `격퇴 ${g.kills}`, GW - 14, 28, { size: 20, align: 'right', stroke: C.ink });
    if (g.over) {
      const a = clamp(g.overT / 0.7, 0, 1), b = clamp((g.overT - 0.9) / 0.7, 0, 1); c.fillStyle = `rgba(15,26,40,${0.78 * a})`; c.fillRect(0, 0, GW, GH);
      txt(c, '동래성 함락', GW / 2, 160, { size: 46, align: 'center', serif: true, w: 900, color: '#E9EDE6', alpha: a });
      txt(c, `${Math.floor(g.t)}초를 버텼습니다`, GW / 2, 200, { size: 22, align: 'center', color: C.gold2, alpha: a });
      txt(c, '"싸워서 죽기는 쉬우나, 길을 빌려 주기는 어렵다."', GW / 2, 262, { size: 21, align: 'center', serif: true, w: 700, color: '#F1E9D6', alpha: b });
      txt(c, '— 동래부사 송상현 (戰死易 假道難)', GW / 2, 292, { size: 15, align: 'center', color: '#C9D2CB', alpha: b });
    }
  };
  return g;
}

/* ============================================================
   Stage 2. 옥포: 판옥선 함포 사격 — 조준선 속도 1.3배
   ============================================================ */
function gOkpo() {
  /* [역사 체험] 일본 수군은 배를 바짝 붙여 뛰어올라 싸우는 '등선육박'을 잘했습니다.
     조선 수군은 거리를 두고 판옥선의 화포(천자총통 등)로 먼저 부수는 전술을 썼습니다.
     이순신의 명령 "물령망동 정중여산" — 사거리 밖이나 빈 바다에 마구 쏘면 감점입니다. */
  const HOR = 74, RANGE_Y = 158, BOARD_Y = 318, CD = 1.1, PEN_BOARD = 60, PEN_WASTE = 15;
  const GUNS = [{ x: 150, cool: 0 }, { x: 364, cool: 0 }, { x: 578, cool: 0 }];
  const g = { dur: 30, t: 0, sunk: 0, boarded: 0, wasted: 0, shots: 0, ships: [], flying: [], fx: [], spawnT: 0.3, done: false, over: false, overT: 0, shake: 0, controls: { kind: 'hint', hint: '사거리선 안으로 들어온 왜선을 눌러 포를 쏘세요. 빈 바다에 쏘면 망동(-15)' } };
  const sc = (y) => 0.42 + 0.78 * clamp((y - HOR) / (BOARD_Y - HOR), 0, 1);
  function spawn() { g.ships.push({ x: rand(90, GW - 90), y: HOR + rand(0, 14), vx: rand(-8, 8), vy: rand(13, 19), sink: 0, board: 0, f: pick([0, 1, 2]), flip: Math.random() < 0.5 }); }
  spawn(); spawn(); spawn();
  g.update = function (dt) {
    FX.step(g.fx, dt); g.shake = Math.max(0, g.shake - dt);
    if (g.over) { g.overT += dt; if (g.overT > 2.2) g.done = true; return; }
    g.t += dt; const p = g.t / g.dur;
    GUNS.forEach(q => q.cool = Math.max(0, q.cool - dt));
    g.spawnT -= dt;
    // [난이도] 왜선 1.5배 등장: 등장 간격 ÷1.5, 동시에 떠 있는 배 6 → 9척
    if (g.spawnT <= 0 && g.ships.filter(s => !s.sink).length < 9) { g.spawnT = rand(1.25, 1.8) * (1 - 0.3 * p) / 1.5; spawn(); }
    for (const s of g.ships) {
      if (s.sink) { s.sink += dt; continue; }
      if (s.board) { s.board += dt; if (s.board > 1.1) { s.sink = 0.001; FX.splash(g.fx, s.x, s.y); } continue; }
      const push = s.y > RANGE_Y ? 1.5 : 1;               // 가까워질수록 노를 더 세게 저어 붙으려 함
      s.y += s.vy * push * dt; s.x = clamp(s.x + s.vx * dt, 60, GW - 60);
      if (s.y >= BOARD_Y) { s.board = 0.001; g.boarded++; g.shake = 0.4; FX.add(g.fx, { k: 'txt', s: `등선 백병전! -${PEN_BOARD}`, x: s.x, y: s.y - 70, size: 22, c: '#FF8E7A', life: 1.1 }); FX.add(g.fx, { k: 'flash', life: 0.2, a: 0.35, c: '#C4432F' }); }
    }
    g.ships = g.ships.filter(s => s.sink < 1.4);
    for (const f of g.flying) f.t += dt;
    const land = g.flying.filter(f => f.t >= f.life); g.flying = g.flying.filter(f => f.t < f.life);
    for (const f of land) {
      if (f.short) { FX.splash(g.fx, f.tx, f.ty, { r: 18 }); continue; }
      const s = f.ship;
      if (s && !s.sink && !s.board) { s.sink = 0.001; g.sunk++; g.shake = 0.18; FX.explode(g.fx, s.x, s.y - 20 * sc(s.y), { r: 40 * sc(s.y) + 10 }); FX.add(g.fx, { k: 'txt', s: '격침!', x: s.x, y: s.y - 70 * sc(s.y), size: 22, life: 0.8 }); }
      else FX.splash(g.fx, f.tx, f.ty);
    }
    if (g.t >= g.dur) { g.over = true; g.t = g.dur; }
  };
  g.onDown = function (x, y) {
    if (g.over) return;
    let ship = null, bd = 1e9;
    for (const s of g.ships) { if (s.sink || s.board) continue; const k = sc(s.y), d = dist(x, y, s.x, s.y - 22 * k); if (d < 58 * k + 14 && d < bd) { ship = s; bd = d; } }
    const ready = GUNS.filter(q => q.cool <= 0).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
    if (!ready.length) { FX.add(g.fx, { k: 'txt', s: '장전 중…', x, y, size: 15, c: '#FFFFFF', life: 0.5 }); return; }
    const gun = ready[0]; gun.cool = CD; g.shots++;
    FX.muzzle(g.fx, gun.x, 372, x < gun.x ? -1 : 1);
    if (!ship) { g.wasted++; FX.add(g.fx, { k: 'txt', s: `망동! -${PEN_WASTE}`, x, y: y - 20, size: 20, c: '#FF8E7A', life: 0.9 }); g.flying.push({ t: 0, life: 0.4, sx: gun.x, sy: 372, tx: x, ty: y, short: true }); return; }
    if (ship.y < RANGE_Y) {
      g.wasted++; const ty = RANGE_Y + 30;
      FX.add(g.fx, { k: 'txt', s: `사거리 밖! -${PEN_WASTE}`, x: ship.x, y: ship.y - 40, size: 18, c: '#FF8E7A', life: 0.9 });
      g.flying.push({ t: 0, life: 0.5, sx: gun.x, sy: 372, tx: ship.x, ty, short: true }); return;
    }
    g.flying.push({ t: 0, life: 0.32 + 0.3 * (1 - (ship.y - RANGE_Y) / (BOARD_Y - RANGE_Y)), sx: gun.x, sy: 372, tx: ship.x, ty: ship.y - 18 * sc(ship.y), ship });
  };
  g.ui = () => ({});
  g.result = () => ({ score: clamp(g.sunk * 36 - g.boarded * PEN_BOARD - g.wasted * PEN_WASTE, 0, 1000), note: `격침 ${g.sunk}척` + (g.boarded ? ` · 등선 허용 ${g.boarded}회(-${g.boarded * PEN_BOARD})` : '') + (g.wasted ? ` · 망동 ${g.wasted}회(-${g.wasted * PEN_WASTE})` : '') });
  g.draw = function (c) {
    c.save(); if (g.shake > 0) c.translate(rand(-4, 4), rand(-3, 3));
    if (!Spr.bg(c, 'bgSea', { px: 0.3, py: 0.5 })) vgrad(c, 0, 0, GW, GH, '#2E6E86', '#0F3145');
    vgrad(c, 0, 0, GW, HOR, '#8FA7B8', '#C9D6DC'); c.fillStyle = '#4E6470'; c.beginPath(); c.moveTo(0, HOR); for (let x = 0; x <= GW; x += 30) c.lineTo(x, HOR - 10 - Math.abs(Math.sin(x * 0.013)) * 22); c.lineTo(GW, HOR); c.closePath(); c.fill();
    txt(c, '거제도 옥포', GW / 2, HOR - 12, { size: 13, align: 'center', color: '#1C2B35' });
    c.save(); c.setLineDash([10, 8]); c.lineWidth = 2;
    c.strokeStyle = 'rgba(226,194,115,.85)'; c.beginPath(); c.moveTo(0, RANGE_Y); c.lineTo(GW, RANGE_Y); c.stroke();
    c.strokeStyle = 'rgba(232,90,70,.85)'; c.beginPath(); c.moveTo(0, BOARD_Y); c.lineTo(GW, BOARD_Y); c.stroke(); c.restore();
    txt(c, '▼ 여기부터 화포 사거리', GW - 12, RANGE_Y - 6, { size: 13, align: 'right', color: '#F3E3B0', stroke: C.ink, sw: 3 });
    txt(c, '등선 위험선 — 넘어오면 백병전', GW - 12, BOARD_Y - 6, { size: 13, align: 'right', color: '#FFB3A3', stroke: C.ink, sw: 3 });
    for (const s of g.ships.slice().sort((a, b) => a.y - b.y)) {
      const k = sc(s.y);
      if (s.sink) { const q = s.sink, sf = q < 0.28 ? 3 : (q < 0.62 ? 4 : (q < 0.95 ? 5 : 6)); drawShip(c, 'jp', s.x, s.y + Math.max(0, q - 0.95) * 30, k, { frame: ['shjp', 3, sf], flip: s.flip, alpha: q > 1.0 ? Math.max(0, 1 - (q - 1.0) / 0.4) : 1 }); }
      else {
        drawShip(c, 'jp', s.x, s.y + Math.sin(g.t * 2 + s.x * 0.03) * 2, k, { frame: ['shjp', 3, s.f], flip: s.flip });
        if (s.board) { drawSoldier(c, 'jp', 'shoot', s.x - 20, s.y - 36, 0.6, g.t); drawSoldier(c, 'js', 'shoot', s.x + 22, s.y - 34, 0.6, g.t + 1, { flip: true }); }
      }
    }
    for (const f of g.flying) { const k = f.t / f.life, x = f.sx + (f.tx - f.sx) * k, y = f.sy + (f.ty - f.sy) * k - Math.sin(k * Math.PI) * 60; c.fillStyle = '#20242B'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
    GUNS.forEach((q, i) => {
      drawShip(c, 'po', q.x, 436 + Math.sin(g.t * 2 + i) * 2, 0.95, { frame: ['shpo', 0, 1] });
      bar(c, q.x - 34, 400, 68, 8, 1 - q.cool / CD, q.cool > 0 ? '#9FB0B8' : C.gold2);
    });
    FX.draw(c, g.fx); c.restore();
    topShade(c, 44, 0.5);
    txt(c, `격침 ${g.sunk}`, 14, 28, { size: 20, stroke: C.ink });
    if (g.boarded || g.wasted) txt(c, `등선 ${g.boarded} · 망동 ${g.wasted}`, 14, 50, { size: 14, color: '#FF9A88', stroke: C.ink, sw: 3 });
    if (g.over) {
      const a = clamp(g.overT / 0.6, 0, 1); c.fillStyle = `rgba(15,26,40,${0.7 * a})`; c.fillRect(0, 0, GW, GH);
      txt(c, `옥포 앞바다에서 왜선 ${g.sunk}척 격침`, GW / 2, 196, { size: 30, serif: true, w: 900, align: 'center', alpha: a });
      txt(c, '"가볍게 움직이지 말고, 태산같이 무겁게 행동하라." (勿令妄動 靜重如山)', GW / 2, 240, { size: 17, align: 'center', color: C.gold2, alpha: a });
    }
  };
  return g;
}

/* ============================================================
   Stage 3. 한산도: 학익진 완성 타이밍
   ============================================================ */
function gHansan() {
  /* [역사 체험] 견내량은 좁고 암초가 많아 판옥선이 싸우기 어려웠습니다(이순신 장계).
     1단계: 판옥선 몇 척으로 싸우는 척하다 물러나, 왜 수군을 넓은 한산도 앞바다로 끌어냅니다.
            너무 빨리 달아나면 적이 쫓아오지 않고, 너무 느리면 따라잡힙니다.
     2단계: 끌려 나온 적을 학의 날개 모양(학익진)으로 둘러싸고 일제히 포를 쏩니다. */
  const CX = GW / 2, CY = 160, RX = 250, RY = 124, BX = 104, BW = 520, BY = 394;
  const ANG = [90, 48, 132, 14, 166];
  const E0 = 18, ET = CY, E_SPEED = 17, SIGHT = 118, NEAR = 30, LURE_MAX = 15, PEN_CAUGHT = 70;
  const g = { dur: 0, t: 0, step: 0, u: 0, dir: 1, zc: 0.5, zh: 0.12, sp: 0.9, placed: [], pts: [], state: 'lure', st: 0, done: false, fx: [], over: false,
    E: E0, L: 96, hold: false, caught: 0, caughtCd: 0, lost: 0, lureScore: 0, shake: 0, spd: [], formT: 0,
    controls: { kind: 'fire', fire: '뒤로 물러나기', hint: '누르고 있으면 물러납니다' } };
  const enemy = []; for (let i = 0; i < 7; i++) enemy.push({ dx: rand(-64, 64), dy: rand(-30, 30), x: 0, y: 0, sink: 0, f: pick([0, 1, 2]), flip: Math.random() < 0.5 });
  const progress = () => clamp((g.E - E0) / (ET - E0), 0, 1);
  function placeEnemies() { const s = progress(); enemy.forEach(e => { e.x = CX + e.dx * (0.3 + 0.7 * s); e.y = g.E + e.dy * (0.5 + 0.5 * s); }); }
  placeEnemies();
  function newZone() { g.zc = rand(0.25, 0.75); g.zh = 0.125 - g.step * 0.014; g.sp = 0.85 + g.step * 0.22; }
  newZone();
  function slot(i, off = 0) { const a = (ANG[i] + off) * Math.PI / 180; return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a), right: Math.cos(a) > 0.15 }; }
  function endLure() {
    g.lureScore = clamp(Math.round(300 * progress()) - g.caught * PEN_CAUGHT, 0, 300);
    g.state = 'lureEnd'; g.st = 0; g.hold = false;
    FX.add(g.fx, { k: 'txt', s: progress() >= 1 ? '유인 성공! 적이 넓은 바다로 나왔다' : '적이 반쯤 끌려 나왔다', x: GW / 2, y: 250, size: 24, life: 1.6 });
  }
  g.update = function (dt) {
    FX.step(g.fx, dt); g.st += dt; g.t += dt; g.shake = Math.max(0, g.shake - dt);
    for (const p of g.placed) p.k = Math.min(1, p.k + dt / 0.7);
    if (g.state === 'lure') {
      g.caughtCd = Math.max(0, g.caughtCd - dt);
      g.L += (g.hold ? 34 : 5) * dt;
      const gap = g.L - (g.E + 34);
      if (gap < SIGHT) g.E = Math.min(ET, g.E + E_SPEED * dt); else g.lost += dt;
      if (gap < NEAR && g.caughtCd <= 0) {
        g.caught++; g.caughtCd = 1.2; g.L += 38; g.shake = 0.35;
        FX.add(g.fx, { k: 'txt', s: `따라잡혔다! -${PEN_CAUGHT}`, x: CX, y: g.L - 30, size: 20, c: '#FF8E7A', life: 1.0 });
        FX.explode(g.fx, CX + rand(-30, 30), g.L + 10, { r: 22, n: 5, smoke: 2 });
      }
      if (gap < 70 && Math.random() < dt * 2.5) FX.muzzle(g.fx, CX + rand(-40, 40), g.E + 40, 1);
      placeEnemies();
      if (progress() >= 1 || g.st > LURE_MAX) endLure();
    } else if (g.state === 'lureEnd') {
      g.L += 90 * dt;
      if (g.E < ET) { g.E = Math.min(ET, g.E + 40 * dt); placeEnemies(); }
      if (g.st > 1.8) { g.state = 'aim'; g.st = 0; g.E = ET; placeEnemies(); }
    } else if (g.state === 'aim') { g.u += g.dir * g.sp * dt; if (g.u >= 1) { g.u = 1; g.dir = -1; } if (g.u <= 0) { g.u = 0; g.dir = 1; } }
    else if (g.state === 'place') { if (g.st > 0.75) { if (g.step >= 5) { g.state = 'volley'; g.st = 0; } else { g.state = 'aim'; g.st = 0; newZone(); } } }
    else if (g.state === 'volley') {
      if (g.st > 0.2 && g.st < 0.9 && Math.random() < dt * 14) { const p = pick(g.placed); if (p) FX.muzzle(g.fx, p.x, p.y - 30, p.x < CX ? 1 : -1); }
      if (g.st > 0.3) enemy.forEach((e, i) => { if (g.st > 0.5 + i * 0.22 && !e.sink) { e.sink = 0.001; g.shake = 0.2; FX.explode(g.fx, e.x, e.y + 10, { r: 34 }); FX.splash(g.fx, e.x, e.y + 30, { n: 4 }); } });
      enemy.forEach(e => { if (e.sink) e.sink += dt; });
      if (g.st > 3.2) { g.over = true; g.done = true; }
    }
  };
  /* [점수] 학익진 한 척 배치 = 정확도(최대 100) + 빠르기(성공했을 때만, 최대 40)
     → 5척 × 140 = 700점. 빨리, 그리고 정확하게 펼칠수록 점수가 높습니다.
     (막 누르면 정확도가 낮고 빠르기 점수도 없으므로 손해입니다) */
  const SPD_FULL = 0.9, SPD_ZERO = 3.4, SPD_MAX = 40;
  function tap() {
    if (g.state !== 'aim') return;
    const err = Math.abs(g.u - g.zc) / g.zh, took = g.st;
    const acc = err <= 1 ? Math.round(100 - 30 * err) : Math.max(15, Math.round(60 - 20 * err));
    const spd = err <= 1 ? Math.round(SPD_MAX * clamp((SPD_ZERO - took) / (SPD_ZERO - SPD_FULL), 0, 1)) : 0;
    const off = (err <= 1 ? err * 3 : Math.min(28, 3 + (err - 1) * 9)) * (g.u > g.zc ? 1 : -1);
    g.pts.push(acc + spd); g.spd.push(spd); g.formT += took;
    g.placed.push({ i: g.step, off, k: 0, ok: err <= 1, x: 0, y: 0 });
    FX.add(g.fx, { k: 'txt', s: err <= 0.35 ? '완벽!' : err <= 1 ? '성공' : '어긋남', x: BX + BW * g.u, y: BY - 26, size: 22, c: err <= 1 ? C.gold2 : '#E8A29A', life: 0.8 });
    if (spd > 0) FX.add(g.fx, { k: 'txt', s: spd >= SPD_MAX * 0.8 ? `신속! +${spd}` : `빠르기 +${spd}`, x: BX + BW * g.u, y: BY - 54, size: 16, c: '#9CE0B8', life: 0.8 });
    g.step++; g.state = 'place'; g.st = 0;
  }
  g.action = (n, d) => {
    if (n !== 'fire') return;
    if (g.state === 'lure') { g.hold = d !== false; return; }
    if (d !== false) tap();
  };
  g.onDown = () => g.action('fire', true);
  g.onUp = () => g.action('fire', false);
  g.ui = () => (g.state === 'lure' || g.state === 'lureEnd' ? { label: '뒤로 물러나기', sub: '누르고 있으면 물러납니다' } : { label: '학익진 전개!', sub: '초록 구역에서 빠르게 누르세요' });
  g.result = () => {
    const form = g.pts.reduce((a, b) => a + b, 0), spd = g.spd.reduce((a, b) => a + b, 0);
    return { score: Math.min(1000, g.lureScore + form), note: `유인 ${Math.round(progress() * 100)}%` + (g.caught ? `(따라잡힘 ${g.caught}회)` : '') + ` · 학익진 완성 ${g.formT.toFixed(1)}초(빠르기 +${spd})` };
  };
  function drawLand(c) {
    c.fillStyle = '#4C5A3E';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(CX - 44, 0); c.lineTo(CX - 40, 40); c.lineTo(CX - 62, 78); c.lineTo(CX - 150, 96); c.lineTo(CX - 260, 88); c.lineTo(0, 104); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(GW, 0); c.lineTo(CX + 44, 0); c.lineTo(CX + 38, 36); c.lineTo(CX + 66, 74); c.lineTo(CX + 170, 92); c.lineTo(CX + 280, 84); c.lineTo(GW, 100); c.closePath(); c.fill();
    c.fillStyle = 'rgba(35,44,28,.9)'; for (const [x, y] of [[CX - 30, 56], [CX + 26, 20], [CX - 22, 12]]) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
    txt(c, '견내량', CX + 60, 30, { size: 15, w: 900, serif: true, color: '#F1E9D6', stroke: C.ink, sw: 3 });
    txt(c, '(좁고 암초가 많은 물길)', CX + 60, 48, { size: 11, color: '#E0E6DF', stroke: C.ink, sw: 3 });
    txt(c, '한산도 앞 넓은 바다', 20, 300, { size: 13, color: 'rgba(233,237,230,.8)', stroke: C.ink, sw: 3 });
  }
  g.draw = function (c) {
    c.save(); if (g.shake > 0) c.translate(rand(-3, 3), rand(-3, 3));
    if (!Spr.bg(c, 'bgSea', { px: 0.5, py: 0.35 })) vgrad(c, 0, 0, GW, GH, '#2E6E86', '#0F3145');
    drawLand(c);
    const formation = g.state !== 'lure' && g.state !== 'lureEnd';
    if (formation) {
      c.save(); c.setLineDash([4, 8]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(CX, CY, RX, RY, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.stroke(); c.restore();
      for (let i = g.step; i < 5; i++) { const s = slot(i); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y - 10, 16, 0, 7); c.stroke(); txt(c, String(i + 1), s.x, s.y - 4, { size: 14, align: 'center', color: '#fff', stroke: 'rgba(15,26,40,.7)', sw: 3 }); }
    }
    for (const e of enemy) {
      const bob = Math.sin(g.t * 1.6 + e.dx) * 2;
      if (e.sink) { const k = e.sink, sf = k < 0.3 ? 3 : (k < 0.65 ? 4 : (k < 0.95 ? 5 : 6)); drawShip(c, 'jp', e.x, e.y + 26, 0.72, { frame: ['shjp', 3, sf], flip: e.flip, alpha: k > 1.0 ? Math.max(0, 1 - (k - 1.0) / 0.3) : 1 }); }
      else drawShip(c, 'jp', e.x, e.y + 26 + bob, 0.72, { frame: ['shjp', 3, e.f], flip: e.flip });
    }
    if (!formation && g.L < GH + 60) {
      for (const [dx, dy] of [[-30, 22], [30, 30]]) if (!Spr.draw(c, 'shpo', 0, 1, CX + dx, g.L + dy, 0.78)) shipVec(c, CX + dx, g.L + dy, 0.6);
    }
    for (const p of g.placed) {
      const tgt = slot(p.i, p.off); const k = 1 - Math.pow(1 - p.k, 3);
      const sy = GH + 70 + (tgt.y + 22 - GH - 70) * k; p.x = tgt.x; p.y = sy;
      if (p.i === 0) { if (!Spr.draw(c, 'shgb', 0, 1, tgt.x, sy, 1.1)) shipVec(c, tgt.x, sy, 0.8); }
      else if (!Spr.draw(c, 'shpo', 0, tgt.right ? 3 : 1, tgt.x, sy, 0.9)) shipVec(c, tgt.x, sy, 0.7, tgt.right ? -1 : 1);
    }
    FX.draw(c, g.fx);
    if (g.state === 'lure') {
      const gap = g.L - (g.E + 34), far = gap >= SIGHT, near = gap < NEAR + 16;
      const label = far ? '너무 멀다! 적이 쫓아오지 않는다' : (near ? '너무 가깝다! 따라잡힌다' : '좋은 거리 — 적이 쫓아온다');
      txt(c, label, CX, Math.min(GH - 60, g.L + 78), { size: 16, align: 'center', color: far || near ? '#FFB3A3' : '#9CE0B8', stroke: C.ink, sw: 4 });
      const gx = GW - 40, gy = 70, gh = 250; c.fillStyle = 'rgba(15,26,40,.75)'; rrect(c, gx - 12, gy - 8, 24, gh + 16, 6); c.fill();
      c.fillStyle = '#5FAF8E'; c.fillRect(gx - 6, gy + gh * (NEAR / 160), 12, gh * ((SIGHT - NEAR) / 160));
      c.fillStyle = C.por; const gp = gy + gh * clamp(gap / 160, 0, 1); c.fillRect(gx - 10, gp - 2, 20, 4);
      txt(c, '거리', gx, gy - 14, { size: 11, align: 'center', color: C.por, stroke: C.ink, sw: 3 });
    } else if (g.state !== 'volley') {
      if (formation) {
        c.fillStyle = 'rgba(15,26,40,.85)'; rrect(c, BX - 12, BY - 22, BW + 24, 58, 8); c.fill();
        c.fillStyle = '#2A3B4A'; rrect(c, BX, BY - 10, BW, 30, 5); c.fill();
        c.fillStyle = '#5FAF8E'; c.fillRect(BX + BW * (g.zc - g.zh), BY - 10, BW * g.zh * 2, 30);
        const ix = BX + BW * g.u; c.fillStyle = C.por; c.fillRect(ix - 3, BY - 16, 6, 42);
        if (g.state === 'aim') { // 빠르기 점수: 시간이 지날수록 줄어듭니다
          const sk = clamp((SPD_ZERO - g.st) / (SPD_ZERO - SPD_FULL), 0, 1);
          const sbx = BX + BW - 138, sby = BY - 40;
          txt(c, `빠르기 +${Math.round(SPD_MAX * sk)}`, sbx - 8, sby + 9, { size: 13, align: 'right', color: sk > 0 ? '#9CE0B8' : '#9FB0B8', stroke: C.ink, sw: 3 });
          c.fillStyle = 'rgba(15,26,40,.85)'; rrect(c, sbx, sby, 150, 10, 4); c.fill();
          c.fillStyle = sk > 0.5 ? '#5FAF8E' : (sk > 0 ? '#E2C273' : '#6B7780'); if (sk > 0) { rrect(c, sbx + 1, sby + 1, 148 * sk, 8, 3); c.fill(); }
        }
      }
    }
    c.restore();
    topShade(c, 50, 0.5);
    if (g.state === 'lure' || g.state === 'lureEnd') { txt(c, '1단계 · 적을 넓은 바다로 끌어내라', 14, 28, { size: 18, stroke: C.ink }); bar(c, 14, 38, 200, 10, progress(), C.gold); }
    else {
      txt(c, `2단계 · 학익진 배치 ${Math.min(g.step, 5)} / 5`, 14, 28, { size: 18, stroke: C.ink });
      txt(c, `완성 시간 ${(g.formT + (g.state === 'aim' ? g.st : 0)).toFixed(1)}초`, GW - 14, 28, { size: 18, align: 'right', color: C.gold2, stroke: C.ink });
    }
    if (g.state === 'volley') {
      txt(c, '학익진 완성! 일제 사격!', GW / 2, 320, { size: 34, align: 'center', serif: true, w: 900, stroke: C.ink, sw: 7 });
      txt(c, `완성까지 ${g.formT.toFixed(1)}초 · 빠르기 보너스 +${g.spd.reduce((a, b) => a + b, 0)}`, GW / 2, 352, { size: 18, align: 'center', color: '#9CE0B8', stroke: C.ink, sw: 4 });
    }
  };
  return g;
}

/* ============================================================
   Stage 4. 의병 매복(아군 오인 주의) + 진주성 방어전
   진주성: 5명 중 1명꼴 덩치 큰 적장 등장, 화살 3대를 맞아야 처치
   ============================================================ */
function gUibyeong() {
  /* [난이도] 진주성 공성전 시간 2배(12초 → 24초), 적 1.5배.
     [역사 체험] 진주성에 몰려온 왜군은 조총을 앞세워 성벽 위 군사를 쏘았고, 성 안에서는 몸을 숨겨 가며
     활과 현자총통으로 맞섰습니다. → 덩치 큰 적장이 가까이 오면 조총을 쏩니다. 붉은 느낌표(!)가 뜨면
     [숨기]를 누르고 있어 성벽 뒤로 숨으세요. 숨지 못하고 맞으면 2초 동안 몸이 굳어 활을 쏠 수 없습니다. */
  const A_END = 14, B_START = 15.5, B_LEN = 24, DUR = B_START + B_LEN, PENALTY = 40;
  const GUN_R = 250, AIM_T = 1.0, STUN_T = 2.0;
  const COLS = [100, 275, 450, 625], ROWS = [200, 295, 390];
  const WALLPTS = [{ x: 336, y: 196 }, { x: 268, y: 258 }, { x: 222, y: 326 }, { x: 150, y: 384 }];
  const ARCH = [{ x: 296, y: 176 }, { x: 236, y: 244 }, { x: 188, y: 316 }, { x: 118, y: 372 }, { x: 350, y: 132 }];
  const g = { dur: DUR, t: 0, phase: 'A', hitsA: 0, hitsB: 0, supply: 0, friendly: 0, wallHp: 100, pops: [], foes: [], fx: [], spawnT: 0.4, done: false, over: false, overT: 0, anim: 0, shoot: [0, 0, 0, 0, 0],
    hide: false, stun: 0, stunned: 0, blocked: 0, shake: 0,
    controls: { kind: 'fire', fire: '숨기', hint: '갈대밭: 군량 수송대 +40 · 왜군 +25 · 초록 아군(-40) / 진주성: 조총(!)이 뜨면 [숨기]를 누르고 있기' } };
  const reeds = []; COLS.forEach((cx, ci) => ROWS.forEach((cy, ri) => { const arr = []; for (let i = 0; i < 24; i++) arr.push({ dx: rand(-58, 58), h: rand(30, 52), lean: rand(-0.35, 0.35), w: rand(1.5, 3) }); reeds.push({ x: cx, y: cy, arr, idx: ci + ri * 4 }); }));
  g.update = function (dt) {
    FX.step(g.fx, dt); g.anim += dt; g.shake = Math.max(0, g.shake - dt); g.stun = Math.max(0, g.stun - dt);
    for (let i = 0; i < g.shoot.length; i++) g.shoot[i] = Math.max(0, g.shoot[i] - dt);
    if (g.over) { g.overT += dt; if (g.overT > 1.4) g.done = true; return; }
    g.t += dt;
    g.phase = g.t < A_END ? 'A' : (g.t < B_START ? 'T' : 'B');
    if (g.phase === 'A') {
      g.spawnT -= dt;
      const p = g.t / A_END;
      const active = g.pops.filter(q => !q.done).length;
      if (g.spawnT <= 0 && active < (p > 0.55 ? 3 : 2)) {
        g.spawnT = 0.62 - 0.14 * p;
        const free = reeds.filter(r => !g.pops.some(q => !q.done && q.r === r));
        const ally = g.t > 1.2 && Math.random() < 0.34, supply = !ally && Math.random() < 0.4;
        if (free.length) g.pops.push({ r: pick(free), t: 0, life: rand(1.0, 1.45) * (1 - 0.25 * p) * (supply ? 1.15 : 1), hit: false, done: false, ally, supply });
      }
    } else if (g.phase === 'T') { g.pops.forEach(q => q.done = true); }
    for (const q of g.pops) { q.t += dt; if (!q.hit && q.t >= q.life) q.done = true; if (q.hit && q.t > q.hitT + 0.4) q.done = true; }
    g.pops = g.pops.filter(q => !q.done);
    if (g.phase === 'B') {
      g.spawnT -= dt;
      if (g.spawnT <= 0) {
        g.spawnT = rand(0.7, 1.05) / 1.5;   // 적 1.5배
        const wp = pick(WALLPTS), tough = Math.random() < 0.2;
        g.foes.push({ x: GW + 30, y: clamp(wp.y + rand(-70, 60), 40, GH - 30), tx: wp.x + rand(8, 22), ty: wp.y + rand(-8, 8), v: rand(60, 85), ph: rand(0, 6), dead: false, dieT: 0, atk: 0, reached: false, tough, hp: tough ? 3 : 1, gunOn: false, fireT: rand(0.3, 0.9), aim: 0, recoil: 0 });
      }
      for (const f of g.foes) {
        if (f.dead) { f.dieT += dt; continue; } f.ph += dt; f.recoil = Math.max(0, f.recoil - dt);
        // 덩치 큰 적장: 성에 일정 거리 이상 다가오면 조총을 쏩니다 (조준 1초 → 발사)
        if (f.tough) {
          if (!f.gunOn && dist(f.x, f.y, f.tx, f.ty) < GUN_R) { f.gunOn = true; FX.add(g.fx, { k: 'txt', s: '조총 사거리!', x: f.x, y: f.y - 120, size: 14, c: '#FFB3A3', life: 0.8 }); }
          if (f.gunOn) {
            if (f.aim > 0) {
              f.aim -= dt;
              if (f.aim <= 0) {
                const a = pick(ARCH); f.recoil = 0.3; f.fireT = rand(2.6, 3.6);
                FX.muzzle(g.fx, f.x - 24, f.y - 44, -1);
                FX.add(g.fx, { k: 'line', x0: f.x - 24, y0: f.y - 44, x1: a.x, y1: a.y - 30, life: 0.16, c: '#FFE9A8', w: 2 });
                if (g.hide) { g.blocked++; FX.add(g.fx, { k: 'burst', x: a.x + 20, y: a.y - 6, r: 16, c: '#B8B0A0', life: 0.3 }); FX.add(g.fx, { k: 'txt', s: '막았다!', x: a.x + 30, y: a.y - 50, size: 16, c: '#9CE0B8', life: 0.7 }); }
                else { g.stun = STUN_T; g.stunned++; g.shake = 0.35; FX.add(g.fx, { k: 'flash', life: 0.25, a: 0.35, c: '#C4432F' }); FX.add(g.fx, { k: 'txt', s: '조총에 맞았다! 2초 경직', x: a.x + 40, y: a.y - 56, size: 18, c: '#FF8E7A', life: 1.1 }); }
              }
            } else { f.fireT -= dt; if (f.fireT <= 0) f.aim = AIM_T; }
          }
        }
        if (f.reached) { f.atk += dt; if (f.atk >= 1.0) { f.atk = 0; g.wallHp = Math.max(0, g.wallHp - 3); FX.add(g.fx, { k: 'burst', x: f.x - 20, y: f.y - 30, r: 20, c: '#C4432F', life: 0.35 }); } }
        else { const d = dist(f.x, f.y, f.tx, f.ty); if (d < 8) f.reached = true; else { f.x += (f.tx - f.x) / d * f.v * dt; f.y += (f.ty - f.y) / d * f.v * dt; } }
      }
      g.foes = g.foes.filter(f => !f.dead || f.dieT < 0.5);
    }
    if (g.t >= DUR) { g.over = true; g.t = DUR; }
  };
  g.onDown = function (x, y) {
    if (g.over) return;
    if (g.phase === 'A') {
      let best = null, bd = 1e9;
      for (const q of g.pops) { if (q.hit || q.done) continue; const k = q.t < 0.15 ? q.t / 0.15 : (q.life - q.t < 0.15 ? Math.max(0, (q.life - q.t) / 0.15) : 1); if (k < 0.5) continue; const d = dist(x, y, q.r.x, q.r.y - 46); if (d < 54 && d < bd) { best = q; bd = d; } }
      if (best) {
        best.hit = true; best.hitT = best.t;
        if (best.ally) { g.friendly++; FX.add(g.fx, { k: 'txt', s: `아군이다! -${PENALTY}`, x: best.r.x, y: best.r.y - 100, c: '#FF8E7A', size: 22, life: 0.9 }); }
        else if (best.supply) { g.supply++; FX.add(g.fx, { k: 'burst', x: best.r.x, y: best.r.y - 50, r: 30, c: '#E0B060', life: 0.4 }); for (let i = 0; i < 6; i++) FX.add(g.fx, { k: 'debris', x: best.r.x, y: best.r.y - 40, vx: rand(-120, 120), vy: rand(-220, -100), s: 3, c: '#EDE3C4', life: 0.8 }); FX.add(g.fx, { k: 'txt', s: '군량 차단! +40', x: best.r.x, y: best.r.y - 100, size: 20, life: 0.8 }); }
        else { g.hitsA++; FX.add(g.fx, { k: 'burst', x: best.r.x, y: best.r.y - 50, r: 26, life: 0.35 }); FX.add(g.fx, { k: 'txt', s: '+25', x: best.r.x, y: best.r.y - 100, life: 0.6 }); }
      } else FX.add(g.fx, { k: 'x', x, y, life: 0.3 });
    } else if (g.phase === 'B') {
      if (g.hide) { FX.add(g.fx, { k: 'txt', s: '숨어 있을 땐 쏠 수 없어요', x, y, size: 15, c: '#E0E6DF', life: 0.5 }); return; }
      if (g.stun > 0) { FX.add(g.fx, { k: 'txt', s: `경직! ${g.stun.toFixed(1)}초`, x, y, size: 16, c: '#FF9A88', life: 0.5 }); return; }
      let best = null, bd = 1e9;
      for (const f of g.foes) { if (f.dead) continue; const d = dist(x, y, f.x, f.y - 34); if (d < 52 && d < bd) { best = f; bd = d; } }
      let ai = 0, ad = 1e9; ARCH.forEach((a, i) => { const d = dist(a.x, a.y, x, y); if (d < ad) { ad = d; ai = i; } }); g.shoot[ai] = 0.25;
      if (best) {
        best.hp--; FX.add(g.fx, { k: 'burst', x: best.x, y: best.y - 34, r: 22, life: 0.3 });
        if (best.hp <= 0) { best.dead = true; best.dieT = 0; g.hitsB++; FX.add(g.fx, { k: 'txt', s: '+40', x: best.x, y: best.y - 80, life: 0.6 }); }
        else FX.add(g.fx, { k: 'txt', s: `화살 ${3 - best.hp}/3`, x: best.x, y: best.y - 80, size: 15, c: C.gold2, life: 0.5 });
      } else FX.add(g.fx, { k: 'x', x, y, life: 0.3 });
    }
  };
  g.action = (n, d) => { if (n !== 'fire') return; g.hide = g.phase === 'B' && d !== false; };
  g.ui = () => (g.phase !== 'B'
    ? { label: '숨기 (진주성에서 사용)', sub: '지금은 갈대밭 기습 중 — 화면을 누르세요', fire: 0, on: { fire: false } }
    : { label: g.hide ? '숨는 중… (떼면 활쏘기)' : '숨기 (누르고 있기)', sub: g.stun > 0 ? `조총에 맞아 경직 ${g.stun.toFixed(1)}초` : '붉은 느낌표(!)가 뜨면 누르고 있으세요', fire: g.stun / STUN_T, on: { fire: g.hide } });
  g.result = () => { const pen = g.friendly * PENALTY; return { score: clamp(Math.min(1000, g.hitsA * 25 + g.supply * 40 + g.hitsB * 16 + Math.round(g.wallHp * 1.5)) - pen, 0, 1000), note: `군량 차단 ${g.supply}회 · 갈대밭 격퇴 ${g.hitsA}명 · 성 방어 ${g.hitsB}명 · 성벽 ${Math.round(g.wallHp)}` + (g.stunned ? ` · 조총 경직 ${g.stunned}회` : '') + (g.friendly ? ` · 아군 오인 ${g.friendly}회(-${pen})` : '') }; };
  g.draw = function (c) {
    if (g.phase === 'A') {
      vgrad(c, 0, 0, GW, GH, '#33463A', '#24352B'); topShade(c, 90, 0.45);
      for (const r of reeds) {
        const pop = g.pops.find(q => q.r === r);
        if (pop) {
          const k = pop.hit ? Math.max(0, 1 - (pop.t - pop.hitT) / 0.35) : (pop.t < 0.15 ? pop.t / 0.15 : (pop.life - pop.t < 0.15 ? Math.max(0, (pop.life - pop.t) / 0.15) : 1));
          const rise = 26 + 40 * k;
          c.save(); c.beginPath(); c.rect(r.x - 70, r.y - 140, 140, 146); c.clip();
          const col = pop.ally ? 'rgba(90,210,130,1)' : 'rgba(224,80,60,1)';
          c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.ellipse(r.x, r.y - 8, 30, 9, 0, 0, 7); c.stroke();
          if (pop.hit) drawSoldier(c, pop.ally ? 'js' : 'jp', 'fall', r.x, r.y + 44 - 44 * (1 - k), 1.25, g.anim, { alpha: k });
          else {
            drawSoldier(c, pop.ally ? 'js' : 'jp', 'front', r.x, r.y + 96 - rise, 1.3, pop.t * 1.5, { shadow: 0 });
            if (pop.supply) { // 등에 진 쌀가마(군량)
              const by = r.y + 96 - rise - 92; c.fillStyle = '#C9A46A'; c.strokeStyle = '#5A4020'; c.lineWidth = 2;
              c.beginPath(); c.ellipse(r.x + 22, by, 20, 14, -0.2, 0, 7); c.fill(); c.stroke();
              c.beginPath(); c.moveTo(r.x + 10, by - 12); c.lineTo(r.x + 14, by + 12); c.moveTo(r.x + 30, by - 12); c.lineTo(r.x + 34, by + 11); c.stroke();
            }
          }
          c.restore();
          if (pop.ally && !pop.hit && k > 0.6) txt(c, '아군', r.x, r.y - 118 + (1 - k) * 30, { size: 14, align: 'center', color: '#8CF0AE', stroke: C.ink, sw: 4 });
          if (pop.supply && !pop.hit && k > 0.6) txt(c, '군량 수송', r.x, r.y - 118 + (1 - k) * 30, { size: 14, align: 'center', color: '#F3D98A', stroke: C.ink, sw: 4 });
        }
        for (const s of r.arr) { c.strokeStyle = 'rgba(160,180,110,1)'; c.lineWidth = s.w; c.beginPath(); c.moveTo(r.x + s.dx, r.y + 8); c.quadraticCurveTo(r.x + s.dx + s.lean * 20, r.y - s.h * 0.6, r.x + s.dx + s.lean * 46, r.y - s.h * 0.75); c.stroke(); }
      }
      txt(c, `군량 차단 ${g.supply} · 격퇴 ${g.hitsA}` + (g.friendly ? ` · 아군 오인 ${g.friendly}` : ''), GW - 14, 28, { size: 18, align: 'right', stroke: C.ink });
      txt(c, '의병: 왜군의 보급로를 끊어라', 14, 28, { size: 17, stroke: C.ink });
      bar(c, 14, 40, 200, 10, 1 - g.t / A_END, C.gold);
    } else {
      c.save(); if (g.shake > 0) c.translate(rand(-3, 3), rand(-3, 3));
      if (!Spr.bg(c, 'bgCastle', { px: 0, py: 0.5 })) vgrad(c, 0, 0, GW, GH, '#8a7a55', '#5b5a40');
      ARCH.forEach((a, i) => {
        if (g.hide) { // 성벽 뒤로 몸을 낮춤: 투구 끝만 살짝 보입니다
          c.fillStyle = '#1F3550'; c.beginPath(); c.moveTo(a.x - 11, a.y - 20); c.lineTo(a.x + 11, a.y - 20); c.lineTo(a.x, a.y - 34); c.closePath(); c.fill();   // 투구 끝
          c.fillStyle = '#7E776A'; c.strokeStyle = '#3E3A33'; c.lineWidth = 2;                                                                          // 여장(성가퀴) 돌
          c.beginPath(); c.moveTo(a.x - 28, a.y - 2); c.lineTo(a.x - 28, a.y - 20); c.lineTo(a.x - 16, a.y - 20); c.lineTo(a.x - 16, a.y - 14); c.lineTo(a.x + 16, a.y - 14); c.lineTo(a.x + 16, a.y - 20); c.lineTo(a.x + 28, a.y - 20); c.lineTo(a.x + 28, a.y - 2); c.closePath(); c.fill(); c.stroke();
          c.strokeStyle = 'rgba(62,58,51,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x - 28, a.y - 8); c.lineTo(a.x + 28, a.y - 8); c.moveTo(a.x, a.y - 14); c.lineTo(a.x, a.y - 8); c.moveTo(a.x - 14, a.y - 8); c.lineTo(a.x - 14, a.y - 2); c.moveTo(a.x + 14, a.y - 8); c.lineTo(a.x + 14, a.y - 2); c.stroke();
          return;
        }
        const shot = g.shoot[i] > 0;
        drawSoldier(c, 'js', g.stun > 0 ? 'back' : (shot ? 'shoot' : 'aim'), a.x + (g.stun > 0 ? Math.sin(g.anim * 30) * 2 : 0), a.y, 0.78, shot ? g.anim + i : 0, { shadow: 0.6, alpha: g.stun > 0 ? 0.75 : 1 });
        if (g.stun > 0) txt(c, '✶', a.x, a.y - 78, { size: 16, align: 'center', color: '#FFD27A', stroke: C.ink, sw: 3 });
      });
      const list = g.foes.slice().sort((a, b) => a.y - b.y);
      for (const f of list) {
        const sc = f.tough ? 1.28 : 0.95;
        if (f.tough && !f.dead) {
          c.strokeStyle = 'rgba(226,194,115,.9)'; c.lineWidth = 3; c.beginPath(); c.ellipse(f.x, f.y - 2, 28, 9, 0, 0, 7); c.stroke();
          if (f.aim > 0) { c.fillStyle = `rgba(232,70,50,${0.28 + 0.2 * Math.sin(g.anim * 20)})`; c.beginPath(); c.arc(f.x, f.y - 44, 34, 0, 7); c.fill(); }
        }
        if (f.dead) drawSoldier(c, 'jp', 'fall', f.x, f.y, sc, g.anim, { alpha: 1 - f.dieT / 0.5 });
        else drawSoldier(c, 'jp', f.tough && f.gunOn ? (f.recoil > 0 ? 'shoot' : 'aim') : (f.reached ? 'shoot' : 'left'), f.x, f.y, sc, f.ph * 1.4, { flip: f.reached || (f.tough && f.gunOn) });
        if (f.tough && !f.dead) {
          for (let k = 0; k < 3; k++) { c.fillStyle = k < f.hp ? '#E2C273' : 'rgba(233,237,230,.3)'; c.beginPath(); c.arc(f.x - 12 + k * 12, f.y - 108 * sc / 1.28, 3.5, 0, 7); c.fill(); }
          txt(c, f.aim > 0 ? '!' : '조총', f.x, f.y - 122 * sc / 1.28, { size: f.aim > 0 ? 26 : 11, align: 'center', color: f.aim > 0 ? '#FF6A55' : '#FFD7CE', stroke: C.ink, sw: 3 });
        }
      }
      FX.draw(c, g.fx); c.restore(); topShade(c, 70, 0.5);
      if (g.stun > 0) { c.fillStyle = `rgba(196,67,47,${0.12 + 0.06 * Math.sin(g.anim * 12)})`; c.fillRect(0, 0, GW, GH); txt(c, `경직! ${g.stun.toFixed(1)}초`, GW / 2, 110, { size: 26, align: 'center', serif: true, w: 900, color: '#FFD7CE', stroke: C.ink, sw: 5 }); }
      else if (g.hide) { c.fillStyle = 'rgba(15,26,40,.18)'; c.fillRect(0, 0, GW, GH); txt(c, '성벽 뒤에 숨는 중 — 손을 떼면 다시 활을 쏩니다', GW / 2, 110, { size: 18, align: 'center', color: '#E0E6DF', stroke: C.ink, sw: 4 }); }
      else if (g.foes.some(f => !f.dead && f.aim > 0)) txt(c, '조총 조준! [숨기]를 누르세요', GW / 2, 110, { size: 22, align: 'center', serif: true, w: 900, color: '#FF9A88', stroke: C.ink, sw: 5 });
      txt(c, '진주성 사수! 적장(3번 맞혀야 쓰러짐)은 가까이 오면 조총을 쏩니다', 14, 28, { size: 15, stroke: C.ink });
      txt(c, `격퇴 ${g.hitsB}`, GW - 14, 28, { size: 20, align: 'right', stroke: C.ink });
      bar(c, 14, 40, 200, 10, 1 - (g.t - B_START) / (DUR - B_START), C.gold);
      bar(c, GW - 214, 40, 200, 12, g.wallHp / 100, g.wallHp > 40 ? '#7FB7A4' : '#C4432F'); txt(c, `성벽 ${Math.round(g.wallHp)}`, GW - 208, 50, { size: 11, color: C.ink });
      if (g.phase === 'T') c.fillStyle = 'rgba(15,26,40,.5)', c.fillRect(0, 0, GW, GH);
    }
    if (g.phase === 'A' || g.phase === 'T') FX.draw(c, g.fx);
    if (g.phase === 'T') txt(c, '진주목사 김시민과 함께 진주성을 지켜라!', GW / 2, 220, { size: 28, align: 'center', serif: true, w: 900, stroke: C.ink, sw: 6 });
    if (g.over) { c.fillStyle = 'rgba(15,26,40,.65)'; c.fillRect(0, 0, GW, GH); txt(c, '진주성을 지켜 냈습니다', GW / 2, 220, { size: 32, serif: true, w: 900, align: 'center' }); }
  };
  return g;
}
