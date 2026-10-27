// ScamShield — MOCK TEST SUITE (keyless, offline).
// These are MOCK tests: every verdict here comes from the TEST-ONLY scripted
// engine (api/engines/mock.js), NOT from gemma-4-26b-a4b-it. They verify the
// pipeline, validation, error handling and the verdict-object contract.
// Live golden-case passes are a SEPARATE run: node tests/golden.mjs (needs GEMINI_API_KEY in .env).
//
// Run: npm test   (= node --test tests/)

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import validate from '../api/validate.js';
import check from '../api/check.js';
import { createGeminiEngine } from '../api/gemini.js';
import { createOllamaEngine } from '../api/ollama.js';
import { createMockEngine } from '../api/engines/mock.js';
import { createServer } from '../server.js';
import goldenCases from './golden-cases.js';

const CASES = goldenCases;
const mock = createMockEngine();
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const CANON_FIELDS = ['verdict', 'confidence', 'red_flags', 'trick', 'scammer_wants', 'next_steps', 'family_warning', 'summary'];

function assertCanonicalVerdict(v) {
  assert.equal(typeof v, 'object');
  assert.deepEqual(Object.keys(v), CANON_FIELDS, 'verdict must have exactly the 8 canonical fields, in order');
  assert.ok(['SCAM', 'SUSPICIOUS', 'LOOKS_SAFE'].includes(v.verdict));
  assert.ok(['High', 'Medium', 'Low'].includes(v.confidence));
  assert.ok(Array.isArray(v.red_flags) && v.red_flags.length <= 4);
  for (const f of v.red_flags) {
    assert.deepEqual(Object.keys(f), ['quote', 'why']);
    assert.equal(typeof f.quote, 'string');
    assert.equal(typeof f.why, 'string');
  }
  assert.ok(Array.isArray(v.next_steps) && v.next_steps.length >= 3 && v.next_steps.length <= 5);
  assert.equal(typeof v.family_warning, 'string');
  assert.equal(typeof v.summary, 'string');
}

// A family warning must never carry a link, a phone number or OTP digits.
function assertCleanWarning(w) {
  assert.ok(!/https?:\/\//i.test(w), 'no links: ' + w);
  assert.ok(!/\bwww\./i.test(w), 'no links: ' + w);
  assert.ok(!/(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/.test(w), 'no phone numbers: ' + w);
  assert.ok(!/\b\d{6}\b/.test(w), 'no OTP-shaped digits: ' + w);
}

// ---------------------------------------------------------------------------
// 1. Golden-case REHEARSAL through the full pipeline (MOCK ENGINE — not live)
// ---------------------------------------------------------------------------
test('MOCK golden rehearsal: G1–G6 give expected verdict + confidence + trick', async () => {
  for (const id of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) {
    const c = CASES[id];
    const out = await check.runCheck({ input: { text: c.message }, engine: mock });
    assert.ok(out.ok, id + ' should succeed, got ' + JSON.stringify(out));
    const v = out.verdict;
    assertCanonicalVerdict(v);
    assert.equal(v.verdict, c.expected.verdict, id + ' verdict');
    assert.equal(v.confidence, c.expected.confidence, id + ' confidence');
    if (c.expected.trickNull) assert.equal(v.trick, null, id + ' trick must be null');
    if (c.expected.trickIncludes) assert.ok(v.trick && v.trick.toLowerCase().includes(c.expected.trickIncludes), id + ' trick named: ' + v.trick);
    if (v.verdict === 'SCAM') {
      assert.ok(v.red_flags.length >= 1, id + ' SCAM must carry quoted proof');
      for (const f of v.red_flags) assert.ok(c.message.includes(f.quote), id + ' quotes must be verbatim substrings of the input');
    }
    if (v.verdict === 'LOOKS_SAFE') {
      assert.ok(v.next_steps.some((s) => /official app/i.test(s)), id + ' LOOKS_SAFE must add "still verify in the official app"');
    }
    assertCleanWarning(v.family_warning);
    assert.notEqual(v.summary.trim(), '');
  }
});

test('MOCK golden rehearsal: Hinglish (GH) and Devanagari (GD) scam cases', async () => {
  for (const id of ['GH', 'GD']) {
    const c = CASES[id];
    const out = await check.runCheck({ input: { text: c.message }, engine: mock });
    assert.ok(out.ok, id + ' should succeed');
    assertCanonicalVerdict(out.verdict);
    assert.equal(out.verdict.verdict, 'SCAM', id + ' verdict');
    assert.equal(out.verdict.confidence, 'High', id + ' confidence');
    assert.ok(out.verdict.trick, id + ' trick named');
    for (const f of out.verdict.red_flags) assert.ok(c.message.includes(f.quote), id + ' verbatim quotes');
  }
});

// ---------------------------------------------------------------------------
// 2. Schema validation rules (never trust the model)
// ---------------------------------------------------------------------------
test('untraceable red flags are dropped, traceable ones kept', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_UNTRACEABLE test message about a transfer' }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'SCAM');
  const quotes = out.verdict.red_flags.map((f) => f.quote);
  assert.deepEqual(quotes, ['MOCK_UNTRACEABLE test message'], 'fabricated quote must be dropped, real one kept');
});

test('SCAM without any traceable red flag is demoted to SUSPICIOUS (no evidence, no SCAM)', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_SCAM_NOFLAGS something' }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'SUSPICIOUS');
  assert.equal(out.verdict.confidence, 'Low');
});

