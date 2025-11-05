// src/layouts/Shell.jsx
import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import {
  MoonIcon, SunIcon, HomeIcon, Squares2X2Icon, PhotoIcon,
  ClockIcon, QuestionMarkCircleIcon, Cog6ToothIcon, InformationCircleIcon,
  Bars3Icon, XMarkIcon, WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';
import clsx from 'clsx';
import ProfileButton from '../components/ProfileButton';
import NotificationBell from '../components/NotificationBell';

export default function Shell({ children }) {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, loading: authLoading } = useAuth(); // ⬅️ use isAdmin here
  const location = useLocation();

  // Hide sidebar on auth pages
  const authRoutes = ['/login', '/signup', '/reset', '/verify', '/verify-email'];
  const onAuthPage = authRoutes.some(p => location.pathname.startsWith(p));
  const showSidebar = user && !onAuthPage;

  // sidebar toggle (persists)
  const [open, setOpen] = useState(() => {
    const v = localStorage.getItem('sidebarOpen');
    return v == null ? true : v === '1';
  });
  useEffect(()=>{ localStorage.setItem('sidebarOpen', open ? '1' : '0'); },[open]);

  // Build nav with admin slot
  const nav = [
    { to: '/', label: t('nav.home'), icon: HomeIcon },
    { to: '/dashboard', label: t('nav.dashboard'), icon: Squares2X2Icon },
    { to: '/lost', label: t('nav.lost'), icon: PhotoIcon },
    { to: '/claims', label: t('nav.claims'), icon: ClockIcon },
    { to: '/help', label: t('nav.help'), icon: QuestionMarkCircleIcon },
    ...(isAdmin ? [{ to: '/admin', label: t('nav.updates') || 'Updates', icon: WrenchScrewdriverIcon }] : []),
    { to: '/settings', label: t('nav.settings'), icon: Cog6ToothIcon },
    { to: '/about', label: t('nav.about'), icon: InformationCircleIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 shine">
      <div className="flex">
        {/* Sidebar (desktop) */}
        {showSidebar && (
          <aside
            className={clsx(
              'hidden md:flex flex-col gap-4 p-4 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen transition-all duration-200',
              open ? 'w-72' : 'w-20'
            )}
          >
            <div className={clsx('flex items-center gap-3 px-2', open ? 'justify-start' : 'justify-center')}>
              <img src={logo} alt="ItemCloud" className="h-10 w-10 rounded-xl shadow-glow" />
              {open && <div className="font-semibold text-xl">ItemCloud</div>}
            </div>

            <nav className="mt-4 space-y-1">
              {nav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-xl transition',
                      'hover:bg-brand-50 hover:shadow-glow dark:hover:bg-slate-800',
                      isActive && 'bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700',
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {open && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto space-y-2">
              <button
                onClick={() => setOpen(o => !o)}
                className="w-full glass px-3 py-2 rounded-xl flex items-center justify-center gap-2"
                aria-label="Toggle sidebar"
              >
                {open ? <XMarkIcon className="h-5 w-5"/> : <Bars3Icon className="h-5 w-5" />}
                {open && <span className="text-sm">{t('common.collapse')}</span>}
              </button>

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full glass px-3 py-2 rounded-xl flex items-center justify-center gap-2"
              >
                {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                {open && <span>{theme === 'dark' ? t('theme.lightMode') : t('theme.darkMode')}</span>}
              </button>
            </div>
          </aside>
        )}

        {/* Mobile drawer */}
        {showSidebar && (
          <div className={clsx(
            'fixed inset-0 z-40 md:hidden transition',
            open ? 'pointer-events-auto' : 'pointer-events-none'
          )}>
            <div
              className={clsx('absolute inset-0 bg-black/30', open ? 'opacity-100' : 'opacity-0')}
              onClick={()=>setOpen(false)}
            />
            <div
              className={clsx(
                'absolute top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4',
                'transition-transform',
                open ? 'translate-x-0' : '-translate-x-full'
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="ItemCloud" className="h-8 w-8 rounded-lg" />
                  <span className="font-semibold">ItemCloud</span>
                </div>
                <button onClick={()=>setOpen(false)} aria-label="Close menu">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <nav className="space-y-1">
                {nav.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={()=>setOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-xl transition',
                        'hover:bg-brand-50 hover:shadow-glow dark:hover:bg-slate-800',
                        isActive && 'bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700'
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur border-b border-slate-200 dark:border-slate-800">
            <div className="mx-auto max-w-7xl px-4 md:px-8 h-14 flex items-center justify-between">
              {showSidebar ? (
                <button
                  onClick={()=>setOpen(o=>!o)}
                  className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 md:hidden"
                  aria-label="Open menu"
                  title="Open menu"
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
              ) : (
                <Link to="/" className="md:hidden flex items-center gap-2">
                  <img src={logo} alt="ItemCloud" className="h-8 w-8 rounded-lg" />
                  <span className="font-semibold">ItemCloud</span>
                </Link>
              )}

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2"
                  aria-label="Toggle theme"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
                {user && (
                  <>
                    <NotificationBell />
                    <ProfileButton />
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">
            {/* Optional: while we’re fetching profile/role, show nothing flickery */}
            {authLoading && user ? (
              <div className="mx-auto max-w-7xl text-sm opacity-70">Loading…</div>
            ) : (
              <div className="mx-auto max-w-7xl">{children}</div>
            )}
          </main>

          <footer className="py-8 text-center text-xs text-slate-500">
            <div className="inline-flex items-center gap-2">
              <img src={logo} className="h-6 w-6 object-contain" alt="I-Trax" />
              <span>Regulated by <b>I-Trax</b> (KMJ Smart Lost and Found Box)</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
