import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { type AnalysisResult } from '../services/analysisEngine';

interface AIImprovementTipsProps {
  result: AnalysisResult;
}

const TIPS_MAPPING: Record<string, { label: string; tip: string }> = {
  eyes: {
    label: "Eye Symmetry",
    tip: "Eye balance can be affected by sleep quality and screen time. Try maintaining a consistent sleep schedule and taking regular breaks from digital devices."
  },
  brows: {
    label: "Brow Balance",
    tip: "Brow symmetry is often influenced by facial expressions and muscle tension. Gentle facial relaxation exercises can help maintain a balanced brow line."
  },
  mouth: {
    label: "Mouth Balance",
    tip: "Mouth symmetry can be related to dental habits and speaking patterns. Practice balanced facial expressions and maintain good oral posture."
  },
  jawline: {
    label: "Jaw Alignment",
    tip: "Jaw balance can be influenced by posture and chewing habits. Try keeping your head aligned and avoid chewing primarily on one side."
  }
};

export const AIImprovementTips: React.FC<AIImprovementTipsProps> = ({ result }) => {
  // Find the lowest scoring component among the specified ones
  const targetKeys = ['eyes', 'brows', 'mouth', 'jawline'];
  
  let lowestKey = 'eyes';
  let lowestScore = 101;

  targetKeys.forEach(key => {
    const score = result.landmarks?.[key]?.score;
    if (score !== undefined && score < lowestScore) {
      lowestScore = score;
      lowestKey = key;
    }
  });

  const { label, tip } = TIPS_MAPPING[lowestKey] || TIPS_MAPPING['eyes'];

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={14} className="text-emerald-400" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">AI Improvement Tip</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-[8px] font-black text-white/40 uppercase tracking-tighter mb-1">Focus Area</div>
          <div className="text-sm font-black text-white italic uppercase tracking-tight">{label}</div>
        </div>

        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
          <p className="text-[11px] text-white/80 leading-relaxed font-medium">
            {tip}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest">
          <span>Re-scan in a few days to track changes</span>
          <ArrowRight size={10} />
        </div>
      </div>
    </div>
  );
};
