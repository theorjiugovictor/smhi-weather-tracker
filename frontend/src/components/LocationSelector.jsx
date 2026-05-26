import React, { useState } from 'react';
import { Search, MapPin, Sliders, Loader2 } from 'lucide-react';

const PRESETS = [
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686 },
  { name: 'Göteborg', lat: 57.7089, lon: 11.9746 },
  { name: 'Malmö', lat: 55.6050, lon: 13.0038 },
  { name: 'Kiruna', lat: 67.8558, lon: 20.2253 },
  { name: 'Visby', lat: 57.6348, lon: 18.2948 }
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', desc: 'Cached cities, 50 km radius' },
  { id: 'medium', label: 'Medium', desc: 'Nearest station, 25 km' },
  { id: 'hard', label: 'Hard', desc: 'IDW interpolation, 15 km' }
];

export default function LocationSelector({ apiBase, onLocationSelect, currentDifficulty, onDifficultyChange }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/api/geocode?address=${encodeURIComponent(address)}`);
      if (!response.ok) throw new Error('Address not found.');
      const data = await response.json();
      onLocationSelect(data.lat, data.lon, data.display_name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 flex flex-col gap-6 h-fit">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
          <MapPin className="text-primary w-4 h-4" /> Location
        </h2>
        <p className="text-xs text-text-muted">Search or select a Swedish city</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          className="form-input pr-10"
          placeholder="Search address…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
        {error && <p className="text-[11px] text-red-400 mt-1.5">{error}</p>}
      </form>

      {/* Difficulty */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-medium flex items-center gap-2 text-text-secondary">
          <Sliders className="w-3.5 h-3.5 text-secondary" /> Calculation Mode
        </label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/50 rounded-lg border border-white/[0.04]">
          {DIFFICULTIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onDifficultyChange(id)}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                currentDifficulty === id
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-text-muted">
          {DIFFICULTIES.find(d => d.id === currentDifficulty)?.desc}
        </p>
      </div>

      {/* Presets */}
      <div>
        <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-2">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="btn btn-secondary text-xs py-1.5 px-3"
              onClick={() => {
                setAddress(preset.name);
                onLocationSelect(preset.lat, preset.lon, preset.name);
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
