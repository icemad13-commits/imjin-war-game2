/* ============================================================
   앱 진행 로직 (화면 전환, 저장, 채점, 최종 보고서, 순위표, 교사용)
   ============================================================ */
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmt = (n) => Math.round(n).toLocaleString('ko-KR');

/* ---------- 로컬 저장 (이 크롬북에만 저장됨) ---------- */
let storeOK = true;
try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { storeOK = false; }
const mem = {};
const store = {
  get(k) { try { if (storeOK) { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } } catch (e) { } return k in mem ? mem[k] : null; },
  set(k, v) { mem[k] = v; try { if (storeOK) localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { delete mem[k]; try { if (storeOK) localStorage.removeItem(k); } catch (e) { } }
};
const SAVE_KEY = 'imjin_war_save_v2';
function saveGame() { store.set(SAVE_KEY, { v: 2, player: G.player, results: G.results, essay: G.essay, startedAt: G.startedAt, finishedAt: G.finishedAt, submitted: G.submitted }); }
function loadGame() { return store.get(SAVE_KEY); }

const G = {
  player: { sid: '', name: '' }, stage: 0, phase: 'TITLE',
  results: Array(8).fill(null), retryUsed: Array(8).fill(false),
  essay: '', submitted: false,
  startedAt: 0, finishedAt: 0, pick: null, order: []
};
function totalScore() { return G.results.reduce((a, r) => a + (r ? r.total : 0), 0); }

/* ---------- 인물·유물 카드 도감 (처음부터 다시 해도 사라지지 않도록 따로 저장) ---------- */
const CARD_KEY = 'imjin_cards_v1';
function getCards() { const v = store.get(CARD_KEY); return Array.isArray(v) ? v : []; }
function addCards(ids) { const have = getCards(), fresh = ids.filter(id => !have.includes(id)); if (fresh.length) store.set(CARD_KEY, have.concat(fresh)); return fresh; }
const CARD_TYPE_CLS = { '인물': 'person', '유물': 'relic', '전술': 'tactic', '장소': 'place', '기록': 'record' };
const sealHTML = (han, big) => { const ch = [...han]; return `<span class="card-seal${big ? ' big' : ''}${ch.length > 3 ? ' long' : ''}">${ch.map(c => `<i>${esc(c)}</i>`).join('')}</span>`; };
function cardHTML(cd, o = {}) {
  const locked = !!o.locked, cls = `card type-${CARD_TYPE_CLS[cd.type] || 'relic'}${locked ? ' locked' : ''}${o.flip ? ' flip-in' : ''}${o.isNew ? ' is-new' : ''}`;
  const front = locked
    ? `<span class="card-type">?</span><span class="card-seal">?</span><b class="card-name">잠긴 카드</b><small class="card-sub">${esc(STAGES[cd.stage].short)} 전투에서 획득</small>`
    : `<span class="card-type">${esc(cd.type)}</span>${sealHTML(cd.han)}<b class="card-name${cd.name.length > 5 ? ' long' : ''}">${esc(cd.name)}</b><small class="card-sub">${esc(cd.sub)}</small>`;
  return `<button type="button" class="${cls}" data-id="${cd.id}" style="--d:${o.delay || 0}s"${locked ? ' disabled' : ''}><span class="card-in"><span class="card-face card-back"><span>壬辰</span></span><span class="card-face card-front">${front}</span></span>${o.isNew ? '<span class="card-new">NEW</span>' : ''}</button>`;
}
function openCardDetail(id) {
  const cd = CARDS.find(c => c.id === id); if (!cd) return;
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal card-detail type-${CARD_TYPE_CLS[cd.type]}"><div class="cd-head">${sealHTML(cd.han, true)}<div><span class="card-type">${esc(cd.type)}</span><h3>${esc(cd.name)}</h3><small>${esc(cd.sub)}</small></div></div><p>${esc(cd.text)}</p><p class="help">${esc(STAGES[cd.stage].title)} · ${esc(STAGES[cd.stage].date)}</p><div class="actions"><button class="btn primary sm" id="cd-close">닫기</button></div></div>`;
  document.body.appendChild(back);
  $('#cd-close', back).onclick = () => back.remove();
  back.onclick = (e) => { if (e.target === back) back.remove(); };
}
function bindCards(scope) { scope.querySelectorAll('.card:not(.locked)').forEach(b => b.onclick = () => openCardDetail(b.dataset.id)); }
function openCodex() {
  const have = getCards();
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal codex"><h3>📜 인물·유물 도감 <small>${have.length} / ${CARDS.length}</small></h3>
    <p class="help">전투를 마치면 첫 번째 카드를, 미니게임 ${CARD_BONUS_SCORE}점 이상이면 두 번째 카드를 얻어요. 카드를 누르면 설명을 볼 수 있어요.</p>
    <div class="codex-grid">${CARDS.map(cd => cardHTML(cd, { locked: !have.includes(cd.id) })).join('')}</div>
    <div class="actions"><button class="btn primary sm" id="codex-close">닫기</button></div></div>`;
  document.body.appendChild(back);
  bindCards(back);
  $('#codex-close', back).onclick = () => back.remove();
  back.onclick = (e) => { if (e.target === back) back.remove(); };
}

/* ---------- 공용 UI 조각 ---------- */
function topBar(showStageInfo) {
  const st = STAGES[Math.min(G.stage, 7)];
  return `<header class="top-bar">
    <div class="tb-left">${showStageInfo ? `<span class="tb-date">${esc(st.date)}</span><span class="tb-title">${esc(st.title)}</span>` : `<span class="tb-title">불멸의 7년: 임진왜란 시뮬레이터 2</span>`}</div>
    <div class="tb-right">
      <button class="tb-btn" id="tb-rank">🏆 순위표</button>
      <button class="tb-btn" id="tb-codex">📜 도감 ${getCards().length}/${CARDS.length}</button>
      <span class="tb-score">누적 <b>${fmt(totalScore())}</b>점</span>
      <span class="tb-student">${G.player.sid ? esc(G.player.sid) + ' ' + esc(G.player.name) : ''}</span>
      <button class="tb-btn ghost" id="tb-admin">교사용</button>
    </div>
  </header>`;
}
function root(html) { $('#app').innerHTML = html; bindTopBar(); }
function bindTopBar() {
  const r = $('#tb-rank'); if (r) r.onclick = openRanking;
  const cx = $('#tb-codex'); if (cx) cx.onclick = openCodex;
  const a = $('#tb-admin'); if (a) a.onclick = openAdmin;
}
function timelineHTML() {
  return `<div class="timeline">${STAGES.map((s, i) => `<div class="tl-node ${G.results[i] ? 'done' : (i === G.stage && G.phase !== 'TITLE' && G.phase !== 'REPORT' ? 'now' : '')}">${esc(s.short)}</div>`).join('')}</div>`;
}
function mapPane() { return `<div class="map-panel"><div id="map-mount"></div><div id="map-caption" class="map-caption">${esc(STAGES[G.stage].summary)}</div></div>`; }
function mountMapIfPresent(animate) { const el = $('#map-mount'); if (el) { MapView.mount(el); MapView.update(G.stage, animate); } }
function sourceHTML(src) {
  if (!src) return '';
  return `<figure class="src"><div class="src-h">사료로 보는 그날</div><blockquote>“${esc(src.text)}”</blockquote><figcaption>— ${esc(src.cite)}</figcaption>${src.note ? `<p class="src-note">${esc(src.note)}</p>` : ''}</figure>`;
}

/* ---------- 화면들 ---------- */
function drawTitleDeco() {
  const cv = $('#tt-deco'); if (!cv) return;
  const g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 380, 170);
  Spr.draw(g, 'sjs', 0, 0, 62, 158, 1.5, { shadow: 0.9 });
  Spr.draw(g, 'shgb', 0, 6, 218, 160, 1.2);
  Spr.draw(g, 'shpo', 0, 1, 338, 160, 0.9);
}
function showTitle() {
  G.phase = 'TITLE';
  const saved = loadGame();
  const hasProgress = saved && saved.results && saved.results.some(r => r);
  root(`
    ${topBar(false)}
    <div class="title-screen">
      <div class="tt-bg"><div id="tt-map-mount"></div><canvas id="tt-deco" width="760" height="340" aria-hidden="true"></canvas></div>
      <div class="title-left">
        <h1>불멸의<br>7년<br>임진왜란</h1>
        <p class="title-sub">1592 ~ 1598 · 바다를 지키고, 땅을 되찾아라</p>
        ${hasProgress ? `<button class="btn ghost" id="resume-btn">이어하기 (${esc(saved.player.name || '')})</button>` : ''}
      </div>
      <div class="title-right">
        <form id="start-form" class="start-card">
          <h2>출전 준비</h2>
          <label class="field"><span>학번</span><input id="f-sid" inputmode="numeric" maxlength="8" placeholder="예: 20315" required></label>
          <label class="field"><span>이름</span><input id="f-name" maxlength="10" placeholder="예: 홍길동" required></label>
          <button class="btn primary" type="submit" style="width:100%">${hasProgress ? '새로 시작하기' : '출전하기'}</button>
        </form>
      </div>
    </div>`);
  const mapMount = $('#tt-map-mount');
  if (mapMount) { MapView.mount(mapMount); mapMount.querySelectorAll('.layer').forEach(l => l.classList.add('on')); }
  drawTitleDeco();
  $('#start-form').onsubmit = (e) => {
    e.preventDefault();
    G.player = { sid: $('#f-sid').value.trim(), name: $('#f-name').value.trim() };
    if (!G.player.sid || !G.player.name) return;
    G.results = Array(8).fill(null); G.retryUsed = Array(8).fill(false); G.essay = ''; G.submitted = false;
    G.startedAt = Date.now(); G.finishedAt = 0; saveGame(); goStage(0);
  };
  const rb = $('#resume-btn');
  if (rb) rb.onclick = () => {
    G.player = saved.player; G.results = saved.results; G.retryUsed = Array(8).fill(false);
    G.essay = saved.essay || ''; G.submitted = !!saved.submitted;
    G.startedAt = saved.startedAt; G.finishedAt = saved.finishedAt;
    const next = G.results.findIndex(r => !r);
    if (next === -1) showReport(); else goStage(next);
  };
}
function goStage(i) { G.stage = i; G.phase = 'BRIEFING'; showBriefing(); }
function showBriefing() {
  const st = STAGES[G.stage];
  root(`${topBar(true)}<div class="pane-wrap">${mapPane()}<div class="main-panel"><article class="scroll">
    <div class="scroll-meta"><span class="tag">${esc(st.date)}</span><span class="tag">지휘관 ${esc(st.commander)}</span></div>
    <h2>${esc(st.title)}</h2>${st.briefing.map(p => `<p>${esc(p)}</p>`).join('')}
    ${sourceHTML(st.source)}
    <div class="actions"><button class="btn primary" id="go">역사적 결단 내리기</button></div>
  </article></div></div>${timelineHTML()}`);
  mountMapIfPresent(true);
  $('#go').onclick = showQuiz;
}
const CIRC = ['①', '②', '③', '④'];
function showQuiz() {
  G.phase = 'QUIZ'; const st = STAGES[G.stage], q = st.quiz;
  G.order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  root(`${topBar(true)}<div class="pane-wrap">${mapPane()}<div class="main-panel"><article class="scroll">
    <div class="scroll-meta"><span class="tag gold">역사적 결단</span><span class="tag">${esc(st.title)}</span></div>
    <h2 class="q">${esc(q.question)}</h2>
    <div class="opts">${G.order.map((oi, k) => `<button class="opt" data-k="${k}"><span class="opt-n">${CIRC[k]}</span><span>${esc(q.options[oi].text)}</span></button>`).join('')}</div>
  </article></div></div>${timelineHTML()}`);
  mountMapIfPresent();
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => answerQuiz(+b.dataset.k));
}
function answerQuiz(k) {
  const st = STAGES[G.stage], q = st.quiz, opt = q.options[G.order[k]], ok = opt.correct;
  G.pick = ok; G.phase = 'FEEDBACK';
  const right = q.options.find(o => o.correct);
  document.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; const o = q.options[G.order[i]]; if (o.correct) b.classList.add('right'); else if (i === k) b.classList.add('wrong'); else b.classList.add('dim'); });
  const fb = document.createElement('div');
  fb.className = 'fb' + (ok ? '' : ' bad');
  fb.innerHTML = ok
    ? `<b>역사와 일치합니다! +${QUIZ_BONUS}점</b>${esc(opt.comment)}<br><span class="buff">사기 진작 버프: 미니게임 점수 ×${MORALE_MULT}</span>`
    : `<b>실제 역사에서는 이랬어요</b>${esc(opt.comment)}<br>정답: ${esc(right.text)}`;
  const act = document.createElement('div'); act.className = 'actions'; act.innerHTML = '<button class="btn primary" id="go">미니게임으로</button>';
  const sc = $('.scroll'); sc.appendChild(fb); sc.appendChild(act); $('#go').onclick = showIntro; $('#go').focus();
}
function showIntro() {
  G.phase = 'INTRO'; const st = STAGES[G.stage], gm = st.game;
  root(`${topBar(true)}<div class="pane-wrap">${mapPane()}<div class="main-panel"><article class="scroll">
    <div class="scroll-meta"><span class="tag gold">미니게임</span><span class="tag">${esc(st.date)}</span></div>
    <h2>${esc(gm.name)}</h2><p>${esc(gm.goal)}</p><ul class="how">${gm.how.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
    ${G.pick ? `<span class="buff">사기 진작 버프 적용 중 (점수 ×${MORALE_MULT})</span>` : ''}
    <div class="actions"><button class="btn primary" id="go">출전!</button></div>
  </article></div></div>${timelineHTML()}`);
  mountMapIfPresent();
  $('#go').onclick = startMini;
}
function controlsHTML(game) {
  const c = game.controls;
  if (c.kind === 'fire') return `<button class="ctl" id="ctl-fire" data-a="fire"><span class="cd"></span><span class="lbl">${esc(c.fire || '발포')}</span><small>${esc(c.hint || '')}</small></button>`;
  if (c.kind === 'dual') return `<button class="ctl" id="ctl-rocket" data-a="rocket"><span class="cd"></span>신기전 발사<small>먼 곳의 적을 한꺼번에</small></button><button class="ctl" id="ctl-stone" data-a="stone"><span class="cd"></span>돌 던지기<small>가까운 적 2명</small></button>`;
  if (c.kind === 'steer') return `<button class="ctl" data-a="left" aria-label="왼쪽으로 조타"><i class="ctl-arrow l"></i></button><button class="ctl" data-a="right" aria-label="오른쪽으로 조타"><i class="ctl-arrow r"></i></button>`;
  return `<p class="ctl-hint">${esc(c.hint || '')}</p>`;
}
const Engine = {
  canvas: null, ctx: null, game: null, raf: 0, last: 0, running: false, pressed: false, onEnd: null,
  mount(canvas) {
    this.canvas = canvas; this.resize();
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * GW / r.width, (e.clientY - r.top) * GH / r.height]; };
    canvas.addEventListener('pointerdown', e => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (_) { } this.pressed = true; if (this.running && this.game.onDown) this.game.onDown(...pt(e), e); });
    canvas.addEventListener('pointermove', e => { if (this.running && this.game.onMove) this.game.onMove(...pt(e), this.pressed, e); });
    const up = e => { const was = this.pressed; this.pressed = false; if (this.running && was && this.game.onUp) this.game.onUp(...pt(e), e); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  },
  resize() {
    if (!this.canvas) return;
    const R = clamp((window.devicePixelRatio || 1), 1, 3);
    this.canvas.width = Math.round(GW * R); this.canvas.height = Math.round(GH * R);
    this.ctx = this.canvas.getContext('2d'); this.ctx.setTransform(R, 0, 0, R, 0, 0);
    if (this.game && !this.running) this.game.draw(this.ctx);
  },
  begin(game, onEnd) { this.game = game; this.onEnd = onEnd; this.running = true; this.last = performance.now(); cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(t => this.loop(t)); },
  loop(ts) {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000)); this.last = ts;
    const g = this.game; g.update(dt); g.draw(this.ctx); this.tick();
    if (g.done) { this.stop(); const cb = this.onEnd; this.onEnd = null; cb && cb(g); return; }
    this.raf = requestAnimationFrame(t => this.loop(t));
  },
  tick() {
    const g = this.game, ui = g.ui ? g.ui() : {};
    const t = $('.mg-timer i'); if (t && g.dur > 0) t.style.width = (100 * clamp(1 - g.t / g.dur, 0, 1)) + '%';
    for (const k of ['fire', 'rocket', 'stone']) { const b = $('#ctl-' + k); if (b && ui[k] != null) b.style.setProperty('--cd', clamp(ui[k], 0, 1)); }
    // 게임 단계에 따라 버튼 글자가 바뀌는 경우 (예: 한산도 1단계 "뒤로 물러나기" → 2단계 "학익진 전개!")
    if (ui.label != null) { const l = $('#ctl-fire .lbl'); if (l && l.textContent !== ui.label) l.textContent = ui.label; }
    if (ui.sub != null) { const s = $('#ctl-fire small'); if (s && s.textContent !== ui.sub) s.textContent = ui.sub; }
  },
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.pressed = false; if (this.game && this.game.action) ['left', 'right'].forEach(n => this.game.action(n, false)); },
  cancel() { this.stop(); this.game = null; this.onEnd = null; }
};
window.addEventListener('keydown', e => {
  if (!Engine.running || !Engine.game.action) return;
  const g = Engine.game, k = e.key;
  if (k === 'ArrowLeft' || k === 'a') { g.action('left', true); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd') { g.action('right', true); e.preventDefault(); }
  else if ((k === ' ' || k === 'Enter') && g.controls.kind === 'fire') { g.action('fire', true); e.preventDefault(); }
});
window.addEventListener('keyup', e => {
  if (!Engine.running || !Engine.game.action) return; const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') Engine.game.action('left', false); if (k === 'ArrowRight' || k === 'd') Engine.game.action('right', false);
  if ((k === ' ' || k === 'Enter') && Engine.game.controls.kind === 'fire') Engine.game.action('fire', false);
});

function startMini() {
  G.phase = 'MINIGAME'; const st = STAGES[G.stage], game = GAMES[st.game.type]();
  // 전투 시작 자막: 영화처럼 위아래 검은 띠 + 날짜·전투명·상황 → "출전!"
  root(`<div class="mg"><div class="mg-top"><span class="mg-name">${esc(st.game.name)}</span><span class="mg-hint">${esc(game.controls.hint || '')}</span>${game.dur > 0 ? '<div class="mg-timer"><i></i></div>' : ''}</div><div class="mg-wrap"><canvas id="mg-canvas"></canvas>
    <div id="mg-intro" class="mg-intro"><div class="mi-bar top"></div><div class="mi-bar bot"></div>
      <div class="mi-body"><div class="mi-date">${esc(st.date)} · ${esc(st.commander)}</div><div class="mi-title">${esc(st.title)}</div><div class="mi-line">${esc(st.intro || '')}</div><div class="mi-skip">화면을 누르면 바로 시작</div></div>
      <div class="mi-go">출전!</div></div></div>
    <div class="mg-controls" id="mg-controls">${controlsHTML(game)}</div></div>`);
  Engine.mount($('#mg-canvas')); Engine.game = game; Engine.game.draw(Engine.ctx);
  document.querySelectorAll('#mg-controls .ctl').forEach(b => {
    const a = b.dataset.a;
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('pressed'); game.action && game.action(a, true); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => { if (b.classList.contains('pressed')) { b.classList.remove('pressed'); game.action && game.action(a, false); } }));
  });
  const intro = $('#mg-intro'); let stage = 0; const timers = [];
  const alive = () => G.phase === 'MINIGAME' && Engine.game === game;
  const go = () => { if (stage >= 1 || !alive()) return; stage = 1; intro.classList.add('go'); timers.push(setTimeout(start, 650)); };
  const start = () => { if (stage >= 2 || !alive()) return; stage = 2; timers.forEach(clearTimeout); intro.remove(); Engine.begin(game, finishMini); };
  intro.addEventListener('pointerdown', e => { e.preventDefault(); go(); });
  timers.push(setTimeout(go, 2400));
}
function finishMini(game) {
  const r = game.result(), ok = !!G.pick;
  const bonus = ok ? QUIZ_BONUS : 0, mini = Math.round(r.score), adj = ok ? Math.round(mini * MORALE_MULT) : mini;
  const rec = { quiz: ok, bonus, mini, adj, total: bonus + adj, note: r.note };
  const prev = G.results[G.stage];
  G.results[G.stage] = (prev && prev.total > rec.total) ? prev : rec;
  // 인물·유물 카드: 첫 장은 항상, 두 번째 장은 미니게임 점수가 기준 이상일 때
  const sc = CARDS.filter(c => c.stage === G.stage), best = Math.max(rec.mini, prev ? prev.mini : 0);
  G.newCards = addCards(best >= CARD_BONUS_SCORE ? [sc[0].id, sc[1].id] : [sc[0].id]);
  saveGame(); showResult();
}
function resultCardsHTML(i) {
  const have = getCards(), sc = CARDS.filter(c => c.stage === i), fresh = G.newCards || [];
  const tip = !have.includes(sc[1].id)
    ? `미니게임 ${CARD_BONUS_SCORE}점 이상이면 두 번째 카드를 얻어요.${G.retryUsed[i] ? '' : ' 다시 도전해 보세요!'}`
    : '카드를 눌러 설명을 읽어 보세요.';
  return `<div class="rc-cards"><div class="rc-h">인물·유물 카드</div><div class="rc-row">${sc.map((cd, k) => have.includes(cd.id)
    ? cardHTML(cd, { flip: fresh.includes(cd.id), isNew: fresh.includes(cd.id), delay: 0.25 + k * 0.4 })
    : cardHTML(cd, { locked: true })).join('')}<p class="rc-tip">${tip}</p></div></div>`;
}
function showResult() {
  G.phase = 'RESULT'; const i = G.stage, st = STAGES[i], r = G.results[i], last = i === 7, kw = st.keyword;
  root(`${topBar(true)}<div class="pane-wrap">${mapPane()}<div class="main-panel"><article class="scroll tight">
    <div class="scroll-meta"><span class="tag gold">${esc(st.title)} 결과</span></div>
    <div class="score-row"><span>역사적 결단</span><b>${r.quiz ? '+' + QUIZ_BONUS : '0'}</b></div>
    <div class="score-row"><span>미니게임 <small>(${esc(r.note)})</small></span><b>+${fmt(r.mini)}</b></div>
    ${r.quiz ? `<div class="score-row"><span>사기 진작 버프 ×${MORALE_MULT}</span><b>+${fmt(r.adj - r.mini)}</b></div>` : ''}
    <div class="score-row total"><span>이번 전투 전공</span><b>${fmt(r.total)}</b></div>
    ${resultCardsHTML(i)}
    <div class="kw"><div class="kw-h">학습지 핵심 키워드 획득</div><dl><dt>전투</dt><dd>${esc(st.worksheetDate)} · ${esc(kw.battle)}</dd><dt>지휘관</dt><dd>${esc(kw.who)}</dd><dt>의의</dt><dd>${esc(kw.meaning)}</dd></dl></div>
    <p class="sum">${esc(st.summary)}</p>
    ${st.keyFactor ? `<div class="factor"><b>핵심 승리 요인 ${st.keyFactor.n}. ${esc(st.keyFactor.title)}</b><br>${esc(st.keyFactor.text)}</div>` : ''}
    <div class="actions">${G.retryUsed[i] ? '' : `<button class="btn ghost" id="retry">다시 도전 (1회, 더 높은 점수로 기록)</button>`}<button class="btn primary" id="go">${last ? '마지막 장면 보기' : '다음 전투로'}</button></div>
  </article></div></div>${timelineHTML()}`);
  mountMapIfPresent();
  bindCards($('.rc-cards'));
  $('#go').onclick = () => last ? showCutscene() : goStage(i + 1); $('#go').focus();
  const rt = $('#retry'); if (rt) rt.onclick = () => { G.retryUsed[i] = true; startMini(); };
}
function showCutscene() {
  G.phase = 'CUTSCENE'; if (!G.finishedAt) { G.finishedAt = Date.now(); saveGame(); }
  root(`<div class="cut"><div class="cut-sky"></div><div class="cut-sea"></div><div class="cut-in">
    <div class="l0">1598년 11월 19일 아침 · 관음포 앞바다</div>
    <div class="l0b">달아나는 적을 끝까지 쫓던 이순신이 적의 총탄에 맞았다.</div>
    <div class="l1">"싸움이 급하니<br>나의 죽음을 알리지 말라."</div>
    <div class="l2">이순신의 마지막 말 · 『징비록』, 『이충무공행록』</div>
    <div class="l2b">장군의 죽음은 전투가 끝날 때까지 알려지지 않았고, 7년 전쟁은 끝이 났다.</div>
    <div class="l3"><button class="btn primary" id="cut-go">전적 기록부 보기</button></div></div></div>`);
  $('#cut-go').onclick = showReport;
}

/* ---------- 최종 보고서 ---------- */
function showReport() {
  G.phase = 'REPORT';
  const total = totalScore();
  root(`${topBar(false)}<div class="report-wrap"><article class="report">
    <div class="rp-head">
      <div><h2>임진왜란 전황 최종 보고서</h2><p>${CONFIG.SCHOOL_NAME ? esc(CONFIG.SCHOOL_NAME) + ' · ' : ''}${esc(G.player.sid)} ${esc(G.player.name)}</p></div>
      <div class="rp-score"><span>최종 전공 점수</span><b>${fmt(total)}</b></div>
    </div>
    <h3>임진왜란 주요 전개 과정</h3>
    <table class="rp-table"><thead><tr><th>순서</th><th>시기</th><th>전투·사건</th><th>지휘관</th><th>주요 전략과 의의</th><th>결단</th><th>전공</th></tr></thead>
    <tbody>${STAGES.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.worksheetDate)}</td><td><b>${esc(s.keyword.battle)}</b></td><td>${esc(s.keyword.who)}</td><td>${esc(s.keyword.meaning)}</td><td>${G.results[i] && G.results[i].quiz ? '○' : '×'}</td><td>${G.results[i] ? fmt(G.results[i].total) : '-'}</td></tr>`).join('')}</tbody></table>
    <h3>모은 인물·유물 카드 <small>${getCards().length} / ${CARDS.length} · 승리 요인을 쓸 때 참고하세요 (누르면 설명)</small></h3>
    <div class="rp-cards">${CARDS.filter(cd => getCards().includes(cd.id)).map(cd => `<button type="button" class="chip type-${CARD_TYPE_CLS[cd.type]}" data-id="${cd.id}"><i>${esc(cd.type)}</i>${esc(cd.name)}</button>`).join('') || '<span class="help">아직 모은 카드가 없어요.</span>'}</div>
    <h3>핵심 탐구 과제 <small>위 표와 게임 속 전투를 떠올리며 학습지에 답을 써 보세요</small></h3>
    <div class="rp-q">${INQUIRY.map((q, i) => `<div><b>Q${i + 1}. ${esc(q.q)}</b><span class="line"></span></div>`).join('')}</div>
    <h3>임진왜란 승리 요인</h3>
    <div class="rp-factors">
      <p>게임에서 치른 8개의 전투를 떠올려 보세요. 조선이 7년간의 전쟁을 이겨 낼 수 있었던 요인은 무엇이었을까요? 아래 칸에 자유롭게 서술해 보세요. (최소 20자)</p>
      <textarea class="f-essay" id="f-essay" rows="7" maxlength="1500" placeholder="예: 이순신 장군이 이끈 수군의 활약으로 남해와 서해의 제해권을 지켜 전라도 곡창지대를 보호할 수 있었고, 전국 각지에서 일어난 의병과 승병이 왜군의 후방 보급로를 끊었다. 또한 명나라 원군이 참전하며 전세가 국제전으로 확대되어...">${esc(G.essay || '')}</textarea>
      <div class="char-count" id="essay-count"></div>
    </div>
    <div class="submit-box">
      <h3>선생님께 제출하기</h3>
      <p class="help">${Sync.enabled() ? '아래 버튼을 누르면 위에 적은 승리 요인 서술과 최종 점수가 선생님 구글 시트로 전송됩니다.' : '⚠ 아직 선생님 컴퓨터의 구글 시트 주소가 설정되지 않았습니다. (config.js 참고)'}</p>
      <div id="submit-msg" class="submit-msg"></div>
      <div class="actions" style="justify-content:flex-start">
        <button class="btn primary" id="submit-full">승리 요인 + 점수 제출하기</button>
        <button class="btn ghost" id="submit-score">점수만 다시 보내기</button>
        <button class="btn ghost" id="print-btn">인쇄 · PDF 저장</button>
        <button class="btn ghost" id="restart-btn">처음부터 다시 도전</button>
      </div>
    </div>
  </article></div>`);
  document.querySelectorAll('.rp-cards .chip').forEach(b => b.onclick = () => openCardDetail(b.dataset.id));
  const essayInp = $('#f-essay'), countEl = $('#essay-count');
  const updateCount = () => { countEl.textContent = `${essayInp.value.length} / 1500자`; };
  updateCount();
  essayInp.oninput = () => { G.essay = essayInp.value; saveGame(); updateCount(); };
  $('#print-btn').onclick = () => window.print();
  $('#restart-btn').onclick = () => { if (confirm('처음부터 다시 시작할까요? 지금까지의 진행은 사라집니다.')) { store.del(SAVE_KEY); showTitle(); } };
  const msg = $('#submit-msg');
  function setMsg(text, ok) { msg.textContent = text; msg.className = 'submit-msg ' + (ok ? 'ok' : 'err'); }
  $('#submit-full').onclick = async () => {
    if (!G.essay || G.essay.trim().length < 20) { setMsg('승리 요인을 조금 더 자세히 서술해 주세요. (최소 20자)', false); return; }
    setMsg('전송 중...', true);
    const res = await Sync.submitFull({ sid: G.player.sid, name: G.player.name, total, essay: G.essay });
    if (res.ok) { G.submitted = true; saveGame(); setMsg('제출 완료! 선생님 시트에 기록되었습니다.', true); }
    else setMsg('전송 실패: ' + (res.error || '알 수 없는 오류'), false);
  };
  $('#submit-score').onclick = async () => {
    setMsg('점수 전송 중...', true);
    const res = await Sync.submitScoreOnly({ sid: G.player.sid, name: G.player.name, total });
    if (res.ok) setMsg('점수가 갱신되었습니다. (승리 요인 서술은 그대로 유지됩니다)', true);
    else setMsg('전송 실패: ' + (res.error || '알 수 없는 오류'), false);
  };
}

/* ---------- 순위표 (구글 시트에서 불러옴) ---------- */
function openRanking() {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal rank-modal"><h3>🏆 전체 순위표</h3><div id="rank-body" class="rank-body"><p class="help">불러오는 중...</p></div><div class="actions"><button class="btn ghost sm" id="rank-refresh">새로고침</button><button class="btn primary sm" id="rank-close">닫기</button></div></div>`;
  document.body.appendChild(back);
  $('#rank-close', back).onclick = () => back.remove();
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  async function load() {
    const body = $('#rank-body', back); body.innerHTML = `<p class="help">불러오는 중...</p>`;
    if (!Sync.enabled()) { body.innerHTML = `<p class="help">⚠ 아직 구글 시트가 연결되지 않았습니다.</p>`; return; }
    const res = await Sync.fetchRanking();
    if (!res.ok) { body.innerHTML = `<p class="help">불러오지 못했습니다: ${esc(res.error || '')}</p>`; return; }
    const rows = res.rows || [];
    if (!rows.length) { body.innerHTML = `<p class="help">아직 제출된 기록이 없습니다.</p>`; return; }
    body.innerHTML = `<table class="rank-table"><thead><tr><th>순위</th><th>학번</th><th>이름</th><th>점수</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.sid === G.player.sid ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.sid)}</td><td>${esc(r.name)}</td><td>${fmt(r.total)}</td></tr>`).join('')}
    </tbody></table>`;
  }
  $('#rank-refresh', back).onclick = load; load();
}

/* ---------- 교사용 ---------- */
function openAdmin() {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal admin-pin"><h3>교사용 확인</h3><label class="field"><span>관리자 번호</span><input id="admin-pin" type="password" inputmode="numeric" maxlength="12" autocomplete="off"></label><div class="err" id="admin-err"></div><div class="actions"><button class="btn ghost sm" id="admin-x">닫기</button><button class="btn primary sm" id="admin-ok">확인</button></div></div>`;
  document.body.appendChild(back);
  $('#admin-x', back).onclick = () => back.remove();
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  const go = () => {
    if ($('#admin-pin', back).value === CONFIG.ADMIN_PIN) { back.remove(); showAdminPanel(); }
    else $('#admin-err', back).textContent = '번호가 올바르지 않습니다.';
  };
  $('#admin-ok', back).onclick = go;
  $('#admin-pin', back).addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('#admin-pin', back).focus();
}
function showAdminPanel() {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal admin-panel">
    <h3>교사용 관리 화면</h3>
    <p class="help">구글 시트 연결 상태: ${Sync.enabled() ? '<b style="color:#2F8F7C">연결됨</b>' : '<b style="color:#C4432F">연결 안 됨 (config.js의 APPS_SCRIPT_URL을 확인하세요)</b>'}</p>
    <div class="key">
      <b style="margin-top:0">핵심 탐구 과제 예시 답안 (학생 화면에는 질문만 표시됩니다)</b>
      ${INQUIRY.map((q, i) => `<div><b>Q${i + 1}. ${esc(q.q)}</b>${esc(q.a)}</div>`).join('')}
    </div>
    <div class="danger-box">
      <b>전체 기록 초기화</b>
      <p class="help">구글 시트에 쌓인 모든 학생의 제출 기록(승리요인·점수)을 지웁니다. 되돌릴 수 없습니다.</p>
      <button class="btn danger sm" id="admin-reset">전체 기록 초기화</button>
      <div id="admin-reset-msg" class="submit-msg"></div>
    </div>
    <div class="actions"><button class="btn primary sm" id="admin-close">닫기</button></div>
  </div>`;
  document.body.appendChild(back);
  $('#admin-close', back).onclick = () => back.remove();
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  $('#admin-reset', back).onclick = async () => {
    if (!confirm('정말 전체 기록을 초기화할까요? 되돌릴 수 없습니다.')) return;
    const msg = $('#admin-reset-msg', back); msg.textContent = '처리 중...'; msg.className = 'submit-msg ok';
    const res = await Sync.resetAll(CONFIG.ADMIN_PIN);
    if (res.ok) { msg.textContent = '초기화되었습니다.'; msg.className = 'submit-msg ok'; }
    else { msg.textContent = '실패: ' + (res.error || ''); msg.className = 'submit-msg err'; }
  };
}

window.addEventListener('resize', () => Engine.resize());
document.addEventListener('DOMContentLoaded', () => { Spr.load().then(showTitle, showTitle); });
