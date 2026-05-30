const fs = require('fs');
const path = require('path');

function validateSender(req, res, next) {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(path.join(req.dataDir, 'config.json'), 'utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'No sender configuration found. Please configure your email in Settings first.' });
  }

  if (!config.email || !config.appPassword || !config.smtpHost) {
    return res.status(400).json({ success: false, message: 'Sender configuration is incomplete. Please fill in all fields in Settings.' });
  }

  req.senderConfig = config;
  next();
}

module.exports = { validateSender };
