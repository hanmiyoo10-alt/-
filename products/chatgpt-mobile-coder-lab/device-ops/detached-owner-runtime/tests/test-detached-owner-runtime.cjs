'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {EventEmitter} = require('node:events');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../..');
const runtime = require('../mcl-detached-owner-runtime.cjs');
const service = require('../mcl-detached-owner-runtime-service.cjs');
const handoff = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const impl = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation.cjs'));
const patch = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs'));
const continuity = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/execution-continuity/execution-continuity.cjs'));

const PACKET = '#9001';
const LEASE_A = 'a'.repeat(64);
const LEASE_B = 'b'.repeat(64);
const PACKET_HASH_A = 'c'.repeat(64);
const PACKET_HASH_B = 'd'.repeat(64);
const SOURCE_IDENTITY = {
  repositoryImplementationSourceSha256: '1'.repeat(64),
  repositoryPatchSourceSha256: '2'.repeat(64),
};

function sh(args, cwd) {
  const result = childProcess.spawnSync(args[0], args.slice(1), {
    cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return String(result.stdout || '').trim();
}
function tempRepo() {
  const root = fs.mkdtempSync('/root/nyang-worktrees/.mcl-detached-runtime-');
  const worktree = path.join(root, 'mcl-packet-9001');
  fs.mkdirSync(worktree);
  sh(['git', 'init', '-q'], worktree);
  sh(['git', 'config', 'user.name', 'fixture'], worktree);
  sh(['git', 'config', 'user.email', 'fixture@example.invalid'], worktree);
  fs.writeFileSync(path.join(worktree, 'seed.txt'), 'seed\n');
  sh(['git', 'add', 'seed.txt'], worktree);
  sh(['git', 'commit', '-qm', 'seed'], worktree);
  sh(['git', 'branch', '-M', 'server/mcl-packet-9001'], worktree);
  const head = sh(['git', 'rev-parse', 'HEAD'], worktree);
  return {root, worktree, head, cleanup: () => fs.rmSync(root, {recursive: true, force: true})};
}
function parentManifest({worktree, head, leaseId = LEASE_A, packetHash = PACKET_HASH_A}) {
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: PACKET,
    packetBodySha256: packetHash,
    phaseId: '9001-implementation-pr-stage-entry',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: [...patch.D014_VALIDATION_SCOPES],
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-packet-9001',
      worktree,
    },
    observedBaseSha: head,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId,
      acquiredGeneration: 10,
      acquireEvidenceRef: 'run:90010',
    },
    sourceAuthorityRefs: [PACKET, 'issue:#2352'],
    inputRefs: ['commit:' + head, 'receipt:mcl-dispatch-plan:v1'],
    expectedOutputRefs: patch.D014_COMPLETION_SET_PATHS.map((item) => 'path:' + item),
    acceptanceRefs: [PACKET, 'issue:#2352'],
    stopCondition: 'fixture',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  });
}
function fixture({leaseId = LEASE_A, packetHash = PACKET_HASH_A} = {}) {
  const repo = tempRepo();
  const manifest = parentManifest({worktree: repo.worktree, head: repo.head, leaseId, packetHash});
  const manifestText = handoff.renderManifest(manifest);
  const handoffText = impl.renderHandoff(manifest);
  const patchBytes = Buffer.from('fixture patch bytes\n');
  const requestText = JSON.stringify({
    schema: 'mcl-repository-patch-request.v1',
    message: 'fixture',
    expected_paths: [...patch.D014_COMPLETION_SET_PATHS],
    patch_sha256: crypto.createHash('sha256').update(patchBytes).digest('hex'),
  });
  const validationRequestText = JSON.stringify({
    schema: patch.VALIDATION_REQUEST_SCHEMA,
    profile: patch.D014_VALIDATION_PROFILE,
  });
  const prRequestText = JSON.stringify({
    schema: impl.PR_SCHEMA,
    title: 'feat: fixture',
    body: 'Fixture only.\n\nRefs #9001',
  });
  const bundle = runtime.buildActivation({
    packetRef: PACKET,
    parentManifestText: manifestText,
    parentHandoffText: handoffText,
    requestText,
    patchBytes,
    validationRequestText,
    prRequestText,
    worktree: repo.worktree,
    sourceIdentity: SOURCE_IDENTITY,
  });
  return {
    ...repo, manifest, manifestText, handoffText, requestText, patchBytes,
    validationRequestText, prRequestText, bundle,
  };
}
function fakeChild() {
  const child = new EventEmitter();
  child.exitCode = null;
  child.killed = false;
  child.sent = [];
  child.send = (value, callback) => {
    child.sent.push(value);
    if (callback) callback(null);
  };
  return child;
}
function startRequest(bundle) {
  return {
    schema: runtime.START_SCHEMA,
    operation: 'start-fixed',
    packetRef: PACKET,
    phase: runtime.PHASE,
    runId: bundle.activation.runId,
    activationDigest: bundle.activation.activationDigest,
    expectedParentManifestId: bundle.guards.parentManifestId,
    expectedLeaseId: bundle.guards.leaseId,
    attemptId: 1,
  };
}

