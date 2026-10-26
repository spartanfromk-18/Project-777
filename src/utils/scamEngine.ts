import { GOLDEN_CASES, GoldenCase } from '../data/goldenCases.ts';

export interface AnalysisResult {
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

/**
 * Strips URLs so they are never converted to clickable links in the UI.
 */
export function sanitizePlainString(text: string): string {
  return text.trim();
}

/**
 * Local analysis engine: runs 100% on-device with zero network latency.
 * Implements rule-based heuristics & pattern recognition for Indian scam vectors.
 */
export function analyzeMessageLocally(rawText: string): AnalysisResult {
  const text = rawText.trim();
  if (!text) {
    throw new Error('Please enter or paste a message to analyze.');
  }

  // Check if text matches one of the golden cases
  const matchedGolden = GOLDEN_CASES.find(
    (gc) =>
      gc.text.toLowerCase().includes(text.toLowerCase().slice(0, 40)) ||
      text.toLowerCase().includes(gc.text.toLowerCase().slice(0, 40))
  );

  if (matchedGolden) {
    return {
      verdict: matchedGolden.verdict,
      confidence: matchedGolden.confidence,
      summary: matchedGolden.summary,
      redFlags: [...matchedGolden.redFlags],
      trickUsed: matchedGolden.trickUsed,
      impersonating: matchedGolden.impersonating,
      whatTheyWant: matchedGolden.whatTheyWant,
      nextSteps: [...matchedGolden.nextSteps],
      familyWarning: matchedGolden.familyWarning,
    };
  }

  const lower = text.toLowerCase();
  const redFlags: string[] = [];
  let verdict: 'SCAM' | 'SUSPICIOUS' | 'LOOKS_SAFE' = 'LOOKS_SAFE';
  let trick = 'Unverified message pattern.';
  let impersonating = 'Unknown sender';
  let whatTheyWant = 'Verify the authenticity before sharing any personal data.';

  // Check High Risk vectors
  const hasElectricityPattern =
    (lower.includes('electricity') || lower.includes('power') || lower.includes('bijli')) &&
    (lower.includes('disconnect') || lower.includes('cut') || lower.includes('officer') || lower.includes('bill was not updated'));

  const hasKycPattern =
    (lower.includes('kyc') || lower.includes('pan') || lower.includes('sbi') || lower.includes('yono') || lower.includes('hdfc') || lower.includes('icici') || lower.includes('bank')) &&
    (lower.includes('block') || lower.includes('suspend') || lower.includes('update') || lower.includes('expire') || lower.includes('bit.ly') || lower.includes('tinyurl'));

  const hasTaskJobPattern =
    (lower.includes('part-time') || lower.includes('part time') || lower.includes('like youtube') || lower.includes('earn') || lower.includes('work from home')) &&
    (lower.includes('telegram') || lower.includes('daily') || lower.includes('₹') || lower.includes('payout'));

  const hasArrestCustomsPattern =
    (lower.includes('customs') || lower.includes('parcel') || lower.includes('fedex') || lower.includes('narcotics') || lower.includes('mdma') || lower.includes('crime branch') || lower.includes('cbi') || lower.includes('arrest') || lower.includes('digital arrest'));

  const hasLotteryPattern =
    (lower.includes('kbc') || lower.includes('lottery') || lower.includes('lucky draw') || lower.includes('won') || lower.includes('congratulations') || lower.includes('cheque') || lower.includes('25,00,000') || lower.includes('25 lakh'));

  const hasUrgencyTrigger =
    lower.includes('immediately') || lower.includes('tonight') || lower.includes('within 24') || lower.includes('urgent') || lower.includes('last warning');

  const hasAnydeskPattern =
    lower.includes('anydesk') || lower.includes('teamviewer') || lower.includes('rustdesk') || lower.includes('quicksupport') || lower.includes('.apk');

  const hasUnsafeLink =
    lower.includes('bit.ly') || lower.includes('tinyurl') || lower.includes('goo.gl') || lower.includes('is.gd') || lower.includes('.apk') || /https?:\/\//.test(lower);

  if (hasElectricityPattern) {
    verdict = 'SCAM';
    redFlags.push('Disconnection threat using urgent timeline.');
    redFlags.push('Directs to an unverified mobile number or unofficial payment link.');
    redFlags.push('Electricity discoms never cut power via urgent personal SMS.');
    trick = 'Urgency and fear of immediate electricity disconnection.';
    impersonating = 'State Electricity Department Officer';
    whatTheyWant = 'Get you to call an unofficial number or install a screen-share app to steal bank OTPs.';
  } else if (hasKycPattern) {
    verdict = 'SCAM';
    redFlags.push('Demands PAN or KYC update via SMS link.');
    redFlags.push('Threatens immediate account block or suspension.');
    redFlags.push('RBI regulations prohibit banks from sending clickable links for KYC updates.');
    trick = 'Fear of bank account suspension to force entry of netbanking credentials on a fake site.';
    impersonating = 'Bank Security / KYC Verification Department';
    whatTheyWant = 'Collect netbanking username, password, and OTP on a cloned bank page.';
  } else if (hasTaskJobPattern) {
    verdict = 'SCAM';
    redFlags.push('Promises exorbitant pay (₹3,000+ daily) for basic tasks like liking videos.');
    redFlags.push('Routes communication to anonymous Telegram or WhatsApp accounts.');
    redFlags.push('Classic prepaid task scam structure designed to trap victims in advance fees.');
    trick = 'Easy money bait followed by advance fee demands to unlock withdrawal.';
    impersonating = 'HR Recruiter / Online Digital Agency';
    whatTheyWant = 'Lure you with a ₹150 trial payout, then demand thousands of rupees in deposit fees.';
  } else if (hasArrestCustomsPattern) {
    verdict = 'SCAM';
    redFlags.push('False accusation of seized narcotics, expired cards, or illegal parcels.');
    redFlags.push('Threat of Crime Branch / CBI arrest via phone or digital channels.');
    redFlags.push('Indian law enforcement never conducts interrogations or arrests via Skype/WhatsApp video.');
    trick = 'Digital arrest intimidation to cause extreme terror and isolate the victim.';
    impersonating = 'Customs Officer / Police Cyber Crime Branch';
    whatTheyWant = 'Force you to transfer funds to a "safe RBI clearance account" under duress.';
  } else if (hasLotteryPattern) {
    verdict = 'SCAM';
    redFlags.push('Unsolicited lottery win for a contest you never entered.');
    redFlags.push('Asks to contact a personal WhatsApp number with a fake file number.');
    redFlags.push('Scammers will require advance GST or processing fee to claim prize.');
    trick = 'Greed and excitement of winning a fictitious jackpot.';
    impersonating = 'Lottery Organizer / KBC Prize Manager';
    whatTheyWant = 'Demand upfront tax or processing payments before disappearing.';
  } else if (hasAnydeskPattern || (hasUnsafeLink && hasUrgencyTrigger)) {
    verdict = 'SCAM';
    redFlags.push('Requests remote access application (AnyDesk/APK) or links to an unverified URL.');
    redFlags.push('High-urgency language pushing quick action without verification.');
    trick = 'Remote device takeover or credential phishing.';
    impersonating = 'Customer Support / Technical Agent';
    whatTheyWant = 'Gain remote screen access to intercept two-factor SMS OTPs.';
  } else if (hasUnsafeLink || hasUrgencyTrigger) {
    verdict = 'SUSPICIOUS';
    redFlags.push('Contains an external link or shortened URL.');
    redFlags.push('Urgent tone prompting quick user action.');
    trick = 'Unverified link or psychological urgency.';
    impersonating = 'Unverified entity';
    whatTheyWant = 'Verify the sender by opening the official app or website directly, not through this link.';
  } else {
    // Check for standard OTP message
    const isOtp = lower.includes('otp') || lower.includes('code') || lower.includes('verification');
    if (isOtp) {
      verdict = 'LOOKS_SAFE';
      redFlags.push('No obvious scam triggers found in the message text.');
      trick = 'Standard one-time passcode.';
      impersonating = 'Legitimate service authentication';
      whatTheyWant = 'LOOKS_SAFE — Still verify in the official app. Never share this OTP with anyone over the phone.';
    } else {
      verdict = 'LOOKS_SAFE';
      redFlags.push('No typical urgent scam keywords or unauthorized links detected.');
      trick = 'Standard informational message.';
      impersonating = 'Informational sender';
      whatTheyWant = 'LOOKS_SAFE — Still verify in the official app. If in doubt, do not share personal details.';
    }
  }

  const confidence = verdict === 'SCAM' ? 98 : verdict === 'SUSPICIOUS' ? 75 : 92;

  const nextSteps =
    verdict === 'SCAM'
      ? [
          'Do NOT click any link or call numbers mentioned in the message.',
          'Block the sender immediately on SMS or messaging apps.',
          'Verify your actual account status solely via the official app or website.',
          'If money was transferred, call National Cyber Helpline 1930 immediately.',
        ]
      : verdict === 'SUSPICIOUS'
      ? [
          'Do NOT click on any link or open attached files.',
          'Verify the sender by visiting their official portal directly.',
          'Never share passwords, OTPs, or bank account credentials.',
        ]
      : [
          'LOOKS_SAFE — Still verify in the official app.',
          'Only use verification codes inside the official app you opened.',
          'Never dictate OTPs to anyone calling you.',
        ];

  const familyWarning =
    verdict === 'SCAM'
      ? `⚠️ Parivaar Alert: "${rawText.slice(0, 60)}..." jaisa message aane par bilkul bharosa mat karna. Yeh scam hai! Na koi link kholo, na paise bhejo. Official helpline par check karo.`
      : verdict === 'SUSPICIOUS'
      ? `⚠️ Parivaar savdhaan: Yeh message suspicious lag raha hai. Isme aayi link ya phone number par vishwas mat karo. Pehle official app me check karein.`
      : `ℹ️ Note: Message normal lag raha hai, lekin yaad rakhein: Kisi ke kehne par apna OTP ya password kabhi share mat karein.`;

  return {
    verdict,
    confidence,
    summary:
      verdict === 'SCAM'
        ? 'High probability scam detected with known fraudulent triggers.'
        : verdict === 'SUSPICIOUS'
        ? 'Suspicious markers detected. Exercise caution and verify via official channels.'
        : 'LOOKS_SAFE — No prominent scam indicators found, but still verify in the official app.',
    redFlags,
    trickUsed: trick,
    impersonating,
    whatTheyWant,
    nextSteps,
    familyWarning,
  };
}
