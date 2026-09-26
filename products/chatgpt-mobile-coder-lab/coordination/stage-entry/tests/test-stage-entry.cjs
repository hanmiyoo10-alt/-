#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const test = require('node:test');

const stage = require('../mcl-stage-entry.cjs');
const workspace = require('../workspace-prepare.cjs');
const patchOwner = require('../../../device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs');

const MAIN = 'a'.repeat(40);
const PACKET_BODY = `<!-- canonical-main-work-packet:v1 -->
## State
\`IN_PROGRESS\`
## Bounded write scope
1. \`path:docs/demo.md\`
## Interaction stage
- Current stage: \`IMPLEMENTATION_PR\`
- Completed stage(s): \`AUTHORITY_SCOPE\`
- Next stage: \`IMPLEMENTATION_PR\`
## Handoff
fixture`;

function plan(overrides = {}) {
  return {
    schema: 'mcl-dispatch-plan.v1',
    phase: '1/1',
    route: 'S',
    executor: 'S',
    preflight_owner: 'mcl-preflight',
    repository_effect: 'mutable',
    overlap_guard: 'required',
    lease_guard: 'required',
    handoff_guard: 'required',
    fallback: 'M_candidate',
    next_gate: 'preflight',
    details: 'withheld',
    ...overrides,
  };
}

function opsBody(sha = MAIN) {
  return `## Canonical Operator Capsule
- STATE: \`CLEAR\`
- MAIN: \`${sha}\` / Required PASS — run 1
- CHANGE: LOW
- WHY: \`NONE\`
- NEXT: \`NONE\`
- AUTHORITY: fixture
- UNKNOWN: NONE

`;
}

function response(code, value) {
  return {code, stdout: typeof value === 'string' ? value : JSON.stringify(value), stderr: ''};
}

function inspectRunner({mainSequence = [MAIN, MAIN], preflight = 'pass', landingMain = MAIN, landingRemoteMain = MAIN, issueRows = null} = {}) {
  let mainRead = 0;
  return (args) => {
    if (args[0] === 'gh' && args[1] === 'api') {
      const endpoint = args[2];
      if (endpoint === `repos/${stage.REPO}/branches/main`) {
        const sha = mainSequence[Math.min(mainRead, mainSequence.length - 1)];
        mainRead += 1;
        return response(0, {commit: {sha}});
      }
      if (endpoint === `repos/${stage.REPO}/issues/485`) return response(0, {body: opsBody(mainSequence[0])});
      if (endpoint === `repos/${stage.REPO}/issues/77`) {
        return response(0, {number: 77, state: 'open', body: PACKET_BODY});
      }
      if (endpoint.startsWith(`repos/${stage.REPO}/issues?`)) {
        return response(0, issueRows || [{number: 77, state: 'open', body: PACKET_BODY}]);
      }
      throw new Error(`unexpected gh endpoint ${endpoint}`);
    }
    if (String(args[0]).endsWith('/s-env-status')) {
      return response(0, [
        'schema=mcl-s-env-status.v1',
        'common_ubuntu_profile=pass',
        `github_cli_auth=${preflight}`,
        'repository_access=pass',
        'details=withheld',
        '',
      ].join('\n'));
    }
    if (String(args[0]).endsWith('/mcl-landing-freshness')) {
      return response(0, [
        'schema=mcl-landing-freshness.v1',
        'operation=status',
        'route=S',
        'intended_branch=server/work',
        'actual_branch=server/work',
        'worktree=clean',
        `landing_head=${'b'.repeat(40)}`,
        `origin_main=${landingMain}`,
        `remote_main=${landingRemoteMain}`,
        `origin_remote_relation=${landingMain === landingRemoteMain ? 'same' : 'stale'}`,
        'landing_relation=behind_ff',
        'refresh=not_requested',
        'details=withheld',
        '',
      ].join('\n'));
    }
    if (args[0] === 'git') {
      if (args.includes('cat-file')) return response(0, '');
      if (args.includes('show-ref')) return response(1, '');
      if (args.includes('worktree') && args.includes('list')) return response(0, '');
      if (args.includes('ls-remote')) return response(2, '');
    }
    throw new Error(`unexpected args ${args.join(' ')}`);
  };
}

function tempProfile() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-stage-entry-test-'));
  const worktreeRoot = path.join(root, 'worktrees');
  fs.mkdirSync(worktreeRoot, {recursive: true});
  return {
    root,
    profile: {
      control: path.join(root, 'control'),
      worktreeRoot,
      branchPrefix: 'server/mcl-packet-',
      targetPrefix: 'mcl-packet-',
      remote: 'origin',
    },
    close() { fs.rmSync(root, {recursive: true, force: true}); },
  };
}

function localCreateRemote(f) {
  return ({identity, baseSha}) => {
    const ref = `refs/heads/${identity.branch}`;
    const before = childProcess.spawnSync('git', ['-C', f.profile.control, 'ls-remote', '--exit-code', 'origin', ref], {encoding: 'utf8'});
    if (before.status === 0 || before.status !== 2) return {ok: false};
    const push = childProcess.spawnSync('git', ['-C', f.profile.control, 'push', '-q', 'origin', `${baseSha}:${ref}`], {encoding: 'utf8'});
    return {ok: push.status === 0};
  };
}

function gitFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-stage-entry-apply-'));
  const remote = path.join(root, 'remote.git');
  const control = path.join(root, 'control');
  const worktreeRoot = path.join(root, 'worktrees');
  fs.mkdirSync(worktreeRoot, {recursive: true});
  const run = (args) => {
    const value = childProcess.spawnSync(args[0], args.slice(1), {encoding: 'utf8', shell: false});
    if (value.status !== 0) throw new Error(value.stderr);
    return (value.stdout || '').trim();
  };
  run(['git', 'init', '--bare', '-q', remote]);
  run(['git', 'init', '-q', '-b', 'main', control]);
  fs.writeFileSync(path.join(control, 'README.md'), 'seed\n');
  run(['git', '-C', control, 'add', 'README.md']);
  run(['git', '-C', control, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
    'commit', '-qm', 'seed']);
  run(['git', '-C', control, 'remote', 'add', 'origin', remote]);
  run(['git', '-C', control, 'push', '-q', '-u', 'origin', 'main']);
  const base = run(['git', '-C', control, 'rev-parse', 'HEAD']);
  return {
    root, base,
    profile: {control, worktreeRoot, branchPrefix: 'server/mcl-packet-', targetPrefix: 'mcl-packet-', remote: 'origin'},
    close() { fs.rmSync(root, {recursive: true, force: true}); },
  };
}

test('plan parser accepts only the reviewed S/S mutable shape', () => {
  assert.equal(stage.parsePlan(plan()).route, 'S');
  assert.throws(() => stage.parsePlan(plan({executor: 'M'})), /PLAN_EXECUTOR_UNSUPPORTED/);
  assert.throws(() => stage.parsePlan({...plan(), command: 'git status'}), /PLAN_UNKNOWN_FIELD/);
});

test('source-main binding is optional, strict, and launcher-owned', () => {
  const direct = stage.parseArgs(['inspect', '--packet', '#77', '--plan', '/tmp/plan.json']);
  assert.equal(direct.sourceMain, null);
  const bound = stage.parseArgs([
    'inspect', '--packet', '#77', '--plan', '/tmp/plan.json', '--source-main', MAIN,
  ]);
  assert.equal(bound.sourceMain, MAIN);
  assert.throws(() => stage.parseArgs([
    'inspect', '--packet', '#77', '--plan', '/tmp/plan.json', '--source-main', 'main',
  ]), /SOURCE_MAIN_INVALID/);
});

test('target scope parsing delegates exact Work System grammar and preserves stage-entry guards', () => {
  assert.deepEqual(stage.extractPacketScopes(PACKET_BODY), ['path:docs/demo.md']);

  for (const heading of [
    'Bounded write scope',
    'Bounded implementation write scope',
    'Locked write scope',
    'Bounded IMPLEMENTATION_PR write scope',
    'Repository write-scope ceiling used by IMPLEMENTATION_PR',
    'Bounded repository write ceiling',
  ]) {
    const body = PACKET_BODY.replace('Bounded write scope', heading)
      .replace('1. \`path:docs/demo.md\`', '1. path:src/**\n2. surface:mcl:demo');
    assert.deepEqual(stage.extractPacketScopes(body), ['path:src/**', 'surface:mcl:demo']);
  }

  const preserved = PACKET_BODY.replace(
    '1. \`path:docs/demo.md\`',
    '1. path:src/**\nPreservation: \`path:docs/preserve.md\`',
  );
  assert.deepEqual(stage.extractPacketScopes(preserved), ['path:src/**']);

  const fenced = PACKET_BODY.replace(
    '1. \`path:docs/demo.md\`',
    '1. path:src/**\n~~~text\n## Locked write scope\n1. path:ignored/**\n~~~',
  );
  assert.deepEqual(stage.extractPacketScopes(fenced), ['path:src/**']);

  assert.throws(() => stage.extractPacketScopes(
    PACKET_BODY.replace('Bounded write scope', 'Implementation write scope')),
  /PACKET_SCOPE_UNRESOLVED/);
  assert.throws(() => stage.extractPacketScopes(
    `${PACKET_BODY}\n## Locked write scope\n1. \`path:src/**\``),
  /PACKET_SCOPE_CONFLICT/);
  assert.throws(() => stage.extractPacketScopes(
    PACKET_BODY.replace('1. \`path:docs/demo.md\`', '1. path:../src/**')),
  /PACKET_SCOPE_UNRESOLVED/);
  assert.throws(() => stage.extractPacketScopes(
    PACKET_BODY.replace('1. \`path:docs/demo.md\`', '1. path:docs/demo.md\n2. path:docs/demo.md')),
  /PACKET_SCOPE_DUPLICATE/);
});

