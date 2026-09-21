'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../..');
const INVOKER_PATH = path.join(
  ROOT,
  'products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs',
);
const inv = require(INVOKER_PATH);
const taskHandoff = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const taskLease = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));

const BASE = 'a'.repeat(40);
const NEW_HEAD = 'b'.repeat(40);
const LEASE = 'c'.repeat(64);
const HOLDER = 'd'.repeat(64);
const PATCH = Buffer.from(
  'diff --git a/docs/demo.txt b/docs/demo.txt\n'
  + '--- a/docs/demo.txt\n'
  + '+++ b/docs/demo.txt\n'
  + '@@ -1 +1 @@\n-one\n+two\n',
  'utf8',
);
const PATCH_HASH = crypto.createHash('sha256').update(PATCH).digest('hex');
const BODY = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  'IN_PROGRESS',
  '## Interaction stage',
  '- Current stage: IMPLEMENTATION_PR',
].join('\n');
const BODY_SHA = taskLease.digest(BODY);
const AUTHORITY = {...inv.FALSE_AUTHORITY};
const PATHS = ['docs/demo.txt'];
const SCOPES = PATHS.map((item) => 'path:' + item);
const D014_PATHS = [...inv.D014_COMPLETION_SET_PATHS];
const VALIDATION_REQUEST = {
  schema: inv.VALIDATION_REQUEST_SCHEMA,
  profile: inv.D014_VALIDATION_PROFILE,
};
const VALIDATION_TEXT = JSON.stringify(VALIDATION_REQUEST);
const VALIDATION_HASH = crypto.createHash('sha256')
  .update(Buffer.from(VALIDATION_TEXT, 'utf8')).digest('hex');
const WORKSPACE = {
  kind: 'repository',
  branch: 'server/patch-proof',
  worktree: '/root/nyang-worktrees/patch-proof',
};

function request(overrides = {}) {
  return {
    schema: 'mcl-repository-patch-request.v1',
    message: 'docs: bounded patch',
    expected_paths: [...PATHS],
    patch_sha256: PATCH_HASH,
    ...overrides,
  };
}
function manifest(overrides = {}) {
  const core = {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2520',
    packetBodySha256: BODY_SHA,
    phaseId: '2520-implementation-pr-s',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: [...SCOPES],
    workspace: {...WORKSPACE},
    observedBaseSha: BASE,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE,
      acquiredGeneration: 200,
      acquireEvidenceRef: 'run:999001',
    },
    sourceAuthorityRefs: ['#2520', 'issue:#2352'],
    inputRefs: [
      'receipt:mcl-repository-patch-request:' + PATCH_HASH,
      inv.PRIMITIVE_REF,
    ],
    expectedOutputRefs: [inv.PRIMITIVE_REF],
    acceptanceRefs: ['#2520'],
    stopCondition: 'Apply one bounded patch and stop.',
    authority: {...AUTHORITY},
  };
  return taskHandoff.buildManifest({...core, ...overrides});
}
function handoff(m, overrides = {}) {
  return {
    schema: 'mcl-execution-handoff.v1',
    status: 'HANDOFF_READY',
    packet_ref: m.packetRef,
    phase: '1/1',
    route: 'S',
    executor: 'S',
    effect_class: 'repository_mutation',
    manifest_id: m.manifestId,
    lease_id: m.leaseEvidence.leaseId,
    next_owner: 'existing_route_owner',
    reason_codes: [],
    mutation_authorized: false,
    execution_authorized: false,
    details: 'withheld',
    ...overrides,
  };
}
function activeLease(m, overrides = {}) {
  return {
    leaseId: m.leaseEvidence.leaseId,
    packetRef: m.packetRef,
    packetBodySha256: m.packetBodySha256,
    route: m.route,
    executor: m.executor,
    scopes: [...m.scopes],
    scopeFingerprint: 'e'.repeat(64),
    scopeDisposition: 'DISJOINT',
    workspace: {...m.workspace},
    observedBaseSha: m.observedBaseSha,
    sourceRefs: ['#2520', 'issue:#2352'],
    ...overrides,
  };
}
function currentEvidence(m, overrides = {}) {
  const lease = activeLease(m);
  return {
    packet: {state: 'open', body: BODY},
    ledger: {body: 'unused-by-stub'},
    context: {
      status: 'READY',
      reasonCodes: [],
      packetRef: m.packetRef,
      packetBodySha256: m.packetBodySha256,
      packetLifecycle: 'IN_PROGRESS',
      ledgerGeneration: 200,
      matchingLeaseIds: [lease.leaseId],
      normalizedScopes: [...m.scopes],
      ledgerState: {activeLeases: [lease]},
    },
    ...overrides,
  };
}
function primitive(phase, overrides = {}) {
  return {
    schema: 'mcl-worktree-patch.v1',
    status: 'PASS',
    phase,
    reason_codes: [],
    base_sha: BASE,
    branch: WORKSPACE.branch,
    changed_paths: [...PATHS],
    patch_sha256: PATCH_HASH,
    prepared_digest: 'f'.repeat(64),
    new_head: phase === 'PREPARE' ? null : NEW_HEAD,
    authority: {...AUTHORITY},
    details: 'withheld',
    ...overrides,
  };
}
function tempInputs() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-repo-patch-owner-test-'));
  const requestPath = path.join(dir, 'request.json');
  const patchPath = path.join(dir, 'request.patch');
  const manifestPath = path.join(dir, 'manifest.json');
  const handoffPath = path.join(dir, 'handoff.json');
  const m = manifest();
  fs.writeFileSync(requestPath, JSON.stringify(request()), 'utf8');
  fs.writeFileSync(patchPath, PATCH);
  fs.writeFileSync(manifestPath, JSON.stringify(m), 'utf8');
  fs.writeFileSync(handoffPath, JSON.stringify(handoff(m)), 'utf8');
  return {dir, requestPath, patchPath, manifestPath, handoffPath, manifest: m};
}

