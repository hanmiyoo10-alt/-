//@name basecore
//@api 3.0
//@version 0.1.0
//@display-name BaseCore
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-basecore/plugins/basecore/latest.js
//@link https://github.com/hanmiyoo10-alt/-/tree/main/plugins/basecore BaseCore
//
// v0.1.0 Initial Narrative Baseline:
// BaseCore v0.1.0
// Independent Narrative-only fork derived from the proven SimCore v0.63.56 design.
// Donor behavior target: SimCore default Narrative/A path without Broadcast, Mode C, COMMUNITY,
// exposure, reaction, lineage, handoff, or evidence-fence subsystems.
//
// Hard freeze for v0.1:
// - narrative clock / deterministic calendar transitions
// - world-year + Korean-age offset synchronization
// - Volume / Chapter / Chatindex continuity
// - protagonist + conditional secondary authority
// - canonical # 응답 envelope + final <Knowledge>
// - reload-safe named hook cleanup
// - independent BaseCore storage / mirror namespace

const BASECORE_RUNTIME_VERSION = '0.1.0';
const BASECORE_LOG_PREFIX = `[BaseCore v${BASECORE_RUNTIME_VERSION}]`;

const BaseCore = (() => {
  const mods = {};
  const cache = {};
  const define = (name, fn) => { mods[name] = fn; };
  const requireFn = (name) => {
    const key = String(name || '').replace(/^\.\//, '').replace(/\.js$/, '');
    if (cache[key]) return cache[key].exports;
    const fn = mods[key];
    if (!fn) throw new Error('module not found: ' + name);
    const module = { exports: {} };
    cache[key] = module;
    fn(requireFn, module, module.exports);
    return module.exports;
  };
  return { define, require: requireFn };
})();

BaseCore.define('recurrence', function (_require, module) {
  const VERSION = 1;
  const LIMIT = 384;
  const MAX_CHARS = 4096;
  const MIN_CHARS = 48;

  function normalizeRegistry(raw) {
    const out = [];
    const seen = new Set();
    for (const value of (Array.isArray(raw) ? raw : [])) {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      const h = n >>> 0;
      if (seen.has(h)) continue;
      seen.add(h);
      out.push(h);
    }
    return out.slice(-LIMIT);
  }

  function normalizeTemplate(userText) {
    let source = String(userText || '').slice(0, MAX_CHARS);
    try { source = source.normalize('NFKC'); } catch (_) {}
    const open = source.indexOf('(');
    const close = source.lastIndexOf(')');
    if (open >= 0 && close > open && close - open >= 32) source = source.slice(open);
    const normalized = source
      .replace(/https?:\/\/\S+/gi, '<url>')
      .replace(/\d+(?:[.,]\d+)*/g, '#')
      .replace(/[“”‘’`]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return normalized.length >= MIN_CHARS ? normalized : '';
  }

  function hashTemplate(text) {
    const value = String(text || '');
    if (!value) return null;
    let h = 2166136261 >>> 0;
    const seed = `A:${value.length}:`;
    const all = seed + value;
    for (let i = 0; i < all.length; i++) {
      h ^= all.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function templateFingerprint(userText) {
    const normalized = normalizeTemplate(userText);
    const hash = hashTemplate(normalized);
    return { eligible: hash != null, hash, normalizedChars: normalized.length };
  }

  function observe(state, userText) {
    const fp = templateFingerprint(userText);
    const registry = normalizeRegistry(state.templateRegistry);
    state.templateRecurrenceVersion = VERSION;
    if (!fp.eligible) {
      state.templateRegistry = registry;
      return { ...fp, repeated: false, registrySize: registry.length };
    }
    const idx = registry.indexOf(fp.hash >>> 0);
    const repeated = idx >= 0;
    if (idx >= 0) registry.splice(idx, 1);
    registry.push(fp.hash >>> 0);
    if (registry.length > LIMIT) registry.splice(0, registry.length - LIMIT);
    state.templateRegistry = registry;
    return { ...fp, repeated, registrySize: registry.length };
  }

  module.exports = { VERSION, LIMIT, normalizeRegistry, normalizeTemplate, templateFingerprint, observe };
});

BaseCore.define('kernel', function (require, module) {
  const recurrence = require('./recurrence');
  const STATE_VERSION = 1;
  const CORE_STATE_VERSION = 1;
  const HANDSHAKE_RE = /<BASECORE_SWITCH>\s*1\s*<\/BASECORE_SWITCH>/i;
  const KNOWLEDGE_RE = /<Knowledge>[\s\S]*?<\/Knowledge>/gi;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function fingerprintText(content) {
    const text = String(content || '')
      .replace(/⟦basecore:\d+⟧/g, '')
      .replace(/\r\n/g, '\n')
      .trimEnd();
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${text.length}:${(h >>> 0).toString(16)}`;
  }

  function initialState() {
    return {
      stateVersion: STATE_VERSION,
      coreStateVersion: CORE_STATE_VERSION,
      historyBootstrapped: false,
      historyBootstrappedAt: -1,
      historyBootstrapStats: null,
      templateRecurrenceVersion: 1,
      templateRegistry: [],
      worldYear: null,
      koreanAgeOffset: 0,
      narrativeTimestamp: null,
      narrativeClockVersion: 2,
      clockRepairVersion: 2,
      pending: null,
      outputFingerprint: null,
      hostOutputFingerprint: null,
      manualEditRevision: 0,
    };
  }

  function reconcileState(raw) {
    const s = raw && typeof raw === 'object' ? raw : initialState();
    s.stateVersion = STATE_VERSION;
    s.coreStateVersion = CORE_STATE_VERSION;
    s.historyBootstrapped = !!s.historyBootstrapped;
    s.historyBootstrappedAt = Number.isInteger(Number(s.historyBootstrappedAt)) ? Number(s.historyBootstrappedAt) : -1;
    s.historyBootstrapStats = s.historyBootstrapStats && typeof s.historyBootstrapStats === 'object' ? s.historyBootstrapStats : null;
    s.templateRecurrenceVersion = 1;
    s.templateRegistry = recurrence.normalizeRegistry(s.templateRegistry);
    s.worldYear = s.worldYear != null && Number.isFinite(Number(s.worldYear)) ? Number(s.worldYear) : null;
    s.koreanAgeOffset = Math.max(0, Math.round(Number(s.koreanAgeOffset) || 0));
    s.narrativeTimestamp = typeof s.narrativeTimestamp === 'string' && s.narrativeTimestamp.trim() ? s.narrativeTimestamp.trim() : null;
    s.narrativeClockVersion = Math.max(1, Math.round(Number(s.narrativeClockVersion) || 0));
    s.clockRepairVersion = Math.max(0, Math.round(Number(s.clockRepairVersion) || 0));
    s.pending = s.pending && typeof s.pending === 'object' ? s.pending : null;
    s.outputFingerprint = typeof s.outputFingerprint === 'string' ? s.outputFingerprint : null;
    s.hostOutputFingerprint = typeof s.hostOutputFingerprint === 'string' ? s.hostOutputFingerprint : null;
    s.manualEditRevision = Math.max(0, Math.round(Number(s.manualEditRevision) || 0));
    return s;
  }

  function textOfMessage(m) {
    if (!m) return '';
    const v = m.data ?? m.content ?? m.text ?? '';
    return typeof v === 'string' ? v : String(v || '');
  }

  function latestUserIndex(chat) {
    const rows = chat?.message || [];
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i]?.role === 'user') return i;
    return -1;
  }

  function latestUserText(chat) {
    const i = latestUserIndex(chat);
    return i >= 0 ? textOfMessage(chat.message[i]) : '';
  }

  function inspectPromptMessages(messages, getText = textOfMessage) {
    const rows = Array.isArray(messages) ? messages : [];
    const config = { protagonist: '', secondaryName: '', secondaryKeyword: '' };
    let active = false;
    let carry = '';
    let scannedMessages = 0;
    let scannedChars = 0;

    const captureConfig = (text) => {
      const value = String(text || '');
      if (!config.secondaryName && /Supporting character/i.test(value)) {
        const m = value.match(/^\s*([^\n|{}][^|\n]*?)\s*\|\s*Supporting character\b/im);
        if (m) config.secondaryName = m[1].trim();
      }
      if (!config.protagonist && /Protagonist/i.test(value)) {
        const m = value.match(/^\s*([^\n|{}][^|\n]*?)\s*\|\s*Protagonist\b/im);
        if (m) config.protagonist = m[1].trim();
      }
      if (!config.secondaryKeyword && /Keyword\s*:/i.test(value)) {
        const m = value.match(/(?:Activation\s+)?Keyword:\s*"([^"\n]*)"/i);
        if (m) config.secondaryKeyword = m[1];
      }
    };

    for (let i = 0; i < rows.length; i++) {
      const raw = getText(rows[i]);
      if (!raw) continue;
      const text = String(raw);
      scannedMessages += 1;
      scannedChars += text.length;
      const boundary = carry ? `${carry}\n${text.slice(0, 512)}` : '';
      if (!active) active = HANDSHAKE_RE.test(text) || (!!boundary && HANDSHAKE_RE.test(boundary));
      if (active) {
        captureConfig(text);
        if (boundary) captureConfig(boundary);
        if (/<\/Core_Ruleset>/i.test(text) || (!!boundary && /<\/Core_Ruleset>/i.test(boundary))) break;
      }
      carry = text.slice(-512);
    }
    return { __basecorePromptProbe: true, active, config, stats: { scannedMessages, scannedChars, totalMessages: rows.length } };
  }

  function regexCount(text, re) {
    const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
    return (String(text || '').match(new RegExp(re.source, flags)) || []).length;
  }

  function scanKnowledgeBlocks(content) {
    const text = String(content || '');
    const tokenRe = /<\/?Knowledge>/gi;
    const responseHeaderRe = /^[ \t]*#[ \t]+응답[^\r\n]*$/mi;
    const blocks = [];
    let currentStart = -1;
    let currentInvalid = false;
    let openCount = 0;
    let closeCount = 0;
    let malformed = false;
    let m;
    while ((m = tokenRe.exec(text))) {
      const isClose = /^<\//.test(m[0]);
      if (!isClose) {
        openCount += 1;
        if (currentStart >= 0) { currentInvalid = true; malformed = true; }
        else { currentStart = m.index; currentInvalid = false; }
        continue;
      }
      closeCount += 1;
      if (currentStart < 0) { malformed = true; continue; }
      const end = tokenRe.lastIndex;
      const raw = text.slice(currentStart, end);
      const inner = raw.replace(/^<Knowledge>/i, '').replace(/<\/Knowledge>$/i, '');
      if (responseHeaderRe.test(inner)) { currentInvalid = true; malformed = true; }
      if (!currentInvalid) blocks.push({ start: currentStart, end, text: raw });
      currentStart = -1;
      currentInvalid = false;
    }
    if (currentStart >= 0 || openCount !== closeCount) malformed = true;
    return { blocks, openCount, closeCount, malformed };
  }

  module.exports = {
    STATE_VERSION, CORE_STATE_VERSION, HANDSHAKE_RE, KNOWLEDGE_RE,
    clone, fingerprintText, initialState, reconcileState, textOfMessage,
    latestUserIndex, latestUserText, inspectPromptMessages, regexCount, scanKnowledgeBlocks,
  };
});

