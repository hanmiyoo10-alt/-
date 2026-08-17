const fs = require('fs');

function moduleSnippet(source, name, nextName) {
  const start = source.indexOf(`SimCore.define("${name}", function (require, module, exports) {`);
  if (start < 0) throw new Error(`missing module ${name}`);
  const end = source.indexOf(`SimCore.define("${nextName}", function (require, module, exports) {`, start + 1);
  if (end < 0) throw new Error(`missing next module ${nextName}`);
  return source.slice(start, end);
}

function evaluateModule(snippet, deps) {
  let output = null;
  global.SimCore = {
    define(_name, fn) {
      const module = { exports: {} };
      fn((key) => deps[key], module, module.exports);
      output = module.exports;
    },
  };
  eval(snippet);
  delete global.SimCore;
  return output;
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
  if (currentStart >= 0) malformed = true;
  if (openCount !== closeCount) malformed = true;
  return { blocks, openCount, closeCount, malformed };
}

const COMMUNITY_RE = /<COMMUNITY(?:\s[^>]*)?>[\s\S]*?<\/COMMUNITY>/gi;
const kernel = {
  regexCount,
  scanKnowledgeBlocks,
  CONTROL_TAG_RE: /\[방송\s*(?:시작|중|종료)\]/g,
  KNOWLEDGE_RE: /<Knowledge>[\s\S]*?<\/Knowledge>/gi,
  stripControlTags(content) {
    this.CONTROL_TAG_RE.lastIndex = 0;
    return String(content || '').replace(this.CONTROL_TAG_RE, '').replace(/[ \t]+\n/g, '\n');
  },
};
const community = {
  COMMUNITY_RE,
  communityBlocks(content) { return String(content || '').match(COMMUNITY_RE) || []; },
  splitCommunity() { return []; },
  platformInfo() { return { group: null }; },
  sectionHeader() { return ''; },
  sectionCommunityParts() { return { titleMatch: null, markerCount: 0, body: '', commentsStart: -1, comments: '' }; },
  COMMUNITY_CLASSIFIER_VERSION: 2,
};
const reaction = {
  REACTION_RE: /\[(공감)\s+(\d+)\]/gi,
  REACTION_AT_END_RE: /\[(공감)\s+(\d+)\]\s*$/i,
  recordReactionMaxima() {},
};
const lifecycle = {
  expectedCommunityBlocks(mode) {
    return mode === 'B_END' ? 2 : (mode === 'B_START' || mode === 'B_CONTINUE' || mode === 'C') ? 1 : 0;
  },
  classifyMode() { return { mode: 'A', hasStart: false, hasEnd: false, hasContinue: false, hasCommunity: false, wasLocked: false }; },
};
const time = {
  parseTimestamp(content) {
    const m = String(content || '').match(/⏱️\[((?:19|20|21)\d{2})-(\d{2})-(\d{2})\s+\(([^)]+)\)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\]/i);
    return m ? { raw: m[0], year: Number(m[1]), minuteKey: 1 } : null;
  },
  timestampYear() { return null; },
  resetBroadcastAirtime() {},
  commitBroadcastAirtime() { return { changed: false }; },
  syncNarrativeTimestamp() { return false; },
  applyWorldYear() { return false; },
  explicitWorldYear() { return null; },
  CLOCK_REPAIR_VERSION: 2,
};

