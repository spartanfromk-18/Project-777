'use strict';
// ScamShield — backend server (zero npm dependencies, Node >= 18).
// Frontend → window.ScamShield (app.js) → POST /api/check → runCheck → engine.
// MODE=api  : Gemini API, model gemma-4-26b-a4b-it (key from process.env only).
// MODE=local: local Ollama at 127.0.0.1:11434 (gemma4:e4b, fallback gemma4:e2b) — nothing leaves the device.
// Raw messages are never stored and never logged. The API key is never printed.

const fs = require('fs');
const path = require('path');
const http = require('http');

// Load .env BEFORE anything reads process.env. Real environment always wins.
// Values are never logged.
function loadEnvFile(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.length > 1 && val.startsWith('"') && val.endsWith('"')) || (val.length > 1 && val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch (_) { /* .env is optional */ }
}
loadEnvFile(path.join(__dirname, '.env'));

const { runCheck, buildEngine } = require('./api/check');
const { inputLimits } = require('./api/validate');

const ROOT = __dirname;
const JSON_BODY_LIMIT = 64 * 1024;
const IMAGE_LIMIT = inputLimits().maxImageBytes;

// ---------------------------------------------------------------------------
// Config + engine
// ---------------------------------------------------------------------------

function readConfig(overrides) {
  const o = overrides || {};
  return {
    port: o.port != null ? o.port : Number(process.env.PORT) || 3000,
    host: o.host || process.env.HOST || '0.0.0.0',
    mode: o.mode || process.env.MODE || 'api',
    mock: o.mock != null ? o.mock : process.env.SCAMSHIELD_MOCK === '1',
    apiKey: 'apiKey' in o ? o.apiKey : process.env.GEMINI_API_KEY || '',
    geminiModel: o.geminiModel || process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it',
    ollamaUrl: o.ollamaUrl || process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
    ollamaModels: o.ollamaModels || String(process.env.OLLAMA_MODELS || 'gemma4:e4b,gemma4:e2b').split(',').map((s) => s.trim()).filter(Boolean),
    rateLimitMax: o.rateLimitMax != null ? o.rateLimitMax : Number(process.env.RATE_LIMIT_MAX) || 10,
    rateLimitWindowMs: o.rateLimitWindowMs != null ? o.rateLimitWindowMs : Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    log: o.log || console.log,
  };
}

// ---------------------------------------------------------------------------
// Per-IP rate limiter (sliding window, in-memory only)
// ---------------------------------------------------------------------------

function createRateLimiter(max, windowMs) {
  const hits = new Map();
  return function allow(ip) {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      hits.set(ip, list);
      return false;
    }
    list.push(now);
    hits.set(ip, list);
    return true;
  };
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('BODY_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sniffImageMime(buffer, fallback) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return fallback || null;
}

function parseMultipart(buffer, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return null;
  const bBound = Buffer.from('--' + (m[1] || m[2]).trim());
  const parts = [];
  let pos = buffer.indexOf(bBound);
  while (pos !== -1) {
    const next = buffer.indexOf(bBound, pos + bBound.length);
    if (next === -1) break;
    let seg = buffer.subarray(pos + bBound.length, next);
    if (seg.length >= 2 && seg[0] === 0x0d && seg[1] === 0x0a) seg = seg.subarray(2);
    if (seg.length >= 2 && seg[seg.length - 2] === 0x0d && seg[seg.length - 1] === 0x0a) seg = seg.subarray(0, seg.length - 2);
    const headerEnd = seg.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const head = seg.subarray(0, headerEnd).toString('utf8');
      const body = seg.subarray(headerEnd + 4);
      const nameM = /name="([^"]*)"/i.exec(head);
      const fileM = /filename="([^"]*)"/i.exec(head);
      const typeM = /content-type:\s*([^\r\n]+)/i.exec(head);
      parts.push({
        name: nameM ? nameM[1] : null,
        filename: fileM ? fileM[1] : null,
        type: typeM ? typeM[1].trim() : null,
        data: body,
      });
    }
    pos = next;
  }
  return parts;
}