test('SCAM without a named trick is demoted to SUSPICIOUS', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_SCAM_NOTRICK something' }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'SUSPICIOUS');
  assert.equal(out.verdict.confidence, 'Low');
});

test('LOOKS_SAFE never carries High confidence (capped to Medium)', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_LOOKSAFE_HIGH message body' }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'LOOKS_SAFE');
  assert.equal(out.verdict.confidence, 'Medium', 'High must be capped to Medium');
  assert.equal(out.verdict.trick, null);
  assert.ok(out.verdict.next_steps.some((s) => /official app/i.test(s)), 'verify-app step added');
});

test('LOOKS_SAFE with a red flag is demoted to SUSPICIOUS (mixed signals)', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_LOOKSAFE_FLAGS message body' }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'SUSPICIOUS');
  assert.equal(out.verdict.confidence, 'Low');
});

test('family_warning is sanitized: no OTP, no link, no phone number', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_DIRTYWARNING case' }, engine: mock });
  assert.ok(out.ok);
  assertCleanWarning(out.verdict.family_warning);
  assert.equal(out.verdict.verdict, 'SCAM', 'verdict itself is unaffected');
});

test('next_steps: 3–5 enforced, 1930 reporting present for SCAM/SUSPICIOUS', async () => {
  const out = await check.runCheck({ input: { text: 'kya haal hai bhai' }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'SUSPICIOUS');
  assert.ok(out.verdict.next_steps.length >= 3 && out.verdict.next_steps.length <= 5);
  assert.ok(out.verdict.next_steps.some((s) => /1930|cybercrime/i.test(s)), 'must include block/report on 1930');
});

test('validate unit: substring, sanitizer, fallback shape', () => {
  const dirty = validate.sanitizeFamilyWarning('Ruko — 98765 43210 par call mat karo, http://bit.ly/xx click mat, OTP 456789 mat bhejo. Report: 1930.');
  assert.ok(!dirty.includes('98765'));
  assert.ok(!dirty.includes('43210'));
  assert.ok(!/bit\.ly/.test(dirty));
  assert.ok(!dirty.includes('456789'));
  assert.ok(dirty.includes('1930'), '1930 helpline must survive sanitization');

  const fallback = validate.buildFallbackVerdict();
  assertCanonicalVerdict(fallback);
  assert.equal(fallback.verdict, 'SUSPICIOUS');
  assert.equal(fallback.confidence, 'Low');
  assert.equal(fallback.trick, null);

  const bad = validate.canonicalizeVerdict({ verdict: 'MAYBE', confidence: 'High' }, 'x');
  assert.ok(!bad.ok && bad.reason, 'invalid verdict must fail canonicalization');
});

// ---------------------------------------------------------------------------
// 3. Degradation: malformed replies, timeouts, offline, missing model
// ---------------------------------------------------------------------------
test('malformed reply gets ONE repair retry, then a valid answer passes', async () => {
  const calls = [];
  const engine = {
    id: 'mock-spy', model: 'x', hasKey: true,
    judgeText: async (p) => {
      calls.push(Boolean(p.extraInstruction));
      return mock.judgeText(p);
    },
    transcribeImage: async (p) => mock.transcribeImage(p),
  };
  const out = await check.runCheck({ input: { text: 'MOCK_MALFORM message' }, engine });
  assert.ok(out.ok);
  assert.equal(calls.length, 2, 'exactly one repair retry');
  assert.deepEqual(calls, [false, true]);
  assert.equal(out.verdict.verdict, 'SUSPICIOUS');
  assert.equal(out.meta.repaired, true);
});

test('garbage even after repair degrades to honest SUSPICIOUS, never LOOKS_SAFE, never a fake verdict', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_GARBAGE reply' }, engine: mock });
  assert.ok(out.ok);
  assertCanonicalVerdict(out.verdict);
  assert.equal(out.verdict.verdict, 'SUSPICIOUS');
  assert.equal(out.verdict.confidence, 'Low');
  assert.equal(out.meta.degraded, true);
});

