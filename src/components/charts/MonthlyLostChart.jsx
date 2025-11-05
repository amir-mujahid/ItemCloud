// src/components/charts/MonthlyLostChart.jsx
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useI18n } from '../../i18n';

function monthKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

export default function MonthlyLostChart() {
  const { t } = useI18n();
  const [data, setData] = useState([]);

  useEffect(()=>{ (async ()=>{
    const snap = await getDocs(query(collection(db,'LostItems'), orderBy('createdAt','desc')));
    const buckets = new Map();
    snap.forEach(doc=>{
      const it = doc.data();
      const ts = it?.createdAt?.toDate?.();
      if (!ts) return;
      const key = monthKey(ts);
      buckets.set(key, (buckets.get(key)||0) + 1);
    });
    setData([...buckets.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>({ month:k, count:v })));
  })(); },[]);

  return (
    <div className="glass rounded-2xl p-4 glow-interactive">
      <h3 className="font-semibold mb-2">{t('charts.campusLostPerMonth')}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar name={t('charts.items')} dataKey="count" fill="url(#gradBlue)" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
