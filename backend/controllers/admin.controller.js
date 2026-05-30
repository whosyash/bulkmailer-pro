const { readCodes, writeCodes } = require('../middleware/auth');

/** Generate a license key: XXXX-XXXX-XXXX format */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}

/** GET /api/admin/codes */
function listCodes(req, res) {
  const codes = readCodes();
  res.json({ success: true, data: codes });
}

/** POST /api/admin/codes — create a new access code */
function createCode(req, res) {
  const { clientName, notes } = req.body;
  if (!clientName?.trim()) {
    return res.status(400).json({ success: false, message: 'Client name is required.' });
  }

  const codes = readCodes();
  const newCode = {
    code: generateCode(),
    clientName: clientName.trim(),
    notes: notes?.trim() || '',
    active: true,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    useCount: 0
  };

  codes.push(newCode);
  writeCodes(codes);

  res.status(201).json({ success: true, data: newCode, message: `Access code created for ${clientName}.` });
}

/** PATCH /api/admin/codes/:code/revoke — toggle active status */
function revokeCode(req, res) {
  const { code } = req.params;
  const codes = readCodes();
  const entry = codes.find(c => c.code === code);

  if (!entry) return res.status(404).json({ success: false, message: 'Code not found.' });

  entry.active = !entry.active;
  writeCodes(codes);

  res.json({
    success: true,
    data: entry,
    message: entry.active ? `Access restored for ${entry.clientName}.` : `Access revoked for ${entry.clientName}.`
  });
}

/** DELETE /api/admin/codes/:code — permanently delete */
function deleteCode(req, res) {
  const { code } = req.params;
  const codes = readCodes();
  const idx = codes.findIndex(c => c.code === code);

  if (idx === -1) return res.status(404).json({ success: false, message: 'Code not found.' });

  const [removed] = codes.splice(idx, 1);
  writeCodes(codes);

  res.json({ success: true, message: `Code for ${removed.clientName} deleted.` });
}

module.exports = { listCodes, createCode, revokeCode, deleteCode };
