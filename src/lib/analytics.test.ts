import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('trackEvent', () => {
  beforeEach(() => {
    window.gtag = vi.fn();
    window.umami = { track: vi.fn() };
    import.meta.env.VITE_GA_MEASUREMENT_ID = 'G-TEST123';
  });

  afterEach(() => {
    delete window.gtag;
    delete window.umami;
    delete import.meta.env.VITE_GA_MEASUREMENT_ID;
  });

  it('同时上报到 gtag 和 umami', async () => {
    const { trackEvent } = await import('./analytics');
    trackEvent('generate_fable_complete', { world_id: 'kitchen', concept: '熵增' });

    expect(window.gtag).toHaveBeenCalledWith('event', 'generate_fable_complete', {
      world_id: 'kitchen',
      concept: '熵增',
    });
    expect(window.umami?.track).toHaveBeenCalledWith('generate_fable_complete', {
      world_id: 'kitchen',
      concept: '熵增',
    });
  });

  it('过滤掉空值属性', async () => {
    const { trackEvent } = await import('./analytics');
    trackEvent('test_event', { a: 'ok', b: '', c: undefined, d: null, e: 0 });

    expect(window.gtag).toHaveBeenCalledWith('event', 'test_event', { a: 'ok', e: 0 });
  });

  it('未配置 SDK 时静默降级', async () => {
    delete window.gtag;
    delete window.umami;
    const { trackEvent } = await import('./analytics');
    expect(() => trackEvent('test_event')).not.toThrow();
  });
});

describe('trackPageView', () => {
  beforeEach(() => {
    window.gtag = vi.fn();
    window.umami = { track: vi.fn() };
    import.meta.env.VITE_GA_MEASUREMENT_ID = 'G-TEST123';
  });

  afterEach(() => {
    delete window.gtag;
    delete window.umami;
    delete import.meta.env.VITE_GA_MEASUREMENT_ID;
  });

  it('上报页面浏览', async () => {
    const { trackPageView } = await import('./analytics');
    trackPageView('/explore/kitchen', '厨房 — 世界观');

    expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/explore/kitchen',
      page_title: '厨房 — 世界观',
    });
    expect(window.umami?.track).toHaveBeenCalledWith('page_view', {
      path: '/explore/kitchen',
      title: '厨房 — 世界观',
    });
  });
});
