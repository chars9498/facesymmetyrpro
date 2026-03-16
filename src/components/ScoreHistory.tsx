import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { HistoryItem } from '../hooks/useAnalysisHistory';
import { BarChart3 } from 'lucide-react';

interface ScoreHistoryProps {
  history: HistoryItem[];
}

export const ScoreHistory: React.FC<ScoreHistoryProps> = ({ history }) => {
  // If history.length <= 1, it means we only have the current scan (or none if it hasn't saved yet).
  if (history.length <= 1) {
    return (
      <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={14} className="text-emerald-400" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Face Score History</h3>
        </div>
        <div className="py-8 text-center">
          <p className="text-[11px] text-white/40 font-medium italic">
            Complete another scan to start tracking your facial balance history.
          </p>
        </div>
      </div>
    );
  }

  // Take last 5 scans (history[0] is the most recent)
  const recentHistory = history.slice(0, 5).reverse(); // Chronological order
  
  const chartData = recentHistory.map(item => ({
    date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: item.overallScore,
    timestamp: item.timestamp
  }));

  const firstScore = recentHistory[0].overallScore;
  const lastScore = recentHistory[recentHistory.length - 1].overallScore;
  const trend = lastScore - firstScore;

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-emerald-400" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Face Score History</h3>
        </div>
        {trend !== 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Trend</span>
            <span className={`text-[10px] font-black italic ${trend > 0 ? 'text-emerald-400' : 'text-white/60'}`}>
              {trend > 0 ? `+${trend}` : trend} {trend > 0 ? 'improvement' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="h-32 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="date" 
              hide 
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']} 
              hide 
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-black/90 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-xl">
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">{payload[0].payload.date}</p>
                      <p className="text-xs font-black text-white italic">{payload[0].value}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ fill: '#ffffff', stroke: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3bff9c', stroke: '#ffffff', strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-4 px-2">
        {chartData.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-[8px] font-black text-white/30 uppercase tracking-tighter mb-0.5">{item.date}</div>
            <div className="text-[10px] font-black text-white italic">{item.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