function buildCheckInput(req, body) {
  const ctype = String(req.headers['content-type'] || '');
  if (/^application\/json/i.test(ctype)) {
    let parsed = null;
    try { parsed = JSON.parse(body.toString('utf8')); } catch (_) { return { err: { code: 'INVALID_INPUT', message: 'Request samajh nahi aayi — {"text": "..."} format me bhejo.' } }; }
    if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') return { input: { text: parsed.text } };
    return { err: { code: 'INVALID_INPUT', message: 'Request me "text" nahi mila — {"text": "..."} format me bhejo.' } };
  }
  if (/^multipart\/form-data/i.test(ctype)) {
    const parts = parseMultipart(body, ctype);
    if (!parts) return { err: { code: 'INVALID_INPUT', message: 'Upload format samajh nahi aaya — dobara try karo.' } };
    let imagePart = null;
    let text = null;
    for (const p of parts) {
      const isFile = (p.filename && p.filename.trim()) || (p.type && p.type.startsWith('image/')) || ['image', 'file', 'screenshot', 'photo'].includes(p.name);
      if (isFile && p.data && p.data.length > 0 && !imagePart) imagePart = p;
      else if (p.name === 'text' && !p.filename) text = p.data.toString('utf8');
    }
    if (imagePart) {
      const mime = sniffImageMime(imagePart.data, imagePart.type && imagePart.type.startsWith('image/') ? imagePart.type : null);
      if (!mime) return { err: { code: 'INVALID_INPUT', message: 'Sirf PNG, JPG ya WebP screenshot chalta hai (max 5 MB).' } };
      return { input: { imageBase64: imagePart.data.toString('base64'), mime, size: imagePart.data.length } };
    }
    if (text) return { input: { text } };
    return { err: { code: 'INVALID_INPUT', message: 'Upload me na text mila, na screenshot — form me "text" ya "image" field bhejo.' } };
  }
  if (/^image\//i.test(ctype)) {
    const mime = sniffImageMime(body, ctype.split(';')[0].trim());
    if (!mime) return { err: { code: 'INVALID_INPUT', message: 'Sirf PNG, JPG ya WebP screenshot chalta hai (max 5 MB).' } };
    return { input: { imageBase64: body.toString('base64'), mime, size: body.length } };
  }
  return { err: { code: 'INVALID_INPUT', message: 'Content-Type samajh nahi aaya — JSON {"text": "..."} ya screenshot bhejo.' } };
}

