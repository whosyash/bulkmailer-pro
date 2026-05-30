const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const TEMPLATES_PATH = path.join(DATA_DIR, 'templates.json');

function readTemplates() {
  try {
    return JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeTemplates(templates) {
  fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(templates, null, 2));
}

/** GET /api/templates */
async function listTemplates(req, res) {
  const templates = readTemplates();
  res.json({ success: true, data: templates });
}

/** POST /api/templates */
async function createTemplate(req, res) {
  const { name, niche, subject, body } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Template name is required.' });
  if (!subject || !subject.trim()) return res.status(400).json({ success: false, message: 'Subject line is required.' });
  if (!body || !body.trim()) return res.status(400).json({ success: false, message: `Template '${name}' has an empty body. Please add content.` });

  const now = new Date().toISOString();
  const template = {
    id: uuidv4(),
    name: name.trim(),
    niche: (niche || 'general').trim(),
    subject: subject.trim(),
    body: body.trim(),
    createdAt: now,
    updatedAt: now
  };

  const templates = readTemplates();
  templates.push(template);
  writeTemplates(templates);

  res.status(201).json({ success: true, data: template, message: 'Template created.' });
}

/** PUT /api/templates/:id */
async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, niche, subject, body } = req.body;

  const templates = readTemplates();
  const idx = templates.findIndex(t => t.id === id);

  if (idx === -1) return res.status(404).json({ success: false, message: 'Template not found.' });
  if (body !== undefined && !body.trim()) {
    return res.status(400).json({ success: false, message: `Template '${name || templates[idx].name}' has an empty body.` });
  }

  const updated = {
    ...templates[idx],
    ...(name !== undefined && { name: name.trim() }),
    ...(niche !== undefined && { niche: niche.trim() }),
    ...(subject !== undefined && { subject: subject.trim() }),
    ...(body !== undefined && { body: body.trim() }),
    updatedAt: new Date().toISOString()
  };

  templates[idx] = updated;
  writeTemplates(templates);

  res.json({ success: true, data: updated, message: 'Template updated.' });
}

/** DELETE /api/templates/:id */
async function deleteTemplate(req, res) {
  const { id } = req.params;
  const templates = readTemplates();
  const idx = templates.findIndex(t => t.id === id);

  if (idx === -1) return res.status(404).json({ success: false, message: 'Template not found.' });

  templates.splice(idx, 1);
  writeTemplates(templates);

  res.json({ success: true, message: 'Template deleted.' });
}

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };
