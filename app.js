/* ScamShield — window.ScamShield adapter (frontend contract, SPEC v1.0).
 * Interface is exactly: window.ScamShield = { getStatus(), checkText(text), checkImage(file) }
 *
 * MODE=api   : backend POST /api/check → Gemini API (gemma-4-26b-a4b-it). Key stays in backend env.
 * MODE=local : backend POST /api/check → local Ollama (127.0.0.1:11434, gemma4:e4b → gemma4:e2b).
 * Same verdict object in both modes. Every rejection carries a plain-language message.
 *
 * Resolved verdict = exactly 8 fields, in order:
 *   verdict, confidence, red_flags, trick, scammer_wants, next_steps, family_warning, summary
 * Rejections = Error with .code ∈ { INVALID_INPUT, UNSUPPORTED_LANGUAGE, OCR_FAILED,
 *   BAD_RESPONSE, TIMEOUT, ENGINE_OFFLINE, MODEL_MISSING, RATE_LIMIT } and a Hinglish .message.
 */
(function () {
  'use strict';

  // When the page is opened straight from disk (file://), default to the local backend.
  var API_BASE = '';
  if (typeof window !== 'undefined' && typeof location !== 'undefined' && location.protocol === 'file:') {
    API_BASE = 'http://localhost:3000';
  }
  if (typeof window !== 'undefined' && window.SCAMSHIELD_API_BASE) {
    API_BASE = String(window.SCAMSHIELD_API_BASE);
  }

  var MAX_MESSAGE_LENGTH = 2000;
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  var IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  var MSG = {
    INVALID_INPUT: 'Message khaali hai — kuch text paste karo (max 2000 characters).',
    OFFLINE: 'Backend nahi chal raha — terminal me "npm start" karo. (MODE ke hisaab se Gemini API ya local Ollama chalega.)',
    UNKNOWN: 'Kuch gadbad ho gayi — dobara try karo.',
  };

  function fail(code, message) {
    var e = new Error(message);
    e.code = code;
    return Promise.reject(e);
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : null;
    var opts = options || {};
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(
      function (res) {
        if (timer) clearTimeout(timer);
        return res;
      },
      function (err) {
        if (timer) clearTimeout(timer);
        if (err && err.name === 'AbortError') return fail('TIMEOUT', 'Request timeout ho gayi — dobara try karo.');
        return fail('ENGINE_OFFLINE', MSG.OFFLINE);
      }
    );
  }

  function parseResponse(res) {
    return res.json().catch(function () { return null; }).then(function (body) {
      if (body && body.ok === true && body.verdict) return normalizeVerdict(body.verdict);
      if (body && body.ok === false && body.error && body.error.code) {
        var e = new Error(body.error.message || MSG.UNKNOWN);
        e.code = body.error.code;
        throw e;
      }
      var e2 = new Error(MSG.UNKNOWN);
      e2.code = 'BAD_RESPONSE';
      throw e2;
    });
  }

  // Canonical verdict object — exactly 8 fields, in order, no matter what mode produced it.
  function normalizeVerdict(v) {
    return {
      verdict: String(v.verdict || ''),
      confidence: String(v.confidence || ''),
      red_flags: Array.isArray(v.red_flags) ? v.red_flags : [],
      trick: v.trick == null ? null : String(v.trick),
      scammer_wants: v.scammer_wants == null ? null : String(v.scammer_wants),
      next_steps: Array.isArray(v.next_steps) ? v.next_steps : [],
      family_warning: String(v.family_warning || ''),
      summary: String(v.summary || ''),
    };
  }

  var statusCache = null;
  var statusAt = 0;

  function getStatus(force) {
    var now = Date.now();
    if (!force && statusCache && now - statusAt < 5000) return Promise.resolve(statusCache);
    return fetchWithTimeout(API_BASE + '/api/status', { method: 'GET' }, 10000).then(
      function (res) {
        return res.json().catch(function () { return null; }).then(function (body) {
          if (!body || body.ok !== true) return fail('ENGINE_OFFLINE', MSG.OFFLINE);
          statusCache = {
            mode: body.mode,
            engine: body.engine,
            model: body.model,
            ready: Boolean(body.ready),
            keyConfigured: Boolean(body.keyConfigured),
            message: body.message || '',
          };
          statusAt = now;
          return statusCache;
        });
      },
      function (err) { return err; }
    );
  }

  function checkText(text) {
    if (typeof text !== 'string' || !text.trim()) return fail('INVALID_INPUT', MSG.INVALID_INPUT);
    var trimmed = text.trim();
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return fail('INVALID_INPUT', 'Message bahut lamba hai (max ' + MAX_MESSAGE_LENGTH + ' characters). Sirf zaroori hissa paste karo.');
    }
    return fetchWithTimeout(API_BASE + '/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    }, 90000).then(parseResponse);
  }

  function checkImage(file) {
    if (!file) return fail('INVALID_INPUT', 'Screenshot select karo (PNG, JPG ya WebP — max 5 MB).');
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    if (IMAGE_TYPES.indexOf(type) === -1) {
      if (/\.png$/.test(name)) type = 'image/png';
      else if (/\.jpe?g$/.test(name)) type = 'image/jpeg';
      else if (/\.webp$/.test(name)) type = 'image/webp';
      else return fail('INVALID_INPUT', 'Sirf PNG, JPG ya WebP screenshot chalta hai (max 5 MB).');
    }
    var size = typeof file.size === 'number' ? file.size : 0;
    if (!size || size > MAX_IMAGE_BYTES) return fail('INVALID_INPUT', 'Screenshot bahut bada hai (max 5 MB) — chhota/clear screenshot try karo.');

    var form = new FormData();
    form.append('image', file, file.name || 'screenshot');
    return fetchWithTimeout(API_BASE + '/api/check', { method: 'POST', body: form }, 150000).then(parseResponse);
  }

  var ScamShield = { getStatus: getStatus, checkText: checkText, checkImage: checkImage };

  if (typeof window !== 'undefined') window.ScamShield = ScamShield;
  if (typeof module !== 'undefined' && module.exports) module.exports = { ScamShield: ScamShield };
})();
