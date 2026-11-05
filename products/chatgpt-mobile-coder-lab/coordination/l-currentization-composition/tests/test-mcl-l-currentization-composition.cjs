#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const taskHandoff = require('../../task-handoff.cjs');
const lease = require('../../task-lease.cjs');
const owner = require('../mcl-l-currentization-composition.cjs');

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const LEASE = 'd'.repeat(64);

function manifest(packetBody, workspace) {
  return taskHandoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#4251',
    packetBodySha256: lease.digest(packetBody),
    phaseId: '4251-validation-merge-currentization',
    phaseClass: 'VALIDATION',
    route: 'L',
    executor: 'L',
    scopes: [
      'path:products/chatgpt-mobile-coder-lab/coordination/l-currentization-composition/README.md',
      'surface:mcl:packet-currentization-holder-composition',
    ],
    workspace,
    observedBaseSha: SHA_A,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE,
      acquiredGeneration: 10,
      acquireEvidenceRef: 'receipt:test-acquire',
    },
    sourceAuthorityRefs: ['issue:#3733'],
    inputRefs: ['issue:#4251'],
    expectedOutputRefs: ['commit:' + SHA_C],
    acceptanceRefs: ['issue:#3733'],
    stopCondition: 'Currentize only while exact D-013/D-014/holder evidence remains current.',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  });
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-currentize-composition-'));
  const packetBody = '<!-- canonical-main-work-packet:v1 -->\n# packet\n';
  const workspace = {
    kind: 'repository',
    branch: 'laptop/mcl-packet-4251-currentization-holder',
    worktree: '/home/alsl0/nyang-worktrees/mcl-packet-4251-currentization-holder',
  };
  const m = manifest(packetBody, workspace);
  const request = {
    schemaVersion: 1,
    branch: workspace.branch,
    expectedHead: SHA_A,
    generationBase: SHA_B,
    currentMain: SHA_B,
    owningCi: 'SimCore CI / Required',
    requiredValidations: ['Required'],
  };
  const paths = {
    manifestPath: path.join(dir, 'manifest.md'),
    ledgerPath: path.join(dir, 'ledger.md'),
    packetPath: path.join(dir, 'packet.md'),
    requestPath: path.join(dir, 'request.json'),
  };
  fs.writeFileSync(paths.manifestPath, taskHandoff.renderManifest(m));
  fs.writeFileSync(paths.ledgerPath, 'ledger');
  fs.writeFileSync(paths.packetPath, packetBody);
  fs.writeFileSync(paths.requestPath, JSON.stringify(request));
  return {
    dir, packetBody, workspace, manifest: m, request, paths,
    args: {packetRef:'#4251', packetNumber:4251, ...paths},
  };
}

function successDeps(f, calls = []) {
  return {
    validateEvidence(input) {
      calls.push('validate:' + (input.requireActiveLease ? 'active' : 'released'));
      return {ok:true, reasonCodes:[], state:{generation:11}};
    },
    claimHolder() {
      calls.push('claim');
      return {result:{status:'CLAIMED', reasonCodes:[]}, secret:'e'.repeat(64)};
    },
    checkHolder() {
      calls.push('check');
      return {status:'CHECK_PASS', reasonCodes:[]};
    },
    readComments() {
      calls.push('read-comments');
      return [{body: taskHandoff.renderManifest(f.manifest)}];
    },
    runCurrentizer() {
      calls.push('currentize');
      return {code:0, value:{disposition:'CURRENTIZED', reasonCode:'CURRENTIZATION_COMPLETE', newHead:SHA_C}};
    },
    releaseLease() {
      calls.push('release-lease');
      return {ok:true, value:{observedGeneration:11, evidenceRef:'receipt:test-release'}};
    },
    readCurrent() {
      calls.push('read-current');
      return {issue:{state:'open', body:f.packetBody}, ledger:{body:'released-ledger'}};
    },
    releaseHolder() {
      calls.push('release-holder');
      return {status:'RELEASED', reasonCodes:[]};
    },
    buildCompletionReceipt(m, input) {
      calls.push('build-completion');
      return taskHandoff.buildCompletionReceipt(m, input);
    },
    renderCompletionReceipt(receipt) {
      return taskHandoff.renderCompletionReceipt(receipt);
    },
    postComment() {
      calls.push('post-completion');
      return 123;
    },
  };
}

test('binding requires exact L/L active evidence before holder claim', () => {
  const f = fixture();
  const deps = successDeps(f);
  deps.validateEvidence = () => ({ok:false, reasonCodes:['LEASE_NOT_ACTIVE']});
  assert.throws(() => owner.execute(f.args, deps), /LEASE_NOT_ACTIVE/);
});

