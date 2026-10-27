'use strict';
// ScamShield — verdict pipeline (backend).
// Frontend → window.ScamShield → POST /api/check → this pipeline → engine (Gemini API | Ollama) → validation.
// The model is NEVER trusted: replies are parsed, repaired once, then canonicalized by api/validate.js.

const {
  validateTextInput,
  validateTranscript,
  validateImageInput,
  canonicalizeVerdict,
  buildFallbackVerdict,
} = require('./validate');
const { EngineError } = require('./gemini');
const { createGeminiEngine } = require('./gemini');
const { createOllamaEngine } = require('./ollama');
const { createMockEngine } = require('./engines/mock');

const SYSTEM_PROMPT = [
  'You are ScamShield, a fraud detective for Indian families. You read ONE message — an SMS, WhatsApp forward, email, or text read from a screenshot — and return a verdict in simple Hinglish.',
  '',
  'Judge the message using these India-specific patterns:',
  '- Bank impersonation: fake KYC expiry, "account blocked", a link to click or a number to call, urgency of a few hours. → SCAM.',
  '- Courier/customs fraud: parcel held, a small fee to release it, a UPI id given, a prize attached. → SCAM.',
  '- Fake job offer: big salary, registration/processing fee paid first. → SCAM.',
  '- Digital arrest: fake police/CBI/customs "officer", video-call verification, "your phone is under monitoring", move money to a "safe account", secrecy threats. → SCAM.',
  '- Anyone asking for OTP, UPI PIN, CVV or card details: → SCAM.',
  '- Genuine bank/service alerts only inform (a debit happened, no action needed, verify via the number on your card or the official app) — no link, no urgency, no OTP demand. → LOOKS_SAFE.',
  '- Too vague or too little context to judge: → SUSPICIOUS with Low confidence and trick null.',
  '- Mixed signals, odd but unproven: → SUSPICIOUS. Never LOOKS_SAFE when unsure. When in doubt, SUSPICIOUS.',
  '',
  'Return ONLY one JSON object with exactly these 8 fields, in this order:',
  '{"verdict":"SCAM"|"SUSPICIOUS"|"LOOKS_SAFE","confidence":"High"|"Medium"|"Low","red_flags":[{"quote":"...","why":"..."}],"trick":"short Hinglish name of the scam trick"|null,"scammer_wants":"what the scammer is after, simple Hinglish"|null,"next_steps":[3 to 5 short practical steps in Hinglish, always including block and report on 1930 for scams],"family_warning":"short forwardable WhatsApp-style warning in Hinglish — NO links, NO phone numbers, NO OTP digits","summary":"1-2 simple Hinglish sentences"}',
  '',
  'Hard rules:',
  '- red_flags has at most 4 items; every quote must be copied WORD-FOR-WORD from the message (exact substring, same script) — never invent or paraphrase a quote. Use [] when nothing is quotable.',
  '- Write why, scammer_wants, next_steps, family_warning and summary in simple Hinglish (Roman script) a grandmother can follow.',
  '- trick is null unless a named scam trick is actually present.',
  '- LOOKS_SAFE never uses High confidence.',
  '- No text outside the JSON object. No markdown fences.',
].join('\n');

const TRANSCRIBE_PROMPT = [
  'Transcribe ALL readable text from this message screenshot exactly as written — same language, same script, same numbers.',
  'Reply ONLY with a JSON object: {"text": "<the transcription>"} or {"text": null} if the screenshot has no readable text (blank, unreadably blurry, or only pictures).',
].join(' ');

const REPAIR_INSTRUCTION = [
  'Your previous reply was not a single valid JSON object matching the required schema.',
  'Reply again with ONLY the JSON object — exactly the 8 fields in order (verdict, confidence, red_flags, trick, scammer_wants, next_steps, family_warning, summary),',
  'every red-flag quote copied word-for-word from the message, no markdown fences, no extra text.',
].join(' ');

// ---------------------------------------------------------------------------
// JSON extraction (models add fences/prose around JSON — tolerate, but verify)
// ---------------------------------------------------------------------------

function tryParse(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (_) {
    return { ok: false };
  }
}

