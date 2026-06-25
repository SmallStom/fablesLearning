import { test, expect } from '@playwright/test';
import { registerAndLogin } from './auth-helper';
import { isBackendReachable } from './utils';

test.describe('完整生成流程', () => {
  test.beforeAll(async () => {
    const ok = await isBackendReachable();
    test.skip(!ok, '后端 API 不可访问，跳过依赖后端的 E2E 测试');
  });

  test('注册 → 登录 → 生成寓言', async ({ page }) => {
    const ts = Date.now();
    await registerAndLogin(page, `gen-${ts}@example.com`, 'E2eTest123!', `gen-${ts}`);

    // 选择一个世界
    await page.locator('button').filter({ hasText: /进入这个世界/ }).first().click();
    await expect(page).toHaveURL(/\/#\/explore\/.+/, { timeout: 10000 });

    // 输入概念并生成
    await page.getByPlaceholder(/输入概念|输入你看不懂/i).first().fill('熵增');
    await page.getByRole('button', { name: /生成寓言|开始生成/i }).first().click();

    // 等待生成完成：出现寓言内容或概念解析
    await expect(
      page.getByText(/概念解析|检验问题|寓言正文/i).first()
    ).toBeVisible({ timeout: 120000 });
  });
});
