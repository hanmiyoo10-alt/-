'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const specContract = require('../tools/release_spec_contract_e19.cjs');
const e18 = require('../tools/derived_impact_e18.cjs');

const currentSpec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.95.json','utf8'));
assert.deepEqual(specContract.inspectReleaseSpec(currentSpec), [], 'current 5.95 spec must satisfy canonical E19 release-spec shape');
assert.equal(specContract.assertReleaseSpec(currentSpec), currentSpec);

const broken = JSON.parse(JSON.stringify(currentSpec));
delete broken.validatorWorkflow;
delete broken.publisherWorkflow;
broken.highlights = [];
broken.diagnosticHints = ['x'.repeat(161)];
broken.managedCliAuthority.exact = false;
broken.managedModelCatalogAuthority.version = '0.0.0';
const findings = specContract.inspectReleaseSpec(broken);
const pairs = findings.map((row)=>`${row.code}@${row.field}`);
for (const expected of [
  'string-required@validatorWorkflow',
  'string-required@publisherWorkflow',
  'array-count@highlights',
  'text-too-long@diagnosticHints[0]',
  'authority-exact@managedCliAuthority.exact',
  'authority-version@managedModelCatalogAuthority.version',
  'release-notes-mirror-mismatch@releaseNotes.highlights',
  'release-notes-mirror-mismatch@releaseNotes.diagnosticHints',
]) assert.ok(pairs.includes(expected), `E19 aggregate spec findings missing ${expected}`);
assert.ok(findings.length >= 8, 'E19 should aggregate related deterministic spec findings in one pass');
assert.match(specContract.summarizeFindings(findings), /validatorWorkflow/);
assert.throws(() => specContract.assertReleaseSpec(broken), /RELEASE_SPEC_CONTRACT_REJECTED|release spec rejected/);

const helperSource = fs.readFileSync('plugins/usage-dashboard/tools/release_spec_contract_e19.cjs','utf8');
for (const forbidden of ['node:fs','child_process','execFileSync','fetch(','https.request','http.request','curl ','GITHUB_TOKEN','writeFileSync','setTimeout(','setInterval(']) {
  assert.equal(helperSource.includes(forbidden), false, `E19 spec helper must remain pure/local: ${forbidden}`);
}

const readiness = fs.readFileSync('plugins/usage-dashboard/tools/source_readiness_e9.cjs','utf8');
assert.ok(readiness.includes("require('./release_spec_contract_e19.cjs')"), 'source readiness must reuse canonical E19 spec helper');
assert.ok(readiness.includes("readinessFail('release-spec-contract'"), 'source readiness must fail closed on canonical spec findings');
assert.ok(readiness.includes('summarizeFindings(findings)'), 'source readiness should aggregate bounded spec findings');

const currentRelease = fs.readFileSync('plugins/usage-dashboard/tests/helpers/current-release.cjs','utf8');
assert.ok(currentRelease.includes('release_spec_contract_e19.cjs'), 'current release helper must reuse E19 spec contract');
assert.ok(currentRelease.includes('assertReleaseSpec(readJson(specPath)'), 'current release helper must validate the same canonical spec shape');

const p49 = fs.readFileSync('plugins/usage-dashboard/tests/p49-release-notes-diagnostic-guidance.cjs','utf8');
assert.ok(p49.includes('release_spec_contract_e19.cjs'), 'P49 must consume canonical E19 spec shape');
assert.equal(p49.includes('P49 highlights count must be 1..5'), false, 'P49 must not own a second bounded-array schema implementation');

const reconcile = fs.readFileSync('plugins/usage-dashboard/tools/reconcile_release_candidate.py','utf8');
for (const marker of [
  'assert_declared_materializer_second_pass(spec)',
  'E19_MATERIALIZER_NOT_IDEMPOTENT',
  'E19_MATERIALIZER_SECOND_PASS_GREEN',
  'run_shift_left_structural_gates(spec_path)',
  'E19_STRUCTURAL_GATE_REJECTED',
  'plugins/usage-dashboard/tests/current-release-contract.cjs',
  'plugins/usage-dashboard/tests/p5-module-layout.cjs',
  'plugins/usage-dashboard/tests/p49-release-notes-diagnostic-guidance.cjs',
]) assert.ok(reconcile.includes(marker), `E19 reconciliation path missing ${marker}`);
assert.ok(reconcile.indexOf('assert_declared_materializer_second_pass(spec)') < reconcile.indexOf('reconcile_once(spec_path, spec)'), 'declared materializer second pass must precede generic reconciliation');
assert.ok(reconcile.lastIndexOf('run_shift_left_structural_gates(spec_path)') > reconcile.lastIndexOf("MATERIALIZER_IDEMPOTENT:"), 'cheap structural gates must run after stable reconciliation');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
const materializerIndex = workflow.indexOf('python3 "$UD_MATERIALIZER"');
const reconcileIndex = workflow.indexOf('reconcile_release_candidate.py --spec "$RELEASE_SPEC" --two-pass');
const impactIndex = workflow.indexOf('derived_impact_e18.cjs --smoke-plan "$TRUSTED_BASE_SHA"');
assert.ok(materializerIndex >= 0 && reconcileIndex > materializerIndex && impactIndex > reconcileIndex, 'E19 must remain inside existing E7 order before E18 impact smoke');

assert.deepEqual(e18.smokePlan(e18.deriveImpact(['plugins/usage-dashboard/runtime/bridge-engine.mjs'])), {mode:'run',repeat:3,reason:'engine-impact'});
assert.deepEqual(e18.smokePlan(e18.deriveImpact(['plugins/usage-dashboard/runtime/future-sidecar.bin'])), {mode:'block',repeat:0,reason:'unknown-runtime-impact'});

const releaseRequest = fs.readFileSync('plugins/usage-dashboard/tools/release_request_e9.cjs','utf8');
assert.equal(releaseRequest.includes("'E19'"), false, 'E19 must not become a durable release generation');
const e16 = fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs','utf8');
assert.equal(e16.includes('E19'), false, 'E19 must not mutate E16 merge authority');

console.log('E19 Shift-Left Validation Reuse: OK · single spec contract · aggregated readiness · declared materializer second-pass · cheap structural gates before E18 · authority unchanged');
