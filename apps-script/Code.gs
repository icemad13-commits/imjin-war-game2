/* ============================================================
   불멸의 7년: 임진왜란 시뮬레이터 2 - 구글 시트 연동 스크립트
   ------------------------------------------------------------
   이 파일을 어떻게 쓰는지는 README.md의
   "3. 구글 시트와 연결하기"에 그림과 함께 아주 자세히 설명되어 있습니다.
   여기서는 코드만 있고, 선생님이 직접 손댈 곳은 아래
   ADMIN_KEY 한 줄뿐입니다.

   이 스크립트가 하는 일 (한 줄 요약):
   - 학생이 [승리 요인 + 점수 제출하기]를 누르면 -> 시트에 한 줄로 기록(같은 학번이면 덮어쓰기)
   - 학생이 [점수만 다시 보내기]를 누르면 -> 그 학생 줄의 점수만 바꾸고 승리 요인 서술은 그대로 둠
   - 앱 상단 [순위표]를 누르면 -> 점수 높은 순으로 정렬해서 보여줌
   - 선생님이 [교사용] 화면에서 [전체 기록 초기화]를 누르면 -> 시트의 기록을 모두 지움

   ※ 업데이트 안내: 이전 버전에서는 "승리요인 1~4"를 4칸으로 나눠 받았지만,
   이번 버전부터는 한 칸의 서술형 글로 받도록 바뀌었습니다. 이미 이전
   버전으로 시트를 써 오고 있었다면, 이 코드를 새로 붙여넣고 재배포하기
   전에 시트의 "기록" 탭 이름을 "기록(이전)" 등으로 바꿔 두세요. 그러면
   이 스크립트가 새 이름("기록")의 탭을 새로 만들어서 이전 기록과 섞이지
   않습니다.
   ============================================================ */

/* 앱의 config.js에 있는 ADMIN_PIN과 반드시 똑같이 맞춰 주세요.
   (다르면 "전체 기록 초기화" 버튼이 동작하지 않습니다) */
const ADMIN_KEY = '1592';

/* 기록이 저장될 시트 이름. 시트 탭 이름을 바꾸고 싶다면 이 값도 함께 바꾸세요. */
const SHEET_NAME = '기록';

/* 시트의 열 순서 (A~F열) */
const COLS = {
  SID: 1,        // A: 학번
  NAME: 2,       // B: 이름
  ESSAY: 3,      // C: 승리 요인 서술
  TOTAL: 4,      // D: 최종 점수
  SUBMITTED: 5,  // E: 최초 제출 시각
  UPDATED: 6     // F: 마지막 수정 시각
};
const HEADER = ['학번', '이름', '승리 요인 서술', '점수', '최초제출시각', '최종수정시각'];

/* ---------- 공통 도우미 ---------- */
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowBySid_(sheet, sid) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const sids = sheet.getRange(2, COLS.SID, last - 1, 1).getValues();
  for (let i = 0; i < sids.length; i++) {
    if (String(sids[i][0]) === String(sid)) return i + 2; // 실제 시트 행 번호 (1행은 헤더)
  }
  return -1;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function nowStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

/* ---------- 학생이 보낸 요청 처리 (POST) ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 여러 학생이 동시에 눌러도 한 명씩 순서대로 기록되도록 잠금
  } catch (err) {
    return json_({ ok: false, error: '서버가 바쁩니다. 잠시 후 다시 시도해 주세요.' });
  }
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return json_({ ok: false, error: '요청 형식이 올바르지 않습니다.' });
    }
    const action = data.action;
    const sheet = getSheet_();

    if (action === 'submit') {
      return handleSubmit_(sheet, data);
    }
    if (action === 'updateScore') {
      return handleUpdateScore_(sheet, data);
    }
    if (action === 'reset') {
      return handleReset_(sheet, data);
    }
    return json_({ ok: false, error: '알 수 없는 요청입니다 (action: ' + action + ')' });
  } catch (err) {
    return json_({ ok: false, error: '서버 오류: ' + err.message });
  } finally {
    lock.releaseLock();
  }
}

/* 승리 요인 서술 + 점수를 함께 제출 (같은 학번이면 기존 줄을 덮어씁니다) */
function handleSubmit_(sheet, data) {
  const sid = String(data.sid || '').trim();
  const name = String(data.name || '').trim();
  const total = Number(data.total) || 0;
  const essay = String(data.essay || '').trim();
  if (!sid || !name) return json_({ ok: false, error: '학번과 이름이 필요합니다.' });

  const row = findRowBySid_(sheet, sid);
  const now = nowStr_();
  if (row === -1) {
    sheet.appendRow([sid, name, essay, total, now, now]);
  } else {
    sheet.getRange(row, COLS.NAME).setValue(name);
    sheet.getRange(row, COLS.ESSAY).setValue(essay);
    sheet.getRange(row, COLS.TOTAL).setValue(total);
    sheet.getRange(row, COLS.UPDATED).setValue(now);
  }
  return json_({ ok: true });
}

/* 점수만 갱신 (승리 요인 서술은 절대 건드리지 않음) */
function handleUpdateScore_(sheet, data) {
  const sid = String(data.sid || '').trim();
  const name = String(data.name || '').trim();
  const total = Number(data.total) || 0;
  if (!sid) return json_({ ok: false, error: '학번이 필요합니다.' });

  const row = findRowBySid_(sheet, sid);
  const now = nowStr_();
  if (row === -1) {
    // 아직 승리 요인을 제출한 적이 없는 학생 - 서술 칸은 비워 두고 점수만 먼저 기록합니다.
    sheet.appendRow([sid, name, '', total, now, now]);
  } else {
    sheet.getRange(row, COLS.TOTAL).setValue(total);
    sheet.getRange(row, COLS.UPDATED).setValue(now);
  }
  return json_({ ok: true });
}

/* 교사용 전체 초기화 (관리자 번호가 맞아야 동작) */
function handleReset_(sheet, data) {
  const key = String(data.adminKey || '');
  if (key !== ADMIN_KEY) return json_({ ok: false, error: '관리자 번호가 올바르지 않습니다.' });

  const last = sheet.getLastRow();
  if (last > 1) {
    sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).clearContent();
  }
  return json_({ ok: true });
}

/* ---------- 순위표 조회 (GET) ---------- */
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'ranking') {
    return handleRanking_();
  }
  // 배포한 주소를 브라우저로 직접 열어 확인할 때 보여줄 안내 메시지
  return json_({ ok: true, message: '임진왜란 시뮬레이터 2 서버가 정상적으로 연결되어 있습니다.' });
}

function handleRanking_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return json_({ ok: true, rows: [] });
  const values = sheet.getRange(2, COLS.SID, last - 1, COLS.TOTAL - COLS.SID + 1).getValues();
  const rows = values
    .map(r => ({ sid: String(r[COLS.SID - 1]), name: String(r[COLS.NAME - 1]), total: Number(r[COLS.TOTAL - 1]) || 0 }))
    .filter(r => r.sid) // 학번이 없는 빈 줄은 제외
    .sort((a, b) => b.total - a.total);
  return json_({ ok: true, rows: rows });
}
