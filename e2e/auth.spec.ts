import { test, expect } from '@playwright/test';

test.describe('认证流程', () => {
  test('登录页可以打开并显示表单', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.getByText('世界观')).toBeVisible();
    await expect(page.getByLabel('邮箱')).toBeVisible();
    await expect(page.getByLabel('密码')).toBeVisible();
  });

  test('空密码提交时给出提示', async ({ page }) => {
    await page.goto('/#/login');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('');
    await page.locator('form').getByRole('button', { name: /登录/i }).click();
    await expect(page.getByText(/请输入邮箱和密码/i)).toBeVisible({ timeout: 5000 });
  });

  test('可以切换到注册模式', async ({ page }) => {
    await page.goto('/#/login');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.getByLabel('用户名')).toBeVisible();
    await expect(page.getByRole('button', { name: /注册并登录/i })).toBeVisible();
  });
});
