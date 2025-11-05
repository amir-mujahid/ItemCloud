// src/components/charts/OutcomeTrendChart.jsx
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useI18n } from '../../i18n';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function monthsAgoStart(n) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - (n - 1), 1);
}
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`; }
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

export default function OutcomeTrendChart({ months = 3 }) {      // <<< default is 3 now
  const { t } = useI18n();
  const [rows, setRows] = useState([]);

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
        setRows(series);
      } catch (e) {
        console.error('OutcomeTrendChart failed', e);
        setRows([]);
      }
    })();
  }, [months]);

  const height = useMemo(() => Math.max(260, 200 + rows.length * 0), [rows.length]);

  return (
    <div className="glass rounded-2xl p-4 min-w-0 glow-interactive">
      <div className="font-semibold mb-2">
        {t('charts.outcomeTrend', 'Claim outcomes by month (last {{n}} months)', { n: months })}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend formatter={(k) => labelFor(t, k)} />
            <Bar dataKey="success"   stackId="a" fill={colors.success} />
            <Bar dataKey="expired"   stackId="a" fill={colors.expired} />
            <Bar dataKey="cancelled" stackId="a" fill={colors.cancelled} />
            <Bar dataKey="pending"   stackId="a" fill={colors.pending} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
