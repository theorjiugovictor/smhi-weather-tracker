import React from 'react';
import WeatherDashboard from './components/WeatherDashboard';
import { CloudLightning, Database } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="w-full mx-auto h-16 flex items-center justify-between" style={{ padding: '0 5vw' }}>
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
      <main className="flex-1 w-full mx-auto py-12" style={{ padding: '3rem 5vw' }}>
        <WeatherDashboard apiBase={API_BASE} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 text-center text-xs text-text-muted">
        <div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3" style={{ padding: '0 5vw' }}>
          <p>SMHI Weather & Lightning Tracker — Pairs Programming Demo</p>
          <p className="text-text-muted/60">
            Data: <a href="https://opendata.smhi.se/" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary transition-colors">SMHI Open Data Portal</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
