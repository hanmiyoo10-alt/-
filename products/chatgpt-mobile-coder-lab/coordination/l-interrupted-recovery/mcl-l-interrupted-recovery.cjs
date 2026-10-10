#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const recovery = require(path.join(
  ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/effect-recovery/effect-recovery.cjs'
));

const SCHEMA = 'mcl-l-interrupted-recovery-composition.v1';
const MODE = 'MCL_L_INTERRUPTED_RECOVERY_COMPOSITION';
const MAX_INPUT_BYTES = 16 * 1024;
const MAX_TEXT_BYTES = 320;
const MAX_SOURCE_REFS = 16;

const TOP_LEVEL_KEYS = new Set([
  'schemaVersion',
  'mode',
  'recoveryFacts',
  'sessionEvidence',
  'sessionEvidenceLocator',
  'sourceRefs',
]);

const RECOVERY_FACT_KEYS = new Set([
  'schemaVersion',
  'mode',
  'subject',
  'packetState',
  'leaseState',
  'manifestState',
  'holderState',
  'workspaceState',
  'dirtyScopeState',
  'gitIdentityState',
  'remoteBranchState',
  'prState',
  'releaseEligibility',
  'locators',
]);

const RECOVERY_LOCATOR_KEYS = new Set([
  'packet',
  'lease',
  'manifest',
  'holder',
  'workspace',
  'dirtyScope',
  'gitIdentity',
  'remoteBranch',
  'pr',
  'releaseEligibility',
]);

const SESSION_KEYS = new Set([
  'schema',
  'status',
  'executor',
  'sessionState',
  'reasonCode',
  'owner',
  'details',
  'authority',
]);

const SESSION_AUTHORITY_KEYS = new Set([
  'repositoryMutationAuthorized',
  'deviceMutationAuthorized',
  'mergeAuthorized',
  'releaseAuthorized',
  'productionAuthorized',
]);

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  executionAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
  runtimeAuthorityGranted: false,
  securityAuthorityGranted: false,
});

class CompositionInputError extends Error {
  constructor(reasonCodes) {
    super(reasonCodes[0] || 'COMPOSITION_INPUT_INVALID');
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function sensitiveText(text) {
  return /(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text);
}

function exactKeys(value, allowed, field, reasons) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reasons.push('INPUT_OBJECT_REQUIRED:' + field);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) reasons.push('INPUT_FIELD_UNSUPPORTED:' + field + '.' + key);
  }
  for (const key of allowed) {
    if (!(key in value)) reasons.push('INPUT_FIELD_MISSING:' + field + '.' + key);
  }
  return true;
}

function boundedAtom(value, field, reasons, maxBytes = MAX_TEXT_BYTES) {
  if (typeof value !== 'string' || !value.trim()) {
    reasons.push('INPUT_FIELD_INVALID:' + field);
    return null;
  }
  const text = value.trim();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    reasons.push('INPUT_FIELD_TOO_LARGE:' + field);
  }
  if (/[\u0000-\u001f\u007f]/.test(text)) {
    reasons.push('INPUT_FIELD_CONTROL_CHAR:' + field);
  }
  if (sensitiveText(text)) {
    reasons.push('INPUT_FIELD_SENSITIVE:' + field);
  }
  return text;
}

function normalizeSourceRefs(value, reasons) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SOURCE_REFS) {
    reasons.push('INPUT_SOURCE_REFS_INVALID');
    return [];
  }
  const refs = [];
  for (let index = 0; index < value.length; index += 1) {
    const ref = boundedAtom(value[index], 'sourceRefs[' + index + ']', reasons, 160);
    if (ref) refs.push(ref);
  }
  return [...new Set(refs)].sort();
}

