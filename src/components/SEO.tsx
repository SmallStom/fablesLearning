import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

const DEFAULT_TITLE = '世界观 — 用熟悉的世界，理解陌生的概念';
const DEFAULT_DESCRIPTION =
  '世界观是一个 AI 学习工具：选一个你熟悉的世界（武林、三国、后厨、医院、足球场……），输入一个陌生概念，AI 会在那个世界里用一则寓言把它讲明白。';
const DEFAULT_IMAGE = '/icons/icon.svg';

/**
 * SEO 组件：动态更新 document.title 和 meta 标签。
 * 用于 SPA 中不同路由的标题/描述差异化。
 */
export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        // 根据 selector 类型设置属性
        if (selector.startsWith('meta[property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] || '');
        } else if (selector.startsWith('meta[name=')) {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] || '');
        }
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:type"]', type);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', image);

    // robots
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow');

    return () => {
      // 组件卸载时恢复默认标题（可选）
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, image, type, noIndex]);

  return null;
}
