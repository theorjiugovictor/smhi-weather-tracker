import React from 'react';
import WeatherDashboard from './components/WeatherDashboard';
import { CloudLightning, Info } from 'lucide-react';

// Shared horizontal padding for the page rails — uses clamp() so the gutter
// scales smoothly with viewport width and never crowds the screen edges.
const RAIL = 'px-[clamp(2rem,5vw,5rem)]';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header navbar */}
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-40">
        <div className={`${RAIL} h-20 flex items-center justify-between`} style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-primary to-secondary rounded-xl text-white shadow-lg shadow-primary/30 animate-float">
              <CloudLightning className="w-5 h-5" />
            </span>
            <div className="leading-tight">
              <span className="text-sm font-extrabold font-display tracking-[0.08em] gradient-text">
                SMHI WEATHER TRACKER
              </span>
              <span className="text-[10px] text-accent font-bold block tracking-[0.2em]">CLIMATOLOGY ENGINE</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" /> Data Source: SMHI Open Data API
            </span>
          </div>
        </div>
      </header>

      {/* Main body */}
      <main className={`flex-1 w-full ${RAIL} py-10`} style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <WeatherDashboard />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/40 py-8 text-center text-xs text-text-muted mt-6">
        <div className={`${RAIL} flex flex-col sm:flex-row items-center justify-between gap-4`} style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <p>© {new Date().getFullYear()} SMHI Weather & Lightning Tracker. Created for pairs-programming demo.</p>
          <p>
            Powered by <a href="https://opendata.smhi.se/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SMHI Open Data Portal</a> & Google Gemini
          </p>
        </div>
      </footer>
    </div>
  );
}