function normalizeRecoveryFacts(value, reasons) {
  if (!exactKeys(value, RECOVERY_FACT_KEYS, 'recoveryFacts', reasons)) return null;
  if (Object.hasOwn(value, 'sessionState')) {
    reasons.push('CALLER_SESSION_STATE_FORBIDDEN');
  }
  if (value.schemaVersion !== 1) reasons.push('RECOVERY_FACTS_SCHEMA_INVALID');
  if (value.mode !== 'EFFECT_RECOVERY_EVIDENCE') reasons.push('RECOVERY_FACTS_MODE_INVALID');

  const locators = value.locators;
  if (!exactKeys(locators, RECOVERY_LOCATOR_KEYS, 'recoveryFacts.locators', reasons)) {
    return null;
  }
  if (Object.hasOwn(locators, 'session')) {
    reasons.push('CALLER_SESSION_LOCATOR_FORBIDDEN');
  }

  return {
    schemaVersion: value.schemaVersion,
    mode: value.mode,
    subject: value.subject,
    packetState: value.packetState,
    leaseState: value.leaseState,
    manifestState: value.manifestState,
    holderState: value.holderState,
    workspaceState: value.workspaceState,
    dirtyScopeState: value.dirtyScopeState,
    gitIdentityState: value.gitIdentityState,
    remoteBranchState: value.remoteBranchState,
    prState: value.prState,
    releaseEligibility: value.releaseEligibility,
    locators: {...locators},
  };
}

function normalizeSessionEvidence(value, reasons) {
  if (!exactKeys(value, SESSION_KEYS, 'sessionEvidence', reasons)) return null;
  if (value.schema !== 'mcl-l-rdc-session-evidence.v1') reasons.push('SESSION_SCHEMA_INVALID');
  if (value.executor !== 'L') reasons.push('SESSION_EXECUTOR_INVALID');
  if (value.owner !== 'mcl-l-rdc-session-evidence') reasons.push('SESSION_OWNER_INVALID');
  if (value.details !== 'withheld') reasons.push('SESSION_DETAILS_INVALID');

  if (!exactKeys(value.authority, SESSION_AUTHORITY_KEYS, 'sessionEvidence.authority', reasons)) {
    return null;
  }
  for (const key of SESSION_AUTHORITY_KEYS) {
    if (value.authority[key] !== false) reasons.push('SESSION_AUTHORITY_TRUE:' + key);
  }

  const tuple = [value.status, value.sessionState, value.reasonCode].join('/');
  const known = new Set([
    'PASS/ABSENT/SOLE_RDC_COMMAND_SESSION',
    'PASS/PRESENT/OTHER_RDC_COMMAND_SESSION_PRESENT',
  ]);
  if (value.status === 'UNKNOWN') {
    if (value.sessionState !== 'UNKNOWN'
        || typeof value.reasonCode !== 'string'
        || !/^[A-Z][A-Z0-9_]{0,95}$/.test(value.reasonCode)) {
      reasons.push('SESSION_UNKNOWN_TUPLE_INVALID');
    }
  } else if (!known.has(tuple)) {
    reasons.push('SESSION_SEMANTIC_TUPLE_INVALID');
  }

  return {
    schema: value.schema,
    status: value.status,
    executor: value.executor,
    sessionState: value.sessionState,
    reasonCode: value.reasonCode,
    owner: value.owner,
    details: value.details,
    authority: {...value.authority},
  };
}

function mapSessionState(sessionEvidence) {
  if (sessionEvidence.status === 'PASS' && sessionEvidence.sessionState === 'ABSENT') {
    return 'ABSENT';
  }
  return 'UNKNOWN';
}

