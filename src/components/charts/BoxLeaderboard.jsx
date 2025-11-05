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
} from 'recharts';

// helper: start-of-day N days ago
function startOfNDaysAgo(n = 90) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

// robust timestamp -> Date
function asDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return null;
}

/**
 * BoxLeaderboard
 * Ranks boxes by activity (doc count) in the last N days.
 *
 * Default source: "Claim" collection; counts per `box` / `boxId`.
 * If not admin + uid provided -> filters to that user’s claims.
 *
 * Props:
 *  - collectionName?: 'Claim' | 'LostItems' (default 'Claim')
 *  - uid?: string | null
 *  - days?: number        (window length, default 90)
 *  - top?: number         (how many boxes to display, default 6)
 *  - title?: string
 */
export default function BoxLeaderboard({
  collectionName = 'Claim',
  uid,
  days = 90,
  top = 6,
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

        // Build query
        let qRef = query(
          base,
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'asc')
        );

        // Limit to viewer's items (for Claim) when not admin and uid passed
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

        // sort by count desc and keep top N
        const data = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, top)
          .map(([name, count]) => ({ name, count }))
          // visual ordering for vertical bars: smallest on top
          .sort((a, b) => a.count - b.count);

        setRows(data);
      } catch (e) {
        console.error('BoxLeaderboard failed', e);
        setRows([]);
      }
    })();
  }, [collectionName, uid, isAdmin, days, top]);

  const chartTitle =
    title ||
    (collectionName === 'LostItems'
      ? t('charts.boxLeaderboardLost', 'Boxes with most lost items (last {{n}} days)', { n: days })
      : t('charts.boxLeaderboardClaims', 'Boxes with most claims (last {{n}} days)', { n: days }));

  // Chart height scales with number of bars
  const height = useMemo(() => Math.max(220, 52 + rows.length * 36), [rows.length]);

  return (
    <div className="glass rounded-2xl p-4 glow-interactive">
      <div className="font-semibold mb-2">{chartTitle}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 12, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={70} />
            <Tooltip />
            {/* Theme-aware bar color (dark blue in light mode, light blue in dark mode) */}
            <Bar dataKey="count" radius={[4, 4, 4, 4]} fill="var(--chart-bar)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
