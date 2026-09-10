/**
 * 身份证加密工具
 *
 * - hashIdCard: SHA-256 哈希，用于唯一索引查重（可索引、不可逆）
 * - encryptIdCard / decryptIdCard: AES-256-GCM 加解密原文，用于重置密码取后 6 位
 *
 * 密钥来自环境变量 IDCARD_ENC_KEY（32+ 字节），缺省仅用于开发。
 */
import crypto from 'node:crypto';

const ENC_KEY = process.env.IDCARD_ENC_KEY || 'dev-idcard-key-32bytes-long!!!!';

function getKey() {
  // AES-256 需要 32 字节密钥，对环境变量做 SHA-256 派生固定长度
  return crypto.createHash('sha256').update(ENC_KEY).digest();
}

/** 身份证 SHA-256 哈希（hex，64 字符），用于查重唯一索引 */
export function hashIdCard(idCard) {
  return crypto.createHash('sha256').update(String(idCard).trim()).digest('hex');
}

/** AES-256-GCM 加密身份证，返回 "iv:authTag:ciphertext" 的 hex 拼接串 */
export function encryptIdCard(idCard) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(String(idCard).trim(), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(':');
}

/** 解密 encryptIdCard 的输出，返回身份证原文 */
export function decryptIdCard(enc) {
  if (!enc || typeof enc !== 'string') return '';
  const parts = enc.split(':');
  if (parts.length !== 3) return '';
  const key = getKey();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/** 取身份证后 6 位作为初始密码（末位 X 转大写，保留前导 0） */
export function initialPasswordFromIdCard(idCard) {
  const tail = String(idCard).trim().slice(-6);
  return tail.toUpperCase();
}

/** 身份证脱敏显示：保留前 3 后 4，中间星号 */
export function maskIdCard(idCard) {
  const s = String(idCard).trim();
  if (s.length < 8) return '***';
  return `${s.slice(0, 3)}**********${s.slice(-4)}`;
}
