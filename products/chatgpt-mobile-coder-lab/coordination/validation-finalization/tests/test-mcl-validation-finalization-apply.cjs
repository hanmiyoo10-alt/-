'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-validation-finalization-apply.cjs');
const ROOT = path.resolve(__dirname, '../../../../..');
const handoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const stageReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs'));

function decision(kind, overrides = {}) {
  if (kind === 'ALREADY_FINALIZED') {
    return {
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      attentionDisposition: 'COMPLETE',
      requiredEffectClasses: [],
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
      evidenceDigest: 'sha256:' + 'a'.repeat(64),
      ...overrides,
    };
  }
  if (kind === 'FINALIZATION_REQUIRED') {
    return {
      finalizationDisposition: 'FINALIZATION_REQUIRED',
      result: 'PASS',
      attentionDisposition: 'ACTION_REQUIRED',
      requiredEffectClasses: [...owner.EXPECTED_EFFECTS],
      nextLegalAction: 'FIXED_FINALIZATION_EFFECT_REVIEW',
      evidenceDigest: 'sha256:' + 'b'.repeat(64),
      ...overrides,
    };
  }
  return {
    finalizationDisposition: kind,
    result: kind === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
    attentionDisposition: kind === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
    requiredEffectClasses: [],
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    evidenceDigest: 'sha256:' + 'c'.repeat(64),
    ...overrides,
  };
}
function fakeState({
  disposition = 'FINALIZATION_REQUIRED',
  holderState = 'PRESENT_EXACT',
  completion = 'ABSENT',
  stage = 'ABSENT',
  workspace = 'CLEAN',
  requiredEffects = null,
} = {}) {
  const d = decision(disposition);
  if (requiredEffects) d.requiredEffectClasses = requiredEffects;
  return {
    workspace: {holderState, state: workspace},
    completion: {
      status: completion,
      receiptIds: completion === 'COMPLETE' ? ['d'.repeat(64)] : [],
      representativeReceiptId: completion === 'COMPLETE' ? 'd'.repeat(64) : null,
    },
    validationStage: {status: stage, receipt: stage === 'PASS' ? {} : null},
    decision: d,
  };
}
function fakeContext() {
  return {packet: 2463, packetRef: '#2463', runner: () => ({code: 0, stdout: '[]'}),
    implReceipt: {scope: {paths: ['products/example.txt'], diffIdentity: '1'.repeat(64)}}};
}

test('public parser accepts only inspect/apply packet+format', () => {
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#2463', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#2463', format: 'agent-view'},
  );
  assert.deepEqual(
    owner.parseArgs(['apply', '--packet', '#2463', '--format', 'json']),
    {command: 'apply', packetRef: '#2463', format: 'json'},
  );
  for (const argv of [
    ['apply', '--packet', '#1', '--format', 'json'],
    ['apply', '--packet', '#2463', '--format', 'json', '--repo', 'x/y'],
    ['apply', '--packet', '#2463', '--format', 'json', '--pr', '2464'],
    ['apply', '--packet', '#2463', '--format', 'json', '--manifest', 'x'],
    ['apply', '--packet', '#2463', '--format', 'json', '--lease-id', 'x'],
    ['apply', '--packet', '#2463', '--format', 'json', '--worktree', '/tmp/x'],
    ['apply', '--packet', '#2463', '--format', 'raw'],
  ]) assert.throws(() => owner.parseArgs(argv));
});

test('exact V1 effect pair is required', () => {
  assert.equal(owner.effectPairExact(decision('FINALIZATION_REQUIRED')), true);
  assert.equal(owner.effectPairExact(decision('FINALIZATION_REQUIRED', {
    requiredEffectClasses: ['CANONICAL_VALIDATION_MERGE_RECEIPT'],
  })), false);
  assert.equal(owner.effectPairExact(decision('ALREADY_FINALIZED')), false);
});

