import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// helper: start date N days ago (00:00)
function startOfNDaysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}
// helper: YYYY-MM-DD
const keyOf = (d) => new Date(d).toISOString().slice(0, 10);

export default function DailyTrendSparkline({ uid, days = 30, title }) {
  const { isAdmin } = useAuth();
  const { t, i18n } = useI18n();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const since = startOfNDaysAgo(days);
        let qRef = query(
          collection(db, 'Claim'),
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'asc'),
        );
        if (!isAdmin && uid) {
          // only my claims if not admin
          qRef = query(
            collection(db, 'Claim'),
            where('uid', '==', uid),
            where('createdAt', '>=', Timestamp.fromDate(since)),
            orderBy('createdAt', 'asc'),
          );
        }
        const snap = await getDocs(qRef);

        // count per day
        const counts = {};
        snap.forEach((doc) => {
          const v = doc.data();
          const ts =
            v.createdAt?.toDate?.() ??
            (typeof v.createdAt === 'number' ? new Date(v.createdAt) : null);
          if (!ts) return;
          const k = keyOf(ts);
          counts[k] = (counts[k] || 0) + 1;
        });

        // ensure continuous series with zeros
        const out = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(startOfNDaysAgo(days));
          d.setDate(d.getDate() + i);
          const k = keyOf(d);
          out.push({ date: k, count: counts[k] || 0 });
        }
        setRows(out);
      } catch (e) {
        console.error('DailyTrendSparkline failed', e);
        setRows([]);
      }
    })();
  }, [uid, isAdmin, days]);

  const locale = i18n.language?.startsWith('ms') ? 'ms-MY' : 'en-GB';
  const label = title ?? t('charts.dailyTrend', 'Daily claims (last {{n}} days)', { n: days });

  // nicer x labels: show every ~7th day
  const tickFormatter = (d, idx) => {
    if (rows.length <= 10 || idx % 7 === 0) {
      const dt = new Date(d);
      return dt.toLocaleDateString(locale, { month: 'short', day: '2-digit' });
    }
    return '';
  };

  // unique gradient id per mount
  const gradId = useMemo(() => `grad-${Math.random().toString(36).slice(2)}`, []);

  return (
    <div className="h-full flex flex-col glass rounded-2xl p-4 glow-interactive">
      <div className="mb-2 font-semibold">{label}</div>
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                {/* use your brand colors */}
                <stop offset="0%" stopColor="#035cea" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#035cea" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              width={28}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(v) => [v, t('charts.items', 'Items')]}
              labelFormatter={(d) =>
                new Date(d).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
                })
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#035cea"
              fill={`url(#${gradId})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