test('request branch must equal manifest branch before holder claim', () => {
  const f = fixture();
  fs.writeFileSync(f.paths.requestPath, JSON.stringify({...f.request, branch:'laptop/other'}));
  assert.throws(() => owner.execute(f.args, successDeps(f)), /CURRENTIZER_BRANCH_MANIFEST_CONFLICT/);
});

test('request expected head must equal manifest observed base', () => {
  const f = fixture();
  fs.writeFileSync(f.paths.requestPath, JSON.stringify({...f.request, expectedHead:SHA_B}));
  assert.throws(() => owner.execute(f.args, successDeps(f)), /CURRENTIZER_HEAD_MANIFEST_CONFLICT/);
});

test('D-014 manifest must be durably present exactly once before holder claim', () => {
  const f = fixture();
  const calls = [];
  const deps = successDeps(f, calls);
  deps.readComments = () => {
    calls.push('read-comments');
    return [];
  };
  assert.throws(() => owner.execute(f.args, deps), /MANIFEST_COMMENT_MISSING/);
  assert.equal(calls.includes('claim'), false);
  assert.equal(calls.includes('currentize'), false);
});

test('pre-existing or foreign holder blocks before currentizer', () => {
  const f = fixture();
  const calls = [];
  const deps = successDeps(f, calls);
  deps.claimHolder = () => ({result:{status:'BLOCKED', reasonCodes:['HOLDER_ALREADY_EXISTS']}, secret:null});
  assert.throws(() => owner.execute(f.args, deps), /HOLDER_ALREADY_EXISTS/);
  assert.equal(calls.includes('currentize'), false);
});

test('holder check is immediately before currentizer invocation', () => {
  const f = fixture();
  const calls = [];
  const result = owner.execute(f.args, successDeps(f, calls));
  assert.equal(result.status, 'PASS');
  const firstCheck = calls.indexOf('check');
  const currentize = calls.indexOf('currentize');
  assert.ok(firstCheck >= 0 && currentize === firstCheck + 1);
});

test('successful currentization reconverges lease holder and D-014 in order', () => {
  const f = fixture();
  const calls = [];
  const result = owner.execute(f.args, successDeps(f, calls));
  assert.equal(result.status, 'PASS');
  assert.equal(result.newHead, SHA_C);
  assert.deepEqual(calls, [
    'validate:active', 'read-comments', 'claim', 'check', 'currentize', 'check',
    'release-lease', 'read-current', 'validate:released',
    'release-holder', 'build-completion', 'post-completion',
  ]);
  assert.deepEqual(result.effects, {
    holderClaimed:1, currentizerInvoked:1, d013Released:1, holderReleased:1, d014Published:1,
  });
});

test('released lease readback failure blocks before holder release', () => {
  const f = fixture();
  const calls = [];
  const deps = successDeps(f, calls);
  let validation = 0;
  deps.validateEvidence = () => {
    validation += 1;
    return validation === 1
      ? {ok:true, reasonCodes:[]}
      : {ok:false, reasonCodes:['LEASE_STILL_ACTIVE']};
  };
  assert.throws(() => owner.execute(f.args, deps), /D013_RELEASE_READBACK_INVALID/);
  assert.equal(calls.includes('release-holder'), false);
});

test('currentizer BLOCKED does not invent release or completion', () => {
  const f = fixture();
  const calls = [];
  const deps = successDeps(f, calls);
  deps.runCurrentizer = () => {
    calls.push('currentize');
    return {code:2, value:{disposition:'BLOCKED', reasonCode:'MERGE_CONFLICT_OR_FAILURE', remoteMutationMayHaveOccurred:false}};
  };
  const result = owner.execute(f.args, deps);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(calls.includes('release-lease'), false);
  assert.equal(calls.includes('release-holder'), false);
  assert.equal(calls.includes('post-completion'), false);
});

test('unknown remote mutation preserves coordination state', () => {
  const f = fixture();
  const calls = [];
  const deps = successDeps(f, calls);
  deps.runCurrentizer = () => {
    calls.push('currentize');
    return {code:5, value:{disposition:'UNKNOWN', reasonCode:'PUSH_RESULT_UNKNOWN', remoteMutationMayHaveOccurred:true}};
  };
  const result = owner.execute(f.args, deps);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.remoteMutationMayHaveOccurred, true);
  assert.equal(result.nextLegalAction, 'PRESERVE_COORDINATION_AND_RECOVER');
  assert.equal(calls.includes('release-lease'), false);
});

test('normal output never exposes holder capability', () => {
  const f = fixture();
  const result = owner.execute(f.args, successDeps(f));
  const text = JSON.stringify(result);
  assert.equal(text.includes('e'.repeat(64)), false);
  assert.equal(text.includes('claimDigest'), false);
});

test('generic currentizer stays an external fixed owner', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-l-currentization-composition.cjs'), 'utf8');
  assert.match(source, /tools\/repo-write\/currentize_candidate\.py/);
  assert.doesNotMatch(source, /currentness_replay/);
});
