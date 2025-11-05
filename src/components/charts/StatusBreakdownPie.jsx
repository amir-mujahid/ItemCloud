// src/components/charts/StatusBreakdownPie.jsx
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

// start-of-day N days ago
function startOfNDaysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

// normalize incoming status strings to 5 buckets
function normalizeStatus(s) {
  const x = String(s || '').toLowerCase();
  if (['successful', 'success', 'claimed', 'used'].includes(x)) return 'successful';
  if (['pending', 'requested', 'code_requested'].includes(x)) return 'pending';
  if (['expired', 'timeout'].includes(x)) return 'expired';
  if (['cancelled', 'canceled', 'user_cancelled'].includes(x)) return 'cancelled';
  return 'other';
}

export default function StatusBreakdownPie({ uid, days = 90, title }) {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const since = startOfNDaysAgo(days);
        const base = collection(db, 'AllClaims'); // <-- read from AllClaims

        // campus-wide by default; if not admin and uid provided -> filter to that user
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

        // fixed buckets to ensure stable colors/order
        const counts = { successful: 0, pending: 0, expired: 0, cancelled: 0, other: 0 };

        snap.forEach((doc) => {
          const s = normalizeStatus(doc.data()?.status);
          counts[s] = (counts[s] || 0) + 1;
        });

        // build rows in a fixed order
        const ordered = [
          { status: 'successful', value: counts.successful },
          { status: 'pending',    value: counts.pending    },
          { status: 'expired',    value: counts.expired    },
          { status: 'cancelled',  value: counts.cancelled  },
          { status: 'other',      value: counts.other      },
        ].filter(r => r.value > 0);

        setRows(ordered);
      } catch (e) {
        console.error('StatusBreakdownPie failed', e);
        setRows([]);
      }
    })();
  }, [uid, isAdmin, days]);

  // color by status (stable)
  const COLOR_BY_STATUS = useMemo(() => ({
    successful: '#10b981', // emerald-500
    pending:    '#3b82f6', // blue-500
    expired:    '#f59e0b', // amber-500
    cancelled:  '#ef4444', // red-500
    other:      '#8b5cf6', // violet-500
  }), []);

  const labelFor = (s) => {
    switch (s) {
      case 'successful': return t('status.successful', 'Successful');
      case 'pending':    return t('status.pending', 'Pending');
      case 'expired':    return t('status.expired', 'Expired');
      case 'cancelled':  return t('status.cancelled', 'Cancelled');
      default:           return t('status.other', 'Other');
    }
  };

  const chartTitle =
    title || t('charts.statusBreakdown', 'Claims status breakdown (last {{n}} days)', { n: days });

  return (
    <div className="glass rounded-2xl p-4 min-w-0 glow-interactive">
      <div className="font-semibold mb-2">{chartTitle}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="status"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {rows.map((entry) => (
                <Cell key={entry.status} fill={COLOR_BY_STATUS[entry.status] || COLOR_BY_STATUS.other} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, _n, obj) => [v, labelFor(obj?.payload?.status ?? 'other')]}
            />
            <Legend
              formatter={(value) => labelFor(value)}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