// ---------------------------------------------------------------------------
// Static serving (frontend files belong to the frontend PR — server only serves what exists)
// ---------------------------------------------------------------------------

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function serveStatic(res, relPath) {
  const safe = path.normalize(path.join(ROOT, relPath));
  if (!safe.startsWith(ROOT)) return sendText(res, 403, 'text/plain', 'Forbidden');
  let data;
  try { data = fs.readFileSync(safe); } catch (_) { return false; }
  const ext = path.extname(safe).toLowerCase();
  res.writeHead(200, { 'content-type': STATIC_TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(data);
  return true;
}

function sendText(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

function sendJson(res, status, obj, cors) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (cors) {
    headers['access-control-allow-origin'] = '*';
    headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
    headers['access-control-allow-headers'] = 'content-type';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(obj));
}

const NO_FRONTEND_NOTICE = '<!doctype html><html><head><meta charset="utf-8"><title>ScamShield backend</title></head><body style="font-family:system-ui;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.6"><h1>🛡️ ScamShield backend chal raha hai</h1><p>Frontend files (index.html / styles.css) is repo me abhi merge nahi hui hain — backend aur <code>window.ScamShield</code> adapter (<code>/app.js</code>) ready hain.</p><p>Backend team ka engine: <code>POST /api/check</code>, <code>GET /api/status</code>. Mode aur key <code>.env</code> se aate hain (kabhi frontend me nahi).</p></body></html>';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

function createServer(overrides) {
  const config = readConfig(overrides);
  const log = config.log;
  const engine = buildEngine(config);
  const allowRequest = createRateLimiter(config.rateLimitMax, config.rateLimitWindowMs);
  const keyConfigured = config.mode !== 'api' || Boolean(config.apiKey);

  function logLine(status, method, urlPath, ms, extra) {
    // Privacy rule: log metadata only — never message content, never the key.
    log(`[${new Date().toISOString()}] ${method} ${urlPath} -> ${status} ${ms}ms${extra ? ' ' + extra : ''}`);
  }

  async function handleStatus(res) {
    let ready = false;
    let message;
    if (engine.id === 'mock') {
      ready = true;
      message = 'TEST-ONLY mock engine active — yeh live verdict nahi hai.';
    } else if (config.mode === 'local') {
      ready = await engine.isAlive();
      message = ready
        ? 'Local Ollama se chal raha hai — kuch bhi device se bahar nahi jata.'
        : 'Ollama (127.0.0.1:11434) reachable nahi hai — "ollama serve" start karo.';
    } else {
      ready = Boolean(config.apiKey);
      message = ready
        ? 'Gemini API se chal raha hai — message sirf verdict ke liye jata hai, kabhi store nahi hota.'
        : 'Backend me GEMINI_API_KEY set nahi hai — .env me key daalo (Google AI Studio se) aur restart karo.';
    }
    sendJson(res, 200, {
      ok: true,
      mode: engine.id === 'mock' ? 'mock' : config.mode,
      engine: engine.id,
      model: engine.model,
      ready,
      keyConfigured,
      message,
    }, true);
  }

  async function handleCheck(req, res, urlPath) {
    const startedAt = Date.now();
    const ip = req.socket.remoteAddress || 'unknown';
    if (!allowRequest(ip)) {
      logLine(429, 'POST', urlPath, Date.now() - startedAt, 'rate-limited');
      return sendJson(res, 429, { ok: false, error: { code: 'RATE_LIMIT', message: 'Bahut zyada requests ek saath — thoda (1 minute) ruk ke phir try karo.' } }, true);
    }

    let body;
    try {
      body = await readBody(req, IMAGE_LIMIT + 64 * 1024);
    } catch (_) {
      logLine(400, 'POST', urlPath, Date.now() - startedAt, 'body-too-large');
      return sendJson(res, 400, { ok: false, error: { code: 'INVALID_INPUT', message: 'Request bahut badi hai — message max ' + inputLimits().maxMessageLength + ' characters, screenshot max 5 MB.' } }, true);
    }

    const built = buildCheckInput(req, body);
    if (built.err) {
      logLine(400, 'POST', urlPath, Date.now() - startedAt, built.err.code);
      return sendJson(res, 400, { ok: false, error: built.err }, true);
    }

    if (config.mode === 'api' && engine.hasKey === false) {
      logLine(503, 'POST', urlPath, Date.now() - startedAt, 'no-api-key');
      return sendJson(res, 503, { ok: false, error: { code: 'ENGINE_OFFLINE', message: 'Backend me GEMINI_API_KEY set nahi hai — .env me key daalo (Google AI Studio se) aur server restart karo.' } }, true);
    }

    const result = await runCheck({ input: built.input, engine });
    if (!result.ok) {
      const status = { INVALID_INPUT: 400, UNSUPPORTED_LANGUAGE: 400, OCR_FAILED: 422, BAD_RESPONSE: 422, TIMEOUT: 503, ENGINE_OFFLINE: 503, MODEL_MISSING: 503 }[result.code] || 503;
      logLine(status, 'POST', urlPath, Date.now() - startedAt, result.code);
      return sendJson(res, status, { ok: false, error: { code: result.code, message: result.message } }, true);
    }
    logLine(200, 'POST', urlPath, Date.now() - startedAt, result.meta.source);
    return sendJson(res, 200, { ok: true, verdict: result.verdict, meta: result.meta }, true);
  }

  const server = http.createServer((req, res) => {
    const startedAt = Date.now();
    const urlPath = (req.url || '/').split('?')[0];

    if (urlPath.startsWith('/api/')) {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        });
        return res.end();
      }
      if (req.method === 'GET' && urlPath === '/api/status') {
        return handleStatus(res).catch(() => sendJson(res, 503, { ok: false, error: { code: 'ENGINE_OFFLINE', message: 'Status check fail hua — dobara try karo.' } }, true));
      }
      if (req.method === 'POST' && urlPath === '/api/check') {
        return handleCheck(req, res, urlPath).catch(() => {
          logLine(500, 'POST', urlPath, Date.now() - startedAt);
          sendJson(res, 500, { ok: false, error: { code: 'ENGINE_OFFLINE', message: 'Server me unexpected error aaya — dobara try karo.' } }, true);
        });
      }
      logLine(404, req.method, urlPath, Date.now() - startedAt);
      return sendJson(res, 404, { ok: false, error: { code: 'INVALID_INPUT', message: 'Yeh API route nahi hai — /api/check ya /api/status use karo.' } }, true);
    }

    if (req.method !== 'GET') {
      logLine(405, req.method, urlPath, Date.now() - startedAt);
      return sendText(res, 405, 'text/plain', 'Method not allowed');
    }

    // Static: the frontend owns these files; server serves whatever exists.
    if (urlPath === '/' || urlPath === '/index.html') {
      if (!serveStatic(res, 'index.html')) {
        logLine(200, 'GET', urlPath, Date.now() - startedAt, 'frontend-pending-notice');
        return sendText(res, 200, 'text/html; charset=utf-8', NO_FRONTEND_NOTICE);
      }
      logLine(200, 'GET', urlPath, Date.now() - startedAt);
      return undefined;
    }
    if (urlPath === '/app.js' || urlPath === '/styles.css' || urlPath.startsWith('/assets/') || urlPath.startsWith('/favicon')) {
      const served = serveStatic(res, urlPath === '/favicon.ico' ? 'favicon.ico' : urlPath.slice(1));
      logLine(served ? 200 : 404, 'GET', urlPath, Date.now() - startedAt);
      return undefined;
    }
    logLine(404, 'GET', urlPath, Date.now() - startedAt);
    return sendText(res, 404, 'text/plain', 'Not found');
  });

  server.scamshieldConfig = config;
  server.scamshieldEngine = engine;
  return server;
}

function main() {
  const server = createServer();
  const config = server.scamshieldConfig;
  const engine = server.scamshieldEngine;
  server.listen(config.port, config.host, () => {
    console.log('');
    console.log('  🛡️  ScamShield backend');
    console.log('  Mode   : ' + (engine.id === 'mock' ? 'TEST-ONLY MOCK (keyless rehearsal — not live)' : config.mode) + (engine.id === 'mock' ? '' : '  (engine: ' + engine.id + ')'));
    console.log('  Model  : ' + engine.model);
    if (config.mode === 'api' && engine.id !== 'mock') {
      console.log('  API key: ' + (config.apiKey ? 'configured (from process.env — never logged, never in frontend)' : 'MISSING — .env me GEMINI_API_KEY set karo'));
    }
    console.log('  URL    : http://localhost:' + config.port + '  (demo ke liye same Wi-Fi par phone se bhi khulega)');
    console.log('  Privacy: raw messages kabhi store nahi hote, kabhi log nahi hote.');
    console.log('');
  });
  const shutdown = () => { server.close(() => process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) main();

module.exports = { createServer, loadEnvFile, readConfig };
