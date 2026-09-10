import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleMessages = [];
const pageErrors = [];
page.on('console', (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
page.on('pageerror', (err) => pageErrors.push(err.message));
await page.goto('http://127.0.0.1:5177/#/login', { waitUntil: 'networkidle' });

await page.locator('input[placeholder="请输入账号"]').fill('teacher-wang');
await page.locator('input[placeholder="请输入密码"]').fill('666666');
await page.getByRole('button', { name: '登录' }).click();
await page.waitForTimeout(2500);

const teacherCourseLink = page.getByText('Node.js 全栈开发').first();
if (await teacherCourseLink.isVisible().catch(() => false)) {
  await teacherCourseLink.click();
} else {
  await page.goto('http://127.0.0.1:5177/#/teacher/courses/course-7', { waitUntil: 'networkidle' });
}
await page.waitForTimeout(2500);

const courseMgmtTab = page.getByRole('button', { name: /课程管理/ }).first();
await courseMgmtTab.click();
await page.waitForTimeout(2000);

const task666 = page.getByText('666').first();
await task666.click();
await page.waitForTimeout(2000);

const testTab = page.getByRole('button', { name: /测试题目/ }).first();
await testTab.click();
await page.waitForTimeout(3500);

const text = await page.locator('body').innerText();
const radarVisible = text.includes('本任务评价雷达');
const noData = text.includes('暂无分项评价数据');
const chartCount = await page.locator('canvas').count();
const radarElement = await page.locator('#task-radar-chart').count();
const radarBox = await page.locator('#task-radar-chart').boundingBox().catch(() => null);
const radarInfo = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('div'))
    .filter((el) => el.textContent?.includes('本任务评价雷达'))
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return { text: el.textContent.slice(0, 80), w: Math.round(rect.width), h: Math.round(rect.height), canvas: el.querySelectorAll('canvas').length };
    });
  return items.slice(0, 8);
});

await page.screenshot({ path: 'E:/课程平台3/xin/.codex-build/radar-verify/radar.png', fullPage: true });
console.log(JSON.stringify({
  url: page.url(),
  radarVisible,
  noData,
  chartCount,
  radarElement,
  radarBox,
  consoleMessages: consoleMessages.slice(-20),
  pageErrors: pageErrors.slice(-10),
  radarInfo,
  snippet: text.split('\n').filter((line) => line.includes('雷达') || line.includes('知识点掌握') || line.includes('任务完成情况')).slice(0, 12),
}, null, 2));

await browser.close();