function normalizeInput(input) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new CompositionInputError(['INPUT_OBJECT_REQUIRED:input']);
  }
  const serialized = JSON.stringify(input);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_INPUT_BYTES) {
    throw new CompositionInputError(['INPUT_TOO_LARGE']);
  }
  exactKeys(input, TOP_LEVEL_KEYS, 'input', reasons);
  if (input.schemaVersion !== 1) reasons.push('INPUT_SCHEMA_INVALID');
  if (input.mode !== MODE) reasons.push('INPUT_MODE_INVALID');

  const recoveryFacts = normalizeRecoveryFacts(input.recoveryFacts, reasons);
  const sessionEvidence = normalizeSessionEvidence(input.sessionEvidence, reasons);
  const sessionEvidenceLocator = boundedAtom(
    input.sessionEvidenceLocator,
    'sessionEvidenceLocator',
    reasons,
    320
  );
  const sourceRefs = normalizeSourceRefs(input.sourceRefs, reasons);

  if (reasons.length) throw new CompositionInputError(reasons);
  return {
    schemaVersion: 1,
    mode: MODE,
    recoveryFacts,
    sessionEvidence,
    sessionEvidenceLocator,
    sourceRefs,
  };
}

function composeRecovery(input) {
  const normalized = normalizeInput(input);
  const sessionState = mapSessionState(normalized.sessionEvidence);
  const evidence = {
    ...normalized.recoveryFacts,
    sessionState,
    locators: {
      ...normalized.recoveryFacts.locators,
      session: normalized.sessionEvidenceLocator,
    },
  };

  let coreResult;
  try {
    coreResult = recovery.buildRecoveryReceipt(evidence);
  } catch (error) {
    if (error && Array.isArray(error.reasonCodes)) {
      throw new CompositionInputError(error.reasonCodes);
    }
    throw error;
  }

  const output = {
    schemaVersion: 1,
    mode: MODE,
    status: coreResult.receipt.result,
    attentionDisposition: coreResult.receipt.attentionDisposition,
    mappedSessionState: sessionState,
    recoveryDisposition: coreResult.decision.recoveryDisposition,
    reasonCode: coreResult.decision.reasonCode || 'NONE',
    nextLegalAction: coreResult.receipt.nextLegalAction,
    coreReceiptDigest: coreResult.receipt.receiptDigest,
    sourceRefCount: normalized.sourceRefs.length,
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };

  return {
    normalized,
    evidence: coreResult.evidence,
    decision: coreResult.decision,
    receipt: coreResult.receipt,
    output,
  };
}

function invalidOutput(reasonCodes = ['COMPOSITION_INPUT_INVALID']) {
  return {
    schemaVersion: 1,
    mode: MODE,
    status: 'UNKNOWN',
    attentionDisposition: 'UNKNOWN',
    mappedSessionState: 'UNKNOWN',
    recoveryDisposition: 'UNKNOWN',
    reasonCode: reasonCodes[0] || 'COMPOSITION_INPUT_INVALID',
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    coreReceiptDigest: 'UNKNOWN',
    sourceRefCount: 0,
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };
}

function runCli(argv = process.argv.slice(2), stdin = null) {
  if (argv.length !== 0) {
    process.stdout.write(JSON.stringify(invalidOutput(['ARGUMENT_UNSUPPORTED'])) + '\n');
    return 64;
  }
  try {
    const text = stdin === null ? fs.readFileSync(0, 'utf8') : stdin;
    if (Buffer.byteLength(text, 'utf8') > MAX_INPUT_BYTES) {
      throw new CompositionInputError(['INPUT_TOO_LARGE']);
    }
    const result = composeRecovery(JSON.parse(text));
    process.stdout.write(JSON.stringify(result.output) + '\n');
    return result.output.status === 'PASS' ? 0 : 3;
  } catch (error) {
    const reasons = error instanceof CompositionInputError
      ? error.reasonCodes
      : ['INPUT_JSON_INVALID'];
    process.stdout.write(JSON.stringify(invalidOutput(reasons)) + '\n');
    return 3;
  }
}

if (require.main === module) {
  process.exitCode = runCli();
}

module.exports = {
  FALSE_AUTHORITY,
  MAX_INPUT_BYTES,
  MODE,
  SCHEMA,
  CompositionInputError,
  composeRecovery,
  invalidOutput,
  mapSessionState,
  normalizeInput,
  normalizeRecoveryFacts,
  normalizeSessionEvidence,
  runCli,
};
