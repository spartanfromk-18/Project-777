import React from 'react';
import { Lock, Cpu, Globe, ShieldAlert } from 'lucide-react';

export const PrivacySection: React.FC = () => {
  return (
    <section id="privacy" className="relative w-full py-16 md:py-24 bg-[#0A0A0F] border-t border-[#262633]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 mb-4">
            <Lock className="w-4 h-4 text-[#A1A1B0]" />
            <span className="text-xs font-medium text-[#F4F4F6]">Privacy, honestly</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F6] mb-4">
            No secrets. How we handle your data.
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1B0]">
            We believe trust comes from clarity, not vague legal disclaimers.
          </p>
        </div>

        {/* The Exact Dual-Mode Note Banner */}
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-[#13131B] border border-[#262633] text-left shadow-xl">
          <h3 className="text-base sm:text-lg font-bold text-[#F4F4F6] mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
            <span>Dual-Mode Architecture</span>
          </h3>

          {/* Exact required wording */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#1A1A24] border border-[#262633] text-sm sm:text-base text-[#F4F4F6] leading-relaxed font-sans mb-6">
            <p className="font-medium text-[#F4F4F6] mb-2">
              "Local mode: nothing leaves the device. Production mode: your message is sent only to get the verdict via Gemini API, never stored."
            </p>
            <p className="text-xs text-[#A1A1B0]">
              We never save message archives, we do not require account logins, and we never associate messages with your phone identity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#1A1A24] border border-[#262633]">
              <div className="flex items-center gap-2 text-[#F4F4F6] font-semibold text-sm mb-1.5">
                <Cpu className="w-4 h-4 text-[#A1A1B0]" />
                <span>Local Mode (On-Device)</span>
              </div>
              <p className="text-xs text-[#A1A1B0] leading-relaxed">
                Runs pure browser pattern matching and keyword heuristics. Zero bytes sent over any network. Functions completely offline.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#1A1A24] border border-[#262633]">
              <div className="flex items-center gap-2 text-[#F4F4F6] font-semibold text-sm mb-1.5">
                <Globe className="w-4 h-4 text-[#A1A1B0]" />
                <span>Production Mode (Gemma / Gemini)</span>
              </div>
              <p className="text-xs text-[#A1A1B0] leading-relaxed">
                Sends the message text solely to obtain an advanced neural verdict. Discarded immediately after analysis. Never stored in any database.
              </p>
            </div>
          </div>
        </div>

        {/* Honest Accuracy Notice - Never claim 100% safe */}
        <div className="p-5 rounded-2xl bg-[#13131B] border border-[#262633] flex items-start gap-3.5 text-xs sm:text-sm text-[#A1A1B0]">
          <ShieldAlert className="w-5 h-5 text-[#A1A1B0] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[#F4F4F6] font-semibold">Important Limitation:</strong>{' '}
            No automated engine is 100% foolproof. We never claim "guaranteed safe" or "100% safe".
            If a message says <span className="text-[#2FA36B] font-semibold">LOOKS_SAFE</span>, you must{' '}
            <strong className="text-[#F4F4F6]">still verify in the official app</strong>. If anyone asks you for an OTP, PIN, password, or urgent payment, always refuse.
          </div>
        </div>
      </div>
    </section>
  );
};
