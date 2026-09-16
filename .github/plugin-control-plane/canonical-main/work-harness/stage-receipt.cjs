'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { canonicalize, stableHash } = require('./handoff.cjs');

const STAGES = Object.freeze([
  'AUTHORITY_SCOPE', 'IMPLEMENTATION_PR', 'VALIDATION_MERGE',
  'POSTMERGE_CONVERGENCE', 'EXPERIMENT_CLOSE',
]);
const PROOF_TERMS = Object.freeze([
  'IMPLEMENTED', 'CONTRACT_PROVEN', 'LIVE_PROVEN',
  'OBSERVATIONAL_PENDING', 'BLOCKED_CAPABILITY', 'DONE',
]);
const GATE_RESULTS = Object.freeze(['PASS', 'FAIL', 'UNKNOWN', 'CONFLICT', 'BLOCKED', 'NOT_APPLICABLE', 'EXPECTED_NO_RUN']);
const GATE_SATISFIED_RESULTS = Object.freeze(['PASS', 'NOT_APPLICABLE', 'EXPECTED_NO_RUN']);
const AUTHORITY_KINDS = Object.freeze(['GIT_REF', 'COMMIT', 'ISSUE', 'PR', 'WORKFLOW_RUN', 'FILE', 'OTHER']);
const MAX_INPUT_BYTES = 16384;
const MAX_RECEIPT_BYTES = 7168;
const MAX_RENDER_BYTES = 8192;
const MAX_ITEMS = 16;
const MAX_TEXT_BYTES = 320;
const TOP_FIELDS = new Set([
  'schemaVersion', 'packetNumber', 'stage', 'authorityRefs', 'requiredGates',
  'scope', 'proof', 'requiredUnknowns', 'conflicts', 'blockers', 'dependencies',
  'nextLegalAction',
]);
function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function sensitiveText(text) {
  return /(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text);
}

function atom(value, field, reasons, { required = false, maxBytes = MAX_TEXT_BYTES } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) reasons.push(`INPUT_FIELD_MISSING:${field}`);
    return null;
  }
  if (typeof value !== 'string') {
    reasons.push(`INPUT_FIELD_TYPE_INVALID:${field}`);
    return null;
  }
  const text = value.trim();
  if (!text) {
    if (required) reasons.push(`INPUT_FIELD_MISSING:${field}`);
    return null;
  }
  if (Buffer.byteLength(text, 'utf8') > maxBytes) reasons.push(`INPUT_FIELD_TOO_LARGE:${field}`);
  if (/[\u0000-\u001f\u007f]/.test(text)) reasons.push(`INPUT_FIELD_CONTROL_CHAR:${field}`);
  if (sensitiveText(text)) reasons.push(`INPUT_FIELD_SENSITIVE:${field}`);
  return text;
}
function objectKeys(value, allowed, field, reasons) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reasons.push(`INPUT_FIELD_TYPE_INVALID:${field}`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) reasons.push(`INPUT_FIELD_UNSUPPORTED:${field}.${key}`);
  }
  return true;
}

function list(value, field, reasons) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    reasons.push(`INPUT_FIELD_TYPE_INVALID:${field}`);
    return [];
  }
  if (value.length > MAX_ITEMS) reasons.push(`INPUT_FIELD_TOO_MANY_ITEMS:${field}`);
  return value.slice(0, MAX_ITEMS);
}

