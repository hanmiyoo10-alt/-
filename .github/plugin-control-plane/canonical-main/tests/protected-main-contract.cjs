'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {loadPolicy} = require('../contract.cjs');
const {
  READINESS_STATES,
  activationCapability,
  loadProtectedMainContract,
  requiredCheckNames,
  directWriterInventory,
  writerContractErrors,
  observeProtection,
} = require('../protected-main.cjs');
const {renderProtectionSection, replaceProtectionSection} = require('../protected-main-surface.cjs');
const {
  MARKER,
  capabilityCandidate,
  gate,
  parseRecord,
  renderRecord,
  sameRecord,
} = require('../orchestrator/protection-attempt.cjs');

const root = path.resolve(__dirname, '../../../..');
const policy = loadPolicy();
const contract = loadProtectedMainContract();
const clone = (value) => JSON.parse(JSON.stringify(value));

assert.equal(contract.schemaVersion, 3);
assert.equal(contract.branch, 'main');
assert.equal(contract.repositoryReadiness, 'READY_TO_ACTIVATE');
assert.equal(contract.enforcementExpected, false);
assert.equal(contract.requiredCheck.displayName, 'SimCore CI / Required');
assert.equal(contract.requiredCheck.apiContext, 'Required');
assert.equal(contract.requiredCheck.workflow, 'simcore-ci.yml');
assert.equal(contract.requiredCheck.profile, 'MAIN_HEALTH');
assert.equal(contract.requiredCheck.job, 'Required');
assert.equal(contract.gateway.helper, 'scripts/repo-main-write.py');
assert.equal(contract.gateway.mode, 'exact-candidate-required');
assert.equal(contract.gateway.forcePushAllowed, false);
assert.equal(contract.gateway.bypassActorRequired, false);
assert.equal(contract.shadowProof.result, 'PASS');
assert.equal(contract.shadowProof.mainMutation, 'NONE');
assert.equal(contract.shadowProof.stagingRefCleaned, true);
assert.equal(contract.activation.automaticAttempt, true);
assert.equal(contract.activation.enforceAdmins, true);
assert.equal(contract.activation.forcePushAllowed, false);
assert.equal(contract.activation.capability.state, 'BLOCKED_PERMISSION');
assert.equal(contract.activation.capability.reasonCode, 'ADMINISTRATION_WRITE_UNAVAILABLE');
assert.equal(contract.activation.capability.stableTarget, 'branch:main/native-protection');
assert.equal(contract.activation.capability.explicitRearmEvent, 'workflow_dispatch');
assert.equal(contract.activation.capability.automaticRetryOnEvidenceChange, true);
assert.equal(contract.softEnforcement.enabled, true);
assert.equal(contract.softEnforcement.writerClassification, 'recovery-delegated');
assert.equal(contract.softEnforcement.verifyGateOnlyBeforeLanding, true);
assert.equal(contract.softEnforcement.finalMainIdentityBarrier, true);
assert.equal(contract.softEnforcement.forcePushAllowed, false);
assert.equal(contract.softEnforcement.nativeProtectionEquivalent, false);
assert.equal(policy.protection.contract, '.github/plugin-control-plane/canonical-main/protected-main.json');
assert.equal(policy.protection.observeBranchApi, true);
assert.equal(policy.protection.automaticActivationAttempt, true);
assert.equal(policy.protection.softEnforcementFallback, true);

const capability = activationCapability(contract);
assert.equal(capability.state, READINESS_STATES.BLOCKED_PERMISSION);
assert.equal(capability.reasonCode, 'ADMINISTRATION_WRITE_UNAVAILABLE');
assert.equal(capability.stableTarget, 'branch:main/native-protection');
assert.notEqual(capability.evidenceFingerprint, 'UNKNOWN');

const inventory = (policy.adapters.writerInventory || []).map((row) => row.workflow).sort();
assert.deepEqual(directWriterInventory(root), inventory, 'every direct repo-main-write workflow must be inventory-classified');
assert.deepEqual(writerContractErrors(root, policy, contract), [], 'writers, recovery guard, and native activation gate must satisfy protected-main gating');

const offBranch = {
  protected: false,
  protection: {required_status_checks: {enforcement_level: 'off', contexts: [], checks: []}},
};
const blocked = observeProtection(offBranch, {root, policy, contract});
assert.equal(blocked.state, 'BLOCKED_PERMISSION');
assert.equal(blocked.protected, false);
assert.equal(blocked.requiredPresent, false);
assert.equal(blocked.writerGatewayReady, true);
assert.equal(blocked.activeWriterCount, 5);
assert.equal(blocked.automaticActivationAttempt, true);
assert.equal(blocked.activationCapabilityState, 'BLOCKED_PERMISSION');
assert.equal(blocked.activationCapabilityReason, 'ADMINISTRATION_WRITE_UNAVAILABLE');
assert.equal(blocked.automaticActivationDeferred, true);
assert.equal(blocked.softEnforcementEnabled, true);
assert.equal(blocked.nativeProtectionEquivalent, false);

