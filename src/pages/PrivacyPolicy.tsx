import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, ServerOff, UserCheck, FileText } from 'lucide-react';

export default function PrivacyPolicy() {
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
              <Shield className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">Privacy Policy</h1>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">Last Updated: March 17, 2026</p>
          </header>

          <section className="prose prose-invert prose-emerald max-w-none space-y-8">
            <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-4">
                <ServerOff className="text-emerald-400" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight m-0">Zero Server Storage</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                Face Symmetry Pro is designed with a "Privacy by Design" philosophy. Unlike traditional facial analysis tools that upload your photos to a remote server for processing, our application performs all calculations locally on your device. When you grant camera access or upload a photo, the image data stays within your browser's memory. We do not have a backend database that stores your images, and we never transmit your biometric data over the internet.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">1. Information We Do Not Collect</h2>
              <p className="text-white/70 leading-relaxed">
                We believe that your face is your most private data. Therefore, we have built this tool to function without collecting any of the following:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                {[
                  { icon: <Eye size={18} />, text: "No Facial Images" },
                  { icon: <Lock size={18} />, text: "No Biometric Identifiers" },
                  { icon: <UserCheck size={18} />, text: "No Personal Identity" },
                  { icon: <FileText size={18} />, text: "No Account Information" }
                ].map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 text-sm font-bold text-white/80">
                    <span className="text-emerald-400">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">2. Local Processing Explained</h2>
              <p className="text-white/70 leading-relaxed">
                When you use our AI analysis, your browser uses a technology called WebGL and TensorFlow.js to run the machine learning models directly on your graphics card or processor. This means the "intelligence" happens on your phone or computer, not on our servers. Once you close the tab or refresh the page, all temporary image data is wiped from your device's RAM. There is no persistent storage of your face mesh or analysis results unless you explicitly choose to "Save" or "Download" the result card to your own device.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">3. Analytics and Cookies</h2>
              <p className="text-white/70 leading-relaxed">
                To improve the user experience and monitor the technical health of the application, we may use basic, anonymized analytics (such as Google Analytics). These tools collect non-identifiable information like browser type, device category, and which features are most used. We do not use tracking cookies for advertising purposes, and we do not sell any data to third parties. Our goal is to build a great tool, not a data profile.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">4. Third-Party Services</h2>
              <p className="text-white/70 leading-relaxed">
                Our application uses MediaPipe and TensorFlow.js libraries to perform the facial landmark detection. These libraries are loaded from content delivery networks (CDNs). While these services may log basic request data (like your IP address) to serve the files, they do not receive your camera feed or any image data from our application.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">5. User Control and Consent</h2>
              <p className="text-white/70 leading-relaxed">
                By using Face Symmetry Pro, you consent to the local processing of your images for the purpose of symmetry analysis. You can revoke camera permissions at any time through your browser settings. Since we do not store any data, there is no "account" to delete or "data" to request—your privacy is naturally protected by the architecture of the app.
              </p>
            </div>

            <div className="pt-12 border-t border-white/10">
              <p className="text-white/40 text-sm">
                If you have any questions about this Privacy Policy or how we handle your data, please feel free to contact us through our official channels. We are committed to transparency and user security.
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
