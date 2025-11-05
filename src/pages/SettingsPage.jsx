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

function Section({ title, children }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="text-lg font-semibold">{title}</div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const user = auth.currentUser;
  const { isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    marketingEmails: false,
    language: 'en',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [profile, setProfile] = useState({
    fullName: '',
    icNumber: '',
    matricNo: '',
    phone: '',
    practicum: '',
  });
  const [pSaving, setPSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
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
    })();
    return () => { alive = false; };
  }, [user?.uid]);

  async function ensureGateOrRequest() {
    if (isAdmin) return true;
    const gate = await isProfileEditAllowed(user.uid);
    if (!gate.ok) {
      await requestProfileEdit(user.uid, user.email);
      setMsg('Edit request sent to admin. You’ll be able to edit once approved.');
      return false;
    }
    return true;
  }

  async function savePrefs() {
    if (!user) return;
    setSaving(true); setMsg('');
    try {
      const can = await ensureGateOrRequest();
      if (!can) return;
      await setDoc(doc(db, 'Users', user.uid, 'settings', 'preferences'), prefs, { merge: true });
      changeAppLanguage(prefs.language);
      setMsg(t('settings.saved') || 'Preferences saved.');
    } catch (e) {
      setMsg(e?.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!user) return;
    setPSaving(true); setMsg('');
    try {
      const can = await ensureGateOrRequest();
      if (!can) return;
      await setDoc(doc(db, 'Users', user.uid), {
        ...profile,
        email: user.email || '',
        updatedAt: new Date(),
      }, { merge: true });
      setMsg(t('settings.profileSaved') || 'Profile updated.');
    } catch (e) {
      setMsg(e?.message || 'Failed to update profile.');
    } finally {
      setPSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">{t('settings.title')}</div>
          <div className="text-sm text-slate-500">{t('settings.subtitle') || 'Tune your ItemCloud experience'}</div>
        </div>
        <img src="/logo.png" alt="ItemCloud" className="h-10 w-10 opacity-80" />
      </div>

      {!!msg && (
        <div className="rounded-xl border p-3 bg-emerald-50 text-emerald-700">{msg}</div>
      )}

      <Section title={t('settings.profile')}>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder={t('settings.fullName') || 'Full name'}
            value={profile.fullName} onChange={e=>setProfile(p=>({...p, fullName:e.target.value}))} />
          <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder={t('settings.icNumber') || 'IC number'}
            value={profile.icNumber} onChange={e=>setProfile(p=>({...p, icNumber:e.target.value}))} />
          <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder={t('settings.matricNo') || 'Matric No'}
            value={profile.matricNo} onChange={e=>setProfile(p=>({...p, matricNo:e.target.value}))} />
          <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder={t('settings.phone') || 'Phone'}
            value={profile.phone} onChange={e=>setProfile(p=>({...p, phone:e.target.value}))} />
          <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder={t('settings.practicum') || 'Practicum'}
            value={profile.practicum} onChange={e=>setProfile(p=>({...p, practicum:e.target.value}))} />
        </div>
        <button onClick={saveProfile} disabled={pSaving}
          className="mt-2 rounded-lg px-4 py-2 btn-primary glow-interactive text-white">
          {pSaving ? (t('common.saving') || 'Saving…') : (t('settings.saveProfile') || 'Save Profile')}
        </button>
      </Section>

      <Section title={t('settings.notifications')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t('settings.emailNotif')}</div>
            <div className="text-xs text-slate-500">{t('settings.emailNotifHint') || 'Unlock code, claim success, system notices'}</div>
          </div>
          <input type="checkbox" className="h-5 w-5"
            checked={prefs.emailNotifications}
            onChange={e=>setPrefs(p=>({...p, emailNotifications: e.target.checked}))} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t('settings.inAppNotif')}</div>
            <div className="text-xs text-slate-500">{t('settings.inAppNotifHint') || 'Bell icon alerts inside ItemCloud'}</div>
          </div>
          <input type="checkbox" className="h-5 w-5"
            checked={prefs.inAppNotifications}
            onChange={e=>setPrefs(p=>({...p, inAppNotifications: e.target.checked}))} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t('settings.productUpdates')}</div>
            <div className="text-xs text-slate-500">{t('settings.productUpdatesHint') || 'Occasional tips & feature announcements'}</div>
          </div>
          <input type="checkbox" className="h-5 w-5"
            checked={prefs.marketingEmails}
            onChange={e=>setPrefs(p=>({...p, marketingEmails: e.target.checked}))} />
        </div>

        <button onClick={savePrefs} disabled={saving}
          className="mt-2 rounded-lg px-4 py-2 border btn-primary glow-interactive">
          {saving ? (t('common.saving') || 'Saving…') : (t('settings.saveNotif') || 'Save Notification Preferences')}
        </button>
      </Section>

      <Section title={t('settings.appearance')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t('settings.theme')}</div>
            <div className="text-xs text-slate-500">{t('settings.themeHint') || 'Light or dark'}</div>
          </div>
          <button
            className="rounded-lg px-4 py-2 border"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? (t('theme.switchToLight') || 'Switch to Light') : (t('theme.switchToDark') || 'Switch to Dark')}
          </button>
        </div>
      </Section>

      <Section title={t('settings.language')}>
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 rounded-lg border dark:bg-slate-800"
            value={prefs.language}
            onChange={e=>setPrefs(p=>({...p, language:e.target.value}))}>
            <option value="en">English</option>
            <option value="ms">Bahasa Melayu</option>
          </select>
          <button onClick={savePrefs} className="rounded-lg px-4 py-2 border btn-primary glow-interactive">{t('common.save') || 'Save'}</button>
        </div>
      </Section>

      <SecuritySection t={t} />
      <SessionsSection t={t} />
      <div className="text-center text-xs text-slate-500 mt-6" />
    </div>
  );
}

