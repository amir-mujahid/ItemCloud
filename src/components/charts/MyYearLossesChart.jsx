// src/components/charts/MyYearLossesChart.jsx
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { useI18n } from '../../i18n';
import { CheckCircleIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-');
  return new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit'
  });
}

function monthsAgoStart(n) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - (n - 1), 1);
}

function asDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return null;
}

export default function MyYearLossesChart() {
  const { t } = useI18n();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, trend: 0 });

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        const MONTHS = 6;
        const since = monthsAgoStart(MONTHS);

        const snap = await getDocs(
          query(
            collection(db, 'Claim'),
            where('uid', '==', uid),
            where('createdAt', '>=', Timestamp.fromDate(since))
          )
        );

        // Build month buckets
        const now = new Date();
        const keys = [];
        for (let i = MONTHS - 1; i >= 0; i--) {
          keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
        }
        const counts = Object.fromEntries(keys.map(k => [k, 0]));

        snap.forEach(d => {
          const created = asDate(d.data()?.createdAt);
          if (!created) return;
          const k = monthKey(new Date(created.getFullYear(), created.getMonth(), 1));
          if (k in counts) counts[k] += 1;
        });

        const chartData = keys.map(k => ({ month: monthLabel(k), count: counts[k] }));
        setData(chartData);

        // Calculate stats
        const total = snap.size;
        const lastMonth = chartData[chartData.length - 1]?.count || 0;
        const prevMonth = chartData[chartData.length - 2]?.count || 0;
        const trend = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

        setStats({ total, trend });
      } catch (error) {
        console.error('Error loading my claims:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const colors = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'];

  if (loading) {
    return (
      <div className="glass-solid rounded-2xl p-6 animate-pulse h-full">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="glass-solid rounded-2xl p-6 hover:shadow-xl transition-all h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <CheckCircleIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('charts.myClaimsLast6', 'My Claims')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last 6 months</p>
          </div>
        </div>
        {stats.trend !== 0 && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            stats.trend > 0
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          }`}>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${stats.trend < 0 ? 'rotate-180' : ''}`} />
            <span className="text-sm font-semibold">{Math.abs(stats.trend)}%</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Total Claims</span>
          <span className="font-bold text-slate-900 dark:text-white">{stats.total}</span>
        </div>
      </div>
    </div>
  );
}