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

// N days ago at local start-of-day
function startOfNDaysAgo(n = 14) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

// Safe timestamp -> Date
function asDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return null;
}

/**
 * HourlyActivityChart
 * Shows count of docs per hour-of-day for the past N days.
 *
 * Props:
 *  - collectionName?: Firestore collection (default "Claim")
 *  - uid?: when not admin, filter to this user; pass null to force campus-wide
 *  - days?: window length (default 14)
 *  - title?: string
 */
export default function HourlyActivityChart({
  collectionName = 'Claim',
  uid,
  days = 14,
  title,
}) {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState([]);

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

        // If not admin and uid given, restrict to that user
        if (!isAdmin && uid) {
          qRef = query(
            base,
            where('uid', '==', uid),
            where('createdAt', '>=', Timestamp.fromDate(since)),
            orderBy('createdAt', 'asc')
          );
        }

        const snap = await getDocs(qRef);

        // 24 buckets (local hours)
        const buckets = Array.from({ length: 24 }, () => 0);

        snap.forEach((d) => {
          const ts = asDate(d.data()?.createdAt);
          if (!ts) return;
          const h = new Date(ts).getHours(); // local hour 0..23
          buckets[h] += 1;
        });

        const data = buckets.map((v, h) => ({
          hour: String(h).padStart(2, '0'),
          count: v,
        }));

        setRows(data);
      } catch (e) {
        console.error('HourlyActivityChart failed', e);
        setRows([]);
      }
    })();
  }, [collectionName, uid, isAdmin, days]);

  const chartTitle =
    title ||
    t(
      'charts.hourlyActivity',
      'Activity by hour of day (last {{n}} days)',
      { n: days }
    );

  // nice ticks (every 2–3 hours depending on width)
  const xTicks = useMemo(() => {
    const out = [];
    for (let h = 0; h < 24; h += 2) out.push(String(h).padStart(2, '0'));
    return out;
  }, []);

  return (
    <div className="glass rounded-2xl p-4 min-w-0 glow-interactive">
      <div className="font-semibold mb-2">{chartTitle}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" ticks={xTicks} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            {/* area fill for readability */}
            <Area type="monotone" dataKey="count" fillOpacity={0.15} />
            {/* crisp line on top */}
            <Line type="monotone" dataKey="count" dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
