const express = require('express');
const router = express.Router();
const { listCodes, createCode, revokeCode, deleteCode } = require('../controllers/admin.controller');

router.get('/codes', listCodes);
router.post('/codes', createCode);
router.patch('/codes/:code/revoke', revokeCode);
router.delete('/codes/:code', deleteCode);

module.exports = router;
