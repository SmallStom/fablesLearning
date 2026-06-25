import { Page } from '@playwright/test';

/**
 * 在登录页注册一个新测试账号并自动登录。
 * 调用后页面应跳转到首页。
 */
export async function registerAndLogin(page: Page, email: string, password: string, username: string): Promise<void> {
  await page.goto('/#/login');

  // 切换到注册页签
  await page.getByRole('button', { name: '注册' }).click();

  // 填写表单
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill(password);

  // 提交
  await page.getByRole('button', { name: /注册并登录/i }).click();

  // 等待跳转到首页
  await page.waitForURL(/\/#\//, { timeout: 15000 });
}
