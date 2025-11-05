import { useAuth } from '../hooks/useAuth';

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

export default function DashboardPage() {
  const { user, isAdmin, loading } = useAuth();   // ← use isAdmin from hook
  if (loading) return null;                       // optional skeleton
  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <KpiCards uid={user.uid}>
        <TotalLostCard />
        {isAdmin && <OnlineUsersCard />}
      </KpiCards>

      {isAdmin ? (
        // ================== ADMIN VIEW ==================
        <div className="grid gap-4 xl:grid-cols-3 auto-rows-[minmax(280px,auto)]">
          <div className="xl:col-span-2"><MonthlyLostChart /></div>
          <div><StatusBreakdownPie /></div>

          <div><DailyTrendSparkline uid={user.uid} /></div>
          <div className="xl:col-span-2"><HourlyActivityChart /></div>

          <div className="xl:col-span-2"><MyYearLossesChart /></div>
          <div><BoxLeaderboard /></div>

          <div className="xl:col-span-2"><OutcomeTrendChart /></div>
          <div><AvgTimeToClaimTrend /></div>

          <div className="xl:col-span-3"><PeakHeatMap /></div>
        </div>
      ) : (
        // ================== USER VIEW ==================
        <div className="grid gap-4">
          <MonthlyLostChart />
          <MyYearLossesChart />
          <PeakHeatMap />
        </div>
      )}

      {isAdmin && <PendingClaims uid={user.uid} />}
    </div>
  );
}
