/**
 * Free backend for GitHub Pages submissions.
 * 1) Create a Google Sheet.
 * 2) Open Extensions > Apps Script.
 * 3) Paste this file and deploy as Web App (Anyone).
 * 4) Put the Web App URL in CONFIG.answerSink.endpoint in script.js.
 */

const SHEET_NAME = 'answers';
const ADMIN_KEY = ''; // keep empty in git; set your real key only in local/private copy.
const TZ = 'GMT+7';
const HEADERS = [
  'Submitted At (GMT+7)',
  'First Valentine Date',
  'Wedding Date',
  'Reason',
  'Food',
  'Mood',
  'Bypass Used',
  'Client Submitted At (raw)'
];

function doPost(e) {
  try {
    const sheet = getSheet_();
    const body = parseBody_(e);
    const submittedAtGmt7 = formatGmt7_(new Date());

    sheet.appendRow([
      submittedAtGmt7,
      body.valentine_date_answer || '',
      body.wedding_date_answer || '',
      body.reason || '',
      body.food || '',
      body.mood || '',
      body.bypass_used || '',
      body.submitted_at || ''
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  if (ADMIN_KEY && String((e && e.parameter && e.parameter.key) || '') !== ADMIN_KEY) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const header = values.shift() || [];

  const rows = values.slice(-100).map((row) => {
    const obj = {};
    for (let i = 0; i < header.length; i += 1) {
      obj[String(header[i] || `col_${i + 1}`)] = row[i];
    }
    return obj;
  });

  return json_({ ok: true, rows });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const mismatch = HEADERS.some((header, index) => String(current[index] || '') !== header);
  if (mismatch) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  const contentType = String(e.postData.type || '').toLowerCase();
  const content = e.postData.contents || '';

  if (contentType.indexOf('application/json') >= 0 || contentType.indexOf('text/plain') >= 0) {
    return JSON.parse(content || '{}');
  }

  if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
    const obj = {};
    content.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (!k) return;
      obj[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    });
    return obj;
  }

  return {};
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatGmt7_(value) {
  const date = value instanceof Date ? value : new Date(value);
  const resolved = Number.isNaN(date.getTime()) ? new Date() : date;
  return Utilities.formatDate(resolved, TZ, 'yyyy-MM-dd HH:mm:ss');
}