function SecuritySection({ t }) {
  const user = auth.currentUser;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function changeEmail() {
    setBusy(true); setErr(''); setOk('');
    const newEmail = prompt(t('settings.enterNewEmail') || 'Enter new email:');
    if (!newEmail) { setBusy(false); return; }
    try {
      await updateEmail(user, newEmail);
      setOk(t('settings.emailUpdated') || 'Email updated. Please verify your new email.');
      await requestVerifyEmail({ app: 'main' });
    } catch (e) {
      setErr(e?.message || (t('settings.emailUpdateFailed') || 'Failed to update email. You may need to re-login.'));
    } finally { setBusy(false); }
  }

  async function changePassword() {
    setBusy(true); setErr(''); setOk('');
    const newPass = prompt(t('settings.enterNewPassword') || 'Enter new password (min 6 chars):');
    if (!newPass) { setBusy(false); return; }
    try {
      await updatePassword(user, newPass);
      setOk(t('settings.passwordUpdated') || 'Password updated.');
    } catch (e) {
      setErr(e?.message || (t('settings.passwordUpdateFailed') || 'Failed to update password. You may need to re-login.'));
    } finally { setBusy(false); }
  }

  async function resendVerification() {
    setBusy(true); setErr(''); setOk('');
    try {
      const { link } = await requestVerifyEmail({ app: 'main' });
      console.log('[verify link]', link);
      setOk(t('settings.verificationSent') || 'Verification email sent. Use the most recent email only.');
    } catch (e) {
      setErr(e?.message || (t('settings.verificationFailed') || 'Failed to send verification email.'));
    } finally { setBusy(false); }
  }

  return (
    <Section title={t('settings.security')}>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg px-4 py-2 border" onClick={() => changeEmail()} disabled={busy}>{t('settings.changeEmail')}</button>
        <button className="rounded-lg px-4 py-2 border" onClick={() => changePassword()} disabled={busy}>{t('settings.changePassword')}</button>
        <button className="rounded-lg px-4 py-2 btn-primary glow-interactive text-white" onClick={resendVerification} disabled={busy}>
          {t('settings.resendVerification')}
        </button>
      </div>
      {ok && <div className="text-xs text-emerald-600 mt-2">{ok}</div>}
      {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
      <div className="text-[11px] text-slate-500 mt-2">
        {t('settings.reauthNote') || 'For sensitive changes, Firebase may require re-authentication.'}
      </div>
    </Section>
  );
}

function SessionsSection({ t }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function signOutEverywhere() {
    setBusy(true); setMsg('');
    try {
      const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'');
      if (!base) throw new Error('API base URL not set');

      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${base}/api/revoke-sessions`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      await auth.signOut();
      setMsg(t('settings.sessionsRevoked') || 'All sessions revoked. You have been signed out.');
    } catch (e) {
      try { await auth.signOut(); } catch {}
      setMsg(e?.message || (t('settings.sessionsFailed') || 'Failed to revoke sessions.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t('settings.sessions')}>
      <button className="rounded-lg px-4 py-2 border" onClick={signOutEverywhere} disabled={busy}>
        {busy ? (t('settings.revoking') || 'Revoking…') : (t('settings.signOutAll') || 'Sign out of all devices')}
      </button>
      {msg && <div className="text-xs mt-2 text-slate-600">{msg}</div>}
    </Section>
  );
}
