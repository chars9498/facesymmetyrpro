import React from 'react';
import { AnalysisResult } from "../services/analysisEngine";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ResultShareCard = React.forwardRef<HTMLDivElement, {
  result: AnalysisResult;
  image: string;
  centerOffset: number;
  rotationAngle: number;
}>(({ result, image, centerOffset, rotationAngle }, ref) => {
  const worstImbalance = React.useMemo(() => {
    const scores = [
      { name: 'Eye alignment', score: result.landmarks.eyes.score },
      { name: 'Brow symmetry', score: result.landmarks.brows.score },
      { name: 'Oral symmetry', score: result.landmarks.mouth.score },
      { name: 'Lower jaw alignment', score: result.landmarks.jawline.score },
    ];
    return scores.reduce((prev, curr) => (prev.score < curr.score ? prev : curr));
  }, [result.landmarks]);

  return (
    <div 
      ref={ref}
      className="w-[1080px] h-[1920px] bg-[#050505] text-white relative flex flex-col items-center justify-between py-32 px-24 overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-emerald-500/10 blur-[250px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[50%] bg-blue-500/10 blur-[250px] rounded-full" />
      
      {/* Header */}
      <div className="w-full flex flex-col items-center z-10">
        <h1 className="text-[80px] font-black italic tracking-tighter uppercase leading-none">
          Face Symmetry <span className="text-emerald-500">Pro</span>
        </h1>
        <div className="mt-6 px-10 py-3 bg-white/5 border border-white/10 rounded-full">
          <p className="text-2xl font-mono text-white/40 uppercase tracking-[0.5em]">AI Biometric Analysis</p>
        </div>
      </div>

      {/* Main Content: User Image */}
      <div className="relative z-10">
        <div className="w-[880px] h-[880px] rounded-full overflow-hidden border-[12px] border-white/10 shadow-[0_0_150px_rgba(0,0,0,0.8)]">
          <img 
            src={image} 
            alt="Analysis" 
            className="w-full h-full object-cover"
            style={{ transform: `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.2)` }}
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute top-1/2 left-0 w-full h-2 bg-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.8)] z-20" />
      </div>

      {/* Stats Section */}
      <div className="w-full flex flex-col items-center gap-10 z-10">
        <div className="flex flex-col items-center">
          <p className="text-[140px] font-black italic text-emerald-400 leading-none">
            TOP {result.percentile || 0}%
          </p>
          <p className="text-4xl font-bold text-emerald-400/60 uppercase tracking-[0.1em] mt-4">
            Better than {100 - (result.percentile || 0)}% of people
          </p>
          
          <p className="mt-10 text-3xl font-bold text-red-400/90 uppercase tracking-widest flex items-center gap-3">
            <span>⚠</span> Main imbalance: {worstImbalance.name}
          </p>

          <p className={cn(
            "mt-14 text-[70px] font-black uppercase tracking-[0.2em]",
            result.tier?.color
          )}>
            {result.tier?.label}
          </p>
        </div>

        <div className="h-px w-64 bg-white/10" />

        <div className="flex flex-col items-center">
          <p className="text-3xl font-mono text-white/30 uppercase tracking-[0.4em] mb-4">Balance Score</p>
          <p className="text-[180px] font-black italic text-white leading-none">
            {result.overallScore}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full flex flex-col items-center z-10">
        <p className="text-4xl font-black tracking-[0.2em] uppercase text-emerald-500">Check your face symmetry</p>
        <p className="text-3xl font-mono mt-4 text-white/30 tracking-widest">facesymmetrypro.app</p>
      </div>
    </div>
  );
});

export const SymmetryShareCard = React.forwardRef<HTMLDivElement, {
  result: AnalysisResult;
}>(({ result }, ref) => {
  return (
    <div 
      ref={ref}
      className="w-[600px] bg-[#0A0A0A] p-10 flex flex-col items-center gap-8 border border-white/10"
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-black text-white uppercase tracking-[0.3em]">Face Symmetry Pro</h1>
        <p className="text-xs text-white/40 uppercase tracking-widest">AI Facial Balance Analysis</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-widest text-center">Left Symmetry</p>
          <div className="aspect-square rounded-xl overflow-hidden border border-white/10">
            <img src={result.symmetryTwins?.left} alt="Left" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-widest text-center">Right Symmetry</p>
          <div className="aspect-square rounded-xl overflow-hidden border border-white/10">
            <img src={result.symmetryTwins?.right} alt="Right" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>

      <div className="w-full pt-4 border-t border-white/5 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Balance Score</p>
          <p className="text-2xl font-black text-emerald-400 italic">{result.overallScore}</p>
        </div>
        <p className="text-[10px] text-white/20 font-mono">facesymmetrypro.app</p>
      </div>
    </div>
  );
});
