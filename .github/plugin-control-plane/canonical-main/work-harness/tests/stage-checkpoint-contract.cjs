'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  FIXED_REPO,
  AUDIT_ISSUE,
  MAX_BODY_BYTES,
  MAX_COMMENT_BODY_BYTES,
  STAGES,
  NOT_APPLICABLE_STAGES,
  checkpointDigest,
  checkpointMarker,
  createGhCheckpointClient,
  createStageCheckpointClient,
  exitCodeFor,
  inspectCheckpoint,
  inspectNotApplicablePacket,
  parseArgs,
  parseInspectArgs,
  parseNotApplicableArgs,
  recordCheckpoint,
  recordNotApplicableCheckpoint,
  renderComment,
  renderNotApplicableBody,
  run,
  validateInput,
} = require('../stage-checkpoint.cjs');

const PACKET = 1847;
const STAGE = 'IMPLEMENTATION_PR';
const BODY = 'checkpoint evidence\n- exact scope: four files';
const PACKET_BODY = '<!-- canonical-main-work-packet:v1 -->\n# packet';

function inspectPacketBody(lifecycle, currentStage) {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '# packet',
    '',
    '## State',
    `\`${lifecycle}\``,
    '',
    '## Interaction stage',
    '- Completed stage(s): `NONE`',
    `- Current stage: \`${currentStage}\``,
    '- Next stage: `NONE`',
  ].join('\n');
}

function runtimeOnlyPacketBody(lifecycle, currentStage, {includePath = false} = {}) {
  const scopes = ['- `surface:runtime:fixture`'];
  if (includePath) scopes.unshift('- `path:src/runtime-fixture.js`');
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '# packet',
    '',
    '## State',
    `\`${lifecycle}\``,
    '',
    '## Interaction stage',
    '- Completed stage(s): `NONE`',
    `- Current stage: \`${currentStage}\``,
    '- Next stage: `NONE`',
    '',
    '## Bounded write scope',
    ...scopes,
  ].join('\n');
}

function checkpointComment(stage, digest, surface, id) {
  return {id, body: checkpointMarker(PACKET, stage, digest, surface)};
}

function fakeClient({ packetComments = [], auditComments = [], failWrites = [], packetIssue = null } = {}) {
  const comments = new Map([
    [PACKET, structuredClone(packetComments)],
    [AUDIT_ISSUE, structuredClone(auditComments)],
  ]);
  const writes = [];
  const calls = [];
  let nextId = 9000;
  return {
    writes,
    calls,
    comments,
    async api(endpoint, options = {}) {
      calls.push({endpoint, method: options.method || 'GET'});
      if (endpoint === `/issues/${PACKET}` && (!options.method || options.method === 'GET')) {
        return packetIssue || { number: PACKET, state: 'open', body: PACKET_BODY };
      }
      const list = endpoint.match(/^\/issues\/(\d+)\/comments\?per_page=100&page=(\d+)$/);
      if (list && (!options.method || options.method === 'GET')) {
        const issue = Number(list[1]);
        const page = Number(list[2]);
        const all = comments.get(issue) || [];
        return all.slice((page - 1) * 100, page * 100);
      }
      const post = endpoint.match(/^\/issues\/(\d+)\/comments$/);
      if (post && options.method === 'POST') {
        const issue = Number(post[1]);
        if (failWrites.includes(issue)) throw new Error(`write failed ${issue}`);
        const row = { id: nextId++, body: options.body.body };
        if (!comments.has(issue)) comments.set(issue, []);
        comments.get(issue).push(row);
        writes.push({ issue, body: row.body, id: row.id });
        return row;
      }
      throw new Error(`unexpected api call ${options.method || 'GET'} ${endpoint}`);
    },
  };
}

assert.deepEqual(STAGES, [
  'AUTHORITY_SCOPE',
  'IMPLEMENTATION_PR',
  'VALIDATION_MERGE',
  'POSTMERGE_CONVERGENCE',
  'EXPERIMENT_CLOSE',
]);
assert.deepEqual(NOT_APPLICABLE_STAGES, [
  'IMPLEMENTATION_PR',
  'VALIDATION_MERGE',
  'POSTMERGE_CONVERGENCE',
]);
assert.deepEqual(validateInput({ packetNumber: PACKET, stage: STAGE, body: BODY }), []);
assert.ok(validateInput({ packetNumber: AUDIT_ISSUE, stage: STAGE, body: BODY }).includes('AUDIT_ISSUE_CANNOT_BE_PACKET'));
assert.ok(validateInput({ packetNumber: PACKET, stage: 'NOPE', body: BODY }).includes('STAGE_INVALID'));
assert.ok(validateInput({ packetNumber: PACKET, stage: STAGE, body: '' }).includes('BODY_MISSING'));
assert.ok(validateInput({ packetNumber: PACKET, stage: STAGE, body: 'x'.repeat(MAX_BODY_BYTES + 1) }).includes('BODY_TOO_LARGE'));