BaseCore.define('store', function (_require, module) {
  function now() { return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now(); }
  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  class SnapshotStore {
    constructor(backend, prefix, keepN = 80) {
      this.b = backend;
      this.p = prefix;
      this.keepN = keepN;
      this.lastKeyScan = null;
    }
    _k(phase, index) { return `${this.p}:${phase}:${index}`; }
    async save(phase, index, state, opts = {}) {
      const metric = opts.metric && typeof opts.metric === 'object' ? opts.metric : null;
      let t = now();
      const payload = JSON.stringify(state);
      if (metric) metric.serializeMs = now() - t;
      t = now();
      await this.b.set(this._k(phase, index), payload);
      if (metric) metric.setMs = now() - t;
      if (opts.prune) await this.prune();
    }
    async load(phase, index) {
      const raw = await this.b.get(this._k(phase, index));
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (_) { return null; }
    }
    async latestAtOrBelow(phase, index) {
      const re = new RegExp(`^${escapeRe(this.p)}:${phase}:(\\d+)$`);
      const keys = await this.b.keys();
      let best = -1;
      const t = now();
      for (const k of keys) {
        const m = String(k).match(re);
        if (!m) continue;
        const i = Number(m[1]);
        if (i <= index && i > best) best = i;
      }
      this.lastKeyScan = { op: `latest:${phase}`, ms: now() - t, totalKeys: keys.length, at: Date.now() };
      return best >= 0 ? { index: best, state: await this.load(phase, best) } : null;
    }
    async prune() {
      const re = new RegExp(`^${escapeRe(this.p)}:(pre|send|out):(\\d+)$`);
      const keys = await this.b.keys();
      const rows = [];
      for (const k of keys) {
        const m = String(k).match(re);
        if (m) rows.push({ k, index: Number(m[2]) });
      }
      rows.sort((a, b) => b.index - a.index);
      const keep = new Set(rows.slice(0, this.keepN * 3).map((x) => x.k));
      for (const row of rows) if (!keep.has(row.k)) await this.b.remove(row.k);
    }
    keyScanStats() { return this.lastKeyScan ? { ...this.lastKeyScan } : null; }
  }
  module.exports = { SnapshotStore };
});

