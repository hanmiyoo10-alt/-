'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const e18 = require('../tools/derived_impact_e18.cjs');
const stagePolicy = require('../tools/candidate_stage_policy.cjs');

let impact = e18.deriveImpact([
  '.github/usage-dashboard/releases/5.95.json',
  'plugins/usage-dashboard/tests/p61-example.cjs',
  'plugins/usage-dashboard/tools/release_example_595.py',
  'plugins/usage-dashboard/latest.js',
]);
assert.equal(impact.plugin, true, 'materializer-only source intent must still detect generated Plugin impact');
assert.equal(impact.engine, false);
assert.equal(impact.tests, true);
assert.equal(impact.control_plane, true);
assert.deepEqual(e18.smokePlan(impact), {mode:'run',repeat:1,reason:'plugin-impact'});

impact = e18.deriveImpact(['plugins/usage-dashboard/runtime/bridge-engine.mjs']);
assert.equal(impact.engine, true);
assert.deepEqual(e18.smokePlan(impact), {mode:'run',repeat:3,reason:'engine-impact'});

impact = e18.deriveImpact([
  'plugins/usage-dashboard/runtime/bridge-manager.cjs',
  'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
]);
assert.equal(impact.manager, true);
assert.equal(impact.bootstrap, true);
assert.deepEqual(e18.smokePlan(impact), {mode:'run',repeat:1,reason:'runtime-sidecar-impact'});

impact = e18.deriveImpact([
  'plugins/usage-dashboard/tests/e18-semantic-impact-smoke-contract.cjs',
  'docs/USAGE_DASHBOARD_E18_SEMANTIC_VALIDATION_IMPACT_AWARE_SMOKE_DESIGN.md',
]);
assert.equal(impact.plugin, false);
assert.equal(impact.engine, false);
assert.equal(impact.manager, false);
assert.equal(impact.bootstrap, false);
assert.deepEqual(e18.smokePlan(impact), {mode:'skip',repeat:0,reason:'no-derived-runtime-impact'});

impact = e18.deriveImpact(['plugins/usage-dashboard/runtime/future-sidecar.bin']);
assert.equal(impact.unknown, true);
assert.deepEqual(impact.unknownPaths, ['plugins/usage-dashboard/runtime/future-sidecar.bin']);
assert.deepEqual(e18.smokePlan(impact), {mode:'block',repeat:0,reason:'unknown-runtime-impact'});
assert.match(e18.diagnostic(impact), /unknown=true/);

impact = e18.deriveImpact(['plugins/usage-dashboard/runtime/product-manifest.json'], {contractsChanged:true});
assert.equal(impact.contracts, true);
assert.equal(impact.unknown, false, 'known manifest path must not become unknown runtime impact');

assert.equal(stagePolicy.classifyPath('plugins/usage-dashboard/tools/derived_impact_e18.cjs',''),'denied', 'E18 control helper must remain outside product source authority');
assert.equal(stagePolicy.classifyPath('plugins/usage-dashboard/src/16-usage-analytics.part.js',''),'plugin-source');
assert.equal(stagePolicy.classifyPath('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs',''),'engine-source');

const helperSource = fs.readFileSync('plugins/usage-dashboard/tools/derived_impact_e18.cjs','utf8');
for (const forbidden of ['fetch(', 'https.request', 'http.request', 'curl ', 'GITHUB_TOKEN', 'setTimeout(', 'setInterval(', 'writeFileSync(', 'git push', 'merge_pull_request']) {
  assert.equal(helperSource.includes(forbidden), false, `E18 impact helper must remain local/read-only: ${forbidden}`);
}
assert.ok(helperSource.includes("execFileSync('git'"), 'E18 may derive impact only from local deterministic Git state');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
assert.ok(workflow.includes('derived_impact_e18.cjs --smoke-plan "$TRUSTED_BASE_SHA"'), 'E7 must select smoke from post-materialization derived impact');
assert.ok(workflow.includes('UD_DERIVED_IMPACT:'), 'E7 should expose bounded derived-impact diagnostics');
assert.ok(workflow.includes("E18_UNKNOWN_RUNTIME_IMPACT"), 'unknown shipped/runtime impact must fail closed');
assert.equal(workflow.includes("if [[ \"$ENGINE_CHANGED\" == 'true' ]]"), false, 'source-intent Engine flag must no longer select behavior smoke');
assert.equal(workflow.includes("elif [[ \"$PLUGIN_CHANGED\" == 'true' ]]"), false, 'source-intent Plugin flag must no longer select behavior smoke');
assert.ok(workflow.includes('ENGINE_CHANGED:' ) || workflow.includes('engine_changed='), 'source-intent Engine classification remains available for source policy/diagnostics');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_cost_drivers_594.py','utf8');
assert.equal(materializer.includes("state:positiveCostRows > 0 ? 'name-unavailable' : 'no-positive-cost'"), false, 'historical 5.94 materializer must not reject equivalent source spelling');
assert.equal(materializer.includes("candidates.slice().sort"), false, 'feature implementation syntax belongs to P60 behavior coverage, not materializer self-checks');
assert.ok(materializer.includes('5.94 Engine exact-byte preservation failed'), 'structural exact-byte assertions remain in materializer');
assert.ok(materializer.includes('5.94 manifest Product mismatch'), 'structural target identity assertions remain in materializer');

const p60 = fs.readFileSync('plugins/usage-dashboard/tests/p60-compact-authoritative-cost-drivers.cjs','utf8');
assert.ok(p60.includes("assert.equal(truth.model.state, 'no-positive-cost'"), 'P60 must own no-positive-cost behavior semantics');
assert.ok(p60.includes("assert.equal(truth.model.name, 'a-model'"), 'P60 must own deterministic leader semantics');
assert.equal(p60.includes("state:positiveCostRows > 0 ? 'name-unavailable' : 'no-positive-cost'"), false, 'P60 must not require incidental ternary spelling');

for (const path of [
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/runtime/bridge-engine.mjs',
  'plugins/usage-dashboard/runtime/bridge-manager.cjs',
  'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
]) {
  assert.equal(fs.existsSync(path), true, `runtime baseline artifact missing: ${path}`);
}

const e17 = fs.readFileSync('plugins/usage-dashboard/tests/e17-stability-envelope-contract.cjs','utf8');
assert.ok(e17.includes('E17 Stability Envelope: OK'), 'E17 remains sealed and independently regression-locked');
const e16 = fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs','utf8');
assert.equal(e16.includes('E18'), false, 'E18 must not mutate E16 merge authority');

console.log('E18 Semantic Impact Smoke: OK · semantic Pxx ownership · derived runtime impact · unknown fail-closed · E17/E16 authority unchanged');
