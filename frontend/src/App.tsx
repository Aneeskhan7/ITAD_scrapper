import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { UserSidebar } from '@/components/layout/UserSidebar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { TopBar } from '@/components/layout/TopBar';

import { LandingPage } from '@/pages/LandingPage';
import { PricingPage } from '@/pages/PricingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';

import { OverviewPage } from '@/pages/user/OverviewPage';
import { ProjectsPage } from '@/pages/user/ProjectsPage';
import { ProjectDetailPage } from '@/pages/user/ProjectDetailPage';
import { WebsiteDetailPage } from '@/pages/user/WebsiteDetailPage';
import { DiscoveriesPage } from '@/pages/user/DiscoveriesPage';
import { HitsPage } from '@/pages/user/HitsPage';
import { UserDLQPage } from '@/pages/user/UserDLQPage';
import { KeywordsPage } from '@/pages/user/KeywordsPage';
import { SettingsPage } from '@/pages/user/SettingsPage';
import { NotificationsPage } from '@/pages/user/NotificationsPage';

import { SystemOverviewPage } from '@/pages/admin/SystemOverviewPage';
import { AgentPoolPage } from '@/pages/admin/AgentPoolPage';
import { JobQueuePage } from '@/pages/admin/JobQueuePage';
import { AdminDLQPage } from '@/pages/admin/AdminDLQPage';
import { ProxyPoolPage } from '@/pages/admin/ProxyPoolPage';
import { AIClassifierPage } from '@/pages/admin/AIClassifierPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { PatternsPage } from '@/pages/admin/PatternsPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

const USER_TITLES: Record<string, string> = {
  '/app': 'Overview', '/app/projects': 'Projects', '/app/results': 'Discoveries',
  '/app/hits': 'Keyword Hits', '/app/dlq': 'Dead-Letter Queue', '/app/keywords': 'Keywords',
  '/app/settings': 'Settings', '/app/notifications': 'Notifications',
};
const ADMIN_TITLES: Record<string, string> = {
  '/admin': 'System Overview', '/admin/agents': 'Agent Pool', '/admin/queue': 'Job Queue',
  '/admin/dlq': 'DLQ Manager', '/admin/proxies': 'Proxy Pool', '/admin/ai': 'AI Classifier',
  '/admin/users': 'Users', '/admin/patterns': 'Patterns',
};

function RequireAuth({ role }: { role?: string }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/app" replace />;
  return <Outlet />;
}

function UserShell() {
  const loc = useLocation();
  const title = USER_TITLES[loc.pathname] ?? Object.entries(USER_TITLES).find(([k]) => loc.pathname.startsWith(k + '/'))?.[1] ?? '';
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <UserSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title={title} />
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function AdminShell() {
  const loc = useLocation();
  const { data: qStats } = { data: undefined } as any; // queue depth from SSE
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar isAdmin queueDepth={qStats?.depth} />
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<UserShell />}>
              <Route path="/app" element={<OverviewPage />} />
              <Route path="/app/projects" element={<ProjectsPage />} />
              <Route path="/app/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/app/projects/:projectId/websites/:id" element={<WebsiteDetailPage />} />
              <Route path="/app/results" element={<DiscoveriesPage />} />
              <Route path="/app/hits" element={<HitsPage />} />
              <Route path="/app/dlq" element={<UserDLQPage />} />
              <Route path="/app/keywords" element={<KeywordsPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              <Route path="/app/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth role="admin" />}>
            <Route element={<AdminShell />}>
              <Route path="/admin" element={<SystemOverviewPage />} />
              <Route path="/admin/agents" element={<AgentPoolPage />} />
              <Route path="/admin/queue" element={<JobQueuePage />} />
              <Route path="/admin/dlq" element={<AdminDLQPage />} />
              <Route path="/admin/proxies" element={<ProxyPoolPage />} />
              <Route path="/admin/ai" element={<AIClassifierPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/patterns" element={<PatternsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