BaseCore.define('time', function (_require, module) {
  const CLOCK_REPAIR_VERSION = 2;
  const NARRATIVE_CLOCK_VERSION = 2;
  const TIMESTAMP_RE = /⏱️\[((?:19|20|21)\d{2})-(\d{2})-(\d{2})\s+\(([^)]+)\)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\]/i;
  const ZERO_HOUR_TIMESTAMP_RE = /(⏱️\[(?:19|20|21)\d{2}-\d{2}-\d{2}\s+\([^)]+\)\s+)00:(\d{2})\s+(AM|PM)\]/gi;
  const NARRATIVE_RESPONSE_HEADER_RE = /^[ \t]*#[ \t]+응답[ \t]*$/mi;
  const NARRATIVE_TIMESTAMP_LINE_RE = /^[ \t]*(⏱️\[((?:19|20|21)\d{2})-(\d{2})-(\d{2})\s+\(([^)]+)\)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\])[ \t]*$/gmi;
  const NARRATIVE_TIMESTAMP_LINE_MARKER_RE = /^[ \t]*⏱️\[[^\r\n]*$/gmi;

  function explicitWorldYear(userText) {
    const s = String(userText || '');
    const iso = s.match(/(?:⏱️\[)?((?:19|20|21)\d{2})-\d{1,2}-\d{1,2}/);
    if (iso) return Number(iso[1]);
    const ko = s.match(/((?:19|20|21)\d{2})년\s*\d{1,2}월/);
    return ko ? Number(ko[1]) : null;
  }

  function canonicalizeTimestampSyntax(content) {
    let count = 0;
    const normalized = String(content || '').replace(ZERO_HOUR_TIMESTAMP_RE, (_m, prefix, minute, ampm) => {
      count += 1;
      return `${prefix}12:${minute} ${String(ampm || '').toUpperCase()}]`;
    });
    return { content: normalized, changed: count > 0, count };
  }

  function parseTimestamp(content) {
    const m = String(content || '').match(TIMESTAMP_RE);
    if (!m) return null;
    const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    const hour12 = Number(m[5]), minute = Number(m[6]), ampm = String(m[7] || '').toUpperCase();
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return null;
    let hour24 = hour12 % 12;
    if (ampm === 'PM') hour24 += 12;
    const ms = Date.UTC(year, month - 1, day, hour24, minute, 0, 0);
    const d = new Date(ms);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day || d.getUTCHours() !== hour24 || d.getUTCMinutes() !== minute) return null;
    return { raw: m[0], year, month, day, dayLabel: m[4], hour12, minute, ampm, minuteKey: Math.floor(ms / 60000) };
  }

  function timestampYear(content) { return parseTimestamp(content)?.year ?? null; }
  function compareTimestamps(a, b) {
    const pa = parseTimestamp(a), pb = parseTimestamp(b);
    if (!pa || !pb) return null;
    return pa.minuteKey === pb.minuteKey ? 0 : (pa.minuteKey > pb.minuteKey ? 1 : -1);
  }
  function validDateMs(year, month, day) {
    const y = Number(year), m = Number(month), d = Number(day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || y < 1900 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    const date = new Date(ms);
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return ms;
  }
  function pad2(v) { return String(Math.max(0, Number(v) || 0)).padStart(2, '0'); }
  function dateString(y, m, d) { return `${Number(y)}-${pad2(m)}-${pad2(d)}`; }
  function weekdayLabel(y, m, d) {
    const ms = validDateMs(y, m, d);
    return ms == null ? null : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(ms).getUTCDay()];
  }

  function resolveCalendarTransition(userText, previousTimestamp, fallbackYear = null) {
    const head = String(userText || '').trim().slice(0, 420);
    const m = head.match(/^(?:한편\s+)?(?:그리고\s+)?(?:(?:((?:19|20|21)\d{2})년)\s*)?(\d{1,2})월\s*(\d{1,2})일(?:\s*(?:\([^)]+\)|(?:월|화|수|목|금|토|일)요일))?\s*(?:이|가)?\s*(?:되고|되어|되면서|되었다|됐다)(?:\s|$)/i);
    if (!m) return { eligible: false, reason: 'INELIGIBLE', targetDate: null };
    const explicitYear = m[1] ? Number(m[1]) : null;
    const month = Number(m[2]), day = Number(m[3]);
    const previous = parseTimestamp(previousTimestamp);
    const fallback = Number(fallbackYear);
    const anchorYear = explicitYear || previous?.year || (Number.isFinite(fallback) ? fallback : null);
    if (!anchorYear) return { eligible: false, reason: 'UNRESOLVED_YEAR', targetDate: null, month, day };
    let resolvedYear = null;
    if (explicitYear) {
      const candidate = validDateMs(explicitYear, month, day);
      if (candidate == null) return { eligible: false, reason: 'INVALID_DATE', targetDate: null, year: explicitYear, month, day };
      const previousDay = previous ? validDateMs(previous.year, previous.month, previous.day) : null;
      if (previousDay != null && candidate < previousDay) return { eligible: false, reason: 'EXPLICIT_BACKWARD', targetDate: null, year: explicitYear, month, day };
      resolvedYear = explicitYear;
    } else {
      const previousDay = previous ? validDateMs(previous.year, previous.month, previous.day) : null;
      for (let y = anchorYear; y <= anchorYear + 8; y++) {
        const candidate = validDateMs(y, month, day);
        if (candidate == null || (previousDay != null && candidate < previousDay)) continue;
        resolvedYear = y;
        break;
      }
      if (resolvedYear == null) return { eligible: false, reason: 'INVALID_DATE', targetDate: null, month, day };
    }
    const targetDate = dateString(resolvedYear, month, day);
    const rollover = !explicitYear && resolvedYear > anchorYear;
    return {
      eligible: true,
      reason: explicitYear ? 'EXPLICIT_YEAR' : (rollover ? 'YEAR_ROLLOVER' : 'SAME_YEAR'),
      year: resolvedYear, month, day, targetDate, weekday: weekdayLabel(resolvedYear, month, day),
      previousDate: previous ? dateString(previous.year, previous.month, previous.day) : null,
      anchorYear, yearRollover: rollover, singleYearRollover: rollover && resolvedYear === anchorYear + 1,
    };
  }

  function formatTimestampForDate(parsed, year, month, day) {
    if (!parsed || validDateMs(year, month, day) == null) return null;
    const weekday = weekdayLabel(year, month, day);
    return weekday ? `⏱️[${dateString(year, month, day)} (${weekday}) ${parsed.hour12}:${pad2(parsed.minute)} ${parsed.ampm}]` : null;
  }

  function enforceNarrativeCalendarTarget(content, target) {
    const text = String(content || '');
    if (!target?.eligible || !target?.targetDate) return { content: text, changed: false, reason: 'ineligible' };
    const parsed = parseTimestamp(text);
    if (!parsed) return { content: text, changed: false, reason: 'missing-or-invalid' };
    const expected = formatTimestampForDate(parsed, target.year, target.month, target.day);
    if (!expected) return { content: text, changed: false, reason: 'invalid-target' };
    const changed = expected !== parsed.raw;
    return { content: changed ? text.replace(parsed.raw, expected) : text, changed, reason: changed ? 'repaired' : 'pass', outputTimestamp: expected };
  }

  function repairNarrativeYearRolloverSequence(content, target) {
    const text = String(content || '');
    if (!target?.eligible || !target?.singleYearRollover) return { content: text, changed: false, count: 0, reason: 'ineligible' };
    let previous = null, index = 0, count = 0;
    const lineRe = new RegExp(NARRATIVE_TIMESTAMP_LINE_RE.source, NARRATIVE_TIMESTAMP_LINE_RE.flags);
    const repaired = text.replace(lineRe, (whole, raw) => {
      const parsed = parseTimestamp(raw);
      if (!parsed) { index += 1; return whole; }
      let outputRaw = raw, outputParsed = parsed;
      if (index > 0 && previous && parsed.minuteKey < previous.minuteKey && parsed.year === target.year - 1) {
        const candidateRaw = formatTimestampForDate(parsed, target.year, parsed.month, parsed.day);
        const candidate = candidateRaw ? parseTimestamp(candidateRaw) : null;
        if (candidate && candidate.minuteKey >= previous.minuteKey) { outputRaw = candidateRaw; outputParsed = candidate; count += 1; }
      }
      previous = outputParsed;
      index += 1;
      return outputRaw === raw ? whole : whole.replace(raw, outputRaw);
    });
    return { content: repaired, changed: count > 0, count, reason: count > 0 ? 'year-rollover-repaired' : 'pass' };
  }

  function narrativeEnvelopeText(content) {
    const text = String(content || '');
    const header = text.match(NARRATIVE_RESPONSE_HEADER_RE);
    return header && Number.isInteger(header.index) ? text.slice(header.index) : text;
  }

  function narrativeTimestampSequence(content) {
    const text = narrativeEnvelopeText(content);
    const markers = text.match(new RegExp(NARRATIVE_TIMESTAMP_LINE_MARKER_RE.source, NARRATIVE_TIMESTAMP_LINE_MARKER_RE.flags)) || [];
    const parsed = [];
    const lineRe = new RegExp(NARRATIVE_TIMESTAMP_LINE_RE.source, NARRATIVE_TIMESTAMP_LINE_RE.flags);
    let m;
    while ((m = lineRe.exec(text))) {
      const ts = parseTimestamp(m[1]);
      if (ts) parsed.push(ts);
    }
    if (!parsed.length) {
      const fallback = parseTimestamp(text);
      if (!fallback) return { frameTimestamp: null, candidate: null, sequenceCount: 0, sceneCount: 0, markerCount: markers.length, tailStatus: 'MISSING', tailPromoted: false };
      return { frameTimestamp: fallback.raw, candidate: fallback.raw, sequenceCount: 1, sceneCount: 0, markerCount: markers.length || 1, tailStatus: 'FRAME_ONLY_FALLBACK', tailPromoted: false };
    }
    const frameTimestamp = parsed[0].raw;
    const sceneCount = Math.max(0, parsed.length - 1);
    if (markers.length !== parsed.length) return { frameTimestamp, candidate: frameTimestamp, sequenceCount: parsed.length, sceneCount, markerCount: markers.length, tailStatus: 'SKIPPED_MALFORMED', tailPromoted: false };
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i].minuteKey < parsed[i - 1].minuteKey) return { frameTimestamp, candidate: frameTimestamp, sequenceCount: parsed.length, sceneCount, markerCount: markers.length, tailStatus: 'SKIPPED_NON_MONOTONIC', tailPromoted: false };
    }
    const candidate = parsed[parsed.length - 1].raw;
    return { frameTimestamp, candidate, sequenceCount: parsed.length, sceneCount, markerCount: markers.length, tailStatus: sceneCount > 0 ? 'MONOTONIC' : 'FRAME_ONLY', tailPromoted: sceneCount > 0 && candidate !== frameTimestamp };
  }

  function applyWorldYear(state, year) {
    if (year == null || year === '') return false;
    const y = Number(year);
    if (!Number.isFinite(y)) return false;
    const prev = state.worldYear;
    if (prev == null) { state.worldYear = y; return true; }
    if (y > prev) { state.koreanAgeOffset += y - prev; state.worldYear = y; return true; }
    return false;
  }

  function narrativeProgressionHint(userText) {
    const head = String(userText || '').trim().slice(0, 420);
    if (!head) return { active: false, reason: 'none' };
    const lead = '(?:한편\\s+)?(?:그리고\\s+)?';
    const weekday = '(?:월|화|수|목|금|토|일)요일';
    const weekWord = '(?:\\d{1,2}주차|첫째\\s*주|둘째\\s*주|셋째\\s*주|넷째\\s*주|다섯째\\s*주|마지막\\s*주)';
    const calendar = `(?:\\d{4}년\\s*)?\\d{1,2}월(?:\\s*${weekWord})?(?:\\s*${weekday})?`;
    const namedWeek = `(?:(?:그|이번|다음)\\s*주)(?:\\s*${weekday})?`;
    const dayOnly = `(?:${weekday}|오늘|내일|모레|다음\\s*날|이튿날)`;
    const transition = new RegExp(`^${lead}(?:${calendar}|${namedWeek}|${dayOnly})\\s*(?:이|가)?\\s*(?:되고|되어|되면서|되었다|됐다)(?:\\s|$)`, 'i');
    if (transition.test(head)) return { active: true, reason: 'calendar-transition' };
    const relative = new RegExp(`^${lead}(?:(?:며칠|\\d+\\s*(?:일|주|개월|달|년))\\s*(?:뒤|후)|다음\\s*(?:달|주))(?:(?:이|가)?\\s*(?:되고|되어|지나|흘러))?(?:\\s|$)`, 'i');
    return relative.test(head) ? { active: true, reason: 'relative-forward' } : { active: false, reason: 'none' };
  }

  function enforceNarrativeCurrentTimeFloor(content, previous) {
    const text = String(content || '');
    const parsed = parseTimestamp(text);
    if (!parsed) return { content: text, changed: false, reason: 'missing-or-invalid', observed: null, floor: previous || null };
    if (!previous) return { content: text, changed: false, reason: 'no-floor', observed: parsed.raw, floor: null };
    const cmp = compareTimestamps(parsed.raw, previous);
    if (cmp == null || cmp >= 0) return { content: text, changed: false, reason: cmp === 0 ? 'same' : 'forward', observed: parsed.raw, floor: previous };
    return { content: text.replace(parsed.raw, previous), changed: true, reason: 'clamped-backward', observed: parsed.raw, floor: previous };
  }

  function commitNarrativeTimestamp(state, pending, content) {
    const sequence = narrativeTimestampSequence(content);
    const current = sequence.candidate || sequence.frameTimestamp || null;
    if (!current) return { changed: false, reason: 'missing-or-invalid', timestamp: null, previous: null, ...sequence };
    const previous = pending?.narrativeTimestampPrevious || state.narrativeTimestamp || null;
    if (previous) {
      const cmp = compareTimestamps(current, previous);
      if (cmp != null && cmp < 0) return { changed: false, reason: 'backward', timestamp: current, previous, ...sequence };
    }
    const changed = state.narrativeTimestamp !== current;
    state.narrativeTimestamp = current;
    return { changed, reason: 'committed', timestamp: current, previous, ...sequence };
  }

  function syncNarrativeTimestamp(state, content) {
    const sequence = narrativeTimestampSequence(content);
    const current = sequence.candidate || sequence.frameTimestamp || null;
    if (!current) return false;
    const previous = state.narrativeTimestamp || null;
    if (previous) {
      const cmp = compareTimestamps(current, previous);
      if (cmp != null && cmp < 0) return false;
    }
    const changed = state.narrativeTimestamp !== current;
    state.narrativeTimestamp = current;
    return changed;
  }

  module.exports = {
    CLOCK_REPAIR_VERSION, NARRATIVE_CLOCK_VERSION, TIMESTAMP_RE, canonicalizeTimestampSyntax,
    explicitWorldYear, parseTimestamp, timestampYear, compareTimestamps, resolveCalendarTransition,
    enforceNarrativeCalendarTarget, repairNarrativeYearRolloverSequence, narrativeTimestampSequence,
    narrativeProgressionHint, enforceNarrativeCurrentTimeFloor, commitNarrativeTimestamp,
    syncNarrativeTimestamp, applyWorldYear,
  };
});

