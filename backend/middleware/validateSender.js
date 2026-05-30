const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../data/config.json');

/**
 * Middleware that verifies a sender config exists and has required fields before
 * allowing a send operation to proceed.
 */
function validateSender(req, res, next) {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return res.status(400).json({
      success: false,
      message: 'No sender configuration found. Please configure your email account in Settings first.'
    });
  }

  if (!config.email || !config.appPassword || !config.smtpHost) {
    return res.status(400).json({
      success: false,
      message: 'Sender configuration is incomplete. Please fill in all fields in Settings.'
    });
  }

  // Attach config to request so controllers can use it
  req.senderConfig = config;
  next();
}

module.exports = { validateSender };
