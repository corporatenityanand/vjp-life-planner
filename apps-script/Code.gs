/**
 * VJP Life Planner – Google Sheet backend.
 * Paste this into the Sheet: Extensions > Apps Script, replace everything in Code.gs, save,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * Data lives in the "Store" tab: one row per record (key, updated at, JSON split across columns).
 */
const TOKEN = 'CHANGE-ME';   // set your own secret; the planner asks for the same value once per device
const SHEET = 'Store';
const CHUNK = 40000;         // Sheets cells hold up to 50,000 characters

function doGet(e) {
  if (!ok_(e.parameter.token)) return out_({ ok: false, error: 'Wrong token' });
  return out_({ ok: true, docs: readAll_() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Bad request' }); }
  if (!ok_(body.token)) return out_({ ok: false, error: 'Wrong token' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    const keys = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
    const saved = [];
    const now = new Date();
    Object.keys(body.docs || {}).forEach(k => {
      const json = JSON.stringify(body.docs[k]);
      const parts = [];
      for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
      let row = keys.indexOf(k) + 2;
      if (row < 2) { row = sh.getLastRow() + 1; keys.push(k); }
      const width = Math.max(sh.getLastColumn(), parts.length + 2);
      const values = [k, now].concat(parts);
      while (values.length < width) values.push('');
      sh.getRange(row, 1, 1, width).setNumberFormat('@').setValues([values]);
      sh.getRange(row, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss').setValue(now);
      saved.push(k);
    });
    SpreadsheetApp.flush();
    return out_({ ok: true, saved: saved, at: now.toISOString() });
  } finally {
    lock.releaseLock();
  }
}

function readAll_() {
  const sh = sheet_();
  const docs = {};
  if (sh.getLastRow() < 2) return docs;
  sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues().forEach(r => {
    if (!r[0]) return;
    const json = r.slice(2).join('');
    if (json) { try { docs[r[0]] = JSON.parse(json); } catch (err) { /* skip a damaged row */ } }
  });
  return docs;
}

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { const first = ss.getSheets()[0]; if (String(first.getRange(1, 1).getValue()) === 'key') { first.setName(SHEET); sh = first; } }
  if (!sh) { sh = ss.insertSheet(SHEET); sh.getRange(1, 1, 1, 3).setValues([['key', 'updated', 'json']]); }
  return sh;
}
function ok_(t) { return TOKEN !== 'CHANGE-ME' && t === TOKEN; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
