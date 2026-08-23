const fs = require('node:fs');
const assert = require('node:assert/strict');

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const productVision = fs.readFileSync('docs/USAGE_DASHBOARD_PRODUCT_VISION.md', 'utf8');
const anomalyReview = fs.readFileSync('docs/USAGE_DASHBOARD_PR_CI_ANOMALY_REVIEW.md', 'utf8');

const productVersion = String(manifest.productVersion || '');
const engineVersion = String(manifest.components?.bridge?.requiredVersion || '');
const managerVersion = String(manifest.components?.bridgeManager?.version || '');
const releaseBranch = String(manifest.releaseBranch || '');

assert.ok(guidelines.includes('Canonical repository: `hanmiyoo10-alt/-`'));
assert.ok(guidelines.includes('Canonical plugin path: `plugins/usage-dashboard/`'));
assert.ok(guidelines.includes('Production release branch: `release-usage-dashboard`'));
assert.ok(guidelines.includes('<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->'));
assert.ok(guidelines.includes('<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->'));
assert.ok(guidelines.includes(`- Bridge Engine: \`${engineVersion}\``), 'guidelines Bridge Engine must match manifest');
assert.ok(guidelines.includes(`- Bridge Manager: \`${managerVersion}\``), 'guidelines Bridge Manager must match manifest');
assert.ok(guidelines.includes(`- Release branch: \`${releaseBranch}\``), 'guidelines release branch must match manifest');
assert.ok(guidelines.includes('Diagnostic → Analysis → TURN END → User asks for next update → Design → Development'));
assert.ok(guidelines.includes('Do **not** begin the next release, modify code, create a release, or deploy from the diagnostic turn.'));
assert.ok(guidelines.includes('One release, one primary goal'));
assert.ok(guidelines.includes('Each version update must also refresh this document\'s Current production snapshot.'));
assert.ok(guidelines.includes('Do not fabricate unknown data.'));

// Durable PR/CI anomaly review memory must survive later GREEN reruns and chat/session changes.
assert.ok(anomalyReview.includes('# Local Usage Dashboard — PR / CI Anomaly Review Contract'));
assert.ok(anomalyReview.includes('a later GREEN result must not erase an earlier abnormal PR or Actions result'));
assert.ok(anomalyReview.includes('The user should not have to notice or ask about failed PR checks manually.'));
assert.ok(anomalyReview.includes('**Production mutation**'));
assert.ok(anomalyReview.includes('Do not retry a release blindly when production mutation is UNKNOWN.'));
assert.ok(anomalyReview.includes('RELEASE_REF_POSTVERIFY_MISMATCH'));
assert.ok(anomalyReview.includes('NOOP_IDENTICAL'));
assert.ok(anomalyReview.includes('User involvement remains limited to real Android/PocketRisu validation'));

// Durable strategic roadmap memory must survive chat/session changes and routine release edits.
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

// Durable product vision answers why the product exists and what completion means.
assert.ok(productVision.includes('# Local Usage Dashboard — Product Vision'), 'product vision document must remain present');
assert.ok(productVision.includes('## North Star'), 'North Star must remain explicit');
assert.ok(productVision.includes('one trustworthy local place to understand DevPass, Credits, and LLMGateway usage inside PocketRisu'), 'North Star meaning must remain intact');
assert.ok(productVision.includes('## Product principles'));
assert.ok(productVision.includes('Truth before completeness'));
assert.ok(productVision.includes('Stable before clever'));
assert.ok(productVision.includes('Measure before optimize'));
assert.ok(productVision.includes('Updates must be boring'));
assert.ok(productVision.includes('UNKNOWN is a valid state and must remain distinct from known zero'), 'product vision must preserve UNKNOWN semantics');
assert.ok(productVision.includes('Normal updates use PocketRisu `+`'), 'product vision must preserve the normal update UX');
assert.ok(productVision.includes('## Definition of done'), 'definition of done must remain explicit');
assert.ok(productVision.includes('Data fidelity complete enough to trust'));
assert.ok(productVision.includes('Runtime performance is no longer a daily usability problem'));
assert.ok(productVision.includes('Long-lived runtime behavior is reliable'));
assert.ok(productVision.includes('Update and release behavior is trustworthy'));
assert.ok(productVision.includes('UX is sufficient as the primary local usage view'));
assert.ok(productVision.includes('RC/stable evidence exists'));
assert.ok(productVision.includes('## Current product position'));
assert.ok(productVision.includes('Strategically, the product is still in **alpha**.'));
assert.ok(productVision.includes('## Cross-chat recovery contract'));
assert.ok(productVision.includes('Read current production from `release-usage-dashboard`'), 'cross-chat recovery must begin from actual production');
assert.ok(productVision.includes('Read `docs/USAGE_DASHBOARD_GUIDELINES.md`'), 'cross-chat recovery must include operating memory');
assert.ok(productVision.includes('Read this Product Vision'), 'cross-chat recovery must include product-level memory');
assert.ok(productVision.includes('The vision supplies direction, not permission to ignore contradictory production evidence.'));

console.log(`usage-dashboard P14 project memory: OK · ${productVersion} / engine ${engineVersion} / manager ${managerVersion} · roadmap + product vision + PR/CI anomaly review locked`);

