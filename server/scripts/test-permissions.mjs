/**
 * 鉴权与限流回归测试（离线，**不需要 MySQL**）
 *
 * 覆盖本次改造的核心安全行为：
 *  1. 管理类写接口收紧为仅管理员，但 GET 读接口仍然放行（不能被误伤）
 *  2. 排课写接口放行教职工（教师端「新建班级→补排课」依赖它）
 *  3. 小智导航接口不再免登录，且有条数限流
 *
 * 为什么离线：这些断言只依赖 authMiddleware / requireAdmin / requireStaff
 * 在进入路由 handler **之前** 的拦截行为。handler 自己去连库没关系——
 * 我们只断言 401/403/429 这些「到不了 handler」的响应。
 *
 * ⚠️ 路由形状必须与真实路由文件一致：本次改造只给「实际存在的写路由」挂了守卫，
 * 各资源的方法并不相同（teachers 没有 POST、categories 多一个 POST /sync）。
 * 若这里臆造出真实不存在的路由，会拿到 404 并误判成「守卫被绕过」。
 *
 * 运行：node server/scripts/test-permissions.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';
import express from 'express';
import JWT_SECRET from '../lib/jwt-secret.js';
import { authMiddleware, requireAdmin, requireStaff } from '../middleware/auth.js';

// ====== 真实路由形状（对照 routes/*.js 的 router.xxx 声明） ======

/** 管理类：写路由仅管理员。shape 必须与真实文件一致，不能多也不能少。 */
const ADMIN_RESOURCES = {
  '/api/departments': [['POST', '/'], ['PUT', '/:id'], ['DELETE', '/:id']],
  '/api/classes': [['POST', '/'], ['PUT', '/:id'], ['DELETE', '/:id']],
  '/api/students': [['POST', '/'], ['PUT', '/:id'], ['DELETE', '/:id']],
  '/api/teachers': [['PUT', '/:id'], ['DELETE', '/:id']],           // 无 POST
  '/api/categories': [['POST', '/'], ['PUT', '/:id'], ['DELETE', '/:id'], ['POST', '/sync']],
  '/api/courses': [['POST', '/'], ['PUT', '/:id'], ['DELETE', '/:id']],
};

/** 排课：写路由放行教职工（教师端新建班级会补写排课） */
const STAFF_RESOURCES = {
  '/api/schedules': [['POST', '/bulk'], ['PUT', '/:id'], ['DELETE', '/:id']],
};

/** 把定义编译成 `METHOD 路径` 的用例列表，并造出对应的 mock 应用 */
function compile(defs) {
  const cases = [];
  for (const [base, shapes] of Object.entries(defs)) {
    for (const [method, sub] of shapes) {
      cases.push({ method, path: `${base}${sub === '/' ? '' : sub}`, base });
    }
  }
  return cases;
}

const ADMIN_WRITES = compile(ADMIN_RESOURCES);
const STAFF_WRITES = compile(STAFF_RESOURCES);
const ALL_WRITE_CASES = [...ADMIN_WRITES, ...STAFF_WRITES];

// ====== 最小应用：只装真实中间件，handler 一律返回 200 ======
//
// handler 返回 200 的含义是「请求穿过了守卫」——这正是我们要断言的，
// 不需要它真去查库。守卫拦下时会返回 401/403，到不了这里。

const app = express();
app.use(express.json());
app.use(authMiddleware);

for (const [base, shapes] of Object.entries(ADMIN_RESOURCES)) {
  const r = express.Router();
  r.get('/', (req, res) => res.json({ success: true }));
  for (const [method, sub] of shapes) {
    r[method.toLowerCase()](sub, requireAdmin, (req, res) => res.json({ success: true }));
  }
  app.use(base, r);
}

for (const [base, shapes] of Object.entries(STAFF_RESOURCES)) {
  const r = express.Router();
  r.get('/', (req, res) => res.json({ success: true }));
  for (const [method, sub] of shapes) {
    r[method.toLowerCase()](sub, requireStaff, (req, res) => res.json({ success: true }));
  }
  app.use(base, r);
}

