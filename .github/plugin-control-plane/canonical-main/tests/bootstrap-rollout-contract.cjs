'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {loadPolicy, validateDescriptor} = require('../contract.cjs');
const {
  guidancePaths,
  renderGuidelines,
  repositoryBindingErrors,
  sharedInteractionContract,
} = require('../bootstrap.cjs');
const {
  descriptorCoverage,
  renderBootstrapSection,
  replaceBootstrapSection,
} = require('../bootstrap-surface.cjs');

const root = path.resolve(__dirname, '../../../..');
const descriptorDir = path.join(root, '.github/plugin-control-plane/canonical-main/descriptors');
const registry = JSON.parse(fs.readFileSync(path.join(root, '.github/plugin-control-plane/registry.json'), 'utf8'));
const expectedIds = [...Object.keys(registry.plugins || {}), ...Object.keys(registry.products || {})].sort();
const descriptorFiles = fs.readdirSync(descriptorDir).filter((name) => name.endsWith('.json')).sort();
const descriptors = descriptorFiles.map((name) => JSON.parse(fs.readFileSync(path.join(descriptorDir, name), 'utf8')));
const actualIds = descriptors.map((descriptor) => descriptor.id).sort();
const sharedContract = '.github/plugin-control-plane/canonical-main/shared-interaction-contract.md';

assert.deepEqual(actualIds, expectedIds, 'every operational registry scope must have exactly one canonical bootstrap descriptor');
assert.equal(new Set(actualIds).size, actualIds.length, 'bootstrap descriptor ids must be unique');

assert.equal(loadPolicy().bootstrap.sharedInteractionContract, sharedContract, 'canonical bootstrap policy must own the shared interaction contract path');
assert.equal(sharedInteractionContract(), sharedContract, 'bootstrap must resolve the canonical shared interaction contract');
const sharedText = fs.readFileSync(path.join(root, sharedContract), 'utf8');
assert.match(sharedText, /repository-shared-stage-boundary-reporting:v1/, 'shared contract must expose a stable stage-boundary marker');
assert.match(sharedText, /meaningful stage boundary/i, 'shared contract must define meaningful stage boundaries');
assert.match(sharedText, /what changed/i, 'shared contract must require delta-focused reporting');
assert.match(sharedText, /does not replace or outrank/i, 'shared contract must preserve project-specific authority');

for (const descriptor of descriptors) {
  assert.deepEqual(validateDescriptor(descriptor), [], `${descriptor.id} descriptor shape must validate`);
  assert.deepEqual(repositoryBindingErrors(descriptor, root), [], `${descriptor.id} repository binding must validate`);
  assert.deepEqual(
    guidancePaths(descriptor),
    [sharedContract, descriptor.guidelines],
    `${descriptor.id} must inherit shared interaction guidance before project-specific guidelines`,
  );
}

const byId = Object.fromEntries(descriptors.map((descriptor) => [descriptor.id, descriptor]));
assert.equal(byId['usage-dashboard'].memory.profile, 'production-state-block');
assert.equal(byId['usage-dashboard'].memory.workflow, '.github/workflows/usage-dashboard-project-memory.yml');
assert.deepEqual(byId['usage-dashboard'].memory.outputs, ['docs/USAGE_DASHBOARD_GUIDELINES.md']);
assert.equal(byId['usage-dashboard'].authority.releaseBranch, 'release-usage-dashboard');
assert.equal(byId['usage-dashboard'].authority.manifest, 'plugins/usage-dashboard/runtime/product-manifest.json');

assert.equal(byId.simcore.memory.profile, 'registered-renderer');
assert.equal(byId.simcore.memory.workflow, '.github/workflows/simcore-release-state-sync.yml');
assert.equal(byId.simcore.memory.renderer, 'products/simcore/tooling/sync-state.mjs');
assert.equal(byId.simcore.memory.targets, 'products/simcore/state-sync/target-registry.json');
assert.deepEqual(byId.simcore.memory.outputs, [
  'product-manifest.json',
  'docs/CURRENT_DEVELOPMENT.md',
  'docs/SIMCORE_GUIDELINES.md',
]);
assert.equal(byId.simcore.authority.releaseBranch, 'release-simcore');

for (const id of ['devpass', 'termux-large-doc-editor', 'voyage-token-check', 'pocketrisu-helper-mod']) {
  assert.equal(byId[id].memory.profile, 'check-only', `${id} must not gain a writable memory system during Phase G`);
  assert.deepEqual(byId[id].memory.outputs, [], `${id} check-only profile must have no writable outputs`);
}

for (const descriptor of descriptors) {
  const guidelines = fs.readFileSync(path.join(root, descriptor.guidelines), 'utf8');
  assert.match(guidelines, /Development & Operations Guidelines|Development & Operations|Development Guidelines/, `${descriptor.id} guidelines must be durable operating guidance`);
}

const renderedFutureGuidelines = renderGuidelines(byId['voyage-token-check'], 'hanmiyoo10-alt/-');
assert(renderedFutureGuidelines.includes(`Repository-wide shared interaction contract: \`${sharedContract}\``), 'future bootstrap render must include the shared interaction contract');
assert.match(renderedFutureGuidelines, /inherits that shared interaction contract/, 'future bootstrap render must make inheritance explicit');

const coverage = descriptorCoverage(root);
assert.equal(coverage.expectedCount, expectedIds.length);
assert.equal(coverage.registeredCount, expectedIds.length);
assert.equal(coverage.readyCount, expectedIds.length);
assert.equal(coverage.complete, true, 'Phase G rollout must leave no operational registry scope unregistered/incomplete');
assert(coverage.rows.every((row) => row.ready));

const section = renderBootstrapSection(coverage);
assert.match(section, /Coverage: `COMPLETE`/);
assert.match(section, /Legacy\/unregistered scopes: none/);
assert.doesNotMatch(section, /LEGACY\/UNREGISTERED_FOR_STANDARD/);
for (const id of expectedIds) assert(section.includes(`\`${id}\`: \`BOOTSTRAP_READY\``), `${id} must render BOOTSTRAP_READY`);

const fixture = '# Ops\n\n## Bootstrap & durable-memory health\n\n- old\n- Workstreams without descriptors remain `LEGACY/UNREGISTERED_FOR_STANDARD`.\n\n## Recent recoveries\n\n- none\n';
const replaced = replaceBootstrapSection(fixture, section);
assert.match(replaced, /Coverage: `COMPLETE`/);
assert.doesNotMatch(replaced, /LEGACY\/UNREGISTERED_FOR_STANDARD/);
assert.match(replaced, /## Recent recoveries/);

const opsWorkflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-ops.yml'), 'utf8');
assert.match(opsWorkflow, /bootstrap-surface\.cjs refresh/);
assert.match(opsWorkflow, /docs\/\*_GUIDELINES\.md/);

console.log(`CANONICAL_MAIN_BOOTSTRAP_ROLLOUT:OK:${coverage.readyCount}/${coverage.expectedCount}:shared-guidance`);
