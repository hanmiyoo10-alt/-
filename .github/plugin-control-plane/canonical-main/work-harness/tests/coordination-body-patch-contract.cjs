'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAX_REQUEST_BYTES,
  PACKET_MARKER,
  QUEUE_ISSUE,
  QUEUE_MARKER,
  applyPatch,
  bodyDigest,
  executeCoordinationBodyPatch,
  exitCodeFor,
  parseArgs,
  validateRequest,
  validateTarget,
} = require('../coordination-body-patch.cjs');

const PACKET = 2287;
const PACKET_BODY = [
  PACKET_MARKER,
  '# Packet',
  '',
  '## State',
  '`IN_PROGRESS`',
  '',
  '## Interaction stage',
  '- Current stage: `AUTHORITY_SCOPE`',
  '',
  'Token: old',
].join('\n');
const QUEUE_BODY = `# Queue\n${QUEUE_MARKER}\n\nToken: old`;
const DOCUMENTED_PACKET_BODY = [
  PACKET_MARKER,
  '# Packet',
  '',
  '**State: IN_PROGRESS**',
  '',
  '## Interaction stage',
  '- Current stage: `AUTHORITY_SCOPE`',
  '',
  `Eligibility: \`${PACKET_MARKER}\``,
  'Token: old',
].join('\n');
const DOCUMENTED_QUEUE_BODY = `# Queue\n${QUEUE_MARKER}\n\nEligibility: \`${QUEUE_MARKER}\`\nToken: old`;
const EXACT_OPERATION = Object.freeze({ type: 'replaceExact', oldText: 'Token: old', newText: 'Token: new' });

function requestFor(body, extras = {}) {
  return {
    schemaVersion: 1,
    issueNumber: PACKET,
    surface: 'WORK_PACKET',
    expectedBodySha256: bodyDigest(body),
    operation: { ...EXACT_OPERATION },
    ...extras,
  };
}
function fakeClient({
  issueNumber = PACKET,
  body = PACKET_BODY,
  state = 'open',
  raceBody = null,
  postWriteBody = null,
  failInitialRead = false,
  failPrewriteRead = false,
  failPatch = false,
  patchAppliesBeforeError = false,
  failPostwriteRead = false,
} = {}) {
  let current = { number: issueNumber, state, body };
  let gets = 0;
  const patchCalls = [];
  return {
    patchCalls,
    get current() { return structuredClone(current); },
    async api(endpoint, options = {}) {
      assert.equal(endpoint, `/issues/${issueNumber}`);
      if (!options.method || options.method === 'GET') {
        gets += 1;
        if (gets === 1 && failInitialRead) throw new Error('initial read failed');
        if (gets === 2 && failPrewriteRead) throw new Error('prewrite read failed');
        if (gets === 2 && raceBody !== null) current = { ...current, body: raceBody };
        if (gets === 3 && failPostwriteRead) throw new Error('postwrite read failed');
        return structuredClone(current);
      }
      if (options.method === 'PATCH') {
        patchCalls.push(structuredClone(options.body));
        if (failPatch) {
          if (patchAppliesBeforeError) current = { ...current, body: options.body.body };
          throw new Error('patch response failed');
        }
        current = { ...current, body: postWriteBody === null ? options.body.body : postWriteBody };
        return structuredClone(current);
      }
      throw new Error(`unexpected method ${options.method}`);
    },
  };
}
const validRequest = requestFor(PACKET_BODY);
assert.deepEqual(validateRequest(validRequest), []);
assert.ok(validateRequest({ ...validRequest, extra: true }).includes('REQUEST_FIELDS_INVALID'));
assert.ok(validateRequest({ ...validRequest, expectedBodySha256: 'bad' }).includes('EXPECTED_BODY_SHA256_INVALID'));
assert.ok(validateRequest({ ...validRequest, surface: 'ANY_ISSUE' }).includes('SURFACE_INVALID'));
assert.ok(validateRequest({ ...validRequest, operation: { type: 'replaceExact', oldText: '', newText: 'x' } }).includes('PATCH_OLD_TEXT_INVALID'));

