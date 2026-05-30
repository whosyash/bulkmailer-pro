const fs = require('fs');
const path = require('path');
const { verifyConnection } = require('../services/mailer.service');

const CONFIG_PATH = path.join(__dirname, '../data/config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/** GET /api/config — returns saved config with password masked */
async function getConfig(req, res) {
  const config = readConfig();
  const safeConfig = { ...config };
  if (safeConfig.appPassword) {
    safeConfig.appPassword = safeConfig.appPassword.replace(/./g, '•').slice(0, 16);
  }
  res.json({ success: true, data: safeConfig });
}

/** POST /api/config/save — persist sender config */
async function saveConfig(req, res) {
  const { email, appPassword, senderName, smtpHost, smtpPort, encryption } = req.body;

  if (!email || !appPassword || !smtpHost) {
    return res.status(400).json({ success: false, message: 'email, appPassword, and smtpHost are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address format.' });
  }

  const config = { email, appPassword, senderName: senderName || email, smtpHost, smtpPort: smtpPort || 587, encryption: encryption || 'TLS' };
  writeConfig(config);

  res.json({ success: true, message: 'Sender configuration saved.', data: { email, senderName: config.senderName, smtpHost } });
}

/** POST /api/config/verify — test SMTP handshake without sending mail */
async function verifyConfig(req, res) {
  const { email, appPassword, smtpHost, smtpPort, encryption } = req.body;

  if (!email || !appPassword || !smtpHost) {
    return res.status(400).json({ success: false, message: 'email, appPassword, and smtpHost are required.' });
  }

  const result = await verifyConnection({ email, appPassword, smtpHost, smtpPort: smtpPort || 587, encryption: encryption || 'TLS' });

  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
}

module.exports = { getConfig, saveConfig, verifyConfig };
