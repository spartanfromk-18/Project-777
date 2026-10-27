// ScamShield — Vercel Serverless Function: POST /api/check
// Place this file at: landing-page/api/check.ts  (NOT at repo root, NOT in src/)
// Why this file exists: the Express server.ts only runs under `tsx server.ts`
// locally. A static Vercel Vite deploy never runs it, so /api/check 404s and
// Production Mode shows ENGINE_OFFLINE. This function is what Vercel actually
// serves at /api/check. It reuses the same Gemma call + validator as server.ts.
//
// Key rules (do not break these):
// - API key ONLY from process.env.GEMINI_API_KEY (Vercel env var). Never hardcode.
// - Never store or log the raw message text. No DB, no files, no console.log(text).
// - Bad Gemma output never becomes LOOKS_SAFE: validator downgrades to SUSPICIOUS/Low.
// - Screenshot OCR uses Gemini Vision (gemini-3.8-flash) — label it honestly,
//   do NOT claim Gemma OCR. The verdict itself is gemma-4-26b-a4b-it.
// - Rate limit is in-memory per instance: Vercel serverless instances reset, so
//   this is abuse friction for a demo, not a production-grade limiter.

import { GoogleGenAI } from '@google/genai';
import { validateAndEnforceVerdictRules } from '../src/utils/verdictValidator.js';

export const config = { maxDuration: 55 };

const MAX_TEXT = 5000;
const MIN_TEXT = 10;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

const hits = new Map<string, number[]>();

function logGeminiFailure(error: unknown, fallbackCode: string, attempt: number): void {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const nested = details.error && typeof details.error === 'object' ? details.error as Record<string, unknown> : {};
  const response = details.response && typeof details.response === 'object' ? details.response as Record<string, unknown> : {};
  const status = details.status ?? details.statusCode ?? nested.status ?? nested.statusCode ?? response.status ?? 'unknown';
  const statusCode = typeof status === 'number' || typeof status === 'string' ? status : 'unknown';
  const statusText = String(statusCode);
  const code = /timeout/i.test(String(details.message || ''))
    ? 'GEMINI_TIMEOUT'
    : statusText === '429'
    ? 'GEMINI_429'
    : statusText === '503'
    ? 'GEMINI_503'
    : fallbackCode;
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    status: statusCode,
    code,
    attempt,
  }));
}

function isRetryableGeminiError(error: unknown): boolean {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const nested = details.error && typeof details.error === 'object' ? details.error as Record<string, unknown> : {};
  const response = details.response && typeof details.response === 'object' ? details.response as Record<string, unknown> : {};
  const status = details.status ?? details.statusCode ?? nested.status ?? nested.statusCode ?? response.status;
  return /timeout/i.test(String(details.message || '')) || String(status) === '429' || String(status) === '503';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function visibleLength(text: string): number {
  return text.trim().length;
}

async function extractTextFromScreenshot(ai: GoogleGenAI, imageData: string): Promise<string> {
  let mimeType = 'image/png';
  let base64 = imageData;
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64 = match[2];
  }
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Vision OCR timed out')), 50000),
  );
  const response = await Promise.race([
    ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { inlineData: { mimeType, data: base64 } },
        {
          text:
            'You are an OCR extraction engine for scam message analysis. ' +
            'Extract all readable text, SMS body, or chat messages from this screenshot verbatim. ' +
            'Return ONLY the raw extracted text. If no readable message or text is found, return exactly: OCR_FAILED',
        },
      ],
      config: { temperature: 0.1 },
    }),
    timeout,
  ]);
  return (response.text || '').trim();
}

