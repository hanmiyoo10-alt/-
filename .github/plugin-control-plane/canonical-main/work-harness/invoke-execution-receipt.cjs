'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { HANDOFF_STATUSES, stableHash } = require('./handoff.cjs');

const MAX_INPUT_BYTES = 32 * 1024;
const MAX_REASON_CODES = 32;
const MAX_REASON_CODE_BYTES = 128;
const MAX_TEXT_BYTES = 320;
const MAX_STDERR_TAIL_BYTES = 1024;
const RESULT_STATUSES = Object.freeze(['NOT_EXECUTED', 'PASS', 'FAIL', 'INFRA_ERROR']);

const INPUT_FIELDS = new Set([
  'schemaVersion', 'handoff', 'result', 'sourceIdentity',
  'executionSurface', 'artifactLocator',
]);
const HANDOFF_FIELDS = new Set([
  'schemaVersion', 'mode', 'workId', 'scopeId', 'requiredCapability',
  'dispatchStatus', 'preflightDisposition', 'status', 'adapterId', 'route',
  'guards', 'reasonCodes', 'executionAuthorized', 'legalNextAction', 'handoffHash',
]);
const RESULT_FIELDS = new Set([
  'schemaVersion', 'mode', 'workId', 'handoffHash', 'adapterId', 'status',
  'executed', 'exitCode', 'signal', 'reasonCodes', 'stdout', 'stderr',
]);

function assertObject(value, field, allowedFields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowedFields.has(key)) throw new Error(`${field} contains unsupported field: ${key}`);
  }
}

