/**
 * 存量迁移脚本：给现有 users 账号补 user_no / ref_type / ref_id 关联
 *
 * 用法：
 *   node --experimental-vm-modules server/sql/migrate_accounts.js          # dry-run（只打印影响行数）
 *   node --experimental-vm-modules server/sql/migrate_accounts.js --apply   # 实际执行
 *
 * 迁移逻辑：
 *   - students 表中有对应记录的 users → ref_type='student', user_no=原 student_id
 *   - teachers 表中有对应记录的 users → ref_type='teacher', user_no=原 account（手机号）
 *   - 其余 users → ref_type='', user_no='U' + id（兜底）
 *   - 旧学号保留不重映射，避免改外键
 *   - 迁移后清 students.password（消除双密码窗口期）
 *   - 清幽灵选课（enrollments 中 student_id 不在 students 表的行）
 */
import '../load-env.js';
import pool from '../db.js';

const isApply = process.argv.includes('--apply');

function log(msg) {
  console.log(`[${isApply ? 'APPLY' : 'DRY-RUN'}] ${msg}`);
}

async function migrateAccounts() {
  log('=== 存量迁移开始 ===');

  // 1. 查所有 users
  const [users] = await pool.query(
    'SELECT id, account, name, role, sub_role, user_no, ref_type, ref_id FROM users ORDER BY id'
  );
  log(`users 表共 ${users.length} 个账号`);

  let studentCount = 0;
  let teacherCount = 0;
  let otherCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    // 已有 user_no 的跳过
    if (user.user_no) {
      skippedCount++;
      continue;
    }

    let refType = '';
    let refId = '';
    let userNo = '';

    if (user.role === 'student') {
      // 查 students 表，用 name + account(手机号) 匹配
      const [studentRows] = await pool.query(
        'SELECT student_id, id FROM students WHERE phone = ? OR name = ? LIMIT 1',
        [user.account, user.name]
      );
      if (studentRows.length > 0) {
        refType = 'student';
        refId = studentRows[0].student_id || String(studentRows[0].id);
        userNo = studentRows[0].student_id || `S${user.id}`;
        studentCount++;
      } else {
        refType = 'student';
        userNo = `S${user.id}`;
        otherCount++;
      }
    } else if (user.role === 'teacher' || user.role === 'admin') {
      // 查 teachers 表
      const [teacherRows] = await pool.query(
        'SELECT id FROM teachers WHERE name = ? LIMIT 1',
        [user.name]
      );
      refType = 'teacher';
      refId = teacherRows.length > 0 ? String(teacherRows[0].id) : '';
      userNo = `T${user.id}`;
      teacherCount++;
    } else {
      userNo = `U${user.id}`;
      otherCount++;
    }

    if (isApply) {
      await pool.query(
        'UPDATE users SET user_no = ?, ref_type = ?, ref_id = ? WHERE id = ?',
        [userNo, refType, refId, user.id]
      );
    }
  }

  log(`学生关联: ${studentCount}，教师关联: ${teacherCount}，其他: ${otherCount}，已跳过: ${skippedCount}`);

  // 2. 清 students.password（消除双密码窗口期）
  const [[pwdRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM students WHERE password IS NOT NULL AND password <> ""'
  );
  log(`students 表有 ${pwdRow.total} 行非空 password，${isApply ? '已清空' : '将清空'}`);
  if (isApply) {
    await pool.query('UPDATE students SET password = NULL');
  }

  // 3. 清幽灵选课
  const [[ghostRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM enrollments WHERE student_id NOT IN (SELECT student_id FROM students)'
  );
  log(`幽灵选课: ${ghostRow.total} 行，${isApply ? '已删除' : '将删除'}`);
  if (isApply) {
    await pool.query(
      'DELETE FROM enrollments WHERE student_id NOT IN (SELECT student_id FROM students)'
    );
  }

  log('=== 存量迁移完成 ===');
  log(isApply
    ? '迁移已执行。请验证数据一致性。'
    : '以上为 dry-run 预览。加 --apply 参数执行实际迁移。');

  await pool.end();
  process.exit(0);
}

migrateAccounts().catch((err) => {
  console.error('迁移失败:', err);
  process.exit(1);
});