test('ops capsule requires exact main, Required PASS, CLEAR and UNKNOWN NONE', () => {
  assert.equal(stage.parseOpsCapsule(opsBody(MAIN), MAIN).STATE, '`CLEAR`');
  assert.throws(() => stage.parseOpsCapsule(opsBody('b'.repeat(40)), MAIN),
    /OPS_MAIN_OR_REQUIRED_MISMATCH/);
  assert.throws(() => stage.parseOpsCapsule(opsBody(MAIN).replace('- UNKNOWN: NONE', '- UNKNOWN: SOME'), MAIN),
    /OPS_REQUIRED_UNKNOWN_PRESENT/);
});

test('bounded owner receipt parser rejects duplicate fields', () => {
  assert.equal(stage.parseKeyValueReceipt('schema=x\ndetails=withheld\n').schema, 'x');
  assert.throws(() => stage.parseKeyValueReceipt('schema=x\nschema=y\n'), /OWNER_RECEIPT_DUPLICATE_FIELD/);
});

test('complete discovery delegates disjoint classification to Work System', () => {
  const runner = (args) => {
    const endpoint = args[2];
    if (endpoint.startsWith(`repos/${stage.REPO}/issues?`)) {
      return response(0, [
        {number: 10, state: 'open', body: PACKET_BODY},
        {number: 20, state: 'open', body: `<!-- canonical-main-work-packet:v1 -->
## State
\`IN_PROGRESS\`
## Bounded write scope
1. \`path:src/**\`
## Handoff
fixture`},
        {number: 30, state: 'open', pull_request: {}},
      ]);
    }
    if (endpoint.startsWith(`repos/${stage.REPO}/pulls/30/files?`)) {
      return response(0, [{filename: 'src/other.js'}]);
    }
    throw new Error(endpoint);
  };
  const value = stage.discoverOverlap({packetNumber: 10, requestedScopes: ['path:docs/demo.md'], runner});
  assert.equal(value.state, 'DISJOINT');
  assert.equal(value.discovery, 'COMPLETE');
});

test('unparseable nonterminal packet keeps overlap UNKNOWN', () => {
  const runner = (args) => {
    const endpoint = args[2];
    if (endpoint.startsWith(`repos/${stage.REPO}/issues?`)) {
      return response(0, [
        {number: 10, state: 'open', body: PACKET_BODY},
        {number: 20, state: 'open', body: `<!-- canonical-main-work-packet:v1 -->
## State
\`IN_PROGRESS\`
## Bounded write scope
1. \`path:../src/**\``},
      ]);
    }
    throw new Error(endpoint);
  };
  const value = stage.discoverOverlap({packetNumber: 10, requestedScopes: ['path:docs/demo.md'], runner});
  assert.equal(value.state, 'UNKNOWN');
  assert.equal(value.discovery, 'COMPLETE');
  assert(value.findings.some((finding) => finding.code === 'PACKET_SCOPE_UNRESOLVED'));
});

test('discovery truncation remains UNKNOWN rather than optimistic DISJOINT', () => {
  const page = Array.from({length: 100}, (_, i) => ({
    number: 1000 + i, state: 'open', body: 'not a packet',
  }));
  const runner = (args) => {
    if (args[2].startsWith(`repos/${stage.REPO}/issues?`)) return response(0, page);
    throw new Error(args[2]);
  };
  const value = stage.discoverOverlap({packetNumber: 77, requestedScopes: ['path:docs/demo.md'], runner});
  assert.equal(value.state, 'UNKNOWN');
  assert.equal(value.discovery, 'PARTIAL');
});

test('source-main mismatch fails before overlap, landing, lease, or workspace reads', () => {
  const t = tempProfile();
  let calls = 0;
  const runner = (args) => {
    calls += 1;
    if (args[0] === 'gh' && args[1] === 'api'
        && args[2] === `repos/${stage.REPO}/branches/main`) {
      return response(0, {commit: {sha: MAIN}});
    }
    throw new Error(`unexpected read after source mismatch: ${args.join(' ')}`);
  };
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77,
      plan: plan(),
      sourceMain: 'b'.repeat(40),
      runner,
      profile: t.profile,
    }), /SOURCE_MAIN_CURRENT_MAIN_CONFLICT/);
    assert.equal(calls, 1);
  } finally { t.close(); }
});

test('inspect detects main movement before mutation', () => {
  const t = tempProfile();
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77,
      plan: plan(),
      runner: inspectRunner({mainSequence: [MAIN, 'b'.repeat(40)]}),
      profile: t.profile,
    }), /MAIN_CHANGED_DURING_CAPTURE/);
  } finally { t.close(); }
});

test('inspect blocks preflight drift and remote-main drift while allowing eligible stale local origin/main', () => {
  const t1 = tempProfile();
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77, plan: plan(), runner: inspectRunner({preflight: 'fail'}), profile: t1.profile,
    }), /S_PREFLIGHT_NOT_READY/);
  } finally { t1.close(); }

  const t2 = tempProfile();
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77,
      plan: plan(),
      runner: inspectRunner({landingRemoteMain: 'c'.repeat(40)}),
      profile: t2.profile,
    }), /LANDING_REMOTE_MAIN_MISMATCH/);
  } finally { t2.close(); }

  const t3 = tempProfile();
  try {
    const value = stage.inspectContext({
      packetNumber: 77,
      plan: plan(),
      runner: inspectRunner({landingMain: 'c'.repeat(40)}),
      profile: t3.profile,
    });
    assert.equal(value.landingState, 'NORMALIZATION_REQUIRED');
    assert.equal(value.normalizationRequired, true);
    assert.equal(value.workspace.status, 'READY');
  } finally { t3.close(); }
});

