const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root, '.github/plugin-control-plane/canonical-main/work-system');
const policy = JSON.parse(fs.readFileSync(path.join(dir, 'policy.json'), 'utf8'));
const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
const template = fs.readFileSync(path.join(dir, 'work-packet-template.md'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-ci.yml'), 'utf8');

assert.equal(policy.version, 1);
assert.deepEqual(policy.surfaces, {
  auditIssue: 293,
  memoryIssue: 462,
  ideaInventoryIssue: 464,
  workQueueIssue: 465,
  documentationIssue: 440,
});
assert.equal(policy.classification.uncertainSystemImpact, 'SYSTEM_UPDATE_REQUIRED');
assert.deepEqual(policy.classification.ordering, ['importance-desc', 'difficulty-asc', 'size-asc']);
assert.ok(policy.ideaStates.includes('PACKETIZED'));
assert.ok(policy.packetStates.includes('BLOCKED'));
assert.equal(policy.parallelism.requireDisjointWriteScopes, true);
assert.equal(policy.parallelism.oneActiveOwnerPerPacket, true);
assert.equal(policy.parallelism.splitOnScopeExpansion, true);
assert.equal(policy.authority.conversationMemoryIsAuthority, false);
assert.equal(policy.authority.queueAuthorizesProduction, false);
assert.equal(policy.authority.queueAuthorizesRelease, false);
assert.equal(policy.authority.repositoryEvidenceWins, true);

for (const marker of Object.values(policy.markers)) {
  assert.ok(readme.includes(marker) || template.includes(marker));
}
for (const issue of Object.values(policy.surfaces)) {
  assert.ok(readme.includes(`#${issue}`));
}
for (const field of ['Primary goal', 'Source', 'Classification', 'Read first', 'Bounded write scope', 'Dependencies / blockers', 'Expected outputs', 'Acceptance', 'Stop condition', 'Handoff']) {
  assert.ok(template.includes(field));
}
assert.ok(readme.includes('one active implementation owner'));
assert.ok(readme.includes('do not silently widen'));
assert.ok(readme.includes('Conversation memory is context only'));
assert.ok(workflow.includes('work-system-contract.cjs'));

console.log('work-system-contract: ok');
