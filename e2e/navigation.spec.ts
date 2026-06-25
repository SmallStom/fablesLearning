import { test, expect } from '@playwright/test';
import { registerAndLogin } from './auth-helper';
import { isBackendReachable } from './utils';

test.describe('首页导航（需登录）', () => {
  test.beforeAll(async () => {
    const ok = await isBackendReachable();
    test.skip(!ok, '后端 API 不可访问，跳过依赖后端的 E2E 测试');
  });

  test('登录后首页展示世界卡片', async ({ page }) => {
    const ts = Date.now();
    await registerAndLogin(page, `nav-${ts}@example.com`, 'E2eTest123!', `nav-${ts}`);
    await expect(page.locator('button').filter({ hasText: /进入这个世界/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('点击世界卡片进入探索页', async ({ page }) => {
    const ts = Date.now();
    await registerAndLogin(page, `nav-${ts}@example.com`, 'E2eTest123!', `nav-${ts}`);
    await page.locator('button').filter({ hasText: /进入这个世界/ }).first().click();
    await expect(page).toHaveURL(/\/#\/explore\/.+/, { timeout: 10000 });
    await expect(page.getByPlaceholder(/输入概念|输入你看不懂/i).first()).toBeVisible();
  });

  test('移动端底部导航可见', async ({ page }) => {
    const ts = Date.now();
    await registerAndLogin(page, `nav-${ts}@example.com`, 'E2eTest123!', `nav-${ts}`);
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav').filter({ hasText: /首页|记录|统计|设置/ }).first()).toBeVisible();
  });
});
