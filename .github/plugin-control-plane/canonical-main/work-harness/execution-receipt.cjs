'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { canonicalize, stableHash } = require('./handoff.cjs');

const ATTENTION_STATES = Object.freeze([
  'RUNNING', 'COMPLETE', 'NEEDS_REVIEW', 'BLOCKED', 'UNKNOWN',
]);
const EXECUTION_LIFECYCLES = Object.freeze([
  'QUEUED', 'RUNNING', 'FINISHED', 'UNKNOWN',
]);
const ATTENTION_DISPOSITIONS = Object.freeze([
  'COMPLETE', 'NEEDS_REVIEW', 'BLOCKED', 'UNKNOWN', 'CONFLICT',
]);
const RESULTS = Object.freeze([
  'PASS', 'FAIL', 'PARTIAL', 'UNKNOWN', 'CONFLICT', 'BLOCKED',
]);
const STEP_RESULTS = Object.freeze([
  'PASS', 'FAIL', 'PARTIAL', 'UNKNOWN', 'CONFLICT', 'BLOCKED', 'SKIPPED',
]);
const MAX_INPUT_BYTES = 16 * 1024;
const MAX_RECEIPT_BYTES = 8 * 1024;
const MAX_ITEMS = 32;
const MAX_TEXT_BYTES = 320;
const MAX_STDERR_TAIL_BYTES = 1024;
const TOP_FIELDS = new Set([
  'schemaVersion', 'operationId', 'primitiveId', 'sourceIdentity',
  'executionSurface', 'stage', 'attentionState', 'result', 'proofScope',
  'steps', 'counters', 'affectedFiles', 'artifactLocators', 'reasonCodes',
  'requiredUnknowns', 'conflicts', 'blockers', 'exitCode', 'stderrTail',
  'nextLegalAction',
]);
const TOP_FIELDS_V2 = new Set([
  'schemaVersion', 'operationId', 'primitiveId', 'sourceIdentity',
  'executionSurface', 'stage', 'executionLifecycle', 'attentionDisposition',
  'result', 'proofScope', 'steps', 'counters', 'affectedFiles',
  'artifactLocators', 'reasonCodes', 'requiredUnknowns', 'conflicts',
  'blockers', 'exitCode', 'stderrTail', 'nextLegalAction',
]);

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}
function sensitiveText(text) {
  return /(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text);
}

function atom(value, field, reasons, { required = false, maxBytes = MAX_TEXT_BYTES, allowNewlines = false } = {}) {
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
  const controlPattern = allowNewlines
    ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
    : /[\u0000-\u001f\u007f]/;
  if (controlPattern.test(text)) reasons.push(`INPUT_FIELD_CONTROL_CHAR:${field}`);
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
function list(value, field, reasons, maxItems = MAX_ITEMS) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    reasons.push(`INPUT_FIELD_TYPE_INVALID:${field}`);
    return [];
  }
  if (value.length > maxItems) reasons.push(`INPUT_FIELD_TOO_MANY_ITEMS:${field}`);
  return value.slice(0, maxItems);
}

function stringList(value, field, reasons, maxItems = MAX_ITEMS) {
  const rows = [];
  for (const [index, item] of list(value, field, reasons, maxItems).entries()) {
    const text = atom(item, `${field}[${index}]`, reasons, { required: true });
    if (text) rows.push(text);
  }
  return uniqueSorted(rows);
}

