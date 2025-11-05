import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../services/firebase';

export default function PendingClaims({ admin=false, uid }) {
  const { t } = useI18n();
  const [list, setList] = useState([]);

  useEffect(() => {
    const r = ref(rtdb, 'UnlockCodes');
    const h = onValue(r, s => {
      const v = s.val() || {};
      const rows = Object.entries(v)
        .map(([boxId, x]) => ({ boxId, ...x }))
        .filter(x => x?.status === 'pending' && (admin || x?.uid === uid));
      setList(rows);
    });
    return () => off(r, 'value', h);
  }, [admin, uid]);

  if (!list.length) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="font-semibold mb-2">
        {t('dashboard.pending', { defaultValue: 'Pending claims' })}
      </div>
      <ul className="space-y-2">
        {list.map(r => (
          <li key={r.boxId} className="text-sm">
            {t('common.box', { defaultValue: 'Box' })} <b>{r.boxId}</b> •
            {' '}{t('common.item', { defaultValue: 'Item' })} <b>{r.itemID}</b> •
            {' '}{t('common.expires', { defaultValue: 'expires' })} {new Date(r.expiredAtMs).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