assert.deepEqual(validateTarget({ number: PACKET, state: 'open', body: PACKET_BODY }, PACKET, 'WORK_PACKET'), []);
assert.deepEqual(validateTarget({ number: PACKET, state: 'closed', body: PACKET_BODY }, PACKET, 'WORK_PACKET'), []);
assert.deepEqual(validateTarget({ number: PACKET, state: 'open', body: DOCUMENTED_PACKET_BODY }, PACKET, 'WORK_PACKET'), []);
assert.ok(validateTarget({ number: PACKET, state: 'open', body: `Example: \`${PACKET_MARKER}\`` }, PACKET, 'WORK_PACKET').includes('WORK_PACKET_MARKER_COUNT_INVALID'));
assert.ok(validateTarget({ number: PACKET, state: 'open', body: `${PACKET_MARKER}\n${PACKET_MARKER}` }, PACKET, 'WORK_PACKET').includes('WORK_PACKET_MARKER_COUNT_INVALID'));
assert.ok(validateTarget({ number: PACKET, state: 'open', body: '# generic' }, PACKET, 'WORK_PACKET').includes('WORK_PACKET_MARKER_COUNT_INVALID'));
assert.deepEqual(validateTarget({ number: QUEUE_ISSUE, state: 'open', body: QUEUE_BODY }, QUEUE_ISSUE, 'WORK_QUEUE'), []);
assert.deepEqual(validateTarget({ number: QUEUE_ISSUE, state: 'open', body: DOCUMENTED_QUEUE_BODY }, QUEUE_ISSUE, 'WORK_QUEUE'), []);
assert.ok(validateTarget({ number: QUEUE_ISSUE, state: 'open', body: `Example: \`${QUEUE_MARKER}\`` }, QUEUE_ISSUE, 'WORK_QUEUE').includes('WORK_QUEUE_MARKER_COUNT_INVALID'));
assert.ok(validateTarget({ number: QUEUE_ISSUE, state: 'open', body: `${QUEUE_MARKER}\n${QUEUE_MARKER}` }, QUEUE_ISSUE, 'WORK_QUEUE').includes('WORK_QUEUE_MARKER_COUNT_INVALID'));
assert.ok(validateTarget({ number: QUEUE_ISSUE, state: 'open', body: QUEUE_BODY + '\n' + PACKET_MARKER }, QUEUE_ISSUE, 'WORK_PACKET').includes('WORK_QUEUE_SURFACE_REQUIRED'));
assert.ok(validateTarget({ number: 999, state: 'open', body: QUEUE_BODY }, 999, 'WORK_QUEUE').includes('WORK_QUEUE_ISSUE_INVALID'));
assert.ok(validateTarget({ number: QUEUE_ISSUE, state: 'closed', body: QUEUE_BODY }, QUEUE_ISSUE, 'WORK_QUEUE').includes('WORK_QUEUE_NOT_OPEN'));

const exact = applyPatch(PACKET_BODY, EXACT_OPERATION);
assert.equal(exact.ok, true);
assert.match(exact.body, /Token: new/);
assert.ok(applyPatch(PACKET_BODY, { ...EXACT_OPERATION, oldText: 'missing' }).reasonCodes.includes('PATCH_TARGET_NOT_FOUND'));
assert.ok(applyPatch(`${PACKET_BODY}\nToken: old`, EXACT_OPERATION).reasonCodes.includes('PATCH_TARGET_NOT_UNIQUE'));
assert.ok(applyPatch(PACKET_BODY, { ...EXACT_OPERATION, newText: 'Token: old' }).reasonCodes.includes('PATCH_NOOP_FORBIDDEN'));

const START = '<!-- test:block:start -->';
const END = '<!-- test:block:end -->';
const markerBody = `${PACKET_MARKER}\n${START}\nold\n${END}\nTail`;
const markerOperation = { type: 'replaceMarkerBlock', startMarker: START, endMarker: END, replacementBlock: `${START}\nnew\n${END}` };
const markerPatch = applyPatch(markerBody, markerOperation);
assert.equal(markerPatch.ok, true);
assert.equal(markerPatch.body, `${PACKET_MARKER}\n${START}\nnew\n${END}\nTail`);
assert.ok(applyPatch(markerBody, { ...markerOperation, replacementBlock: 'new only' }).reasonCodes.includes('PATCH_REPLACEMENT_MARKERS_INVALID'));
assert.ok(applyPatch(`${PACKET_MARKER}\n${END}\nold\n${START}`, markerOperation).reasonCodes.includes('PATCH_MARKER_ORDER_INVALID'));
assert.ok(applyPatch(`${PACKET_MARKER}\n${START}\nold\n${START}\n${END}`, markerOperation).reasonCodes.includes('PATCH_START_MARKER_COUNT_INVALID'));
const overlapOperation = { type: 'replaceMarkerBlock', startMarker: 'ABC', endMarker: 'BC', replacementBlock: 'ABCBC' };
assert.ok(applyPatch(`${PACKET_MARKER}\nABC`, overlapOperation).reasonCodes.includes('PATCH_MARKER_RANGE_OVERLAP'));