function normalizeSourceIdentity(value, reasons, unknowns) {
  if (value === undefined || value === null) {
    unknowns.push('SOURCE_IDENTITY_MISSING');
    return { kind: 'UNKNOWN', locator: 'UNKNOWN', identity: 'UNKNOWN', status: 'UNKNOWN' };
  }
  if (!objectKeys(value, new Set(['kind', 'locator', 'identity']), 'sourceIdentity', reasons)) {
    return { kind: 'UNKNOWN', locator: 'UNKNOWN', identity: 'UNKNOWN', status: 'UNKNOWN' };
  }
  const kind = atom(value.kind, 'sourceIdentity.kind', reasons) || 'UNKNOWN';
  const locator = atom(value.locator, 'sourceIdentity.locator', reasons) || 'UNKNOWN';
  const identity = atom(value.identity, 'sourceIdentity.identity', reasons) || 'UNKNOWN';
  if ([kind, locator, identity].includes('UNKNOWN')) unknowns.push('SOURCE_IDENTITY_UNKNOWN');
  return {
    kind,
    locator,
    identity,
    status: [kind, locator, identity].includes('UNKNOWN') ? 'UNKNOWN' : 'KNOWN',
  };
}
function normalizeSteps(value, reasons, unknowns, conflicts) {
  const byName = new Map();
  for (const [index, row] of list(value, 'steps', reasons, 24).entries()) {
    const field = `steps[${index}]`;
    if (!objectKeys(row, new Set(['name', 'result', 'evidenceLocator']), field, reasons)) continue;
    const name = atom(row.name, `${field}.name`, reasons, { required: true, maxBytes: 160 });
    const result = atom(row.result, `${field}.result`, reasons, { required: true });
    let evidenceLocator = atom(row.evidenceLocator, `${field}.evidenceLocator`, reasons);
    if (result && !STEP_RESULTS.includes(result)) reasons.push(`INPUT_STEP_RESULT_INVALID:${name || index}`);
    if (!name || !result || !STEP_RESULTS.includes(result)) continue;
    if (!evidenceLocator && !['SKIPPED', 'UNKNOWN'].includes(result)) {
      unknowns.push(`STEP_EVIDENCE_MISSING:${name}`);
    }
    if (!evidenceLocator) evidenceLocator = 'UNKNOWN';
    const normalized = { name, result, evidenceLocator };
    const previous = byName.get(name);
    if (previous && (previous.result !== result || previous.evidenceLocator !== evidenceLocator)) {
      conflicts.push(`STEP_CONFLICT:${name}`);
      byName.set(name, { name, result: 'CONFLICT', evidenceLocator: 'CONFLICT' });
    } else if (!previous) {
      byName.set(name, normalized);
    }
  }
  const rows = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) unknowns.push('STEPS_MISSING');
  return rows;
}

