// src/components/dashboard/KpiCards.jsx
import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  CalendarIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function startOfYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function KpiCards({ uid, admin = false, children }) {
  const { t } = useI18n();
  const [kpi, setKpi] = useState({ day: 0, month: 0, year: 0, total: 0 });
  const [trends, setTrends] = useState({ dayTrend: 0, monthTrend: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const base = collection(db, 'Claim');
        const filter = (q) => (admin ? q : query(q, where('uid', '==', uid)));

        // Current period queries
        const todayQ = filter(query(base, where('createdAt', '>=', Timestamp.fromDate(startOfDay()))));
        const monthQ = filter(query(base, where('createdAt', '>=', Timestamp.fromDate(startOfMonth()))));
        const yearQ = filter(query(base, where('createdAt', '>=', Timestamp.fromDate(startOfYear()))));
        const totalQ = filter(query(base));

        // Previous period queries for trends
        const yesterdayQ = filter(
          query(
            base,
            where('createdAt', '>=', Timestamp.fromDate(startOfYesterday())),
            where('createdAt', '<', Timestamp.fromDate(startOfDay()))
          )
        );

        const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
        const lastMonthEnd = startOfMonth();
        const lastMonthQ = filter(
          query(
            base,
            where('createdAt', '>=', Timestamp.fromDate(lastMonthStart)),
            where('createdAt', '<', Timestamp.fromDate(lastMonthEnd))
          )
        );

        const [today, month, year, total, yesterday, lastMonth] = await Promise.all([
          getDocs(todayQ),
          getDocs(monthQ),
          getDocs(yearQ),
          getDocs(totalQ),
          getDocs(yesterdayQ),
          getDocs(lastMonthQ),
        ]);

        if (!alive) return;

        // Calculate trends
        const dayTrend = yesterday.size > 0 ? Math.round(((today.size - yesterday.size) / yesterday.size) * 100) : 0;
        const monthTrend = lastMonth.size > 0 ? Math.round(((month.size - lastMonth.size) / lastMonth.size) * 100) : 0;

        setKpi({ day: today.size, month: month.size, year: year.size, total: total.size });
        setTrends({ dayTrend, monthTrend });
        setLoading(false);
      } catch (e) {
        console.error('KPI query failed', e);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid, admin]);

  const KpiCard = ({ icon, title, value, trend, color = 'blue', delay = 0 }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-emerald-500 to-emerald-600',
      purple: 'from-purple-500 to-purple-600',
      amber: 'from-amber-500 to-amber-600',
    };

    return (
      <div
        className="glass-solid rounded-2xl p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-fadeIn"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
            {icon}
          </div>
          {trend !== undefined && trend !== 0 && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                trend > 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}
            >
              <ArrowTrendingUpIcon className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{title}</div>

        {loading ? (
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        ) : (
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        icon={<CalendarIcon className="w-5 h-5 text-white" />}
        title={t('dashboard.today', 'Today')}
        value={kpi.day}
        trend={trends.dayTrend}
        color="blue"
        delay={0}
      />
      <KpiCard
        icon={<CalendarDaysIcon className="w-5 h-5 text-white" />}
        title={t('dashboard.thisMonth', 'This Month')}
        value={kpi.month}
        trend={trends.monthTrend}
        color="green"
        delay={50}
      />
      <KpiCard
        icon={<SparklesIcon className="w-5 h-5 text-white" />}
        title={t('dashboard.thisYear', 'This Year')}
        value={kpi.year}
        color="purple"
        delay={100}
      />
      <KpiCard
        icon={<ChartBarIcon className="w-5 h-5 text-white" />}
        title={t('dashboard.total', 'All Time')}
        value={kpi.total}
        color="amber"
        delay={150}
      />

      {/* Extra KPI cards from parent */}
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="min-w-0 animate-fadeIn"
          style={{ animationDelay: `${200 + index * 50}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}