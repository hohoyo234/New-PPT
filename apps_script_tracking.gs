/****************************************************************************
 * 敬拜 PPT 制作器 — 使用追踪 → Google Sheet
 *
 * 安装(一次性):
 *   1. 打开你的 Sheet:
 *      https://docs.google.com/spreadsheets/d/1WbrSnVAh-Id3FiNdu_8BUtpuhJN9W96tGAkocX4YIN4/edit
 *   2. 菜单 Extensions → Apps Script,把本文件全部内容粘贴进去,保存。
 *   3. 右上 Deploy → New deployment → 类型选 "Web app"。
 *      - Execute as: Me
 *      - Who has access: Anyone           ← 必须是 Anyone,客户端才能 POST
 *   4. Deploy,复制那条 .../exec 的 URL,发给我。
 *      我会把它填进 src/lib/tracking.ts 的 APPS_SCRIPT_URL 并重新部署网站。
 *
 * 之后每个使用事件都会自动追加一行到 "events" 工作表。
 ****************************************************************************/

var SHEET_NAME = 'events';
var HEADERS = ['received_at', 'ts', 'session_id', 'user_email', 'anon_id',
               'type', 'mode', 'detail', 'duration_sec', 'device', 'browser', 'lang', 'referrer'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    sheet_().appendRow([
      new Date(),
      d.ts || '', d.session_id || '', d.user_email || '', d.anon_id || '',
      d.type || '', d.mode || '', d.detail || '', d.duration_sec || 0,
      d.device || '', d.browser || '', d.lang || '', d.referrer || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Health check: opening the /exec URL in a browser should show {"ok":true}.
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, sheet: SHEET_NAME }))
    .setMimeType(ContentService.MimeType.JSON);
}

// One-off cleanup: delete every logged row but KEEP the header (row 1) and every
// other tab. Run it straight from the editor — pick `clearEvents` in the function
// dropdown and hit ▶ Run. No re-deploy needed (this is not part of the web app).
// New events keep appending below the header afterwards.
function clearEvents() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last > 1) sh.deleteRows(2, last - 1); // rows 2..last, header untouched
  SpreadsheetApp.getActive().toast('已清空 ' + Math.max(0, last - 1) + ' 行,表头保留。', '完成', 5);
}
