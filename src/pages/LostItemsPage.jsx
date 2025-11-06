// src/pages/LostItemsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import {
  fetchLostItems,
  subscribeUnlockCode,
  requestOrReuseUnlockCode,
  cancelUnlockCode,
  resendUnlockCode,
  expireUnlockCode,
  reconcileBox,
  validateAndUnlockQR
} from '../services/api';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import ItemCard from '../components/ItemCard';
import Countdown from '../components/Countdown';
import { sendUnlockEmail } from '../lib/emailjsClient';
import { pushNotif } from '../services/notify';
import ExportButton from '../components/ExportButton';
import QRScanner from '../components/QRScanner';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  QrCodeIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  KeyIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// AllClaims helpers
import {
  setClaimAttemptStatus,
  finalizeSuccessfulClaim,
  recordQRScan,
  recordUnlockSuccess,
} from '../services/claims';

// Pretty-print expiry
function formatExpires(expiresAtMs, lang = 'en') {
  if (!expiresAtMs) return '';
  const locale = lang?.startsWith('ms') ? 'ms-MY' : 'en-GB';
  return new Date(expiresAtMs).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function Toast({ message, type = 'info', onClose }) {
  const types = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
    warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-800 dark:text-amber-300',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
  };

  const icons = {
    success: <CheckCircleIcon className="w-5 h-5" />,
    error: <ExclamationTriangleIcon className="w-5 h-5" />,
    warning: <ExclamationTriangleIcon className="w-5 h-5" />,
    info: <SparklesIcon className="w-5 h-5" />,
  };

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slideUp max-w-md px-4 py-3 rounded-xl border-l-4 shadow-xl ${types[type]}`}>
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

function StatCard({ icon, label, value, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="glass-solid rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-3 shadow-lg`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function ActiveClaimCard({ active, onCancel, onResend, onClose, onScanQR, t, lang }) {
  const getStatusColor = () => {
    switch (active.status) {
      case 'pending': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'expired': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'cancelled': return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'successful': return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      default: return 'border-slate-300 dark:border-slate-600';
    }
  };

  return (
    <div className={`glass-gradient rounded-2xl p-6 border-l-4 shadow-2xl ${getStatusColor()} animate-slideDown`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Code Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <KeyIcon className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold">{t('lost.box')}:</span> {active.boxId} • 
              <span className="font-semibold ml-2">{t('lost.item')}:</span> {active.itemID || '-'}
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              {t('lost.yourCode', 'Your Unlock Code')}
            </div>
            <div className="text-4xl font-mono tracking-[0.5em] font-bold text-slate-900 dark:text-white">
              {active.code || '□□□□□□□□'}
            </div>
          </div>

          {active.expiresAtMs && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <ClockIcon className="w-4 h-4" />
              <span>{t('lost.expiresAt')}: {formatExpires(active.expiresAtMs, lang)}</span>
            </div>
          )}
        </div>

        {/* Right: Status & Actions */}
        <div className="flex flex-col items-stretch lg:items-end gap-3 min-w-[200px]">
          {/* Status Badge */}
          <div className="flex justify-center lg:justify-end">
            {active.status === 'pending' && (active.expiredAtMs || active.expiresAtMs) ? (
              <div className="px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 animate-pulse" />
                  <span>{t('lost.expiresIn')}</span>
                  <Countdown
                    expiresAtMs={active.expiredAtMs || active.expiresAtMs}
                    onExpire={async () => {
                      if (active?.boxId) {
                        await expireUnlockCode(active.boxId, active.attemptId).catch(() => {});
                      }
                    }}
                  />
                </div>
              </div>
            ) : active.status === 'expired' ? (
              <div className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold">
                {t('lost.expired', 'Expired')}
              </div>
            ) : active.status === 'cancelled' ? (
              <div className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">
                {t('lost.cancelled', 'Cancelled')}
              </div>
            ) : active.status === 'used' || active.status === 'successful' ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                {t('lost.claimed', 'Claimed')}
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {active.status === 'pending' && (
              <>
                <button
                  onClick={onScanQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  <QrCodeIcon className="w-5 h-5" />
                  Scan QR
                </button>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </>
            )}
            {(active.status === 'expired' || active.status === 'cancelled') && (
              <button
                onClick={onResend}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
              >
                <ArrowPathIcon className="w-5 h-5" />
                {t('common.resendCode', 'Resend Code')}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LostItemsPage() {
  const { t, i18n } = useI18n();
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBox, setFilterBox] = useState('all');
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Load items
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLostItems();
        setItems(data || []);
      } catch (e) {
        console.error(e);
        showToast('Failed to load items', 'error');
      } finally {
        setLoading(false);
      }

      try { await reconcileBox('box1'); } catch {}
      try { await reconcileBox('box2'); } catch {}
    })();
  }, []);

  // Subscribe to active unlock code
  useEffect(() => {
    if (!active?.boxId) return;
    const unsub = subscribeUnlockCode(active.boxId, (data) => {
      if (!data) return;

      setActive((prev) => {
        const merged = {
          ...(prev || {}),
          ...data,
          boxId: data.boxId || prev?.boxId,
          itemID: data.itemID || prev?.itemID,
          attemptId: data.attemptId || prev?.attemptId || null,
        };

        if (merged.attemptId) {
          if (merged.status === 'successful') {
            setClaimAttemptStatus(merged.attemptId, 'successful')
              .then(() => finalizeSuccessfulClaim(merged.attemptId))
              .catch(() => {});
          } else if (merged.status === 'expired') {
            setClaimAttemptStatus(merged.attemptId, 'expired', {
              reason: 'timeout',
              expiredAtMs: merged.expiredAtMs || Date.now(),
            }).catch(() => {});
          } else if (merged.status === 'cancelled') {
            setClaimAttemptStatus(merged.attemptId, 'cancelled', {
              reason: 'user_cancelled',
              cancelledAtMs: merged.cancelledAtMs || Date.now(),
            }).catch(() => {});
          }
        }
        return merged;
      });
    });
    return unsub;
  }, [active?.boxId]);

  // Handle successful claim
  useEffect(() => {
    if (!active || active.status !== 'successful' || !active.itemID) return;
    setItems((prev) => prev.filter((it) => it.id !== active.itemID));
    showToast(t('lost.claimSuccess', 'Item claimed successfully! 🎉'), 'success');
    const tmr = setTimeout(() => {
      setActive(null);
    }, 3000);
    return () => clearTimeout(tmr);
  }, [active, t]);

  // Filter & search
  const filteredItems = useMemo(() => {
    let result = items || [];

    if (filterBox !== 'all') {
      result = result.filter(it => (it.boxId || it.box) === filterBox);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(it =>
        (it.id || '').toLowerCase().includes(q) ||
        (it.itemID || '').toLowerCase().includes(q) ||
        (it.title || '').toLowerCase().includes(q) ||
        (it.box || '').toLowerCase().includes(q) ||
        (it.boxId || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, searchQuery, filterBox]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const boxes = [...new Set(items.map(it => it.boxId || it.box).filter(Boolean))];
    const today = items.filter(it => {
      const ts = it.createdAt?.toDate?.() || (typeof it.createdAt === 'number' ? new Date(it.createdAt) : null);
      if (!ts) return false;
      return ts.toDateString() === new Date().toDateString();
    }).length;

    return { total, boxes: boxes.length, today };
  }, [items]);

  const uniqueBoxes = useMemo(() => {
    return [...new Set(items.map(it => it.boxId || it.box).filter(Boolean))].sort();
  }, [items]);

  // Start claim
  async function startClaim(item) {
    try {
      const res = await requestOrReuseUnlockCode(item.id, item.boxId);

      const payload = {
        ...res,
        boxId: res.boxId || item.boxId,
        itemID: res.itemID || item.id,
        status: 'pending',
      };
      setActive(payload);

      if (res.reused) {
        showToast(t('lost.sessionReused', 'Your previous unlock code is still active'), 'info');
      } else {
        const user = auth.currentUser;
        if (user) {
          await pushNotif(user.uid, {
            type: 'unlock',
            title: t('lost.notifUnlockTitle', 'Unlock code generated'),
            message: t('lost.notifUnlockBody', 'Item {{item}} • Box {{box}}', {
              item: payload.itemID,
              box: payload.boxId,
            }),
            link: '/lost',
          }).catch(() => {});
        }
        if (user?.email) {
          await sendUnlockEmail({
            to_email: user.email,
            to_name: user.displayName || 'there',
            app_name: 'ItemCloud',
            box: payload.boxId,
            itemID: payload.itemID,
            unlock_code: payload.code,
            expires: formatExpires(payload.expiredAtMs || payload.expiresAtMs, i18n.language),
            expires_in_minutes: 5,
          }).catch((e) => console.warn('sendUnlockEmail failed:', e));
        }
        showToast('Unlock code sent to your email', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast(e?.code === 'IN_USE' ? t('lost.inUse') : (e?.message || t('lost.startFail')), 'error');
    }
  }

  // Cancel
  async function cancelActive() {
    try {
      if (!active?.boxId) return;
      await cancelUnlockCode(active.boxId);
      if (active?.attemptId) {
        await setClaimAttemptStatus(active.attemptId, 'cancelled', { reason: 'user_cancelled' });
      }
      setActive((a) => (a ? { ...a, status: 'cancelled' } : a));
      showToast('Claim cancelled', 'info');
    } catch (e) {
      console.error(e);
      showToast(e?.message || t('lost.cancelFail'), 'error');
    }
  }

  // Resend
  async function resendActive() {
    try {
      if (!active?.boxId || !active?.itemID) return;
      const res = await resendUnlockCode(active.itemID, active.boxId, active.attemptId);

      if (active?.attemptId) {
        await setClaimAttemptStatus(active.attemptId, 'pending', {
          code: res?.code ?? null,
          expiresAtMs: res?.expiresAtMs ?? res?.expiredAtMs ?? null,
        });
      }

      setActive((a) => ({ ...(a || {}), ...res, status: 'pending' }));

      const user = auth.currentUser;
      if (user?.email) {
        await sendUnlockEmail({
          to_email: user.email,
          to_name: user.displayName || 'there',
          app_name: 'ItemCloud',
          box: active.boxId,
          itemID: active.itemID,
          unlock_code: res?.code,
          expires: formatExpires(res?.expiredAtMs || res?.expiresAtMs, i18n.language),
          expires_in_minutes: 5,
        }).catch((e) => console.warn('sendUnlockEmail failed:', e));
      }
      showToast('Code resent to your email', 'success');
    } catch (e) {
      console.error(e);
      showToast(e?.message || t('lost.resendFail'), 'error');
    }
  }

  // QR Scan
  async function applyScannedPayload(decoded) {
    try {
      if (!decoded || decoded.trim() === '') {
        throw new Error('Empty QR code');
      }

      const scannedBoxId = decoded.trim();

      if (!active || !active.boxId) {
        throw new Error('Please claim an item first');
      }

      if (active.boxId !== scannedBoxId) {
        throw new Error(`Wrong box! You claimed ${active.boxId}, scanned ${scannedBoxId}`);
      }

      setShowScanner(false);
      showToast('Unlocking box...', 'info');

      const startTime = Date.now();
      await validateAndUnlockQR(scannedBoxId);

      if (active.attemptId) {
        await recordQRScan(active.attemptId).catch(() => {});
        await recordUnlockSuccess(active.attemptId, 'qr_scan', startTime).catch(() => {});
        await setClaimAttemptStatus(active.attemptId, 'successful', {
          unlockMethod: 'qr_scan',
          unlockedAt: Date.now(),
          qrScannedAt: Date.now()
        }).catch(() => {});
        await finalizeSuccessfulClaim(active.attemptId).catch(() => {});
      }

      showToast('Box unlocked successfully! 🎉', 'success');
      setActive(prev => prev ? { ...prev, status: 'successful' } : null);

      setTimeout(() => {
        setActive(null);
      }, 3000);

    } catch (err) {
      console.error('QR unlock error:', err);
      setShowScanner(false);

      const errorMessages = {
        'NOT_AUTHENTICATED': 'You must be logged in',
        'INVALID_QR': 'Invalid QR code',
        'NO_SESSION': 'No unlock session found',
        'WRONG_USER': 'This QR belongs to another user',
        'INVALID_STATUS': 'Session no longer active',
        'EXPIRED': 'Session expired',
        'TIMEOUT': 'Box did not respond',
      };

      showToast(errorMessages[err?.code] || err?.message || 'Failed to unlock', 'error');
    }
  }

  const claimsLocked = Boolean(active && active.status === 'pending');
  const lockedBox = active?.boxId;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="glass-gradient rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <CubeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {t('lost.title', 'Lost Items')}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Find and claim your lost belongings
              </p>
            </div>
          </div>

          {isAdmin && (
            <ExportButton
              rows={items.map(it => ({
                id: it.id,
                itemID: it.itemID || it.id,
                box: it.boxId || it.box || '',
                status: it.status || '',
                createdAt: it.createdAt?.toDate?.()?.toISOString?.() || '',
                imageUrl: it.imageUrl || '',
              }))}
              filename={`lost-items-${new Date().toISOString().slice(0, 10)}.xlsx`}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CubeIcon className="w-5 h-5 text-white" />}
          label="Total Lost Items"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<ClockIcon className="w-5 h-5 text-white" />}
          label="Lost Today"
          value={stats.today}
          color="amber"
        />
        <StatCard
          icon={<FunnelIcon className="w-5 h-5 text-white" />}
          label="Active Locations"
          value={stats.boxes}
          color="purple"
        />
      </div>

      {/* Active Claim */}
      {active && (
        <ActiveClaimCard
          active={active}
          onCancel={cancelActive}
          onResend={resendActive}
          onClose={() => setActive(null)}
          onScanQR={() => setShowScanner(true)}
          t={t}
          lang={i18n.language}
        />
      )}

      {/* QR Scanner */}
      {showScanner && (
        <QRScanner
          onScan={applyScannedPayload}
          onError={(err) => {
            console.error('Scanner error', err);
            showToast(err?.message || 'Scanner error', 'error');
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Search & Filter */}
      <div className="glass-solid rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item ID, box, or title..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              onClick={() => setFilterBox('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                filterBox === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Boxes
            </button>
            {uniqueBoxes.map((box) => (
              <button
                key={box}
                onClick={() => setFilterBox(box)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                  filterBox === box
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {box}
              </button>
            ))}
          </div>
        </div>
        {(searchQuery || filterBox !== 'all') && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <p className="text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold">{filteredItems.length}</span> of{' '}
              <span className="font-semibold">{items.length}</span> items
            </p>
            {(searchQuery || filterBox !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterBox('all');
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((it) => {
          const disabled = claimsLocked && (it.boxId || it.box) !== lockedBox;
          return (
            <ItemCard
              key={it.id}
              item={it}
              disabled={disabled}
              onStart={() => startClaim(it)}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="glass-solid rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <CubeIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {searchQuery || filterBox !== 'all' ? 'No items found' : t('lost.empty', 'No lost items')}
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery || filterBox !== 'all'
              ? 'Try adjusting your filters'
              : 'Great! No items are currently lost'}
          </p>
        </div>
      )}
    </div>
  );
}