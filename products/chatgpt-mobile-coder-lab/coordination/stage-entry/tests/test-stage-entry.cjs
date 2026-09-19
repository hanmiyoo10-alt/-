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

function inspectRunner({mainSequence = [MAIN, MAIN], preflight = 'pass', landingMain = MAIN, issueRows = null} = {}) {
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
        `remote_main=${MAIN}`,
        'origin_remote_relation=same',
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

test('packet scope parser accepts one exact Work System heading and rejects drift', () => {
  assert.deepEqual(stage.extractPacketScopes(PACKET_BODY), ['path:docs/demo.md']);
  assert.throws(() => stage.extractPacketScopes(PACKET_BODY.replace('Bounded write scope', 'Implementation write scope')),
    /PACKET_SCOPE_SECTION_MISSING/);
  assert.throws(() => stage.extractPacketScopes(`${PACKET_BODY}\n## Locked write scope\n1. \`path:src/**\``),
    /PACKET_SCOPE_SECTION_DUPLICATE/);
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
## Bounded repository write ceiling
1. \`path:src/**\``},
      ]);
    }
    throw new Error(endpoint);
  };
  const value = stage.discoverOverlap({packetNumber: 10, requestedScopes: ['path:docs/demo.md'], runner});
  assert.equal(value.state, 'UNKNOWN');
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

test('inspect blocks preflight drift and landing drift', () => {
  const t1 = tempProfile();
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77, plan: plan(), runner: inspectRunner({preflight: 'fail'}), profile: t1.profile,
    }), /S_PREFLIGHT_NOT_READY/);
  } finally { t1.close(); }

  const t2 = tempProfile();
  try {
    assert.throws(() => stage.inspectContext({
      packetNumber: 77, plan: plan(), runner: inspectRunner({landingMain: 'c'.repeat(40)}), profile: t2.profile,
    }), /LANDING_CURRENTNESS_NOT_READY/);
  } finally { t2.close(); }
});

test('D-014 manifest builder preserves the fixed S repository workspace contract', () => {
  const manifest = stage.buildManifest({
    packetNumber: 77,
    packetRef: '#77',
    mainSha: MAIN,
    packetBodySha256: 'c'.repeat(64),
    requestedScopes: ['path:docs/demo.md'],
    workspace: {identity: {branch: 'server/mcl-packet-77', worktree: '/root/nyang-worktrees/mcl-packet-77'}},
  }, {leaseId: 'b'.repeat(64), observedGeneration: 9, runId: 500});
  assert.equal(manifest.workspace.branch, 'server/mcl-packet-77');
  assert.equal(manifest.workspace.worktree, '/root/nyang-worktrees/mcl-packet-77');
  assert.match(manifest.manifestId, /^[0-9a-f]{64}$/);
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

test('source contains no holder invocation, generic retry loop, or destructive Git repair', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-stage-entry.cjs'), 'utf8');
  assert.doesNotMatch(source, /mcl-workspace-holder/);
  assert.doesNotMatch(source, /\bsetInterval\b|\bsetTimeout\b/);
  assert.doesNotMatch(source, /['"](?:reset|stash|rebase|merge|checkout|switch)['"]/);
  assert.doesNotMatch(source, /--force\b/);
});
