'use strict';
// ScamShield — verdict validation. Never trust the model: every verdict passes through here.
// Canonical verdict schema (SPEC v1.0): exactly 8 fields, in this order:
//   verdict, confidence, red_flags, trick, scammer_wants, next_steps, family_warning, summary

const VERDICTS = ['SCAM', 'SUSPICIOUS', 'LOOKS_SAFE'];
const CONFIDENCES = ['High', 'Medium', 'Low'];
const MAX_REDFLAGS = 4;
const MAX_MESSAGE_LENGTH = Number(process.env.MAX_MESSAGE_LENGTH) || 2000;
const MAX_TRANSCRIPT_LENGTH = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

function inputLimits() {
  return { maxMessageLength: MAX_MESSAGE_LENGTH, maxTranscriptLength: MAX_TRANSCRIPT_LENGTH, maxImageBytes: MAX_IMAGE_BYTES, imageMimes: IMAGE_MIMES.slice() };
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function fail(code, message) {
  return { ok: false, code, message };
}

// Scripts we can honestly judge: Latin (Hinglish/English) and Devanagari (Hindi).
// If the message is mostly some other script, refuse rather than guess.
function hasUnsupportedScript(text) {
  let supported = 0;
  let other = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) supported++; // Latin
    else if (c >= 0x900 && c <= 0x97f) supported++; // Devanagari
    else if (
      (c >= 0x400 && c <= 0x4ff) || // Cyrillic
      (c >= 0x370 && c <= 0x3ff) || // Greek
      (c >= 0x590 && c <= 0x5ff) || // Hebrew
      (c >= 0x600 && c <= 0x6ff) || // Arabic
      (c >= 0xe00 && c <= 0xe7f) || // Thai
      (c >= 0x3040 && c <= 0x30ff) || // Japanese kana
      (c >= 0x4e00 && c <= 0x9fff) || // CJK
      (c >= 0xac00 && c <= 0xd7af) // Hangul
    ) other++;
  }
  return other > 0 && other > supported;
}

function validateTextInput(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return fail('INVALID_INPUT', 'Message khaali hai — kuch text paste karo (max ' + MAX_MESSAGE_LENGTH + ' characters).');
  }
  const t = text.trim();
  if (t.length > MAX_MESSAGE_LENGTH) {
    return fail('INVALID_INPUT', 'Message bahut lamba hai (max ' + MAX_MESSAGE_LENGTH + ' characters). Sirf zaroori hissa paste karo.');
  }
  if (hasUnsupportedScript(t)) {
    return fail('UNSUPPORTED_LANGUAGE', 'Yeh language abhi support nahi karta — message English, Hinglish ya Hindi (Devanagari) me bhejo.');
  }
  return { ok: true, text: t };
}

function validateTranscript(text) {
  const t = String(text || '').trim();
  if (!t) return { ok: false };
  if (t.length <= MAX_TRANSCRIPT_LENGTH) return { ok: true, text: t };
  return { ok: true, text: t.slice(0, MAX_TRANSCRIPT_LENGTH) + ' …(baaki text cut gaya)' };
}