test('apply performs holder cleanup, D014 publish, stage publish, then ALREADY_FINALIZED', () => {
  let phase = 0;
  const calls = [];
  const deps = {
    createContext: () => fakeContext(),
    readState: () => {
      if (phase === 0) return fakeState();
      if (phase === 1) return fakeState({holderState: 'ABSENT'});
      if (phase === 2) return fakeState({
        holderState: 'ABSENT', completion: 'COMPLETE',
      });
      return fakeState({
        disposition: 'ALREADY_FINALIZED',
        holderState: 'ABSENT', completion: 'COMPLETE', stage: 'PASS',
      });
    },
    cleanupHolder: () => { calls.push('holder'); phase = 1; return {cleaned: 1}; },
    buildCompletionText: () => ({text: 'D014'}),
    buildValidationStageText: () => ({text: 'STAGE'}),
    publishExact: (_packet, body) => {
      calls.push(body);
      phase = body === 'D014' ? 2 : 3;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  };
  const result = owner.applyPacket('#2463', deps);
  assert.equal(result.status, 'PASS');
  assert.equal(result.finalizationDisposition, 'ALREADY_FINALIZED');
  assert.deepEqual(result.effects, {
    holderCleaned: 1, d014Published: 1, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, ['holder', 'D014', 'STAGE']);
});

test('already finalized apply is zero-effect idempotent', () => {
  let effectCalls = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => fakeState({
      disposition: 'ALREADY_FINALIZED',
      holderState: 'ABSENT', completion: 'COMPLETE', stage: 'PASS',
    }),
    cleanupHolder: () => { effectCalls += 1; return {cleaned: 1}; },
    publishExact: () => { effectCalls += 1; return {written: 1}; },
  };
  const result = owner.applyPacket('#2463', deps);
  assert.equal(result.status, 'PASS');
  assert.equal(effectCalls, 0);
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 0,
  });
});

test('wrong effect-class subset blocks before all effects', () => {
  let effects = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => fakeState({
      requiredEffects: ['CANONICAL_VALIDATION_MERGE_RECEIPT'],
    }),
    cleanupHolder: () => { effects += 1; },
    publishExact: () => { effects += 1; },
  };
  assert.throws(
    () => owner.applyPacket('#2463', deps),
    (error) => error instanceof owner.ApplyError
      && error.reasonCodes.includes('PRE_EFFECT_FINALIZATION_DISPOSITION_NOT_V1_PAIR'),
  );
  assert.equal(effects, 0);
});

for (const disposition of ['UNKNOWN', 'CONFLICT', 'BLOCKED', 'MERGE_NOT_PROVEN']) {
  test(disposition + ' pre-state performs zero effects', () => {
    let effects = 0;
    const deps = {
      createContext: () => fakeContext(),
      readState: () => fakeState({disposition}),
      cleanupHolder: () => { effects += 1; },
      publishExact: () => { effects += 1; },
    };
    assert.throws(() => owner.applyPacket('#2463', deps), owner.ApplyError);
    assert.equal(effects, 0);
  });
}

test('holder cleanup failure stops before comment writes', () => {
  let writes = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => fakeState(),
    cleanupHolder: () => {
      throw new owner.ApplyError('BLOCKED', ['HOLDER_CLEANUP_FAILED']);
    },
    publishExact: () => { writes += 1; return {written: 1}; },
  };
  assert.throws(() => owner.applyPacket('#2463', deps), owner.ApplyError);
  assert.equal(writes, 0);
});

test('dirty workspace blocks before comment writes', () => {
  let writes = 0;
  let reads = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => {
      reads += 1;
      return reads === 1
        ? fakeState({holderState: 'ABSENT', workspace: 'DIRTY'})
        : fakeState({holderState: 'ABSENT'});
    },
    publishExact: () => { writes += 1; return {written: 1}; },
  };
  assert.throws(
    () => owner.applyPacket('#2463', deps),
    (error) => error.reasonCodes.includes('WORKSPACE_NOT_CLEAN'),
  );
  assert.equal(writes, 0);
});

test('post-effect reinspection must be ALREADY_FINALIZED', () => {
  let phase = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => {
      if (phase === 0) return fakeState({holderState: 'ABSENT'});
      if (phase === 1) return fakeState({holderState: 'ABSENT', completion: 'COMPLETE'});
      return fakeState({holderState: 'ABSENT', completion: 'COMPLETE', stage: 'PASS'});
    },
    buildCompletionText: () => ({text: 'D014'}),
    buildValidationStageText: () => ({text: 'STAGE'}),
    publishExact: (_packet, body) => {
      phase = body === 'D014' ? 1 : 2;
      return {written: 1};
    },
  };
  assert.throws(
    () => owner.applyPacket('#2463', deps),
    (error) => error.reasonCodes.includes('POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED'),
  );
});

function manifestFixture() {
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2463',
    packetBodySha256: 'a'.repeat(64),
    phaseId: 'validation-merge',
    phaseClass: 'VALIDATION',
    route: 'S',
    executor: 'S',
    scopes: ['path:products/example.txt'],
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-wireless-adb-new-chat-landing-2463',
      worktree: '/root/nyang-worktrees/mcl-wireless-adb-new-chat-landing-2463',
    },
    observedBaseSha: owner.TARGET.candidate,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: owner.TARGET.leaseId,
      acquiredGeneration: owner.TARGET.acquiredGeneration,
      acquireEvidenceRef: 'run:35681889305',
    },
    sourceAuthorityRefs: ['#2463', 'issue:#2352'],
    inputRefs: ['commit:' + owner.TARGET.candidate],
    expectedOutputRefs: ['pr:#2464'],
    acceptanceRefs: ['#2463'],
    stopCondition: 'Test exact validation finalization completion evidence.',
    authority: {...handoff.AUTHORITY_FLAGS},
  });
}

test('D014 completion is built through existing task-handoff owner', () => {
  const manifest = manifestFixture();
  const built = owner.buildCompletionText({manifest});
  const parsed = handoff.parseCompletionReceipt(built.text);
  assert.equal(parsed.status, 'VALID');
  assert.equal(parsed.value.disposition, 'COMPLETE');
  assert.equal(parsed.value.leaseDisposition, 'RELEASED');
  assert.equal(parsed.value.leaseReleaseEvidence.leaseId, owner.TARGET.leaseId);
  assert.equal(parsed.value.leaseReleaseEvidence.releasedGeneration,
    owner.TARGET.releasedGeneration);
  assert.equal(parsed.value.workspaceResult, 'clean');
});

function implementationReceiptFixture() {
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: 2463,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate', identity: owner.TARGET.candidate},
      {kind: 'PR', locator: 'pr:#2464', identity: owner.TARGET.candidate},
    ],
    requiredGates: [
      {name: 'required', result: 'PASS', evidenceLocator: 'run:1'},
    ],
    scope: {
      paths: ['products/example.txt'],
      diffRequired: true,
      diffIdentity: '1'.repeat(64),
      diffEvidenceLocator: 'pr:#2464',
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + owner.TARGET.candidate},
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'run:1'},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  });
  assert.equal(receipt.status, 'PASS');
  return receipt;
}

test('canonical VALIDATION_MERGE receipt is built through existing owner', () => {
  const implReceipt = implementationReceiptFixture();
  const completion = {
    status: 'COMPLETE',
    representativeReceiptId: 'e'.repeat(64),
  };
  const built = owner.buildValidationStageText({implReceipt}, completion);
  const parsed = stageReceipt.parseRenderedStageReceipt(built.text);
  assert.equal(parsed.status, 'VALID');
  assert.equal(parsed.value.stage, 'VALIDATION_MERGE');
  assert.equal(parsed.value.status, 'PASS');
  assert.equal(parsed.value.nextLegalAction, 'POSTMERGE_CONVERGENCE');
  assert.deepEqual(parsed.value.scope.paths, ['products/example.txt']);
  assert.equal(parsed.value.scope.diffIdentity, '1'.repeat(64));
});

function commentRunner({initial = [], postCode = 0, writeOnFailure = false} = {}) {
  const comments = initial.map((body, index) => ({id: index + 1, body}));
  let posts = 0;
  const runner = (args, options = {}) => {
    const endpoint = args[1] || '';
    const methodIndex = args.indexOf('--method');
    const method = methodIndex >= 0 ? args[methodIndex + 1] : 'GET';
    if (!endpoint.includes('/issues/2463/comments')) {
      return {code: 1, stdout: '', stderr: ''};
    }
    if (method === 'GET') {
      return {code: 0, stdout: JSON.stringify(comments), stderr: ''};
    }
    if (method === 'POST') {
      posts += 1;
      const body = JSON.parse(options.input || '{}').body;
      if (postCode === 0 || writeOnFailure) comments.push({id: comments.length + 1, body});
      return {
        code: postCode,
        stdout: postCode === 0 ? JSON.stringify(comments[comments.length - 1]) : '',
        stderr: '',
      };
    }
    return {code: 1, stdout: '', stderr: ''};
  };
  return {runner, comments, posts: () => posts};
}

test('exact comment publication reuses existing body with zero duplicate writes', () => {
  const fake = commentRunner({initial: ['EXACT']});
  const out = owner.postExactComment(2463, 'EXACT', fake.runner);
  assert.equal(out.written, 0);
  assert.equal(out.reused, 1);
  assert.equal(fake.posts(), 0);
});

test('exact comment publication writes once and verifies readback', () => {
  const fake = commentRunner();
  const out = owner.postExactComment(2463, 'EXACT', fake.runner);
  assert.equal(out.written, 1);
  assert.equal(out.lostAckRecovered, false);
  assert.equal(fake.posts(), 1);
  assert.equal(fake.comments.length, 1);
});

test('lost comment acknowledgement is recovered only by exact readback', () => {
  const fake = commentRunner({postCode: 1, writeOnFailure: true});
  const out = owner.postExactComment(2463, 'EXACT', fake.runner);
  assert.equal(out.written, 1);
  assert.equal(out.lostAckRecovered, true);
  assert.equal(fake.posts(), 1);
});

test('failed comment write without exact readback is UNKNOWN and never retried', () => {
  const fake = commentRunner({postCode: 1, writeOnFailure: false});
  assert.throws(
    () => owner.postExactComment(2463, 'EXACT', fake.runner),
    (error) => error instanceof owner.ApplyError
      && error.reasonCodes.includes('COMMENT_WRITE_ACK_UNKNOWN'),
  );
  assert.equal(fake.posts(), 1);
});

test('duplicate exact comments fail closed', () => {
  const fake = commentRunner({initial: ['EXACT', 'EXACT']});
  assert.throws(
    () => owner.postExactComment(2463, 'EXACT', fake.runner),
    (error) => error.reasonCodes.includes('EXACT_COMMENT_DUPLICATE'),
  );
  assert.equal(fake.posts(), 0);
});

test('inspect is read-only and exposes bounded decision only', () => {
  const result = owner.inspectPacket('#2463', {
    createContext: () => fakeContext(),
    readState: () => fakeState(),
  });
  assert.equal(result.operation, 'inspect');
  assert.equal(result.finalizationDisposition, 'FINALIZATION_REQUIRED');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 0,
  });
  assert.equal(result.authority.repositoryMutationAuthorized, false);
});

test('agent-view output contains no holder capability or raw execution material', () => {
  const result = owner.inspectPacket('#2463', {
    createContext: () => fakeContext(),
    readState: () => fakeState(),
  });
  const rendered = JSON.stringify(owner.render(result, 'agent-view'));
  for (const forbidden of [
    'claimDigest', 'holderSecret', 'pid', 'process.env', 'authorization',
    'bearer ', 'GH_TOKEN', 'GITHUB_TOKEN',
  ]) assert.equal(rendered.includes(forbidden), false, forbidden);
});

test('source contains no Git/PR/lease/currentization mutation surface', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-validation-finalization-apply.cjs'), 'utf8');
  for (const forbidden of [
    'git push', 'git merge', 'git rebase', 'git reset', 'git checkout',
    'git commit', 'git clean', 'git branch -', 'lease-acquire',
    'lease-release', 'workflow run', '--method\', \'PATCH',
    '--method\', \'DELETE', 'process.env', 'claimDigest',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});

test('source owns only the fixed packet comment write endpoint', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-validation-finalization-apply.cjs'), 'utf8');
  assert.match(source, /issues\/\' \+ packet \+ '\/comments/);
  assert.equal(source.includes("'/pulls/' + TARGET.pr + '/comments'"), false);
  assert.equal(source.includes('/git/refs'), false);
  assert.equal(source.includes('/merges'), false);
});

test('runCli rejects unsupported selectors before any live owner call', () => {
  const out = owner.runCli([
    'apply', '--packet', '#2463', '--format', 'json', '--command', 'x',
  ]);
  assert.equal(out.code, 2);
  assert.equal(out.result.status, 'UNKNOWN');
  assert.ok(out.result.reasonCodes.length > 0);
});
