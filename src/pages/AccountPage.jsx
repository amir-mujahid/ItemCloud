// src/pages/AccountPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { auth } from '../services/firebase'
import {
  getUserDoc, updateUserProfile, getUserClaims,
  isProfileEditAllowed, requestProfileEdit
} from '../services/user'
import { useAuth } from '../hooks/useAuth';
import {
  updatePassword, sendEmailVerification,
  reauthenticateWithCredential, EmailAuthProvider
} from 'firebase/auth'
import { Link } from 'react-router-dom'
import { useI18n, changeAppLanguage } from '../i18n'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

function Section({ title, children, right }) {
  return (
    <div className="w-full rounded-2xl border p-4 bg-white/70 dark:bg-slate-900/70 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  )
}

export default function AccountPage() {
  const [tab, setTab] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [claims, setClaims] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const { isAdmin } = useAuth();
  const { t, i18n } = useI18n();

  useEffect(() => auth.onAuthStateChanged(setUser), [])
  useEffect(() => {
    (async () => {
      if (!user) return
      const [uDoc, uClaims] = await Promise.all([getUserDoc(user.uid), getUserClaims(user.uid)])
      setProfile(uDoc || {})
      setClaims(uClaims)
    })()
  }, [user])

  const stats = useMemo(() => {
    const perDay = {}
    for (const c of claims) {
      const ts = typeof c.createdAt === 'number' ? c.createdAt : c.createdAt?.toMillis?.()
      const d = new Date(ts || Date.now()).toISOString().slice(0,10)
      perDay[d] = (perDay[d] || 0) + 1
    }
    const daily = Object.entries(perDay).sort().map(([date, count]) => ({ date, count }))
    return { total: claims.length, daily }
  }, [claims])

  async function saveProfile(e) {
    e.preventDefault()
    try {
      setBusy(true)
      const f = new FormData(e.currentTarget)
      if (!isAdmin) {
        const gate = await isProfileEditAllowed(auth.currentUser.uid)
        if (!gate.ok) {
          await requestProfileEdit(auth.currentUser.uid, auth.currentUser.email)
          setMsg(t('account.editRequestSent'))
          return
        }
      }
      await updateUserProfile({
        fullName: f.get('fullName') || '',
        icNumber: f.get('icNumber') || '',
        matricNo: f.get('matricNo') || '',
        phone: f.get('phone') || '',
        practicum: f.get('practicum') || '',
      })
      setMsg(t('settings.profileSaved'))
    } catch (err) {
      setMsg(err?.message || t('common.errorGeneric', 'Failed'))
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    if (!auth.currentUser?.email) return
    try {
      setBusy(true)
      const f = new FormData(e.currentTarget)
      const current = f.get('current')
      const next = f.get('next')
      const cred = EmailAuthProvider.credential(auth.currentUser.email, current)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, next)
      setMsg(t('account.passwordChanged'))
      e.currentTarget.reset()
    } catch (err) {
      setMsg(err?.message || t('account.passwordChangeFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function resendVerification() {
    try {
      setBusy(true)
      await sendEmailVerification(auth.currentUser)
      setMsg(t('account.verificationSent'))
    } catch (err) {
      setMsg(err?.message || t('account.verificationFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Section title={t('account.title')}>
          {t('account.loginPrompt')}{' '}
          <Link className="text-blue-600 underline" to="/login">{t('account.login')}</Link>.
        </Section>
      </div>
    )
  }

  const verified = user.emailVerified
  const tabs = [
    { key: 'dashboard', label: t('account.tabs.dashboard') },
    { key: 'account',   label: t('account.tabs.account') },
    { key: 'general',   label: t('account.tabs.general') },
    { key: 'security',  label: t('account.tabs.security') },
  ]

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('account.title')}</h1>
        {msg && <div className="text-sm text-emerald-600">{msg}</div>}
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border bg-white/60 dark:bg-slate-900/60 p-1 flex w-full overflow-hidden">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 min-w-0 px-4 py-2 rounded-xl text-sm transition
              ${tab===key
                ? 'bg-blue-600 text-white shadow'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <span className="block truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <>
          <Section title={t('account.usageSummary')}>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-slate-500">{t('account.totalSuccessfulClaims')}</div>
                <div className="text-2xl font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-slate-500">{t('account.emailVerified')}</div>
                <div className="text-2xl font-semibold">{verified ? t('common.yes') : t('common.no')}</div>
              </div>
              <div className="rounded-xl border p-4 min-w-0">
                <div className="text-sm text-slate-500">{t('account.currentUser')}</div>
                <div className="text-2xl font-semibold break-all">{user.email}</div>
              </div>
            </div>
          </Section>

          <Section title={t('account.claimsPerDay')}>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </>
      )}

      {tab === 'account' && (
        <>
          <Section
            title={t('settings.profile')}
            right={
              verified
                ? <span className="inline-flex items-center gap-2 text-emerald-600 text-sm">✔ {t('account.verified')}</span>
                : <button disabled={busy} onClick={resendVerification} className="text-sm underline text-blue-600">
                    {t('settings.resendVerification')}
                  </button>
            }
          >
            <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-4">
              <input name="fullName"  defaultValue={profile?.fullName  || ''} placeholder={t('settings.fullName')}  className="input" />
              <input name="icNumber"  defaultValue={profile?.icNumber  || ''} placeholder={t('settings.icNumber')} className="input" />
              <input name="matricNo"  defaultValue={profile?.matricNo  || ''} placeholder={t('settings.matricNo')} className="input" />
              <input name="phone"     defaultValue={profile?.phone     || ''} placeholder={t('settings.phone')}    className="input" />
              <input name="practicum" defaultValue={profile?.practicum || ''} placeholder={t('settings.practicum')} className="input" />
              <div className="sm:col-span-2">
                <button disabled={busy} className="btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </Section>

          <Section title={t('account.detailsTitle')}>
            <div className="space-y-1 text-sm break-all">
              <div><b>{t('account.email')}:</b> {user.email}</div>
              <div><b>{t('account.uid')}:</b> {user.uid}</div>
              <div><b>{t('account.lastSignIn')}:</b> {new Date(user.metadata?.lastSignInTime || Date.now()).toLocaleString()}</div>
            </div>
          </Section>
        </>
      )}

      {tab === 'general' && (
        <>
          <Section title={t('account.preferences')}>
            <div className="flex items-center gap-4">
              <label className="text-sm w-32">{t('settings.language')}</label>
              <select
                value={i18n.language}
                onChange={(e) => changeAppLanguage(e.target.value)}
                className="input"
              >
                <option value="en">English</option>
                <option value="ms">Bahasa Melayu</option>
              </select>
            </div>
          </Section>

          <Section title={t('account.helpLegal')}>
            <div className="text-sm space-x-4">
              <Link to="/help" className="underline text-blue-600">{t('help.title')}</Link>
              <Link to="/privacy" className="underline text-blue-600">{t('nav.privacy','Privacy')}</Link>
              <Link to="/tos" className="underline text-blue-600">{t('nav.terms','Terms')}</Link>
            </div>
          </Section>
        </>
      )}

      {tab === 'security' && (
        <>
          <Section title={t('settings.changePassword')}>
            <form onSubmit={changePassword} className="grid sm:grid-cols-2 gap-4">
              <input name="current" type="password" placeholder={t('account.currentPassword')} className="input" required />
              <input name="next"    type="password" placeholder={t('account.newPassword')}     className="input" required />
              <div className="sm:col-span-2">
                <button disabled={busy} className="btn-primary">{t('account.updatePassword')}</button>
              </div>
            </form>
          </Section>

          <Section title={t('settings.sessions')}>
            <div className="text-sm text-slate-600">
              {t('account.sessionsNote')}{' '}
              <button className="underline text-blue-600" onClick={() => auth.signOut()}>
                {t('account.signOut')}
              </button>.
            </div>
          </Section>
        </>
      )}

      <div className="py-8">
        <div className="mx-auto max-w-md text-center text-xs text-slate-500">
          <div className="inline-flex items-center gap-2"></div>
        </div>
      </div>
    </div>
  )
}
