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
    <div className="glass-panel p-8 sm:p-10 flex flex-col gap-7 h-fit animate-slide-in-left">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2.5 mb-1.5">
          <MapPin className="text-primary w-4.5 h-4.5" /> Location
        </h2>
        <p className="text-xs text-text-muted leading-relaxed">Search or select a Swedish city</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          className="form-input pr-12"
          placeholder="Search address…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors duration-200"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
        {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
      </form>

      {/* Difficulty */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold flex items-center gap-2 text-text-secondary">
          <Sliders className="w-3.5 h-3.5 text-secondary" /> Calculation Mode
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#0a0e1a]/60 rounded-xl border border-white/[0.06]">
          {DIFFICULTIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onDifficultyChange(id)}
              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                currentDifficulty === id
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-muted/80 leading-relaxed">
          {DIFFICULTIES.find(d => d.id === currentDifficulty)?.desc}
        </p>
      </div>

      {/* Presets */}
      <div>
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] block mb-3">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="btn btn-secondary text-xs py-2 px-4"
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
