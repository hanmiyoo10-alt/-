#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../..');
const owner = require('../mcl-l-repository-apply-composition.cjs');
const handoff = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const lease = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const holder = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const lOwner = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs'));

const PACKET_REF = '#3525';
const PACKET_BODY = 'fixture packet body';
const LEASE_ID = 'a'.repeat(64);
const BASE = 'b'.repeat(40);
const HEAD = 'c'.repeat(40);
const CLAIM = 'd'.repeat(64);
const PATHS = [
  'products/chatgpt-mobile-coder-lab/coordination/l-repository-apply-composition/README.md',
  'products/chatgpt-mobile-coder-lab/coordination/l-repository-apply-composition/mcl-l-repository-apply-composition.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/l-repository-apply-composition/tests/test-mcl-l-repository-apply-composition.cjs',
];

function manifest(overrides = {}) {
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: PACKET_REF,
    packetBodySha256: lease.digest(PACKET_BODY),
    phaseId: '3525-implementation-pr',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'L',
    executor: 'L',
    scopes: [...PATHS.map((item) => 'path:' + item), 'surface:mcl:l-repository-local-holder-apply'],
    workspace: {
      kind: 'repository',
      branch: 'laptop/mcl-l-prepared-apply-composition-3525',
      worktree: '/home/alsl0/nyang-worktrees/mcl-l-prepared-apply-composition-3525',
    },
    observedBaseSha: BASE,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE_ID,
      acquiredGeneration: 10,
      acquireEvidenceRef: 'run:101',
    },
    sourceAuthorityRefs: ['#3525', 'issue:#2352'],
    inputRefs: ['commit:' + BASE, 'issue:#3524'],
    expectedOutputRefs: PATHS.map((item) => 'path:' + item),
    acceptanceRefs: ['#3525', 'issue:#3524'],
    stopCondition: 'fixture',
    authority: {...owner.FALSE_AUTHORITY},
    ...overrides,
  });
}

function fixtureFiles({manifestValue = manifest(), prBody = 'Refs #3525'} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl3525-test-'));
  const manifestFile = path.join(dir, 'manifest.md');
  const requestFile = path.join(dir, 'request.json');
  const patchFile = path.join(dir, 'patch.diff');
  const prRequestFile = path.join(dir, 'pr.json');
  fs.writeFileSync(manifestFile, handoff.renderManifest(manifestValue));
  const patch = Buffer.from('fixture-patch\n');
  fs.writeFileSync(patchFile, patch);
  fs.writeFileSync(requestFile, JSON.stringify({
    schema: 'mcl-l-repository-owner-request.v1',
    packet_ref: PACKET_REF,
    message: 'feat(mcl): add prepared L apply composition',
    expected_paths: PATHS,
    patch_sha256: require('node:crypto').createHash('sha256').update(patch).digest('hex'),
  }));
  fs.writeFileSync(prRequestFile, JSON.stringify({
    schema: 'mcl-l-pr-publication-request.v1',
    title: 'feat(mcl): add prepared L apply composition',
    body: prBody,
  }));
  return {
    dir,
    args: {
      packetRef: PACKET_REF,
      packetNumber: 3525,
      manifestFile,
      requestFile,
      patchFile,
      prRequestFile,
    },
    manifestText: fs.readFileSync(manifestFile, 'utf8'),
  };
}

