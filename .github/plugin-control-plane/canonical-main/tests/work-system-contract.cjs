const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root, '.github/plugin-control-plane/canonical-main/work-system');
const policy = JSON.parse(fs.readFileSync(path.join(dir, 'policy.json'), 'utf8'));
const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
const template = fs.readFileSync(path.join(dir, 'work-packet-template.md'), 'utf8');
const commonRules = fs.readFileSync(path.join(root, 'docs/REPOSITORY_COMMON_RULES.md'), 'utf8');
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
  nativeGitHubIssueClosureIsDoneEvidence: false,
  blockingPostmergeAcceptanceAllowsPrClosingKeyword: false,
});
assert.ok(policy.packetStates.includes('DONE'));
assert.equal(policy.closureTaxonomy.roles.closure.includes('DONE'), true);
assert.equal(policy.closureTaxonomy.roles.proof.includes('DONE'), false);

assert.equal(policy.executionCompactness.version, 1);
assert.equal(policy.executionCompactness.skillPath, '.agents/skills/agent-execution-compactness/SKILL.md');
assert.deepEqual(policy.executionCompactness.routes, [
  'EXISTING_COMMAND',
  'HARNESS',
  'INLINE_SMALL',
  'MATERIALIZE',
  'EXCEPTION',
]);
assert.deepEqual(policy.executionCompactness.inlineSmallGuardrails, {
  approxLogicalLinesMax: 20,
  approxSourceBytesMax: 2048,
  generatedSourceTestProgramFilesMax: 1,
});
assert.equal(policy.executionCompactness.crossingGuardrailDefaultRoute, 'MATERIALIZE');
assert.equal(policy.executionCompactness.exceptionRequiresReason, true);
assert.equal(policy.executionCompactness.quotingDoesNotReclassifyLargePayload, true);
assert.equal(policy.executionCompactness.preserveRequiredValidation, true);
assert.equal(policy.executionCompactness.hostUiSuppressionClaim, false);
assert.ok(policy.packetRequiredFields.includes('executionCompactness'));

assert.equal(policy.stagedInteraction.version, 1);
assert.deepEqual(policy.stagedInteraction.stages, [
  'AUTHORITY_SCOPE',
  'IMPLEMENTATION_PR',
  'VALIDATION_MERGE',
  'POSTMERGE_CONVERGENCE',
  'EXPERIMENT_CLOSE',
]);
assert.equal(policy.stagedInteraction.ordinaryContinuationMaxSubstantialStages, 1);
assert.deepEqual(policy.stagedInteraction.tinyReadOnlyCollapse, {
  allowed: true,
  maxBoundedReads: 2,
});
assert.deepEqual(policy.stagedInteraction.safetyCriticalRecovery, {
  mayContinueToNearestSafeStop: true,
  exceptionMustBeRecorded: true,
});
assert.equal(policy.stagedInteraction.explicitUserBroaderRunAllowed, true);
assert.equal(policy.stagedInteraction.preserveRequiredGates, true);
assert.equal(policy.stagedInteraction.productionTruthOwner, false);
assert.equal(policy.stagedInteraction.hostUiPerformanceGuarantee, false);
assert.ok(policy.packetRequiredFields.includes('interactionStage'));

assert.deepEqual(policy.queueProjection.liveHealthAuthorities, ['direct-main', 'issue-485']);
assert.equal(policy.queueProjection.liveHealthMode, 'pointer-only');
assert.equal(policy.queueProjection.duplicateLiveMainSha, false);
assert.equal(policy.queueProjection.duplicateRequiredState, false);
assert.equal(policy.queueProjection.duplicateProductionState, false);
assert.equal(policy.queueProjection.duplicateNativeProtectionState, false);
assert.equal(policy.queueProjection.allowHistoricalSynchronizationSha, true);
assert.equal(policy.queueProjection.historicalSynchronizationShaMustBeLabeled, true);
assert.equal(policy.queueProjection.maxHumanFacingMutableActiveWriterProjections, 1);
assert.equal(policy.queueProjection.surfacesMayDuplicateActiveWriter, false);
assert.equal(policy.queueProjection.activeWriterProjectionExhaustive, false);

