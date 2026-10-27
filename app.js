/* ScamShield — app.js (Stage 3 engine, vanilla JS, offline-first)
 * =====================================================================
 * Interface is exactly: window.ScamShield = { getStatus(), checkText(text), checkImage(file) }
 *
 * Two ways to run, resolved per call (see apiBase()):
 *  - Backend wired (window.SCAMSHIELD_API_BASE, or same-origin on http(s)):
 *    the adapter POSTs to {base}/api/check — the BACKEND engine decides
 *    (MODE=api → Gemini API, key stays server-side; MODE=local → Ollama).
 *  - No backend wired (page opened straight from disk, file://):
 *    this file talks DIRECTLY to the local Ollama at http://localhost:11434
 *    — gemma4:e4b, fallback gemma4:e2b. No backend, no API key, no npm, no
 *    build step. Nothing leaves the device; it runs fine with Wi-Fi OFF.
 *
 * Resolved verdict = exactly 8 fields, in order:
 *   verdict, confidence, red_flags, trick, scammer_wants, next_steps, family_warning, summary
 * Rejections = Error with .code ∈ { INVALID_INPUT, UNSUPPORTED_LANGUAGE, OCR_FAILED,
 *   BAD_RESPONSE, TIMEOUT, ENGINE_OFFLINE, MODEL_MISSING, RATE_LIMIT* } and a Hinglish .message.
 *   (* RATE_LIMIT exists for frontend contract compatibility; the local engine never throws it.)
 *
 * The model is NEVER trusted: every reply is parsed and canonicalized
 * (SPEC v1.0 semantics). Bad JSON, untraceable red flags, or unclear cases
 * become SUSPICIOUS — never LOOKS_SAFE. LOOKS_SAFE always keeps a
 * "Still verify in the official app" step. The family warning can never
 * contain an OTP, a link, or a phone number — not even 1930.
 *
 * DOM wiring is progressive enhancement: if the page has the element IDs
 * listed in DEMO_IDS below, the demo (chips, judge button, badges, result
 * card) wires itself up. If the IDs are absent (e.g. a custom frontend),
 * window.ScamShield still works headlessly.
 *
 * DOM IDs used (demo page):
 *   model-badge, wifi-badge, message-input, check-btn, screenshot-input,
 *   sample-chips, judge-btn, status-line, error-box, error-title, error-help,
 *   result, verdict-badge, verdict-confidence, verdict-summary, red-flags-list,
 *   trick-chip, scammer-wants, next-steps-list, family-warning,
 *   copy-warning-btn, transcript-card, transcript-box, meta-line, autotest-summary
 */