function stringList(value, field, reasons) {
  const rows = [];
  for (const [index, item] of list(value, field, reasons).entries()) {
    const text = atom(item, `${field}[${index}]`, reasons, { required: true });
    if (text) rows.push(text);
  }
  return uniqueSorted(rows);
}
function normalizeAuthorityRefs(value, reasons, unknowns, conflicts) {
  const byKey = new Map();
  for (const [index, row] of list(value, 'authorityRefs', reasons).entries()) {
    const field = `authorityRefs[${index}]`;
    if (!objectKeys(row, new Set(['kind', 'locator', 'identity']), field, reasons)) continue;
    const kind = atom(row.kind, `${field}.kind`, reasons, { required: true });
    const locator = atom(row.locator, `${field}.locator`, reasons, { required: true });
    let identity = atom(row.identity, `${field}.identity`, reasons);
    if (kind && !AUTHORITY_KINDS.includes(kind)) reasons.push(`INPUT_AUTHORITY_KIND_INVALID:${kind}`);
    if (kind === 'GIT_REF' || kind === 'COMMIT') {
      if (identity && !/^[0-9a-f]{40}$/i.test(identity)) reasons.push(`INPUT_AUTHORITY_SHA_INVALID:${field}`);
    }
    if (!kind || !locator) continue;
    if (!identity) {
      identity = 'UNKNOWN';
      unknowns.push(`AUTHORITY_IDENTITY_UNKNOWN:${kind}:${locator}`);
    }
    const normalized = { kind, locator, identity, status: identity === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN' };
    const key = `${kind}\u0000${locator}`;
    const previous = byKey.get(key);
    if (previous && previous.identity !== normalized.identity) {
      conflicts.push(`AUTHORITY_REF_CONFLICT:${kind}:${locator}`);
      byKey.set(key, { kind, locator, identity: 'CONFLICT', status: 'CONFLICT' });
    } else if (!previous) byKey.set(key, normalized);
  }
  const rows = [...byKey.values()].sort((a, b) => `${a.kind}:${a.locator}`.localeCompare(`${b.kind}:${b.locator}`));
  if (!rows.length) unknowns.push('AUTHORITY_REFS_MISSING');
  return rows;
}
function normalizeGates(value, reasons, unknowns, conflicts, blockers, reasonCodes) {
  const byName = new Map();
  for (const [index, row] of list(value, 'requiredGates', reasons).entries()) {
    const field = `requiredGates[${index}]`;
    if (!objectKeys(row, new Set(['name', 'result', 'evidenceLocator']), field, reasons)) continue;
    const name = atom(row.name, `${field}.name`, reasons, { required: true, maxBytes: 160 });
    let result = atom(row.result, `${field}.result`, reasons) || 'UNKNOWN';
    let evidenceLocator = atom(row.evidenceLocator, `${field}.evidenceLocator`, reasons);
    if (!GATE_RESULTS.includes(result)) reasons.push(`INPUT_GATE_RESULT_INVALID:${name || index}`);
    if (!name || !GATE_RESULTS.includes(result)) continue;
    if (result !== 'UNKNOWN' && !evidenceLocator) {
      const claimedResult = result;
      result = 'UNKNOWN';
      unknowns.push(`GATE_EVIDENCE_MISSING:${name}:${claimedResult}`);
    }
    if (!evidenceLocator) evidenceLocator = 'UNKNOWN';
    const normalized = { name, result, evidenceLocator };
    const previous = byName.get(name);
    if (previous && (previous.result !== result || previous.evidenceLocator !== evidenceLocator)) {
      conflicts.push(`GATE_CONFLICT:${name}`);
      byName.set(name, { name, result: 'CONFLICT', evidenceLocator: 'CONFLICT' });
    } else if (!previous) byName.set(name, normalized);
  }
  const rows = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) unknowns.push('REQUIRED_GATES_MISSING');
  for (const gate of rows) {
    if (gate.result === 'FAIL') reasonCodes.push(`GATE_FAILED:${gate.name}`);
    if (gate.result === 'UNKNOWN') unknowns.push(`GATE_UNKNOWN:${gate.name}`);
    if (gate.result === 'CONFLICT') conflicts.push(`GATE_CONFLICT:${gate.name}`);
    if (gate.result === 'BLOCKED') blockers.push(`GATE_BLOCKED:${gate.name}`);
  }
  return rows;
}

function normalizeRepoPath(value, field, reasons) {
  const text = atom(value, field, reasons, { required: true, maxBytes: 240 });
  if (!text) return null;
  if (text.startsWith('/') || text.includes('\\') || text.split('/').includes('..')) {
    reasons.push(`INPUT_SCOPE_PATH_INVALID:${field}`);
    return null;
  }
  return text;
}

