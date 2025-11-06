// src/components/charts/BoxLeaderboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { TrophyIcon } from '@heroicons/react/24/solid';

function startOfNDaysAgo(n = 90) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

function asDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return null;
}

export default function BoxLeaderboard({
  collectionName = 'Claim',
  uid,
  days = 90,
  top = 8,
  title,
}) {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const since = startOfNDaysAgo(days);
        const base = collection(db, collectionName);

        let qRef = query(
          base,
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'asc')
        );

        if (!isAdmin && uid && collectionName === 'Claim') {
          qRef = query(
            base,
            where('uid', '==', uid),
            where('createdAt', '>=', Timestamp.fromDate(since)),
            orderBy('createdAt', 'asc')
          );
        }

        const snap = await getDocs(qRef);
        const counts = new Map();

        snap.forEach((d) => {
          const v = d.data() || {};
          const dt = asDate(v.createdAt);
          if (!dt || dt < since) return;
          const box = (v.box || v.boxId || 'unknown') + '';
          counts.set(box, (counts.get(box) || 0) + 1);
        });

        const data = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, top)
          .map(([name, count], index) => ({ name, count, rank: index + 1 }))
          .sort((a, b) => a.count - b.count);

        setRows(data);
      } catch (e) {
        console.error('BoxLeaderboard failed', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [collectionName, uid, isAdmin, days, top]);

  const chartTitle =
    title ||
    (collectionName === 'LostItems'
      ? t('charts.boxLeaderboardLost', 'Top Boxes - Lost Items')
      : t('charts.boxLeaderboardClaims', 'Top Boxes - Claims'));

  const height = useMemo(() => Math.max(280, 60 + rows.length * 40), [rows.length]);

  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#d946ef', '#ec4899', '#f43f5e'];

  if (loading) {
    return (
      <div className="glass-solid rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="glass-solid rounded-2xl p-6 hover:shadow-xl transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <TrophyIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{chartTitle}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Last {days} days</p>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 12, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {rows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <TrophyIcon className="w-4 h-4 text-yellow-500" />
            <span>
              Winner: <span className="font-bold text-slate-900 dark:text-white">{rows[rows.length - 1].name}</span> with{' '}
              <span className="font-bold text-slate-900 dark:text-white">{rows[rows.length - 1].count}</span> items
            </span>
          </div>
        </div>
      )}
    </div>
  );
}