(function () {
  'use strict';

  /* ============================ CONFIG ============================ */

  var OLLAMA_URL = 'http://localhost:11434'; // the ONLY network address this app can call
  var MODELS = ['gemma4:e4b', 'gemma4:e2b']; // primary, fallback
  var TEXT_TIMEOUT_MS = 15000;  // one Gemma call per text check: 15s
  var VISION_TIMEOUT_MS = 45000; // vision (screenshot transcription) call: 45s
  var STATUS_TIMEOUT_MS = 5000;
  var MAX_MESSAGE_LENGTH = 2000;    // SPEC v1.0
  var MAX_TRANSCRIPT_LENGTH = 4000; // SPEC v1.0
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  var IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  var MAX_IMAGE_DIM = 1024;        // screenshots shrink to max 1024px
  var JPEG_QUALITY = 0.9;

  var VERDICTS = ['SCAM', 'SUSPICIOUS', 'LOOKS_SAFE'];
  var CONFIDENCES = ['High', 'Medium', 'Low'];
  var VERIFY_LINE = 'Still verify in the official app.';

  var MSG = {
    INVALID_INPUT: 'Message khaali hai — kuch text paste karo (max ' + MAX_MESSAGE_LENGTH + ' characters).',
    OFFLINE: 'Local Ollama (127.0.0.1:11434) chal nahi raha. Terminal me "ollama serve" start karo, phir dobara try karo. (Wi-Fi ki zaroorat nahi — sab kuch local hai.)',
    BACKEND_DOWN: 'Backend nahi chal raha — terminal me "npm start" karo. (MODE ke hisaab se Gemini API ya local Ollama chalega.)',
    UNKNOWN: 'Kuch gadbad ho gayi — dobara try karo.',
  };

  /* ---------- SPEC v1.0 prompts (adapted from the team's api/check.js) ---------- */

  var SYSTEM_PROMPT = [
    'You are ScamShield, a fraud detective for Indian families. You read ONE message — an SMS, WhatsApp forward, email, or text read from a screenshot — and return a verdict in simple Hinglish.',
    '',
    'Judge the message using these India-specific patterns:',
    '- Bank impersonation: fake KYC expiry, "account blocked", a link to click or a number to call, urgency of a few hours. → SCAM.',
    '- Courier/customs fraud: parcel held, a small fee to release it, a UPI id given, a prize attached. → SCAM.',
    '- Fake job offer: big salary, registration/processing fee paid first. → SCAM.',
    '- Digital arrest: fake police/CBI/customs "officer", video-call verification, "your phone is under monitoring", move money to a "safe account", secrecy threats. → SCAM.',
    '- Anyone asking for OTP, UPI PIN, CVV or card details: → SCAM.',
    '- Genuine bank/service alerts only inform (a debit happened, no action needed, verify via the number on your card or the official app) — no link, no urgency, no OTP demand. → LOOKS_SAFE.',
    '- Too vague or too little context to judge: → SUSPICIOUS with Low confidence, red_flags [] and trick null.',
    '- Mixed signals, odd but unproven: → SUSPICIOUS. Never LOOKS_SAFE when unsure. When in doubt, SUSPICIOUS.',
    '',
    'Return ONLY one JSON object with exactly these 8 fields, in this order:',
    '{"verdict":"SCAM"|"SUSPICIOUS"|"LOOKS_SAFE","confidence":"High"|"Medium"|"Low","red_flags":[{"quote":"...","why":"..."}],"trick":"short Hinglish name of the scam trick"|"none","scammer_wants":"what the scammer is after, simple Hinglish"|"none","next_steps":[3 to 5 short practical steps in Hinglish, always including block and report on 1930 for scams],"family_warning":"short forwardable WhatsApp-style warning in Hinglish — NO links, NO phone numbers, NO OTP digits, NO numbers at all (not even 1930)","summary":"1-2 simple Hinglish sentences"}',
    '',
    'Hard rules:',
    '- red_flags has at most 4 items; every quote must be copied WORD-FOR-WORD from the message (exact substring, same script, same case) — never invent or paraphrase a quote. Use [] when nothing is quotable.',
    '- Write why, scammer_wants, next_steps, family_warning and summary in simple Hinglish (Roman script) a grandmother can follow. For Hindi/Devanagari messages you may quote in Devanagari.',
    '- trick names the scam pattern in 2-4 words, e.g. "Fake bank KYC scam", "Courier/customs fee scam", "Fake job offer scam", "Digital arrest scam", "Lottery prize scam". Add the mental trick in brackets when it fits: fear, greed, fake authority, false urgency, impersonation. Example: "Fake bank KYC scam (fake authority, false urgency)". If no named scam trick is actually present, trick is "none".',
    '- confidence: "High" only for SCAM with clear quoted evidence and a named trick. LOOKS_SAFE is never "High" (max "Medium"). Vague/unproven cases are "Low".',
    '- scammer_wants is "none" when there is no scammer.',
    '- LOOKS_SAFE never uses High confidence.',
    '- Never write "100% safe" or "bilkul pakka safe" — no verdict is a guarantee. Always remind people to verify in the official app.',
    '- No text outside the JSON object. No markdown fences.',
  ].join('\n');

  var TRANSCRIBE_PROMPT = [
    'Transcribe ALL readable text from this message screenshot exactly as written — same language, same script, same numbers.',
    'Reply ONLY with a JSON object: {"text": "<the transcription>"} or {"text": null} if the screenshot has no readable text (blank, unreadably blurry, or only pictures).',
  ].join(' ');

  /* Verdict JSON schema — sent to Ollama as `format` (structured outputs).
   * trick/scammer_wants use "none" instead of grammar-risky null types; the
   * canonicalizer maps "none"/"" back to null. */
  var VERDICT_SCHEMA = {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['SCAM', 'SUSPICIOUS', 'LOOKS_SAFE'] },
      confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] },
      red_flags: {
        type: 'array',
        maxItems: 4,
        items: {
          type: 'object',
          properties: { quote: { type: 'string' }, why: { type: 'string' } },
          required: ['quote', 'why'],
        },
      },
      trick: { type: 'string' },
      scammer_wants: { type: 'string' },
      next_steps: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
      family_warning: { type: 'string' },
      summary: { type: 'string' },
    },
    required: ['verdict', 'confidence', 'red_flags', 'trick', 'scammer_wants', 'next_steps', 'family_warning', 'summary'],
  };

  /* ---------- Binding golden cases (SPEC v1.0, tests/golden-cases.js mirror) ----------
   * Order here is the demo order: scams first, genuine message last (Stage 4). */

  var GOLDEN_CASES = [
    { id: 'G1', chip: 'Bank KYC block dhamki', name: 'Bank KYC scam',
      message: 'Dear Customer, your bank KYC has EXPIRED. Your account will be BLOCKED within 2 hours. Update now at bit.ly/sbi-kyc-9 or call +91 98765 43210. Do not ignore. — SBI Update Desk',
      expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'kyc' } },
    { id: 'G2', chip: 'Courier parcel fee + prize', name: 'Courier fee scam',
      message: 'Your parcel is HELD at customs. Rs 150 courier charge pending — pay now to release your order and claim the Rs 2,50,000 cash prize attached with it. Pay Rs 150 on UPI: fastship-fees@okaxis. — Courier Team Delhi',
      expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'courier' } },
    { id: 'G3', chip: 'WFH job + registration fee', name: 'Job fee scam',
      message: 'Congratulations! You are selected for a WFH typing job. Salary Rs 30,000 per week. Only one-time Rs 999 registration fee to activate your offer letter. Pay before 5 pm today or your selection will be cancelled. — HR Anjali',
      expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'job' } },
    { id: 'G4', chip: 'Digital arrest video call', name: 'Digital arrest scam',
      message: 'This is Inspector R.K. Verma, Cyber Crime Branch. A money laundering case is filed against your Aadhaar. Your phone is under monitoring. Do not disconnect. Join the video call for verification and move your funds to the Reserve Bank safe account for checking, else arrest warrant will be issued today evening.',
      expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'arrest' } },
    { id: 'GH', chip: 'Hinglish courier scam', name: 'Hinglish courier scam (language case)',
      message: 'Aapka parcel customs me phasa hai. 150 rupaye ka charge bhejo turant, warna parcel wapas bhej diya jayega. Pay karne ke liye ye number par message karo: 98765 43210.',
      expected: { verdict: 'SCAM', confidence: 'High' } },
    { id: 'GD', chip: 'Devanagari KYC scam', name: 'Devanagari KYC scam (language case)',
      message: 'आपका बैंक खाता आज रात बंद हो जाएगा। KYC अपडेट करने के लिए इस लिंक पर क्लिक करें: bitly-kyc.in — जल्दी करें।',
      expected: { verdict: 'SCAM', confidence: 'High' } },
    { id: 'G6', chip: 'Vague note (context nahi)', name: 'Vague order note',
      message: 'Ok noted. Send it by tomorrow morning.',
      expected: { verdict: 'SUSPICIOUS', confidence: 'Low', trickNull: true } },
    { id: 'G5', chip: 'Asli bank debit alert', name: 'Genuine-style bank alert',
      message: 'Rs 450.00 debited from A/c XX4567 on 26-10-26 via UPI/Netflix India. If this was not you, call the number printed on the back of your card. Bank staff will never ask for your OTP. This is an automated alert, no action needed.',
      expected: { verdict: 'LOOKS_SAFE', confidence: 'Medium', trickNull: true } },
  ];

  /* ==================== ERRORS ==================== */

  function fail(code, message) {
    var e = new Error(message || MSG.UNKNOWN);
    e.code = code;
    return Promise.reject(e);
  }
  function failSync(code, message) {
    var e = new Error(message || MSG.UNKNOWN);
    e.code = code;
    return e;
  }

  /* ==================== INPUT VALIDATION (SPEC v1.0) ==================== */

  function failVal(code, message) { return { ok: false, code: code, message: message }; }

  // Scripts we can honestly judge: Latin (Hinglish/English) and Devanagari (Hindi).
  function hasUnsupportedScript(text) {
    var supported = 0, other = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text.codePointAt(i);
      if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) supported++;
      else if (c >= 0x900 && c <= 0x97f) supported++;
      else if (
        (c >= 0x400 && c <= 0x4ff) || (c >= 0x370 && c <= 0x3ff) || (c >= 0x590 && c <= 0x5ff) ||
        (c >= 0x600 && c <= 0x6ff) || (c >= 0xe00 && c <= 0xe7f) || (c >= 0x3040 && c <= 0x30ff) ||
        (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af)
      ) other++;
    }
    return other > 0 && other > supported;
  }

  function validateTextInput(text) {
    if (typeof text !== 'string' || !text.trim()) return failVal('INVALID_INPUT', MSG.INVALID_INPUT);
    var t = text.trim();
    if (t.length > MAX_MESSAGE_LENGTH) {
      return failVal('INVALID_INPUT', 'Message bahut lamba hai (max ' + MAX_MESSAGE_LENGTH + ' characters). Sirf zaroori hissa paste karo.');
    }
    if (hasUnsupportedScript(t)) {
      return failVal('UNSUPPORTED_LANGUAGE', 'Yeh language abhi support nahi karta — message English, Hinglish ya Hindi (Devanagari) me bhejo.');
    }
    return { ok: true, text: t };
  }

  function validateTranscript(text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) return { ok: false };
    if (t.length <= MAX_TRANSCRIPT_LENGTH) return { ok: true, text: t };
    return { ok: true, text: t.slice(0, MAX_TRANSCRIPT_LENGTH) + ' …(baaki text cut gaya)' };
  }

  function validateImageMeta(type, name, size) {
    var t = String(type || '').toLowerCase();
    if (IMAGE_TYPES.indexOf(t) === -1) {
      var n = String(name || '').toLowerCase();
      if (/\.png$/.test(n)) t = 'image/png';
      else if (/\.jpe?g$/.test(n)) t = 'image/jpeg';
      else if (/\.webp$/.test(n)) t = 'image/webp';
      else return failVal('INVALID_INPUT', 'Sirf PNG, JPG ya WebP screenshot chalta hai (max 5 MB).');
    }
    if (!size || size > MAX_IMAGE_BYTES) {
      return failVal('INVALID_INPUT', 'Screenshot bahut bada hai (max 5 MB) — chhota/clear screenshot try karo.');
    }
    return { ok: true, mime: t };
  }

  /* ==================== JSON EXTRACTION (tolerate fences/prose) ==================== */

  function tryParse(s) {
    try { return { ok: true, value: JSON.parse(s) }; } catch (e) { return { ok: false }; }
  }

  function extractJsonObject(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'reply was empty' };
    var t = text.trim();
    var direct = tryParse(t);
    if (direct.ok) return direct;
    var fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      var p = tryParse(fence[1].trim());
      if (p.ok) return p;
    }
    var start = t.indexOf('{');
    if (start >= 0) {
      var depth = 0, inStr = false, esc = false;
      for (var i = start; i < t.length; i++) {
        var c = t[i];
        if (inStr) {
          if (esc) esc = false;
          else if (c === '\\') esc = true;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            var q = tryParse(t.slice(start, i + 1));
            return q.ok ? q : { ok: false, reason: 'found a JSON-like block but it did not parse' };
          }
        }
      }
    }
    return { ok: false, reason: 'no JSON object found in the reply' };
  }

  /* ==================== FAMILY-WARNING SANITIZER ====================
   * SPEC v1.0 sanitizer + two documented tightenings (SAFETY-01):
   *   (a) 1930 is also removed from family_warning (a helpline number is
   *       still a phone number) — next_steps keep 1930, which is allowed;
   *   (b) ANY email/UPI id and ANY standalone 4-5 digit run is removed. */

  function sanitizeFamilyWarning(input) {
    var s = String(input == null ? '' : input);
    // Links (explicit and bare domains)
    s = s.replace(/https?:\/\/\S+/gi, '[link hataya]');
    s = s.replace(/\bwww\.\S+/gi, '[link hataya]');
    s = s.replace(/\b[a-z0-9][a-z0-9-]{1,61}\.(?:com|in|net|org|info|xyz|online|site|link|app|ly|co|io|live|shop|top|store|space|website|gov|edu|me|cc)(?:\/\S*)?\b/gi, '[link hataya]');
    // UPI ids / emails of any kind
    s = s.replace(/\S+@\S+\.\S+/g, '[id hataya]');
    s = s.replace(/\b[\w.-]+@(?:upi|paytm|ybl|okaxis|okicici|okhdfcbank|axisbank|apl|ibl)\b/gi, '[id hataya]');
    // Phone numbers: +91 / 10-digit Indian mobile, spaced or hyphenated
    s = s.replace(/(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, '[number hataya]');
    // Long digit runs (landlines etc.)
    s = s.replace(/\b\d(?:[\s-]\d){8,}\b/g, '[number hataya]');
    // OTP-labelled digits: "OTP 456789", "OTP: 456789"
    s = s.replace(/\bOTP\b[^0-9\n]{0,6}\d+/gi, 'OTP [digits hataye]');
    // Any remaining standalone 6-digit block (OTP-shaped)
    s = s.replace(/\b\d{6}\b/g, '[number hataya]');
    // SAFETY-01(a): helpline number 1930 never appears in a forwardable warning
    s = s.replace(/\b1930\b/g, 'sarkari cyber helpline');
    // SAFETY-01(b): any remaining 4-5 digit run is removed (OTP-shaped)
    s = s.replace(/\b\d{4,5}\b/g, '[number hataya]');
    return s.replace(/\s{2,}/g, ' ').trim();
  }

  function familyWarningViolates(s) {
    var probe = String(s || '');
    if (/https?:|www\.|\S+@\S+\.|\.(?:com|in|xyz|live|link|app|ly|shop|top|store|site|online)\b/i.test(probe)) return true;
    if (/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/.test(probe)) return true;
    if (/\b\d{4,}\b/.test(probe)) return true;
    if (/\b\d(?:[\s-]\d){8,}\b/.test(probe)) return true;
    return false;
  }

  /* ==================== CANONICAL VERDICT (SPEC v1.0) ==================== */

  var DEFAULT_STEPS_UNSAFE = [
    'Message ke kisi link par click mat karo, kuch bhi pay mat karo.',
    'Bank, courier ya police ka naam ho to official app ya apne known number se khud verify karo.',
    'Sender block karke 1930 (cybercrime.gov.in) par report karo.',
  ];

  var DEFAULT_STEPS_SAFE = [
    'Koi action ki zaroorat nahi — transaction apne official app me khud dekh lo.',
    VERIFY_LINE,
    'Family ko batao ki aise genuine alerts normally aate hain, par OTP kabhi kisi se share mat karna.',
  ];

  var GENERIC_WARNING = 'Is message par bina verify kiye koi link mat kholo aur koi payment mat karo. Official app ya branch se hi confirm karo.';

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
    var t = String(s == null ? '' : s).trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  function noneish(v) {
    if (v == null) return true;
    var t = String(v).trim().toLowerCase();
    return t === '' || t === 'none' || t === 'null' || t === 'n/a' || t === 'nil' || t === '-';
  }

  // -> { ok:true, verdict } | { ok:false, reason }
  function canonicalizeVerdict(raw, inputText) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'reply was not a JSON object' };

    var verdict = String(raw.verdict || '').trim().toUpperCase();
    if (VERDICTS.indexOf(verdict) === -1) return { ok: false, reason: 'verdict missing or not SCAM/SUSPICIOUS/LOOKS_SAFE' };

    var confRaw = String(raw.confidence || '').trim().toLowerCase();
    var confidence = ['high', 'medium', 'low'].indexOf(confRaw) !== -1 ? (confRaw[0].toUpperCase() + confRaw.slice(1)) : null;
    if (!confidence) return { ok: false, reason: 'confidence missing or not High/Medium/Low' };

    // --- red flags: keep max 4, objects only, quote must be a verbatim substring of the input ---
    var redFlags = [];
    if (Array.isArray(raw.red_flags)) {
      var items = raw.red_flags.slice(0, 4);
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        var quote = cap(item.quote, 200);
        if (!quote) continue;
        if (inputText.indexOf(quote) === -1) continue; // untraceable flag -> dropped
        var why = cap(item.why, 240) || 'Yeh line message me jhooth bolti hai.';
        redFlags.push({ quote: quote, why: why });
      }
      if (redFlags.length > 4) redFlags = redFlags.slice(0, 4);
    }

    var trick = noneish(raw.trick) ? null : cap(raw.trick, 120);

    var scammerWants = noneish(raw.scammer_wants) ? null : cap(raw.scammer_wants, 300);
    if (!scammerWants && verdict !== 'LOOKS_SAFE') {
      scammerWants = verdict === 'SCAM'
        ? 'Aapka paisa ya personal details — yeh message aapko darane/mohit karne ke liye bheja gaya hai.'
        : 'Pata nahi — message clear nahi hai.';
    }

    // --- next steps: 3-5 strings, always actionable ---
    var steps = [];
    if (Array.isArray(raw.next_steps)) {
      var arr = raw.next_steps.slice(0, 5);
      for (var j = 0; j < arr.length; j++) {
        var st = cap(arr[j], 200);
        if (st) steps.push(st);
      }
    }
    var safeVerdict = verdict === 'LOOKS_SAFE';
    while (steps.length < 3) {
      var pool = safeVerdict ? DEFAULT_STEPS_SAFE : DEFAULT_STEPS_UNSAFE;
      var next = null;
      for (var k = 0; k < pool.length; k++) {
        if (steps.indexOf(pool[k]) === -1) { next = pool[k]; break; }
      }
      if (!next) break;
      steps.push(next);
    }
    steps = steps.slice(0, 5);
    if (safeVerdict) {
      if (!steps.some(function (s) { return /official app/i.test(s); })) steps.push(VERIFY_LINE);
    } else if (!steps.some(function (s) { return /1930|cybercrime/i.test(s); })) {
      steps.push('Shak ho to sender block karke 1930 (cybercrime.gov.in) par report karo.');
    }
    if (steps.length > 5) steps = steps.slice(0, 5);

    var warning = sanitizeFamilyWarning(raw.family_warning);
    if (!warning) warning = safeVerdict
      ? 'Yeh message genuine lagta hai, par ghar par koi bhi OTP ya payment ke liye pressure me na aaye — official app se hi verify karo.'
      : GENERIC_WARNING;
    if (familyWarningViolates(warning)) warning = safeVerdict
      ? 'Yeh message genuine lagta hai — par final check hamesha official app me karo.'
      : GENERIC_WARNING;
    warning = cap(warning, 300);

    var summary = cap(raw.summary, 400) || (safeVerdict
      ? 'Yeh message genuine lag raha hai — koi paisa ya OTP ka demand nahi hai.'
      : 'Is message par poora bharosa mat karo — verify karke hi aage badho.');

    // --- honesty post-rules: when in doubt, SUSPICIOUS — never a fake LOOKS_SAFE, never an evidence-less SCAM ---
    var finalVerdict = verdict;
    var finalConfidence = confidence;

    if (verdict === 'LOOKS_SAFE') {
      if (redFlags.length > 0 || trick) {
        finalVerdict = 'SUSPICIOUS';
        finalConfidence = 'Low';
      } else if (confidence === 'High') {
        finalConfidence = 'Medium';
      }
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
        trick: trick,
        scammer_wants: scammerWants,
        next_steps: steps,
        family_warning: warning,
        summary: summary,
      },
    };
  }

  /* ==================== OLLAMA ENGINE (direct, local-only) ==================== */

  var activeModel = null;   // remembers which model worked (e4b or e2b)
  var schemaMode = true;    // schema `format` unless the server rejects it once

  function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : null;
      var opts = options || {};
      if (ctrl) opts.signal = ctrl.signal;
      fetch(url, opts).then(
        function (res) { if (timer) clearTimeout(timer); resolve(res); },
        function (err) {
          if (timer) clearTimeout(timer);
          if (err && err.name === 'AbortError') {
            var te = new Error('Local Ollama ka jawab ' + Math.round(timeoutMs / 1000) + ' second me nahi aaya. Thoda ruk ke dobara try karo.');
            te.code = 'TIMEOUT';
            reject(te);
          } else {
            var oe = new Error(MSG.OFFLINE);
            oe.code = 'ENGINE_OFFLINE';
            reject(oe);
          }
        }
      );
    });
  }

  // One /api/chat POST. Model chain: e4b -> e2b on "model missing".
  // 400 with schema `format` falls back to plain json mode once (capability guard).
  function chatOnce(messages, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs || TEXT_TIMEOUT_MS;
    var format = opts.format !== undefined ? opts.format : null;

    function post(model, fmt) {
      var body = {
        model: model,
        messages: messages,
        stream: false,          // single response, no streaming
        keep_alive: '30m',      // keep Gemma warm for the demo
        options: { temperature: 0 }, // deterministic detective
      };
      if (fmt) body.format = fmt;
      return fetchWithTimeout(OLLAMA_URL + '/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }, timeoutMs).then(function (res) {
        if (res.status === 404) return { modelMissing: true };
        return res.text().then(function (txt) {
          var data = null;
          try { data = JSON.parse(txt); } catch (e) {}
          var errText = String((data && data.error) || '');
          if (!res.ok) {
            if (/not found|no such model|pull it first/i.test(errText)) return { modelMissing: true };
            if (res.status === 400 && fmt && fmt !== 'json') return { schemaRejected: true };
            if (res.status >= 500) {
              var e5 = new Error(MSG.OFFLINE);
              e5.code = 'ENGINE_OFFLINE';
              throw e5;
            }
            var ex = new Error('Ollama ne request reject kar di.' + (errText ? ' (' + errText.slice(0, 120) + ')' : ''));
            ex.code = 'ENGINE_OFFLINE';
            throw ex;
          }
          var content = data && data.message && typeof data.message.content === 'string' ? data.message.content.trim() : '';
          return { modelMissing: false, content: content };
        });
      });
    }

    var order = activeModel ? [activeModel].concat(MODELS.filter(function (m) { return m !== activeModel; })) : MODELS.slice();

    function attempt(idx) {
      if (idx >= order.length) {
        var me = new Error('Ollama me model nahi mila. Install karo: ollama pull ' + MODELS[0] + ' (aur fast fallback: ollama pull ' + MODELS[1] + ')');
        me.code = 'MODEL_MISSING';
        return Promise.reject(me);
      }
      var model = order[idx];
      return post(model, format).then(function (out) {
        if (out.modelMissing) return attempt(idx + 1);
        if (out.schemaRejected) {
          schemaMode = false;
          return post(model, 'json'); // capability fallback (once per load); still one call
        }
        if (!out.content) {
          var be = new Error('Ollama ne khaali jawab bheja. Dobara try karo.');
          be.code = 'BAD_RESPONSE';
          throw be;
        }
        activeModel = model;
        return out.content;
      });
    }
    return attempt(0);
  }

  function judgeUserPrompt(text) {
    return text;
  }

  // THE CHECK: exactly one Gemma call for a text verdict.
  function judgeTextViaOllama(text) {
    var format = schemaMode ? VERDICT_SCHEMA : 'json';
    return chatOnce(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: judgeUserPrompt(text) },
      ],
      { timeoutMs: TEXT_TIMEOUT_MS, format: format }
    ).then(function (raw) {
      var parsed = extractJsonObject(raw);
      if (!parsed.ok) return buildFallbackVerdict(); // bad JSON -> honest SUSPICIOUS, never LOOKS_SAFE
      var canon = canonicalizeVerdict(parsed.value, text);
      if (!canon.ok) return buildFallbackVerdict();
      return canon.verdict;
    });
  }

  // Vision: transcribe the screenshot EXACTLY ({"text": ... | null}).
  function transcribeViaOllama(base64) {
    return chatOnce(
      [{ role: 'user', content: TRANSCRIBE_PROMPT, images: [base64] }],
      { timeoutMs: VISION_TIMEOUT_MS, format: 'json' }
    ).then(function (raw) {
      var parsed = extractJsonObject(raw);
      if (parsed.ok && parsed.value && typeof parsed.value.text === 'string') return parsed.value.text;
      return null;
    });
  }

  /* ==================== IMAGE PROCESSING (shrink to max 1024px) ==================== */

  function fileToShrunkenJpegBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(failSync('INVALID_INPUT', 'Screenshot file nahi khul payi — dobara select karo.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(failSync('INVALID_INPUT', 'Yeh file image nahi khul rahi — PNG/JPG/WebP screenshot try karo.')); };
        img.onload = function () {
          var w = img.naturalWidth || 1, h = img.naturalHeight || 1;
          var scale = Math.min(1, MAX_IMAGE_DIM / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = cw; canvas.height = ch;
          canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
          var dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve(dataUrl.slice(dataUrl.indexOf(',') + 1)); // raw base64, no data: prefix
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ==================== BACKEND ADAPTER MODE (window.SCAMSHIELD_API_BASE) ====================
   * When the page wires a ScamShield backend (window.SCAMSHIELD_API_BASE, or the
   * page is served over http(s) so same-origin works), the adapter talks to
   * POST {base}/api/check — the BACKEND engine decides (MODE=api → Gemini API,
   * key server-side; MODE=local → Ollama through the server). The React/demo
   * pages and the mock test-suite use this path. A backend that is down rejects
   * with ENGINE_OFFLINE — never a guessed verdict, never a hang. */

  function apiBase() {
    if (typeof window !== 'undefined' && window.SCAMSHIELD_API_BASE) return String(window.SCAMSHIELD_API_BASE);
    if (typeof location !== 'undefined' && (location.protocol === 'http:' || location.protocol === 'https:')) return '';
    return null; // no backend wired -> direct local mode below
  }

  function adapterFetch(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : null;
      var opts = options || {};
      if (ctrl) opts.signal = ctrl.signal;
      fetch(url, opts).then(
        function (res) { if (timer) clearTimeout(timer); resolve(res); },
        function (err) {
          if (timer) clearTimeout(timer);
          if (err && err.name === 'AbortError') {
            var te = new Error('Request timeout ho gayi — dobara try karo.');
            te.code = 'TIMEOUT';
            reject(te);
          } else {
            var oe = new Error(MSG.BACKEND_DOWN);
            oe.code = 'ENGINE_OFFLINE';
            reject(oe);
          }
        }
      );
    });
  }

  // Canonical verdict object — exactly 8 fields, in order, no matter what mode produced it.
  function adapterNormalizeVerdict(v) {
    return {
      verdict: String(v.verdict || ''),
      confidence: String(v.confidence || ''),
      red_flags: Array.isArray(v.red_flags) ? v.red_flags : [],
      trick: v.trick == null ? null : String(v.trick),
      scammer_wants: v.scammer_wants == null ? null : String(v.scammer_wants),
      next_steps: Array.isArray(v.next_steps) ? v.next_steps : [],
      family_warning: String(v.family_warning || ''),
      summary: String(v.summary || ''),
    };
  }

  function adapterParseResponse(res) {
    return res.json().catch(function () { return null; }).then(function (body) {
      if (body && body.ok === true && body.verdict) return adapterNormalizeVerdict(body.verdict);
      if (body && body.ok === false && body.error && body.error.code) {
        var e = new Error(body.error.message || MSG.UNKNOWN);
        e.code = body.error.code;
        throw e;
      }
      var e2 = new Error(MSG.UNKNOWN);
      e2.code = 'BAD_RESPONSE';
      throw e2;
    });
  }

  var adapterStatusCache = null;
  var adapterStatusAt = 0;
  var adapterStatusBase = null;

  function adapterGetStatus(force) {
    var now = Date.now();
    var base = apiBase();
    // Cache only while the backend base is unchanged — a base change must never
    // serve a stale status, and must never hide a backend that is down.
    if (!force && adapterStatusCache && adapterStatusBase === base && now - adapterStatusAt < 5000) return Promise.resolve(adapterStatusCache);
    // A fetch failure is already a coded rejection — let it propagate:
    // getStatus must REJECT with ENGINE_OFFLINE, never resolve with an Error.
    return adapterFetch(base + '/api/status', { method: 'GET' }, 10000).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (body) {
        if (!body || body.ok !== true) return fail('ENGINE_OFFLINE', MSG.BACKEND_DOWN);
        adapterStatusCache = {
          mode: body.mode,
          engine: body.engine,
          model: body.model,
          ready: Boolean(body.ready),
          keyConfigured: Boolean(body.keyConfigured),
          message: body.message || '',
        };
        adapterStatusBase = base;
        adapterStatusAt = now;
        return adapterStatusCache;
      });
    });
  }

  function adapterCheckText(text) {
    var v = validateTextInput(text);
    if (!v.ok) return fail(v.code, v.message);
    return adapterFetch(apiBase() + '/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: v.text }),
    }, 90000).then(adapterParseResponse);
  }

  function adapterCheckImage(file) {
    if (!file) return fail('INVALID_INPUT', 'Screenshot select karo (PNG, JPG ya WebP — max 5 MB).');
    var size = typeof file.size === 'number' ? file.size : 0;
    var meta = validateImageMeta(file.type, file.name, size);
    if (!meta.ok) return fail(meta.code, meta.message);
    var form = new FormData();
    form.append('image', file, file.name || 'screenshot');
    return adapterFetch(apiBase() + '/api/check', { method: 'POST', body: form }, 150000).then(adapterParseResponse);
  }

  /* ==================== PUBLIC API (window.ScamShield) ====================
   * Public dispatch: backend-wired pages use the adapter above; everything
   * else (offline demo, file://) uses the direct local-Ollama path below.
   * Same contract either way: { getStatus, checkText, checkImage } and the
   * same canonical 8-field verdict / coded rejections. */

  var warmed = false;

  function ollamaGetStatus(force) {
    return fetchWithTimeout(OLLAMA_URL + '/api/tags', { method: 'GET' }, STATUS_TIMEOUT_MS).then(function (res) {
      if (!res.ok) return fail('ENGINE_OFFLINE', MSG.OFFLINE);
      return res.json().then(function (body) {
        var names = (body && Array.isArray(body.models) ? body.models : []).map(function (m) { return String(m.name || '').toLowerCase(); });
        function has(n) {
          return names.some(function (x) { return x === n || x.indexOf(n + ':') === 0; });
        }
        var available = MODELS.filter(function (m) { return has(m); });
        if (available.length === 0) {
          return fail('MODEL_MISSING', 'Ollama chal raha hai par model nahi mila. Install karo: ollama pull ' + MODELS[0] + ' (aur fast fallback: ollama pull ' + MODELS[1] + ')');
        }
        activeModel = activeModel && available.indexOf(activeModel) !== -1 ? activeModel : available[0];
        if (!warmed) {
          warmed = true;
          // Warm-up (not a check): load Gemma so the first real check is fast.
          chatOnce([{ role: 'user', content: 'Ready? Sirf "OK" bolo.' }], { timeoutMs: TEXT_TIMEOUT_MS, numPredict: 5 }).catch(function () {});
        }
        return {
          mode: 'local',
          engine: 'ollama-local',
          model: activeModel,
          ready: true,
          keyConfigured: true,
          message: 'Local Ollama se chal raha hai — kuch bhi device se bahar nahi jata.',
        };
      });
    }, function (err) { throw err; });
  }

  function ollamaCheckText(text) {
    var v = validateTextInput(text);
    if (!v.ok) return fail(v.code, v.message);
    return judgeTextViaOllama(v.text);
  }

  var lastTranscript = null;

  function ollamaCheckImage(file) {
    if (!file) return fail('INVALID_INPUT', 'Screenshot select karo (PNG, JPG ya WebP — max 5 MB).');
    var size = typeof file.size === 'number' ? file.size : 0;
    var meta = validateImageMeta(file.type, file.name, size);
    if (!meta.ok) return fail(meta.code, meta.message);
    return fileToShrunkenJpegBase64(file).then(function (b64) {
      return transcribeViaOllama(b64).then(function (transcript) {
        var t = validateTranscript(transcript);
        if (!t.ok) {
          // NO_TEXT: try a clearer screenshot — NEVER a guessed verdict.
          return fail('OCR_FAILED', 'Screenshot me koi readable text nahi mila — thoda clear screenshot ya seedha text paste karke try karo.');
        }
        lastTranscript = t.text;
        return judgeTextViaOllama(t.text);
      });
    });
  }

  /* ---------- public dispatch: one contract, two engines ---------- */

  function getStatus(force) {
    if (apiBase() !== null) return adapterGetStatus(force);
    return ollamaGetStatus(force);
  }

  function checkText(text) {
    if (apiBase() !== null) return adapterCheckText(text);
    return ollamaCheckText(text);
  }

  function checkImage(file) {
    if (apiBase() !== null) return adapterCheckImage(file);
    return ollamaCheckImage(file);
  }

  /* ==================== AUTOTEST HOOK (?autotest=…) ====================
   * Test-only: runs one golden case / vision case and POSTs a JSON report to
   * the dev server (tools/serve.js). In normal mode this code path never runs
   * and the app's only network calls are to localhost:11434. */

  function autotestConfig() {
    if (typeof location === 'undefined') return null;
    var p = new URLSearchParams(location.search);
    var id = p.get('autotest');
    if (!id) return null;
    var byId = {};
    GOLDEN_CASES.forEach(function (g) { byId[g.id] = g; });
    if (id === 'shot') return { id: 'shot', kind: 'shot', expected: 'SCAM', file: '/shots/scam-screenshot.jpg' };
    if (id === 'notext') return { id: 'notext', kind: 'shot', expected: 'OCR_FAILED', file: '/shots/notext.jpg' };
    if (id === 'off') return { id: 'off', kind: 'text', expected: 'ENGINE_OFFLINE', sample: byId.G1 };
    if (byId[id]) return { id: id, kind: 'text', expected: null, sample: byId[id] };
    return null;
  }

  function autotestPass(cfg, got) {
    if (cfg.expected === 'OCR_FAILED' || cfg.expected === 'ENGINE_OFFLINE') return got === cfg.expected;
    if (cfg.kind === 'shot') return got && got.verdict === cfg.expected;
    var exp = cfg.sample.expected;
    if (!got || got.verdict !== exp.verdict) return false;
    if (got.confidence !== exp.confidence) return false;
    if (exp.trickIncludes && (!got.trick || got.trick.toLowerCase().indexOf(exp.trickIncludes) === -1)) return false;
    if (exp.trickNull && got.trick != null) return false;
    return true;
  }

  function autotestReport(cfg, got, ms, error, transcript) {
    var gotStr = error ? error.code : (cfg.kind === 'shot' && !got ? 'OCR_FAILED' : (got.verdict + '/' + got.confidence + (got.trick ? ' trick="' + got.trick + '"' : ' trick=null')));
    var pass = error ? (error.code === cfg.expected) : autotestPass(cfg, got);
    var line = 'CASE ' + cfg.id + ' EXPECTED=' + (cfg.expected || (cfg.sample.expected.verdict + '/' + cfg.sample.expected.confidence)) +
      ' GOT=' + gotStr + ' TIME=' + (ms != null ? ms : '-') + 'ms RESULT=' + (pass ? 'PASS' : 'FAIL');
    var el = document.getElementById('autotest-summary');
    if (el) { el.hidden = false; el.textContent = line; }
    document.title = line;
    fetch('/__test/report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: cfg.id, line: line, got: gotStr, ms: ms != null ? ms : null, pass: pass, transcript: transcript || null, at: new Date().toISOString() }),
    }).catch(function () { /* only the dev server has this endpoint */ });
  }

  function autotestRun(cfg) {
    var t0 = Date.now();
    var done = function (verdict, error, transcript) {
      autotestReport(cfg, verdict, Date.now() - t0, error, transcript || null);
    };
    if (cfg.kind === 'shot') {
      fetch(cfg.file).then(function (r) {
        if (!r.ok) throw new Error('no file');
        return r.blob();
      }).then(function (blob) {
        var f = new File([blob], 'shot.jpg', { type: blob.type || 'image/jpeg' });
        return checkImage(f).then(function (v) { done(v, null, lastTranscript); }, function (e) { done(null, e); });
      }).catch(function () { done(null, { code: 'INVALID_INPUT', message: 'test file missing' }); });
    } else {
      checkText(cfg.sample.message).then(function (v) { done(v, null); }, function (e) { done(null, e); });
    }
  }

  /* ==================== DEMO UI WIRING (progressive) ==================== */

  var DEMO_IDS = ['model-badge', 'wifi-badge', 'message-input', 'check-btn', 'screenshot-input', 'sample-chips', 'judge-btn', 'status-line', 'error-box', 'error-title', 'error-help', 'result', 'verdict-badge', 'verdict-confidence', 'verdict-summary', 'red-flags-list', 'trick-chip', 'scammer-wants', 'next-steps-list', 'family-warning', 'copy-warning-btn', 'transcript-card', 'transcript-box', 'meta-line', 'autotest-summary'];

  function $(id) { return document.getElementById(id); }
  function allIdsPresent() {
    return DEMO_IDS.every(function (id) { return $(id) !== null; });
  }

  var ui = { busy: false };

  function setStatus(msgOrNull) {
    var el = $('status-line');
    if (!el) return;
    if (!msgOrNull) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msgOrNull; // static strings only — never user data
  }

  function showError(code, message) {
    var box = $('error-box');
    if (!box) return;
    $('error-title').textContent = code === 'OCR_FAILED' ? 'Screenshot me koi readable text nahi mila' :
      code === 'MODEL_MISSING' ? 'Ollama me model nahi mila' :
      code === 'TIMEOUT' ? 'Gemma ne waqt me jawab nahi diya' :
      code === 'ENGINE_OFFLINE' ? 'Ollama se connection nahi ho paya' : 'Kuch gadbad hui';
    $('error-help').textContent = message;
    box.hidden = false;
  }

  function setBusyUI(b) {
    ui.busy = b;
    ['check-btn', 'judge-btn', 'copy-warning-btn'].forEach(function (id) { var el = $(id); if (el) el.disabled = b; });
    var ta = $('message-input'); if (ta) ta.disabled = b;
    var chips = $('sample-chips'); if (chips) chips.classList.toggle('chips-disabled', b);
    var fi = $('screenshot-input'); if (fi) fi.disabled = b;
  }

  function renderChips() {
    var wrap = $('sample-chips');
    if (!wrap) return;
    wrap.textContent = '';
    GOLDEN_CASES.forEach(function (g, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = (i + 1) + '. ' + g.chip;
      b.addEventListener('click', function () {
        if (ui.busy) return;
        $('message-input').value = g.message;
        runCheckText(g.message, null);
      });
      wrap.appendChild(b);
    });
  }

  function renderResult(v, meta) {
    $('result').hidden = false;

    var vb = $('verdict-badge');
    var cls = v.verdict === 'SCAM' ? 'verdict-scam' : v.verdict === 'SUSPICIOUS' ? 'verdict-suspicious' : 'verdict-safe';
    var vw = document.querySelector('.verdict-wrap');
    if (vw) vw.className = 'verdict-wrap ' + cls;
    vb.className = 'verdict';
    vb.textContent = v.verdict === 'LOOKS_SAFE' ? 'LOOKS SAFE' : v.verdict;

    $('verdict-confidence').textContent = v.confidence + ' confidence';
    $('verdict-summary').textContent = v.summary;

    var rf = $('red-flags-list');
    rf.textContent = '';
    if (!v.red_flags.length) {
      var li = document.createElement('li');
      li.textContent = v.verdict === 'LOOKS_SAFE' ? 'Koi lal flag nahi mila — koi demand nahi, koi link nahi.' : 'Koi pakki nishani (exact quote) nahi mili.';
      rf.appendChild(li);
    } else {
      v.red_flags.forEach(function (f) {
        var li = document.createElement('li');
        var q = document.createElement('span'); q.className = 'flag-quote'; q.textContent = '“' + f.quote + '”';
        var w = document.createElement('span'); w.className = 'flag-why'; w.textContent = ' — ' + f.why;
        li.appendChild(q); li.appendChild(w);
        rf.appendChild(li);
      });
    }

    $('trick-chip').textContent = v.trick ? v.trick : 'Koi naam wala trick nahi mila';
    $('scammer-wants').textContent = v.scammer_wants || 'Koi scammer ka agenda clear nahi mila.';

    var ns = $('next-steps-list');
    ns.textContent = '';
    v.next_steps.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      ns.appendChild(li);
    });

    ui.lastWarning = v.family_warning;
    $('family-warning').textContent = v.family_warning;

    var tcard = $('transcript-card');
    if (meta && meta.transcript) { tcard.hidden = false; $('transcript-box').textContent = meta.transcript; }
    else tcard.hidden = true;

    $('meta-line').textContent = 'Model: ' + (activeModel || MODELS[0]) + ' · Time: ' + (meta.ms / 1000).toFixed(1) +
      's · Yeh AI jaanch hai — koi bhi verdict ekdum pakka nahi hota, final decision official app me verify karke lo.';
  }

  function updateModelBadge() {
    var b = $('model-badge');
    if (!b) return;
    b.className = 'badge badge-wait';
    b.textContent = 'Engine check ho raha hai…';
    getStatus().then(function (s) {
      b.className = 'badge badge-ok';
      b.textContent = '✅ ' + s.model + ' ready (local)';
    }, function (e) {
      b.className = 'badge badge-bad';
      b.textContent = e.code === 'MODEL_MISSING' ? '❌ Model missing' : '❌ Ollama band hai';
    });
  }

  function runCheckText(text, autCfg) {
    var v = validateTextInput(text);
    if (!v.ok) { showError(v.code, v.message); return; }
    setBusyUI(true);
    $('error-box').hidden = true;
    $('result').hidden = true;
    setStatus('Gemma soch raha hai…');
    var t0 = Date.now();
    checkText(v.text).then(
      function (verdict) {
        setStatus(null);
        renderResult(verdict, { ms: Date.now() - t0 });
        if (autCfg) autotestReport(autCfg, verdict, Date.now() - t0, null);
      },
      function (e) {
        setStatus(null);
        showError(e.code || 'UNKNOWN', e.message || MSG.UNKNOWN);
        if (autCfg) autotestReport(autCfg, null, Date.now() - t0, { code: e.code || 'UNKNOWN', message: e.message });
      }
    ).then(function () { setBusyUI(false); });
  }

  function runCheckImage(file, autCfg) {
    setBusyUI(true);
    $('error-box').hidden = true;
    $('result').hidden = true;
    setStatus('Screenshot padha ja raha hai…');
    var t0 = Date.now();
    checkImage(file).then(
      function (verdict) {
        setStatus(null);
        renderResult(verdict, { ms: Date.now() - t0, transcript: lastTranscript });
        if (autCfg) autotestReport(autCfg, verdict, Date.now() - t0, null, lastTranscript);
      },
      function (e) {
        setStatus(null);
        showError(e.code || 'UNKNOWN', e.message || MSG.UNKNOWN);
        if (autCfg) autotestReport(autCfg, null, Date.now() - t0, { code: e.code || 'UNKNOWN', message: e.message }, lastTranscript);
      }
    ).then(function () { setBusyUI(false); });
  }

  function copyWarning() {
    var text = ui.lastWarning || '';
    if (!text) return;
    function done(ok) {
      var b = $('copy-warning-btn');
      var old = '📋 Warning copy karo';
      if (ok) {
        b.textContent = '✅ Copy ho gaya!';
        b.classList.add('copy-ok');
        setTimeout(function () { b.textContent = old; b.classList.remove('copy-ok'); }, 2000);
      } else {
        b.textContent = 'Copy nahi hua — text khud select kar lo';
        setTimeout(function () { b.textContent = old; }, 2000);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
    } else {
      done(legacyCopy(text));
    }
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function initDemo() {
    if (!allIdsPresent()) return; // custom frontend: window.ScamShield still works
    renderChips();
    updateModelBadge();
    var wb = $('wifi-badge');
    if (wb) wb.hidden = false;

    $('check-btn').addEventListener('click', function () { runCheckText($('message-input').value, null); });
    $('judge-btn').addEventListener('click', function () {
      // Demo: scam first, zero typing.
      $('message-input').value = GOLDEN_CASES[0].message;
      runCheckText(GOLDEN_CASES[0].message, null);
    });
    $('screenshot-input').addEventListener('change', function () {
      var f = $('screenshot-input').files && $('screenshot-input').files[0];
      if (f) runCheckImage(f, null);
      $('screenshot-input').value = '';
    });
    $('copy-warning-btn').addEventListener('click', copyWarning);

    var cfg = autotestConfig();
    if (cfg) autotestRun(cfg);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDemo);
    else initDemo();
  }

  /* ==================== PUBLIC CONTRACT ==================== */

  var ScamShield = {
    getStatus: getStatus,
    checkText: checkText,
    checkImage: checkImage,
  };
  try {
    Object.defineProperty(ScamShield, 'lastTranscript', {
      get: function () { return lastTranscript; },
      enumerable: false,
    });
  } catch (e) { /* older browsers: skip the convenience getter */ }

  if (typeof window !== 'undefined') window.ScamShield = ScamShield;

  /* ==================== NODE EXPORTS (tools/golden.mjs, tools/test-engine.mjs) ==================== */

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ScamShield: ScamShield,
      OLLAMA_URL: OLLAMA_URL,
      MODELS: MODELS,
      TEXT_TIMEOUT_MS: TEXT_TIMEOUT_MS,
      VISION_TIMEOUT_MS: VISION_TIMEOUT_MS,
      VERDICTS: VERDICTS,
      CONFIDENCES: CONFIDENCES,
      VERIFY_LINE: VERIFY_LINE,
      SYSTEM_PROMPT: SYSTEM_PROMPT,
      TRANSCRIBE_PROMPT: TRANSCRIBE_PROMPT,
      VERDICT_SCHEMA: VERDICT_SCHEMA,
      GOLDEN_CASES: GOLDEN_CASES,
      validateTextInput: validateTextInput,
      hasUnsupportedScript: hasUnsupportedScript,
      validateTranscript: validateTranscript,
      validateImageMeta: validateImageMeta,
      extractJsonObject: extractJsonObject,
      sanitizeFamilyWarning: sanitizeFamilyWarning,
      familyWarningViolates: familyWarningViolates,
      buildFallbackVerdict: buildFallbackVerdict,
      canonicalizeVerdict: canonicalizeVerdict,
      judgeTextViaOllama: judgeTextViaOllama,
      transcribeViaOllama: transcribeViaOllama,
      DEFAULT_STEPS_UNSAFE: DEFAULT_STEPS_UNSAFE,
      DEFAULT_STEPS_SAFE: DEFAULT_STEPS_SAFE,
      GENERIC_WARNING: GENERIC_WARNING,
    };
  }
})();
