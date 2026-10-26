export interface GoldenCase {
  id: string;
  tag: string;
  title: string;
  text: string;
  verdict: 'SCAM' | 'SUSPICIOUS' | 'LOOKS_SAFE';
  confidence: number;
  summary: string;
  redFlags: string[];
  trickUsed: string;
  impersonating: string;
  whatTheyWant: string;
  nextSteps: string[];
  familyWarning: string;
}

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'electricity-bill',
    tag: '⚡ Bijli Bill',
    title: 'Electricity Power Cut at 9:30 PM',
    text: 'Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated. Please immediately contact our electricity officer Mr. Sharma at 9876543210. Thank you.',
    verdict: 'SCAM',
    confidence: 99,
    summary: 'Fake electricity disconnection warning designed to make you panic and call a scammer.',
    redFlags: [
      'Panic deadline ("tonight at 9:30 PM") designed to prevent you from checking facts.',
      'Unofficial 10-digit mobile number given instead of official electricity discom helpline.',
      'State electricity boards never cut power without sending formal printed billing notices.',
      'Unsolicited SMS from an unknown personal sender, not an official government SMS header.',
    ],
    trickUsed: 'Artificial urgency and fear of power cut to make you call in a rush.',
    impersonating: 'State Electricity Board (Discom) Officer',
    whatTheyWant: 'They want you to call, install a remote screen-share app (AnyDesk/TeamViewer), and pay a fake ₹10 bill to steal your netbanking OTP.',
    nextSteps: [
      'Do NOT call 9876543210 or any number in the message.',
      'Check your actual bill status directly on your official discom app or bill counter.',
      'Block and report this number as spam on your phone.',
      'If money was deducted, immediately call the National Cyber Helpline 1930.',
    ],
    familyWarning: '⚠️ Parivaar Alert: Bijli bill cut hone ka message aaye toh kisi personal number par call ya link click mat karo! Electricity board raat ko 9:30 baje light nahi kaatta. Sirf official Bijli app ya bill slip par check karo.',
  },
  {
    id: 'bank-kyc-pan',
    tag: '🏦 Bank KYC',
    title: 'Bank PAN & Account Block Threat',
    text: 'Dear SBI Customer, your SBI YONO account has been blocked today due to pending PAN card update. Kindly click here to update your KYC immediately: http://bit.ly/sbi-kyc-pan-update to avoid permanent suspension.',
    verdict: 'SCAM',
    confidence: 99,
    summary: 'Phishing scam impersonating SBI to steal your banking passwords and OTPs.',
    redFlags: [
      'Suspicious shortened link (bit.ly/sbi-kyc-pan-update) leading to a clone phishing portal.',
      'Urgent threat of "permanent suspension" and "blocked today" to force immediate action.',
      'Indian banks never send links in SMS to update KYC or PAN.',
      'RBI strictly forbids banks from asking customers to update credentials via SMS links.',
    ],
    trickUsed: 'Account blockage fear to push you to enter credentials on a fake website.',
    impersonating: 'State Bank of India (SBI) YONO Security Department',
    whatTheyWant: 'They want you to open the fake link, enter your user ID, password, PAN, and forward the OTP to drain your savings account.',
    nextSteps: [
      'Never click http://bit.ly/... or any link sent via SMS.',
      'Log in only through the verified SBI YONO official app downloaded from Play Store / App Store.',
      'Forward the spam SMS to 1909 or report it to your bank branch.',
      'If you entered credentials, freeze your card and netbanking immediately via official bank customer care.',
    ],
    familyWarning: '⚠️ Parivaar savdhaan: Bank KYC ya PAN update karne ke liye SMS me aayi kisi bhi link par click mat karna. SBI ya koi bhi bank kabhi link nahi bhejta. Sirf official bank branch ya verified app me jao.',
  },
  {
    id: 'part-time-job',
    tag: '💼 Like & Earn',
    title: 'YouTube Like & Earn ₹3,000 Daily',
    text: "Hello! We offer part-time remote work. Just like YouTube videos & subscribe to earn ₹150 per video. Earn ₹3,000 to ₹8,000 daily. Payouts transferred directly to UPI. Reply 'YES' on Telegram: @earn_online_hr",
    verdict: 'SCAM',
    confidence: 98,
    summary: 'Prepaid task fraud promising huge daily returns for zero effort.',
    redFlags: [
      'Unrealistic payment: ₹150 per video like or ₹3,000-₹8,000 daily requires zero skill and does not exist in real business.',
      'Redirects to Telegram (@earn_online_hr) where anonymous scammers cannot be traced.',
      'Classic task scam playbook: pays ₹200 initially, then demands ₹5,000-₹50,000 "crypto recharge" to release earnings.',
      'No registered company name, no employment contract, no official corporate email address.',
    ],
    trickUsed: 'Greed and quick money lure, followed by the sunk cost trap on Telegram.',
    impersonating: 'Global Digital Marketing Recruiter / YouTube HR Partner',
    whatTheyWant: 'They give you ₹200 to win your trust, then convince you to deposit your own money for "VIP tasks" and block you when you ask to withdraw.',
    nextSteps: [
      'Do not reply or join any Telegram / WhatsApp work-from-home group.',
      'Remember: no legitimate company pays ₹3,000 daily to like YouTube clips.',
      'Block the sender on WhatsApp/Telegram immediately.',
      'Report task fraud schemes to cybercrime.gov.in.',
    ],
    familyWarning: '⚠️ Alert: YouTube like karke roz ₹3,000 kamane wale messages 100% fraud hote hain! Shuru me ₹200 dekar baad me laakhon rupaye invest karwate hain aur loot lete hain. Kisi ko paise mat bhejna.',
  },
  {
    id: 'fedex-customs',
    tag: '📦 Digital Arrest',
    title: 'FedEx Parcel Narcotics Seizure',
    text: 'FedEx Alert: Your parcel tracking #IN-88942 consigned to Taiwan containing 5 passports, 16 expired debit cards, and 140g MDMA narcotics has been seized by Mumbai Customs. Press 1 to connect with Crime Branch Cyber Cell immediately.',
    verdict: 'SCAM',
    confidence: 100,
    summary: 'Infamous "Digital Arrest" extortion scam threatening police action and fake narcotics charges.',
    redFlags: [
      'Couriers do not connect live calls directly to police or Crime Branch officers over automated menus.',
      'Digital arrest is not recognized under Indian law: Police, CBI, or Customs NEVER interrogate people via Skype or video call.',
      'Claims of fake contraband (MDMA drugs, fake passports) designed to trigger extreme terror.',
      'Legitimate law enforcement sends official summons in person or via official postal channels, never SMS IVRs.',
    ],
    trickUsed: 'Extreme intimidation and fear of arrest to isolate you from your family.',
    impersonating: 'FedEx Courier & Mumbai Police Crime Branch Cyber Cell',
    whatTheyWant: 'Get you on a Skype video call with fake police uniforms, threaten you with jail, and force you to transfer money to a "safe RBI account" to prove innocence.',
    nextSteps: [
      'Cut the call or delete the message immediately. You are not under arrest.',
      'There is no such legal thing as "digital arrest" in India.',
      'Do NOT transfer money to any "police verification account" or "RBI security account".',
      'Report the extortion attempt immediately on 1930.',
    ],
    familyWarning: '⚠️ Urgent Family Alert: Police ya Customs ke naam par aane wale parcel seizure ya arrest wale call turant cut karo! Indian police kabhi WhatsApp/Skype par arrest ya paise verify nahi karti.',
  },
  {
    id: 'kbc-lottery',
    tag: '🎟️ KBC Lottery',
    title: 'KBC ₹25 Lakh WhatsApp Lottery',
    text: 'Congratulations! Your mobile number won ₹25,00,000 in Kaun Banega Crorepati All India SIM Card Lucky Draw 2026. Contact KBC Manager Rana Pratap Singh on WhatsApp +91-9123456789 with file number #KBC-25 to claim cheque.',
    verdict: 'SCAM',
    confidence: 99,
    summary: 'Lottery advance fee fraud asking for processing tax to release imaginary prize money.',
    redFlags: [
      'You cannot win a lottery you never bought a ticket or entered into.',
      'KBC and Sony TV have officially announced they NEVER conduct SIM card lotteries.',
      'Personal WhatsApp number and bogus "file number" used instead of official television networks.',
      'Advance fee trap: scammers will ask for "refundable GST" or "processing fee" before releasing funds.',
    ],
    trickUsed: 'Lure of instant wealth to exploit people into paying upfront processing fees.',
    impersonating: 'Kaun Banega Crorepati (KBC) Prize Department / Sony Entertainment',
    whatTheyWant: 'They ask you to pay ₹12,500 file charge, then ₹35,000 RBI tax, vanishing once money is sent.',
    nextSteps: [
      'Do not message the WhatsApp number or forward the banner.',
      'Remember: no genuine lottery asks you to pay fees to receive winnings.',
      'Delete the message and advise friends/family not to fall for KBC claims.',
    ],
    familyWarning: '⚠️ Parivaar dhyan dein: KBC ya lottery me 25 laakh jeetne ka koi bhi message jhooth hai! Lottery claim ke liye kabhi koi tax ya processing fee advance me mat do.',
  },
  {
    id: 'genuine-otp',
    tag: '🛡️ Service OTP',
    title: 'Swiggy Verification OTP (Control)',
    text: '482910 is your secret Swiggy verification OTP. Do NOT share this code with anyone, including delivery partners or customer support. Valid for 10 minutes.',
    verdict: 'LOOKS_SAFE',
    confidence: 96,
    summary: 'Standard authentication OTP containing explicit security warnings.',
    redFlags: [
      'No red flags detected in the message text itself.',
      'Contains proper security advice: "Do NOT share this code with anyone".',
      'No clickable links, no payment demands, no threats of disconnection or arrest.',
    ],
    trickUsed: 'None detected. However, scammers may call asking for this OTP.',
    impersonating: 'Legitimate Delivery Service (Swiggy)',
    whatTheyWant: 'This OTP should ONLY be used by you in the official Swiggy app. If someone calls asking for this OTP, NEVER share it.',
    nextSteps: [
      'LOOKS_SAFE — Still verify in the official app.',
      'Enter this code only in the official Swiggy app where you initiated the login.',
      'If you did not request this OTP, change your account password and ignore callers.',
      'Never share any OTP over phone calls or WhatsApp messages.',
    ],
    familyWarning: 'ℹ️ Safe practice: Kisi bhi app ka OTP aane par sirf usi official app me daalein. Phone call par koi bole "OTP batado", toh kabhi mat batana.',
  },
];
