import { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import Onboarding, { isOnboarded } from '@/components/Onboarding';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { initAnalytics, trackPageView } from '@/lib/analytics';

// 路由懒加载：减小首屏 JS 体积
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SharePage = lazy(() => import('@/pages/SharePage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const StatsPage = lazy(() => import('@/pages/StatsPage'));

/** 路由懒加载时的全屏 Loading */
function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
    </div>
  );
}

/** 路由变化时上报页面浏览 */
function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initializeAppData = useAppStore((s) => s.initializeAppData);
  const [onboardingDone, setOnboardingDone] = useState(isOnboarded());

  // 应用启动时初始化埋点 SDK
  useEffect(() => {
    initAnalytics();
  }, []);

  // 登录态恢复或登录成功后，加载后端业务数据
  useEffect(() => {
    if (isAuthenticated) {
      initializeAppData().catch(() => {
        /* ignore */
      });
    }
  }, [isAuthenticated, initializeAppData]);

  return (
    <HashRouter>
      <PageTracker />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/share/:token" element={<SharePage />} />

          {/* 需要认证的路由，统一用 AuthGuard 包裹 */}
          <Route element={
            <AuthGuard>
              {onboardingDone ? <Layout /> : <Onboarding onDone={() => setOnboardingDone(true)} />}
            </AuthGuard>
          }>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore/:worldId" element={<ExplorePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
