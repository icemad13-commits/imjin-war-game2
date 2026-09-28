/* ============================================================
   구글 시트(Apps Script) 통신. 앱스크립트 URL이 비어 있으면
   모든 함수가 조용히 "연결 안 됨" 상태를 돌려줄 뿐, 게임 진행에는
   전혀 지장이 없습니다. (학생 데이터는 항상 이 크롬북에 먼저 저장됨)
   ============================================================ */
const Sync = (() => {
  const url = () => (CONFIG.APPS_SCRIPT_URL || '').trim();
  const enabled = () => !!url();

  // Apps Script 웹앱은 POST 본문을 text/plain 으로 보내야
  // 브라우저가 사전 확인 요청(preflight) 없이 바로 전송합니다.
  async function post(action, data) {
    if (!enabled()) return { ok: false, offline: true, error: '구글 시트 주소가 아직 설정되지 않았습니다.' };
    try {
      const res = await fetch(url(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...data })
      });
      const j = await res.json();
      return j;
    } catch (err) {
      return { ok: false, error: '네트워크 오류로 전송하지 못했습니다. (' + err.message + ')' };
    }
  }
  async function get(params) {
    if (!enabled()) return { ok: false, offline: true, error: '구글 시트 주소가 아직 설정되지 않았습니다.' };
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(url() + '?' + qs, { method: 'GET' });
      return await res.json();
    } catch (err) {
      return { ok: false, error: '네트워크 오류로 불러오지 못했습니다. (' + err.message + ')' };
    }
  }

  /* 전체 제출: 학번/이름/점수/승리 요인 서술을 함께 보냅니다. */
  function submitFull({ sid, name, total, essay }) {
    return post('submit', { sid, name, total, essay });
  }
  /* 점수만 보내기: 같은 학번의 승리 요인 서술은 그대로 두고 점수만 갱신합니다. */
  function submitScoreOnly({ sid, name, total }) {
    return post('updateScore', { sid, name, total });
  }
  /* 순위표 조회 */
  function fetchRanking() {
    return get({ action: 'ranking' });
  }
  /* 교사용 초기화 (관리자 번호 확인 필요) */
  function resetAll(adminKey) {
    return post('reset', { adminKey });
  }

  return { enabled, submitFull, submitScoreOnly, fetchRanking, resetAll };
})();
