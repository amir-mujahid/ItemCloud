// src/components/charts/HourlyActivityChart.jsx
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ClockIcon } from '@heroicons/react/24/outline';

function startOfNDaysAgo(n = 14) {
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

export default function HourlyActivityChart({
  collectionName = 'Claim',
  uid,
  days = 14,
  title,
}) {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ peak: 0, peakHour: 0, total: 0 });

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

        if (!isAdmin && uid) {
          qRef = query(
            base,
            where('uid', '==', uid),
            where('createdAt', '>=', Timestamp.fromDate(since)),
            orderBy('createdAt', 'asc')
          );
        }

        const snap = await getDocs(qRef);

        const buckets = Array.from({ length: 24 }, () => 0);

        snap.forEach((d) => {
          const ts = asDate(d.data()?.createdAt);
          if (!ts) return;
          const h = new Date(ts).getHours();
          buckets[h] += 1;
        });

        const data = buckets.map((v, h) => ({
          hour: String(h).padStart(2, '0') + ':00',
          hourNum: h,
          count: v,
        }));

        // Calculate stats
        const peak = Math.max(...buckets);
        const peakHour = buckets.indexOf(peak);
        const total = buckets.reduce((sum, val) => sum + val, 0);

        setRows(data);
        setStats({ peak, peakHour, total });
      } catch (e) {
        console.error('HourlyActivityChart failed', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [collectionName, uid, isAdmin, days]);

  const chartTitle =
    title ||
    t('charts.hourlyActivity', 'Activity by Hour of Day (last {{n}} days)', { n: days });

  const xTicks = useMemo(() => {
    const out = [];
    for (let h = 0; h < 24; h += 3) out.push(String(h).padStart(2, '0') + ':00');
    return out;
  }, []);

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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{chartTitle}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Peak: {stats.peakHour}:00 ({stats.peak} items)
            </p>
          </div>
        </div>
        <div className="hidden md:block px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
          <div className="text-sm text-indigo-600 dark:text-indigo-400">
            <span className="font-semibold">{stats.total}</span> total
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <defs>
              <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="hour" ticks={xTicks} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              fill="url(#colorHourly)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
        <div className="text-sm">
          <span className="text-slate-600 dark:text-slate-400">Busiest Hour</span>
          <div className="font-bold text-slate-900 dark:text-white">{stats.peakHour}:00</div>
        </div>
        <div className="text-sm">
          <span className="text-slate-600 dark:text-slate-400">Peak Activity</span>
          <div className="font-bold text-slate-900 dark:text-white">{stats.peak} items</div>
        </div>
      </div>
    </div>
  );
}