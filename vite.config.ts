import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: '世界观',
        short_name: '世界观',
        description: '用你熟悉的世界，理解陌生的概念',
        lang: 'zh-CN',
        theme_color: '#2C3E50',
        background_color: '#FAFAF5',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.loli\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'loli-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              // 关键：跨域字体响应为 opaque（status 0），必须显式允许缓存
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 代理本地 vLLM 请求，避免浏览器 CORS 限制
      // 前端请求 /vllm-api/v1/chat/completions → 转发到 {X-LLM-Target}/v1/chat/completions
      '/vllm-api': {
        target: 'http://192.168.1.119:8012',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vllm-api/, ''),
      },
    },
  },
});