function normalizeCounters(value, reasons, conflicts) {
  const byName = new Map();
  for (const [index, row] of list(value, 'counters', reasons, 24).entries()) {
    const field = `counters[${index}]`;
    if (!objectKeys(row, new Set(['name', 'value']), field, reasons)) continue;
    const name = atom(row.name, `${field}.name`, reasons, { required: true, maxBytes: 160 });
    if (!Number.isSafeInteger(row.value) || row.value < 0) {
      reasons.push(`INPUT_COUNTER_VALUE_INVALID:${name || index}`);
      continue;
    }
    if (!name) continue;
    const previous = byName.get(name);
    if (previous !== undefined && previous !== row.value) {
      conflicts.push(`COUNTER_CONFLICT:${name}`);
      byName.set(name, null);
    } else if (previous === undefined) {
      byName.set(name, row.value);
    }
  }
  return [...byName.entries()]
    .map(([name, value]) => ({ name, value, status: value === null ? 'CONFLICT' : 'KNOWN' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeRepoPath(value, field, reasons) {
  const text = atom(value, field, reasons, { required: true, maxBytes: 240 });
  if (!text) return null;
  if (text.startsWith('/') || text.includes('\\') || text.split('/').includes('..')) {
    reasons.push(`INPUT_AFFECTED_PATH_INVALID:${field}`);
    return null;
  }
  return text;
}

function normalizeAffectedFiles(value, reasons) {
  const rows = [];
  for (const [index, item] of list(value, 'affectedFiles', reasons).entries()) {
    const normalized = normalizeRepoPath(item, `affectedFiles[${index}]`, reasons);
    if (normalized) rows.push(normalized);
  }
  return uniqueSorted(rows);
}
function normalizeExitCode(value, reasons) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
    reasons.push('INPUT_EXIT_CODE_INVALID');
    return null;
  }
  return value;
}

function invalidResult(reasons, schemaVersion = 1) {
  return {
    schemaVersion,
    mode: 'REPOSITORY_EXECUTION_RECEIPT',
    validity: 'INVALID',
    receiptDigest: null,
    mutationAuthorized: false,
    executionAuthorized: false,
    mergeAuthorized: false,
    releaseAuthorized: false,
    productionAuthorized: false,
    runtimeAuthorityGranted: false,
    securityAuthorityGranted: false,
    reasonCodes: uniqueSorted(reasons.length ? reasons : ['INPUT_INVALID']),
  };
}

function projectExecutionReceipt(input) {
  const reasons = [];
  const isV2 = Boolean(input && typeof input === 'object' && !Array.isArray(input) && input.schemaVersion === 2);
  const schemaVersion = isV2 ? 2 : 1;
  const topFields = isV2 ? TOP_FIELDS_V2 : TOP_FIELDS;
  if (!objectKeys(input, topFields, 'input', reasons)) return invalidResult(reasons, schemaVersion);
  if (!isV2 && input.schemaVersion !== 1) reasons.push('INPUT_SCHEMA_UNSUPPORTED');

  const operationId = atom(input.operationId, 'operationId', reasons, { required: true, maxBytes: 160 });
  const primitiveId = atom(input.primitiveId, 'primitiveId', reasons, { required: true, maxBytes: 160 });
  const executionSurface = atom(input.executionSurface, 'executionSurface', reasons, { required: true, maxBytes: 160 });
  const stage = atom(input.stage, 'stage', reasons, { required: true, maxBytes: 160 });
  const attentionState = isV2 ? null : atom(input.attentionState, 'attentionState', reasons, { required: true });
  const executionLifecycle = isV2
    ? atom(input.executionLifecycle, 'executionLifecycle', reasons, { required: true })
    : null;
  const attentionDisposition = isV2
    ? atom(input.attentionDisposition, 'attentionDisposition', reasons, { required: true })
    : null;
  const suppliedResult = atom(input.result, 'result', reasons, { required: true });
  const proofScope = atom(input.proofScope, 'proofScope', reasons, { required: true });
  const nextLegalAction = atom(input.nextLegalAction, 'nextLegalAction', reasons);

  if (attentionState && !ATTENTION_STATES.includes(attentionState)) reasons.push('INPUT_ATTENTION_STATE_INVALID');
  if (executionLifecycle && !EXECUTION_LIFECYCLES.includes(executionLifecycle)) {
    reasons.push('INPUT_EXECUTION_LIFECYCLE_INVALID');
  }
  if (attentionDisposition && !ATTENTION_DISPOSITIONS.includes(attentionDisposition)) {
    reasons.push('INPUT_ATTENTION_DISPOSITION_INVALID');
  }
  if (suppliedResult && !RESULTS.includes(suppliedResult)) reasons.push('INPUT_RESULT_INVALID');

  const unknowns = stringList(input.requiredUnknowns, 'requiredUnknowns', reasons);
  const conflicts = stringList(input.conflicts, 'conflicts', reasons);
  const blockers = stringList(input.blockers, 'blockers', reasons);
  const reasonCodes = stringList(input.reasonCodes, 'reasonCodes', reasons);
  const sourceIdentity = normalizeSourceIdentity(input.sourceIdentity, reasons, unknowns);
  const steps = normalizeSteps(input.steps, reasons, unknowns, conflicts);
  for (const step of steps) {
    if (step.result === 'UNKNOWN') unknowns.push(`STEP_UNKNOWN:${step.name}`);
    if (step.result === 'CONFLICT') conflicts.push(`STEP_CONFLICT:${step.name}`);
    if (step.result === 'BLOCKED') blockers.push(`STEP_BLOCKED:${step.name}`);
    if (suppliedResult === 'PASS' && step.result === 'FAIL') conflicts.push(`PASS_CONFLICTS_WITH_STEP_FAIL:${step.name}`);
    if (suppliedResult === 'PASS' && step.result === 'PARTIAL') unknowns.push(`PASS_HAS_PARTIAL_STEP:${step.name}`);
  }
  const counters = normalizeCounters(input.counters, reasons, conflicts);
  const affectedFiles = normalizeAffectedFiles(input.affectedFiles, reasons);
  const artifactLocators = stringList(input.artifactLocators, 'artifactLocators', reasons, 16);
  const exitCode = normalizeExitCode(input.exitCode, reasons);
  const stderrTail = atom(input.stderrTail, 'stderrTail', reasons, {
    maxBytes: MAX_STDERR_TAIL_BYTES,
    allowNewlines: true,
  });

  if (!nextLegalAction) unknowns.push('NEXT_LEGAL_ACTION_UNKNOWN');
  const needsReview = isV2
    ? attentionDisposition === 'NEEDS_REVIEW'
    : attentionState === 'NEEDS_REVIEW';
  if ((needsReview || suppliedResult !== 'PASS') && !reasonCodes.length) {
    unknowns.push('REASON_CODE_MISSING');
  }
  if (suppliedResult === 'PASS' && exitCode !== null && exitCode !== 0) {
    conflicts.push('PASS_CONFLICTS_WITH_NONZERO_EXIT');
  }
  if (!isV2) {
    if (attentionState === 'RUNNING' && suppliedResult && !['PARTIAL', 'UNKNOWN'].includes(suppliedResult)) {
      conflicts.push('RUNNING_CONFLICTS_WITH_TERMINAL_RESULT');
    }
    if (attentionState === 'BLOCKED' && suppliedResult && !['BLOCKED', 'UNKNOWN'].includes(suppliedResult)) {
      conflicts.push('BLOCKED_ATTENTION_CONFLICTS_WITH_RESULT');
    }
    if (attentionState === 'COMPLETE' && suppliedResult === 'BLOCKED') {
      conflicts.push('COMPLETE_CONFLICTS_WITH_BLOCKED_RESULT');
    }
    if (attentionState === 'UNKNOWN' && suppliedResult === 'PASS') {
      unknowns.push('ATTENTION_STATE_UNKNOWN');
    }
  } else {
    if (['QUEUED', 'RUNNING'].includes(executionLifecycle)
        && suppliedResult && ['PASS', 'FAIL'].includes(suppliedResult)) {
      conflicts.push(`${executionLifecycle}_CONFLICTS_WITH_TERMINAL_RESULT`);
    }
    if (executionLifecycle === 'UNKNOWN' && suppliedResult === 'PASS') {
      unknowns.push('EXECUTION_LIFECYCLE_UNKNOWN');
    }
    if (attentionDisposition === 'BLOCKED'
        && suppliedResult && !['BLOCKED', 'UNKNOWN'].includes(suppliedResult)) {
      conflicts.push('BLOCKED_DISPOSITION_CONFLICTS_WITH_RESULT');
    }
    if (attentionDisposition === 'CONFLICT' && suppliedResult !== 'CONFLICT') {
      conflicts.push('CONFLICT_DISPOSITION_CONFLICTS_WITH_RESULT');
    }
    if (attentionDisposition === 'COMPLETE' && suppliedResult === 'BLOCKED') {
      conflicts.push('COMPLETE_DISPOSITION_CONFLICTS_WITH_BLOCKED_RESULT');
    }
    if (attentionDisposition === 'UNKNOWN' && suppliedResult === 'PASS') {
      unknowns.push('ATTENTION_DISPOSITION_UNKNOWN');
    }
  }

  if (reasons.length) return invalidResult(reasons, schemaVersion);

  const stableUnknowns = uniqueSorted(unknowns);
  const stableConflicts = uniqueSorted(conflicts);
  const stableBlockers = uniqueSorted(blockers);
  let result = suppliedResult;
  if (result === 'PASS') {
    if (stableConflicts.length) result = 'CONFLICT';
    else if (stableBlockers.length) result = 'BLOCKED';
    else if (stableUnknowns.length) result = 'UNKNOWN';
  }
  if (isV2 && stableConflicts.length && result !== 'CONFLICT') result = 'CONFLICT';

  const draft = {
    schemaVersion,
    mode: 'REPOSITORY_EXECUTION_RECEIPT',
    validity: 'VALID',
    operationId,
    primitiveId,
    sourceIdentity,
    executionSurface,
    stage,
    ...(isV2
      ? { executionLifecycle, attentionDisposition }
      : { attentionState }),
    result,
    proofScope,
    steps,
    counters,
    affectedFiles,
    artifactLocators,
    reasonCodes,
    requiredUnknowns: stableUnknowns,
    conflicts: stableConflicts,
    blockers: stableBlockers,
    exitCode,
    stderrTail: stderrTail || null,
    nextLegalAction: nextLegalAction || 'UNKNOWN',
    mutationAuthorized: false,
    executionAuthorized: false,
    mergeAuthorized: false,
    releaseAuthorized: false,
    productionAuthorized: false,
    runtimeAuthorityGranted: false,
    securityAuthorityGranted: false,
  };
  if (Buffer.byteLength(JSON.stringify(canonicalize(draft)), 'utf8') > MAX_RECEIPT_BYTES) {
    return invalidResult(['RECEIPT_TOO_LARGE'], schemaVersion);
  }
  return { ...draft, receiptDigest: stableHash(draft) };
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--input-file' || !argv[1]) {
    throw new Error('usage: node execution-receipt.cjs --input-file <path>');
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

function exitCodeFor(receipt) {
  if (receipt?.validity !== 'VALID') return 2;
  if (receipt.schemaVersion === 2) {
    if (receipt.executionLifecycle === 'FINISHED'
        && receipt.attentionDisposition === 'COMPLETE'
        && receipt.result === 'PASS') return 0;
    if (['FAIL', 'CONFLICT'].includes(receipt.result)) return 2;
    return 3;
  }
  if (receipt.attentionState === 'COMPLETE' && receipt.result === 'PASS') return 0;
  if (['FAIL', 'CONFLICT'].includes(receipt.result)) return 2;
  return 3;
}
function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const receipt = projectExecutionReceipt(readInputFile(args.inputFile));
  process.stdout.write(`${JSON.stringify(canonicalize(receipt), null, 2)}\n`);
  return exitCodeFor(receipt);
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
  ATTENTION_DISPOSITIONS,
  ATTENTION_STATES,
  EXECUTION_LIFECYCLES,
  MAX_INPUT_BYTES,
  MAX_RECEIPT_BYTES,
  MAX_STDERR_TAIL_BYTES,
  RESULTS,
  STEP_RESULTS,
  exitCodeFor,
  parseArgs,
  projectExecutionReceipt,
  run,
};
