import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { analyzeMessageLocally } from './src/utils/scamEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { validateAndEnforceVerdictRules } from './src/utils/verdictValidator.ts';

/**
 * Extracts visible message text from screenshot using Gemini Vision (gemini-3.8-flash)
 */
async function extractTextFromScreenshot(ai: GoogleGenAI, imageData: string): Promise<string> {
  let mimeType = 'image/png';
  let base64 = imageData;
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64 = match[2];
  }

  const ocrPrompt =
    'You are an OCR extraction engine for scam message analysis. ' +
    'Extract all readable text, SMS body, or chat messages from this screenshot verbatim. ' +
    'Return ONLY the raw extracted text. Do not provide explanations, markdown headers, or comments. ' +
    'If no readable message or text is found in the screenshot, return exactly: OCR_FAILED';

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Vision OCR timed out after 60 seconds')), 60000)
  );

  const response = await Promise.race([
    ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
        { text: ocrPrompt },
      ],
      config: {
        temperature: 0.1,
      },
    }),
    timeoutPromise,
  ]);

  const extracted = (response.text || '').trim();
  return extracted;
}

/**
 * Calls gemma-4-26b-a4b-it with temperature 0.1, JSON output, 60s timeout,
 * and 1 repair retry on malformed JSON.
 */
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
  "red_flags": [
    {
      "quote": "<Exact verbatim substring from the message>",
      "why": "<Why this is a red flag>"
    }
  ],
  "trick": "<The psychological trick or scam strategy used>",
  "scammer_wants": "<What the sender wants next>",
  "next_steps": [
    "<Immediate action step 1>",
    "<Immediate action step 2>",
    "<Immediate action step 3>"
  ],
  "family_warning": "<Ready-to-share Hinglish warning message for family WhatsApp groups without any live links>",
  "summary": "<1-2 sentence plain text summary of the verdict>"
}

CRITICAL RULES:
1. "verdict" MUST be strictly "SCAM", "SUSPICIOUS", or "LOOKS_SAFE".
2. "confidence" MUST be strictly "High", "Medium", or "Low" (never a number or percentage).
3. "red_flags" MUST contain at most 4 items. Each "quote" MUST be an exact verbatim substring of the message text above. If LOOKS_SAFE, red_flags can be empty or list legitimate indicators.
4. If "verdict" is "SCAM", "next_steps" MUST include:
   - Do NOT click any link or pay any money.
   - Block the sender and report.
   - Call national cyber helpline 1930 immediately if money was sent (or visit cybercrime.gov.in).
5. "family_warning" MUST be in simple Hinglish (Hindi in Roman script) with NO live links or URLs.
6. Never invent details not present in the message.
7. Return ONLY the JSON object.`;

  const runCall = (promptStr: string) => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemma model request timed out after 60 seconds')), 60000)
    );

    return Promise.race([
      ai.models.generateContent({
        model: 'gemma-4-26b-a4b-it',
        contents: promptStr,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      timeoutPromise,
    ]);
  };

  const initialResponse = await runCall(gemmaPrompt);
  const rawText = (initialResponse.text || '').trim();

  // Parse JSON
  try {
    return JSON.parse(rawText);
  } catch (_firstParseError) {
    // Attempt 1 repair retry on malformed JSON
    try {
      const repairPrompt =
        'The following text was meant to be valid JSON for a scam analysis, but contained syntax errors:\n' +
        `"""\n${rawText}\n"""\n` +
        'Please repair and return ONLY the valid JSON object:';

      const retryResponse = await runCall(repairPrompt);
      const repairedText = (retryResponse.text || '').trim();
      return JSON.parse(repairedText);
    } catch (_retryError) {
      // Return a structured fallback that will be sanitized to SUSPICIOUS / Low
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // API endpoint for ScamShield message verification
  app.post('/api/check', async (req, res) => {
    try {
      const { text, mode, image } = req.body;

      // Handle explicit local mode request via API
      if (mode === 'local') {
        if (!text || typeof text !== 'string' || !text.trim()) {
          return res.status(400).json({ error: 'Message text is required for local analysis.' });
        }
        const localResult = analyzeMessageLocally(text);
        return res.json(localResult);
      }

      // Production Mode: Must call Google Gemini API with gemma-4-26b-a4b-it
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
        return res.status(503).json({
          error: 'ENGINE_OFFLINE: GEMINI_API_KEY is not configured on the server. Please switch to Local Mode (rules engine) to check messages offline.',
          code: 'ENGINE_OFFLINE',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let analyzedText = typeof text === 'string' ? text.trim() : '';
      let textWasExtractedViaOcr = false;

      // Production Mode with uploaded image: Extract text via Gemini Vision first
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
        } catch (ocrErr: any) {
          return res.status(502).json({
            error: `ENGINE_OFFLINE: Screenshot OCR failed (${ocrErr.message || 'API error'}). Please use Local Mode (rules engine) or paste text manually.`,
            code: 'ENGINE_OFFLINE',
          });
        }
      }

      if (!analyzedText) {
        return res.status(400).json({
          error: 'Message text or readable screenshot is required for analysis.',
        });
      }

      // Call Gemma for verdict
      let gemmaRawResult: any;
      try {
        gemmaRawResult = await callGemmaForVerdict(ai, analyzedText);
      } catch (gemmaErr: any) {
        return res.status(502).json({
          error: `ENGINE_OFFLINE: Gemma AI service is unavailable (${gemmaErr.message || 'API error'}). Please switch to Local Mode (rules engine).`,
          code: 'ENGINE_OFFLINE',
        });
      }

      // Validate in server.ts before returning:
      // bad JSON, non-verbatim quote, >4 flags, LOOKS_SAFE with High confidence,
      // or SCAM with Low confidence -> return SUSPICIOUS / Low, never LOOKS_SAFE.
      const sanitizedVerdict = validateAndEnforceVerdictRules(gemmaRawResult, analyzedText);

      if (textWasExtractedViaOcr) {
        sanitizedVerdict.extracted_text = analyzedText;
      }

      return res.json(sanitizedVerdict);
    } catch (err: any) {
      console.error('Scam analysis unexpected error:', err);
      return res.status(500).json({
        error: `ENGINE_OFFLINE: Unexpected error during verification (${err.message || 'Server error'}). Switch to Local Mode (rules engine).`,
        code: 'ENGINE_OFFLINE',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    return res.json({ status: 'ok', service: 'ScamShield Verification API' });
  });

  // Direct ZIP download route
  app.get('/ScamShield-Frontend.zip', (_req, res) => {
    const zipPath = path.resolve(__dirname, 'public', 'ScamShield-Frontend.zip');
    res.download(zipPath, 'ScamShield-Frontend.zip');
  });

  // In development, attach Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built static assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScamShield server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