test('run identity is semantic and excludes fresh D013/D014 attempt guards', () => {
  const a = fixture();
  const b = fixture({leaseId: LEASE_B, packetHash: PACKET_HASH_B});
  try {
    assert.notEqual(a.manifest.manifestId, b.manifest.manifestId);
    assert.notEqual(a.bundle.guards.leaseId, b.bundle.guards.leaseId);
    assert.equal(a.bundle.activation.semanticRequestDigest, b.bundle.activation.semanticRequestDigest);
    assert.equal(a.bundle.activation.ownerImplementationIdentity, b.bundle.activation.ownerImplementationIdentity);
    assert.equal(a.bundle.activation.runId, b.bundle.activation.runId);
  } finally {
    a.cleanup();
    b.cleanup();
  }
});

test('activation materialization is immutable and exact replay is idempotent', () => {
  const f = fixture();
  try {
    const first = runtime.materializeActivation(f.bundle);
    assert.equal(first.status, 'CREATED');
    const second = runtime.materializeActivation(f.bundle);
    assert.equal(second.status, 'IDEMPOTENT');
    fs.writeFileSync(path.join(first.activationDir, 'request.json'), 'drift\n');
    assert.throws(() => runtime.materializeActivation(f.bundle),
      (error) => error instanceof runtime.RuntimeError
        && error.kind === 'CONFLICT'
        && error.reasonCodes.includes('BUNDLE_FILE_CONTENT_CONFLICT'));
  } finally {
    f.cleanup();
  }
});

test('state CAS and checkpoint/effect semantics reuse pure continuity owner', () => {
  const f = fixture();
  try {
    const m = runtime.materializeActivation(f.bundle);
    let state = runtime.writeState(m.runRoot, null, runtime.initialState(f.bundle.activation.runId));
    assert.equal(state.generation, 0);
    const e = {
      schema: runtime.CHECKPOINT_SCHEMA,
      checkpoint: 'WORKSPACE_READY',
      primitiveId: 'fixture-workspace',
      targetIdentity: 'manifest:' + f.manifest.manifestId,
      evidenceLocator: 'receipt:fixture:workspace',
      nextPrimitive: 'PATCH_PREPARE',
      finalReceiptDigest: null,
      finalReceiptLocator: null,
    };
    const persisted = runtime.persistCheckpoint(m.runRoot, e);
    assert.equal(persisted.state.lastDurableCheckpoint, 'WORKSPACE_READY');
    const replay = runtime.persistCheckpoint(m.runRoot, e);
    assert.equal(replay.status, 'IDEMPOTENT');
    assert.throws(() => runtime.persistCheckpoint(m.runRoot, {
      ...e,
      evidenceLocator: 'receipt:fixture:other',
    }), /CHECKPOINT_REWRITE_CONFLICT/);

    state = runtime.readState(m.runRoot);
    const bad = runtime.nextState(state, {
      checkpoint: 'NONE',
      checkpointEvidence: null,
    });
    assert.deepEqual(
      continuity.validateRecordTransition(state, bad).reasonCodes,
      ['RECORD_CHECKPOINT_REGRESSION'],
    );

    const effect = runtime.persistEffect(m.runRoot, {
      runId: f.bundle.activation.runId,
      primitiveId: 'fixture-remote',
      targetIdentity: 'remote:head',
      evidenceLocator: 'commit:' + f.head,
    });
    assert.equal(effect.disposition, 'APPEND');
    assert.equal(runtime.persistEffect(m.runRoot, {
      runId: f.bundle.activation.runId,
      primitiveId: 'fixture-remote',
      targetIdentity: 'remote:head',
      evidenceLocator: 'commit:' + f.head,
    }).disposition, 'IDEMPOTENT');
    assert.throws(() => runtime.persistEffect(m.runRoot, {
      runId: f.bundle.activation.runId,
      primitiveId: 'fixture-remote',
      targetIdentity: 'remote:head',
      evidenceLocator: 'commit:' + 'f'.repeat(40),
    }), /EFFECT_EVIDENCE_REWRITE_CONFLICT/);
  } finally {
    f.cleanup();
  }
});

