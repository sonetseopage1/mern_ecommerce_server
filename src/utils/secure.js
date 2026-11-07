const crypto = require('crypto');

// Small AES-256-GCM helper so gateway passwords are not stored as plain text.
// The key is derived from APP_SECRET (or JWT_SECRET) in server/.env.
const key = () => crypto.createHash('sha256').update(process.env.APP_SECRET || process.env.JWT_SECRET || 'change-me').digest();

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

function decrypt(payload) {
  if (!payload) return '';
  try {
    const [iv, tag, enc] = payload.split('.').map((s) => Buffer.from(s, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return ''; // wrong key / corrupted value
  }
}

module.exports = { encrypt, decrypt };
