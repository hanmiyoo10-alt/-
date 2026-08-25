'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {loadPolicy} = require('../contract.cjs');
const {
  loadProtectedMainContract,
  requiredCheckNames,
  directWriterInventory,
  writerContractErrors,
  observeProtection,
} = require('../protected-main.cjs');
const {
  renderProtectionSection,
  replaceProtectionSection,
} = require('../protected-main-surface.cjs');

const root = path.resolve(__dirname, '../../../..');
const policy = loadPolicy();
const contract = loadProtectedMainContract();

assert.equal(contract.schemaVersion, 2);
assert.equal(contract.branch, 'main');
assert.equal(contract.declaredReadiness, 'READY_TO_ACTIVATE');
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
assert.equal(contract.softEnforcement.enabled, true);
assert.equal(contract.softEnforcement.verifyGateOnlyBeforeLanding, true);
assert.equal(contract.softEnforcement.finalMainIdentityBarrier, true);
assert.equal(contract.softEnforcement.forcePushAllowed, false);
assert.equal(contract.softEnforcement.nativeProtectionEquivalent, false);
assert.equal(policy.protection.contract, '.github/plugin-control-plane/canonical-main/protected-main.json');
assert.equal(policy.protection.observeBranchApi, true);
assert.equal(policy.protection.automaticActivationAttempt, true);
assert.equal(policy.protection.softEnforcementFallback, true);

const inventory = (policy.adapters.writerInventory || []).map((row) => row.workflow).sort();
assert.deepEqual(directWriterInventory(root), inventory, 'every direct/delegated repo-main-write workflow must be inventory-classified');
assert.deepEqual(writerContractErrors(root, policy, contract), [], 'all active writers must use exact-candidate Required gating');

const offBranch = {
  protected: false,
  protection: {required_status_checks: {enforcement_level: 'off', contexts: [], checks: []}},
};
const ready = observeProtection(offBranch, {root, policy, contract});
assert.equal(ready.state, 'READY_TO_ACTIVATE');
assert.equal(ready.protected, false);
assert.equal(ready.requiredPresent, false);
assert.equal(ready.writerGatewayReady, true);
assert.equal(ready.activeWriterCount, 5);
assert.equal(ready.automaticActivationAttempt, true);
assert.equal(ready.softEnforcementEnabled, true);
assert.equal(ready.nativeProtectionEquivalent, false);

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
assert.equal(enforced.state, 'ENFORCED');
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
assert.equal(observeProtection(legacyDisplayBranch, {root, policy, contract}).state, 'ENFORCED');

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
assert.equal(observeProtection(driftBranch, {root, policy, contract}).state, 'DRIFT');

const expectedContract = {...contract, enforcementExpected: true};
assert.equal(observeProtection(offBranch, {root, policy, contract: expectedContract}).state, 'DRIFT');

const section = renderProtectionSection(ready);
assert.match(section, /Protection state: `READY_TO_ACTIVATE`/);
assert.match(section, /GitHub branch protected: `false`/);
assert.match(section, /Required target: `SimCore CI \/ Required` \/ API context `Required` — `NOT_ENFORCED`/);
assert.match(section, /Protected writer gateway: `READY` — 5 active writers/);
assert.match(section, /Automatic native activation attempt: `ENABLED`/);
assert.match(section, /Soft enforcement fallback: `ACTIVE`/);
assert.match(section, /Soft fallback equals native protection: `false`/);
assert.match(section, /ACTIVE soft fallback alone does not mean native branch protection is enabled/);

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
const replaced = replaceProtectionSection(inserted, section.replace('READY_TO_ACTIVATE', 'ENFORCED'));
assert.equal((replaced.match(/## Protected main/g) || []).length, 1);
assert.match(replaced, /Protection state: `ENFORCED`/);

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
assert.match(guardWorkflow, /protection-activate\.sh/);
assert.match(guardWorkflow, /required-guard\.sh/);
assert.doesNotMatch(guardWorkflow, /pull_request_target/);

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
