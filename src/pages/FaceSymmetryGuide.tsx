import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Trophy, Zap, Check, AlertCircle, Info, User } from 'lucide-react';

export default function FaceSymmetryGuide() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#3BFF9C]/30 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Trophy className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Face Symmetry Guide</h1>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">Understanding Facial Balance and Symmetry</p>
          </header>

          <section className="prose prose-invert prose-emerald max-w-none space-y-8">
            <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-4">
                <Sparkles className="text-emerald-400" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight m-0">What is Facial Symmetry?</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                Facial symmetry is the measure of how similar the two halves of your face are to each other. While no human face is perfectly symmetrical, researchers have long studied the relationship between facial balance and perceived attractiveness, health, and genetic diversity. Our tool uses advanced computer vision to quantify these subtle differences, providing you with a detailed map of your facial structure.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">1. Why People are Curious About Symmetry</h2>
              <p className="text-white/70 leading-relaxed">
                Humans are naturally drawn to symmetry. In nature, symmetry often signals health and genetic fitness. In art and architecture, it creates a sense of harmony and balance. When it comes to the human face, symmetry is often associated with perceived beauty and attractiveness. However, it's important to remember that asymmetry is what makes each face unique and full of character.
              </p>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
                <User className="text-emerald-400 shrink-0 mt-1" size={20} />
                <p className="text-sm text-white/60 leading-relaxed">
                  Many people use symmetry analysis to understand their features better, whether for grooming, makeup application, or simply out of curiosity about their own facial geometry.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">2. Common Myths vs. Reality</h2>
              <p className="text-white/70 leading-relaxed">
                There are many misconceptions about facial symmetry. Let's clear up some of the most common ones:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                {[
                  { label: "Myth: Perfect Symmetry is Normal", desc: "Reality: Almost everyone has some degree of asymmetry. It's a natural part of human biology." },
                  { label: "Myth: Asymmetry Means Poor Health", desc: "Reality: While extreme asymmetry can sometimes be a sign of health issues, minor asymmetry is perfectly normal." },
                  { label: "Myth: Symmetry is the Only Key to Beauty", desc: "Reality: Beauty is subjective and multifaceted. Many famous and attractive people have noticeable asymmetry." },
                  { label: "Myth: Symmetry Can't Change", desc: "Reality: Factors like posture, dental work, and even sleeping habits can influence facial balance over time." }
                ].map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
                    <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">{item.label}</div>
                    <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">3. Practical Tips for Better Scanning</h2>
              <p className="text-white/70 leading-relaxed">
                To get the most accurate and consistent results from our AI analysis, follow these practical tips:
              </p>
              <div className="space-y-4">
                {[
                  { title: "Maintain Good Posture", desc: "Keep your head level and look directly at the camera. Avoid tilting or turning your head." },
                  { title: "Use Even Lighting", desc: "Ensure your face is evenly lit from the front. Avoid harsh side lighting that creates shadows." },
                  { title: "Keep a Neutral Expression", desc: "Try to keep your face relaxed and neutral. Smiling or squinting can introduce artificial asymmetry." },
                  { title: "Be Consistent", desc: "For the best results, try to scan yourself in the same environment and lighting each time." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">{i + 1}</div>
                    <div className="space-y-1">
                      <div className="text-sm font-black text-white uppercase tracking-widest">{item.title}</div>
                      <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">4. Embracing Your Unique Balance</h2>
              <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="text-emerald-400" size={24} />
                  <h3 className="text-lg font-black uppercase tracking-tight m-0">Character Over Perfection</h3>
                </div>
                <p className="text-white/70 leading-relaxed m-0">
                  While it's fun to explore your facial symmetry, remember that your unique features are what make you who you are. Asymmetry is often what gives a face its character, charm, and personality. Use this tool as a way to learn more about your facial structure, but don't let it define your sense of self-worth or beauty.
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
