import React from 'react';
import WeatherDashboard from './components/WeatherDashboard';
import { CloudLightning, Database } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
              <CloudLightning className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold font-display tracking-tight text-text-primary">
                SMHI Weather Tracker
              </span>
              <span className="text-[10px] text-text-muted font-medium block">
                Climatology Engine
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <Database className="w-3 h-3 text-accent-green" />
              <span>SMHI Open Data</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-8 py-8">
        <WeatherDashboard apiBase={API_BASE} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 text-center text-xs text-text-muted">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>SMHI Weather & Lightning Tracker — Pairs Programming Demo</p>
          <p className="text-text-muted/60">
            Data: <a href="https://opendata.smhi.se/" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary transition-colors">SMHI Open Data Portal</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
