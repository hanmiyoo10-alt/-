'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const continuity = require('../execution-continuity.cjs');

const ACTIVATION = 'a'.repeat(64);
const FINAL_DIGEST = 'f'.repeat(64);
const BASE_IDENTITY = {
  packetRef: '#2746',
  phase: 'IMPLEMENTATION_PR',
  ownerId: 'repo:fixture-owner',
  activationDigest: ACTIVATION,
};
const RUN_ID = continuity.deriveRunId(BASE_IDENTITY);
const PUSH_KEY = continuity.deriveEffectKey({
  runId: RUN_ID,
  primitiveId: 'PUSH',
  targetIdentity: 'refs/heads/server/mcl-packet-2746',
});

function evidence(overrides = {}) {
  const value = {
    schemaVersion: 1,
    mode: 'EXECUTION_CONTINUITY_EVIDENCE',
    ...BASE_IDENTITY,
    runId: RUN_ID,
    attemptId: 1,
    connectionObservation: 'REATTACHED',
    runtimeCapability: 'NOT_DETACHED_CAPABLE',
    ownerLiveness: 'ABSENT',
    executionLifecycle: 'WAITING',
    checkpoint: {
      state: 'EXACT',
      name: 'COMMIT_CREATED',
      evidenceLocator: 'commit:' + 'b'.repeat(40),
    },
    journal: {
      state: 'EXACT',
      effectKey: continuity.deriveEffectKey({
        runId: RUN_ID,
        primitiveId: 'COMMIT',
        targetIdentity: 'prepared-digest:' + 'c'.repeat(64),
      }),
      evidenceLocator: 'commit:' + 'b'.repeat(40),
    },
    remoteEffect: {
      state: 'NOT_APPLICABLE',
      primitiveId: null,
      targetIdentity: null,
      evidenceLocator: null,
    },
    continuationAuthority: {
      state: 'PROVEN',
      evidenceLocator: 'issue:#2746',
    },
    nextPrimitive: {
      state: 'PROVEN',
      name: 'NON_FORCE_PUSH',
      evidenceLocator: 'issue:#2746',
    },
    finalReceipt: {
      state: 'ABSENT',
      digest: null,
      evidenceLocator: null,
    },
    ...overrides,
  };
  return value;
}

test('run identity is deterministic and separate from attempts', () => {
  assert.match(RUN_ID, /^run-[0-9a-f]{64}$/);
  assert.equal(continuity.deriveRunId(BASE_IDENTITY), RUN_ID);
  assert.notEqual(
    continuity.deriveRunId({...BASE_IDENTITY, activationDigest: 'd'.repeat(64)}),
    RUN_ID,
  );
  assert.equal(continuity.classifyContinuity(evidence({attemptId: 2})).runId, RUN_ID);
});

test('bad supplied run id fails closed as conflict', () => {
  const d = continuity.classifyContinuity(evidence({runId: 'run-' + '0'.repeat(64)}));
  assert.equal(d.resumeDisposition, 'UNKNOWN');
  assert.equal(d.result, 'CONFLICT');
  assert.equal(d.reasonCode, 'RUN_ID_CONFLICT');
});

test('strict evidence rejects unsupported fields', () => {
  assert.throws(
    () => continuity.normalizeEvidence({...evidence(), pid: 1234}),
    (error) => error.reasonCodes.includes('INPUT_FIELD_UNSUPPORTED:input.pid'),
  );
});

test('connection observation is disposition-independent', () => {
  const dispositions = ['ATTACHED', 'DETACHED', 'REATTACHED'].map((connectionObservation) => {
    const d = continuity.classifyContinuity(evidence({connectionObservation}));
    return [d.resumeDisposition, d.effectTruth, d.nextLegalAction];
  });
  assert.deepEqual(dispositions[0], dispositions[1]);
  assert.deepEqual(dispositions[1], dispositions[2]);
  assert.equal(dispositions[0][0], 'CONTINUE_FROM_CHECKPOINT');
});

