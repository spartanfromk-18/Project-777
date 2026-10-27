'use strict';
// ScamShield — Gemini API engine (Option A, production mode).
// Model: gemma-4-26b-a4b-it — called from the BACKEND only. The API key never
// leaves this process (read from process.env, never logged, never returned).

class EngineError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
const COMPAT_MARKERS = /system_instruction|systeminstruction|system instruction|response_mime|responsemimetype|mime_type|unsupported/i;

function createGeminiEngine(opts) {
  const options = opts || {};
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
  const model = options.model || process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it';
  const baseUrl = (options.baseUrl || process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || Number(process.env.GEMINI_TIMEOUT_MS) || 60000;

  const OFFLINE_MSG = 'Gemini API tak nahi pahunch paye. Internet check karo, ya MODE=local (Ollama) try karo.';

  async function callApi(body, signal) {
    const res = await fetchImpl(baseUrl + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    }).catch((err) => {
      if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) throw new EngineError('TIMEOUT', 'Gemini API ka jawab ' + Math.round(timeoutMs / 1000) + ' second me nahi aaya. Dobara try karo ya MODE=local (Ollama) use karo.');
      throw new EngineError('ENGINE_OFFLINE', OFFLINE_MSG);
    });

    if (res.status === 404) throw new EngineError('MODEL_MISSING', 'Model "' + model + '" is Gemini API par available nahi hai. Model ka naam check karo.');
    if (res.status === 401 || res.status === 403) throw new EngineError('ENGINE_OFFLINE', 'Gemini API ne key reject kar di. Backend ke .env me sahi GEMINI_API_KEY hai ya nahi, check karo.');
    if (res.status === 429) throw new EngineError('ENGINE_OFFLINE', 'Gemini API par rate limit/quota hit ho gaya. Thoda der baad try karo ya MODE=local (Ollama) use karo.');

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      throw new EngineError('ENGINE_OFFLINE', OFFLINE_MSG);
    }

    if (!res.ok) {
      if (res.status === 400 && data && data.error && COMPAT_MARKERS.test(String(data.error.message || ''))) return { compat: true };
      if (res.status >= 500) throw new EngineError('ENGINE_OFFLINE', OFFLINE_MSG);
      const detail = cap(String((data.error && data.error.message) || ''), 140);
      throw new EngineError('ENGINE_OFFLINE', 'Gemini API ne request reject kar di.' + (detail ? ' (' + detail + ')' : ''));
    }
    return { compat: false, data };
  }

  function contentText(data) {
    const candidate = data && Array.isArray(data.candidates) && data.candidates[0];
    const parts = candidate && candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
    const text = parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('').trim();
    return text;
  }

  // Judge a text message. Returns the raw model reply (validation happens in the pipeline).
  async function judgeText(payload) {
    const userText = payload.extraInstruction
      ? payload.text + '\n\n---\n' + payload.extraInstruction
      : payload.text;

    const body = {
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      systemInstruction: { parts: [{ text: payload.systemPrompt }] },
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    };

    let out = await callApi(body, AbortSignal.timeout(timeoutMs));
    if (out.compat) {
      // Some Gemma builds reject systemInstruction / JSON mode — flatten instead.
      out = await callApi({
        contents: [{ role: 'user', parts: [{ text: payload.systemPrompt + '\n\n---\nMESSAGE:\n' + userText + '\n\nReturn ONLY the JSON object.' }] }],
        generationConfig: { temperature: 0.1 },
      }, AbortSignal.timeout(timeoutMs));
    }
    if (out.compat) throw new EngineError('BAD_RESPONSE', 'Gemini API is request ko accept nahi kar raha. Model setup check karo.');
    const text = contentText(out.data);
    if (!text) throw new EngineError('BAD_RESPONSE', 'Gemini API ne khaali jawab bheja. Dobara try karo.');
    return text;
  }

  // Read text from a screenshot. Returns the raw model reply ({"text": ...} or {"text": null}).
  async function transcribeImage(payload) {
    const body = {
      contents: [{
        role: 'user',
        parts: [{ inlineData: { mimeType: payload.mime, data: payload.base64 } }, { text: payload.prompt }],
      }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    };
    let out = await callApi(body, AbortSignal.timeout(timeoutMs));
    if (out.compat) {
      out = await callApi({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: payload.mime, data: payload.base64 } },
            { text: payload.prompt + '\nReturn ONLY the JSON object.' },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      }, AbortSignal.timeout(timeoutMs));
    }
    if (out.compat) throw new EngineError('BAD_RESPONSE', 'Gemini API is request ko accept nahi kar raha. Model setup check karo.');
    const text = contentText(out.data);
    if (!text) throw new EngineError('BAD_RESPONSE', 'Gemini API ne khaali jawab bheja. Dobara try karo.');
    return text;
  }

  return {
    id: 'gemini-api',
    model,
    hasKey: Boolean(apiKey),
    judgeText,
    transcribeImage,
  };
}

function cap(s, n) {
  const t = String(s == null ? '' : s).trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

module.exports = { createGeminiEngine, EngineError };
