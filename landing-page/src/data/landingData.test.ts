import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NAV_LINKS,
  DESCRIPTION_TEXT,
  HEADLINE_WORDS,
  STATS,
  VIDEO_SRC,
  LOGO_SVG_PATH,
} from './landingData.ts';

test('landing data conforms to all-lowercase requirement', () => {
  NAV_LINKS.forEach((link) => {
    assert.equal(link.label, link.label.toLowerCase(), `Nav link ${link.label} must be lowercase`);
  });

  assert.equal(DESCRIPTION_TEXT, DESCRIPTION_TEXT.toLowerCase(), 'Description must be lowercase');

  HEADLINE_WORDS.forEach((item) => {
    assert.equal(item.text, item.text.toLowerCase(), `Headline word ${item.text} must be lowercase`);
  });

  assert.equal(STATS.topRight.label, STATS.topRight.label.toLowerCase());
  assert.equal(STATS.bottomLeft.label, STATS.bottomLeft.label.toLowerCase());
  assert.equal(STATS.bottomRight.label, STATS.bottomRight.label.toLowerCase());
});

test('headline words match requested order and positioning', () => {
  assert.equal(HEADLINE_WORDS.length, 3);
  assert.equal(HEADLINE_WORDS[0].text, 'protect');
  assert.equal(HEADLINE_WORDS[1].text, 'your');
  assert.equal(HEADLINE_WORDS[2].text, 'data');
});

test('assets and stats values match specification', () => {
  assert.ok(VIDEO_SRC.startsWith('https://'));
  assert.ok(LOGO_SVG_PATH.length > 50);
  assert.equal(STATS.topRight.value, '+65k');
  assert.equal(STATS.bottomLeft.value, '+1.5b');
  assert.equal(STATS.bottomRight.value, '+300k');
});
