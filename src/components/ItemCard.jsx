import { useState } from 'react';
import { useI18n } from '../i18n';

export default function ItemCard({ item, onStart }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  // Your docs use "box" and often "itemID" equals the doc id
  const boxId = item.boxId ?? item.box ?? '';
  const itemId = item.id ?? item.itemID ?? '';

  const createdAtStr =
    item.createdAt?.toDate?.()?.toLocaleString?.() ??
    (typeof item.createdAt === 'number'
      ? new Date(item.createdAt).toLocaleString()
      : '—');

  const image =
    typeof item.imageUrl === 'string' && item.imageUrl.length > 0
      ? item.imageUrl
      : null;

  const startClaim = async () => {
    try {
      setLoading(true);
      onStart?.(item);       // ✅ let the page drive the single request
    } finally {
      setLoading(false);
    }
  };

  // Only allow claiming when item is still 'lost' and we know the box
  const disabled = loading || item.status !== 'lost' || !boxId || !itemId;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {image ? (
        <img
          src={image}
          alt={itemId || 'item'}
          className="w-full h-56 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-56 bg-slate-200 dark:bg-slate-800
                        flex items-center justify-center text-slate-500">
          No photo
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{item.title || itemId}</div>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
            {item.status || 'lost'}
          </span>
        </div>

        <div className="text-sm text-slate-500">
          Box: {boxId || '—'} • {createdAtStr}
        </div>

        <button
          disabled={disabled}
          onClick={startClaim}
          className="w-full mt-2 rounded-xl px-3 py-2 btn-primary glow-interactive disabled:opacity-60"
        >
          {loading ? t('common.loading', 'Loading…') : t('lost.claim')}
        </button>
      </div>
    </div>
  );
}
