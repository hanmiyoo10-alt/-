'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../reviewed-external-finalizer.cjs');
const finalization = require('../validation-finalization-owner.cjs');
const stageReceipt = require('../../stage-receipt.cjs');
const validationStageSet = require('../validation-stage-receipt-set.cjs');
const taskLease = require(path.resolve(__dirname,
  '../../../../../../products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));

const CANDIDATE = '1'.repeat(40);
const MAIN = '2'.repeat(40);
const MERGE = '3'.repeat(40);
const REQUIRED_RUN = 'run:fixture-required';
const PLUGIN_RUN = 'run:fixture-plugin';

function digest(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
function packetBody() {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '# Fixture #3050',
    '',
    '## State',
    '`IN_PROGRESS`',
    '',
    '## Interaction stage',
    '- Current stage: `VALIDATION_MERGE`',
    '',
    '## Bounded write scope',
    ...owner.TARGET.paths.map((p) => '- `path:' + p + '`'),
    '- `surface:mcl:validation-finalization-effect`',
    '',
    '## Preservation boundary',
    'Do not modify other paths.',
  ].join('\n');
}
function implementationReceipt({omitGate = null} = {}) {
  const gates = [
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
    'holder-absent',
    'exact-head-required',
    'exact-head-verify',
    'exact-three-path-diff',
  ].filter((name) => name !== omitGate)
    .map((name) => ({name, result: 'PASS', evidenceLocator: 'fixture:' + name}));
  return stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: owner.TARGET.packet,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: CANDIDATE},
      {kind: 'GIT_REF', locator: 'refs/heads/main', identity: MAIN},
      {kind: 'PR', locator: 'pr:#' + owner.TARGET.pr, identity: CANDIDATE},
      {kind: 'WORKFLOW_RUN', locator: REQUIRED_RUN, identity: CANDIDATE},
      {kind: 'WORKFLOW_RUN', locator: PLUGIN_RUN, identity: CANDIDATE},
    ],
    requiredGates: gates,
    scope: {
      paths: [...owner.TARGET.paths],
      diffRequired: true,
      diffIdentity: owner.TARGET.diffIdentity,
      diffEvidenceLocator: 'pr:#' + owner.TARGET.pr,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + CANDIDATE},
      {term: 'CONTRACT_PROVEN', evidenceLocator: REQUIRED_RUN},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  });
}
function attentionResult() {
  return {
    receipt: {
      result: 'PASS',
      attentionDisposition: 'COMPLETE',
      receiptDigest: 'a'.repeat(64),
    },
    report: {
      output: {mergeAdmission: 'READY', required: 'PASS'},
    },
  };
}
function opsBody(main = MAIN) {
  return [
    '# Ops',
    '',
    '## Canonical Operator Capsule',
    '- STATE: `CLEAR`',
    '- MAIN: `' + main + '` / Required PASS — run fixture',
    '- CHANGE: NONE',
    '- WHY: `NONE`',
    '- NEXT: `NONE`',
    '- AUTHORITY: Production MATCH',
    '- UNKNOWN: NONE',
    '',
  ].join('\n');
}
function ledgerBody() {
  return taskLease.renderLedger({
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'ACTIVE',
    generation: 9,
    controllerPath: 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs',
    controllerCommit: '4'.repeat(40),
    packetRef: '#2350',
    activeLeases: [],
    lastRelease: null,
  });
}
function contentPath(endpoint) {
  const prefix = '/contents/';
  const query = endpoint.indexOf('?ref=');
  if (!endpoint.startsWith(prefix) || query < 0) return null;
  return endpoint.slice(prefix.length, query).split('/').map(decodeURIComponent).join('/');
}
function baseClient({comments, merged = false}) {
  const body = packetBody();
  return {
    api: async (endpoint) => {
      if (endpoint === '/branches/main') return {commit: {sha: MAIN}};
      if (endpoint === '/issues/485') return {state: 'open', body: opsBody(), pull_request: null};
      if (endpoint === '/issues/' + owner.TARGET.packet) {
        return {state: 'open', body, pull_request: null};
      }
      if (endpoint.startsWith('/issues/' + owner.TARGET.packet + '/comments?')) return comments;
      if (endpoint === '/issues/2352') return {state: 'open', body: ledgerBody()};
      if (endpoint === '/pulls/' + owner.TARGET.pr) {
        return {
          number: owner.TARGET.pr,
          state: merged ? 'closed' : 'open',
          draft: false,
          merged_at: merged ? 'fixture' : null,
          merge_commit_sha: merged ? MERGE : null,
          head: {sha: CANDIDATE},
          base: {sha: MAIN},
        };
      }
      const repoPath = contentPath(endpoint);
      if (repoPath) return {type: 'file', sha: owner.TARGET.blobs[repoPath]};
      throw new Error('unexpected endpoint ' + endpoint);
    },
  };
}
function admissionText(impl) {
  const payload = owner.buildAdmissionPayload({
    packetBodySha256: digest(packetBody()),
    currentMain: MAIN,
    candidateHead: CANDIDATE,
    implementationReceiptDigest: impl.receiptDigest,
    validationAttentionReceiptDigest: 'a'.repeat(64),
    semanticBlobs: owner.TARGET.blobs,
    requiredObservation: 'PASS',
  });
  return {payload, text: owner.renderAdmission(payload)};
}

