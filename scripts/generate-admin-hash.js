/**
 * Generates a bcrypt hash for your admin password.
 *
 * Usage:
 *   node scripts/generate-admin-hash.js "Your$trongPassword123!"
 *
 * Take the printed hash and set it as ADMIN_PASSWORD_HASH in your
 * environment. The plain password itself is never stored anywhere.
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('\nPlease supply a password to hash, e.g.\n');
  console.error('  node scripts/generate-admin-hash.js "Your$trongPassword123!"\n');
  process.exit(1);
}

if (password.length < 12) {
  console.warn('\nWarning: that password is shorter than 12 characters. Use a longer, random password for an admin account.\n');
}

const hash = bcrypt.hashSync(password, 12);

console.log('\nADMIN_PASSWORD_HASH generated:\n');
console.log(hash);
console.log('\nSet this as ADMIN_PASSWORD_HASH in your environment variables.');
console.log('Also set ADMIN_USERNAME to whatever username you want to log in with.\n');
