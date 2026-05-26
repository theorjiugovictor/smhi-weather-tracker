import React, { useState } from 'react';
import { Search, MapPin, Sliders, HelpCircle, Loader2 } from 'lucide-react';

export default function LocationSelector({ onLocationSelect, currentDifficulty, onDifficultyChange }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const presets = [
    { name: 'Stockholm', lat: 59.3293, lon: 18.0686 },
    { name: 'Göteborg', lat: 57.7089, lon: 11.9746 },
    { name: 'Malmö', lat: 55.6050, lon: 13.0038 },
    { name: 'Kiruna', lat: 67.8558, lon: 20.2253 },
    { name: 'Visby', lat: 57.6348, lon: 18.2948 }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Fetch from our FastAPI backend
      const response = await fetch(`http://localhost:8000/api/geocode?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        throw new Error('Address not found. Please try a different location or check spelling.');
      }

      const data = await response.json();
      onLocationSelect(data.lat, data.lon, data.display_name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (preset) => {
    setAddress(preset.name);
    onLocationSelect(preset.lat, preset.lon, preset.name);
  };

  return (
    <div className="glass-panel flex flex-col gap-7" style={{ height: 'fit-content' }}>
      <div>
        <h2 className="text-xl mb-1 flex items-center gap-2">
          <MapPin className="text-primary w-5 h-5" /> Location Selection
        </h2>
        <p className="text-sm text-text-secondary">Enter an address or search within Sweden</p>
      </div>

      {/* Geocoding Search Form */}
      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search address (e.g. Stockholm, Kiruna...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </form>

      {/* Level of Difficulty Selection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-secondary" /> Calculation Difficulty
          </label>
          <div style={{ position: 'relative' }}>
            <HelpCircle
              className="w-4 h-4 text-text-muted cursor-pointer hover:text-text-primary"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
            />
            {showTooltip && (
              <div
                className="text-xs text-text-secondary"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '1.5rem',
                  zIndex: 50,
                  width: '280px',
                  padding: '1.25rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 'var(--radius-md)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <p className="font-bold text-text-primary mb-2 text-sm">Level of Difficulty Effects:</p>
                <ul className="flex flex-col gap-2">
                  <li>
                    <strong className="text-primary">Easy Mode:</strong> Uses pre-mapped weather stations for major Swedish cities with instant caching. Lightning strikes counted in a 50 km radius.
                  </li>
                  <li>
                    <strong className="text-secondary">Medium Mode:</strong> Finds the single nearest active SMHI weather station and fetches its CSV logs dynamically. Lightning strikes calculated within a 25 km radius.
                  </li>
                  <li>
                    <strong className="text-accent">Hard Mode:</strong> Fetches historical logs from the 3 nearest stations, computes **Inverse Distance Weighting (IDW) spatial interpolation** for cloud cover, and calculates lightning strikes within a 15 km radius.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Segmented control tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.25rem',
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}
        >
          {['easy', 'medium', 'hard'].map((level) => (
            <button
              key={level}
              type="button"
              className="btn"
              onClick={() => onDifficultyChange(level)}
              style={{
                padding: '0.4rem 0',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'capitalize',
                background: currentDifficulty === level ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'transparent',
                color: currentDifficulty === level ? '#fff' : 'var(--text-secondary)',
                boxShadow: currentDifficulty === level ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none',
                border: 'none'
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Quick select buttons */}
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-3">
          Swedish City Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              className="btn btn-secondary"
              onClick={() => handlePresetSelect(preset)}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-md)'
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