function validateImageInput(mime, size) {
  if (!IMAGE_MIMES.includes(mime)) {
    return fail('INVALID_INPUT', 'Sirf PNG, JPG ya WebP screenshot chalta hai (max 5 MB).');
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return fail('INVALID_INPUT', 'Screenshot bahut bada hai (max 5 MB) — chhota/clear screenshot try karo.');
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Family-warning sanitizer: no OTP, no link, no phone number may survive.
// ---------------------------------------------------------------------------

function sanitizeFamilyWarning(input) {
  let s = String(input == null ? '' : input);
  // Links (explicit and bare domains)
  s = s.replace(/https?:\/\/\S+/gi, '[link hataya]');
  s = s.replace(/\bwww\.\S+/gi, '[link hataya]');
  s = s.replace(/\b[a-z0-9][a-z0-9-]{1,61}\.(?:com|in|net|org|info|xyz|online|site|link|app|ly|co|io|live|shop|top|store|space|website)(?:\/\S*)?\b/gi, '[link hataya]');
  // UPI ids
  s = s.replace(/\b[\w.-]+@(?:upi|paytm|ybl|okaxis|okicici|okhdfcbank|axisbank|apl|ibl)\b/gi, '[id hataya]');
  // Phone numbers: +91 / 10-digit Indian mobile, spaced or hyphenated
  s = s.replace(/(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, '[number hataya]');
  // Long digit runs (landlines etc.)
  s = s.replace(/\b\d(?:[\s-]\d){8,}\b/g, '[number hataya]');
  // OTP-labelled digits: "OTP 456789", "OTP: 456789"
  s = s.replace(/\bOTP\b[^0-9\n]{0,6}\d+/gi, 'OTP [digits hataye]');
  // Any remaining standalone 6-digit block (OTP-shaped). Note: 1930 (4 digits) survives.
  s = s.replace(/\b\d{6}\b/g, '[number hataya]');
  return s.replace(/\s{2,}/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Canonical verdict assembly
// ---------------------------------------------------------------------------

const DEFAULT_STEPS_UNSAFE = [
  'Message ke kisi link par click mat karo, kuch bhi pay mat karo.',
  'Bank, courier ya police ka naam ho to official app ya apne known number se khud verify karo.',
  'Sender block karke 1930 (cybercrime.gov.in) par report karo.',
];

const DEFAULT_STEPS_SAFE = [
  'Koi action ki zaroorat nahi — transaction apne official app me khud dekh lo.',
  'Still verify in the official app.',
  'Family ko batao ki aise genuine alerts normally aate hain, par OTP kabhi kisi se share mat karna.',
];

const GENERIC_WARNING = 'Is message par bina verify kiye koi link mat kholo aur koi payment mat karo. Official app ya branch se hi confirm karo.';

// Build the honest SUSPICIOUS fallback (used when a reply is malformed even
// after the repair retry — never LOOKS_SAFE, never a fake verdict).
function buildFallbackVerdict() {
  return {
    verdict: 'SUSPICIOUS',
    confidence: 'Low',
    red_flags: [],
    trick: null,
    scammer_wants: 'Engine is message par saaf jawab nahi de paya, isliye hum kuch bhi confirm nahi kar rahe.',
    next_steps: DEFAULT_STEPS_UNSAFE.slice(),
    family_warning: GENERIC_WARNING,
    summary: 'Engine ka jawab saaf nahi mila, isliye ise "suspicious" treat kar rahe hain — click ya payment mat karo.',
  };
}

function cap(s, n) {
  const t = String(s == null ? '' : s).trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// canonicalizeVerdict(raw, inputText) -> { ok:true, verdict } | { ok:false, reason }
// reason is a short machine string reused in the repair prompt.
function canonicalizeVerdict(raw, inputText) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'reply was not a JSON object' };

  const verdict = String(raw.verdict || '').trim().toUpperCase();
  if (!VERDICTS.includes(verdict)) return { ok: false, reason: 'verdict missing or not SCAM/SUSPICIOUS/LOOKS_SAFE' };

  const confRaw = String(raw.confidence || '').trim();
  const confLower = confRaw.toLowerCase();
  const confidence = ['high', 'medium', 'low'].includes(confLower) ? confLower[0].toUpperCase() + confLower.slice(1) : null;
  if (!confidence) return { ok: false, reason: 'confidence missing or not High/Medium/Low' };

  // --- red flags: keep max 4, objects only, quote must be a verbatim substring of the input ---
  let redFlags = [];
  if (Array.isArray(raw.red_flags)) {
    for (const item of raw.red_flags.slice(0, MAX_REDFLAGS)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const quote = cap(item.quote, 200);
      if (!quote) continue;
      if (!inputText.includes(quote)) continue; // untraceable flag -> dropped
      const why = cap(item.why, 240) || 'Yeh line message me jhooth bolti hai.';
      redFlags.push({ quote, why });
    }
    if (redFlags.length > MAX_REDFLAGS) redFlags = redFlags.slice(0, MAX_REDFLAGS);
  }

  let trick = cap(raw.trick, 120) || null;

  let scammerWants = cap(raw.scammer_wants, 300) || null;
  if (!scammerWants && verdict !== 'LOOKS_SAFE') {
    scammerWants = verdict === 'SCAM' ? 'Aapka paisa ya personal details — yeh message aapko darane/mohit karne ke liye bheja gaya hai.' : 'Pata nahi — message clear nahi hai.';
  }

  // --- next steps: 3-5 strings, always actionable ---
  let steps = [];
  if (Array.isArray(raw.next_steps)) {
    steps = raw.next_steps.map((s) => cap(s, 200)).filter(Boolean).slice(0, 5);
  }
  const safeVerdict = verdict === 'LOOKS_SAFE';
  while (steps.length < 3) {
    const pool = safeVerdict ? DEFAULT_STEPS_SAFE : DEFAULT_STEPS_UNSAFE;
    const next = pool.find((p) => !steps.includes(p));
    if (!next) break;
    steps.push(next);
  }
  steps = steps.slice(0, 5);
  if (safeVerdict) {
    if (!steps.some((s) => /official app/i.test(s))) steps.push('Still verify in the official app.');
  } else if (!steps.some((s) => /1930|cybercrime/i.test(s))) {
    steps.push('Shak ho to sender block karke 1930 (cybercrime.gov.in) par report karo.');
  }
  if (steps.length > 5) steps = steps.slice(0, 5);

  let warning = sanitizeFamilyWarning(raw.family_warning);
  if (!warning) warning = safeVerdict
    ? 'Yeh message genuine lagta hai, par ghar par koi bhi OTP ya payment ke liye pressure me na aaye — official app se hi verify karo.'
    : GENERIC_WARNING;
  warning = cap(warning, 300);

  let summary = cap(raw.summary, 400) || (safeVerdict ? 'Yeh message genuine lag raha hai — koi paisa ya OTP ka demand nahi hai.' : 'Is message par poora bharosa mat karo — verify karke hi aage badho.');

  // --- honesty post-rules: when in doubt, SUSPICIOUS — never a fake LOOKS_SAFE, never an evidence-less SCAM ---
  let finalVerdict = verdict;
  let finalConfidence = confidence;

  if (verdict === 'LOOKS_SAFE') {
    if (redFlags.length > 0 || trick) {
      finalVerdict = 'SUSPICIOUS';
      finalConfidence = 'Low';
      if (!trick) trick = null;
    }
    if (finalVerdict === 'LOOKS_SAFE' && confidence === 'High') finalConfidence = 'Medium';
    else if (finalVerdict === 'SUSPICIOUS') trick = trick || null;
  } else if (verdict === 'SCAM') {
    if (!redFlags.length || !trick) {
      // A SCAM we cannot prove with a quoted line, or whose trick we cannot name, is not proven.
      finalVerdict = 'SUSPICIOUS';
      finalConfidence = 'Low';
    }
  }
  if (finalVerdict === 'LOOKS_SAFE') trick = null;

  return {
    ok: true,
    verdict: {
      verdict: finalVerdict,
      confidence: finalConfidence,
      red_flags: redFlags,
      trick,
      scammer_wants: scammerWants,
      next_steps: steps,
      family_warning: warning,
      summary,
    },
  };
}

module.exports = {
  VERDICTS,
  CONFIDENCES,
  inputLimits,
  validateTextInput,
  validateTranscript,
  validateImageInput,
  hasUnsupportedScript,
  sanitizeFamilyWarning,
  buildFallbackVerdict,
  canonicalizeVerdict,
  DEFAULT_STEPS_UNSAFE,
  DEFAULT_STEPS_SAFE,
};
