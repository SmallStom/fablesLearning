import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initSentry } from '@/lib/sentry';
import './index.css';

// 在 React 渲染前初始化 Sentry（错误监控 + 性能追踪）
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