test('empty engine reply is BAD_RESPONSE (a clean error, not a verdict)', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_EMPTY reply' }, engine: mock });
  assert.ok(!out.ok);
  assert.equal(out.code, 'BAD_RESPONSE');
  assert.ok(out.message.length > 5, 'plain-language message');
});

test('hung engine is cut off with TIMEOUT', async () => {
  const out = await check.runCheck({ input: { text: 'MOCK_TIMEOUT case' }, engine: mock, timeoutMs: 250 });
  assert.ok(!out.ok);
  assert.equal(out.code, 'TIMEOUT');
});

test('API-down (network refuses) degrades to ENGINE_OFFLINE with a plain message', async () => {
  const engine = createGeminiEngine({ apiKey: 'test', fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  const out = await check.runCheck({ input: { text: 'bank KYC expire message' }, engine });
  assert.ok(!out.ok);
  assert.equal(out.code, 'ENGINE_OFFLINE');
  assert.ok(out.message.length > 5);
});

test('Gemini 404 model is MODEL_MISSING; 5xx is ENGINE_OFFLINE; 401 is ENGINE_OFFLINE', async () => {
  const missing = createGeminiEngine({ apiKey: 'test', fetchImpl: async () => ({ status: 404, ok: false, json: async () => ({}) }) });
  const out1 = await check.runCheck({ input: { text: 'hello' }, engine: missing });
  assert.equal(out1.code, 'MODEL_MISSING');

  const down = createGeminiEngine({ apiKey: 'test', fetchImpl: async () => ({ status: 503, ok: false, json: async () => ({}) }) });
  const out2 = await check.runCheck({ input: { text: 'hello' }, engine: down });
  assert.equal(out2.code, 'ENGINE_OFFLINE');

  const badKey = createGeminiEngine({ apiKey: 'test', fetchImpl: async () => ({ status: 401, ok: false, json: async () => ({}) }) });
  const out3 = await check.runCheck({ input: { text: 'hello' }, engine: badKey });
  assert.equal(out3.code, 'ENGINE_OFFLINE');
});

test('Ollama: gemma4:e4b missing falls back to gemma4:e2b; both missing = MODEL_MISSING', async () => {
  const calls = [];
  const engine = createOllamaEngine({
    models: ['gemma4:e4b', 'gemma4:e2b'],
    fetchImpl: async (url, opts) => {
      const body = JSON.parse(opts.body);
      calls.push(body.model);
      if (body.model === 'gemma4:e4b') return { status: 404, ok: false, json: async () => ({}) };
      return { status: 200, ok: true, json: async () => ({ message: { content: '{"verdict":"SUSPICIOUS","confidence":"Low","red_flags":[],"trick":null,"scammer_wants":"x","next_steps":["a","b","c"],"family_warning":"w","summary":"s"}' } }) };
    },
  });
  const out = await check.runCheck({ input: { text: 'kuch bhi' }, engine });
  assert.ok(out.ok);
  assert.deepEqual(calls, ['gemma4:e4b', 'gemma4:e2b'], 'e4b tried first, then e2b fallback');

  const none = createOllamaEngine({
    models: ['gemma4:e4b', 'gemma4:e2b'],
    fetchImpl: async () => ({ status: 404, ok: false, json: async () => ({}) }),
  });
  const out2 = await check.runCheck({ input: { text: 'kuch bhi' }, engine: none });
  assert.ok(!out2.ok);
  assert.equal(out2.code, 'MODEL_MISSING');
});

test('Ollama not running = ENGINE_OFFLINE with plain message', async () => {
  const engine = createOllamaEngine({ baseUrl: 'http://127.0.0.1:1/', fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
  const out = await check.runCheck({ input: { text: 'hello' }, engine });
  assert.equal(out.code, 'ENGINE_OFFLINE');
});

// ---------------------------------------------------------------------------
// 4. Screenshot path (mock OCR)
// ---------------------------------------------------------------------------
test('screenshot with no readable text = OCR_FAILED error, never a verdict', async () => {
  const b64 = fs.readFileSync(path.join(FIXTURES, 'blank-screenshot.png')).toString('base64');
  const out = await check.runCheck({ input: { imageBase64: b64, mime: 'image/png', size: 820 }, engine: mock });
  assert.ok(!out.ok, 'no verdict may be produced');
  assert.equal(out.code, 'OCR_FAILED');
  assert.ok(out.message.length > 5, 'plain-language message');
});

test('readable screenshot goes OCR → judge → verdict with verbatim quotes from the transcript', async () => {
  const buf = fs.readFileSync(path.join(FIXTURES, 'scam-kyc-screenshot.png'));
  const out = await check.runCheck({ input: { imageBase64: buf.toString('base64'), mime: 'image/png', size: buf.length }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'SCAM');
  assert.equal(out.verdict.confidence, 'High');
  assert.ok(out.verdict.trick.toLowerCase().includes('kyc'));
  assert.equal(out.meta.source, 'image');
});

test('blurry screenshot: readable parts judged, unreadable fabricated quotes dropped', async () => {
  const buf = fs.readFileSync(path.join(FIXTURES, 'blurry-screenshot.png'));
  const out = await check.runCheck({ input: { imageBase64: buf.toString('base64'), mime: 'image/png', size: buf.length }, engine: mock });
  assert.ok(out.ok);
  assert.equal(out.verdict.verdict, 'SCAM');
  for (const f of out.verdict.red_flags) {
    assert.ok(!f.quote.includes('aapka OTP bhejo'), 'fabricated quote must be dropped');
  }
});

test('invalid screenshot input = INVALID_INPUT (wrong mime / oversized)', async () => {
  const out1 = await check.runCheck({ input: { imageBase64: 'AAAA', mime: 'image/gif', size: 4 }, engine: mock });
  assert.equal(out1.code, 'INVALID_INPUT');
  const out2 = await check.runCheck({ input: { imageBase64: 'AAAA', mime: 'image/png', size: 6 * 1024 * 1024 }, engine: mock });
  assert.equal(out2.code, 'INVALID_INPUT');
});

// ---------------------------------------------------------------------------
// 5. Input validation
// ---------------------------------------------------------------------------
test('INVALID_INPUT: empty/overlong text; UNSUPPORTED_LANGUAGE: other scripts', async () => {
  assert.equal((await check.runCheck({ input: { text: '   ' }, engine: mock })).code, 'INVALID_INPUT');
  assert.equal((await check.runCheck({ input: { text: 'a'.repeat(2001) }, engine: mock })).code, 'INVALID_INPUT');
  assert.equal((await check.runCheck({ input: { text: '这是来自银行的紧急消息请点击链接' }, engine: mock })).code, 'UNSUPPORTED_LANGUAGE');
  assert.equal((await check.runCheck({ input: { text: 'Сообщение из банка срочно' }, engine: mock })).code, 'UNSUPPORTED_LANGUAGE');
  const okHindi = await check.runCheck({ input: { text: 'यह एक सामान्य संदेश है' }, engine: mock });
  assert.ok(okHindi.ok, 'Devanagari must be supported');
});

// ---------------------------------------------------------------------------
// 6. HTTP layer end-to-end with the mock engine (real server, real adapter)
// ---------------------------------------------------------------------------
const LOGS = [];

async function startMockServer(extraConfig) {
  const server = createServer(Object.assign({ port: 0, mock: true, rateLimitMax: 100, log: (line) => LOGS.push(line) }, extraConfig || {}));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, base: 'http://127.0.0.1:' + server.address().port };
}

test('HTTP E2E (mock): POST /api/check text → canonical verdict; status endpoint; CORS preflight', async () => {
  const { server, base } = await startMockServer();
  try {
    const status = await fetch(base + '/api/status');
    const sBody = await status.json();
    assert.equal(sBody.ok, true);
    assert.equal(sBody.mode, 'mock');
    assert.equal(sBody.ready, true);

    const pre = await fetch(base + '/api/check', { method: 'OPTIONS' });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), '*');

    const res = await fetch(base + '/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: CASES.G1.message }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assertCanonicalVerdict(body.verdict);
    assert.equal(body.verdict.verdict, 'SCAM');
    assert.deepEqual(Object.keys(body.verdict), CANON_FIELDS);
  } finally {
    server.close();
  }
});

test('HTTP E2E (mock): image upload via multipart → OCR path works; blank image → 422 OCR_FAILED', async () => {
  const { server, base } = await startMockServer();
  try {
    const buf = fs.readFileSync(path.join(FIXTURES, 'scam-kyc-screenshot.png'));
    const form = new FormData();
    form.append('image', new Blob([buf], { type: 'image/png' }), 'screenshot.png');
    const res = await fetch(base + '/api/check', { method: 'POST', body: form });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.verdict.verdict, 'SCAM');

    const blank = fs.readFileSync(path.join(FIXTURES, 'blank-screenshot.png'));
    const form2 = new FormData();
    form2.append('image', new Blob([blank], { type: 'image/png' }), 'blank.png');
    const res2 = await fetch(base + '/api/check', { method: 'POST', body: form2 });
    const body2 = await res2.json();
    assert.equal(res2.status, 422);
    assert.equal(body2.ok, false);
    assert.equal(body2.error.code, 'OCR_FAILED');
  } finally {
    server.close();
  }
});

test('HTTP E2E (mock): rate limit returns 429 RATE_LIMIT with plain message', async () => {
  const { server, base } = await startMockServer({ rateLimitMax: 3, rateLimitWindowMs: 60000 });
  try {
    for (let i = 0; i < 3; i++) {
      const r = await fetch(base + '/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hello' }) });
      assert.notEqual(r.status, 429);
    }
    const fourth = await fetch(base + '/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hello' }) });
    assert.equal(fourth.status, 429);
    const body = await fourth.json();
    assert.equal(body.error.code, 'RATE_LIMIT');
    assert.ok(body.error.message.length > 5);
  } finally {
    server.close();
  }
});

