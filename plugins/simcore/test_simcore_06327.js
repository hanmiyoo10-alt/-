const fs = require('fs');
const source = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

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
};
const reaction = {
  REACTION_RE: /\[(공감)\s+(\d+)\]/gi,
  REACTION_AT_END_RE: /\[(공감)\s+(\d+)\]\s*$/i,
};
const lifecycle = {
  expectedCommunityBlocks(mode) {
    return mode === 'B_END' ? 2 : (mode === 'B_START' || mode === 'B_CONTINUE' || mode === 'C') ? 1 : 0;
  },
};
const time = {
  parseTimestamp(content) {
    const m = String(content || '').match(/⏱️\[((?:19|20|21)\d{2})-(\d{2})-(\d{2})\s+\(([^)]+)\)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\]/i);
    if (!m) return null;
    return { raw: m[0], minuteKey: 1, year: Number(m[1]) };
  },
  timestampYear() { return null; },
  resetBroadcastAirtime() {},
  commitBroadcastAirtime() { return { changed: false }; },
  syncNarrativeTimestamp() { return false; },
  applyWorldYear() { return false; },
  explicitWorldYear() { return null; },
  CLOCK_REPAIR_VERSION: 2,
};

function moduleSnippet(name, nextName) {
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

const structure = evaluateModule(moduleSnippet('structure', 'recovery'), {
  './kernel': kernel,
  './community': community,
  './reaction': reaction,
  './lifecycle': lifecycle,
  './time': time,
});
const recovery = evaluateModule(moduleSnippet('recovery', 'prompt'), {
  './kernel': kernel,
  './lifecycle': lifecycle,
  './time': time,
  './community': community,
  './reaction': reaction,
  './structure': structure,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function response(body = '', knowledge = '<Knowledge>ok</Knowledge>') {
  return `# 응답\n\n## 볼륨 65: 테스트\n### 챕터 2: 테스트\n#### Chatindex: 801∮\n⏱️[2029-06-14 (Thu) 03:15 PM]\n\n${body}${body ? '\n\n' : ''}${knowledge}`;
}

let raw = response();
assert(structure.responseEnvelopeIntegrity(raw, { mode: 'A' }).safe, 'A: single frame timestamp must pass');

raw = response('장면 1\n\n⏱️[2029-06-14 (Thu) 07:30 PM]\n\n장면 2');
assert(structure.responseEnvelopeIntegrity(raw, { mode: 'A' }).safe, 'B: one body timestamp must pass');
assert(!structure.validateStructure(raw, { active: true, mode: 'A' }).some((x) => x.includes('timestamp 중복')), 'B: body timestamp must not be duplicate frame timestamp');

raw = response('장면 1\n\n⏱️[2029-06-14 (Thu) 04:00 PM]\n\n장면 2\n\n⏱️[2029-06-14 (Thu) 05:00 PM]\n\n장면 3');
assert(structure.responseEnvelopeIntegrity(raw, { mode: 'A' }).safe, 'C: multiple body timestamps must pass');
assert(!structure.validateStructure(raw, { active: true, mode: 'A' }).some((x) => x.includes('timestamp 중복')), 'C: multiple body timestamps must not warn duplicate');

raw = response().replace('⏱️[2029-06-14 (Thu) 03:15 PM]\n\n', '');
assert(!structure.responseEnvelopeIntegrity(raw, { mode: 'A' }).frameOk, 'D: missing frame timestamp must fail');
assert(structure.validateStructure(raw, { active: true, mode: 'A' }).some((x) => x === '공통 timestamp 누락'), 'D: missing timestamp warning preserved');

raw = response().replace('### 챕터 2: 테스트\n#### Chatindex: 801∮', '#### Chatindex: 801∮\n### 챕터 2: 테스트');
assert(!structure.responseEnvelopeIntegrity(raw, { mode: 'A' }).frameOk, 'E: broken frame order must fail');
assert(structure.validateStructure(raw, { active: true, mode: 'A' }).some((x) => x === '공통 frame 순서 오류'), 'E: broken frame order warning');

raw = '<Knowledge>host-prefix-noise\n' + response('정상 본문\n\n⏱️[2029-06-14 (Thu) 07:30 PM]');
let integrity = structure.responseEnvelopeIntegrity(raw, { mode: 'A' });
assert(integrity.safe, 'G/H: valid canonical envelope must ignore preamble tag noise');
assert(integrity.knowledge.openCount === 1 && integrity.knowledge.closeCount === 1, 'H: Knowledge count must be canonical-envelope scoped');
assert(structure.stateCommitSafety(raw, { mode: 'A' }, true).communitySafe, 'G: canonical envelope may commit when resolved');
let prepared = recovery.prepareOutput(raw, { active: true, mode: 'A' });
assert(prepared.envelope.resolved, 'G: Recovery must resolve valid canonical envelope');
assert(prepared.content.startsWith('# 응답'), 'G: Recovery must remove pre-envelope noise from processed output');
assert(prepared.envelope.issues.some((x) => x.includes('응답 envelope 앞 비정상 preamble 제거')), 'G: abnormal preamble warning must remain separate');

raw = response('', '<Knowledge><Knowledge>broken</Knowledge>');
integrity = structure.responseEnvelopeIntegrity(raw, { mode: 'A' });
assert(!integrity.knowledgeOk, 'I: genuine malformed Knowledge inside envelope must fail');
assert(structure.validateStructure(raw, { active: true, mode: 'A' }).some((x) => x.includes('<Knowledge> 태그 구조 오류')), 'I: malformed Knowledge warning preserved');

console.log('SimCore 0.63.27 envelope fixtures: PASS');
