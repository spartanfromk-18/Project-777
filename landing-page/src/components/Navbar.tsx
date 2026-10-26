import React, { useState } from 'react';
import { ShieldAlert, Github, Menu, X, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onCheckClick?: () => void;
  onSampleClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onCheckClick, onSampleClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 md:px-10 pt-4 pb-2 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#262633]">
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left pill: Brand with subtle indigo accent */}
        <a
          href="#"
          className="flex items-center gap-2.5 bg-[#13131B] hover:bg-[#1A1A24] transition-colors border border-[#262633] rounded-full pl-3.5 pr-5 py-2.5"
          aria-label="ScamShield Home"
        >
          <div className="w-7 h-7 rounded-full bg-[#6366F1]/15 flex items-center justify-center text-[#A1A1B0]">
            <ShieldAlert className="w-4 h-4 text-[#A1A1B0]" />
          </div>
          <span className="text-[#F4F4F6] text-sm font-semibold tracking-tight">
            ScamShield
          </span>
        </a>

        {/* Center pill (Desktop): Real navigation anchors */}
        <div className="hidden md:flex items-center gap-1 bg-[#13131B] border border-[#262633] rounded-full px-3 py-1.5">
          <button
            type="button"
            onClick={() => handleScroll('how-it-works')}
            className="text-[#A1A1B0] hover:text-[#F4F4F6] transition-colors text-sm px-4 py-2 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSampleClick) {
                onSampleClick();
              } else {
                handleScroll('checker');
              }
            }}
            className="text-[#A1A1B0] hover:text-[#F4F4F6] transition-colors text-sm px-4 py-2 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
          >
            Try a sample
          </button>
          <button
            type="button"
            onClick={() => handleScroll('safety')}
            className="text-[#A1A1B0] hover:text-[#F4F4F6] transition-colors text-sm px-4 py-2 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
          >
            Safety
          </button>
          <button
            type="button"
            onClick={() => handleScroll('faq')}
            className="text-[#A1A1B0] hover:text-[#F4F4F6] transition-colors text-sm px-4 py-2 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
          >
            FAQ
          </button>
          <a
            href="https://github.com/spartanfromk-18/Project-777"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#A1A1B0] hover:text-[#6366F1] transition-colors text-sm px-3.5 py-2 rounded-full"
            aria-label="GitHub Repository"
          >
            <Github className="w-3.5 h-3.5 text-[#A1A1B0]" />
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3 text-[#A1A1B0]" />
          </a>
        </div>

        {/* Right CTA button: White/Off-white button per rule (1) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onCheckClick) {
                onCheckClick();
              } else {
                handleScroll('checker');
              }
            }}
            className="bg-[#F4F4F6] text-[#0A0A0F] text-sm font-medium rounded-full px-5 sm:px-6 py-2.5 hover:bg-[#E2E2E6] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] cursor-pointer"
          >
            Check a message
          </button>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full bg-[#13131B] border border-[#262633] text-[#A1A1B0] hover:text-[#F4F4F6] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#A1A1B0]" /> : <Menu className="w-5 h-5 text-[#A1A1B0]" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 p-4 bg-[#13131B]/95 border border-[#262633] rounded-2xl flex flex-col gap-2 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => handleScroll('how-it-works')}
            className="text-left text-[#A1A1B0] hover:text-[#F4F4F6] text-sm py-2 px-3 rounded-lg hover:bg-[#1A1A24] transition-colors"
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSampleClick) {
                onSampleClick();
              } else {
                handleScroll('checker');
              }
              setMobileMenuOpen(false);
            }}
            className="text-left text-[#A1A1B0] hover:text-[#F4F4F6] text-sm py-2 px-3 rounded-lg hover:bg-[#1A1A24] transition-colors"
          >
            Try a sample
          </button>
          <button
            type="button"
            onClick={() => handleScroll('safety')}
            className="text-left text-[#A1A1B0] hover:text-[#F4F4F6] text-sm py-2 px-3 rounded-lg hover:bg-[#1A1A24] transition-colors"
          >
            Safety & 1930
          </button>
          <button
            type="button"
            onClick={() => handleScroll('faq')}
            className="text-left text-[#A1A1B0] hover:text-[#F4F4F6] text-sm py-2 px-3 rounded-lg hover:bg-[#1A1A24] transition-colors"
          >
            FAQ
          </button>
          <a
            href="https://github.com/spartanfromk-18/Project-777"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[#A1A1B0] hover:text-[#6366F1] text-sm py-2 px-3 rounded-lg hover:bg-[#1A1A24] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Github className="w-4 h-4 text-[#A1A1B0]" />
              GitHub Repository
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#A1A1B0]" />
          </a>
        </div>
      )}
    </header>
  );
};
