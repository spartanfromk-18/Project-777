import React from 'react';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

export const ExampleVerdicts: React.FC = () => {
  return (
    <section id="examples" className="relative w-full py-16 md:py-24 bg-[#0A0A0F] border-t border-[#262633]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 mb-4">
            <span className="text-xs font-medium text-[#F4F4F6]">Side-by-side comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F6] mb-4">
            Example verdicts
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1B0]">
            See how ScamShield dissects fraudulent threats versus legitimate transactional messages.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Example 1: SCAM (Soft tinted card border and badge per Rule 2) */}
          <div className="bg-[#13131B] border border-[#262633] rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Badge & header */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[rgba(229,72,77,0.14)] text-[#E5484D] flex items-center justify-center">
                    <AlertOctagon className="w-5 h-5 text-[#E5484D]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#E5484D]">
                      High Risk Detected
                    </span>
                    <h3 className="text-lg font-bold text-[#F4F4F6]">Verdict: SCAM</h3>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(229,72,77,0.12)] text-[#E5484D] border border-[#E5484D]/30 font-medium">
                  Electricity Fraud
                </span>
              </div>

              {/* Quoted message in surface-2 */}
              <div className="bg-[#1A1A24] border border-[#262633] rounded-2xl p-4 mb-5 text-xs sm:text-sm text-[#F4F4F6] font-mono leading-relaxed select-text">
                "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM
                from electricity office because your previous month bill was not updated. Please
                immediately contact our electricity officer Mr. Sharma at 9876543210. Thank you."
              </div>

              {/* Quoted Red flags */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#A1A1B0] uppercase tracking-wider">
                  Quoted Red Flags:
                </h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2 text-[#A1A1B0]">
                    <span className="text-[#E5484D] font-bold">✕</span>
                    <span>
                      <strong className="text-[#F4F4F6]">Urgency Trap:</strong> "tonight at 9:30 PM" forces instant panic before you can verify with your family.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[#A1A1B0]">
                    <span className="text-[#E5484D] font-bold">✕</span>
                    <span>
                      <strong className="text-[#F4F4F6]">Unofficial Contact:</strong> "Mr. Sharma at 9876543210" is a personal phone number, not an official discom customer helpline.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[#A1A1B0]">
                    <span className="text-[#E5484D] font-bold">✕</span>
                    <span>
                      <strong className="text-[#F4F4F6]">Procedural Lie:</strong> Discoms are legally required to issue written registered notices before any power disconnection.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict action */}
            <div className="mt-6 pt-4 border-t border-[#262633] flex items-center justify-between text-xs text-[#A1A1B0]">
              <span>Next step: Do NOT call</span>
              <span className="text-[#E5484D] font-medium">Block & Report</span>
            </div>
          </div>

          {/* Example 2: LOOKS_SAFE (Soft tinted card border and badge per Rule 2) */}
          <div className="bg-[#13131B] border border-[#262633] rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Badge & header */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[rgba(47,163,107,0.14)] text-[#2FA36B] flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[#2FA36B]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#2FA36B]">
                      Standard Transactional
                    </span>
                    <h3 className="text-lg font-bold text-[#F4F4F6]">Verdict: LOOKS_SAFE</h3>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(47,163,107,0.12)] text-[#2FA36B] border border-[#2FA36B]/30 font-medium">
                  Authentication OTP
                </span>
              </div>

              {/* Quoted message in surface-2 */}
              <div className="bg-[#1A1A24] border border-[#262633] rounded-2xl p-4 mb-5 text-xs sm:text-sm text-[#F4F4F6] font-mono leading-relaxed select-text">
                "482910 is your secret Swiggy verification OTP. Do NOT share this code with anyone,
                including delivery partners or customer support. Valid for 10 minutes."
              </div>

              {/* Quoted Red flags check */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#A1A1B0] uppercase tracking-wider">
                  Security Analysis:
                </h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2 text-[#A1A1B0]">
                    <span className="text-[#2FA36B] font-bold">✓</span>
                    <span>
                      <strong className="text-[#F4F4F6]">Contains explicit warning:</strong> "Do NOT share this code with anyone".
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[#A1A1B0]">
                    <span className="text-[#2FA36B] font-bold">✓</span>
                    <span>
                      <strong className="text-[#F4F4F6]">Zero phishing links:</strong> No shortened URLs, bit.ly, or third-party web portals.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[#A1A1B0]">
                    <span className="text-[#2FA36B] font-bold">✓</span>
                    <span>
                      <strong className="text-[#F4F4F6]">Standard short validity:</strong> Code expires in 10 minutes.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Crucial mandatory disclaimer note in soft tinted box */}
            <div className="mt-6 pt-4 border-t border-[#262633] bg-[rgba(47,163,107,0.08)] -mx-6 -mb-6 p-4 rounded-b-3xl border border-[#2FA36B]/20 text-xs text-[#2FA36B]">
              <strong className="font-semibold block mb-0.5">Mandatory Safety Rule:</strong>
              LOOKS_SAFE — still verify in the official app. If anyone calls asking for this OTP, NEVER share it.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
