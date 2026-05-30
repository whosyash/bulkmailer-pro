const express = require('express');
const router = express.Router();
const { listTemplates, createTemplate, updateTemplate, deleteTemplate } = require('../controllers/template.controller');

router.get('/', listTemplates);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
