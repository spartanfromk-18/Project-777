import React from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { Checker } from './components/Checker.tsx';
import { HowItWorks } from './components/HowItWorks.tsx';
import { ExampleVerdicts } from './components/ExampleVerdicts.tsx';
import { ScamAutopsySection } from './components/ScamAutopsySection.tsx';
import { PrivacySection } from './components/PrivacySection.tsx';
import { SafetySection } from './components/SafetySection.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { Footer } from './components/Footer.tsx';

export default function App() {
  const scrollToChecker = () => {
    const el = document.getElementById('checker');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToSamples = () => {
    const el = document.getElementById('samples');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F4F4F6] selection:bg-[#6366F1]/30 selection:text-[#F4F4F6] flex flex-col">
      {/* 1. Sticky Pill Nav */}
      <Navbar onCheckClick={scrollToChecker} onSampleClick={scrollToSamples} />

      <main className="flex-1">
        {/* 2. Hero with big headline, subheadline, CTAs, and phone mockup */}
        <Hero onCheckClick={scrollToChecker} onSampleClick={scrollToSamples} />

        {/* 3. Live Checker with 6 Golden Cases, screenshot upload, autopsy & family warning */}
        <Checker />

        {/* 4. How It Works: 1. Paste, 2. Gemma checks, 3. Get verdict */}
        <HowItWorks />

        {/* 5. Example Verdict: SCAM vs LOOKS_SAFE (with official app note) */}
        <ExampleVerdicts />

        {/* 6. Scam Autopsy + Family Warning */}
        <ScamAutopsySection />

        {/* 7. Privacy, honestly (Exact dual-mode note) */}
        <PrivacySection />

        {/* 8. Safety: 5 golden rules + Call 1930 first if money sent */}
        <SafetySection />

        {/* 9. FAQ: 5 common questions in simple language */}
        <FaqSection />
      </main>

      {/* 10. Footer with GitHub repo link & 1930 banner */}
      <Footer />
    </div>
  );
}