function baseDeps(files, overrides = {}) {
  const events = [];
  const comments = [{id: 1, body: files.manifestText}];
  let activation = null;
  const deps = {
    readCurrent() {
      events.push('read-current');
      const released = events.includes('release-lease');
      return {
        issue: {state: 'open', body: PACKET_BODY},
        ledger: {body: released ? 'released-ledger' : 'active-ledger'},
      };
    },
    readComments() {
      events.push('read-comments');
      return comments.map((item) => ({...item}));
    },
    postComment(_packet, body) {
      events.push('post-completion');
      const id = 100 + comments.length;
      comments.push({id, body});
      return id;
    },
    validateEvidence(input) {
      events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
      return input.requireActiveLease
        ? {ok: true, reasonCodes: [], state: {generation: 10}}
        : {ok: true, reasonCodes: [], state: {generation: 12}};
    },
    ownerRunCli(argv, env) {
      if (argv[0] === 'inspect') {
        events.push('owner-inspect');
        return {code: 0, text: JSON.stringify({
          status: 'PASS',
          reason_codes: [],
          workspace_state: 'PREPARED',
          holder_state: 'ABSENT',
        }) + '\n'};
      }
      events.push('owner-apply');
      assert.equal(env[holder.CLAIM_ENV], CLAIM);
      return {code: 0, text: JSON.stringify({
        status: 'PASS',
        reason_codes: [],
        new_head: HEAD,
        pr_number: 4001,
        next_legal_action: 'RELEASE_D013_THEN_RELEASE_HOLDER_THEN_D014_COMPLETE',
      }) + '\n'};
    },
    claimHolder() {
      events.push('holder-claim');
      return {result: {status: 'CLAIMED', reasonCodes: []}, secret: CLAIM};
    },
    checkHolder(_files, claim) {
      events.push('holder-check');
      assert.equal(claim, CLAIM);
      return {status: 'CHECK_PASS', reasonCodes: []};
    },
    releaseLease() {
      events.push('release-lease');
      return {ok: true, value: {evidenceRef: 'run:202', observedGeneration: 11}};
    },
    releaseHolder(_files, claim) {
      events.push('holder-release');
      assert.equal(claim, CLAIM);
      return {status: 'RELEASED', reasonCodes: []};
    },
    writeActivation(_manifest, value) {
      events.push('write-activation');
      activation = structuredClone(value);
      return structuredClone(activation);
    },
    readActivation() {
      events.push('read-activation');
      if (!activation) throw new owner.CompositionError('BLOCKED', ['ACTIVATION_MISSING']);
      return structuredClone(activation);
    },
    removeActivation() {
      events.push('remove-activation');
      activation = null;
    },
    readPublished() {
      events.push('read-published');
      return {ok: true, commit: HEAD, prNumber: 4001};
    },
    tempRoot: files.dir,
    ...overrides,
  };
  return {
    deps, events, comments,
    getActivation: () => activation && structuredClone(activation),
    setActivation: (value) => { activation = value && structuredClone(value); },
  };
}

function cleanup(files) {
  fs.rmSync(files.dir, {recursive: true, force: true});
}

test('CLI surface is fixed and exposes no holder or environment selector', () => {
  assert.throws(
    () => owner.parseArgs([
      'apply', '--packet', '#3525', '--manifest', 'm', '--request', 'r',
      '--patch', 'p', '--pr-request', 'pr', '--holder-claim', 'x', '--apply',
    ]),
    (error) => error.reasonCodes.includes('ARGUMENT_UNSUPPORTED_OR_DUPLICATE:holder-claim')
  );
  assert.throws(
    () => owner.parseArgs([
      'apply', '--packet', '#3525', '--manifest', 'm', '--request', 'r',
      '--patch', 'p', '--pr-request', 'pr',
    ]),
    (error) => error.reasonCodes.includes('APPLY_FLAG_REQUIRED')
  );
  const finalize = owner.parseArgs([
    'finalize', '--packet', '#3525', '--manifest', 'm', '--apply',
  ]);
  assert.equal(finalize.operation, 'finalize');
  assert.equal(finalize.requestFile, null);
});

test('non-L manifest is rejected before any effect', () => {
  const files = fixtureFiles({manifestValue: manifest({
    route: 'S',
    executor: 'S',
    workspace: {kind: 'repository', branch: 'server/test', worktree: '/root/nyang-worktrees/test'},
  })});
  try {
    assert.throws(
      () => owner.executeComposition(files.args, baseDeps(files).deps),
      (error) => error.reasonCodes.includes('MANIFEST_ROUTE_EXECUTOR_INVALID')
    );
  } finally { cleanup(files); }
});

test('manifest must be durably present exactly once', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {readComments: () => []});
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('MANIFEST_COMMENT_MISSING')
    );
    assert.equal(state.events.includes('holder-claim'), false);
  } finally { cleanup(files); }
});

test('canonical PR preflight runs before holder effect', () => {
  const files = fixtureFiles({prBody: 'prefix Refs #3525 suffix'});
  const state = baseDeps(files);
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('NON_CLOSING_REF_REQUIRED')
    );
    assert.equal(state.events.includes('holder-claim'), false);
  } finally { cleanup(files); }
});

