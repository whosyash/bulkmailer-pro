require('express-async-errors');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const emailRoutes = require('./routes/email.routes');
const templateRoutes = require('./routes/template.routes');
const configRoutes = require('./routes/config.routes');
const adminRoutes = require('./routes/admin.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware, loginHandler, checkHandler, logoutHandler } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// DATA_DIR env var lets Railway volume override the default path
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

[dataDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const defaultDataFiles = {
  'templates.json': [],
  'sendLog.json': { emailCounts: {}, sessions: [] },
  'config.json': {}
};

Object.entries(defaultDataFiles).forEach(([file, defaultVal]) => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
  }
});

const isProduction = process.env.NODE_ENV === 'production';

// CORS — allow localhost in dev, same-origin in production (frontend served by Express)
app.use(cors({
  origin: isProduction ? false : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth endpoints (public)
app.post('/api/auth/login', loginHandler);
app.get('/api/auth/check', checkHandler);
app.post('/api/auth/logout', logoutHandler);

// Protect all other API routes
app.use('/api', authMiddleware);

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api', emailRoutes);

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'BulkMailer Pro API is running', timestamp: new Date().toISOString() });
});

// Serve React frontend in production (built output lives at ../frontend/dist)
if (isProduction) {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  // SPA fallback — all non-API routes return index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] BulkMailer Pro running on http://localhost:${PORT} (${isProduction ? 'production' : 'development'})`);
});

module.exports = app;
