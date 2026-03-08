import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { BoardPage } from './pages/dashboard/BoardPage';
import { ProjectsPage } from './pages/dashboard/ProjectsPage';
import { CalendarPage } from './pages/dashboard/CalendarPage';
import { MetricsPage } from './pages/dashboard/MetricsPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { MembersPage } from './pages/dashboard/MembersPage';
import { AdminPage } from './pages/dashboard/AdminPage';
import { RequireAuth } from './components/auth/RequireAuth';
import { useTheme } from './hooks/useTheme';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 1, // 1 minute
      retry: 1,
    },
  },
});

function App() {
  useTheme(); // Initialize theme on mount
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        containerStyle={{
          top: 40,
          left: 20,
          bottom: 20,
          right: 20,
        }}
        toastOptions={{
          className: 'glass-panel !bg-surface/80 !text-text !border-border !backdrop-blur-xl !shadow-2xl',
          duration: 4000,
          style: {
            background: 'rgba(27, 43, 50, 0.8)',
            color: 'var(--text-main)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#28aae2',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="settings" element={<ProfilePage />} />
            <Route path="members" element={<MembersPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
