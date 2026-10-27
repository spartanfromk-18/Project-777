#!/usr/bin/env node
// ScamShield — LIVE golden runner (tests/golden-cases.js through the REAL Gemini engine).
//
// This run is the LIVE truth check: every case goes through api/check.js's real
// pipeline (60s engine timeout, ONE repair retry, SPEC v1.0 canonicalization) to
// the REAL Gemini engine (gemma-4-26b-a4b-it, temperature 0.1) via api/gemini.js.
// The TEST-ONLY mock engine is NEVER used here — a keyless run exits ENGINE_OFFLINE
// (BLOCKED), it never fakes a pass.
//
// Run: npm run test:golden   (needs GEMINI_API_KEY in .env — gitignored, never printed)

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../server.js'; // the backend's own loader; real environment always wins
import { runCheck } from '../api/check.js';
import { createGeminiEngine } from '../api/gemini.js';
import goldenCases from './golden-cases.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(path.join(ROOT, '.env'));

const CASE_IDS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'GH', 'GD'];
const TIMEOUT_MS = 60000; // 60s per engine call (runCheck adds ONE repair retry on a bad reply)
const CANON_FIELDS = ['verdict', 'confidence', 'red_flags', 'trick', 'scammer_wants', 'next_steps', 'family_warning', 'summary'];

function line(ch) { console.log(ch.repeat(72)); }

// Placeholder-shaped keys are treated as missing (never printed, never sent).
function isMissingKey(k) {
  if (!k || !String(k).trim()) return true;
  const t = String(k).trim().toLowerCase();
  return t.startsWith('your') || t.startsWith('<') || t.includes('placeholder') || t.includes('replace') || t.includes('xxx');
}

const apiKey = process.env.GEMINI_API_KEY || '';
if (isMissingKey(apiKey)) {
  line('=');
  console.log('GOLDEN RUN: BLOCKED — ENGINE_OFFLINE');
  console.log('key missing in .env — live golden blocked');
  console.log('');
  console.log('Live golden needs GEMINI_API_KEY in ' + path.join(ROOT, '.env') + ' (from Google AI Studio).');
  console.log('.env is gitignored — key sirf us machine par rehti hai, kabhi print/commit nahi hoti.');
  console.log('Honest block, no mock pass: yeh runner kabhi mock engine se PASS nahi karta.');
  console.log('Key daalne ke baad dobara: npm run test:golden');
  line('=');
  process.exit(0); // clean, honest exit — never a fake pass
}

const model = process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it';
const engine = createGeminiEngine({ apiKey, model });

line('=');
console.log('GOLDEN RUN: LIVE — real engine only (never mock)');
console.log('Engine  : ' + engine.id + '  ·  Model: ' + model + '  ·  temp 0.1  ·  ' + TIMEOUT_MS + 's timeout  ·  one repair retry');
console.log('Pipeline: api/check.js runCheck → api/gemini.js → api/validate.js (SPEC v1.0)');
line('=');

function checkCase(c, out) {
  const fails = [];
  if (!out.ok) return ['engine: ' + out.code + ' — ' + out.message];
  const v = out.verdict;
  if (JSON.stringify(Object.keys(v)) !== JSON.stringify(CANON_FIELDS)) fails.push('verdict fields/order not canonical');
  if (!['SCAM', 'SUSPICIOUS', 'LOOKS_SAFE'].includes(v.verdict)) fails.push('bad verdict value');
  if (!['High', 'Medium', 'Low'].includes(v.confidence)) fails.push('bad confidence value');
  if (v.verdict !== c.expected.verdict) fails.push('verdict ' + v.verdict + ' != ' + c.expected.verdict);
  if (v.confidence !== c.expected.confidence) fails.push('confidence ' + v.confidence + ' != ' + c.expected.confidence);
  if (!Array.isArray(v.red_flags) || v.red_flags.length > 4) fails.push('red_flags not a capped array');
  for (const f of v.red_flags || []) {
    if (JSON.stringify(Object.keys(f)) !== JSON.stringify(['quote', 'why'])) fails.push('red flag shape');
    if (!c.message.includes(f.quote)) fails.push('untraceable quote: "' + f.quote + '"');
  }
  if (c.expected.trickNull && v.trick !== null) fails.push('trick must be null, got "' + v.trick + '"');
  if (c.expected.trickIncludes && !(v.trick && v.trick.toLowerCase().includes(c.expected.trickIncludes))) {
    fails.push('trick missing "' + c.expected.trickIncludes + '": ' + v.trick);
  }
  if (v.verdict === 'SCAM' && !(v.red_flags || []).length) fails.push('SCAM without quoted proof');
  if (v.verdict === 'LOOKS_SAFE' && !(v.next_steps || []).some((s) => /official app/i.test(s))) fails.push('LOOKS_SAFE missing verify-app step');
  const w = String(v.family_warning || '');
  if (/https?:\/\//i.test(w) || /\bwww\./i.test(w) || /(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/.test(w) || /\b\d{6}\b/.test(w)) fails.push('family_warning not clean');
  if (!Array.isArray(v.next_steps) || v.next_steps.length < 3 || v.next_steps.length > 5) fails.push('next_steps not 3-5');
  return fails;
}

let passCount = 0;
const t0 = Date.now();

for (const id of CASE_IDS) {
  const c = goldenCases[id];
  const started = Date.now();
  const out = await runCheck({ input: { text: c.message }, engine, timeoutMs: TIMEOUT_MS });
  const ms = Date.now() - started;
  const fails = checkCase(c, out);
  const got = out.ok ? out.verdict.verdict + '/' + out.verdict.confidence + (out.verdict.trick ? ' trick="' + out.verdict.trick + '"' : ' trick=null') : out.code;
  if (fails.length === 0) {
    passCount++;
    console.log('PASS  ' + id + '  ' + c.name + '  →  ' + got + '  (' + ms + 'ms' + (out.meta && out.meta.repaired ? ', repaired' : '') + (out.meta && out.meta.degraded ? ', DEGRADED' : '') + ')');
  } else {
    console.log('FAIL  ' + id + '  ' + c.name + '  →  expected ' + c.expected.verdict + '/' + c.expected.confidence + ', got ' + got + '  (' + ms + 'ms)');
    for (const f of fails) console.log('        - ' + f);
  }
}

line('=');
const totalMs = Date.now() - t0;
console.log('GOLDEN LIVE RESULT: ' + passCount + '/' + CASE_IDS.length + ' PASS  ·  engine ' + engine.id + ' ' + model + '  ·  total ' + (totalMs / 1000).toFixed(1) + 's');
if (passCount === CASE_IDS.length) {
  console.log('All golden cases passed LIVE (real Gemini engine — not mock).');
  line('=');
  process.exit(0);
}
console.log('Failures honestly reported — no fake pass, no weakened expectation.');
line('=');
process.exit(1);