test('source overlap resolves before landing observation or normalization', () => {
  const t = tempProfile();
  let landingCalls = 0;
  const base = inspectRunner({
    issueRows: [
      {number: 77, state: 'open', body: PACKET_BODY},
      {number: 88, state: 'open', body: `<!-- canonical-main-work-packet:v1 -->
## State
\`IN_PROGRESS\`
## Bounded write scope
1. \`path:../src/**\``},
    ],
  });
  const runner = (args, options) => {
    if (String(args[0]).endsWith('/mcl-landing-freshness')) landingCalls += 1;
    return base(args, options);
  };
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77, plan: plan(), runner, profile: t.profile,
    }), /OVERLAP_UNKNOWN/);
    assert.equal(landingCalls, 0);
  } finally { t.close(); }
});

test('landing classifier distinguishes exact current from selected stale-local case', () => {
  const base = {
    schema: 'mcl-landing-freshness.v1',
    operation: 'status',
    route: 'S',
    actual_branch: 'server/work',
    worktree: 'clean',
    landing_head: 'b'.repeat(40),
    remote_main: MAIN,
    details: 'withheld',
  };
  assert.deepEqual(stage.classifyLanding(MAIN, {
    ...base, origin_main: MAIN, origin_remote_relation: 'same',
  }), {state: 'CURRENT', normalizationRequired: false});
  assert.deepEqual(stage.classifyLanding(MAIN, {
    ...base, origin_main: 'c'.repeat(40), origin_remote_relation: 'stale',
  }), {state: 'NORMALIZATION_REQUIRED', normalizationRequired: true});
  assert.throws(() => stage.classifyLanding(MAIN, {
    ...base, actual_branch: 'other', origin_main: MAIN, origin_remote_relation: 'same',
  }), /LANDING_BRANCH_NOT_READY/);
});

test('BASE_OBJECT_MISSING is deferred only for eligible stale-local normalization', () => {
  const t1 = tempProfile();
  const staleBase = inspectRunner({landingMain: 'c'.repeat(40)});
  const staleRunner = (args, options) => {
    if (args[0] === 'git' && args.includes('cat-file')) return response(1, '');
    return staleBase(args, options);
  };
  try {
    const value = stage.inspectContext({
      packetNumber: 77, plan: plan(), runner: staleRunner, profile: t1.profile,
    });
    assert.equal(value.normalizationRequired, true);
    assert.deepEqual(value.workspace.reasonCodes, ['BASE_OBJECT_MISSING']);
  } finally { t1.close(); }

  const t2 = tempProfile();
  const currentBase = inspectRunner();
  const currentRunner = (args, options) => {
    if (args[0] === 'git' && args.includes('cat-file')) return response(1, '');
    return currentBase(args, options);
  };
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77, plan: plan(), runner: currentRunner, profile: t2.profile,
    }), /BASE_OBJECT_MISSING/);
  } finally { t2.close(); }
});

test('landing manifest and lease identity are fixed to landing_metadata S', () => {
  const context = {
    packetNumber: 77,
    packetRef: '#77',
    mainSha: MAIN,
    packetBodySha256: 'd'.repeat(64),
    landing: {landing_head: 'b'.repeat(40)},
  };
  const lease = {leaseId: 'e'.repeat(64), observedGeneration: 20, runId: 900};
  const manifest = stage.buildLandingManifest(context, lease);
  assert.deepEqual(manifest.scopes, [stage.LANDING_SCOPE]);
  assert.equal(manifest.workspace.kind, 'landing_metadata');
  assert.equal(manifest.workspace.branch, stage.LANDING_BRANCH);
  assert.equal(manifest.workspace.worktree, stage.LANDING_WORKTREE);
  assert.equal(manifest.observedBaseSha, 'b'.repeat(40));

  let acquireArgs;
  const runner = (args) => {
    acquireArgs = args;
    return response(0, {
      status: 'DISPATCH_COMPLETE', leaseId: lease.leaseId,
      observedGeneration: 20, runId: 900, runConclusion: 'success',
    });
  };
  stage.acquireLandingLease(context, runner);
  assert(acquireArgs.includes('landing_metadata'));
  assert(acquireArgs.includes(JSON.stringify([stage.LANDING_SCOPE])));
  assert(acquireArgs.includes(stage.LANDING_BRANCH));
  assert(acquireArgs.includes(stage.LANDING_WORKTREE));
});

test('normalization overlap UNKNOWN blocks before lease acquisition', () => {
  let runnerCalls = 0;
  const context = {
    packetNumber: 77, packetRef: '#77', mainSha: MAIN,
    packetBodySha256: 'f'.repeat(64),
    normalizationRequired: true, landingState: 'NORMALIZATION_REQUIRED',
    landing: {landing_head: 'b'.repeat(40)},
  };
  assert.throws(() => stage.normalizeLandingCurrentness(context, {
    runner: () => { runnerCalls += 1; throw new Error('should not run'); },
    overlapResolver: () => ({state: 'UNKNOWN'}),
  }), /LANDING_NORMALIZATION_OVERLAP_UNKNOWN/);
  assert.equal(runnerCalls, 0);
});

