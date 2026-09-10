/**
 * 账号管理路由（管理员唯一入库入口）
 *
 * - POST /api/accounts/students  单个添加学生入库
 * - POST /api/accounts/teachers  单个添加教师入库
 * - GET  /api/accounts           账号列表（搜索/筛选/分页）
 * - PUT  /api/accounts/:id/status    启用/禁用
 * - PUT  /api/accounts/:id/password  重置密码（恢复身份证后6位）
 * - PUT  /api/accounts/:id/assign    分配学院/班级
 *
 * 全部接口需 authMiddleware + requireAdmin（在 index.js 挂载时指定）
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { hashIdCard, encryptIdCard, decryptIdCard, initialPasswordFromIdCard, maskIdCard } from '../lib/crypto.js';
import { handleRouteError, httpError, normalizeText } from '../lib/admin.js';

const router = Router();

// ====== 校验工具 ======

const ID_CARD_RE = /^\d{17}[\dXx]$/;
const PHONE_RE = /^1\d{10}$/;

function validateIdCard(idCard) {
  const s = normalizeText(idCard);
  if (!ID_CARD_RE.test(s)) {
    throw httpError(400, '身份证号格式不正确（需 18 位）', 'ID_CARD_FORMAT');
  }
  return s.toUpperCase();
}

function validatePhone(phone) {
  const s = normalizeText(phone);
  if (!PHONE_RE.test(s)) {
    throw httpError(400, '手机号格式不正确（需 11 位）', 'PHONE_FORMAT');
  }
  return s;
}

// ====== 学号/工号派号（并发安全） ======

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

// ====== 审计日志 ======

async function writeAuditLog(connection, operator, action, targetId, detail) {
  await connection.query(
    `INSERT INTO account_logs (operator_id, operator_name, action, target_id, detail)
     VALUES (?, ?, ?, ?, ?)`,
    [operator?.id || null, operator?.name || '', action, String(targetId), detail ? JSON.stringify(detail) : null]
  );
}

// ====== 入库核心 ======

async function createAccount(connection, { name, phone, idCard, role, subRole, department, className, refType, operator }) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) {
    throw httpError(400, '姓名不能为空', 'NAME_REQUIRED');
  }

  const validatedPhone = validatePhone(phone);
  const validatedIdCard = validateIdCard(idCard);
  const idCardHash = hashIdCard(validatedIdCard);
  const idCardEnc = encryptIdCard(validatedIdCard);
  const initialPassword = initialPasswordFromIdCard(validatedIdCard);

  // 查重：身份证
  const [idCardDup] = await connection.query(
    'SELECT id, user_no FROM users WHERE id_card_hash = ? LIMIT 1',
    [idCardHash]
  );
  if (idCardDup.length > 0) {
    throw httpError(409, `身份证已入库（学号/工号 ${idCardDup[0].user_no}）`, 'ID_CARD_EXISTS');
  }

  // 查重：手机号（account）
  const [phoneDup] = await connection.query(
    'SELECT id, user_no FROM users WHERE account = ? LIMIT 1',
    [validatedPhone]
  );
  if (phoneDup.length > 0) {
    throw httpError(409, `手机号已入库（学号/工号 ${phoneDup[0].user_no}）`, 'PHONE_EXISTS');
  }

  // 派号
  const userNo = await generateUserNo(connection, refType);

  // 加密初始密码
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(initialPassword, salt);

  // 写 users 表
  const [userResult] = await connection.query(
    `INSERT INTO users (
       account, password, name, department, role, sub_role, status,
       user_no, id_card_hash, id_card_enc, ref_type, need_change_password
     ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1)`,
    [validatedPhone, hashedPassword, normalizedName, department || '', role, subRole || '',
     userNo, idCardHash, idCardEnc, refType]
  );

  const userId = userResult.insertId;

  // 写总库（students 或 teachers）
  let refId;
  if (refType === 'student') {
    refId = userNo;
    await connection.query(
      `INSERT INTO students (id, student_id, name, phone, class_name, department, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [refId, refId, normalizedName, validatedPhone, className || '', department || '']
    );
  } else {
    // teacher
    const [teacherResult] = await connection.query(
      `INSERT INTO teachers (name, department_id) VALUES (?, NULL)`,
      [normalizedName]
    );
    refId = String(teacherResult.insertId);
  }

  // 关联 ref_id
  await connection.query('UPDATE users SET ref_id = ? WHERE id = ?', [refId, userId]);

  await writeAuditLog(connection, operator, 'create', refId, { userNo, name: normalizedName, role, refType });

  return {
    id: userId,
    userNo,
    account: validatedPhone,
    name: normalizedName,
    role,
    subRole: subRole || '',
    refType,
    refId,
    initialPassword,
  };
}

// ====== 路由 ======

router.post('/students', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const result = await createAccount(connection, {
      name: req.body?.name,
      phone: req.body?.phone,
      idCard: req.body?.idCard,
      role: 'student',
      subRole: null,
      department: req.body?.department,
      className: req.body?.className,
      refType: 'student',
      operator: req.user,
    });
    res.status(201).json({ success: true, account: result });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.post('/teachers', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const subRole = normalizeText(req.body?.subRole) || 'teacher';
    const result = await createAccount(connection, {
      name: req.body?.name,
      phone: req.body?.phone,
      idCard: req.body?.idCard,
      role: 'teacher',
      subRole,
      department: req.body?.department,
      className: null,
      refType: 'teacher',
      operator: req.user,
    });
    res.status(201).json({ success: true, account: result });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.get('/', async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    const keyword = normalizeText(req.query.keyword);
    if (keyword) {
      conditions.push('(name LIKE ? OR account LIKE ? OR user_no LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }

    const role = normalizeText(req.query.role);
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    const refType = normalizeText(req.query.refType);
    if (refType) {
      conditions.push('ref_type = ?');
      params.push(refType);
    }

    const status = normalizeText(req.query.status);
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT id, account, name, department, role, sub_role, status,
              user_no, ref_type, ref_id, need_change_password, last_login_at, created_at
       FROM users ${whereClause}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      success: true,
      total: countRow.total,
      page,
      pageSize,
      accounts: rows,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.put('/:id/status', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const status = normalizeText(req.body?.status);
    if (status !== 'active' && status !== 'inactive') {
      throw httpError(400, '状态只能为 active 或 inactive', 'INVALID_STATUS');
    }
    const [result] = await connection.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) {
      throw httpError(404, '账号不存在', 'ACCOUNT_NOT_FOUND');
    }
    await writeAuditLog(connection, req.user, 'status_change', req.params.id, { status });
    res.json({ success: true, message: status === 'active' ? '已启用' : '已禁用' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.put('/:id/password', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT id, id_card_enc, user_no FROM users WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    if (rows.length === 0) {
      throw httpError(404, '账号不存在', 'ACCOUNT_NOT_FOUND');
    }
    const user = rows[0];
    const idCard = decryptIdCard(user.id_card_enc);
    const initialPassword = initialPasswordFromIdCard(idCard);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(initialPassword, salt);
    await connection.query(
      'UPDATE users SET password = ?, need_change_password = 1 WHERE id = ?',
      [hashedPassword, req.params.id]
    );
    await writeAuditLog(connection, req.user, 'reset_password', req.params.id, { userNo: user.user_no });
    res.json({ success: true, message: '密码已重置为身份证后 6 位，下次登录需修改密码' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.put('/:id/assign', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const department = normalizeText(req.body?.department);
    const className = normalizeText(req.body?.className);
    const [result] = await connection.query(
      'UPDATE users SET department = ? WHERE id = ?',
      [department, req.params.id]
    );
    if (result.affectedRows === 0) {
      throw httpError(404, '账号不存在', 'ACCOUNT_NOT_FOUND');
    }
    // 同步到 students 表
    await connection.query(
      'UPDATE students SET department = ?, class_name = ? WHERE id = (SELECT ref_id FROM users WHERE id = ?)',
      [department, className || '', req.params.id]
    );
    await writeAuditLog(connection, req.user, 'assign', req.params.id, { department, className });
    res.json({ success: true, message: '分配成功' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

// ====== 批量导入 / 导出 ======

/**
 * POST /api/accounts/import - Excel 批量入库（JSON 行数组）
 * 接收: { rows: [{ name, phone, idCard, department?, className?, role?, subRole? }] }
 * 返回: { success, results: { inserted, failed, errors: [] } }
 */
