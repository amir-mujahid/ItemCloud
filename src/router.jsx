// src/router.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import HomePage from './pages/HomePage';
import AccountPage from './pages/AccountPage';
import DashboardPage from './pages/DashboardPage';
import LostItemsPage from './pages/LostItemsPage';
import ClaimHistoryPage from './pages/ClaimHistoryPage';
import HelpCenterPage from './pages/HelpCenterPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import ScanClaimPage from './pages/ScanClaimPage';

import SignupEmailPage from './pages/auth/SignupEmailPage';
import SignupProfilePage from './pages/auth/SignupProfilePage';
import LoginPage from './pages/auth/LoginPage';
import VerifyEmailNotice from './pages/auth/VerifyEmailNotice';

import ProtectedRoute from './components/ProtectedRoute';
import AdminUpdatesPage from './pages/AdminUpdatesPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

// Admin-only guard using useAuth().isAdmin
function AdminRoute({ children }) {
  const { isAdmin, loading, user } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public auth screens */}
      <Route path="/signup" element={<SignupEmailPage />} />
      <Route path="/signup/profile" element={<SignupProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailNotice />} />

     <Route path="/privacy" element={<PrivacyPage />} />
     <Route path="/tos" element={<TermsPage />} />
     {/* Optional alias so /terms also works */}
     <Route path="/terms" element={<Navigate to="/tos" replace />} />

      {/* Protected app screens */}
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/lost" element={<ProtectedRoute><LostItemsPage /></ProtectedRoute>} />
      <Route path="/scan-claim" element={<ProtectedRoute><ScanClaimPage /></ProtectedRoute>} />
      <Route path="/claims" element={<ProtectedRoute><ClaimHistoryPage /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><HelpCenterPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />

      {/* Admin-only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminUpdatesPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