test('pre-refresh C11 barrier requires unchanged source authority and exact landing lease', () => {
  const context = {
    packetNumber: 77,
    packetRef: '#77',
    plan: plan(),
    mainSha: MAIN,
    packetBodySha256: '9'.repeat(64),
    requestedScopes: ['path:docs/demo.md'],
    overlap: {state: 'DISJOINT'},
    normalizationRequired: true,
    landingState: 'NORMALIZATION_REQUIRED',
    landing: {landing_head: 'b'.repeat(40)},
    workspace: {status: 'READY'},
  };
  const lease = {leaseId: '8'.repeat(64), observedGeneration: 50};
  const runner = (args) => {
    if (args[0] === process.execPath && args.includes('inspect')) {
      return response(0, {
        status: 'READY',
        packetBodySha256: context.packetBodySha256,
        ledgerGeneration: 50,
        matchingLeaseIds: [lease.leaseId],
      });
    }
    throw new Error(args.join(' '));
  };
  const fresh = stage.revalidateBeforeLandingRefresh(context, lease, {
    runner,
    inspector: () => ({...context}),
  });
  assert.equal(fresh.landingState, 'NORMALIZATION_REQUIRED');

  assert.throws(() => stage.revalidateBeforeLandingRefresh(context, lease, {
    runner,
    inspector: () => ({...context, mainSha: 'd'.repeat(40)}),
  }), /LANDING_LATE_MAIN_SHA_CONFLICT/);
});

test('normalization release transport failure surfaces explicit recovery action', () => {
  const context = {
    packetNumber: 77,
    packetRef: '#77',
    packetBodySha256: '6'.repeat(64),
    normalizationRequired: true,
    landingState: 'NORMALIZATION_REQUIRED',
  };
  const receipt = stage.applyContext(context, {
    normalizationRunner: () => {
      throw new stage.StageError('BLOCKED', ['LANDING_D013_RELEASE_FAILED']);
    },
  });
  assert.equal(receipt.result, 'BLOCKED');
  assert.equal(receipt.nextLegalAction, 'EXPLICIT_D013_RECOVERY_REQUIRED');
});

test('eligible normalization uses one fixed refresh then release and COMPLETE receipt', () => {
  const context = {
    packetNumber: 77,
    packetRef: '#77',
    mainSha: MAIN,
    packetBodySha256: '1'.repeat(64),
    normalizationRequired: true,
    landingState: 'NORMALIZATION_REQUIRED',
    landing: {landing_head: 'b'.repeat(40)},
  };
  let refreshCalls = 0;
  let comments = 0;
  let acquireCalls = 0;
  let releaseCalls = 0;
  const runner = (args) => {
    if (args[0] === process.execPath && args.includes('lease-acquire')) {
      acquireCalls += 1;
      return response(0, {
        status: 'DISPATCH_COMPLETE', leaseId: '2'.repeat(64),
        observedGeneration: 30, runId: 1001, runConclusion: 'success',
      });
    }
    if (args[0] === process.execPath && args.includes('lease-release')) {
      releaseCalls += 1;
      return response(0, {
        status: 'DISPATCH_COMPLETE', leaseId: '2'.repeat(64),
        observedGeneration: 31, runId: 1002, runConclusion: 'success',
      });
    }
    if (args[0] === 'gh' && args[1] === 'api' && args.includes('--method')) {
      comments += 1;
      return response(0, {id: 100 + comments});
    }
    if (String(args[0]).endsWith('/mcl-landing-freshness')) {
      refreshCalls += 1;
      assert.deepEqual(args.slice(1), ['refresh', 'S']);
      return response(0, [
        'schema=mcl-landing-freshness.v1',
        'operation=refresh',
        'route=S',
        'intended_branch=server/work',
        'actual_branch=server/work',
        'worktree=clean',
        `landing_head=${'b'.repeat(40)}`,
        `origin_main=${MAIN}`,
        `remote_main=${MAIN}`,
        'origin_remote_relation=same',
        'landing_relation=behind_ff',
        'refresh=refreshed',
        'details=withheld',
        '',
      ].join('\n'));
    }
    throw new Error(args.join(' '));
  };
  const value = stage.normalizeLandingCurrentness(context, {
    runner,
    overlapResolver: () => ({state: 'DISJOINT'}),
    authorityBarrier: () => {},
  });
  assert.equal(value.normalized, true);
  assert.equal(value.count, 1);
  assert.equal(refreshCalls, 1);
  assert.equal(acquireCalls, 1);
  assert.equal(releaseCalls, 1);
  assert.equal(comments, 2);
  assert.match(value.receipt.receiptId, /^[0-9a-f]{64}$/);
});

