'use strict';
// ScamShield — local Ollama engine (fallback mode, MODE=local).
// Runs at http://127.0.0.1:11434 — model gemma4:e4b, fallback gemma4:e2b.
// Local mode = nothing leaves the device.

const { EngineError } = require('./gemini');

function createOllamaEngine(opts) {
  const options = opts || {};
  const baseUrl = (options.baseUrl || process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const models = (options.models && options.models.length ? options.models : String(process.env.OLLAMA_MODELS || 'gemma4:e4b,gemma4:e2b').split(',').map((s) => s.trim()).filter(Boolean));
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || Number(process.env.OLLAMA_TIMEOUT_MS) || 60000;
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.1;

  let activeModel = null; // remembers which model worked (e4b or e2b)

  const OFFLINE_MSG = 'Local Ollama (127.0.0.1:11434) chal nahi raha. "ollama serve" start karo, ya MODE=api try karo.';
  const MISSING_MSG = 'Ollama me model nahi mila. Install karo: ollama pull ' + models[0] + (models[1] ? ' (aur fast fallback: ollama pull ' + models[1] + ')' : '');

  async function chatOnce(model, messages, signal) {
    const res = await fetchImpl(baseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, format: 'json', options: { temperature } }),
      signal,
    }).catch((err) => {
      if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) throw new EngineError('TIMEOUT', 'Ollama ka jawab ' + Math.round(timeoutMs / 1000) + ' second me nahi aaya — chhota model (e2b) try karo ya dobara run karo.');
      throw new EngineError('ENGINE_OFFLINE', OFFLINE_MSG);
    });

    if (res.status === 404) return { modelMissing: true };
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      throw new EngineError('ENGINE_OFFLINE', OFFLINE_MSG);
    }
    if (!res.ok) {
      const errText = String((data && data.error) || '');
      if (/not found|no such model|pull it first/i.test(errText)) return { modelMissing: true };
      if (res.status >= 500) throw new EngineError('ENGINE_OFFLINE', OFFLINE_MSG);
      throw new EngineError('ENGINE_OFFLINE', 'Ollama ne request reject kar di.' + (errText ? ' (' + errText.slice(0, 120) + ')' : ''));
    }
    const content = data && data.message && typeof data.message.content === 'string' ? data.message.content.trim() : '';
    if (!content) return { modelMissing: false, content: '' };
    return { modelMissing: false, content };
  }

  async function chat(messages) {
    const order = activeModel ? [activeModel, ...models.filter((m) => m !== activeModel)] : models.slice();
    let lastMissing = false;
    for (const model of order) {
      const out = await chatOnce(model, messages, AbortSignal.timeout(timeoutMs));
      if (out.modelMissing) { lastMissing = true; continue; }
      if (!out.content) throw new EngineError('BAD_RESPONSE', 'Ollama ne khaali jawab bheja. Dobara try karo.');
      activeModel = model;
      return out.content;
    }
    if (lastMissing) throw new EngineError('MODEL_MISSING', MISSING_MSG);
    throw new EngineError('ENGINE_OFFLINE', OFFLINE_MSG);
  }

  async function judgeText(payload) {
    const userText = payload.extraInstruction
      ? payload.text + '\n\n---\n' + payload.extraInstruction
      : payload.text;
    return chat([
      { role: 'system', content: payload.systemPrompt },
      { role: 'user', content: userText },
    ]);
  }

  async function transcribeImage(payload) {
    return chat([
      { role: 'user', content: payload.prompt, images: [payload.base64] },
    ]);
  }

  // Cheap reachability probe used by /api/status (never sends the message).
  async function isAlive() {
    try {
      const res = await fetchImpl(baseUrl + '/api/tags', { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  return {
    id: 'ollama-local',
    model: models[0],
    models,
    judgeText,
    transcribeImage,
    isAlive,
  };
}

module.exports = { createOllamaEngine };