function d014Request(overrides = {}) {
  return {
    schema: 'mcl-repository-patch-request.v1',
    message: 'feat: add completion receipt set',
    expected_paths: [...D014_PATHS],
    patch_sha256: PATCH_HASH,
    ...overrides,
  };
}
function validationManifest(overrides = {}) {
  return manifest({
    scopes: D014_PATHS.map((item) => 'path:' + item),
    inputRefs: [
      'receipt:mcl-repository-patch-request:' + PATCH_HASH,
      inv.PRIMITIVE_REF,
      inv.VALIDATION_REF_PREFIX + VALIDATION_HASH,
    ],
    ...overrides,
  });
}
function tempValidationInputs() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-repo-patch-validation-test-'));
  const requestPath = path.join(dir, 'request.json');
  const patchPath = path.join(dir, 'request.patch');
  const validationPath = path.join(dir, 'validation.json');
  const manifestPath = path.join(dir, 'manifest.json');
  const handoffPath = path.join(dir, 'handoff.json');
  const m = validationManifest();
  fs.writeFileSync(requestPath, JSON.stringify(d014Request()), 'utf8');
  fs.writeFileSync(patchPath, PATCH);
  fs.writeFileSync(validationPath, VALIDATION_TEXT, 'utf8');
  fs.writeFileSync(manifestPath, JSON.stringify(m), 'utf8');
  fs.writeFileSync(handoffPath, JSON.stringify(handoff(m)), 'utf8');
  return {
    dir, requestPath, patchPath, validationPath, manifestPath, handoffPath, manifest: m,
  };
}
function d014Primitive(phase, overrides = {}) {
  return primitive(phase, {changed_paths: [...D014_PATHS], ...overrides});
}

function passReceipt(m = manifest()) {
  return inv.projectGenericReceipt({
    manifest: m,
    request: request(),
    primitiveSourceSha256: '1'.repeat(64),
    kind: 'PASS',
    prepare: primitive('PREPARE'),
    commit: primitive('COMMIT'),
    push: primitive('PUSH'),
    exitCode: 0,
  });
}

test('CLI accepts fixed data arguments plus bounded output format only', () => {
  const base = [
    '--repo', 'owner/repo',
    '--handoff-file', '/tmp/handoff.json',
    '--manifest-file', '/tmp/manifest.json',
    '--request-file', '/tmp/request.json',
    '--patch-file', '/tmp/request.patch',
  ];
  const parsed = inv.parseArgs(base);
  assert.equal(parsed.repo, 'owner/repo');
  assert.equal(parsed.format, 'receipt');
  assert.equal(inv.parseArgs([...base, '--format', 'agent-view']).format, 'agent-view');
  assert.throws(() => inv.parseArgs([...base, '--format', 'raw']), /FORMAT_INVALID/);
  assert.throws(() => inv.parseArgs([...base, '--report-file', '/tmp/out']), /ARGUMENT_INVALID/);
  assert.throws(() => inv.parseArgs([...base, '--command', 'git status']), /ARGUMENT_INVALID/);
});

test('request parser is strict and sorted', () => {
  const parsed = inv.parseRequestText(JSON.stringify(request({
    expected_paths: ['z.txt', 'a.txt'],
  })));
  assert.deepEqual(parsed.expected_paths, ['a.txt', 'z.txt']);
  assert.throws(
    () => inv.parseRequestText(JSON.stringify({...request(), branch: 'server/x'})),
    (error) => error.kind === 'UNKNOWN',
  );
});

