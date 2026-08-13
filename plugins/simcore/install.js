//@name simcore
//@api 3.0
//@version 0.62.27
//@display-name SimCore v0.62.27 Reference Attention Anchor
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/simcore/latest.js
//@link https://github.com/hanmiyoo10-alt/-/tree/main/plugins/simcore SimCore Update Channel
//
// Optimization/architecture refactor built on the v0.62 golden behavior baseline.
// Design goal: preserve every proven Core/Community contract while shortening the normal request/output path.
//
// Internal modules (single installable plugin):
// - Kernel: current state schema + shared primitives
// - Store: snapshot persistence/retention only
// - Lifecycle: mode/broadcast/episode contract
// - Time: current world-year + Korean-age synchronization only
// - Community: COMMUNITY parsing/platform-family/group rules
// - Reaction: reaction parser, per-family historical maxima, normalization
// - Structure: validation/integrity/state-commit safety (judge; does not repair)
// - Recovery: cold-path envelope/output/edit/bootstrap/legacy repair
// - Session: thin orchestrator for one-pass request/output pipelines
// - OPS: performance helpers/diagnostic formatting
//
// v0.62.27 Reference Attention Anchor:
// - Adds a tiny always-on reference pointer for every active A/B/C turn
// - Character card and currently exposed lore, when present in the host request context, are marked as authoritative reference sources for character/world facts
// - Does not fetch, copy, inject, summarize, select, or semantically rank lore content; it only points the main model back to context the host already exposed
// - Exactly two fixed runtime-prompt lines are added on active turns; no auxiliary model, history rescan, state field, or new pluginStorage API call site
// - Existing Broadcast/Community/Reaction/Narrative/Recurrence/Lineage/Handoff/Parent-Shift behavior is unchanged
//
// v0.62.26 Community Parent-Shift Probe:
// - Diagnostics/state only: observes repeated short Community requests that stay on the same A/B/C lineage root while their direct parent/depth changes
// - Extends the bounded short-request registry with parent mode/index/depth only; no source/content body is stored
// - Existing v1 registry rows establish a v2 parent baseline on first observation instead of guessing a shift
// - NEW SOURCE behavior from v0.62.25 is unchanged; parent-shift observations inject no generation guidance
// - No history bootstrap/rescan, no auxiliary model, no new pluginStorage API call sites, and zero new runtime-prompt tokens
//
// v0.62.25 Community New-Source Guard ABC:
// - Closes the short Community follow-up gap left intentionally outside the detailed Template Recurrence Guard
// - Remembers a bounded short-request fingerprint together with its latest A/B/C lineage root; no content body is stored
// - When the same short Community request recurs under a different source root, injects only two compact lines telling the model to derive from the current source instead of the prior answer
// - Same request + same source gets no hint; first occurrence gets no hint; long/detailed recurrence remains owned by v0.62.22
// - Source roots are ABC-wide: A scenes, B episodes, and inline-C sources all participate without cross-contract template contamination
// - No history bootstrap/rescan, no auxiliary model, no new pluginStorage API call sites, and normal requests add zero prompt tokens
//
// v0.62.24 Narrative Current-Time Floor:
// - Non-broadcast current narrative timestamps are monotonic even when a short A/C follow-up causes the model to emit an older source-event time
// - If the first/current response timestamp is earlier than the prior narrative anchor, only that timestamp is clamped to the prior anchor; embedded/source-event times remain untouched
// - State commit and manual-edit sync also refuse backward narrative-anchor movement as defense in depth
// - One-time v1 -> v2 migration checks only the immediately preceding turn snapshot to recover an anchor already regressed by v0.62.23; no history rescan
// - Mode B Broadcast Airtime Guard is unchanged; Request Lineage/Community/Reaction/Recurrence semantics are unchanged
// - No auxiliary model, no new runtime-prompt tokens, and no new pluginStorage API call sites
//
// v0.62.23 Request Lineage Probe:
// - Diagnostics/state only: observes A/B/C request lineage without changing generation guidance
// - Tracks root source, direct parent, C-chain depth, inline current-input source, and a tiny recent A/B source window
// - Mode B episode segments share one B root until a new B_START; Mode C can chain from A, B, C, or inline source
// - No history rescan/bootstrap, no auxiliary model, no new pluginStorage API calls, and zero new runtime-prompt tokens
// - Snapshot-aware and rewind-safe; existing Broadcast/Community/Reaction/Narrative/Recurrence semantics are unchanged
//
// v0.62.22 Template Recurrence Guard ABC:
// - Extends recurrence detection and guidance to Mode A, Mode B, and Mode C as one shared feature set
// - Fingerprints are mode-family scoped (A/B/C) so different output contracts never contaminate each other
// - Mode C keeps directive/checklist extraction; Mode B strips broadcast control tags; Mode A/B use conservative detailed-input matching
// - v1 recurrence memory is rebuilt once from pre-update user history into the ABC registry; current input remains excluded
// - Existing outputs are never rewritten; only new generations can receive the recurrence hint
// - No auxiliary model, no new pluginStorage API calls, and no Broadcast/Community/Reaction/Narrative semantics changes
//
// v0.62.21 Template Recurrence Guard:
// - Detects recurring detailed [커뮤니티] request templates without auxiliary-model calls
// - One-time migration bootstrap scans pre-update user history only; current input is excluded
// - Repeated templates keep the requested fields/format but prompt the model to reevaluate current-event delta, emphasis, reactions, and wording
// - Existing outputs are never rewritten; recurrence guidance affects only new generations
// - Registry is compact, bounded, snapshot-aware, and rewind-safe; no new storage API calls
//
// v0.62.20 Narrative Clock Diagnostics:
// - Runtime diagnostics only; Narrative Clock Guard behavior from v0.62.19 is unchanged
// - Records guard ON/OFF, trigger, previous anchor, output timestamp, and commit direction
// - Records non-broadcast mode transitions so C -> A / A -> C clock continuity can be observed
// - Backward movement with the guard OFF is reported as BACKWARD OBSERVED but is not blocked
// - No new prompt tokens, persistent state fields, storage I/O, or Broadcast/Community/Reaction changes
//
// v0.62.19 Narrative Clock Guard Phase 1:
// - Adds a conservative current-narrative timestamp anchor for non-broadcast modes
// - Activates only when the user opens with a clear forward calendar/relative-time transition
// - When active, the next current timestamp may not precede the previous non-broadcast timestamp
// - Embedded preview/flashback/event time must not replace the current narrative timestamp
// - No calendar guessing for ambiguous week/day phrases; no Broadcast/Community/Reaction behavior changes
//
// v0.62 optimization rules:
// - Stable behavior is the golden baseline; no semantic contract changes
// - Dead helpers removed
// - Recovery/legacy work consolidated behind cold paths
// - Output preparation/validation/commit runs once (no duplicate canonicalize/tail pass)
// - Output state is loaded once and fingerprint is saved with the same out snapshot write
// - Unchanged manual-edit checks return from the in-memory fingerprint fast path with no snapshot I/O
// - No auxiliary-model calls
//
// Compatibility retained:
// - Same plugin name/storage namespace (`simcore`)
// - Same `sim:core:<character>:<chat>` snapshot prefix
// - Same `$simcore_core_*` chat.scriptstate mirrors
// - Same <SIMCORE_CORE_SWITCH>1</SIMCORE_CORE_SWITCH> handshake
// - Existing v0.60+ snapshots/mirrors still migrate in place; no state reset
// - START+END => B_END; locked CONTINUE+END => B_CONTINUE
// - Reaction abbreviations: 천/만/억 and K/M/B
// - Per-platform-family reaction history remains shared across B/C
// - <Knowledge> remains the final output block after all COMMUNITY blocks