test('HTTP E2E (mock): keyless MODE=api without key → 503 ENGINE_OFFLINE with setup hint', async () => {
  const server = createServer({ port: 0, mock: false, mode: 'api', apiKey: '', log: () => {}, rateLimitMax: 100 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const res = await fetch(base + '/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hello' }) });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, 'ENGINE_OFFLINE');
    assert.ok(/GEMINI_API_KEY/.test(body.error.message), 'must tell where to put the key');
    const status = await (await fetch(base + '/api/status')).json();
    assert.equal(status.keyConfigured, false);
  } finally {
    server.close();
  }
});

test('window.ScamShield adapter: exact 3-method contract, same verdict shape, plain-language rejections', async () => {
  const { server, base } = await startMockServer();
  globalThis.window = { SCAMSHIELD_API_BASE: base };
  const { ScamShield } = await import('../app.js');
  try {
    assert.deepEqual(Object.keys(ScamShield).sort(), ['checkImage', 'checkText', 'getStatus']);
    assert.deepEqual(Object.keys(globalThis.window.ScamShield).sort(), ['checkImage', 'checkText', 'getStatus']);

    const status = await ScamShield.getStatus();
    assert.equal(status.mode, 'mock');
    assert.equal(status.ready, true);

    const v = await ScamShield.checkText(CASES.G1.message);
    assertCanonicalVerdict(v);
    assert.equal(v.verdict, 'SCAM');
    assert.deepEqual(Object.keys(v), CANON_FIELDS);

    const file = new Blob([fs.readFileSync(path.join(FIXTURES, 'scam-kyc-screenshot.png'))], { type: 'image/png' });
    file.name = 'screenshot.png';
    const v2 = await ScamShield.checkImage(file);
    assert.equal(v2.verdict, 'SCAM');

    await assert.rejects(ScamShield.checkText('   '), (e) => e.code === 'INVALID_INPUT' && typeof e.message === 'string');
    await assert.rejects(ScamShield.checkText('a'.repeat(2001)), (e) => e.code === 'INVALID_INPUT');
    await assert.rejects(ScamShield.checkImage(null), (e) => e.code === 'INVALID_INPUT');
    await assert.rejects(ScamShield.checkText('这是银行紧急消息'), (e) => e.code === 'UNSUPPORTED_LANGUAGE');
  } finally {
    server.close();
    delete globalThis.window;
  }
});

