import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d = new Date()) { return new Date(d.getFullYear(), 0, 1); }

export default function KpiCards({ uid, admin = false, children }) {
  const { t } = useI18n();
  const [kpi, setKpi] = useState({ day: 0, month: 0, year: 0, total: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const base = collection(db, 'Claim');
        const filter = (q) => (admin ? q : query(q, where('uid', '==', uid)));

        const todayQ = filter(query(base, where('createdAt', '>=', Timestamp.fromDate(startOfDay()))));
        const monthQ = filter(query(base, where('createdAt', '>=', Timestamp.fromDate(startOfMonth()))));
        const yearQ  = filter(query(base, where('createdAt', '>=', Timestamp.fromDate(startOfYear()))));
        const totalQ = filter(query(base));

        const [a,b,c,d] = await Promise.all([todayQ, monthQ, yearQ, totalQ].map(getDocs));
        if (!alive) return;
        setKpi({ day: a.size, month: b.size, year: c.size, total: d.size });
      } catch (e) {
        console.error('KPI query failed', e);
      }
    })();
    return () => { alive = false; };
  }, [uid, admin]);

  const Card = ({ title, value }) => (
    <div className="glass rounded-2xl p-4 min-w-0  glow-interactive">
      <div className="text-sm text-slate-500 truncate">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );

  return (
    // 3 per row on mobile, 4 per row from md+
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
      <Card title={t('dashboard.today')}     value={kpi.day} />
      <Card title={t('dashboard.thisMonth')} value={kpi.month} />
      <Card title={t('dashboard.thisYear')}  value={kpi.year} />
      <Card title={t('dashboard.total')}     value={kpi.total} />

      {/* extra KPI cards from parent, each wrapped so they become grid items */}
      {React.Children.map(children, (child) => (
        <div className="min-w-0">{child}</div>
      ))}
    </div>
  );
}