assert.equal(policy.readRouting.version, 1);
assert.deepEqual(policy.readRouting.baseReads, ['direct-main', 'issue-485']);
assert.deepEqual(policy.readRouting.intents.STATUS_SESSION, {add: [], stopAfterReads: true});
assert.deepEqual(policy.readRouting.intents.EXECUTION, {
  add: ['issue-465', 'active-packets'],
  requiresPacketBootstrapBeforeMutation: true,
  activePacketDiscovery: {
    mode: 'write-scope-overlap',
    queueSeedOnly: true,
    inspectConcretelyIdentifiedNonterminalOwners: true,
    unresolvedOverlapDisposition: 'UNKNOWN_OR_CONFLICT',
    disjointParallelismPreserved: true,
  },
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
assert.deepEqual(routeFor('EXECUTION'), ['direct-main', 'issue-485', 'issue-465', 'active-packets']);
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
for (const field of ['Primary goal', 'Source', 'Classification', 'Read first', 'Execution compactness', 'Interaction stage', 'Bounded write scope', 'Dependencies / blockers', 'Expected outputs', 'Acceptance', 'Proof / closure', 'Stop condition', 'Handoff']) {
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
assert.match(readme, /at most one human-facing mutable active-writer projection/);
assert.match(readme, /stable `## Surfaces` pointers MUST NOT repeat mutable active-writer state/);
assert.match(readme, /not an exhaustive registry of nonterminal work/);
assert.match(readme, /## Execution compactness contract/);
assert.match(readme, /\.agents\/skills\/agent-execution-compactness\/SKILL\.md/);
for (const route of policy.executionCompactness.routes) {
  assert.ok(readme.includes(`\`${route}\``));
  assert.ok(template.includes(route));
}
assert.match(readme, /at most 20 logical execution\/program lines/);
assert.match(readme, /at most 2 KiB of directly supplied source\/program text/);
assert.match(readme, /at most one generated source\/test\/program file/);
assert.match(readme, /Crossing any normal guardrail routes to `MATERIALIZE`/);
assert.match(readme, /Quoting, escaping, shell indirection, or heredoc wrapping does not turn a large directly supplied program into `INLINE_SMALL`/);
assert.match(readme, /`EXCEPTION` without an explicit reason is invalid/);
assert.match(readme, /does not claim it can hide, merge, or suppress ChatGPT host UI\/activity cards/);
assert.match(readme, /before non-trivial shell, heredoc, inline Python, temporary source\/test, or similar local execution, read\/apply `\.agents\/skills\/agent-execution-compactness\/SKILL\.md`/);
assert.match(template, /## Execution compactness/);
assert.match(template, /Route: `<EXISTING_COMMAND\|HARNESS\|INLINE_SMALL\|MATERIALIZE\|EXCEPTION>`/);
assert.match(template, /Command\/file surface:/);
assert.match(template, /Validation preserved:/);
assert.match(template, /Guardrail accounting:/);
assert.match(template, /Exception reason:/);
assert.match(template, /Quoting, escaping, or heredoc wrapping does not reclassify a large payload as small/);
assert.match(template, /`EXCEPTION` always requires a concrete reason/);
assert.match(template, /## Interaction stage/);
assert.match(template, /AUTHORITY_SCOPE → IMPLEMENTATION_PR → VALIDATION_MERGE → POSTMERGE_CONVERGENCE → EXPERIMENT_CLOSE/);
assert.match(template, /Ordinary continuation budget: `1 substantial stage`/);
assert.match(template, /tiny read-only task may collapse stages only when it genuinely completes in at most two bounded reads/);
assert.match(template, /safety-critical recovery may continue only to the nearest safe stop/);
assert.match(template, /Explicit user instruction may authorize a broader run/);
assert.match(template, /Staging never removes required Git, CI, release, production, authority, validation, uncertainty, or evidence checks/);
assert.match(template, /current interaction stage, completed stages, and exact next stage/);
assert.match(commonRules, /### RCR-D15 — Stage substantial interactive repository work at bounded checkpoints/);
assert.match(commonRules, /\*\*Class:\*\* `DEFAULT`/);
assert.match(commonRules, /`AUTHORITY_SCOPE` → `IMPLEMENTATION_PR` → `VALIDATION_MERGE` → `POSTMERGE_CONVERGENCE` → `EXPERIMENT_CLOSE`/);
assert.match(commonRules, /one ordinary continuation should advance at most one substantial stage/);
assert.match(commonRules, /at most two bounded reads/);
assert.match(commonRules, /nearest safe stop/);
assert.match(commonRules, /Explicit user instruction may authorize a broader run/);
assert.match(commonRules, /does not remove or weaken required Git, CI, release, production, authority, validation, uncertainty, or evidence checks/);
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
assert.equal(policy.closureTaxonomy.rules.nativeGitHubIssueClosureIsDoneEvidence, false);
assert.equal(policy.closureTaxonomy.rules.blockingPostmergeAcceptanceAllowsPrClosingKeyword, false);
assert.ok(readme.includes("Native GitHub issue closure alone is not proof-taxonomy `DONE` evidence."));
assert.ok(readme.includes("the implementation PR MUST use non-closing linkage such as `Refs #<packet>` and MUST NOT use `Fixes` or `Closes`"));
assert.match(template, /## Proof \/ closure/);
assert.match(template, /Evidence terms reached:/);
assert.match(template, /Required acceptance UNKNOWNs:/);
assert.match(template, /Explicitly non-blocking pending\/capability evidence:/);
assert.match(template, /`DONE` belongs in the packet lifecycle State only after every declared required acceptance item is satisfied/);
assert.match(template, /required UNKNOWN evidence is `NONE`/);
assert.match(template, /may coexist with `DONE` only when the affected evidence was explicitly declared non-blocking/);
assert.match(template, /Do not infer `LIVE_PROVEN` from `CONTRACT_PROVEN`/);
assert.ok(template.includes("PR linkage is fail closed: if required acceptance remains after merge"));
assert.ok(template.includes("Native GitHub issue closure alone is not proof-taxonomy `DONE` evidence."));
assert.match(readme, /## Packet body lifecycle projection and terminal close-sync/);
assert.ok(readme.includes('current resumable lifecycle projection, not an immutable activation snapshot'));
assert.match(readme, /reconcile the packet body before or atomically with native GitHub closure/);
assert.match(readme, /lifecycle State; completed\/current\/next interaction stage; evidence-backed Proof \/ closure terms; required acceptance UNKNOWNs; and Handoff \/ exact next action/);
assert.match(readme, /MUST NOT manufacture `LIVE_PROVEN`, clear an `UNKNOWN` by omission, or weaken activated acceptance/);
assert.match(readme, /final comment or native GitHub closure does not make a contradictory stale packet body acceptable/);
assert.match(readme, /do not resume the stale advertised stage without fresh re-attribution/);
assert.match(readme, /does not broaden that opt-in automation boundary/);
assert.ok(template.includes('current lifecycle projection, not an immutable activation snapshot'));
assert.ok(template.includes('Before or atomically with native issue closure'));
assert.ok(template.includes('Native closure or a final comment alone does not override a contradictory stale body'));
assert.ok(template.includes('do not resume the stale advertised stage without fresh re-attribution'));
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
assert.match(readme, /`EXECUTION` adds only `issue-465 \+ active-packets`/);
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

assert.match(readme, /`active-packets` is a bounded write-scope-overlap discovery step/);
assert.match(readme, /unresolved overlap remains `UNKNOWN` or `CONFLICT`/);
assert.match(readme, /Disjoint nonterminal packets remain eligible to proceed in parallel/);

const {classifyQueueBody, REASON_CODES} = require(path.join(dir, 'queue-hygiene.cjs'));
const {resolveScopeOverlap, REASON_CODES: OVERLAP_REASON_CODES} = require(path.join(dir, 'scope-overlap.cjs'));

const pointerOnlyFixture = `# Canonical Main — Work Queue
## Live health
- \`LIVE HEALTH: direct main + #485\`
- Do not duplicate mutable current SHA / Required / production / protection truth here.
## Current coordination
- Active writer: #2278 CM-WQ-HYGIENE-V1-01
## Historical evidence
- Historical synchronization of current main SHA: 1111111111111111111111111111111111111111
- Historical Required PASS — run 12345
- Historical production MATCH snapshot
- Historical native protection ACTIVE snapshot
- Historical #485 state: CLEAR at activation.`;

const pointerOnlyResult = classifyQueueBody(pointerOnlyFixture);
assert.equal(pointerOnlyResult.state, 'PASS');
assert.equal(pointerOnlyResult.pointerCount, 1);
assert.equal(pointerOnlyResult.activeWriterProjectionCount, 1);
assert.deepEqual(pointerOnlyResult.findings, []);

const duplicateFixture = (line) => `${pointerOnlyFixture}\n${line}`;
const expectFailCode = (line, code) => {
  const result = classifyQueueBody(duplicateFixture(line));
  assert.equal(result.state, 'FAIL');
  const match = result.findings.find((item) => item.code === code);
  assert.ok(match, `expected ${code}`);
  assert.ok(Number.isInteger(match.line) && match.line > 0);
  assert.ok(match.excerpt.length > 0 && match.excerpt.length <= 240);
};

expectFailCode('- Current main SHA: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', REASON_CODES.DUPLICATE_LIVE_MAIN_SHA);
expectFailCode('- Required: PASS — run 99999', REASON_CODES.DUPLICATE_REQUIRED_STATE);
expectFailCode('- Production identity: MATCH', REASON_CODES.DUPLICATE_PRODUCTION_STATE);
expectFailCode('- Native protection: ACTIVE / protected true', REASON_CODES.DUPLICATE_NATIVE_PROTECTION_STATE);
expectFailCode('- #485 is currently CLEAR', REASON_CODES.DUPLICATE_ISSUE_485_CURRENT_STATE);
expectFailCode('- #485 remains CLEAR', REASON_CODES.DUPLICATE_ISSUE_485_CURRENT_STATE);
expectFailCode('- Active writer: #999 competing-owner', REASON_CODES.DUPLICATE_ACTIVE_WRITER_PROJECTION);

const ambiguousResult = classifyQueueBody(`${pointerOnlyFixture}\n- Possible active-writer candidate: #999; status unverified.`);
assert.equal(ambiguousResult.state, 'UNKNOWN');
assert.ok(ambiguousResult.findings.some((item) => item.code === REASON_CODES.ACTIVE_WRITER_STATUS_UNRESOLVED));

assert.equal(classifyQueueBody(pointerOnlyFixture.replace('LIVE HEALTH: direct main + #485', 'LIVE HEALTH: see operator view')).state, 'FAIL');
assert.equal(classifyQueueBody(`${pointerOnlyFixture}\n- \`LIVE HEALTH: direct main + #485\``).state, 'FAIL');
assert.match(readme, /## #465 pointer-only hygiene classifier/);
assert.match(readme, /`PASS \/ WARN \/ FAIL \/ UNKNOWN`/);
assert.match(readme, /never fetches GitHub and never mutates #465/);
assert.match(readme, /clearly labeled historical synchronization\/packet evidence remains allowed/i);


const overlapPacketBody = (state, scopes) => `<!-- canonical-main-work-packet:v1 -->
## State
\`${state}\`
## Bounded write scope
${scopes.map((scope, index) => `${index + 1}. \`${scope}\``).join('\n')}
## Handoff
fixture`;
const resolveOverlap = (requestedScopes, candidates, discovery = 'COMPLETE') => resolveScopeOverlap({
  requestedScopes,
  discovery,
  candidates,
});
const expectOverlapFinding = (result, state, code) => {
  assert.equal(result.state, state);
  const match = result.findings.find((item) => item.code === code);
  assert.ok(match, `expected ${code}`);
  assert.ok(match.ownerRef);
  assert.ok(match.requestedScope);
  assert.ok(match.evidence.length > 0 && match.evidence.length <= 240);
  assert.ok(Array.isArray(match.sourceRefs) && match.sourceRefs.length > 0);
};

const disjointPacket = {
  type: 'packet',
  ref: '#10',
  issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['path:docs/**']),
};
assert.equal(resolveOverlap(['path:tools/repo-ci-mcp/README.md'], [disjointPacket]).state, 'DISJOINT');

const implementationHeadingPacket = {
  type: 'packet', ref: '#10b', issueState: 'open',
  body: `<!-- canonical-main-work-packet:v1 -->
## State
\`IN_PROGRESS\`
## Bounded implementation write scope
1. \`tools/repo-ci-mcp/**\`
Preservation / non-write surfaces:
- \`docs/**\`
## Handoff
fixture`,
};
assert.equal(resolveOverlap(['path:docs/README.md'], [implementationHeadingPacket]).state, 'DISJOINT');
assert.equal(resolveOverlap(['path:tools/repo-ci-mcp/server.py'], [implementationHeadingPacket]).state, 'OVERLAP');

let overlapResult = resolveOverlap(['path:tools/repo-ci-mcp/README.md'], [{
  type: 'packet', ref: '#11', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['path:tools/repo-ci-mcp/README.md']),
}]);
expectOverlapFinding(overlapResult, 'OVERLAP', OVERLAP_REASON_CODES.WRITE_SCOPE_OVERLAP);

overlapResult = resolveOverlap(['path:tools/repo-ci-mcp/**'], [{
  type: 'packet', ref: '#12', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['path:tools/repo-ci-mcp/README.md']),
}]);
assert.equal(overlapResult.state, 'OVERLAP');

overlapResult = resolveOverlap(['path:tools/repo-ci-mcp/README.md'], [{
  type: 'packet', ref: '#13', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['path:tools/repo-ci-mcp/**']),
}]);
assert.equal(overlapResult.state, 'OVERLAP');

overlapResult = resolveOverlap(['surface:issue:465'], [{
  type: 'packet', ref: '#14', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['surface:issue:465']),
}]);
assert.equal(overlapResult.state, 'OVERLAP');

overlapResult = resolveOverlap(['path:tools/./repo-ci-mcp/README.md'], [{
  type: 'packet', ref: '#15', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['path:tools/repo-ci-mcp/README.md']),
}]);
assert.equal(overlapResult.state, 'OVERLAP');

expectOverlapFinding(
  resolveOverlap(['path:../secret'], [disjointPacket]),
  'UNKNOWN',
  OVERLAP_REASON_CODES.REQUESTED_SCOPE_INVALID,
);

expectOverlapFinding(
  resolveOverlap(['path:src/README.md'], [disjointPacket], 'PARTIAL'),
  'UNKNOWN',
  OVERLAP_REASON_CODES.DISCOVERY_INCOMPLETE,
);

expectOverlapFinding(
  resolveOverlap(['path:tools/*.js'], [disjointPacket]),
  'UNKNOWN',
  OVERLAP_REASON_CODES.REQUESTED_SCOPE_INVALID,
);

expectOverlapFinding(resolveOverlap(['path:tools/repo-ci-mcp/README.md'], [{
  type: 'pr', ref: '#20', state: 'open', filesComplete: false,
  changedFiles: ['tools/repo-ci-mcp/README.md'],
}]), 'OVERLAP', OVERLAP_REASON_CODES.WRITE_SCOPE_OVERLAP);

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#21', state: 'open', filesComplete: false,
  changedFiles: ['tools/repo-ci-mcp/README.md'],
}]), 'UNKNOWN', OVERLAP_REASON_CODES.PR_CHANGED_FILES_INCOMPLETE);