test('normalization revalidation is one-shot and requires exact convergence', () => {
  const context = {
    packetNumber: 77, packetRef: '#77', plan: plan(), mainSha: MAIN,
    packetBodySha256: '3'.repeat(64), requestedScopes: ['path:docs/demo.md'],
  };
  const ready = {
    ...context,
    overlap: {state: 'DISJOINT'},
    normalizationRequired: false,
    landingState: 'CURRENT',
    workspace: {status: 'READY'},
  };
  assert.equal(stage.revalidateAfterNormalization(context, {
    inspector: () => ready,
  }).landingState, 'CURRENT');
  assert.throws(() => stage.revalidateAfterNormalization(context, {
    inspector: () => ({...ready, normalizationRequired: true, landingState: 'NORMALIZATION_REQUIRED'}),
  }), /NORMALIZATION_NOT_CONVERGED/);
});

test('D-014 manifest builder preserves workspace and deterministic lease evidence', () => {
  const context = {
    packetNumber: 77,
    packetRef: '#77',
    mainSha: MAIN,
    packetBodySha256: 'c'.repeat(64),
    requestedScopes: ['path:docs/demo.md'],
    workspace: {identity: {branch: 'server/mcl-packet-77', worktree: '/root/nyang-worktrees/mcl-packet-77'}},
  };
  const lease = {leaseId: 'b'.repeat(64), observedGeneration: 9, runId: 500};
  const manifest = stage.buildManifest(context, lease);
  const replay = stage.buildManifest(context, {...lease, runId: 501});
  const nextGeneration = stage.buildManifest(context, {...lease, observedGeneration: 10, runId: 502});
  const differentLease = stage.buildManifest(context, {...lease, leaseId: 'd'.repeat(64), runId: 503});
  const evidenceRef = `receipt:mcl-task-lease:${lease.leaseId}:generation:9`;

  assert.equal(manifest.workspace.branch, 'server/mcl-packet-77');
  assert.equal(manifest.workspace.worktree, '/root/nyang-worktrees/mcl-packet-77');
  assert.equal(manifest.leaseEvidence.acquireEvidenceRef, evidenceRef);
  assert(manifest.inputRefs.includes(evidenceRef));
  assert.equal(manifest.inputRefs.some((ref) => ref.startsWith('run:')), false);
  assert.match(manifest.manifestId, /^[0-9a-f]{64}$/);
  assert.equal(replay.manifestId, manifest.manifestId);
  assert.equal(replay.payloadSha256, manifest.payloadSha256);
  assert.notEqual(nextGeneration.manifestId, manifest.manifestId);
  assert.notEqual(differentLease.manifestId, manifest.manifestId);
});

test('HANDOFF_READY projection is accepted by the existing strict patch-owner parser', () => {
  const handoff = stage.buildHandoff({
    packetRef: '#77', plan: plan(),
  }, {manifestId: 'd'.repeat(64)}, {leaseId: 'e'.repeat(64)});
  const parsed = patchOwner.parseHandoffText(JSON.stringify(handoff));
  assert.equal(parsed.status, 'HANDOFF_READY');
  assert.equal(parsed.mutation_authorized, false);
  assert.equal(parsed.execution_authorized, false);
});

test('generic stage-entry PASS receipt uses v2 axes and grants no authority', () => {
  const receipt = stage.receiptFor({
    packetNumber: 77,
    packetBodySha256: 'f'.repeat(64),
    result: 'PASS',
    nextLegalAction: 'CLAIM_OWNER_LOCAL_HOLDER_IF_REQUIRED_THEN_INVOKE_EXISTING_ROUTE_OWNER',
  });
  assert.equal(receipt.schemaVersion, 2);
  assert.equal(receipt.executionLifecycle, 'FINISHED');
  assert.equal(receipt.attentionDisposition, 'COMPLETE');
  assert.equal(receipt.result, 'PASS');
  assert.equal(receipt.mutationAuthorized, false);
  assert.equal(receipt.executionAuthorized, false);
});

test('late barrier accepts exact fresh context and exact active lease', () => {
  const context = {
    packetNumber: 77,
    packetRef: '#77',
    plan: plan(),
    mainSha: MAIN,
    packetBodySha256: 'a'.repeat(64),
    requestedScopes: ['path:docs/demo.md'],
    workspace: {identity: {branch: 'server/mcl-packet-77', worktree: '/root/nyang-worktrees/mcl-packet-77'}},
  };
  const lease = {leaseId: 'b'.repeat(64), observedGeneration: 12};
  const runner = (args) => {
    if (args[0] === process.execPath && args.includes('inspect')) {
      return response(0, {
        status: 'READY',
        packetBodySha256: context.packetBodySha256,
        ledgerGeneration: 12,
        matchingLeaseIds: [lease.leaseId],
      });
    }
    throw new Error(args.join(' '));
  };
  const fresh = stage.revalidateAfterAcquire(context, lease, {
    runner,
    inspector: () => ({...context}),
  });
  assert.equal(fresh.mainSha, MAIN);
});

