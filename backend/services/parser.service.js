const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_VARIANTS = ['email', 'Email', 'EMAIL', 'email_address', 'EmailAddress',
  'Email Address', 'emailaddress', 'E-mail', 'e-mail', 'mail', 'Mail'];
const NAME_VARIANTS = ['name', 'Name', 'NAME', 'first_name', 'FirstName',
  'First Name', 'firstname', 'full_name', 'FullName', 'Full Name'];
const NICHE_VARIANTS = ['niche', 'Niche', 'NICHE', 'category', 'Category',
  'CATEGORY', 'industry', 'Industry', 'INDUSTRY', 'segment', 'Segment'];
const COMPANY_VARIANTS = ['company', 'Company', 'COMPANY', 'company_name',
  'CompanyName', 'Company Name', 'organization', 'Organization', 'org', 'Org'];

/**
 * Find the first matching column name from a list of header alternatives.
 * Falls back to case-insensitive search.
 */
function findColumn(headers, variants) {
  for (const v of variants) {
    if (headers.includes(v)) return v;
  }
  const lowerHeaders = headers.map(h => h.toLowerCase());
  for (const v of variants) {
    const idx = lowerHeaders.indexOf(v.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function buildRecipient(row, emailCol, nameCol, nicheCol, companyCol, rowNum) {
  const emailRaw = row[emailCol];
  const email = emailRaw != null ? String(emailRaw).trim() : '';

  if (!email) {
    return { isValid: false, rowNum, error: `Row ${rowNum}: Empty email address`, raw: row };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, rowNum, email, error: `Row ${rowNum}: Malformed email address "${email}"`, raw: row };
  }

  return {
    isValid: true,
    rowNum,
    email: email.toLowerCase(),
    name: nameCol ? String(row[nameCol] ?? '').trim() : '',
    niche: nicheCol ? String(row[nicheCol] ?? '').trim() : '',
    company: companyCol ? String(row[companyCol] ?? '').trim() : ''
  };
}

function processRows(rows) {
  if (!rows.length) throw new Error('The uploaded file has no data rows.');

  const headers = Object.keys(rows[0]);
  const emailCol = findColumn(headers, EMAIL_VARIANTS);

  if (!emailCol) {
    throw new Error("No email column detected. Please ensure your file has a column named 'email' or 'Email'.");
  }

  const nameCol = findColumn(headers, NAME_VARIANTS);
  const nicheCol = findColumn(headers, NICHE_VARIANTS);
  const companyCol = findColumn(headers, COMPANY_VARIANTS);

  const valid = [];
  const invalid = [];

  rows.forEach((row, idx) => {
    const result = buildRecipient(row, emailCol, nameCol, nicheCol, companyCol, idx + 2);
    (result.isValid ? valid : invalid).push(result);
  });

  if (valid.length === 0) {
    throw new Error('No valid email addresses found in the file.');
  }

  const niches = [...new Set(valid.map(r => r.niche).filter(Boolean))];

  return {
    valid,
    invalid,
    totalRows: rows.length,
    validCount: valid.length,
    invalidCount: invalid.length,
    headers,
    detectedColumns: { emailCol, nameCol, nicheCol, companyCol },
    niches
  };
}

/**
 * Parse a CSV file from disk and return normalized recipient data.
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => rows.push(row))
      .on('end', () => {
        try {
          resolve(processRows(rows));
        } catch (err) {
          reject(err);
        }
      })
      .on('error', err => {
        reject(new Error(`Could not read file. It may be corrupted or password-protected. (${err.message})`));
      });
  });
}

/**
 * Parse an XLSX file from disk and return normalized recipient data.
 */
function parseXLSX(filePath) {
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (err) {
    throw new Error(`Could not read file. It may be corrupted or password-protected. (${err.message})`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The uploaded file has no sheets.');

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  return processRows(rows);
}

module.exports = { parseCSV, parseXLSX };
