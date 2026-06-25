import { test, expect } from '@playwright/test';

test.describe('公开分享页', () => {
  test('访问无效分享 token 显示错误', async ({ page }) => {
    await page.goto('/#/share/invalid-token-12345');
    // 应出现错误提示或"不存在/失效"类文案
    await expect(
      page.getByText(/不存在|已失效|加载失败|找不到/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
