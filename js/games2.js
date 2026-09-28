/* ============================================================
   Stage 5~8
   ============================================================ */

/* Stage 5. 평양성: 불랑기포 슬링샷 공성전 — 제한시간 30초
   [수정] ① 포루(적 목표물) 명중 판정을 "기둥 꼭대기 한 점"이 아니라
             기둥 전체 몸통(사각형)으로 바꿔서, 눈으로 보기에 맞았는데도
             부서지지 않던 문제를 고쳤습니다.
          ② 조준 중에 실제 물리값 그대로 계산한 점선 예상 궤적(포물선)을
             그려서, 당기는 각도에 따라 공이 곡선을 그리며 날아간다는 것을
             눈으로 바로 확인할 수 있게 했습니다. */
function gPyongyang() {
  const CAN = { x: 92, y: 352 }, GROUND = 366;
  const MUZ = { x: CAN.x + 18, y: CAN.y - 10 };
  const GRAV = 560, MAXPULL = 150, POWER = 3.5;
  const towers = [
    { x: 480, y: 300, w: 34, alive: true, fall: 0 },
    { x: 590, y: 258, w: 34, alive: true, fall: 0 },
    { x: 690, y: 300, w: 34, alive: true, fall: 0 }
  ];
  const g = { dur: 30, t: 0, shots: 3, used: 0, state: 'aim', st: 0, aim: null, recoil: 0, shake: 0, fx: [], done: false, controls: { kind: 'drag', hint: '화면을 눌러 당긴 뒤 손을 떼면 점선을 따라 포탄이 곡선으로 날아갑니다' } };

  function towerHit(tw, bx, by) {
    // 포루의 "몸통 전체"(기둥 폭 + 위쪽 여유분 ~ 지면)를 기준으로 판정합니다.
    return bx > tw.x - tw.w / 2 - 12 && bx < tw.x + tw.w / 2 + 12 && by > tw.y - 16 && by < GROUND + 8;
  }
  function simulate(vx, vy) {
    // 조준 중 미리보기용 점선 궤적. 실제 발사 물리(중력 포함)와 완전히 동일한 값으로 계산합니다.
    const pts = []; let x = MUZ.x, y = MUZ.y, vx2 = vx, vy2 = vy;
    for (let i = 0; i < 46; i++) {
      const dt = 0.045; vy2 += GRAV * dt; x += vx2 * dt; y += vy2 * dt;
      if (y > 398 || x > GW + 10 || x < -10) break;
      pts.push([x, y]);
    }
    return pts;
  }
  g.update = function (dt) {
    FX.step(g.fx, dt); if (g.state !== 'end') g.t = Math.min(g.dur, g.t + dt); g.st += dt; g.recoil = Math.max(0, g.recoil - dt); g.shake = Math.max(0, g.shake - dt);
    if (g.state === 'fly') {
      const b = g.ball; b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.random() < dt * 30) FX.add(g.fx, { k: 'smoke', x: b.x, y: b.y, r: 5, vy: 0, life: 0.5, c: 'rgba(200,200,190,1)' });
      for (const tw of towers) if (tw.alive && towerHit(tw, b.x, b.y)) {
        tw.alive = false; g.state = 'end'; g.st = 0; g.shake = 0.45;
        FX.explode(g.fx, tw.x, (tw.y + GROUND) / 2, { r: 52, n: 12, smoke: 5, flash: 0.45, dc: '#6B5A42' });
        FX.add(g.fx, { k: 'txt', s: '명중! 포루 파괴', x: tw.x, y: tw.y - 34, size: 22, life: 0.9 });
      }
      if (g.state === 'fly' && (b.y > 398 || b.x > GW + 20 || b.x < -20)) {
        g.state = 'end'; g.st = 0;
        if (b.y > 398 && b.x > 0 && b.x < GW) FX.explode(g.fx, b.x, GROUND + 10, { r: 20, n: 6, smoke: 2, dc: '#4E5A3E' });
        FX.add(g.fx, { k: 'txt', s: '빗나감', x: GW / 2, y: 150, size: 20, c: '#FF9A88', life: 0.7 });
      }
    } else if (g.state === 'end' && g.st > 0.6) { g.state = 'aim'; g.st = 0; g.aim = null; }
    towers.forEach(t => { if (!t.alive) t.fall += dt; });
    if (g.t >= g.dur && g.state === 'aim') { g.aim = null; g.state = 'end'; g.st = 0; FX.add(g.fx, { k: 'txt', s: '시간 종료!', x: GW / 2, y: 150, size: 30, life: 1.4 }); }
    const finished = towers.every(t => !t.alive) || g.used >= g.shots || g.t >= g.dur;
    if (finished && g.state !== 'fly' && g.st > 1.2) g.done = true;
  };
  g.onDown = (x, y) => { if (g.state === 'aim' && g.used < g.shots && dist(x, y, CAN.x, CAN.y) < 90) g.aim = { ox: x, oy: y, dx: 0, dy: 0 }; };
  g.onMove = (x, y, down) => {
    if (!down || !g.aim) return;
    const rx = x - g.aim.ox, ry = y - g.aim.oy, L = Math.min(MAXPULL, Math.hypot(rx, ry)) || 0, ang = Math.atan2(ry, rx);
    g.aim.dx = Math.cos(ang) * L; g.aim.dy = Math.sin(ang) * L;
  };
  g.onUp = () => {
    if (!g.aim || g.state !== 'aim') return;
    const L = Math.hypot(g.aim.dx, g.aim.dy);
    if (L < 14) { g.aim = null; return; }
    const vx = -g.aim.dx * POWER, vy = -g.aim.dy * POWER;
    g.ball = { x: MUZ.x, y: MUZ.y, vx, vy }; g.used++; g.state = 'fly'; g.st = 0; g.recoil = 0.3; g.aim = null; g.shake = 0.15;
    FX.muzzle(g.fx, MUZ.x, MUZ.y, 1); FX.add(g.fx, { k: 'flash', life: 0.12, a: 0.25 });
  };
  g.ui = () => ({});
  g.result = () => { const d = towers.filter(t => !t.alive).length; return { score: Math.min(1000, d * 300 + Math.max(0, g.shots - g.used) * 30), note: `격파한 포루 ${d}곳 · 사용한 포탄 ${g.used}발 · 남은 시간 ${Math.max(0, Math.ceil(g.dur - g.t))}초` }; };
  g.draw = function (c) {
    c.save(); if (g.shake > 0) c.translate(rand(-4, 4), rand(-3, 3));
    vgrad(c, 0, 0, GW, GH, '#4A5A78', '#8FA0AE'); vgrad(c, 0, GROUND, GW, GH - GROUND, '#4E5A3E', '#37402A');
    c.fillStyle = '#6B6558'; c.fillRect(430, GROUND - 66, 300, 66); c.fillStyle = '#585246'; for (let x = 430; x < 730; x += 30) c.fillRect(x, GROUND - 76, 20, 12);
    txt(c, '평양성', 580, GROUND - 78, { size: 18, align: 'center', serif: true, w: 900, color: '#EDE7D8' });
    towers.forEach((tw, i) => {
      if (tw.alive) {
        const pulse = 0.6 + 0.4 * Math.sin(g.t * 4 + i);
        c.save(); c.globalAlpha = pulse * 0.8; c.strokeStyle = '#FF6A55'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(tw.x, (tw.y + GROUND) / 2, tw.w / 2 + 14, (GROUND - tw.y) / 2 + 8, 0, 0, 7); c.stroke(); c.restore();
        c.fillStyle = '#7A6A50'; c.fillRect(tw.x - tw.w / 2, tw.y, tw.w, GROUND - tw.y);
        drawSoldier(c, 'jp', 'shoot', tw.x, tw.y, 0.8, g.t, { flip: true, shadow: 0.5 });
        txt(c, '포루', tw.x, tw.y - 18, { size: 13, align: 'center', color: '#FFD7CE', stroke: C.ink, sw: 3 });
      } else { const f = Math.min(1, tw.fall); c.save(); c.globalAlpha = 1 - f * 0.6; c.translate(tw.x, tw.y + f * 30); c.rotate(f * 0.7); c.fillStyle = '#5A4E3C'; c.fillRect(-tw.w / 2, 0, tw.w, 40); c.restore(); }
    });
    drawSoldier(c, 'js', 'right', 120, GROUND - 2, 0.9, g.t, { shadow: 0.6 }); drawSoldier(c, 'js', 'right', 176, GROUND + 6, 0.9, g.t + 1, { shadow: 0.6 });
    if (g.aim) {
      const vx = -g.aim.dx * POWER, vy = -g.aim.dy * POWER, pts = simulate(vx, vy);
      // 예상 궤적을 작은 원(점선처럼 보이도록 한 칸씩 건너뛰어) 여러 개로 그립니다.
      // (참고: 이 점들을 setLineDash가 걸린 길이-0 선분으로 그리면 브라우저에 따라
      //  아예 안 보일 수 있어서, 실제로 채워진 원을 찍는 방식으로 확실히 그립니다.)
      c.save(); c.fillStyle = 'rgba(226,194,115,.9)';
      pts.forEach(([px, py], i) => { if (i % 2 === 0) { c.beginPath(); c.arc(px, py, 3.4, 0, 7); c.fill(); } });
      c.restore();
      c.strokeStyle = 'rgba(233,237,230,.7)'; c.lineWidth = 3; c.setLineDash([6, 6]);
      c.beginPath(); c.moveTo(MUZ.x, MUZ.y); c.lineTo(MUZ.x + g.aim.dx, MUZ.y + g.aim.dy); c.stroke(); c.setLineDash([]);
      c.fillStyle = C.gold2; c.beginPath(); c.arc(MUZ.x + g.aim.dx, MUZ.y + g.aim.dy, 8, 0, 7); c.fill();
      const pw = Math.round(100 * Math.hypot(g.aim.dx, g.aim.dy) / MAXPULL);
      txt(c, `당기는 힘 ${pw}%`, MUZ.x + g.aim.dx, MUZ.y + g.aim.dy - 20, { size: 14, align: 'center', color: C.gold2, stroke: C.ink, sw: 3 });
    }
    c.save(); c.translate(CAN.x, CAN.y - g.recoil * 20);
    c.fillStyle = '#2E2A22'; c.beginPath(); c.moveTo(-20, 10); c.lineTo(20, 10); c.lineTo(10, -22); c.lineTo(-10, -22); c.closePath(); c.fill();
    c.restore();
    if (g.state === 'fly' && g.ball) { c.fillStyle = '#20242B'; c.beginPath(); c.arc(g.ball.x, g.ball.y, 8, 0, 7); c.fill(); }
    towers.forEach(t => { if (!t.alive) flame(c, t.x, GROUND - 6, 0.8, g.t + t.x); });
    FX.draw(c, g.fx); c.restore(); topShade(c, 60, 0.4);
    for (let i = 0; i < g.shots; i++) { c.fillStyle = i < g.shots - g.used ? '#2E2A22' : 'rgba(46,42,34,.25)'; c.beginPath(); c.arc(24 + i * 24, 20, 8, 0, 7); c.fill(); }
    txt(c, `포루 ${towers.filter(t => !t.alive).length} / 3`, GW - 14, 28, { size: 20, align: 'right', stroke: C.ink });
    txt(c, `남은 시간 ${Math.max(0, Math.ceil(g.dur - g.t))}초`, GW / 2, 28, { size: 20, align: 'center', stroke: C.ink, color: g.dur - g.t < 8 ? '#FF9A88' : C.gold2 });
    bar(c, GW / 2 - 90, 38, 180, 8, 1 - g.t / g.dur, C.gold);
    if (towers.every(t => !t.alive)) {
      txt(c, '평양성 탈환!', GW / 2, 150, { size: 34, align: 'center', serif: true, w: 900, stroke: C.ink, sw: 7 });
      txt(c, '고니시의 왜군은 밤을 틈타 얼어붙은 대동강을 건너 달아났다', GW / 2, 182, { size: 16, align: 'center', color: '#F1E9D6', stroke: C.ink, sw: 4 });
    }
  };
  return g;
}

