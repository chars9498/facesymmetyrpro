import React from 'react';
import { cn } from '../lib/utils';
import { type AnalysisResult } from '../services/analysisEngine';

interface ResultShareCardProps {
  result: AnalysisResult;
  image: string | null;
}

export const ResultShareCard: React.FC<ResultShareCardProps> = ({ result, image }) => {
  return (
    <div className="w-[360px] bg-[#050505] p-10 flex flex-col items-center gap-8 relative overflow-hidden border border-white/5">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
      
      {/* Top Branding */}
      <div className="flex flex-col items-center gap-1.5 relative z-10">
        <h2 className="text-[12px] font-black text-white uppercase tracking-[0.5em] italic">Face Symmetry Pro</h2>
        <p className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-[0.3em]">AI Facial Balance Report</p>
      </div>

      {/* Portrait Frame */}
      <div className="relative py-4">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent rounded-full blur-xl opacity-50" />
        <div className="w-44 h-44 rounded-full overflow-hidden border border-white/10 relative z-10 shadow-2xl">
          <img src={image || ''} alt="Analysis" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          
          {/* Subtle Vertical Center Line */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/20 z-20" />
        </div>
      </div>

      {/* Main Score Area */}
      <div className="flex flex-col items-center gap-6 w-full relative z-10">
        <div className="flex flex-col items-center gap-1">
          <div className="text-4xl font-black italic tracking-tighter text-white uppercase">
            TOP {result.percentile}%
          </div>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            Better than {100 - (result.percentile || 0)}% of people
          </p>
        </div>

        <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-3xl px-8 py-4 w-full">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Balance Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black italic tracking-tighter text-white leading-none font-mono">{result.overallScore}</span>
            <span className="text-lg font-black text-emerald-500 italic">/100</span>
          </div>
        </div>

        {/* Curiosity Line */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Primary Insight</span>
          <p className="text-[11px] font-bold text-white/80 text-center leading-tight max-w-[240px]">
            Main imbalance: {result.primaryImbalance.split('\n')[0].replace('Recommended Focus Area: ', '')}
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-4 flex flex-col items-center gap-2 relative z-10">
        <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">Check your face symmetry</p>
        </div>
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">facesymmetrypro.app</p>
      </div>
    </div>
  );
};

interface SymmetryShareCardProps {
  result: AnalysisResult;
  image: string | null;
}

export const SymmetryShareCard: React.FC<SymmetryShareCardProps> = ({ result, image }) => {
  return (
    <div className="w-[360px] bg-[#0A0A0A] p-8 flex flex-col items-center gap-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] font-mono">Face Symmetry Pro</h2>
        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Symmetry Twin Comparison</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="space-y-3">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
            <img src={result.symmetryTwins?.left || ''} alt="Left" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
              <span className="text-[8px] font-black text-white uppercase tracking-widest">Left</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
            <img src={result.symmetryTwins?.right || ''} alt="Right" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
              <span className="text-[8px] font-black text-white uppercase tracking-widest">Right</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black italic text-white leading-none font-mono">{result.overallScore}</span>
            <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest mt-1">Score</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-xl font-black italic text-indigo-400 leading-none">TOP {result.percentile}%</span>
            <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest mt-1">Rank</span>
          </div>
        </div>
        <p className="text-[10px] text-white/60 text-center leading-relaxed font-medium">
          "좌우 대칭 분석 결과, 당신의 얼굴은 상위 {result.percentile}%의 균형미를 가지고 있습니다."
        </p>
      </div>

      <div className="mt-2 flex flex-col items-center gap-2">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.15em]">Analyze your face</p>
        <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">facesymmetrypro.app</p>
      </div>
    </div>
  );
};