function normalizeScope(value, reasons, unknowns, conflicts) {
  if (value === undefined || value === null) {
    unknowns.push('SCOPE_PATHS_MISSING', 'SCOPE_DIFF_APPLICABILITY_UNKNOWN');
    return { paths: [], diffRequired: null, diffIdentity: null, diffEvidenceLocator: null };
  }
  if (!objectKeys(value, new Set(['paths', 'diffRequired', 'diffIdentity', 'diffEvidenceLocator']), 'scope', reasons)) {
    return { paths: [], diffRequired: null, diffIdentity: null, diffEvidenceLocator: null };
  }
  const paths = [];
  for (const [index, item] of list(value.paths, 'scope.paths', reasons).entries()) {
    const normalized = normalizeRepoPath(item, `scope.paths[${index}]`, reasons);
    if (normalized) paths.push(normalized);
  }
  const stablePaths = uniqueSorted(paths);
  let diffRequired = value.diffRequired;
  if (diffRequired !== undefined && typeof diffRequired !== 'boolean') {
    reasons.push('INPUT_FIELD_TYPE_INVALID:scope.diffRequired');
    diffRequired = null;
  }
  if (diffRequired === undefined) diffRequired = null;
  if (!stablePaths.length && diffRequired !== false) unknowns.push('SCOPE_PATHS_MISSING');
  let diffIdentity = atom(value.diffIdentity, 'scope.diffIdentity', reasons, { maxBytes: 96 });
  let diffEvidenceLocator = atom(value.diffEvidenceLocator, 'scope.diffEvidenceLocator', reasons);
  if (diffIdentity && !/^[0-9a-f]{64}$/i.test(diffIdentity)) reasons.push('INPUT_SCOPE_DIFF_IDENTITY_INVALID');
  if (diffRequired === null) unknowns.push('SCOPE_DIFF_APPLICABILITY_UNKNOWN');
  if (diffRequired === true && !diffIdentity) unknowns.push('SCOPE_DIFF_IDENTITY_UNKNOWN');
  if (diffRequired === true && !diffEvidenceLocator) unknowns.push('SCOPE_DIFF_EVIDENCE_UNKNOWN');
  if (diffRequired === false && (diffIdentity || diffEvidenceLocator)) {
    conflicts.push('SCOPE_DIFF_NOT_APPLICABLE_CONFLICT');
  }
  if (!diffIdentity) diffIdentity = null;
  if (!diffEvidenceLocator) diffEvidenceLocator = null;
  return { paths: stablePaths, diffRequired, diffIdentity, diffEvidenceLocator };
}
function normalizeProof(value, reasons, unknowns) {
  const rows = [];
  for (const [index, row] of list(value, 'proof', reasons).entries()) {
    const field = `proof[${index}]`;
    if (!objectKeys(row, new Set(['term', 'evidenceLocator']), field, reasons)) continue;
    const term = atom(row.term, `${field}.term`, reasons, { required: true, maxBytes: 80 });
    const evidenceLocator = atom(row.evidenceLocator, `${field}.evidenceLocator`, reasons);
    if (term && !PROOF_TERMS.includes(term)) reasons.push(`INPUT_PROOF_TERM_INVALID:${term}`);
    if (!term || !PROOF_TERMS.includes(term)) continue;
    if (!evidenceLocator) {
      unknowns.push(`PROOF_EVIDENCE_MISSING:${term}`);
      continue;
    }
    rows.push({ term, evidenceLocator });
  }
  const keyed = new Map(rows.map((row) => [`${row.term}\u0000${row.evidenceLocator}`, row]));
  return [...keyed.values()].sort((a, b) => {
    const rank = PROOF_TERMS.indexOf(a.term) - PROOF_TERMS.indexOf(b.term);
    return rank || a.evidenceLocator.localeCompare(b.evidenceLocator);
  });
}