test('adapter offline: backend down → ENGINE_OFFLINE rejection with plain message', async () => {
  globalThis.window = { SCAMSHIELD_API_BASE: 'http://127.0.0.1:1' };
  const { ScamShield } = await import('../app.js');
  try {
    await assert.rejects(ScamShield.checkText('hello'), (e) => e.code === 'ENGINE_OFFLINE' && typeof e.message === 'string');
    await assert.rejects(ScamShield.getStatus(), (e) => e.code === 'ENGINE_OFFLINE');
  } finally {
    delete globalThis.window;
  }
});

// ---------------------------------------------------------------------------
// 7. Privacy & key hygiene
// ---------------------------------------------------------------------------
test('PRIVACY: raw messages never appear in logs (mock E2E with sentinel text)', async () => {
  const { server, base } = await startMockServer();
  try {
    const sentinel = 'SENTINEL_RAW_MESSAGE_98127x';
    const res = await fetch(base + '/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: sentinel + ' MOCK_MALFORM case' }) });
    const body = await res.json();
    assert.equal(body.ok, true);
  } finally {
    server.close();
  }
  const allLogs = LOGS.join('\n');
  assert.ok(!allLogs.includes('SENTINEL_RAW_MESSAGE_98127x'), 'no raw message text may be logged');
  assert.ok(!/AIza[0-9A-Za-z_-]{10,}/.test(allLogs), 'no API key may be logged');
});

test('KEY HYGIENE: no API key anywhere in git, .env not tracked, .env gitignored', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  // 1. .env must be gitignored.
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.ok(/(^|\n)\.env(\n|$)/.test(gitignore), '.env must be gitignored');

  // 2. Sources must not embed a key or hard-assign one.
  const scanFiles = ['app.js', 'server.js', 'api/check.js', 'api/validate.js', 'api/gemini.js', 'api/ollama.js', 'api/engines/mock.js'];
  for (const f of scanFiles) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/AIza[0-9A-Za-z_-]{10,}/.test(src), f + ' must not contain an API key');
    assert.ok(!/GEMINI_API_KEY\s*=\s*['"][^'"]+/.test(src), f + ' must not hard-assign GEMINI_API_KEY');
  }

  // 3. Nothing key-shaped may be committed; .env must not be tracked.
  let tracked = [];
  try {
    tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  } catch (_) { /* git unavailable outside a repo — file scans above already ran */ }
  assert.ok(!tracked.includes('.env'), '.env must never be committed');
  for (const f of tracked) {
    if (!/\.(png|jpe?g|webp|zip)$/i.test(f)) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      assert.ok(!/AIza[0-9A-Za-z_-]{10,}/.test(src), 'tracked file ' + f + ' must not contain an API key');
    }
  }
});

// ---------------------------------------------------------------------------
// 8. Mock latency (sanity + recorded for TESTS.md)
// ---------------------------------------------------------------------------
test('MOCK latency: pipeline overhead is fast (live latency is reported by tests/golden.mjs)', async () => {
  const { server, base } = await startMockServer();
  try {
    const t0 = Date.now();
    const res = await fetch(base + '/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: CASES.G1.message }) });
    const body = await res.json();
    const ms = Date.now() - t0;
    assert.equal(body.ok, true);
    assert.ok(ms < 2000, 'mock E2E round-trip should be well under 2s, was ' + ms + 'ms');
    console.log('  mock E2E round-trip: ' + ms + 'ms (engine latency ' + body.meta.latencyMs + 'ms)');
  } finally {
    server.close();
  }
});
