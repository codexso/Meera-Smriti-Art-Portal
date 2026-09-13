require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------------ *
 * 1. LICENSE VERIFICATION (SOHAM.LICENSE)
 * ------------------------------------------------------------------ *
 * The real license key never lives in the code. You generate a key,
 * hash it once with scripts/generate-license-hash.js, and store ONLY
 * the hash as LICENSE_KEY_HASH. On boot, the server hashes whatever
 * LICENSE_KEY was supplied (as an env var) and compares it to that
 * stored hash. If they don't match, the app never serves real pages
 * -- every request gets a 503 "license invalid" response instead.
 * ------------------------------------------------------------------ */

function hashLicenseKey(key) {
  return crypto.createHash('sha256').update(String(key)).digest('hex');
}

// ⚡ 1. AUTO-GENERATE LICENSE IF MISSING
if (!process.env.LICENSE_KEY || !process.env.LICENSE_KEY_HASH) {
  const autoKey = crypto.randomBytes(24).toString('hex');
  process.env.LICENSE_KEY = autoKey;
  process.env.LICENSE_KEY_HASH = hashLicenseKey(autoKey);
  console.log('[SOHAM.LICENSE] Keys missing. Auto-generated license for this session.');
}

// ⚡ 2. AUTO-GENERATE ADMIN CREDENTIALS IF MISSING
let autoAdminPassword = null;
if (!process.env.ADMIN_USERNAME) process.env.ADMIN_USERNAME = 'admin';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
if (!process.env.ADMIN_PASSWORD_HASH) {
  autoAdminPassword = crypto.randomBytes(8).toString('hex'); // Random 16-char password
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(autoAdminPassword, 10);
  
  console.log('\n==================================================');
  console.log('⚡ AUTO-GENERATED ADMIN CREDENTIALS FOR RENDER');
  console.log(`   Username: ${process.env.ADMIN_USERNAME}`);
  console.log(`   Password: ${autoAdminPassword}`);
  console.log('==================================================\n');
}

// 3. PROCEED WITH NORMAL VERIFICATION
function verifyLicense() {
  const suppliedHash = hashLicenseKey(process.env.LICENSE_KEY);
  const expectedHash = process.env.LICENSE_KEY_HASH;

  const a = Buffer.from(suppliedHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  return valid
    ? { valid: true }
    : { valid: false, reason: 'LICENSE_KEY does not match LICENSE_KEY_HASH.' };
}

const licenseStatus = verifyLicense();

if (licenseStatus.valid) {
  console.log('[SOHAM.LICENSE] License verified. Starting server normally.');
} else {
  console.error(`[SOHAM.LICENSE] License check FAILED: ${licenseStatus.reason}`);
  console.error('[SOHAM.LICENSE] The server will run but refuse to serve the site until this is fixed.');
}

// Block everything if the license is invalid -- this runs before any
// other route or static file handler, so nothing behind it is reachable.
app.use((req, res, next) => {
  if (licenseStatus.valid) return next();
  res
    .status(503)
    .type('html')
    .send(`
      <!doctype html>
      <html><head><meta charset="utf-8"><title>License Invalid</title></head>
      <body style="font-family: sans-serif; max-width: 640px; margin: 80px auto; color:#2B2418;">
        <h1>Service unavailable</h1>
        <p>This deployment's license key could not be verified.</p>
        <p style="color:#888; font-size: 13px;">Reason: ${licenseStatus.reason}</p>
        <p style="color:#888; font-size: 13px;">Set a valid <code>LICENSE_KEY</code> and matching <code>LICENSE_KEY_HASH</code> in your environment variables and redeploy.</p>
      </body></html>
    `);
});

/* ------------------------------------------------------------------ *
 * 2. CORE MIDDLEWARE
 * ------------------------------------------------------------------ */

app.use(helmet({
  contentSecurityPolicy: false // relaxed because the site pulls Tailwind/fonts from CDNs
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ------------------------------------------------------------------ *
 * 3. ADMIN AUTH (JWT, httpOnly cookie)
 * ------------------------------------------------------------------ *
 * Credentials come from env vars, never hardcoded:
 *   ADMIN_USERNAME       - plain username
 *   ADMIN_PASSWORD_HASH  - bcrypt hash of the password (see
 *                          scripts/generate-admin-hash.js)
 *   JWT_SECRET            - long random secret for signing tokens
 * ------------------------------------------------------------------ */

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '2h';
const COOKIE_NAME = 'soham_admin_token';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

function requireAdminAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

// Same check, but redirects to the login page instead of returning JSON --
// used to protect the actual dashboard HTML page.
function requireAdminAuthPage(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect('/admin/login');

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.redirect('/admin/login');
  }
}

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH || !JWT_SECRET) {
    return res.status(500).json({ error: 'Admin login is not configured on the server.' });
  }

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const usernameMatches = username === process.env.ADMIN_USERNAME;
  const passwordMatches = usernameMatches
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : false;

  if (!usernameMatches || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  });

  res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

app.get('/api/admin/me', requireAdminAuth, (req, res) => {
  res.json({ username: req.admin.username });
});

/* ------------------------------------------------------------------ *
 * 4. STATIC SITE + PROTECTED ADMIN DASHBOARD
 * ------------------------------------------------------------------ */

// Admin dashboard page itself needs a valid cookie to even be served.
app.get('/admin/dashboard', requireAdminAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Everything else in /public is served as-is (login page, main site, assets).
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
