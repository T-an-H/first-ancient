import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (err) => errors.push(err.message));

await page.goto('http://127.0.0.1:5177/#/login', { waitUntil: 'networkidle' });
await page.locator('input[placeholder="请输入账号"]').fill('S2024001');
await page.locator('input[placeholder="请输入密码"]').fill('666666');
await page.getByRole('button', { name: '登录' }).click();
await page.waitForTimeout(3000);

await page.goto('http://127.0.0.1:5177/#/student/courses/course-7', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.getByRole('button', { name: /课程图谱/ }).first().click();
await page.waitForTimeout(2500);

const task = page.getByText('666').first();
if (await task.isVisible().catch(() => false)) await task.click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /测试题目/ }).first().click();
await page.waitForTimeout(4000);

const taskCanvas = await page.locator('canvas').count();
const taskText = await page.locator('body').innerText();
await page.screenshot({ path: 'E:/课程平台3/xin/.codex-build/radar-verify/student-task-radar.png', fullPage: true });

// 综合评价
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /综合评价/ }).first().click();
await page.waitForTimeout(4000);
const overviewCanvas = await page.locator('canvas').count();
const overviewText = await page.locator('body').innerText();
await page.screenshot({ path: 'E:/课程平台3/xin/.codex-build/radar-verify/student-overview-radar.png', fullPage: true });

console.log(JSON.stringify({
  url: page.url(),
  taskCanvas,
  taskHasRadar: taskText.includes('本任务评价雷达'),
  taskNoData: taskText.includes('暂无分项评价数据'),
  overviewCanvas,
  overviewHasRadar: overviewText.includes('能力雷达'),
  overviewNoData: overviewText.includes('暂无分项评价数据'),
  errors,
}, null, 2));
await browser.close();
