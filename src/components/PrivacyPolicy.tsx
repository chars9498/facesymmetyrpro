import React from 'react';
import { ShieldCheck, X, Lock, EyeOff, ServerOff, Database } from 'lucide-react';
import { motion } from 'motion/react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0A0A0B] overflow-y-auto p-6 md:p-12"
    >
      <div className="max-w-3xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-[#0A0A0B] py-4 border-b border-white/5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Privacy <span className="text-emerald-500">Policy</span></h1>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
          >
            <X size={24} />
          </button>
        </div>

        {/* Hero Section */}
        <section className="space-y-6">
          <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-4">
            <h2 className="text-xl font-bold text-emerald-400">Privacy-First Architecture</h2>
            <p className="text-white/70 leading-relaxed">
              Face Symmetry Pro is designed with a strict privacy-first approach. We believe your biometric data is yours alone. Our app is built to function entirely on your device without ever needing to upload your photos to a server.
            </p>
          </div>
        </section>

        {/* Key Points */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><ServerOff size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">No Server Uploads</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Your photos are processed locally in your browser/app memory. They are never transmitted to our servers or any third-party cloud.
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><Database size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">No Data Storage</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              We do not store your photos. Once you close the app or reset the analysis, the processed image data is cleared from memory.
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><Lock size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">No Accounts</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              You don't need to create an account to use Face Symmetry Pro. We don't collect your name, email, or any personal identifiers.
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><EyeOff size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">On-Device AI</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              The facial landmark detection and symmetry analysis are performed using on-device machine learning models (MediaPipe).
            </p>
          </div>
        </section>

        {/* Detailed Policy */}
        <section className="space-y-8 text-white/70">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed">
              Face Symmetry Pro **does not collect, store, or share** any personal information or biometric data. 
              The app requires access to your camera or photo library solely to perform the analysis you request. 
              This access is handled by the system's standard photo picker or camera interface.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">2. How We Use Information</h2>
            <p className="text-sm leading-relaxed">
              Any photo you provide is used **only** for the duration of the analysis session. 
              The mathematical landmarks extracted from your face are used to calculate symmetry scores and are discarded immediately after.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">3. Third-Party Services</h2>
            <p className="text-sm leading-relaxed">
              We use Google's MediaPipe for on-device facial recognition. This library runs locally and does not send your facial data to Google servers during the analysis process in this application.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">4. Not a Medical Tool</h2>
            <p className="text-sm leading-relaxed">
              Face Symmetry Pro is a **reference analysis tool** for aesthetic and educational purposes. 
              It is **not a medical diagnostic app**. The results provided are based on geometric calculations and should not be used for medical or surgical decisions.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">5. Contact Us</h2>
            <p className="text-sm leading-relaxed">
              If you have any questions about our privacy practices, please contact us at chars9498@gmail.com.
            </p>
          </div>
        </section>

        <footer className="pt-12 border-t border-white/5 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">
            Last Updated: March 14, 2026
          </p>
        </footer>
      </div>
    </motion.div>
  );
};
