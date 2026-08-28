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

assert.deepEqual(policy.queueProjection.liveHealthAuthorities, ['direct-main', 'issue-485']);
assert.equal(policy.queueProjection.liveHealthMode, 'pointer-only');
assert.equal(policy.queueProjection.duplicateLiveMainSha, false);
assert.equal(policy.queueProjection.duplicateRequiredState, false);
assert.equal(policy.queueProjection.duplicateProductionState, false);
assert.equal(policy.queueProjection.duplicateNativeProtectionState, false);
assert.equal(policy.queueProjection.allowHistoricalSynchronizationSha, true);
assert.equal(policy.queueProjection.historicalSynchronizationShaMustBeLabeled, true);

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
assert.match(readme, /## Work queue live-health contract/);
assert.match(readme, /`#465` is coordination only/);
assert.match(readme, /`LIVE HEALTH: direct main \+ #485` is the only current-health pointer/);
assert.match(readme, /MUST NOT duplicate a current `main` SHA, Required state\/run, production identity state, or native-protection state as live truth/);
assert.match(readme, /explicitly historical synchronization\/packet evidence/);
assert.match(readme, /read direct current `main` and #485 rather than refreshing #465 merely to copy time-sensitive evidence/);
assert.match(readme, /## Normal canonical-main startup/);
assert.match(readme, /exactly two required reads/);
assert.match(readme, /1\. read direct current `main` authority/);
assert.match(readme, /2\. read `#485` and its Canonical Operator Capsule/);
assert.match(readme, /read `#465` only when work execution, activation, ownership, or coordination is requested or already active/);
assert.match(readme, /read `#462` only when distilled memory or historical operating context is needed/);
assert.match(readme, /read `#464` only when idea\/design identity, lifecycle, overlap, or priority is needed/);
assert.match(readme, /read `#293` only when raw audit or conversation provenance is needed/);
assert.match(readme, /direct current `main` does not match the `MAIN` SHA rendered by `#485`/);
assert.match(readme, /This fast path ends as soon as repository work is requested/);
assert.match(readme, /The two-read protocol never authorizes a write, merge, release, protection change, or project\/runtime action/);
assert.ok(workflow.includes('work-system-contract.cjs'));

console.log('work-system-contract: ok');
