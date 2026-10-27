import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndEnforceVerdictRules } from './verdictValidator.ts';

test('downgrades LOOKS_SAFE with High confidence to SUSPICIOUS / Low', () => {
  const message = 'Your OTP is 123456';
  const raw = {
    verdict: 'LOOKS_SAFE',
    confidence: 'High',
    red_flags: [],
    trick: 'None',
    scammer_wants: 'None',
    next_steps: ['Verify in official app'],
    family_warning: 'Safe message',
    summary: 'Looks safe',
  };
  const result = validateAndEnforceVerdictRules(raw, message);
  assert.equal(result.verdict, 'SUSPICIOUS');
  assert.equal(result.confidence, 'Low');
});

test('downgrades SCAM with Low confidence to SUSPICIOUS / Low', () => {
  const message = 'Electricity power cut tonight';
  const raw = {
    verdict: 'SCAM',
    confidence: 'Low',
    red_flags: [{ quote: 'power cut tonight', why: 'Threat' }],
    trick: 'Urgency',
    scammer_wants: 'Payment',
    next_steps: ['Call 1930'],
    family_warning: 'Scam alert',
    summary: 'Electricity scam',
  };
  const result = validateAndEnforceVerdictRules(raw, message);
  assert.equal(result.verdict, 'SUSPICIOUS');
  assert.equal(result.confidence, 'Low');
});

test('downgrades when non-verbatim quote is present', () => {
  const message = 'Dear consumer electricity power will be disconnected';
  const raw = {
    verdict: 'SCAM',
    confidence: 'High',
    red_flags: [{ quote: 'gas bill unpaid', why: 'Fake quote' }],
    trick: 'Urgency',
    scammer_wants: 'Payment',
    next_steps: ['Do not pay', 'Block', 'Call 1930'],
    family_warning: 'Scam alert',
    summary: 'Fake quote scam',
  };
  const result = validateAndEnforceVerdictRules(raw, message);
  assert.equal(result.verdict, 'SUSPICIOUS');
  assert.equal(result.confidence, 'Low');
});

test('downgrades and clamps when >4 red flags are provided', () => {
  const message = 'Electricity power cut tonight call officer Sharma right now urgent';
  const raw = {
    verdict: 'SCAM',
    confidence: 'High',
    red_flags: [
      { quote: 'Electricity', why: '1' },
      { quote: 'power cut', why: '2' },
      { quote: 'tonight', why: '3' },
      { quote: 'officer Sharma', why: '4' },
      { quote: 'urgent', why: '5' },
    ],
    trick: 'Urgency',
    scammer_wants: 'Payment',
    next_steps: ['Do not pay', 'Block', 'Call 1930'],
    family_warning: 'Scam alert',
    summary: 'Scam',
  };
  const result = validateAndEnforceVerdictRules(raw, message);
  assert.equal(result.verdict, 'SUSPICIOUS');
  assert.equal(result.confidence, 'Low');
  assert.equal(result.red_flags.length, 4);
});

test('ensures SCAM includes do-not-click/pay, block/report, and 1930 helpline', () => {
  const message = 'Electricity power cut tonight call 9876543210';
  const raw = {
    verdict: 'SCAM',
    confidence: 'High',
    red_flags: [{ quote: 'power cut tonight', why: 'Threat' }],
    trick: 'Urgency',
    scammer_wants: 'Money',
    next_steps: ['Ignore this message'], // Missing do-not-pay, block, 1930
    family_warning: 'Alert',
    summary: 'Scam detected',
  };
  const result = validateAndEnforceVerdictRules(raw, message);
  assert.equal(result.verdict, 'SCAM');
  assert.equal(result.confidence, 'High');
  const combinedSteps = result.next_steps.join(' ').toLowerCase();
  assert.ok(combinedSteps.includes('pay') || combinedSteps.includes('click'));
  assert.ok(combinedSteps.includes('block') || combinedSteps.includes('report'));
  assert.ok(combinedSteps.includes('1930'));
});

test('strips live links and URLs from family_warning', () => {
  const message = 'Check this out https://bit.ly/scam-link';
  const raw = {
    verdict: 'SCAM',
    confidence: 'High',
    red_flags: [{ quote: 'Check this out', why: 'Phishing' }],
    trick: 'Link',
    scammer_wants: 'Click',
    next_steps: ['Do not click', 'Block', '1930'],
    family_warning: 'Bhai yeh link https://bit.ly/scam-link mat kholo www.fake.com par mat jaao',
    summary: 'Scam',
  };
  const result = validateAndEnforceVerdictRules(raw, message);
  assert.ok(!result.family_warning.includes('https://'));
  assert.ok(!result.family_warning.includes('www.'));
  assert.ok(!result.family_warning.includes('bit.ly'));
});
