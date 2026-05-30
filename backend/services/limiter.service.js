const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../data/sendLog.json');
const CONFIG_PATH = path.join(__dirname, '../data/config.json');

const DAILY_LIMITS = {
  'gmail.com': 400,
  'googlemail.com': 400,
  'outlook.com': 250,
  'hotmail.com': 250,
  'live.com': 250,
  'yahoo.com': 400,
  'yahoo.co.in': 400,
  'icloud.com': 200,
  'custom': 100
};

const PROVIDER_MAX = {
  'gmail.com': 500,
  'googlemail.com': 500,
  'outlook.com': 300,
  'hotmail.com': 300,
  'live.com': 300,
  'yahoo.com': 500,
  'yahoo.co.in': 500,
  'icloud.com': 300,
  'custom': 200
};

function readLog() {
  try {
    const raw = fs.readFileSync(LOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.emailCounts) parsed.emailCounts = {};
    if (!parsed.sessions) parsed.sessions = [];
    return parsed;
  } catch {
    return { emailCounts: {}, sessions: [] };
  }
}

function writeLog(log) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getDomain(email) {
  return (email || '').split('@')[1]?.toLowerCase() || 'custom';
}

function getDefaultLimit(email) {
  const domain = getDomain(email);
  return DAILY_LIMITS[domain] ?? DAILY_LIMITS.custom;
}

function getProviderMax(email) {
  const domain = getDomain(email);
  return PROVIDER_MAX[domain] ?? PROVIDER_MAX.custom;
}

function getEffectiveLimit(email) {
  const config = readConfig();
  if (config.customDailyLimit && config.customDailyLimit > 0) {
    return config.customDailyLimit;
  }
  return getDefaultLimit(email);
}

function getSentToday(email) {
  const log = readLog();
  const today = getTodayKey();
  return (log.emailCounts[email]?.[today]) || 0;
}

/**
 * Increment sent count for an email address by the given amount
 */
function incrementSent(email, count = 1) {
  const log = readLog();
  const today = getTodayKey();
  if (!log.emailCounts[email]) log.emailCounts[email] = {};
  log.emailCounts[email][today] = (log.emailCounts[email][today] || 0) + count;
  writeLog(log);
}

/**
 * Get full limit information for a sender email address
 */
function getLimitInfo(email) {
  const limit = getEffectiveLimit(email);
  const sentToday = getSentToday(email);
  const remaining = Math.max(0, limit - sentToday);
  const domain = getDomain(email);
  const providerMax = getProviderMax(email);
  const config = readConfig();

  return {
    email,
    domain,
    dailyLimit: limit,
    defaultLimit: getDefaultLimit(email),
    customLimit: config.customDailyLimit || null,
    sentToday,
    remaining,
    providerMax,
    limitReached: remaining <= 0
  };
}

/**
 * Update the custom daily limit (validates against provider max)
 */
function updateCustomLimit(email, newLimit) {
  const providerMax = getProviderMax(email);
  if (newLimit > providerMax) {
    throw new Error(`Limit ${newLimit} exceeds provider maximum of ${providerMax} for ${getDomain(email)}.`);
  }
  if (newLimit < 1) {
    throw new Error('Limit must be at least 1.');
  }
  const config = readConfig();
  config.customDailyLimit = newLimit;
  writeConfig(config);
}

/**
 * Remove any custom daily limit override (restore defaults)
 */
function resetCustomLimit() {
  const config = readConfig();
  delete config.customDailyLimit;
  writeConfig(config);
}

module.exports = {
  DAILY_LIMITS,
  PROVIDER_MAX,
  getEffectiveLimit,
  getDefaultLimit,
  getProviderMax,
  getSentToday,
  incrementSent,
  getLimitInfo,
  updateCustomLimit,
  resetCustomLimit,
  getDomain
};
