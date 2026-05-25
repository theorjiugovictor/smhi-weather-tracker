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
  Area,
  ScatterChart,
  Scatter
} from 'recharts';
import { Calendar, Layers, Clock, AlertTriangle } from 'lucide-react';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function WeatherCharts({ data }) {
  const [activeTab, setActiveTab] = useState('monthly');
  
  if (!data) return null;
  
  const { cloud_cover, lightning } = data;
  
  // Format monthly data for Recharts
  const monthlyData = MONTH_NAMES.map((name, index) => {
    const monthNum = index + 1;
    const cloudItem = cloud_cover?.monthly?.find(c => c.month === monthNum);
    const lightItem = lightning?.monthly?.find(l => l.month === monthNum);
    
    return {
      name,
      'Cloud Cover (%)': cloudItem ? Math.round(cloudItem.cloud_cover) : 0,
      'Lightning Strike Probability (%)': lightItem ? Math.round(lightItem.probability) : 0,
      'Strike Count': lightItem ? lightItem.count : 0
    };
  });

  // Format daily data
  const dailyData = cloud_cover?.daily?.map(c => {
    const matchingLight = lightning?.daily?.find(l => l.month === c.month && l.day === c.day);
    return {
      date: c.date,
      'Cloud Cover (%)': Math.round(c.cloud_cover),
      'Lightning Strikes': matchingLight ? matchingLight.count : 0
    };
  }) || [];

  // Sort daily data chronologically
  dailyData.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Format yearly data
  const years = Array.from(new Set([
    ...(cloud_cover?.yearly?.map(c => c.year) || []),
    ...(lightning?.yearly?.map(l => l.year) || [])
  ])).sort();

  const yearlyData = years.map(year => {
    const cloudItem = cloud_cover?.yearly?.find(c => c.year === year);
    const lightItem = lightning?.yearly?.find(l => l.year === year);
    
    return {
      year: year.toString(),
      'Avg Cloud Cover (%)': cloudItem ? Math.round(cloudItem.cloud_cover) : null,
      'Total Lightning Strikes': lightItem ? lightItem.count : 0
    };
  });

  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl mb-1 flex items-center gap-2">
            <Layers className="text-primary w-5 h-5" /> Weather Visualization
          </h2>
          <p className="text-sm text-text-secondary">Historical cloud cover and lightning statistics</p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
          <button
            className={`btn px-3 py-1.5 text-xs rounded-md ${activeTab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('monthly')}
            style={{ border: 'none' }}
          >
            <Calendar className="w-3.5 h-3.5" /> Monthly
          </button>
          <button
            className={`btn px-3 py-1.5 text-xs rounded-md ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('daily')}
            style={{ border: 'none', marginLeft: '0.25rem' }}
          >
            <Clock className="w-3.5 h-3.5" /> Daily
          </button>
          <button
            className={`btn px-3 py-1.5 text-xs rounded-md ${activeTab === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('yearly')}
            style={{ border: 'none', marginLeft: '0.25rem' }}
          >
            <Layers className="w-3.5 h-3.5" /> Yearly
          </button>
        </div>
      </div>

      {/* Seeding Warning banner */}
      {lightning?.is_simulated && (
        <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300">
            <strong>Database cache loading:</strong> SMHI lightning strike archives are being seeded in the background. The charts currently show simulated regional statistical data for lightning probabilities. This will automatically update when seeding completes.
          </div>
        </div>
      )}

      {/* Chart container */}
      <div style={{ width: '100%', height: '350px', position: 'relative' }}>
        {activeTab === 'monthly' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" stroke="var(--primary)" fontSize={11} unit="%" label={{ value: 'Cloud Cover (%)', angle: -90, position: 'insideLeft', style: { fill: 'var(--primary)', fontSize: 10 } }} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--secondary)" fontSize={11} unit="%" label={{ value: 'Lightning Probability (%)', angle: 90, position: 'insideRight', style: { fill: 'var(--secondary)', fontSize: 10 } }} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-popover)', borderColor: 'var(--border)' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="right" dataKey="Lightning Strike Probability (%)" fill="var(--secondary)" radius={[4, 4, 0, 0]} maxBarSize={30} opacity={0.8} />
              <Line yAxisId="left" type="monotone" dataKey="Cloud Cover (%)" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'daily' && (
          dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailyCloudGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={9} tickLine={false} tickFormatter={(str) => str.substring(5)} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-popover)', borderColor: 'var(--border)' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Cloud Cover (%)" stroke="var(--accent)" fillOpacity={1} fill="url(#dailyCloudGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-text-muted">
              No daily data available for this station.
            </div>
          )
        )}

        {activeTab === 'yearly' && (
          yearlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="var(--accent-green)" fontSize={11} unit="%" label={{ value: 'Avg Cloud Cover (%)', angle: -90, position: 'insideLeft', style: { fill: 'var(--accent-green)', fontSize: 10 } }} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--secondary)" fontSize={11} label={{ value: 'Lightning Strikes (Count)', angle: 90, position: 'insideRight', style: { fill: 'var(--secondary)', fontSize: 10 } }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-popover)', borderColor: 'var(--border)' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="right" dataKey="Total Lightning Strikes" fill="var(--secondary)" radius={[4, 4, 0, 0]} maxBarSize={30} opacity={0.8} />
                <Line yAxisId="left" type="monotone" dataKey="Avg Cloud Cover (%)" stroke="var(--accent-green)" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-text-muted">
              No yearly trends available.
            </div>
          )
        )}
      </div>

      {/* Metrics footnotes */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-white/5 pt-4 mt-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Search Radius</span>
          <p className="text-sm font-semibold text-text-primary">{lightning?.radius_used_km} km</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Total Observations</span>
          <p className="text-sm font-semibold text-text-primary">
            {cloud_cover?.daily?.length ? `${cloud_cover.daily.length} Days` : 'N/A'}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Analysis Method</span>
          <p className="text-sm font-semibold text-text-primary" style={{ textTransform: 'capitalize' }}>
            {data.difficulty === 'hard' ? 'Inverse Distance Weighting' : 'Single Station Lookup'}
          </p>
        </div>
      </div>
    </div>
  );
}