const SimCore = (() => {
  const mods = {};
  const cache = {};
  const define = (name, fn) => { mods[name] = fn; };
  const requireFn = (name) => {
    const key = name.replace(/^\.\//, '').replace(/\.js$/, '');
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

SimCore.define("store", function (require, module, exports) {
function storeNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
class SnapshotStore {
  constructor(backend, prefix, keepN = 80) {
    this.b = backend;
    this.p = prefix;
    this.keepN = keepN;
    this.lastKeyScan = null;
  }
  _recordKeyScan(op, startedAt, keys, currentChatKeys = null, matchingKeys = null) {
    const total = Array.isArray(keys) ? keys.length : 0;
    const current = currentChatKeys == null ? null : Math.max(0, Number(currentChatKeys) || 0);
    const matched = matchingKeys == null ? null : Math.max(0, Number(matchingKeys) || 0);
    this.lastKeyScan = {
      op: String(op || 'unknown'),
      ms: Math.max(0, storeNow() - startedAt),
      totalKeys: total,
      currentChatKeys: current,
      matchingKeys: matched,
      at: Date.now(),
    };
    return this.lastKeyScan;
  }
  keyScanStats() {
    return this.lastKeyScan ? { ...this.lastKeyScan } : null;
  }
  _k(phase, index) { return `${this.p}:${phase}:${index}`; }
  async save(phase, index, state, opts = {}) {
    const metric = opts.metric && typeof opts.metric === 'object' ? opts.metric : null;
    let t = storeNow();
    const payload = JSON.stringify(state);
    if (metric) metric.serializeMs = Math.max(0, storeNow() - t);
    t = storeNow();
    await this.b.set(this._k(phase, index), payload);
    if (metric) metric.setMs = Math.max(0, storeNow() - t);
    if (opts.prune !== false) {
      t = storeNow();
      await this._prune();
      if (metric) metric.pruneMs = Math.max(0, storeNow() - t);
    }
  }
  async saveTurn(index, preState, sendState, opts = {}) {
    const metric = opts.metric && typeof opts.metric === 'object' ? opts.metric : null;
    let t = storeNow();
    const payload = JSON.stringify({ snapshotVersion: 1, pre: preState, send: sendState });
    if (metric) metric.serializeMs = Math.max(0, storeNow() - t);
    t = storeNow();
    await this.b.set(this._k('turn', index), payload);
    if (metric) metric.setMs = Math.max(0, storeNow() - t);
    if (opts.prune !== false) {
      t = storeNow();
      await this._prune();
      if (metric) metric.pruneMs = Math.max(0, storeNow() - t);
    }
  }
  async loadTurn(index) {
    const raw = await this.b.get(this._k('turn', index));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return { pre: parsed.pre || null, send: parsed.send || null };
    } catch { return null; }
  }
  async load(phase, index) {
    // New bundled snapshots first; old pre/send keys remain a transparent recovery fallback.
    if (phase === 'pre' || phase === 'send') {
      const turn = await this.loadTurn(index);
      if (turn && turn[phase]) return turn[phase];
    }
    const raw = await this.b.get(this._k(phase, index));
    return raw ? JSON.parse(raw) : null;
  }
  async latestAtOrBelow(phase, index) {
    const re = new RegExp(`^${escapeRe(this.p)}:${phase}:(\\d+)$`);
    let best = -1;
    const scanStarted = storeNow();
    const keys = await this.b.keys();
    let currentChatKeys = 0;
    let matching = 0;
    for (const k of keys) {
      if (String(k).startsWith(`${this.p}:`)) currentChatKeys += 1;
      const m = k.match(re);
      if (!m) continue;
      matching += 1;
      const i = parseInt(m[1], 10);
      if (i <= index && i > best) best = i;
    }
    this._recordKeyScan(`latest:${phase}`, scanStarted, keys, currentChatKeys, matching);
    return best >= 0 ? { index: best, state: await this.load(phase, best) } : null;
  }
  async clockAnchorsAtOrBelow(index) {
    const re = new RegExp(`^${escapeRe(this.p)}:(pre|send|out|turn):(\\d+)$`);
    const rows = [];
    const addState = (state, i) => {
      const year = Number(state?.worldYear ?? state?.narrativeYear);
      const offset = Number(state?.koreanAgeOffset);
      if (Number.isFinite(year) && Number.isFinite(offset)) rows.push({ index: i, year, offset });
    };
    const scanStarted = storeNow();
    const keys = await this.b.keys();
    let currentChatKeys = 0;
    let matching = 0;
    for (const k of keys) {
      if (String(k).startsWith(`${this.p}:`)) currentChatKeys += 1;
      const m = k.match(re);
      if (!m) continue;
      matching += 1;
      const i = parseInt(m[2], 10);
      if (i > index) continue;
      const raw = await this.b.get(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (m[1] === 'turn') {
          addState(parsed?.pre, i);
          addState(parsed?.send, i);
        } else {
          addState(parsed, i);
        }
      } catch { /* ignore broken legacy snapshot */ }
    }
    this._recordKeyScan('clock-anchors', scanStarted, keys, currentChatKeys, matching);
    return rows;
  }
  async prune() { return this._prune(); }
  async _prune() {
    const re = new RegExp(`^${escapeRe(this.p)}:(pre|send|out|turn):(\\d+)$`);
    const entries = [];
    const scanStarted = storeNow();
    const keys = await this.b.keys();
    for (const k of keys) {
      const m = k.match(re);
      if (m) entries.push({ k, index: parseInt(m[2], 10) });
    }
    this._recordKeyScan('prune', scanStarted, keys, entries.length, entries.length);
    if (entries.length <= this.keepN * 3) return;
    entries.sort((a, b) => b.index - a.index);
    const keep = new Set(entries.slice(0, this.keepN * 3).map((e) => e.k));
    for (const e of entries) if (!keep.has(e.k)) await this.b.remove(e.k);
  }
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'); }
module.exports = { SnapshotStore };
});

SimCore.define("community", function (require, module, exports) {
const COMMUNITY_RE = /<COMMUNITY(?:\s[^>]*)?>[\s\S]*?<\/COMMUNITY>/gi;
const COMMUNITY_CLASSIFIER_VERSION = 2;
const ALIAS_BACKFILL_ASSISTANT_LIMIT = 12;
const ALIAS_BACKFILL_MESSAGE_LIMIT = 48;

const PLATFORM_FAMILIES = [
  { key: 'YouTube(EN)', group: '해외', re: /^(?:YouTube|유튜브)\s*\(\s*EN\s*\)/i },
  { key: 'TikTok(EN)', group: '해외', re: /^(?:TikTok|틱톡)\s*\(\s*EN\s*\)/i },
  { key: 'X(EN)', group: '해외', re: /^(?:X|트위터)\s*\(\s*EN\s*\)/i },
  { key: 'Reddit', group: '해외', re: /^Reddit/i },
  { key: '네이버 카페', group: '학부모/지역', re: /^네이버\s*카페/i },
  { key: '맘카페', group: '학부모/지역', re: /^맘\s*카페|^맘카페/i },
  { key: '에브리타임', group: '대학생', re: /^(?:에브리타임|에타)(?=$|[\s\-–—/:|·])/i },
  { key: '블라인드', group: '직장인', re: /^블라인드/i },
  { key: '유튜브', group: '영상', re: /^(?:유튜브|YouTube)(?=$|[\s\-–—/:|·])/i },
  { key: '인스타', group: 'SNS', re: /^(?:인스타(?:그램)?|Instagram)(?=$|[\s\-–—/:|·])/i },
  { key: '틱톡', group: 'SNS', re: /^(?:틱톡|TikTok)(?=$|[\s\-–—/:|·])/i },
  { key: 'X', group: 'SNS', re: /^(?:X|트위터)(?=$|[\s\-–—/:|·])/i },
  { key: '더쿠', group: '여초', re: /^더쿠/i },
  { key: '네이트판', group: '여초', re: /^네이트\s*판|^네이트판/i },
  { key: '펨코', group: '남초', re: /^(?:펨코|에펨코리아)/i },
  { key: 'DC', group: '남초', re: /^(?:DC|디시인사이드|디시)/i },
];

function parentLocalAliasInfo(shown) {
  // Exact family rules above stay authoritative. This fallback runs only after all exact matches fail.
  // Keep it deliberately narrow: require both a parent/local identity and a community-shaped signal.
  const text = String(shown || '').trim();
  if (!text) return null;
  const namePart = text.split(/[\/|｜]/, 1)[0].trim();
  const compactName = namePart.replace(/\s+/g, '');

  const regionalMom = /^[가-힣A-Za-z0-9]{1,16}맘(?:$|[\s_\-–—])/i.test(namePart);
  const regionalParentWord = /^[가-힣A-Za-z0-9]{1,16}(?:엄마들?|어머님들?|학부모들?)$/i.test(compactName);
  const explicitParentWord = /(?:^|[\s_\-–—])(?:맘|엄마들?|어머님들?|학부모들?|육아맘)(?:$|[\s_\-–—])/i.test(namePart);
  const attachedMomCommunity = /(?:^|[가-힣A-Za-z0-9])맘(?:모여라|모임|소통|수다|커뮤니티|게시판|정보방|사랑방|놀이터|라운지|톡|방)(?:$|[^가-힣])/i.test(namePart);
  const communitySignal = /(?:모여라|모임|카페|소통|수다|커뮤니티|게시판|자유게시판|정보방|사랑방|놀이터|라운지|톡|방)/i.test(text);

  if ((regionalMom || regionalParentWord || explicitParentWord || attachedMomCommunity) && communitySignal) {
    return { shown, key: '맘카페', group: '학부모/지역', source: 'alias-parent-local' };
  }
  return null;
}

function platformInfo(header) {
  const shown = String(header || '').trim();
  for (const fam of PLATFORM_FAMILIES) {
    fam.re.lastIndex = 0;
    if (fam.re.test(shown)) return { shown, key: fam.key, group: fam.group, source: 'exact' };
  }
  const alias = parentLocalAliasInfo(shown);
  if (alias) return alias;
  return { shown, key: shown.replace(/\s+/g, '').toLowerCase(), group: null, source: 'unknown' };
}

function normalizePlatformMaxMap(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [name, value] of Object.entries(raw)) {
    const n = Math.max(0, Math.round(Number(value) || 0));
    const info = platformInfo(name);
    const key = info.group ? info.key : String(name);
    out[key] = Math.max(Number(out[key] || 0), n);
  }
  return out;
}

function communityBlocks(content) {
  return String(content || '').match(COMMUNITY_RE) || [];
}

function splitCommunity(block) {
  const body = String(block || '')
    .replace(/^<COMMUNITY(?:\s[^>]*)?>/i, '')
    .replace(/<\/COMMUNITY>$/i, '');
  return body.split(/^\s*---\s*$/m).map((s) => s.trim()).filter(Boolean);
}

function sectionHeader(section) {
  const m = String(section || '').match(/^\s*\[([^\]\n]+)\]/);
  return m ? m[1].trim() : '';
}

function sectionCommunityParts(section) {
  const text = String(section || '');
  const titleMatch = text.match(/^\s*제목\s*[:：]\s*(\S.*)$/m);
  const markers = [...text.matchAll(/^\s*\[베댓\]\s*$/gm)];
  let body = '';
  let commentsStart = -1;
  if (titleMatch && markers.length === 1) {
    const marker = markers[0];
    const titleEnd = titleMatch.index + titleMatch[0].length;
    body = text.slice(titleEnd, marker.index).trim();
    body = body.replace(/^내용\s*[:：]\s*/i, '').trim();
    commentsStart = marker.index + marker[0].length;
  }
  return {
    text,
    titleMatch,
    markerCount: markers.length,
    body,
    commentsStart,
    comments: commentsStart >= 0 ? text.slice(commentsStart) : text,
  };
}


module.exports = {
  COMMUNITY_RE,
  COMMUNITY_CLASSIFIER_VERSION,
  ALIAS_BACKFILL_ASSISTANT_LIMIT,
  ALIAS_BACKFILL_MESSAGE_LIMIT,
  PLATFORM_FAMILIES,
  platformInfo,
  normalizePlatformMaxMap,
  communityBlocks,
  splitCommunity,
  sectionHeader,
  sectionCommunityParts,
};
});

SimCore.define("recurrence", function (require, module, exports) {
const TEMPLATE_RECURRENCE_VERSION = 2;
const TEMPLATE_REGISTRY_LIMIT = 384;
const COMMUNITY_MARKER = '[커뮤니티]';
const TEMPLATE_MAX_CHARS = 4096;
const TEMPLATE_MIN_CHARS_C = 32;
const TEMPLATE_MIN_CHARS_AB = 48;

function modeFamily(mode) {
  const m = String(mode || 'A');
  if (/^B_/.test(m)) return 'B';
  return m === 'C' ? 'C' : 'A';
}

function normalizeRegistry(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const value of src) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const h = n >>> 0;
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out.slice(-TEMPLATE_REGISTRY_LIMIT);
}

function stripBroadcastTags(text) {
  return String(text || '')
    .replace(/\[방송\s*(?:시작|중|종료)\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function templateSource(userText, mode) {
  const family = modeFamily(mode);
  const raw = String(userText || '');
  const communityIndex = raw.indexOf(COMMUNITY_MARKER);
  let source = '';

  // C is an explicit request mode. In B, an embedded community directive is also the strongest
  // reusable request schema; otherwise B uses the broadcast request after removing control tags.
  if (family === 'C' || (family === 'B' && communityIndex >= 0)) {
    if (communityIndex < 0) return '';
    source = raw.slice(communityIndex + COMMUNITY_MARKER.length);
  } else {
    source = stripBroadcastTags(raw);
  }
  return source.slice(0, TEMPLATE_MAX_CHARS);
}

function normalizeTemplate(userText, mode) {
  const family = modeFamily(mode);
  let source = templateSource(userText, mode);
  if (!source) return '';
  try { source = source.normalize('NFKC'); } catch { /* older JS runtime */ }

  // A long parenthetical checklist is the most stable reusable schema across changed events.
  // This keeps the requested fields while ignoring the event/title that naturally changes over time.
  const open = source.indexOf('(');
  const close = source.lastIndexOf(')');
  if (open >= 0 && close > open && (close - open) >= TEMPLATE_MIN_CHARS_C) source = source.slice(open);

  const normalized = source
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[“”‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // A/B lack C's explicit directive boundary, so require a little more substance unless a
  // detailed parenthetical request schema was extracted. This avoids flagging short scene beats.
  const minChars = family === 'C' ? TEMPLATE_MIN_CHARS_C : TEMPLATE_MIN_CHARS_AB;
  return normalized.length >= minChars ? normalized : '';
}

function hashTemplate(normalized, mode) {
  const text = String(normalized || '');
  if (!text) return null;
  const family = modeFamily(mode);
  let h = 2166136261 >>> 0;
  const seed = `${family}:${text.length}:`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function templateFingerprint(userText, mode) {
  const family = modeFamily(mode);
  const normalized = normalizeTemplate(userText, mode);
  const hash = hashTemplate(normalized, mode);
  return {
    eligible: hash != null,
    hash,
    normalizedChars: normalized.length,
    modeFamily: family,
  };
}

function touchRegistry(registry, hash) {
  const list = normalizeRegistry(registry);
  const h = Number(hash) >>> 0;
  const idx = list.indexOf(h);
  const repeated = idx >= 0;
  if (idx >= 0) list.splice(idx, 1);
  list.push(h);
  if (list.length > TEMPLATE_REGISTRY_LIMIT) list.splice(0, list.length - TEMPLATE_REGISTRY_LIMIT);
  return { list, repeated };
}

function observe(state, userText, mode) {
  const fp = templateFingerprint(userText, mode);
  state.templateRegistry = normalizeRegistry(state.templateRegistry);
  state.templateRecurrenceVersion = TEMPLATE_RECURRENCE_VERSION;
  if (!fp.eligible) {
    return { ...fp, repeated: false, registrySize: state.templateRegistry.length };
  }
  const touched = touchRegistry(state.templateRegistry, fp.hash);
  state.templateRegistry = touched.list;
  return { ...fp, repeated: touched.repeated, registrySize: state.templateRegistry.length };
}

function needsBootstrap(state) {
  return Math.max(0, Number(state?.templateRecurrenceVersion || 0)) < TEMPLATE_RECURRENCE_VERSION;
}

function classifyHistoricalMode(runtime, input) {
  const text = String(input || '');
  const hasContinue = /\[방송\s*중\]/.test(text);
  const hasEnd = /\[방송\s*종료\]/.test(text);
  const hasStart = /\[방송\s*시작\]/.test(text);
  const hasCommunity = text.includes(COMMUNITY_MARKER);
  let mode;

  if (runtime.broadcastLocked) {
    mode = hasContinue ? 'B_CONTINUE' : (hasEnd ? 'B_END' : 'B_CONTINUE');
  } else if (hasStart && hasEnd) {
    mode = 'B_END';
  } else if (hasStart) {
    mode = 'B_START';
  } else if (hasCommunity) {
    mode = 'C';
  } else {
    mode = 'A';
  }

  if (mode === 'B_START') runtime.broadcastLocked = true;
  else if (mode === 'B_END') runtime.broadcastLocked = false;
  return mode;
}

function bootstrapState(state, messages, stopExclusive, getText) {
  const rows = Array.isArray(messages) ? messages : [];
  const stop = Number.isInteger(Number(stopExclusive))
    ? Math.max(0, Math.min(Number(stopExclusive), rows.length))
    : rows.length;

  // v1 hashes were C-only and unsalted. Rebuild from history once so the registry becomes
  // mode-family scoped and cannot cross-contaminate A/B/C.
  let registry = Number(state?.templateRecurrenceVersion || 0) >= TEMPLATE_RECURRENCE_VERSION
    ? normalizeRegistry(state.templateRegistry)
    : [];
  const runtime = { broadcastLocked: false };
  let visited = 0;
  let userMessages = 0;
  let eligibleTemplates = 0;
  let repeatedTemplates = 0;
  let normalizedChars = 0;
  const modeInputs = { A: 0, B: 0, C: 0 };
  const modeEligible = { A: 0, B: 0, C: 0 };

  for (let i = 0; i < stop; i++) {
    visited += 1;
    const row = rows[i] || {};
    if (row.role !== 'user') continue;
    userMessages += 1;
    const text = typeof getText === 'function'
      ? getText(row)
      : String(row.data ?? row.content ?? row.text ?? '');
    const mode = classifyHistoricalMode(runtime, text);
    const family = modeFamily(mode);
    modeInputs[family] += 1;
    const fp = templateFingerprint(text, mode);
    normalizedChars += fp.normalizedChars || 0;
    if (!fp.eligible) continue;
    eligibleTemplates += 1;
    modeEligible[family] += 1;
    const touched = touchRegistry(registry, fp.hash);
    registry = touched.list;
    if (touched.repeated) repeatedTemplates += 1;
  }

  state.templateRegistry = registry;
  state.templateRecurrenceVersion = TEMPLATE_RECURRENCE_VERSION;
  const stats = {
    version: TEMPLATE_RECURRENCE_VERSION,
    scannedThroughExclusive: stop,
    visited,
    userMessages,
    eligibleTemplates,
    repeatedTemplates,
    registrySize: registry.length,
    normalizedChars,
    modeInputs,
    modeEligible,
  };
  return { state, stats };
}

module.exports = {
  TEMPLATE_RECURRENCE_VERSION,
  TEMPLATE_REGISTRY_LIMIT,
  modeFamily,
  normalizeRegistry,
  normalizeTemplate,
  templateFingerprint,
  observe,
  needsBootstrap,
  bootstrapState,
};
});

SimCore.define("lineage", function (require, module, exports) {
const LINEAGE_VERSION = 1;
const COMMUNITY_MARKER = '[커뮤니티]';
const RECENT_SOURCE_LIMIT = 4;

function intIndex(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function modeFamily(mode) {
  const m = String(mode || 'A');
  if (/^B_/.test(m)) return 'B';
  if (m === 'C') return 'C';
  return 'A';
}

function normalizeRecent(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of src) {
    const mode = row?.mode === 'B' ? 'B' : 'A';
    const index = intIndex(row?.index);
    if (index < 0) continue;
    if (out.length && out[out.length - 1].mode === mode && out[out.length - 1].index === index) continue;
    out.push({ mode, index });
  }
  return out.slice(-RECENT_SOURCE_LIMIT);
}

function normalizeLineage(raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  const rootMode = ['A', 'B', 'INLINE_C'].includes(x.rootMode) ? x.rootMode : null;
  const rootIndex = intIndex(x.rootIndex);
  const parentMode = ['A', 'B', 'C'].includes(x.parentMode) ? x.parentMode : null;
  const parentIndex = intIndex(x.parentIndex);
  const lastRequestMode = ['A', 'B', 'C'].includes(x.lastRequestMode) ? x.lastRequestMode : null;
  const lastRequestIndex = intIndex(x.lastRequestIndex);
  return {
    version: LINEAGE_VERSION,
    rootMode: rootMode && rootIndex >= 0 ? rootMode : null,
    rootIndex: rootMode && rootIndex >= 0 ? rootIndex : -1,
    parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
    parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
    depth: Math.max(0, Math.round(Number(x.depth) || 0)),
    inlineSource: !!x.inlineSource,
    sourceKind: ['ROOT', 'CHAIN', 'INLINE', 'UNSEEDED'].includes(x.sourceKind) ? x.sourceKind : 'UNSEEDED',
    lastRequestMode: lastRequestMode && lastRequestIndex >= 0 ? lastRequestMode : null,
    lastRequestIndex: lastRequestMode && lastRequestIndex >= 0 ? lastRequestIndex : -1,
    transitionFrom: ['A', 'B', 'C'].includes(x.transitionFrom) ? x.transitionFrom : null,
    recentSources: normalizeRecent(x.recentSources),
  };
}

function inlineSourceInfo(userText) {
  const text = String(userText || '');
  const marker = text.indexOf(COMMUNITY_MARKER);
  if (marker < 0) return { active: false, prefixChars: 0 };
  const prefix = text.slice(0, marker)
    .replace(/\[방송\s*(?:시작|중|종료)\]/g, '')
    .trim();
  const compact = prefix.replace(/\s+/g, '');
  return { active: compact.length >= 8, prefixChars: prefix.length };
}

function pushRecent(list, mode, index) {
  const out = normalizeRecent(list);
  const row = { mode, index };
  if (!out.length || out[out.length - 1].mode !== mode || out[out.length - 1].index !== index) out.push(row);
  return out.slice(-RECENT_SOURCE_LIMIT);
}

function observe(state, userText, mode, sendIndex) {
  const prev = normalizeLineage(state?.requestLineage);
  const family = modeFamily(mode);
  const index = intIndex(sendIndex);
  const next = { ...prev, transitionFrom: prev.lastRequestMode };
  const inline = family === 'C' ? inlineSourceInfo(userText) : { active: false, prefixChars: 0 };

  if (family === 'A') {
    next.rootMode = 'A';
    next.rootIndex = index;
    next.parentMode = 'A';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = false;
    next.sourceKind = 'ROOT';
    next.recentSources = pushRecent(prev.recentSources, 'A', index);
  } else if (family === 'B') {
    const sameEpisode = String(mode || '') !== 'B_START' && prev.rootMode === 'B' && prev.rootIndex >= 0;
    next.rootMode = sameEpisode ? prev.rootMode : 'B';
    next.rootIndex = sameEpisode ? prev.rootIndex : index;
    next.parentMode = 'B';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = false;
    next.sourceKind = 'ROOT';
    next.recentSources = sameEpisode ? prev.recentSources : pushRecent(prev.recentSources, 'B', index);
  } else if (inline.active) {
    next.rootMode = 'INLINE_C';
    next.rootIndex = index;
    next.parentMode = 'C';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = true;
    next.sourceKind = 'INLINE';
  } else {
    next.parentMode = prev.lastRequestMode;
    next.parentIndex = prev.lastRequestIndex;
    next.depth = prev.lastRequestMode === 'C' ? prev.depth + 1 : 1;
    next.inlineSource = false;
    next.sourceKind = prev.rootMode && prev.rootIndex >= 0 ? 'CHAIN' : 'UNSEEDED';
  }

  next.lastRequestMode = family;
  next.lastRequestIndex = index;
  next.version = LINEAGE_VERSION;
  state.requestLineageVersion = LINEAGE_VERSION;
  state.requestLineage = normalizeLineage(next);
  return {
    ...state.requestLineage,
    currentMode: family,
    inlinePrefixChars: inline.prefixChars || 0,
  };
}

module.exports = {
  LINEAGE_VERSION,
  RECENT_SOURCE_LIMIT,
  modeFamily,
  normalizeLineage,
  inlineSourceInfo,
  observe,
};
});

SimCore.define("handoff", function (require, module, exports) {
const COMMUNITY_SOURCE_HANDOFF_VERSION = 2;
const HANDOFF_REGISTRY_LIMIT = 128;
const COMMUNITY_MARKER = '[커뮤니티]';
const SHORT_REQUEST_MIN_CHARS = 4;
const SHORT_REQUEST_MAX_CHARS = 31;
const SHORT_REQUEST_SCAN_CHARS = 512;

function intIndex(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function sourceFamily(rootMode) {
  const m = String(rootMode || '');
  if (m === 'INLINE_C' || m === 'C') return 'C';
  if (m === 'B') return 'B';
  if (m === 'A') return 'A';
  return null;
}

function parentFamily(parentMode) {
  const m = String(parentMode || '');
  if (/^B_/.test(m) || m === 'B') return 'B';
  if (m === 'C') return 'C';
  if (m === 'A') return 'A';
  return null;
}

function normalizedDepth(v, fallback = -1) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

function normalizeRegistry(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of src) {
    const hash = Number(row?.hash);
    const rootMode = sourceFamily(row?.rootMode);
    const rootIndex = intIndex(row?.rootIndex);
    if (!Number.isFinite(hash) || !rootMode || rootIndex < 0) continue;
    const h = hash >>> 0;
    const parentMode = parentFamily(row?.parentMode);
    const parentIndex = intIndex(row?.parentIndex);
    const depth = normalizedDepth(row?.depth, -1);
    const prior = out.findIndex((x) => x.hash === h);
    if (prior >= 0) out.splice(prior, 1);
    out.push({
      hash: h,
      rootMode,
      rootIndex,
      parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
      parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
      depth,
    });
  }
  return out.slice(-HANDOFF_REGISTRY_LIMIT);
}

function normalizeShortRequest(userText, mode) {
  if (String(mode || '') !== 'C') return '';
  const raw = String(userText || '');
  const marker = raw.indexOf(COMMUNITY_MARKER);
  if (marker < 0) return '';
  let source = raw.slice(marker + COMMUNITY_MARKER.length, marker + COMMUNITY_MARKER.length + SHORT_REQUEST_SCAN_CHARS);
  try { source = source.normalize('NFKC'); } catch { /* older JS runtime */ }
  const normalized = source
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[“”‘’`]/g, "'")
    .replace(/^[\s:：\-–—]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized.length >= SHORT_REQUEST_MIN_CHARS && normalized.length <= SHORT_REQUEST_MAX_CHARS
    ? normalized
    : '';
}

function hashRequest(normalized) {
  const text = String(normalized || '');
  if (!text) return null;
  let h = 2166136261 >>> 0;
  const seed = `C-short:${text.length}:`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function observe(state, userText, mode, requestLineage, templateRecurrence) {
  state.communitySourceRegistry = normalizeRegistry(state.communitySourceRegistry);
  state.communitySourceHandoffVersion = COMMUNITY_SOURCE_HANDOFF_VERSION;
  const normalized = normalizeShortRequest(userText, mode);
  const rootMode = sourceFamily(requestLineage?.rootMode);
  const rootIndex = intIndex(requestLineage?.rootIndex);
  const parentMode = parentFamily(requestLineage?.parentMode);
  const parentIndex = intIndex(requestLineage?.parentIndex);
  const depth = normalizedDepth(requestLineage?.depth, 0);
  const base = {
    eligible: false,
    seen: false,
    newSource: false,
    parentComparable: false,
    parentShift: false,
    hash: null,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    parentMode,
    parentIndex,
    depth,
    priorRootMode: null,
    priorRootIndex: -1,
    priorParentMode: null,
    priorParentIndex: -1,
    priorDepth: -1,
    registrySize: state.communitySourceRegistry.length,
    reason: 'ineligible',
  };

  if (String(mode || '') !== 'C') return { ...base, reason: 'not-community' };
  if (templateRecurrence?.eligible) return { ...base, reason: 'template-recurrence-owned' };
  if (!normalized) return { ...base, reason: 'not-short-request' };
  if (!rootMode || rootIndex < 0 || requestLineage?.sourceKind === 'UNSEEDED') {
    return { ...base, reason: 'unseeded-source' };
  }

  const hash = hashRequest(normalized);
  const registry = state.communitySourceRegistry;
  const idx = registry.findIndex((x) => x.hash === hash);
  const prior = idx >= 0 ? registry[idx] : null;
  const seen = !!prior;
  const newSource = !!prior && (prior.rootMode !== rootMode || prior.rootIndex !== rootIndex);
  const sameRoot = !!prior && !newSource;
  const priorParentMode = parentFamily(prior?.parentMode);
  const priorParentIndex = intIndex(prior?.parentIndex);
  const priorDepth = normalizedDepth(prior?.depth, -1);
  const parentComparable = !!(
    sameRoot
    && priorParentMode && priorParentIndex >= 0 && priorDepth >= 0
    && parentMode && parentIndex >= 0
  );
  const parentShift = !!(
    parentComparable
    && (priorParentMode !== parentMode || priorParentIndex !== parentIndex || priorDepth !== depth)
  );

  if (idx >= 0) registry.splice(idx, 1);
  registry.push({
    hash,
    rootMode,
    rootIndex,
    parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
    parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
    depth,
  });
  if (registry.length > HANDOFF_REGISTRY_LIMIT) registry.splice(0, registry.length - HANDOFF_REGISTRY_LIMIT);
  state.communitySourceRegistry = registry;

  return {
    eligible: true,
    seen,
    newSource,
    parentComparable,
    parentShift,
    hash,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    parentMode,
    parentIndex,
    depth,
    priorRootMode: prior?.rootMode || null,
    priorRootIndex: prior ? intIndex(prior.rootIndex) : -1,
    priorParentMode,
    priorParentIndex,
    priorDepth,
    registrySize: registry.length,
    reason: newSource
      ? 'same-short-request-new-source'
      : (parentShift
        ? 'same-root-new-parent'
        : (seen
          ? (parentComparable ? 'same-source-same-parent' : 'same-root-parent-baseline')
          : 'first')),
  };
}

module.exports = {
  COMMUNITY_SOURCE_HANDOFF_VERSION,
  HANDOFF_REGISTRY_LIMIT,
  sourceFamily,
  parentFamily,
  normalizeRegistry,
  normalizeShortRequest,
  hashRequest,
  observe,
};
});

SimCore.define("kernel", function (require, module, exports) {
const { normalizePlatformMaxMap } = require('./community');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');

const STATE_VERSION = 5;
const CORE_STATE_VERSION = 10;
const HANDSHAKE_RE = /<SIMCORE_CORE_SWITCH>\s*1\s*<\/SIMCORE_CORE_SWITCH>/i;
const CONTROL_TAG_RE = /\[방송\s*(?:시작|중|종료)\]/g;
const KNOWLEDGE_RE = /<Knowledge>[\s\S]*?<\/Knowledge>/gi;

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function fingerprintText(content) {
  const text = String(content || '')
    .replace(/⟦simcore:\d+⟧/g, '')
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
    templateRecurrenceVersion: 0,
    templateRegistry: [],
    requestLineageVersion: 1,
    requestLineage: lineage.normalizeLineage(null),
    communitySourceHandoffVersion: 2,
    communitySourceRegistry: [],
    broadcastLocked: false,
    broadcastAirtime: null,
    broadcastAirtimeStart: null,
    episodeNo: 0,
    community: { activationCount: 0, platformMax: {}, lastNormalization: [], classifierVersion: 2 },
    worldYear: null,
    koreanAgeOffset: 0,
    narrativeTimestamp: null,
    narrativeClockVersion: 2,
    clockRepairVersion: 0,
    lastMode: 'A',
    pending: null,
  };
}

function reconcileState(raw) {
  const source = raw && typeof raw === 'object' ? raw : initialState();
  const s = source;
  const legacyYear = s.worldYear ?? s.narrativeYear;
  const hadTemplateRecurrenceVersion = Object.prototype.hasOwnProperty.call(s, 'templateRecurrenceVersion');

  s.stateVersion = STATE_VERSION;
  s.coreStateVersion = CORE_STATE_VERSION;
  s.historyBootstrapped = !!s.historyBootstrapped;
  s.historyBootstrappedAt = Number.isInteger(Number(s.historyBootstrappedAt)) ? Number(s.historyBootstrappedAt) : -1;
  s.historyBootstrapStats = s.historyBootstrapStats && typeof s.historyBootstrapStats === 'object' ? s.historyBootstrapStats : null;
  s.templateRecurrenceVersion = hadTemplateRecurrenceVersion ? Math.max(0, Math.round(Number(s.templateRecurrenceVersion) || 0)) : 0;
  s.templateRegistry = recurrence.normalizeRegistry(s.templateRegistry);
  s.requestLineageVersion = Math.max(1, Math.round(Number(s.requestLineageVersion) || 0));
  s.requestLineage = lineage.normalizeLineage(s.requestLineage);
  s.communitySourceHandoffVersion = Math.max(0, Math.round(Number(s.communitySourceHandoffVersion) || 0));
  s.communitySourceRegistry = handoff.normalizeRegistry(s.communitySourceRegistry);
  s.broadcastLocked = !!s.broadcastLocked;
  s.broadcastAirtime = typeof s.broadcastAirtime === 'string' && s.broadcastAirtime.trim() ? s.broadcastAirtime.trim() : null;
  s.broadcastAirtimeStart = typeof s.broadcastAirtimeStart === 'string' && s.broadcastAirtimeStart.trim() ? s.broadcastAirtimeStart.trim() : null;
  s.episodeNo = Math.max(0, Math.round(Number(s.episodeNo) || 0));
  s.community = s.community && typeof s.community === 'object' ? s.community : {};
  s.community.activationCount = Math.max(0, Math.round(Number(s.community.activationCount) || 0));
  s.community.platformMax = normalizePlatformMaxMap(s.community.platformMax);
  s.community.lastNormalization = Array.isArray(s.community.lastNormalization) ? s.community.lastNormalization.slice(-12) : [];
  s.community.classifierVersion = Math.max(0, Math.round(Number(s.community.classifierVersion) || 0));
  // v0.61.4 migration: the cross-platform global reaction floor was a short-lived bug.
  // Reaction authority is platformMax only; remove the stale global field from portable state/mirrors.
  delete s.community.globalReactionMax;
  s.worldYear = legacyYear != null && Number.isFinite(Number(legacyYear)) ? Number(legacyYear) : null;
  s.koreanAgeOffset = Math.max(0, Math.round(Number(s.koreanAgeOffset) || 0));
  s.narrativeTimestamp = typeof s.narrativeTimestamp === 'string' && s.narrativeTimestamp.trim() ? s.narrativeTimestamp.trim() : null;
  s.narrativeClockVersion = Math.max(1, Math.round(Number(s.narrativeClockVersion) || 0));
  s.clockRepairVersion = Math.max(0, Math.round(Number(s.clockRepairVersion) || 0));
  s.lastMode = typeof s.lastMode === 'string' ? s.lastMode : 'A';
  s.pending = s.pending && typeof s.pending === 'object' ? s.pending : null;

  // v0.60 -> v0.61 migration: worldYear replaces narrativeYear as the sole persisted year field.
  delete s.narrativeYear;
  // Older builds carried content memory. Keep mirrors/snapshots tiny.
  delete s.currentEpisodeSegments;
  delete s.lastCompletedEpisode;
  delete s.exposed;
  delete s.community.recent;
  delete s.community.commenters;
  return s;
}

function textOfMessage(m) {
  if (!m) return '';
  const v = m.data ?? m.content ?? m.text ?? '';
  return typeof v === 'string' ? v : String(v || '');
}

function latestUserIndex(chat) {
  const msgs = chat?.message || [];
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i]?.role === 'user') return i;
  return -1;
}

function latestUserText(chat) {
  const i = latestUserIndex(chat);
  return i >= 0 ? textOfMessage(chat.message[i]) : '';
}

// Incremental request-prompt probe. Unlike the old `.map(...).join('\n')` path this never
// materializes a second full copy of a long request. A small overlap preserves matches that
// happen to straddle adjacent message boundaries. Once the authoritative Core_Ruleset block
// closes, later chat history cannot change the handshake/config, so scanning stops early.
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
    const text = typeof raw === 'string' ? raw : String(raw || '');
    scannedMessages += 1;
    scannedChars += text.length;

    // Test the message in place. Only a tiny head+tail bridge is allocated for the rare case
    // where a token/line was split by the host across two adjacent messages.
    const boundary = carry ? `${carry}\n${text.slice(0, 512)}` : '';
    if (!active) {
      active = HANDSHAKE_RE.test(text) || (!!boundary && HANDSHAKE_RE.test(boundary));
    }
    if (active) {
      captureConfig(text);
      if (boundary) captureConfig(boundary);
      if (/<\/Core_Ruleset>/i.test(text) || (!!boundary && /<\/Core_Ruleset>/i.test(boundary))) break;
    }

    // 512 characters is far larger than every handshake/config token we parse, while staying tiny.
    carry = text.slice(-512);
  }

  return {
    __simcorePromptProbe: true,
    active,
    config,
    stats: { scannedMessages, scannedChars, totalMessages: rows.length },
  };
}
function stripControlTags(content) {
  CONTROL_TAG_RE.lastIndex = 0;
  return String(content || '').replace(CONTROL_TAG_RE, '').replace(/[ \t]+\n/g, '\n');
}

function regexCount(text, re) {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const rx = new RegExp(re.source, flags);
  return (String(text || '').match(rx) || []).length;
}

// Strict scanner: a Knowledge block may not nest and may not cross a new canonical response header.
// This prevents a stray <Knowledge> opener from consuming an entire later duplicated response.
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
      if (currentStart >= 0) {
        currentInvalid = true;
        malformed = true;
      } else {
        currentStart = m.index;
        currentInvalid = false;
      }
      continue;
    }
    closeCount += 1;
    if (currentStart < 0) {
      malformed = true;
      continue;
    }
    const end = tokenRe.lastIndex;
    const raw = text.slice(currentStart, end);
    const inner = raw.replace(/^<Knowledge>/i, '').replace(/<\/Knowledge>$/i, '');
    if (responseHeaderRe.test(inner)) {
      currentInvalid = true;
      malformed = true;
    }
    if (!currentInvalid) blocks.push({ start: currentStart, end, text: raw });
    currentStart = -1;
    currentInvalid = false;
  }
  if (currentStart >= 0) malformed = true;
  if (openCount !== closeCount) malformed = true;
  return { blocks, openCount, closeCount, malformed };
}

module.exports = {
  STATE_VERSION,
  CORE_STATE_VERSION,
  HANDSHAKE_RE,
  CONTROL_TAG_RE,
  KNOWLEDGE_RE,
  clone,
  fingerprintText,
  initialState,
  reconcileState,
  textOfMessage,
  latestUserIndex,
  latestUserText,
  inspectPromptMessages,
  stripControlTags,
  regexCount,
  scanKnowledgeBlocks,
};
});

SimCore.define("time", function (require, module, exports) {
const CLOCK_REPAIR_VERSION = 2;
const NARRATIVE_CLOCK_VERSION = 2;

function explicitWorldYear(userText) {
  const s = String(userText || '');
  const iso = s.match(/(?:⏱️\[)?((?:19|20|21)\d{2})-\d{1,2}-\d{1,2}/);
  if (iso) return Number(iso[1]);
  const ko = s.match(/((?:19|20|21)\d{2})년\s*\d{1,2}월/);
  return ko ? Number(ko[1]) : null;
}

const BROADCAST_TIMESTAMP_RE = /⏱️\[((?:19|20|21)\d{2})-(\d{2})-(\d{2})\s+\(([^)]+)\)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\]/i;

function parseTimestamp(content) {
  const m = String(content || '').match(BROADCAST_TIMESTAMP_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour12 = Number(m[5]);
  const minute = Number(m[6]);
  const ampm = String(m[7] || '').toUpperCase();
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return null;
  let hour24 = hour12 % 12;
  if (ampm === 'PM') hour24 += 12;
  const ms = Date.UTC(year, month - 1, day, hour24, minute, 0, 0);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day
      || d.getUTCHours() !== hour24 || d.getUTCMinutes() !== minute) return null;
  return {
    raw: m[0],
    year, month, day, dayLabel: m[4], hour12, minute, ampm,
    minuteKey: Math.floor(ms / 60000),
  };
}

function timestampYear(content) {
  const parsed = parseTimestamp(content);
  return parsed ? parsed.year : null;
}

function compareTimestamps(a, b) {
  const pa = parseTimestamp(a);
  const pb = parseTimestamp(b);
  if (!pa || !pb) return null;
  return pa.minuteKey === pb.minuteKey ? 0 : (pa.minuteKey > pb.minuteKey ? 1 : -1);
}

function elapsedMinutes(start, current) {
  const a = parseTimestamp(start);
  const b = parseTimestamp(current);
  if (!a || !b) return null;
  return b.minuteKey - a.minuteKey;
}

function resetBroadcastAirtime(state) {
  state.broadcastAirtime = null;
  state.broadcastAirtimeStart = null;
}

function commitBroadcastAirtime(state, pending, content) {
  if (!/^B_/.test(String(pending?.mode || ''))) return { changed: false, reason: 'not-broadcast', timestamp: null };
  const parsed = parseTimestamp(content);
  if (!parsed) return { changed: false, reason: 'missing-or-invalid', timestamp: null };
  const current = parsed.raw;
  const previous = pending?.broadcastAirtimePrevious || state.broadcastAirtime || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return { changed: false, reason: 'backward', timestamp: current, previous };
  }
  const changed = state.broadcastAirtime !== current;
  if (!state.broadcastAirtimeStart || pending?.broadcastAirtimeIsNew) state.broadcastAirtimeStart = current;
  state.broadcastAirtime = current;
  return { changed, reason: 'committed', timestamp: current, previous };
}

function applyWorldYear(state, year) {
  if (year == null || year === '') return false;
  const y = Number(year);
  if (!Number.isFinite(y)) return false;
  const prev = state.worldYear;
  if (prev == null) {
    state.worldYear = y;
    return true;
  }
  if (y > prev) {
    state.koreanAgeOffset += y - prev;
    state.worldYear = y;
    return true;
  }
  return false;
}

// Phase 1 is intentionally relational, not a full Korean calendar parser.
// Only a clear opening current-time transition activates the forward guard.
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
  if (relative.test(head)) return { active: true, reason: 'relative-forward' };
  return { active: false, reason: 'none' };
}

function enforceNarrativeCurrentTimeFloor(content, previous) {
  const text = String(content || '');
  const parsed = parseTimestamp(text);
  if (!parsed) return { content: text, changed: false, reason: 'missing-or-invalid', observed: null, floor: previous || null };
  if (!previous) return { content: text, changed: false, reason: 'no-floor', observed: parsed.raw, floor: null };
  const cmp = compareTimestamps(parsed.raw, previous);
  if (cmp == null || cmp >= 0) {
    return { content: text, changed: false, reason: cmp === 0 ? 'same' : 'forward', observed: parsed.raw, floor: previous };
  }
  // The first canonical timestamp is current narrative time. Clamp only that token;
  // later embedded/source-event timestamps are intentionally left untouched.
  return {
    content: text.replace(parsed.raw, previous),
    changed: true,
    reason: 'clamped-backward',
    observed: parsed.raw,
    floor: previous,
  };
}

function commitNarrativeTimestamp(state, pending, content) {
  if (/^B_/.test(String(pending?.mode || ''))) return { changed: false, reason: 'broadcast', timestamp: null };
  const parsed = parseTimestamp(content);
  if (!parsed) return { changed: false, reason: 'missing-or-invalid', timestamp: null };
  const current = parsed.raw;
  const previous = pending?.narrativeTimestampPrevious || state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return { changed: false, reason: 'backward', timestamp: current, previous };
  }
  const changed = state.narrativeTimestamp !== current;
  state.narrativeTimestamp = current;
  return { changed, reason: 'committed', timestamp: current, previous };
}

function syncNarrativeTimestamp(state, content, mode) {
  if (/^B_/.test(String(mode || ''))) return false;
  const parsed = parseTimestamp(content);
  if (!parsed) return false;
  const previous = state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(parsed.raw, previous);
    if (cmp != null && cmp < 0) return false;
  }
  const changed = state.narrativeTimestamp !== parsed.raw;
  state.narrativeTimestamp = parsed.raw;
  return changed;
}

module.exports = {
  CLOCK_REPAIR_VERSION,
  NARRATIVE_CLOCK_VERSION,
  BROADCAST_TIMESTAMP_RE,
  explicitWorldYear,
  parseTimestamp,
  timestampYear,
  compareTimestamps,
  elapsedMinutes,
  resetBroadcastAirtime,
  commitBroadcastAirtime,
  narrativeProgressionHint,
  enforceNarrativeCurrentTimeFloor,
  commitNarrativeTimestamp,
  syncNarrativeTimestamp,
  applyWorldYear,
};
});

SimCore.define("lifecycle", function (require, module, exports) {
const kernel = require('./kernel');
const time = require('./time');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');

function classifyMode(state, input) {
  const text = String(input || '');
  const hasContinue = /\[방송\s*중\]/.test(text);
  const hasEnd = /\[방송\s*종료\]/.test(text);
  const hasStart = /\[방송\s*시작\]/.test(text);
  const hasCommunity = text.includes('[커뮤니티]');
  const wasLocked = !!state.broadcastLocked;
  let mode;

  if (state.broadcastLocked) {
    mode = hasContinue ? 'B_CONTINUE' : (hasEnd ? 'B_END' : 'B_CONTINUE');
  } else if (hasStart && hasEnd) {
    mode = 'B_END';
    state.broadcastLocked = true;
    state.episodeNo += 1;
  } else if (hasStart) {
    mode = 'B_START';
    state.broadcastLocked = true;
    state.episodeNo += 1;
  } else if (hasCommunity) {
    mode = 'C';
  } else {
    mode = 'A';
  }
  return { mode, wasLocked, hasContinue, hasEnd, hasStart, hasCommunity };
}

function prepareTurn(baseState, userText, promptProbe, sendIndex) {
  const state = kernel.reconcileState(kernel.clone(baseState));
  const probe = promptProbe && typeof promptProbe === 'object' && promptProbe.__simcorePromptProbe
    ? promptProbe
    : { active: false, config: {} };
  const active = !!probe.active;
  const config = probe.config || { protagonist: '', secondaryName: '', secondaryKeyword: '' };

  if (!active) {
    state.pending = { active: false, sendIndex };
    return state;
  }

  const input = String(userText || '');
  const c = classifyMode(state, input);
  const broadcastAirtimeIsNew = !!(c.hasStart && !c.wasLocked);
  if (broadcastAirtimeIsNew) time.resetBroadcastAirtime(state);
  const broadcastAirtimePrevious = /^B_/.test(c.mode) ? (state.broadcastAirtime || null) : null;
  const broadcastAirtimeStart = /^B_/.test(c.mode) ? (state.broadcastAirtimeStart || null) : null;
  const secondaryConfigured = !!(config.secondaryName && config.secondaryKeyword);
  const secondaryActive = secondaryConfigured && input.includes(config.secondaryKeyword);
  const narrativeProgression = /^B_/.test(c.mode) ? { active: false, reason: 'broadcast' } : time.narrativeProgressionHint(input);
  const narrativeTimestampPrevious = /^B_/.test(c.mode) ? null : (state.narrativeTimestamp || null);
  const narrativeClockGuard = !!(narrativeProgression.active && narrativeTimestampPrevious);
  const templateRecurrence = recurrence.observe(state, input, c.mode);
  const requestLineage = lineage.observe(state, input, c.mode, sendIndex);
  const communitySourceHandoff = handoff.observe(state, input, c.mode, requestLineage, templateRecurrence);

  // Explicit user dates can advance world year before generation in every mode.
  time.applyWorldYear(state, time.explicitWorldYear(input));

  state.lastMode = c.mode;
  state.pending = {
    active: true,
    sendIndex,
    mode: c.mode,
    userText: input.slice(0, 16000),
    wasLocked: c.wasLocked,
    hasContinue: c.hasContinue,
    hasEnd: c.hasEnd,
    hasStart: c.hasStart,
    broadcastAirtimeIsNew,
    broadcastAirtimePrevious,
    broadcastAirtimeStart,
    secondaryConfigured,
    secondaryActive,
    secondaryName: config.secondaryName,
    secondaryKeyword: config.secondaryKeyword,
    narrativeProgressionActive: !!narrativeProgression.active,
    narrativeProgressionReason: narrativeProgression.reason || 'none',
    narrativeTimestampPrevious,
    narrativeClockGuard,
    templateRecurrenceEligible: !!templateRecurrence.eligible,
    templateRecurrenceRepeated: !!templateRecurrence.repeated,
    templateRecurrenceHash: templateRecurrence.hash == null ? null : Number(templateRecurrence.hash),
    templateRecurrenceModeFamily: templateRecurrence.modeFamily || recurrence.modeFamily(c.mode),
    templateRecurrenceChars: Number(templateRecurrence.normalizedChars || 0),
    templateRegistrySize: Number(templateRecurrence.registrySize || 0),
    requestLineageSourceKind: requestLineage.sourceKind || 'UNSEEDED',
    requestLineageRootMode: requestLineage.rootMode || null,
    requestLineageRootIndex: Number(requestLineage.rootIndex ?? -1),
    requestLineageParentMode: requestLineage.parentMode || null,
    requestLineageParentIndex: Number(requestLineage.parentIndex ?? -1),
    requestLineageDepth: Number(requestLineage.depth || 0),
    requestLineageInlineSource: !!requestLineage.inlineSource,
    communitySourceHandoffEligible: !!communitySourceHandoff.eligible,
    communitySourceHandoffSeen: !!communitySourceHandoff.seen,
    communitySourceHandoffNewSource: !!communitySourceHandoff.newSource,
    communitySourceHandoffParentComparable: !!communitySourceHandoff.parentComparable,
    communitySourceHandoffParentShift: !!communitySourceHandoff.parentShift,
    communitySourceHandoffHash: communitySourceHandoff.hash == null ? null : Number(communitySourceHandoff.hash),
    communitySourceHandoffChars: Number(communitySourceHandoff.normalizedChars || 0),
    communitySourceHandoffRootMode: communitySourceHandoff.rootMode || null,
    communitySourceHandoffRootIndex: Number(communitySourceHandoff.rootIndex ?? -1),
    communitySourceHandoffParentMode: communitySourceHandoff.parentMode || null,
    communitySourceHandoffParentIndex: Number(communitySourceHandoff.parentIndex ?? -1),
    communitySourceHandoffDepth: Number(communitySourceHandoff.depth ?? -1),
    communitySourceHandoffPriorRootMode: communitySourceHandoff.priorRootMode || null,
    communitySourceHandoffPriorRootIndex: Number(communitySourceHandoff.priorRootIndex ?? -1),
    communitySourceHandoffPriorParentMode: communitySourceHandoff.priorParentMode || null,
    communitySourceHandoffPriorParentIndex: Number(communitySourceHandoff.priorParentIndex ?? -1),
    communitySourceHandoffPriorDepth: Number(communitySourceHandoff.priorDepth ?? -1),
    communitySourceHandoffRegistrySize: Number(communitySourceHandoff.registrySize || 0),
    communitySourceHandoffReason: communitySourceHandoff.reason || 'ineligible',
  };
  return state;
}

function expectedCommunityBlocks(mode) {
  return mode === 'B_END' ? 2
    : (mode === 'B_START' || mode === 'B_CONTINUE' || mode === 'C') ? 1 : 0;
}

module.exports = { classifyMode, prepareTurn, expectedCommunityBlocks };
});

SimCore.define("reaction", function (require, module, exports) {
const community = require('./community');

const REACTION_RE = /\[(공감|RT|좋아요|추천|Upvote|포텐)\s+([\d,]+(?:\.\d+)?\s*(?:천|만|억|K|M|B)?)\]/gi;
const REACTION_AT_END_RE = /\[(공감|RT|좋아요|추천|Upvote|포텐)\s+([\d,]+(?:\.\d+)?\s*(?:천|만|억|K|M|B)?)\]\s*$/i;

function parseReactionNumber(raw) {
  const compact = String(raw || '').trim().replace(/,/g, '').replace(/\s+/g, '');
  const m = compact.match(/^(\d+(?:\.\d+)?)(천|만|억|K|M|B)?$/i);
  if (!m) return NaN;
  const base = Number(m[1]);
  if (!Number.isFinite(base)) return NaN;
  const suffix = (m[2] || '').toUpperCase();
  const multiplier = suffix === '천' ? 1e3
    : suffix === '만' ? 1e4
    : suffix === '억' ? 1e8
    : suffix === 'K' ? 1e3
    : suffix === 'M' ? 1e6
    : suffix === 'B' ? 1e9
    : 1;
  const n = Math.round(base * multiplier);
  return Number.isFinite(n) ? Math.max(0, n) : NaN;
}


function strictlyAboveFloor(n, floor) {
  return Math.max(floor + 1, Math.round(Number(n) || 0));
}

// v0.61 normalizer contract:
// - Every newly displayed reaction count in a platform section must be > that platform family's historical max.
// - If generatedMin > historicalMax, pass through untouched.
// - If only the lower tail is stale while generatedMax is already useful, affine-remap [min,max] -> [floor+1,max].
// - If the whole generated section is stale, rescale upward. Never use the legacy constant additive shift.
function normalizeSectionValues(values, floor) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min > floor) return { mode: 'pass', values: values.slice() };

  if (max > floor + 1 && max > min) {
    const targetMin = floor + 1;
    const srcSpan = max - min;
    const dstSpan = max - targetMin;
    const mapped = values.map((v) => strictlyAboveFloor(targetMin + ((v - min) / srcSpan) * dstSpan, floor));
    return { mode: 'affine_remap', values: mapped };
  }

  if (min > 0) {
    const factor = (floor + 1) / min;
    const mapped = values.map((v) => strictlyAboveFloor(v * factor, floor));
    return { mode: 'stale_scale_fallback', values: mapped };
  }

  const span = max - min;
  if (span > 0) {
    const targetSpan = Math.max(span, floor + 1);
    const mapped = values.map((v) => strictlyAboveFloor((floor + 1) + ((v - min) / span) * targetSpan, floor));
    return { mode: 'stale_scale_fallback', values: mapped };
  }

  return { mode: 'stale_scale_flat', values: values.map(() => floor + 1) };
}

function normalizeReactionNumbers(content, state) {
  const prior = community.normalizePlatformMaxMap(state.community.platformMax);
  const observed = { ...prior };
  // v0.61.4 contract: each platform family owns its own historical floor.
  // The same platformMax map is shared across every mode, so B <-> C never resets a family's history.
  // Different platform families never inherit one another's max, even when they belong to the same group.
  const normalizationEvents = [];
  const text = String(content || '').replace(community.COMMUNITY_RE, (block) => {
    const sections = community.splitCommunity(block);
    const normalized = sections.map((section) => {
      const info = community.platformInfo(community.sectionHeader(section));
      if (!info.group) return section;
      const floor = Math.max(0, Math.round(Number(prior[info.key]) || 0));
      const parts = community.sectionCommunityParts(section);
      const scopeStart = parts.commentsStart >= 0 ? parts.commentsStart : 0;
      const prefix = section.slice(0, scopeStart);
      const reactionScope = section.slice(scopeStart);
      const matches = [...reactionScope.matchAll(new RegExp(REACTION_RE.source, 'gi'))];
      if (!matches.length) return section;
      const parsed = matches.map((m) => parseReactionNumber(m[2]));
      if (parsed.some((n) => !Number.isFinite(n))) return section;

      const r = normalizeSectionValues(parsed, floor);
      let idx = 0;
      let localMax = floor;
      const nextScope = reactionScope.replace(new RegExp(REACTION_RE.source, 'gi'), (_, label, raw) => {
        const n = r.values[idx++];
        localMax = Math.max(localMax, n);
        if (r.mode === 'pass') return `[${label} ${String(raw).trim()}]`;
        return `[${label} ${n.toLocaleString('en-US')}]`;
      });

      if (r.mode !== 'pass') {
        normalizationEvents.push({
          platform: info.key,
          historicalFamilyMax: floor,
          generatedMin: Math.min(...parsed),
          generatedMax: Math.max(...parsed),
          normalizedMin: Math.min(...r.values),
          normalizedMax: Math.max(...r.values),
          mode: r.mode,
        });
      }
      observed[info.key] = Math.max(Number(observed[info.key] || 0), localMax);
      return prefix + nextScope;
    });
    return `<COMMUNITY>${normalized.join('\n\n---\n\n')}\n</COMMUNITY>`;
  });
  state.community.platformMax = observed;
  state.community.lastNormalization = normalizationEvents.slice(-12);
  return text;
}

function recordReactionMaxima(content, state) {
  const maxima = community.normalizePlatformMaxMap(state.community.platformMax);
  for (const block of community.communityBlocks(content)) {
    for (const section of community.splitCommunity(block)) {
      const info = community.platformInfo(community.sectionHeader(section));
      if (!info.group) continue;
      let max = Math.max(0, Math.round(Number(maxima[info.key]) || 0));
      const parts = community.sectionCommunityParts(section);
      const reactionScope = parts.commentsStart >= 0 ? parts.comments : section;
      let m;
      const re = new RegExp(REACTION_RE.source, 'gi');
      while ((m = re.exec(reactionScope))) {
        const n = parseReactionNumber(m[2]);
        if (Number.isFinite(n) && n > max) max = n;
      }
      maxima[info.key] = max;
    }
  }
  state.community.platformMax = maxima;
  state.community.lastNormalization = [];
}

module.exports = {
  REACTION_RE,
  REACTION_AT_END_RE,
  parseReactionNumber,
  normalizeSectionValues,
  normalizeReactionNumbers,
  recordReactionMaxima,
};
});

SimCore.define("structure", function (require, module, exports) {
const kernel = require('./kernel');
const community = require('./community');
const reaction = require('./reaction');
const lifecycle = require('./lifecycle');
const time = require('./time');

const RESPONSE_HEADER_RE = /^\s*#\s+응답\s*$/mi;
const VOLUME_HEADER_RE = /^\s*##\s+볼륨\s+\d+\s*[:：]\s*\S.*$/mi;
const CHAPTER_HEADER_RE = /^\s*###\s+챕터\s+\d+\s*[:：]\s*\S.*$/mi;
const CHATINDEX_HEADER_RE = /^\s*####\s+Chatindex\s*[:：]\s*\S.*∮\s*$/mi;
const TIMESTAMP_RE = /⏱️\[\d{4}-\d{2}-\d{2}\s+\([^)]+\)\s+\d{1,2}:\d{2}\s+(?:AM|PM)\]/i;
const RESPONSE_HEADER_MARKER_RE = /^[ \t]*#[ \t]+응답[^\r\n]*$/mi;
const VOLUME_HEADER_MARKER_RE = /^[ \t]*##[ \t]+볼륨[^\r\n]*$/mi;
const CHAPTER_HEADER_MARKER_RE = /^[ \t]*###[ \t]+챕터[^\r\n]*$/mi;
const CHATINDEX_HEADER_MARKER_RE = /^[ \t]*####[ \t]+Chatindex[^\r\n]*$/mi;
const TIMESTAMP_MARKER_RE = /⏱️\[/i;

function validateHostFrameItem(text, issues, label, markerRe, validRe) {
  const markerCount = kernel.regexCount(text, markerRe);
  const validCount = kernel.regexCount(text, validRe);
  if (markerCount === 0) {
    issues.push(`공통 ${label} 누락`);
    return;
  }
  if (markerCount > 1) issues.push(`공통 ${label} 중복 ${markerCount}개`);
  if (validCount !== markerCount) issues.push(`공통 ${label} 형식 오류`);
}

function responseEnvelopeIntegrity(content, pending) {
  const text = String(content || '').trim();
  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);
  const knowledge = kernel.scanKnowledgeBlocks(text);
  const blocks = community.communityBlocks(text);
  const k = knowledge.blocks.length === 1 && !knowledge.malformed ? knowledge.blocks[0] : null;
  const frameOk = kernel.regexCount(text, RESPONSE_HEADER_RE) === 1
    && kernel.regexCount(text, VOLUME_HEADER_RE) === 1
    && kernel.regexCount(text, CHAPTER_HEADER_RE) === 1
    && kernel.regexCount(text, CHATINDEX_HEADER_RE) === 1
    && kernel.regexCount(text, TIMESTAMP_RE) === 1;
  const communityOk = blocks.length === expected;
  const knowledgeOk = !!k && !text.slice(k.end).trim();
  return { safe: frameOk && communityOk && knowledgeOk, frameOk, communityOk, knowledgeOk, blocks, knowledge };
}

function stateCommitSafety(content, pending, envelopeResolved = true) {
  const text = String(content || '');
  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);
  const blocks = community.communityBlocks(text);
  const responseCount = kernel.regexCount(text, RESPONSE_HEADER_MARKER_RE);
  const communitySafe = envelopeResolved && responseCount === 1 && blocks.length === expected;
  return {
    communitySafe,
    expectedBlocks: expected,
    observedBlocks: blocks.length,
    reason: communitySafe ? '' : `state quarantine: response=${responseCount}, COMMUNITY=${blocks.length}/${expected}`,
  };
}

function validateStructure(content, pending) {
  if (!pending?.active) return [];
  const issues = [];
  const text = String(content || '');
  const blocks = community.communityBlocks(text);
  const expected = lifecycle.expectedCommunityBlocks(pending.mode);
  if (blocks.length !== expected) issues.push(`COMMUNITY 블록 ${blocks.length}개 (필요 ${expected}개)`);

  validateHostFrameItem(text, issues, '# 응답 헤더', RESPONSE_HEADER_MARKER_RE, RESPONSE_HEADER_RE);
  validateHostFrameItem(text, issues, '볼륨 헤더', VOLUME_HEADER_MARKER_RE, VOLUME_HEADER_RE);
  validateHostFrameItem(text, issues, '챕터 헤더', CHAPTER_HEADER_MARKER_RE, CHAPTER_HEADER_RE);
  validateHostFrameItem(text, issues, 'Chatindex 헤더', CHATINDEX_HEADER_MARKER_RE, CHATINDEX_HEADER_RE);
  validateHostFrameItem(text, issues, 'timestamp', TIMESTAMP_MARKER_RE, TIMESTAMP_RE);

  if (/^B_/.test(String(pending.mode || '')) && pending.broadcastAirtimePrevious) {
    const currentBroadcastTs = time.parseTimestamp(text);
    const previousBroadcastTs = time.parseTimestamp(pending.broadcastAirtimePrevious);
    if (currentBroadcastTs && previousBroadcastTs && currentBroadcastTs.minuteKey < previousBroadcastTs.minuteKey) {
      issues.push(`Mode B 방송 송출 시각 역행: ${currentBroadcastTs.raw} < ${previousBroadcastTs.raw}`);
    }
  }
  if (!/^B_/.test(String(pending.mode || '')) && pending.narrativeClockGuard && pending.narrativeTimestampPrevious) {
    const currentNarrativeTs = time.parseTimestamp(text);
    const previousNarrativeTs = time.parseTimestamp(pending.narrativeTimestampPrevious);
    if (currentNarrativeTs && previousNarrativeTs && currentNarrativeTs.minuteKey < previousNarrativeTs.minuteKey) {
      issues.push(`Narrative 현재 시각 역행: ${currentNarrativeTs.raw} < ${previousNarrativeTs.raw}`);
    }
  }

  const knowledgeScan = kernel.scanKnowledgeBlocks(text);
  const knowledgeBlocks = knowledgeScan.blocks.map((x) => x.text);
  const knowledgeOpenCount = knowledgeScan.openCount;
  const knowledgeCloseCount = knowledgeScan.closeCount;
  if (knowledgeBlocks.length === 0) issues.push('<Knowledge> 블록 누락');
  else if (knowledgeBlocks.length > 1) issues.push(`<Knowledge> 블록 중복 ${knowledgeBlocks.length}개`);
  if (knowledgeScan.malformed || knowledgeOpenCount !== 1 || knowledgeCloseCount !== 1 || knowledgeBlocks.length !== 1) {
    issues.push(`<Knowledge> 태그 구조 오류 (open ${knowledgeOpenCount}, close ${knowledgeCloseCount}, strict-complete ${knowledgeBlocks.length})`);
  }

  kernel.CONTROL_TAG_RE.lastIndex = 0;
  if (kernel.CONTROL_TAG_RE.test(text)) issues.push('응답에 방송 제어 태그가 있음');
  kernel.CONTROL_TAG_RE.lastIndex = 0;

  const groupsByBlock = [];
  blocks.forEach((block, bi) => {
    const sections = community.splitCommunity(block);
    if (sections.length !== 3) issues.push(`COMMUNITY ${bi + 1}: 플랫폼 섹션 ${sections.length}개 (필요 3개)`);
    const separators = (block.match(/^\s*---\s*$/gm) || []).length;
    if (separators !== 2) issues.push(`COMMUNITY ${bi + 1}: 구분선 ${separators}개`);
    const groups = [];

    sections.forEach((section, si) => {
      const info = community.platformInfo(community.sectionHeader(section));
      if (!info.group) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 알 수 없는 플랫폼`);
      else groups.push(info.group);

      const parts = community.sectionCommunityParts(section);
      if (!parts.titleMatch) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 제목 누락`);
      if (parts.markerCount !== 1) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: [베댓] ${parts.markerCount}개 (필요 1개)`);
      if (!parts.body.length) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 게시글 본문 누락`);

      const commentScope = parts.commentsStart >= 0 ? parts.comments : section;
      const tops = (commentScope.match(/^\s*-\s+/gm) || []).length;
      const replies = (commentScope.match(/^\s*ㄴ\s+/gm) || []).length;
      if (tops !== 4) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 상위 댓글 ${tops}개 (필요 4개)`);
      if (replies !== 1) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 대댓글 ${replies}개 (필요 1개)`);

      const commentLines = commentScope.split(/\r?\n/).filter((line) => /^\s*(?:-\s+|ㄴ\s+)/.test(line));
      let reactionLineErrors = 0;
      for (const line of commentLines) {
        const tags = line.match(new RegExp(reaction.REACTION_RE.source, 'gi')) || [];
        if (tags.length !== 1 || !reaction.REACTION_AT_END_RE.test(line)) reactionLineErrors += 1;
      }
      if (reactionLineErrors) {
        issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 댓글 반응 태그 ${reactionLineErrors}줄 오류 (각 댓글/대댓글 끝에 정확히 1개 필요)`);
      }
    });

    groupsByBlock.push(groups);
    const distinctGroups = [...new Set(groups)];
    if (sections.length === 3 && (groups.length !== 3 || distinctGroups.length !== 3)) {
      const shownGroups = groups.length ? groups.join(', ') : '인식 없음';
      issues.push(`COMMUNITY ${bi + 1}: 플랫폼 그룹 ${distinctGroups.length}개 (필요 서로 다른 3개; 감지: ${shownGroups})`);
    }
  });

  // B_END strengthened contract: Scene 3 distinct + Episode 3 distinct + no group reuse across blocks.
  if (pending.mode === 'B_END' && blocks.length === 2) {
    const allGroups = groupsByBlock.flat();
    const distinct = [...new Set(allGroups)];
    if (allGroups.length !== 6 || distinct.length !== 6) {
      issues.push(`B_END: Scene+Episode 플랫폼 그룹 ${distinct.length}개 (필요 서로 다른 6개; 감지: ${allGroups.join(', ') || '인식 없음'})`);
    }
  }

  // <Knowledge> must be the final complete block of every active response.
  // When COMMUNITY exists, the single Knowledge block must come after the final COMMUNITY with no other output after it.
  if (knowledgeBlocks.length === 1 && !knowledgeScan.malformed) {
    const knowledgeBlock = knowledgeBlocks[0];
    const knowledgeEntry = knowledgeScan.blocks[0];
    const knowledgeIndex = knowledgeEntry.start;
    const afterKnowledge = text.slice(knowledgeEntry.end).trim();
    if (afterKnowledge) issues.push('<Knowledge> 뒤에 추가 텍스트가 있음 (Knowledge는 응답 맨 끝이어야 함)');

    if (blocks.length) {
      const lastCommunity = blocks[blocks.length - 1];
      const lastCommunityIndex = text.lastIndexOf(lastCommunity);
      const lastCommunityEnd = lastCommunityIndex + lastCommunity.length;
      if (knowledgeIndex < lastCommunityEnd) {
        issues.push('<Knowledge> 위치 오류 (마지막 COMMUNITY 뒤에 와야 함)');
      } else {
        const between = text.slice(lastCommunityEnd, knowledgeIndex).trim();
        if (between) issues.push('마지막 COMMUNITY와 <Knowledge> 사이에 추가 텍스트가 있음');
      }
    }
  }
  if (pending.mode === 'B_END' && blocks.length === 2) {
    const betweenStart = text.indexOf(blocks[0]) + blocks[0].length;
    const betweenEnd = text.indexOf(blocks[1], betweenStart);
    if (text.slice(betweenStart, betweenEnd).trim()) issues.push('장면/에피소드 COMMUNITY 사이에 다른 내용이 있음');
  }

  if (pending.mode === 'C' && blocks.length) {
    const prefix = text.slice(0, text.indexOf(blocks[0])).replace(kernel.KNOWLEDGE_RE, '');
    const extras = prefix.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).filter((line) => {
      if (/^#\s+응답\s*$/i.test(line)) return false;
      if (/^(?:#{1,6}\s*)?(?:볼륨|volume|챕터|chapter|chat\s*index|chatindex)(?:\s|:|$)/i.test(line)) return false;
      if (/^(?:---+|===+|§[^§]+§)$/.test(line)) return false;
      if (TIMESTAMP_RE.test(line)) return false;
      return true;
    });
    if (extras.length) issues.push('Mode C에 서사·행동·대사로 보이는 본문이 있음');
  }

  if ((pending.mode === 'B_START' || pending.mode === 'B_CONTINUE')
      && /(?:방송(?:은|이|을)?\s*(?:끝|종료)|엔딩\s*크레딧|막을\s*내리)/.test(text)) {
    issues.push('열린 방송 장면에 종결 표현이 있음');
  }
  if (/^B_/.test(pending.mode)
      && /(?:마음속으로|속으로\s+생각|내심|누구에게도\s+말하지\s+않은)/.test(text)) {
    issues.push('방송 화면으로 확인할 수 없는 내면 확정 표현');
  }

  if (pending.secondaryConfigured && !pending.secondaryActive && pending.secondaryName) {
    const escaped = pending.secondaryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped).test(text)) issues.push(`비활성 보조 캐릭터 "${pending.secondaryName}" 노출`);
  }
  if (/(?:만\s*\d+\s*세|만\s*나이|국제\s*나이|international\s+age|western\s+age)/i.test(text)) {
    issues.push('금지된 국제/만 나이 표현');
  }
  return issues;
}

