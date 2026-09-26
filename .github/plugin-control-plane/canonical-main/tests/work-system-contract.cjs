const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root, '.github/plugin-control-plane/canonical-main/work-system');
const policy = JSON.parse(fs.readFileSync(path.join(dir, 'policy.json'), 'utf8'));
const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
const template = fs.readFileSync(path.join(dir, 'work-packet-template.md'), 'utf8');
const sharedInteraction = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/shared-interaction-contract.md'), 'utf8');
const packetProjectionSource = fs.readFileSync(path.join(dir, 'packet-projection.cjs'), 'utf8');
const scopeOverlapSource = fs.readFileSync(path.join(dir, 'scope-overlap.cjs'), 'utf8');
const commonRules = fs.readFileSync(path.join(root, 'docs/REPOSITORY_COMMON_RULES.md'), 'utf8');
const {
  PACKET_STATES,
  REASON_CODES: PACKET_PROJECTION_REASON_CODES,
  classifyPacketProjection,
  extractPacketLifecycle,
} = require(path.join(dir, 'packet-projection.cjs'));
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


assert.deepEqual(PACKET_STATES, policy.packetStates);
const packetFixture = (stateLine, currentStage = 'AUTHORITY_SCOPE') => [
  '<!-- canonical-main-work-packet:v1 -->',
  '',
  stateLine,
  '',
  '## Interaction stage',
  '',
  `- Current stage: \`${currentStage}\``,
].join('\n');

let packetProjection = classifyPacketProjection(packetFixture('**State: READY**'));
assert.equal(packetProjection.disposition, 'PASS');
assert.equal(packetProjection.lifecycle, 'READY');
assert.equal(packetProjection.interactionStage, 'AUTHORITY_SCOPE');
assert.equal(packetProjection.mutationAuthorized, false);
assert.equal(extractPacketLifecycle(packetFixture('**State: READY**')), 'READY');

const headingPacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '',
  '## State',
  '`IN_PROGRESS / VALIDATION_MERGE COMPLETE`',
  '',
  '## Interaction stage',
  '',
  '- Current stage: `VALIDATION_MERGE`',
].join('\n');
assert.equal(extractPacketLifecycle(headingPacket), 'IN_PROGRESS');
assert.equal(classifyPacketProjection(headingPacket).disposition, 'PASS');


const stageOnly = [
  '<!-- canonical-main-work-packet:v1 -->',
  '',
  '## State',
  '`POSTMERGE_CONVERGENCE COMPLETE / READY_FOR_EXPERIMENT_CLOSE`',
  '',
  '## Interaction stage',
  '',
  '- Current stage: `EXPERIMENT_CLOSE`',
].join('\n');
assert.equal(extractPacketLifecycle(stageOnly), null);
packetProjection = classifyPacketProjection(stageOnly);
assert.equal(packetProjection.disposition, 'UNKNOWN');
assert.ok(packetProjection.reasonCodes.includes(PACKET_PROJECTION_REASON_CODES.PACKET_LIFECYCLE_UNKNOWN));

const proofOnly = `${stageOnly}\n\n## Proof / closure\n- Evidence terms reached: DONE`;
assert.equal(extractPacketLifecycle(proofOnly), null);
assert.ok(classifyPacketProjection(proofOnly).reasonCodes.includes(PACKET_PROJECTION_REASON_CODES.PACKET_LIFECYCLE_UNKNOWN));

const lifecycleWithoutStage = '<!-- canonical-main-work-packet:v1 -->\n\n**State: IN_PROGRESS**\n';
assert.equal(extractPacketLifecycle(lifecycleWithoutStage), 'IN_PROGRESS');
packetProjection = classifyPacketProjection(lifecycleWithoutStage);
assert.equal(packetProjection.lifecycle, 'IN_PROGRESS');
assert.equal(packetProjection.disposition, 'UNKNOWN');
assert.ok(packetProjection.reasonCodes.includes(PACKET_PROJECTION_REASON_CODES.INTERACTION_STAGE_SECTION_MISSING));


packetProjection = classifyPacketProjection(packetFixture('**State: IN_PROGRESS / REVIEW**'));
assert.equal(packetProjection.disposition, 'CONFLICT');
assert.ok(packetProjection.reasonCodes.includes(PACKET_PROJECTION_REASON_CODES.PACKET_LIFECYCLE_CONFLICT));

const duplicateState = [
  '<!-- canonical-main-work-packet:v1 -->',
  '',
  '**State: READY**',
  '',
  '## State',
  'READY',
  '',
  '## Interaction stage',
  '',
  '- Current stage: `AUTHORITY_SCOPE`',
].join('\n');
packetProjection = classifyPacketProjection(duplicateState);
assert.equal(packetProjection.disposition, 'CONFLICT');
assert.ok(packetProjection.reasonCodes.includes(PACKET_PROJECTION_REASON_CODES.STATE_PROJECTION_DUPLICATE));

packetProjection = classifyPacketProjection(packetFixture('**State: READY**').replace('<!-- canonical-main-work-packet:v1 -->', ''));
assert.equal(packetProjection.disposition, 'UNKNOWN');
assert.ok(packetProjection.reasonCodes.includes(PACKET_PROJECTION_REASON_CODES.PACKET_MARKER_MISSING));

packetProjection = classifyPacketProjection(`<!-- canonical-main-work-packet:v1 -->\n${packetFixture('**State: READY**')}`);
assert.equal(packetProjection.disposition, 'CONFLICT');
assert.ok(packetProjection.reasonCodes.includes(PACKET_PROJECTION_REASON_CODES.PACKET_MARKER_DUPLICATE));

const packetProjectionPath = path.join(dir, 'packet-projection.cjs');
function runPacketProjectionCli(body) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'packet-projection-cli-'));
  const bodyFile = path.join(temp, 'packet.md');
  try {
    fs.writeFileSync(bodyFile, body, 'utf8');
    const child = spawnSync(process.execPath, [
      packetProjectionPath, '--body-file', bodyFile,
    ], {encoding: 'utf8'});
    return {status: child.status, output: JSON.parse(child.stdout)};
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
}
let cliProjection = runPacketProjectionCli(packetFixture('**State: READY**'));
assert.equal(cliProjection.status, 0);
assert.equal(cliProjection.output.disposition, 'PASS');
assert.equal(cliProjection.output.lifecycle, 'READY');

cliProjection = runPacketProjectionCli(packetFixture('**State: ACTIVE / AUTHORITY_SCOPE**'));
assert.equal(cliProjection.status, 3);
assert.equal(cliProjection.output.disposition, 'UNKNOWN');
assert.ok(cliProjection.output.reasonCodes.includes(
  PACKET_PROJECTION_REASON_CODES.PACKET_LIFECYCLE_UNKNOWN));

cliProjection = runPacketProjectionCli(packetFixture('**State: IN_PROGRESS / READY**'));
assert.equal(cliProjection.status, 2);
assert.equal(cliProjection.output.disposition, 'CONFLICT');
assert.ok(cliProjection.output.reasonCodes.includes(
  PACKET_PROJECTION_REASON_CODES.PACKET_LIFECYCLE_CONFLICT));

cliProjection = runPacketProjectionCli(stageOnly);
assert.equal(cliProjection.status, 3);
assert.equal(cliProjection.output.disposition, 'UNKNOWN');
assert.ok(cliProjection.output.reasonCodes.includes(
  PACKET_PROJECTION_REASON_CODES.PACKET_LIFECYCLE_UNKNOWN));

