/**
 * Simple password gate — reads APP_PASSWORD from env.
 * If the env var is not set, the app is open (dev mode).
 * All /api routes except /api/auth/* require a valid token.
 */

const TOKENS = new Set(); // in-memory valid tokens

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function authMiddleware(req, res, next) {
  // Skip if no password configured (dev / first-run)
  if (!process.env.APP_PASSWORD) return next();

  // Allow auth routes through
  if (req.path.startsWith('/auth')) return next();

  // EventSource can't set headers — SSE stream passes token as query param
  const token = req.headers['x-app-token'] || req.query.token;
  if (!token || !TOKENS.has(token)) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  next();
}

function loginHandler(req, res) {
  const { password } = req.body;
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    // No password set — issue a token anyway so frontend works
    const token = generateToken();
    TOKENS.add(token);
    return res.json({ success: true, token });
  }

  if (password !== appPassword) {
    return res.status(401).json({ success: false, message: 'Incorrect password.' });
  }

  const token = generateToken();
  TOKENS.add(token);
  res.json({ success: true, token });
}

function checkHandler(req, res) {
  if (!process.env.APP_PASSWORD) {
    return res.json({ success: true, passwordRequired: false });
  }
  const token = req.headers['x-app-token'];
  res.json({
    success: true,
    passwordRequired: true,
    authenticated: !!(token && TOKENS.has(token))
  });
}

module.exports = { authMiddleware, loginHandler, checkHandler };
