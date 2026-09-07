'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUDIT_ISSUE,
  MAX_BODY_BYTES,
  STAGES,
  checkpointDigest,
  checkpointMarker,
  exitCodeFor,
  parseArgs,
  recordCheckpoint,
  renderComment,
  validateInput,
} = require('../stage-checkpoint.cjs');

const PACKET = 1847;
const STAGE = 'IMPLEMENTATION_PR';
const BODY = 'checkpoint evidence\n- exact scope: four files';
const PACKET_BODY = '<!-- canonical-main-work-packet:v1 -->\n# packet';

function fakeClient({ packetComments = [], auditComments = [], failWrites = [] } = {}) {
  const comments = new Map([
    [PACKET, structuredClone(packetComments)],
    [AUDIT_ISSUE, structuredClone(auditComments)],
  ]);
  const writes = [];
  let nextId = 9000;
  return {
    writes,
    comments,
    async api(endpoint, options = {}) {
      if (endpoint === `/issues/${PACKET}` && (!options.method || options.method === 'GET')) {
        return { number: PACKET, state: 'open', body: PACKET_BODY };
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

(async () => {
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

  const root = path.resolve(__dirname, '../../../../..');
  const source = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/stage-checkpoint.cjs'), 'utf8');
  assert.match(source, /REPOSITORY_IDENTITY_INVALID/);
  assert.match(source, /MAX_COMMENT_PAGES = 20/);
  assert.doesNotMatch(source, /issue_comment:/);
  assert.doesNotMatch(source, /tools\/repo-ci-mcp/);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8'));
  const commands = manifest.checks.map((check) => check.command.join(' '));
  assert.ok(commands.includes('node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-checkpoint-contract.cjs'));

  console.log('work-harness stage-checkpoint-contract: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
