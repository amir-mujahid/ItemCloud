import { useEffect, useState } from 'react';
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
} from 'recharts';

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
const themeBlue = () =>
  (typeof document !== 'undefined' &&
  document.documentElement.classList.contains('dark'))
    ? '#60a5fa'   // light blue in dark mode
    : '#2563eb';  // dark blue in light mode

export default function AvgTimeToClaimTrend({ months = 12 }) {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const since = monthsAgoStart(months);

        // 1) recent claims
        const qRef = query(
          collection(db, 'Claim'),
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(qRef);
        const claims = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

        // 2) fetch LostItems for the involved itemIDs
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

        // 3) compute diffs in hours, group by month
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
          .map((m) => ({ month: m.month, avgHours: +(m.total / m.n).toFixed(1) }));

        setRows(ordered);
      } catch (e) {
        console.error('AvgTimeToClaimTrend failed', e);
        setRows([]);
      }
    })();
  }, [months]);

  return (
    <div className="glass rounded-2xl p-4 min-w-0 glow-interactive">
      <div className="font-semibold mb-2">
        {t('charts.avgTimeToClaim', 'Average time to claim (hours) — last {{n}} months', { n: months })}
      </div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals domain={[0, 'dataMax + 2']} />
              <Tooltip
                formatter={(v) => [
                  `${v} ${t('charts.hoursShort', 'h')}`,
                  t('charts.avgTime', 'Avg time'),
                ]}
              />
            <Line type="monotone" dataKey="avgHours" stroke={themeBlue()} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
