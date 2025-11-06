// src/pages/AccountPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { auth } from '../services/firebase';
import {
  getUserDoc, updateUserProfile, getUserClaims,
  isProfileEditAllowed, requestProfileEdit
} from '../services/user';
import { useAuth } from '../hooks/useAuth';
import {
  updatePassword, sendEmailVerification,
  reauthenticateWithCredential, EmailAuthProvider
} from 'firebase/auth';
import { Link } from 'react-router-dom';
import { useI18n, changeAppLanguage } from '../i18n';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line
} from 'recharts';
import {
  UserCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XMarkIcon,
  EnvelopeIcon,
  KeyIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CalendarIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

// ============= UTILITY COMPONENTS =============

function Toast({ message, type = 'info', onClose }) {
  const types = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slideUp max-w-md px-4 py-3 rounded-xl border-l-4 shadow-2xl ${types[type]}`}>
      <div className="flex items-center gap-3">
        <SparklesIcon className="w-5 h-5" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, subtitle, children, action }) {
  return (
    <div className="glass-solid rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color = 'blue', trend }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="glass-solid rounded-xl p-5 hover:shadow-xl hover:scale-105 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <FireIcon className="w-4 h-4" />
            <span className="text-xs font-semibold">{trend}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function InputField({ label, icon, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {icon && <span className="inline-block mr-1">{icon}</span>}
        {label}
      </label>
      <input
        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
        {...props}
      />
    </div>
  );
}

// ============= MAIN COMPONENT =============

export default function AccountPage() {
  const [tab, setTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [claims, setClaims] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const { isAdmin } = useAuth();
  const { t, i18n } = useI18n();

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => auth.onAuthStateChanged(setUser), []);
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const [uDoc, uClaims] = await Promise.all([getUserDoc(user.uid), getUserClaims(user.uid)]);
        setProfile(uDoc || {});
        setClaims(uClaims);
      } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Failed to load user data', 'error');
      }
    })();
  }, [user]);

  const stats = useMemo(() => {
    const perDay = {};
    let streak = 0;
    let currentStreak = 0;
    const sortedDates = [];

    for (const c of claims) {
      const ts = typeof c.createdAt === 'number' ? c.createdAt : c.createdAt?.toMillis?.();
      const d = new Date(ts || Date.now()).toISOString().slice(0, 10);
      perDay[d] = (perDay[d] || 0) + 1;
      if (!sortedDates.includes(d)) sortedDates.push(d);
    }

    sortedDates.sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0 || new Date(sortedDates[i]) - new Date(sortedDates[i - 1]) === 86400000) {
        currentStreak++;
        streak = Math.max(streak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    const daily = Object.entries(perDay)
      .sort()
      .slice(-30)
      .map(([date, count]) => ({ date: date.slice(5), count }));

    const thisMonth = claims.filter(c => {
      const ts = typeof c.createdAt === 'number' ? c.createdAt : c.createdAt?.toMillis?.();
      const d = new Date(ts || Date.now());
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return { total: claims.length, daily, thisMonth, streak };
  }, [claims]);

  async function saveProfile(e) {
    e.preventDefault();
    try {
      setBusy(true);
      const f = new FormData(e.currentTarget);
      if (!isAdmin) {
        const gate = await isProfileEditAllowed(auth.currentUser.uid);
        if (!gate.ok) {
          await requestProfileEdit(auth.currentUser.uid, auth.currentUser.email);
          showToast(t('account.editRequestSent', 'Edit request sent to admin'), 'info');
          return;
        }
      }
      await updateUserProfile({
        fullName: f.get('fullName') || '',
        icNumber: f.get('icNumber') || '',
        matricNo: f.get('matricNo') || '',
        phone: f.get('phone') || '',
        practicum: f.get('practicum') || '',
      });
      showToast(t('settings.profileSaved', 'Profile updated'), 'success');
    } catch (err) {
      showToast(err?.message || t('common.errorGeneric', 'Failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!auth.currentUser?.email) return;
    try {
      setBusy(true);
      const f = new FormData(e.currentTarget);
      const current = f.get('current');
      const next = f.get('next');
      const cred = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, next);
      showToast(t('account.passwordChanged', 'Password changed'), 'success');
      e.currentTarget.reset();
    } catch (err) {
      showToast(err?.message || t('account.passwordChangeFailed', 'Failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    try {
      setBusy(true);
      await sendEmailVerification(auth.currentUser);
      showToast(t('account.verificationSent', 'Verification email sent'), 'success');
    } catch (err) {
      showToast(err?.message || t('account.verificationFailed', 'Failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="glass-solid rounded-2xl p-12 text-center max-w-md">
          <UserCircleIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t('account.loginPrompt', 'Please sign in')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Sign in to view your account details and settings
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg transition-all"
          >
            {t('account.login', 'Sign In')}
          </Link>
        </div>
      </div>
    );
  }

  const verified = user.emailVerified;
  const tabs = [
    { key: 'dashboard', label: t('account.tabs.dashboard', 'Dashboard'), icon: <ChartBarIcon className="w-4 h-4" /> },
    { key: 'account', label: t('account.tabs.account', 'Account'), icon: <UserCircleIcon className="w-4 h-4" /> },
    { key: 'general', label: t('account.tabs.general', 'General'), icon: <Cog6ToothIcon className="w-4 h-4" /> },
    { key: 'security', label: t('account.tabs.security', 'Security'), icon: <ShieldCheckIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="glass-gradient rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {profile?.fullName || t('account.title', 'My Account')}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-2">
                {user.email}
                {verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                    <CheckCircleIcon className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-solid rounded-xl p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<TrophyIcon className="w-6 h-6 text-white" />}
              label="Total Claims"
              value={stats.total}
              color="blue"
            />
            <StatCard
              icon={<CalendarIcon className="w-6 h-6 text-white" />}
              label="This Month"
              value={stats.thisMonth}
              color="green"
              trend={`+${stats.thisMonth}`}
            />
            <StatCard
              icon={<FireIcon className="w-6 h-6 text-white" />}
              label="Streak"
              value={`${stats.streak}d`}
              color="amber"
            />
            <StatCard
              icon={verified ? <CheckCircleIcon className="w-6 h-6 text-white" /> : <ExclamationTriangleIcon className="w-6 h-6 text-white" />}
              label="Email Status"
              value={verified ? 'Verified' : 'Unverified'}
              color={verified ? 'green' : 'red'}
            />
          </div>

          {/* Charts */}
          <Section
            icon={<ChartBarIcon className="w-5 h-5 text-white" />}
            title={t('account.claimsPerDay', 'Claims Activity')}
            subtitle="Last 30 days"
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.daily}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6 }}
                    fill="url(#colorCount)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Account Details */}
          <Section
            icon={<UserCircleIcon className="w-5 h-5 text-white" />}
            title="Account Information"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">User ID</div>
                <div className="font-mono text-sm text-slate-900 dark:text-white break-all">{user.uid}</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Last Sign In</div>
                <div className="text-sm text-slate-900 dark:text-white">
                  {new Date(user.metadata?.lastSignInTime || Date.now()).toLocaleString()}
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {tab === 'account' && (
        <div className="space-y-6">
          <Section
            icon={<UserCircleIcon className="w-5 h-5 text-white" />}
            title={t('settings.profile', 'Profile Information')}
            subtitle="Update your personal details"
            action={
              !verified && (
                <button
                  disabled={busy}
                  onClick={resendVerification}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all disabled:opacity-50"
                >
                  {busy ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <EnvelopeIcon className="w-4 h-4" />
                  )}
                  Verify Email
                </button>
              )
            }
          >
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  name="fullName"
                  label="Full Name"
                  icon={<UserCircleIcon className="w-4 h-4 inline" />}
                  defaultValue={profile?.fullName || ''}
                  placeholder="Enter your full name"
                  disabled={busy}
                />
                <InputField
                  name="icNumber"
                  label="IC Number"
                  defaultValue={profile?.icNumber || ''}
                  placeholder="Enter your IC number"
                  disabled={busy}
                />
                <InputField
                  name="matricNo"
                  label="Matric Number"
                  defaultValue={profile?.matricNo || ''}
                  placeholder="Enter your matric number"
                  disabled={busy}
                />
                <InputField
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  defaultValue={profile?.phone || ''}
                  placeholder="Enter your phone number"
                  disabled={busy}
                />
                <InputField
                  name="practicum"
                  label="Practicum"
                  defaultValue={profile?.practicum || ''}
                  placeholder="Enter your practicum"
                  disabled={busy}
                />
              </div>
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg transition-all disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {t('common.save', 'Save Changes')}
                  </>
                )}
              </button>
            </form>
          </Section>
        </div>
      )}

      {tab === 'general' && (
        <div className="space-y-6">
          <Section
            icon={<GlobeAltIcon className="w-5 h-5 text-white" />}
            title={t('account.preferences', 'Preferences')}
            subtitle="Customize your experience"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <GlobeAltIcon className="w-4 h-4 inline mr-1" />
                  {t('settings.language', 'Language')}
                </label>
                <select
                  value={i18n.language}
                  onChange={(e) => changeAppLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="ms">🇲🇾 Bahasa Melayu</option>
                </select>
              </div>
            </div>
          </Section>

          <Section
            icon={<SparklesIcon className="w-5 h-5 text-white" />}
            title="Quick Links"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/help"
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center"
              >
                <div className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  {t('help.title', 'Help Center')}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Get support</div>
              </Link>
              <Link
                to="/privacy"
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center"
              >
                <div className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Privacy</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">View policy</div>
              </Link>
              <Link
                to="/tos"
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center"
              >
                <div className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Terms</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Read terms</div>
              </Link>
            </div>
          </Section>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-6">
          <Section
            icon={<KeyIcon className="w-5 h-5 text-white" />}
            title={t('settings.changePassword', 'Change Password')}
            subtitle="Update your password"
          >
            <form onSubmit={changePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  name="current"
                  type="password"
                  label="Current Password"
                  icon={<KeyIcon className="w-4 h-4 inline" />}
                  placeholder="Enter current password"
                  required
                  disabled={busy}
                />
                <InputField
                  name="next"
                  type="password"
                  label="New Password"
                  icon={<KeyIcon className="w-4 h-4 inline" />}
                  placeholder="Enter new password (min 6 chars)"
                  required
                  disabled={busy}
                />
              </div>
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg transition-all disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {t('account.updatePassword', 'Update Password')}
                  </>
                )}
              </button>
            </form>
          </Section>

          <Section
            icon={<ShieldCheckIcon className="w-5 h-5 text-white" />}
            title={t('settings.sessions', 'Active Sessions')}
            subtitle="Manage your logged-in devices"
          >
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Sign out from all devices to revoke all active sessions. You'll need to sign in again on each device.
              </p>
              <button
                onClick={() => auth.signOut()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-all"
              >
                <ArrowPathIcon className="w-4 h-4" />
                {t('account.signOut', 'Sign Out')}
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}