BaseCore.define('frame', function (_require, module) {
  const VOLUME_LINE_RE = /^[ \t]*##[ \t]+볼륨[ \t]+(\d+)[ \t]*[:：][^\r\n]*$/mi;
  const CHAPTER_LINE_RE = /^[ \t]*###[ \t]+챕터[ \t]+(\d+)[ \t]*[:：][ \t]*([^\r\n]*)$/mi;
  const CHATINDEX_LINE_RE = /^[ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*(\d+)[^\r\n]*∮[ \t]*$/mi;
  const VOLUME_NUMBER_RE = /^([ \t]*##[ \t]+볼륨[ \t]+)\d+([ \t]*[:：][^\r\n]*)$/mi;
  const CHAPTER_NUMBER_RE = /^([ \t]*###[ \t]+챕터[ \t]+)\d+([ \t]*[:：][ \t]*[^\r\n]*)$/mi;
  const CHATINDEX_NUMBER_RE = /^([ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*)\d+([^\r\n]*∮[ \t]*)$/mi;
  function headerState(raw, re) { const m = String(raw || '').match(re); return m ? { value: Number(m[1]), header: String(m[0] || '').trim() } : { value: null, header: null }; }
  function normalizeChapterTitle(raw) { let t = String(raw || ''); try { t = t.normalize('NFKC'); } catch (_) {} return t.replace(/\s+/g, ' ').trim(); }
  function chapterState(raw) { const m = String(raw || '').match(CHAPTER_LINE_RE); return m ? { value: Number(m[1]), header: String(m[0] || '').trim(), title: normalizeChapterTitle(m[2]) } : { value: null, header: null, title: '' }; }
  function parseFrame(raw) {
    const text = String(raw || '');
    const volume = headerState(text, VOLUME_LINE_RE), chapter = chapterState(text), chatindex = headerState(text, CHATINDEX_LINE_RE);
    return { volume: Number.isFinite(volume.value) ? volume.value : null, volumeHeader: volume.header, chapter: Number.isFinite(chapter.value) ? chapter.value : null, chapterHeader: chapter.header, chapterTitle: chapter.title, chatindex: Number.isFinite(chatindex.value) ? chatindex.value : null, chatindexHeader: chatindex.header };
  }
  function assistantRole(m) { return m?.role === 'assistant' || m?.role === 'char'; }
  function capturePreviousFrame(messages, sendIndex, textOfMessage) {
    const rows = Array.isArray(messages) ? messages : [];
    const before = Number.isInteger(Number(sendIndex)) ? Math.min(Number(sendIndex), rows.length) : rows.length;
    for (let i = before - 1; i >= 0; i--) {
      if (!assistantRole(rows[i])) continue;
      const raw = typeof textOfMessage === 'function' ? textOfMessage(rows[i]) : (rows[i]?.content ?? rows[i]?.data ?? rows[i]?.text ?? '');
      const parsed = parseFrame(raw);
      return [parsed.volume, parsed.chapter, parsed.chatindex].some(Number.isFinite) ? { ...parsed, sourceAssistantIndex: i } : null;
    }
    return null;
  }
  function numericFrame(f) { return { volume: Number.isFinite(f?.volume) ? Number(f.volume) : null, chapter: Number.isFinite(f?.chapter) ? Number(f.chapter) : null, chatindex: Number.isFinite(f?.chatindex) ? Number(f.chatindex) : null }; }
  function replaceHeader(text, re, header) { return header ? String(text || '').replace(re, header) : String(text || ''); }
  function rewriteNumber(text, re, value) { return Number.isFinite(Number(value)) ? String(text || '').replace(re, (_m, a, b) => `${a}${Number(value)}${b}`) : String(text || ''); }
  function enforceContinuity(content, floor) {
    let text = String(content || '');
    const observed = parseFrame(text), previous = floor && typeof floor === 'object' ? floor : null;
    const repairs = [], expected = numericFrame(observed);
    let volumeSignal = 'NO_BASELINE', chapterSignal = 'NO_BASELINE';
    if (previous) {
      if (Number.isFinite(previous.volume) && Number.isFinite(observed.volume)) {
        if (observed.volume < previous.volume) {
          volumeSignal = 'BACKWARD'; expected.volume = previous.volume;
          if (previous.volumeHeader && observed.volumeHeader) { text = replaceHeader(text, VOLUME_LINE_RE, previous.volumeHeader); repairs.push('VOLUME_BACKWARD'); }
          if (previous.chapterHeader && observed.chapterHeader) { text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader); repairs.push('CHAPTER_WITH_VOLUME_BACKWARD'); expected.chapter = previous.chapter; }
        } else if (observed.volume === previous.volume) { volumeSignal = 'SAME'; expected.volume = previous.volume; }
        else { volumeSignal = 'ADVANCED'; expected.volume = previous.volume + 1; if (observed.volume !== expected.volume) { text = rewriteNumber(text, VOLUME_NUMBER_RE, expected.volume); repairs.push('VOLUME_JUMP'); } }
      }
      if (Number.isFinite(previous.chapter) && Number.isFinite(observed.chapter)) {
        if (volumeSignal === 'ADVANCED') { chapterSignal = 'RESET_AFTER_VOLUME_ADVANCE'; expected.chapter = 1; if (observed.chapter !== 1) { text = rewriteNumber(text, CHAPTER_NUMBER_RE, 1); repairs.push('CHAPTER_RESET'); } }
        else if (volumeSignal === 'SAME') {
          const comparable = !!(previous.chapterTitle && observed.chapterTitle);
          if (comparable && previous.chapterTitle === observed.chapterTitle) { chapterSignal = 'SAME_TITLE_HOLD'; expected.chapter = previous.chapter; if (observed.chapter !== expected.chapter) { text = rewriteNumber(text, CHAPTER_NUMBER_RE, expected.chapter); repairs.push('CHAPTER_TITLE_HOLD'); } }
          else if (comparable && previous.chapterTitle !== observed.chapterTitle) { chapterSignal = 'TITLE_CHANGED_ADVANCE'; expected.chapter = previous.chapter + 1; if (observed.chapter !== expected.chapter) { text = rewriteNumber(text, CHAPTER_NUMBER_RE, expected.chapter); repairs.push('CHAPTER_TITLE_ADVANCE'); } }
          else if (observed.chapter < previous.chapter) { chapterSignal = 'BACKWARD'; expected.chapter = previous.chapter; if (previous.chapterHeader && observed.chapterHeader) { text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader); repairs.push('CHAPTER_BACKWARD'); } }
          else chapterSignal = 'UNRESOLVED_TITLE';
        } else if (volumeSignal === 'BACKWARD') { chapterSignal = 'HELD_WITH_VOLUME'; expected.chapter = previous.chapter; }
        else if (observed.chapter < previous.chapter) { chapterSignal = 'BACKWARD'; expected.chapter = previous.chapter; if (previous.chapterHeader && observed.chapterHeader) { text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader); repairs.push('CHAPTER_BACKWARD'); } }
      }
      if (Number.isFinite(previous.chatindex) && Number.isFinite(observed.chatindex)) {
        expected.chatindex = previous.chatindex + 1;
        if (observed.chatindex !== expected.chatindex) { text = rewriteNumber(text, CHATINDEX_NUMBER_RE, expected.chatindex); repairs.push(observed.chatindex === previous.chatindex ? 'CHATINDEX_SAME' : (observed.chatindex < expected.chatindex ? 'CHATINDEX_BACKWARD' : 'CHATINDEX_JUMP')); }
      }
    }
    return { content: text, probe: { applied: repairs.length > 0, regression: repairs.length ? repairs.join('+') : 'NONE', sequenceStatus: previous ? (repairs.length ? 'REPAIRED' : 'PASS') : 'BASELINE', volumeSignal, chapterSignal, repairs, previous: numericFrame(previous), observed: numericFrame(observed), expected, output: numericFrame(parseFrame(text)) } };
  }
  module.exports = { parseFrame, capturePreviousFrame, enforceContinuity };
});

BaseCore.define('structure', function (require, module) {
  const kernel = require('./kernel');
  const time = require('./time');
  const RESPONSE_HEADER_RE = /^\s*#\s+응답\s*$/mi;
  const VOLUME_HEADER_RE = /^\s*##\s+볼륨\s+\d+\s*[:：]\s*\S.*$/mi;
  const CHAPTER_HEADER_RE = /^\s*###\s+챕터\s+\d+\s*[:：]\s*\S.*$/mi;
  const CHATINDEX_HEADER_RE = /^\s*####\s+Chatindex\s*[:：]\s*\d+\s*∮\s*$/mi;
  const TIMESTAMP_RE = /⏱️\[\d{4}-\d{2}-\d{2}\s+\([^)]+\)\s+\d{1,2}:\d{2}\s+(?:AM|PM)\]/i;
  const RESPONSE_HEADER_MARKER_RE = /^[ \t]*#[ \t]+응답[^\r\n]*$/mi;
  const VOLUME_HEADER_MARKER_RE = /^[ \t]*##[ \t]+볼륨[^\r\n]*$/mi;
  const CHAPTER_HEADER_MARKER_RE = /^[ \t]*###[ \t]+챕터[^\r\n]*$/mi;
  const CHATINDEX_HEADER_MARKER_RE = /^[ \t]*####[ \t]+Chatindex[^\r\n]*$/mi;
  const TIMESTAMP_MARKER_RE = /⏱️\[/i;

  function firstMatch(text, re) { const m = String(text || '').match(re); return !m || !Number.isInteger(m.index) ? null : { index: m.index, end: m.index + m[0].length, text: m[0] }; }
  function responseEnvelopeScope(content) {
    const raw = String(content || '');
    const responseInRaw = firstMatch(raw, RESPONSE_HEADER_MARKER_RE);
    if (!responseInRaw) return { envelope: raw, responseStart: -1, frameOk: false, orderOk: false, timestampMarkerFound: false, timestampValid: false, timestamp: null };
    const envelope = raw.slice(responseInRaw.index);
    const response = firstMatch(envelope, RESPONSE_HEADER_MARKER_RE), volume = firstMatch(envelope, VOLUME_HEADER_MARKER_RE), chapter = firstMatch(envelope, CHAPTER_HEADER_MARKER_RE), chatindex = firstMatch(envelope, CHATINDEX_HEADER_MARKER_RE);
    let timestampMarker = null, timestamp = null;
    if (chatindex) {
      const after = envelope.slice(chatindex.end);
      const marker = firstMatch(after, TIMESTAMP_MARKER_RE);
      if (marker) {
        timestampMarker = { index: chatindex.end + marker.index, end: chatindex.end + marker.end, text: marker.text };
        const parsed = firstMatch(envelope.slice(timestampMarker.index), TIMESTAMP_RE);
        if (parsed && parsed.index === 0) timestamp = { index: timestampMarker.index, end: timestampMarker.index + parsed.end, text: parsed.text };
      }
    }
    const headerCountsOk = kernel.regexCount(envelope, RESPONSE_HEADER_MARKER_RE) === 1 && kernel.regexCount(envelope, VOLUME_HEADER_MARKER_RE) === 1 && kernel.regexCount(envelope, CHAPTER_HEADER_MARKER_RE) === 1 && kernel.regexCount(envelope, CHATINDEX_HEADER_MARKER_RE) === 1;
    const headerFormatsOk = kernel.regexCount(envelope, RESPONSE_HEADER_RE) === 1 && kernel.regexCount(envelope, VOLUME_HEADER_RE) === 1 && kernel.regexCount(envelope, CHAPTER_HEADER_RE) === 1 && kernel.regexCount(envelope, CHATINDEX_HEADER_RE) === 1;
    const ordered = !!(response && volume && chapter && chatindex && timestamp && response.index === 0 && response.end <= volume.index && volume.end <= chapter.index && chapter.end <= chatindex.index && chatindex.end <= timestamp.index);
    const cleanGaps = !!(ordered && !envelope.slice(response.end, volume.index).trim() && !envelope.slice(volume.end, chapter.index).trim() && !envelope.slice(chapter.end, chatindex.index).trim() && !envelope.slice(chatindex.end, timestamp.index).trim());
    const orderOk = ordered && cleanGaps;
    return { envelope, responseStart: responseInRaw.index, frameOk: headerCountsOk && headerFormatsOk && !!timestamp && orderOk, orderOk, timestampMarkerFound: !!timestampMarker, timestampValid: !!timestamp, timestamp: timestamp?.text || null };
  }

  function integrity(content) {
    const scope = responseEnvelopeScope(content);
    const text = String(scope.envelope || '').trim();
    const knowledge = kernel.scanKnowledgeBlocks(text);
    const k = knowledge.blocks.length === 1 && !knowledge.malformed ? knowledge.blocks[0] : null;
    const knowledgeOk = !!k && !text.slice(k.end).trim();
    return { safe: scope.frameOk && knowledgeOk, frameOk: scope.frameOk, knowledgeOk, knowledge, scope };
  }

  function validateStructure(content, pending) {
    if (!pending?.active) return [];
    const issues = [];
    const scope = responseEnvelopeScope(content);
    const text = String(scope.envelope || '');
    if (!scope.frameOk) issues.push('공통 response frame 형식/순서 오류');
    if (pending.narrativeClockGuard && pending.narrativeTimestampPrevious) {
      const current = time.parseTimestamp(text), previous = time.parseTimestamp(pending.narrativeTimestampPrevious);
      if (current && previous && current.minuteKey < previous.minuteKey) issues.push(`Narrative 현재 시각 역행: ${current.raw} < ${previous.raw}`);
    }
    const knowledge = kernel.scanKnowledgeBlocks(text);
    if (knowledge.blocks.length === 0) issues.push('<Knowledge> 블록 누락');
    else if (knowledge.blocks.length > 1) issues.push(`<Knowledge> 블록 중복 ${knowledge.blocks.length}개`);
    if (knowledge.malformed || knowledge.openCount !== 1 || knowledge.closeCount !== 1 || knowledge.blocks.length !== 1) issues.push(`<Knowledge> 태그 구조 오류 (open ${knowledge.openCount}, close ${knowledge.closeCount}, strict-complete ${knowledge.blocks.length})`);
    if (knowledge.blocks.length === 1 && !knowledge.malformed && text.slice(knowledge.blocks[0].end).trim()) issues.push('<Knowledge> 뒤에 추가 텍스트가 있음');
    if (pending.secondaryConfigured && !pending.secondaryActive && pending.secondaryName) {
      const escaped = pending.secondaryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(escaped).test(text)) issues.push(`비활성 보조 캐릭터 "${pending.secondaryName}" 노출`);
    }
    if (/(?:만\s*\d+\s*세|만\s*나이|국제\s*나이|international\s+age|western\s+age)/i.test(text)) issues.push('금지된 국제/만 나이 표현');
    return issues;
  }

  function stateCommitSafety(content, envelopeResolved = true) {
    const x = integrity(content);
    const responseCount = kernel.regexCount(x.scope.envelope, RESPONSE_HEADER_MARKER_RE);
    const commitSafe = !!(envelopeResolved && x.safe && responseCount === 1);
    return { commitSafe, reason: commitSafe ? '' : `state quarantine: response=${responseCount}, frame=${x.frameOk ? 'OK' : 'BAD'}, knowledge=${x.knowledgeOk ? 'OK' : 'BAD'}` };
  }
  module.exports = { responseEnvelopeScope, integrity, validateStructure, stateCommitSafety };
});

