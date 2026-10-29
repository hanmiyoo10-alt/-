#!/usr/bin/env node
'use strict';

const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const stageEntry = require(path.join(
  ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs',
));
const packetProjection = require(path.join(
  ROOT,
  '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs',
));
const recoveryOwner = require(path.join(
  ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery-rebind/mcl-l-interrupted-recovery-rebind.cjs',
));

const REPO = 'hanmiyoo10-alt/-';
const PARENT_PACKET = 3561;
const TARGET_PACKET_REF = '#3473';
const SCHEMA = 'mcl-l-interrupted-recovery-rebind-invoke.v1';
const FIXED_OWNER_ARGS = Object.freeze(['apply', '--target', TARGET_PACKET_REF, '--apply']);
const SHA256_RE = /^[0-9a-f]{64}$/;
const ALLOWED_NEXT = new Set([
  'TARGET_PACKET_IMPLEMENTATION_CONTINUE_WITH_FRESH_HOLDER',
  'APPLY_RECOVERY_REBIND',
  'TARGETED_DRILLDOWN_REQUIRED',
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

class InvocationError extends Error {
  constructor(kind, reasonCodes) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
  }
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseArgs(argv = []) {
  if (!Array.isArray(argv) || argv.length !== 0) {
    throw new InvocationError('UNKNOWN', ['ARGUMENT_UNSUPPORTED']);
  }
  return Object.freeze({});
}

function readParent(runner = stageEntry.runDefault) {
  return stageEntry.ghJson('repos/' + REPO + '/issues/' + PARENT_PACKET, runner);
}

function requireParentStage(issue) {
  if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') {
    throw new InvocationError('BLOCKED', ['PARENT_PACKET_NOT_OPEN']);
  }
  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition === 'CONFLICT') {
    throw new InvocationError('CONFLICT', [
      'PARENT_PACKET_PROJECTION_CONFLICT',
      ...(projection.reasonCodes || []),
    ]);
  }
  if (projection.disposition !== 'PASS') {
    throw new InvocationError('UNKNOWN', [
      'PARENT_PACKET_PROJECTION_UNKNOWN',
      ...(projection.reasonCodes || []),
    ]);
  }
  if (projection.lifecycle !== 'IN_PROGRESS') {
    throw new InvocationError('BLOCKED', ['PARENT_PACKET_NOT_IN_PROGRESS']);
  }
  if (projection.interactionStage !== 'EXPERIMENT_CLOSE') {
    throw new InvocationError('BLOCKED', ['PARENT_PACKET_STAGE_NOT_EXPERIMENT_CLOSE']);
  }
  return projection;
}