test('fresh coordination binding is required immediately before holder claim', () => {
  const files = fixtureFiles();
  let reads = 0;
  const state = baseDeps(files, {
    readCurrent() {
      state.events.push('read-current');
      reads += 1;
      return {
        issue: {state: 'open', body: reads === 2 ? PACKET_BODY + '\nchanged' : PACKET_BODY},
        ledger: {body: 'active-ledger'},
      };
    },
    validateEvidence(input) {
      state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
      if (input.requireActiveLease && input.packetBody !== PACKET_BODY) {
        return {ok: false, reasonCodes: ['PACKET_BODY_HASH_DRIFT'], state: null};
      }
      return {ok: true, reasonCodes: [], state: {generation: 10}};
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('PACKET_BODY_HASH_DRIFT')
    );
    assert.equal(state.events.includes('holder-claim'), false);
    assert.equal(state.events.includes('owner-apply'), false);
  } finally { cleanup(files); }
});

test('fresh coordination binding is required again before source effect', () => {
  const files = fixtureFiles();
  let reads = 0;
  const state = baseDeps(files, {
    readCurrent() {
      state.events.push('read-current');
      reads += 1;
      return {
        issue: {state: 'open', body: PACKET_BODY},
        ledger: {body: reads === 3 ? 'revoked-ledger' : 'active-ledger'},
      };
    },
    validateEvidence(input) {
      state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
      if (input.requireActiveLease && input.ledgerBody !== 'active-ledger') {
        return {ok: false, reasonCodes: ['LEASE_NOT_ACTIVE'], state: null};
      }
      return {ok: true, reasonCodes: [], state: {generation: 10}};
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('LEASE_NOT_ACTIVE')
    );
    assert.equal(state.events.includes('holder-claim'), true);
    assert.equal(state.events.includes('owner-apply'), false);
    assert.equal(state.events.includes('release-lease'), false);
  } finally { cleanup(files); }
});

test('workspace must already be PREPARED and holder absent', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    ownerRunCli(argv) {
      if (argv[0] === 'inspect') {
        state.events.push('owner-inspect');
        return {code: 0, text: JSON.stringify({
          status: 'PASS', reason_codes: [], workspace_state: 'ABSENT', holder_state: 'NOT_APPLICABLE',
        }) + '\n'};
      }
      throw new Error('unexpected apply');
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('WORKSPACE_NOT_PREPARED')
    );
    assert.equal(state.events.includes('holder-claim'), false);
  } finally { cleanup(files); }
});

test('success orders holder, existing L owner, D013 release, holder release, and D014', () => {
  const files = fixtureFiles();
  const state = baseDeps(files);
  try {
    const out = owner.executeComposition(files.args, state.deps);
    assert.equal(out.status, 'PASS');
    assert.equal(out.commit, HEAD);
    assert.equal(out.prNumber, 4001);
    assert.equal(out.nextLegalAction, 'VALIDATION_MERGE');
    assert.deepEqual(out.authority, owner.FALSE_AUTHORITY);
    assert.equal(JSON.stringify(out).includes(CLAIM), false);
    const receiptRow = state.comments.find((row) => row.id === out.completionCommentId);
    const receiptParsed = handoff.parseCompletionReceipt(receiptRow.body);
    assert.equal(receiptParsed.status, 'VALID');
    assert.equal(receiptParsed.value.leaseReleaseEvidence.releasedGeneration, 11);

    const sequence = [
      'owner-inspect',
      'holder-claim',
      'holder-check',
      'owner-apply',
      'write-activation',
      'release-lease',
      'validate-released',
      'holder-release',
      'read-published',
      'post-completion',
      'remove-activation',
    ];
    let cursor = -1;
    for (const item of sequence) {
      const next = state.events.indexOf(item);
      assert.ok(next > cursor, item + ' order');
      cursor = next;
    }
  } finally { cleanup(files); }
});