BaseCore.define('output-compat', function (require, module) {
  const structure = require('./structure');
  const RESPONSE_MARKER_RE = /^[ \t]*#[ \t]+응답[^\r\n]*$/gmi;
  function candidates(raw) {
    const text = String(raw || '');
    const matches = [...text.matchAll(RESPONSE_MARKER_RE)];
    return matches.map((m, i) => ({ index: i, offset: m.index, text: text.slice(m.index), prefix: text.slice(0, m.index) }));
  }
  function classifyPrefix(prefix) {
    const p = String(prefix || '');
    if (!p.trim()) return 'WHITESPACE_ONLY';
    if (/^\s*<Thoughts>[\s\S]*?<\/Thoughts>\s*$/i.test(p) || /^\s*<Thoughts>[\s\S]*$/i.test(p)) return 'THOUGHTS_COMPAT';
    return 'UNKNOWN_TEXT';
  }
  function prepareOutput(content, pending) {
    const raw = String(content || '');
    if (!pending?.active) return { content: raw, repaired: false, issues: [], diagnostics: [], resolved: true, preambleProvenance: null };
    const rows = candidates(raw);
    if (!rows.length) return { content: raw, repaired: false, issues: ['# 응답 envelope를 찾지 못함'], diagnostics: [], resolved: false, preambleProvenance: null };
    const safe = rows.filter((r) => structure.integrity(r.text).safe);
    if (!safe.length) {
      const one = rows.length === 1 ? rows[0] : null;
      return { content: one ? one.text : raw, repaired: !!one, issues: ['안전한 # 응답 envelope를 확정하지 못함'], diagnostics: [], resolved: !!one && !one.prefix.trim(), preambleProvenance: one ? { kind: classifyPrefix(one.prefix), action: 'UNCHANGED', candidateCount: rows.length } : null };
    }
    const selected = safe[safe.length - 1];
    const kind = classifyPrefix(selected.prefix);
    const compatible = kind === 'WHITESPACE_ONLY' || kind === 'THOUGHTS_COMPAT';
    const issues = [];
    const diagnostics = [];
    if (!compatible && selected.prefix.trim()) issues.push('응답 envelope 앞 알 수 없는 텍스트 제거');
    else if (kind === 'THOUGHTS_COMPAT') diagnostics.push('Thoughts preamble compatibility: stripped');
    if (rows.length > 1) diagnostics.push(`응답 envelope 중복 ${rows.length}개 → 안전한 마지막 후보 사용`);
    return { content: selected.text.trim(), repaired: selected.offset > 0 || rows.length > 1, issues, diagnostics, resolved: true, preambleProvenance: { kind, action: selected.offset > 0 ? 'STRIPPED' : 'NONE', candidateCount: rows.length } };
  }
  module.exports = { prepareOutput };
});

