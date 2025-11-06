// src/pages/HomePage.jsx
import { useI18n } from '../i18n';
import { useEffect, useState, useMemo } from 'react';
import { auth } from '../services/firebase';
import { getUserClaims } from '../services/user';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart
} from 'recharts';
import MonthlyLostChart from '../components/charts/MonthlyLostChart';
import MyYearLossesChart from '../components/charts/MyYearLossesChart';
import {
  SparklesIcon,
  CameraIcon,
  KeyIcon,
  CubeIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

// ============= UTILITY FUNCTIONS =============

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getTodayStats(claims) {
  const today = new Date().toISOString().slice(0, 10);
  return claims.filter(c => {
    const ts = typeof c.createdAt === 'number' ? c.createdAt : c.createdAt?.toMillis?.();
    const date = new Date(ts || Date.now()).toISOString().slice(0, 10);
    return date === today;
  }).length;
}

function getWeekStats(claims) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return claims.filter(c => {
    const ts = typeof c.createdAt === 'number' ? c.createdAt : c.createdAt?.toMillis?.();
    return ts >= weekAgo;
  }).length;
}

// ============= COMPONENTS =============

function HeroCard({ userName }) {
  const greeting = getGreeting();
  
  return (
    <div className="relative overflow-hidden glass-gradient rounded-3xl p-8 shadow-2xl">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-bounce">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {greeting}{userName ? `, ${userName}` : ''}!
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Welcome back to ItemCloud
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              System Online
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <ClockIcon className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="glass-solid rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{trend}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function ActivityChart({ data }) {
  const { t } = useI18n();

  if (!data || data.length === 0) {
    return (
      <div className="glass-solid rounded-2xl p-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6" />
          {t('home.recentActivity', 'Your Recent Activity')}
        </h3>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <ChartBarIcon className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-center">
            {t('home.noRecent', 'No activity yet. Start claiming items!')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-solid rounded-2xl p-6">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <ChartBarIcon className="w-6 h-6" />
        {t('home.recentActivity', 'Your Recent Activity')}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: 'none', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorActivity)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProcessCard({ icon, title, description, delay = 0 }) {
  return (
    <div 
      className="glass-solid rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r ${colorClasses[color]} text-white font-semibold transition-all hover:scale-105 shadow-lg`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============= MAIN COMPONENT =============

export default function HomePage() {
  const { t } = useI18n();
  const [claims, setClaims] = useState([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setClaims([]);
        setUserName('');
        setLoading(false);
        return;
      }

      setUserName(u.displayName || u.email?.split('@')[0] || '');

      const userClaims = await getUserClaims(u.uid);
      setClaims(userClaims);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Process activity data
  const activityData = useMemo(() => {
    if (claims.length === 0) return [];

    const perDay = {};
    for (const c of claims) {
      const ts = typeof c.createdAt === 'number' ? c.createdAt : c.createdAt?.toMillis?.();
      const d = new Date(ts || Date.now()).toISOString().slice(0, 10);
      perDay[d] = (perDay[d] || 0) + 1;
    }

    return Object.entries(perDay)
      .sort()
      .slice(-14) // Last 14 days
      .map(([date, count]) => ({ date, count }));
  }, [claims]);

  // Stats
  const stats = useMemo(() => ({
    total: claims.length,
    today: getTodayStats(claims),
    week: getWeekStats(claims),
  }), [claims]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <HeroCard userName={userName} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<CubeIcon className="w-6 h-6 text-white" />}
          label="Total Claims"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<ClockIcon className="w-6 h-6 text-white" />}
          label="Claims Today"
          value={stats.today}
          trend={stats.today > 0 ? '+' + stats.today : null}
          color="green"
        />
        <StatCard
          icon={<CheckCircleIcon className="w-6 h-6 text-white" />}
          label="This Week"
          value={stats.week}
          color="purple"
        />
      </div>

      {/* Activity Chart */}
      <ActivityChart data={activityData} />

      {/* Analytics Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <MonthlyLostChart />
        <MyYearLossesChart />
      </div>

      {/* How It Works Section */}
      <div className="glass-solid rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <SparklesIcon className="w-7 h-7" />
          How ItemCloud Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <ProcessCard
            icon={<CameraIcon className="w-7 h-7 text-white" />}
            title={t('process.detect', '1. Detect')}
            description={t('process.detectDesc', 'ESP32-CAM automatically captures and uploads photos of lost items to the cloud in real-time.')}
            delay={0}
          />
          <ProcessCard
            icon={<KeyIcon className="w-7 h-7 text-white" />}
            title={t('process.claim', '2. Claim')}
            description={t('process.claimDesc', 'Request a secure unlock code with 5-minute validity. Enter the code on the keypad or scan the QR.')}
            delay={100}
          />
          <ProcessCard
            icon={<CheckCircleIcon className="w-7 h-7 text-white" />}
            title={t('process.retrieve', '3. Retrieve')}
            description={t('process.retrieveDesc', 'The box automatically unlocks when you enter the correct code, giving you access to your item.')}
            delay={200}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-solid rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            icon={<CubeIcon className="w-5 h-5" />}
            label="View Lost Items"
            onClick={() => window.location.href = '/lost'}
            color="blue"
          />
          <QuickAction
            icon={<ClockIcon className="w-5 h-5" />}
            label="Claim History"
            onClick={() => window.location.href = '/claims'}
            color="green"
          />
          <QuickAction
            icon={<ChartBarIcon className="w-5 h-5" />}
            label="Dashboard"
            onClick={() => window.location.href = '/dashboard'}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}