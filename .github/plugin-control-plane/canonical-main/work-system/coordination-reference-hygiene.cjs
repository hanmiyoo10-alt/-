const fs = require('node:fs');

const TERMINAL_STATES = new Set(['DONE', 'CANCELLED', 'SUPERSEDED']);
const NONTERMINAL_STATES = new Set(['READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'BLOCKED']);
const LIFECYCLE_STATES = new Set([...TERMINAL_STATES, ...NONTERMINAL_STATES]);
const NATIVE_STATES = new Set(['open', 'closed']);
const MAX_PROSE_BYTES = 64 * 1024;
const MAX_PACKETS = 128;
const MAX_FINDINGS = 64;

const REASON_CODES = Object.freeze({
  TERMINAL_PACKET_IN_CURRENT_ROLE: 'TERMINAL_PACKET_IN_CURRENT_ROLE',
  CURRENT_PACKET_EVIDENCE_MISSING: 'CURRENT_PACKET_EVIDENCE_MISSING',
  PACKET_LIFECYCLE_EVIDENCE_MISSING: 'PACKET_LIFECYCLE_EVIDENCE_MISSING',
  PACKET_NATIVE_LIFECYCLE_CONFLICT: 'PACKET_NATIVE_LIFECYCLE_CONFLICT',
  CURRENT_PACKET_NONTERMINAL: 'CURRENT_PACKET_NONTERMINAL',
  HISTORICAL_TERMINAL_REFERENCE: 'HISTORICAL_TERMINAL_REFERENCE',
  HISTORICAL_REFERENCE: 'HISTORICAL_REFERENCE',
});

const HISTORICAL_ROLE = /\b(latest\s+completed|completed|historical|legacy|prior|previous)\b/i;
const CURRENT_ROLE_PATTERNS = [
  ['ACTIVE_WRITER', /\bactive[- ]writer(?:\s+projection)?\s*[:=-]?/i],
  ['CURRENT_OWNER', /\bcurrent\s+owner\s*[:=-]?/i],
  ['CURRENT_PACKET', /\bcurrent\s+packet\s*[:=-]?/i],
  ['NEXT_CANDIDATE', /\bnext\s+candidate\s*[:=-]?/i],
  ['NEXT_PACKET', /\bnext\s+packet\s*[:=-]?/i],
  ['COORDINATION_BLOCKER', /\b(?:current\s+|coordination\s+)?blocker\s*[:=-]/i],
];

function boundedExcerpt(line) {
  return line.trim().replace(/\s+/g, ' ').slice(0, 240);
}

function normalizeLifecycle(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
}

function normalizeNative(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

function packetIndex(packets) {
  const index = new Map();
  for (const packet of packets) {
    if (!packet || !Number.isInteger(packet.issueNumber) || packet.issueNumber <= 0) {
      throw new TypeError('packet issueNumber must be a positive integer');
    }
    if (index.has(packet.issueNumber)) throw new TypeError('packet issueNumber must be unique');
    const nativeState = normalizeNative(packet.nativeState);
    if (nativeState !== null && !NATIVE_STATES.has(nativeState)) {
      throw new TypeError('packet nativeState must be open or closed when supplied');
    }
    const lifecycleState = normalizeLifecycle(packet.lifecycleState);
    if (lifecycleState !== null && !LIFECYCLE_STATES.has(lifecycleState)) {
      throw new TypeError('packet lifecycleState is not a registered Work System state');
    }
    index.set(packet.issueNumber, {issueNumber: packet.issueNumber, nativeState, lifecycleState});
  }
  return index;
}

function evidenceDisposition(packet) {
  if (!packet) return {kind: 'UNKNOWN', code: REASON_CODES.CURRENT_PACKET_EVIDENCE_MISSING};
  const lifecycle = packet.lifecycleState;
  if (!lifecycle) return {kind: 'UNKNOWN', code: REASON_CODES.PACKET_LIFECYCLE_EVIDENCE_MISSING};
  const terminal = TERMINAL_STATES.has(lifecycle);
  if (packet.nativeState === 'open' && terminal) {
    return {kind: 'CONFLICT', code: REASON_CODES.PACKET_NATIVE_LIFECYCLE_CONFLICT};
  }
  if (packet.nativeState === 'closed' && !terminal) {
    return {kind: 'CONFLICT', code: REASON_CODES.PACKET_NATIVE_LIFECYCLE_CONFLICT};
  }
  return terminal
    ? {kind: 'TERMINAL', code: REASON_CODES.TERMINAL_PACKET_IN_CURRENT_ROLE}
    : {kind: 'NONTERMINAL', code: REASON_CODES.CURRENT_PACKET_NONTERMINAL};
}

function currentRoleReferences(line) {
  const refs = [];
  for (const [role, pattern] of CURRENT_ROLE_PATTERNS) {
    const match = line.match(new RegExp(`${pattern.source}\\s*#(\\d+)\\b`, pattern.flags));
    if (match) refs.push({role, issueNumber: Number(match[1]), index: match.index});
  }
  return refs;
}

function issueNumbers(line) {
  return [...line.matchAll(/#(\d+)\b/g)].map((match) => Number(match[1]));
}

function makeFinding({issueNumber, lineNumber, line, role, disposition, code}) {
  return {issueNumber, line: lineNumber, excerpt: boundedExcerpt(line), role, disposition, code};
}

function classifyCoordinationReferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  if (typeof input.prose !== 'string') throw new TypeError('prose must be a string');
  if (Buffer.byteLength(input.prose, 'utf8') > MAX_PROSE_BYTES) throw new RangeError('prose exceeds bounded size');
  if (!Array.isArray(input.packets)) throw new TypeError('packets must be an array');
  if (input.packets.length > MAX_PACKETS) throw new RangeError('packets exceeds bounded count');

  const packets = packetIndex(input.packets);
  const findings = [];
  const lines = input.prose.split(/\r?\n/);

  for (let index = 0; index < lines.length && findings.length < MAX_FINDINGS; index += 1) {
    const line = lines[index];
    const currentRefs = currentRoleReferences(line);
    const historicalMatch = line.match(HISTORICAL_ROLE);
    const firstCurrentIndex = currentRefs.length > 0 ? Math.min(...currentRefs.map((ref) => ref.index)) : Infinity;
    const historical = historicalMatch && historicalMatch.index <= firstCurrentIndex;
    const refs = historical
      ? issueNumbers(line).map((issueNumber) => ({role: 'HISTORICAL', issueNumber}))
      : currentRefs;
    for (const ref of refs) {
      if (findings.length >= MAX_FINDINGS) break;
      const evidence = evidenceDisposition(packets.get(ref.issueNumber));
      if (historical) {
        const code = evidence.kind === 'TERMINAL' ? REASON_CODES.HISTORICAL_TERMINAL_REFERENCE : REASON_CODES.HISTORICAL_REFERENCE;
        findings.push(makeFinding({issueNumber: ref.issueNumber, lineNumber: index + 1, line, role: ref.role, disposition: 'PASS', code}));
        continue;
      }
      const disposition = evidence.kind === 'TERMINAL' ? 'STALE' : evidence.kind === 'NONTERMINAL' ? 'PASS' : evidence.kind;
      findings.push(makeFinding({issueNumber: ref.issueNumber, lineNumber: index + 1, line, role: ref.role, disposition, code: evidence.code}));
    }
  }

  const dispositions = new Set(findings.map((item) => item.disposition));
  const state = dispositions.has('CONFLICT')
    ? 'CONFLICT'
    : dispositions.has('STALE')
      ? 'STALE'
      : dispositions.has('UNKNOWN')
        ? 'UNKNOWN'
        : 'PASS';

  return {
    schemaVersion: 1,
    state,
    findings,
    truncated: findings.length >= MAX_FINDINGS,
    mutationAuthorized: false,
    networkAuthorized: false,
  };
}

function readCliInput(filePath) {
  const raw = filePath ? fs.readFileSync(filePath, 'utf8') : fs.readFileSync(0, 'utf8');
  return JSON.parse(raw);
}

if (require.main === module) {
  const result = classifyCoordinationReferences(readCliInput(process.argv[2]));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.state === 'STALE') process.exitCode = 1;
  else if (result.state === 'UNKNOWN') process.exitCode = 2;
  else if (result.state === 'CONFLICT') process.exitCode = 3;
}

module.exports = {
  REASON_CODES,
  classifyCoordinationReferences,
};
