/**
 * Auth middleware — supports two roles:
 *   admin  : ADMIN_PASSWORD env var → access to /api/admin/* and full app
 *   client : unique access code stored in access-codes.json → app only
 *
 * Token format stored in-memory: { token, role, code }
 */

const fs = require('fs');
const path = require('path');

// access-codes.json lives at the root data dir, not in a client subdir
const ROOT_DATA = process.env.DATA_DIR || path.join(__dirname, '../data');
const CODES_PATH = () => path.join(ROOT_DATA, 'access-codes.json');

const sessions = new Map(); // token → { role: 'admin'|'client', code }

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function readCodes() {
  try { return JSON.parse(fs.readFileSync(CODES_PATH(), 'utf8')); }
  catch { return []; }
}

function writeCodes(codes) {
  fs.writeFileSync(CODES_PATH(), JSON.stringify(codes, null, 2));
}

// ─── Middleware ────────────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  if (req.path.startsWith('/auth')) return next(); // login/check are public

  const token = req.headers['x-app-token'] || req.query.token;
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in with a valid access code.' });
  }

  // Admin-only routes
  if (req.path.startsWith('/admin') && session.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  req.sessionRole = session.role;
  req.sessionCode = session.code;
  next();
}

// ─── Auth handlers ─────────────────────────────────────────────────────────────

function loginHandler(req, res) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Access code is required.' });

  const adminPassword = process.env.ADMIN_PASSWORD;

  // Admin login
  if (adminPassword && code === adminPassword) {
    const token = generateToken();
    sessions.set(token, { role: 'admin', code: 'admin' });
    return res.json({ success: true, token, role: 'admin' });
  }

  // Client access code login
  const codes = readCodes();
  const entry = codes.find(c => c.code === code.trim().toUpperCase());

  if (!entry) {
    return res.status(401).json({ success: false, message: 'Invalid access code. Contact the administrator.' });
  }
  if (!entry.active) {
    return res.status(403).json({ success: false, message: 'This access code has been revoked. Contact the administrator.' });
  }

  // Update last used
  entry.lastUsed = new Date().toISOString();
  entry.useCount = (entry.useCount || 0) + 1;
  writeCodes(codes);

  const token = generateToken();
  sessions.set(token, { role: 'client', code: entry.code });
  res.json({ success: true, token, role: 'client' });
}

function checkHandler(req, res) {
  const token = req.headers['x-app-token'] || req.query.token;
  const session = sessions.get(token);

  res.json({
    success: true,
    authenticated: !!session,
    role: session?.role || null
  });
}

function logoutHandler(req, res) {
  const token = req.headers['x-app-token'];
  if (token) sessions.delete(token);
  res.json({ success: true });
}

module.exports = { authMiddleware, loginHandler, checkHandler, logoutHandler, readCodes, writeCodes };
