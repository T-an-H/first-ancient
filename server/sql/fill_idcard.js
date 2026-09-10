/**
 * 给老账号（没有真实身份证号的）生成随机身份证号，并重新加密存储。
 * 密码保持 666666 不变（已重置过），但 id_card_enc/id_card_hash 会写入。
 *
 * 用法：
 *   node server/sql/fill_idcard.js          # dry-run
 *   node server/sql/fill_idcard.js --apply  # 实际执行
 */
import '../load-env.js';
import pool from '../db.js';
import { hashIdCard, encryptIdCard, initialPasswordFromIdCard } from '../lib/crypto.js';
import bcrypt from 'bcryptjs';

const isApply = process.argv.includes('--apply');

function log(msg) {
  console.log(`[${isApply ? 'APPLY' : 'DRY-RUN''}] ${msg}`);
}

// 生成随机 18 位身份证号
// 格式：地区码(6位) + 出生日期(8位) + 顺序码(3位) + 校验位
function generateRandomIdCard(index) {
  const regions = ['110101', '310101', '440106', '440305', '330102', '420102', '510104'];
  const region = regions[index % regions.length];

  // 随机出生日期 1980-2005
  const year = 1980 + Math.floor(Math.random() * 25);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const birth = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;

  // 顺序码：奇数男偶数女，用 index 保证唯一
  const seq = String(100 + index).slice(-3);

  const base = region + birth + seq;

  // 计算校验位
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkMap = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(base[i], 10) * weights[i];
  }
  const check = checkMap[sum % 11];

  return base + check;
}

async function fillIdCard() {
  log('=== 给老账号补身份证号开始 ===');

  const [users] = await pool.query(
    `SELECT id, account, name, role, user_no, id_card_enc, id_card_hash
     FROM users
     WHERE (id_card_enc IS NULL OR id_card_enc = '' OR id_card_hash IS NULL OR id_card_hash = '')
       AND role <> 'admin'
     ORDER BY id`
  );

  log(`需补身份证号的账号: ${users.length} 个`);

  let count = 0;
  for (const user of users) {
    const idCard = generateRandomIdCard(count + 1);
    const idCardHash = hashIdCard(idCard);
    const idCardEnc = encryptIdCard(idCard);
    const pwd = initialPasswordFromIdCard(idCard);

    log(`  id=${user.id} name=${user.name} account=${user.account} user_no=${user.user_no} -> 身份证: ${idCard}  后6位: ${pwd}`);

    if (isApply) {
      await pool.query(
        'UPDATE users SET id_card_hash = ?, id_card_enc = ? WHERE id = ?',
        [idCardHash, idCardEnc, user.id]
      );
    }
    count++;
  }

  log(`--- 汇总 ---`);
  log(`已处理: ${count} 个账号`);
  log(isApply
    ? '=== 完成，老账号已补上随机身份证号 ==='
    : '=== 以上为 dry-run 预览。加 --apply 参数执行。 ===');

  await pool.end();
  process.exit(0);
}

fillIdCard().catch((err) => {
  console.error('失败:', err);
  process.exit(1);
});