BaseCore.define('turn', function (require, module) {
  const kernel = require('./kernel'), time = require('./time'), recurrence = require('./recurrence'), frame = require('./frame');
  function prepareTurn(baseState, userText, promptProbe, sendIndex, history) {
    const state = kernel.reconcileState(kernel.clone(baseState));
    const probe = promptProbe && promptProbe.__basecorePromptProbe ? promptProbe : { active: false, config: {} };
    if (!probe.active) { state.pending = { active: false, sendIndex }; return state; }
    const input = String(userText || '');
    const config = probe.config || {};
    const secondaryConfigured = !!(config.secondaryName && config.secondaryKeyword);
    const secondaryActive = secondaryConfigured && input.includes(config.secondaryKeyword);
    const narrativeTimestampPrevious = state.narrativeTimestamp || null;
    const narrativeCalendarTarget = time.resolveCalendarTransition(input, narrativeTimestampPrevious, state.worldYear);
    const progression = narrativeCalendarTarget.eligible ? { active: true, reason: 'calendar-resolved' } : time.narrativeProgressionHint(input);
    const recurrenceProbe = recurrence.observe(state, input);
    time.applyWorldYear(state, narrativeCalendarTarget.eligible ? narrativeCalendarTarget.year : time.explicitWorldYear(input));
    state.pending = {
      active: true,
      sendIndex,
      userText: input.slice(0, 16000),
      protagonist: config.protagonist || '',
      secondaryConfigured,
      secondaryActive,
      secondaryName: config.secondaryName || '',
      secondaryKeyword: config.secondaryKeyword || '',
      narrativeProgressionActive: !!progression.active,
      narrativeProgressionReason: progression.reason || 'none',
      narrativeTimestampPrevious,
      narrativeClockGuard: !!(progression.active && narrativeTimestampPrevious),
      narrativeCalendarTarget,
      templateRecurrenceEligible: !!recurrenceProbe.eligible,
      templateRecurrenceRepeated: !!recurrenceProbe.repeated,
      templateRecurrenceHash: recurrenceProbe.hash == null ? null : Number(recurrenceProbe.hash),
      templateRecurrenceChars: Number(recurrenceProbe.normalizedChars || 0),
      templateRegistrySize: Number(recurrenceProbe.registrySize || 0),
      frameFloor: frame.capturePreviousFrame(history || [], sendIndex, kernel.textOfMessage),
    };
    return state;
  }
  module.exports = { prepareTurn };
});

BaseCore.define('prompt', function (_require, module) {
  function renderRuntimePrompt(state) {
    const p = state?.pending;
    if (!p?.active) return { text: '', tiers: { stable: '', slow: '', volatile: '' } };
    const stable = [
      '<BASECORE_RUNTIME>',
      'runtime=BaseCore',
      'narrative_mode=omniscient_world_architect',
      'runtime_state_is_authoritative=1',
      'response_frame=# 응답 > ## 볼륨 N: title > ### 챕터 N: title > #### Chatindex: N ∮ > timestamp',
      'knowledge_block_required=1',
      'knowledge_block_must_be_final=1',
      'reference_sources=character_card+currently_available_lore_if_present',
      'character_world_facts_use_reference_sources=1',
      'user_controlled_character_actions_dialogue_thoughts_must_not_be_invented=1',
    ];
    const slow = [
      `world_year=${state.worldYear ?? 'unknown'}`,
      `korean_age_offset=${Number(state.koreanAgeOffset || 0)}`,
      `secondary_configured=${p.secondaryConfigured ? 1 : 0}`,
      `secondary_active=${p.secondaryActive ? 1 : 0}`,
    ];
    if (p.secondaryConfigured) slow.push(`secondary_name=${JSON.stringify(p.secondaryName || '')}`, `secondary_keyword=${JSON.stringify(p.secondaryKeyword || '')}`);
    const volatile = [
      `narrative_time_previous=${p.narrativeTimestampPrevious || 'unknown'}`,
      `narrative_time_forward_guard=${p.narrativeClockGuard ? 1 : 0}`,
      `narrative_time_trigger=${p.narrativeProgressionReason || 'none'}`,
    ];
    if (p.narrativeCalendarTarget?.eligible) volatile.push(`narrative_calendar_target=${p.narrativeCalendarTarget.targetDate}`, `narrative_calendar_weekday=${p.narrativeCalendarTarget.weekday}`);
    const floor = p.frameFloor || null;
    if (floor) volatile.push(`previous_volume=${floor.volume ?? 'unknown'}`, `previous_chapter=${floor.chapter ?? 'unknown'}`, `previous_chatindex=${floor.chatindex ?? 'unknown'}`);
    if (p.templateRecurrenceRepeated) volatile.push('request_template_recurs_from_prior_history=1', 'prior_answer_is_not_a_content_template=1', 'preserve_requested_fields_and_output_contract=1', 'reevaluate_current_event_and_current_context_before_choosing_emphasis_and_wording=1', 'do_not_mechanically_reuse_prior_answer_composition_or_wording=1');
    volatile.push('</BASECORE_RUNTIME>');
    return { text: [...stable, ...slow, ...volatile].join('\n'), tiers: { stable: stable.join('\n'), slow: slow.join('\n'), volatile: volatile.join('\n') } };
  }
  module.exports = { renderRuntimePrompt };
});

BaseCore.define('bootstrap', function (require, module) {
  const kernel = require('./kernel'), time = require('./time'), recurrence = require('./recurrence'), outputCompat = require('./output-compat');
  function fromHistory(baseState, messages, endIndex = -1) {
    const state = kernel.reconcileState(kernel.clone(baseState || kernel.initialState()));
    state.worldYear = null;
    state.koreanAgeOffset = 0;
    state.narrativeTimestamp = null;
    state.templateRegistry = [];
    const rows = Array.isArray(messages) ? messages : [];
    const stop = endIndex >= 0 ? Math.min(endIndex, rows.length - 1) : rows.length - 1;
    let userMessages = 0, assistantMessages = 0, lastAssistantIndex = -1;
    for (let i = 0; i <= stop; i++) {
      const row = rows[i] || {}, text = kernel.textOfMessage(row);
      if (row.role === 'user') {
        userMessages += 1;
        recurrence.observe(state, text);
        time.applyWorldYear(state, time.explicitWorldYear(text));
        continue;
      }
      if (row.role !== 'char' && row.role !== 'assistant') continue;
      assistantMessages += 1;
      lastAssistantIndex = i;
      const prepared = outputCompat.prepareOutput(text, { active: true });
      const cleaned = prepared.resolved ? prepared.content : text;
      time.syncNarrativeTimestamp(state, cleaned);
      time.applyWorldYear(state, time.timestampYear(cleaned));
    }
    state.historyBootstrapped = true;
    state.historyBootstrappedAt = lastAssistantIndex;
    state.historyBootstrapStats = { scannedThrough: stop, userMessages, assistantMessages, registrySize: state.templateRegistry.length, narrativeTimestamp: state.narrativeTimestamp, worldYear: state.worldYear };
    state.pending = null;
    return state;
  }
  module.exports = { fromHistory };
});