test('reviewed target implementation receipt is exact and accepted', () => {
  const receipt = implementationReceipt();
  assert.equal(receipt.status, 'PASS');
  const result = owner.validateImplementationReceipt(receipt);
  assert.equal(result.expectedHead, CANDIDATE);
  assert.deepEqual(result.paths, [...owner.TARGET.paths].sort());
});

test('missing required currentization gate fails closed', () => {
  const receipt = implementationReceipt({omitGate: 'holder-absent'});
  assert.throws(
    () => owner.validateImplementationReceipt(receipt),
    owner.ReviewedExternalFinalizerError,
  );
});

test('admission marker round-trips and tamper is conflict', () => {
  const impl = implementationReceipt();
  const {text} = admissionText(impl);
  const parsed = owner.parseAdmission(text);
  assert.equal(parsed.conflict, false);
  assert.equal(parsed.value.candidateHead, CANDIDATE);
  const tampered = text.replace(CANDIDATE, '9'.repeat(40));
  assert.equal(owner.parseAdmission(tampered).conflict, true);
});

test('admit validates dynamic head and publishes exactly one admission marker', async () => {
  const impl = implementationReceipt();
  const comments = [];
  let published = null;
  const result = await owner.admit({
    client: baseClient({comments}),
    implementationReceipt: impl,
    deps: {
      attentionResult: attentionResult(),
      publishExact: async (text) => {
        published = text;
        comments.push({body: text});
        return {written: 1};
      },
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.effects.admissionComments, 1);
  assert.match(published, /reviewed-external-finalizer-admission:v1/);
  assert.equal(owner.parseAdmission(published).conflict, false);
});

test('absent validation receipt projects receipt-only finalization', () => {
  const impl = implementationReceipt();
  const {payload} = admissionText(impl);
  const evidence = owner.finalizationEvidence({
    admission: payload,
    mergeCommit: MERGE,
    stageState: {state: 'ABSENT'},
  });
  const result = finalization.projectValidationFinalization(evidence);
  assert.equal(result.finalizationDisposition, 'FINALIZATION_REQUIRED');
  assert.deepEqual(result.requiredEffectClasses, ['CANONICAL_VALIDATION_MERGE_RECEIPT']);
});

test('built validation stage receipt has exact reviewed core', () => {
  const impl = implementationReceipt();
  const {payload} = admissionText(impl);
  const receipt = owner.buildValidationStageReceipt({
    implementationReceipt: impl,
    admission: payload,
    mergeCommit: MERGE,
  });
  assert.equal(receipt.status, 'PASS');
  const text = stageReceipt.renderStageReceipt(receipt);
  const set = validationStageSet.classify([text]);
  assert.equal(set.status, 'SINGLE');
  assert.equal(set.validationCore.packetNumber, owner.TARGET.packet);
  assert.equal(set.validationCore.prNumber, owner.TARGET.pr);
  assert.equal(set.validationCore.candidateHead, CANDIDATE);
  assert.equal(set.validationCore.mergeCommit, MERGE);
  assert.equal(set.validationCore.diffIdentity, owner.TARGET.diffIdentity);
});

test('apply writes only missing stage receipt and second apply is effect-free', async () => {
  const impl = implementationReceipt();
  const admission = admissionText(impl);
  const comments = [
    {body: admission.text},
    {body: stageReceipt.renderStageReceipt(impl)},
  ];
  const client = baseClient({comments, merged: true});
  const publishExact = async (text) => {
    if (!comments.some((row) => row.body === text)) {
      comments.push({body: text});
      return {written: 1};
    }
    return {written: 0, reused: 1};
  };
  const first = await owner.apply({client, deps: {publishExact}});
  assert.equal(first.status, 'PASS');
  assert.equal(first.effects.stageReceiptComments, 1);
  assert.equal(first.nextLegalAction, 'POSTMERGE_CONVERGENCE');
  const second = await owner.apply({client, deps: {publishExact}});
  assert.equal(second.status, 'PASS');
  assert.equal(second.effects.stageReceiptComments, 0);
});

test('multiple admissions fail closed instead of latest-wins', () => {
  const impl = implementationReceipt();
  const first = admissionText(impl);
  const otherPayload = {...first.payload, currentMain: '8'.repeat(40)};
  const comments = [{body: first.text}, {body: owner.renderAdmission(otherPayload)}];
  assert.throws(
    () => owner.selectAdmission(comments),
    (error) => error.kind === 'CONFLICT',
  );
});

test('CLI exposes no packet or PR selector and apply requires literal flag', () => {
  assert.deepEqual(owner.parseArgs([
    'admit', '--implementation-receipt-file', '/tmp/receipt.json',
  ]), {
    command: 'admit',
    receiptFile: '/tmp/receipt.json',
  });
  assert.throws(() => owner.parseArgs(['admit', '--packet', '3050']));
  assert.throws(() => owner.parseArgs(['apply']));
  assert.deepEqual(owner.parseArgs(['apply', '--apply']), {
    command: 'apply',
    receiptFile: null,
  });
});

test('no-token client reads only fixed reviewed blobs through exact gh GET', async () => {
  const calls = [];
  const ref = '7'.repeat(40);
  const repoPath = owner.TARGET.paths[0];
  const endpoint = owner.fixedContentsEndpoint(repoPath, ref);
  const client = owner.createReviewedLiveClient({
    env: {},
    runner: (args) => {
      calls.push(args);
      return {
        code: 0,
        stdout: JSON.stringify({type: 'file', sha: owner.TARGET.blobs[repoPath]}),
        stderr: '',
      };
    },
  });
  const value = await client.api(endpoint);
  assert.equal(value.type, 'file');
  assert.equal(value.sha, owner.TARGET.blobs[repoPath]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    'api', 'repos/hanmiyoo10-alt/-' + endpoint, '--method', 'GET',
    '--header', 'Accept: application/vnd.github+json',
  ]);
  assert.equal(owner.reviewedContentEndpointAllowed(endpoint), true);
  await assert.rejects(() => client.api('/contents/README.md?ref=' + ref));
  await assert.rejects(() => client.api(owner.fixedContentsEndpoint(repoPath, 'not-a-sha')));
  assert.equal(calls.length, 1);
});

test('token-backed client selection remains the existing validation-merge path', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../reviewed-external-finalizer.cjs'), 'utf8');
  assert.match(source, /const base = validationMerge\.createLiveClient\(options\)/);
  assert.match(source, /if \(env\.GH_TOKEN \|\| env\.GITHUB_TOKEN\) return base/);
});

test('source preserves pure/product owners and has no direct merge/git effect primitive', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../reviewed-external-finalizer.cjs'), 'utf8');
  for (const forbidden of [
    'child_process',
    'spawnSync',
    'execFile',
    'execSync',
    "'merge',",
    'git -C',
    'update-ref',
    'force-with-lease',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.match(source, /validation-finalization-owner\.cjs/);
  assert.match(source, /validation-attention-owner\.cjs/);
  assert.match(source, /stage-receipt\.cjs/);
});