function parseOwnerResult(run) {
  if (!run || !Number.isInteger(run.code) || typeof run.text !== 'string') {
    throw new InvocationError('UNKNOWN', ['OWNER_RESULT_MISSING']);
  }
  let value;
  try {
    value = JSON.parse(run.text.trim());
  } catch {
    throw new InvocationError('UNKNOWN', ['OWNER_RESULT_JSON_INVALID']);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.schemaVersion !== 1
      || value.mode !== 'MCL_L_INTERRUPTED_RECOVERY_REBIND'
      || !['PASS', 'BLOCKED', 'UNKNOWN', 'CONFLICT'].includes(value.status)
      || !Array.isArray(value.reasonCodes)
      || value.reasonCodes.some((item) => typeof item !== 'string')
      || !same(value.authority, FALSE_AUTHORITY)) {
    throw new InvocationError('UNKNOWN', ['OWNER_RESULT_SCHEMA_INVALID']);
  }
  const expectedCode = value.status === 'PASS' ? 0 : value.status === 'UNKNOWN' ? 3 : 2;
  if (run.code !== expectedCode) {
    throw new InvocationError('CONFLICT', ['OWNER_EXIT_STATUS_CONFLICT']);
  }
  if (typeof value.nextLegalAction !== 'string' || !ALLOWED_NEXT.has(value.nextLegalAction)) {
    throw new InvocationError('UNKNOWN', ['OWNER_NEXT_ACTION_INVALID']);
  }
  if (value.status === 'PASS') {
    const reasons = [];
    if (value.targetPacketRef !== TARGET_PACKET_REF) reasons.push('OWNER_TARGET_CONFLICT');
    if (value.recoveryState !== 'RECOVERY_REBOUND') reasons.push('OWNER_RECOVERY_STATE_INVALID');
    if (!Number.isSafeInteger(value.releasedGeneration)) reasons.push('OWNER_RELEASE_GENERATION_INVALID');
    if (!Number.isSafeInteger(value.reacquiredGeneration)) reasons.push('OWNER_REACQUIRE_GENERATION_INVALID');
    if (!SHA256_RE.test(value.rebindManifestId || '')) reasons.push('OWNER_REBIND_MANIFEST_INVALID');
    if (value.holderState !== 'ABSENT') reasons.push('OWNER_HOLDER_NOT_ABSENT');
    if (value.nextLegalAction !== 'TARGET_PACKET_IMPLEMENTATION_CONTINUE_WITH_FRESH_HOLDER') {
      reasons.push('OWNER_PASS_NEXT_ACTION_INVALID');
    }
    if (reasons.length) throw new InvocationError('CONFLICT', reasons);
  }
  return value;
}

function receipt(status, reasonCodes = [], owner = null) {
  const pass = status === 'PASS' && owner;
  return {
    schema: SCHEMA,
    status,
    reason_codes: [...new Set(reasonCodes)].sort(),
    target_packet_ref: TARGET_PACKET_REF,
    recovery_state: pass ? owner.recoveryState : null,
    released_generation: pass ? owner.releasedGeneration : null,
    reacquired_generation: pass ? owner.reacquiredGeneration : null,
    rebind_manifest_id: pass ? owner.rebindManifestId : null,
    holder_state: pass ? owner.holderState : null,
    next_legal_action: pass
      ? owner.nextLegalAction
      : owner?.nextLegalAction || 'TARGETED_DRILLDOWN_REQUIRED',
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };
}

async function invokeFixed(deps = {}) {
  const parent = (deps.readParent || readParent)();
  requireParentStage(parent);
  const runOwner = deps.runOwner || ((args) => recoveryOwner.runCli(args));
  const owner = parseOwnerResult(await runOwner([...FIXED_OWNER_ARGS]));
  return receipt(owner.status, owner.reasonCodes, owner);
}

function exitCodeFor(status) {
  if (status === 'PASS') return 0;
  if (status === 'UNKNOWN') return 3;
  return 2;
}

async function runCli(argv = [], deps = {}) {
  try {
    parseArgs(argv);
    const result = await invokeFixed(deps);
    return {code: exitCodeFor(result.status), text: JSON.stringify(result) + '\n', result};
  } catch (error) {
    const kind = error instanceof InvocationError ? error.kind : 'UNKNOWN';
    const reasons = error instanceof InvocationError ? error.reasonCodes : ['INVOKER_INTERNAL_ERROR'];
    const result = receipt(kind, reasons);
    return {code: exitCodeFor(kind), text: JSON.stringify(result) + '\n', result};
  }
}

if (require.main === module) {
  const publicArgs = process.argv.length === 2 ? [] : ['__CALLER_ARGS_PRESENT__'];
  runCli(publicArgs).then(({code, text}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch(() => {
    const result = receipt('UNKNOWN', ['INVOKER_INTERNAL_ERROR']);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = 3;
  });
}

module.exports = {
  FALSE_AUTHORITY,
  FIXED_OWNER_ARGS,
  PARENT_PACKET,
  REPO,
  SCHEMA,
  TARGET_PACKET_REF,
  InvocationError,
  exitCodeFor,
  invokeFixed,
  parseArgs,
  parseOwnerResult,
  readParent,
  receipt,
  requireParentStage,
  runCli,
};
