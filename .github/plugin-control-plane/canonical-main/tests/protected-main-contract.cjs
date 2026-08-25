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

assert.equal(contract.schemaVersion, 1);
assert.equal(contract.branch, 'main');
assert.equal(contract.declaredReadiness, 'READY_TO_ACTIVATE');
assert.equal(contract.enforcementExpected, false);
assert.equal(contract.requiredCheck.displayName, 'SimCore CI / Required');
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
assert.equal(policy.protection.contract, '.github/plugin-control-plane/canonical-main/protected-main.json');
assert.equal(policy.protection.observeBranchApi, true);

const inventory = (policy.adapters.writerInventory || []).map((row) => row.workflow).sort();
assert.deepEqual(directWriterInventory(root), inventory, 'every direct repo-main-write workflow must be inventory-classified');
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

const enforcedBranch = {
  protected: true,
  protection: {
    required_status_checks: {
      enforcement_level: 'everyone',
      contexts: ['SimCore CI / Required'],
      checks: [],
    },
  },
};
const enforced = observeProtection(enforcedBranch, {root, policy, contract});
assert.equal(enforced.state, 'ENFORCED');
assert.equal(enforced.requiredPresent, true);
assert.deepEqual(requiredCheckNames(enforcedBranch), ['SimCore CI / Required']);

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
assert.match(section, /Required target: `SimCore CI \/ Required` — `NOT_ENFORCED`/);
assert.match(section, /Protected writer gateway: `READY` — 4 active writers/);
assert.match(section, /PASS Required run alone does not mean branch protection is enabled/);

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
assert.match(opsWorkflow, /protected-main-surface\.cjs refresh/);
assert.match(opsWorkflow, /contents:\s*read/);
assert.match(opsWorkflow, /actions:\s*read/);
assert.match(opsWorkflow, /issues:\s*write/);
assert.doesNotMatch(opsWorkflow, /contents:\s*write/);

const helper = fs.readFileSync(path.join(root, 'scripts/repo-main-write.py'), 'utf8');
assert.match(helper, /MAIN_WRITE_REQUIRED_GATE_PASS/);
assert.match(helper, /MAIN_WRITE_BASE_MOVED_AFTER_GATE/);
assert.doesNotMatch(helper, /force-with-lease/);
assert.doesNotMatch(helper, /['"]--force['"]/);

console.log('CANONICAL_MAIN_PROTECTED_MAIN_CONTRACTS:OK');
