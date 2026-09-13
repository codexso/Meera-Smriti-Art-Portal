/**
 * Minimal file-based storage. No database server required -- data lives
 * as JSON files under /data. Fine for a small site's enquiries and user
 * accounts; each read/write is synchronous and the files are small.
 *
 * IMPORTANT: on most free hosting tiers (including Render's free plan)
 * the filesystem is ephemeral -- it can be wiped on redeploy or restart.
 * This is fine for getting a real admin panel working now, but if you
 * need enquiries/accounts to survive redeploys long-term, move this to
 * a real database or a managed disk later.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function ensureFile(filename, defaultValue) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
  return filePath;
}

function readAll(filename, defaultValue) {
  const filePath = ensureFile(filename, defaultValue);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || JSON.stringify(defaultValue));
  } catch (err) {
    return defaultValue;
  }
}

function writeAll(filename, data) {
  const filePath = ensureFile(filename, []);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  readAll,
  writeAll
};