// 小智：复刻 routes/assistant.js 的限流（相同常量与逻辑）
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
{
  const buckets = new Map();
  const limiter = (req, res, next) => {
    const key = String(req.user?.id ?? req.ip ?? 'anon');
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now > b.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return next();
    }
    if (b.count >= RATE_MAX) {
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' });
    }
    b.count += 1;
    return next();
  };
  const r = express.Router();
  r.post('/navigate', limiter, (req, res) => res.json({ success: true }));
  app.use('/api/assistant', r);
}

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const tokenFor = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
const ADMIN = tokenFor({ id: 1, name: '管理员', role: 'admin', sub_role: '' });
const TEACHER = tokenFor({ id: 2, name: '李四', role: 'teacher', sub_role: 'teacher' });
const MENTOR = tokenFor({ id: 3, name: '王五', role: 'teacher', sub_role: 'mentor' });
const LEADER = tokenFor({ id: 4, name: '赵六', role: 'leader', sub_role: 'leader' });
const STUDENT = tokenFor({ id: 5, name: '张三', role: 'student', sub_role: '' });

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* 非 JSON 响应 */ }
  return { status: res.status, json };
}

// ====== 用例注册 ======
//
// ⚠️ 用例体是 async，绝不能「test(name, fn) 里直接 fn()」——不 await 就会在
// 断言完成前计数通过，拿到假的绿灯。所以注册 + 末尾顺序 await。

let passed = 0;
let failed = 0;
const cases = [];
function group(title) { cases.push({ group: title }); }
function test(name, fn) { cases.push({ name, fn }); }

// ====== 1. 管理类写接口：仅管理员 ======

group('[1] 管理类写接口 —— 仅管理员');

test(`管理员可写全部 ${ADMIN_WRITES.length} 条管理类写路由`, async () => {
  for (const c of ADMIN_WRITES) {
    const r = await call(c.method, c.path, { token: ADMIN, body: {} });
    assert.equal(r.status, 200, `${c.method} ${c.path} 管理员应 200，实际 ${r.status}`);
  }
});

test(`学生写全部 ${ADMIN_WRITES.length} 条管理类写路由一律 403`, async () => {
  for (const c of ADMIN_WRITES) {
    const r = await call(c.method, c.path, { token: STUDENT, body: {} });
    assert.equal(r.status, 403, `${c.method} ${c.path} 学生应 403，实际 ${r.status}`);
  }
});

test(`教师写全部 ${ADMIN_WRITES.length} 条管理类写路由一律 403`, async () => {
  for (const c of ADMIN_WRITES) {
    const r = await call(c.method, c.path, { token: TEACHER, body: {} });
    assert.equal(r.status, 403, `${c.method} ${c.path} 教师应 403，实际 ${r.status}`);
  }
});

test('企业导师写管理类写路由一律 403', async () => {
  for (const c of ADMIN_WRITES) {
    const r = await call(c.method, c.path, { token: MENTOR, body: {} });
    assert.equal(r.status, 403, `${c.method} ${c.path} 导师应 403，实际 ${r.status}`);
  }
});

test('学院领导写管理类写路由一律 403', async () => {
  for (const c of ADMIN_WRITES) {
    const r = await call(c.method, c.path, { token: LEADER, body: {} });
    assert.equal(r.status, 403, `${c.method} ${c.path} 领导应 403，实际 ${r.status}`);
  }
});

test('未登录写管理类写路由一律 401', async () => {
  for (const c of ADMIN_WRITES) {
    const r = await call(c.method, c.path, { body: {} });
    assert.equal(r.status, 401, `${c.method} ${c.path} 未登录应 401，实际 ${r.status}`);
  }
});

// ====== 2. 读接口不能被误伤（本次改造最大的风险点） ======

group('[2] GET 读接口 —— 必须全部放行');

const READ_PATHS = [...Object.keys(ADMIN_RESOURCES), ...Object.keys(STAFF_RESOURCES)];

test(`未带 token 的 GET 仍然 200（${READ_PATHS.length} 条）`, async () => {
  for (const path of READ_PATHS) {
    const r = await call('GET', path);
    assert.equal(r.status, 200, `GET ${path} 应 200，实际 ${r.status}`);
  }
});