test('late barrier rejects main drift before workspace effect', () => {
  const context = {
    packetNumber: 77,
    packetRef: '#77',
    plan: plan(),
    mainSha: MAIN,
    packetBodySha256: 'a'.repeat(64),
    requestedScopes: ['path:docs/demo.md'],
    workspace: {identity: {branch: 'server/mcl-packet-77', worktree: '/root/nyang-worktrees/mcl-packet-77'}},
  };
  assert.throws(() => stage.revalidateAfterAcquire(
    context,
    {leaseId: 'b'.repeat(64), observedGeneration: 12},
    {inspector: () => ({...context, mainSha: 'c'.repeat(40)})},
  ), /LATE_MAIN_SHA_CONFLICT/);
});

test('acquire failure is fail-closed', () => {
  const context = {
    packetRef: '#77',
    requestedScopes: ['path:docs/demo.md'],
    workspace: {identity: {branch: 'server/mcl-packet-77', worktree: '/root/nyang-worktrees/mcl-packet-77'}},
    mainSha: MAIN,
  };
  const runner = (args) => {
    if (args[0] === process.execPath && args.includes('lease-acquire')) {
      return response(2, {schemaVersion: 1, status: 'BLOCKED', reasonCodes: ['FIXTURE']});
    }
    throw new Error(args.join(' '));
  };
  assert.throws(() => stage.acquireLease(context, runner), /D013_ACQUIRE_NOT_PROVEN/);
});

test('manifest comment failure releases lease when no workspace/ref effect occurred', () => {
  const f = gitFixture();
  let releaseCalls = 0;
  try {
    const inspected = workspace.inspectWorkspace({packetNumber: 77, baseSha: f.base, profile: f.profile});
    assert.equal(inspected.status, 'READY');
    const context = {
      packetNumber: 77,
      packetRef: '#77',
      plan: plan(),
      mainSha: f.base,
      packetBody: PACKET_BODY,
      packetBodySha256: '1'.repeat(64),
      requestedScopes: ['path:docs/demo.md'],
      workspace: inspected,
    };
    const runner = (args, options) => {
      if (args[0] === process.execPath && args.includes('lease-acquire')) {
        return response(0, {
          status: 'DISPATCH_COMPLETE', leaseId: '2'.repeat(64),
          observedGeneration: 9, runId: 501, runConclusion: 'success',
        });
      }
      if (args[0] === process.execPath && args.includes('lease-release')) {
        releaseCalls += 1;
        return response(0, {
          status: 'DISPATCH_COMPLETE', leaseId: '2'.repeat(64),
          observedGeneration: 10, runId: 502, runConclusion: 'success',
        });
      }
      if (args[0] === 'gh' && args[1] === 'api' && args.includes('--method')) return response(1, '');
      return workspace.runDefault(args, options);
    };
    const receipt = stage.applyContext(context, {
      runner,
      profile: f.profile,
      manifestBuilder: () => ({manifestId: '5'.repeat(64)}),
      manifestRenderer: () => 'manifest-fixture',
    });
    assert.notEqual(receipt.result, 'PASS');
    assert.equal(releaseCalls, 1);
    assert.equal(receipt.counters.find((row) => row.name === 'workspace_state_changed').value, 0);
  } finally { f.close(); }
});

test('workspace precondition failure after manifest still releases lease when state did not change', () => {
  const f = gitFixture();
  let releaseCalls = 0;
  let comments = 0;
  try {
    const inspected = workspace.inspectWorkspace({packetNumber: 79, baseSha: f.base, profile: f.profile});
    assert.equal(inspected.status, 'READY');
    const context = {
      packetNumber: 79,
      packetRef: '#79',
      plan: plan(),
      mainSha: f.base,
      packetBody: PACKET_BODY,
      packetBodySha256: '7'.repeat(64),
      requestedScopes: ['path:docs/demo.md'],
      workspace: inspected,
    };
    const runner = (args, options) => {
      if (args[0] === process.execPath && args.includes('lease-acquire')) {
        return response(0, {
          status: 'DISPATCH_COMPLETE', leaseId: '8'.repeat(64),
          observedGeneration: 12, runId: 701, runConclusion: 'success',
        });
      }
      if (args[0] === process.execPath && args.includes('lease-release')) {
        releaseCalls += 1;
        return response(0, {
          status: 'DISPATCH_COMPLETE', leaseId: '8'.repeat(64),
          observedGeneration: 13, runId: 702, runConclusion: 'success',
        });
      }
      if (args[0] === 'gh' && args[1] === 'api' && args.includes('--method')) {
        comments += 1;
        return response(0, {id: 800 + comments});
      }
      return workspace.runDefault(args, options);
    };
    const receipt = stage.applyContext(context, {
      runner,
      profile: f.profile,
      manifestBuilder: () => ({manifestId: '9'.repeat(64)}),
      manifestRenderer: () => {
        childProcess.spawnSync('git', [
          '-C', f.profile.control, 'branch', 'server/mcl-packet-79', f.base,
        ], {encoding: 'utf8'});
        return 'manifest-fixture';
      },
      lateBarrier: () => {},
    });
    assert.equal(receipt.result, 'BLOCKED');
    assert(receipt.reasonCodes.includes('LOCAL_BRANCH_EXISTS'));
    assert.equal(releaseCalls, 1);
    assert.equal(receipt.counters.find((row) => row.name === 'workspace_state_changed').value, 0);
    assert.equal(receipt.nextLegalAction, 'REPAIR_AND_RETRY');
  } finally { f.close(); }
});

