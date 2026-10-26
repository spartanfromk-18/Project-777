import React from 'react';
import { PhoneCall, ShieldAlert, Ban, ExternalLink, KeyRound } from 'lucide-react';

export const SafetySection: React.FC = () => {
  const safetyRules = [
    {
      rule: "Don't click",
      desc: 'Never click links inside SMS or WhatsApp (especially bit.ly, tinyurl, or .apk files). Open your bank or service app manually.',
      icon: <Ban className="w-5 h-5 text-[#A1A1B0]" />,
    },
    {
      rule: "Don't pay",
      desc: 'No government agency, electricity discom, or lottery asks you to transfer money to "release a prize" or "avoid arrest".',
      icon: <ShieldAlert className="w-5 h-5 text-[#A1A1B0]" />,
    },
    {
      rule: "Don't share OTP",
      desc: 'Never share any OTP, PIN, password, or card expiry with anyone over a call or chat. Even bank managers cannot ask for OTP.',
      icon: <KeyRound className="w-5 h-5 text-[#A1A1B0]" />,
    },
    {
      rule: 'Block the sender',
      desc: 'Immediately block the number on your phone and messaging apps so they cannot harass you with follow-up threats.',
      icon: <Ban className="w-5 h-5 text-[#A1A1B0]" />,
    },
    {
      rule: 'Report on 1930',
      desc: 'Report the phone number and message on the National Cyber Crime Reporting Portal at cybercrime.gov.in or call 1930.',
      icon: <PhoneCall className="w-5 h-5 text-[#A1A1B0]" />,
    },
  ];

  return (
    <section id="safety" className="relative w-full py-16 md:py-24 bg-[#0A0A0F] border-t border-[#262633]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        {/* Urgent Emergency Callout Box (Soft tinted background per Rule 2) */}
        <div className="mb-14 p-6 sm:p-8 rounded-3xl bg-[rgba(229,72,77,0.12)] border border-[#E5484D]/40 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(229,72,77,0.16)] text-[#E5484D] flex items-center justify-center shrink-0">
                <PhoneCall className="w-6 h-6 text-[#E5484D]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#E5484D]">
                  Critical Emergency Step
                </span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#F4F4F6] mt-1">
                  If money was already sent, your first step is call 1930 immediately.
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1B0] mt-2 max-w-2xl leading-relaxed">
                  The Indian Cyber Crime Helpline (1930) operates 24/7. Calling within the first 2–3 hours
                  enables police and banks to put a lien/freeze on the fraudster's account before the money is withdrawn at an ATM.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              <a
                href="tel:1930"
                className="bg-[#E5484D] hover:bg-[#d43f44] text-[#F4F4F6] font-bold text-sm sm:text-base px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <PhoneCall className="w-4 h-4 text-[#F4F4F6]" />
                <span>Call 1930 Helpline</span>
              </a>
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#13131B] hover:bg-[#1A1A24] text-[#F4F4F6] border border-[#262633] text-xs sm:text-sm font-medium px-5 py-3.5 rounded-full flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>cybercrime.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#A1A1B0]" />
              </a>
            </div>
          </div>
        </div>

        {/* The 5 Golden Safety Rules */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 mb-4">
            <span className="text-xs font-medium text-[#F4F4F6]">5 Golden Rules of Digital Safety</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F6] mb-4">
            What to do when targeted
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1B0]">
            Keep these simple principles in mind. Never let panic override your common sense.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {safetyRules.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#13131B] border border-[#262633] rounded-3xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#1A1A24] border border-[#262633] flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h4 className="text-base font-bold text-[#F4F4F6] mb-2">
                  {item.rule}
                </h4>
                <p className="text-xs text-[#A1A1B0] leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#262633] text-[11px] font-mono text-[#A1A1B0]/80">
                Rule #{idx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
