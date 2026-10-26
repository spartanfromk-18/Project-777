import React from 'react';
import { ArrowDown, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { PhoneMockup } from './PhoneMockup.tsx';

interface HeroProps {
  onCheckClick: () => void;
  onSampleClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onCheckClick, onSampleClick }) => {
  return (
    <section className="relative w-full overflow-hidden bg-[#0A0A0F] pt-12 md:pt-16 pb-20 md:pb-28">
      {/* Background ambient lighting and subtle brand glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-[#6366F1]/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Grid line texture */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#26263320_1px,transparent_1px),linear-gradient(to_bottom,#26263320_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            {/* Tag chip with brand indigo accent */}
            <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 w-fit mb-6">
              <span className="flex h-2 w-2 rounded-full bg-[#6366F1]" />
              <span className="text-xs font-medium text-[#F4F4F6]">
                AI scam detection powered by Gemma
              </span>
            </div>

            {/* Giant bold headline */}
            <h1 className="hero-title text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#F4F4F6] mb-6">
              Is this message a scam? <br />
              <span className="text-[#A1A1B0]">Find out in 10 seconds.</span>
            </h1>

            {/* Clear subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-[#A1A1B0] leading-relaxed max-w-2xl mb-8 font-normal">
              Paste a message or upload a screenshot. Gemma gives you a verdict in
              simple Hinglish — <span className="text-[#E5484D] font-semibold">SCAM</span>,{' '}
              <span className="text-[#F5A623] font-semibold">SUSPICIOUS</span>, or{' '}
              <span className="text-[#2FA36B] font-semibold">LOOKS_SAFE</span> — with the
              exact red flags, the trick used, and what to do next.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 mb-10">
              {/* White/Off-white CTA button per Rule (1) */}
              <button
                type="button"
                onClick={onCheckClick}
                className="bg-[#F4F4F6] text-[#0A0A0F] text-sm sm:text-base font-medium rounded-full px-7 py-3.5 hover:bg-[#E2E2E6] transition-colors shadow-lg shadow-black/40 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              >
                <span>Check a message</span>
                <ArrowDown className="w-4 h-4 text-[#0A0A0F]" />
              </button>

              {/* Secondary button */}
              <button
                type="button"
                onClick={onSampleClick}
                className="bg-[#13131B] text-[#F4F4F6] border border-[#262633] text-sm sm:text-base font-medium rounded-full px-7 py-3.5 hover:bg-[#1A1A24] transition-colors flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              >
                <Sparkles className="w-4 h-4 text-[#A1A1B0]" />
                <span>Try a sample</span>
              </button>
            </div>

            {/* Micro value badges: monochrome muted icons (#A1A1B0) per Rule 3 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-[#262633]">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#A1A1B0]">
                <ShieldCheck className="w-4 h-4 text-[#A1A1B0] shrink-0" />
                <span>Zero login needed</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#A1A1B0]">
                <Zap className="w-4 h-4 text-[#A1A1B0] shrink-0" />
                <span>Works on-device</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#A1A1B0] col-span-2 sm:col-span-1">
                <span className="w-2 h-2 rounded-full bg-[#A1A1B0] shrink-0" />
                <span>Hinglish family alerts</span>
              </div>
            </div>
          </div>

          {/* Right Column: Phone Mockup */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
};
