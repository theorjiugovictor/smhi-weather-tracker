import React, { useState, useEffect } from 'react';
import LocationSelector from './LocationSelector';
import WeatherCharts from './WeatherCharts';
import AIForecast from './AIForecast';
import { Cloud, Zap, TrendingUp, Activity, Loader2, AlertTriangle, Server } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function WeatherDashboard({ apiBase }) {
  const [lat, setLat] = useState(59.3293);
  const [lon, setLon] = useState(18.0686);
  const [locationName, setLocationName] = useState('Stockholm, Sweden');
  const [difficulty, setDifficulty] = useState('medium');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seedingStatus, setSeedingStatus] = useState(null);

  const fetchWeatherData = async (latitude, longitude, diffLevel) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${apiBase}/api/weather?lat=${latitude}&lon=${longitude}&difficulty=${diffLevel}`
      );
      if (!response.ok) throw new Error('Failed to retrieve weather data.');
      setWeatherData(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeedingStatus = async () => {
    try {
      const response = await fetch(`${apiBase}/api/cache-status?year=2024`);
      if (response.ok) setSeedingStatus(await response.json());
    } catch (_) {}
  };

  useEffect(() => {
    fetchWeatherData(lat, lon, difficulty);
  }, [lat, lon, difficulty]);

  useEffect(() => {
    fetchSeedingStatus();
    const interval = setInterval(() => {
      if (!seedingStatus || (seedingStatus.status !== 'COMPLETED' && seedingStatus.status !== 'FAILED')) {
        fetchSeedingStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLocationSelect = (latitude, longitude, name) => {
    setLat(latitude);
    setLon(longitude);
    setLocationName(name);
  };

  const cloudMonthly = weatherData?.cloud_cover?.monthly || [];
  const lightningMonthly = weatherData?.lightning?.monthly || [];

  const avgCloudCover = cloudMonthly.length
    ? Math.round(cloudMonthly.reduce((acc, curr) => acc + curr.cloud_cover, 0) / cloudMonthly.length)
    : null;

  const maxCloudMonth = cloudMonthly.length
    ? cloudMonthly.reduce((prev, curr) => (prev.cloud_cover > curr.cloud_cover ? prev : curr))
    : null;

  const totalLightningStrikes = weatherData?.lightning?.yearly?.[0]?.count || 0;

  const maxLightningMonth = lightningMonthly.length
    ? lightningMonthly.reduce((prev, curr) => (prev.probability > curr.probability ? prev : curr))
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Seeding Progress */}
      {seedingStatus && seedingStatus.status === 'SEEDING' && (
        <div className="glass-panel p-4 flex items-center gap-4">
          <Server className="w-4 h-4 text-primary status-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">Caching lightning strike archives…</p>
            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-700"
                style={{ width: `${seedingStatus.progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-text-secondary tabular-nums">
            {Math.round(seedingStatus.progress)}%
          </span>
        </div>
      )}

      {/* Location Header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Active Location</p>
        <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-primary">
          {locationName}
        </h1>
        <p className="text-sm text-text-muted mt-1 tabular-nums">
          {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Avg Cloud Cover"
          value={avgCloudCover !== null ? `${avgCloudCover}%` : '—'}
          sub="Yearly mean"
          icon={<Cloud className="w-5 h-5" />}
          color="primary"
        />
        <MetricCard
          label="Peak Cloudiness"
          value={maxCloudMonth ? MONTH_NAMES[maxCloudMonth.month - 1] : '—'}
          sub={maxCloudMonth ? `${Math.round(maxCloudMonth.cloud_cover)}% avg` : ''}
          icon={<TrendingUp className="w-5 h-5" />}
          color="accent"
        />
        <MetricCard
          label="Lightning Strikes"
          value={totalLightningStrikes.toLocaleString()}
          sub={`${weatherData?.lightning?.radius_used_km || '—'} km radius`}
          icon={<Zap className="w-5 h-5" />}
          color="secondary"
        />
        <MetricCard
          label="Peak Lightning"
          value={maxLightningMonth?.probability > 0 ? MONTH_NAMES[maxLightningMonth.month - 1] : 'None'}
          sub={maxLightningMonth?.probability > 0 ? `${Math.round(maxLightningMonth.probability)}% prob` : 'Zero risk'}
          icon={<Activity className="w-5 h-5" />}
          color="accent-green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        <LocationSelector
          apiBase={apiBase}
          onLocationSelect={handleLocationSelect}
          currentDifficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />

        <div className="flex flex-col gap-5">
          {loading ? (
            <div className="glass-panel flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-text-muted">Fetching SMHI data…</p>
              </div>
            </div>
          ) : error ? (
            <div className="glass-panel p-8 flex flex-col items-center text-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-text-secondary">{error}</p>
              <button className="btn btn-primary text-xs mt-2" onClick={() => fetchWeatherData(lat, lon, difficulty)}>
                Retry
              </button>
            </div>
          ) : weatherData && (
            <>
              <WeatherCharts data={weatherData} />
              <AIForecast apiBase={apiBase} lat={lat} lon={lon} difficulty={difficulty} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, color }) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 ring-primary/20',
    secondary: 'text-secondary bg-secondary/10 ring-secondary/20',
    accent: 'text-accent bg-accent/10 ring-accent/20',
    'accent-green': 'text-accent-green bg-accent-green/10 ring-accent-green/20',
  };
  const cls = colorMap[color] || colorMap.primary;

  return (
    <div className="glass-card flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1">{label}</span>
        <span className="text-xl font-bold font-display block truncate">{value}</span>
        {sub && <span className="text-[11px] text-text-muted block mt-0.5">{sub}</span>}
      </div>
      <div className={`p-2.5 rounded-lg ring-1 flex-shrink-0 ${cls}`}>
        {icon}
      </div>
    </div>
  );
}