test('detached capable exact live owner is still running', () => {
  for (const connectionObservation of ['ATTACHED', 'DETACHED', 'REATTACHED']) {
    const d = continuity.classifyContinuity(evidence({
      connectionObservation,
      runtimeCapability: 'DETACHED_CAPABLE',
      ownerLiveness: 'LIVE',
      executionLifecycle: 'RUNNING',
    }));
    assert.equal(d.resumeDisposition, 'OWNER_STILL_RUNNING');
    assert.equal(d.result, 'PASS');
  }
});

test('live owner without detached capability cannot claim continuity', () => {
  const d = continuity.classifyContinuity(evidence({
    connectionObservation: 'DETACHED',
    runtimeCapability: 'NOT_DETACHED_CAPABLE',
    ownerLiveness: 'LIVE',
    executionLifecycle: 'RUNNING',
  }));
  assert.equal(d.resumeDisposition, 'UNKNOWN');
  assert.equal(d.reasonCode, 'DETACHED_CAPABILITY_REQUIRED_FOR_LIVE_OWNER');
});

test('finished exact canonical receipt is already finished', () => {
  const d = continuity.classifyContinuity(evidence({
    executionLifecycle: 'FINISHED',
    checkpoint: {
      state: 'EXACT',
      name: 'FINISHED',
      evidenceLocator: 'receipt:final',
    },
    journal: {state: 'ABSENT', effectKey: null, evidenceLocator: null},
    finalReceipt: {
      state: 'EXACT',
      digest: FINAL_DIGEST,
      evidenceLocator: 'receipt:final',
    },
    nextPrimitive: {
      state: 'NOT_APPLICABLE',
      name: null,
      evidenceLocator: null,
    },
  }));
  assert.equal(d.resumeDisposition, 'ALREADY_FINISHED');
  assert.equal(d.nextLegalAction, 'NO_CONTINUATION_REQUIRED');
});

test('continue from exact checkpoint grants no effect authority', () => {
  const d = continuity.classifyContinuity(evidence());
  assert.equal(d.resumeDisposition, 'CONTINUE_FROM_CHECKPOINT');
  assert.equal(d.result, 'PASS');
  const receipt = continuity.projectExecutionReceipt(evidence());
  assert.equal(receipt.validity, 'VALID');
  assert.equal(receipt.mutationAuthorized, false);
  assert.equal(receipt.executionAuthorized, false);
  assert.equal(receipt.mergeAuthorized, false);
  assert.equal(receipt.releaseAuthorized, false);
  assert.equal(receipt.productionAuthorized, false);
});

test('lost push acknowledgement uses remote proof and suppresses duplicate push', () => {
  const d = continuity.classifyContinuity(evidence({
    journal: {state: 'ABSENT', effectKey: null, evidenceLocator: null},
    remoteEffect: {
      state: 'PROVEN',
      primitiveId: 'PUSH',
      targetIdentity: 'refs/heads/server/mcl-packet-2746',
      evidenceLocator: 'ref:server/mcl-packet-2746@' + 'e'.repeat(40),
    },
    nextPrimitive: {
      state: 'PROVEN',
      name: 'PR_PUBLICATION',
      evidenceLocator: 'issue:#2746',
    },
  }));
  assert.equal(d.resumeDisposition, 'CONTINUE_FROM_CHECKPOINT');
  assert.equal(d.effectTruth, 'PROVEN_REMOTE_LOST_ACK');
  assert.equal(d.duplicateEffectSuppressed, true);
  assert.equal(d.nextPrimitive, 'PR_PUBLICATION');
});

