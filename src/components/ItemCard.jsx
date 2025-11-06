// src/components/ItemCard.jsx
import { useState } from 'react';
import { useI18n } from '../i18n';
import { CubeIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function ItemCard({ item, onStart, disabled }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const boxId = item.boxId ?? item.box ?? '';
  const itemId = item.id ?? item.itemID ?? '';

  const createdAtStr =
    item.createdAt?.toDate?.()?.toLocaleString?.() ??
    (typeof item.createdAt === 'number'
      ? new Date(item.createdAt).toLocaleString()
      : '—');

  const image = !imageError && typeof item.imageUrl === 'string' && item.imageUrl.length > 0
    ? item.imageUrl
    : null;

  const startClaim = async () => {
    try {
      setLoading(true);
      await onStart?.(item);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || item.status !== 'lost' || !boxId || !itemId || disabled;

  return (
    <div className="glass-solid rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
      {/* Image */}
      <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800">
        {image ? (
          <img
            src={image}
            alt={itemId || 'item'}
            onError={() => setImageError(true)}
            className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-56 flex flex-col items-center justify-center text-slate-400">
            <CubeIcon className="w-16 h-16 mb-2" />
            <span className="text-sm">No photo available</span>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
            item.status === 'lost'
              ? 'bg-amber-100/90 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
              : 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
          }`}>
            {item.status || 'lost'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
            {item.title || itemId}
          </h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Box: <span className="font-semibold">{boxId || '—'}</span></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <ClockIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate text-xs">{createdAtStr}</span>
          </div>
        </div>

        <button
          disabled={isDisabled}
          onClick={startClaim}
          className="w-full mt-3 rounded-xl px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Loading...
            </span>
          ) : (
            t('lost.claim', 'Claim Item')
          )}
        </button>
      </div>
    </div>
  );
}