test('L owner non-PASS preserves lease and holder for recovery', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    ownerRunCli(argv, env) {
      if (argv[0] === 'inspect') {
        state.events.push('owner-inspect');
        return {code: 0, text: JSON.stringify({
          status: 'PASS', reason_codes: [], workspace_state: 'PREPARED', holder_state: 'ABSENT',
        }) + '\n'};
      }
      state.events.push('owner-apply');
      assert.equal(env[holder.CLAIM_ENV], CLAIM);
      return {code: 2, text: JSON.stringify({
        status: 'BLOCKED', reason_codes: ['SOURCE_VALIDATION_BLOCKED'],
      }) + '\n'};
    },
  });
  try {
    const out = owner.executeComposition(files.args, state.deps);
    assert.equal(out.status, 'BLOCKED');
    assert.equal(state.events.includes('release-lease'), false);
    assert.equal(state.events.includes('holder-release'), false);
    assert.equal(state.events.includes('post-completion'), false);
  } finally { cleanup(files); }
});

test('holder is rechecked immediately before D013 release', () => {
  const files = fixtureFiles();
  let checks = 0;
  const state = baseDeps(files, {
    checkHolder(_files, claim) {
      state.events.push('holder-check');
      assert.equal(claim, CLAIM);
      checks += 1;
      return checks >= 2
        ? {status: 'BLOCKED', reasonCodes: ['HOLDER_CHANGED_BEFORE_RELEASE']}
        : {status: 'CHECK_PASS', reasonCodes: []};
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('HOLDER_CHANGED_BEFORE_RELEASE')
    );
    assert.equal(state.events.includes('release-lease'), false);
    assert.equal(state.events.includes('holder-release'), false);
  } finally { cleanup(files); }
});

test('D013 release failure does not release holder or publish completion', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    releaseLease() {
      state.events.push('release-lease');
      return {ok: false, value: {}};
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('D013_RELEASE_NOT_PROVEN')
    );
    assert.equal(state.events.includes('holder-release'), false);
    assert.equal(state.events.includes('post-completion'), false);
  } finally { cleanup(files); }
});

test('post-release readback must reach the release owner generation', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    validateEvidence(input) {
      state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
      return input.requireActiveLease
        ? {ok: true, reasonCodes: [], state: {generation: 10}}
        : {ok: true, reasonCodes: [], state: {generation: 10}};
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('D013_RELEASE_READBACK_STALE')
    );
    assert.equal(state.events.includes('holder-release'), false);
    assert.equal(state.events.includes('post-completion'), false);
  } finally { cleanup(files); }
});

test('holder release failure cannot manufacture D014 completion', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    releaseHolder() {
      state.events.push('holder-release');
      return {status: 'BLOCKED', reasonCodes: ['HOLDER_REMOVE_FAILED']};
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.reasonCodes.includes('HOLDER_REMOVE_FAILED')
    );
    assert.equal(state.events.includes('post-completion'), false);
  } finally { cleanup(files); }
});

test('preflighted request and PR bytes are snapshotted before holder/source effect', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    claimHolder() {
      state.events.push('holder-claim');
      fs.writeFileSync(files.args.prRequestFile, JSON.stringify({
        schema: 'mcl-l-pr-publication-request.v1',
        title: 'changed after preflight',
        body: 'Fixes #3525',
      }));
      fs.writeFileSync(files.args.requestFile, JSON.stringify({
        schema: 'mcl-l-repository-owner-request.v1',
        packet_ref: PACKET_REF,
        message: 'changed after preflight',
        expected_paths: PATHS,
        patch_sha256: '0'.repeat(64),
      }));
      return {result: {status: 'CLAIMED', reasonCodes: []}, secret: CLAIM};
    },
    ownerRunCli(argv, env) {
      if (argv[0] === 'inspect') {
        state.events.push('owner-inspect');
        return {code: 0, text: JSON.stringify({
          status: 'PASS', reason_codes: [], workspace_state: 'PREPARED', holder_state: 'ABSENT',
        }) + '\n'};
      }
      state.events.push('owner-apply');
      assert.equal(env[holder.CLAIM_ENV], CLAIM);
      const requestPath = argv[argv.indexOf('--request') + 1];
      const patchPath = argv[argv.indexOf('--patch') + 1];
      const prPath = argv[argv.indexOf('--pr-request') + 1];
      assert.notEqual(requestPath, files.args.requestFile);
      assert.notEqual(patchPath, files.args.patchFile);
      assert.notEqual(prPath, files.args.prRequestFile);
      const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
      const pr = JSON.parse(fs.readFileSync(prPath, 'utf8'));
      assert.equal(request.message, 'feat(mcl): add prepared L apply composition');
      assert.equal(pr.title, 'feat(mcl): add prepared L apply composition');
      assert.equal(pr.body, 'Refs #3525');
      assert.equal(fs.readFileSync(patchPath, 'utf8'), 'fixture-patch\n');
      return {code: 0, text: JSON.stringify({
        status: 'PASS', reason_codes: [], new_head: HEAD, pr_number: 4001,
      }) + '\n'};
    },
  });
  try {
    const out = owner.executeComposition(files.args, state.deps);
    assert.equal(out.status, 'PASS');
  } finally { cleanup(files); }
});