test('missing local acknowledgement plus unknown remote truth requires recovery inspect', () => {
  const d = continuity.classifyContinuity(evidence({
    journal: {state: 'ABSENT', effectKey: null, evidenceLocator: null},
    remoteEffect: {
      state: 'UNKNOWN',
      primitiveId: null,
      targetIdentity: null,
      evidenceLocator: 'owner:remote-readback',
    },
  }));
  assert.equal(d.resumeDisposition, 'NEEDS_RECOVERY_INSPECT');
  assert.equal(d.result, 'UNKNOWN');
  assert.equal(d.nextLegalAction, 'INVOKE_EXISTING_EFFECT_RECOVERY_INSPECT');
});

test('journal or remote conflict fails closed', () => {
  const d = continuity.classifyContinuity(evidence({
    remoteEffect: {
      state: 'CONFLICT',
      primitiveId: null,
      targetIdentity: null,
      evidenceLocator: 'owner:remote-readback',
    },
  }));
  assert.equal(d.resumeDisposition, 'UNKNOWN');
  assert.equal(d.result, 'CONFLICT');
  assert.equal(d.effectTruth, 'CONFLICT');
});

test('explicit continuation blocker remains blocked', () => {
  const d = continuity.classifyContinuity(evidence({
    continuationAuthority: {
      state: 'BLOCKED',
      evidenceLocator: 'issue:#485',
    },
  }));
  assert.equal(d.resumeDisposition, 'BLOCKED');
  assert.equal(d.result, 'BLOCKED');
});

test('owner liveness unknown never becomes abandonment or continuation', () => {
  const d = continuity.classifyContinuity(evidence({ownerLiveness: 'UNKNOWN'}));
  assert.equal(d.resumeDisposition, 'UNKNOWN');
  assert.equal(d.reasonCode, 'OWNER_LIVENESS_UNKNOWN');
});

test('checkpoint ranks are fixed and monotonic helpers expose known values', () => {
  assert.equal(continuity.checkpointRank('NONE'), 0);
  assert.equal(continuity.checkpointRank('COMMIT_CREATED'), 40);
  assert.equal(continuity.checkpointRank('FINISHED'), 90);
  assert.equal(continuity.checkpointRank('UNKNOWN'), null);
});

function record(overrides = {}) {
  return {
    runId: RUN_ID,
    generation: 0,
    previousRecordDigest: null,
    attemptId: 1,
    executionLifecycle: 'RUNNING',
    lastDurableCheckpoint: 'WORKSPACE_READY',
    checkpointEvidence: 'workspace:/root/nyang-worktrees/mcl-packet-2746',
    nextPrimitive: 'SOURCE_MUTATION',
    finalReceiptDigest: null,
    ...overrides,
  };
}

test('record CAS accepts exact next generation and monotonic checkpoint', () => {
  const first = record();
  const next = record({
    generation: 1,
    previousRecordDigest: continuity.recordDigest(first),
    lastDurableCheckpoint: 'COMMIT_CREATED',
    checkpointEvidence: 'commit:' + 'b'.repeat(40),
    nextPrimitive: 'NON_FORCE_PUSH',
  });
  const result = continuity.validateRecordTransition(first, next);
  assert.equal(result.ok, true);
  assert.match(result.nextDigest, /^[0-9a-f]{64}$/);
});

test('record CAS rejects digest, attempt and checkpoint regressions', () => {
  const first = record({attemptId: 2, lastDurableCheckpoint: 'COMMIT_CREATED'});
  const bad = record({
    generation: 1,
    previousRecordDigest: '0'.repeat(64),
    attemptId: 1,
    lastDurableCheckpoint: 'WORKSPACE_READY',
  });
  const result = continuity.validateRecordTransition(first, bad);
  assert.equal(result.ok, false);
  assert(result.reasonCodes.includes('RECORD_CAS_DIGEST_CONFLICT'));
  assert(result.reasonCodes.includes('RECORD_ATTEMPT_REGRESSION'));
  assert(result.reasonCodes.includes('RECORD_CHECKPOINT_REGRESSION'));
});

test('record CAS rejects generation skips', () => {
  const first = record();
  const next = record({
    generation: 2,
    previousRecordDigest: continuity.recordDigest(first),
  });
  assert.equal(continuity.validateRecordTransition(first, next).ok, false);
});