function extractJsonObject(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'reply was empty' };
  const t = text.trim();
  const direct = tryParse(t);
  if (direct.ok) return direct;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    const p = tryParse(fence[1].trim());
    if (p.ok) return p;
  }
  const start = t.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
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
          const p = tryParse(t.slice(start, i + 1));
          return p.ok ? p : { ok: false, reason: 'found a JSON-like block but it did not parse' };
        }
      }
    }
  }
  return { ok: false, reason: 'no JSON object found in the reply' };
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 60000; // 60-second engine timeout

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new EngineError('TIMEOUT', 'Engine ka jawab ' + Math.round(ms / 1000) + ' second me nahi aaya. Dobara try karo.')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function judgeOnce(engine, text, extraInstruction, timeoutMs) {
  const raw = await withTimeout(engine.judgeText({ text, systemPrompt: SYSTEM_PROMPT, extraInstruction }), timeoutMs);
  if (typeof raw !== 'string' || !raw.trim()) throw new EngineError('BAD_RESPONSE', 'Engine ne khaali jawab bheja. Dobara try karo.');
  const parsed = extractJsonObject(raw);
  if (!parsed.ok) return { bad: parsed.reason };
  const canon = canonicalizeVerdict(parsed.value, text);
  return canon.ok ? { verdict: canon.verdict } : { bad: canon.reason };
}

// One attempt + at most ONE repair retry on malformed JSON/schema. If it still
// fails: degrade to the honest SUSPICIOUS fallback — never a fake verdict.
async function judgeVerdict(engine, text, timeoutMs) {
  const first = await judgeOnce(engine, text, null, timeoutMs);
  if (first.verdict) return { verdict: first.verdict };
  const second = await judgeOnce(engine, text, REPAIR_INSTRUCTION + ' Problem: ' + first.bad + '.', timeoutMs);
  if (second.verdict) return { verdict: second.verdict, repaired: true };
  return { verdict: buildFallbackVerdict(), degraded: true };
}

// runCheck({ input, engine, timeoutMs })
//   input: { text } | { imageBase64, mime, size }
// → { ok: true, verdict, meta } | { ok: false, code, message }
async function runCheck(opts) {
  const engine = opts.engine;
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();
  try {
    if (!engine) return { ok: false, code: 'ENGINE_OFFLINE', message: 'Backend me engine configure nahi hua hai. Server ko restart karo.' };

    if (opts.input && typeof opts.input.imageBase64 === 'string') {
      const img = validateImageInput(opts.input.mime, opts.input.size);
      if (!img.ok) return img;

      // Step 1 — read the screenshot (OCR). No readable text → OCR_FAILED, never a verdict.
      const rawTranscript = await withTimeout(engine.transcribeImage({ base64: opts.input.imageBase64, mime: opts.input.mime, prompt: TRANSCRIBE_PROMPT }), timeoutMs);
      const parsedTranscript = extractJsonObject(rawTranscript);
      const transcript = parsedTranscript.ok && parsedTranscript.value && typeof parsedTranscript.value.text === 'string' ? parsedTranscript.value.text : null;
      const t = validateTranscript(transcript);
      if (!t.ok) return { ok: false, code: 'OCR_FAILED', message: 'Screenshot me koi readable text nahi mila — thoda clear screenshot ya seedha text paste karke try karo.' };

      // Step 2 — judge the transcribed text with the same rules as pasted text.
      const result = await judgeVerdict(engine, t.text, timeoutMs);
      return {
        ok: true,
        verdict: result.verdict,
        meta: { engine: engine.id, model: engine.model, source: 'image', latencyMs: Date.now() - startedAt, degraded: Boolean(result.degraded), repaired: Boolean(result.repaired) },
      };
    }

    const v = validateTextInput(opts.input ? opts.input.text : undefined);
    if (!v.ok) return v;
    const result = await judgeVerdict(engine, v.text, timeoutMs);
    return {
      ok: true,
      verdict: result.verdict,
      meta: { engine: engine.id, model: engine.model, source: 'text', latencyMs: Date.now() - startedAt, degraded: Boolean(result.degraded), repaired: Boolean(result.repaired) },
    };
  } catch (err) {
    if (err instanceof EngineError) return { ok: false, code: err.code, message: err.message };
    if (err && err.code) return { ok: false, code: err.code, message: err.message };
    return { ok: false, code: 'ENGINE_OFFLINE', message: 'Engine me unexpected error aaya — dobara try karo.' };
  }
}

// Engine factory for the server: MODE=api → Gemini API, MODE=local → Ollama.
// SCAMSHIELD_MOCK=1 → TEST-ONLY mock engine (keyless rehearsal — never a live pass).
function buildEngine(config) {
  const cfg = config || {};
  if (cfg.mock) return createMockEngine();
  if ((cfg.mode || process.env.MODE || 'api') === 'local') {
    return createOllamaEngine({
      baseUrl: cfg.ollamaUrl,
      models: cfg.ollamaModels,
    });
  }
  return createGeminiEngine({ apiKey: cfg.apiKey, model: cfg.geminiModel });
}

module.exports = {
  runCheck,
  buildEngine,
  extractJsonObject,
  SYSTEM_PROMPT,
  TRANSCRIBE_PROMPT,
  REPAIR_INSTRUCTION,
};
