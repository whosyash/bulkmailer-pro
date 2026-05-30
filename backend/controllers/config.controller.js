const fs = require('fs');
const path = require('path');
const { verifyConnection } = require('../services/mailer.service');

function readConfig(dataDir) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8')); }
  catch { return {}; }
}

function writeConfig(dataDir, config) {
  fs.writeFileSync(path.join(dataDir, 'config.json'), JSON.stringify(config, null, 2));
}

async function getConfig(req, res) {
  const config = readConfig(req.dataDir);
  const safe = { ...config };
  if (safe.appPassword) safe.appPassword = '•'.repeat(16);
  res.json({ success: true, data: safe });
}

async function saveConfig(req, res) {
  const { email, appPassword, senderName, smtpHost, smtpPort, encryption } = req.body;
  if (!email || !smtpHost) {
    return res.status(400).json({ success: false, message: 'email and smtpHost are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address format.' });
  }

  const existing = readConfig(req.dataDir);
  const config = {
    email,
    // Keep existing password if new one not provided
    appPassword: appPassword && appPassword.trim() ? appPassword : existing.appPassword,
    senderName: senderName || email,
    smtpHost,
    smtpPort: smtpPort || 587,
    encryption: encryption || 'TLS'
  };
  writeConfig(req.dataDir, config);
  res.json({ success: true, message: 'Sender configuration saved.', data: { email, senderName: config.senderName, smtpHost } });
}

async function verifyConfig(req, res) {
  const { email, appPassword, smtpHost, smtpPort, encryption } = req.body;
  if (!email || !appPassword || !smtpHost) {
    return res.status(400).json({ success: false, message: 'email, appPassword, and smtpHost are required.' });
  }
  const result = await verifyConnection({ email, appPassword, smtpHost, smtpPort: smtpPort || 587, encryption: encryption || 'TLS' });
  if (result.success) res.json({ success: true, message: result.message });
  else res.status(400).json({ success: false, message: result.error });
}

module.exports = { getConfig, saveConfig, verifyConfig };
