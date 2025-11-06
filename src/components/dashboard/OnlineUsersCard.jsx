// src/components/dashboard/OnlineUsersCard.jsx
import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../services/firebase';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export default function OnlineUsersCard() {
  const { t } = useI18n();
  const [data, setData] = useState({ online: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(rtdb, 'status');
    const h = onValue(r, (s) => {
      const v = s.val() || {};
      const users = Object.values(v);
      const online = users.filter((x) => x?.state === 'online').length;
      const total = users.length;

      setData({ online, total });
      setLoading(false);
    });
    return () => off(r, 'value', h);
  }, []);

  const onlinePercentage = data.total > 0 ? Math.round((data.online / data.total) * 100) : 0;

  return (
    <div className="glass-solid rounded-2xl p-5 hover:shadow-xl hover:scale-105 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
          <UserGroupIcon className="w-5 h-5 text-white" />
        </div>
        {data.online > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">{onlinePercentage}% active</span>
          </div>
        )}
      </div>

      <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
        {t('dashboard.onlineUsers', 'Online Users')}
      </div>

      {loading ? (
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
      ) : (
        <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.online.toLocaleString()}</div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Total users</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{data.total}</span>
        </div>
      </div>
    </div>
  );
}