test('connection observation alone does not change live-owner disposition', () => {
  const f = fixture();
  try {
    const m = runtime.materializeActivation(f.bundle);
    let state = runtime.writeState(m.runRoot, null, runtime.initialState(f.bundle.activation.runId));
    state = runtime.writeState(m.runRoot, state, runtime.nextState(state, {
      executionLifecycle: 'RUNNING',
      nextPrimitive: 'PATCH_PREPARE',
    }));
    const dispositions = ['ATTACHED', 'DETACHED', 'REATTACHED'].map((connectionObservation) => {
      const evidence = runtime.buildContinuityEvidence({
        activation: f.bundle.activation,
        state,
        ownerLiveness: 'LIVE',
        connectionObservation,
        finalRef: null,
      });
      const decision = continuity.classifyContinuity(evidence);
      return [decision.resumeDisposition, decision.effectTruth, decision.nextLegalAction];
    });
    assert.deepEqual(dispositions[0], dispositions[1]);
    assert.deepEqual(dispositions[1], dispositions[2]);
    assert.equal(dispositions[0][0], 'OWNER_STILL_RUNNING');
  } finally {
    f.cleanup();
  }
});

test('pure continuation routes exact authority forward and ambiguity to recovery', () => {
  const f = fixture();
  try {
    const activation = f.bundle.activation;
    const runId = activation.runId;
    const base = {
      schemaVersion: 1,
      mode: 'EXECUTION_CONTINUITY_EVIDENCE',
      packetRef: PACKET,
      phase: runtime.PHASE,
      ownerId: runtime.CONTINUITY_OWNER_ID,
      activationDigest: activation.activationDigest,
      runId,
      attemptId: 1,
      connectionObservation: 'REATTACHED',
      runtimeCapability: 'DETACHED_CAPABLE',
      ownerLiveness: 'ABSENT',
      executionLifecycle: 'WAITING',
      checkpoint: {state: 'EXACT', name: 'COMMIT_CREATED', evidenceLocator: 'commit:' + '3'.repeat(40)},
      journal: {state: 'ABSENT', effectKey: null, evidenceLocator: null},
      remoteEffect: {
        state: 'PROVEN',
        primitiveId: 'push',
        targetIdentity: 'remote:server/mcl-packet-9001',
        evidenceLocator: 'commit:' + '3'.repeat(40),
      },
      continuationAuthority: {state: 'PROVEN', evidenceLocator: 'receipt:continuation:proven'},
      nextPrimitive: {state: 'PROVEN', name: 'PUSH', evidenceLocator: 'receipt:continuation:proven'},
      finalReceipt: {state: 'ABSENT', digest: null, evidenceLocator: null},
    };
    const exact = continuity.classifyContinuity(base);
    assert.equal(exact.resumeDisposition, 'CONTINUE_FROM_CHECKPOINT');
    assert.equal(exact.duplicateEffectSuppressed, true);
    const ambiguous = continuity.classifyContinuity({
      ...base,
      remoteEffect: {
        state: 'UNKNOWN', primitiveId: null, targetIdentity: null,
        evidenceLocator: 'continuity-run:' + runId,
      },
    });
    assert.equal(ambiguous.resumeDisposition, 'NEEDS_RECOVERY_INSPECT');
  } finally {
    f.cleanup();
  }
});