module.exports = { TIMESTAMP_RE, responseEnvelopeIntegrity, stateCommitSafety, validateStructure };
});

SimCore.define("recovery", function (require, module, exports) {
const kernel = require('./kernel');
const lifecycle = require('./lifecycle');
const time = require('./time');
const community = require('./community');
const reaction = require('./reaction');
const structure = require('./structure');

// Known host/model metadata compatibility. A complete standalone Thoughts wrapper is silent.
// A partial Thoughts-shaped prefix is downgraded to compatibility telemetry only when a safe
// canonical # 응답 envelope is successfully selected; otherwise it stays a warning.
function isKnownThoughtsPreamble(rawPrefix) {
  const trimmed = String(rawPrefix || '').trim();
  if (!trimmed) return false;
  const open = trimmed.match(/^<Thoughts>/i);
  if (!open) return false;
  const close = trimmed.match(/<\/Thoughts>$/i);
  if (!close) return false;
  const body = trimmed.slice(open[0].length, trimmed.length - close[0].length);
  return !/<\/?Thoughts>/i.test(body);
}

// PocketRisu/model gateways can expose a partial reasoning wrapper before the real # 응답
// envelope. If the canonical envelope itself is safe, treat a Thoughts-shaped prefix as
// host/model compatibility telemetry rather than a structural failure.
function isThoughtsCompatibilityPreamble(rawPrefix) {
  return /^<Thoughts\b[^>]*>/i.test(String(rawPrefix || '').trim());
}

function preambleIssue(action) {
  return `응답 envelope 앞 비정상 preamble ${action}`;
}

function preambleDiagnostic(action) {
  return `Thoughts 호환 preamble ${action}`;
}

// Whole-response restart recovery. Structure judges candidate integrity; Recovery chooses/moves content.
function canonicalizeResponseEnvelope(content, pending) {
  const raw = String(content || '');
  if (!pending?.active) return { content: raw, repaired: false, issues: [], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: true };

  const markerRe = /^[ \t]*#[ \t]+응답[^\r\n]*$/gmi;
  const matches = [...raw.matchAll(markerRe)];
  if (!matches.length) {
    return { content: raw.trim(), repaired: false, issues: ['응답 envelope: # 응답 시작점 없음'], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: false };
  }

  const prefix = raw.slice(0, matches[0].index).trim();
  const knownThoughtsPrefix = !!prefix && isKnownThoughtsPreamble(prefix);
  const candidates = matches.map((m, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const text = raw.slice(m.index, end).trim();
    const integrity = structure.responseEnvelopeIntegrity(text, pending);
    let score = 0;
    if (integrity.frameOk) score += 20;
    if (integrity.communityOk) score += 20;
    if (integrity.knowledgeOk) score += 30;
    if (integrity.safe) score += 50;
    if (integrity.blocks.length === lifecycle.expectedCommunityBlocks(pending.mode)) {
      for (const block of integrity.blocks) {
        const sections = community.splitCommunity(block);
        if (sections.length === 3) score += 2;
        const groups = sections.map((section) => community.platformInfo(community.sectionHeader(section)).group).filter(Boolean);
        if (groups.length === 3 && new Set(groups).size === 3) score += 2;
      }
    }
    if (/<\/?Thoughts?>/i.test(text)) score -= 10;
    return { index: i, text, integrity, score };
  });

  const safe = candidates.filter((x) => x.integrity.safe).sort((a, b) => b.score - a.score || b.index - a.index);
  if (!safe.length) {
    const issues = [];
    const diagnostics = [];
    if (matches.length > 1) issues.push(`응답 envelope 중복 ${matches.length}개 - 안전한 후보를 확정하지 못해 자동 병합하지 않음`);
    if (prefix && !knownThoughtsPrefix) issues.push(preambleIssue('감지'));
    return { content: raw.trim(), repaired: false, issues, diagnostics, candidateCount: matches.length, selectedIndex: -1, resolved: matches.length === 1 && !prefix };
  }

  const selected = safe[0];
  const repaired = matches.length > 1 || !!prefix;
  const issues = [];
  const diagnostics = [];
  if (matches.length > 1) issues.push(`응답 envelope 중복 ${matches.length}개 → 완전한 후보 ${selected.index + 1}번만 유지`);
  if (prefix && !knownThoughtsPrefix) {
    if (isThoughtsCompatibilityPreamble(prefix)) diagnostics.push(preambleDiagnostic('제거'));
    else issues.push(preambleIssue('제거'));
  }
  return { content: selected.text, repaired, issues, diagnostics, candidateCount: matches.length, selectedIndex: selected.index, resolved: true };
}

// Deterministic opaque-block tail repair.
function normalizeTailPlacement(content, pending) {
  const text = String(content || '');
  if (!pending?.active) return text;

  const knowledgeScan = kernel.scanKnowledgeBlocks(text);
  const knowledge = knowledgeScan.blocks.map((x) => x.text);
  const blocks = community.communityBlocks(text);
  const expected = lifecycle.expectedCommunityBlocks(pending.mode);

  let base = text;
  if (/^B_/.test(String(pending.mode || '')) && blocks.length === expected && blocks.length > 0) {
    for (const block of blocks) base = base.replace(block, '');
  }
  if (knowledge.length === 1 && !knowledgeScan.malformed) base = base.replace(knowledge[0], '');

  base = base.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  const tail = [];
  if (/^B_/.test(String(pending.mode || '')) && blocks.length === expected && blocks.length > 0) tail.push(...blocks);
  if (knowledge.length === 1 && !knowledgeScan.malformed) tail.push(knowledge[0]);
  if (!tail.length) return base.trim();
  return `${base}${base ? '\n\n' : ''}${tail.join('\n\n')}`.trim();
}

function prepareOutput(content, pending) {
  let text = kernel.stripControlTags(content);
  const envelope = canonicalizeResponseEnvelope(text, pending);
  text = normalizeTailPlacement(envelope.content, pending);
  return { content: text, envelope };
}

function bootstrapFromHistory(baseState, messages, endIndex = -1) {
  const state = kernel.reconcileState(kernel.clone(baseState || kernel.initialState()));
  if (state.historyBootstrapped) return { state, changed: false, stats: state.historyBootstrapStats };

  state.broadcastLocked = false;
  time.resetBroadcastAirtime(state);
  state.episodeNo = 0;
  state.community = { activationCount: 0, platformMax: {}, lastNormalization: [], classifierVersion: community.COMMUNITY_CLASSIFIER_VERSION };
  state.worldYear = null;
  state.koreanAgeOffset = 0;
  state.narrativeTimestamp = null;
  state.lastMode = 'A';
  state.pending = null;

  const msgs = Array.isArray(messages) ? messages : [];
  const stop = endIndex >= 0 ? Math.min(endIndex, msgs.length - 1) : msgs.length - 1;
  let pending = null;
  let sawCore = false;
  let communityBlocksSeen = 0;
  let completedEpisodes = 0;
  let lastAssistantIndex = -1;

  for (let i = 0; i <= stop; i++) {
    const m = msgs[i] || {};
    const role = m.role;
    const text = kernel.textOfMessage(m);
    if (role === 'user') {
      const c = lifecycle.classifyMode(state, text);
      if (c.hasContinue || c.hasEnd || c.hasStart || c.hasCommunity) sawCore = true;
      const broadcastAirtimeIsNew = !!(c.hasStart && !c.wasLocked);
      if (broadcastAirtimeIsNew) time.resetBroadcastAirtime(state);
      time.applyWorldYear(state, time.explicitWorldYear(text));
      pending = {
        mode: c.mode,
        userIndex: i,
        broadcastAirtimeIsNew,
        broadcastAirtimePrevious: /^B_/.test(c.mode) ? (state.broadcastAirtime || null) : null,
        broadcastAirtimeStart: /^B_/.test(c.mode) ? (state.broadcastAirtimeStart || null) : null,
      };
      continue;
    }
    if (role !== 'char' && role !== 'assistant') continue;
    lastAssistantIndex = i;
    if (!pending) pending = { mode: state.broadcastLocked ? 'B_CONTINUE' : 'A', userIndex: i - 1 };

    const prepared = prepareOutput(text, { active: true, mode: pending.mode });
    const cleaned = prepared.envelope.resolved ? prepared.content : kernel.stripControlTags(text);
    const blocks = community.communityBlocks(cleaned);
    if (blocks.length) sawCore = true;
    reaction.recordReactionMaxima(cleaned, state);
    state.community.activationCount += blocks.length;
    communityBlocksSeen += blocks.length;

    if (/^B_/.test(String(pending.mode || ''))) time.commitBroadcastAirtime(state, pending, cleaned);
    else time.syncNarrativeTimestamp(state, cleaned, pending.mode);
    if (pending.mode === 'B_END') {
      if (state.episodeNo === 0) state.episodeNo = 1;
      state.broadcastLocked = false;
      completedEpisodes += 1;
    }
    time.applyWorldYear(state, time.timestampYear(cleaned));
    state.lastMode = pending.mode;
    pending = null;
  }

  state.pending = null;
  state.historyBootstrapped = true;
  state.historyBootstrappedAt = lastAssistantIndex;
  state.historyBootstrapStats = {
    scannedThrough: stop,
    sawCore,
    episodeNo: state.episodeNo,
    completedEpisodes,
    communityBlocks: communityBlocksSeen,
    platformCount: Object.keys(state.community.platformMax).length,
  };
  return { state, changed: true, stats: state.historyBootstrapStats };
}

function repairLegacyAgeClock(state, anchors, latestYear) {
  if (Number(state.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION) return false;
  const rows = Array.isArray(anchors) ? anchors : [];
  let bestInvariant = null;
  for (const row of rows) {
    const y = Number(row?.year);
    const o = Number(row?.offset);
    if (!Number.isFinite(y) || !Number.isFinite(o)) continue;
    const inv = o - y;
    if (bestInvariant == null || inv > bestInvariant) bestInvariant = inv;
  }
  const ly = Number(latestYear);
  const sy = Number(state.worldYear);
  const targetYear = Number.isFinite(ly)
    ? Math.max(Number.isFinite(sy) ? sy : ly, ly)
    : (Number.isFinite(sy) ? sy : null);
  if (targetYear == null || bestInvariant == null) return false;

  let changed = false;
  const expectedOffset = Math.max(0, Math.round(targetYear + bestInvariant));
  if (expectedOffset > Number(state.koreanAgeOffset || 0)) {
    state.koreanAgeOffset = expectedOffset;
    changed = true;
  }
  if (state.worldYear == null || targetYear > Number(state.worldYear)) {
    state.worldYear = targetYear;
    changed = true;
  }
  state.clockRepairVersion = time.CLOCK_REPAIR_VERSION;
  return changed;
}

async function repairLegacyClockState(store, outIndex, content, state) {
  if (Number(state?.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION) return false;
  const anchors = await store.clockAnchorsAtOrBelow(outIndex);
  return repairLegacyAgeClock(state, anchors, time.timestampYear(kernel.stripControlTags(content)));
}

async function repairLatestGlobalFloorContamination(store, current, outIndex, rawState) {
  const rawCommunity = rawState?.community;
  const global = Math.max(0, Math.round(Number(rawCommunity?.globalReactionMax) || 0));
  const events = Array.isArray(rawCommunity?.lastNormalization) ? rawCommunity.lastNormalization : [];
  if (!global || !events.length || !Number.isInteger(outIndex) || outIndex <= 0) return { changed: false, state: current };

  const preRaw = await store.load('pre', outIndex - 1);
  if (!preRaw) return { changed: false, state: current };
  const pre = kernel.reconcileState(kernel.clone(preRaw));
  const next = kernel.reconcileState(kernel.clone(current));
  let changed = false;
  for (const ev of events) {
    const key = String(ev?.platform || '');
    if (!key) continue;
    const eventHistorical = Math.max(0, Math.round(Number(ev?.historicalMax ?? ev?.historicalFamilyMax) || 0));
    const priorFamily = Math.max(0, Math.round(Number(pre.community?.platformMax?.[key]) || 0));
    const currentFamily = Math.max(0, Math.round(Number(next.community?.platformMax?.[key]) || 0));
    if (eventHistorical > priorFamily && currentFamily > priorFamily) {
      next.community.platformMax[key] = priorFamily;
      changed = true;
    }
  }
  if (changed) {
    next.community.lastNormalization = [];
    next.globalFloorRepairVersion = 1;
    await store.save('out', outIndex, next);
  }
  return { changed, state: next };
}

module.exports = {
  canonicalizeResponseEnvelope,
  normalizeTailPlacement,
  prepareOutput,
  bootstrapFromHistory,
  repairLegacyAgeClock,
  repairLegacyClockState,
  repairLatestGlobalFloorContamination,
};
});

SimCore.define("session", function (require, module, exports) {
const { SnapshotStore } = require('./store');
const kernel = require('./kernel');
const lifecycle = require('./lifecycle');
const time = require('./time');
const community = require('./community');
const reaction = require('./reaction');
const structure = require('./structure');
const recovery = require('./recovery');
const recurrence = require('./recurrence');

function sessionNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
function sessionElapsed(start) { return Math.max(0, sessionNow() - start); }

function renderRuntimePrompt(state) {
  const s = kernel.reconcileState(state);
  const p = s.pending;
  if (!p?.active) return '';
  const communityExpected = lifecycle.expectedCommunityBlocks(p.mode);
  const lines = [
    '[SIMCORE CORE STATE — AUTHORITATIVE]',
    `mode=${p.mode}`,
    `broadcast_locked=${s.broadcastLocked ? 1 : 0}`,
    `episode_no=${s.episodeNo}`,
    `secondary_configured=${p.secondaryConfigured ? 1 : 0}`,
    `secondary_active=${p.secondaryActive ? 1 : 0}`,
    `korean_age_offset=+${s.koreanAgeOffset}`,
    `world_year=${s.worldYear ?? 'unknown'}`,
    'required_frame=응답,볼륨,챕터,Chatindex,timestamp',
    'response_envelope=exactly_one_no_restart',
    'reference_sources=character_card+currently_exposed_lore_if_present',
    'character_world_facts_use_reference_sources=1',
    `community_blocks_expected=${communityExpected}`,
  ];
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeProgressionActive) {
    lines.push('timestamp_semantics=current_narrative_time');
    lines.push('embedded_preview_flashback_or_event_time_does_not_replace_current_timestamp=1');
    lines.push(`narrative_progression_hint=${p.narrativeProgressionReason || 'forward'}`);
    if (p.narrativeClockGuard && p.narrativeTimestampPrevious) {
      lines.push(`narrative_timestamp_previous=${p.narrativeTimestampPrevious}`);
      lines.push('narrative_timestamp_must_not_precede_previous=1');
    }
  }
  if (/^B_/.test(String(p.mode || ''))) {
    lines.push('mode_b_timestamp_semantics=broadcast_airtime');
    lines.push('mode_b_timestamp_is_not=depicted_scene_or_event_time');
    lines.push('broadcast_airtime_progression=advance_only_by_elapsed_program_runtime');
    lines.push('depicted_scene_time_may_jump_hours_or_days_without_copying_that_jump_to_broadcast_airtime=1');
    lines.push(`broadcast_airtime_previous=${p.broadcastAirtimePrevious || 'unknown'}`);
    lines.push(`broadcast_airtime_start=${p.broadcastAirtimeStart || 'unknown'}`);
    if (p.broadcastAirtimePrevious) lines.push('broadcast_airtime_must_not_precede_previous=1');
    const elapsed = time.elapsedMinutes(p.broadcastAirtimeStart, p.broadcastAirtimePrevious);
    if (elapsed != null && elapsed >= 0) lines.push(`broadcast_airtime_elapsed_program_minutes=${elapsed}`);
  }
  if (p.templateRecurrenceRepeated) {
    lines.push('request_template_recurs_from_prior_history=1');
    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || recurrence.modeFamily(p.mode)}`);
    lines.push('prior_answer_is_not_a_content_template=1');
    lines.push('preserve_requested_fields_and_output_contract=1');
    lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');
    lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');
  }
  if (p.communitySourceHandoffNewSource) {
    lines.push(`short_community_request_reused_with_new_source=${p.communitySourceHandoffRootMode || 'unknown'}`);
    lines.push('derive_reaction_from_current_source_not_prior_answer=1');
  }
  if (communityExpected > 0) {
    lines.push('platform_groups_required=3_distinct');
    lines.push('platform_group_reuse_forbidden=1');
    if (/^B_/.test(p.mode)) lines.push('community_placement=after_broadcast_prose');
    if (p.mode === 'B_END') {
      lines.push('b_end_output_order=broadcast_prose_then_scene_community_then_episode_community');
      lines.push('b_end_communities_must_be_contiguous_at_end=1');
      lines.push('b_end_platform_groups_required=6_distinct_across_blocks');
      lines.push('b_end_cross_block_group_reuse_forbidden=1');
    }
    lines.push('community_comment_shape=4_top_level+1_nested_reply_exactly');
    lines.push('reaction_required=each_comment_and_reply');
    lines.push('reaction_floor_scope=per_platform_family');
    lines.push('reaction_history_shared_across_modes=1');
    lines.push(`reaction_max=${JSON.stringify(s.community.platformMax)}`);
  }
  lines.push('knowledge_required=1');
  lines.push('knowledge_position=final_output_block');
  if (communityExpected > 0) lines.push('knowledge_after_last_community=1');
  lines.push('required_knowledge_block=exactly_one_complete_<Knowledge>...</Knowledge>');
  lines.push(`final_required_blocks=COMMUNITY:${communityExpected},Knowledge:1_last`);
  lines.push('[/SIMCORE CORE STATE]');
  return lines.join('\n');
}

function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) {
  const state = kernel.reconcileState(kernel.clone(baseState));
  const p = state.pending;
  if (!p?.active) {
    state.pending = null;
    return { state, content: String(prepared?.content || ''), active: false, envelopeIssues: [], stateCommit: { communitySafe: false } };
  }

  let finalText = String(prepared?.content || '');
  const envelope = prepared?.envelope || { resolved: true, issues: [], diagnostics: [], repaired: false };
  const commit = structure.stateCommitSafety(finalText, p, envelope.resolved);
  state.community.lastNormalization = [];
  if (commit.communitySafe) {
    if (opts.normalizeReactions === false) reaction.recordReactionMaxima(finalText, state);
    else finalText = reaction.normalizeReactionNumbers(finalText, state);
    state.community.activationCount += commit.expectedBlocks;
  } else {
    state.lastOutputQuarantine = {
      outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
      reason: commit.reason,
      observedBlocks: commit.observedBlocks,
      expectedBlocks: commit.expectedBlocks,
    };
  }

  let narrativeFloor = null;
  if (!/^B_/.test(String(p.mode || ''))) {
    narrativeFloor = time.enforceNarrativeCurrentTimeFloor(
      finalText,
      p.narrativeTimestampPrevious || state.narrativeTimestamp || null,
    );
    finalText = narrativeFloor.content;
  }
  time.applyWorldYear(state, time.timestampYear(finalText));
  let narrativeClockProbe = null;
  if (!/^B_/.test(String(p.mode || ''))) {
    const narrativeCommit = time.commitNarrativeTimestamp(state, p, finalText);
    const previousNarrative = narrativeCommit.previous || p.narrativeTimestampPrevious || null;
    const narrativeCmp = narrativeCommit.timestamp && previousNarrative
      ? time.compareTimestamps(narrativeCommit.timestamp, previousNarrative)
      : null;
    let narrativeCommitStatus = 'UNKNOWN';
    if (narrativeFloor?.changed) narrativeCommitStatus = 'FLOOR CLAMPED';
    else if (narrativeCommit.reason === 'backward') narrativeCommitStatus = 'REJECTED BACKWARD';
    else if (narrativeCommit.reason === 'missing-or-invalid') narrativeCommitStatus = 'MISSING TIMESTAMP';
    else if (narrativeCommit.reason === 'committed' && !previousNarrative) narrativeCommitStatus = 'SEEDED';
    else if (narrativeCommit.reason === 'committed' && narrativeCmp != null && narrativeCmp < 0) narrativeCommitStatus = 'BACKWARD OBSERVED';
    else if (narrativeCommit.reason === 'committed' && narrativeCmp === 0) narrativeCommitStatus = 'SAME';
    else if (narrativeCommit.reason === 'committed' && narrativeCmp != null && narrativeCmp > 0) narrativeCommitStatus = 'ADVANCED';
    else if (narrativeCommit.reason === 'committed') narrativeCommitStatus = narrativeCommit.changed ? 'COMMITTED' : 'SAME';
    narrativeClockProbe = {
      sendIndex: Number.isInteger(Number(p.sendIndex)) ? Number(p.sendIndex) : -1,
      outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
      mode: p.mode || null,
      guardActive: !!p.narrativeClockGuard,
      trigger: p.narrativeProgressionReason || 'none',
      previousAnchor: previousNarrative,
      observedTimestamp: narrativeFloor?.observed || narrativeCommit.timestamp || null,
      outputTimestamp: narrativeCommit.timestamp || null,
      floorApplied: !!narrativeFloor?.changed,
      floorTimestamp: narrativeFloor?.floor || null,
      commitStatus: narrativeCommitStatus,
      commitReason: narrativeFloor?.changed ? 'clamped-backward' : (narrativeCommit.reason || 'unknown'),
      at: Date.now(),
    };
    if (narrativeFloor?.changed) {
      state.lastNarrativeClockWarning = {
        previous: narrativeFloor.floor || previousNarrative || null,
        rejected: narrativeFloor.observed || null,
        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
        reason: 'current-time-floor',
        action: 'clamped',
      };
    } else if (narrativeCommit.reason === 'backward') {
      state.lastNarrativeClockWarning = {
        previous: narrativeCommit.previous || null,
        rejected: narrativeCommit.timestamp || null,
        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
        reason: p.narrativeProgressionReason || 'forward',
        action: 'rejected',
      };
    } else {
      delete state.lastNarrativeClockWarning;
    }
  }
  if (/^B_/.test(String(p.mode || ''))) {
    const airtimeCommit = time.commitBroadcastAirtime(state, p, finalText);
    if (airtimeCommit.reason === 'backward') {
      state.lastBroadcastAirtimeWarning = {
        previous: airtimeCommit.previous || null,
        rejected: airtimeCommit.timestamp || null,
        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
      };
    } else {
      delete state.lastBroadcastAirtimeWarning;
    }
  }
  if (p.mode === 'B_END') state.broadcastLocked = false;
  state.lastMode = p.mode;
  state.pending = null;
  return {
    state,
    content: finalText,
    active: true,
    mode: p.mode,
    envelopeIssues: envelope.issues || [],
    envelopeDiagnostics: envelope.diagnostics || [],
    envelopeRepaired: !!envelope.repaired,
    stateCommit: commit,
    narrativeClockProbe,
  };
}

class CoreRulesetSession {
  constructor(backend, opts = {}) {
    this.store = new SnapshotStore(backend, opts.prefix || `sim:core:${opts.chatId || 'chat'}`, opts.keepN || 80);
    this.current = null;
    this.initSource = 'fresh';
    this.needsHistoryBootstrap = true;
    this.loadedFromLegacySnapshot = false;
    this.trustedOutputFingerprint = null;
    this.trustedHostOutputFingerprint = null;
    this.currentOutputIndex = -1;
    this.lastPreparedSendIndex = -1;
    this.deferredPruneIndex = -1;
    this.deferredPruneRunning = false;
    this.communityAliasRepairStats = null;
    this.templateRecurrenceBootstrapStats = null;
    this.narrativeClockMigrationStats = null;
  }

  async migrateNarrativeCurrentTimeFloorIfNeeded(latestOutIndex = -1) {
    const state = kernel.reconcileState(this.current || kernel.initialState());
    const fromVersion = Math.max(1, Number(state.narrativeClockVersion || 1));
    if (fromVersion >= time.NARRATIVE_CLOCK_VERSION) {
      this.current = state;
      return { changed: false, skipped: true, fromVersion, toVersion: fromVersion };
    }

    const before = state.narrativeTimestamp || null;
    let candidate = null;
    let source = 'none';
    const sendIndex = Number.isInteger(Number(latestOutIndex)) && Number(latestOutIndex) > 0
      ? Number(latestOutIndex) - 1
      : -1;
    if (sendIndex >= 0) {
      const turn = await this.store.loadTurn(sendIndex);
      const choices = [
        ['send', turn?.send?.narrativeTimestamp || null],
        ['pre', turn?.pre?.narrativeTimestamp || null],
      ];
      for (const [label, ts] of choices) {
        if (!time.parseTimestamp(ts)) continue;
        if (!candidate) { candidate = ts; source = label; continue; }
        const cmp = time.compareTimestamps(ts, candidate);
        if (cmp != null && cmp > 0) { candidate = ts; source = label; }
      }
    }

    let changed = false;
    if (candidate) {
      const cmp = before ? time.compareTimestamps(candidate, before) : 1;
      if (!before || (cmp != null && cmp > 0)) {
        state.narrativeTimestamp = candidate;
        changed = true;
      }
    }
    state.narrativeClockVersion = time.NARRATIVE_CLOCK_VERSION;
    this.current = state;
    this.narrativeClockMigrationStats = {
      changed,
      fromVersion,
      toVersion: time.NARRATIVE_CLOCK_VERSION,
      sendIndex,
      before,
      candidate,
      after: state.narrativeTimestamp || null,
      source,
    };
    return this.narrativeClockMigrationStats;
  }

  async init(latestOutIndex = -1, mirrorRaw = null, latestOutputFingerprint = null) {
    let parsedMirror = null;
    if (mirrorRaw) {
      try { parsedMirror = typeof mirrorRaw === 'string' ? JSON.parse(mirrorRaw) : mirrorRaw; } catch { parsedMirror = null; }
    }

    const mirrorFingerprint = parsedMirror?.outputFingerprint || null;
    const mirrorHostFingerprint = parsedMirror?.hostOutputFingerprint || null;
    const mirrorFingerprintMatches = !!latestOutputFingerprint
      && (mirrorFingerprint === latestOutputFingerprint || mirrorHostFingerprint === latestOutputFingerprint);
    const mirrorFastSafe = latestOutIndex >= 0
      && parsedMirror && typeof parsedMirror === 'object'
      && Number(parsedMirror.stateVersion || 0) >= kernel.STATE_VERSION
      && Number(parsedMirror.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION
      && !parsedMirror.pending?.active
      && mirrorFingerprintMatches;

    if (mirrorFastSafe) {
      this.loadedFromLegacySnapshot = false;
      this.current = kernel.reconcileState(parsedMirror);
      if (!this.current.historyBootstrapped) {
        this.current.historyBootstrapped = true;
        this.current.historyBootstrapStats = { source: 'verified-mirror' };
      }
      this.initSource = 'mirror-fast';
      this.needsHistoryBootstrap = false;
      this.currentOutputIndex = latestOutIndex;
      this.trustedOutputFingerprint = mirrorFingerprint;
      this.trustedHostOutputFingerprint = mirrorHostFingerprint;
      await this.migrateNarrativeCurrentTimeFloorIfNeeded(latestOutIndex);
      return this.current;
    }

    if (latestOutIndex >= 0) {
      const found = await this.store.latestAtOrBelow('out', latestOutIndex);
      if (found) {
        const rawFound = found.state && typeof found.state === 'object' ? kernel.clone(found.state) : found.state;
        this.loadedFromLegacySnapshot = Number(rawFound?.stateVersion || 0) < kernel.STATE_VERSION;
        this.current = kernel.reconcileState(found.state);
        const globalRepair = await recovery.repairLatestGlobalFloorContamination(this.store, this.current, found.index, rawFound);
        this.current = globalRepair.state;
        if (!this.current.historyBootstrapped) {
          this.current.historyBootstrapped = true;
          this.current.historyBootstrappedAt = found.index;
          this.current.historyBootstrapStats = { source: 'existing-snapshot', scannedThrough: found.index };
        }
        this.initSource = 'snapshot';
        this.needsHistoryBootstrap = false;
        this.currentOutputIndex = found.index;
        this.trustedOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.outputFingerprint || null) : null;
        this.trustedHostOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.hostOutputFingerprint || null) : null;
        await this.migrateNarrativeCurrentTimeFloorIfNeeded(found.index);
        return this.current;
      }
    }
    if (parsedMirror) {
      try {
        this.loadedFromLegacySnapshot = Number(parsedMirror?.stateVersion || 0) < kernel.STATE_VERSION;
        this.current = kernel.reconcileState(parsedMirror);
        if (!this.current.historyBootstrapped) {
          this.current.historyBootstrapped = true;
          this.current.historyBootstrapStats = { source: 'existing-mirror' };
        }
        this.initSource = 'mirror';
        this.needsHistoryBootstrap = false;
        this.currentOutputIndex = Number.isInteger(latestOutIndex) ? latestOutIndex : -1;
        this.trustedOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.outputFingerprint || null) : null;
        this.trustedHostOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.hostOutputFingerprint || null) : null;
        await this.migrateNarrativeCurrentTimeFloorIfNeeded(latestOutIndex);
        return this.current;
      } catch { /* broken mirror -> fresh */ }
    }
    this.current = kernel.initialState();
    this.initSource = 'fresh';
    this.needsHistoryBootstrap = true;
    this.loadedFromLegacySnapshot = false;
    this.trustedOutputFingerprint = null;
    this.trustedHostOutputFingerprint = null;
    this.currentOutputIndex = -1;
    this.lastPreparedSendIndex = -1;
    return this.current;
  }

  async bootstrapHistoryIfNeeded(messages, lastCompletedOutIndex = -1) {
    if (!this.needsHistoryBootstrap || this.current?.historyBootstrapped) {
      return { changed: false, stats: this.current?.historyBootstrapStats || null };
    }
    const r = recovery.bootstrapFromHistory(this.current || kernel.initialState(), messages, lastCompletedOutIndex);
    this.current = r.state;
    this.needsHistoryBootstrap = false;
    if (lastCompletedOutIndex >= 0) {
      const msg = Array.isArray(messages) ? messages[lastCompletedOutIndex] : null;
      this.current.outputFingerprint = kernel.fingerprintText(kernel.textOfMessage(msg));
      this.current.hostOutputFingerprint = this.current.outputFingerprint;
      await this.store.save('out', lastCompletedOutIndex, this.current);
      this.trustedOutputFingerprint = this.current.outputFingerprint || null;
      this.trustedHostOutputFingerprint = this.current.hostOutputFingerprint || null;
      this.currentOutputIndex = lastCompletedOutIndex;
    }
    return r;
  }

  migrateCommunityClassifierIfNeeded(messages, lastCompletedOutIndex = -1) {
    const state = kernel.reconcileState(this.current || kernel.initialState());
    const currentVersion = Math.max(0, Number(state.community?.classifierVersion || 0));
    if (currentVersion >= community.COMMUNITY_CLASSIFIER_VERSION) {
      this.current = state;
      return { changed: false, skipped: true, version: currentVersion };
    }

    const before = community.normalizePlatformMaxMap(state.community.platformMax);
    state.community.platformMax = { ...before };
    const msgs = Array.isArray(messages) ? messages : [];
    const stop = Number.isInteger(lastCompletedOutIndex) && lastCompletedOutIndex >= 0
      ? Math.min(lastCompletedOutIndex, msgs.length - 1)
      : msgs.length - 1;
    let assistantScanned = 0;
    let messagesVisited = 0;
    let aliasSections = 0;
    let scannedChars = 0;

    for (let i = stop; i >= 0 && assistantScanned < community.ALIAS_BACKFILL_ASSISTANT_LIMIT && messagesVisited < community.ALIAS_BACKFILL_MESSAGE_LIMIT; i--) {
      messagesVisited += 1;
      const m = msgs[i] || {};
      if (m.role !== 'char' && m.role !== 'assistant') continue;
      assistantScanned += 1;
      const text = kernel.textOfMessage(m);
      scannedChars += text.length;
      for (const block of community.communityBlocks(text)) {
        for (const section of community.splitCommunity(block)) {
          const info = community.platformInfo(community.sectionHeader(section));
          if (info.source !== 'alias-parent-local') continue;
          aliasSections += 1;
          const parts = community.sectionCommunityParts(section);
          const reactionScope = parts.commentsStart >= 0 ? parts.comments : section;
          const re = new RegExp(reaction.REACTION_RE.source, 'gi');
          let m;
          let localMax = Math.max(0, Number(state.community.platformMax[info.key] || 0));
          while ((m = re.exec(reactionScope))) {
            const n = reaction.parseReactionNumber(m[2]);
            if (Number.isFinite(n)) localMax = Math.max(localMax, n);
          }
          state.community.platformMax[info.key] = localMax;
        }
      }
    }

    state.community.classifierVersion = community.COMMUNITY_CLASSIFIER_VERSION;
    const after = community.normalizePlatformMaxMap(state.community.platformMax);
    state.community.platformMax = after;
    const changedFamilies = Object.keys(after).filter((k) => Number(after[k] || 0) > Number(before[k] || 0));
    this.current = state;
    this.communityAliasRepairStats = {
      version: community.COMMUNITY_CLASSIFIER_VERSION,
      assistantScanned,
      messagesVisited,
      aliasSections,
      scannedChars,
      changedFamilies,
    };
    return {
      changed: changedFamilies.length > 0,
      skipped: false,
      version: community.COMMUNITY_CLASSIFIER_VERSION,
      assistantScanned,
      messagesVisited,
      aliasSections,
      scannedChars,
      changedFamilies,
    };
  }

  async onSend(sendIndex, userText, promptProbe, perfDetail = null, historyMessages = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.preLoadMs = 0;
      detail.turnSerializeMs = 0;
      detail.turnSetMs = 0;
      detail.lifecycleMs = 0;
      detail.runtimeRenderMs = 0;
      detail.mustRestorePre = false;
      detail.existingPre = false;
      detail.previousOutputIndex = this.currentOutputIndex;
      detail.restoreReason = 'forward';
      detail.templateBootstrapMs = 0;
      detail.templateBootstrap = null;
      detail.templateRecurrenceEligible = false;
      detail.templateRecurrenceRepeated = false;
      detail.templateRegistrySize = 0;
    }

    const previousOutputIndex = this.currentOutputIndex;
    const mustRestorePre = sendIndex <= previousOutputIndex || sendIndex === this.lastPreparedSendIndex;
    if (detail) {
      detail.mustRestorePre = mustRestorePre;
      detail.previousOutputIndex = previousOutputIndex;
      detail.restoreReason = !mustRestorePre
        ? 'forward'
        : (sendIndex < previousOutputIndex ? 'rewind' : (sendIndex === previousOutputIndex ? 'same-index' : 'repeat-send'));
    }
    let t = sessionNow();
    const existingPre = mustRestorePre ? await this.store.load('pre', sendIndex) : null;
    if (detail) { detail.preLoadMs = sessionElapsed(t); detail.existingPre = !!existingPre; }
    const base = existingPre || this.current || kernel.initialState();
    if (detail) detail.previousMode = base?.lastMode || null;

    if (promptProbe?.active && recurrence.needsBootstrap(base)) {
      t = sessionNow();
      const boot = recurrence.bootstrapState(base, historyMessages, sendIndex, kernel.textOfMessage);
      this.templateRecurrenceBootstrapStats = boot.stats;
      if (detail) {
        detail.templateBootstrapMs = sessionElapsed(t);
        detail.templateBootstrap = boot.stats;
      }
    }

    t = sessionNow();
    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex);
    if (detail) {
      detail.lifecycleMs = sessionElapsed(t);
      detail.templateRecurrenceEligible = !!state.pending?.templateRecurrenceEligible;
      detail.templateRecurrenceRepeated = !!state.pending?.templateRecurrenceRepeated;
      detail.templateRegistrySize = Number(state.pending?.templateRegistrySize || 0);
    }

    const turnMetric = {};
    await this.store.saveTurn(sendIndex, existingPre || base, state, { prune: false, metric: turnMetric });
    if (detail) {
      detail.turnSerializeMs = Number(turnMetric.serializeMs || 0);
      detail.turnSetMs = Number(turnMetric.setMs || 0);
    }

    this.current = state;
    this.lastPreparedSendIndex = sendIndex;
    t = sessionNow();
    const promptBlock = renderRuntimePrompt(state);
    if (detail) detail.runtimeRenderMs = sessionElapsed(t);
    return { state, promptBlock, active: !!state.pending?.active };
  }

  resolveOutputIndex(fallbackOutIndex = -1) {
    const sendIndex = Number(this.current?.pending?.sendIndex);
    if (this.current?.pending?.active && Number.isInteger(sendIndex) && sendIndex >= 0) return sendIndex + 1;
    return Number.isInteger(fallbackOutIndex) && fallbackOutIndex >= 0 ? fallbackOutIndex : -1;
  }

  async stateForOutput(outIndex, perfDetail = null) {
    const effectiveOutIndex = this.resolveOutputIndex(outIndex);
    const expectedSendIndex = effectiveOutIndex - 1;
    const currentSendIndex = Number(this.current?.pending?.sendIndex);
    const memoryFastSafe = !!this.current?.pending?.active
      && Number.isInteger(currentSendIndex)
      && currentSendIndex === expectedSendIndex
      && this.lastPreparedSendIndex === currentSendIndex;

    if (memoryFastSafe) {
      if (perfDetail) perfDetail.stateLoadSource = 'memory-fast';
      return kernel.reconcileState(this.current);
    }

    if (perfDetail) perfDetail.stateLoadSource = 'storage-fallback';
    return kernel.reconcileState((await this.store.load('send', expectedSendIndex)) || this.current || kernel.initialState());
  }

  scheduleDeferredPrune(outIndex) {
    // Retention is housekeeping, not part of the user-visible output commit. Run it only
    // periodically and after the output promise can resolve. 17 is coprime with the usual
    // user/assistant index step of 2, so long chats still hit the cadence after reloads.
    if (!Number.isInteger(outIndex) || outIndex < 17 || (outIndex % 17) !== 0) return false;
    if (this.deferredPruneIndex === outIndex || this.deferredPruneRunning) return false;
    this.deferredPruneIndex = outIndex;

    const run = async () => {
      if (this.deferredPruneRunning) return;
      this.deferredPruneRunning = true;
      try { await this.store.prune(); }
      catch (e) { /* retention failure must never affect committed output/state */ }
      finally { this.deferredPruneRunning = false; }
    };

    if (typeof setTimeout === 'function') {
      const timer = setTimeout(run, 750);
      if (timer && typeof timer.unref === 'function') timer.unref();
    } else {
      Promise.resolve().then(run);
    }
    return true;
  }

  async processOutput(outIndex, content, perfDetail = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.stateLoadMs = 0;
      detail.stateLoadSource = 'unknown';
      detail.prepareMs = 0;
      detail.validateMs = 0;
      detail.finalizeMs = 0;
      detail.outSerializeMs = 0;
      detail.outSetMs = 0;
      detail.outPruneMs = 0;
      detail.pruneDeferred = false;
      detail.inputChars = String(content || '').length;
      detail.outputChars = 0;
    }

    outIndex = this.resolveOutputIndex(outIndex);
    let t = sessionNow();
    const base = await this.stateForOutput(outIndex, detail); // memory fast path; storage remains recovery fallback
    if (detail) detail.stateLoadMs = sessionElapsed(t);
    if (!base.pending?.active) {
      const plain = String(content || '');
      if (detail) detail.outputChars = plain.length;
      return { state: base, content: plain, active: false, issues: [] };
    }

    t = sessionNow();
    const prepared = recovery.prepareOutput(content, base.pending); // exactly one strip/envelope/tail pass
    if (detail) detail.prepareMs = sessionElapsed(t);

    t = sessionNow();
    const issues = [...(prepared.envelope.issues || []), ...structure.validateStructure(prepared.content, base.pending)];
    if (detail) detail.validateMs = sessionElapsed(t);

    t = sessionNow();
    const result = finalizePreparedOutput(base, prepared, outIndex);
    // PocketRisu can persist either the raw handler input or the canonical handler result.
    // Keep both fingerprints so the next request does not mistake host representation for a manual edit.
    result.state.outputFingerprint = kernel.fingerprintText(result.content);
    result.state.hostOutputFingerprint = kernel.fingerprintText(content);
    if (detail) {
      detail.finalizeMs = sessionElapsed(t);
      detail.outputChars = String(result.content || '').length;
    }

    const outMetric = {};
    await this.store.save('out', outIndex, result.state, detail ? { prune: false, metric: outMetric } : { prune: false });
    if (detail) {
      detail.outSerializeMs = Number(outMetric.serializeMs || 0);
      detail.outSetMs = Number(outMetric.setMs || 0);
      detail.outPruneMs = 0;
    }
    this.current = result.state;
    this.currentOutputIndex = outIndex;
    this.trustedOutputFingerprint = result.state.outputFingerprint || null;
    this.trustedHostOutputFingerprint = result.state.hostOutputFingerprint || null;
    if (detail) detail.pruneDeferred = this.scheduleDeferredPrune(outIndex);
    else this.scheduleDeferredPrune(outIndex);
    result.issues = issues;
    result.envelopeDiagnostics = prepared.envelope.diagnostics || [];
    return result;
  }

  // Compatibility alias for internal/tests; same one-pass pipeline.
  async onOutput(outIndex, content, perfDetail = null) { return this.processOutput(outIndex, content, perfDetail); }

  seedBroadcastAirtimeFromVisible(content) {
    if (!this.current?.broadcastLocked || this.current.broadcastAirtime) return false;
    if (!/^B_/.test(String(this.current.lastMode || ''))) return false;
    const parsed = time.parseTimestamp(content);
    if (!parsed) return false;
    this.current.broadcastAirtime = parsed.raw;
    if (!this.current.broadcastAirtimeStart) this.current.broadcastAirtimeStart = parsed.raw;
    return true;
  }

  seedNarrativeTimestampFromVisible(content) {
    if (!this.current || this.current.narrativeTimestamp) return false;
    if (/^B_/.test(String(this.current.lastMode || ''))) return false;
    const parsed = time.parseTimestamp(content);
    if (!parsed) return false;
    this.current.narrativeTimestamp = parsed.raw;
    return true;
  }

  async reconcileEditedOutput(outIndex, content, perfDetail = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.path = 'unknown';
      detail.fingerprintMs = 0;
      detail.compatibilityMs = 0;
      detail.compatibilitySource = '';
      detail.savedOutLoadMs = 0;
      detail.sendLoadMs = 0;
      detail.prepareMs = 0;
      detail.finalizeMs = 0;
      detail.clockRepairMs = 0;
      detail.stateSyncMs = 0;
      detail.outSerializeMs = 0;
      detail.outSetMs = 0;
      detail.outPruneMs = 0;
      detail.didSave = false;
    }
    if (!Number.isInteger(outIndex) || outIndex < 0) {
      if (detail) detail.path = 'no-output';
      return { changed: false, reason: 'no-output' };
    }

    let t = sessionNow();
    const actualFingerprint = kernel.fingerprintText(content);
    if (detail) detail.fingerprintMs = sessionElapsed(t);

    // Stable fast paths: PocketRisu may retain either the canonical handler result or the raw
    // model output passed into the handler. Both are generation-time fingerprints, so neither
    // representation is a manual edit. A true edit matches neither and falls through to snapshots.
    if (this.current?.outputFingerprint
        && this.current.outputFingerprint === actualFingerprint
        && this.trustedOutputFingerprint === actualFingerprint) {
      const airtimeSeeded = this.seedBroadcastAirtimeFromVisible(content);
      const narrativeSeeded = this.seedNarrativeTimestampFromVisible(content);
      const seeded = airtimeSeeded || narrativeSeeded;
      if (detail) { detail.path = airtimeSeeded ? 'same-fast+airtime-seed' : (narrativeSeeded ? 'same-fast+narrative-seed' : 'same-fast'); detail.compatibilitySource = 'canonical'; }
      return { changed: false, reason: seeded ? (airtimeSeeded ? 'same-fast+airtime-seed' : 'same-fast+narrative-seed') : 'same-fast' };
    }
    if (this.current?.hostOutputFingerprint
        && this.current.hostOutputFingerprint === actualFingerprint
        && this.trustedHostOutputFingerprint === actualFingerprint) {
      const airtimeSeeded = this.seedBroadcastAirtimeFromVisible(content);
      const narrativeSeeded = this.seedNarrativeTimestampFromVisible(content);
      const seeded = airtimeSeeded || narrativeSeeded;
      if (detail) { detail.path = airtimeSeeded ? 'same-host-fast+airtime-seed' : (narrativeSeeded ? 'same-host-fast+narrative-seed' : 'same-host-fast'); detail.compatibilitySource = 'host-raw'; }
      return { changed: false, reason: seeded ? (airtimeSeeded ? 'same-host-fast+airtime-seed' : 'same-host-fast+narrative-seed') : 'same-host-fast' };
    }

    t = sessionNow();
    const savedOut = await this.store.load('out', outIndex);
    if (detail) detail.savedOutLoadMs = sessionElapsed(t);
    if (!savedOut) {
      if (detail) detail.path = 'no-snapshot';
      return { changed: false, reason: 'no-snapshot' };
    }

    // Reload-safe direct match against either representation already persisted by v0.62.9+.
    // Keep legacy clock/state migration semantics intact: only skip the old recovery branch when
    // this snapshot is already on the current repaired state contract.
    const savedFastSafe = Number(savedOut.stateVersion || 0) >= kernel.STATE_VERSION
      && Number(savedOut.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION;
    if (savedFastSafe && (savedOut.outputFingerprint === actualFingerprint || savedOut.hostOutputFingerprint === actualFingerprint)) {
      t = sessionNow();
      const same = kernel.reconcileState(savedOut);
      if (detail) detail.stateSyncMs += sessionElapsed(t);
      this.current = same;
      this.currentOutputIndex = outIndex;
      this.trustedOutputFingerprint = same.outputFingerprint || null;
      this.trustedHostOutputFingerprint = same.hostOutputFingerprint || null;
      this.loadedFromLegacySnapshot = false;
      const airtimeSeeded = this.seedBroadcastAirtimeFromVisible(content);
      const narrativeSeeded = this.seedNarrativeTimestampFromVisible(content);
      const hostMatch = savedOut.hostOutputFingerprint === actualFingerprint;
      if (detail) {
        detail.path = airtimeSeeded
          ? (hostMatch ? 'same-host-snapshot+airtime-seed' : 'same-snapshot+airtime-seed')
          : (narrativeSeeded ? (hostMatch ? 'same-host-snapshot+narrative-seed' : 'same-snapshot+narrative-seed') : (hostMatch ? 'same-host-snapshot' : 'same-snapshot'));
        detail.compatibilitySource = hostMatch ? 'host-raw' : 'canonical';
      }
      return { changed: false, reason: detail?.path || (hostMatch ? 'same-host-snapshot' : 'same-snapshot') };
    }

    t = sessionNow();
    const sendForEnvelope = await this.store.load('send', outIndex - 1);
    if (detail) detail.sendLoadMs = sessionElapsed(t);
    if (sendForEnvelope?.pending?.active) {
      t = sessionNow();
      const prepared = recovery.prepareOutput(content, sendForEnvelope.pending);
      if (detail) detail.prepareMs += sessionElapsed(t);

      // Legacy migration/compatibility check: deterministically replay the normal finalize step
      // in memory. If the raw PocketRisu representation resolves to the fingerprint already
      // committed for this output, it was not a user edit. Do not rewrite snapshots or prune.
      if (prepared.envelope.resolved && savedOut.outputFingerprint) {
        t = sessionNow();
        const compatibilityResult = finalizePreparedOutput(sendForEnvelope, prepared, outIndex);
        const compatibleFingerprint = kernel.fingerprintText(compatibilityResult.content);
        if (detail) detail.compatibilityMs += sessionElapsed(t);
        if (compatibleFingerprint === savedOut.outputFingerprint) {
          const same = kernel.reconcileState(savedOut);
          same.hostOutputFingerprint = actualFingerprint;
          // Preserve legacy clock-repair semantics even though the output itself is proven equivalent.
          t = sessionNow();
          const clockRepaired = await recovery.repairLegacyClockState(this.store, outIndex, compatibilityResult.content, same);
          if (detail) detail.clockRepairMs += sessionElapsed(t);
          this.current = same;
          this.currentOutputIndex = outIndex;
          this.trustedOutputFingerprint = same.outputFingerprint || null;
          this.trustedHostOutputFingerprint = actualFingerprint;
          this.loadedFromLegacySnapshot = false;
          if (detail) {
            detail.path = clockRepaired ? 'host-compatible-clock-repaired' : 'host-compatible';
            detail.compatibilitySource = 'replayed-canonical';
          }
          return { changed: !!clockRepaired, reason: clockRepaired ? 'host-compatible-clock-repaired' : 'host-compatible' };
        }
      }

      if (prepared.envelope.repaired && prepared.envelope.resolved) {
        t = sessionNow();
        const repairedResult = finalizePreparedOutput(sendForEnvelope, prepared, outIndex, { normalizeReactions: false });
        if (detail) detail.finalizeMs += sessionElapsed(t);
        t = sessionNow();
        await recovery.repairLegacyClockState(this.store, outIndex, prepared.content, repairedResult.state);
        if (detail) detail.clockRepairMs += sessionElapsed(t);
        t = sessionNow();
        repairedResult.state.outputFingerprint = kernel.fingerprintText(repairedResult.content);
        repairedResult.state.hostOutputFingerprint = actualFingerprint;
        repairedResult.state.envelopeRepairVersion = 1;
        repairedResult.state.manualEditRevision = Math.max(0, Number(savedOut.manualEditRevision) || 0) + 1;
        if (detail) detail.stateSyncMs += sessionElapsed(t);
        const saveMetric = {};
        await this.store.save('out', outIndex, repairedResult.state, detail ? { metric: saveMetric } : {});
        if (detail) {
          detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
          detail.outSetMs += Number(saveMetric.setMs || 0);
          detail.outPruneMs += Number(saveMetric.pruneMs || 0);
          detail.didSave = true;
          detail.path = 'duplicate-envelope-state-repaired';
        }
        this.current = repairedResult.state;
        this.currentOutputIndex = outIndex;
        this.trustedOutputFingerprint = repairedResult.state.outputFingerprint || null;
        this.trustedHostOutputFingerprint = actualFingerprint;
        this.loadedFromLegacySnapshot = false;
        return { changed: true, reason: 'duplicate-envelope-state-repaired', mode: repairedResult.mode, revision: repairedResult.state.manualEditRevision };
      }
    }

    if (!savedOut.outputFingerprint) {
      t = sessionNow();
      const baseline = kernel.reconcileState(savedOut);
      if (detail) detail.stateSyncMs += sessionElapsed(t);
      t = sessionNow();
      const repaired = await recovery.repairLegacyClockState(this.store, outIndex, content, baseline);
      if (detail) detail.clockRepairMs += sessionElapsed(t);
      t = sessionNow();
      const clockChanged = time.applyWorldYear(baseline, time.timestampYear(kernel.stripControlTags(content)));
      const narrativeClockChanged = time.syncNarrativeTimestamp(baseline, kernel.stripControlTags(content), baseline.lastMode);
      baseline.outputFingerprint = actualFingerprint;
      baseline.hostOutputFingerprint = actualFingerprint;
      if (detail) detail.stateSyncMs += sessionElapsed(t);
      const saveMetric = {};
      await this.store.save('out', outIndex, baseline, detail ? { metric: saveMetric } : {});
      if (detail) {
        detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
        detail.outSetMs += Number(saveMetric.setMs || 0);
        detail.outPruneMs += Number(saveMetric.pruneMs || 0);
        detail.didSave = true;
        detail.path = repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'baseline-created');
      }
      this.current = baseline;
      this.currentOutputIndex = outIndex;
      this.trustedOutputFingerprint = baseline.outputFingerprint || null;
      this.trustedHostOutputFingerprint = baseline.hostOutputFingerprint || null;
      this.loadedFromLegacySnapshot = false;
      return { changed: repaired || clockChanged || narrativeClockChanged, reason: repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'baseline-created') };
    }

    if (savedOut.outputFingerprint === actualFingerprint) {
      t = sessionNow();
      const same = kernel.reconcileState(savedOut);
      if (detail) detail.stateSyncMs += sessionElapsed(t);
      t = sessionNow();
      const repaired = await recovery.repairLegacyClockState(this.store, outIndex, content, same);
      if (detail) detail.clockRepairMs += sessionElapsed(t);
      t = sessionNow();
      const clockChanged = time.applyWorldYear(same, time.timestampYear(kernel.stripControlTags(content)));
      const narrativeClockChanged = time.syncNarrativeTimestamp(same, kernel.stripControlTags(content), same.lastMode);
      if (detail) detail.stateSyncMs += sessionElapsed(t);
      if (repaired || clockChanged || narrativeClockChanged) {
        const saveMetric = {};
        await this.store.save('out', outIndex, same, detail ? { metric: saveMetric } : {});
        if (detail) {
          detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
          detail.outSetMs += Number(saveMetric.setMs || 0);
          detail.outPruneMs += Number(saveMetric.pruneMs || 0);
          detail.didSave = true;
        }
      }
      if (detail) detail.path = repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'same');
      this.current = same;
      this.currentOutputIndex = outIndex;
      this.trustedOutputFingerprint = same.outputFingerprint || null;
      this.trustedHostOutputFingerprint = same.hostOutputFingerprint || null;
      this.loadedFromLegacySnapshot = false;
      return { changed: repaired || clockChanged || narrativeClockChanged, reason: repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'same') };
    }

    if (!sendForEnvelope) {
      if (detail) detail.path = 'no-send-snapshot';
      return { changed: false, reason: 'no-send-snapshot' };
    }
    t = sessionNow();
    const prepared = recovery.prepareOutput(content, sendForEnvelope.pending);
    if (detail) detail.prepareMs += sessionElapsed(t);
    t = sessionNow();
    const result = finalizePreparedOutput(sendForEnvelope, prepared, outIndex, { normalizeReactions: false });
    if (detail) detail.finalizeMs += sessionElapsed(t);
    t = sessionNow();
    await recovery.repairLegacyClockState(this.store, outIndex, result.content, result.state);
    if (detail) detail.clockRepairMs += sessionElapsed(t);
    t = sessionNow();
    result.state.outputFingerprint = kernel.fingerprintText(result.content);
    result.state.hostOutputFingerprint = actualFingerprint;
    result.state.manualEditRevision = Math.max(0, Number(savedOut.manualEditRevision) || 0) + 1;
    if (detail) detail.stateSyncMs += sessionElapsed(t);
    const saveMetric = {};
    await this.store.save('out', outIndex, result.state, detail ? { metric: saveMetric } : {});
    if (detail) {
      detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
      detail.outSetMs += Number(saveMetric.setMs || 0);
      detail.outPruneMs += Number(saveMetric.pruneMs || 0);
      detail.didSave = true;
      detail.path = 'manual-edit-rebuilt';
    }
    this.current = result.state;
    this.currentOutputIndex = outIndex;
    this.trustedOutputFingerprint = result.state.outputFingerprint || null;
    this.trustedHostOutputFingerprint = actualFingerprint;
    this.loadedFromLegacySnapshot = false;
    return { changed: true, mode: result.mode || result.state.lastMode, revision: result.state.manualEditRevision };
  }

  storageDiagnostics() { return this.store.keyScanStats(); }
  communityAliasDiagnostics() { return this.communityAliasRepairStats; }
  templateRecurrenceDiagnostics() { return this.templateRecurrenceBootstrapStats; }
  portableState() { return JSON.stringify(kernel.reconcileState(kernel.clone(this.current || kernel.initialState()))); }
}

module.exports = {
  CoreRulesetSession,
  latestUserIndex: kernel.latestUserIndex,
  latestUserText: kernel.latestUserText,
  renderRuntimePrompt,
  inspectPromptMessages: kernel.inspectPromptMessages,
  fingerprintText: kernel.fingerprintText,
  validateStructure: structure.validateStructure,
  communityBlocks: community.communityBlocks,
  prepareTurn: lifecycle.prepareTurn,
  recovery,
};
});

SimCore.define("ops", function (require, module, exports) {
function perfNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
function perfMs(start) { return Math.max(0, perfNow() - start); }
function normalizationIssues(state) {
  return (state?.community?.lastNormalization || []).map((x) =>
    `Reaction normalization ${x.platform}: ${x.mode} (${Number(x.generatedMin).toLocaleString('en-US')}..${Number(x.generatedMax).toLocaleString('en-US')} → ${Number(x.normalizedMin).toLocaleString('en-US')}..${Number(x.normalizedMax).toLocaleString('en-US')}, family historical ${Number(x.historicalFamilyMax ?? x.historicalMax ?? 0).toLocaleString('en-US')})`
  );
}
module.exports = { perfNow, perfMs, normalizationIssues };
});

(async () => {
  const coreRules = SimCore.require('session');
  const ops = SimCore.require('ops');
  let coreSession = null;
  let coreKey = null;
  let coreLocationKey = null;
  let lastCore = { active: false, mode: null, issues: [], diagnostics: [] };
  let lastPerf = null;
  let lastOutputPerf = null;
  let lastHistoryRestore = null;
  let lastNarrativeClockProbe = null;
  let lastTemplateRecurrenceProbe = null;
  let lastRequestLineageProbe = null;
  let lastCommunitySourceHandoffProbe = null;

  const { perfNow, perfMs } = ops;

  function textMessageContent(m) {
    if (!m) return '';
    const v = m.content ?? m.data ?? m.text ?? '';
    return typeof v === 'string' ? v : String(v || '');
  }

  async function currentIndices() {
    const [chaIdx, chatIdx] = await Promise.all([
      Risuai.getCurrentCharacterIndex(),
      Risuai.getCurrentChatIndex(),
    ]);
    return { chaIdx, chatIdx };
  }

  async function loadCoreForChat(chaIdx, chatIdx, chatArg = null) {
    const chat = chatArg || await Risuai.getChatFromIndex(chaIdx, chatIdx);
    if (!chat) { coreSession = null; coreKey = null; coreLocationKey = null; return null; }

    // The current indices + chat id are sufficient to prove that the already-loaded session still
    // belongs to this location. Avoid an extra getCharacter() round-trip on every request.
    const locationKey = `${chaIdx}:${chatIdx}:${chat.id ?? ''}`;
    if (coreSession && coreLocationKey === locationKey) return coreSession;

    const char = await Risuai.getCharacter();
    if (!char) { coreSession = null; coreKey = null; coreLocationKey = null; return null; }
    const charId = char.chaId ?? char.name;
    const chatId = chat.id ?? `${charId}:${chatIdx}`;
    const key = `${charId}:${chatId}`;
    if (coreSession && coreKey === key) {
      coreLocationKey = locationKey;
      return coreSession;
    }

    const backend = {
      get: (k) => Risuai.pluginStorage.getItem(k),
      set: (k, v) => Risuai.pluginStorage.setItem(k, v),
      remove: (k) => Risuai.pluginStorage.removeItem(k),
      keys: () => Risuai.pluginStorage.keys(),
    };
    coreSession = new coreRules.CoreRulesetSession(backend, {
      chatId,
      prefix: `sim:core:${key}`,
      keepN: 80,
    });
    coreKey = key;
    coreLocationKey = locationKey;

    const msgs = chat.message || [];
    let lastAssistant = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === 'char' || msgs[i]?.role === 'assistant') { lastAssistant = i; break; }
    }
    const latestOutputFingerprint = lastAssistant >= 0
      ? coreRules.fingerprintText(textMessageContent(msgs[lastAssistant]))
      : null;
    await coreSession.init(lastAssistant, chat.scriptstate?.['$simcore_core_state'] || null, latestOutputFingerprint);
    return coreSession;
  }

  async function mirrorCoreState(chaIdx, chatIdx, chatArg = null, perfDetail = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.chatLoadMs = 0;
      detail.prepareMs = 0;
      detail.setChatMs = 0;
    }
    if (!coreSession) return;
    try {
      let t = perfNow();
      const chat = chatArg || await Risuai.getChatFromIndex(chaIdx, chatIdx);
      if (detail) detail.chatLoadMs = perfMs(t);
      if (!chat) return;

      t = perfNow();
      chat.scriptstate = chat.scriptstate || {};
      chat.scriptstate['$simcore_core_state'] = coreSession.portableState();
      chat.scriptstate['$simcore_core_mode'] = coreSession.current?.lastMode || 'A';
      chat.scriptstate['$simcore_core_broadcast_locked'] = coreSession.current?.broadcastLocked ? '1' : '0';
      chat.scriptstate['$simcore_core_community_count'] = String(coreSession.current?.community?.activationCount || 0);
      chat.scriptstate['$simcore_core_age_offset'] = String(coreSession.current?.koreanAgeOffset || 0);
      delete chat.scriptstate['$simcore_core_reaction_global_max'];
      if (detail) detail.prepareMs = perfMs(t);

      t = perfNow();
      await Risuai.setChatToIndex(chaIdx, chatIdx, chat);
      if (detail) detail.setChatMs = perfMs(t);
    } catch (e) {
      console.log('[simcore/v0.62.27] state mirror failed:', e.message);
    }
  }

  async function reconcileManualEdit(cs, chat, perfDetail = null) {
    const msgs = chat?.message || [];
    let lastAssistant = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === 'char' || msgs[i]?.role === 'assistant') { lastAssistant = i; break; }
    }
    if (lastAssistant < 0) {
      if (perfDetail) perfDetail.path = 'no-assistant';
      return;
    }
    const r = await cs.reconcileEditedOutput(lastAssistant, textMessageContent(msgs[lastAssistant]), perfDetail);
    if (r.changed) console.log('[simcore/v0.62.27] manual edit reconciled:', lastAssistant, r.mode, r.revision);
  }

  async function prepareCoreRequest(messages, chaIdx, chatIdx, chat, sendIndex, perf = null) {
    let t = perfNow();
    const cs = await loadCoreForChat(chaIdx, chatIdx, chat);
    if (perf) perf.sessionLoadMs = perfMs(t);
    if (!cs) return { active: false };

    t = perfNow();
    const promptProbe = coreRules.inspectPromptMessages(messages, textMessageContent);
    if (perf) {
      perf.promptScanMs = perfMs(t);
      perf.promptScannedMessages = promptProbe.stats?.scannedMessages || 0;
      perf.promptTotalMessages = promptProbe.stats?.totalMessages || 0;
      perf.promptScannedChars = promptProbe.stats?.scannedChars || 0;
    }

    t = perfNow();
    if (promptProbe.active && cs.needsHistoryBootstrap) {
      const hist = chat?.message || [];
      let lastAssistant = -1;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i]?.role === 'char' || hist[i]?.role === 'assistant') { lastAssistant = i; break; }
      }
      // No completed assistant yet: bootstrap from an empty history so the current first user input
      // is not classified once here and then a second time in onSend. State mirroring is deliberately
      // deferred until output so no whole-chat write blocks model dispatch.
      await cs.bootstrapHistoryIfNeeded(lastAssistant >= 0 ? hist : [], lastAssistant);
    }
    if (perf) perf.bootstrapMs = perfMs(t);

    t = perfNow();
    const editDetail = perf ? {} : null;
    await reconcileManualEdit(cs, chat, editDetail);
    if (perf) {
      perf.editReconcileMs = perfMs(t);
      perf.editDetail = editDetail;
    }

    t = perfNow();
    const histForAlias = chat?.message || [];
    let aliasLastAssistant = -1;
    for (let i = histForAlias.length - 1; i >= 0; i--) {
      if (histForAlias[i]?.role === 'char' || histForAlias[i]?.role === 'assistant') { aliasLastAssistant = i; break; }
    }
    const aliasRepair = cs.migrateCommunityClassifierIfNeeded(histForAlias, aliasLastAssistant);
    if (perf) {
      perf.aliasRepairMs = perfMs(t);
      perf.aliasRepair = aliasRepair;
    }

    t = perfNow();
    const userText = coreRules.latestUserText(chat);
    const snapshotDetail = perf ? {} : null;
    const result = await cs.onSend(sendIndex, userText, promptProbe, snapshotDetail, chat?.message || []);
    if (perf) {
      perf.onSendMs = perfMs(t);
      perf.snapshotDetail = snapshotDetail;
    }
    if (snapshotDetail?.mustRestorePre && snapshotDetail?.existingPre) {
      lastHistoryRestore = {
        sendIndex,
        previousOutputIndex: Number(snapshotDetail.previousOutputIndex),
        reason: snapshotDetail.restoreReason || 'restore',
        at: Date.now(),
      };
    }

    if (result.active && result.promptBlock) {
      messages.push({ role: 'system', content: result.promptBlock });
      const pendingProbe = result.state.pending || null;
      if (pendingProbe && !/^B_/.test(String(pendingProbe.mode || ''))) {
        lastNarrativeClockProbe = {
          phase: 'pending',
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          outIndex: -1,
          previousMode: snapshotDetail?.previousMode || null,
          mode: pendingProbe.mode || null,
          guardActive: !!pendingProbe.narrativeClockGuard,
          trigger: pendingProbe.narrativeProgressionReason || 'none',
          previousAnchor: pendingProbe.narrativeTimestampPrevious || null,
          outputTimestamp: null,
          commitStatus: 'PENDING',
          commitReason: 'pending',
          at: Date.now(),
        };
      }
      if (pendingProbe) {
        lastTemplateRecurrenceProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          mode: pendingProbe.mode || null,
          modeFamily: pendingProbe.templateRecurrenceModeFamily || null,
          eligible: !!pendingProbe.templateRecurrenceEligible,
          repeated: !!pendingProbe.templateRecurrenceRepeated,
          normalizedChars: Number(pendingProbe.templateRecurrenceChars || 0),
          registrySize: Number(pendingProbe.templateRegistrySize || 0),
          bootstrap: snapshotDetail?.templateBootstrap || null,
          at: Date.now(),
        };
      } else {
        lastTemplateRecurrenceProbe = null;
      }
      if (pendingProbe) {
        const l = result.state.requestLineage || {};
        lastRequestLineageProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          currentMode: pendingProbe.mode || null,
          transitionFrom: l.transitionFrom || null,
          sourceKind: l.sourceKind || 'UNSEEDED',
          rootMode: l.rootMode || null,
          rootIndex: Number(l.rootIndex ?? -1),
          parentMode: l.parentMode || null,
          parentIndex: Number(l.parentIndex ?? -1),
          depth: Number(l.depth || 0),
          inlineSource: !!l.inlineSource,
          recentSources: Array.isArray(l.recentSources) ? l.recentSources.slice(-4) : [],
          at: Date.now(),
        };
      } else {
        lastRequestLineageProbe = null;
      }
      if (pendingProbe) {
        lastCommunitySourceHandoffProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          eligible: !!pendingProbe.communitySourceHandoffEligible,
          seen: !!pendingProbe.communitySourceHandoffSeen,
          newSource: !!pendingProbe.communitySourceHandoffNewSource,
          parentComparable: !!pendingProbe.communitySourceHandoffParentComparable,
          parentShift: !!pendingProbe.communitySourceHandoffParentShift,
          normalizedChars: Number(pendingProbe.communitySourceHandoffChars || 0),
          rootMode: pendingProbe.communitySourceHandoffRootMode || null,
          rootIndex: Number(pendingProbe.communitySourceHandoffRootIndex ?? -1),
          parentMode: pendingProbe.communitySourceHandoffParentMode || null,
          parentIndex: Number(pendingProbe.communitySourceHandoffParentIndex ?? -1),
          depth: Number(pendingProbe.communitySourceHandoffDepth ?? -1),
          priorRootMode: pendingProbe.communitySourceHandoffPriorRootMode || null,
          priorRootIndex: Number(pendingProbe.communitySourceHandoffPriorRootIndex ?? -1),
          priorParentMode: pendingProbe.communitySourceHandoffPriorParentMode || null,
          priorParentIndex: Number(pendingProbe.communitySourceHandoffPriorParentIndex ?? -1),
          priorDepth: Number(pendingProbe.communitySourceHandoffPriorDepth ?? -1),
          registrySize: Number(pendingProbe.communitySourceHandoffRegistrySize || 0),
          reason: pendingProbe.communitySourceHandoffReason || 'ineligible',
          at: Date.now(),
        };
      } else {
        lastCommunitySourceHandoffProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };
    } else {
      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };
    }
    // v0.62: do not call setChatToIndex on the request-critical path. The authoritative
    // pre/send snapshots are already persisted; scriptstate mirror is refreshed after output.
    return result;
  }

  async function processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf = null) {
    let t = perfNow();
    const cs = await loadCoreForChat(chaIdx, chatIdx, chat);
    if (perf) perf.sessionLoadMs = perfMs(t);
    if (!cs) return content;
    const outIndex = cs.resolveOutputIndex(fallbackOutIndex);

    const outputDetail = perf ? {} : null;
    t = perfNow();
    const result = await cs.processOutput(outIndex, content, outputDetail);
    if (perf) {
      perf.sessionProcessMs = perfMs(t);
      perf.outputDetail = outputDetail;
    }
    if (!result.active) return content;

    const issues = result.issues || [];
    const diagnostics = result.envelopeDiagnostics || [];
    if (issues.length) console.log('[simcore/v0.62.27] structure warnings:', issues.join(' / '));
    if (diagnostics.length) console.log('[simcore/v0.62.27] compatibility diagnostics:', diagnostics.join(' / '));

    const mirrorDetail = perf ? {} : null;
    t = perfNow();
    await mirrorCoreState(chaIdx, chatIdx, chat, mirrorDetail);
    if (perf) {
      perf.mirrorMs = perfMs(t);
      perf.mirrorDetail = mirrorDetail;
    }

    t = perfNow();
    const normalizationIssues = ops.normalizationIssues(result.state);
    if (normalizationIssues.length) console.log('[simcore/v0.62.27] reaction normalization:', normalizationIssues.join(' / '));
    if (result.narrativeClockProbe) {
      const priorProbe = lastNarrativeClockProbe && lastNarrativeClockProbe.sendIndex === result.narrativeClockProbe.sendIndex
        ? lastNarrativeClockProbe
        : null;
      lastNarrativeClockProbe = {
        ...result.narrativeClockProbe,
        phase: 'output',
        previousMode: priorProbe?.previousMode || null,
      };
    }
    const quarantineIssues = result.stateCommit?.communitySafe === false ? [result.stateCommit.reason] : [];
    lastCore = {
      active: true,
      mode: result.mode || result.state?.lastMode || null,
      issues: [...issues, ...quarantineIssues, ...normalizationIssues],
      diagnostics,
    };
    if (perf) perf.diagnosticsMs = perfMs(t);
    return result.content;
  }

  await Risuai.addRisuReplacer('beforeRequest', async (messages, type) => {
    if (type !== 'model') return messages;
    const totalStart = perfNow();
    const perf = {
      totalMs: 0, indicesMs: 0, chatLoadMs: 0, sessionLoadMs: 0, promptScanMs: 0,
      bootstrapMs: 0, editReconcileMs: 0, editDetail: null, aliasRepairMs: 0, aliasRepair: null, onSendMs: 0, snapshotDetail: null,
      promptScannedMessages: 0, promptTotalMessages: Array.isArray(messages) ? messages.length : 0, promptScannedChars: 0,
    };
    try {
      let t = perfNow();
      const { chaIdx, chatIdx } = await currentIndices();
      perf.indicesMs = perfMs(t);

      t = perfNow();
      const chat = await Risuai.getChatFromIndex(chaIdx, chatIdx);
      perf.chatLoadMs = perfMs(t);

      const detectedUserIndex = coreRules.latestUserIndex(chat);
      const sendIndex = detectedUserIndex >= 0
        ? detectedUserIndex
        : Math.max(0, (chat?.message?.length ?? 1) - 1);
      await prepareCoreRequest(messages, chaIdx, chatIdx, chat, sendIndex, perf);
    } catch (e) {
      console.log('[simcore/v0.62.27] beforeRequest error:', e.message);
    } finally {
      perf.totalMs = perfMs(totalStart);
      lastPerf = perf;
    }
    return messages;
  });

  await Risuai.addRisuScriptHandler('output', async (content) => {
    const totalStart = perfNow();
    const perf = {
      totalMs: 0, indicesMs: 0, chatLoadMs: 0, sessionLoadMs: 0, sessionProcessMs: 0,
      mirrorMs: 0, diagnosticsMs: 0, outputDetail: null, mirrorDetail: null,
    };
    try {
      let t = perfNow();
      const { chaIdx, chatIdx } = await currentIndices();
      perf.indicesMs = perfMs(t);

      t = perfNow();
      const chat = await Risuai.getChatFromIndex(chaIdx, chatIdx);
      perf.chatLoadMs = perfMs(t);

      const fallbackOutIndex = chat?.message?.length ?? 0;
      return await processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf);
    } catch (e) {
      console.log('[simcore/v0.62.27] output error:', e.message);
      return content;
    } finally {
      perf.totalMs = perfMs(totalStart);
      lastOutputPerf = perf;
    }
  });

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[c]));
  }

  async function openPanel() {
    try {
      const { chaIdx, chatIdx } = await currentIndices();
      const chat = await Risuai.getChatFromIndex(chaIdx, chatIdx);
      await loadCoreForChat(chaIdx, chatIdx, chat);
      const s = coreSession?.current;
      const storageDiag = coreSession?.storageDiagnostics?.() || null;
      const aliasDiag = coreSession?.communityAliasDiagnostics?.() || null;
      const recurrenceDiag = coreSession?.templateRecurrenceDiagnostics?.() || null;
      const maxima = Object.entries(s?.community?.platformMax || {})
        .map(([k, v]) => [k, Math.max(0, Math.round(Number(v) || 0))])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
      const rows = maxima.length
        ? maxima.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v.toLocaleString('en-US')}</td></tr>`).join('')
        : '<tr><td colspan="2" class="muted">아직 기록 없음</td></tr>';
      const broadcastClockRows = s?.broadcastLocked
        ? `<div><div class="k">Broadcast airtime</div><div class="v">${escapeHtml(s?.broadcastAirtime || 'unknown')}</div></div>
<div><div class="k">Airtime start</div><div class="v">${escapeHtml(s?.broadcastAirtimeStart || 'unknown')}</div></div>`
        : (s?.broadcastAirtime
          ? `<div><div class="k">Last broadcast airtime</div><div class="v">${escapeHtml(s.broadcastAirtime)}</div></div>`
          : '');
      const snap = lastPerf?.snapshotDetail || null;
      const currentSnapshotPath = !snap
        ? 'NO REQUEST DATA'
        : (!snap.mustRestorePre
          ? 'FORWARD · no restore'
          : (snap.existingPre
            ? `RESTORED · ${escapeHtml(snap.restoreReason || 'restore')}`
            : `MISS · ${escapeHtml(snap.restoreReason || 'restore')}`));
      const narrativeProbe = lastNarrativeClockProbe;
      const narrativeTransition = narrativeProbe
        ? `${narrativeProbe.previousMode || '?'} → ${narrativeProbe.mode || '?'}`
        : 'n/a';
      const narrativeGuardLabel = narrativeProbe ? (narrativeProbe.guardActive ? 'ON' : 'OFF') : 'n/a';
      const recurrenceLabel = lastTemplateRecurrenceProbe
        ? (lastTemplateRecurrenceProbe.eligible ? (lastTemplateRecurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE')
        : 'n/a';
      const lineageLabel = lastRequestLineageProbe
        ? (lastRequestLineageProbe.sourceKind === 'INLINE'
          ? 'INLINE SOURCE'
          : (lastRequestLineageProbe.sourceKind === 'UNSEEDED'
            ? 'UNSEEDED'
            : `${lastRequestLineageProbe.rootMode || '?'} → ${String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B')} · depth ${Number(lastRequestLineageProbe.depth || 0)}`))
        : 'n/a';
      const handoffLabel = lastCommunitySourceHandoffProbe
        ? (lastCommunitySourceHandoffProbe.newSource
          ? 'NEW SOURCE'
          : (lastCommunitySourceHandoffProbe.eligible
            ? (lastCommunitySourceHandoffProbe.seen ? 'SAME SOURCE' : 'FIRST')
            : 'INELIGIBLE'))
        : 'n/a';
      const parentShiftLabel = lastCommunitySourceHandoffProbe
        ? (lastCommunitySourceHandoffProbe.newSource
          ? 'NEW ROOT'
          : (!lastCommunitySourceHandoffProbe.eligible
            ? 'INELIGIBLE'
            : (!lastCommunitySourceHandoffProbe.seen
              ? 'FIRST'
              : (lastCommunitySourceHandoffProbe.parentShift
                ? 'NEW PARENT'
                : (lastCommunitySourceHandoffProbe.parentComparable ? 'SAME PARENT' : 'BASELINE')))))
        : 'n/a';
      document.body.innerHTML = `
<style>
body{margin:0;background:#0b1020;color:#e7ecf6;font:14px system-ui,sans-serif} .wrap{max-width:720px;margin:auto;padding:20px}
h1{font-size:18px;margin:0 0 14px}.card{background:#121a2d;border:1px solid #293754;border-radius:12px;padding:14px;margin:10px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.k{color:#9fb3d7;font-size:12px}.v{font-weight:700;margin-top:3px}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:7px;border-bottom:1px solid #26324a}th{color:#9fb3d7}.muted{color:#8291ad}
button{background:#263d73;color:white;border:1px solid #4564a2;border-radius:8px;padding:7px 11px;cursor:pointer}
.compact{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.metric{background:#0e1628;border:1px solid #23314d;border-radius:9px;padding:9px 10px}
details.card{padding:0}details.card>summary{cursor:pointer;padding:13px;font-weight:700;color:#dbe6fb;list-style:none}details.card>summary::-webkit-details-marker{display:none}details.card>summary:before{content:'▸';display:inline-block;width:18px;color:#9fb3d7}details.card[open]>summary:before{content:'▾'}.detail-body{padding:0 13px 13px}
</style><div class="wrap">
<h1>⚙️ SimCore v0.62.27 <button id="close">닫기</button></h1>
<div class="card grid">
<div><div class="k">Mode</div><div class="v">${escapeHtml(lastCore.mode || s?.lastMode || 'A')}</div></div>
<div><div class="k">Broadcast</div><div class="v">${s?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'}</div></div>
${broadcastClockRows}
<div><div class="k">Episode</div><div class="v">${Number(s?.episodeNo || 0)}</div></div>
<div><div class="k">Community blocks</div><div class="v">${Number(s?.community?.activationCount || 0)}</div></div>
<div><div class="k">Community classifier</div><div class="v">v${Number(s?.community?.classifierVersion || 0)}</div></div>
<div><div class="k">Reaction floor</div><div class="v">PER PLATFORM</div></div>
<div><div class="k">Korean age offset</div><div class="v">+${Number(s?.koreanAgeOffset || 0)}</div></div>
<div><div class="k">World year</div><div class="v">${s?.worldYear ?? 'unknown'}</div></div>
<div><div class="k">Narrative anchor</div><div class="v">${escapeHtml(s?.narrativeTimestamp || 'unknown')}</div></div>
<div><div class="k">Warnings</div><div class="v">${lastCore.issues.length}</div></div>
<div><div class="k">Compatibility diagnostics</div><div class="v">${(lastCore.diagnostics || []).length}</div></div>
</div>
<div class="card compact">
<div class="metric"><div class="k">Current snapshot path</div><div class="v">${currentSnapshotPath}</div></div>
<div class="metric"><div class="k">Narrative guard</div><div class="v">${narrativeGuardLabel}</div></div>
<div class="metric"><div class="k">Current-time floor</div><div class="v">${narrativeProbe?.floorApplied ? 'CLAMPED' : 'ON'}</div></div>
<div class="metric"><div class="k">Mode transition</div><div class="v">${escapeHtml(narrativeTransition)}</div></div>
<div class="metric"><div class="k">Template recurrence</div><div class="v">${recurrenceLabel}</div></div>
<div class="metric"><div class="k">Request lineage</div><div class="v">${escapeHtml(lineageLabel)}</div></div>
<div class="metric"><div class="k">Source handoff</div><div class="v">${escapeHtml(handoffLabel)}</div></div>
<div class="metric"><div class="k">Parent shift</div><div class="v">${escapeHtml(parentShiftLabel)}</div></div>
<div class="metric"><div class="k">Reference anchor</div><div class="v">ON · +2 lines</div></div>
<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>
<div class="metric"><div class="k">output</div><div class="v">${lastOutputPerf ? `${lastOutputPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>
</div>
${lastCore.issues.length ? `<div class="card"><div class="k" style="margin-bottom:8px">Latest warnings</div><div>${lastCore.issues.map((x) => `• ${escapeHtml(x)}`).join('<br>')}</div></div>` : ''}
${(lastCore.diagnostics || []).length ? `<div class="card"><div class="k" style="margin-bottom:8px">Compatibility diagnostics</div><div>${lastCore.diagnostics.map((x) => `• ${escapeHtml(x)}`).join('<br>')}</div></div>` : ''}
${lastTemplateRecurrenceProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Template recurrence guard (runtime)</div><div>${escapeHtml(recurrenceLabel)} · mode ${escapeHtml(lastTemplateRecurrenceProbe.modeFamily || '?')} · registry ${Number(lastTemplateRecurrenceProbe.registrySize || 0)}</div><div class="muted" style="margin-top:5px">template chars ${Number(lastTemplateRecurrenceProbe.normalizedChars || 0)} · ${lastTemplateRecurrenceProbe.repeated ? 'delta/variation hint injected' : 'no recurrence hint'}</div></div>` : ''}
${lastRequestLineageProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Request lineage probe (runtime)</div><div>${escapeHtml(lineageLabel)}</div><div class="muted" style="margin-top:5px">root ${escapeHtml(lastRequestLineageProbe.rootMode || 'none')}@${Number(lastRequestLineageProbe.rootIndex)} · parent ${escapeHtml(lastRequestLineageProbe.parentMode || 'none')}@${Number(lastRequestLineageProbe.parentIndex)} · transition ${escapeHtml(lastRequestLineageProbe.transitionFrom || '?')} → ${escapeHtml(String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B'))}</div><div class="muted" style="margin-top:5px">recent A/B ${escapeHtml((lastRequestLineageProbe.recentSources || []).map((x) => `${x.mode}@${x.index}`).join(' · ') || 'none')} · diagnostics only · prompt +0</div></div>` : ''}
${lastCommunitySourceHandoffProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Community source handoff (runtime)</div><div>${escapeHtml(handoffLabel)} · registry ${Number(lastCommunitySourceHandoffProbe.registrySize || 0)}</div><div class="muted" style="margin-top:5px">current ${escapeHtml(lastCommunitySourceHandoffProbe.rootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.rootIndex)} · prior ${escapeHtml(lastCommunitySourceHandoffProbe.priorRootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.priorRootIndex)} · request chars ${Number(lastCommunitySourceHandoffProbe.normalizedChars || 0)}</div><div class="muted" style="margin-top:5px">${lastCommunitySourceHandoffProbe.newSource ? '2-line current-source hint injected' : 'prompt +0'} · ${escapeHtml(lastCommunitySourceHandoffProbe.reason || 'ineligible')}</div></div>` : ''}
${lastCommunitySourceHandoffProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Community parent-shift probe (runtime)</div><div>${escapeHtml(parentShiftLabel)} · same-root follow-up diagnostics</div><div class="muted" style="margin-top:5px">current parent ${escapeHtml(lastCommunitySourceHandoffProbe.parentMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.parentIndex)} depth ${Number(lastCommunitySourceHandoffProbe.depth)} · prior parent ${escapeHtml(lastCommunitySourceHandoffProbe.priorParentMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.priorParentIndex)} depth ${Number(lastCommunitySourceHandoffProbe.priorDepth)}</div><div class="muted" style="margin-top:5px">diagnostics/state only · prompt +0 · no semantic decision</div></div>` : ''}
${recurrenceDiag ? `<div class="card"><div class="k" style="margin-bottom:8px">Template history bootstrap</div><div>DONE · ${Number(recurrenceDiag.registrySize || 0)} templates retained</div><div class="muted" style="margin-top:5px">${Number(recurrenceDiag.userMessages || 0)} user msgs · eligible A/B/C ${Number(recurrenceDiag.modeEligible?.A || 0)}/${Number(recurrenceDiag.modeEligible?.B || 0)}/${Number(recurrenceDiag.modeEligible?.C || 0)} · ${Number(recurrenceDiag.repeatedTemplates || 0)} historical repeats</div></div>` : ''}
${narrativeProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Narrative clock probe (runtime)</div><div>${escapeHtml(narrativeProbe.commitStatus || 'UNKNOWN')} · ${escapeHtml(narrativeTransition)} · guard ${narrativeProbe.guardActive ? 'ON' : 'OFF'}</div><div class="muted" style="margin-top:5px">trigger ${escapeHtml(narrativeProbe.trigger || 'none')} · previous ${escapeHtml(narrativeProbe.previousAnchor || 'unknown')} · observed ${escapeHtml(narrativeProbe.observedTimestamp || 'pending')} · committed ${escapeHtml(narrativeProbe.outputTimestamp || 'pending')}</div></div>` : ''}
${s?.lastNarrativeClockWarning ? `<div class="card"><div class="k" style="margin-bottom:8px">Narrative current-time floor</div><div>${s.lastNarrativeClockWarning.action === 'clamped' ? 'FLOOR CLAMPED' : 'REJECTED BACKWARD'} · ${escapeHtml(s.lastNarrativeClockWarning.rejected || 'unknown')}</div><div class="muted" style="margin-top:5px">floor ${escapeHtml(s.lastNarrativeClockWarning.previous || 'unknown')} · ${escapeHtml(s.lastNarrativeClockWarning.reason || 'forward')}</div></div>` : ''}
${lastHistoryRestore ? `<div class="card"><div class="k" style="margin-bottom:8px">Last snapshot restore (runtime)</div><div>RESTORED · ${escapeHtml(lastHistoryRestore.reason)} · send index ${Number(lastHistoryRestore.sendIndex)}</div><div class="muted" style="margin-top:5px">previous output index ${Number.isFinite(lastHistoryRestore.previousOutputIndex) ? Number(lastHistoryRestore.previousOutputIndex) : 'unknown'} · ${escapeHtml(new Date(lastHistoryRestore.at).toLocaleString())}</div></div>` : ''}
${lastPerf ? `<details class="card"><summary>beforeRequest performance · ${lastPerf.totalMs.toFixed(1)} ms</summary><div class="detail-body"><table>
<tr><td>Total</td><td>${lastPerf.totalMs.toFixed(1)} ms</td></tr>
<tr><td>Indices</td><td>${lastPerf.indicesMs.toFixed(1)} ms</td></tr>
<tr><td>Chat load</td><td>${lastPerf.chatLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Session load</td><td>${lastPerf.sessionLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Prompt scan</td><td>${lastPerf.promptScanMs.toFixed(1)} ms (${lastPerf.promptScannedMessages}/${lastPerf.promptTotalMessages} msgs, ${Number(lastPerf.promptScannedChars || 0).toLocaleString('en-US')} chars)</td></tr>
<tr><td>History bootstrap</td><td>${lastPerf.bootstrapMs.toFixed(1)} ms</td></tr>
<tr><td>Community alias repair</td><td>${Number(lastPerf.aliasRepairMs || 0).toFixed(1)} ms${lastPerf.aliasRepair?.skipped ? ' (already v2)' : ` (${Number(lastPerf.aliasRepair?.assistantScanned || 0)} assistant, ${Number(lastPerf.aliasRepair?.aliasSections || 0)} alias)`}</td></tr>
<tr><td>Edit reconcile</td><td>${lastPerf.editReconcileMs.toFixed(1)} ms${lastPerf.editDetail?.path ? ` (${escapeHtml(lastPerf.editDetail.path)})` : ''}</td></tr>
${lastPerf.editDetail ? `<tr><td>&nbsp;&nbsp;Fingerprint</td><td>${Number(lastPerf.editDetail.fingerprintMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Host compatibility</td><td>${Number(lastPerf.editDetail.compatibilityMs || 0).toFixed(1)} ms${lastPerf.editDetail.compatibilitySource ? ` (${escapeHtml(lastPerf.editDetail.compatibilitySource)})` : ''}</td></tr>
<tr><td>&nbsp;&nbsp;Saved out load</td><td>${Number(lastPerf.editDetail.savedOutLoadMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Send snapshot load</td><td>${Number(lastPerf.editDetail.sendLoadMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Envelope prepare</td><td>${Number(lastPerf.editDetail.prepareMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Finalize</td><td>${Number(lastPerf.editDetail.finalizeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Legacy clock repair</td><td>${Number(lastPerf.editDetail.clockRepairMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;State sync</td><td>${Number(lastPerf.editDetail.stateSyncMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Edit out serialize</td><td>${Number(lastPerf.editDetail.outSerializeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Edit out storage set</td><td>${Number(lastPerf.editDetail.outSetMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Edit snapshot prune</td><td>${Number(lastPerf.editDetail.outPruneMs || 0).toFixed(1)} ms${lastPerf.editDetail.didSave ? '' : ' (no save)'}</td></tr>` : ''}
<tr><td>Snapshot/onSend</td><td>${lastPerf.onSendMs.toFixed(1)} ms</td></tr>
${lastPerf.snapshotDetail ? `<tr><td>&nbsp;&nbsp;Pre restore/load</td><td>${Number(lastPerf.snapshotDetail.preLoadMs || 0).toFixed(1)} ms${lastPerf.snapshotDetail.mustRestorePre ? ` (${lastPerf.snapshotDetail.existingPre ? `restored:${escapeHtml(lastPerf.snapshotDetail.restoreReason || 'restore')}` : `miss:${escapeHtml(lastPerf.snapshotDetail.restoreReason || 'restore')}`})` : ' (forward skip)'}</td></tr>
<tr><td>&nbsp;&nbsp;Template bootstrap</td><td>${Number(lastPerf.snapshotDetail.templateBootstrapMs || 0).toFixed(1)} ms${lastPerf.snapshotDetail.templateBootstrap ? ` (${Number(lastPerf.snapshotDetail.templateBootstrap.userMessages || 0)} user, ${Number(lastPerf.snapshotDetail.templateBootstrap.communityInputs || 0)} community, ${Number(lastPerf.snapshotDetail.templateBootstrap.registrySize || 0)} retained)` : ' (skip)'}</td></tr>
<tr><td>&nbsp;&nbsp;Lifecycle prepare</td><td>${Number(lastPerf.snapshotDetail.lifecycleMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Turn serialize</td><td>${Number(lastPerf.snapshotDetail.turnSerializeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Turn storage set</td><td>${Number(lastPerf.snapshotDetail.turnSetMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Runtime render</td><td>${Number(lastPerf.snapshotDetail.runtimeRenderMs || 0).toFixed(1)} ms</td></tr>` : ''}
</table></div></details>` : ''}
${lastOutputPerf ? `<details class="card"><summary>output performance · ${lastOutputPerf.totalMs.toFixed(1)} ms</summary><div class="detail-body"><table>
<tr><td>Total</td><td>${lastOutputPerf.totalMs.toFixed(1)} ms</td></tr>
<tr><td>Indices</td><td>${lastOutputPerf.indicesMs.toFixed(1)} ms</td></tr>
<tr><td>Chat load</td><td>${lastOutputPerf.chatLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Session load</td><td>${lastOutputPerf.sessionLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Session/processOutput</td><td>${lastOutputPerf.sessionProcessMs.toFixed(1)} ms</td></tr>
${lastOutputPerf.outputDetail ? `<tr><td>&nbsp;&nbsp;State/send load</td><td>${Number(lastOutputPerf.outputDetail.stateLoadMs || 0).toFixed(1)} ms${lastOutputPerf.outputDetail.stateLoadSource ? ` (${escapeHtml(lastOutputPerf.outputDetail.stateLoadSource)})` : ''}</td></tr>
<tr><td>&nbsp;&nbsp;Recovery/prepare</td><td>${Number(lastOutputPerf.outputDetail.prepareMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Structure validate</td><td>${Number(lastOutputPerf.outputDetail.validateMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Finalize + fingerprint</td><td>${Number(lastOutputPerf.outputDetail.finalizeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Out serialize</td><td>${Number(lastOutputPerf.outputDetail.outSerializeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Out storage set</td><td>${Number(lastOutputPerf.outputDetail.outSetMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Snapshot prune / keys</td><td>${Number(lastOutputPerf.outputDetail.outPruneMs || 0).toFixed(1)} ms (${lastOutputPerf.outputDetail.pruneDeferred ? 'deferred scheduled' : 'skipped hot path'})</td></tr>
<tr><td>&nbsp;&nbsp;Output size</td><td>${Number(lastOutputPerf.outputDetail.inputChars || 0).toLocaleString('en-US')} → ${Number(lastOutputPerf.outputDetail.outputChars || 0).toLocaleString('en-US')} chars</td></tr>` : ''}
<tr><td>State mirror</td><td>${lastOutputPerf.mirrorMs.toFixed(1)} ms</td></tr>
${lastOutputPerf.mirrorDetail ? `<tr><td>&nbsp;&nbsp;Mirror chat load</td><td>${Number(lastOutputPerf.mirrorDetail.chatLoadMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Mirror prepare</td><td>${Number(lastOutputPerf.mirrorDetail.prepareMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;setChatToIndex</td><td>${Number(lastOutputPerf.mirrorDetail.setChatMs || 0).toFixed(1)} ms</td></tr>` : ''}
<tr><td>Post diagnostics</td><td>${lastOutputPerf.diagnosticsMs.toFixed(1)} ms</td></tr>
</table></div></details>` : ''}
${storageDiag ? `<div class="card"><div class="k" style="margin-bottom:8px">storage key scan (latest existing scan)</div><table>
<tr><td>Operation</td><td>${escapeHtml(storageDiag.op || 'unknown')}</td></tr>
<tr><td>Key scan</td><td>${Number(storageDiag.ms || 0).toFixed(1)} ms</td></tr>
<tr><td>Total plugin-storage keys</td><td>${Number(storageDiag.totalKeys || 0).toLocaleString('en-US')}</td></tr>
<tr><td>Current-chat SimCore keys</td><td>${storageDiag.currentChatKeys == null ? 'n/a' : Number(storageDiag.currentChatKeys || 0).toLocaleString('en-US')}</td></tr>
<tr><td>Operation-matching keys</td><td>${storageDiag.matchingKeys == null ? 'n/a' : Number(storageDiag.matchingKeys || 0).toLocaleString('en-US')}</td></tr>
</table><div class="muted" style="margin-top:8px">No extra keys() call is made for this panel; values come only from an existing cold/deferred scan.</div></div>` : `<div class="card muted">Storage key scan: no scan observed in this live session yet (fast path only).</div>`}
${aliasDiag ? `<div class="card"><div class="k" style="margin-bottom:8px">Community alias backfill (this live session)</div><table>
<tr><td>Assistant outputs scanned</td><td>${Number(aliasDiag.assistantScanned || 0)}</td></tr>
<tr><td>Alias sections found</td><td>${Number(aliasDiag.aliasSections || 0)}</td></tr>
<tr><td>Changed families</td><td>${escapeHtml((aliasDiag.changedFamilies || []).join(', ') || 'none')}</td></tr>
</table></div>` : ''}
<details class="card"><summary>Platform-family reaction_max · ${maxima.length} families</summary><div class="detail-body"><table><tr><th>Platform</th><th>Max</th></tr>${rows}</table></div></details>
<div class="card muted">v0.62.27 Reference Attention Anchor · character card + currently exposed lore pointer · +2 fixed prompt lines</div>
</div>`;
      document.getElementById('close').onclick = () => Risuai.hideContainer();
      await Risuai.showContainer('fullscreen');
    } catch (e) {
      console.log('[simcore/v0.62.27] panel error:', e.message);
    }
  }

  try {
    await Risuai.registerButton({ name: 'SimCore Lite', icon: '⚙️', iconType: 'html', location: 'chat' }, openPanel);
    await Risuai.registerSetting('SimCore v0.62.20', openPanel, '⚙️', 'html');
  } catch (e) {
    console.log('[simcore/v0.62.27] UI registration failed:', e.message);
  }

  await Risuai.onUnload(() => {
    coreSession = null;
    coreKey = null;
    coreLocationKey = null;
  });
  console.log('[simcore/v0.62.27] initialized');
})();
