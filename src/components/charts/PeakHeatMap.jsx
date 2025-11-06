// src/components/charts/PeakHeatMap.jsx
import { Fragment, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useI18n } from '../../i18n';
import { FireIcon } from '@heroicons/react/24/solid';

function getRecentDate(daysAgo = 90) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PeakHeatmap() {
  const { t } = useI18n();
  const [matrix, setMatrix] = useState(() => Array.from({ length: 7 }, () => Array(24).fill(0)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const since = getRecentDate(90);
        const snap = await getDocs(
          query(
            collection(db, 'LostItems'),
            where('createdAt', '>=', Timestamp.fromDate(since))
          )
        );

        const m = Array.from({ length: 7 }, () => Array(24).fill(0));
        snap.forEach(d => {
          const ts = d.data()?.createdAt?.toDate?.();
          if (!ts) return;
          m[ts.getDay()][ts.getHours()]++;
        });
        setMatrix(m);
      } catch (error) {
        console.error('Error loading heatmap:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const flat = matrix.flat();
  const max = useMemo(() => Math.max(1, ...flat), [flat]);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getColor = (val) => {
    if (val === 0) return 'rgba(203, 213, 225, 0.3)';
    const ratio = val / max;
    if (ratio < 0.25) return 'rgba(59, 130, 246, 0.3)';
    if (ratio < 0.5) return 'rgba(59, 130, 246, 0.5)';
    if (ratio < 0.75) return 'rgba(59, 130, 246, 0.7)';
    return 'rgba(59, 130, 246, 0.95)';
  };

  const getHotspot = () => {
    let maxVal = 0;
    let hotDay = 0;
    let hotHour = 0;
    matrix.forEach((row, day) => {
      row.forEach((val, hour) => {
        if (val > maxVal) {
          maxVal = val;
          hotDay = day;
          hotHour = hour;
        }
      });
    });
    return { day: days[hotDay], hour: hotHour, count: maxVal };
  };

  const hotspot = useMemo(() => getHotspot(), [matrix]);

  if (loading) {
    return (
      <div className="glass-solid rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="glass-solid rounded-2xl p-6 hover:shadow-xl transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <FireIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('charts.peakMap', 'Activity Heatmap')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last 90 days</p>
          </div>
        </div>

        {hotspot.count > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
            <FireIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-orange-900 dark:text-orange-300">
                Peak: {hotspot.day} at {hotspot.hour}:00
              </span>
              <span className="text-orange-600 dark:text-orange-400 ml-2">
                ({hotspot.count} items)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Intensity:</span>
        <div className="flex items-center gap-2">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className="w-6 h-3 rounded"
                style={{ backgroundColor: getColor(ratio * max) }}
              />
              {i === 0 && <span className="text-xs text-slate-500">Low</span>}
              {i === 4 && <span className="text-xs text-slate-500">High</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Grid - Responsive without scrolling */}
      <div className="w-full">
        <div className="grid gap-0.5 sm:gap-1" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))' }}>
          {/* Header: Hours */}
          <div className="w-16 sm:w-20"></div>
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={`h-${h}`}
              className="text-[9px] sm:text-xs text-center text-slate-600 dark:text-slate-400 font-medium"
            >
              {h}
            </div>
          ))}

          {/* Rows: Days */}
          {days.map((day, i) => (
            <Fragment key={`row-${day}`}>
              <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-end pr-2 w-16 sm:w-20">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{shortDays[i]}</span>
              </div>
              {matrix[i].map((val, h) => (
                <div
                  key={`cell-${i}-${h}`}
                  title={`${day}, ${h}:00 - ${val} ${val === 1 ? 'item' : 'items'}`}
                  className="group relative cursor-pointer transition-all hover:scale-110 hover:z-10 rounded aspect-square"
                  style={{
                    backgroundColor: getColor(val),
                    border: val > 0 ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(203, 213, 225, 0.3)',
                  }}
                >
                  {/* Tooltip on hover - only on desktop */}
                  <div className="hidden lg:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl">
                    <div className="font-semibold">{day}, {h}:00</div>
                    <div>{val} {val === 1 ? 'item' : 'items'}</div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Statistics Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-600 dark:text-slate-400">Total Items</span>
            <div className="font-bold text-slate-900 dark:text-white">{flat.reduce((a, b) => a + b, 0)}</div>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Peak Hour</span>
            <div className="font-bold text-slate-900 dark:text-white">{hotspot.hour}:00</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-600 dark:text-slate-400">Peak Day</span>
            <div className="font-bold text-slate-900 dark:text-white">{hotspot.day}</div>
          </div>
        </div>
      </div>
    </div>
  );
}