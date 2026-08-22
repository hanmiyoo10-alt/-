const fs = require('node:fs');
const assert = require('node:assert/strict');

const specPath = '.github/usage-dashboard/releases/5.66.json';
const reusablePath = '.github/workflows/reusable-usage-dashboard-release.yml';
const callerPath = '.github/workflows/stage-usage-dashboard-566-managed-direct-cli-runtime.yml';
const adapterPath = 'plugins/usage-dashboard/tools/prepare_release_regressions.py';
const validatorPath = 'plugins/usage-dashboard/tools/validate_release_candidate.py';

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const reusable = fs.readFileSync(reusablePath, 'utf8');
const caller = fs.readFileSync(callerPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');
const validator = fs.readFileSync(validatorPath, 'utf8');

assert.deepEqual(
  [spec.productVersion, spec.engineVersion, spec.managerVersion, spec.snapshotContract, spec.recentRequestContract],
  [manifest.productVersion, manifest.components.bridge.requiredVersion, manifest.components.bridgeManager.version,
    manifest.contracts.snapshot, manifest.contracts.recentRequest],
  'release spec and product manifest must describe one candidate',
);
assert.equal(spec.productVersion, '3.0.0-alpha.5.66', 'maintenance PR must not bump Product');
assert.equal(spec.engineVersion, '1.6.19', 'maintenance PR must not bump Engine');
assert.equal(spec.managerVersion, '1.3.0', 'maintenance PR must not bump Manager');

assert.match(reusable, /workflow_call:/);
assert.match(reusable, /group: repo-main-write/);
assert.match(reusable, /cancel-in-progress: false/);
assert.match(reusable, /check_release_monotonic\.py/);
assert.match(reusable, /--check-artifacts/);
assert.match(reusable, /RELEASE_REF_MOVED/);
assert.match(reusable, /MAIN_MANIFEST_MOVED/);
assert.match(reusable, /inputs\.publish/);
assert.ok(!reusable.includes("product = '3.0.0-alpha.5.66'"), 'historical adapter must not remain inline');
assert.ok(!reusable.includes("grep -Fq '//@version 3.0.0-alpha.5.66'"), 'release tuple must come from the spec');

assert.ok(caller.length < 2200, 'release caller must remain small');
assert.match(caller, /uses: \.\/\.github\/workflows\/reusable-usage-dashboard-release\.yml/);
assert.match(caller, /release_spec: \.github\/usage-dashboard\/releases\/5\.66\.json/);
assert.match(caller, /publish: false/);
assert.equal(spec.sharedWorkflow, reusablePath);
for (const forbidden of ['git switch', 'git push', 'text.replace', 'check_release_monotonic.py']) {
  assert.ok(!caller.includes(forbidden), `caller must not duplicate ${forbidden}`);
}

assert.match(adapter, /parser\.add_argument\('--spec', required=True\)/);
assert.match(adapter, /spec\['productVersion'\]/);
assert.match(validator, /sha256 mismatch/);
assert.match(validator, /snapshot contract/);

console.log('Usage Dashboard release infrastructure foundation: OK · reusable workflow, release spec, bounded maintenance caller');
