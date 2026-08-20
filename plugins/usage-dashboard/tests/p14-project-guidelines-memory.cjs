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

// Durable strategic memory must survive chat/session changes and routine release edits.
assert.ok(guidelines.includes('## Long-term update roadmap'), 'long-term roadmap section must remain present');
assert.ok(guidelines.includes('Evidence outranks roadmap order.'), 'roadmap must remain subordinate to current evidence');
assert.ok(guidelines.includes('### Phase A — Performance and scheduling'));
assert.ok(guidelines.includes('### Phase B — Data fidelity and DevPass parity'));
assert.ok(guidelines.includes('### Phase C — UX and feature parity'));
assert.ok(guidelines.includes('### Phase D — Stability, recovery and release engineering'));
assert.ok(guidelines.includes('### Phase E — RC and stable readiness'));
assert.ok(guidelines.includes('Keep UNKNOWN distinct from known zero'), 'roadmap must preserve source-fidelity semantics');
assert.ok(guidelines.includes('Keep PocketRisu `+` as the normal update path'), 'roadmap must preserve the stable update UX');
assert.ok(guidelines.includes('New chats should read this roadmap together with the current production snapshot and current development memory before proposing the next release.'));

console.log(`usage-dashboard P14 project memory: OK · ${productVersion} / engine ${engineVersion} / manager ${managerVersion} · long-term roadmap locked`);
