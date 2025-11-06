// src/components/dashboard/PendingClaims.jsx
import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../services/firebase';
import { ClockIcon, CubeIcon, KeyIcon } from '@heroicons/react/24/outline';

export default function PendingClaims({ admin = false, uid }) {
  const { t } = useI18n();
  const [list, setList] = useState([]);

  useEffect(() => {
    const r = ref(rtdb, 'UnlockCodes');
    const h = onValue(r, (s) => {
      const v = s.val() || {};
      const rows = Object.entries(v)
        .map(([boxId, x]) => ({ boxId, ...x }))
        .filter((x) => x?.status === 'pending' && (admin || x?.uid === uid))
        .sort((a, b) => (b.startedAtMs || 0) - (a.startedAtMs || 0));
      setList(rows);
    });
    return () => off(r, 'value', h);
  }, [admin, uid]);

  if (!list.length) {
    return (
      <div className="glass-solid rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          {t('dashboard.noPending', 'No pending claims at the moment')}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-solid rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center animate-pulse">
          <ClockIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('dashboard.pending', 'Pending Claims')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{list.length} active sessions</p>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((r) => {
          const timeLeft = r.expiresAtMs - Date.now();
          const minutesLeft = Math.max(0, Math.floor(timeLeft / 60000));
          const secondsLeft = Math.max(0, Math.floor((timeLeft % 60000) / 1000));

          return (
            <div
              key={r.boxId}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CubeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{r.boxId}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Item: {r.itemID}</div>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    timeLeft > 120000
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse'
                  }`}
                >
                  {minutesLeft}:{String(secondsLeft).padStart(2, '0')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <KeyIcon className="w-4 h-4 text-slate-400" />
                <code className="text-sm font-mono font-semibold text-slate-900 dark:text-white tracking-wider">
                  {r.code}
                </code>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}