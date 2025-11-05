import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../services/firebase';

export default function OnlineUsersCard() {
  const { t } = useI18n();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const r = ref(rtdb, 'status');
    const h = onValue(r, (s) => {
      const v = s.val() || {};
      setCount(Object.values(v).filter(x => x?.state === 'online').length);
    });
    return () => off(r, 'value', h);
  }, []);

  return (
    <div className="glass rounded-2xl p-4  glow-interactive">
      <div className="text-sm text-slate-500">{t('dashboard.onlineUsers')}</div>
      <div className="text-2xl font-semibold">{count}</div>
    </div>
  );
}
