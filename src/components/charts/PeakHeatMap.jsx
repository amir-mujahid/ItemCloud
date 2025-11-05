import { Fragment, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useI18n } from '../../i18n';

export default function PeakHeatmap() {
  const { t } = useI18n();
  const [matrix, setMatrix] = useState(()=>Array.from({length:7},()=>Array(24).fill(0)));

  useEffect(()=>{ (async ()=>{
    const snap = await getDocs(collection(db,'LostItems'));
    const m = Array.from({length:7},()=>Array(24).fill(0));
    snap.forEach(d=>{
      const ts = d.data()?.createdAt?.toDate?.();
      if (!ts) return;
      m[ts.getDay()][ts.getHours()]++;
    });
    setMatrix(m);
  })(); },[]);

  const flat = matrix.flat();
  const max = useMemo(()=>Math.max(1, ...flat), [flat]);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="glass glow-interactive rounded-2xl p-4">
      <div className="font-semibold mb-2">{t('charts.peakMap')}</div>

      {/* simple legend */}
      <div className="flex items-center gap-2 text-[10px] mb-1">
        <span className="h-3 w-8 rounded" style={{background:'rgba(99,102,241,0.15)'}}/>
        <span>{t('charts.low')}</span>
        <span className="h-3 w-8 rounded" style={{background:'rgba(99,102,241,0.85)'}}/>
        <span>{t('charts.high')}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(25, 1fr)' }}>
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={`h-${h}`} className="text-[10px] text-center">{h}</div>
        ))}
        {days.map((d, i) => (
          <Fragment key={`row-${d}`}>
            <div className="text-[10px]">{d}</div>
            {matrix[i].map((val, h) => {
              const alpha = 0.12 + 0.73 * (val / max); // better visual range
              return (
                <div
                  key={`cell-${i}-${h}`}
                  title={`${d} ${h}:00 – ${val}`}
                  style={{
                    background: `rgba(99,102,241,${alpha})`,
                    height: 18,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
