import React, { useState, useEffect } from 'react';
import LocationSelector from './LocationSelector';
import WeatherCharts from './WeatherCharts';
import AIForecast from './AIForecast';
import { Cloud, Zap, Percent, Activity, Loader2, Sparkles, Server, AlertTriangle } from 'lucide-react';

export default function WeatherDashboard() {
  const [lat, setLat] = useState(59.3293);
  const [lon, setLon] = useState(18.0686);
  const [locationName, setLocationName] = useState('Stockholm, Sweden');
  const [difficulty, setDifficulty] = useState('medium');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Cache seeding status
  const [seedingStatus, setSeedingStatus] = useState(null);

  const fetchWeatherData = async (latitude, longitude, diffLevel) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:8000/api/weather?lat=${latitude}&lon=${longitude}&difficulty=${diffLevel}`
      );
      if (!response.ok) {
        throw new Error('Failed to retrieve weather data from SMHI API.');
      }
      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeedingStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/cache-status?year=2024');
      if (response.ok) {
        const data = await response.json();
        setSeedingStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch cache status', e);
    }
  };

  // Initial load and on parameter change
  useEffect(() => {
    fetchWeatherData(lat, lon, difficulty);
  }, [lat, lon, difficulty]);

  // Poll cache seeding status if seeding is not completed
  useEffect(() => {
    fetchSeedingStatus();
    const interval = setInterval(() => {
      if (seedingStatus && seedingStatus.status !== 'COMPLETED' && seedingStatus.status !== 'FAILED') {
        fetchSeedingStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [seedingStatus?.status]);

  const handleLocationSelect = (latitude, longitude, name) => {
    setLat(latitude);
    setLon(longitude);
    setLocationName(name);
  };

  // Aggregate stats from data
  const cloudMonthly = weatherData?.cloud_cover?.monthly || [];
  const lightningMonthly = weatherData?.lightning?.monthly || [];
  
  const avgCloudCover = cloudMonthly.length 
    ? Math.round(cloudMonthly.reduce((acc, curr) => acc + curr.cloud_cover, 0) / cloudMonthly.length)
    : null;
    
  const maxCloudMonth = cloudMonthly.length
    ? cloudMonthly.reduce((prev, current) => (prev.cloud_cover > current.cloud_cover) ? prev : current)
    : null;
    
  const totalLightningStrikes = weatherData?.lightning?.yearly?.[0]?.count || 0;
  
  const maxLightningMonth = lightningMonthly.length
    ? lightningMonthly.reduce((prev, current) => (prev.probability > current.probability) ? prev : current)
    : null;

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* DB Seeding Progress Header */}
      {seedingStatus && seedingStatus.status === 'SEEDING' && (
        <div className="glass-panel flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-primary/20">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-primary animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-text-primary">Seeding Local Lightning Strike Database Cache...</p>
              <p className="text-[11px] text-text-secondary">Traversing SMHI archives. Count queries will improve in accuracy as database fills.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-1 md:flex-initial">
            <div className="bg-slate-900/60 w-full md:w-60 h-2.5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
                style={{ width: `${seedingStatus.progress}%`, backgroundColor: 'var(--primary)' }}
              />
            </div>
            <span className="text-xs font-bold text-text-primary min-w-[3rem] text-right">{seedingStatus.progress}%</span>
          </div>
        </div>
      )}

      {/* Main Dashboard Header */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Active Coordinates</span>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-display leading-[1.05] tracking-tight gradient-text">
          {locationName}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Latitude: <strong className="text-text-secondary font-semibold">{lat.toFixed(4)}</strong>
          <span className="mx-2 text-text-muted/50">•</span>
          Longitude: <strong className="text-text-secondary font-semibold">{lon.toFixed(4)}</strong>
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Cloud Cover Average Card */}
        <div className="glass-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Avg Cloud Cover
            </span>
            <span className="text-3xl font-extrabold font-display block">
              {avgCloudCover !== null ? `${avgCloudCover}%` : 'N/A'}
            </span>
            <span className="text-xs text-text-muted block mt-1">Yearly mean observations</span>
          </div>
          <div className="p-3.5 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
            <Cloud className="w-6 h-6" />
          </div>
        </div>

        {/* Peak Cloud Cover Month Card */}
        <div className="glass-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Peak Cloudiness
            </span>
            <span className="text-2xl font-bold font-display block">
              {maxCloudMonth ? MONTH_NAMES[maxCloudMonth.month - 1] : 'N/A'}
            </span>
            <span className="text-xs text-text-muted block mt-1">
              {maxCloudMonth ? `Avg: ${Math.round(maxCloudMonth.cloud_cover)}%` : 'No observations'}
            </span>
          </div>
          <div className="p-3.5 bg-accent/10 rounded-xl text-accent ring-1 ring-accent/20">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Total Lightning Strikes Card */}
        <div className="glass-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Lightning Strikes
            </span>
            <span className="text-3xl font-extrabold font-display block">
              {totalLightningStrikes}
            </span>
            <span className="text-xs text-text-muted block mt-1">
              Total strikes in {weatherData?.lightning?.radius_used_km}km radius (2024)
            </span>
          </div>
          <div className="p-3.5 bg-secondary/10 rounded-xl text-secondary ring-1 ring-secondary/20">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* Lightning Probability Peak Card */}
        <div className="glass-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Max Lightning Risk
            </span>
            <span className="text-2xl font-bold font-display block">
              {maxLightningMonth && maxLightningMonth.probability > 0
                ? `${MONTH_NAMES[maxLightningMonth.month - 1]}`
                : 'None'}
            </span>
            <span className="text-xs text-text-muted block mt-1">
              {maxLightningMonth && maxLightningMonth.probability > 0 
                ? `Probability: ${Math.round(maxLightningMonth.probability)}%` 
                : 'Zero lightning risk'}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 ring-1 ring-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Selector & Content */}
      <div className="dashboard-grid">
        {/* Left Side: Controls */}
        <LocationSelector
          onLocationSelect={handleLocationSelect}
          currentDifficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />

        {/* Right Side: Charts & AI insights */}
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="glass-panel flex flex-col items-center justify-center py-40 gap-4" style={{ minHeight: '400px' }}>
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm text-text-muted">Fetching and interpolating SMHI data files...</p>
            </div>
          ) : error ? (
            <div className="glass-panel flex flex-col items-center justify-center text-center gap-3">
              <span className="p-3 bg-red-500/10 rounded-full text-red-500 mb-2">
                <AlertTriangle className="w-8 h-8" />
              </span>
              <h3 className="text-lg font-bold">Failed to load weather stats</h3>
              <p className="text-sm text-text-secondary max-w-md">{error}</p>
              <button 
                className="btn btn-primary mt-4 text-xs" 
                onClick={() => fetchWeatherData(lat, lon, difficulty)}
              >
                Retry Request
              </button>
            </div>
          ) : (
            weatherData && (
              <>
                <WeatherCharts data={weatherData} />
                <AIForecast lat={lat} lon={lon} difficulty={difficulty} />
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