BaseCore.define('session', function (require, module) {
  const kernel = require('./kernel'), time = require('./time'), frame = require('./frame'), structure = require('./structure'), outputCompat = require('./output-compat'), turn = require('./turn'), prompt = require('./prompt'), bootstrap = require('./bootstrap'), storeMod = require('./store');

  class BaseCoreSession {
    constructor(backend, opts) {
      this.store = new storeMod.SnapshotStore(backend, opts.prefix, opts.keepN || 80);
      this.current = kernel.initialState();
      this.currentOutputIndex = -1;
      this.needsHistoryBootstrap = true;
    }
    async init(lastAssistantIndex, portableState = null, latestOutputFingerprint = null) {
      let state = null;
      if (portableState) {
        try { state = kernel.reconcileState(JSON.parse(portableState)); } catch (_) {}
      }
      if (!state && lastAssistantIndex >= 0) state = (await this.store.latestAtOrBelow('out', lastAssistantIndex))?.state || null;
      this.current = kernel.reconcileState(state || kernel.initialState());
      this.currentOutputIndex = lastAssistantIndex;
      this.needsHistoryBootstrap = !this.current.historyBootstrapped;
      if (latestOutputFingerprint && this.current.outputFingerprint && latestOutputFingerprint !== this.current.outputFingerprint) this.needsHistoryBootstrap = true;
      return this.current;
    }
    async bootstrapHistoryIfNeeded(messages, endIndex) {
      if (!this.needsHistoryBootstrap && this.current.historyBootstrapped) return { changed: false, stats: this.current.historyBootstrapStats };
      this.current = bootstrap.fromHistory(this.current, messages, endIndex);
      this.needsHistoryBootstrap = false;
      return { changed: true, stats: this.current.historyBootstrapStats };
    }
    async reconcileVisibleHistory(messages, latestAssistantIndex) {
      if (latestAssistantIndex < 0) return { changed: false, reason: 'no-assistant' };
      const visible = kernel.textOfMessage(messages[latestAssistantIndex]);
      const fp = kernel.fingerprintText(visible);
      if (!this.current.outputFingerprint || fp === this.current.outputFingerprint || fp === this.current.hostOutputFingerprint) return { changed: false, reason: 'same' };
      this.current = bootstrap.fromHistory(this.current, messages, latestAssistantIndex);
      this.current.outputFingerprint = fp;
      this.current.hostOutputFingerprint = fp;
      this.current.manualEditRevision = Math.max(0, Number(this.current.manualEditRevision) || 0) + 1;
      await this.store.save('out', latestAssistantIndex, this.current);
      return { changed: true, reason: 'manual-edit-rebuilt' };
    }
    async onSend(sendIndex, userText, promptProbe, history) {
      const pre = kernel.reconcileState(kernel.clone(this.current));
      await this.store.save('pre', sendIndex, pre);
      const next = turn.prepareTurn(pre, userText, promptProbe, sendIndex, history);
      await this.store.save('send', sendIndex, next);
      this.current = next;
      const rendered = prompt.renderRuntimePrompt(next);
      return { active: !!next.pending?.active, state: next, promptBlock: rendered.text, promptIdentityTiers: rendered.tiers };
    }
    resolveOutputIndex(fallbackOutIndex) {
      const p = this.current?.pending;
      if (p?.active && Number.isInteger(Number(p.sendIndex))) return Number(p.sendIndex) + 1;
      return Number(fallbackOutIndex);
    }
    async processOutput(outIndex, content) {
      const base = kernel.reconcileState(kernel.clone(this.current));
      const p = base.pending;
      if (!p?.active) return { active: false, state: base, content: String(content || ''), issues: [] };
      const hostRaw = String(content || '');
      const prepared = outputCompat.prepareOutput(hostRaw, p);
      let finalText = prepared.content;
      const tsCanon = time.canonicalizeTimestampSyntax(finalText); finalText = tsCanon.content;
      const calendar = time.enforceNarrativeCalendarTarget(finalText, p.narrativeCalendarTarget); finalText = calendar.content;
      const rollover = time.repairNarrativeYearRolloverSequence(finalText, p.narrativeCalendarTarget); finalText = rollover.content;
      const clockFloor = p.narrativeClockGuard ? time.enforceNarrativeCurrentTimeFloor(finalText, p.narrativeTimestampPrevious) : { content: finalText, changed: false, reason: 'guard-off' }; finalText = clockFloor.content;
      const frameGuard = frame.enforceContinuity(finalText, p.frameFloor || null); finalText = frameGuard.content;
      const issues = [...(prepared.issues || []), ...structure.validateStructure(finalText, p)];
      const commit = structure.stateCommitSafety(finalText, prepared.resolved);
      if (commit.commitSafe) {
        const clock = time.commitNarrativeTimestamp(base, p, finalText);
        time.applyWorldYear(base, time.timestampYear(clock.timestamp || finalText));
      }
      base.pending = null;
      base.outputFingerprint = kernel.fingerprintText(finalText);
      base.hostOutputFingerprint = kernel.fingerprintText(hostRaw);
      await this.store.save('out', outIndex, base);
      this.current = base;
      this.currentOutputIndex = outIndex;
      return { active: true, state: base, content: finalText, issues: commit.commitSafe ? issues : [...issues, commit.reason], diagnostics: prepared.diagnostics || [], frameGuardProbe: frameGuard.probe, timestampCanonicalization: tsCanon, clockFloor, stateCommit: commit, preambleProvenance: prepared.preambleProvenance };
    }
    portableState() { return JSON.stringify(kernel.reconcileState(kernel.clone(this.current))); }
    storageDiagnostics() { return this.store.keyScanStats(); }
  }

  module.exports = { BaseCoreSession, latestUserIndex: kernel.latestUserIndex, latestUserText: kernel.latestUserText, inspectPromptMessages: kernel.inspectPromptMessages, fingerprintText: kernel.fingerprintText };
});

BaseCore.define('runtime-host', function (_require, module) {
  function createHostAdapter(Risuai) {
    return Object.freeze({
      async currentIndices() { const [chaIdx, chatIdx] = await Promise.all([Risuai.getCurrentCharacterIndex(), Risuai.getCurrentChatIndex()]); return { chaIdx, chatIdx }; },
      getChat: (chaIdx, chatIdx) => Risuai.getChatFromIndex(chaIdx, chatIdx),
      getCharacter: () => Risuai.getCharacter(),
      setChat: (chaIdx, chatIdx, chat) => Risuai.setChatToIndex(chaIdx, chatIdx, chat),
      storageBackend() { return { get: (k) => Risuai.pluginStorage.getItem(k), set: (k, v) => Risuai.pluginStorage.setItem(k, v), remove: (k) => Risuai.pluginStorage.removeItem(k), keys: () => Risuai.pluginStorage.keys() }; },
    });
  }
  module.exports = { createHostAdapter };
});

BaseCore.define('runtime-hooks', function (_require, module) {
  async function addBefore(Risuai, handler) { return Risuai.addRisuReplacer('beforeRequest', handler); }
  async function addOutput(Risuai, handler) { return Risuai.addRisuScriptHandler('output', handler); }
  async function remove(Risuai, beforeHandler, outputHandler) {
    try { await Risuai.removeRisuReplacer('beforeRequest', beforeHandler); } catch (_) {}
    try { await Risuai.removeRisuScriptHandler('output', outputHandler); } catch (_) {}
  }
  module.exports = { addBefore, addOutput, remove };
});

