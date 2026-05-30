const path = require('path');
const fs = require('fs');
const { parseCSV, parseXLSX } = require('../services/parser.service');
const {
  startSendSession, addSseClient, pauseSession, cancelSession,
  getSessionStatus, getSessionReport, getSendHistory, checkSpamWords, findTemplate
} = require('../services/mailer.service');
const { getLimitInfo, updateCustomLimit, resetCustomLimit } = require('../services/limiter.service');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const TEMPLATES_PATH = path.join(DATA_DIR, 'templates.json');

function readTemplates() {
  try { return JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8')); }
  catch { return []; }
}

/** POST /api/upload — parse CSV/XLSX, return recipients */
async function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filePath = req.file.path;

  try {
    let result;
    if (ext === '.csv') {
      result = await parseCSV(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      result = parseXLSX(filePath);
    } else {
      return res.status(415).json({ success: false, message: 'Only .csv and .xlsx files are supported.' });
    }

    // Clean up temp file
    try { fs.unlinkSync(filePath); } catch {}

    res.json({ success: true, data: result, message: `Parsed ${result.validCount} valid recipients.` });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    res.status(400).json({ success: false, message: err.message });
  }
}

/** GET /api/limits — current daily limit info for the configured sender */
async function getLimits(req, res) {
  const config = req.senderConfig || {};
  if (!config.email) {
    return res.status(400).json({ success: false, message: 'No sender configured.' });
  }
  const info = getLimitInfo(config.email);
  res.json({ success: true, data: info });
}

/** POST /api/limits/update */
async function updateLimits(req, res) {
  const { limit } = req.body;
  const config = req.senderConfig || {};

  if (!limit || isNaN(Number(limit))) {
    return res.status(400).json({ success: false, message: 'Please provide a valid numeric limit.' });
  }

  try {
    updateCustomLimit(config.email, Number(limit));
    const info = getLimitInfo(config.email);
    res.json({
      success: true,
      data: info,
      message: `Limit updated to ${limit}/day. Note: Gmail's hard server limit is 500. Staying under 400 is strongly recommended.`
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/** POST /api/limits/reset */
async function resetLimits(req, res) {
  resetCustomLimit();
  const config = req.senderConfig || {};
  const info = config.email ? getLimitInfo(config.email) : {};
  res.json({ success: true, data: info, message: 'Daily limit reset to default.' });
}

/** POST /api/send — start a send session */
async function sendEmails(req, res) {
  const { recipients, count, randomize, addUnsubscribe } = req.body;
  const config = req.senderConfig;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'No recipients provided.' });
  }

  const templates = readTemplates();
  if (!templates.length) {
    return res.status(400).json({ success: false, message: 'Please create at least one template before sending.' });
  }

  // Verify all templates have non-empty bodies
  const emptyTemplate = templates.find(t => !t.body || !t.body.trim());
  if (emptyTemplate) {
    return res.status(400).json({
      success: false,
      message: `Template '${emptyTemplate.name}' has an empty body. Edit it first.`
    });
  }

  const limitInfo = getLimitInfo(config.email);
  if (limitInfo.remaining <= 0) {
    return res.status(429).json({
      success: false,
      message: `Daily limit reached for ${config.email}. Resets at midnight. Sent today: ${limitInfo.sentToday}/${limitInfo.dailyLimit}`
    });
  }

  const sendCount = Math.min(Number(count) || recipients.length, limitInfo.remaining, recipients.length);

  const result = await startSendSession({
    config,
    recipients,
    templates,
    count: sendCount,
    randomize: Boolean(randomize),
    addUnsubscribe: addUnsubscribe !== false
  });

  res.json({
    success: true,
    data: result,
    message: `Send session started. Sending ${result.toSend} emails.`
  });
}

/** GET /api/send/stream/:sessionId — SSE stream for real-time progress */
function streamProgress(req, res) {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send a heartbeat immediately so the client knows the connection is open
  res.write(`data: ${JSON.stringify({ event: 'connected', sessionId })}\n\n`);

  const added = addSseClient(sessionId, res);
  if (!added) {
    res.write(`data: ${JSON.stringify({ event: 'error', message: 'Session not found.' })}\n\n`);
    res.end();
  }

  // Keep connection alive with periodic heartbeats
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 15000);

  req.on('close', () => clearInterval(heartbeat));
}

/** GET /api/send/status — polling fallback for current session status */
async function getStatus(req, res) {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required.' });

  const status = getSessionStatus(sessionId);
  if (!status) return res.status(404).json({ success: false, message: 'Session not found.' });

  res.json({ success: true, data: status });
}

/** POST /api/send/pause — toggle pause for a session */
async function pauseSend(req, res) {
  const { sessionId } = req.body;
  const result = pauseSession(sessionId);
  if (!result) return res.status(404).json({ success: false, message: 'Session not found.' });
  res.json({ success: true, data: result, message: result.paused ? 'Send paused.' : 'Send resumed.' });
}

/** POST /api/send/cancel — cancel a running session */
async function cancelSend(req, res) {
  const { sessionId } = req.body;
  const ok = cancelSession(sessionId);
  if (!ok) return res.status(404).json({ success: false, message: 'Session not found.' });
  res.json({ success: true, message: 'Send session cancelled.' });
}

/** GET /api/send/report/:id */
async function getReport(req, res) {
  const { id } = req.params;
  const report = getSessionReport(id);
  if (!report) return res.status(404).json({ success: false, message: 'Session report not found.' });
  res.json({ success: true, data: report });
}

/** GET /api/send/history */
async function getHistory(req, res) {
  const history = getSendHistory();
  res.json({ success: true, data: history });
}

/** GET /api/send/spam-check — check subject for spam words */
async function spamCheck(req, res) {
  const { subject } = req.query;
  if (!subject) return res.json({ success: true, data: { words: [], safe: true } });
  const words = checkSpamWords(subject);
  res.json({ success: true, data: { words, safe: words.length === 0 } });
}

module.exports = {
  uploadFile, getLimits, updateLimits, resetLimits,
  sendEmails, streamProgress, getStatus, pauseSend, cancelSend,
  getReport, getHistory, spamCheck
};
