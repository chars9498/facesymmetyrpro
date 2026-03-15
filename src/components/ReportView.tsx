import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Trophy, Zap, Sparkles, Lock, Check, CreditCard, Scan, Download, RotateCcw, TrendingUp, Maximize2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { type AnalysisResult } from '../services/analysisEngine';

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
  setExportType: (type: 'result' | 'symmetry') => void;
  setShowExportModal: (show: boolean) => void;
  autoCorrectEnabled: boolean;
  setAutoCorrectEnabled: (enabled: boolean) => void;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  centerOffset: number;
  rotationAngle: number;
  imageAspectRatio: number;
  imageDimensions: { width: number; height: number };
  FaceMeshCanvas: React.FC<any>;
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
  setShowExportModal,
  autoCorrectEnabled,
  setAutoCorrectEnabled,
  showOverlay,
  setShowOverlay,
  centerOffset,
  rotationAngle,
  imageAspectRatio,
  imageDimensions,
  FaceMeshCanvas
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
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
          <div className="flex items-center gap-1.5 px-2 shrink-0">
            {[0, 1].map((step) => (
              <div 
                key={step} 
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  step <= (isUnlocked ? reportStep : 0) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-white/10"
                )}
              />
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {reportStep === 0 && (
              <div className="flex flex-col gap-4 min-h-0 py-2">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 w-fit self-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <User size={14} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] font-mono">AI Analysis Report</span>
                </div>

                {/* Score Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-2xl backdrop-blur-md flex flex-col items-center relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy size={80} className="text-emerald-400" />
                  </div>
                  
                  <div className="relative mb-4">
                    <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                        <circle
                          cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent"
                          strokeDasharray={364}
                          strokeDashoffset={364 - (364 * (result.overallScore || 0)) / 100}
                          strokeLinecap="round"
                          className="text-emerald-500 transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black italic tracking-tighter font-mono leading-none">{result.overallScore || 0}</span>
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Balance Score</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 w-full">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white tracking-tight">상위 {result.percentile || 0}%</span>
                        <div className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          result.tier?.color.replace('text-', 'bg-').replace('-400', '-500/10'),
                          result.tier?.color.replace('text-', 'border-').replace('-400', '-500/20'),
                          result.tier?.color
                        )}>
                          {result.tier?.icon} {result.tier?.label}
                        </div>
                      </div>
                      <span className="text-[7px] font-bold text-white/30 uppercase tracking-[0.3em]">Global Percentile Ranking</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 rounded-full backdrop-blur-sm self-center mx-auto w-fit">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                        result.resultStability === 'High' ? "text-emerald-500 bg-emerald-500" : 
                        result.resultStability === 'Medium' ? "text-yellow-500 bg-yellow-500" : "text-red-500 bg-red-500"
                      )} />
                      <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Confidence: {result.resultStability}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Key Insight Summary */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-emerald-500/10 rounded-3xl border border-emerald-500/20 p-5 shadow-xl backdrop-blur-sm relative group"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={40} className="text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-emerald-400" />
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] font-mono">Key Insight</h4>
                  </div>
                  <div className="space-y-2 relative z-10">
                    <p className="text-[12px] font-bold text-white leading-tight">
                      {result.primaryImbalance.split('\n')[0]}
                    </p>
                  </div>
                </motion.div>

                {/* Free Personalized Insight Preview */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-blue-400" />
                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] font-mono">Personalized Insight</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Focus Area</p>
                      <p className="text-[12px] font-bold text-white">{result.summary.split('.')[0]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Suggested Direction</p>
                      <ul className="space-y-1">
                        {result.homeCareGuide.split('\n').slice(0, 2).map((line, i) => (
                          <li key={i} className="text-[11px] text-white/70 flex gap-2">
                            <span className="text-emerald-500">•</span>
                            {line.replace(/^[*-]\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Social Proof */}
                {!isUnlocked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center mt-8 mb-2"
                  >
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <span className="text-amber-400">⭐</span> Thousands of users unlock this report to understand their facial imbalance
                    </p>
                  </motion.div>
                )}

                {/* Paywall Section */}
                {!isUnlocked && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-3xl border border-indigo-500/30 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden"
                  >
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                          <Lock size={20} className="text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black italic tracking-tighter text-white uppercase">Unlock Deep Face Analysis</h3>
                          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Premium Feature</p>
                        </div>
                      </div>

                      <p className="text-[12px] text-white/70 leading-relaxed">
                        See the full breakdown of your facial symmetry and discover the main factors affecting your score.
                      </p>

                      <div className="grid grid-cols-1 gap-2 py-2">
                        {[
                          'Full facial symmetry breakdown',
                          'Left vs right face comparison',
                          'AI imbalance heatmap'
                        ].map((benefit, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <Check size={10} className="text-emerald-400" />
                            </div>
                            <span className="text-[11px] text-white/80 font-medium">{benefit}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUnlocked(true);
                          setReportStep(1);
                        }}
                        className="w-full bg-[#3BFF9C] hover:bg-[#2ee68a] text-black font-black uppercase tracking-[0.15em] py-4 rounded-2xl shadow-[0_0_30px_rgba(59,255,156,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                      >
                        <CreditCard size={18} />
                        Reveal My Full Face Analysis – $2.99
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {reportStep === 1 && (
              <div className="flex flex-col gap-6 h-full min-h-0 w-full overflow-y-auto custom-scrollbar pb-6 px-1">
                {/* Symmetry Twin Analysis */}
                <div className="space-y-4">
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
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    
                    <p className="mt-4 text-[9px] text-white/40 leading-normal text-center font-medium">
                      좌측 얼굴과 우측 얼굴을 각각 대칭으로 합성한 모습입니다.
                    </p>

                    <button 
                      onClick={() => {
                        setExportType('symmetry');
                        setShowExportModal(true);
                      }}
                      className="mt-4 w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-2 transition-all group active:scale-[0.98]"
                    >
                      <Download size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Export Symmetry Card</span>
                    </button>
                  </div>

                  {/* Visual Analysis (Mesh) */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-4 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Visual Mesh Analysis</h3>
                      <div className="flex gap-1">
                        <button onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)} className={cn("p-1.5 rounded-lg transition-all border", autoCorrectEnabled ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-white/40")}>
                          <RotateCcw size={12} />
                        </button>
                        <button onClick={() => setShowOverlay(!showOverlay)} className={cn("p-1.5 rounded-lg transition-all border", showOverlay ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/40")}>
                          <Scan size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="aspect-[4/5] relative rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                      <div 
                        className="relative transition-transform duration-500 ease-out"
                        style={{ 
                          width: imageAspectRatio > 1 ? '100%' : `${imageAspectRatio * 100}%`,
                          aspectRatio: imageAspectRatio,
                          transform: autoCorrectEnabled ? `translateX(${centerOffset}%) rotate(${rotationAngle}deg) scale(1.1)` : `scale(1.0)`
                        }}
                      >
                        <img src={image || ''} alt="Analysis" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        
                        <div className={cn(
                          "absolute inset-0 pointer-events-none transition-opacity duration-300",
                          showOverlay ? "opacity-100" : "opacity-0"
                        )}>
                          {result.rawLandmarks && (
                            <FaceMeshCanvas 
                              landmarks={result.rawLandmarks} 
                              width={imageDimensions.width} 
                              height={imageDimensions.height} 
                            />
                          )}
                          {result.asymmetryZones?.map((zone, i) => (
                            <div key={`zone-${i}`} className="absolute" style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.radius * 2.5}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
                              <motion.div 
                                className="w-full h-full rounded-full" 
                                style={{ background: `radial-gradient(circle, rgba(239, 68, 68, ${zone.intensity * 0.8}) 0%, rgba(239, 68, 68, 0) 70%)` }} 
                                animate={{ scale: [1, 1.2, 1], opacity: [zone.intensity, zone.intensity * 0.5, zone.intensity] }} 
                                transition={{ duration: 2, repeat: Infinity }} 
                              />
                            </div>
                          ))}
                          {result.metrics?.midline !== undefined && (
                            <div className="absolute inset-y-0 w-px bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10" style={{ left: `${result.metrics.midline * 100}%` }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expert Insight Card */}
                  <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-5 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <User size={14} className="text-emerald-400" />
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Expert Analysis</h4>
                    </div>
                    <p className="text-[13px] font-bold text-white leading-normal italic">
                      "{result.factFeedback}"
                    </p>
                  </div>

                  {/* Radar Chart */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono mb-4">Balance Distribution</h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                          { subject: '눈', A: result.partScores?.eyes || result.landmarks.eyes.score },
                          { subject: '눈썹', A: result.partScores?.brows || result.landmarks.brows.score },
                          { subject: '입', A: result.partScores?.mouth || result.landmarks.mouth.score },
                          { subject: '턱', A: result.partScores?.jaw || result.landmarks.jawline.score },
                        ]}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700 }} />
                          <Radar name="Symmetry" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                      <p className="text-[13px] font-bold text-emerald-400 leading-normal text-center">
                        {result.summary}
                      </p>
                      <p className="text-[11px] text-white/60 leading-normal text-center font-medium px-4">
                        {result.analysisSummary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Advanced Metrics & Simulation */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Face Shape Card */}
                    <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm flex flex-col justify-center gap-1">
                      <div className="flex items-center gap-2">
                        <Maximize2 size={14} className="text-emerald-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Face Shape</h3>
                      </div>
                      <p className="text-[15px] font-black text-white italic">{result.faceShape || "분석 중..."}</p>
                    </div>

                    {/* Improvement Potential Card */}
                    <div className="bg-emerald-500/5 rounded-3xl border border-emerald-500/20 p-5 shadow-xl backdrop-blur-sm flex flex-col justify-center gap-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Potential</h3>
                      </div>
                      <p className="text-[15px] font-black text-emerald-400 italic">{result.improvementPotential?.range}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm space-y-5">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Advanced Metrics</h3>
                    </div>

                    <div className="space-y-5">
                      {/* Eye Spacing */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[11px] font-bold text-white/80">Eye Spacing Ratio</span>
                          <span className="text-[13px] font-mono font-black text-emerald-400">{result.advancedMetrics?.eyeSpacing.value.toFixed(2)}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-bold text-emerald-400/80 mb-1">{result.advancedMetrics?.eyeSpacing.status}</p>
                          <p className="text-[10px] text-white/60 leading-normal">{result.advancedMetrics?.eyeSpacing.feedback}</p>
                        </div>
                      </div>

                      {/* Facial Proportion */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[11px] font-bold text-white/80">Facial Proportion (V)</span>
                          <span className="text-[13px] font-mono font-black text-emerald-400">
                            {result.advancedMetrics?.facialProportion.value.upper}:{result.advancedMetrics?.facialProportion.value.mid}:{result.advancedMetrics?.facialProportion.value.lower}
                          </span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-bold text-emerald-400/80 mb-1">{result.advancedMetrics?.facialProportion.status}</p>
                          <p className="text-[10px] text-white/60 leading-normal">{result.advancedMetrics?.facialProportion.feedback}</p>
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
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