test('handoff rejects non-ready and authority escalation', () => {
  const m = manifest();
  assert.equal(inv.parseHandoffText(JSON.stringify(handoff(m))).status, 'HANDOFF_READY');
  assert.throws(
    () => inv.parseHandoffText(JSON.stringify(handoff(m, {status: 'BLOCKED'}))),
    (error) => error.kind === 'BLOCKED',
  );
  assert.throws(
    () => inv.parseHandoffText(JSON.stringify(handoff(m, {execution_authorized: true}))),
    (error) => error.kind === 'CONFLICT',
  );
});

test('manifest binding matches patch paths against the manifest path subset', () => {
  const m = manifest();
  assert.doesNotThrow(() => inv.validateManifestBinding(m, handoff(m), request()));

  const withSurface = manifest({scopes: [...SCOPES, 'surface:mcl:demo']});
  assert.doesNotThrow(() => inv.validateManifestBinding(
    withSurface, handoff(withSurface), request(),
  ));

  const withMultipleSurfaces = manifest({
    scopes: [...SCOPES, 'surface:mcl:demo', 'surface:mcl:other'],
  });
  assert.doesNotThrow(() => inv.validateManifestBinding(
    withMultipleSurfaces, handoff(withMultipleSurfaces), request(),
  ));

  for (const scopes of [
    ['path:docs/other.txt'],
    [...SCOPES, 'path:docs/other.txt', 'surface:mcl:demo'],
    ['surface:mcl:demo'],
  ]) {
    const wrong = manifest({scopes});
    assert.throws(
      () => inv.validateManifestBinding(wrong, handoff(wrong), request()),
      (error) => error.kind === 'CONFLICT'
        && error.reasonCodes.includes('MANIFEST_SCOPE_CONFLICT'),
    );
  }
});

test('current evidence passes with exact lease and injected holder validator', () => {
  const m = manifest();
  let holderChecks = 0;
  const current = currentEvidence(m);
  assert.doesNotThrow(() => inv.validateCurrentEvidence({
    ...current,
    manifest: m,
    handoff: handoff(m),
    holderSecret: HOLDER,
    holderValidator: () => { holderChecks += 1; },
  }));
  assert.equal(holderChecks, 1);
});

test('current evidence keeps full lease-to-manifest scope equality with surfaces', () => {
  const m = manifest({scopes: [...SCOPES, 'surface:mcl:demo']});
  const current = currentEvidence(m);
  current.context.ledgerState.activeLeases[0].scopes = [...SCOPES];
  assert.throws(
    () => inv.validateCurrentEvidence({
      ...current,
      manifest: m,
      handoff: handoff(m),
      holderSecret: HOLDER,
      holderValidator: () => {},
    }),
    (error) => error.kind === 'CONFLICT'
      && error.reasonCodes.includes('LEASE_SCOPES_CONFLICT'),
  );
});

test('stage drift blocks before effect', () => {
  const m = manifest();
  const changed = BODY.replace('IMPLEMENTATION_PR', 'VALIDATION_MERGE');
  const current = currentEvidence(m, {
    packet: {state: 'open', body: changed},
  });
  current.context.packetBodySha256 = taskLease.digest(changed);
  assert.throws(
    () => inv.validateCurrentEvidence({
      ...current,
      manifest: m,
      handoff: handoff(m),
      holderSecret: HOLDER,
      holderValidator: () => {},
    }),
    (error) => error.kind === 'BLOCKED'
      && error.reasonCodes.includes('PACKET_STAGE_NOT_IMPLEMENTATION_PR'),
  );
});

test('packet digest drift conflicts before effect', () => {
  const m = manifest();
  const changed = BODY + '\nextra';
  const current = currentEvidence(m, {
    packet: {state: 'open', body: changed},
  });
  current.context.packetBodySha256 = taskLease.digest(changed);
  assert.throws(
    () => inv.validateCurrentEvidence({
      ...current,
      manifest: m,
      handoff: handoff(m),
      holderSecret: HOLDER,
      holderValidator: () => {},
    }),
    (error) => error.kind === 'CONFLICT'
      && error.reasonCodes.includes('PACKET_BODY_DIGEST_CONFLICT'),
  );
});

test('missing active lease blocks before effect', () => {
  const m = manifest();
  const current = currentEvidence(m);
  current.context.ledgerState.activeLeases = [];
  assert.throws(
    () => inv.validateCurrentEvidence({
      ...current,
      manifest: m,
      handoff: handoff(m),
      holderSecret: HOLDER,
      holderValidator: () => {},
    }),
    (error) => error.kind === 'BLOCKED'
      && error.reasonCodes.includes('ACTIVE_LEASE_REQUIRED'),
  );
});