/* Stage 6. 행주산성: 신기전/돌던지기 — 방패부대(신기전 면역, 2배속) 10명당 2명 */
function gHaengju() {
  const FY = 336, ZONE = 232, RCD = 1.6, SCD = 0.45;
  const g = { dur: 25, t: 0, hp: 100, kills: 0, enemies: [], fx: [], spawnT: 0.4, rc: 0, sc: 0, gauge: 0, last: '', frenzy: 0, supplyT: 0, supplies: 0, done: false, over: false, overT: 0, shake: 0, controls: { kind: 'dual' } };
  const women = [];
  g.update = function (dt) {
    FX.step(g.fx, dt); g.shake = Math.max(0, g.shake - dt);
    for (const e of g.enemies) if (e.dead) e.dieT += dt;
    g.enemies = g.enemies.filter(e => !e.dead || e.dieT < 0.4);
    if (g.over) { g.overT += dt; if (g.overT > 2.0) g.done = true; return; }
    g.t += dt; const p = Math.min(1, g.t / g.dur);
    g.rc = Math.max(0, g.rc - dt); g.sc = Math.max(0, g.sc - dt); g.frenzy = Math.max(0, g.frenzy - dt); g.supplyT = Math.max(0, g.supplyT - dt);
    g.spawnT -= dt;
    if (g.spawnT <= 0) {
      g.spawnT = Math.max(0.42, 0.78 - 0.3 * p);
      const n = Math.random() < 0.3 + 0.35 * p ? 2 : 1;
      for (let i = 0; i < n; i++) { const shield = Math.random() < 0.2, baseVy = rand(40, 58) * (1 + 0.25 * p); g.enemies.push({ x: rand(50, GW - 50), y: -30 - i * 24, vy: shield ? baseVy * 2 : baseVy, shield, ph: rand(0, 6), atk: 0, reached: false, dead: false, dieT: 0 }); }
    }
    for (const e of g.enemies) {
      if (e.dead) continue; e.ph += dt * 8;
      if (e.reached) { e.atk += dt; if (e.atk >= 1.0) { e.atk = 0; g.hp -= 3; g.shake = 0.2; FX.add(g.fx, { k: 'burst', x: e.x, y: FY, r: 20, c: '#C4432F', life: 0.35 }); } }
      else { e.y += e.vy * dt; if (e.y >= FY - 6) { e.y = FY - 6; e.reached = true; } }
    }
    if (g.hp <= 0) { g.hp = 0; g.over = true; } else if (g.t >= g.dur) { g.over = true; g.t = g.dur; }
    for (const w of women) w.x += w.v * dt;
  };
  function gain(w) {
    g.gauge += (g.last && g.last !== w) ? 15 : 4; g.last = w;
    if (g.gauge >= 100) { g.gauge = 0; g.rc = 0; g.sc = 0; g.frenzy = 3.5; g.supplyT = 2.2; g.supplies++; women.length = 0; for (let i = 0; i < 6; i++) women.push({ x: -40 - i * 46, v: 230 + rand(-20, 20) }); FX.add(g.fx, { k: 'txt', s: '행주치마 보급대 출동!', x: GW / 2, y: 190, size: 26, life: 1.4 }); }
  }
  g.action = function (name, down) {
    if (g.over || down === false) return;
    const f = g.frenzy > 0 ? 0.35 : 1;
    if (name === 'rocket' && g.rc <= 0) {
      g.rc = RCD * f; gain('rocket');
      // 신기전은 방패부대(e.shield)를 절대 죽이지 못합니다 - 아래 필터에서 항상 제외됩니다.
      const targets = g.enemies.filter(e => !e.dead && !e.shield && e.y < ZONE && e.y > -10);
      for (let i = 0; i < 9; i++) FX.add(g.fx, { k: 'line', x0: 120 + i * 62, y0: FY + 4, x1: 80 + i * 70 + rand(-20, 20), y1: rand(40, ZONE), life: 0.5, c: '#FFD27A', w: 3 });
      for (let i = 0; i < 5; i++) FX.muzzle(g.fx, 150 + i * 110, FY + 2, 1);
      g.shake = 0.2;
      targets.forEach(e => { e.dead = true; e.dieT = 0; g.kills++; FX.explode(g.fx, e.x, e.y - 20, { r: 24, n: 5, smoke: 1 }); });
      if (targets.length) FX.add(g.fx, { k: 'txt', s: `신기전 +${targets.length}`, x: GW / 2, y: 120, size: 20, life: 0.8 });
      // 신기전 사거리 안에 방패부대가 있었다면, 맞고도 멀쩡하다는 것을 눈으로 확실히 보여줍니다.
      const shieldedInRange = g.enemies.filter(e => !e.dead && e.shield && e.y < ZONE && e.y > -10);
      shieldedInRange.forEach(e => { FX.add(g.fx, { k: 'txt', s: '무효!', x: e.x, y: e.y - 46, size: 18, c: '#9FD1FF', life: 0.7 }); FX.add(g.fx, { k: 'burst', x: e.x, y: e.y - 10, r: 16, c: '#5F9FE0', life: 0.35 }); });
      const shielded = g.enemies.some(e => !e.dead && e.shield && e.y < ZONE + 40);
      if (shielded) FX.add(g.fx, { k: 'txt', s: '방패부대는 신기전이 안 통해요! 돌 던지기로 처치하세요', x: GW / 2, y: 150, size: 16, c: '#9FD1FF', life: 0.9 });
    } else if (name === 'stone' && g.sc <= 0) {
      g.sc = SCD * f; gain('stone');
      // 돌 던지기는 방패부대를 포함해 가리지 않고 맞힙니다 (방패부대를 잡는 유일한 방법).
      const near = g.enemies.filter(e => !e.dead && e.y >= ZONE - 30).sort((a, b) => b.y - a.y).slice(0, g.frenzy > 0 ? 3 : 2);
      near.forEach(e => { e.dead = true; e.dieT = 0; g.kills++; FX.add(g.fx, { k: 'line', x0: e.x + rand(-60, 60), y0: FY + 10, x1: e.x, y1: e.y - 16, life: 0.25, c: '#D8D2C2', w: 5 }); FX.add(g.fx, { k: 'burst', x: e.x, y: e.y - 18, r: 20, c: '#CFC6B0', life: 0.3 }); for (let i = 0; i < 4; i++) FX.add(g.fx, { k: 'debris', x: e.x, y: e.y - 18, vx: rand(-110, 110), vy: rand(-200, -80), s: rand(3, 5), c: '#8A8272', life: 0.7 }); });
    }
  };
  g.onDown = (x) => g.action(x < GW / 2 ? 'rocket' : 'stone');
  g.ui = () => ({ rocket: g.rc / (RCD * (g.frenzy > 0 ? 0.35 : 1)), stone: g.sc / (SCD * (g.frenzy > 0 ? 0.35 : 1)), frenzy: g.frenzy > 0 });
  g.result = () => ({ score: Math.min(1000, Math.round(g.kills * 16 + g.hp * 2.5 + g.supplies * 30)), note: `격퇴 ${g.kills}명 · 산성 체력 ${Math.round(g.hp)} · 보급대 ${g.supplies}회` });
  g.draw = function (c) {
    c.save(); if (g.shake > 0) c.translate(rand(-3, 3), rand(-3, 3));
    vgrad(c, 0, 0, GW, GH, '#39483A', '#5E6B48');
    c.save(); c.setLineDash([6, 10]); c.strokeStyle = 'rgba(226,194,115,.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, ZONE); c.lineTo(GW, ZONE); c.stroke(); c.restore();
    txt(c, '▲ 위쪽 전체: 신기전', GW - 12, ZONE - 8, { size: 14, align: 'right', color: 'rgba(226,194,115,.95)', stroke: C.ink, sw: 3 });
    txt(c, '▼ 아래쪽 가까운 적: 돌 던지기', GW - 12, ZONE + 20, { size: 14, align: 'right', color: 'rgba(233,237,230,.95)', stroke: C.ink, sw: 3 });
    txt(c, '방패 부대(파란 표시)는 신기전이 통하지 않아요! 돌 던지기로만 처치', 14, ZONE + 20, { size: 13, color: 'rgba(159,209,255,.95)', stroke: C.ink, sw: 3 });
    for (const e of g.enemies.slice().sort((a, b) => a.y - b.y)) {
      const sc = 0.95 + 0.3 * clamp(e.y / FY, 0, 1);
      if (e.shield && !e.dead) { c.strokeStyle = 'rgba(120,180,226,.9)'; c.lineWidth = 3; c.beginPath(); c.ellipse(e.x, e.y - 2, 24 * sc, 8 * sc, 0, 0, 7); c.stroke(); }
      if (e.dead) drawSoldier(c, 'jp', 'fall', e.x, e.y, sc, g.t, { alpha: 1 - e.dieT / 0.4 });
      else drawSoldier(c, 'jp', e.reached ? 'shoot' : 'front', e.x, e.y, sc, e.ph / 7, {});
      if (e.shield && !e.dead) txt(c, '방패', e.x, e.y - 108 * sc / 0.95, { size: 12, align: 'center', color: '#9FD1FF', stroke: C.ink, sw: 3 });
    }
    c.fillStyle = '#2A2B24'; c.fillRect(0, FY + 6, GW, GH - FY);
    for (let x = 0; x < GW; x += 22) { c.fillStyle = '#7A5A3A'; c.beginPath(); c.moveTo(x + 2, FY + 16); c.lineTo(x + 11, FY - 10); c.lineTo(x + 20, FY + 16); c.closePath(); c.fill(); }
    for (let i = 0; i < 7; i++) drawSoldier(c, 'js', 'back', 60 + i * 101, FY + 64, 0.95, 0, { shadow: 0 });
    c.fillStyle = '#2E6E86'; c.fillRect(GW / 2 + 1, FY - 34, 40, 22); txt(c, '권', GW / 2 + 21, FY - 17, { size: 16, align: 'center', serif: true, w: 900, color: '#F1E9D6' });
    if (g.supplyT > 0) women.forEach(w => { if (w.x > -30 && w.x < GW + 30) { const yy = FY + 60; c.fillStyle = '#B5352A'; c.beginPath(); c.moveTo(w.x - 9, yy - 12); c.lineTo(w.x + 9, yy - 12); c.lineTo(w.x + 13, yy + 12); c.lineTo(w.x - 13, yy + 12); c.closePath(); c.fill(); c.fillStyle = '#E0B48F'; c.beginPath(); c.arc(w.x, yy - 32, 7, 0, 7); c.fill(); } });
    FX.draw(c, g.fx); c.restore();
    bar(c, 14, 12, 190, 18, g.hp / 100, g.hp > 40 ? '#7FB7A4' : '#C4432F'); txt(c, `산성 ${Math.round(g.hp)}`, 22, 26, { size: 12, color: C.por, stroke: C.ink, sw: 3 });
    bar(c, GW / 2 - 130, 12, 260, 18, g.gauge / 100, g.frenzy > 0 ? '#E2C273' : '#B5352A'); txt(c, g.frenzy > 0 ? '행주치마 보급 중!' : '행주치마 게이지: 번갈아 누르기', GW / 2, 26, { size: 12, align: 'center', color: C.por, stroke: C.ink, sw: 3 });
    txt(c, `격퇴 ${g.kills}`, GW - 14, 28, { size: 20, align: 'right', stroke: C.ink });
    bar(c, 14, 36, 190, 8, 1 - g.t / g.dur, C.gold);
    if (g.over) { c.fillStyle = 'rgba(15,26,40,.65)'; c.fillRect(0, 0, GW, GH); txt(c, g.hp <= 0 ? '산성이 위태롭습니다!' : '행주산성을 지켜 냈습니다', GW / 2, 220, { size: 32, serif: true, w: 900, align: 'center' }); }
  };
  return g;
}