test('apply PASS prepares workspace/ref but does not invoke holder or source effect owner', () => {
  const f = gitFixture();
  let comments = 0;
  try {
    const inspected = workspace.inspectWorkspace({packetNumber: 78, baseSha: f.base, profile: f.profile});
    const context = {
      packetNumber: 78,
      packetRef: '#78',
      plan: plan(),
      mainSha: f.base,
      packetBody: PACKET_BODY,
      packetBodySha256: '3'.repeat(64),
      requestedScopes: ['path:docs/demo.md'],
      workspace: inspected,
    };
    const runner = (args, options) => {
      if (args[0] === process.execPath && args.includes('lease-acquire')) {
        return response(0, {
          status: 'DISPATCH_COMPLETE', leaseId: '4'.repeat(64),
          observedGeneration: 11, runId: 601, runConclusion: 'success',
        });
      }
      if (args[0] === 'gh' && args[1] === 'api' && args.includes('--method')) {
        comments += 1;
        return response(0, {id: 700 + comments});
      }
      return workspace.runDefault(args, options);
    };
    const receipt = stage.applyContext(context, {
      runner,
      profile: f.profile,
      remoteCreate: localCreateRemote(f),
      manifestBuilder: () => ({manifestId: '6'.repeat(64)}),
      manifestRenderer: () => 'manifest-fixture',
      lateBarrier: () => {},
    });
    assert.equal(receipt.result, 'PASS');
    assert.equal(receipt.counters.find((row) => row.name === 'landing_normalization_count').value, 0);
    assert.equal(comments, 2);
    assert.equal(receipt.nextLegalAction,
      'CLAIM_OWNER_LOCAL_HOLDER_IF_REQUIRED_THEN_INVOKE_EXISTING_ROUTE_OWNER');
    const target = path.join(f.profile.worktreeRoot, 'mcl-packet-78');
    assert.equal(fs.existsSync(target), true);
    const branch = childProcess.spawnSync('git', ['-C', target, 'branch', '--show-current'],
      {encoding: 'utf8'}).stdout.trim();
    assert.equal(branch, 'server/mcl-packet-78');
  } finally { f.close(); }
});

test('successful one-shot normalization composes into existing repository stage preparation', () => {
  const f = gitFixture();
  let comments = 0;
  try {
    const inspected = workspace.inspectWorkspace({packetNumber: 81, baseSha: f.base, profile: f.profile});
    const context = {
      packetNumber: 81,
      packetRef: '#81',
      plan: plan(),
      mainSha: f.base,
      packetBody: PACKET_BODY,
      packetBodySha256: '4'.repeat(64),
      requestedScopes: ['path:docs/demo.md'],
      overlap: {state: 'DISJOINT'},
      landing: {landing_head: 'b'.repeat(40)},
      landingState: 'NORMALIZATION_REQUIRED',
      normalizationRequired: true,
      workspace: inspected,
    };
    const runner = (args, options) => {
      if (args[0] === process.execPath && args.includes('lease-acquire')) {
        return response(0, {
          status: 'DISPATCH_COMPLETE', leaseId: '5'.repeat(64),
          observedGeneration: 40, runId: 1101, runConclusion: 'success',
        });
      }
      if (args[0] === 'gh' && args[1] === 'api' && args.includes('--method')) {
        comments += 1;
        return response(0, {id: 900 + comments});
      }
      return workspace.runDefault(args, options);
    };
    const fresh = {...context, landingState: 'CURRENT', normalizationRequired: false, workspace: inspected};
    const receipt = stage.applyContext(context, {
      runner,
      profile: f.profile,
      remoteCreate: localCreateRemote(f),
      normalizationRunner: () => ({
        normalized: true, count: 1, artifacts: ['receipt:mcl-task-completion:fixture'],
      }),
      normalizationBarrier: () => fresh,
      manifestBuilder: () => ({manifestId: '7'.repeat(64)}),
      manifestRenderer: () => 'manifest-fixture',
      lateBarrier: () => {},
    });
    assert.equal(receipt.result, 'PASS');
    assert.equal(receipt.counters.find((row) => row.name === 'landing_normalization_count').value, 1);
    assert(receipt.steps.some((row) => row.name === 'landing-currentness-normalization'));
    assert(receipt.artifactLocators.includes('receipt:mcl-task-completion:fixture'));
  } finally { f.close(); }
});

test('source delegates target scope grammar and contains no broader effect machinery', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-stage-entry.cjs'), 'utf8');
  assert.match(source, /scopeOverlap\.extractPacketScopes\(body\)/);
  assert.doesNotMatch(source, /SCOPE_HEADINGS/);
  assert.doesNotMatch(source, /function sections\(/);
  assert.doesNotMatch(source, /mcl-workspace-holder/);
  assert.doesNotMatch(source, /\bsetInterval\b|\bsetTimeout\b/);
  assert.doesNotMatch(source, /['"](?:reset|stash|rebase|merge|checkout|switch)['"]/);
  assert.doesNotMatch(source, /--force\b/);
});
