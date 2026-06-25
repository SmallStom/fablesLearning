/**
 * 埋点封装层。
 *
 * 设计原则：
 * 1. 不依赖具体平台 SDK 的类型声明，通过 window 对象动态调用。
 * 2. 未配置任何埋点 ID 时自动静默降级，不影响业务。
 * 3. 事件名统一用 snake_case，属性用 camelCase。
 */

interface TrackProperties {
  [key: string]: string | number | boolean | undefined;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    umami?: {
      track: (eventName: string, props?: Record<string, unknown>) => void;
    };
  }
}

function getGAId(): string | undefined {
  return import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
}

function getUmamiScript(): string | undefined {
  return import.meta.env.VITE_UMAMI_SCRIPT_URL as string | undefined;
}

function getUmamiId(): string | undefined {
  return import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
}

let initialized = false;

/** 初始化埋点 SDK（只执行一次） */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  const gaId = getGAId();
  if (gaId) {
    injectGoogleAnalytics(gaId);
  }

  const umamiScript = getUmamiScript();
  const umamiId = getUmamiId();
  if (umamiScript && umamiId) {
    injectUmami(umamiScript, umamiId);
  }
}

/** 上报自定义事件 */
export function trackEvent(eventName: string, properties: TrackProperties = {}): void {
  try {
    const cleaned: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(properties)) {
      if (v !== undefined && v !== null && v !== '') {
        cleaned[k] = v;
      }
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, cleaned);
    }

    // Umami
    if (typeof window.umami?.track === 'function') {
      window.umami.track(eventName, cleaned);
    }

    // 开发环境打印日志
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[analytics]', eventName, cleaned);
    }
  } catch {
    // 埋点失败绝不影响业务
  }
}

/** 上报页面浏览（SPA 路由切换用） */
export function trackPageView(path: string, title?: string): void {
  try {
    if (typeof window.gtag === 'function' && getGAId()) {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: title ?? document.title,
      });
    }

    if (typeof window.umami?.track === 'function') {
      window.umami.track('page_view', { path, title: title ?? document.title });
    }
  } catch {
    /* ignore */
  }
}

function injectGoogleAnalytics(id: string): void {
  try {
    if (document.querySelector(`script[data-ga-id="${id}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.setAttribute('data-ga-id', id);
    document.head.appendChild(script);

    const inline = document.createElement('script');
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}', { send_page_view: false });
    `;
    document.head.appendChild(inline);
  } catch {
    /* ignore */
  }
}

function injectUmami(scriptUrl: string, websiteId: string): void {
  try {
    if (document.querySelector(`script[data-website-id="${websiteId}"]`)) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = scriptUrl;
    script.setAttribute('data-website-id', websiteId);
    script.setAttribute('data-auto-track', 'false'); // 手动控制页面浏览
    document.head.appendChild(script);
  } catch {
    /* ignore */
  }
}
