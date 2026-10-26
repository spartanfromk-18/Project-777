import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Is ScamShield 100% accurate?',
      a: 'No automated tool can ever guarantee 100% accuracy. That is why we NEVER claim "100% safe" or "guaranteed safe". If our verdict is LOOKS_SAFE, our rule is clear: still verify in the official app, and never share an OTP with anyone.',
    },
    {
      q: 'Does ScamShield save or read my personal messages?',
      a: 'In Local Mode, everything runs 100% on your device inside your browser — zero bytes leave your phone. In Production Mode, your text is sent only to get the verdict via the Gemini API and is never stored in any database. We do not require logins or phone numbers.',
    },
    {
      q: 'What should I do if I already clicked a link or sent money?',
      a: 'First step: call the National Cyber Crime Helpline at 1930 immediately. If you reported within 2–3 hours, police and banks can often freeze the recipient account before money is cashed out. Also inform your bank branch to block your card and netbanking.',
    },
    {
      q: 'Why are the verdicts and family warnings written in Hinglish?',
      a: 'Most scammers in India target parents, grandparents, and everyday citizens using fear in simple conversational language. Technical jargon like "DNS spoofing" does not protect anyone. Clear Hinglish like "Bijli board raat ko light nahi kaatta" saves families instantly.',
    },
    {
      q: 'Can I use ScamShield without internet (offline)?',
      a: 'Yes! Toggle to "Local Mode" in the checker. It runs all detection rules and the 6 golden scam cases directly inside your browser without needing any internet connection or remote server.',
    },
  ];

  return (
    <section id="faq" className="relative w-full py-16 md:py-24 bg-[#0A0A0F] border-t border-[#262633]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 mb-4">
            <HelpCircle className="w-4 h-4 text-[#A1A1B0]" />
            <span className="text-xs font-medium text-[#F4F4F6]">Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F6] mb-4">
            Common questions answered
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1B0]">
            Plain language answers with zero corporate speak.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#13131B] border border-[#262633] rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                >
                  <span className="text-base sm:text-lg font-semibold text-[#F4F4F6]">
                    {faq.q}
                  </span>
                  <div
                    className={`p-1.5 rounded-full bg-[#1A1A24] border border-[#262633] transition-transform ${
                      isOpen ? 'rotate-180 text-[#F4F4F6]' : 'text-[#A1A1B0]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 text-[#A1A1B0]" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[#A1A1B0] leading-relaxed border-t border-[#262633] font-sans">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
