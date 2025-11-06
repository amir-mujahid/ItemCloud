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

// AllClaims helpers (status updates + mirror to Claim)
import {
  setClaimAttemptStatus,
  finalizeSuccessfulClaim,
  recordQRScan,           
  recordUnlockSuccess,
} from '../services/claims';

// Pretty-print expiry (localized)
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

export default function LostItemsPage() {
  const { t, i18n } = useI18n();
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [bannerMsg, setBannerMsg] = useState('');
  const { isAdmin } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMsg, setScannerMsg] = useState('');

  // Load grid
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLostItems();
        setItems(data || []);
      } catch (e) {
        console.error(e);
      }
      // 🧹 One-time sweep: reconcile both boxes with Firestore
      try { await reconcileBox('box1'); } catch {}
      try { await reconcileBox('box2'); } catch {}
    })();
  }, []);

  // Live subscribe to the active box's unlock-code state
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

         // Mirror RTDB → Firestore while the page is open
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

  // After success, remove from grid & toast
  useEffect(() => {
    if (!active || active.status !== 'successful' || !active.itemID) return;
    setItems((prev) => prev.filter((it) => it.id !== active.itemID));
    setBannerMsg(t('lost.claimSuccess'));
    const tmr = setTimeout(() => {
      setActive(null);
      setBannerMsg('');
    }, 3000);
    return () => clearTimeout(tmr);
  }, [active, t]);

  const grid = useMemo(() => items || [], [items]);

  // Start claim: request code or reuse existing
  async function startClaim(item) {
    setBannerMsg('');
    try {
      // ✅ Use requestOrReuseUnlockCode to allow same user to reopen
      const res = await requestOrReuseUnlockCode(item.id, item.boxId);

      const payload = {
        ...res,
        boxId: res.boxId || item.boxId,
        itemID: res.itemID || item.id,
        status: 'pending',
      };
      setActive(payload);

      // Show message if session was reused
      if (res.reused) {
        console.log('♻️ Session reused - showing existing code');
        setBannerMsg(t('lost.sessionReused') || 'Your previous unlock code is still active');
        setTimeout(() => setBannerMsg(''), 3000);
      }

      // Notify/email (only for new sessions, not reused)
      if (!res.reused) {
        const user = auth.currentUser;
        if (user) {
          await pushNotif(user.uid, {
            type: 'unlock',
            title: t('lost.notifUnlockTitle', 'Unlock code generated'),
            message: t('lost.notifUnlockBody', 'Item {{item}} • Box {{box}} • Expires at {{time}}', {
              item: payload.itemID,
              box: payload.boxId,
              time: new Date(payload.expiresAtMs || payload.expiredAtMs).toLocaleTimeString(),
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
      }
    } catch (e) {
      console.error(e);
      setBannerMsg(e?.code === 'IN_USE' ? t('lost.inUse') : (e?.message || t('lost.startFail')));
    }
  }

  // Cancel an active code
  async function cancelActive() {
    try {
      if (!active?.boxId) return;
      await cancelUnlockCode(active.boxId);
      if (active?.attemptId) {
        await setClaimAttemptStatus(active.attemptId, 'cancelled', { reason: 'user_cancelled' });
      }
      setActive((a) => (a ? { ...a, status: 'cancelled' } : a));
    } catch (e) {
      console.error(e);
      setBannerMsg(e?.message || t('lost.cancelFail'));
    }
  }

  // Resend code
  async function resendActive() {
    setBannerMsg('');
    try {
      if (!active?.boxId || !active?.itemID) return;
      const res = await resendUnlockCode(active.itemID, active.boxId, active.attemptId);

      if (active?.attemptId) {
        await setClaimAttemptStatus(active.attemptId, 'pending', {
          code: res?.code ?? null,
          expiresAtMs: res?.expiresAtMs ?? res?.expiredAtMs ?? null,
        });
      }

      setActive((a) => ({
        ...(a || {}),
        ...res,
        status: 'pending',
      }));

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
    } catch (e) {
      console.error(e);
      setBannerMsg(e?.message || t('lost.resendFail'));
    }
  }

  async function applyScannedPayload(decoded) {
    console.log('📱 QR Scanned:', decoded);
    
    try {
      if (!decoded || decoded.trim() === '') {
        console.error('❌ Empty QR code');
        setScannerMsg('Scanned empty QR code');
        setShowScanner(false);
        return;
      }
      
      const scannedBoxId = decoded.trim();
      console.log('📦 Scanned Box ID:', scannedBoxId);
      
      if (!active || !active.boxId) {
        console.error('❌ No active claim');
        setScannerMsg('Please claim an item first before scanning QR');
        setShowScanner(false);
        return;
      }
      
      console.log('📋 Active claim:', active);
      
      if (active.boxId !== scannedBoxId) {
        console.error(`❌ Box mismatch: claimed ${active.boxId}, scanned ${scannedBoxId}`);
        setScannerMsg(`Wrong box! You claimed ${active.boxId}, but scanned ${scannedBoxId}`);
        setShowScanner(false);
        return;
      }
      
      setShowScanner(false);
      setBannerMsg('Unlocking box... Please wait');
      setScannerMsg('');
      
      const startTime = Date.now();
      
      console.log('🔓 Calling validateAndUnlockQR...');
      
      const result = await validateAndUnlockQR(scannedBoxId);
      
      console.log('✅ Unlock result:', result);
      
      if (active.attemptId) {
        console.log('💾 Recording to Firestore...');
        
        try {
          await recordQRScan(active.attemptId);
          console.log('✅ QR scan recorded');
        } catch (err) {
          console.warn('⚠️ Failed to record QR scan:', err);
        }
        
        try {
          await recordUnlockSuccess(active.attemptId, 'qr_scan', startTime);
          console.log('✅ Unlock success recorded');
        } catch (err) {
          console.warn('⚠️ Failed to record unlock success:', err);
        }
        
        try {
          await setClaimAttemptStatus(active.attemptId, 'successful', {
            unlockMethod: 'qr_scan',
            unlockedAt: Date.now(),
            qrScannedAt: Date.now()
          });
          console.log('✅ Status updated');
        } catch (err) {
          console.warn('⚠️ Failed to update status:', err);
        }
        
        try {
          await finalizeSuccessfulClaim(active.attemptId);
          console.log('✅ Claim finalized');
        } catch (err) {
          console.warn('⚠️ Failed to finalize claim:', err);
        }
      }
      
      setBannerMsg('Box unlocked successfully! 🎉');
      setScannerMsg('');
      
      setActive(prev => prev ? { ...prev, status: 'successful' } : null);
      
      setTimeout(() => {
        setActive(null);
        setBannerMsg('');
      }, 3000);
      
    } catch (err) {
      console.error('❌ QR unlock error:', err);
      
      setShowScanner(false);
      
      let errorMessage = '';
      
      switch (err?.code) {
        case 'NOT_AUTHENTICATED':
          errorMessage = 'You must be logged in to unlock';
          break;
        case 'INVALID_QR':
          errorMessage = 'Invalid QR code format';
          break;
        case 'NO_SESSION':
          errorMessage = 'No unlock session found. Try claiming again.';
          break;
        case 'WRONG_USER':
          errorMessage = 'This QR belongs to another user\'s claim.';
          break;
        case 'INVALID_STATUS':
          errorMessage = 'This unlock session is no longer active.';
          break;
        case 'EXPIRED':
          errorMessage = 'Session expired. Please request a new code.';
          break;
        case 'TIMEOUT':
          errorMessage = 'Box did not respond. Try keypad or scan again.';
          break;
        default:
          errorMessage = err?.message || 'Failed to unlock box';
      }
      
      setScannerMsg(errorMessage);
      setBannerMsg('');
    }
  }

  const claimsLocked = Boolean(active && active.status === 'pending');
  const lockedBox = active?.boxId;

  const exportRows = grid.map((it) => ({
    id: it.id,
    itemID: it.itemID || it.id,
    box: it.boxId || it.box || '',
    status: it.status || '',
    createdAt:
      it.createdAt?.toDate?.()?.toISOString?.() ??
      (typeof it.createdAt === 'number'
        ? new Date(it.createdAt).toISOString()
        : it.createdAt || ''),
    imageUrl: it.imageUrl || it.photoUrl || '',
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('lost.title')}</h1>
        {isAdmin && (
          <ExportButton
            rows={exportRows}
            filename={`lost-items-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
        )}
      </div>

      {!!bannerMsg && (
        <div className="rounded-xl border p-3 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {bannerMsg}
        </div>
      )}

      {showScanner && (
        <QRScanner
          onScan={(decoded) => applyScannedPayload(decoded)}
          onError={(err) => {
            console.error('QRScanner error', err);
            setScannerMsg(err?.message || 'Scanner error');
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {!!scannerMsg && (
        <div className="mt-2 rounded p-2 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {scannerMsg}
        </div>
      )}

      {active && (
        <div className="glass rounded-2xl p-4 shadow-glow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">
                {t('lost.box')} <b>{active.boxId}</b> • {t('lost.item')}{' '}
                <b>{active.itemID || '-'}</b>
              </div>
              <div className="text-sm text-slate-500">{t('lost.yourCode')}</div>
              <div className="text-2xl font-mono tracking-widest">
                {active.code || '□□□□□□□□'}
              </div>
              {active.expiresAtMs && (
                <div className="text-xs text-slate-400 mt-1">
                  {t('lost.expiresAt')}: {formatExpires(active.expiresAtMs, i18n.language)}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-sm">
                {active.status === 'pending' && (active.expiredAtMs || active.expiresAtMs) ? (
                  <>
                    {t('lost.expiresIn')}{' '}
                    <Countdown expiresAtMs={active.expiredAtMs || active.expiresAtMs}
                      onExpire={async () => {
                        const a = active;
                        setActive((prev) => (prev ? { ...prev, status: 'expired' } : prev));
                        if (a?.boxId) {
                          await expireUnlockCode(a.boxId, a.attemptId).catch(() => {});
                        }
                      }}
                    />
                  </>
                ) : active.status === 'expired' ? (
                  <span className="text-red-600">{t('lost.expired')}</span>
                ) : active.status === 'cancelled' ? (
                  <span className="text-amber-600">{t('lost.cancelled')}</span>
                ) : active.status === 'used' || active.status === 'successful' ? (
                  <span className="text-emerald-600">{t('lost.claimed')}</span>
                ) : null}
              </div>

              <div className="flex gap-2">
                {active.status === 'pending' && (
                  <button
                    className="rounded-xl px-4 py-2 bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    onClick={cancelActive}
                  >
                    {t('common.cancel')}
                  </button>
                )}
                {(active.status === 'expired' || active.status === 'cancelled') && (
                  <button
                    className="rounded-xl bg-blue-600 text-white px-4 py-2"
                    onClick={resendActive}
                  >
                    {t('common.resendCode')}
                  </button>
                )}
                <button
                  className="rounded-xl px-4 py-2 border border-slate-300 dark:border-slate-600"
                  onClick={() => setActive(null)}
                >
                  {t('common.close')}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="rounded-xl px-4 py-2 border"
                  onClick={() => {
                    setShowScanner(true);
                    setScannerMsg('');
                  }}
                >
                  {t('lost.scanQr') || 'Scan QR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {grid.map((it) => {
          const disabled = claimsLocked && it.boxId !== lockedBox;
          return (
            <ItemCard
              key={it.id}
              item={it}
              disabled={disabled}
              onStart={() => startClaim(it)}
            />
          );
        })}
        {grid.length === 0 && (
          <div className="text-slate-500">{t('lost.empty')}</div>
        )}
      </div>
    </div>
  );
}