router.post('/import', async (req, res) => {
  const connection = await pool.getConnection();
  const results = { inserted: 0, failed: 0, errors: [] };
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const refType = row.role === 'teacher' ? 'teacher' : 'student';
        const role = refType === 'teacher' ? 'teacher' : 'student';
        const subRole = refType === 'teacher' ? (normalizeText(row.subRole) || 'teacher') : null;
        await createAccount(connection, {
          name: row.name,
          phone: row.phone,
          idCard: row.idCard,
          role,
          subRole,
          department: row.department,
          className: row.className,
          refType,
          operator: req.user,
        });
        results.inserted++;
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, name: row.name || '', message: error.message || '入库失败' });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

/**
 * GET /api/accounts/export - 导出全部账号（身份证脱敏）
 */
router.get('/export', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, account, name, department, role, sub_role, status,
              user_no, ref_type, ref_id, need_change_password, last_login_at, created_at
       FROM users ORDER BY id ASC`
    );
    // 身份证脱敏：不返回 id_card_enc，只返回脱敏标记
    const accounts = rows.map((r) => ({
      ...r,
      id_card: '******', // 脱敏，不透出
    }));
    res.json({ success: true, accounts });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * GET /api/accounts/export-students - 导出在库学生全量数据
 */
router.get('/export-students', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT student_id AS 学号, name AS 姓名, phone AS 手机号,
              department AS 学院, class_name AS 班级, status AS 状态
       FROM students ORDER BY student_id ASC`
    );
    res.json({ success: true, students: rows });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * GET /api/accounts/export-teachers - 导出在库教师全量数据
 */
router.get('/export-teachers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.name AS 姓名, t.phone AS 手机号, t.email AS 邮箱,
              d.name AS 学院
       FROM teachers t
       LEFT JOIN departments d ON d.id = t.department_id
       ORDER BY t.name ASC`
    );
    res.json({ success: true, teachers: rows });
  } catch (error) {
    handleRouteError(res, error);
  }
});

export default router;
