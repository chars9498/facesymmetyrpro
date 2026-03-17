import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Trophy, Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 py-12 px-6 mt-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3BFF9C] to-[#2ee68a] flex items-center justify-center shadow-[0_0_15px_rgba(59,255,156,0.2)]">
                <Shield className="text-black" size={16} strokeWidth={2.5} />
              </div>
              <h2 className="text-sm font-black italic tracking-tighter uppercase">Face Symmetry Pro</h2>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed font-medium">
              AI-powered facial asymmetry analysis tool. Get detailed feedback on your facial balance directly in your browser.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 font-mono">Resources</h3>
            <nav className="flex flex-col gap-2">
              <Link to="/privacy" className="text-[11px] font-bold text-white/60 hover:text-[#3BFF9C] transition-colors flex items-center gap-2">
                <Shield size={12} /> Privacy Policy
              </Link>
              <Link to="/how-it-works" className="text-[11px] font-bold text-white/60 hover:text-[#3BFF9C] transition-colors flex items-center gap-2">
                <Zap size={12} /> How It Works
              </Link>
              <Link to="/guide" className="text-[11px] font-bold text-white/60 hover:text-[#3BFF9C] transition-colors flex items-center gap-2">
                <Trophy size={12} /> Face Symmetry Guide
              </Link>
            </nav>
          </div>

          {/* Connect Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 font-mono">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <Twitter size={14} />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <Github size={14} />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <Mail size={14} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
            © 2026 Face Symmetry Pro. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/" className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/privacy" className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/how-it-works" className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors">
              Technology
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
