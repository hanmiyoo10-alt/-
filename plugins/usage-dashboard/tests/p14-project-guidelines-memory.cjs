const fs = require('node:fs');
const assert = require('node:assert/strict');

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

const productVersion = String(manifest.productVersion || '');
const engineVersion = String(manifest.components?.bridge?.requiredVersion || '');
const managerVersion = String(manifest.components?.bridgeManager?.version || '');
const releaseBranch = String(manifest.releaseBranch || '');

assert.ok(productVersion && engineVersion && managerVersion && releaseBranch, 'manifest release-state fields must be present');
assert.ok(guidelines.includes('Canonical repository: `hanmiyoo10-alt/-`'));
assert.ok(guidelines.includes('Canonical plugin path: `plugins/usage-dashboard/`'));
assert.ok(guidelines.includes('Production release branch: `release-usage-dashboard`'));
assert.ok(guidelines.includes('<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->'));
assert.ok(guidelines.includes('<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->'));
assert.ok(guidelines.includes(`- Product: \`${productVersion}\``), 'guidelines product version must match manifest');
assert.ok(guidelines.includes(`- Bridge Engine: \`${engineVersion}\``), 'guidelines Bridge Engine must match manifest');
assert.ok(guidelines.includes(`- Bridge Manager: \`${managerVersion}\``), 'guidelines Bridge Manager must match manifest');
assert.ok(guidelines.includes(`- Release branch: \`${releaseBranch}\``), 'guidelines release branch must match manifest');
assert.ok(guidelines.includes('Diagnostic → Analysis → TURN END → User asks for next update → Design → Development'));
assert.ok(guidelines.includes('Do **not** begin the next release, modify code, create a release, or deploy from the diagnostic turn.'));
assert.ok(guidelines.includes('One release, one primary goal'));
assert.ok(guidelines.includes('Each version update must also refresh this document\'s Current production snapshot.'));
assert.ok(guidelines.includes('Do not fabricate unknown data.'));

console.log(`usage-dashboard P14 project memory: OK · ${productVersion} / engine ${engineVersion} / manager ${managerVersion}`);
