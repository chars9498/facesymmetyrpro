import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Trophy, Zap, Sparkles, Lock, Check, CreditCard, Scan, Download, RotateCcw, TrendingUp, Maximize2, BarChart3, Share2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { type AnalysisResult } from '../services/analysisEngine';
import { ProgressTracking } from './ProgressTracking';
import { AIImprovementTips } from './AIImprovementTips';
import { ScoreHistory } from './ScoreHistory';
import { WeeklyChallenge } from './WeeklyChallenge';
import { HistoryItem } from '../hooks/useAnalysisHistory';

interface ReportViewProps {
  result: AnalysisResult;
  reportStep: number;
  setReportStep: (step: number) => void;
  isUnlocked: boolean;
  setIsUnlocked: (unlocked: boolean) => void;
  image: string | null;
  symmetryStrength: number;
  setSymmetryStrength: (strength: number) => void;
  updateSymmetryTwins: (strength: number) => void;
  setExportType: (type: 'result' | 'symmetry' | 'full') => void;
  autoCorrectEnabled: boolean;
  setAutoCorrectEnabled: (enabled: boolean) => void;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  centerOffset: number;
  rotationAngle: number;
  imageAspectRatio: number;
  imageDimensions: { width: number; height: number };
  FaceMeshCanvas: React.FC<any>;
  onReset: () => void;
  onAction: (action: 'save' | 'share' | 'copy') => void;
  isExporting: boolean;
  exportSuccess: boolean;
  previousScan: HistoryItem | null;
  history: HistoryItem[];
  weeklyScans: number;
}

