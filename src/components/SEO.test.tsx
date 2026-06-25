import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import SEO from './SEO';

describe('SEO', () => {
  afterEach(() => {
    document.title = '';
    document.querySelectorAll('meta[name="description"], meta[property="og:title"]').forEach((el) => {
      el.remove();
    });
  });

  it('更新 document.title', () => {
    render(<SEO title="测试标题" description="测试描述" />);
    expect(document.title).toBe('测试标题');
  });

  it('更新 description meta', () => {
    render(<SEO title="测试标题" description="测试描述" />);
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    expect(meta).not.toBeNull();
    expect(meta.content).toBe('测试描述');
  });

  it('更新 og:title meta', () => {
    render(<SEO title="测试标题" description="测试描述" />);
    const meta = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
    expect(meta).not.toBeNull();
    expect(meta.content).toBe('测试标题');
  });
});
