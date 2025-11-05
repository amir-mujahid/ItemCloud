import { useEffect, useMemo, useState } from 'react';

export default function UnlockModal({
  open, onClose,
  code, box, itemID,
  startedAtMs, expiredAtMs,
  onCancel, onResend,
  status, // 'pending' | 'expired' | 'cancelled' | 'used'
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const secsLeft = useMemo(() => {
    if (!expiredAtMs) return 0;
    return Math.max(0, Math.floor((expiredAtMs - now) / 1000));
  }, [expiredAtMs, now]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 w-[420px] rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Unlock code</h3>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-500">Box: <b>{box}</b> • Item: <b>{itemID}</b></div>
          <div className="text-3xl font-mono tracking-widest text-center py-2">{code || '--------'}</div>
          <div className="text-center text-sm">
            {status === 'pending' && secsLeft > 0 && (
              <>Expires in <b>{Math.floor(secsLeft/60)}:{String(secsLeft%60).padStart(2,'0')}</b></>
            )}
            {status === 'expired' && <span className="text-red-600">Expired</span>}
            {status === 'cancelled' && <span className="text-amber-600">Cancelled</span>}
            {status === 'used' && <span className="text-emerald-600">Claimed</span>}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {status === 'pending' && (
            <button className="flex-1 rounded-xl bg-slate-200 dark:bg-slate-800 py-2"
                    onClick={onCancel}>Cancel</button>
          )}
          {(status === 'expired' || status === 'cancelled') && (
            <button className="flex-1 rounded-xl bg-blue-600 text-white py-2"
                    onClick={onResend}>Resend code</button>
          )}
          <button className="flex-1 rounded-xl border py-2" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
