import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey() {
  const secret = process.env.AFFILIATE_CREDENTIALS_SECRET || process.env.SESSION_SECRET || 'textilelaunch-default';
  return crypto.scryptSync(secret, 'salt-affiliate', KEY_LENGTH);
}

/**
 * Encrypt a string. Returns base64(iv + authTag + encrypted).
 */
export function encrypt(plainText) {
  if (!plainText) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt a string produced by encrypt().
 */
export function decrypt(cipherText) {
  if (!cipherText) return '';
  const key = getKey();
  const buf = Buffer.from(cipherText, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) return '';
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
