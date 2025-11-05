// src/components/charts/MyYearLossesChart.jsx
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { useI18n } from '../../i18n';

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthsAgoStart(n) {
  const d = new Date();
  // “since” is the 1st day of the month (n-1) months before current
  return new Date(d.getFullYear(), d.getMonth() - (n - 1), 1);
}
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function asDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return null;
}

export default function MyYearLossesChart() {
  const { t } = useI18n();
  const [data, setData] = useState([]);

  useEffect(() => { (async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return setData([]);

    const MONTHS = 3;                                                // <<< changed: 3 months
    const since = monthsAgoStart(MONTHS);

    // only pull the last 3 months from Claim for this user
    const snap = await getDocs(
      query(
        collection(db, 'Claim'),
        where('uid', '==', uid),
        where('createdAt', '>=', Timestamp.fromDate(since))
      )
    );

    // build 3 fixed month buckets (oldest → newest)
    const now = new Date();
    const keys = [];
    for (let i = MONTHS - 1; i >= 0; i--) {
      keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    const counts = Object.fromEntries(keys.map(k => [k, 0]));

    snap.forEach(d => {
      const created = asDate(d.data()?.createdAt);
      if (!created) return;
      const k = monthKey(startOfMonth(created));
      if (k in counts) counts[k] += 1; // ignore older docs defensively
    });

    setData(keys.map(k => ({ month: k, count: counts[k] })));
  })(); }, []);

  return (
    <div className="glass rounded-2xl p-4 glow-interactive">
      <h3 className="font-semibold mb-2">
        {t('charts.myClaimsLast3', 'My claims (last 3 months)')}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar
            name={t('charts.myClaimsByMonth', 'My claims by month')}
            dataKey="count"
            fill="url(#gradGreen)"
            radius={[6,6,0,0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
