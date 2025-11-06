// src/components/charts/AvgTimeToClaimTrend.jsx
import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useI18n } from '../../i18n';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
} from 'recharts';
import { ClockIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-');
  return new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
  });
}

function monthsAgoStart(n) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - n + 1, 1);
}

function asMs(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate().getTime();
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  return null;
}

export default function AvgTimeToClaimTrend({ months = 6 }) {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ avg: 0, trend: 0 });

  useEffect(() => {
    (async () => {
      try {
        const since = monthsAgoStart(months);

        const qRef = query(
          collection(db, 'Claim'),
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(qRef);
        const claims = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

        const itemIDs = [...new Set(claims.map((c) => c.itemID).filter(Boolean))];
        const foundMap = {};
        await Promise.all(
          itemIDs.map(async (iid) => {
            try {
              const s = await getDoc(doc(db, 'LostItems', iid));
              if (s.exists()) foundMap[iid] = s.data()?.createdAt || null;
            } catch {}
          })
        );

        const perMonth = {};
        claims.forEach((c) => {
          const claimMs = asMs(c.createdAt);
          const foundMs = asMs(foundMap[c.itemID]);
          if (!claimMs || !foundMs || claimMs <= foundMs) return;
          const hours = (claimMs - foundMs) / 3600000;
          const mk = monthKey(new Date(claimMs));
          perMonth[mk] ||= { month: mk, total: 0, n: 0 };
          perMonth[mk].total += hours;
          perMonth[mk].n += 1;
        });

        const ordered = Object.values(perMonth)
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((m) => ({ month: monthLabel(m.month), avgHours: +(m.total / m.n).toFixed(1) }));

        setRows(ordered);

        // Calculate stats
        const totalAvg =
          ordered.reduce((sum, m) => sum + m.avgHours, 0) / (ordered.length || 1);
        const lastMonth = ordered[ordered.length - 1]?.avgHours || 0;
        const prevMonth = ordered[ordered.length - 2]?.avgHours || 0;
        const trend =
          prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

        setStats({ avg: totalAvg.toFixed(1), trend });
      } catch (e) {
        console.error('AvgTimeToClaimTrend failed', e);
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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('charts.avgTimeToClaim', { n: months })}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last {months} months</p>
          </div>
        </div>
        {stats.trend !== 0 && (
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full ${
              stats.trend > 0
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            }`}
          >
            <ArrowTrendingUpIcon className={`w-4 h-4 ${stats.trend < 0 ? 'rotate-180' : ''}`} />
            <span className="text-sm font-semibold">{Math.abs(stats.trend)}%</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <defs>
              <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals domain={[0, 'dataMax + 2']} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(v) => [`${v} hours`, 'Avg Time']}
            />
            <Area type="monotone" dataKey="avgHours" fill="url(#colorTime)" stroke="none" />
            <Line
              type="monotone"
              dataKey="avgHours"
              stroke="#06b6d4"
              strokeWidth={3}
              dot={{ r: 4, fill: '#06b6d4' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Average Time</span>
          <span className="font-bold text-slate-900 dark:text-white">{stats.avg} hours</span>
        </div>
      </div>
    </div>
  );
}