// src/pages/DashboardPage.jsx
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { 
  ChartBarIcon, 
  SparklesIcon, 
  UserGroupIcon,
  CubeIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

// KPI tiles
import KpiCards from '../components/dashboard/KpiCards';
import TotalLostCard from '../components/dashboard/TotalLostCard';
import OnlineUsersCard from '../components/dashboard/OnlineUsersCard';

// charts
import MonthlyLostChart from '../components/charts/MonthlyLostChart';
import MyYearLossesChart from '../components/charts/MyYearLossesChart';
import PeakHeatMap from '../components/charts/PeakHeatMap';
import DailyTrendSparkline from '../components/charts/DailyTrendSparkline';
import StatusBreakdownPie from '../components/charts/StatusBreakdownPie';
import HourlyActivityChart from '../components/charts/HourlyActivityChart';
import BoxLeaderboard from '../components/charts/BoxLeaderboard';
import OutcomeTrendChart from '../components/charts/OutcomeTrendChart';
import AvgTimeToClaimTrend from '../components/charts/AvgTimeToClaimTrend';

import PendingClaims from '../components/dashboard/PendingClaims';

function DashboardHeader({ isAdmin, userName }) {
  const { t } = useI18n();
  
  return (
    <div className="glass-gradient rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ChartBarIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t('dashboard.title', 'Analytics Dashboard')}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              {isAdmin 
                ? t('dashboard.adminView', 'Campus-wide insights and metrics')
                : t('dashboard.userView', `Your personal activity overview`)
              }
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
            <SparklesIcon className="w-5 h-5" />
            <span className="font-semibold">Admin Mode</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-3xl animate-pulse"></div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse"></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return <LoadingSkeleton />;
  if (!user) return null;

  const userName = user.displayName || user.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <DashboardHeader isAdmin={isAdmin} userName={userName} />

      {/* KPI Cards */}
      <div>
        <SectionHeader
          icon={<TrophyIcon className="w-5 h-5" />}
          title={t('dashboard.keyMetrics', 'Key Metrics')}
          subtitle={t('dashboard.keyMetricsSub', 'Overview of your activity')}
        />
        <KpiCards uid={user.uid} admin={isAdmin}>
          <TotalLostCard />
          {isAdmin && <OnlineUsersCard />}
        </KpiCards>
      </div>

      {isAdmin ? (
        // ================== ADMIN VIEW ==================
        <>
          {/* Overview Section */}
          <div>
            <SectionHeader
              icon={<ChartBarIcon className="w-5 h-5" />}
              title={t('dashboard.overview', 'Campus Overview')}
              subtitle={t('dashboard.overviewSub', 'System-wide analytics')}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MonthlyLostChart />
              </div>
              <StatusBreakdownPie />
            </div>
          </div>

          {/* Activity Patterns */}
          <div>
            <SectionHeader
              icon={<ClockIcon className="w-5 h-5" />}
              title={t('dashboard.activityPatterns', 'Activity Patterns')}
              subtitle={t('dashboard.activityPatternsSub', 'When items are lost and claimed')}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <DailyTrendSparkline uid={user.uid} days={30} />
              <div className="lg:col-span-2">
                <HourlyActivityChart days={30} />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <SectionHeader
              icon={<TrophyIcon className="w-5 h-5" />}
              title={t('dashboard.performance', 'Performance Metrics')}
              subtitle={t('dashboard.performanceSub', 'Trends and efficiency')}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MyYearLossesChart />
              </div>
              <BoxLeaderboard top={8} />
            </div>
          </div>

          {/* Outcomes & Efficiency */}
          <div>
            <SectionHeader
              icon={<CubeIcon className="w-5 h-5" />}
              title={t('dashboard.outcomes', 'Outcomes & Efficiency')}
              subtitle={t('dashboard.outcomesSub', 'Success rates and timing')}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <OutcomeTrendChart months={6} />
              </div>
              <AvgTimeToClaimTrend months={6} />
            </div>
          </div>

          {/* Heat Map */}
          <div>
            <SectionHeader
              icon={<SparklesIcon className="w-5 h-5" />}
              title={t('dashboard.heatmap', 'Activity Heatmap')}
              subtitle={t('dashboard.heatmapSub', 'Busiest times throughout the week')}
            />
            <PeakHeatMap />
          </div>

          {/* Pending Claims */}
          <div>
            <SectionHeader
              icon={<UserGroupIcon className="w-5 h-5" />}
              title={t('dashboard.pending', 'Pending Claims')}
              subtitle={t('dashboard.pendingSub', 'Active unlock sessions')}
            />
            <PendingClaims uid={user.uid} admin={isAdmin} />
          </div>
        </>
      ) : (
        // ================== USER VIEW ==================
        <>
          {/* My Activity */}
          <div>
            <SectionHeader
              icon={<ChartBarIcon className="w-5 h-5" />}
              title={t('dashboard.myActivity', 'My Activity')}
              subtitle={t('dashboard.myActivitySub', 'Your claim history')}
            />
            <div className="grid gap-6 md:grid-cols-2">
              <MonthlyLostChart />
              <MyYearLossesChart />
            </div>
          </div>

          {/* Campus Trends */}
          <div>
            <SectionHeader
              icon={<SparklesIcon className="w-5 h-5" />}
              title={t('dashboard.campusTrends', 'Campus Trends')}
              subtitle={t('dashboard.campusTrendsSub', 'When items are typically lost')}
            />
            <PeakHeatMap />
          </div>
        </>
      )}
    </div>
  );
}