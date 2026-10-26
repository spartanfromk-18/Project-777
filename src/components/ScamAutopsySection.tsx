import React, { useState } from 'react';
import { Copy, Check, Users, ShieldAlert } from 'lucide-react';

export const ScamAutopsySection: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const autopsies = [
    {
      id: 'discom',
      title: 'The "Electricity Disconnection" Autopsy',
      impersonation: 'Electricity Board Officer / Discom Head',
      theTrap: 'Calls you at night, says light will be cut in 30 minutes due to unpaid bill.',
      whatTheyWant: 'Ask you to pay ₹10 recharge via a fake APK or AnyDesk app to mirror screen and steal OTP.',
      warning:
        '⚠️ Family Alert: Raat ko bijli bill katne ka message aaye toh ghabraiye mat. Kisi number par call ya link par click mat karo! Electricity department raat ko light nahi kaatta. Official Bijli counter ya app par check karein.',
    },
    {
      id: 'arrest',
      title: 'The "Digital Arrest & Narcotics" Autopsy',
      impersonation: 'Mumbai / Delhi Police Cyber Cell & CBI',
      theTrap: 'Says a FedEx parcel to Taiwan with fake passports & drugs was seized in your name.',
      whatTheyWant: 'Force you into a Skype/WhatsApp video call with fake police backdrops, then extort you to transfer money to a "Supreme Court RBI verification account".',
      warning:
        '⚠️ Alert: Police ya Customs ke naam par aane wale parcel seizure ya arrest wale call turant kaat dein! Indian law me "digital arrest" jaisa kuch nahi hota. Police kabhi video call par paise verify nahi karti.',
    },
    {
      id: 'kyc',
      title: 'The "Bank PAN & YONO Block" Autopsy',
      impersonation: 'SBI / HDFC Bank Security Department',
      theTrap: 'Sends SMS: "Account blocked today due to pending PAN card. Click bit.ly link".',
      whatTheyWant: 'Clone netbanking login page where you enter user ID, password, and OTP, allowing scammers to empty your account within 60 seconds.',
      warning:
        '⚠️ Parivaar savdhaan: Bank KYC ya PAN update karne ke liye SMS me aayi kisi bhi link par click mat karna. SBI ya koi bhi bank link nahi bhejta. Sirf official bank branch ya verified app me jao.',
    },
  ];

  const handleCopy = (id: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    } catch {
      fallbackCopyText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const fallbackCopyText = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {
      // ignore
    }
  };

  return (
    <section id="autopsy" className="relative w-full py-16 md:py-24 bg-[#0A0A0F] border-t border-[#262633]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 mb-4">
            <Users className="w-4 h-4 text-[#A1A1B0]" />
            <span className="text-xs font-medium text-[#F4F4F6]">Protect your loved ones</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F6] mb-4">
            Scam autopsy & family warnings
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1B0]">
            Scammers target our parents and elders with fear and confusion.
            Here is what they actually want, and the exact message you can copy to warn your family.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {autopsies.map((item) => (
            <div
              key={item.id}
              className="bg-[#13131B] border border-[#262633] rounded-3xl p-6 sm:p-7 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#F4F4F6] mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#A1A1B0] shrink-0" />
                  <span>{item.title}</span>
                </h3>

                <div className="space-y-3.5 text-xs sm:text-sm mb-6">
                  <div>
                    <span className="text-[#A1A1B0] block text-xs mb-0.5">
                      Who the scammer pretends to be:
                    </span>
                    <p className="text-[#F4F4F6] font-medium">
                      {item.impersonation}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#A1A1B0] block text-xs mb-0.5">
                      The psychological trap:
                    </span>
                    <p className="text-[#A1A1B0]">
                      {item.theTrap}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#A1A1B0] block text-xs mb-0.5">
                      What they actually want next:
                    </span>
                    <p className="text-[#F4F4F6] font-medium leading-relaxed">
                      {item.whatTheyWant}
                    </p>
                  </div>
                </div>
              </div>

              {/* Copyable Hinglish message box */}
              <div className="pt-4 border-t border-[#262633]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#A1A1B0] uppercase tracking-wider">
                    WhatsApp Warning Note
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.warning)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6366F1] ${
                      copiedId === item.id
                        ? 'bg-[rgba(47,163,107,0.16)] text-[#2FA36B] border border-[#2FA36B]/40'
                        : 'bg-[#1A1A24] hover:bg-[#262633] text-[#F4F4F6] border border-[#262633]'
                    }`}
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#2FA36B]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#A1A1B0]" />
                        <span>Copy for Family</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-[#F4F4F6] bg-[#1A1A24] border border-[#262633] p-3.5 rounded-2xl leading-relaxed font-sans select-text">
                  {item.warning}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
