import React from 'react';
import { ShieldAlert, Github, PhoneCall, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#0A0A0F] border-t border-[#262633] py-12 px-4 sm:px-6 md:px-10 text-[#A1A1B0] text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-[#262633]">
        <div>
          <div className="flex items-center gap-2 text-[#F4F4F6] font-bold text-base mb-2">
            <div className="w-6 h-6 rounded-full bg-[#6366F1]/15 text-[#A1A1B0] flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-[#A1A1B0]" />
            </div>
            <span>ScamShield</span>
          </div>
          <p className="max-w-md text-[#A1A1B0] text-xs leading-relaxed">
            Protecting families from digital arrest, phishing APKs, and SMS fraud using on-device intelligence and Gemma AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <a
            href="https://github.com/spartanfromk-18/Project-777"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#A1A1B0] hover:text-[#F4F4F6] transition-colors bg-[#13131B] border border-[#262633] px-4 py-2 rounded-full"
          >
            <Github className="w-4 h-4 text-[#A1A1B0]" />
            <span>GitHub: spartanfromk-18/Project-777</span>
            <ExternalLink className="w-3 h-3 text-[#A1A1B0]" />
          </a>

          <a
            href="tel:1930"
            className="flex items-center gap-2 text-[#E5484D] hover:underline transition-colors bg-[rgba(229,72,77,0.12)] border border-[#E5484D]/30 px-4 py-2 rounded-full font-medium"
          >
            <PhoneCall className="w-4 h-4 text-[#E5484D]" />
            <span>Helpline: 1930</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A1A1B0]">
        <p>
          ScamShield is an open, privacy-first community initiative. Never share banking OTPs with anyone.
        </p>
        <p className="flex items-center gap-1 text-[#A1A1B0]">
          Built for Indian digital safety
        </p>
      </div>
    </footer>
  );
};