function text(value, field, { maxBytes = MAX_TEXT_BYTES, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} missing`);
  const normalized = value.trim();
  if (Buffer.byteLength(normalized, 'utf8') > maxBytes) throw new Error(`${field} too large`);
  if (/[\u0000-\u001f\u007f]/.test(normalized)) throw new Error(`${field} contains control characters`);
  return normalized;
}

function reasonCodes(value, field) {
  if (!Array.isArray(value) || value.length > MAX_REASON_CODES) throw new Error(`${field} invalid`);
  return [...new Set(value.map((item, index) => {
    const code = text(item, `${field}[${index}]`, { maxBytes: MAX_REASON_CODE_BYTES });
    if (!/^[A-Z0-9][A-Z0-9_.:-]*$/.test(code)) throw new Error(`${field}[${index}] invalid`);
    return code;
  }))].sort();
}

function validateSourceIdentity(value) {
  assertObject(value, 'sourceIdentity', new Set(['kind', 'locator', 'identity']));
  return {
    kind: text(value.kind, 'sourceIdentity.kind'),
    locator: text(value.locator, 'sourceIdentity.locator'),
    identity: text(value.identity, 'sourceIdentity.identity'),
  };
}
function validateHandoff(handoff) {
  assertObject(handoff, 'handoff', HANDOFF_FIELDS);
  if (handoff.schemaVersion !== 1 || handoff.mode !== 'EXECUTOR_HANDOFF') {
    throw new Error('handoff schema or mode invalid');
  }
  const normalized = {
    ...handoff,
    workId: text(handoff.workId, 'handoff.workId', { maxBytes: 120 }),
    scopeId: text(handoff.scopeId, 'handoff.scopeId', { maxBytes: 120 }),
    requiredCapability: text(handoff.requiredCapability, 'handoff.requiredCapability', { maxBytes: 140 }),
    status: text(handoff.status, 'handoff.status'),
    adapterId: text(handoff.adapterId, 'handoff.adapterId', { maxBytes: 140, nullable: true }),
    handoffHash: text(handoff.handoffHash, 'handoff.handoffHash', { maxBytes: 64 }),
    reasonCodes: reasonCodes(handoff.reasonCodes, 'handoff.reasonCodes'),
  };
  if (!HANDOFF_STATUSES.includes(normalized.status)) throw new Error('handoff.status invalid');
  if (typeof handoff.executionAuthorized !== 'boolean') throw new Error('handoff.executionAuthorized invalid');
  if (!Array.isArray(handoff.guards) || handoff.guards.length > 32) throw new Error('handoff.guards invalid');
  for (let i = 0; i < handoff.guards.length; i += 1) text(handoff.guards[i], `handoff.guards[${i}]`);
  text(handoff.legalNextAction, 'handoff.legalNextAction');
  if (!/^[0-9a-f]{64}$/.test(normalized.handoffHash)) throw new Error('handoff.handoffHash invalid');
  const { handoffHash, ...hashable } = handoff;
  if (stableHash(hashable) !== normalized.handoffHash) throw new Error('handoff integrity hash invalid');
  return normalized;
}

function validateResult(result) {
  assertObject(result, 'result', RESULT_FIELDS);
  if (result.schemaVersion !== 1 || result.mode !== 'EXECUTOR_RESULT') {
    throw new Error('result schema or mode invalid');
  }
  const normalized = {
    ...result,
    workId: text(result.workId, 'result.workId', { maxBytes: 120 }),
    handoffHash: text(result.handoffHash, 'result.handoffHash', { maxBytes: 64 }),
    adapterId: text(result.adapterId, 'result.adapterId', { maxBytes: 140, nullable: true }),
    status: text(result.status, 'result.status'),
    reasonCodes: reasonCodes(result.reasonCodes, 'result.reasonCodes'),
  };
  if (!RESULT_STATUSES.includes(normalized.status)) throw new Error('result.status invalid');
  if (typeof result.executed !== 'boolean') throw new Error('result.executed invalid');
  if (result.exitCode !== null && !Number.isInteger(result.exitCode)) throw new Error('result.exitCode invalid');
  if (result.signal !== null && typeof result.signal !== 'string') throw new Error('result.signal invalid');
  if (typeof result.stdout !== 'string' || typeof result.stderr !== 'string') {
    throw new Error('result stdout/stderr invalid');
  }
  if (Buffer.byteLength(result.stdout, 'utf8') > 16 * 1024 || Buffer.byteLength(result.stderr, 'utf8') > 16 * 1024) {
    throw new Error('result stdout/stderr too large');
  }
  return normalized;
}

function utf8Tail(value, maxBytes = MAX_STDERR_TAIL_BYTES) {
  const chars = Array.from(String(value || ''));
  let bytes = 0;
  const kept = [];
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const size = Buffer.byteLength(chars[i], 'utf8');
    if (bytes + size > maxBytes) break;
    kept.push(chars[i]);
    bytes += size;
  }
  return kept.reverse().join('');
}

function unique(values) {
  return [...new Set(values)].sort();
}
function evidenceConflicts(handoff, result) {
  const conflicts = [];
  if (result.workId !== handoff.workId) conflicts.push('INVOKE_WORK_ID_MISMATCH');
  if (result.handoffHash !== handoff.handoffHash) conflicts.push('INVOKE_HANDOFF_HASH_MISMATCH');
  if (result.adapterId !== handoff.adapterId) conflicts.push('INVOKE_ADAPTER_ID_MISMATCH');

  const executable = handoff.status === 'HANDOFF_EXECUTABLE_READ_ONLY' && handoff.executionAuthorized === true;
  if (handoff.executionAuthorized === true && handoff.status !== 'HANDOFF_EXECUTABLE_READ_ONLY') {
    conflicts.push('INVOKE_AUTHORIZATION_STATUS_CONFLICT');
  }
  if (handoff.executionAuthorized === true && handoff.guards.length) {
    conflicts.push('INVOKE_AUTHORIZATION_GUARD_CONFLICT');
  }

  if (result.status === 'PASS') {
    if (!result.executed) conflicts.push('INVOKE_PASS_NOT_EXECUTED');
    if (!executable) conflicts.push('INVOKE_PASS_NOT_AUTHORIZED');
    if (result.exitCode !== 0) conflicts.push('INVOKE_PASS_EXIT_CONFLICT');
    if (result.signal !== null) conflicts.push('INVOKE_PASS_SIGNAL_CONFLICT');
  } else if (result.status === 'FAIL') {
    if (!result.executed) conflicts.push('INVOKE_FAIL_NOT_EXECUTED');
    if (!executable) conflicts.push('INVOKE_FAIL_NOT_AUTHORIZED');
    if (result.exitCode === null || result.exitCode === 0) conflicts.push('INVOKE_FAIL_EXIT_CONFLICT');
    if (result.signal !== null) conflicts.push('INVOKE_FAIL_SIGNAL_CONFLICT');
  } else if (result.status === 'INFRA_ERROR') {
    if (!executable) conflicts.push('INVOKE_INFRA_NOT_AUTHORIZED');
  } else if (result.status === 'NOT_EXECUTED') {
    if (result.executed) conflicts.push('INVOKE_NOT_EXECUTED_FLAG_CONFLICT');
    if (handoff.executionAuthorized) conflicts.push('INVOKE_NOT_EXECUTED_AUTH_CONFLICT');
    if (result.exitCode !== null) conflicts.push('INVOKE_NOT_EXECUTED_EXIT_CONFLICT');
    if (result.signal !== null) conflicts.push('INVOKE_NOT_EXECUTED_SIGNAL_CONFLICT');
  }
  return unique(conflicts);
}

function stateFor(handoff, result, conflicts) {
  if (conflicts.length) {
    return {
      attentionState: 'UNKNOWN',
      result: 'CONFLICT',
      stepResult: 'CONFLICT',
      reasonCodes: ['INVOKE_EVIDENCE_CONFLICT'],
      blockers: [],
      nextLegalAction: 'RESOLVE_INVOKE_EVIDENCE_CONFLICT',
    };
  }
  if (result.status === 'PASS') {
    return {
      attentionState: 'COMPLETE',
      result: 'PASS',
      stepResult: 'PASS',
      reasonCodes: [],
      blockers: [],
      nextLegalAction: 'INTERPRET_RECEIPT',
    };
  }
  if (result.status === 'FAIL') {
    return {
      attentionState: 'COMPLETE',
      result: 'FAIL',
      stepResult: 'FAIL',
      reasonCodes: unique(['INVOKE_RESULT_FAIL', ...result.reasonCodes]),
      blockers: [],
      nextLegalAction: 'DRILL_DOWN_INVOKE_FAILURE',
    };
  }
  if (result.status === 'INFRA_ERROR') {
    return {
      attentionState: 'BLOCKED',
      result: 'BLOCKED',
      stepResult: 'BLOCKED',
      reasonCodes: unique(['INVOKE_INFRA_ERROR', ...result.reasonCodes]),
      blockers: ['INVOKE_INFRA_ERROR'],
      nextLegalAction: 'RESOLVE_INVOKE_INFRA_ERROR',
    };
  }
  return {
    attentionState: 'BLOCKED',
    result: 'BLOCKED',
    stepResult: 'BLOCKED',
    reasonCodes: unique(['INVOKE_NOT_EXECUTED', ...result.reasonCodes]),
    blockers: ['HANDOFF_NOT_EXECUTION_AUTHORIZED'],
    nextLegalAction: 'RESOLVE_HANDOFF_BLOCK',
  };
}
function projectInvokeExecutionFacts(input) {
  assertObject(input, 'input', INPUT_FIELDS);
  if (input.schemaVersion !== 1) throw new Error('input schemaVersion must equal 1');
  const handoff = validateHandoff(input.handoff);
  const result = validateResult(input.result);
  const sourceIdentity = validateSourceIdentity(input.sourceIdentity);
  const executionSurface = text(input.executionSurface, 'executionSurface', { maxBytes: 160 });
  const artifactLocator = text(input.artifactLocator, 'artifactLocator', { maxBytes: 300 });

  const conflicts = evidenceConflicts(handoff, result);
  const state = stateFor(handoff, result, conflicts);
  const requiredUnknowns = handoff.adapterId === null ? ['ADAPTER_ID_UNKNOWN'] : [];
  const stderrTail = result.status === 'PASS' ? null : utf8Tail(result.stderr);
  const capability = handoff.requiredCapability;

  return {
    schemaVersion: 1,
    operationId: `work-harness-invoke:${handoff.workId}`,
    primitiveId: `work-harness:${handoff.adapterId || 'unresolved-adapter'}`,
    sourceIdentity,
    executionSurface,
    stage: 'AUDITED_READ_ONLY_INVOKE',
    attentionState: state.attentionState,
    result: state.result,
    proofScope: 'audited Work Harness read-only local invocation only',
    steps: [{
      name: `invoke:${capability}`,
      result: state.stepResult,
      evidenceLocator: artifactLocator,
    }],
    counters: [
      { name: 'executed', value: result.executed ? 1 : 0 },
      { name: 'execution_authorized', value: handoff.executionAuthorized ? 1 : 0 },
    ],
    affectedFiles: [],
    artifactLocators: [artifactLocator],
    reasonCodes: state.reasonCodes,
    requiredUnknowns,
    conflicts,
    blockers: state.blockers,
    exitCode: result.exitCode,
    stderrTail,
    nextLegalAction: state.nextLegalAction,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--input-file' || !argv[1]) {
    throw new Error('usage: node invoke-execution-receipt.cjs --input-file <path>');
  }
  return { inputFile: argv[1] };
}

function readInputFile(inputFile) {
  const resolved = path.resolve(inputFile);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('input-file must be a regular non-symlink file');
  if (stat.size > MAX_INPUT_BYTES) throw new Error(`input-file exceeds ${MAX_INPUT_BYTES} bytes`);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const facts = projectInvokeExecutionFacts(readInputFile(args.inputFile));
  process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  MAX_INPUT_BYTES,
  MAX_STDERR_TAIL_BYTES,
  RESULT_STATUSES,
  evidenceConflicts,
  parseArgs,
  projectInvokeExecutionFacts,
  run,
  utf8Tail,
};
