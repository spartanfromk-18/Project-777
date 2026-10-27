import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMessageLocally, sanitizePlainString } from './scamEngine.ts';
import { GOLDEN_CASES } from '../data/goldenCases.ts';

test('scamEngine correctly classifies all 6 golden cases', () => {
  GOLDEN_CASES.forEach((gc) => {
    const result = analyzeMessageLocally(gc.text);
    assert.equal(result.verdict, gc.verdict, `Failed for case: ${gc.title}`);
    assert.ok(result.redFlags.length > 0, `Red flags missing for: ${gc.title}`);
    assert.ok(result.familyWarning.length > 10, `Family warning missing for: ${gc.title}`);
  });
});

test('scamEngine detects electricity cut scam with high confidence', () => {
  const result = analyzeMessageLocally('Your electricity will be disconnected tonight at 9:30 PM call Mr Sharma 9876543210');
  assert.equal(result.verdict, 'SCAM');
  assert.ok(result.redFlags.some((f) => f.toLowerCase().includes('disconnection') || f.toLowerCase().includes('deadline')));
});

test('scamEngine marks genuine OTP as LOOKS_SAFE with official app note', () => {
  const result = analyzeMessageLocally('Your Swiggy verification OTP is 482910. Do not share.');
  assert.equal(result.verdict, 'LOOKS_SAFE');
  assert.ok(result.nextSteps.some((step) => step.includes('still verify in the official app') || step.includes('Still verify in the official app')));
});

test('scamEngine throws on empty input', () => {
  assert.throws(() => analyzeMessageLocally('   '), /Please enter or paste a message/);
});

test('sanitizePlainString trims string correctly', () => {
  assert.equal(sanitizePlainString('  hello world  '), 'hello world');
});
