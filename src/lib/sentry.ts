import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * 初始化 Sentry 前端监控。
 * 未配置 DSN 时静默跳过，不影响业务运行。
 */
export function initSentry(): void {
  if (!DSN) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[sentry] DSN 未配置，跳过初始化');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    environment: import.meta.env.MODE,
  });
}

/**
 * 手动上报错误。
 * 即使 Sentry 未初始化也不会抛错。
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * 手动上报消息。
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!DSN) return;
  Sentry.captureMessage(message, level);
}

/**
 * 设置用户信息（用于关联错误和用户）。
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!DSN) return;
  Sentry.setUser(user);
}
