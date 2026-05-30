const fs = require('fs');
const path = require('path');

const DAILY_LIMITS = {
  'gmail.com': 400, 'googlemail.com': 400,
  'outlook.com': 250, 'hotmail.com': 250, 'live.com': 250,
  'yahoo.com': 400, 'yahoo.co.in': 400,
  'icloud.com': 200, 'custom': 100
};

const PROVIDER_MAX = {
  'gmail.com': 500, 'googlemail.com': 500,
  'outlook.com': 300, 'hotmail.com': 300, 'live.com': 300,
  'yahoo.com': 500, 'yahoo.co.in': 500,
  'icloud.com': 300, 'custom': 200
};

function readJSON(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getDomain(email) {
  return (email || '').split('@')[1]?.toLowerCase() || 'custom';
}

function getDefaultLimit(email) {
  return DAILY_LIMITS[getDomain(email)] ?? DAILY_LIMITS.custom;
}

function getProviderMax(email) {
  return PROVIDER_MAX[getDomain(email)] ?? PROVIDER_MAX.custom;
}

function getEffectiveLimit(email, dataDir) {
  const cfg = readJSON(path.join(dataDir, 'config.json'), {});
  return (cfg.customDailyLimit > 0) ? cfg.customDailyLimit : getDefaultLimit(email);
}

function getSentToday(email, dataDir) {
  const log = readJSON(path.join(dataDir, 'sendLog.json'), { emailCounts: {} });
  return log.emailCounts?.[email]?.[getTodayKey()] || 0;
}

function incrementSent(email, dataDir, count = 1) {
  const logPath = path.join(dataDir, 'sendLog.json');
  const log = readJSON(logPath, { emailCounts: {}, sessions: [] });
  if (!log.emailCounts) log.emailCounts = {};
  if (!log.emailCounts[email]) log.emailCounts[email] = {};
  const today = getTodayKey();
  log.emailCounts[email][today] = (log.emailCounts[email][today] || 0) + count;
  writeJSON(logPath, log);
}

function getLimitInfo(email, dataDir) {
  const limit = getEffectiveLimit(email, dataDir);
  const sentToday = getSentToday(email, dataDir);
  const cfg = readJSON(path.join(dataDir, 'config.json'), {});
  return {
    email,
    domain: getDomain(email),
    dailyLimit: limit,
    defaultLimit: getDefaultLimit(email),
    customLimit: cfg.customDailyLimit || null,
    sentToday,
    remaining: Math.max(0, limit - sentToday),
    providerMax: getProviderMax(email),
    limitReached: sentToday >= limit
  };
}

function updateCustomLimit(email, newLimit, dataDir) {
  const max = getProviderMax(email);
  if (newLimit > max) throw new Error(`Limit cannot exceed provider maximum of ${max}.`);
  if (newLimit < 1) throw new Error('Limit must be at least 1.');
  const cfgPath = path.join(dataDir, 'config.json');
  const cfg = readJSON(cfgPath, {});
  cfg.customDailyLimit = newLimit;
  writeJSON(cfgPath, cfg);
}

function resetCustomLimit(dataDir) {
  const cfgPath = path.join(dataDir, 'config.json');
  const cfg = readJSON(cfgPath, {});
  delete cfg.customDailyLimit;
  writeJSON(cfgPath, cfg);
}

module.exports = {
  DAILY_LIMITS, PROVIDER_MAX,
  getDomain, getDefaultLimit, getProviderMax, getEffectiveLimit,
  getSentToday, incrementSent, getLimitInfo, updateCustomLimit, resetCustomLimit
};