function invalidResult(reasons) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_STAGE_RECEIPT',
    status: 'INVALID',
    receiptDigest: null,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: uniqueSorted(reasons.length ? reasons : ['INPUT_INVALID']),
  };
}
function projectStageReceipt(input) {
  const reasons = [];
  if (!objectKeys(input, TOP_FIELDS, 'input', reasons)) return invalidResult(reasons);
  if (input.schemaVersion !== 1) reasons.push('INPUT_SCHEMA_UNSUPPORTED');
  if (!Number.isInteger(input.packetNumber) || input.packetNumber <= 0) reasons.push('INPUT_PACKET_NUMBER_INVALID');
  if (!STAGES.includes(input.stage)) reasons.push('INPUT_STAGE_INVALID');

  const unknowns = stringList(input.requiredUnknowns, 'requiredUnknowns', reasons);
  const conflicts = stringList(input.conflicts, 'conflicts', reasons);
  const blockers = stringList(input.blockers, 'blockers', reasons);
  const dependencies = stringList(input.dependencies, 'dependencies', reasons);
  const semanticFields = ['authorityRefs', 'requiredGates', 'scope', 'proof', 'requiredUnknowns', 'conflicts', 'blockers', 'dependencies'];
  for (const field of semanticFields) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) unknowns.push(`INPUT_FIELD_OMITTED:${field}`);
  }
  const reasonCodes = [];
  const authorityRefs = normalizeAuthorityRefs(input.authorityRefs, reasons, unknowns, conflicts);
  const requiredGates = normalizeGates(input.requiredGates, reasons, unknowns, conflicts, blockers, reasonCodes);
  const scope = normalizeScope(input.scope, reasons, unknowns, conflicts);
  let proof = normalizeProof(input.proof, reasons, unknowns);
  const nextLegalAction = atom(input.nextLegalAction, 'nextLegalAction', reasons);
  if (!nextLegalAction) unknowns.push('NEXT_LEGAL_ACTION_UNKNOWN');
  if (reasons.length) return invalidResult(reasons);

  let stableUnknowns = uniqueSorted(unknowns);
  let stableConflicts = uniqueSorted(conflicts);
  const stableBlockers = uniqueSorted(blockers);
  const stableDependencies = uniqueSorted(dependencies);
  const doneClaimed = proof.some((row) => row.term === 'DONE');
  const unresolvedForDone = stableUnknowns.length || stableConflicts.length || stableBlockers.length
    || requiredGates.some((gate) => !GATE_SATISFIED_RESULTS.includes(gate.result)) || !nextLegalAction;
  if (doneClaimed && unresolvedForDone) {
    proof = proof.filter((row) => row.term !== 'DONE');
    stableConflicts = uniqueSorted([...stableConflicts, 'PROOF_DONE_CONFLICTS_WITH_UNRESOLVED_EVIDENCE']);
    reasonCodes.push('PROOF_DONE_REJECTED');
  }

  const gateFailed = requiredGates.some((gate) => gate.result === 'FAIL');
  let status = 'PASS';
  if (stableConflicts.length) status = 'CONFLICT';
  else if (gateFailed) status = 'FAIL';
  else if (stableBlockers.length) status = 'BLOCKED';
  else if (stableUnknowns.length) status = 'UNKNOWN';
  if (stableUnknowns.length) reasonCodes.push('REQUIRED_UNKNOWN_PRESENT');
  if (stableConflicts.length) reasonCodes.push('CONFLICT_PRESENT');
  if (stableBlockers.length) reasonCodes.push('BLOCKER_PRESENT');

  const draft = {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_STAGE_RECEIPT',
    status,
    packetNumber: input.packetNumber,
    stage: input.stage,
    authorityRefs,
    requiredGates,
    scope,
    proof,
    requiredUnknowns: stableUnknowns,
    conflicts: stableConflicts,
    blockers: stableBlockers,
    dependencies: stableDependencies,
    nextLegalAction: nextLegalAction || 'UNKNOWN',
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: uniqueSorted(reasonCodes),
  };
  if (Buffer.byteLength(JSON.stringify(canonicalize(draft)), 'utf8') > MAX_RECEIPT_BYTES) {
    return invalidResult(['RECEIPT_TOO_LARGE']);
  }
  const receipt = { ...draft, receiptDigest: stableHash(draft) };
  try {
    if (Buffer.byteLength(renderStageReceipt(receipt), 'utf8') > MAX_RENDER_BYTES) {
      return invalidResult(['RECEIPT_RENDER_TOO_LARGE']);
    }
  } catch (error) {
    return invalidResult(['RECEIPT_RENDER_INVALID']);
  }
  return receipt;
}

function renderList(values) {
  return values.length ? values.join('; ') : 'NONE';
}