function loadRecovery(source) {
  const structure = evaluateModule(moduleSnippet(source, 'structure', 'recovery'), {
    './kernel': kernel,
    './community': community,
    './reaction': reaction,
    './lifecycle': lifecycle,
    './time': time,
  });
  return evaluateModule(moduleSnippet(source, 'recovery', 'prompt'), {
    './kernel': kernel,
    './lifecycle': lifecycle,
    './time': time,
    './community': community,
    './reaction': reaction,
    './structure': structure,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function eq(a, b, message) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${message}\nOLD ${JSON.stringify(a)}\nNEW ${JSON.stringify(b)}`);
  }
}

const beforeSource = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const afterSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');
const before = loadRecovery(beforeSource);
const after = loadRecovery(afterSource);
const pending = { active: true, mode: 'A' };

function response(label = 'ok') {
  return [
    '# 응답', '',
    '## 볼륨 65: 테스트',
    '### 챕터 2: 테스트',
    '#### Chatindex: 801∮',
    '⏱️[2029-06-14 (Thu) 03:00 PM]', '',
    label, '',
    '<Knowledge>ok</Knowledge>',
  ].join('\n');
}

const unsafeResponse = response('unsafe').replace('</Knowledge>', '');
const fixtures = [
  response('exact'),
  '\n \n\t' + response('whitespace'),
  '<Thoughts>\nSECRET_COMPLETE\n</Thoughts>\n' + response('thoughts-complete'),
  '<Thoughts>\nSECRET_PARTIAL\n' + response('thoughts-partial'),
  '<Thoughts type="host">\nATTR_PARTIAL\n</Thoughts>\n' + response('thoughts-attr'),
  '<Thoughts>OUTER<Thoughts>INNER</Thoughts></Thoughts>\n' + response('thoughts-nested'),
  'UNKNOWN_SECRET_WRAPPER\n' + response('unknown'),
  response('duplicate-one') + '\n\n' + response('duplicate-two'),
  'NO_RESPONSE_SECRET',
  'UNSAFE_PREFIX_SECRET\n' + unsafeResponse,
  '<Thoughts>\nPARTIAL_UNSAFE\n' + unsafeResponse,
];

const stableFields = (r) => ({
  content: r.content,
  repaired: r.repaired,
  issues: r.issues,
  diagnostics: r.diagnostics,
  candidateCount: r.candidateCount,
  selectedIndex: r.selectedIndex,
  resolved: r.resolved,
});

for (let i = 0; i < fixtures.length; i++) {
  const oldResult = before.canonicalizeResponseEnvelope(fixtures[i], pending);
  const newResult = after.canonicalizeResponseEnvelope(fixtures[i], pending);
  eq(stableFields(oldResult), stableFields(newResult), `fixture ${i}: Recovery behavior changed`);
}

let r = after.canonicalizeResponseEnvelope(fixtures[0], pending);
let p = r.preambleProvenance;
assert(p.kind === 'NONE' && p.action === 'NONE' && p.policy === 'NONE', 'A: NONE policy');

r = after.canonicalizeResponseEnvelope(fixtures[1], pending);
p = r.preambleProvenance;
assert(p.kind === 'WHITESPACE_ONLY' && p.action === 'IGNORED' && p.policy === 'IGNORE_WHITESPACE', 'B: whitespace policy');

r = after.canonicalizeResponseEnvelope(fixtures[2], pending);
p = r.preambleProvenance;
assert(p.kind === 'THOUGHTS_COMPAT' && p.action === 'STRIPPED' && p.policy === 'SILENT_COMPAT', 'C: complete Thoughts silent policy');
assert(r.issues.length === 0 && r.diagnostics.length === 0, 'C: complete Thoughts stays silent');
assert(!JSON.stringify(p).includes('SECRET_COMPLETE'), 'C: complete Thoughts text not retained');

r = after.canonicalizeResponseEnvelope(fixtures[3], pending);
p = r.preambleProvenance;
assert(p.kind === 'THOUGHTS_COMPAT' && p.action === 'STRIPPED' && p.policy === 'SAFE_ENVELOPE_COMPAT', 'D: partial Thoughts safe-envelope policy');
assert(r.issues.length === 0 && r.diagnostics.some((x) => x === 'Thoughts 호환 preamble 제거'), 'D: partial Thoughts compatibility diagnostic preserved');
assert(!JSON.stringify(p).includes('SECRET_PARTIAL'), 'D: partial Thoughts text not retained');

r = after.canonicalizeResponseEnvelope(fixtures[4], pending);
p = r.preambleProvenance;
assert(p.kind === 'THOUGHTS_COMPAT' && p.policy === 'SAFE_ENVELOPE_COMPAT', 'E: attributed Thoughts remains partial compatibility');
assert(r.diagnostics.some((x) => x === 'Thoughts 호환 preamble 제거'), 'E: attributed Thoughts diagnostic preserved');

r = after.canonicalizeResponseEnvelope(fixtures[5], pending);
p = r.preambleProvenance;
assert(p.kind === 'THOUGHTS_COMPAT' && p.policy === 'SAFE_ENVELOPE_COMPAT', 'F: nested Thoughts remains partial compatibility');
assert(r.diagnostics.some((x) => x === 'Thoughts 호환 preamble 제거'), 'F: nested Thoughts diagnostic preserved');

r = after.canonicalizeResponseEnvelope(fixtures[6], pending);
p = r.preambleProvenance;
assert(p.kind === 'UNKNOWN_TEXT' && p.action === 'STRIPPED' && p.policy === 'WARNING', 'G: unknown warning policy');
assert(r.issues.some((x) => x === '응답 envelope 앞 비정상 preamble 제거'), 'G: unknown warning preserved');
assert(!JSON.stringify(p).includes('UNKNOWN_SECRET_WRAPPER'), 'G: unknown text not retained');

r = after.canonicalizeResponseEnvelope(fixtures[7], pending);
p = r.preambleProvenance;
assert(p.kind === 'DUPLICATE_ENVELOPE' && p.action === 'SELECTED' && p.policy === 'SELECT_SAFE_CANDIDATE', 'H: duplicate selection policy');
assert(p.candidateCount === 2 && p.selectedCandidate === 2, 'H: duplicate candidate selection unchanged');
assert(r.issues.some((x) => x.includes('응답 envelope 중복 2개')), 'H: duplicate warning preserved');

r = after.canonicalizeResponseEnvelope(fixtures[8], pending);
p = r.preambleProvenance;
assert(p.kind === 'UNRESOLVED' && p.action === 'UNRESOLVED' && p.policy === 'FAIL_OPEN', 'I: missing response fail-open policy');
assert(!r.resolved && p.envelopeOffset === null, 'I: missing response remains unresolved');
assert(!JSON.stringify(p).includes('NO_RESPONSE_SECRET'), 'I: unresolved text not retained');

r = after.canonicalizeResponseEnvelope(fixtures[9], pending);
p = r.preambleProvenance;
assert(p.kind === 'UNKNOWN_TEXT' && p.action === 'UNRESOLVED' && p.policy === 'WARNING', 'J: unsafe unknown warning policy');
assert(!r.resolved && r.issues.some((x) => x === '응답 envelope 앞 비정상 preamble 감지'), 'J: unsafe unknown warning preserved');

r = after.canonicalizeResponseEnvelope(fixtures[10], pending);
p = r.preambleProvenance;
assert(p.kind === 'THOUGHTS_COMPAT' && p.action === 'UNRESOLVED' && p.policy === 'WARNING', 'K: partial Thoughts requires safe envelope');
assert(!r.resolved && r.issues.some((x) => x === '응답 envelope 앞 비정상 preamble 감지'), 'K: unsafe partial Thoughts remains warning');
assert(r.diagnostics.length === 0, 'K: unsafe partial Thoughts cannot be downgraded to compatibility');

const complete = after.classifyPreamble('<Thoughts>ok</Thoughts>\n', 1, true);
assert(complete.prefixKind === 'THOUGHTS_COMPAT' && complete.prefixPolicy === 'SILENT_COMPAT' && complete.thoughtsShape === 'COMPLETE', 'L: classifier complete shape');
const partial = after.classifyPreamble('<Thoughts>open only', 1, true);
assert(partial.prefixPolicy === 'SAFE_ENVELOPE_COMPAT' && partial.thoughtsShape === 'PARTIAL', 'L: classifier partial shape');

assert(!afterSource.includes('function isKnownThoughtsPreamble('), 'M: legacy complete Thoughts detector removed');
assert(!afterSource.includes('function isThoughtsCompatibilityPreamble('), 'M: legacy partial Thoughts detector removed');
assert(afterSource.includes('function classifyPreamble('), 'M: single classifier present');

console.log('SimCore 0.63.30 Thoughts compatibility differential fixtures: PASS');