/* Stage 7. 명량: 울돌목 조류 서바이벌 — 물살 1.2배, 왜선 절반만 화살 사격 */
function gMyeongnyang() {
  const LM = 96, RM = GW - 96, FY = 372, ACC = 1.2, BASE = 62 * ACC, SURGE = 105 * ACC, PEN = 25;
  const g = { dur: 30, t: 0, fleet: 13, sunk: 0, hits: 0, wallHits: 0, enemies: [], arrows: [], fx: [], spawnT: 0.9, done: false, over: false, overT: 0, curV: 0, curDir: 1, surge: 0, warn: false, flips: [6, 12.5, 19, 25.5], fi: 0, left: false, right: false, flag: { x: GW / 2, vx: 0, inv: 0, cool: 0.4, hurt: 0, wallCd: 0 }, controls: { kind: 'steer' } };
  const marks = []; for (let i = 0; i < 40; i++) marks.push({ x: rand(LM, RM), y: rand(0, GH), l: rand(14, 30) });
  const shoreL = [], shoreR = []; for (let y = 0; y <= GH + 20; y += 20) { shoreL.push(LM - rand(0, 24)); shoreR.push(RM + rand(0, 24)); }
  function sink(e) { if (e.sink) return; e.sink = 0.001; g.sunk++; FX.splash(g.fx, e.x, e.y + 16, { n: 5 }); FX.add(g.fx, { k: 'smoke', x: e.x, y: e.y, r: 16, life: 1.2 }); }
  g.update = function (dt) {
    FX.step(g.fx, dt);
    if (g.over) { g.overT += dt; if (g.overT > 1.8) g.done = true; return; }
    g.t += dt; const p = g.t / g.dur, f = g.flag;
    if (g.fi < g.flips.length) {
      const ft = g.flips[g.fi]; g.warn = g.t > ft - 1.4 && g.t < ft;
      if (g.t >= ft) { g.curDir *= -1; g.surge = 2.4; g.fi++; g.warn = false; FX.add(g.fx, { k: 'txt', s: '물살이 바뀌었다!', x: GW / 2, y: 170, size: 26, life: 1.3 }); }
    } else g.warn = false;
    g.surge = Math.max(0, g.surge - dt);
    g.curV += (g.curDir * (g.surge > 0 ? SURGE : BASE) - g.curV) * Math.min(1, dt * 2.5);
    marks.forEach(m => { m.x += g.curV * dt * 1.2; m.y += 20 * dt; if (m.x < LM - 10) m.x = RM; if (m.x > RM + 10) m.x = LM; if (m.y > GH) m.y = 0; });
    g.spawnT -= dt;
    if (g.spawnT <= 0) { g.spawnT = rand(0.7, 1.0) * (1 - 0.15 * p); g.enemies.push({ x: rand(LM + 34, RM - 34), y: -40, vy: rand(62, 96), k: rand(0.45, 1.7), f: rand(0.8, 1.8), ph: rand(0, 6), sink: 0, canShoot: Math.random() < 0.5, shootT: rand(1.0, 2.0), aim: 0, flash: 0 }); }
    const mult = g.surge > 0 ? 2.2 : 1;
    for (const e of g.enemies) {
      if (e.sink) { e.sink += dt; continue; }
      e.x += (g.curV * mult * e.k + Math.sin(g.t * e.f + e.ph) * 14) * dt; e.y += e.vy * dt;
      if (e.x < LM + 8 || e.x > RM - 8) sink(e);
      e.flash = Math.max(0, e.flash - dt);
      if (e.canShoot) {
        if (e.aim > 0) { e.aim -= dt; if (e.aim <= 0) { const tx = f.x + f.vx * 0.35, ty = FY, d = dist(e.x, e.y, tx, ty) || 1; g.arrows.push({ x: e.x, y: e.y + 10, vx: (tx - e.x) / d * 215, vy: (ty - e.y) / d * 215 }); e.flash = 0.25; } }
        else { e.shootT -= dt; if (e.shootT <= 0 && e.y > 30 && e.y < FY - 110) { e.aim = 0.45; e.shootT = rand(1.7, 2.6); } }
      }
    }
    const alive = g.enemies.filter(e => !e.sink);
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) { const a = alive[i], b = alive[j]; if (dist(a.x, a.y, b.x, b.y) < 34) { sink(a); sink(b); FX.add(g.fx, { k: 'burst', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: 36, life: 0.5 }); } }
    g.enemies = g.enemies.filter(e => e.sink < 0.7 && e.y < GH + 50);
    const dir = (g.right ? 1 : 0) - (g.left ? 1 : 0);
    f.vx += (dir * 190 - f.vx) * Math.min(1, dt * 6);
    const desiredX = f.x + (f.vx + g.curV * 0.5) * dt, hitWall = desiredX < LM + 20 || desiredX > RM - 20;
    f.x = clamp(desiredX, LM + 20, RM - 20);
    f.wallCd = Math.max(0, f.wallCd - dt);
    if (hitWall && f.wallCd <= 0) {
      f.wallCd = 0.8; g.wallHits++; f.hurt = Math.max(f.hurt, 0.35);
      FX.add(g.fx, { k: 'txt', s: `벽에 부딪혔다! -${PEN}점`, x: f.x, y: FY - 56, size: 20, c: '#FF8E7A', life: 1.0 });
      FX.add(g.fx, { k: 'burst', x: f.x, y: FY, r: 30, life: 0.4 });
    }
    f.inv = Math.max(0, f.inv - dt); f.hurt = Math.max(0, f.hurt - dt); f.cool -= dt;
    for (const a of g.arrows) {
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (f.hurt <= 0 && Math.abs(a.x - f.x) < 16 && Math.abs(a.y - FY) < 30) { a.gone = true; g.hits++; f.hurt = 0.6; FX.add(g.fx, { k: 'txt', s: `화살 명중! -${PEN}점`, x: f.x, y: FY - 56, size: 20, c: '#FF8E7A', life: 1.0 }); }
    }
    g.arrows = g.arrows.filter(a => !a.gone && a.y < GH + 30 && a.x > -30 && a.x < GW + 30);
    for (const e of g.enemies) { if (e.sink) continue; if (dist(e.x, e.y, f.x, FY) < 36) { sink(e); if (f.inv <= 0) { g.fleet--; f.inv = 1.2; FX.add(g.fx, { k: 'txt', s: '전선 -1', x: f.x, y: FY - 44, size: 20, c: '#E8A29A', life: 0.9 }); } } }
    if (f.cool <= 0) { let best = null; for (const e of g.enemies) { if (e.sink) continue; if (e.y < FY - 24 && e.y > FY - 285 && Math.abs(e.x - f.x) < 58 && (!best || e.y > best.y)) best = e; } if (best) { f.cool = 0.6; sink(best); FX.muzzle(g.fx, f.x, FY - 26, 1); FX.explode(g.fx, best.x, best.y, { r: 26, n: 6, smoke: 2 }); FX.add(g.fx, { k: 'line', x0: f.x, y0: FY - 26, x1: best.x, y1: best.y, life: 0.25, c: '#FFE7A8', w: 4 }); } }
    if (g.fleet <= 0) { g.fleet = 0; g.over = true; } else if (g.t >= g.dur) { g.over = true; g.t = g.dur; }
  };
  g.action = (n, d) => { if (n === 'left') g.left = d !== false; if (n === 'right') g.right = d !== false; };
  const setSide = (x) => { g.left = x < GW / 2; g.right = x >= GW / 2; };
  g.onDown = (x) => setSide(x); g.onMove = (x, y, down) => { if (down) setSide(x); }; g.onUp = () => { g.left = false; g.right = false; };
  g.ui = () => ({});
  g.result = () => ({ score: clamp(g.sunk * 34 + g.fleet * 10 - g.hits * PEN - g.wallHits * PEN, 0, 1000), note: `격침 ${g.sunk}척 · 남은 전선 ${g.fleet}척` + (g.hits ? ` · 화살 ${g.hits}회 맞음(-${g.hits * PEN})` : '') + (g.wallHits ? ` · 벽 충돌 ${g.wallHits}회(-${g.wallHits * PEN})` : '') });
  g.draw = function (c) {
    if (!Spr.bg(c, 'bgSea', { px: 0.5, py: 0.5 })) vgrad(c, 0, 0, GW, GH, '#12475A', '#0C3242');
    c.fillStyle = 'rgba(6,42,66,.42)'; c.fillRect(0, 0, GW, GH);
    c.strokeStyle = 'rgba(235,250,255,.4)'; c.lineWidth = 2; c.lineCap = 'round';
    marks.forEach(m => { const s = Math.sign(g.curV) || 1; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + s * m.l, m.y); c.stroke(); });
    c.fillStyle = '#2A3138'; c.beginPath(); c.moveTo(0, 0); shoreL.forEach((x, i) => c.lineTo(x, i * 20)); c.lineTo(0, GH + 20); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(GW, 0); shoreR.forEach((x, i) => c.lineTo(x, i * 20)); c.lineTo(GW, GH + 20); c.closePath(); c.fill();
    const f = g.flag;
    for (const e of g.enemies) {
      if (e.sink) { if (!Spr.draw(c, 'shjp', 3, 4, e.x, e.y + 22, 0.66, { alpha: Math.max(0, 1 - e.sink / 0.7) })) shipVec(c, e.x, e.y, 0.5, 1, { alpha: Math.max(0, 1 - e.sink / 0.7) }); }
      else {
        if (e.aim > 0) { c.fillStyle = 'rgba(232,70,50,.35)'; c.beginPath(); c.arc(e.x, e.y, 34, 0, 7); c.fill(); txt(c, '!', e.x, e.y - 34, { size: 24, align: 'center', color: '#FF6A55', stroke: C.ink, sw: 4 }); }
        const fr = e.flash > 0 ? 0 : 1, row = e.flash > 0 ? 2 : 1;
        if (!Spr.draw(c, 'shjp', row, fr, e.x, e.y, 0.78, { anchor: 'c' })) shipVec(c, e.x, e.y, 0.6, 1, {});
        if (e.canShoot) txt(c, '활', e.x, e.y + 24, { size: 11, align: 'center', color: '#FFD7CE', stroke: C.ink, sw: 3 });
      }
    }
    for (const a of g.arrows) { const ang = Math.atan2(a.vy, a.vx); c.save(); c.translate(a.x, a.y); c.rotate(ang); c.strokeStyle = '#4A3324'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, 0); c.lineTo(8, 0); c.stroke(); c.restore(); }
    if (!Spr.draw(c, 'shpo', 0, 0, f.x, FY, 0.72, { anchor: 'c', alpha: (f.inv > 0 || f.hurt > 0) && Math.floor(g.t * 12) % 2 === 0 ? 0.4 : 1 })) shipVec(c, f.x, FY, 0.7, 1, {});
    FX.draw(c, g.fx);
    txt(c, `격침 ${g.sunk}`, 14, 28, { size: 20, stroke: C.ink });
    let hy = 60;
    if (g.hits) { txt(c, `화살 ${g.hits}회 맞음 -${g.hits * PEN}`, 14, hy, { size: 15, color: '#FF9A88', stroke: C.ink, sw: 4 }); hy += 22; }
    if (g.wallHits) { txt(c, `벽 충돌 ${g.wallHits}회 -${g.wallHits * PEN}`, 14, hy, { size: 15, color: '#FF9A88', stroke: C.ink, sw: 4 }); hy += 22; }
    const s = Math.sign(g.curV) || 1, cx = GW / 2; c.fillStyle = g.warn ? '#FFB3A3' : 'rgba(255,255,255,.95)';
    c.beginPath(); c.moveTo(cx + s * 30, 20); c.lineTo(cx + s * 10, 8); c.lineTo(cx + s * 10, 32); c.closePath(); c.fill();
    for (let i = 0; i < 13; i++) { const ok = i < g.fleet; c.globalAlpha = ok ? 1 : 0.22; if (!Spr.draw(c, 'shpo', 0, 1, GW - 22 - i * 24, 24, 0.2, {})) shipVec(c, GW - 22 - i * 24, 24, 0.2, 1, {}); c.globalAlpha = 1; }
    bar(c, 14, 40 + (g.hits ? 22 : 0) + (g.wallHits ? 22 : 0), 190, 8, 1 - g.t / g.dur, C.gold);
    if (g.warn) { c.fillStyle = 'rgba(196,67,47,.12)'; c.fillRect(0, 0, GW, GH); txt(c, '곧 물살이 바뀝니다!', GW / 2, 130, { size: 28, align: 'center', serif: true, w: 900, stroke: C.ink, sw: 6, color: '#FFD7CE' }); }
    if (g.over) { c.fillStyle = 'rgba(15,26,40,.65)'; c.fillRect(0, 0, GW, GH); txt(c, g.fleet > 0 ? '울돌목을 지켜 냈습니다' : '함대가 흩어졌습니다', GW / 2, 220, { size: 32, serif: true, w: 900, align: 'center' }); }
  };
  return g;
}

