import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Bot, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Minimal Markdown renderer for the AI narrative (headings, bold, bullet lists)
function renderInline(text) {
  // Handle **bold** and *italic*
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={key++} className="text-text-primary font-semibold">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-slate-800/70 text-accent text-[0.85em]">{token.slice(1, -1)}</code>);
    } else {
      parts.push(<em key={key++} className="text-text-primary/90">{token.slice(1, -1)}</em>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownNarrative({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let listBuffer = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul key={`ul-${key++}`} className="flex flex-col gap-2 pl-5 list-disc marker:text-primary">
          {listBuffer.map((item, i) => (
            <li key={i} className="text-text-secondary leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }

    if (/^#{1,6}\s/.test(line)) {
      flushList();
      const level = line.match(/^#+/)[0].length;
      const content = line.replace(/^#+\s+/, '');
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-base', 'text-sm', 'text-sm'];
      blocks.push(
        <h4
          key={`h-${key++}`}
          className={`font-display font-bold text-text-primary tracking-tight ${sizes[level - 1] || 'text-base'} mt-1`}
        >
          {renderInline(content)}
        </h4>
      );
    } else if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ''));
    } else {
      flushList();
      blocks.push(
        <p key={`p-${key++}`} className="text-text-secondary leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return <div className="flex flex-col gap-3">{blocks}</div>;
}

export default function AIForecast({ lat, lon, difficulty }) {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState('');

  const fetchForecast = async () => {
    setLoading(true);
    setError('');
    setForecast(null);
    try {
      const response = await fetch(
        `http://localhost:8000/api/forecast?lat=${lat}&lon=${lon}&difficulty=${difficulty}`
      );
      if (!response.ok) {
        throw new Error('Failed to retrieve forecast. Make sure backend is running.');
      }
      const data = await response.json();
      setForecast(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch forecast when coordinates or difficulty changes
  useEffect(() => {
    if (lat && lon) {
      fetchForecast();
    }
  }, [lat, lon, difficulty]);

  const formattedChartData = forecast?.forecast?.map(item => ({
    name: MONTH_NAMES[item.month - 1],
    'Predicted Cloud (%)': Math.round(item.cloud_cover),
    'Predicted Lightning Prob (%)': Math.round(item.lightning_probability)
  })) || [];

  return (
    <div className="glass-panel flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl mb-1 flex items-center gap-2">
            <Sparkles className="text-secondary w-5 h-5" /> AI Climatology Forecast
          </h2>
          <p className="text-sm text-text-secondary">AI-generated 12-month future prediction</p>
        </div>
        <button
          className="btn btn-secondary text-xs"
          onClick={fetchForecast}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-text-muted">Gemini is analyzing historical profiles & topography...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">Forecasting Error</p>
            <p className="text-xs text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !forecast && !error && (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-lg">
          <Bot className="w-12 h-12 text-text-muted mb-3" />
          <p className="text-sm text-text-secondary font-semibold">Ready to Generate Forecast</p>
          <p className="text-xs text-text-muted mt-1 mb-4">Click below to trigger AI analysis.</p>
          <button className="btn btn-primary" onClick={fetchForecast}>
            Generate AI Forecast
          </button>
        </div>
      )}

      {forecast && (
        <div className="flex flex-col gap-6">
          {/* Chart */}
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="var(--accent)" fontSize={11} unit="%" tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--secondary)" fontSize={11} unit="%" tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-popover)', borderColor: 'var(--border)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="right" dataKey="Predicted Lightning Prob (%)" fill="var(--secondary)" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.8} />
                <Line yAxisId="left" type="monotone" dataKey="Predicted Cloud (%)" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Narrative */}
          <div className="bg-slate-950/40 p-5 rounded-xl border border-white/5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted uppercase tracking-[0.18em]">
              <Bot className="w-4 h-4 text-secondary" /> Meteorological Commentary
            </div>
            <div className="text-sm">
              <MarkdownNarrative text={forecast.narrative} />
            </div>
          </div>

          {/* Model Status info */}
          <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-white/5 pt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> Forecast Engine: {forecast.source}
            </span>
            <span>Target Location: {lat.toFixed(3)}°, {lon.toFixed(3)}°</span>
          </div>
        </div>
      )}
    </div>
  );
}
