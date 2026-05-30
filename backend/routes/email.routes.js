const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { validateSender } = require('../middleware/validateSender');

const {
  uploadFile, getLimits, updateLimits, resetLimits,
  sendEmails, streamProgress, getStatus, pauseSend, cancelSend,
  getReport, getHistory, spamCheck
} = require('../controllers/email.controller');

// Multer config — store uploads in /uploads, 5MB limit, only csv/xlsx
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error('Only .csv and .xlsx files are supported.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// File upload
router.post('/upload', upload.single('file'), uploadFile);

// Limits
router.get('/limits', validateSender, getLimits);
router.post('/limits/update', validateSender, updateLimits);
router.post('/limits/reset', validateSender, resetLimits);

// Send
router.post('/send', validateSender, sendEmails);
router.get('/send/stream/:sessionId', streamProgress);
router.get('/send/status', getStatus);
router.post('/send/pause', pauseSend);
router.post('/send/cancel', cancelSend);
router.get('/send/report/:id', getReport);
router.get('/send/history', getHistory);
router.get('/send/spam-check', spamCheck);

module.exports = router;