/* ============================================================
   Stage 8. 노량: 밤바다의 추격 — 왜선을 관음포로 몰아넣어라
   [역사 체험] 1598년 11월 19일 새벽. 순천에 갇힌 고니시를 구하러 온
   왜 수군이 노량 해협을 지나 서쪽으로 빠져나가려 했습니다.
   조·명 연합 함대는 밤새 불화살과 화포로 공격했고, 쫓긴 왜선들은
   빠져나갈 길로 착각한 관음포로 몰려 들어가 크게 무너졌습니다.
   ============================================================ */
function gNoryang() {
  const DUR = 50, SPEED = 150, TURN = 4.0, FIRE_R = 74, FLEE_R = 150, BURN_T = 2.4;
  const BAY = { x0: 88, x1: 262, y0: 286, y1: 366 };   // 관음포: 동쪽으로 열린 만
  const EXIT_Y = 138;                                    // 서쪽 탈출로(순천·광양 방면) 한가운데
  const DECIDE_Y = 262;                                  // 이 선보다 남쪽으로 몰린 왜선은 관음포로 향함
  function inLand(x, y) {
    if (y < 26) return true;                            // 북쪽 해안(하동)
    if (x > 262 && y > 404) return true;                // 남해도 북쪽 해안
    if (x < 262 && y > 250) return !(x > BAY.x0 && y > BAY.y0 && y < BAY.y1); // 관음포 둘레의 땅
    return false;
  }
  const inBay = (x, y) => x > BAY.x0 && x < BAY.x1 + 4 && y > BAY.y0 && y < BAY.y1;
  const g = { dur: DUR, t: 0, burned: 0, trapped: 0, escaped: 0, fx: [], done: false, over: false, overT: 0, key: 0, spawnT: 0.2, shake: 0,
    controls: { kind: 'hint', hint: '누른 채 움직이면 대장선이 따라갑니다. 왜선을 아래쪽 관음포로 몰고, 바짝 붙어 불화살로 태우세요' } };
  const head = { x: 560, y: 150, ang: Math.PI }, tgt = { x: 560, y: 150, on: false };
  const ming = { x: 430, y: 66, dir: 1 };
  const ships = [];
  g.ships = ships; g.head = head;   // (점검용) 현재 왜선·대장선 상태
  function spawn() {
    for (let k = 0; k < 20; k++) {
      const y = rand(50, 285); if (inLand(GW - 10, y)) continue;   // 좁은 노량 해협(북쪽 물길)으로 들어옴
      ships.push({ x: GW + 30, y, vx: -45, vy: 0, heat: 0, burn: 0, sink: 0, trapped: false, trapT: 0, f: pick([0, 1, 2]) }); return;
    }
  }
  const norm = (a) => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  function tryMove(o, dx, dy) {
    if (!inLand(o.x + dx, o.y + dy)) { o.x += dx; o.y += dy; return 0; }
    if (!inLand(o.x + dx, o.y)) { o.x += dx; return 1; }
    if (!inLand(o.x, o.y + dy)) { o.y += dy; return 2; }
    return 3;
  }
  g.update = function (dt) {
    FX.step(g.fx, dt); g.shake = Math.max(0, g.shake - dt);
    if (g.over) { g.overT += dt; if (g.overT > 2.6) g.done = true; return; }
    g.t += dt;
    // 적 증원
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.t < DUR - 6) { g.spawnT = rand(1.1, 1.7); spawn(); if (Math.random() < 0.25) spawn(); }
    // 대장선: 누르고 있는 곳으로 향함
    const d = dist(head.x, head.y, tgt.x, tgt.y);
    let sp = 32;
    if (g.key) { head.ang += g.key * TURN * dt; sp = SPEED; }
    else if (tgt.on && d > 14) { head.ang += clamp(norm(Math.atan2(tgt.y - head.y, tgt.x - head.x) - head.ang), -TURN * dt, TURN * dt); sp = SPEED * clamp(d / 60, 0.35, 1); }
    tryMove(head, Math.cos(head.ang) * sp * dt, Math.sin(head.ang) * sp * dt);
    head.x = clamp(head.x, 16, GW - 16); head.y = clamp(head.y, 30, GH - 16);
    // 명 수군(진린)의 순찰
    ming.x += ming.dir * 38 * dt; if (ming.x > 540) ming.dir = -1; if (ming.x < 320) ming.dir = 1;
    // 왜선
    for (const s of ships) {
      if (s.sink) { s.sink += dt; continue; }
      if (s.burn) { s.burn += dt; if (s.burn >= BURN_T) { s.sink = 0.001; g.burned++; FX.explode(g.fx, s.x, s.y - 10, { r: 30, n: 6, smoke: 3, dc: '#2A1C12' }); FX.splash(g.fx, s.x, s.y + 12, { n: 5 }); g.shake = 0.15; } }
      let dvx, dvy;
      if (s.trapped) { s.trapT += dt; dvx = Math.sin(g.t * 1.3 + s.y) * 14; dvy = Math.cos(g.t * 1.1 + s.x) * 10; if (s.trapT > 1.2 && !s.burn) { s.heat = 1; } }
      else {
        // 북쪽 절반의 왜선은 서쪽 탈출로로, 남쪽으로 몰린 왜선은 관음포를 탈출로로 착각하고 그리로 향합니다.
        const toBay = s.y > DECIDE_Y, tx = toBay ? (s.x > BAY.x1 + 10 ? BAY.x1 - 10 : BAY.x0 + 20) : -40, ty = toBay ? (BAY.y0 + BAY.y1) / 2 : EXIT_Y;
        const td = dist(s.x, s.y, tx, ty) || 1; dvx = (tx - s.x) / td * 48; dvy = (ty - s.y) / td * 48;
        const fd = dist(s.x, s.y, head.x, head.y);
        if (fd < FLEE_R) { const k = (1 - fd / FLEE_R) * 125; dvx += (s.x - head.x) / (fd || 1) * k; dvy += (s.y - head.y) / (fd || 1) * k; }
        const md = dist(s.x, s.y, ming.x, ming.y);
        if (md < 100) { const k = (1 - md / 100) * 70; dvx += (s.x - ming.x) / (md || 1) * k; dvy += (s.y - ming.y) / (md || 1) * k; }
      }
      const slow = s.burn ? 0.45 : 1;
      s.vx += (dvx * slow - s.vx) * Math.min(1, dt * 2.4); s.vy += (dvy * slow - s.vy) * Math.min(1, dt * 2.4);
      const r = tryMove(s, s.vx * dt, s.vy * dt);
      if (r === 1 && !s.trapped) s.vy *= 0.5; if (r === 3) { s.vx *= -0.3; s.vy = (s.y > 250 ? -1 : 1) * 30; }
      if (!s.trapped && inBay(s.x, s.y)) { s.trapped = true; g.trapped++; FX.add(g.fx, { k: 'txt', s: '관음포에 갇혔다!', x: s.x, y: s.y - 30, size: 16, c: '#9CE0B8', life: 0.9 }); }
      // 불붙이기: 대장선 불화살 / 명 수군 / 옮겨 붙는 불
      if (!s.burn) {
        if (dist(s.x, s.y, head.x, head.y) < FIRE_R) { s.heat += dt * 0.95; if (Math.random() < dt * 6) FX.add(g.fx, { k: 'line', x0: head.x, y0: head.y - 16, x1: s.x + rand(-10, 10), y1: s.y - 14, life: 0.25, c: '#FFB35A', w: 2 }); }
        if (dist(s.x, s.y, ming.x, ming.y) < 64) s.heat += dt * 0.9;
        for (const o of ships) if (o !== s && o.burn && !o.sink && dist(s.x, s.y, o.x, o.y) < 46) s.heat += dt * 0.5;
        if (s.heat >= 1) { s.burn = 0.001; FX.add(g.fx, { k: 'txt', s: '불붙었다!', x: s.x, y: s.y - 30, size: 15, c: '#FFC37A', life: 0.7 }); }
      }
      if (s.x < -20 && !s.sink) { s.gone = true; if (!s.burn) { g.escaped++; FX.add(g.fx, { k: 'txt', s: '한 척 빠져나갔다', x: 70, y: s.y, size: 15, c: '#FF9A88', life: 1.0 }); } }
      if (Math.random() < dt * (s.burn ? 4 : 0)) FX.add(g.fx, { k: 'smoke', x: s.x + rand(-8, 8), y: s.y - 24, r: rand(8, 14), vy: -30, life: 1.4 });
    }
    for (let i = ships.length - 1; i >= 0; i--) if (ships[i].gone || ships[i].sink > 1.2) ships.splice(i, 1);
    if (g.t >= DUR) { g.over = true; g.t = DUR; }
  };
  g.onDown = (x, y) => { tgt.x = x; tgt.y = y; tgt.on = true; };
  g.onMove = (x, y, down) => { if (down) { tgt.x = x; tgt.y = y; tgt.on = true; } };
  g.onUp = () => { tgt.on = false; };
  g.action = (n, d) => { g.key = n === 'left' ? (d === false ? 0 : -1) : (n === 'right' ? (d === false ? 0 : 1) : g.key); };
  g.ui = () => ({});
  g.result = () => ({ score: clamp(g.burned * 18 + g.trapped * 24 - g.escaped * 20, 0, 1000), note: `불태운 왜선 ${g.burned}척 · 관음포에 가둔 왜선 ${g.trapped}척` + (g.escaped ? ` · 빠져나간 왜선 ${g.escaped}척(-${g.escaped * 20})` : '') });
  function side(c, key, rowR, colR, rowL, colL, x, y, ang, s, o = {}) { const right = Math.cos(ang) >= 0, tilt = clamp(Math.sin(ang) * 0.45, -0.45, 0.45) * (right ? 1 : -1); return Spr.draw(c, key, right ? rowR : rowL, right ? colR : colL, x, y, s, Object.assign({ anchor: 'c', rot: tilt }, o)); }
  // 해안선: 직선 모서리를 잘게 나눠 살짝 구불구불하게 그립니다 (충돌 판정은 단순한 사각형 그대로).
  function coast(c, pts) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
      const nx = -(y1 - y0) / (Math.hypot(x1 - x0, y1 - y0) || 1), ny = (x1 - x0) / (Math.hypot(x1 - x0, y1 - y0) || 1);
      for (let k = 1; k <= n; k++) { const t = k / n, w = (k === n ? 0 : Math.sin((x0 + y0) * 0.07 + k * 1.9) * 4); c.lineTo(x0 + (x1 - x0) * t + nx * w, y0 + (y1 - y0) * t + ny * w); }
    }
    c.closePath(); c.fill();
  }
  function drawLand(c) {
    c.fillStyle = '#26301F';
    coast(c, [[0, 0], [GW, 0], [GW, 24], [0, 24]]);
    coast(c, [[0, 250], [240, 250], [262, 262], [262, BAY.y0], [BAY.x0 + 20, BAY.y0], [BAY.x0, BAY.y0 + 18], [BAY.x0, BAY.y1 - 18], [BAY.x0 + 20, BAY.y1], [262, BAY.y1], [262, 392], [280, 404], [GW, 404], [GW, GH], [0, GH]]);
    c.strokeStyle = 'rgba(190,210,190,.25)'; c.lineWidth = 2; c.stroke();
  }
  g.draw = function (c) {
    c.save(); if (g.shake > 0) c.translate(rand(-3, 3), rand(-2, 2));
    if (!Spr.bg(c, 'bgSea', { px: 0.5, py: 0.5 })) vgrad(c, 0, 0, GW, GH, '#08131F', '#12283A');
    drawLand(c);
    for (const s of ships) {
      const flip = s.vx < 0;
      if (s.sink) { const k = s.sink, sf = k < 0.3 ? 3 : (k < 0.65 ? 4 : (k < 0.95 ? 5 : 6)); Spr.draw(c, 'shjp', 3, sf, s.x, s.y + 8, 0.6, { anchor: 'c', flip, alpha: Math.max(0, 1 - k / 1.2) }) || shipVec(c, s.x, s.y, 0.45, 1, { alpha: 0.5 }); }
      else if (!Spr.draw(c, 'shjp', 3, s.f, s.x, s.y, 0.6, { anchor: 'c', flip })) shipVec(c, s.x, s.y, 0.45, flip ? -1 : 1, {});
    }
    if (!Spr.draw(c, 'shpo', 0, ming.dir > 0 ? 1 : 3, ming.x, ming.y, 0.5, { anchor: 'c' })) shipVec(c, ming.x, ming.y, 0.4);
    // 밤 → 새벽: 어둠이 점점 걷힙니다
    const dawn = clamp((g.t - DUR * 0.55) / (DUR * 0.45), 0, 1);
    c.fillStyle = `rgba(4,10,28,${0.58 - 0.44 * dawn})`; c.fillRect(0, 0, GW, GH);
    if (dawn > 0) { const gr = c.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, `rgba(255,150,90,${0.32 * dawn})`); gr.addColorStop(1, 'rgba(255,150,90,0)'); c.fillStyle = gr; c.fillRect(0, 0, GW, 160); }
    // 불빛은 어둠 위에 그려서 밤바다에서 빛나게
    for (const s of ships) if (s.burn && !s.sink) flame(c, s.x, s.y - 6, 0.7, g.t + s.y);
    for (const s of ships) if (!s.burn && !s.sink && s.heat > 0.05) { c.fillStyle = `rgba(255,170,80,${0.5 * s.heat})`; c.beginPath(); c.arc(s.x, s.y - 8, 6 + 10 * s.heat, 0, 7); c.fill(); }
    c.save(); c.setLineDash([5, 7]); c.strokeStyle = 'rgba(255,190,110,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(head.x, head.y, FIRE_R, 0, 7); c.stroke();
    c.setLineDash([3, 9]); c.strokeStyle = 'rgba(156,224,184,.55)'; c.beginPath(); c.moveTo(262, DECIDE_Y); c.lineTo(GW, DECIDE_Y); c.stroke(); c.restore();
    txt(c, '▼ 이 선 아래로 몰린 왜선은 관음포를 탈출로로 착각해요', GW - 10, DECIDE_Y - 7, { size: 12, align: 'right', color: '#9CE0B8', stroke: C.ink, sw: 3 });
    const hg = c.createRadialGradient(head.x, head.y, 4, head.x, head.y, 90); hg.addColorStop(0, 'rgba(255,220,150,.28)'); hg.addColorStop(1, 'rgba(255,220,150,0)'); c.fillStyle = hg; c.fillRect(head.x - 90, head.y - 90, 180, 180);
    if (!side(c, 'shgb', 0, 6, 0, 7, head.x, head.y, head.ang, 0.62)) shipVec(c, head.x, head.y, 0.55, 1, {});
    txt(c, '대장선', head.x, head.y - 34, { size: 12, align: 'center', color: C.gold2, stroke: C.ink, sw: 3 });
    txt(c, '명 수군(진린)', ming.x, ming.y - 22, { size: 11, align: 'center', color: '#BFD4F2', stroke: C.ink, sw: 3 });
    FX.draw(c, g.fx);
    txt(c, '관음포', (BAY.x0 + BAY.x1) / 2, BAY.y0 + 44, { size: 18, align: 'center', serif: true, w: 900, color: '#F1E9D6', stroke: C.ink, sw: 4 });
    txt(c, '← 순천·광양 방면 (적의 탈출로)', 10, 70, { size: 13, color: '#FFB3A3', stroke: C.ink, sw: 3 });
    txt(c, '노량 해협 →', GW - 12, 54, { size: 13, align: 'right', color: '#E0E6DF', stroke: C.ink, sw: 3 });
    txt(c, '남해도', 130, 420, { size: 14, align: 'center', color: '#C9D2CB', stroke: C.ink, sw: 3 });
    c.restore();
    txt(c, `불태움 ${g.burned} · 관음포 ${g.trapped}`, 14, 28, { size: 18, stroke: C.ink });
    if (g.escaped) txt(c, `빠져나감 ${g.escaped}`, GW - 14, 28, { size: 18, align: 'right', color: '#FF9A88', stroke: C.ink });
    bar(c, 14, 38, 190, 8, 1 - g.t / DUR, C.gold);
    if (g.t < 6) txt(c, '왜선은 왼쪽 위 탈출로로 달아나려 합니다. 위쪽에서 눌러 초록 선 아래로 몰아내세요!', GW / 2, GH - 46, { size: 15, align: 'center', color: C.por, stroke: C.ink, sw: 4, alpha: clamp(6 - g.t, 0, 1) });
    if (g.t > DUR * 0.8 && g.t < DUR * 0.8 + 3) txt(c, '날이 밝아 옵니다…', GW / 2, 120, { size: 24, align: 'center', serif: true, w: 900, color: '#FFE2C0', stroke: C.ink, sw: 5 });
    if (g.over) {
      const a = clamp(g.overT / 0.7, 0, 1); c.fillStyle = `rgba(8,19,31,${0.72 * a})`; c.fillRect(0, 0, GW, GH);
      txt(c, '노량의 새벽 — 7년 전쟁의 마지막 싸움', GW / 2, 196, { size: 28, serif: true, w: 900, align: 'center', alpha: a });
      txt(c, `불태운 왜선 ${g.burned}척 · 관음포에 가둔 왜선 ${g.trapped}척`, GW / 2, 236, { size: 18, align: 'center', color: C.gold2, alpha: a });
    }
  };
  return g;
}

const GAMES = {
  DEFENSE_TAP: gDefense, TIMING_SHOOT: gOkpo, HAKIKJIN_TIMING: gHansan, AMBUSH_WHACK: gUibyeong,
  SLINGSHOT_CANNON: gPyongyang, DUAL_TAP_DEFENSE: gHaengju, CURRENT_SURVIVAL: gMyeongnyang, NIGHT_HERD: gNoryang
};
