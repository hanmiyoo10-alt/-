const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root, '.github/plugin-control-plane/canonical-main/work-system');
const policy = JSON.parse(fs.readFileSync(path.join(dir, 'policy.json'), 'utf8'));
const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
const template = fs.readFileSync(path.join(dir, 'work-packet-template.md'), 'utf8');
const pluginManifest = JSON.parse(fs.readFileSync(path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8'));
const permanentCommands = pluginManifest.checks.map((check) => check.command.join(' ')).join('\n');

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

assert.equal(policy.closureTaxonomy.version, 1);
assert.deepEqual(policy.closureTaxonomy.terms, [
  'IMPLEMENTED',
  'CONTRACT_PROVEN',
  'LIVE_PROVEN',
  'OBSERVATIONAL_PENDING',
  'BLOCKED_CAPABILITY',
  'DONE',
]);
assert.deepEqual(policy.closureTaxonomy.roles, {
  implementation: ['IMPLEMENTED'],
  proof: ['CONTRACT_PROVEN', 'LIVE_PROVEN'],
  disposition: ['OBSERVATIONAL_PENDING', 'BLOCKED_CAPABILITY'],
  closure: ['DONE'],
});
assert.deepEqual(policy.closureTaxonomy.rules, {
  packetLifecycleSeparateFromProofDisposition: true,
  implementedDoesNotImplyProven: true,
  contractProvenDoesNotImplyLiveProven: true,
  doneRequiresAllRequiredAcceptanceSatisfied: true,
  doneAllowsUnknownRequiredEvidence: false,
  observationalPendingRequiresExplicitNonBlockingAcceptance: true,
  safetyCriticalLiveProofRemainsBlockingWhenRequired: true,
  blockedCapabilityMayCoexistWithDoneOnlyWhenExplicitlyNonBlocking: true,
  taxonomyMayRetroactivelyWeakenActivatedAcceptance: false,
});
assert.ok(policy.packetStates.includes('DONE'));
assert.equal(policy.closureTaxonomy.roles.closure.includes('DONE'), true);
assert.equal(policy.closureTaxonomy.roles.proof.includes('DONE'), false);

assert.deepEqual(policy.queueProjection.liveHealthAuthorities, ['direct-main', 'issue-485']);
assert.equal(policy.queueProjection.liveHealthMode, 'pointer-only');
assert.equal(policy.queueProjection.duplicateLiveMainSha, false);
assert.equal(policy.queueProjection.duplicateRequiredState, false);
assert.equal(policy.queueProjection.duplicateProductionState, false);
assert.equal(policy.queueProjection.duplicateNativeProtectionState, false);
assert.equal(policy.queueProjection.allowHistoricalSynchronizationSha, true);
assert.equal(policy.queueProjection.historicalSynchronizationShaMustBeLabeled, true);

assert.equal(policy.readRouting.version, 1);
assert.deepEqual(policy.readRouting.baseReads, ['direct-main', 'issue-485']);
assert.deepEqual(policy.readRouting.intents.STATUS_SESSION, {add: [], stopAfterReads: true});
assert.deepEqual(policy.readRouting.intents.EXECUTION, {
  add: ['issue-465', 'active-packet'],
  requiresPacketBootstrapBeforeMutation: true,
});
assert.deepEqual(policy.readRouting.intents.MEMORY_CONTEXT.add, ['issue-462']);
assert.deepEqual(policy.readRouting.intents.IDEA_DESIGN_CONTEXT.add, ['issue-464']);
assert.deepEqual(policy.readRouting.intents.AUDIT_CONTEXT.add, ['issue-293']);
assert.deepEqual(policy.readRouting.intents.DESIGN_AUTHORITY_CONTEXT.add, ['relevant-design-authority']);
assert.deepEqual(policy.readRouting.rules, {
  routineDurableScan: false,
  mainOpsMismatchDisposition: 'SETTLING_OR_STALE',
  greenByAbsence: false,
  readPlanGrantsMutationAuthority: false,
  stopAfterBaseReadsWhenNoAdditionalIntent: true,
  noTimestampRefreshForReadOnlyOrientation: true,
});
const routeFor = (...names) => [...new Set([
  ...policy.readRouting.baseReads,
  ...names.flatMap((name) => policy.readRouting.intents[name].add),
])];
assert.deepEqual(routeFor('STATUS_SESSION'), ['direct-main', 'issue-485']);
assert.deepEqual(routeFor('EXECUTION'), ['direct-main', 'issue-485', 'issue-465', 'active-packet']);
assert.deepEqual(routeFor('MEMORY_CONTEXT'), ['direct-main', 'issue-485', 'issue-462']);
assert.deepEqual(routeFor('IDEA_DESIGN_CONTEXT'), ['direct-main', 'issue-485', 'issue-464']);
assert.deepEqual(routeFor('AUDIT_CONTEXT'), ['direct-main', 'issue-485', 'issue-293']);
assert.deepEqual(routeFor('DESIGN_AUTHORITY_CONTEXT'), ['direct-main', 'issue-485', 'relevant-design-authority']);
assert.deepEqual(routeFor('MEMORY_CONTEXT', 'AUDIT_CONTEXT'), ['direct-main', 'issue-485', 'issue-462', 'issue-293']);
for (const durable of ['issue-462', 'issue-464', 'issue-293']) {
  assert.equal(routeFor('STATUS_SESSION').includes(durable), false);
  assert.equal(routeFor('EXECUTION').includes(durable), false);
}

for (const marker of Object.values(policy.markers)) {
  assert.ok(readme.includes(marker) || template.includes(marker));
}
for (const issue of Object.values(policy.surfaces)) {
  assert.ok(readme.includes(`#${issue}`));
}
for (const field of ['Primary goal', 'Source', 'Classification', 'Read first', 'Bounded write scope', 'Dependencies / blockers', 'Expected outputs', 'Acceptance', 'Proof / closure', 'Stop condition', 'Handoff']) {
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
assert.match(readme, /## Proof \/ closure taxonomy/);
for (const term of policy.closureTaxonomy.terms) {
  assert.ok(readme.includes(`\`${term}\``));
  assert.ok(template.includes(term));
}
assert.match(readme, /Packet lifecycle and proof\/evidence disposition are separate axes/);
assert.match(readme, /Do not collapse these into one generic `PROVEN` label/);
assert.match(readme, /`IMPLEMENTED` does not imply `CONTRACT_PROVEN` or `LIVE_PROVEN`/);
assert.match(readme, /`CONTRACT_PROVEN` does not imply `LIVE_PROVEN`/);
assert.match(readme, /MUST NOT become `DONE` while any declared required acceptance item is unsatisfied or its required evidence is `UNKNOWN`/);
assert.match(readme, /`OBSERVATIONAL_PENDING` may coexist with `DONE` only when the packet acceptance explicitly labels that observation non-blocking/);
assert.match(readme, /`BLOCKED_CAPABILITY` may coexist with `DONE` only when the affected capability\/evidence is explicitly non-blocking/);
assert.match(readme, /Safety-critical live proof remains blocking whenever the activated packet declared it required/);
assert.match(readme, /never retroactively weakens an already-activated packet's acceptance contract/);
assert.match(readme, /v1\.1 `V11-V1` keeps its original natural-live-observation requirement/);
assert.match(template, /## Proof \/ closure/);
assert.match(template, /Evidence terms reached:/);
assert.match(template, /Required acceptance UNKNOWNs:/);
assert.match(template, /Explicitly non-blocking pending\/capability evidence:/);
assert.match(template, /`DONE` belongs in the packet lifecycle State only after every declared required acceptance item is satisfied/);
assert.match(template, /required UNKNOWN evidence is `NONE`/);
assert.match(template, /may coexist with `DONE` only when the affected evidence was explicitly declared non-blocking/);
assert.match(template, /Do not infer `LIVE_PROVEN` from `CONTRACT_PROVEN`/);
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
assert.match(readme, /## Intent-aware read routing/);
assert.match(readme, /`STATUS_SESSION` adds nothing/);
assert.match(readme, /`EXECUTION` adds only `issue-465 \+ active-packet`/);
assert.match(readme, /`MEMORY_CONTEXT` adds only `issue-462`/);
assert.match(readme, /`IDEA_DESIGN_CONTEXT` adds only `issue-464`/);
assert.match(readme, /`AUDIT_CONTEXT` adds only `issue-293`/);
assert.match(readme, /`DESIGN_AUTHORITY_CONTEXT` adds only the relevant design authority/);
assert.match(readme, /Routine orientation MUST NOT scan `#462`, `#464`, and `#293` by default/);
assert.match(readme, /routing disposition is `SETTLING_OR_STALE`/);
assert.match(readme, /A read plan never grants write, merge, release, production, or protection authority/);
assert.match(readme, /unchanged evidence is a read-only no-op/);
assert.match(readme, /do not rewrite #465 or durable surfaces merely to refresh timestamps/);
assert.ok(permanentCommands.includes('work-system-contract.cjs'));

console.log('work-system-contract: ok');
