const path = require('path');
const fs = require('fs');
const { parseCSV, parseXLSX } = require('../services/parser.service');
const {
  startSendSession, addSseClient, pauseSession, cancelSession,
  getSessionStatus, getSessionReport, getSendHistory, checkSpamWords
} = require('../services/mailer.service');
const { getLimitInfo, updateCustomLimit, resetCustomLimit } = require('../services/limiter.service');

function readTemplates(dataDir) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, 'templates.json'), 'utf8')); }
  catch { return []; }
}

async function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filePath = req.file.path;
  try {
    let result;
    if (ext === '.csv') result = await parseCSV(filePath);
    else if (ext === '.xlsx' || ext === '.xls') result = parseXLSX(filePath);
    else return res.status(415).json({ success: false, message: 'Only .csv and .xlsx files are supported.' });
    try { fs.unlinkSync(filePath); } catch {}
    res.json({ success: true, data: result, message: `Parsed ${result.validCount} valid recipients.` });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    res.status(400).json({ success: false, message: err.message });
  }
}

async function getLimits(req, res) {
  const config = req.senderConfig || {};
  if (!config.email) return res.status(400).json({ success: false, message: 'No sender configured.' });
  res.json({ success: true, data: getLimitInfo(config.email, req.dataDir) });
}

async function updateLimits(req, res) {
  const { limit } = req.body;
  const config = req.senderConfig || {};
  if (!limit || isNaN(Number(limit)))
    return res.status(400).json({ success: false, message: 'Please provide a valid numeric limit.' });
  try {
    updateCustomLimit(config.email, Number(limit), req.dataDir);
    const info = getLimitInfo(config.email, req.dataDir);
    res.json({ success: true, data: info,
      message: `Limit updated to ${limit}/day. Gmail's hard limit is 500 — staying under 400 is recommended.` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function resetLimits(req, res) {
  resetCustomLimit(req.dataDir);
  const config = req.senderConfig || {};
  const info = config.email ? getLimitInfo(config.email, req.dataDir) : {};
  res.json({ success: true, data: info, message: 'Daily limit reset to default.' });
}

async function sendEmails(req, res) {
  const { recipients, count, randomize, addUnsubscribe } = req.body;
  const config = req.senderConfig;

  if (!recipients?.length)
    return res.status(400).json({ success: false, message: 'No recipients provided.' });

  const templates = readTemplates(req.dataDir);
  if (!templates.length)
    return res.status(400).json({ success: false, message: 'Please create at least one template before sending.' });

  const emptyTemplate = templates.find(t => !t.body?.trim());
  if (emptyTemplate)
    return res.status(400).json({ success: false, message: `Template '${emptyTemplate.name}' has an empty body.` });

  const limitInfo = getLimitInfo(config.email, req.dataDir);
  if (limitInfo.remaining <= 0)
    return res.status(429).json({ success: false,
      message: `Daily limit reached for ${config.email}. Resets at midnight. Sent today: ${limitInfo.sentToday}/${limitInfo.dailyLimit}` });

  const sendCount = Math.min(Number(count) || recipients.length, limitInfo.remaining, recipients.length);
  const result = await startSendSession({
    config, recipients, templates,
    count: sendCount,
    randomize: Boolean(randomize),
    addUnsubscribe: addUnsubscribe !== false,
    dataDir: req.dataDir
  });

  res.json({ success: true, data: result, message: `Send session started. Sending ${result.toSend} emails.` });
}

function streamProgress(req, res) {
  const { sessionId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ event: 'connected', sessionId })}\n\n`);
  if (!addSseClient(sessionId, res)) {
    res.write(`data: ${JSON.stringify({ event: 'error', message: 'Session not found.' })}\n\n`);
    res.end();
  }
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 15000);
  req.on('close', () => clearInterval(heartbeat));
}

async function getStatus(req, res) {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId required.' });
  const status = getSessionStatus(sessionId);
  if (!status) return res.status(404).json({ success: false, message: 'Session not found.' });
  res.json({ success: true, data: status });
}

async function pauseSend(req, res) {
  const result = pauseSession(req.body.sessionId);
  if (!result) return res.status(404).json({ success: false, message: 'Session not found.' });
  res.json({ success: true, data: result, message: result.paused ? 'Paused.' : 'Resumed.' });
}

async function cancelSend(req, res) {
  if (!cancelSession(req.body.sessionId))
    return res.status(404).json({ success: false, message: 'Session not found.' });
  res.json({ success: true, message: 'Cancelled.' });
}

async function getReport(req, res) {
  const report = getSessionReport(req.params.id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
  res.json({ success: true, data: report });
}

async function getHistory(req, res) {
  res.json({ success: true, data: getSendHistory(req.dataDir) });
}

async function spamCheck(req, res) {
  const words = req.query.subject ? checkSpamWords(req.query.subject) : [];
  res.json({ success: true, data: { words, safe: words.length === 0 } });
}

module.exports = {
  uploadFile, getLimits, updateLimits, resetLimits,
  sendEmails, streamProgress, getStatus, pauseSend, cancelSend,
  getReport, getHistory, spamCheck
};
