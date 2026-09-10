/**
 * 数据修复脚本：把 users 表所有账号改为 11 位手机号，自动生成学工号，
 * 并同步到 students / teachers 表，让学生管理、教师管理页能同步显示数据。
 *
 * 用法：
 *   node server/sql/fix_account_data.js          # dry-run（只打印计划，不改数据）
 *   node server/sql/fix_account_data.js --apply  # 实际执行
 *
 * 逻辑：
 *   - 每个账号分配一个唯一 11 位手机号（13800000001 起）
 *   - 学号/工号用 account_sequences 自动生成（学生：年份+序号，教师：年份T+序号）
 *   - students 表：有则更新 phone，无则插入
 *   - teachers 表：有则更新 phone，无则插入
 *   - users 表：更新 account(手机号)、user_no、ref_type、ref_id
 *   - 管理员账号不改（保持 admin）
 */
import '../load-env.js';
import pool from '../db.js';
import bcrypt from 'bcryptjs';

const isApply = process.argv.includes('--apply');

function log(msg) {
  console.log(`[${isApply ? 'APPLY' : 'DRY-RUN'}] ${msg}`);
}

// 生成学号/工号（与 accounts.js 的 generateUserNo 逻辑一致）
async function generateUserNo(connection, type) {
  const year = new Date().getFullYear();
  await connection.query(
    `INSERT INTO account_sequences (type, year, last_no)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1)`,
    [type, year]
  );
  const [rows] = await connection.query('SELECT LAST_INSERT_ID() AS seq');
  const seq = Number(rows[0].seq);
  const padded = String(seq).padStart(5, '0');
  if (type === 'teacher') {
    return `${year}T${padded}`;
  }
  return `${year}${padded}`;
}

// 生成假身份证号（18 位，用于密码初始化）
function generateIdCard(index) {
  // 110101 + 2000年 + 01月 + 01日 + 3位序号 + 校验位
  const base = `11010120000101${String(index).padStart(3, '0')}`;
  // 简单校验位（不严格，仅用于初始化密码）
  return base + 'X';
}

// 取身份证后 6 位作为初始密码
function initialPasswordFromIdCard(idCard) {
  const s = idCard.toUpperCase();
  return s.slice(-6);
}

async function fixAccountData() {
  log('=== 账号数据修复开始 ===');

  const connection = await pool.getConnection();

  try {
    // 1. 查所有 users（排除管理员）
    const [users] = await connection.query(
      `SELECT id, account, name, role, sub_role, user_no, ref_type, ref_id, department, status
       FROM users
       WHERE role <> 'admin' OR role IS NULL
       ORDER BY id`
    );
    log(`需处理账号共 ${users.length} 个（不含管理员）`);

    // 也查管理员，只打印不改
    const [admins] = await connection.query(
      `SELECT id, account, name, role FROM users WHERE role = 'admin'`
    );
    log(`管理员账号 ${admins.length} 个（不修改）`);
    for (const a of admins) {
      log(`  管理员: id=${a.id}, account=${a.account}, name=${a.name}`);
    }

    let phoneSeq = 1;
    let studentCount = 0;
    let teacherCount = 0;
    let skipCount = 0;

    for (const user of users) {
      // 生成 11 位手机号
      const phone = `138${String(phoneSeq).padStart(8, '0')}`;
      phoneSeq++;

      // 判断类型
      const isStudent = user.role === 'student';
      const isTeacher = user.role === 'teacher' || user.sub_role === 'mentor' || user.sub_role === 'leader';
      const refType = isStudent ? 'student' : 'teacher';

      // 生成学号/工号
      const userNo = await generateUserNo(connection, refType);

      // 生成假身份证和初始密码
      const idCard = generateIdCard(phoneSeq);
      const initialPassword = initialPasswordFromIdCard(idCard);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(initialPassword, salt);

      log(`  [${refType}] id=${user.id} name=${user.name} account: ${user.account} -> ${phone}  user_no: ${user.user_no || '(空)'} -> ${userNo}  初始密码: ${initialPassword}`);

      if (!isApply) {
        if (isStudent) studentCount++;
        else teacherCount++;
        continue;
      }

      // ====== 实际执行 ======

      if (isStudent) {
        // 查 students 表是否已有记录
        const [existingStudents] = await connection.query(
          'SELECT id, student_id FROM students WHERE id = ? OR student_id = ? OR phone = ? LIMIT 1',
          [user.ref_id || user.user_no || '', user.user_no || '', user.account]
        );

        if (existingStudents.length > 0) {
          // 更新现有学生记录
          await connection.query(
            `UPDATE students SET phone = ?, name = ?, status = ? WHERE id = ?`,
            [phone, user.name, user.status || 'active', existingStudents[0].id]
          );
          await connection.query(
            'UPDATE users SET account = ?, password = ?, user_no = ?, ref_type = ?, ref_id = ? WHERE id = ?',
            [phone, hashedPassword, userNo, 'student', existingStudents[0].id, user.id]
          );
        } else {
          // 新插入学生记录
          await connection.query(
            `INSERT INTO students (id, student_id, name, phone, class_name, department, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [userNo, userNo, user.name, phone, '', user.department || '']
          );
          await connection.query(
            'UPDATE users SET account = ?, password = ?, user_no = ?, ref_type = ?, ref_id = ? WHERE id = ?',
            [phone, hashedPassword, userNo, 'student', userNo, user.id]
          );
        }
        studentCount++;
      } else if (isTeacher) {
        // 查 teachers 表是否已有记录
        const [existingTeachers] = await connection.query(
          'SELECT id FROM teachers WHERE name = ? LIMIT 1',
          [user.name]
        );

        let teacherId;
        if (existingTeachers.length > 0) {
          teacherId = existingTeachers[0].id;
          // 更新现有教师记录
          await connection.query(
            `UPDATE teachers SET phone = ?, name = ? WHERE id = ?`,
            [phone, user.name, teacherId]
          );
        } else {
          // 新插入教师记录
          const [result] = await connection.query(
            `INSERT INTO teachers (name, phone) VALUES (?, ?)`,
            [user.name, phone]
          );
          teacherId = result.insertId;
        }

        await connection.query(
          'UPDATE users SET account = ?, password = ?, user_no = ?, ref_type = ?, ref_id = ? WHERE id = ?',
          [phone, hashedPassword, userNo, 'teacher', String(teacherId), user.id]
        );
        teacherCount++;
      } else {
        // 其他类型，只改 account 和 user_no
        await connection.query(
          'UPDATE users SET account = ?, password = ?, user_no = ? WHERE id = ?',
          [phone, hashedPassword, userNo, user.id]
        );
        skipCount++;
      }
    }

    log(`--- 汇总 ---`);
    log(`学生: ${studentCount}，教师: ${teacherCount}，其他: ${skipCount}`);
    log(`手机号范围: 138${String(1).padStart(8, '0')} ~ 138${String(phoneSeq - 1).padStart(8, '0')}`);
    log(`初始密码: 均为身份证后 6 位（首次登录需改密）`);

    log(isApply
      ? '=== 修复完成，数据已更新 ==='
      : '=== 以上为 dry-run 预览。加 --apply 参数执行实际修复。 ===');

  } finally {
    connection.release();
    await pool.end();
    process.exit(0);
  }
}

fixAccountData().catch((err) => {
  console.error('修复失败:', err);
  process.exit(1);
});