const readyContract = clone(contract);
readyContract.activation.capability.state = 'READY_TO_ACTIVATE';
readyContract.activation.capability.evidenceFingerprint = 'github-app:repository-administration-write:available:v2';
const ready = observeProtection(offBranch, {root, policy, contract: readyContract});
assert.equal(ready.state, 'READY_TO_ACTIVATE');
assert.equal(ready.automaticActivationDeferred, false);

const enforcedBranch = {
  protected: true,
  protection: {
    required_status_checks: {
      enforcement_level: 'everyone',
      contexts: [],
      checks: [{context: 'Required', app_id: 15368}],
    },
  },
};
const enforced = observeProtection(enforcedBranch, {root, policy, contract});
assert.equal(enforced.state, 'ACTIVE');
assert.equal(enforced.requiredPresent, true);
assert.deepEqual(requiredCheckNames(enforcedBranch), ['Required']);

const legacyDisplayBranch = {
  protected: true,
  protection: {
    required_status_checks: {
      enforcement_level: 'everyone',
      contexts: ['SimCore CI / Required'],
      checks: [],
    },
  },
};
assert.equal(observeProtection(legacyDisplayBranch, {root, policy, contract}).state, 'ACTIVE');

const driftBranch = {
  protected: true,
  protection: {
    required_status_checks: {
      enforcement_level: 'everyone',
      contexts: ['Some Other Check'],
      checks: [],
    },
  },
};
assert.equal(observeProtection(driftBranch, {root, policy, contract}).state, 'FAILED_CURRENT_TARGET');

const expectedContract = {...contract, enforcementExpected: true};
assert.equal(observeProtection(offBranch, {root, policy, contract: expectedContract}).state, 'FAILED_CURRENT_TARGET');

const firstBlocked = gate({contract, previous: null, explicitRearm: false});
assert.equal(firstBlocked.state, 'BLOCKED_CAPABILITY');
assert.equal(firstBlocked.allowAttempt, false);
assert.equal(firstBlocked.target, 'branch:main/native-protection');
const repeatedBlocked = gate({contract, previous: firstBlocked, explicitRearm: false});
assert.equal(repeatedBlocked.state, 'DEFERRED_COOLDOWN');
assert.equal(repeatedBlocked.allowAttempt, false);
const explicitRearm = gate({contract, previous: repeatedBlocked, explicitRearm: true});
assert.equal(explicitRearm.state, 'REARMED');
assert.equal(explicitRearm.allowAttempt, true);
const changedButBlockedContract = clone(contract);
changedButBlockedContract.activation.capability.evidenceFingerprint = 'github-actions-token:still-no-admin:v2';
const changedButBlocked = gate({contract: changedButBlockedContract, previous: repeatedBlocked, explicitRearm: false});
assert.equal(changedButBlocked.state, 'BLOCKED_CAPABILITY');
assert.equal(changedButBlocked.allowAttempt, false);
const capabilityRearmed = gate({contract: readyContract, previous: repeatedBlocked, explicitRearm: false});
assert.equal(capabilityRearmed.state, 'REARMED');
assert.equal(capabilityRearmed.allowAttempt, true);
assert.equal(capabilityCandidate(contract).reasonCode, capabilityCandidate(readyContract).reasonCode, 'capability lane reason must remain stable across evidence changes');