function effect(overrides = {}) {
  return {
    runId: RUN_ID,
    primitiveId: 'PUSH',
    targetIdentity: 'refs/heads/server/mcl-packet-2746',
    effectKey: PUSH_KEY,
    status: 'PROVEN',
    evidenceLocator: 'ref:server/mcl-packet-2746@' + 'e'.repeat(40),
    ...overrides,
  };
}

test('effect journal append is deterministic and idempotent', () => {
  assert.equal(continuity.classifyJournalAppend(null, effect()).disposition, 'APPEND');
  assert.equal(
    continuity.classifyJournalAppend(effect(), effect()).disposition,
    'IDEMPOTENT',
  );
});

test('same effect key cannot be rewritten to conflicting evidence', () => {
  const result = continuity.classifyJournalAppend(
    effect(),
    effect({evidenceLocator: 'ref:server/mcl-packet-2746@' + 'f'.repeat(40)}),
  );
  assert.equal(result.disposition, 'CONFLICT');
  assert(result.reasonCodes.includes('EFFECT_EVIDENCE_REWRITE_CONFLICT'));
});

test('bad deterministic effect key is rejected', () => {
  assert.throws(
    () => continuity.classifyJournalAppend(null, effect({effectKey: '0'.repeat(64)})),
    (error) => error.reasonCodes.includes('EFFECT_KEY_CONFLICT'),
  );
});

test('canonical receipt and agent decision view stay unchanged and bounded', () => {
  const input = evidence();
  const receipt = continuity.projectExecutionReceipt(input);
  assert.equal(receipt.mode, 'REPOSITORY_EXECUTION_RECEIPT');
  assert.equal(receipt.schemaVersion, 2);
  assert.equal(receipt.validity, 'VALID');
  assert.equal(receipt.primitiveId, 'execution-continuity.v1');

  const view = continuity.projectAgentView(input, {
    receiptLocator: 'local-artifact:fixture/receipt.json',
    reportLocator: 'local-artifact:fixture/report.json',
  });
  assert.equal(view.validity, 'VALID');
  assert.equal(view.phase, 'EXECUTION_CONTINUITY');
  assert.equal(view.output.resumeDisposition, 'CONTINUE_FROM_CHECKPOINT');
  assert.equal(view.output.runId, RUN_ID);
  assert.equal(view.output.duplicateEffectSuppressed, false);
});

test('lost acknowledgement is visible in bounded decision view', () => {
  const input = evidence({
    journal: {state: 'ABSENT', effectKey: null, evidenceLocator: null},
    remoteEffect: {
      state: 'PROVEN',
      primitiveId: 'PUSH',
      targetIdentity: 'refs/heads/server/mcl-packet-2746',
      evidenceLocator: 'ref:server/mcl-packet-2746@' + 'e'.repeat(40),
    },
    nextPrimitive: {
      state: 'PROVEN',
      name: 'PR_PUBLICATION',
      evidenceLocator: 'issue:#2746',
    },
  });
  const view = continuity.projectAgentView(input, {
    receiptLocator: 'local-artifact:fixture/receipt.json',
    reportLocator: 'local-artifact:fixture/report.json',
  });
  assert.equal(view.validity, 'VALID');
  assert.equal(view.output.duplicateEffectSuppressed, true);
  assert.equal(view.output.nextPrimitive, 'PR_PUBLICATION');
});

test('source has no runtime, filesystem, network, shell, clock or random authority', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'execution-continuity.cjs'), 'utf8');
  assert.doesNotMatch(source, /require\(['"]node:fs['"]\)/);
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/);
  assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\//);
  assert.doesNotMatch(source, /process\.env|process\.pid|Date\.now|new Date|Math\.random/);
  assert.doesNotMatch(source, /writeFile|appendFile|renameSync|mkdirSync/);
});

console.log('execution-continuity contract: ok');
