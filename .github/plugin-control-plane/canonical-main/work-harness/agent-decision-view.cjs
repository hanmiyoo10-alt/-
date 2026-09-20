#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { canonicalize, stableHash } = require('./handoff.cjs');
const executionReceipt = require('./execution-receipt.cjs');

const MAX_INPUT_BYTES = 16 * 1024;
const MAX_VIEW_BYTES = 8 * 1024;
const MAX_TEXT_BYTES = 320;
const MAX_OUTPUT_KEYS = 16;
const MAX_ATTENTION = 32;
const MAX_SHOWN = 5;
const PHASE_RE = /^[A-Z][A-Z0-9_]{1,79}$/;
const OUTPUT_KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const SEVERITIES = Object.freeze([
  'CONFLICT', 'UNKNOWN', 'BLOCKER', 'FAIL', 'INFRA', 'WARN',
]);
const PRIORITY = Object.freeze({
  CONFLICT: 0, UNKNOWN: 1, BLOCKER: 2, FAIL: 3, INFRA: 4, WARN: 5,
});
const CRITICAL = new Set(['CONFLICT', 'UNKNOWN', 'BLOCKER', 'FAIL']);
const TOP_FIELDS = new Set([
  'receipt', 'phase', 'output', 'attention', 'receiptLocator', 'reportLocator',
]);
const ATTENTION_FIELDS = new Set([
  'subject', 'reasonCode', 'severity', 'constraint', 'nextPhase', 'locator',
]);

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}
function sensitiveText(text) {
  return /(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text);
}
function same(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}
function exactKeys(value, allowed, field, reasons) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reasons.push(`INPUT_FIELD_TYPE_INVALID:${field}`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) reasons.push(`INPUT_FIELD_UNSUPPORTED:${field}.${key}`);
  }
  for (const key of allowed) {
    if (!(key in value)) reasons.push(`INPUT_FIELD_MISSING:${field}.${key}`);
  }
  return true;
}
function atom(value, field, reasons, {maxBytes = MAX_TEXT_BYTES} = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    reasons.push(`INPUT_FIELD_TYPE_INVALID:${field}`);
    return null;
  }
  const text = value.trim();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    reasons.push(`INPUT_FIELD_TOO_LARGE:${field}`);
  }
  if (/[\u0000-\u001f\u007f]/.test(text)) {
    reasons.push(`INPUT_FIELD_CONTROL_CHAR:${field}`);
  }
  if (sensitiveText(text)) reasons.push(`INPUT_FIELD_SENSITIVE:${field}`);
  return text;
}
function normalizeOutput(value, reasons) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reasons.push('INPUT_FIELD_TYPE_INVALID:output');
    return {};
  }
  const keys = Object.keys(value).sort();
  if (keys.length > MAX_OUTPUT_KEYS) reasons.push('INPUT_OUTPUT_TOO_MANY_KEYS');
  const output = {};
  for (const key of keys.slice(0, MAX_OUTPUT_KEYS)) {
    if (!OUTPUT_KEY_RE.test(key)) {
      reasons.push(`INPUT_OUTPUT_KEY_INVALID:${key}`);
      continue;
    }
    const item = value[key];
    if (item === null || typeof item === 'boolean') {
      output[key] = item;
    } else if (Number.isSafeInteger(item) && item >= 0) {
      output[key] = item;
    } else if (typeof item === 'string') {
      const text = atom(item, `output.${key}`, reasons, {maxBytes: 240});
      if (text) output[key] = text;
    } else {
      reasons.push(`INPUT_OUTPUT_VALUE_INVALID:${key}`);
    }
  }
  return output;
}
function receiptFacts(receipt) {
  return {
    schemaVersion: 2,
    operationId: receipt.operationId,
    primitiveId: receipt.primitiveId,
    sourceIdentity: {
      kind: receipt.sourceIdentity?.kind,
      locator: receipt.sourceIdentity?.locator,
      identity: receipt.sourceIdentity?.identity,
    },
    executionSurface: receipt.executionSurface,
    stage: receipt.stage,
    executionLifecycle: receipt.executionLifecycle,
    attentionDisposition: receipt.attentionDisposition,
    result: receipt.result,
    proofScope: receipt.proofScope,
    steps: Array.isArray(receipt.steps) ? receipt.steps.map((row) => ({
      name: row.name, result: row.result, evidenceLocator: row.evidenceLocator,
    })) : receipt.steps,
    counters: Array.isArray(receipt.counters) ? receipt.counters.map((row) => ({
      name: row.name, value: row.value,
    })) : receipt.counters,
    affectedFiles: receipt.affectedFiles,
    artifactLocators: receipt.artifactLocators,
    reasonCodes: receipt.reasonCodes,
    requiredUnknowns: receipt.requiredUnknowns,
    conflicts: receipt.conflicts,
    blockers: receipt.blockers,
    exitCode: receipt.exitCode,
    stderrTail: receipt.stderrTail,
    nextLegalAction: receipt.nextLegalAction,
  };
}
function validateCanonicalReceipt(receipt, reasons) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    reasons.push('RECEIPT_OBJECT_REQUIRED');
    return null;
  }
  if (receipt.schemaVersion !== 2
      || receipt.mode !== 'REPOSITORY_EXECUTION_RECEIPT'
      || receipt.validity !== 'VALID') {
    reasons.push('RECEIPT_V2_VALID_REQUIRED');
    return null;
  }
  const rebuilt = executionReceipt.projectExecutionReceipt(receiptFacts(receipt));
  if (rebuilt.validity !== 'VALID' || !same(rebuilt, receipt)) {
    reasons.push('RECEIPT_CANONICAL_IDENTITY_CONFLICT');
    return null;
  }
  return rebuilt;
}
function normalizeAttention(value, reasons) {
  if (!Array.isArray(value)) {
    reasons.push('INPUT_FIELD_TYPE_INVALID:attention');
    return [];
  }
  if (value.length > MAX_ATTENTION) reasons.push('INPUT_ATTENTION_TOO_MANY_ITEMS');
  const rows = [];
  for (const [index, item] of value.slice(0, MAX_ATTENTION).entries()) {
    const field = `attention[${index}]`;
    if (!exactKeys(item, ATTENTION_FIELDS, field, reasons)) continue;
    const subject = atom(item.subject, `${field}.subject`, reasons, {maxBytes: 160});
    const reasonCode = atom(item.reasonCode, `${field}.reasonCode`, reasons, {maxBytes: 160});
    const severity = atom(item.severity, `${field}.severity`, reasons, {maxBytes: 40});
    const constraint = atom(item.constraint, `${field}.constraint`, reasons, {maxBytes: 160});
    const nextPhase = atom(item.nextPhase, `${field}.nextPhase`, reasons, {maxBytes: 160});
    const locator = atom(item.locator, `${field}.locator`, reasons, {maxBytes: 320});
    if (severity && !SEVERITIES.includes(severity)) {
      reasons.push(`INPUT_ATTENTION_SEVERITY_INVALID:${index}`);
    }
    if (subject && reasonCode && severity && constraint && nextPhase && locator
        && SEVERITIES.includes(severity)) {
      rows.push({subject, reasonCode, severity, constraint, nextPhase, locator});
    }
  }
  return rows.sort((a, b) => (
    PRIORITY[a.severity] - PRIORITY[b.severity]
    || a.subject.localeCompare(b.subject)
    || a.reasonCode.localeCompare(b.reasonCode)
    || a.locator.localeCompare(b.locator)
  ));
}
function summaryFor(receipt) {
  const summary = {
    PASS: 0, FAIL: 0, PARTIAL: 0, BLOCKED: 0,
    UNKNOWN: 0, CONFLICT: 0, NOT_RUN: 0,
  };
  for (const step of receipt.steps || []) {
    if (step.result === 'SKIPPED') summary.NOT_RUN += 1;
    else if (Object.hasOwn(summary, step.result)) summary[step.result] += 1;
  }
  return summary;
}
function fallbackAttention(receipt, locator) {
  let severity = 'WARN';
  let reasonCode = 'ATTENTION_REQUIRED';
  if (receipt.result === 'CONFLICT' || receipt.attentionDisposition === 'CONFLICT') {
    severity = 'CONFLICT';
    reasonCode = receipt.conflicts?.[0] || receipt.reasonCodes?.[0] || 'EXECUTION_EVIDENCE_CONFLICT';
  } else if (receipt.result === 'UNKNOWN' || receipt.attentionDisposition === 'UNKNOWN') {
    severity = 'UNKNOWN';
    reasonCode = receipt.requiredUnknowns?.[0] || receipt.reasonCodes?.[0] || 'EXECUTION_EVIDENCE_UNKNOWN';
  } else if (receipt.result === 'BLOCKED' || receipt.attentionDisposition === 'BLOCKED') {
    severity = 'BLOCKER';
    reasonCode = receipt.blockers?.[0] || receipt.reasonCodes?.[0] || 'EXECUTION_BLOCKED';
  } else if (receipt.result === 'FAIL') {
    severity = 'FAIL';
    reasonCode = receipt.reasonCodes?.[0] || 'EXECUTION_FAILED';
  } else if (receipt.result === 'PARTIAL') {
    severity = 'UNKNOWN';
    reasonCode = receipt.reasonCodes?.[0] || 'EXECUTION_PARTIAL';
  } else {
    reasonCode = receipt.reasonCodes?.[0] || 'SEMANTIC_REVIEW_REQUIRED';
  }
  return {
    subject: receipt.primitiveId,
    reasonCode,
    severity,
    constraint: 'CANONICAL_RECEIPT_ATTENTION',
    nextPhase: 'NEEDS_SEMANTIC_DECISION',
    locator,
  };
}
function invalidView(reasons, receipt = null) {
  const draft = {
    schemaVersion: 1,
    mode: 'REPOSITORY_AGENT_DECISION_VIEW',
    validity: 'INVALID',
    phase: 'UNKNOWN',
    executionLifecycle: receipt?.executionLifecycle || 'UNKNOWN',
    attentionDisposition: 'UNKNOWN',
    result: 'UNKNOWN',
    summary: {
      PASS: 0, FAIL: 0, PARTIAL: 0, BLOCKED: 0,
      UNKNOWN: 0, CONFLICT: 0, NOT_RUN: 0,
    },
    attentionCount: 0,
    shown: 0,
    truncated: false,
    criticalTruncated: false,
    attention: [],
    output: {},
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    receiptLocator: null,
    reportLocator: null,
    receiptDigest: receipt?.receiptDigest || null,
    reasonCodes: uniqueSorted(reasons.length ? reasons : ['PROJECTION_INVALID']),
  };
  return {...draft, viewDigest: stableHash(draft)};
}
function projectAgentDecisionView(input) {
  const reasons = [];
  if (!exactKeys(input, TOP_FIELDS, 'input', reasons)) return invalidView(reasons);
  const receipt = validateCanonicalReceipt(input?.receipt, reasons);
  if (!receipt) return invalidView(reasons, input?.receipt);
  const phase = atom(input.phase, 'phase', reasons, {maxBytes: 80});
  if (phase && !PHASE_RE.test(phase)) reasons.push('INPUT_PHASE_INVALID');
  const receiptLocator = atom(input.receiptLocator, 'receiptLocator', reasons, {maxBytes: 320});
  const reportLocator = atom(input.reportLocator, 'reportLocator', reasons, {maxBytes: 320});
  const output = normalizeOutput(input.output, reasons);
  let attention = normalizeAttention(input.attention, reasons);
  if (receipt.executionLifecycle === 'FINISHED'
      && receipt.attentionDisposition === 'COMPLETE'
      && receipt.result === 'PASS'
      && attention.length) {
    reasons.push('PASS_COMPLETE_ATTENTION_CONFLICT');
  }
  if (reasons.length) return invalidView(reasons, receipt);
  if ((receipt.attentionDisposition !== 'COMPLETE' || receipt.result !== 'PASS')
      && attention.length === 0) {
    attention = [fallbackAttention(receipt, receiptLocator)];
  }
  const shownAttention = attention.slice(0, MAX_SHOWN);
  const criticalCount = attention.filter((item) => CRITICAL.has(item.severity)).length;
  const shownCritical = shownAttention.filter((item) => CRITICAL.has(item.severity)).length;
  const draft = {
    schemaVersion: 1,
    mode: 'REPOSITORY_AGENT_DECISION_VIEW',
    validity: 'VALID',
    phase,
    executionLifecycle: receipt.executionLifecycle,
    attentionDisposition: receipt.attentionDisposition,
    result: receipt.result,
    summary: summaryFor(receipt),
    attentionCount: attention.length,
    shown: shownAttention.length,
    truncated: attention.length > shownAttention.length,
    criticalTruncated: criticalCount > shownCritical,
    attention: shownAttention,
    output,
    nextLegalAction: receipt.nextLegalAction,
    receiptLocator,
    reportLocator,
    receiptDigest: receipt.receiptDigest,
    reasonCodes: [],
  };
  if (Buffer.byteLength(JSON.stringify(canonicalize(draft)), 'utf8') > MAX_VIEW_BYTES) {
    return invalidView(['VIEW_TOO_LARGE'], receipt);
  }
  return {...draft, viewDigest: stableHash(draft)};
}
function exitCodeFor(view) {
  if (view?.validity !== 'VALID') return 2;
  if (view.executionLifecycle === 'FINISHED'
      && view.attentionDisposition === 'COMPLETE'
      && view.result === 'PASS'
      && !view.criticalTruncated) return 0;
  if (['FAIL', 'CONFLICT'].includes(view.result)) return 2;
  return 3;
}
function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--input-file' || !argv[1]) {
    throw new Error('usage: node agent-decision-view.cjs --input-file <path>');
  }
  return {inputFile: argv[1]};
}
function readInputFile(inputFile) {
  const resolved = path.resolve(inputFile);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('input-file must be a regular non-symlink file');
  }
  if (stat.size > MAX_INPUT_BYTES) {
    throw new Error(`input-file exceeds ${MAX_INPUT_BYTES} bytes`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}
function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const view = projectAgentDecisionView(readInputFile(args.inputFile));
  process.stdout.write(`${JSON.stringify(canonicalize(view), null, 2)}\n`);
  return exitCodeFor(view);
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
  CRITICAL,
  MAX_ATTENTION,
  MAX_INPUT_BYTES,
  MAX_SHOWN,
  MAX_VIEW_BYTES,
  PRIORITY,
  SEVERITIES,
  exitCodeFor,
  projectAgentDecisionView,
  run,
  validateCanonicalReceipt,
};