assert.equal(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#22', issueState: 'open',
  body: overlapPacketBody('DONE', ['path:docs/README.md']),
}, {
  type: 'pr', ref: '#23', state: 'closed', filesComplete: true,
  changedFiles: ['docs/README.md'],
}]).state, 'DISJOINT');

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#24', issueState: 'closed',
  body: overlapPacketBody('IN_PROGRESS', ['path:other/**']),
}]), 'CONFLICT', OVERLAP_REASON_CODES.PACKET_NATIVE_STATE_CONFLICT);

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#30', issueState: 'open', linkedPrRef: '#31',
  body: overlapPacketBody('IN_PROGRESS', ['path:tools/repo-ci-mcp/**']),
}, {
  type: 'pr', ref: '#31', state: 'open', filesComplete: true,
  changedFiles: ['tools/repo-ci-mcp/README.md', '.github/workflows/unrelated.yml'],
}]), 'CONFLICT', OVERLAP_REASON_CODES.PACKET_PR_SCOPE_DRIFT);

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#32', issueState: 'open', linkedPrRef: '#33',
  body: overlapPacketBody('IN_PROGRESS', ['path:tools/repo-ci-mcp/**']),
}]), 'UNKNOWN', OVERLAP_REASON_CODES.LINKED_PR_EVIDENCE_MISSING);

assert.equal(resolveOverlap(['path:src/README.md'], [disjointPacket], 'UNKNOWN').state, 'UNKNOWN');

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#21b', state: 'open', filesComplete: false,
}]), 'UNKNOWN', OVERLAP_REASON_CODES.PR_CHANGED_FILES_INCOMPLETE);

assert.equal(resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#23b', state: 'merged', filesComplete: true,
  changedFiles: ['docs/README.md'],
}]).state, 'DISJOINT');

assert.match(readme, /## Write-scope overlap resolver/);
assert.match(readme, /`DISJOINT \/ OVERLAP \/ UNKNOWN \/ CONFLICT`/);
assert.match(readme, /supplied packet\/PR evidence only/);
assert.match(readme, /#465 remains seed-only and non-exhaustive/);
assert.match(readme, /`DISJOINT` requires bounded discovery `COMPLETE`/);
assert.match(readme, /does not fetch GitHub, mutate issues, or grant write authority/);

console.log('work-system-contract: ok');
