const nodemailer = require('nodemailer');
const { convert } = require('html-to-text');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { incrementSent, getLimitInfo } = require('./limiter.service');

const activeSessions = new Map();

const SPAM_WORDS = [
  'free', 'winner', 'urgent', 'click here', 'buy now', 'limited offer',
  'act now', '100%', 'guaranteed', 'no cost', '$$$', 'make money',
  'cash bonus', 'double your', 'earn money', 'extra income', 'fast cash'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: parseInt(config.smtpPort, 10),
    secure: config.encryption === 'SSL',
    auth: { user: config.email, pass: config.appPassword },
    tls: { rejectUnauthorized: false }
  });
}

async function verifyConnection(config) {
  try {
    await createTransporter(config).verify();
    return { success: true, message: 'SMTP connection verified successfully.' };
  } catch (err) {
    return { success: false, error: parseSmtpError(err) };
  }
}

function parseSmtpError(err) {
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  const rc = err.responseCode || 0;
  if (code === 'ECONNREFUSED') return 'Cannot connect to email server. Check your SMTP host and port.';
  if (code === 'ETIMEDOUT' || code === 'ESOCKET') return 'Connection timed out. Check your internet connection.';
  if (code === 'EAUTH' || rc === 535 || msg.includes('535') || msg.includes('username and password not accepted'))
    return 'Authentication failed. Your email or app password is incorrect.';
  if (msg.includes('invalid credentials')) return 'Invalid credentials — wrong email or app password.';
  if (msg.includes('less secure') || msg.includes('app password'))
    return 'Enable 2-Step Verification and use an App Password at myaccount.google.com.';
  if (msg.includes('locked') || msg.includes('suspended'))
    return 'Account locked — check your Gmail inbox for a security alert.';
  if (rc === 550 || msg.includes('550')) return 'Recipient does not exist or rejected the email (550).';
  if (rc === 553 || msg.includes('553')) return "Sender address rejected by recipient's server (553).";
  if (rc === 421 || msg.includes('421')) return 'Too many connections — slow down sending rate (421).';
  return `SMTP Error: ${err.message || 'Unknown error'}`;
}

function substitutePlaceholders(template, recipient) {
  const sub = s => s
    .replace(/\{\{name\}\}/gi, recipient.name || 'there')
    .replace(/\{\{email\}\}/gi, recipient.email || '')
    .replace(/\{\{company\}\}/gi, recipient.company || '')
    .replace(/\{\{niche\}\}/gi, recipient.niche || '');
  return { subject: sub(template.subject), body: sub(template.body) };
}

function findTemplate(templates, recipient) {
  if (!templates?.length) return null;
  const rn = (recipient.niche || '').toLowerCase().trim();
  if (rn) {
    const specific = templates.find(t => (t.niche || '').toLowerCase().trim() === rn);
    if (specific) return specific;
  }
  return templates.find(t => !t.niche || t.niche.trim() === '' || t.niche.toLowerCase().trim() === 'general') || null;
}

function checkSpamWords(subject) {
  const lower = subject.toLowerCase();
  return SPAM_WORDS.filter(w => lower.includes(w.toLowerCase()));
}

function maskEmail(email) {
  const [user, domain] = (email || '').split('@');
  if (!user || !domain) return email;
  return user[0] + '***@' + domain;
}

function appendUnsubscribeFooter(html) {
  return html + `<p style="font-size:11px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:10px;">
    To unsubscribe, reply with 'UNSUBSCRIBE' in the subject line.</p>`;
}

function broadcastEvent(session, eventName, data) {
  const payload = `data: ${JSON.stringify({ event: eventName, ...data, sessionId: session.id })}\n\n`;
  session.sseClients = session.sseClients.filter(client => {
    try { client.write(payload); return true; } catch { return false; }
  });
}

function broadcastProgress(session, current, recipient, status, error) {
  const elapsed = (Date.now() - session.startTime) / 60000;
  const rate = elapsed > 0 ? session.sent / elapsed : 0;
  const remaining = session.toSend - current;
  broadcastEvent(session, 'progress', {
    current, total: session.toSend, sent: session.sent, failed: session.failed,
    skipped: session.skipped, remaining,
    currentEmail: maskEmail(recipient.email), currentStatus: status, error: error || null,
    percentage: Math.round((current / session.toSend) * 100),
    eta: rate > 0 ? Math.round((remaining / rate) * 60) : 0,
    rate: Math.round(rate * 10) / 10
  });
}