async function callGemmaForVerdict(ai: GoogleGenAI, messageText: string): Promise<any> {
  const gemmaPrompt = `Analyze the following message for fraud and scam vectors commonly targeting Indian citizens (electricity disconnection, fake bank KYC, task jobs, digital arrest, courier/customs, lottery).

MESSAGE TO ANALYZE:
"""
${messageText}
"""

You MUST return a JSON object with this EXACT structure:
{
  "verdict": "SCAM" | "SUSPICIOUS" | "LOOKS_SAFE",
  "confidence": "High" | "Medium" | "Low",
  "red_flags": [{ "quote": "<Exact verbatim substring from the message>", "why": "<Why this is a red flag>" }],
  "trick": "<The psychological trick or scam strategy used>",
  "scammer_wants": "<What the sender wants next>",
  "next_steps": ["<Immediate action step 1>", "<Immediate action step 2>", "<Immediate action step 3>"],
  "family_warning": "<Ready-to-share Hinglish warning message for family WhatsApp groups without any live links>",
  "summary": "<1-2 sentence plain text summary of the verdict>"
}

CRITICAL RULES:
1. "verdict" MUST be strictly "SCAM", "SUSPICIOUS", or "LOOKS_SAFE".
2. "confidence" MUST be strictly "High", "Medium", or "Low" (never a number or percentage).
3. "red_flags" MUST contain at most 4 items. Each "quote" MUST be an exact verbatim substring of the message text above. If LOOKS_SAFE, red_flags can be empty.
4. If "verdict" is "SCAM", "next_steps" MUST include: Do NOT click any link or pay any money. Block the sender and report. Call national cyber helpline 1930 immediately if money was sent (or visit cybercrime.gov.in).
5. "family_warning" MUST be in simple Hinglish (Hindi in Roman script) with NO live links or URLs.
6. Never invent details not present in the message.
7. Return ONLY the JSON object.`;

  const runCall = (promptStr: string) => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemma model request timed out')), 25000),
    );
    return Promise.race([
      ai.models.generateContent({
        model: 'gemma-4-26b-a4b-it',
        contents: promptStr,
        config: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
      timeout,
    ]);
  };

  const runInitialCallWithRetry = async () => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await runCall(gemmaPrompt);
      } catch (error) {
        logGeminiFailure(error, 'GEMINI_REQUEST_FAILED', attempt);
        if (attempt === 2 || !isRetryableGeminiError(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Gemma request retry exhausted');
  };

  const initial = await runInitialCallWithRetry();
  const rawText = (initial.text || '').trim();
  try {
    return JSON.parse(rawText);
  } catch {
    try {
      const repairPrompt =
        'The following text was meant to be valid JSON for a scam analysis, but contained syntax errors:\n' +
        `"""\n${rawText}\n"""\n` +
        'Please repair and return ONLY the valid JSON object:';
      const retry = await runCall(repairPrompt);
      return JSON.parse((retry.text || '').trim());
    } catch {
      return {
        verdict: 'SUSPICIOUS',
        confidence: 'Low',
        red_flags: [],
        trick: 'Model output could not be parsed into valid JSON structure.',
        scammer_wants: 'Verify via official application.',
        next_steps: [
          'Do NOT click any link in this unverified message.',
          'Verify sender authenticity through their official portal.',
          'If money was transferred, call 1930 immediately.',
        ],
        family_warning: '⚠️ Savdhaan: Yeh message suspicious lag raha hai. Kisi bhi link par click na karein.',
        summary: 'Message flagged as suspicious due to inconclusive analysis structure.',
      };
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST /api/check.' });
  }

  const ip =
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({
      error: 'RATE_LIMITED: Too many checks. Wait a minute and try again.',
      code: 'RATE_LIMITED',
    });
  }

  try {
    const { text, image } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      return res.status(503).json({
        error:
          'ENGINE_OFFLINE: GEMINI_API_KEY is not configured on the server. Please switch to Local Mode (rules engine) to check messages offline.',
        code: 'ENGINE_OFFLINE',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    let analyzedText = typeof text === 'string' ? text.trim() : '';
    let textWasExtractedViaOcr = false;

    if (image && typeof image === 'string') {
      try {
        const extracted = await extractTextFromScreenshot(ai, image);
        if (!extracted || extracted === 'OCR_FAILED' || extracted.length < 5) {
          return res.status(400).json({
            error: 'OCR_FAILED: No readable message found in screenshot. Please paste the text manually.',
            code: 'OCR_FAILED',
          });
        }
        analyzedText = extracted;
        textWasExtractedViaOcr = true;
      } catch (error) {
        logGeminiFailure(error, 'GEMINI_REQUEST_FAILED', 1);
        return res.status(502).json({
          error: 'ENGINE_OFFLINE: Screenshot OCR failed. Please use Local Mode (rules engine) or paste text manually.',
          code: 'ENGINE_OFFLINE',
        });
      }
    }

    if (!analyzedText) {
      return res.status(400).json({
        error: 'INVALID_INPUT: Message text or readable screenshot is required for analysis.',
        code: 'INVALID_INPUT',
      });
    }
    if (visibleLength(analyzedText) < MIN_TEXT) {
      return res.status(400).json({
        error: 'INVALID_INPUT: Message is too short to check. Paste the full message (at least 10 characters).',
        code: 'INVALID_INPUT',
      });
    }
    if (analyzedText.length > MAX_TEXT) {
      return res.status(400).json({
        error: `INVALID_INPUT: Message is too long (max ${MAX_TEXT} characters). Paste a single message, not a whole chat.`,
        code: 'INVALID_INPUT',
      });
    }

    let gemmaRawResult: any;
    try {
      gemmaRawResult = await callGemmaForVerdict(ai, analyzedText);
    } catch {
      return res.status(502).json({
        error: 'ENGINE_OFFLINE: Gemma AI service is unavailable. Please switch to Local Mode (rules engine).',
        code: 'ENGINE_OFFLINE',
      });
    }

    const sanitizedVerdict = validateAndEnforceVerdictRules(gemmaRawResult, analyzedText);
    if (textWasExtractedViaOcr) {
      (sanitizedVerdict as any).extracted_text = analyzedText;
    }
    return res.json(sanitizedVerdict);
  } catch (error) {
    logGeminiFailure(error, 'GEMINI_HANDLER_FAILED', 2);
    return res.status(500).json({
      error: 'ENGINE_OFFLINE: Unexpected error during verification. Switch to Local Mode (rules engine).',
      code: 'ENGINE_OFFLINE',
    });
  }
}
