import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto('http://127.0.0.1:5177/#/login', { waitUntil: 'networkidle' });
await page.getByLabel('账号').fill('admin');
await page.getByLabel('密码').fill('666666');
await page.getByRole('button', { name: '登录' }).click();
await page.waitForURL(/#\/admin(?:\?|$|\/)/, { timeout: 15000 });
await page.getByText('添加学院', { exact: true }).click();

const select = page.locator('select').filter({ has: page.locator('option', { hasText: '蓝色' }) }).first();
await select.waitFor({ state: 'visible' });
const options = await select.locator('option').allTextContents();
const selectedText = await select.locator('option:checked').textContent();

await page.screenshot({
  path: 'E:/课程平台3/xin/.codex-build/department-color-template/ui.png',
  fullPage: true,
});

console.log(JSON.stringify({
  url: page.url(),
  selectedText: selectedText?.trim(),
  options: options.map((value) => value.trim()),
}, null, 2));

await browser.close();