test('in-process L owner apply OwnerError preserves disposition and reason', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    ownerRunCli(argv) {
      if (argv[0] === 'inspect') {
        state.events.push('owner-inspect');
        return {code: 0, text: JSON.stringify({
          status: 'PASS', reason_codes: [], workspace_state: 'PREPARED', holder_state: 'ABSENT',
        }) + '\n'};
      }
      state.events.push('owner-apply');
      throw new lOwner.OwnerError('BLOCKED', ['PATCH_DOES_NOT_APPLY']);
    },
  });
  try {
    const out = owner.executeComposition(files.args, state.deps);
    assert.equal(out.status, 'BLOCKED');
    assert.deepEqual(out.reasonCodes, ['PATCH_DOES_NOT_APPLY']);
    assert.equal(state.events.includes('release-lease'), false);
    assert.equal(state.events.includes('holder-release'), false);
  } finally { cleanup(files); }
});

test('in-process L owner inspect OwnerError preserves disposition and reason', () => {
  const files = fixtureFiles();
  const state = baseDeps(files, {
    ownerRunCli(argv) {
      if (argv[0] === 'inspect') {
        state.events.push('owner-inspect');
        throw new lOwner.OwnerError('CONFLICT', ['WORKSPACE_STATE_CONFLICT']);
      }
      throw new Error('unexpected apply');
    },
  });
  try {
    assert.throws(
      () => owner.executeComposition(files.args, state.deps),
      (error) => error.kind === 'CONFLICT'
        && error.reasonCodes.includes('WORKSPACE_STATE_CONFLICT')
    );
    assert.equal(state.events.includes('holder-claim'), false);
  } finally { cleanup(files); }
});

test('finalize resumes only the released holder-absent suffix without source effect', () => {
  const files = fixtureFiles();
  const state = baseDeps(files);
  const m = manifest();
  state.setActivation(owner.buildActivation({
    manifest: m,
    manifestCommentId: 1,
    owner: {new_head: HEAD, pr_number: 4001},
    prRequest: {
      title: 'feat(mcl): add prepared L apply composition',
      body: 'Refs #3525',
    },
    releaseGeneration: 11,
    releaseEvidenceRef: 'run:202',
  }));
  state.deps.readCurrent = () => {
    state.events.push('read-current');
    return {
      issue: {state: 'open', body: PACKET_BODY},
      ledger: {body: 'released-ledger'},
    };
  };
  state.deps.validateEvidence = (input) => {
    state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
    return {
      ok: !input.requireActiveLease,
      reasonCodes: input.requireActiveLease ? ['LEASE_NOT_ACTIVE'] : [],
      state: {generation: 12},
    };
  };
  try {
    const out = owner.executeFinalize({
      operation: 'finalize',
      packetRef: PACKET_REF,
      packetNumber: 3525,
      manifestFile: files.args.manifestFile,
      requestFile: null,
      patchFile: null,
      prRequestFile: null,
    }, state.deps);
    assert.equal(out.status, 'PASS');
    assert.equal(out.commit, HEAD);
    assert.equal(out.prNumber, 4001);
    assert.equal(state.events.includes('holder-claim'), false);
    assert.equal(state.events.includes('owner-apply'), false);
    assert.equal(state.events.includes('release-lease'), false);
    assert.equal(state.events.includes('holder-release'), false);
    assert.ok(state.events.includes('read-published'));
    assert.ok(state.events.includes('post-completion'));
    assert.ok(state.events.includes('remove-activation'));
  } finally { cleanup(files); }
});