test('duplicate start uses one child and supervisor restart never guesses liveness', () => {
  const f = fixture();
  try {
    runtime.materializeActivation(f.bundle);
    let forks = 0;
    const child = fakeChild();
    const supervisor = new service.RuntimeSupervisor({
      forkImpl() { forks += 1; return child; },
      worktreeResolver: () => f.worktree,
    });
    const request = startRequest(f.bundle);
    const first = supervisor.start(request);
    assert.equal(first.status, 'RUN_ACCEPTED');
    assert.equal(first.launchCountDelta, 1);
    const duplicate = supervisor.start(request);
    assert.equal(duplicate.status, 'RUN_ACCEPTED');
    assert.equal(duplicate.launchCountDelta, 0);
    assert.equal(duplicate.existing, true);
    assert.equal(forks, 1);

    const running = supervisor.inspect({
      schema: runtime.INSPECT_SCHEMA,
      operation: 'inspect',
      packetRef: PACKET,
      runId: f.bundle.activation.runId,
    }, {connectionObservation: 'DETACHED'});
    assert.equal(running.output.resumeDisposition, 'OWNER_STILL_RUNNING');

    const restarted = new service.RuntimeSupervisor({
      forkImpl() { forks += 1; return fakeChild(); },
      worktreeResolver: () => f.worktree,
    });
    const afterRestart = restarted.inspect({
      schema: runtime.INSPECT_SCHEMA,
      operation: 'inspect',
      packetRef: PACKET,
      runId: f.bundle.activation.runId,
    });
    assert.equal(afterRestart.result, 'UNKNOWN');
    assert.equal(afterRestart.output.resumeDisposition, 'UNKNOWN');
    const duplicateAfterRestart = restarted.start(request);
    assert.equal(duplicateAfterRestart.status, 'UNKNOWN');
    assert.equal(forks, 1);
  } finally {
    f.cleanup();
  }
});

test('finished state returns ALREADY_FINISHED and does not relaunch', () => {
  const f = fixture();
  try {
    const m = runtime.materializeActivation(f.bundle);
    let state = runtime.writeState(m.runRoot, null, runtime.initialState(f.bundle.activation.runId));
    const finalDigest = '9'.repeat(64);
    runtime.atomicWriteFile(path.join(m.runRoot, 'final-receipt.ref'), Buffer.from(JSON.stringify({
      digest: finalDigest,
      locator: 'local-artifact:fixture-final',
    }) + '\n'));
    state = runtime.writeState(m.runRoot, state, runtime.nextState(state, {
      executionLifecycle: 'FINISHED',
      checkpoint: 'FINISHED',
      checkpointEvidence: 'local-artifact:fixture-final',
      nextPrimitive: null,
      finalReceiptDigest: finalDigest,
    }));
    let forks = 0;
    const supervisor = new service.RuntimeSupervisor({
      forkImpl() { forks += 1; return fakeChild(); },
      worktreeResolver: () => f.worktree,
    });
    const result = supervisor.start(startRequest(f.bundle));
    assert.equal(result.status, 'ALREADY_FINISHED');
    assert.equal(result.launchCountDelta, 0);
    assert.equal(forks, 0);
  } finally {
    f.cleanup();
  }
});

test('strict public surfaces reject unsupported commands and fields', () => {
  assert.throws(() => runtime.parseCli(['cancel']), /COMMAND_UNSUPPORTED/);
  assert.throws(() => runtime.parseCli([
    'inspect', '--packet', PACKET, '--run-id', 'run-' + 'a'.repeat(64),
    '--command', 'rm',
  ]), /ARGUMENT_UNSUPPORTED:command/);
  assert.throws(() => service.parseRequest({
    schema: runtime.START_SCHEMA,
    operation: 'start-fixed',
    packetRef: PACKET,
    phase: runtime.PHASE,
    runId: 'run-' + 'a'.repeat(64),
    activationDigest: 'a'.repeat(64),
    expectedParentManifestId: 'b'.repeat(64),
    expectedLeaseId: 'c'.repeat(64),
    attemptId: 1,
    command: 'forbidden',
  }), /REQUEST_UNKNOWN_FIELD:command/);
});

test('service source is Unix-socket only and contains no HTTP/TCP listener', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-detached-owner-runtime-service.cjs'), 'utf8');
  assert(source.includes('netImpl.createServer'));
  assert(source.includes('server.listen(socketPath'));
  for (const token of ["require('node:http')", "require('node:https')", '.listen(0,', 'host:', 'port:']) {
    assert(!source.includes(token), token);
  }
});
