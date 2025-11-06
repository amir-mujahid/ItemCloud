// src/components/dashboard/TotalLostCard.jsx
import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function TotalLostCard() {
  const { t } = useI18n();
  const [data, setData] = useState({ current: 0, claimed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [lostSnap, claimedSnap] = await Promise.all([
          getDocs(query(collection(db, 'LostItems'), where('status', '==', 'lost'))),
          getDocs(query(collection(db, 'LostItems'), where('status', '==', 'claimed'))),
        ]);

        setData({
          current: lostSnap.size,
          claimed: claimedSnap.size,
        });
      } catch (error) {
        console.error('Error loading lost items:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const successRate =
    data.current + data.claimed > 0
      ? Math.round((data.claimed / (data.current + data.claimed)) * 100)
      : 0;

  return (
    <div className="glass-solid rounded-2xl p-5 hover:shadow-xl hover:scale-105 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
          <ExclamationTriangleIcon className="w-5 h-5 text-white" />
        </div>
        {successRate > 0 && (
          <div className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            {successRate}% claimed
          </div>
        )}
      </div>

      <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
        {t('dashboard.currentLost', 'Lost Items')}
      </div>

      {loading ? (
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
      ) : (
        <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.current.toLocaleString()}</div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Total claimed</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{data.claimed}</span>
        </div>
      </div>
    </div>
  );
}