test('finalize blocks when activation release evidence is incomplete', () => {
  const files = fixtureFiles();
  const state = baseDeps(files);
  const m = manifest();
  state.setActivation(owner.buildActivation({
    manifest: m,
    manifestCommentId: 1,
    owner: {new_head: HEAD, pr_number: 4001},
    prRequest: {
      title: 'feat(mcl): add prepared L apply composition',
      body: 'Refs #3525',
    },
  }));
  try {
    assert.throws(
      () => owner.executeFinalize({
        operation: 'finalize',
        packetRef: PACKET_REF,
        packetNumber: 3525,
        manifestFile: files.args.manifestFile,
      }, state.deps),
      (error) => error.reasonCodes.includes('FINALIZE_RELEASE_EVIDENCE_MISSING')
    );
    assert.equal(state.events.includes('post-completion'), false);
  } finally { cleanup(files); }
});

test('final pre-effect manifest binding is retained in successful output', () => {
  const files = fixtureFiles();
  const state = baseDeps(files);
  let reads = 0;
  state.deps.readComments = () => {
    reads += 1;
    const manifestId = reads <= 3 ? reads : 3;
    return [
      {id: manifestId, body: files.manifestText},
      ...state.comments.filter((row) => row.body !== files.manifestText),
    ];
  };
  state.deps.postComment = (_packet, body) => {
    state.events.push('post-completion');
    const id = 999;
    state.comments.push({id, body});
    return id;
  };
  try {
    const out = owner.executeComposition(files.args, state.deps);
    assert.equal(out.status, 'PASS');
    assert.equal(out.manifestCommentId, 3);
    assert.equal(state.events.filter((item) => item === 'write-activation').length, 2);
  } finally { cleanup(files); }
});

test('existing exact completion comment is reused without duplicate write', () => {
  const files = fixtureFiles();
  const state = baseDeps(files);
  let posted = false;
  state.deps.postComment = (_packet, body) => {
    posted = true;
    const id = 777;
    state.comments.push({id, body});
    return id;
  };
  try {
    const first = owner.executeComposition(files.args, state.deps);
    assert.equal(first.status, 'PASS');
    assert.equal(posted, true);
    const receiptText = state.comments.find((row) => row.id === first.completionCommentId).body;
    const before = owner.exactCommentState(state.comments, receiptText);
    assert.equal(before.count, 1);
  } finally { cleanup(files); }
});

test('completion comment lost acknowledgement is reconciled by exact readback', () => {
  const files = fixtureFiles();
  const state = baseDeps(files);
  state.deps.postComment = (_packet, body) => {
    state.events.push('post-completion');
    const id = 888;
    state.comments.push({id, body});
    throw new Error('simulated lost acknowledgement');
  };
  try {
    const out = owner.executeComposition(files.args, state.deps);
    assert.equal(out.status, 'PASS');
    assert.equal(out.completionCommentId, 888);
    const matches = state.comments.filter((row) => row.id === 888);
    assert.equal(matches.length, 1);
  } finally { cleanup(files); }
});

test('source adds no direct Git mutation, PR-create, merge, runtime, or cleanup primitive', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../mcl-l-repository-apply-composition.cjs'), 'utf8');
  for (const forbidden of [
    "execSync(",
    "pr', 'create",
    "gh pr merge",
    "gitRead(manifest.workspace.worktree, ['push'",
    "gitRead(manifest.workspace.worktree, ['commit'",
    "gitRead(manifest.workspace.worktree, ['merge'",
    "gitRead(manifest.workspace.worktree, ['reset'",
    "gitRead(manifest.workspace.worktree, ['stash'",
    "gitRead(manifest.workspace.worktree, ['clean'",
    "process.kill",
    "fetch(",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.ok(source.includes("childProcess.spawnSync('git'"));
  assert.ok(source.includes('lOwner.runCli'));
  assert.ok(source.includes('workspaceHolder.claimHolder'));
  assert.ok(source.includes('stageEntry.releaseRepositoryLease'));
  assert.ok(source.includes('taskHandoff.buildCompletionReceipt'));
});
