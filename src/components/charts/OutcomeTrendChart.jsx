// src/components/charts/OutcomeTrendChart.jsx
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useI18n } from '../../i18n';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { CubeIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function monthsAgoStart(n) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - (n - 1), 1);
}
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`; }
function monthLabel(key) {
  const [year, month] = key.split('-');
  return new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit'
  });
}
function asDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return null;
}
const colors = {
  success:   '#22c55e',
  expired:   '#ef4444',
  cancelled: '#f59e0b',
  pending:   '#94a3b8',
};

function labelFor(t, key) {
  switch (key) {
    case 'success':   return t('status.successful', 'Successful');
    case 'expired':   return t('status.expired', 'Expired');
    case 'cancelled': return t('status.cancelled', 'Cancelled');
    case 'pending':   return t('status.pending', 'Pending');
    default:          return key;
  }
}

export default function OutcomeTrendChart({ months = 6 }) {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, successRate: 0 });

  useEffect(() => {
    (async () => {
      try {
        const since = monthsAgoStart(months);
        const qRef = query(
          collection(db, 'AllClaims'),
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(qRef);

        const bucket = {};
        snap.forEach((d) => {
          const v = d.data() || {};
          const dt = asDate(v.createdAt);
          if (!dt) return;
          const mk = monthKey(startOfMonth(dt));
          bucket[mk] ||= { month: mk, success: 0, expired: 0, cancelled: 0, pending: 0 };

          const s = String(v.status || '').toLowerCase();
          if (['success', 'successful', 'claimed'].includes(s)) bucket[mk].success++;
          else if (s === 'expired') bucket[mk].expired++;
          else if (s === 'cancelled' || s === 'canceled') bucket[mk].cancelled++;
          else bucket[mk].pending++;
        });

        // Build exactly the last N months (oldest → newest) with zeros where missing
        const now = new Date();
        const series = [];
        for (let i = months - 1; i >= 0; i--) {
          const k = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
          series.push(bucket[k] || { month: k, success: 0, expired: 0, cancelled: 0, pending: 0 });
        }

        // Format month labels
        const formattedData = series.map(s => ({
          ...s,
          month: monthLabel(s.month)
        }));

        setRows(formattedData);

        // Calculate stats
        const total = snap.size;
        const successCount = formattedData.reduce((sum, m) => sum + m.success, 0);
        const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

        setStats({ total, successRate });
      } catch (e) {
        console.error('OutcomeTrendChart failed', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [months]);

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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <CubeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('charts.outcomeTrend', 'Claim Outcomes')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last {months} months</p>
          </div>
        </div>
        {stats.successRate > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{stats.successRate}% success</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
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
            <Legend formatter={(k) => labelFor(t, k)} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="success"   stackId="a" fill={colors.success} radius={[0, 0, 0, 0]} />
            <Bar dataKey="expired"   stackId="a" fill={colors.expired} radius={[0, 0, 0, 0]} />
            <Bar dataKey="cancelled" stackId="a" fill={colors.cancelled} radius={[0, 0, 0, 0]} />
            <Bar dataKey="pending"   stackId="a" fill={colors.pending} radius={[4, 4, 0, 0]} />
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