export const ReportView: React.FC<ReportViewProps> = ({
  result,
  reportStep,
  setReportStep,
  isUnlocked,
  setIsUnlocked,
  image,
  symmetryStrength,
  setSymmetryStrength,
  updateSymmetryTwins,
  setExportType,
  autoCorrectEnabled,
  setAutoCorrectEnabled,
  showOverlay,
  setShowOverlay,
  centerOffset,
  rotationAngle,
  imageAspectRatio,
  imageDimensions,
  FaceMeshCanvas,
  onReset,
  onAction,
  isExporting,
  exportSuccess,
  previousScan,
  history,
  weeklyScans
}) => {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const steps = [
    { id: 0, label: 'Analysis' },
    { id: 1, label: 'Twins' },
    { id: 2, label: 'Metrics' },
    { id: 3, label: 'Care' }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <AnimatePresence mode="wait">
        <motion.div 
          key={`report-step-${reportStep}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col min-h-0 gap-2"
        >
          {/* Progress Indicator */}
          <div className="flex items-center gap-1.5 px-2 shrink-0 mb-2">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  step.id <= reportStep ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-white/10"
                )}
              />
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-32">
            {reportStep === 0 && (
              <div className="flex flex-col gap-4 min-h-0 py-2">
                {/* Header */}
                <div className="px-2">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">Analysis Report</h2>
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live AI</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Facial Symmetry & Balance Assessment</p>
                </div>

                {/* Score Section */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="flex items-center justify-between mb-6 relative">
                      <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Overall Balance Score</h3>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black italic tracking-tighter text-white">{result.overallScore}</span>
                          <span className="text-xl font-black text-emerald-400 italic">/100</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Top {result.percentile}%</div>
                        <div className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Global Database</div>
                      </div>
                    </div>

                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.overallScore}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(result.landmarks || {}).map(([key, data]: [string, any]) => (
                        <div key={key} className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
                          <div className="text-[8px] font-black text-white/40 uppercase tracking-tighter mb-1">{key}</div>
                          <div className="text-xs font-black text-white italic">{data.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress Tracking Section */}
                  <ProgressTracking 
                    currentScore={result.overallScore} 
                    previousScan={previousScan} 
                  />

                  {/* Score History Section */}
                  <ScoreHistory history={history} />

                  {/* AI Improvement Tips Section */}
                  <AIImprovementTips result={result} />

                  {/* Weekly Challenge Section */}
                  <WeeklyChallenge scans={weeklyScans} />

                  {/* Visual Analysis (Mesh) */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Scan size={14} className="text-emerald-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Visual Mesh Analysis</h3>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)} className={cn("p-2 rounded-xl transition-all border", autoCorrectEnabled ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-white/40")}>
                          <RotateCcw size={14} />
                        </button>
                        <button type="button" onClick={() => setShowOverlay(!showOverlay)} className={cn("p-2 rounded-xl transition-all border", showOverlay ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/40")}>
                          <Scan size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="aspect-[3/4] relative rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                      <div 
                        className="relative transition-transform duration-700 ease-out w-full h-full flex items-center justify-center"
                        style={{ 
                          transform: autoCorrectEnabled ? `translateX(${centerOffset}%) rotate(${rotationAngle}deg) scale(1.2)` : `scale(1.0)`
                        }}
                      >
                        <img 
                          ref={imageRef}
                          src={image || ''} 
                          alt="Analysis" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                        
                        <div className={cn(
                          "absolute inset-0 pointer-events-none transition-opacity duration-500",
                          showOverlay ? "opacity-100" : "opacity-0"
                        )}>
                          {result.rawLandmarks && (
                            <FaceMeshCanvas 
                              landmarks={result.rawLandmarks} 
                              imageRef={imageRef}
                              rawWidth={imageDimensions.width}
                              rawHeight={imageDimensions.height}
                            />
                          )}
                          {result.asymmetryZones?.map((zone, i) => (
                            <div key={`zone-${i}`} className="absolute" style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.radius * 3}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
                              <motion.div 
                                className="w-full h-full rounded-full" 
                                style={{ background: `radial-gradient(circle, rgba(239, 68, 68, ${zone.intensity * 0.6}) 0%, rgba(239, 68, 68, 0) 70%)` }} 
                                animate={{ scale: [1, 1.3, 1], opacity: [zone.intensity, zone.intensity * 0.4, zone.intensity] }} 
                                transition={{ duration: 2.5, repeat: Infinity }} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Midline</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Asymmetry</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Recommendations */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={14} className="text-emerald-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">AI Analysis Summary</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                        <p className="text-[13px] font-bold text-emerald-400 leading-normal">
                          {result.summary}
                        </p>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                        {result.analysisSummary}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportStep === 1 && (
              <div className="flex flex-col gap-4 py-2">
                {/* Symmetry Twins Section */}
                <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Scan size={14} className="text-indigo-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 font-mono">Symmetry Twin Analysis</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Original Image */}
                    <div className="relative aspect-[4/5] w-2/3 mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/20 shadow-lg">
                      <img src={image || ''} alt="Original" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500/80 backdrop-blur-sm rounded-full">
                        <span className="text-[7px] font-black text-black uppercase tracking-widest">Original</span>
                      </div>
                    </div>

                    {/* Twins */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/5 bg-black/20 relative">
                          {result.symmetryTwins?.left ? (
                            <img src={result.symmetryTwins.left} alt="Left Symmetry" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white/20">...</div>
                          )}
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full border border-white/5">
                            <span className="text-[6px] font-bold text-white/60 uppercase tracking-tighter">Left Symmetry</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/5 bg-black/20 relative">
                          {result.symmetryTwins?.right ? (
                            <img src={result.symmetryTwins.right} alt="Right Symmetry" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white/20">...</div>
                          )}
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full border border-white/5">
                            <span className="text-[6px] font-bold text-white/60 uppercase tracking-tighter">Right Symmetry</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Symmetry Strength Slider */}
                  <div className="mt-5 px-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Symmetry Strength</span>
                      <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(symmetryStrength * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.0" 
                      step="0.01" 
                      value={symmetryStrength} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSymmetryStrength(val);
                        updateSymmetryTwins(val);
                      }}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {reportStep === 2 && (
              <div className="flex flex-col gap-4 py-2">
                {/* Detailed Metrics */}
                <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={14} className="text-emerald-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Advanced Metrics</h3>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Radar Chart */}
                    <div className="aspect-square w-full max-w-[280px] mx-auto relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: 'Eyes', A: result.landmarks?.eyes.score || 0, fullMark: 100 },
                          { subject: 'Brows', A: result.landmarks?.brows.score || 0, fullMark: 100 },
                          { subject: 'Mouth', A: result.landmarks?.mouth.score || 0, fullMark: 100 },
                          { subject: 'Jaw', A: result.landmarks?.jawline.score || 0, fullMark: 100 },
                          { subject: 'Overall', A: result.overallScore, fullMark: 100 },
                        ]}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700 }} />
                          <Radar name="Symmetry" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Face Shape</div>
                        <div className="text-sm font-black text-white italic">{result.faceShape || "Oval"}</div>
                      </div>
                      <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10">
                        <div className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Potential</div>
                        <div className="text-sm font-black text-emerald-400 italic">{result.improvementPotential?.range}</div>
                      </div>
                    </div>

                    {/* Balanced Face Visualization */}
                    <div className="pt-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-emerald-400" />
                          <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">Balanced Face Simulation</h4>
                        </div>
                        <span className="text-[9px] text-emerald-400/60 font-mono font-bold">30% Symmetry</span>
                      </div>
                      <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden border border-white/10 bg-black/40 group">
                        {result.balancedImage ? (
                          <img 
                            src={result.balancedImage} 
                            alt="Balanced Face" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 text-[11px]">
                            Generating simulation...
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                          <p className="text-[10px] text-white/80 leading-normal font-medium">
                            AI가 분석한 이상적인 균형 상태를 시뮬레이션한 결과입니다. 자연스러운 개성을 유지하면서 대칭성을 미세하게 조정하였습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportStep === 3 && (
              <div className="flex flex-col gap-4 py-2">
                {/* Personalized Care Guide */}
                <div className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-6">
                    <Trophy size={14} className="text-emerald-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Personalized Care Guide</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Primary Imbalance Focus */}
                    <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-2">Recommended Focus Area</div>
                      <p className="text-sm font-bold text-white leading-relaxed">
                        {result.primaryImbalance}
                      </p>
                    </div>

                    {/* Home Care Guide */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Daily Habit Advice</span>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <div className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap font-medium">
                            {result.homeCareGuide?.replace(/####/g, '').replace(/\*\*/g, '')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sharing Actions */}
                    <div className="pt-4 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => {
                            setExportType('result');
                            onAction('save');
                          }}
                          disabled={isExporting}
                          className={cn(
                            "flex items-center justify-center gap-2 p-4 rounded-2xl transition-all group border",
                            exportSuccess && isExporting === false
                              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                              : "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400"
                          )}
                        >
                          {isExporting ? (
                            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                          ) : exportSuccess ? (
                            <Check size={18} />
                          ) : (
                            <Download size={18} className="group-hover:scale-110 transition-transform" />
                          )}
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {exportSuccess ? 'Saved' : 'Save Card'}
                          </span>
                        </button>
                        <button 
                          onClick={() => {
                            setExportType('result');
                            onAction('share');
                          }}
                          disabled={isExporting}
                          className="flex items-center justify-center gap-2 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all group"
                        >
                          <Share2 size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Share to Apps</span>
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => onAction('copy')}
                        className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                      >
                        <Check size={12} className="text-emerald-500" />
                        Copy Analysis Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Sticky Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent z-40 pointer-events-none">
        <div className="max-w-md mx-auto flex flex-col gap-3 pointer-events-auto">
          <div className="flex gap-2">
            {reportStep > 0 && (
              <button
                type="button"
                onClick={() => setReportStep(reportStep - 1)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.98]"
              >
                Back
              </button>
            )}
            
            {reportStep === 0 && !isUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  setIsUnlocked(true);
                  setReportStep(1);
                }}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.15em] py-4 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-[11px]"
              >
                Next Step
                <Sparkles size={14} />
              </button>
            ) : reportStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setReportStep(reportStep + 1)}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.15em] py-4 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-[11px]"
              >
                Next Step
                <Sparkles size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onReset}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.15em] py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-[11px]"
              >
                Start New Analysis
                <RotateCcw size={14} />
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={onReset}
            className="w-full py-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.3em] hover:text-white/60 transition-colors"
          >
            Retake Photo / Upload Another
          </button>
        </div>
      </div>
    </div>
  );
};