async function runSendLoop(session, recipients, config, templates, addUnsubscribe) {
  const transporter = createTransporter(config);
  let sentInBatch = 0;

  for (let i = 0; i < recipients.length; i++) {
    if (session.cancelled) {
      session.status = 'cancelled';
      broadcastEvent(session, 'cancelled', { message: 'Send session was cancelled.' });
      break;
    }

    const limitInfo = getLimitInfo(config.email, session.dataDir);
    if (limitInfo.remaining <= 0) {
      session.status = 'limit_reached';
      broadcastEvent(session, 'limit_reached', {
        message: `Daily limit reached after ${session.sent} emails. ${recipients.length - i} not sent. Resume tomorrow.`
      });
      break;
    }

    while (session.paused && !session.cancelled) await sleep(500);
    if (session.cancelled) break;

    const recipient = recipients[i];
    const template = findTemplate(templates, recipient);

    if (!template) {
      session.skipped++;
      session.results.push({ email: recipient.email, name: recipient.name, niche: recipient.niche,
        status: 'skipped', reason: `No matching template for niche "${recipient.niche || '(none)'}"`,
        timestamp: new Date().toISOString() });
      broadcastProgress(session, i + 1, recipient, 'skipped');
      continue;
    }

    const { subject, body } = substitutePlaceholders(template, recipient);
    const htmlBody = addUnsubscribe ? appendUnsubscribeFooter(body) : body;

    const mailOptions = {
      from: `"${config.senderName || config.email}" <${config.email}>`,
      to: recipient.email, replyTo: config.email, subject,
      html: htmlBody, text: convert(htmlBody, { wordwrap: 130 }),
      headers: {
        'X-Priority': '3', 'X-Mailer': 'BulkMailer Pro v1.0',
        'List-Unsubscribe': `<mailto:${config.email}?subject=UNSUBSCRIBE>`
      }
    };

    try {
      await transporter.sendMail(mailOptions);
      session.sent++;
      sentInBatch++;
      incrementSent(config.email, session.dataDir, 1);
      session.results.push({ email: recipient.email, name: recipient.name, niche: recipient.niche,
        status: 'sent', timestamp: new Date().toISOString() });
      broadcastProgress(session, i + 1, recipient, 'sent');
    } catch (err) {
      session.failed++;
      const errorMsg = parseSmtpError(err);
      session.results.push({ email: recipient.email, name: recipient.name, niche: recipient.niche,
        status: 'failed', reason: errorMsg, timestamp: new Date().toISOString() });
      broadcastProgress(session, i + 1, recipient, 'failed', errorMsg);
    }

    if (sentInBatch > 0 && sentInBatch % 50 === 0 && i < recipients.length - 1) {
      broadcastEvent(session, 'batch_pause', { message: 'Pausing 120s after 50 emails…', seconds: 120 });
      for (let s = 120; s > 0; s--) {
        if (session.cancelled) break;
        while (session.paused && !session.cancelled) await sleep(500);
        broadcastEvent(session, 'countdown', { seconds: s });
        await sleep(1000);
      }
    } else if (i < recipients.length - 1) {
      await sleep(3000 + Math.random() * 5000);
    }
  }

  if (session.status === 'running') {
    session.status = 'completed';
    session.endTime = Date.now();
    broadcastEvent(session, 'completed', {
      summary: { sent: session.sent, failed: session.failed, skipped: session.skipped,
        total: session.toSend, duration: session.endTime - session.startTime }
    });
  }

  saveSessionToLog(session);
}

async function startSendSession({ config, recipients, templates, count, randomize, addUnsubscribe, dataDir }) {
  const sessionId = uuidv4();
  let pool = [...recipients];
  if (randomize) pool = pool.sort(() => Math.random() - 0.5);
  pool = pool.slice(0, count);

  const limitInfo = getLimitInfo(config.email, dataDir);
  const toSend = Math.min(pool.length, limitInfo.remaining);

  const session = {
    id: sessionId, status: 'running', toSend, sent: 0, failed: 0, skipped: 0,
    results: [], startTime: Date.now(), endTime: null,
    paused: false, cancelled: false, sseClients: [],
    senderEmail: config.email, dataDir
  };

  activeSessions.set(sessionId, session);

  runSendLoop(session, pool.slice(0, toSend), config, templates, addUnsubscribe).catch(err => {
    session.status = 'error';
    broadcastEvent(session, 'error', { message: err.message });
    saveSessionToLog(session);
  });

  return { sessionId, toSend, limitInfo };
}

function saveSessionToLog(session) {
  try {
    const logPath = path.join(session.dataDir, 'sendLog.json');
    const log = (() => { try { return JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch { return { emailCounts: {}, sessions: [] }; } })();
    if (!log.sessions) log.sessions = [];
    log.sessions = [{
      id: session.id,
      date: new Date().toISOString().split('T')[0],
      sender: session.senderEmail,
      sent: session.sent, failed: session.failed, skipped: session.skipped,
      status: session.status,
      duration: (session.endTime || Date.now()) - session.startTime,
      startTime: new Date(session.startTime).toISOString()
    }, ...log.sessions].slice(0, 10);
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  } catch (err) {
    console.error('[mailer] Failed to persist session log:', err.message);
  }
}

function addSseClient(sessionId, res) {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  session.sseClients.push(res);
  res.on('close', () => { session.sseClients = session.sseClients.filter(c => c !== res); });
  return true;
}

function pauseSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  session.paused = !session.paused;
  session.status = session.paused ? 'paused' : 'running';
  return { paused: session.paused, status: session.status };
}

function cancelSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  session.cancelled = true;
  session.paused = false;
  return true;
}

function getSessionStatus(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  const { sseClients, ...data } = session;
  return data;
}

function getSessionReport(sessionId) {
  return getSessionStatus(sessionId);
}

function getSendHistory(dataDir) {
  try {
    const log = JSON.parse(fs.readFileSync(path.join(dataDir, 'sendLog.json'), 'utf8'));
    return log.sessions || [];
  } catch { return []; }
}

module.exports = {
  verifyConnection, startSendSession, addSseClient, pauseSession,
  cancelSession, getSessionStatus, getSessionReport, getSendHistory,
  checkSpamWords, findTemplate, SPAM_WORDS
};
