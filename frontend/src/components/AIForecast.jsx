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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MarkdownNarrative({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let listBuffer = [];
  let key = 0;

  const renderInline = (str) => {
    const parts = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let last = 0;
    let m;
    let k = 0;
    while ((m = regex.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      const token = m[0];
      if (token.startsWith('**')) {
        parts.push(<strong key={k++} className="text-text-primary font-semibold">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('`')) {
        parts.push(<code key={k++} className="px-1 py-0.5 rounded bg-slate-800/60 text-accent text-[0.85em]">{token.slice(1, -1)}</code>);
      } else {
        parts.push(<em key={k++} className="text-text-primary/90">{token.slice(1, -1)}</em>);
      }
      last = m.index + token.length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts;
  };

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul key={`ul-${key++}`} className="flex flex-col gap-1.5 pl-4 list-disc marker:text-primary/60">
          {listBuffer.map((item, i) => <li key={i} className="text-text-secondary text-sm leading-relaxed">{renderInline(item)}</li>)}
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
      const content = line.replace(/^#+\s+/, '');
      blocks.push(<h4 key={`h-${key++}`} className="font-display font-semibold text-text-primary text-sm mt-1">{renderInline(content)}</h4>);
    } else if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ''));
    } else {
      flushList();
      blocks.push(<p key={`p-${key++}`} className="text-text-secondary text-sm leading-relaxed">{renderInline(line)}</p>);
    }
  }
  flushList();
  return <div className="flex flex-col gap-2.5">{blocks}</div>;
}

export default function AIForecast({ apiBase, lat, lon, difficulty }) {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState('');

  const fetchForecast = async () => {
    setLoading(true);
    setError('');
    setForecast(null);
    try {
      const response = await fetch(`${apiBase}/api/forecast?lat=${lat}&lon=${lon}&difficulty=${difficulty}`);
      if (!response.ok) throw new Error('Failed to generate forecast.');
      setForecast(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lat && lon) fetchForecast();
  }, [lat, lon, difficulty]);

  const chartData = forecast?.forecast?.map(item => ({
    name: MONTH_NAMES[item.month - 1],
    'Cloud (%)': Math.round(item.cloud_cover),
    'Lightning (%)': Math.round(item.lightning_probability)
  })) || [];

  return (
    <div className="glass-panel p-8 sm:p-10 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2.5">
          <Sparkles className="text-secondary w-4.5 h-4.5" /> AI Forecast
        </h2>
        <button className="btn btn-secondary text-xs py-2 px-4" onClick={fetchForecast} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-xs text-text-muted">Analyzing climatological profiles…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-5 bg-red-500/5 border border-red-500/15 rounded-xl">
          <AlertTriangle className="text-red-400 w-4 h-4 flex-shrink-0" />
          <span className="text-xs text-red-300">{error}</span>
        </div>
      )}

      {!loading && !forecast && !error && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Bot className="w-10 h-10 text-text-muted/50" />
          <p className="text-xs text-text-muted">Click refresh to generate AI forecast</p>
        </div>
      )}

      {forecast && (
        <>
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#67e8f9" fontSize={10} unit="%" tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#c084fc" fontSize={10} unit="%" tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="right" dataKey="Lightning (%)" fill="#c084fc" radius={[3, 3, 0, 0]} maxBarSize={18} opacity={0.7} />
                <Line yAxisId="left" type="monotone" dataKey="Cloud (%)" stroke="#67e8f9" strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: '#67e8f9' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-950/40 p-6 rounded-xl border border-white/[0.06]">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-4">
              <Bot className="w-3.5 h-3.5 text-secondary" /> Commentary
            </div>
            <MarkdownNarrative text={forecast.narrative} />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-white/[0.06] pt-5">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> {forecast.source}
            </span>
            <span className="tabular-nums">{lat.toFixed(3)}°N, {lon.toFixed(3)}°E</span>
          </div>
        </>
      )}
    </div>
  );
}
