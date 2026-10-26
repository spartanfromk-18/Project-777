import React from 'react';
import { ClipboardPaste, Cpu, ShieldCheck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Paste or upload',
      description:
        'Copy any message from SMS, WhatsApp, Telegram, or email. You can also upload a clear screenshot of the chat or notification.',
      icon: <ClipboardPaste className="w-5 h-5 text-[#A1A1B0]" />,
      tag: 'Any text or screenshot',
    },
    {
      number: '02',
      title: 'Gemma checks it',
      description:
        'Our Gemma model analyzes urgency markers, suspicious phone numbers, shortened phishing URLs, and known Indian scam playbooks in under 10 seconds.',
      icon: <Cpu className="w-5 h-5 text-[#A1A1B0]" />,
      tag: 'Under 10 seconds',
    },
    {
      number: '03',
      title: 'Get verdict + red flags + next steps',
      description:
        'Receive a plain Hinglish verdict: SCAM, SUSPICIOUS, or LOOKS_SAFE. See the exact trap being used and what to do before losing money.',
      icon: <ShieldCheck className="w-5 h-5 text-[#A1A1B0]" />,
      tag: 'Clear next steps',
    },
  ];

  return (
    <section id="how-it-works" className="relative w-full py-16 md:py-24 bg-[#0A0A0F] border-t border-[#262633]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 mb-4">
            <span className="text-xs font-medium text-[#F4F4F6]">Simple 3-step workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F6] mb-4">
            How it works
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1B0]">
            No technical knowledge needed. Simple enough for parents and grandparents to use.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-[#13131B] border border-[#262633] rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#6366F1]/40 transition-colors relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-mono font-bold text-[#A1A1B0] group-hover:text-[#F4F4F6] transition-colors">
                    {step.number}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-[#1A1A24] border border-[#262633] flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#F4F4F6] mb-2.5">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1B0] leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#262633] flex items-center">
                <span className="text-[11px] font-medium text-[#A1A1B0] bg-[#1A1A24] px-3 py-1 rounded-full border border-[#262633]">
                  {step.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
