import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function TotalLostCard() {
  const { t } = useI18n();
  const [n, setN] = useState(0);

  useEffect(() => { (async () => {
    const snap = await getDocs(query(collection(db,'LostItems'), where('status','==','lost')));
    setN(snap.size);
  })(); }, []);

  return (
    <div className="glass rounded-2xl p-4 glow-interactive">
      <div className="text-sm text-slate-500">{t('dashboard.currentLost')}</div>
      <div className="text-2xl font-semibold">{n}</div>
    </div>
  );
}