test('PASS executes fixed prepare commit push with three guards and generic receipt', async () => {
  const inputs = tempInputs();
  try {
    const m = manifest();
    const h = handoff(m);
    let guards = 0;
    const calls = [];
    const phases = [primitive('PREPARE'), primitive('COMMIT'), primitive('PUSH')];
    const spawn = (file, args, options) => {
      calls.push({file, args, options});
      const value = phases[calls.length - 1];
      return {status: 0, signal: null, stdout: JSON.stringify(value), stderr: ''};
    };
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(h),
      manifestText: JSON.stringify(m),
      requestText: JSON.stringify(request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      env: {
        PATH: process.env.PATH || '/usr/bin:/bin',
        HOME: '/root',
        MCL_WORKSPACE_HOLDER_CLAIM: HOLDER,
        GH_TOKEN: 'must-not-propagate',
        GITHUB_TOKEN: 'must-not-propagate',
      },
      guardImpl: async () => { guards += 1; },
      spawnSyncImpl: spawn,
      root: ROOT,
    });
    assert.equal(guards, 3);
    assert.equal(calls.length, 3);
    assert(calls[0].args.includes('prepare'));
    assert(calls[1].args.includes('commit'));
    assert(calls[2].args.includes('push'));
    for (const call of calls) {
      assert.equal(call.options.shell, false);
      assert.equal(call.options.env.GH_TOKEN, undefined);
      assert.equal(call.options.env.GITHUB_TOKEN, undefined);
      assert.equal(call.options.env.MCL_WORKSPACE_HOLDER_CLAIM, undefined);
    }
    assert.equal(receipt.validity, 'VALID');
    assert.equal(receipt.schemaVersion, 2);
    assert.equal(receipt.executionLifecycle, 'FINISHED');
    assert.equal(receipt.attentionDisposition, 'COMPLETE');
    assert.equal(receipt.result, 'PASS');
    assert.equal(receipt.primitiveId, 'mcl:repository-worktree-patch');
    assert.deepEqual(receipt.affectedFiles, PATHS);
    assert.equal(receipt.nextLegalAction,
      'HOLDER_CHECK_THEN_RELEASE_D013_AND_RECORD_D014_COMPLETION');
    assert.equal(receipt.mutationAuthorized, false);
    assert.equal(receipt.executionAuthorized, false);
    assert.equal(receipt.releaseAuthorized, false);
    assert.equal(receipt.productionAuthorized, false);
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('prepare block stops sequence before commit and push', async () => {
  const inputs = tempInputs();
  try {
    const m = manifest();
    let calls = 0;
    const spawn = () => {
      calls += 1;
      return {
        status: 2,
        signal: null,
        stdout: JSON.stringify(primitive('PREPARE', {
          status: 'BLOCKED',
          reason_codes: ['PATCH_DOES_NOT_APPLY'],
          prepared_digest: null,
        })),
        stderr: '',
      };
    };
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(m)),
      manifestText: JSON.stringify(m),
      requestText: JSON.stringify(request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: spawn,
      root: ROOT,
    });
    assert.equal(calls, 1);
    assert.equal(receipt.result, 'BLOCKED');
    assert(receipt.blockers.includes('PATCH_PREPARE_BLOCKED'));
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('commit block preserves partial prepare evidence and stops before push', async () => {
  const inputs = tempInputs();
  try {
    const m = manifest();
    let calls = 0;
    const spawn = () => {
      calls += 1;
      const value = calls === 1 ? primitive('PREPARE') : primitive('COMMIT', {
        status: 'BLOCKED',
        reason_codes: ['PREPARED_DIGEST_CONFLICT'],
        new_head: null,
      });
      return {status: calls === 1 ? 0 : 2, signal: null,
        stdout: JSON.stringify(value), stderr: ''};
    };
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(m)),
      manifestText: JSON.stringify(m),
      requestText: JSON.stringify(request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: spawn,
      root: ROOT,
    });
    assert.equal(calls, 2);
    assert.equal(receipt.result, 'BLOCKED');
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('primitive authority escalation is conflict', () => {
  assert.throws(
    () => inv.parsePrimitiveResult(JSON.stringify(primitive('PREPARE', {
      authority: {...AUTHORITY, repositoryMutationAuthorized: true},
    })), 'PREPARE'),
    (error) => error.kind === 'CONFLICT',
  );
});

test('source exposes no generic command owner or retry surface', () => {
  const source = fs.readFileSync(INVOKER_PATH, 'utf8');
  assert(!source.includes("'command'"));
  assert(!source.includes("'owner-id'"));
  assert(!source.includes("'adapter-id'"));
  assert(!source.includes('shell: true'));
  assert(source.includes('shell: false'));
  assert(source.includes("'repo', 'handoff-file', 'manifest-file', 'request-file', 'patch-file', 'format'"));
  assert(!source.includes("'report-file'"));
  assert(source.includes(inv.PRIMITIVE_RELATIVE));
});

test('safe child environment strips holder and auth material', () => {
  assert.deepEqual(inv.safeChildEnv({
    PATH: '/x',
    HOME: '/h',
    LANG: 'C',
    MCL_WORKSPACE_HOLDER_CLAIM: HOLDER,
    GH_TOKEN: 'secret',
    GITHUB_TOKEN: 'secret2',
  }), {PATH: '/x', HOME: '/h', LANG: 'C'});
});

test('holder conflict remains conflict before effect', () => {
  const m = manifest();
  const current = currentEvidence(m);
  assert.throws(
    () => inv.validateCurrentEvidence({
      ...current,
      manifest: m,
      handoff: handoff(m),
      holderSecret: HOLDER,
      holderValidator: () => {
        throw new inv.InvocationError('CONFLICT', ['HOLDER_CLAIM_INVALID']);
      },
    }),
    (error) => error.kind === 'CONFLICT' && error.reasonCodes.includes('HOLDER_CLAIM_INVALID'),
  );
});

test('guard drift after prepare preserves prepare PASS evidence and skips later effects', async () => {
  const inputs = tempInputs();
  try {
    const m = manifest();
    let guards = 0;
    let calls = 0;
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(m)),
      manifestText: JSON.stringify(m),
      requestText: JSON.stringify(request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {
        guards += 1;
        if (guards === 2) throw new inv.InvocationError('CONFLICT', ['CURRENTNESS_DRIFT']);
      },
      spawnSyncImpl: () => {
        calls += 1;
        return {status: 0, signal: null, stdout: JSON.stringify(primitive('PREPARE')), stderr: ''};
      },
      root: ROOT,
    });
    assert.equal(guards, 2);
    assert.equal(calls, 1);
    assert.equal(receipt.result, 'CONFLICT');
    assert(receipt.conflicts.includes('CURRENTNESS_DRIFT'));
    const byName = new Map(receipt.steps.map((step) => [step.name, step.result]));
    assert.equal(byName.get('patch-prepare'), 'PASS');
    assert.equal(byName.get('patch-commit'), 'SKIPPED');
    assert.equal(byName.get('patch-push-postverify'), 'SKIPPED');
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('guard drift after commit preserves prepare and commit PASS evidence', async () => {
  const inputs = tempInputs();
  try {
    const m = manifest();
    let guards = 0;
    let calls = 0;
    const values = [primitive('PREPARE'), primitive('COMMIT')];
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(m)),
      manifestText: JSON.stringify(m),
      requestText: JSON.stringify(request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {
        guards += 1;
        if (guards === 3) throw new inv.InvocationError('BLOCKED', ['LEASE_MOVED']);
      },
      spawnSyncImpl: () => {
        const value = values[calls];
        calls += 1;
        return {status: 0, signal: null, stdout: JSON.stringify(value), stderr: ''};
      },
      root: ROOT,
    });
    assert.equal(guards, 3);
    assert.equal(calls, 2);
    assert.equal(receipt.result, 'BLOCKED');
    assert(receipt.blockers.includes('LEASE_MOVED'));
    const byName = new Map(receipt.steps.map((step) => [step.name, step.result]));
    assert.equal(byName.get('patch-prepare'), 'PASS');
    assert.equal(byName.get('patch-commit'), 'PASS');
    assert.equal(byName.get('patch-push-postverify'), 'SKIPPED');
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('agent-view sidecars are fixed, restrictive and secret-free', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-agent-view-sidecar-'));
  try {
    const m = manifest();
    const receipt = passReceipt(m);
    const locators = inv.persistAgentArtifacts(receipt, m, {
      workspaceInspector: () => ({ok: true, reasonCodes: [], holderPath: path.join(dir, 'holder.json')}),
    });
    const receiptPath = locators.receiptLocator.slice('local-artifact:'.length).split('#sha256=')[0];
    const reportPath = locators.reportLocator.slice('local-artifact:'.length).split('#sha256=')[0];
    for (const filePath of [receiptPath, reportPath]) {
      const stat = fs.lstatSync(filePath);
      assert.equal(stat.isFile(), true);
      assert.equal(stat.isSymbolicLink(), false);
      assert.equal(stat.mode & 0o777, 0o600);
      const text = fs.readFileSync(filePath, 'utf8');
      assert(!text.includes(HOLDER));
      assert(!text.includes('GH_TOKEN'));
      assert(!text.includes('GITHUB_TOKEN'));
      assert(!text.includes(PATCH.toString('utf8')));
    }
    const storedReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    const storedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.equal(storedReceipt.schemaVersion, 2);
    assert.equal(storedReceipt.mode, 'REPOSITORY_EXECUTION_RECEIPT');
    assert.equal(storedReport.mode, 'MCL_REPOSITORY_PATCH_EXECUTION_REPORT');
    assert.equal(storedReport.receiptDigest, receipt.receiptDigest);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('repository patch decision view derives bounded PASS effect output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-agent-view-project-'));
  try {
    const m = manifest();
    const receipt = passReceipt(m);
    const projected = inv.projectOwnerAgentView(receipt, m, {
      workspaceInspector: () => ({ok: true, reasonCodes: [], holderPath: path.join(dir, 'holder.json')}),
    });
    assert.equal(projected.validity, 'VALID');
    assert.equal(projected.mode, 'REPOSITORY_AGENT_DECISION_VIEW');
    assert.equal(projected.phase, 'IMPLEMENTATION_EFFECT');
    assert.equal(projected.executionLifecycle, 'FINISHED');
    assert.equal(projected.attentionDisposition, 'COMPLETE');
    assert.equal(projected.result, 'PASS');
    assert.equal(projected.output.owner, 'repository-patch-owner');
    assert.equal(projected.output.filesChanged, 1);
    assert.equal(projected.output.commitCreated, true);
    assert.equal(projected.output.remoteHeadExact, true);
    assert.equal(projected.output.commitLocator, 'commit:' + NEW_HEAD);
    assert.equal(projected.output.pr, null);
    assert.equal(projected.attention.length, 0);
    assert.equal(projected.nextLegalAction,
      'HOLDER_CHECK_THEN_RELEASE_D013_AND_RECORD_D014_COMPLETION');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('sidecar failure weakens only the decision view to UNKNOWN', () => {
  const m = manifest();
  const receipt = passReceipt(m);
  const projected = inv.projectOwnerAgentView(receipt, m, {
    workspaceInspector: () => ({ok: true, reasonCodes: [], holderPath: '/tmp/holder.json'}),
    writer: () => { throw new Error('write unavailable'); },
  });
  assert.equal(receipt.result, 'PASS');
  assert.equal(projected.validity, 'INVALID');
  assert.equal(projected.result, 'UNKNOWN');
  assert.equal(projected.receiptLocator, null);
  assert.equal(projected.reportLocator, null);
});

test('agent-view CLI mode emits only the final decision view', async () => {
  const inputs = tempInputs();
  try {
    let calls = 0;
    const phases = [primitive('PREPARE'), primitive('COMMIT'), primitive('PUSH')];
    const result = await inv.runCli([
      '--repo', 'owner/repo',
      '--handoff-file', inputs.handoffPath,
      '--manifest-file', inputs.manifestPath,
      '--request-file', inputs.requestPath,
      '--patch-file', inputs.patchPath,
      '--format', 'agent-view',
    ], {
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: () => {
        const value = phases[calls++];
        return {status: 0, signal: null, stdout: JSON.stringify(value), stderr: ''};
      },
      root: ROOT,
      agentViewImpl: (receipt) => ({
        schemaVersion: 1,
        mode: 'REPOSITORY_AGENT_DECISION_VIEW',
        validity: 'VALID',
        phase: 'IMPLEMENTATION_EFFECT',
        executionLifecycle: receipt.executionLifecycle,
        attentionDisposition: receipt.attentionDisposition,
        result: receipt.result,
        criticalTruncated: false,
      }),
    });
    const parsed = JSON.parse(result.text);
    assert.equal(calls, 3);
    assert.equal(parsed.mode, 'REPOSITORY_AGENT_DECISION_VIEW');
    assert.equal(parsed.result, 'PASS');
    assert.equal(result.text.includes('REPOSITORY_EXECUTION_RECEIPT'), false);
    assert.equal(result.code, 0);
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});


test('validation request parser is strict and profile-bound', () => {
  assert.deepEqual(inv.parseValidationRequestText(VALIDATION_TEXT), VALIDATION_REQUEST);
  assert.throws(
    () => inv.parseValidationRequestText(JSON.stringify({...VALIDATION_REQUEST, command: 'node x'})),
    (error) => error.kind === 'UNKNOWN'
      && error.reasonCodes.includes('VALIDATION_REQUEST_UNKNOWN_FIELD:command'),
  );
  assert.throws(
    () => inv.parseValidationRequestText(JSON.stringify({
      schema: inv.VALIDATION_REQUEST_SCHEMA,
      profile: 'mcl:other:v1',
    })),
    (error) => error.kind === 'BLOCKED'
      && error.reasonCodes.includes('VALIDATION_PROFILE_UNSUPPORTED'),
  );
});

test('manifest-bound fixed validation passes between prepare and commit', async () => {
  const inputs = tempValidationInputs();
  try {
    let guards = 0;
    let primitiveCalls = 0;
    const validationCalls = [];
    const phases = [
      d014Primitive('PREPARE'),
      d014Primitive('COMMIT'),
      d014Primitive('PUSH'),
    ];
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(inputs.manifest)),
      manifestText: JSON.stringify(inputs.manifest),
      requestText: JSON.stringify(d014Request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      validationRequestText: VALIDATION_TEXT,
      validationRequestFile: inputs.validationPath,
      env: {
        PATH: '/x',
        HOME: '/h',
        LANG: 'C',
        MCL_WORKSPACE_HOLDER_CLAIM: HOLDER,
        GH_TOKEN: 'must-not-propagate',
        GITHUB_TOKEN: 'must-not-propagate',
      },
      guardImpl: async () => { guards += 1; },
      spawnSyncImpl: () => ({
        status: 0,
        signal: null,
        stdout: JSON.stringify(phases[primitiveCalls++]),
        stderr: '',
      }),
      validationSpawnSyncImpl: (command, args, options) => {
        validationCalls.push({command, args, options});
        return {status: 0, signal: null, stdout: '', stderr: ''};
      },
      root: ROOT,
    });
    assert.equal(guards, 4);
    assert.equal(primitiveCalls, 3);
    assert.equal(validationCalls.length, inv.D014_VALIDATION_CHECKS.length);
    for (let i = 0; i < validationCalls.length; i += 1) {
      const call = validationCalls[i];
      assert.equal(call.command, process.execPath);
      assert.deepEqual(call.args, inv.D014_VALIDATION_CHECKS[i].args);
      assert.equal(call.options.cwd, WORKSPACE.worktree);
      assert.equal(call.options.shell, false);
      assert.equal(call.options.env.GH_TOKEN, undefined);
      assert.equal(call.options.env.GITHUB_TOKEN, undefined);
      assert.equal(call.options.env.MCL_WORKSPACE_HOLDER_CLAIM, undefined);
    }
    assert.equal(receipt.result, 'PASS');
    const byName = new Map(receipt.steps.map((step) => [step.name, step.result]));
    assert.equal(byName.get('patch-prepare'), 'PASS');
    assert.equal(byName.get('prepared-validation'), 'PASS');
    assert.equal(byName.get('patch-commit'), 'PASS');
    assert.equal(byName.get('patch-push-postverify'), 'PASS');
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('validation request requires exact manifest inputRef before prepare', async () => {
  const inputs = tempValidationInputs();
  try {
    const m = validationManifest({
      inputRefs: [
        'receipt:mcl-repository-patch-request:' + PATCH_HASH,
        inv.PRIMITIVE_REF,
      ],
    });
    let primitiveCalls = 0;
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(m)),
      manifestText: JSON.stringify(m),
      requestText: JSON.stringify(d014Request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      validationRequestText: VALIDATION_TEXT,
      validationRequestFile: inputs.validationPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: () => { primitiveCalls += 1; throw new Error('unexpected primitive'); },
      root: ROOT,
    });
    assert.equal(primitiveCalls, 0);
    assert.equal(receipt.result, 'BLOCKED');
    assert(receipt.blockers.includes('VALIDATION_REQUEST_REF_REQUIRED'));
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('fixed profile rejects any non-reviewed patch path set', async () => {
  const inputs = tempValidationInputs();
  try {
    const validationRef = inv.VALIDATION_REF_PREFIX + VALIDATION_HASH;
    const m = manifest({
      inputRefs: [
        'receipt:mcl-repository-patch-request:' + PATCH_HASH,
        inv.PRIMITIVE_REF,
        validationRef,
      ],
    });
    fs.writeFileSync(inputs.requestPath, JSON.stringify(request()), 'utf8');
    let primitiveCalls = 0;
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(m)),
      manifestText: JSON.stringify(m),
      requestText: JSON.stringify(request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      validationRequestText: VALIDATION_TEXT,
      validationRequestFile: inputs.validationPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: () => { primitiveCalls += 1; throw new Error('unexpected primitive'); },
      root: ROOT,
    });
    assert.equal(primitiveCalls, 0);
    assert.equal(receipt.result, 'BLOCKED');
    assert(receipt.blockers.includes('VALIDATION_PROFILE_PATHS_UNSUPPORTED'));
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('fixed validation failure preserves prepare and skips commit push', async () => {
  const inputs = tempValidationInputs();
  try {
    let primitiveCalls = 0;
    let validationCalls = 0;
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(inputs.manifest)),
      manifestText: JSON.stringify(inputs.manifest),
      requestText: JSON.stringify(d014Request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      validationRequestText: VALIDATION_TEXT,
      validationRequestFile: inputs.validationPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: () => {
        primitiveCalls += 1;
        return {
          status: 0, signal: null,
          stdout: JSON.stringify(d014Primitive('PREPARE')), stderr: '',
        };
      },
      validationSpawnSyncImpl: () => {
        validationCalls += 1;
        return validationCalls === 2
          ? {status: 1, signal: null, stdout: '', stderr: 'fixture failure'}
          : {status: 0, signal: null, stdout: '', stderr: ''};
      },
      root: ROOT,
    });
    assert.equal(primitiveCalls, 1);
    assert.equal(validationCalls, 2);
    assert.equal(receipt.result, 'BLOCKED');
    assert(receipt.blockers.includes(
      'PREPARED_VALIDATION_FAILED:completion-test-syntax'));
    const byName = new Map(receipt.steps.map((step) => [step.name, step.result]));
    assert.equal(byName.get('patch-prepare'), 'PASS');
    assert.equal(byName.get('prepared-validation'), 'BLOCKED');
    assert.equal(byName.get('patch-commit'), 'SKIPPED');
    assert.equal(byName.get('patch-push-postverify'), 'SKIPPED');
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('validation request byte drift fails closed before commit', async () => {
  const inputs = tempValidationInputs();
  try {
    let primitiveCalls = 0;
    let validationCalls = 0;
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(inputs.manifest)),
      manifestText: JSON.stringify(inputs.manifest),
      requestText: JSON.stringify(d014Request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      validationRequestText: VALIDATION_TEXT,
      validationRequestFile: inputs.validationPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: () => {
        primitiveCalls += 1;
        return {
          status: 0, signal: null,
          stdout: JSON.stringify(d014Primitive('PREPARE')), stderr: '',
        };
      },
      validationSpawnSyncImpl: () => {
        validationCalls += 1;
        if (validationCalls === 1) {
          fs.writeFileSync(inputs.validationPath, VALIDATION_TEXT + '\\n', 'utf8');
        }
        return {status: 0, signal: null, stdout: '', stderr: ''};
      },
      root: ROOT,
    });
    assert.equal(primitiveCalls, 1);
    assert.equal(validationCalls, inv.D014_VALIDATION_CHECKS.length);
    assert.equal(receipt.result, 'CONFLICT');
    assert(receipt.conflicts.includes('VALIDATION_REQUEST_CHANGED_DURING_INVOCATION'));
    const byName = new Map(receipt.steps.map((step) => [step.name, step.result]));
    assert.equal(byName.get('patch-prepare'), 'PASS');
    assert.equal(byName.get('prepared-validation'), 'PASS');
    assert.equal(byName.get('patch-commit'), 'SKIPPED');
    assert.equal(byName.get('patch-push-postverify'), 'SKIPPED');
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('validation binding without in-process request cannot silently bypass profile', async () => {
  const inputs = tempValidationInputs();
  try {
    let primitiveCalls = 0;
    const receipt = await inv.invokeLive({
      repo: 'owner/repo',
      handoffText: JSON.stringify(handoff(inputs.manifest)),
      manifestText: JSON.stringify(inputs.manifest),
      requestText: JSON.stringify(d014Request()),
      requestFile: inputs.requestPath,
      patchFile: inputs.patchPath,
      env: {MCL_WORKSPACE_HOLDER_CLAIM: HOLDER},
      guardImpl: async () => {},
      spawnSyncImpl: () => { primitiveCalls += 1; throw new Error('unexpected primitive'); },
      root: ROOT,
    });
    assert.equal(primitiveCalls, 0);
    assert.equal(receipt.result, 'BLOCKED');
    assert(receipt.blockers.includes('VALIDATION_REQUEST_INPUT_REQUIRED'));
    assert(receipt.steps.some((step) => step.name === 'prepared-validation'));
  } finally {
    fs.rmSync(inputs.dir, {recursive: true, force: true});
  }
});

test('public CLI exposes no validation command or profile selector', () => {
  const source = fs.readFileSync(INVOKER_PATH, 'utf8');
  for (const token of [
    "'validation-command'",
    "'validation-profile'",
    "'validation-file'",
    "'command'",
    "'argv'",
    "'executable'",
  ]) assert(!source.includes(token), token);
});
