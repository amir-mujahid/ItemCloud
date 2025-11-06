// src/components/charts/MonthlyLostChart.jsx
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
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
import { CubeIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

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

export default function MonthlyLostChart() {
  const { t } = useI18n();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, trend: 0 });

  useEffect(() => {
    (async () => {
      try {
        // Get last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const snap = await getDocs(
          query(
            collection(db, 'LostItems'),
            where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
            orderBy('createdAt', 'desc')
          )
        );

        const buckets = new Map();
        snap.forEach(doc => {
          const it = doc.data();
          const ts = it?.createdAt?.toDate?.();
          if (!ts) return;
          const key = monthKey(ts);
          buckets.set(key, (buckets.get(key) || 0) + 1);
        });

        const sortedData = [...buckets.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => ({ month: monthLabel(k), count: v }));

        setData(sortedData);

        // Calculate stats
        const total = snap.size;
        const lastMonth = sortedData[sortedData.length - 1]?.count || 0;
        const prevMonth = sortedData[sortedData.length - 2]?.count || 0;
        const trend = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

        setStats({ total, trend });
      } catch (error) {
        console.error('Error loading monthly lost items:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#d946ef'];

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <CubeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('charts.campusLostPerMonth', 'Campus Lost Items')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last 6 months</p>
          </div>
        </div>
        {stats.trend !== 0 && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            stats.trend > 0 
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          }`}>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${stats.trend < 0 ? 'rotate-180' : ''}`} />
            <span className="text-sm font-semibold">{Math.abs(stats.trend)}%</span>
          </div>
        )}
      </div>

      <div className="h-64">
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
          <span className="text-slate-600 dark:text-slate-400">Total Items</span>
          <span className="font-bold text-slate-900 dark:text-white">{stats.total}</span>
        </div>
      </div>
    </div>
  );
}