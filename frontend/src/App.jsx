import React from 'react';
import WeatherDashboard from './components/WeatherDashboard';
import { CloudLightning, Database } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="w-full mx-auto h-18 flex items-center justify-between" style={{ padding: '1.25rem 5vw' }}>
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-primary via-secondary to-accent rounded-xl shadow-lg shadow-primary/20 animate-float">
              <CloudLightning className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-base font-bold font-display tracking-tight gradient-text">
                SMHI Weather Tracker
              </span>
              <span className="text-[11px] text-text-muted font-medium block mt-0.5">
                Climatology Engine v2.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-green/5 border border-accent-green/20">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-accent-green font-medium">Live Data</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span>SMHI Open Data</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full mx-auto" style={{ padding: '3.5rem 5vw' }}>
        <WeatherDashboard apiBase={API_BASE} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-text-muted">
        <div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4" style={{ padding: '0 5vw' }}>
          <p className="text-text-muted/80">SMHI Weather & Lightning Tracker — Pairs Programming Demo</p>
          <p className="text-text-muted/60">
            Data: <a href="https://opendata.smhi.se/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-secondary transition-colors duration-300">SMHI Open Data Portal</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