const renderedRecord = renderRecord(repeatedBlocked);
assert.match(renderedRecord, new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
const parsedRecord = parseRecord(renderedRecord);
assert.equal(parsedRecord.state, 'DEFERRED_COOLDOWN');
assert.equal(sameRecord(parsedRecord, parsedRecord), true);

const section = renderProtectionSection(blocked);
assert.match(section, /Protection state: `BLOCKED_PERMISSION`/);
assert.match(section, /GitHub branch protected: `false`/);
assert.match(section, /Required target: `SimCore CI \/ Required` \/ API context `Required` — `NOT_ENFORCED`/);
assert.match(section, /Protected writer gateway: `READY` — 5 active writers/);
assert.match(section, /Native activation capability: `BLOCKED_PERMISSION` — `ADMINISTRATION_WRITE_UNAVAILABLE`/);
assert.match(section, /Automatic native activation attempt: `DEFERRED_PERMISSION`/);
assert.match(section, /Soft enforcement fallback: `ACTIVE`/);
assert.match(section, /Soft fallback equals native protection: `false`/);
assert.match(section, /Native protection truth comes only from direct GitHub read-back/);

const sample = [
  '# Canonical Main — Operations View',
  '',
  '## Canonical main',
  '',
  '- Branch: `main`',
  '',
  '## Main-write / durable-memory adapters',
].join('\n');
const inserted = replaceProtectionSection(sample, section);
assert.equal((inserted.match(/## Protected main/g) || []).length, 1);
assert.ok(inserted.indexOf('## Protected main') < inserted.indexOf('## Main-write / durable-memory adapters'));
const replaced = replaceProtectionSection(inserted, section.replace('BLOCKED_PERMISSION', 'ACTIVE'));
assert.equal((replaced.match(/## Protected main/g) || []).length, 1);
assert.match(replaced, /Protection state: `ACTIVE`/);

const opsWorkflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-ops.yml'), 'utf8');
assert.match(opsWorkflow, /Canonical Main Protection Guard/);
assert.match(opsWorkflow, /protected-main-surface\.cjs refresh/);
assert.match(opsWorkflow, /contents:\s*read/);
assert.match(opsWorkflow, /actions:\s*read/);
assert.match(opsWorkflow, /issues:\s*write/);
assert.doesNotMatch(opsWorkflow, /contents:\s*write/);

const guardWorkflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-protection-guard.yml'), 'utf8');
assert.match(guardWorkflow, /workflow_run:/);
assert.match(guardWorkflow, /workflows:\s*\n\s*- SimCore CI/);
assert.match(guardWorkflow, /contents:\s*write/);
assert.match(guardWorkflow, /actions:\s*write/);
assert.match(guardWorkflow, /checks:\s*read/);
assert.match(guardWorkflow, /issues:\s*write/);
assert.match(guardWorkflow, /github\.event\.workflow_run\.event == 'push'/);
assert.match(guardWorkflow, /github\.event\.workflow_run\.head_branch == 'main'/);
assert.match(guardWorkflow, /id:\s*target_currentness/);
assert.match(guardWorkflow, /observed="\$\(git rev-parse origin\/main\)"/);
assert.match(guardWorkflow, /disposition=CURRENT_MAIN/);
assert.match(guardWorkflow, /disposition=SUPERSEDED_CURRENT_MAIN/);
assert.match(guardWorkflow, /TARGET_DISPOSITION=SUPERSEDED_CURRENT_MAIN expected=\$TARGET_SHA observed=\$observed/);
assert.match(guardWorkflow, /steps\.target_currentness\.outputs\.disposition == 'CURRENT_MAIN'/);
assert.match(guardWorkflow, /id:\s*attempt_gate/);
assert.match(guardWorkflow, /orchestrator\/protection-attempt\.cjs gate/);
assert.match(guardWorkflow, /EXPLICIT_REARM:\s*\$\{\{ github\.event_name == 'workflow_dispatch' \}\}/);
assert.match(guardWorkflow, /steps\.attempt_gate\.outputs\.allow_attempt == 'true'/);
assert.doesNotMatch(guardWorkflow, /test "\$\(git rev-parse origin\/main\)" = "\$TARGET_SHA"/);
assert.match(guardWorkflow, /protection-activate\.sh/);
assert.match(guardWorkflow, /required-guard\.sh/);
assert.doesNotMatch(guardWorkflow, /pull_request_target/);

const attemptAdapter = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/orchestrator/protection-attempt.cjs'), 'utf8');
assert.match(attemptAdapter, /decideCircuitBreaker/);
assert.match(attemptAdapter, /branch:main\/native-protection/);
assert.match(attemptAdapter, /canonical-main-protection-circuit-breaker:v1/);
assert.match(attemptAdapter, /issues\/\$\{issueNumber\}\/comments/);
assert.doesNotMatch(attemptAdapter, /branches\/main\/protection|git push|force-with-lease/);

const activator = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/protection-activate.sh'), 'utf8');
assert.match(activator, /branches\/main\/protection/);
assert.match(activator, /required_status_checks/);
assert.match(activator, /context: "Required"/);
assert.match(activator, /enforce_admins: true/);
assert.match(activator, /allow_force_pushes: false/);
assert.match(activator, /ADMINISTRATION_WRITE_UNAVAILABLE/);
assert.match(activator, /ACTIVATION_READBACK_MISMATCH/);
assert.doesNotMatch(activator, /force-with-lease/);

const guard = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/required-guard.sh'), 'utf8');
assert.match(guard, /--verify-gate-only/);
assert.match(guard, /--attempts 1/);
assert.match(guard, /--required-workflow simcore-ci\.yml/);
assert.match(guard, /--required-profile MAIN_HEALTH/);
assert.match(guard, /--required-job Required/);
assert.match(guard, /verified_parent/);
assert.match(guard, /SOFT_GUARD_BASE_MOVED_AFTER_GATE/);
assert.match(guard, /git push origin "\$\{verified\}:refs\/heads\/main"/);
assert.doesNotMatch(guard, /--force/);
assert.doesNotMatch(guard, /force-with-lease/);
assert.doesNotMatch(guard, /git reset --hard origin\/main/);

const helper = fs.readFileSync(path.join(root, 'scripts/repo-main-write.py'), 'utf8');
assert.match(helper, /MAIN_WRITE_REQUIRED_GATE_PASS/);
assert.match(helper, /MAIN_WRITE_BASE_MOVED_AFTER_GATE/);
assert.doesNotMatch(helper, /force-with-lease/);
assert.doesNotMatch(helper, /['"]--force['"]/);

console.log('CANONICAL_MAIN_PROTECTED_MAIN_CONTRACTS:OK');
