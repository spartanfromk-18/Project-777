import React from 'react';
import { DESCRIPTION_TEXT } from '../data/landingData.ts';

export const ForegroundHero: React.FC = () => {
  return (
    <div className="relative h-full w-full pointer-events-none select-none">
      {/* Stat block — top-right */}
      <div className="absolute right-6 md:right-24 top-[14%]">
        <div className="flex items-center gap-3 justify-end">
          <div className="hidden md:block h-px w-24 bg-white/40 rotate-[20deg]" />
          <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">
            +65k
          </span>
        </div>
        <p className="text-xs md:text-sm text-white/70 mt-1 text-right">
          startups use
        </p>
      </div>

      {/* Headline word 1: protect */}
      <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-4 md:left-10 top-[18%]">
        protect
      </h1>

      {/* Description paragraph */}
      <p className="absolute left-6 md:left-10 top-[46%] max-w-[240px] text-[15px] leading-snug text-white/90">
        {DESCRIPTION_TEXT}
      </p>

      {/* Headline word 2: your */}
      <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] right-4 md:right-10 top-[38%]">
        your
      </h1>

      {/* Headline word 3: data */}
      <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-[18%] md:left-[28%] top-[58%]">
        data
      </h1>

      {/* Stat block — bottom-left */}
      <div className="absolute left-6 md:left-20 bottom-20 md:bottom-24">
        <div className="flex items-center gap-3">
          <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">
            +1.5b
          </span>
          <div className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" />
        </div>
        <p className="text-xs md:text-sm text-white/70 mt-1">
          gb data was protected
        </p>
      </div>

      {/* Stat block — bottom-right */}
      <div className="absolute right-6 md:right-20 bottom-16 md:bottom-20">
        <div className="flex items-center gap-3 justify-end">
          <div className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" />
          <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">
            +300k
          </span>
        </div>
        <p className="text-xs md:text-sm text-white/70 mt-1 text-right">
          downloads
        </p>
      </div>

      {/* Bottom gradient overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
    </div>
  );
};