assert.deepEqual(parseArgs(['--request-file', 'request.json']), { requestFile: 'request.json' });
assert.throws(() => parseArgs([]), /usage:/);
assert.equal(bodyDigest(PACKET_BODY).length, 64);
assert.equal(exitCodeFor({ status: 'UPDATED' }), 0);
assert.equal(exitCodeFor({ status: 'BLOCKED' }), 2);
assert.equal(exitCodeFor({ status: 'CONFLICT' }), 2);
assert.equal(exitCodeFor({ status: 'UNKNOWN' }), 3);
assert.equal(MAX_REQUEST_BYTES, 32768);

(async () => {
  const successClient = fakeClient();
  const success = await executeCoordinationBodyPatch({ client: successClient, request: validRequest });
  assert.equal(success.status, 'UPDATED');
  assert.equal(success.changed, true);
  assert.equal(success.mutationObserved, true);
  assert.equal(success.mutationMayHaveOccurred, false);
  assert.equal(success.observedAfterSha256, success.expectedAfterSha256);
  assert.deepEqual(successClient.patchCalls, [{ body: exact.body }]);
  assert.equal(successClient.current.body, exact.body);
  assert.equal(success.issueStateMutationAuthorized, false);
  assert.equal(success.commentMutationAuthorized, false);
  assert.equal(success.repositoryMutationAuthorized, false);

  const invalidLifecycleRequest = requestFor(PACKET_BODY, {
    operation: {
      type: 'replaceExact',
      oldText: '`IN_PROGRESS`',
      newText: '`ACTIVE / AUTHORITY_SCOPE`',
    },
  });
  const invalidLifecycleClient = fakeClient();
  const invalidLifecycle = await executeCoordinationBodyPatch({
    client: invalidLifecycleClient,
    request: invalidLifecycleRequest,
  });
  assert.equal(invalidLifecycle.status, 'UNKNOWN');
  assert.ok(invalidLifecycle.reasonCodes.includes('PACKET_LIFECYCLE_UNKNOWN'));
  assert.equal(invalidLifecycleClient.patchCalls.length, 0);

  const conflictingLifecycleRequest = requestFor(PACKET_BODY, {
    operation: {
      type: 'replaceExact',
      oldText: '`IN_PROGRESS`',
      newText: '`IN_PROGRESS / READY`',
    },
  });
  const conflictingLifecycleClient = fakeClient();
  const conflictingLifecycle = await executeCoordinationBodyPatch({
    client: conflictingLifecycleClient,
    request: conflictingLifecycleRequest,
  });
  assert.equal(conflictingLifecycle.status, 'CONFLICT');
  assert.ok(conflictingLifecycle.reasonCodes.includes('PACKET_LIFECYCLE_CONFLICT'));
  assert.equal(conflictingLifecycleClient.patchCalls.length, 0);

  const malformedCurrentBody = PACKET_BODY.replace(
    '`IN_PROGRESS`', '`ACTIVE / AUTHORITY_SCOPE`');
  const repairRequest = requestFor(malformedCurrentBody, {
    operation: {
      type: 'replaceExact',
      oldText: '`ACTIVE / AUTHORITY_SCOPE`',
      newText: '`IN_PROGRESS`',
    },
  });
  const repairClient = fakeClient({body: malformedCurrentBody});
  const repaired = await executeCoordinationBodyPatch({
    client: repairClient,
    request: repairRequest,
  });
  assert.equal(repaired.status, 'UPDATED');
  assert.equal(repairClient.patchCalls.length, 1);
  assert.equal(repairClient.current.body, PACKET_BODY);

  const staleClient = fakeClient();
  const stale = await executeCoordinationBodyPatch({
    client: staleClient,
    request: { ...validRequest, expectedBodySha256: '0'.repeat(64) },
  });
  assert.equal(stale.status, 'BLOCKED');
  assert.ok(stale.reasonCodes.includes('EXPECTED_BODY_SHA256_MISMATCH'));
  assert.equal(staleClient.patchCalls.length, 0);
  const raceClient = fakeClient({ raceBody: `${PACKET_BODY}\nConcurrent edit` });
  const raced = await executeCoordinationBodyPatch({ client: raceClient, request: validRequest });
  assert.equal(raced.status, 'BLOCKED');
  assert.ok(raced.reasonCodes.includes('BODY_CHANGED_BEFORE_WRITE'));
  assert.equal(raceClient.patchCalls.length, 0);

  const prewriteFailClient = fakeClient({ failPrewriteRead: true });
  const prewriteFail = await executeCoordinationBodyPatch({ client: prewriteFailClient, request: validRequest });
  assert.equal(prewriteFail.status, 'BLOCKED');
  assert.ok(prewriteFail.reasonCodes.includes('PREWRITE_READ_FAILED'));
  assert.equal(prewriteFailClient.patchCalls.length, 0);

  const mismatchClient = fakeClient({ postWriteBody: `${exact.body}\nConcurrent after write` });
  const mismatch = await executeCoordinationBodyPatch({ client: mismatchClient, request: validRequest });
  assert.equal(mismatch.status, 'UNKNOWN');
  assert.equal(mismatch.mutationMayHaveOccurred, true);
  assert.ok(mismatch.reasonCodes.includes('POSTWRITE_BODY_MISMATCH'));

  const readbackFailClient = fakeClient({ failPostwriteRead: true });
  const readbackFail = await executeCoordinationBodyPatch({ client: readbackFailClient, request: validRequest });
  assert.equal(readbackFail.status, 'UNKNOWN');
  assert.equal(readbackFail.mutationMayHaveOccurred, true);
  assert.ok(readbackFail.reasonCodes.includes('POSTWRITE_READ_FAILED'));

  const patchUnknownClient = fakeClient({ failPatch: true, patchAppliesBeforeError: true });
  const patchUnknown = await executeCoordinationBodyPatch({ client: patchUnknownClient, request: validRequest });
  assert.equal(patchUnknown.status, 'UNKNOWN');
  assert.equal(patchUnknown.mutationMayHaveOccurred, true);
  assert.ok(patchUnknown.reasonCodes.includes('PATCH_REQUEST_FAILED'));
  assert.equal(patchUnknownClient.current.body, exact.body);
  const initialReadFailClient = fakeClient({ failInitialRead: true });
  const initialReadFail = await executeCoordinationBodyPatch({ client: initialReadFailClient, request: validRequest });
  assert.equal(initialReadFail.status, 'UNKNOWN');
  assert.equal(initialReadFail.mutationMayHaveOccurred, false);
  assert.equal(initialReadFailClient.patchCalls.length, 0);

  const queueRequest = requestFor(QUEUE_BODY, {
    issueNumber: QUEUE_ISSUE,
    surface: 'WORK_QUEUE',
  });
  const queueClient = fakeClient({ issueNumber: QUEUE_ISSUE, body: QUEUE_BODY });
  const queueResult = await executeCoordinationBodyPatch({ client: queueClient, request: queueRequest });
  assert.equal(queueResult.status, 'UPDATED');
  assert.deepEqual(queueClient.patchCalls, [{ body: QUEUE_BODY.replace('Token: old', 'Token: new') }]);

  const closedQueueClient = fakeClient({ issueNumber: QUEUE_ISSUE, body: QUEUE_BODY, state: 'closed' });
  const closedQueue = await executeCoordinationBodyPatch({ client: closedQueueClient, request: queueRequest });
  assert.equal(closedQueue.status, 'BLOCKED');
  assert.ok(closedQueue.reasonCodes.includes('WORK_QUEUE_NOT_OPEN'));
  assert.equal(closedQueueClient.patchCalls.length, 0);

  const closedPacketClient = fakeClient({ state: 'closed' });
  const closedPacket = await executeCoordinationBodyPatch({ client: closedPacketClient, request: validRequest });
  assert.equal(closedPacket.status, 'UPDATED');

  const genericBody = '# Ordinary issue\nToken: old';
  const genericClient = fakeClient({ body: genericBody });
  const genericRequest = requestFor(genericBody);
  const generic = await executeCoordinationBodyPatch({ client: genericClient, request: genericRequest });
  assert.equal(generic.status, 'BLOCKED');
  assert.ok(generic.reasonCodes.includes('WORK_PACKET_MARKER_COUNT_INVALID'));
  assert.equal(genericClient.patchCalls.length, 0);
  const root = path.resolve(__dirname, '../../../../..');
  const helperPath = path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/coordination-body-patch.cjs');
  const helperSource = fs.readFileSync(helperPath, 'utf8');
  assert.match(helperSource, /body: \{ body: patch\.body \}/);
  assert.match(helperSource, /packetProjection\.classifyPacketProjection\(patch\.body\)/);
  assert.match(helperSource, /BODY_CHANGED_BEFORE_WRITE/);
  assert.match(helperSource, /POSTWRITE_READBACK_VERIFIED/);
  assert.match(helperSource, /mutationMayHaveOccurred/);
  assert.doesNotMatch(helperSource, /state_reason/);

  const readme = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/README.md'), 'utf8');
  assert.match(readme, /coordination-body-patch\.cjs/);
  assert.match(readme, /CAS-style/);
  assert.match(readme, /not a server-atomic compare-and-swap/i);
  assert.match(readme, /mandatory post-write read-back/i);
  assert.match(readme, /WORK_PACKET/);
  assert.match(readme, /WORK_QUEUE/);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8'));
  const commands = manifest.checks.map((check) => check.command.join(' '));
  assert.ok(commands.includes('node .github/plugin-control-plane/canonical-main/work-harness/tests/coordination-body-patch-contract.cjs'));

  console.log('work-harness coordination-body-patch-contract: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
