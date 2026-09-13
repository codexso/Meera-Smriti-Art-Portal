/**
 * Generates a new SOHAM.LICENSE key + its hash.
 *
 * Usage:
 *   node scripts/generate-license-hash.js
 *   node scripts/generate-license-hash.js "MY-OWN-CUSTOM-KEY"
 *
 * Take the printed KEY and set it as LICENSE_KEY in your environment.
 * Take the printed HASH and set it as LICENSE_KEY_HASH.
 * Both must be set on the server for it to boot successfully.
 */

const crypto = require('crypto');

const key = process.argv[2] || crypto.randomBytes(24).toString('hex');
const hash = crypto.createHash('sha256').update(key).digest('hex');

console.log('\nSOHAM.LICENSE key pair generated:\n');
console.log('LICENSE_KEY=' + key);
console.log('LICENSE_KEY_HASH=' + hash);
console.log('\nSet BOTH of these as environment variables on your server (e.g. in Render\'s dashboard).');
console.log('Keep LICENSE_KEY secret -- it is effectively the password that unlocks the deployment.\n');
