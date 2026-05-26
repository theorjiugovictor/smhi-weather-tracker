import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Calendar, Layers, Clock, AlertTriangle } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TABS = [
  { id: 'monthly', label: 'Monthly', icon: Calendar },
  { id: 'daily', label: 'Daily', icon: Clock },
  { id: 'yearly', label: 'Yearly', icon: Layers },
];

export default function WeatherCharts({ data }) {
  const [activeTab, setActiveTab] = useState('monthly');

  if (!data) return null;
  const { cloud_cover, lightning } = data;

  const monthlyData = MONTH_NAMES.map((name, i) => {
    const m = i + 1;
    const cloud = cloud_cover?.monthly?.find(c => c.month === m);
    const light = lightning?.monthly?.find(l => l.month === m);
    return {
      name,
      'Cloud Cover (%)': cloud ? Math.round(cloud.cloud_cover) : 0,
      'Lightning Prob (%)': light ? Math.round(light.probability) : 0,
    };
  });

  const dailyData = (cloud_cover?.daily || []).map(c => ({
    date: c.date,
    'Cloud Cover (%)': Math.round(c.cloud_cover),
  })).sort((a, b) => a.date.localeCompare(b.date));

  const years = Array.from(new Set([
    ...(cloud_cover?.yearly?.map(c => c.year) || []),
    ...(lightning?.yearly?.map(l => l.year) || [])
  ])).sort();

  const yearlyData = years.map(year => ({
    year: year.toString(),
    'Avg Cloud (%)': cloud_cover?.yearly?.find(c => c.year === year)?.cloud_cover?.toFixed(0) || null,
    'Lightning Strikes': lightning?.yearly?.find(l => l.year === year)?.count || 0,
  }));

  return (
    <div className="glass-panel p-8 sm:p-10 flex flex-col gap-6">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-base font-semibold flex items-center gap-2.5">
          <Layers className="text-primary w-4.5 h-4.5" /> Weather Data
        </h2>
        <div className="flex bg-[#0a0e1a]/60 p-1 rounded-xl border border-white/[0.06]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === id
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              onClick={() => setActiveTab(id)}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated data warning */}
      {lightning?.is_simulated && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
          <AlertTriangle className="text-amber-400 w-4 h-4 flex-shrink-0" />
          <span className="text-[11px] text-amber-300/80">
            Lightning data is simulated while the database cache loads in background.
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="w-full h-[320px]">
        {activeTab === 'monthly' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" stroke="#6366f1" fontSize={10} unit="%" tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={10} unit="%" tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar yAxisId="right" dataKey="Lightning Prob (%)" fill="#a855f7" radius={[3, 3, 0, 0]} maxBarSize={24} opacity={0.7} />
              <Line yAxisId="left" type="monotone" dataKey="Cloud Cover (%)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#6366f1' }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'daily' && (
          dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={s => s.substring(5)} />
                <YAxis stroke="#64748b" fontSize={10} unit="%" tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Cloud Cover (%)" stroke="#22d3ee" strokeWidth={1.5} fill="url(#dailyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-text-muted">No daily data available.</div>
          )
        )}

        {activeTab === 'yearly' && (
          yearlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#34d399" fontSize={10} unit="%" tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar yAxisId="right" dataKey="Lightning Strikes" fill="#a855f7" radius={[3, 3, 0, 0]} maxBarSize={24} opacity={0.7} />
                <Line yAxisId="left" type="monotone" dataKey="Avg Cloud (%)" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#34d399' }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-text-muted">No yearly data.</div>
          )
        )}
      </div>

      {/* Footer metrics */}
      <div className="grid grid-cols-3 gap-6 border-t border-white/[0.06] pt-6 text-xs">
        <div>
          <span className="text-text-muted block mb-1">Radius</span>
          <span className="text-text-primary font-semibold">{lightning?.radius_used_km} km</span>
        </div>
        <div>
          <span className="text-text-muted block mb-1">Observations</span>
          <span className="text-text-primary font-semibold">{cloud_cover?.daily?.length || 0} days</span>
        </div>
        <div>
          <span className="text-text-muted block mb-1">Method</span>
          <span className="text-text-primary font-semibold capitalize">
            {data.difficulty === 'hard' ? 'IDW Interpolation' : 'Single Station'}
          </span>
        </div>
      </div>
    </div>
  );
}
