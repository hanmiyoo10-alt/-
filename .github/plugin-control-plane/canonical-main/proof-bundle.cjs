'use strict';

const SCHEMA_VERSION = 1;
const MODE = 'CANONICAL_MAIN_PROOF_BUNDLE';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function knownBoolean(value) {
  return value === true || value === false;
}

function addMissing(missing, condition, code) {
  if (!condition) missing.push(code);
}

function addFailure(failures, condition, code) {
  if (!condition) failures.push(code);
}

function composeProofBundle(input = {}) {
  const targetSha = text(input.targetSha);
  const pr = input.pr || {};
  const head = input.prHead || {};
  const merged = input.mergedMain || {};
  const ops = input.ops || {};
  const protection = input.protection || {};
  const incidents = input.incidents || {};

  const missing = [];
  addMissing(missing, Boolean(targetSha), 'TARGET_SHA_UNKNOWN');
  addMissing(missing, Number.isInteger(pr.number) && pr.number > 0, 'MERGED_PR_UNKNOWN');
  addMissing(missing, Boolean(text(pr.headSha)), 'PR_HEAD_SHA_UNKNOWN');
  addMissing(missing, Boolean(text(pr.mergeSha)), 'PR_MERGE_SHA_UNKNOWN');
  addMissing(missing, Boolean(head.plugin?.runId), 'PR_HEAD_PLUGIN_CI_UNKNOWN');
  addMissing(missing, Boolean(head.simcore?.runId), 'PR_HEAD_SIMCORE_CI_UNKNOWN');
  addMissing(missing, typeof head.simcore?.verify === 'string', 'PR_HEAD_SIMCORE_VERIFY_UNKNOWN');
  addMissing(missing, typeof head.simcore?.required === 'string', 'PR_HEAD_SIMCORE_REQUIRED_UNKNOWN');
  addMissing(missing, Boolean(merged.runId), 'MERGED_MAIN_SIMCORE_CI_UNKNOWN');
  addMissing(missing, typeof merged.required === 'string', 'MERGED_MAIN_REQUIRED_UNKNOWN');
  addMissing(missing, Boolean(text(ops.observedSha)), 'OPS_SHA_UNKNOWN');
  addMissing(missing, Boolean(text(ops.state)), 'OPS_STATE_UNKNOWN');
  addMissing(missing, Boolean(text(ops.convergence)), 'OPS_CONVERGENCE_UNKNOWN');
  addMissing(missing, typeof ops.requiredPass === 'boolean', 'OPS_REQUIRED_UNKNOWN');
  addMissing(missing, typeof ops.productionMatch === 'boolean', 'PRODUCTION_AUTHORITY_UNKNOWN');
  addMissing(missing, typeof ops.requiredUnknownNone === 'boolean', 'OPS_UNKNOWN_FIELD_UNKNOWN');
  addMissing(missing, knownBoolean(protection.protected), 'NATIVE_PROTECTION_READBACK_UNKNOWN');
  addMissing(missing, incidents.activeP0P1Known === true, 'P0_P1_STATE_UNKNOWN');
  addMissing(missing, incidents.attentionKnown === true, 'ATTENTION_STATE_UNKNOWN');

  const failures = [];
  if (!missing.includes('PR_MERGE_SHA_UNKNOWN') && targetSha) {
    addFailure(failures, text(pr.mergeSha) === targetSha, 'MERGE_SHA_TARGET_MISMATCH');
  }
  if (!missing.includes('PR_HEAD_PLUGIN_CI_UNKNOWN')) {
    addFailure(failures, head.plugin.conclusion === 'success', 'PR_HEAD_PLUGIN_CI_NOT_SUCCESS');
  }
  if (!missing.includes('PR_HEAD_SIMCORE_CI_UNKNOWN')) {
    addFailure(failures, head.simcore.conclusion === 'success', 'PR_HEAD_SIMCORE_CI_NOT_SUCCESS');
  }
  if (!missing.includes('PR_HEAD_SIMCORE_VERIFY_UNKNOWN')) {
    addFailure(failures, head.simcore.verify === 'success', 'PR_HEAD_SIMCORE_VERIFY_NOT_SUCCESS');
  }
  if (!missing.includes('PR_HEAD_SIMCORE_REQUIRED_UNKNOWN')) {
    addFailure(failures, head.simcore.required === 'success', 'PR_HEAD_SIMCORE_REQUIRED_NOT_SUCCESS');
  }
  if (!missing.includes('MERGED_MAIN_REQUIRED_UNKNOWN')) {
    addFailure(failures, merged.required === 'success', 'MERGED_MAIN_REQUIRED_NOT_SUCCESS');
  }
  if (!missing.includes('OPS_SHA_UNKNOWN') && targetSha) {
    addFailure(failures, text(ops.observedSha) === targetSha, 'OPS_TARGET_MISMATCH');
  }
  if (!missing.includes('OPS_STATE_UNKNOWN')) {
    addFailure(failures, ops.state === 'CLEAR', 'OPS_STATE_NOT_CLEAR');
  }
  if (!missing.includes('OPS_CONVERGENCE_UNKNOWN')) {
    addFailure(failures, ops.convergence === 'STABLE', 'OPS_NOT_STABLE');
  }
  if (!missing.includes('OPS_REQUIRED_UNKNOWN')) {
    addFailure(failures, ops.requiredPass === true, 'OPS_REQUIRED_NOT_PASS');
  }
  if (!missing.includes('PRODUCTION_AUTHORITY_UNKNOWN')) {
    addFailure(failures, ops.productionMatch === true, 'PRODUCTION_AUTHORITY_NOT_MATCH');
  }
  if (!missing.includes('OPS_UNKNOWN_FIELD_UNKNOWN')) {
    addFailure(failures, ops.requiredUnknownNone === true, 'OPS_REQUIRED_UNKNOWN_PRESENT');
  }

  const state = missing.length === 0 ? 'COMPLETE' : 'PARTIAL';
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    mode: MODE,
    state,
    acceptanceReady: state === 'COMPLETE' && failures.length === 0,
    targetSha: targetSha || null,
    pr: {
      number: Number.isInteger(pr.number) ? pr.number : null,
      headSha: text(pr.headSha) || null,
      mergeSha: text(pr.mergeSha) || null,
    },
    evidence: {
      prHead: head,
      mergedMain: merged,
      ops,
      protection,
      incidents,
    },
    missing: Object.freeze([...new Set(missing)]),
    failures: Object.freeze([...new Set(failures)]),
  });
}

module.exports = {SCHEMA_VERSION, MODE, composeProofBundle};
