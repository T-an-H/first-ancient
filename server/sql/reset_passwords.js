import '../load-env.js';
import pool from '../db.js';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('666666', salt);
  const [r] = await pool.query(
    'UPDATE users SET password = ?, need_change_password = 1 WHERE role <> ? OR role IS NULL',
    [hash, 'admin']
  );
  console.log(`已重置 ${r.affectedRows} 个账号密码为 666666，首次登录需改密`);
  await pool.end();
  process.exit(0);
}

resetPasswords().catch((err) => {
  console.error('失败:', err);
  process.exit(1);
});
