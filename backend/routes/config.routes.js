const express = require('express');
const router = express.Router();
const { getConfig, saveConfig, verifyConfig } = require('../controllers/config.controller');

router.get('/', getConfig);
router.post('/save', saveConfig);
router.post('/verify', verifyConfig);

module.exports = router;