const digest = checkpointDigest(PACKET, STAGE, BODY);
assert.equal(digest.length, 64);
assert.equal(checkpointDigest(PACKET, STAGE, BODY), digest);
assert.match(checkpointMarker(PACKET, STAGE, digest, 'packet'), /surface=packet/);
assert.match(
  renderComment({ packetNumber: PACKET, stage: STAGE, body: BODY, digest, surface: 'audit' }),
  new RegExp(`packet=${PACKET} stage=${STAGE} digest=${digest} surface=audit`),
);

assert.deepEqual(
  parseArgs(['--packet', String(PACKET), '--stage', STAGE, '--body-file', 'x.md']),
  { packetNumber: PACKET, stage: STAGE, bodyFile: 'x.md' },
);
assert.throws(() => parseArgs(['--packet', String(PACKET), '--stage', STAGE]), /required/);
assert.throws(() => parseArgs(['--packet', '0', '--stage', STAGE, '--body-file', 'x']), /positive integer/);
assert.deepEqual(parseInspectArgs(['inspect', '--packet', String(PACKET)]), {packetNumber: PACKET});
assert.throws(() => parseInspectArgs(['inspect', '--packet', '0']), /usage/);
assert.throws(() => parseInspectArgs(['inspect', '--packet', String(PACKET), '--stage', STAGE]), /usage/);
assert.deepEqual(
  parseNotApplicableArgs(['not-applicable', '--packet', String(PACKET), '--stage', STAGE]),
  {packetNumber: PACKET, stage: STAGE},
);
assert.throws(
  () => parseNotApplicableArgs(['not-applicable', '--packet', '0', '--stage', STAGE]),
  /usage/,
);
assert.throws(
  () => parseNotApplicableArgs(['not-applicable', '--packet', String(PACKET)]),
  /usage/,
);
const renderScopeFingerprint = 'f'.repeat(64);
const renderedImplementationNa = renderNotApplicableBody('IMPLEMENTATION_PR', renderScopeFingerprint);
assert.match(renderedImplementationNa, /NOT_APPLICABLE \/ PASS/);
assert.ok(renderedImplementationNa.includes(
  `canonical-main-stage-not-applicable:v1 scope=${renderScopeFingerprint}`,
));
assert.match(renderNotApplicableBody('VALIDATION_MERGE', renderScopeFingerprint), /candidate PR validation/);
assert.match(
  renderNotApplicableBody('POSTMERGE_CONVERGENCE', renderScopeFingerprint),
  /merged-main source convergence/,
);
assert.throws(
  () => renderNotApplicableBody('AUTHORITY_SCOPE', renderScopeFingerprint),
  /NOT_APPLICABLE_STAGE_INVALID/,
);
assert.throws(
  () => renderNotApplicableBody('EXPERIMENT_CLOSE', renderScopeFingerprint),
  /NOT_APPLICABLE_STAGE_INVALID/,
);
assert.throws(
  () => renderNotApplicableBody('IMPLEMENTATION_PR'),
  /NOT_APPLICABLE_SCOPE_FINGERPRINT_INVALID/,
);