test('学生身份 GET 也 200', async () => {
  for (const path of READ_PATHS) {
    const r = await call('GET', path, { token: STUDENT });
    assert.equal(r.status, 200, `学生 GET ${path} 应 200，实际 ${r.status}`);
  }
});

// ====== 3. 排课写接口：放行教职工 ======

group('[3] 排课写接口 —— 放行教职工，挡住学生');

for (const [label, token] of [['教师', TEACHER], ['企业导师', MENTOR], ['学院领导', LEADER], ['管理员', ADMIN]]) {
  test(`${label}可写排课（教师端新建班级会补写排课）`, async () => {
    for (const c of STAFF_WRITES) {
      const r = await call(c.method, c.path, { token, body: {} });
      assert.equal(r.status, 200, `${label} ${c.method} ${c.path} 应 200，实际 ${r.status}`);
    }
  });
}

test('学生写排课一律 403', async () => {
  for (const c of STAFF_WRITES) {
    const r = await call(c.method, c.path, { token: STUDENT, body: {} });
    assert.equal(r.status, 403, `${c.method} ${c.path} 学生应 403，实际 ${r.status}`);
  }
});

test('未登录写排课一律 401', async () => {
  for (const c of STAFF_WRITES) {
    const r = await call(c.method, c.path, { body: {} });
    assert.equal(r.status, 401, `${c.method} ${c.path} 未登录应 401，实际 ${r.status}`);
  }
});

// ====== 4. 小智导航：需登录 + 限流 ======

group('[4] 小智导航接口 —— 需登录 + 限流');

test('未登录调小智 401（此前免登录，会空烧大模型额度）', async () => {
  const r = await call('POST', '/api/assistant/navigate', { body: {} });
  assert.equal(r.status, 401, `未登录调小智应 401，实际 ${r.status}`);
});

test('登录后可调小智', async () => {
  const r = await call('POST', '/api/assistant/navigate', { token: STUDENT, body: {} });
  assert.equal(r.status, 200, `已登录调小智应 200，实际 ${r.status}`);
});

test('第 20 次仍可调、第 21 次返回 429', async () => {
  const flooder = tokenFor({ id: 999, name: '刷量者', role: 'student', sub_role: '' });
  let twentieth = 0;
  let twentyFirst = 0;
  for (let i = 1; i <= 21; i++) {
    const r = await call('POST', '/api/assistant/navigate', { token: flooder, body: {} });
    if (i === 20) twentieth = r.status;
    if (i === 21) twentyFirst = r.status;
  }
  assert.equal(twentieth, 200, `第 20 次应在限流内（200），实际 ${twentieth}`);
  assert.equal(twentyFirst, 429, `第 21 次应 429，实际 ${twentyFirst}`);
});

// ====== 6. 静态核对：守卫确实挂在正确的位置 ======
//
// 前面 1–3 组用的是本文件内的 mock。这一组直接读真实源文件，把
// 「守卫确实加在真实代码上」证死。共三层检查：
//   (a) 每条写路由都带了守卫
//   (b) GET 路由一条都没带（带了会让读接口 401，是本改造最大的坑）
//   (c) index.js 的 app.use 挂载不带**路由器级**守卫
//
// (c) 是最容易漏的一环：守卫若整表挂在 app.use('/api/students', requireAdmin, ...)，
// 所有 GET 列表都会 401。而 (a)(b) 只看路由文件，看不到挂载层。
// requireAdmin 只在 /api/accounts 上允许整表挂——它内部会自行补验 token（含 GET）。

group('[6] 静态核对：真实路由文件的守卫挂载');

const ROUTE_FILES = [
  ['departments', 'requireAdmin'],
  ['classes', 'requireAdmin'],
  ['students', 'requireAdmin'],
  ['teachers', 'requireAdmin'],
  ['categories', 'requireAdmin'],
  ['courses', 'requireAdmin'],
  ['schedules', 'requireStaff'],
];

const here = fileURLToPath(new URL('.', import.meta.url));
const routesDir = join(here, '..', 'routes');
const indexPath = join(here, '..', 'index.js');