(async () => {
  const core = BaseCore.require('session');
  const kernel = BaseCore.require('kernel');
  const host = BaseCore.require('runtime-host').createHostAdapter(Risuai);
  const hooks = BaseCore.require('runtime-hooks');
  let session = null, sessionKey = null, locationKey = null;
  let runtimeDisposed = false, runtimeEpoch = 1, staleDrops = 0;
  let lastProbe = null, lastOutputProbe = null;
  const uiParts = [];

  function runtimeCurrent(epoch = runtimeEpoch) { return !runtimeDisposed && Number(epoch) === Number(runtimeEpoch); }
  function textOf(m) { return kernel.textOfMessage(m); }
  function assistantRole(m) { return m?.role === 'char' || m?.role === 'assistant'; }
  function location(chaIdx, chatIdx, chat) { return `${chaIdx}:${chatIdx}:${chat?.id ?? ''}`; }

  async function loadSession(chaIdx, chatIdx, chatArg = null) {
    const chat = chatArg || await host.getChat(chaIdx, chatIdx);
    if (!chat) return null;
    const loc = location(chaIdx, chatIdx, chat);
    if (session && locationKey === loc) return session;
    const char = await host.getCharacter();
    if (!char) return null;
    const charId = char.chaId ?? char.name;
    const chatId = chat.id ?? `${charId}:${chatIdx}`;
    const key = `${charId}:${chatId}`;
    if (session && sessionKey === key) { locationKey = loc; return session; }
    session = new core.BaseCoreSession(host.storageBackend(), { prefix: `basecore:state:${key}`, keepN: 80 });
    sessionKey = key; locationKey = loc;
    const rows = chat.message || [];
    let lastAssistant = -1;
    for (let i = rows.length - 1; i >= 0; i--) if (assistantRole(rows[i])) { lastAssistant = i; break; }
    const fp = lastAssistant >= 0 ? core.fingerprintText(textOf(rows[lastAssistant])) : null;
    await session.init(lastAssistant, chat.scriptstate?.['$basecore_state'] || null, fp);
    return session;
  }

  function deferMirror(chaIdx, chatIdx, expectedLocation, outIndex, state) {
    const epoch = runtimeEpoch;
    const portable = JSON.stringify(kernel.reconcileState(kernel.clone(state)));
    const canonical = String(state.outputFingerprint || '');
    const hostRaw = String(state.hostOutputFingerprint || '');
    const run = async () => {
      if (!runtimeCurrent(epoch)) { staleDrops += 1; return; }
      try {
        const chat = await host.getChat(chaIdx, chatIdx);
        if (!chat || location(chaIdx, chatIdx, chat) !== expectedLocation) return;
        const msg = Array.isArray(chat.message) ? chat.message[outIndex] : null;
        if (!msg || !assistantRole(msg)) return;
        const fp = core.fingerprintText(textOf(msg));
        if (fp !== canonical && fp !== hostRaw) return;
        chat.scriptstate = chat.scriptstate && typeof chat.scriptstate === 'object' ? chat.scriptstate : {};
        chat.scriptstate['$basecore_state'] = portable;
        if (!runtimeCurrent(epoch)) { staleDrops += 1; return; }
        await host.setChat(chaIdx, chatIdx, chat);
      } catch (e) { console.log(BASECORE_LOG_PREFIX + ' deferred mirror error:', e?.message || e); }
    };
    if (typeof setTimeout === 'function') setTimeout(() => { void run(); }, 0);
    else void run();
  }

  const beforeRequestHandler = async (messages, type) => {
    if (type !== 'model') return messages;
    const epoch = runtimeEpoch;
    if (!runtimeCurrent(epoch)) { staleDrops += 1; return messages; }
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try {
      const { chaIdx, chatIdx } = await host.currentIndices();
      const chat = await host.getChat(chaIdx, chatIdx);
      if (!chat || !runtimeCurrent(epoch)) return messages;
      const cs = await loadSession(chaIdx, chatIdx, chat);
      if (!cs || !runtimeCurrent(epoch)) return messages;
      const promptProbe = core.inspectPromptMessages(messages, textOf);
      const sendIndex = core.latestUserIndex(chat);
      const rows = chat.message || [];
      let lastAssistant = -1;
      for (let i = rows.length - 1; i >= 0; i--) if (assistantRole(rows[i])) { lastAssistant = i; break; }
      if (promptProbe.active && cs.needsHistoryBootstrap) await cs.bootstrapHistoryIfNeeded(lastAssistant >= 0 ? rows : [], lastAssistant);
      if (promptProbe.active) await cs.reconcileVisibleHistory(rows, lastAssistant);
      const result = await cs.onSend(sendIndex >= 0 ? sendIndex : Math.max(0, rows.length - 1), core.latestUserText(chat), promptProbe, rows);
      if (result.active && result.promptBlock) messages.push({ role: 'system', content: result.promptBlock });
      const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      lastProbe = { at: Date.now(), active: result.active, sendIndex, handshake: promptProbe.active ? 'FOUND' : 'NOT_FOUND', ms: Math.max(0, ended - started), promptChars: result.promptBlock?.length || 0, narrativeTimestamp: result.state?.narrativeTimestamp || null, worldYear: result.state?.worldYear ?? null, koreanAgeOffset: Number(result.state?.koreanAgeOffset || 0), recurrence: !!result.state?.pending?.templateRecurrenceRepeated };
    } catch (e) {
      lastProbe = { at: Date.now(), active: false, error: e?.message || String(e) };
      console.log(BASECORE_LOG_PREFIX + ' beforeRequest error:', e?.message || e);
    }
    return messages;
  };
  await hooks.addBefore(Risuai, beforeRequestHandler);

  const outputHandler = async (content) => {
    const epoch = runtimeEpoch;
    if (!runtimeCurrent(epoch)) { staleDrops += 1; return content; }
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try {
      const { chaIdx, chatIdx } = await host.currentIndices();
      const chat = await host.getChat(chaIdx, chatIdx);
      if (!chat || !runtimeCurrent(epoch)) return content;
      const cs = await loadSession(chaIdx, chatIdx, chat);
      if (!cs) return content;
      const fallbackOutIndex = chat?.message?.length ?? 0;
      const outIndex = cs.resolveOutputIndex(fallbackOutIndex);
      const result = await cs.processOutput(outIndex, content);
      if (!result.active) return content;
      const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      lastOutputProbe = { at: Date.now(), outIndex, ms: Math.max(0, ended - started), issues: result.issues || [], frame: result.frameGuardProbe || null, stateCommit: result.stateCommit || null, timestamp: result.state?.narrativeTimestamp || null };
      deferMirror(chaIdx, chatIdx, location(chaIdx, chatIdx, chat), outIndex, result.state);
      if (result.issues?.length) console.log(BASECORE_LOG_PREFIX + ' structure warnings:', result.issues.join(' / '));
      return result.content;
    } catch (e) {
      console.log(BASECORE_LOG_PREFIX + ' output error:', e?.message || e);
      return content;
    }
  };
  await hooks.addOutput(Risuai, outputHandler);

  function esc(v) { return String(v ?? '').replace(/[&<>\"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;' }[c])); }
  async function openPanel() {
    const state = session?.current || kernel.initialState();
    const warnings = Array.isArray(lastOutputProbe?.issues) ? lastOutputProbe.issues : [];
    document.body.innerHTML = `<style>body{margin:0;background:#0b1020;color:#e7ecf6;font:14px system-ui}.w{max-width:680px;margin:auto;padding:18px}.c{background:#121a2d;border:1px solid #293754;border-radius:12px;padding:14px;margin:10px 0}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.k{color:#9fb3d7;font-size:12px}.v{font-weight:700;margin-top:3px}button{background:#263d73;color:white;border:1px solid #4564a2;border-radius:8px;padding:7px 11px}</style><div class="w"><div style="display:flex;justify-content:space-between;align-items:center"><h2>BaseCore v${esc(BASECORE_RUNTIME_VERSION)}</h2><button id="close">닫기</button></div><div class="c g"><div><div class="k">Runtime</div><div class="v">${runtimeDisposed ? 'DISPOSED' : 'ACTIVE'}</div></div><div><div class="k">Handshake</div><div class="v">${esc(lastProbe?.handshake || 'n/a')}</div></div><div><div class="k">Narrative time</div><div class="v">${esc(state.narrativeTimestamp || 'unknown')}</div></div><div><div class="k">World year</div><div class="v">${esc(state.worldYear ?? 'unknown')}</div></div><div><div class="k">Korean age offset</div><div class="v">+${Number(state.koreanAgeOffset || 0)}</div></div><div><div class="k">Reload safety</div><div class="v">epoch ${runtimeEpoch} · stale ${staleDrops}</div></div></div><div class="c"><div class="k">Last request</div><div class="v">${lastProbe ? `${Number(lastProbe.ms || 0).toFixed(1)} ms · prompt ${Number(lastProbe.promptChars || 0)} chars · recurrence ${lastProbe.recurrence ? 'REPEATED' : 'NO'}` : 'n/a'}</div></div><div class="c"><div class="k">Last output</div><div class="v">${lastOutputProbe ? `${Number(lastOutputProbe.ms || 0).toFixed(1)} ms · commit ${lastOutputProbe.stateCommit?.commitSafe ? 'SAFE' : 'QUARANTINED'} · warnings ${warnings.length}` : 'n/a'}</div>${warnings.length ? `<div style="margin-top:8px;color:#ffb3c0">${warnings.map(esc).join('<br>')}</div>` : ''}</div></div>`;
    document.getElementById('close').onclick = () => Risuai.hideContainer();
    await Risuai.showContainer('fullscreen');
  }

  try {
    const b = await Risuai.registerButton({ name: 'BaseCore', icon: '⏱️', iconType: 'html', location: 'chat' }, openPanel); if (b?.id) uiParts.push(b);
    const s = await Risuai.registerSetting('BaseCore', openPanel, '⏱️', 'html'); if (s?.id) uiParts.push(s);
  } catch (e) { console.log(BASECORE_LOG_PREFIX + ' UI registration failed:', e?.message || e); }

  await Risuai.onUnload(async () => {
    runtimeDisposed = true;
    runtimeEpoch += 1;
    await hooks.remove(Risuai, beforeRequestHandler, outputHandler);
    for (const part of uiParts.splice(0)) if (part?.id) { try { await Risuai.unregisterUIPart(part.id); } catch (_) {} }
    session = null; sessionKey = null; locationKey = null;
  });

  console.log(BASECORE_LOG_PREFIX + ' initialized');
})();