(async () => {
  const inspectNone = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE'),
    },
  });
  const noDurable = await inspectCheckpoint({client: inspectNone, packetNumber: PACKET});
  assert.equal(noDurable.disposition, 'PASS');
  assert.equal(noDurable.rebindDisposition, 'CONTINUE_CURRENT_STAGE');
  assert.equal(noDurable.nextStage, 'AUTHORITY_SCOPE');
  assert.deepEqual(noDurable.completedStages, []);
  assert.equal(noDurable.mutationAuthorized, false);
  assert.equal(noDurable.executionAuthorized, false);
  assert.equal(inspectNone.writes.length, 0);
  assert.deepEqual(
    inspectNone.calls.map((call) => call.method),
    ['GET', 'GET', 'GET'],
    'inspect must use reads only',
  );

  const authDigest = 'a'.repeat(64);
  const authPair = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'IMPLEMENTATION_PR'),
    },
    packetComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 1)],
    auditComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 2)],
  });
  const continueImplementation = await inspectCheckpoint({client: authPair, packetNumber: PACKET});
  assert.equal(continueImplementation.disposition, 'PASS');
  assert.equal(continueImplementation.rebindDisposition, 'CONTINUE_CURRENT_STAGE');
  assert.equal(continueImplementation.nextStage, 'IMPLEMENTATION_PR');
  assert.deepEqual(continueImplementation.completedStages, ['AUTHORITY_SCOPE']);

  const staleAuthority = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE'),
    },
    packetComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 3)],
    auditComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 4)],
  });
  const reuseAuthority = await inspectCheckpoint({client: staleAuthority, packetNumber: PACKET});
  assert.equal(reuseAuthority.disposition, 'PASS');
  assert.equal(reuseAuthority.rebindDisposition, 'REUSE_COMPLETED_STAGE');
  assert.equal(reuseAuthority.nextStage, 'IMPLEMENTATION_PR');
  assert.equal(reuseAuthority.nextLegalAction, 'ADVANCE_TO_IMPLEMENTATION_PR');

  const implDigestA = 'b'.repeat(64);
  const implDigestB = 'c'.repeat(64);
  const variants = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'VALIDATION_MERGE'),
    },
    packetComments: [
      checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 5),
      checkpointComment('IMPLEMENTATION_PR', implDigestA, 'packet', 6),
      checkpointComment('IMPLEMENTATION_PR', implDigestB, 'packet', 7),
    ],
    auditComments: [
      checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 8),
      checkpointComment('IMPLEMENTATION_PR', implDigestA, 'audit', 9),
      checkpointComment('IMPLEMENTATION_PR', implDigestB, 'audit', 10),
    ],
  });
  const variantResult = await inspectCheckpoint({client: variants, packetNumber: PACKET});
  assert.equal(variantResult.disposition, 'PASS');
  assert.equal(variantResult.rebindDisposition, 'CONTINUE_CURRENT_STAGE');
  assert.equal(variantResult.nextStage, 'VALIDATION_MERGE');
  const implStage = variantResult.stages.find((row) => row.stage === 'IMPLEMENTATION_PR');
  assert.equal(implStage.variantCount, 2);
  assert.deepEqual(implStage.pairedDigests, [implDigestA, implDigestB]);
  assert.equal(variants.writes.length, 0);

  const incompletePair = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'IMPLEMENTATION_PR'),
    },
    packetComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 11)],
  });
  const incomplete = await inspectCheckpoint({client: incompletePair, packetNumber: PACKET});
  assert.equal(incomplete.disposition, 'UNKNOWN');
  assert.ok(incomplete.reasonCodes.includes('CHECKPOINT_PAIR_INCOMPLETE'));
  assert.equal(incomplete.rebindDisposition, null);

  const duplicateMarker = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'IMPLEMENTATION_PR'),
    },
    packetComments: [
      checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 12),
      checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 13),
    ],
    auditComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 14)],
  });
  const duplicateInspect = await inspectCheckpoint({client: duplicateMarker, packetNumber: PACKET});
  assert.equal(duplicateInspect.disposition, 'CONFLICT');
  assert.ok(duplicateInspect.reasonCodes.includes('CHECKPOINT_MARKER_DUPLICATE'));

  const malformedMarker = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'IMPLEMENTATION_PR'),
    },
    packetComments: [{
      id: 140,
      body: `${checkpointMarker(PACKET, 'AUTHORITY_SCOPE', authDigest, 'packet')} trailing`,
    }],
    auditComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 141)],
  });
  const malformedResult = await inspectCheckpoint({client: malformedMarker, packetNumber: PACKET});
  assert.equal(malformedResult.disposition, 'CONFLICT');
  assert.ok(malformedResult.reasonCodes.includes('CHECKPOINT_MARKER_MALFORMED'));

  const wrongSurface = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'IMPLEMENTATION_PR'),
    },
    packetComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 142)],
    auditComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 143)],
  });
  const wrongSurfaceResult = await inspectCheckpoint({client: wrongSurface, packetNumber: PACKET});
  assert.equal(wrongSurfaceResult.disposition, 'CONFLICT');
  assert.ok(wrongSurfaceResult.reasonCodes.includes('CHECKPOINT_SURFACE_MISMATCH'));

  const validationDigest = 'd'.repeat(64);
  const prefixGap = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'VALIDATION_MERGE'),
    },
    packetComments: [
      checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 15),
      checkpointComment('VALIDATION_MERGE', validationDigest, 'packet', 16),
    ],
    auditComments: [
      checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 17),
      checkpointComment('VALIDATION_MERGE', validationDigest, 'audit', 18),
    ],
  });
  const gapResult = await inspectCheckpoint({client: prefixGap, packetNumber: PACKET});
  assert.equal(gapResult.disposition, 'CONFLICT');
  assert.ok(gapResult.reasonCodes.includes('CHECKPOINT_STAGE_PREFIX_CONFLICT'));

  const stageAhead = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'IMPLEMENTATION_PR'),
    },
  });
  const aheadResult = await inspectCheckpoint({client: stageAhead, packetNumber: PACKET});
  assert.equal(aheadResult.disposition, 'CONFLICT');
  assert.ok(aheadResult.reasonCodes.includes('PACKET_STAGE_AHEAD_OF_DURABLE_PREFIX'));

  const runtimeOnly = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: runtimeOnlyPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE'),
    },
  });
  const runtimeEvidence = await inspectNotApplicablePacket(runtimeOnly, PACKET, 'IMPLEMENTATION_PR');
  assert.equal(runtimeEvidence.ok, true);
  assert.match(runtimeEvidence.packetBodySha256, /^[0-9a-f]{64}$/);

  const runtimeNa = await recordNotApplicableCheckpoint({
    client: runtimeOnly,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
  });
  assert.equal(runtimeNa.status, 'COMPLETE');
  assert.deepEqual(runtimeOnly.writes.map((row) => row.issue), [PACKET, AUDIT_ISSUE]);
  assert.match(runtimeOnly.writes[0].body, /NOT_APPLICABLE \/ PASS/);
  assert.match(runtimeOnly.writes[0].body, /surface-only write scope/);

  const runtimeNaRetry = await recordNotApplicableCheckpoint({
    client: runtimeOnly,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
  });
  assert.equal(runtimeNaRetry.status, 'COMPLETE');
  assert.equal(runtimeOnly.writes.length, 2, 'N/A replay must reuse the paired checkpoint');

  const pathScoped = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: runtimeOnlyPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE', {includePath: true}),
    },
  });
  const pathRejected = await recordNotApplicableCheckpoint({
    client: pathScoped,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
  });
  assert.equal(pathRejected.status, 'FAILED');
  assert.ok(pathRejected.reasonCodes.includes('NOT_APPLICABLE_PATH_SCOPE_PRESENT'));
  assert.equal(pathScoped.writes.length, 0);

  const noScope = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE'),
    },
  });
  const noScopeRejected = await recordNotApplicableCheckpoint({
    client: noScope,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
  });
  assert.equal(noScopeRejected.status, 'FAILED');
  assert.ok(noScopeRejected.reasonCodes.includes('PACKET_SCOPE_UNRESOLVED'));

  const donePacket = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: runtimeOnlyPacketBody('DONE', 'EXPERIMENT_CLOSE'),
    },
  });
  const doneRejected = await recordNotApplicableCheckpoint({
    client: donePacket,
    packetNumber: PACKET,
    stage: 'VALIDATION_MERGE',
  });
  assert.equal(doneRejected.status, 'FAILED');
  assert.ok(doneRejected.reasonCodes.includes('PACKET_LIFECYCLE_NOT_IN_PROGRESS'));

  for (const forbiddenStage of ['AUTHORITY_SCOPE', 'EXPERIMENT_CLOSE']) {
    const forbidden = await recordNotApplicableCheckpoint({
      client: runtimeOnly,
      packetNumber: PACKET,
      stage: forbiddenStage,
    });
    assert.equal(forbidden.status, 'FAILED');
    assert.ok(forbidden.reasonCodes.includes('NOT_APPLICABLE_STAGE_FORBIDDEN'));
  }

  let issueReads = 0;
  const driftingClient = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: runtimeOnlyPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE'),
    },
  });
  const originalDriftApi = driftingClient.api.bind(driftingClient);
  driftingClient.api = async (endpoint, options = {}) => {
    if (endpoint === `/issues/${PACKET}` && (!options.method || options.method === 'GET')) {
      issueReads += 1;
      if (issueReads > 1) {
        return {
          number: PACKET,
          state: 'open',
          body: runtimeOnlyPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE', {includePath: true}),
        };
      }
    }
    return originalDriftApi(endpoint, options);
  };
  const driftRejected = await recordNotApplicableCheckpoint({
    client: driftingClient,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
  });
  assert.equal(driftRejected.status, 'FAILED');
  assert.ok(driftRejected.reasonCodes.includes('PACKET_BODY_DRIFT'));
  assert.equal(driftingClient.writes.length, 0);

  const runtimeSequence = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: runtimeOnlyPacketBody('IN_PROGRESS', 'AUTHORITY_SCOPE'),
    },
    packetComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'packet', 150)],
    auditComments: [checkpointComment('AUTHORITY_SCOPE', authDigest, 'audit', 151)],
  });
  for (const stage of NOT_APPLICABLE_STAGES) {
    const recorded = await recordNotApplicableCheckpoint({
      client: runtimeSequence,
      packetNumber: PACKET,
      stage,
    });
    assert.equal(recorded.status, 'COMPLETE');
  }

  const runtimeScopeDrift = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: runtimeOnlyPacketBody('IN_PROGRESS', 'EXPERIMENT_CLOSE', {includePath: true}),
    },
    packetComments: runtimeSequence.comments.get(PACKET),
    auditComments: runtimeSequence.comments.get(AUDIT_ISSUE),
  });
  const runtimeScopeDriftResult = await inspectCheckpoint({
    client: runtimeScopeDrift,
    packetNumber: PACKET,
  });
  assert.equal(runtimeScopeDriftResult.disposition, 'CONFLICT');
  assert.ok(runtimeScopeDriftResult.reasonCodes.includes('CHECKPOINT_NOT_APPLICABLE_SCOPE_STALE'));

  const runtimeExperiment = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: runtimeOnlyPacketBody('IN_PROGRESS', 'EXPERIMENT_CLOSE'),
    },
    packetComments: runtimeSequence.comments.get(PACKET),
    auditComments: runtimeSequence.comments.get(AUDIT_ISSUE),
  });
  const runtimeExperimentReady = await inspectCheckpoint({client: runtimeExperiment, packetNumber: PACKET});
  assert.equal(runtimeExperimentReady.disposition, 'PASS');
  assert.equal(runtimeExperimentReady.rebindDisposition, 'CONTINUE_CURRENT_STAGE');
  assert.equal(runtimeExperimentReady.nextStage, 'EXPERIMENT_CLOSE');

  const runtimeExpCheckpoint = await recordCheckpoint({
    client: runtimeExperiment,
    packetNumber: PACKET,
    stage: 'EXPERIMENT_CLOSE',
    body: 'runtime experiment terminal evidence',
  });
  assert.equal(runtimeExpCheckpoint.status, 'COMPLETE');
  const runtimeCloseReady = await inspectCheckpoint({client: runtimeExperiment, packetNumber: PACKET});
  assert.equal(runtimeCloseReady.disposition, 'PASS');
  assert.equal(runtimeCloseReady.rebindDisposition, 'CONTINUE_TRANSACTION_CLOSURE');

  const runtimeTerminal = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'closed',
      body: runtimeOnlyPacketBody('DONE', 'EXPERIMENT_CLOSE'),
    },
    packetComments: runtimeExperiment.comments.get(PACKET),
    auditComments: runtimeExperiment.comments.get(AUDIT_ISSUE),
  });
  const runtimeTerminalResult = await inspectCheckpoint({client: runtimeTerminal, packetNumber: PACKET});
  assert.equal(runtimeTerminalResult.disposition, 'PASS');
  assert.equal(runtimeTerminalResult.rebindDisposition, 'STOP_TERMINAL');

  const allDigests = ['1', '2', '3', '4', '5'].map((digit) => digit.repeat(64));
  const packetAll = STAGES.map((stage, index) => checkpointComment(stage, allDigests[index], 'packet', 20 + index));
  const auditAll = STAGES.map((stage, index) => checkpointComment(stage, allDigests[index], 'audit', 30 + index));
  const experimentDurable = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('IN_PROGRESS', 'EXPERIMENT_CLOSE'),
    },
    packetComments: packetAll,
    auditComments: auditAll,
  });
  const transactionClose = await inspectCheckpoint({client: experimentDurable, packetNumber: PACKET});
  assert.equal(transactionClose.disposition, 'PASS');
  assert.equal(transactionClose.rebindDisposition, 'CONTINUE_TRANSACTION_CLOSURE');
  assert.equal(transactionClose.nextLegalAction, 'SELF_CLOSE_SYNC_CURRENT_PACKET');

  const openDone = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'open',
      body: inspectPacketBody('DONE', 'EXPERIMENT_CLOSE'),
    },
    packetComments: packetAll,
    auditComments: auditAll,
  });
  const openDoneResult = await inspectCheckpoint({client: openDone, packetNumber: PACKET});
  assert.equal(openDoneResult.disposition, 'PASS');
  assert.equal(openDoneResult.rebindDisposition, 'CONTINUE_TRANSACTION_CLOSURE');

  const closedDone = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'closed',
      body: inspectPacketBody('DONE', 'EXPERIMENT_CLOSE'),
    },
    packetComments: packetAll,
    auditComments: auditAll,
  });
  const closedDoneResult = await inspectCheckpoint({client: closedDone, packetNumber: PACKET});
  assert.equal(closedDoneResult.disposition, 'PASS');
  assert.equal(closedDoneResult.rebindDisposition, 'STOP_TERMINAL');

  const closedActive = fakeClient({
    packetIssue: {
      number: PACKET,
      state: 'closed',
      body: inspectPacketBody('IN_PROGRESS', 'EXPERIMENT_CLOSE'),
    },
    packetComments: packetAll,
    auditComments: auditAll,
  });
  const closedActiveResult = await inspectCheckpoint({client: closedActive, packetNumber: PACKET});
  assert.equal(closedActiveResult.disposition, 'CONFLICT');
  assert.ok(closedActiveResult.reasonCodes.includes('PACKET_LIFECYCLE_NATIVE_CONFLICT'));

  const first = fakeClient();
  const complete = await recordCheckpoint({ client: first, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(complete.status, 'COMPLETE');
  assert.equal(exitCodeFor(complete), 0);
  assert.deepEqual(first.writes.map((row) => row.issue), [PACKET, AUDIT_ISSUE]);
  assert.equal(complete.packet.state, 'WRITTEN');
  assert.equal(complete.audit.state, 'WRITTEN');
  assert.ok(Number.isInteger(complete.packet.commentId));
  assert.ok(Number.isInteger(complete.audit.commentId));

  const retry = await recordCheckpoint({ client: first, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(retry.status, 'COMPLETE');
  assert.equal(first.writes.length, 2, 'idempotent retry must not add comments');
  assert.equal(retry.packet.state, 'EXISTING');
  assert.equal(retry.audit.state, 'EXISTING');

  const packetOnly = fakeClient({ failWrites: [AUDIT_ISSUE] });
  const partialAudit = await recordCheckpoint({ client: packetOnly, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(partialAudit.status, 'PARTIAL');
  assert.equal(exitCodeFor(partialAudit), 3);
  assert.equal(partialAudit.packet.state, 'WRITTEN');
  assert.equal(partialAudit.audit.state, 'FAILED');
  assert.ok(partialAudit.reasonCodes.includes('AUDIT_WRITE_FAILED'));

  const recoveredAuditClient = fakeClient({ packetComments: packetOnly.comments.get(PACKET) });
  const recoveredAudit = await recordCheckpoint({ client: recoveredAuditClient, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(recoveredAudit.status, 'COMPLETE');
  assert.deepEqual(recoveredAuditClient.writes.map((row) => row.issue), [AUDIT_ISSUE]);

  const auditOnly = fakeClient({ failWrites: [PACKET] });
  const partialPacket = await recordCheckpoint({ client: auditOnly, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(partialPacket.status, 'PARTIAL');
  assert.equal(partialPacket.packet.state, 'FAILED');
  assert.equal(partialPacket.audit.state, 'WRITTEN');
  assert.ok(partialPacket.reasonCodes.includes('PACKET_WRITE_FAILED'));

  const recoveredPacketClient = fakeClient({ auditComments: auditOnly.comments.get(AUDIT_ISSUE) });
  const recoveredPacket = await recordCheckpoint({ client: recoveredPacketClient, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(recoveredPacket.status, 'COMPLETE');
  assert.deepEqual(recoveredPacketClient.writes.map((row) => row.issue), [PACKET]);

  const existingPacket = first.comments.get(PACKET)[0];
  const duplicateClient = fakeClient({
    packetComments: [existingPacket, { ...existingPacket, id: 99999 }],
    auditComments: first.comments.get(AUDIT_ISSUE),
  });
  const duplicate = await recordCheckpoint({ client: duplicateClient, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(duplicate.status, 'FAILED');
  assert.ok(duplicate.reasonCodes.includes('CHECKPOINT_MARKER_DUPLICATE'));
  assert.equal(duplicateClient.writes.length, 0);

  const badPacketClient = fakeClient();
  badPacketClient.api = async (endpoint) => {
    if (endpoint === `/issues/${PACKET}`) return { number: PACKET, state: 'open', body: '# not a packet' };
    throw new Error('must not reach comment IO');
  };
  const invalidPacket = await recordCheckpoint({ client: badPacketClient, packetNumber: PACKET, stage: STAGE, body: BODY });
  assert.equal(invalidPacket.status, 'FAILED');
  assert.ok(invalidPacket.reasonCodes.includes('PACKET_MARKER_MISSING'));

  const invalidInputClient = { api: async () => { throw new Error('must not call API'); } };
  const invalidInput = await recordCheckpoint({
    client: invalidInputClient,
    packetNumber: AUDIT_ISSUE,
    stage: STAGE,
    body: BODY,
  });
  assert.equal(invalidInput.status, 'FAILED');
  assert.ok(invalidInput.reasonCodes.includes('AUDIT_ISSUE_CANNOT_BE_PACKET'));

  const ghCalls = [];
  const ghComments = new Map([[PACKET, []], [AUDIT_ISSUE, []]]);
  let ghNextId = 12000;
  const ghRunner = (args, options = {}) => {
    ghCalls.push({args: [...args], input: options.input || null});
    assert.equal(args[0], 'api');
    assert.equal(args[2], '--method');
    assert.equal(args[4], '--header');
    const target = args[1];
    const issue = target.match(new RegExp(`^repos/${FIXED_REPO}/issues/([1-9][0-9]*)$`));
    if (issue && args[3] === 'GET') {
      return {code: 0, stdout: JSON.stringify({
        number: Number(issue[1]), state: 'open', body: PACKET_BODY,
      }), stderr: ''};
    }
    const list = target.match(new RegExp(
      `^repos/${FIXED_REPO}/issues/([1-9][0-9]*)/comments\\?per_page=100&page=([1-9][0-9]*)$`,
    ));
    if (list && args[3] === 'GET') {
      const rows = ghComments.get(Number(list[1])) || [];
      const page = Number(list[2]);
      return {code: 0, stdout: JSON.stringify(rows.slice((page - 1) * 100, page * 100)), stderr: ''};
    }
    const post = target.match(new RegExp(`^repos/${FIXED_REPO}/issues/([1-9][0-9]*)/comments$`));
    if (post && args[3] === 'POST' && args.at(-2) === '--input' && args.at(-1) === '-') {
      const issueNumber = Number(post[1]);
      const payload = JSON.parse(options.input);
      const row = {id: ghNextId++, body: payload.body};
      if (!ghComments.has(issueNumber)) ghComments.set(issueNumber, []);
      ghComments.get(issueNumber).push(row);
      return {code: 0, stdout: JSON.stringify(row), stderr: ''};
    }
    return {code: 1, stdout: '', stderr: 'unexpected fake gh request'};
  };

  const ghClient = createGhCheckpointClient({packetNumber: PACKET, runner: ghRunner});
  assert.throws(
    () => createGhCheckpointClient({repo: 'other/repo', packetNumber: PACKET, runner: ghRunner}),
    /GH_API_REPOSITORY_INVALID/,
  );
  await assert.rejects(ghClient.api('/pulls/1'), /GH_API_ENDPOINT_INVALID/);
  await assert.rejects(ghClient.api('/issues/1'), /GH_API_ENDPOINT_INVALID/);
  await assert.rejects(
    ghClient.api(`/issues/${PACKET}`, {method: 'POST', body: {body: 'x'}}),
    /GH_API_OPTIONS_INVALID/,
  );
  await assert.rejects(
    ghClient.api(`/issues/${PACKET}/comments?per_page=100&page=21`),
    /GH_API_COMMENT_PAGE_INVALID/,
  );
  await assert.rejects(
    ghClient.api(`/issues/${PACKET}/comments`, {
      method: 'POST', body: {body: 'x', extra: true},
    }),
    /GH_API_COMMENT_BODY_INVALID/,
  );
  await assert.rejects(
    ghClient.api(`/issues/${PACKET}/comments`, {
      method: 'POST', body: {body: 'x'.repeat(MAX_COMMENT_BODY_BYTES + 1)},
    }),
    /GH_API_COMMENT_BODY_INVALID/,
  );

  const privateMarker = 'private-stderr-marker';
  const failedGh = createGhCheckpointClient({
    packetNumber: PACKET,
    runner: () => ({code: 1, stdout: '', stderr: privateMarker}),
  });
  await assert.rejects(
    failedGh.api(`/issues/${PACKET}`),
    (error) => error.message === 'GH_API_REQUEST_FAILED' && !String(error).includes(privateMarker),
  );
  const malformedGh = createGhCheckpointClient({
    packetNumber: PACKET,
    runner: () => ({code: 0, stdout: '{bad-json', stderr: privateMarker}),
  });
  await assert.rejects(
    malformedGh.api(`/issues/${PACKET}`),
    (error) => error.message === 'GH_API_RESPONSE_INVALID' && !String(error).includes(privateMarker),
  );

  let fallbackCalls = 0;
  const fetchImpl = async (_url, options) => ({
    ok: true,
    status: 200,
    async json() {
      assert.match(options.headers.Authorization, /^Bearer /);
      return {number: PACKET, state: 'open', body: PACKET_BODY};
    },
  });
  const envClient = createStageCheckpointClient({
    repo: FIXED_REPO,
    token: 'fixture-auth-value',
    fetchImpl,
    runner: () => {
      fallbackCalls += 1;
      throw new Error('fallback must not run');
    },
  });
  const envIssue = await envClient.api(`/issues/${PACKET}`);
  assert.equal(envIssue.number, PACKET);
  assert.equal(fallbackCalls, 0);

  const tempDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'stage-checkpoint-'));
  const bodyFile = path.join(tempDir, 'checkpoint.md');
  fs.writeFileSync(bodyFile, BODY);
  try {
    const firstGhRun = await run({
      argv: ['--packet', String(PACKET), '--stage', STAGE, '--body-file', bodyFile],
      env: {},
      runner: ghRunner,
    });
    assert.equal(firstGhRun.status, 'COMPLETE');
    assert.equal(firstGhRun.packet.state, 'WRITTEN');
    assert.equal(firstGhRun.audit.state, 'WRITTEN');
    const writesAfterFirst = ghCalls.filter((call) => call.args[3] === 'POST').length;
    assert.equal(writesAfterFirst, 2);

    const retryGhRun = await run({
      argv: ['--packet', String(PACKET), '--stage', STAGE, '--body-file', bodyFile],
      env: {},
      runner: ghRunner,
    });
    assert.equal(retryGhRun.status, 'COMPLETE');
    assert.equal(retryGhRun.packet.state, 'EXISTING');
    assert.equal(retryGhRun.audit.state, 'EXISTING');
    assert.equal(ghCalls.filter((call) => call.args[3] === 'POST').length, writesAfterFirst);
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }

  const root = path.resolve(__dirname, '../../../../..');
  const source = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/stage-checkpoint.cjs'), 'utf8');
  assert.match(source, /REPOSITORY_IDENTITY_INVALID/);
  assert.match(source, /MAX_COMMENT_PAGES = 20/);
  assert.match(source, /shell: false/);
  assert.match(source, /require\('\.\.\/work-system\/scope-overlap\.cjs'\)/);
  assert.doesNotMatch(source, /function extractPacketScopes\(/);
  assert.doesNotMatch(source, /--repo/);
  assert.doesNotMatch(source, /issue_comment:/);
  assert.doesNotMatch(source, /tools\/repo-ci-mcp/);
  for (const forbidden of [
    "'auth', 'token'",
    "'auth', 'login'",
    "'auth', 'refresh'",
    "'auth', 'logout'",
  ]) assert(!source.includes(forbidden), forbidden);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8'));
  const commands = manifest.checks.map((check) => check.command.join(' '));
  assert.ok(commands.includes('node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-checkpoint-contract.cjs'));

  console.log('work-harness stage-checkpoint-contract: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
