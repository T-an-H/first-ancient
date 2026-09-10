import '../load-env.js';
import pool from '../db.js';
import bcrypt from 'bcryptjs';
import { decryptIdCard, initialPasswordFromIdCard } from '../lib/crypto.js';

/**
 * 重置所有非管理员账号密码为「身份证后6位」。
 * - 有 id_card_enc 的账号：解密身份证取后6位作为初始密码。
 * - 无 id_card_enc 的账号：用 666666 兜底。
 * 全部置 need_change_password = 1，下次登录强制改密。
 */
async function resetPasswords() {
  const [rows] = await pool.query(
    'SELECT id, id_card_enc FROM users WHERE role <> ? OR role IS NULL',
    ['admin']
  );

  let byIdCard = 0;
  let fallback = 0;
  const fallbackHash = await bcrypt.hash('666666', await bcrypt.genSalt(10));

  for (const row of rows) {
    let pwd = '';
    if (row.id_card_enc) {
      try {
        const idCard = decryptIdCard(row.id_card_enc);
        pwd = initialPasswordFromIdCard(idCard);
      } catch {
        pwd = '';
      }
    }

    if (pwd) {
      const hash = await bcrypt.hash(pwd, await bcrypt.genSalt(10));
      await pool.query(
        'UPDATE users SET password = ?, need_change_password = 1 WHERE id = ?',
        [hash, row.id]
      );
      byIdCard++;
    } else {
      await pool.query(
        'UPDATE users SET password = ?, need_change_password = 1 WHERE id = ?',
        [fallbackHash, row.id]
      );
      fallback++;
    }
  }

  console.log(`共重置 ${rows.length} 个非管理员账号：按身份证后6位 ${byIdCard} 个，兜底666666 ${fallback} 个，均需首登改密。`);
  await pool.end();
  process.exit(0);
}

resetPasswords().catch((err) => {
  console.error('失败:', err);
  process.exit(1);
});
