import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<ProfilePage />} />
            <Route path="members" element={<MembersPlaceholder />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Placeholder components
function MembersPlaceholder() {
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-white">Team Members</h2>
      <p className="text-slate-400 mt-2">Members management coming soon</p>
    </div>
  );
}

export default App;