function renderStageReceipt(receipt) {
  if (!receipt || receipt.mode !== 'CANONICAL_MAIN_STAGE_RECEIPT' || receipt.status === 'INVALID' || !receipt.receiptDigest) {
    throw new Error('valid stage receipt required');
  }
  const refs = receipt.authorityRefs.map((row) => `${row.kind}:${row.locator}@${row.identity}[${row.status}]`);
  const gates = receipt.requiredGates.map((row) => `${row.name}=${row.result}@${row.evidenceLocator}`);
  const proof = receipt.proof.map((row) => `${row.term}@${row.evidenceLocator}`);
  const diff = receipt.scope.diffRequired === false
    ? 'NOT_APPLICABLE'
    : receipt.scope.diffRequired === true
      ? `${receipt.scope.diffIdentity || 'UNKNOWN'}@${receipt.scope.diffEvidenceLocator || 'UNKNOWN'}`
      : 'UNKNOWN';
  return [
    `<!-- canonical-main-stage-receipt:v1 digest=${receipt.receiptDigest} -->`,
    `## Canonical-main stage receipt — ${receipt.stage}`,
    '',
    `- packet: #${receipt.packetNumber}`,
    `- evidence status: \`${receipt.status}\``,
    `- authority refs: ${renderList(refs)}`,
    `- required gates: ${renderList(gates)}`,
    `- scope paths: ${renderList(receipt.scope.paths)}`,
    `- diff identity: ${diff}`,
    `- proof: ${renderList(proof)}`,
    `- required UNKNOWNs: ${renderList(receipt.requiredUnknowns)}`,
    `- conflicts: ${renderList(receipt.conflicts)}`,
    `- blockers: ${renderList(receipt.blockers)}`,
    `- dependencies: ${renderList(receipt.dependencies)}`,
    `- next legal action: \`${receipt.nextLegalAction}\``,
    '- mutationAuthorized: `false`',
    '- executionAuthorized: `false`',
    `- receipt digest: \`${receipt.receiptDigest}\``,
    '',
  ].join('\n');
}
function parseArgs(argv = process.argv.slice(2)) {
  const parsed = { format: 'json' };
  let formatSeen = false;
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!['--input-file', '--format'].includes(key) || value === undefined) {
      throw new Error('usage: node stage-receipt.cjs --input-file <path> [--format json|markdown]');
    }
    if (key === '--input-file') {
      if (parsed.inputFile) throw new Error('duplicate --input-file');
      parsed.inputFile = value;
    } else {
      if (formatSeen) throw new Error('duplicate --format');
      formatSeen = true;
      parsed.format = value;
    }
  }
  if (!parsed.inputFile) throw new Error('--input-file is required');
  if (!['json', 'markdown'].includes(parsed.format)) throw new Error('--format must be json or markdown');
  return parsed;
}

function readInputFile(inputFile) {
  const resolved = path.resolve(inputFile);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('input-file must be a regular non-symlink file');
  if (stat.size > MAX_INPUT_BYTES) throw new Error(`input-file exceeds ${MAX_INPUT_BYTES} bytes`);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}
function exitCodeFor(receipt) {
  if (receipt?.status === 'PASS') return 0;
  if (receipt?.status === 'UNKNOWN' || receipt?.status === 'BLOCKED') return 3;
  return 2;
}

function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const receipt = projectStageReceipt(readInputFile(args.inputFile));
  const output = args.format === 'markdown'
    ? (receipt.status === 'INVALID' ? JSON.stringify(canonicalize(receipt)) : renderStageReceipt(receipt))
    : JSON.stringify(canonicalize(receipt), null, 2);
  return { receipt, output };
}

function main() {
  try {
    const { receipt, output } = run();
    process.stdout.write(`${output}\n`);
    process.exitCode = exitCodeFor(receipt);
  } catch {
    const receipt = invalidResult(['RUNTIME_ERROR']);
    process.stdout.write(`${JSON.stringify(canonicalize(receipt))}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  AUTHORITY_KINDS,
  GATE_RESULTS,
  GATE_SATISFIED_RESULTS,
  MAX_INPUT_BYTES,
  MAX_RECEIPT_BYTES,
  MAX_RENDER_BYTES,
  PROOF_TERMS,
  STAGES,
  exitCodeFor,
  invalidResult,
  parseArgs,
  projectStageReceipt,
  readInputFile,
  renderStageReceipt,
  run,
};
