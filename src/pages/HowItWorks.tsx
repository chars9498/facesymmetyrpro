import React from 'react';
import { motion } from 'motion/react';
import { Zap, Sparkles, Scan, BarChart3, ShieldCheck, Info } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#3BFF9C]/30 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Zap className="text-indigo-400" size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">How AI Face Symmetry Analysis Works</h1>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">The Technology Behind the Balance</p>
          </header>

          <section className="prose prose-invert prose-indigo max-w-none space-y-8">
            <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-4">
                <Sparkles className="text-indigo-400" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight m-0">What is Face Symmetry?</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                Facial symmetry is the measure of how similar the two halves of your face are to each other. While no human face is perfectly symmetrical, researchers have long studied the relationship between facial balance and perceived attractiveness, health, and genetic diversity. Our tool uses advanced computer vision to quantify these subtle differences, providing you with a detailed map of your facial structure.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">1. AI Landmark Detection</h2>
              <p className="text-white/70 leading-relaxed">
                The process begins with our AI engine, which uses a deep learning model called MediaPipe Face Mesh. This model detects over 468 3D facial landmarks in real-time. These landmarks are specific points on your face, such as the corners of your eyes, the bridge of your nose, and the contours of your jawline. 
              </p>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
                <Scan className="text-indigo-400 shrink-0 mt-1" size={20} />
                <p className="text-sm text-white/60 leading-relaxed">
                  Our AI maps these points with sub-pixel accuracy, creating a high-resolution mesh that represents your unique facial geometry. This mesh is used as the foundation for all subsequent calculations.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">2. Calculating the Balance Score</h2>
              <p className="text-white/70 leading-relaxed">
                Once the landmarks are detected, our algorithm calculates a "Midline" for your face. This is the vertical axis that theoretically divides your face into two equal halves. We then measure the distance and angle of corresponding landmarks (e.g., left eye corner vs. right eye corner) relative to this midline. 
              </p>
              <p className="text-white/70 leading-relaxed">
                The "Overall Balance Score" is a weighted average of symmetry across four key zones: Eyes, Brows, Mouth, and Jawline. A score of 100 represents perfect mathematical symmetry, while lower scores indicate varying degrees of natural asymmetry.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">3. Why Results May Vary</h2>
              <p className="text-white/70 leading-relaxed">
                It's important to understand that facial symmetry analysis is highly sensitive to external factors. To get the most accurate result, you should consider the following:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                {[
                  { label: "Lighting", desc: "Uneven shadows can make one side of the face appear different to the AI." },
                  { label: "Angle", desc: "Even a slight tilt of the head can significantly impact the symmetry score." },
                  { label: "Expression", desc: "A smile or a wink will naturally create asymmetry in the landmarks." },
                  { label: "Distance", desc: "Being too close or too far from the camera can affect the perspective." }
                ].map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
                    <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">{item.label}</div>
                    <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">4. Local Browser Processing</h2>
              <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-indigo-400" size={24} />
                  <h3 className="text-lg font-black uppercase tracking-tight m-0">Privacy-First Architecture</h3>
                </div>
                <p className="text-white/70 leading-relaxed m-0">
                  The most critical part of our technology is where it runs. All the AI models and mathematical calculations are executed directly in your browser using your device's hardware. Your camera feed and photos are never uploaded to a server. This ensures that your biometric data remains private and secure at all times.
                </p>
              </div>
            </div>

            <div className="pt-12 border-t border-white/10 flex items-start gap-4">
              <Info className="text-white/20 shrink-0 mt-1" size={20} />
              <p className="text-white/40 text-sm leading-relaxed">
                Face Symmetry Pro is an educational and entertainment tool designed to help you understand your facial structure. The results provided are based on mathematical analysis of 2D images and should not be used for medical or diagnostic purposes.
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