assert.match(packetProjectionSource, /require\('\.\/policy\.json'\)/);
assert.match(packetProjectionSource, /--body-file/);
assert.match(packetProjectionSource, /MAX_BODY_BYTES/);
assert.doesNotMatch(packetProjectionSource, /child_process|https?:\/\/|gh\s+api|fetch\s*\(/);
assert.doesNotMatch(packetProjectionSource, /issueState|nativeState/);
assert.doesNotMatch(packetProjectionSource, /writeFile|appendFile|createWriteStream/);
assert.match(readme, /Lifecycle `State` and `Interaction stage` are separate packet axes/);
assert.match(readme, /Stage-only State prose never implies/);
assert.match(readme, /packet-projection\.cjs/);
assert.match(readme, /Packet producers must run this same projection before creating a canonical work-packet issue or publishing a packet-body update/);
assert.match(readme, /does not intercept every GitHub issue-creation surface/);
assert.match(readme, /coordination-body-patch\.cjs/);
assert.match(readme, /post-patch candidate body/);
assert.match(readme, /malformed packet can still be repaired/);
assert.match(template, /Preserve exactly one canonical lifecycle token/);
assert.match(template, /Do not replace lifecycle State with stage-only prose/);
assert.match(template, /Before creating a canonical work-packet issue or publishing a packet-body update/);
assert.match(template, /packet-authoring-preflight\.cjs --body-file/);
assert.match(template, /does not claim to intercept every external GitHub issue-creation surface/);
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
const intraStage = policy.stagedInteraction.intraStageContinuation;
assert.equal(intraStage.version, 1);
assert.equal(intraStage.completedStageDiscoveryConsumesBudget, false);
assert.equal(intraStage.preserveProvenPrefix, true);
assert.equal(intraStage.reconvergeInvalidatedSuffixOnly, true);
assert.equal(intraStage.requiredSelfCloseSyncIsStageLocal, true);
assert.equal(intraStage.preEffectDriftRevalidatesAdmissionOnly, true);
assert.equal(intraStage.postEffectDriftRequiresPreservationProof, true);
assert.equal(intraStage.duplicateCompletedEffectForbidden, true);
assert.deepEqual(intraStage.transientReadRetry, {
  sameIdentityRequired: true,
  ownerPermissionRequired: true,
  bounded: true,
  untilPassForbidden: true,
});
assert.deepEqual(intraStage.sameScopeRefinementExactIdentityAxes, [
  'writeScopes',
  'semanticEffectSurfaces',
  'primaryGoal',
  'effectOwner',
]);
assert.deepEqual(intraStage.transactionClosure, {
  immediateEffectReadback: true,
  requiredEffectValidation: true,
  idempotenceOrCasConfirmation: true,
  requiredEvidencePublication: true,
  requiredSelfCloseSync: true,
  mayEnterNextSubstantialStage: false,
});
assert.deepEqual(intraStage.continueDispositions, [
  'CONTINUE_STAGE_LOCAL',
  'CONTINUE_TRANSACTION_CLOSURE',
  'CONTINUE_BOUNDED_WAIT',
  'CONTINUE_TARGETED_DRILLDOWN',
  'CONTINUE_REUSE_EXISTING_EFFECT',
  'CONTINUE_RECONVERGE_CURRENTNESS',
]);
assert.deepEqual(intraStage.stopDispositions, [
  'STOP_MAJOR_STAGE',
  'STOP_OWNER_HANDOFF',
  'STOP_SCOPE_EXPANSION',
  'STOP_AUTHORITY_EXPANSION',
  'STOP_USER_INPUT',
  'STOP_BLOCKED',
  'STOP_UNKNOWN',
  'STOP_CONFLICT',
  'STOP_UNBOUNDED_EXTERNAL_WAIT',
  'STOP_TERMINAL',
]);
assert.equal(new Set(intraStage.continueDispositions).size, intraStage.continueDispositions.length);
assert.equal(new Set(intraStage.stopDispositions).size, intraStage.stopDispositions.length);
assert.deepEqual(intraStage.unresolvedStatesStop, ['BLOCKED', 'UNKNOWN', 'CONFLICT']);
assert.equal(intraStage.noNewEffectAuthority, true);
assert.equal(intraStage.noStageCollapse, true);
assert.ok(policy.packetRequiredFields.includes('interactionStage'));

assert.deepEqual(policy.queueProjection.liveHealthAuthorities, ['direct-main', 'issue-485']);
assert.equal(policy.queueProjection.liveHealthMode, 'pointer-only');
assert.equal(policy.queueProjection.duplicateLiveMainSha, false);
assert.equal(policy.queueProjection.duplicateRequiredState, false);
assert.equal(policy.queueProjection.duplicateProductionState, false);
assert.equal(policy.queueProjection.duplicateNativeProtectionState, false);
assert.equal(policy.queueProjection.allowHistoricalSynchronizationSha, true);
assert.equal(policy.queueProjection.historicalSynchronizationShaMustBeLabeled, true);
assert.equal(policy.queueProjection.humanFacingSurfaceAvailabilityLabel, 'Queue surface: ENABLED');
assert.equal(policy.queueProjection.surfaceAvailabilityImpliesActiveWriter, false);
assert.equal(policy.queueProjection.minHumanFacingMutableActiveWriterProjections, 0);
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
assert.match(readme, /`Queue surface: ENABLED` is the canonical modern availability label/);
assert.match(readme, /active-writer projection cardinality is `0\.\.1`/);
assert.match(readme, /zero projected writers is valid/);
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
assert.match(template, /Phase 8\.7g intra-stage continuation interprets that ordinary budget as the one substantial stage actually performed after fresh durable rebind/);
assert.match(template, /Discovering that an advertised earlier stage is already complete consumes zero current stage budget/);
assert.match(template, /reconverge only the stale or incomplete suffix/);
assert.match(template, /Required immediate effect readback, current-stage validation, idempotence\/CAS confirmation, evidence publication, and required current-packet self close-sync may remain one stage-local transaction closure/);
assert.match(template, /They never authorize entry into the next declared substantial stage/);
assert.match(template, /retry-until-PASS is forbidden/);
assert.match(template, /exact equality of writable path\/prefix set, semantic\/effect surface set, primary goal, and effect owner/);
assert.match(template, /unresolved `BLOCKED \/ UNKNOWN \/ CONFLICT` stops the continuation/);
assert.match(template, /Finalization routing is declared at AUTHORITY_SCOPE rather than repaired after merge/);
assert.match(template, /generic repository-neutral validation finalizer must declare one specific stable `surface:repo:<owner-or-effect>`/);
assert.match(template, /intentionally path-only packet may instead use a separately reviewed finalization owner/);
assert.match(template, /`validation-finalization-external-owner-reviewed=PASS` with a real evidence locator/);
assert.match(template, /do not invent a fake surface/);
assert.match(sharedInteraction, /## Intra-stage continuation \(Phase 8\.7g\)/);
assert.match(sharedInteraction, /Already-completed stages discovered during that rebind consume zero current substantial-stage budget/);
assert.match(sharedInteraction, /preserve every still-valid proven prefix and completed effect/);
assert.match(sharedInteraction, /Before an effect, drift reconverges admission\. After an effect, drift proves preservation/);
assert.match(sharedInteraction, /Retry-until-PASS is forbidden/);
assert.match(sharedInteraction, /writable path\/prefix set, semantic\/effect surface set, primary-goal identity, and effect-owner identity are all exactly unchanged/);
assert.match(sharedInteraction, /Transaction closure may not enter the next declared substantial stage/);
assert.match(sharedInteraction, /`VALIDATION_MERGE` may include expected-head merge plus immediate merge attribution\/readback and its stage checkpoint, but merged-main convergence\/Required\/postmerge acceptance belongs to `POSTMERGE_CONVERGENCE`/);
assert.match(sharedInteraction, /Cross-packet terminal projection, cleanup, or convergence is outside Phase 8\.7g/);
for (const disposition of [...intraStage.continueDispositions, ...intraStage.stopDispositions]) {
  assert.ok(sharedInteraction.includes(`${disposition}`), disposition);
}
assert.match(sharedInteraction, /These dispositions describe interaction pacing only/);
assert.match(sharedInteraction, /Existing effect\/recovery owners and every existing authority\/gate remain unchanged/);
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
assert.match(readme, /reserved self-coordination surface for faithful lifecycle bookkeeping/);
assert.match(readme, /separate from implementation\/effect write scope/);
assert.match(readme, /MUST NOT change the primary goal, add\/remove\/weaken acceptance criteria, widen or reinterpret implementation\/effect write scope/);
assert.match(readme, /Native GitHub closure remains downstream of evidence-backed terminal body reconciliation and never proves `DONE` by itself/);
assert.match(readme, /reserved self surface is not emitted into or inferred from write-scope overlap classification/);
assert.ok(template.includes("reserved self-bookkeeping surface for faithful lifecycle State"));
assert.ok(template.includes("cannot change the primary goal, acceptance, external write scope, or evidence to manufacture completion"));
assert.ok(template.includes("does not gain an implicit self-issue token"));
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
const {classifyCoordinationReferences, REASON_CODES: COORD_REF_REASON_CODES} = require(path.join(dir, 'coordination-reference-hygiene.cjs'));
const {extractPacketScopes, resolveScopeOverlap, REASON_CODES: OVERLAP_REASON_CODES} = require(path.join(dir, 'scope-overlap.cjs'));
const {classifyPrActivity, REASON_CODES: PR_ACTIVITY_REASON_CODES} = require(path.join(dir, 'pr-activity.cjs'));
const {classifyPacketActivity, REASON_CODES: PACKET_ACTIVITY_REASON_CODES} = require(path.join(dir, 'packet-activity.cjs'));

const pointerOnlyFixture = `# Canonical Main — Work Queue
**Queue surface: ENABLED**
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

const zeroWriterFixture = pointerOnlyFixture.replace('\n- Active writer: #2278 CM-WQ-HYGIENE-V1-01', '');
const zeroWriterResult = classifyQueueBody(zeroWriterFixture);
assert.equal(zeroWriterResult.state, 'PASS');
assert.equal(zeroWriterResult.activeWriterProjectionCount, 0);
assert.deepEqual(zeroWriterResult.findings, []);

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

const oldModernLabelResult = classifyQueueBody(pointerOnlyFixture.replace(
  '**Queue surface: ENABLED**',
  '**Queue state: ACTIVE**',
));
assert.equal(oldModernLabelResult.state, 'WARN');
assert.equal(oldModernLabelResult.activeWriterProjectionCount, 1);
assert.ok(oldModernLabelResult.findings.some((item) => item.code === REASON_CODES.AMBIGUOUS_QUEUE_STATE_LABEL));

const legacyQueueLabelResult = classifyQueueBody(pointerOnlyFixture.replace(
  '**Queue surface: ENABLED**',
  '**Queue state: ACTIVE / CANONICAL-MAIN-V1.2**',
));
assert.equal(legacyQueueLabelResult.state, 'PASS');
assert.equal(legacyQueueLabelResult.findings.some((item) => item.code === REASON_CODES.AMBIGUOUS_QUEUE_STATE_LABEL), false);

assert.match(readme, /## #465 pointer-only hygiene classifier/);
assert.match(readme, /`PASS \/ WARN \/ FAIL \/ UNKNOWN`/);
assert.match(readme, /never fetches GitHub and never mutates #465/);
assert.match(readme, /clearly labeled historical synchronization\/packet evidence remains allowed/i);
assert.match(readme, /exact standalone old modern label `Queue state: ACTIVE` is a non-blocking naming `WARN`/i);

const terminalPacket = {issueNumber: 2340, nativeState: 'closed', lifecycleState: 'DONE'};
const activePacket = {issueNumber: 2342, nativeState: 'open', lifecycleState: 'IN_PROGRESS'};
const classifyRefs = (prose, packets = [terminalPacket, activePacket]) => classifyCoordinationReferences({prose, packets});

const staleRef = classifyRefs('- Active writer: #2340 payload identity packet');
assert.equal(staleRef.state, 'STALE');
assert.equal(staleRef.findings[0].code, COORD_REF_REASON_CODES.TERMINAL_PACKET_IN_CURRENT_ROLE);
assert.equal(staleRef.findings[0].role, 'ACTIVE_WRITER');
assert.equal(staleRef.findings[0].line, 1);
assert.ok(staleRef.findings[0].excerpt.length <= 240);
assert.equal(staleRef.mutationAuthorized, false);
assert.equal(staleRef.networkAuthorized, false);

for (const prose of [
  '- Latest completed packet: #2340 payload identity packet',
  '- Historical packet #2340 remains useful evidence',
  '- Legacy #2340 reference is retained for context',
]) {
  const result = classifyRefs(prose);
  assert.equal(result.state, 'PASS');
  assert.equal(result.findings[0].disposition, 'PASS');
}

assert.equal(classifyRefs('- Current packet: #2342 coordination reference hygiene').state, 'PASS');
assert.equal(classifyRefs('- #2340 exists in this sentence but has no supported role').state, 'PASS');

const mixedRoleRef = classifyRefs('- Current packet: #2342 replaces previous #2340');
assert.equal(mixedRoleRef.state, 'PASS');
assert.deepEqual(mixedRoleRef.findings.map((item) => item.issueNumber), [2342]);
const historicalWriterRef = classifyRefs('- Historical active writer: #2340');
assert.equal(historicalWriterRef.state, 'PASS');
assert.equal(historicalWriterRef.findings[0].role, 'HISTORICAL');
assert.equal(classifyRefs('- Coordination blocker: #2346', [
  {issueNumber: 2346, nativeState: 'open', lifecycleState: 'BLOCKED'},
]).state, 'PASS');
assert.throws(() => classifyRefs('- Current packet: #2347', [
  {issueNumber: 2347, nativeState: 'open', lifecycleState: 'MYSTERY'},
]), /registered Work System state/);

const unknownRef = classifyRefs('- Next packet: #999 missing evidence');
assert.equal(unknownRef.state, 'UNKNOWN');
assert.equal(unknownRef.findings[0].code, COORD_REF_REASON_CODES.CURRENT_PACKET_EVIDENCE_MISSING);

const conflictRef = classifyRefs('- Coordination blocker: #2343 inconsistent packet', [
  {issueNumber: 2343, nativeState: 'open', lifecycleState: 'DONE'},
]);
assert.equal(conflictRef.state, 'CONFLICT');
assert.equal(conflictRef.findings[0].code, COORD_REF_REASON_CODES.PACKET_NATIVE_LIFECYCLE_CONFLICT);

const missingLifecycle = classifyRefs('- Current owner: #2344 owner', [
  {issueNumber: 2344, nativeState: 'open'},
]);
assert.equal(missingLifecycle.state, 'UNKNOWN');
assert.equal(missingLifecycle.findings[0].code, COORD_REF_REASON_CODES.PACKET_LIFECYCLE_EVIDENCE_MISSING);

const precedenceRef = classifyRefs([
  '- Next candidate: #2340 stale candidate',
  '- Current owner: #2345 conflict owner',
].join('\n'), [terminalPacket, {issueNumber: 2345, nativeState: 'closed', lifecycleState: 'IN_PROGRESS'}]);
assert.equal(precedenceRef.state, 'CONFLICT');
assert.equal(precedenceRef.findings.length, 2);
assert.ok(precedenceRef.findings.every((item) => item.excerpt.length <= 240));

assert.match(readme, /## Cross-surface packet-reference hygiene classifier/);
assert.match(readme, /`PASS \/ STALE \/ UNKNOWN \/ CONFLICT`/);
assert.match(readme, /does not fetch GitHub and never mutates coordination surfaces/);
assert.match(readme, /terminal packet is not stale merely because it is referenced historically/i);


const overlapPacketBodyWithHeading = (state, heading, scopes) => `<!-- canonical-main-work-packet:v1 -->
## State
\`${state}\`
## ${heading}
${scopes.map((scope, index) => `${index + 1}. \`${scope}\``).join('\n')}
## Handoff
fixture`;
const overlapPacketBody = (state, scopes) => overlapPacketBodyWithHeading(state, 'Bounded write scope', scopes);
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

const packetActivityEvidence = (relationship, overrides = {}) => ({
  schemaVersion: 1,
  mode: 'WORK_SYSTEM_PACKET_ACTIVITY_EVIDENCE',
  candidateRef: '#20',
  requesterRef: '#21',
  relationship,
  repositoryMutationActive: false,
  activeLease: false,
  overlappingOpenPr: false,
  sequencingExplicit: true,
  sourceRefs: ['issue:#20', 'issue:#21'],
  ...overrides,
});

for (const relationship of [
  'DEFERRED_OWNER',
  'BLOCKED_PREDECESSOR',
  'PARENT_WAITING_ON_SUCCESSOR',
]) {
  const activity = classifyPacketActivity({
    candidateRef: '#20',
    requesterRef: '#21',
    evidence: packetActivityEvidence(relationship),
  });
  assert.equal(activity.state, 'NONBLOCKING_PROVEN');
  assert.equal(activity.reasonCode, PACKET_ACTIVITY_REASON_CODES.NONCOMPETING_RELATION_PROVEN);

  const composed = resolveScopeOverlap({
    requesterRef: '#21',
    requestedScopes: ['path:src/demo.js'],
    discovery: 'COMPLETE',
    candidates: [{
      type: 'packet',
      ref: '#20',
      issueState: 'open',
      body: overlapPacketBody('BLOCKED', ['path:src/**']),
      packetActivityEvidence: packetActivityEvidence(relationship),
    }],
  });
  assert.equal(composed.state, 'DISJOINT');
  assert.equal(composed.candidateActivity[0].state, 'NONBLOCKING_PROVEN');
}

assert.equal(resolveOverlap(['path:src/demo.js'], [{
  type: 'packet', ref: '#20', issueState: 'open',
  body: overlapPacketBody('BLOCKED', ['path:src/**']),
}]).state, 'OVERLAP');

const validationDiscoveryPacketActivity = resolveScopeOverlap({
  requesterRef: '#21',
  requestedScopes: ['path:src/demo.js'],
  discovery: 'COMPLETE',
  candidates: [{
    type: 'packet', ref: 'issue:#20', issueState: 'open',
    body: overlapPacketBody('BLOCKED', ['path:src/**']),
    packetActivityEvidence: packetActivityEvidence('PARENT_WAITING_ON_SUCCESSOR'),
  }],
});
assert.equal(validationDiscoveryPacketActivity.state, 'DISJOINT');
assert.equal(validationDiscoveryPacketActivity.candidateActivity[0].state, 'NONBLOCKING_PROVEN');
assert.equal(validationDiscoveryPacketActivity.candidateActivity[0].candidateRef, '#20');

for (const malformedRef of ['issue:20', 'issue:#0', 'issue:#x', 'issue:issue:#20']) {
  const malformedActivityRef = resolveScopeOverlap({
    requesterRef: '#21',
    requestedScopes: ['path:src/demo.js'],
    discovery: 'COMPLETE',
    candidates: [{
      type: 'packet', ref: malformedRef, issueState: 'open',
      body: overlapPacketBody('BLOCKED', ['path:src/**']),
      packetActivityEvidence: packetActivityEvidence('PARENT_WAITING_ON_SUCCESSOR'),
    }],
  });
  expectOverlapFinding(
    malformedActivityRef, 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_ACTIVITY_UNKNOWN);
  assert.equal(malformedActivityRef.findings[0].ownerRef, malformedRef);
  assert.equal(malformedActivityRef.candidateActivity[0].reasonCode,
    PACKET_ACTIVITY_REASON_CODES.INPUT_INVALID);
}

for (const [overrides, expectedReason, expectedState] of [
  [{candidateRef: '#22'}, PACKET_ACTIVITY_REASON_CODES.CANDIDATE_IDENTITY_CONFLICT, 'CONFLICT'],
  [{requesterRef: '#22'}, PACKET_ACTIVITY_REASON_CODES.REQUESTER_IDENTITY_CONFLICT, 'CONFLICT'],
  [{relationship: 'ARBITRARY_PROSE'}, PACKET_ACTIVITY_REASON_CODES.RELATIONSHIP_UNSUPPORTED, 'UNKNOWN'],
  [{sequencingExplicit: false}, PACKET_ACTIVITY_REASON_CODES.EXPLICIT_SEQUENCING_UNPROVEN, 'UNKNOWN'],
]) {
  const activity = classifyPacketActivity({
    candidateRef: '#20', requesterRef: '#21',
    evidence: packetActivityEvidence('DEFERRED_OWNER', overrides),
  });
  assert.equal(activity.state, expectedState);
  assert.equal(activity.reasonCode, expectedReason);
}

for (const [field, reason] of [
  ['repositoryMutationActive', PACKET_ACTIVITY_REASON_CODES.REPOSITORY_MUTATION_ACTIVE],
  ['activeLease', PACKET_ACTIVITY_REASON_CODES.ACTIVE_LEASE_PRESENT],
  ['overlappingOpenPr', PACKET_ACTIVITY_REASON_CODES.OVERLAPPING_OPEN_PR_PRESENT],
]) {
  const activity = classifyPacketActivity({
    candidateRef: '#20', requesterRef: '#21',
    evidence: packetActivityEvidence('DEFERRED_OWNER', {[field]: true}),
  });
  assert.equal(activity.state, 'ACTIVE_WRITER');
  assert.equal(activity.reasonCode, reason);
}

const missingRefs = classifyPacketActivity({
  candidateRef: '#20', requesterRef: '#21',
  evidence: packetActivityEvidence('DEFERRED_OWNER', {sourceRefs: []}),
});
assert.equal(missingRefs.state, 'UNKNOWN');
assert.equal(missingRefs.reasonCode, PACKET_ACTIVITY_REASON_CODES.SOURCE_REFS_MISSING);

const activityUnknownOverlap = resolveScopeOverlap({
  requesterRef: '#21',
  requestedScopes: ['path:src/demo.js'],
  discovery: 'COMPLETE',
  candidates: [{
    type: 'packet', ref: '#20', issueState: 'open',
    body: overlapPacketBody('BLOCKED', ['path:src/**']),
    packetActivityEvidence: packetActivityEvidence('DEFERRED_OWNER', {sequencingExplicit: false}),
  }],
});
expectOverlapFinding(activityUnknownOverlap, 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_ACTIVITY_UNKNOWN);

const activityConflictOverlap = resolveScopeOverlap({
  requesterRef: '#21',
  requestedScopes: ['path:src/demo.js'],
  discovery: 'COMPLETE',
  candidates: [{
    type: 'packet', ref: '#20', issueState: 'open',
    body: overlapPacketBody('BLOCKED', ['path:src/**']),
    packetActivityEvidence: packetActivityEvidence('DEFERRED_OWNER', {candidateRef: '#22'}),
  }],
});
expectOverlapFinding(activityConflictOverlap, 'CONFLICT', OVERLAP_REASON_CODES.PACKET_ACTIVITY_CONFLICT);

const packetEvidenceDoesNotSuppressPr = resolveScopeOverlap({
  requesterRef: '#21',
  requestedScopes: ['path:src/demo.js'],
  discovery: 'COMPLETE',
  candidates: [
    {
      type: 'packet', ref: '#20', issueState: 'open',
      body: overlapPacketBody('BLOCKED', ['path:src/**']),
      packetActivityEvidence: packetActivityEvidence('BLOCKED_PREDECESSOR'),
    },
    {
      type: 'pr', ref: 'pr:#20', state: 'open', merged: false,
      headSha: 'a'.repeat(40), changedFiles: ['src/demo.js'], filesComplete: true,
    },
  ],
});
expectOverlapFinding(packetEvidenceDoesNotSuppressPr, 'OVERLAP', OVERLAP_REASON_CODES.WRITE_SCOPE_OVERLAP);

const onePacketProofDoesNotSuppressAnother = resolveScopeOverlap({
  requesterRef: '#21',
  requestedScopes: ['path:src/demo.js'],
  discovery: 'COMPLETE',
  candidates: [
    {
      type: 'packet', ref: '#20', issueState: 'open',
      body: overlapPacketBody('BLOCKED', ['path:src/**']),
      packetActivityEvidence: packetActivityEvidence('PARENT_WAITING_ON_SUCCESSOR'),
    },
    {
      type: 'packet', ref: '#22', issueState: 'open',
      body: overlapPacketBody('BLOCKED', ['path:src/**']),
    },
  ],
});
expectOverlapFinding(onePacketProofDoesNotSuppressAnother, 'OVERLAP', OVERLAP_REASON_CODES.WRITE_SCOPE_OVERLAP);

const requesterMissing = resolveScopeOverlap({
  requestedScopes: ['path:src/demo.js'],
  discovery: 'COMPLETE',
  candidates: [{
    type: 'packet', ref: '#20', issueState: 'open',
    body: overlapPacketBody('BLOCKED', ['path:src/**']),
    packetActivityEvidence: packetActivityEvidence('DEFERRED_OWNER'),
  }],
});
expectOverlapFinding(requesterMissing, 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_ACTIVITY_UNKNOWN);

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

for (const [heading, ref] of [
  ['Bounded IMPLEMENTATION_PR write scope', '#10c'],
  ['Repository write-scope ceiling used by IMPLEMENTATION_PR', '#10d'],
  ['Bounded repository write ceiling', '#10d2'],
]) {
  const packet = {
    type: 'packet', ref, issueState: 'open',
    body: overlapPacketBodyWithHeading('BLOCKED', heading, ['tools/repo-ci-mcp/**']),
  };
  assert.equal(resolveOverlap(['path:docs/README.md'], [packet]).state, 'DISJOINT');
  assert.equal(resolveOverlap(['path:tools/repo-ci-mcp/server.py'], [packet]).state, 'OVERLAP');
}

for (const heading of [
  'Bounded write scope',
  'Bounded implementation write scope',
  'Locked write scope',
  'Bounded IMPLEMENTATION_PR write scope',
  'Repository write-scope ceiling used by IMPLEMENTATION_PR',
  'Bounded repository write ceiling',
]) {
  const parsed = extractPacketScopes(overlapPacketBodyWithHeading(
    'IN_PROGRESS', heading, ['path:src/demo.js', 'surface:repo:demo']));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.scopes.map((row) => row.normalized), [
    'path:src/demo.js',
    'surface:repo:demo',
  ]);
}
const plainScopePacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  'IN_PROGRESS',
  '## Bounded write scope',
  '1. path:src/plain.js',
  '2. surface:repo:plain',
  '## Handoff',
  'fixture',
].join('\n');
assert.deepEqual(extractPacketScopes(plainScopePacket).scopes.map((row) => row.normalized), [
  'path:src/plain.js',
  'surface:repo:plain',
]);
assert.equal(extractPacketScopes(
  overlapPacketBodyWithHeading('IN_PROGRESS', 'Bounded write scopes', ['path:src/demo.js'])).ok, false);
const duplicateScopeSection = overlapPacketBody('IN_PROGRESS', ['path:src/a.js'])
  + '\n## Locked write scope\n1. `path:src/b.js`';
assert.equal(extractPacketScopes(duplicateScopeSection).conflict, true);
const invalidExportScope = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  'IN_PROGRESS',
  '## Bounded write scope',
  '1. `path:../secret`',
].join('\n');
assert.equal(extractPacketScopes(invalidExportScope).ok, false);

const labeledScopePacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  '`IN_PROGRESS`',
  '## Bounded IMPLEMENTATION_PR write scope',
  'Maximum expected paths:',
  '1. `src/one.js` (new)',
  '- `src/two.js` only when required',
  'Scope ceiling: `path:src/**`',
  'Semantic/effect surface: `surface:repo:labeled`',
  '## Handoff',
  'fixture',
].join('\n');
assert.deepEqual(extractPacketScopes(labeledScopePacket).scopes.map((row) => row.normalized), [
  'path:src/one.js',
  'path:src/two.js',
  'path:src/**',
  'surface:repo:labeled',
]);

const nonEffectBoundaryPacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  '`IN_PROGRESS`',
  '## Bounded write scope',
  '- `path:src/write.js`',
  '### Explicit non-write / non-effect scope',
  '- `path:src/read-only.js`',
  '## Handoff',
  'fixture',
].join('\n');
assert.deepEqual(extractPacketScopes(nonEffectBoundaryPacket).scopes.map((row) => row.normalized), [
  'path:src/write.js',
]);

const forbiddenLabelPacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  '`IN_PROGRESS`',
  '## Bounded write scope',
  '- `surface:issue:2215` — coordination only',
  'Forbidden:',
  '- `tsconfig.json`',
  '## Handoff',
  'fixture',
].join('\n');
assert.deepEqual(extractPacketScopes(forbiddenLabelPacket).scopes.map((row) => row.normalized), [
  'surface:issue:2215',
]);


const explicitNonWritePacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  '`IN_PROGRESS`',
  '## Bounded implementation write scope',
  '1. `path:src/write.js`',
  '### Explicit non-write / preservation scope',
  'Do not modify:',
  '- `path:src/read-only.js`',
  '## Handoff',
  'fixture',
].join('\n');
assert.deepEqual(extractPacketScopes(explicitNonWritePacket).scopes.map((row) => row.normalized), [
  'path:src/write.js',
]);

const doNotModifyPacket = overlapPacketBody('IN_PROGRESS', ['path:src/write.js'])
  .replace('## Handoff', 'Do not modify:\n- `path:src/read-only.js`\n## Handoff');
assert.deepEqual(extractPacketScopes(doNotModifyPacket).scopes.map((row) => row.normalized), [
  'path:src/write.js',
]);

const proseTokenPacket = overlapPacketBody('IN_PROGRESS', ['path:src/write.js'])
  .replace('## Handoff',
    'Existing `path:src/read-only.js` is validation-only / out of scope.\n## Handoff');
assert.deepEqual(extractPacketScopes(proseTokenPacket).scopes.map((row) => row.normalized), [
  'path:src/write.js',
]);

const describedListPacket = overlapPacketBodyWithHeading('IN_PROGRESS', 'Bounded write scope', [])
  .replace('## Handoff', '1. `path:src/described.js` — primary file\n## Handoff');
assert.deepEqual(extractPacketScopes(describedListPacket).scopes.map((row) => row.normalized), [
  'path:src/described.js',
]);

for (const fence of ['```', '~~~']) {
  const fencedHeadingPacket = [
    '<!-- canonical-main-work-packet:v1 -->',
    '## State',
    '`IN_PROGRESS`',
    '## Bounded write scope',
    '1. `path:src/live.js`',
    `${fence}md`,
    '## Locked write scope',
    '1. `path:src/example.js`',
    fence,
    '## Handoff',
    'fixture',
  ].join('\n');
  assert.deepEqual(extractPacketScopes(fencedHeadingPacket).scopes.map((row) => row.normalized), [
    'path:src/live.js',
  ]);
}

const fencedNonWritePacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  '`IN_PROGRESS`',
  '## Bounded write scope',
  '1. `path:src/first.js`',
  '```md',
  '### Explicit non-write / preservation scope',
  'Do not modify:',
  '- `path:src/example.js`',
  '```',
  '2. `path:src/second.js`',
  '## Handoff',
  'fixture',
].join('\n');
assert.deepEqual(extractPacketScopes(fencedNonWritePacket).scopes.map((row) => row.normalized), [
  'path:src/first.js',
  'path:src/second.js',
]);

const unclosedFencePacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  '`IN_PROGRESS`',
  '## Bounded write scope',
  '1. `path:src/live.js`',
  '```md',
  '## Locked write scope',
  '1. `path:src/example.js`',
].join('\n');
const unclosedFenceResult = extractPacketScopes(unclosedFencePacket);
assert.equal(unclosedFenceResult.ok, false);
assert.equal(unclosedFenceResult.conflict, false);
assert.match(unclosedFenceResult.reason, /unclosed Markdown fence/);

const standaloneScopePacket = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  '`IN_PROGRESS`',
  '## Bounded write scope',
  '`path:src/standalone.js`',
  'surface:repo:standalone',
  '## Handoff',
  'fixture',
].join('\n');
assert.deepEqual(extractPacketScopes(standaloneScopePacket).scopes.map((row) => row.normalized), [
  'path:src/standalone.js',
  'surface:repo:standalone',
]);

assert.match(scopeOverlapSource,
  /module\.exports = \{REASON_CODES, extractPacketScopes, normalizeScope, scopesOverlap, resolveScopeOverlap\};/);

const repositoryWriteCeilingPaths = [
  'products/chatgpt-mobile-coder-lab/device-ops/rdc-termux/runtime-env-forward-shim.cjs',
  'products/chatgpt-mobile-coder-lab/device-ops/rdc-termux/install.sh',
  'products/chatgpt-mobile-coder-lab/device-ops/rdc-termux/verify.sh',
  'products/chatgpt-mobile-coder-lab/device-ops/rdc-termux/tests/test-rdc-termux-contract.sh',
  'products/chatgpt-mobile-coder-lab/device-ops/rdc-termux/README.md',
];
const repositoryWriteCeilingPacket = {
  type: 'packet', ref: '#2562-fixture', issueState: 'open',
  body: `<!-- canonical-main-work-packet:v1 -->
## State
\`READY\`
## Bounded repository write ceiling
Maximum expected source paths:
${repositoryWriteCeilingPaths.map((scope, index) => `${index + 1}. \`${scope}\``).join('\n')}
Do not touch unless fresh evidence proves required:
- \`device-name-shim.cjs\`
- \`which-rg-shim.sh\`
## Handoff
fixture`,
};
assert.equal(resolveOverlap(['path:unrelated/example.txt'], [repositoryWriteCeilingPacket]).state, 'DISJOINT');
for (const scope of repositoryWriteCeilingPaths) {
  assert.equal(resolveOverlap([`path:${scope}`], [repositoryWriteCeilingPacket]).state, 'OVERLAP');
}
assert.equal(resolveOverlap(['path:device-name-shim.cjs'], [repositoryWriteCeilingPacket]).state, 'DISJOINT');

const repositoryWriteCeilingConflict = `${repositoryWriteCeilingPacket.body}
## Locked write scope
1. \`tools/**\``;
expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#2562-conflict', issueState: 'open', body: repositoryWriteCeilingConflict,
}]), 'CONFLICT', OVERLAP_REASON_CODES.PACKET_SCOPE_UNRESOLVED);

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#2562-near-match', issueState: 'open',
  body: overlapPacketBodyWithHeading('READY', 'Bounded repository write ceilings', ['docs/**']),
}]), 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_SCOPE_UNRESOLVED);

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#2562-invalid-scope', issueState: 'open',
  body: overlapPacketBodyWithHeading('READY', 'Bounded repository write ceiling', ['../secret']),
}]), 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_SCOPE_UNRESOLVED);

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#2562-lifecycle-unknown', issueState: 'open',
  body: overlapPacketBodyWithHeading(
    'AUTHORITY_SCOPE COMPLETE / IMPLEMENTATION_PR NEXT / NO LIVE DEVICE EFFECT AUTHORITY',
    'Bounded repository write ceiling',
    ['docs/**'],
  ),
}]), 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_STATE_UNRESOLVED);

assert.equal(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#2562-terminal', issueState: 'open',
  body: overlapPacketBodyWithHeading('DONE', 'Bounded repository write ceiling', ['docs/**']),
}]).state, 'DISJOINT');

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#10e', issueState: 'open',
  body: overlapPacketBodyWithHeading('IN_PROGRESS', 'Implementation write scope', ['docs/**']),
}]), 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_SCOPE_UNRESOLVED);

const competingScopeSections = `${overlapPacketBody('IN_PROGRESS', ['docs/**'])}\n## Locked write scope\n1. \`tools/**\``;
expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#10f', issueState: 'open', body: competingScopeSections,
}]), 'CONFLICT', OVERLAP_REASON_CODES.PACKET_SCOPE_UNRESOLVED);

expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#10g', issueState: 'open',
  body: overlapPacketBodyWithHeading('IN_PROGRESS', 'Bounded IMPLEMENTATION_PR write scope', ['../secret']),
}]), 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_SCOPE_UNRESOLVED);

for (const [state, ref] of [
  ['AUTHORITY_SCOPE NEXT / NO INSTALL OR VENDOR-MUTATION AUTHORITY YET', '#10h'],
  ['AUTHORITY_SCOPE COMPLETE / IMPLEMENTATION_PR NEXT / NO DEVICE OR SESSION MUTATION', '#10i'],
]) {
  expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
    type: 'packet', ref, issueState: 'open',
    body: overlapPacketBodyWithHeading(state, 'Repository write-scope ceiling used by IMPLEMENTATION_PR', ['docs/**']),
  }]), 'UNKNOWN', OVERLAP_REASON_CODES.PACKET_STATE_UNRESOLVED);
}

const lifecycleConflictPacket = overlapPacketBody('IN_PROGRESS / REVIEW', ['docs/**']);
expectOverlapFinding(resolveOverlap(['path:docs/README.md'], [{
  type: 'packet', ref: '#10j', issueState: 'open', body: lifecycleConflictPacket,
}]), 'CONFLICT', OVERLAP_REASON_CODES.PACKET_STATE_UNRESOLVED);

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

const repoClassifiedDisjointPacket = {
  type: 'packet', ref: '#14a', issueState: 'open', classification: 'scope:repo',
  body: overlapPacketBody('IN_PROGRESS', ['path:docs/repo-common-a.md']),
};
assert.equal(resolveScopeOverlap({
  requestedScopes: ['path:tools/repo-common-b.cjs'],
  discovery: 'COMPLETE',
  classification: 'scope:repo',
  candidates: [repoClassifiedDisjointPacket],
}).state, 'DISJOINT');

const semanticSurfacePacket = {
  type: 'packet', ref: '#14b', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', [
    'path:docs/repo-common-a.md',
    'surface:work-system:scope-overlap-contract',
  ]),
};
assert.equal(resolveOverlap(['path:tools/repo-common-b.cjs'], [semanticSurfacePacket]).state, 'DISJOINT');
expectOverlapFinding(resolveOverlap([
  'path:tools/repo-common-b.cjs',
  'surface:work-system:scope-overlap-contract',
], [semanticSurfacePacket]), 'OVERLAP', OVERLAP_REASON_CODES.WRITE_SCOPE_OVERLAP);
assert.equal(resolveOverlap([
  'path:tools/repo-common-b.cjs',
  'surface:work-system:write-scope-authoring-contract',
], [semanticSurfacePacket]).state, 'DISJOINT');
assert.equal(resolveOverlap(['surface:mcl-landing-origin-main:S'], [{
  type: 'packet', ref: '#14c', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['surface:mcl-landing-origin-main:S']),
}]).state, 'OVERLAP');
expectOverlapFinding(
  resolveOverlap(['surface:repo:*'], [disjointPacket]),
  'UNKNOWN',
  OVERLAP_REASON_CODES.REQUESTED_SCOPE_INVALID,
);

const reservedSelfPacket = {
  type: 'packet', ref: '#2410', issueState: 'open',
  body: overlapPacketBody('IN_PROGRESS', ['path:docs/**']),
};
assert.equal(resolveOverlap(['surface:issue:2410'], [reservedSelfPacket]).state, 'DISJOINT');

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
assert.match(scopeOverlapSource, /require\('\.\/packet-projection\.cjs'\)/);
assert.doesNotMatch(scopeOverlapSource, /function extractPacketState/);
assert.doesNotMatch(scopeOverlapSource, /const PACKET_STATES/);
assert.match(readme, /`Bounded IMPLEMENTATION_PR write scope`/);
assert.match(readme, /`Repository write-scope ceiling used by IMPLEMENTATION_PR`/);
assert.match(readme, /`Bounded repository write ceiling`/);
assert.match(readme, /`Do not touch unless fresh evidence proves required:`/);
assert.match(readme, /There is no fuzzy heading\/prose scan/);
assert.equal((scopeOverlapSource.match(/'Bounded repository write ceiling'/g) || []).length, 1);
assert.match(scopeOverlapSource, /Do not touch unless fresh evidence proves required:/);
assert.match(readme, /multiple recognized sections are `CONFLICT`/);
assert.match(readme, /missing, unsupported, malformed, or invalid scope evidence remains `UNKNOWN`/);
assert.match(readme, /classification is routing\/context metadata only/);
assert.match(readme, /do not become implicit path\/surface scopes, locks, leases, or mutation authority/);
assert.match(readme, /surface:<owning-domain>:<stable-owner-or-effect>/);
assert.match(readme, /surface:repo:common/);
assert.match(readme, /preserve `UNKNOWN` or `CONFLICT` instead of inventing a surface or optimistic disjointness/);
assert.match(template, /classification is context only and never an implicit lock/);
assert.match(template, /list every writable `path:` scope/);
assert.match(template, /surface:<owning-domain>:<stable-owner-or-effect>/);
assert.match(template, /surface:repo:common/);
assert.match(template, /preserve `UNKNOWN` or `CONFLICT` instead of inventing one/);


const activityPacketBody = (state) => `<!-- canonical-main-work-packet:v1 -->
## State
\`${state}\`
## Bounded write scope
1. \`tools/repo-ci-mcp/**\`
## Handoff
fixture`;
const shaA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const shaB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

let activityResult = classifyPrActivity({
  pr: {ref: '#2210', state: 'open', merged: false, headSha: shaA, sourceRefs: ['pr:#2210']},
  linkedPacket: {
    ref: '#2209', issueState: 'open', linkedPrRef: '#2210',
    body: activityPacketBody('IN_PROGRESS'), sourceRefs: ['issue:#2209'],
  },
  mergeable: false,
  ageDays: 999,
});
assert.equal(activityResult.state, 'ACTIVE_WRITER');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.LINKED_PACKET_ACTIVE);
activityResult = classifyPrActivity({
  pr: {ref: '#40', state: 'open', merged: false, headSha: shaA},
  updatedAt: '2000-01-01T00:00:00Z',
  draft: true,
  mergeable: false,
  ciConclusion: 'failure',
  branchName: 'old-looking-branch',
});
assert.equal(activityResult.state, 'ACTIVE_WRITER');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.OPEN_PR_DEFAULT_ACTIVE);

activityResult = classifyPrActivity({
  pr: {ref: '#41', state: 'closed', merged: false, headSha: shaA},
});
assert.equal(activityResult.state, 'NONBLOCKING_PROVEN');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.PR_NATIVE_TERMINAL);

activityResult = classifyPrActivity({
  pr: {ref: '#42', state: 'open', merged: false, headSha: shaA},
  linkedPacket: {
    ref: '#142', issueState: 'closed', linkedPrRef: '#42',
    body: activityPacketBody('SUPERSEDED'),
  },
});
assert.equal(activityResult.state, 'NONBLOCKING_PROVEN');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.LINKED_PACKET_TERMINAL);
activityResult = classifyPrActivity({
  pr: {ref: '#43', state: 'open', merged: false, headSha: shaA},
  linkedPacket: {
    ref: '#143', issueState: 'open', linkedPrRef: '#43',
    body: activityPacketBody('DONE'),
  },
});
assert.equal(activityResult.state, 'CONFLICT');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.PACKET_NATIVE_STATE_CONFLICT);

activityResult = classifyPrActivity({
  pr: {ref: '#44', state: 'open', merged: false, headSha: shaA},
  successor: {
    ref: '#144', state: 'closed', merged: true, mergeSha: shaB,
    supersedesRef: '#44', ancestry: 'PROVEN', patchEquivalent: null,
  },
});
assert.equal(activityResult.state, 'NONBLOCKING_PROVEN');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.MERGED_SUCCESSOR_PROVEN);

activityResult = classifyPrActivity({
  pr: {ref: '#45', state: 'open', merged: false, headSha: shaA},
  successor: {
    ref: '#145', state: 'closed', merged: true, mergeSha: shaB,
    supersedesRef: '#45', ancestry: 'UNKNOWN',
  },
});
assert.equal(activityResult.state, 'UNKNOWN');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.SUPERSESSION_PROOF_INCOMPLETE);
activityResult = classifyPrActivity({
  pr: {ref: '#46', state: 'open', merged: false, headSha: shaA},
  successor: {
    ref: '#146', state: 'closed', merged: true, mergeSha: shaB,
    supersedesRef: '#46', ancestry: 'CONTRADICTED',
  },
});
assert.equal(activityResult.state, 'CONFLICT');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.SUPERSESSION_PROOF_CONTRADICTED);

activityResult = classifyPrActivity({
  pr: {ref: '#47', state: 'open', merged: false, headSha: shaA},
  linkedPacket: {
    ref: '#147', issueState: 'open', linkedPrRef: '#47',
    body: activityPacketBody('IN_PROGRESS'),
  },
  successor: {
    ref: '#247', state: 'closed', merged: true, mergeSha: shaB,
    supersedesRef: '#47', ancestry: 'PROVEN',
  },
});
assert.equal(activityResult.state, 'CONFLICT');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.ACTIVE_PACKET_SUPERSESSION_CONFLICT);
const legacyActivityFree = resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#50', state: 'open', filesComplete: true,
  changedFiles: ['docs/README.md'],
}]);
assert.equal(legacyActivityFree.state, 'OVERLAP');
assert.equal(Object.hasOwn(legacyActivityFree, 'candidateActivity'), false);

let composedActivity = resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#51', state: 'open', merged: false, headSha: shaA, filesComplete: true,
  changedFiles: ['docs/README.md'],
  activityEvidence: {linkedPacket: {
    ref: '#151', issueState: 'closed', linkedPrRef: '#51',
    body: activityPacketBody('SUPERSEDED'),
  }},
}]);
assert.equal(composedActivity.state, 'DISJOINT');
assert.equal(composedActivity.candidateActivity[0].state, 'NONBLOCKING_PROVEN');

composedActivity = resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#52', state: 'open', merged: false, headSha: shaA, filesComplete: true,
  changedFiles: ['docs/README.md'],
  activityEvidence: {successor: {
    ref: '#152', state: 'closed', merged: true, mergeSha: shaB,
    supersedesRef: '#52', ancestry: 'UNKNOWN',
  }},
}]);
assert.equal(composedActivity.state, 'UNKNOWN');
assert.equal(composedActivity.findings[0].code, OVERLAP_REASON_CODES.PR_ACTIVITY_UNKNOWN);
composedActivity = resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#53', state: 'open', merged: false, headSha: shaA, filesComplete: true,
  changedFiles: ['docs/README.md'],
  activityEvidence: {linkedPacket: {
    ref: '#153', issueState: 'open', linkedPrRef: '#53',
    body: activityPacketBody('IN_PROGRESS'),
  }},
}]);
assert.equal(composedActivity.state, 'OVERLAP');
assert.equal(composedActivity.candidateActivity[0].state, 'ACTIVE_WRITER');

composedActivity = resolveOverlap(['path:docs/README.md'], [{
  type: 'pr', ref: '#54', state: 'open', merged: false, headSha: shaA, filesComplete: true,
  changedFiles: ['docs/README.md'],
  activityEvidence: {linkedPacket: {
    ref: '#154', issueState: 'open', linkedPrRef: '#54',
    body: activityPacketBody('DONE'),
  }},
}]);
assert.equal(composedActivity.state, 'CONFLICT');
assert.equal(composedActivity.findings[0].code, OVERLAP_REASON_CODES.PR_ACTIVITY_CONFLICT);

composedActivity = resolveOverlap(['path:src/README.md'], [{
  type: 'pr', ref: '#55', state: 'open', merged: false, headSha: shaA, filesComplete: true,
  changedFiles: ['docs/README.md'],
  activityEvidence: {linkedPacket: {
    ref: '#155', issueState: 'closed', linkedPrRef: '#55',
    body: activityPacketBody('SUPERSEDED'),
  }},
}], 'PARTIAL');
assert.equal(composedActivity.state, 'UNKNOWN');
assert.ok(composedActivity.findings.some((item) => item.code === OVERLAP_REASON_CODES.DISCOVERY_INCOMPLETE));
assert.match(readme, /## Evidence-backed PR activity classification/);
assert.match(readme, /`ACTIVE_WRITER \/ NONBLOCKING_PROVEN \/ UNKNOWN \/ CONFLICT`/);
assert.match(readme, /Only `NONBLOCKING_PROVEN` may suppress an otherwise-open PR/);
assert.match(readme, /age, inactivity, branch naming, draft state, mergeability, base drift, review age, or CI history/i);
assert.match(readme, /activity evidence is optional; without it, the existing open-PR overlap behavior is unchanged/i);
assert.match(readme, /does not fetch GitHub, close PRs, mutate packets, or maintain a PR registry/i);

activityResult = classifyPrActivity({
  pr: {ref: '#48', state: 'open', merged: false, headSha: shaA},
  successor: {
    ref: '#148', state: 'open', merged: true, mergeSha: shaB,
    supersedesRef: '#48', ancestry: 'PROVEN',
  },
});
assert.equal(activityResult.state, 'CONFLICT');
assert.equal(activityResult.reasonCode, PR_ACTIVITY_REASON_CODES.SUCCESSOR_NATIVE_STATE_CONFLICT);


const {
  classifyProofEligibility,
  REASON_CODES: PROOF_ELIGIBILITY_REASON_CODES,
} = require(path.join(dir, 'proof-eligibility.cjs'));
const proofEligibilitySource = fs.readFileSync(path.join(dir, 'proof-eligibility.cjs'), 'utf8');
const proofFixture = (overrides = {}) => ({
  schemaVersion: 1,
  sourceRefs: ['fixture:activated-acceptance'],
  acceptance: {
    liveApplies: true,
    liveRequired: false,
    liveSatisfied: false,
    observationalPendingAllowed: false,
    observationalPendingNonBlocking: false,
    notApplicable: false,
    liveNotRequired: false,
    capabilityUnavailable: false,
    capabilityBlockNonBlocking: false,
    syntheticEventPolicy: 'FORBIDDEN',
    ...overrides,
  },
});

let proofResult = classifyProofEligibility(proofFixture({liveRequired: true}));
assert.equal(proofResult.disposition, 'LIVE_REQUIRED');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.LIVE_REQUIRED_UNSATISFIED);
assert.equal(proofResult.closureBlocking, true);
assert.equal(proofResult.syntheticLiveEventForbidden, true);
assert.equal(proofResult.claimsLiveProven, false);
assert.equal(proofResult.claimsDone, false);
assert.equal(proofResult.mutationAuthorized, false);

proofResult = classifyProofEligibility(proofFixture({
  observationalPendingAllowed: true,
  observationalPendingNonBlocking: true,
}));
assert.equal(proofResult.disposition, 'OBSERVATIONAL_PENDING_ALLOWED');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.OBSERVATIONAL_PENDING_EXPLICIT_NONBLOCKING);
assert.equal(proofResult.closureBlocking, false);
assert.equal(proofResult.syntheticLiveEventForbidden, true);

proofResult = classifyProofEligibility(proofFixture({liveNotRequired: true}));
assert.equal(proofResult.disposition, 'NOT_REQUIRED');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.LIVE_EXPLICIT_NOT_REQUIRED);
assert.equal(proofResult.closureBlocking, false);

proofResult = classifyProofEligibility(proofFixture({
  liveApplies: false,
  notApplicable: true,
}));
assert.equal(proofResult.disposition, 'NOT_APPLICABLE');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.LIVE_EXPLICIT_NOT_APPLICABLE);
assert.equal(proofResult.closureBlocking, false);

proofResult = classifyProofEligibility(proofFixture({capabilityUnavailable: true}));
assert.equal(proofResult.disposition, 'BLOCKED_CAPABILITY');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.CAPABILITY_UNAVAILABLE_BLOCKING);
assert.equal(proofResult.closureBlocking, true);

proofResult = classifyProofEligibility(proofFixture({
  capabilityUnavailable: true,
  capabilityBlockNonBlocking: true,
}));
assert.equal(proofResult.disposition, 'BLOCKED_CAPABILITY');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.CAPABILITY_UNAVAILABLE_NONBLOCKING);
assert.equal(proofResult.closureBlocking, false);

const missingProofField = proofFixture();
delete missingProofField.acceptance.liveRequired;
proofResult = classifyProofEligibility(missingProofField);
assert.equal(proofResult.disposition, 'UNKNOWN');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.INPUT_MISSING_FIELD);
assert.equal(proofResult.closureBlocking, true);

proofResult = classifyProofEligibility({...proofFixture(), unexpected: true});
assert.equal(proofResult.disposition, 'UNKNOWN');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.INPUT_UNKNOWN_FIELD);

proofResult = classifyProofEligibility(proofFixture({
  liveRequired: true,
  liveNotRequired: true,
}));
assert.equal(proofResult.disposition, 'CONFLICT');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.ACTIVATED_ACCEPTANCE_CONFLICT);
assert.equal(proofResult.closureBlocking, true);
assert.equal(proofResult.syntheticLiveEventForbidden, true);
proofResult = classifyProofEligibility(proofFixture({
  liveRequired: true,
  observationalPendingAllowed: true,
  observationalPendingNonBlocking: true,
}));
assert.equal(proofResult.disposition, 'CONFLICT');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.ACTIVATED_ACCEPTANCE_CONFLICT);

proofResult = classifyProofEligibility(proofFixture({
  liveRequired: true,
  capabilityUnavailable: true,
  capabilityBlockNonBlocking: true,
}));
assert.equal(proofResult.disposition, 'CONFLICT');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.ACTIVATED_ACCEPTANCE_CONFLICT);

proofResult = classifyProofEligibility(proofFixture({
  liveRequired: true,
  liveSatisfied: true,
}));
assert.equal(proofResult.disposition, 'UNKNOWN');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.LIVE_ALREADY_SATISFIED_OUTSIDE_ELIGIBILITY);
assert.equal(proofResult.claimsLiveProven, false);

proofResult = classifyProofEligibility(proofFixture());
assert.equal(proofResult.disposition, 'UNKNOWN');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.ACTIVATED_ACCEPTANCE_UNRESOLVED);

assert.doesNotMatch(proofEligibilitySource, /child_process|https?:\/\/|gh\s+api|fetch\s*\(/);
assert.match(readme, /## Proof-level \/ live-observation eligibility classifier/);
assert.match(readme, /`LIVE_REQUIRED \/ OBSERVATIONAL_PENDING_ALLOWED \/ NOT_APPLICABLE \/ NOT_REQUIRED \/ BLOCKED_CAPABILITY \/ UNKNOWN \/ CONFLICT`/);
assert.match(readme, /does not parse arbitrary packet prose, fetch GitHub, verify runtime events, create synthetic events, mutate repository or coordination state/i);
assert.match(readme, /required live proof cannot be retroactively weakened/i);
assert.match(readme, /`claimsLiveProven: false`, `claimsDone: false`, and `mutationAuthorized: false`/);


proofResult = classifyProofEligibility({
  ...proofFixture(),
  sourceRefs: [],
});
assert.equal(proofResult.disposition, 'UNKNOWN');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.INPUT_FIELD_INVALID);

proofResult = classifyProofEligibility(proofFixture({
  liveApplies: false,
  liveNotRequired: true,
}));
assert.equal(proofResult.disposition, 'CONFLICT');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.ACTIVATED_ACCEPTANCE_CONFLICT);

const unknownAcceptanceField = proofFixture();
unknownAcceptanceField.acceptance.extra = true;
proofResult = classifyProofEligibility(unknownAcceptanceField);
assert.equal(proofResult.disposition, 'UNKNOWN');
assert.equal(proofResult.reasonCode, PROOF_ELIGIBILITY_REASON_CODES.INPUT_UNKNOWN_FIELD);

assert.match(readme, /proof-eligibility\.cjs \/path\/to\/request\.json/);
assert.match(readme, /`sourceRefs` must contain 1–16 non-empty bounded source locators/);


const {
  classifyPacketAuthoring,
  REASON_CODES: PACKET_AUTHORING_REASON_CODES,
} = require(path.join(dir, 'packet-authoring-preflight.cjs'));
const packetAuthoringSource = fs.readFileSync(path.join(dir, 'packet-authoring-preflight.cjs'), 'utf8');

const authoringPacket = (scopeSection) => `<!-- canonical-main-work-packet:v1 -->
## State
\`IN_PROGRESS\`
## Interaction stage
- Current stage: \`IMPLEMENTATION_PR\`
## Bounded write scope
${scopeSection}
## Acceptance
1. fixture
`;

let authoringResult = classifyPacketAuthoring(authoringPacket(
  ['- `path:src/a.js`', '- `surface:repo:fixture-owner`'].join('\n'),
));
assert.equal(authoringResult.disposition, 'PASS');
assert.deepEqual(authoringResult.normalizedScopes, ['path:src/a.js', 'surface:repo:fixture-owner']);

authoringResult = classifyPacketAuthoring(`${authoringPacket('- \`path:src/a.js\`')}
## Preservation boundary
- \`path:src/neighbor.js\`
`);
assert.equal(authoringResult.disposition, 'PASS');
assert.deepEqual(authoringResult.normalizedScopes, ['path:src/a.js']);

authoringResult = classifyPacketAuthoring(authoringPacket(
  ['- `path:src/a.js`', 'Preserve unchanged:', '- `path:src/neighbor.js`'].join('\n'),
));
assert.equal(authoringResult.disposition, 'CONFLICT');
assert.deepEqual(authoringResult.reasonCodes, [
  PACKET_AUTHORING_REASON_CODES.PACKET_SCOPE_PRESERVATION_BOUNDARY_REQUIRED,
]);
assert.equal(authoringResult.finding.scopeExcerpt, '- \`path:src/neighbor.js\`');

authoringResult = classifyPacketAuthoring(authoringPacket(
  ['- `path:src/a.js`', 'Do not modify', '- `surface:repo:neighbor-owner`'].join('\n'),
));
assert.equal(authoringResult.disposition, 'CONFLICT');

const unsupportedAuthoringPacket = authoringPacket('- \`path:src/a.js\`')
  .replace('## Bounded write scope', '## Exact bounded write scope');
authoringResult = classifyPacketAuthoring(unsupportedAuthoringPacket);
assert.equal(authoringResult.disposition, 'UNKNOWN');
assert.deepEqual(authoringResult.reasonCodes, [PACKET_AUTHORING_REASON_CODES.PACKET_SCOPE_UNRESOLVED]);

assert.match(readme, /### Packet authoring preflight/);
assert.match(readme, /PACKET_SCOPE_PRESERVATION_BOUNDARY_REQUIRED/);
assert.match(readme, /separate level-two boundary/);
assert.match(template, /packet-authoring-preflight\.cjs --body-file/);
assert.match(template, /start a separate level-two section such as \`## Preservation boundary\`/);
for (const forbidden of ['http://', 'https://', 'gh api', 'fetch(', 'child_process', 'execSync', 'spawnSync']) {
  assert.equal(packetAuthoringSource.includes(forbidden), false, `packet authoring preflight must not contain ${forbidden}`);
}
assert.match(packetAuthoringSource, /require\('\.\/packet-projection\.cjs'\)/);
assert.match(packetAuthoringSource, /require\('\.\/scope-overlap\.cjs'\)/);
assert.doesNotMatch(packetAuthoringSource, /PACKET_SCOPE_HEADINGS/);

console.log('work-system-contract: ok');