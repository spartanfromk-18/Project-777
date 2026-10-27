export interface RedFlagItem {
  quote: string;
  why: string;
}

export interface GemmaVerdictOutput {
  verdict: 'SCAM' | 'SUSPICIOUS' | 'LOOKS_SAFE';
  confidence: 'High' | 'Medium' | 'Low';
  red_flags: RedFlagItem[];
  trick: string;
  scammer_wants: string;
  next_steps: string[];
  family_warning: string;
  summary: string;
  impersonating?: string;
  redFlags?: string[];
  rawRedFlags?: RedFlagItem[];
  trickUsed?: string;
  whatTheyWant?: string;
  nextSteps?: string[];
  familyWarning?: string;
  extracted_text?: string;
}

/**
 * Validates and sanitizes the verdict according to strict security rules:
 * - Bad JSON, non-verbatim quotes, >4 flags, LOOKS_SAFE with High confidence,
 *   or SCAM with Low confidence MUST downgrade to SUSPICIOUS / Low, never LOOKS_SAFE.
 * - Never invent details not in the message.
 * - SCAM must include do-not-click/pay, block/report, and 1930 helpline.
 * - family_warning must be plain Hinglish without live links.
 */
export function validateAndEnforceVerdictRules(rawResult: any, originalText: string): GemmaVerdictOutput {
  let needsDowngrade = false;

  // 1. Validate Verdict value
  let verdict: 'SCAM' | 'SUSPICIOUS' | 'LOOKS_SAFE' = 'SUSPICIOUS';
  const rawVerdict = String(rawResult?.verdict || '').trim().toUpperCase();
  if (rawVerdict === 'SCAM') {
    verdict = 'SCAM';
  } else if (rawVerdict === 'LOOKS_SAFE') {
    verdict = 'LOOKS_SAFE';
  } else {
    verdict = 'SUSPICIOUS';
  }

  // 2. Validate Confidence (High / Medium / Low only, never a number)
  let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
  const rawConf = String(rawResult?.confidence || '').trim().toLowerCase();
  if (rawConf === 'high') {
    confidence = 'High';
  } else if (rawConf === 'low') {
    confidence = 'Low';
  } else {
    confidence = 'Medium';
  }

  // Rule: LOOKS_SAFE with High confidence -> downgrade to SUSPICIOUS / Low (never 100% safe)
  if (verdict === 'LOOKS_SAFE' && confidence === 'High') {
    verdict = 'SUSPICIOUS';
    confidence = 'Low';
    needsDowngrade = true;
  }

  // Rule: SCAM with Low confidence -> downgrade to SUSPICIOUS / Low
  if (verdict === 'SCAM' && confidence === 'Low') {
    verdict = 'SUSPICIOUS';
    confidence = 'Low';
    needsDowngrade = true;
  }

  // 3. Validate Red Flags & Verbatim quotes
  const textLower = originalText.toLowerCase();
  const rawFlags = Array.isArray(rawResult?.red_flags)
    ? rawResult.red_flags
    : Array.isArray(rawResult?.redFlags)
    ? rawResult.redFlags
    : [];

  let redFlags: RedFlagItem[] = [];

  for (const item of rawFlags) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed && textLower.includes(trimmed.toLowerCase())) {
        redFlags.push({ quote: trimmed, why: 'Suspicious wording detected in message.' });
      } else {
        // Non-verbatim string quote detected
        needsDowngrade = true;
      }
    } else if (item && typeof item === 'object') {
      const quote = String(item.quote || '').trim();
      const why = String(item.why || 'Flagged security risk').trim();
      // Quote must be an exact verbatim substring (case-insensitive check against original message)
      if (quote && textLower.includes(quote.toLowerCase())) {
        redFlags.push({ quote, why });
      } else if (quote) {
        // Non-verbatim quote detected!
        needsDowngrade = true;
      }
    }
  }

  // Rule: >4 flags -> downgrade to SUSPICIOUS / Low and clamp to 4
  if (rawFlags.length > 4 || redFlags.length > 4) {
    needsDowngrade = true;
    redFlags = redFlags.slice(0, 4);
  }

  // Enforce downgrade if any violation was encountered
  if (needsDowngrade) {
    verdict = 'SUSPICIOUS';
    confidence = 'Low';
  }

  // 4. Validate Next Steps
  let nextSteps: string[] = Array.isArray(rawResult?.next_steps)
    ? rawResult.next_steps.map((s: any) => String(s).trim()).filter(Boolean)
    : Array.isArray(rawResult?.nextSteps)
    ? rawResult.nextSteps.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  if (verdict === 'SCAM') {
    const combined = nextSteps.join(' ').toLowerCase();
    const hasNoClickPay = combined.includes('click') || combined.includes('pay');
    const hasBlockReport = combined.includes('block') || combined.includes('report');
    const has1930 = combined.includes('1930') || combined.includes('cybercrime');

    if (!hasNoClickPay) {
      nextSteps.unshift('Do NOT click any links, download files, or transfer any money.');
    }
    if (!hasBlockReport) {
      nextSteps.push('Block the sender immediately and report the number.');
    }
    if (!has1930) {
      nextSteps.push('If money was already transferred, call National Cybercrime Helpline 1930 immediately or visit cybercrime.gov.in.');
    }
  } else if (verdict === 'LOOKS_SAFE') {
    if (!nextSteps.some((s) => s.toLowerCase().includes('official app'))) {
      nextSteps.unshift('LOOKS_SAFE — Still verify directly in the official app or website.');
    }
  } else {
    if (nextSteps.length === 0) {
      nextSteps = [
        'Do NOT click on any link or open attached files.',
        'Verify sender identity via their verified official website or customer support.',
        'Never share OTPs, UPI PINs, or bank passwords with anyone.',
      ];
    }
  }

  // 5. Sanitize Family Warning (plain text Hinglish, absolutely NO live links)
  let familyWarning = String(rawResult?.family_warning || rawResult?.familyWarning || '').trim();
  familyWarning = familyWarning
    .replace(/https?:\/\/[^\s]+/gi, '[link removed]')
    .replace(/www\.[^\s]+/gi, '[link removed]')
    .replace(/\b(bit\.ly|tinyurl\.com|t\.me)\/[^\s]+/gi, '[link removed]');

  if (!familyWarning) {
    familyWarning =
      verdict === 'SCAM'
        ? '⚠️ Parivaar Alert: Yeh message fraud hai. Na koi link kholna, na paise bhejna. Official helpline par verify karein.'
        : verdict === 'SUSPICIOUS'
        ? '⚠️ Parivaar savdhaan: Yeh message suspicious lag raha hai. Isme aayi kisi bhi link par vishwas mat karo.'
        : 'ℹ️ Note: Message theek lag raha hai, lekin yaad rakhein: Kisi ke kehne par OTP ya PIN kabhi share na karein.';
  }

  const trick = String(rawResult?.trick || rawResult?.trickUsed || 'Urgency / psychological coercion tactic').trim();
  const scammerWants = String(rawResult?.scammer_wants || rawResult?.whatTheyWant || 'Credentials or unverified transaction').trim();
  const impersonating = String(rawResult?.impersonating || 'Unverified sender').trim();

  let summary = String(rawResult?.summary || '').trim();
  if (!summary) {
    summary =
      verdict === 'SCAM'
        ? 'High probability scam detected with known fraudulent triggers.'
        : verdict === 'SUSPICIOUS'
        ? 'Suspicious markers detected. Exercise caution and verify via official channels.'
        : 'LOOKS_SAFE — No prominent scam indicators found, but still verify in the official app.';
  }

  // Plain-text strings for frontend redFlags array
  const formattedRedFlagsStrings = redFlags.map((rf) => `"${rf.quote}" — ${rf.why}`);

  return {
    verdict,
    confidence,
    red_flags: redFlags,
    trick,
    scammer_wants: scammerWants,
    next_steps: nextSteps,
    family_warning: familyWarning,
    summary,
    impersonating,
    redFlags: formattedRedFlagsStrings,
    rawRedFlags: redFlags,
    trickUsed: trick,
    whatTheyWant: scammerWants,
    nextSteps,
    familyWarning,
  };
}
