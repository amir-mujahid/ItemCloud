// src/pages/SettingsPage.jsx
import { useI18n, changeAppLanguage } from '../i18n';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { isProfileEditAllowed, requestProfileEdit } from '../services/user';
import { useTheme } from '../hooks/useTheme';
import { updateEmail, updatePassword } from 'firebase/auth';
import { requestVerifyEmail } from '../services/verifyApi';
import {
  UserCircleIcon,
  BellIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
  KeyIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

// ============= UTILITY COMPONENTS =============

function Toast({ message, type = 'info', onClose }) {
  const types = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
    warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-800 dark:text-amber-300',
  };

  const icons = {
    success: <CheckCircleIcon className="w-5 h-5" />,
    error: <ExclamationTriangleIcon className="w-5 h-5" />,
    info: <SparklesIcon className="w-5 h-5" />,
    warning: <ExclamationTriangleIcon className="w-5 h-5" />,
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slideUp max-w-md px-4 py-3 rounded-xl border-l-4 shadow-2xl ${types[type]}`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, badge }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({ children }) {
  return (
    <div className="glass-solid rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
      {children}
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
        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        {...props}
      />
    </div>
  );
}

function ToggleSwitch({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-slate-900 dark:text-white">{label}</div>
        {description && <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function ActionButton({ icon, label, onClick, variant = 'default', disabled, loading, fullWidth }) {
  const variants = {
    default: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300',
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {loading ? (
        <ArrowPathIcon className="w-5 h-5 animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

// ============= MAIN COMPONENT =============

export default function SettingsPage() {
  const { t } = useI18n();
  const user = auth.currentUser;
  const { isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();

  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    marketingEmails: false,
    language: 'en',
  });
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    fullName: '',
    icNumber: '',
    matricNo: '',
    phone: '',
    practicum: '',
  });
  const [pSaving, setPSaving] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Load data
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      try {
        const pSnap = await getDoc(doc(db, 'Users', user.uid));
        if (alive && pSnap.exists()) {
          const d = pSnap.data();
          setProfile({
            fullName: d.fullName || '',
            icNumber: d.icNumber || '',
            matricNo: d.matricNo || '',
            phone: d.phone || '',
            practicum: d.practicum || '',
          });
        }
        const sSnap = await getDoc(doc(db, 'Users', user.uid, 'settings', 'preferences'));
        if (alive && sSnap.exists()) {
          const data = sSnap.data();
          setPrefs(prev => ({ ...prev, ...data }));
          if (data.language) changeAppLanguage(data.language);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Failed to load settings', 'error');
      }
    })();
    return () => { alive = false; };
  }, [user?.uid]);

  async function ensureGateOrRequest() {
    if (isAdmin) return true;
    const gate = await isProfileEditAllowed(user.uid);
    if (!gate.ok) {
      await requestProfileEdit(user.uid, user.email);
      showToast('Edit request sent to admin. You will be able to edit once approved.', 'warning');
      return false;
    }
    return true;
  }

  async function savePrefs() {
    if (!user) return;
    setSaving(true);
    try {
      const can = await ensureGateOrRequest();
      if (!can) return;
      await setDoc(doc(db, 'Users', user.uid, 'settings', 'preferences'), prefs, { merge: true });
      changeAppLanguage(prefs.language);
      showToast(t('settings.saved', 'Preferences saved'), 'success');
    } catch (e) {
      showToast(e?.message || 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!user) return;
    setPSaving(true);
    try {
      const can = await ensureGateOrRequest();
      if (!can) return;
      await setDoc(doc(db, 'Users', user.uid), {
        ...profile,
        email: user.email || '',
        updatedAt: new Date(),
      }, { merge: true });
      showToast(t('settings.profileSaved', 'Profile updated'), 'success');
    } catch (e) {
      showToast(e?.message || 'Failed to update profile', 'error');
    } finally {
      setPSaving(false);
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <PaintBrushIcon className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheckIcon className="w-4 h-4" /> },
    { id: 'sessions', label: 'Sessions', icon: <ComputerDesktopIcon className="w-4 h-4" /> },
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Cog6ToothIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {t('settings.title', 'Settings')}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                {t('settings.subtitle', 'Customize your ItemCloud experience')}
              </p>
            </div>
          </div>
          {user?.email && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-900 dark:text-white">{user.displayName || 'User'}</div>
                <div className="text-slate-600 dark:text-slate-400">{user.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-solid rounded-xl p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <Section>
          <SectionHeader
            icon={<UserCircleIcon className="w-5 h-5" />}
            title={t('settings.profile', 'Profile Information')}
            subtitle="Manage your personal details"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <InputField
              label={t('settings.fullName', 'Full Name')}
              icon={<UserCircleIcon className="w-4 h-4 inline" />}
              placeholder="Enter your full name"
              value={profile.fullName}
              onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
            />
            <InputField
              label={t('settings.icNumber', 'IC Number')}
              placeholder="Enter your IC number"
              value={profile.icNumber}
              onChange={e => setProfile(p => ({ ...p, icNumber: e.target.value }))}
            />
            <InputField
              label={t('settings.matricNo', 'Matric Number')}
              placeholder="Enter your matric number"
              value={profile.matricNo}
              onChange={e => setProfile(p => ({ ...p, matricNo: e.target.value }))}
            />
            <InputField
              label={t('settings.phone', 'Phone Number')}
              icon={<DevicePhoneMobileIcon className="w-4 h-4 inline" />}
              placeholder="Enter your phone number"
              type="tel"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
            />
            <InputField
              label={t('settings.practicum', 'Practicum')}
              placeholder="Enter your practicum"
              value={profile.practicum}
              onChange={e => setProfile(p => ({ ...p, practicum: e.target.value }))}
            />
          </div>
          <ActionButton
            icon={<CheckCircleIcon className="w-5 h-5" />}
            label={pSaving ? t('common.saving', 'Saving...') : t('settings.saveProfile', 'Save Profile')}
            onClick={saveProfile}
            variant="primary"
            loading={pSaving}
          />
        </Section>
      )}

      {activeTab === 'notifications' && (
        <Section>
          <SectionHeader
            icon={<BellIcon className="w-5 h-5" />}
            title={t('settings.notifications', 'Notifications')}
            subtitle="Manage how you receive updates"
          />
          <div className="space-y-2 mb-6">
            <ToggleSwitch
              label={t('settings.emailNotif', 'Email Notifications')}
              description={t('settings.emailNotifHint', 'Unlock codes, claim success, system notices')}
              checked={prefs.emailNotifications}
              onChange={(checked) => setPrefs(p => ({ ...p, emailNotifications: checked }))}
            />
            <ToggleSwitch
              label={t('settings.inAppNotif', 'In-App Notifications')}
              description={t('settings.inAppNotifHint', 'Bell icon alerts inside ItemCloud')}
              checked={prefs.inAppNotifications}
              onChange={(checked) => setPrefs(p => ({ ...p, inAppNotifications: checked }))}
            />
            <ToggleSwitch
              label={t('settings.productUpdates', 'Product Updates')}
              description={t('settings.productUpdatesHint', 'Occasional tips & feature announcements')}
              checked={prefs.marketingEmails}
              onChange={(checked) => setPrefs(p => ({ ...p, marketingEmails: checked }))}
            />
          </div>
          <ActionButton
            icon={<CheckCircleIcon className="w-5 h-5" />}
            label={saving ? t('common.saving', 'Saving...') : t('settings.saveNotif', 'Save Preferences')}
            onClick={savePrefs}
            variant="primary"
            loading={saving}
          />
        </Section>
      )}

      {activeTab === 'appearance' && (
        <Section>
          <SectionHeader
            icon={<PaintBrushIcon className="w-5 h-5" />}
            title={t('settings.appearance', 'Appearance')}
            subtitle="Customize how ItemCloud looks"
          />

          {/* Theme */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('settings.theme', 'Theme')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <SunIcon className="w-8 h-8 text-amber-500" />
                <div className="text-center">
                  <div className="font-semibold text-slate-900 dark:text-white">Light</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bright and clear</div>
                </div>
                {theme === 'light' && (
                  <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                )}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <MoonIcon className="w-8 h-8 text-blue-500" />
                <div className="text-center">
                  <div className="font-semibold text-slate-900 dark:text-white">Dark</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Easy on the eyes</div>
                </div>
                {theme === 'dark' && (
                  <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                )}
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <GlobeAltIcon className="w-4 h-4 inline mr-1" />
              {t('settings.language', 'Language')}
            </h3>
            <div className="flex items-center gap-3">
              <select
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={prefs.language}
                onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
              >
                <option value="en">🇬🇧 English</option>
                <option value="ms">🇲🇾 Bahasa Melayu</option>
              </select>
              <ActionButton
                icon={<CheckCircleIcon className="w-5 h-5" />}
                label={t('common.save', 'Save')}
                onClick={savePrefs}
                variant="primary"
                loading={saving}
              />
            </div>
          </div>
        </Section>
      )}

      {activeTab === 'security' && (
        <SecuritySection t={t} showToast={showToast} />
      )}

      {activeTab === 'sessions' && (
        <SessionsSection t={t} showToast={showToast} />
      )}
    </div>
  );
}

// ============= SECURITY SECTION =============

function SecuritySection({ t, showToast }) {
  const user = auth.currentUser;
  const [busy, setBusy] = useState(false);

  async function changeEmail() {
    setBusy(true);
    const newEmail = prompt(t('settings.enterNewEmail', 'Enter new email:'));
    if (!newEmail) {
      setBusy(false);
      return;
    }
    try {
      await updateEmail(user, newEmail);
      showToast(t('settings.emailUpdated', 'Email updated. Please verify your new email.'), 'success');
      await requestVerifyEmail({ app: 'main' });
    } catch (e) {
      showToast(e?.message || t('settings.emailUpdateFailed', 'Failed to update email. You may need to re-login.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    const newPass = prompt(t('settings.enterNewPassword', 'Enter new password (min 6 chars):'));
    if (!newPass) {
      setBusy(false);
      return;
    }
    try {
      await updatePassword(user, newPass);
      showToast(t('settings.passwordUpdated', 'Password updated.'), 'success');
    } catch (e) {
      showToast(e?.message || t('settings.passwordUpdateFailed', 'Failed to update password. You may need to re-login.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    try {
      const { link } = await requestVerifyEmail({ app: 'main' });
      console.log('[verify link]', link);
      showToast(t('settings.verificationSent', 'Verification email sent. Use the most recent email only.'), 'success');
    } catch (e) {
      showToast(e?.message || t('settings.verificationFailed', 'Failed to send verification email.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section>
      <SectionHeader
        icon={<ShieldCheckIcon className="w-5 h-5" />}
        title={t('settings.security', 'Security')}
        subtitle="Manage your account security"
      />

      {/* Email Status */}
      {user && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {user.emailVerified ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircleIcon className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Not verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <EnvelopeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                {t('settings.changeEmail', 'Change Email')}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Update your email address</div>
            </div>
          </div>
          <ActionButton
            icon={<ArrowPathIcon className="w-5 h-5" />}
            label="Change"
            onClick={changeEmail}
            variant="default"
            disabled={busy}
            loading={busy}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <KeyIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                {t('settings.changePassword', 'Change Password')}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Update your password</div>
            </div>
          </div>
          <ActionButton
            icon={<ArrowPathIcon className="w-5 h-5" />}
            label="Change"
            onClick={changePassword}
            variant="default"
            disabled={busy}
            loading={busy}
          />
        </div>
      </div>

      {!user?.emailVerified && (
        <ActionButton
          icon={<EnvelopeIcon className="w-5 h-5" />}
          label={t('settings.resendVerification', 'Resend Verification Email')}
          onClick={resendVerification}
          variant="primary"
          disabled={busy}
          loading={busy}
          fullWidth
        />
      )}

      <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {t('settings.reauthNote', 'For sensitive changes, Firebase may require re-authentication.')}
        </p>
      </div>
    </Section>
  );
}

// ============= SESSIONS SECTION =============

function SessionsSection({ t, showToast }) {
  const [busy, setBusy] = useState(false);

  async function signOutEverywhere() {
    if (!confirm('Are you sure you want to sign out from all devices? You will be logged out immediately.')) {
      return;
    }

    setBusy(true);
    try {
      const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
      if (!base) throw new Error('API base URL not set');

      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${base}/api/revoke-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      await auth.signOut();
      showToast(t('settings.sessionsRevoked', 'All sessions revoked. You have been signed out.'), 'success');
    } catch (e) {
      try {
        await auth.signOut();
      } catch { }
      showToast(e?.message || t('settings.sessionsFailed', 'Failed to revoke sessions.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section>
      <SectionHeader
        icon={<ComputerDesktopIcon className="w-5 h-5" />}
        title={t('settings.sessions', 'Active Sessions')}
        subtitle="Manage your logged-in devices"
      />

      <div className="mb-6 p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
        <ComputerDesktopIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Sign Out Everywhere
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          This will log you out from all devices and browsers. You'll need to sign in again on each device.
        </p>
        <ActionButton
          icon={<ArrowPathIcon className="w-5 h-5" />}
          label={busy ? t('settings.revoking', 'Revoking...') : t('settings.signOutAll', 'Sign Out All Devices')}
          onClick={signOutEverywhere}
          variant="danger"
          disabled={busy}
          loading={busy}
          fullWidth
        />
      </div>

      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          💡 Use this feature if you suspect unauthorized access to your account or if you've logged in on a public device.
        </p>
      </div>
    </Section>
  );
}