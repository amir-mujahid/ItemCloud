// src/pages/HomePage.jsx
import { useI18n } from '../i18n';
import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { getUserClaims } from '../services/user';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import MonthlyLostChart from '../components/charts/MonthlyLostChart';
import MyYearLossesChart from '../components/charts/MyYearLossesChart';

export default function HomePage() {
  const { t } = useI18n();
  const [data, setData] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { setData([]); return; }
      const claims = await getUserClaims(u.uid);
      const perDay = {};
      for (const c of claims) {
        const ts = typeof c.createdAt === 'number' ? c.createdAt : c.createdAt?.toMillis?.();
        const d = new Date(ts || Date.now()).toISOString().slice(0, 10);
        perDay[d] = (perDay[d] || 0) + 1;
      }
      setData(Object.entries(perDay).sort().map(([date, count]) => ({ date, count })));
    });
    return unsub;
  }, []);

  const hasData = data.length > 0;

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-8 shadow-glow">
        <h1 className="text-3xl font-semibold">{t('home.welcome')}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{t('tagline')}</p>
      </div>

      {/* Mini dashboard strip — compact when empty */}
      <div className={`glass glow-interactive rounded-2xl ${hasData ? 'p-6' : 'p-4'}`}>
        <h3 className={`font-semibold ${hasData ? 'mb-3' : 'mb-2'}`}>
          {t('home.recentActivity', t('home.recent', 'Your recent activity'))}
        </h3>

        {!hasData ? (
          // small, no fixed height
          <div className="text-slate-500 text-sm py-2">
            {t('home.noRecent', 'No recent activity')}
          </div>
        ) : (
          // tall only when we actually render a chart
          <div className="h-44 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Analytics grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <MonthlyLostChart title={t('charts.campusLostPerMonth', 'Campus: Lost items per month')} />
        <MyYearLossesChart title={t('charts.myClaimsByMonth', 'My claims this year (by month)')} />
      </div>

      {/* Process cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass glow-interactive rounded-2xl p-6">
          <h3 className="font-semibold">{t('process.detect', 'Detect')}</h3>
          <p className="text-sm mt-1">{t('process.detectDesc', 'ESP32-CAM uploads item photo to the cloud.')}</p>
        </div>
        <div className="glass glow-interactive rounded-2xl p-6">
          <h3 className="font-semibold">{t('process.claim', 'Claim')}</h3>
          <p className="text-sm mt-1">{t('process.claimDesc', 'Request an unlock code, 5-minute validity.')}</p>
        </div>
        <div className="glass glow-interactive rounded-2xl p-6">
          <h3 className="font-semibold">{t('process.retrieve', 'Retrieve')}</h3>
          <p className="text-sm mt-1">{t('process.retrieveDesc', 'Enter code on keypad; box unlocks if valid.')}</p>
        </div>
      </div>
    </div>
  );
}
