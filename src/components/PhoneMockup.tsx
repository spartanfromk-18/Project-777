import React from 'react';
import { MessageSquare, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const PhoneMockup: React.FC = () => {
  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] select-none">
      {/* Subtle brand outer glow */}
      <div className="absolute -inset-1.5 bg-[#6366F1]/10 rounded-[44px] blur-xl opacity-75 -z-10" />

      {/* Phone chassis */}
      <div className="relative bg-[#13131B] border-4 border-[#262633] rounded-[40px] p-3 shadow-2xl shadow-black/80">
        {/* Dynamic Island / Notch */}
        <div className="flex justify-center mb-3">
          <div className="h-4 w-28 bg-[#0A0A0F] rounded-full border border-[#262633] flex items-center justify-end px-2">
            <div className="h-2 w-2 rounded-full bg-[#262633]" />
          </div>
        </div>

        {/* Screen Content */}
        <div className="bg-[#0A0A0F] rounded-[28px] p-4 flex flex-col gap-3 border border-[#262633]">
          {/* Status bar */}
          <div className="flex items-center justify-between text-[11px] text-[#A1A1B0] px-1 font-mono">
            <span>9:41 AM</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 rounded-xs border border-[#A1A1B0] p-0.5">
                <div className="w-full h-full bg-[#A1A1B0] rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Incoming Scam SMS Notification */}
          <div className="bg-[#13131B] border border-[#262633] rounded-2xl p-3.5 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#A1A1B0]" />
                <span className="text-xs font-semibold text-[#F4F4F6]">
                  SMS · +91-9876543210
                </span>
              </div>
              <span className="text-[10px] text-[#A1A1B0]">Just now</span>
            </div>
            <p className="text-xs text-[#F4F4F6] leading-relaxed font-sans">
              "Dear consumer your electricity power will disconnect tonight 9:30 PM
              from office because bill was not updated. Contact officer Mr Sharma
              immediately: 9876543210"
            </p>
          </div>

          {/* Floating Soft Tinted SCAM Verdict Card (per Rule 2 & 4: soft tinted bg, High confidence, no solid bright blocks) */}
          <div className="relative bg-[rgba(229,72,77,0.12)] border border-[#E5484D]/40 rounded-2xl p-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[rgba(229,72,77,0.14)] flex items-center justify-center text-[#E5484D]">
                  <AlertOctagon className="w-4 h-4 text-[#E5484D]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#E5484D] tracking-wider">
                      SCAM VERDICT
                    </span>
                    <span className="bg-[rgba(229,72,77,0.15)] text-[#E5484D] text-[10px] font-semibold px-1.5 py-0.5 rounded border border-[#E5484D]/30">
                      High confidence
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A1A1B0]">Electricity Bill Phishing</p>
                </div>
              </div>
            </div>

            {/* Red flags snippet */}
            <div className="space-y-1.5 pt-1 border-t border-[#E5484D]/20">
              <div className="flex items-start gap-1.5 text-[11px] text-[#F4F4F6]">
                <span className="text-[#E5484D] shrink-0 font-bold">✕</span>
                <span>Fake 9:30 PM urgency deadline</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#F4F4F6]">
                <span className="text-[#E5484D] shrink-0 font-bold">✕</span>
                <span>Personal mobile number given instead of official Discom portal</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#F4F4F6]">
                <span className="text-[#E5484D] shrink-0 font-bold">✕</span>
                <span>Electricity boards never cut power over random SMS</span>
              </div>
            </div>

            {/* Immediate Action Pill */}
            <div className="mt-3 bg-[#13131B] border border-[#262633] rounded-xl px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#F4F4F6]">
                What to do next
              </span>
              <span className="text-[10px] text-[#A1A1B0] font-mono">
                Do NOT call · Block
              </span>
            </div>
          </div>

          {/* Clean status badge without fake timing (per Rule 4) */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#A1A1B0] pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#A1A1B0]" />
            <span>Gemma analysis ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
