const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function readTemplates(dataDir) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, 'templates.json'), 'utf8')); }
  catch { return []; }
}

function writeTemplates(dataDir, templates) {
  fs.writeFileSync(path.join(dataDir, 'templates.json'), JSON.stringify(templates, null, 2));
}

async function listTemplates(req, res) {
  res.json({ success: true, data: readTemplates(req.dataDir) });
}

async function createTemplate(req, res) {
  const { name, niche, subject, body } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Template name is required.' });
  if (!subject?.trim()) return res.status(400).json({ success: false, message: 'Subject line is required.' });
  if (!body?.trim()) return res.status(400).json({ success: false, message: `Template '${name}' has an empty body.` });

  const now = new Date().toISOString();
  const template = { id: uuidv4(), name: name.trim(), niche: (niche || 'general').trim(),
    subject: subject.trim(), body: body.trim(), createdAt: now, updatedAt: now };

  const templates = readTemplates(req.dataDir);
  templates.push(template);
  writeTemplates(req.dataDir, templates);
  res.status(201).json({ success: true, data: template, message: 'Template created.' });
}

async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, niche, subject, body } = req.body;
  const templates = readTemplates(req.dataDir);
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Template not found.' });
  if (body !== undefined && !body.trim())
    return res.status(400).json({ success: false, message: `Template body cannot be empty.` });

  templates[idx] = {
    ...templates[idx],
    ...(name !== undefined && { name: name.trim() }),
    ...(niche !== undefined && { niche: niche.trim() }),
    ...(subject !== undefined && { subject: subject.trim() }),
    ...(body !== undefined && { body: body.trim() }),
    updatedAt: new Date().toISOString()
  };
  writeTemplates(req.dataDir, templates);
  res.json({ success: true, data: templates[idx], message: 'Template updated.' });
}

async function deleteTemplate(req, res) {
  const { id } = req.params;
  const templates = readTemplates(req.dataDir);
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Template not found.' });
  templates.splice(idx, 1);
  writeTemplates(req.dataDir, templates);
  res.json({ success: true, message: 'Template deleted.' });
}

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };
