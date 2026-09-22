#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../..');
const impl = require('../mcl-repository-implementation.cjs');
const handoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const patchOwner = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs'));
const executionReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));

const PACKET = '#9001';
const BODY_SHA = 'a'.repeat(64);
const BASE = '1'.repeat(40);
const HEAD = '2'.repeat(40);
const LEASE = 'b'.repeat(64);
const ACQUIRE = 'run:1234';
const PATHS = [...patchOwner.D014_COMPLETION_SET_PATHS].sort();
const SCOPES = [...patchOwner.D014_VALIDATION_SCOPES];
const D014_PROFILE = patchOwner.validationProfileById(patchOwner.D014_VALIDATION_PROFILE);
const VC_PATHS = [...patchOwner.VALIDATION_CONTINUATION_PATHS].sort();
const VC_SCOPES = [...patchOwner.VALIDATION_CONTINUATION_SCOPES];

function makeParent() {
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: PACKET,
    packetBodySha256: BODY_SHA,
    phaseId: '9001-implementation-pr-stage-entry',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: SCOPES,
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-packet-9001',
      worktree: '/root/nyang-worktrees/mcl-packet-9001',
    },
    observedBaseSha: BASE,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE,
      acquiredGeneration: 77,
      acquireEvidenceRef: ACQUIRE,
    },
    sourceAuthorityRefs: [PACKET, 'issue:#2352'],
    inputRefs: ['commit:' + BASE, ACQUIRE],
    expectedOutputRefs: PATHS.map((item) => 'path:' + item),
    acceptanceRefs: [PACKET],
    stopCondition: 'prepare',
    authority: {...impl.FALSE_AUTHORITY},
  });
}
function makeCtx() {
  return {
    packet: 9001,
    packetRef: PACKET,
    issue: {body: 'packet-body'},
    ledgerIssue: {body: 'ledger-body'},
    context: {packetBodySha256: BODY_SHA},
    mainSha: '3'.repeat(40),
    requestedScopes: SCOPES,
    parentManifest: makeParent(),
    parentHandoff: {},
    parentManifestComment: 501,
    parentHandoffComment: 502,
  };
}
function makeFiles() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-impl-test-'));
  const patch = Buffer.from('bounded-patch-bytes\n', 'utf8');
  const request = {
    schema: 'mcl-repository-patch-request.v1',
    message: 'test: bounded effect',
    expected_paths: PATHS,
    patch_sha256: impl.sha256(patch),
  };
  const validation = {
    schema: patchOwner.VALIDATION_REQUEST_SCHEMA,
    profile: patchOwner.D014_VALIDATION_PROFILE,
  };
  const pr = {
    schema: impl.PR_SCHEMA,
    title: 'test: bounded implementation',
    body: 'Implements one bounded fixture.\n\nRefs #9001',
  };
  const requestText = JSON.stringify(request);
  const validationText = JSON.stringify(validation);
  const prText = JSON.stringify(pr);
  const requestFile = path.join(dir, 'request.json');
  const patchFile = path.join(dir, 'request.patch');
  const validationFile = path.join(dir, 'validation.json');
  fs.writeFileSync(requestFile, requestText);
  fs.writeFileSync(patchFile, patch);
  fs.writeFileSync(validationFile, validationText);
  return {
    dir, patch, request, requestText, requestFile, patchFile,
    validationText, validationFile, prText,
    cleanup() { fs.rmSync(dir, {recursive: true, force: true}); },
  };
}
function ownerPass(manifestId) {
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'patch:' + manifestId,
    primitiveId: 'mcl:repository-worktree-patch',
    sourceIdentity: {kind: 'WORK_PACKET', locator: PACKET, identity: BODY_SHA},
    executionSurface: 'MCL:S',
    stage: 'HOST_ORCHESTRATED_REPOSITORY_PATCH',
    executionLifecycle: 'FINISHED',
    attentionDisposition: 'COMPLETE',
    result: 'PASS',
    proofScope: 'IMPLEMENTATION_EFFECT',
    steps: [{name: 'push', result: 'PASS', evidenceLocator: 'commit:' + HEAD}],
    counters: [{name: 'push_verified', value: 1}],
    affectedFiles: PATHS,
    artifactLocators: ['commit:' + HEAD],
    reasonCodes: [],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    exitCode: 0,
    stderrTail: null,
    nextLegalAction: 'HOLDER_CHECK_THEN_RELEASE_D013_AND_RECORD_D014_COMPLETION',
  });
}

test('PR request accepts only bounded non-closing linkage', () => {
  const value = impl.parsePrRequestText(JSON.stringify({
    schema: impl.PR_SCHEMA,
    title: 'feat: bounded',
    body: 'Body.\n\nRefs #9001',
  }), PACKET);
  assert.equal(value.schema, impl.PR_SCHEMA);
  assert.throws(() => impl.parsePrRequestText(JSON.stringify({
    schema: impl.PR_SCHEMA,
    title: 'feat: bounded',
    body: 'Fixes #9001',
  }), PACKET), /PR_REQUEST_NON_CLOSING_REF_REQUIRED|PR_REQUEST_CLOSING_LINK_FORBIDDEN/);
  assert.throws(() => impl.parsePrRequestText(JSON.stringify({
    schema: impl.PR_SCHEMA,
    title: 'feat: bounded',
    body: 'Refs #9001',
    base: 'other',
  }), PACKET), /PR_REQUEST_UNKNOWN_FIELD:base/);
});

test('CLI is explicit apply and has no owner/repo/base/head override', () => {
  const valid = [
    '--packet', PACKET,
    '--parent-manifest-file', '/tmp/a',
    '--parent-handoff-file', '/tmp/b',
    '--request-file', '/tmp/c',
    '--patch-file', '/tmp/d',
    '--validation-request-file', '/tmp/e',
    '--pr-request-file', '/tmp/f',
    '--apply',
  ];
  assert.equal(impl.parseArgs(valid).packet, PACKET);
  assert.throws(() => impl.parseArgs(valid.filter((item) => item !== '--apply')), /EXPLICIT_APPLY_REQUIRED/);
  assert.throws(() => impl.parseArgs([...valid, '--base', 'main']), /ARGUMENT_UNSUPPORTED/);
});

test('child manifest binds parent, patch, validation, PR and lease identity', () => {
  const files = makeFiles();
  try {
    const ctx = makeCtx();
    const child = impl.buildChildManifest(
      ctx, files.request, files.validationText, files.prText);
    assert.notEqual(child.manifestId, ctx.parentManifest.manifestId);
    assert.equal(child.packetBodySha256, BODY_SHA);
    assert.deepEqual(child.scopes, SCOPES);
    assert.deepEqual(child.workspace, ctx.parentManifest.workspace);
    assert.equal(child.observedBaseSha, BASE);
    assert.equal(child.leaseEvidence.leaseId, LEASE);
    assert.ok(child.inputRefs.includes('https://github.com/hanmiyoo10-alt/-/issues/9001#issuecomment-501'));
    assert.ok(child.inputRefs.includes('https://github.com/hanmiyoo10-alt/-/issues/9001#issuecomment-502'));
    assert.ok(child.inputRefs.includes(
      'receipt:mcl-repository-patch-request:' + files.request.patch_sha256));
    assert.ok(child.inputRefs.includes(
      patchOwner.VALIDATION_REF_PREFIX + impl.sha256(Buffer.from(files.validationText))));
    assert.ok(child.inputRefs.includes(
      patchOwner.VALIDATION_CONTRACT_REF_PREFIX + D014_PROFILE.contractDigest));
    assert.ok(child.inputRefs.includes(
      'receipt:mcl-pr-publication-request:' + impl.sha256(Buffer.from(files.prText))));
    assert.ok(child.inputRefs.includes(ACQUIRE));
  } finally {
    files.cleanup();
  }
});

test('coordinator derives reviewed validation profile from exact packet scope', () => {
  const d014 = impl.resolveValidationProfileBinding(
    makeCtx(),
    JSON.stringify({
      schema: patchOwner.VALIDATION_REQUEST_SCHEMA,
      profile: patchOwner.D014_VALIDATION_PROFILE,
    }),
  );
  assert.equal(d014.profile.profileId, patchOwner.D014_VALIDATION_PROFILE);

  const vcCtx = {...makeCtx(), requestedScopes: [...VC_SCOPES]};
  const vc = impl.resolveValidationProfileBinding(
    vcCtx,
    JSON.stringify({
      schema: patchOwner.VALIDATION_REQUEST_SCHEMA,
      profile: patchOwner.VALIDATION_CONTINUATION_PROFILE,
    }),
  );
  assert.equal(vc.profile.profileId, patchOwner.VALIDATION_CONTINUATION_PROFILE);
  assert.deepEqual(vc.profile.paths, VC_PATHS);

  assert.throws(
    () => impl.resolveValidationProfileBinding(
      vcCtx,
      JSON.stringify({
        schema: patchOwner.VALIDATION_REQUEST_SCHEMA,
        profile: patchOwner.D014_VALIDATION_PROFILE,
      }),
    ),
    (error) => error instanceof impl.ImplementationError
      && error.kind === 'BLOCKED'
      && error.reasonCodes.includes('VALIDATION_PROFILE_REQUEST_MISMATCH'),
  );

  assert.throws(
    () => impl.resolveValidationProfileBinding(
      {...makeCtx(), requestedScopes: ['path:docs/unreviewed.txt']},
      JSON.stringify({
        schema: patchOwner.VALIDATION_REQUEST_SCHEMA,
        profile: patchOwner.D014_VALIDATION_PROFILE,
      }),
    ),
    (error) => error instanceof impl.ImplementationError
      && error.kind === 'BLOCKED'
      && error.reasonCodes.includes('NO_REVIEWED_VALIDATION_PROFILE'),
  );
});

test('PR publication is fixed to exact branch main base and readback', () => {
  const manifest = makeParent();
  const request = impl.parsePrRequestText(JSON.stringify({
    schema: impl.PR_SCHEMA,
    title: 'feat: bounded implementation',
    body: 'Implements one bounded fixture.\n\nRefs #9001',
  }), PACKET);
  const calls = [];
  const runner = (args, options = {}) => {
    calls.push({args, input: options.input || null});
    const endpoint = args[2];
    if (endpoint.includes('/pulls?state=open&head=')) {
      return {code: 0, stdout: '[]', stderr: ''};
    }
    if (endpoint.endsWith('/pulls') && args.includes('POST')) {
      const body = JSON.parse(options.input);
      assert.deepEqual(body, {
        title: request.title, body: request.body,
        head: manifest.workspace.branch, base: 'main', draft: false,
      });
      return {code: 0, stdout: JSON.stringify({number: 77}), stderr: ''};
    }
    if (endpoint.endsWith('/pulls/77')) {
      return {code: 0, stdout: JSON.stringify({
        number: 77, state: 'open', draft: false, body: request.body,
        base: {ref: 'main'}, head: {ref: manifest.workspace.branch, sha: HEAD},
      }), stderr: ''};
    }
    if (endpoint.endsWith('/pulls/77/files?per_page=100')) {
      return {code: 0, stdout: JSON.stringify(PATHS.map((filename) => ({filename}))), stderr: ''};
    }
    throw new Error('unexpected endpoint: ' + endpoint);
  };
  const pr = impl.publishPr({manifest, request, expectedHead: HEAD, runner});
  assert.equal(pr.number, 77);
  assert.equal(pr.head, HEAD);
  assert.deepEqual(pr.changed, PATHS);
  assert.equal(calls.filter((call) => call.args.includes('POST')).length, 1);
});

test('exact durable evidence locator is fail-closed for missing or duplicate comments', () => {
  assert.equal(impl.exactComment([{id: 8, body: 'x'}], 'x', 'TEST'), 8);
  assert.throws(() => impl.exactComment([], 'x', 'TEST'), /TEST_COMMENT_MISSING/);
  assert.throws(() => impl.exactComment([
    {id: 8, body: 'x'}, {id: 9, body: 'x'},
  ], 'x', 'TEST'), /TEST_COMMENT_AMBIGUOUS/);
});

test('successful fixed transaction keeps publication before durable release and holder release', async () => {
  const files = makeFiles();
  const events = [];
  const stageRunnerCalls = [];
  let commentId = 600;
  const receiptPath = path.join(files.dir, 'receipt.json');
  try {
    const view = await impl.executePrepared(makeCtx(), {
      requestText: files.requestText,
      requestFile: files.requestFile,
      patchFile: files.patchFile,
      validationRequestText: files.validationText,
      validationRequestFile: files.validationFile,
      prRequestText: files.prText,
    }, {
      tempRoot: files.dir,
      runner(args) {
        stageRunnerCalls.push(args);
        return {code: 0, stdout: '{}', stderr: ''};
      },
      postComment(body) {
        events.push(body.includes('mcl-task-completion-receipt') ? 'completion-comment' : 'evidence-comment');
        return commentId++;
      },
      claimHolder() {
        events.push('holder-claim');
        return {result: {status: 'CLAIMED', reasonCodes: []}, secret: 'c'.repeat(64)};
      },
      checkHolder() {
        events.push('holder-check');
        return {status: 'CHECK_PASS', reasonCodes: []};
      },
      async invokePatchOwner({manifestText, runner}) {
        events.push('patch-owner');
        runner(['api', 'repos/hanmiyoo10-alt/-/issues/2577']);
        assert.deepEqual(stageRunnerCalls.at(-1).slice(0, 2), ['gh', 'api']);
        const parsed = handoff.parseManifest(manifestText);
        assert.equal(parsed.status, 'VALID');
        return ownerPass(parsed.value.manifestId);
      },
      async guardCurrent() { events.push('current-guard'); },
      currentGitHead() { events.push('head-read'); return HEAD; },
      publishPr() {
        events.push('pr-publish');
        return {number: 7001, head: HEAD, changed: PATHS};
      },
      releaseLease() {
        events.push('lease-release');
        return {ok: true, value: {runId: 7010}};
      },
      async readAfterRelease() {
        events.push('lease-readback');
        return {packetAfter: {body: 'packet-body'}, ledgerAfter: {body: 'released-ledger'}};
      },
      validateReleased() {
        events.push('released-validate');
        return {ok: true, reasonCodes: [], state: {generation: 88}};
      },
      releaseHolder() {
        events.push('holder-release');
        return {status: 'RELEASED', reasonCodes: []};
      },
      persistArtifacts() {
        events.push('persist-artifacts');
        fs.writeFileSync(receiptPath, '{}');
        return {
          reportLocator: 'artifact:test:report',
          receiptLocator: 'artifact:test:receipt',
          receiptPath,
        };
      },
    });
    assert.equal(view.validity, 'VALID');
    assert.equal(view.phase, 'IMPLEMENTATION_PR');
    assert.equal(view.result, 'PASS');
    assert.equal(view.nextLegalAction, 'VALIDATION_MERGE');
    assert.equal(view.output.stageOwner, patchOwner.STAGE_OWNER_ID);
    assert.equal(view.output.mutationPrimitive, patchOwner.MUTATION_PRIMITIVE_ID);
    assert.equal(view.output.validationProfile, patchOwner.D014_VALIDATION_PROFILE);
    const at = (name) => events.indexOf(name);
    assert.ok(at('patch-owner') < at('pr-publish'));
    assert.ok(at('pr-publish') < at('lease-release'));
    assert.ok(at('lease-release') < at('holder-release'));
    assert.ok(at('holder-release') < at('completion-comment'));
    assert.equal(events.filter((item) => item === 'pr-publish').length, 1);
    assert.equal(events.filter((item) => item === 'lease-release').length, 1);
    assert.equal(events.filter((item) => item === 'holder-release').length, 1);
    assert.ok(stageRunnerCalls.some((args) => args[0] === 'gh' && args[1] === 'api'));
  } finally {
    files.cleanup();
  }
});

test('publication failure preserves lease and holder instead of manufacturing cleanup', async () => {
  const files = makeFiles();
  const events = [];
  try {
    await assert.rejects(() => impl.executePrepared(makeCtx(), {
      requestText: files.requestText,
      requestFile: files.requestFile,
      patchFile: files.patchFile,
      validationRequestText: files.validationText,
      validationRequestFile: files.validationFile,
      prRequestText: files.prText,
    }, {
      tempRoot: files.dir,
      postComment() { return 800; },
      claimHolder() {
        events.push('holder-claim');
        return {result: {status: 'CLAIMED', reasonCodes: []}, secret: 'd'.repeat(64)};
      },
      checkHolder() { return {status: 'CHECK_PASS', reasonCodes: []}; },
      async invokePatchOwner({manifestText}) {
        const parsed = handoff.parseManifest(manifestText);
        return ownerPass(parsed.value.manifestId);
      },
      async guardCurrent() {},
      currentGitHead() { return HEAD; },
      publishPr() {
        events.push('pr-fail');
        throw new impl.ImplementationError('UNKNOWN', ['PR_CREATE_UNPROVEN']);
      },
      releaseLease() { events.push('lease-release'); return {ok: true, value: {runId: 1}}; },
      releaseHolder() { events.push('holder-release'); return {status: 'RELEASED'}; },
    }), /PR_CREATE_UNPROVEN/);
    assert.deepEqual(events, ['holder-claim', 'pr-fail']);
  } finally {
    files.cleanup();
  }
});

test('main drift helper reports exact changed paths and no implicit normalization', () => {
  const calls = [];
  const spawn = (_cmd, args) => {
    calls.push(args);
    return {status: 0, stdout: 'a.txt\nb.txt\n', stderr: ''};
  };
  assert.deepEqual(impl.changedBetween('/tmp/w', BASE, '3'.repeat(40), spawn), ['a.txt', 'b.txt']);
  assert.equal(calls.length, 1);
  assert.deepEqual(impl.changedBetween('/tmp/w', BASE, BASE, spawn), []);
  assert.equal(calls.length, 1);
});