for (const [name, guard] of ROUTE_FILES) {
  const source = readFileSync(join(routesDir, `${name}.js`), 'utf8');

  test(`${name}.js 的每条写路由都带 ${guard}`, () => {
    const writes = [...source.matchAll(/^router\.(post|put|patch|delete)\('([^']*)',\s*(.*)$/gm)];
    assert.ok(writes.length > 0, `${name}.js 未匹配到任何写路由，正则可能失效`);
    for (const [, method, path, rest] of writes) {
      assert.match(
        rest,
        new RegExp(`^${guard}\\b`),
        `${name}.js 的 ${method.toUpperCase()} ${path} 未挂 ${guard}（实际: ${rest.slice(0, 40)}…）`
      );
    }
  });

  test(`${name}.js 的 GET 路由一律不挂守卫`, () => {
    const gets = [...source.matchAll(/^router\.get\('([^']*)',\s*(.*)$/gm)];
    for (const [, path, rest] of gets) {
      assert.ok(
        !/require(Admin|Staff|Teacher)\b/.test(rest),
        `${name}.js 的 GET ${path} 误挂了守卫，会让读接口 401`
      );
    }
  });
}

// (c) 挂载层：index.js 里 app.use 的中间件只有 authMiddleware 是允许的
//     （它在守卫内提前放行 GET/OPTIONS）。任何 require* 出现在 app.use
//     的中间件位，都可能把该前缀下的 GET 一并挡掉。
test('index.js 的 app.use 不得挂 require* 路由器级守卫（/api/accounts 除外）', () => {
  const source = readFileSync(indexPath, 'utf8');
  // 匹配形如 app.use('/api/xxx', requireAdmin, someRoutes)
  const mounts = [...source.matchAll(/^app\.use\(\s*'([^']+)'\s*,\s*([A-Za-z_$][\w$]*)\s*,/gm)];
  for (const [, path, mid] of mounts) {
    if (!/^require[A-Z]/.test(mid)) continue;
    assert.equal(
      path,
      '/api/accounts',
      `index.js 把 ${mid} 整表挂到了 ${path} —— 会让该前缀下所有 GET 列表 401。` +
      `认证中间件之外的守卫必须逐条挂到写路由上（见 routes/*.js）。`
    );
  }
});

// (d) 反向验：(c) 的检查本身得抓得住问题，否则是一条永远为真的空断言
test('挂载层检查本身有效（构造一个违规样本应能识别）', () => {
  const suspect = "app.use('/api/students', requireAdmin, studentRoutes);";
  const m = [...suspect.matchAll(/^app\.use\(\s*'([^']+)'\s*,\s*([A-Za-z_$][\w$]*)\s*,/gm)];
  assert.equal(m.length, 1, '正则没匹配上违规样本，检查形同虚设');
  assert.equal(m[0][2], 'requireAdmin');
  assert.notEqual(m[0][1], '/api/accounts', '违规样本应被判定为不合规');
});

// ====== 执行 ======

for (const c of cases) {
  if (c.group) {
    console.log(`\n${c.group}`);
    continue;
  }
  try {
    await c.fn();
    passed++;
    console.log(`  ✓ ${c.name}`);
  } catch (error) {
    failed++;
    console.error(`  ✗ ${c.name}\n    ${error.message}`);
  }
}

server.close();
await new Promise((resolve) => server.once('close', resolve));

// ====== 服务关闭后：确认连接失败不会被误判成 401 ======
//
// 这条不能放进上面的用例集：那里服务器还开着，任何路径都会连上，
// 测不出「连接失败」与「401 未登录」的区别。
console.log('\n[5] 服务不可达时的行为（防止把连接失败误判成 401）');
try {
  await call('POST', '/api/assistant/navigate', { body: {} });
  failed++;
  console.error('  ✗ 服务已关闭却仍连上了，测试环境异常');
} catch (error) {
  if (error?.name === 'TypeError' && /fetch failed/i.test(error.message)) {
    passed++;
    console.log('  ✓ 服务不可达时抛的是网络错误，而非 401');
  } else {
    failed++;
    console.error(`  ✗ 意外的错误类型: ${error.name}: ${error.message}`);
  }
}

console.log(`\n通过 ${passed} 项${failed ? `，失败 ${failed} 项` : ''}`);
if (failed > 0) {
  console.error('存在失败项');
  process.exitCode = 1;
} else {
  console.log('全部通过 ✓');
}
