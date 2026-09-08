#!/usr/bin/env node
'use strict';

const PHASE_REASONS = Object.freeze({
  'source-intent':'E7_SOURCE_INTENT_APPLY_FAILED',
  'preflight':'E7_RELEASE_PREFLIGHT_REJECTED',
  'compile':'E7_MATERIALIZER_COMPILE_FAILED',
  'materializer':'E7_MATERIALIZER_EXEC_FAILED',
  'reconcile':'E7_RECONCILE_FAILED',
  'syntax':'E7_SYNTAX_CHECK_FAILED',
  'guidelines':'E7_GUIDELINE_SYNC_FAILED',
  'impact':'E18_RUNTIME_IMPACT_REJECTED',
  'smoke':'E7_BEHAVIOR_SMOKE_FAILED',
  'test-tree':'E7_TEST_TREE_MUTATED',
  'derived-verify':'E7_DERIVED_VERIFY_FAILED',
  'bundle':'E7_BUNDLE_BUILD_FAILED',
  'resolve':'E7_SOURCE_POLICY_REJECTED',
  'writer':'E7_WRITER_FAILED',
  'unknown':'E7_MATERIALIZE_OR_SMOKE_FAILED',
});

const SAFE_DIAGNOSTICS = new Set([
  'E18_UNKNOWN_RUNTIME_IMPACT',
  'E18_SMOKE_REPEAT_INVALID',
  'E18_SMOKE_MODE_INVALID',
  'TEST_TREE_MUTATED',
  'MATERIALIZER_TARGET_SELF_CHECK_FAILED',
  'MATERIALIZER_BUILD_PARITY_FAILED',
  'MATERIALIZER_SOURCE_PARITY_FAILED',
]);

function normalizeToken(value) {
  return String(value || '').trim();
}

function normalizeProjection(input = {}) {
  let phase = normalizeToken(input.phase);
  if (!Object.hasOwn(PHASE_REASONS,phase)) phase = 'unknown';
  const reason = PHASE_REASONS[phase];
  const requestedDiagnostic = normalizeToken(input.diagnosticCode);
  const diagnosticCode = SAFE_DIAGNOSTICS.has(requestedDiagnostic) ? requestedDiagnostic : '';
  return {phase,reason,diagnosticCode};
}

function formatReceipt(input = {}) {
  const projected = normalizeProjection(input);
  const transaction = normalizeToken(input.transaction);
  if (!/^\d+$/.test(transaction)) throw new Error('E25_STAGE_TRANSACTION_INVALID');
  const runUrl = normalizeToken(input.runUrl);
  const next = normalizeToken(input.next).replace(/[\r\n]+/g,' ').slice(0,240);
  const lines = [
    'UD_STAGE_REJECTED',
    `phase: ${projected.phase}`,
    `reason: ${projected.reason}`,
  ];
  if (projected.diagnosticCode) lines.push(`diagnostic: ${projected.diagnosticCode}`);
  lines.push(`transaction: ${transaction}`);
  if (runUrl) lines.push(`run: ${runUrl}`);
  if (next) lines.push(`next: ${next}`);
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--normalize') {
    const [phase,reason,diagnosticCode=''] = args;
    process.stdout.write(JSON.stringify(normalizeProjection({phase,reason,diagnosticCode})));
    return;
  }
  if (command === '--format') {
    const [phase,reason,diagnosticCode,transaction,runUrl,...nextParts] = args;
    process.stdout.write(formatReceipt({phase,reason,diagnosticCode,transaction,runUrl,next:nextParts.join(' ')}));
    return;
  }
  throw new Error('E25_STAGE_FAILURE_USAGE');
}

module.exports = {PHASE_REASONS,SAFE_DIAGNOSTICS,normalizeProjection,formatReceipt};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
