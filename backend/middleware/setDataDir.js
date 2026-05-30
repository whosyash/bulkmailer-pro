const fs = require('fs');
const path = require('path');

const DEFAULT_DATA = {
  'config.json': {},
  'templates.json': [],
  'sendLog.json': { emailCounts: {}, sessions: [] }
};

function sanitize(code) {
  // Prevent path traversal — only allow alphanumeric and hyphens
  return (code || 'default').replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase() || 'default';
}

/**
 * Resolves the per-client data directory from req.sessionCode and attaches
 * it as req.dataDir. Creates the directory and default JSON files on first visit.
 * Must run after authMiddleware (which sets req.sessionCode).
 */
function setDataDir(req, res, next) {
  if (req.path.startsWith('/auth')) return next();

  const base = process.env.DATA_DIR || path.join(__dirname, '../data');
  const code = sanitize(req.sessionCode || 'default');
  const clientDir = path.join(base, 'clients', code);

  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }

  Object.entries(DEFAULT_DATA).forEach(([file, def]) => {
    const p = path.join(clientDir, file);
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(def, null, 2));
  });

  req.dataDir = clientDir;
  next();
}

module.exports = { setDataDir };
