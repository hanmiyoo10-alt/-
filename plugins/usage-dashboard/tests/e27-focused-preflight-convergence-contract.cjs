'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const e27 = require('../tools/release_focused_preflight_e27.cjs');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml', 'utf8');
const reconcileSource = fs.readFileSync('plugins/usage-dashboard/tools/reconcile_release_candidate.py', 'utf8');
const helperSource = fs.readFileSync('plugins/usage-dashboard/tools/release_focused_preflight_e27.cjs', 'utf8');
const registrySource = fs.readFileSync('plugins/usage-dashboard/tests/registry.cjs', 'utf8');
const reconciler = fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml', 'utf8');
const validator = fs.readFileSync('.github/workflows/usage-dashboard-e9-validate.yml', 'utf8');
const e26Source = fs.readFileSync('plugins/usage-dashboard/tools/release_validation_convergence_e26.cjs', 'utf8');
const e11Source = fs.readFileSync('plugins/usage-dashboard/tools/merge_guard_e11.cjs', 'utf8');
const e16Source = fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs', 'utf8');

// E27 remains maintenance inside existing E7, not a new workflow or release-generation authority.
const e27Workflows = fs.readdirSync('.github/workflows').filter((name)=>/e27/i.test(name));
assert.deepEqual(e27Workflows, [], 'E27 must not add a standalone workflow');
assert.equal(reconciler.includes('release_generation: E27'), false);
assert.equal(validator.includes('release_generation: E27'), false);
assert.ok(registrySource.includes("'e27-focused-preflight-convergence-contract.cjs'"), 'E27 maintenance regression must join canonical registry');

// Placement: E7 freezes source/main, invokes the two-pass reconciler, and only a successful
// materialize_stage may reach the trusted writer. The reconciler runs E27 only after its
// idempotence proof and existing E19 structural gates.
const frozenAt = workflow.indexOf('E7_STAGE_SOURCE_FROZEN:');
const twoPassAt = workflow.indexOf('reconcile_release_candidate.py --spec "$RELEASE_SPEC" --two-pass');
const writerAt = workflow.indexOf('write_candidate:');
assert.ok(frozenAt >= 0 && twoPassAt > frozenAt, 'source/main identity must freeze before two-pass materialization');
assert.ok(writerAt > twoPassAt, 'trusted candidate writer remains downstream of materialize job');
assert.ok(workflow.includes("needs.materialize_stage.result == 'success'"), 'candidate writer must require materialize success');

const idempotentAt = reconcileSource.indexOf('MATERIALIZER_IDEMPOTENT:');
const structuralCallAt = reconcileSource.lastIndexOf('run_shift_left_structural_gates(spec_path)');
const focusedCallAt = reconcileSource.lastIndexOf('run_e27_focused_preflight(spec_path)');
assert.ok(idempotentAt >= 0 && structuralCallAt > idempotentAt, 'E19 structural gates remain after idempotence');
assert.ok(focusedCallAt > structuralCallAt, 'E27 focused preflight must run after deterministic two-pass/idempotence');
assert.ok(reconcileSource.includes("E27_FOCUSED_PREFLIGHT = TOOLS / 'release_focused_preflight_e27.cjs'"));
assert.ok(reconcileSource.includes("fail('E27_FOCUSED_PREFLIGHT_REJECTED'"));
assert.ok(reconcileSource.includes('E27_FOCUSED_PREFLIGHT_GREEN:'));

// The exact focused regression comes from the frozen release spec and must be registry-discoverable.
const resolved = e27.resolveFocusedRegression('.github/usage-dashboard/releases/5.108.json');
assert.equal(resolved.regressionPath, 'plugins/usage-dashboard/tests/p75-devpass-api-key-org-limit.cjs');
const current = e27.runFocusedPreflight('.github/usage-dashboard/releases/5.108.json');
assert.equal(current.result, 'GREEN');
assert.equal(current.regressionPath, 'plugins/usage-dashboard/tests/p75-devpass-api-key-org-limit.cjs');
assert.equal(current.e21, 'plugins/usage-dashboard/tests/e21-evidence-consumer-convergence-contract.cjs');

assert.equal(e27.normalizeFocusedRegressionPath(undefined), null, 'maintenance transactions may omit a product-focused regression');
assert.throws(()=>e27.normalizeFocusedRegressionPath('/tmp/p75.cjs'), (error)=>error.code === 'RED_SPEC');
assert.throws(()=>e27.normalizeFocusedRegressionPath('../plugins/usage-dashboard/tests/p75.cjs'), (error)=>error.code === 'RED_SPEC');
assert.throws(()=>e27.normalizeFocusedRegressionPath('plugins/usage-dashboard/tools/p75.cjs'), (error)=>error.code === 'RED_SPEC');
assert.throws(()=>e27.normalizeFocusedRegressionPath('plugins/usage-dashboard/tests/subdir/p75.cjs'), (error)=>error.code === 'RED_SPEC');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-e27-'));
try {
  const missingSpec = path.join(temp, 'missing.json');
  fs.writeFileSync(missingSpec, JSON.stringify({newRegression:'plugins/usage-dashboard/tests/p9999-e27-missing.cjs'}));
  assert.throws(()=>e27.resolveFocusedRegression(missingSpec), (error)=>error.code === 'RED_SPEC');
} finally {
  fs.rmSync(temp, {recursive:true, force:true});
}

// E21 is reused as the exact existing executable contract. E27 does not copy its allowlists/markers.
assert.ok(helperSource.includes("const E21_TEST = 'plugins/usage-dashboard/tests/e21-evidence-consumer-convergence-contract.cjs'"));
assert.equal(helperSource.includes("directEvidenceNames = ['verifiedBaseline'"), false, 'E21 static ownership rules must not be copied into E27');
assert.equal(helperSource.includes('directEvidenceOwners = new Set'), false, 'E21 allowlist must remain single-owned');

// Semantic owner resolution is content/graph based, not a remembered source-part filename map.
const semanticMarker = 'loadDevPassStatus()';
assert.deepEqual(
  e27.resolveUniqueSemanticOwnerFromFiles(semanticMarker, [
    {path:'part-a.mjs', content:'let status = loadDevPassStatus();'},
    {path:'part-b.mjs', content:'const other = 1;'},
  ]),
  {path:'part-a.mjs', marker:semanticMarker},
  'semantic owner must not depend on const/let declaration syntax',
);
assert.throws(
  ()=>e27.resolveUniqueSemanticOwnerFromFiles('missingSemanticMarker()', [{path:'part-a.mjs',content:'const x=1;'}]),
  (error)=>error.code === 'RED_OWNER_MISSING',
);
assert.throws(
  ()=>e27.resolveUniqueSemanticOwnerFromFiles(semanticMarker, [
    {path:'part-a.mjs',content:'const a = loadDevPassStatus();'},
    {path:'part-b.mjs',content:'let b = loadDevPassStatus();'},
  ]),
  (error)=>error.code === 'RED_OWNER_AMBIGUOUS',
);
assert.equal(helperSource.includes('54-dashboard-markup.part.js'), false, 'E27 must not embed a remembered DevPass owner filename');
assert.equal(helperSource.includes('50-dashboard-context.part.js'), false, 'E27 must not embed a remembered DevPass owner filename');

// Read-only/local helper: no network, credentials, durable receipt writer, scheduler, or retry ledger.
for (const forbidden of [
  'GITHUB_TOKEN', 'fetch(', 'https.request', 'http.request', 'curl ', 'writeFileSync(',
  'setTimeout(', 'setInterval(', 'UD_E9_VALIDATION_ATTEMPT_V2', 'workflow_dispatch',
]) {
  assert.equal(helperSource.includes(forbidden), false, `E27 helper must remain local/read-only: ${forbidden}`);
}

// A focused RED exits the two-pass reconcile command, so materialize_stage fails before tree/bundle writer.
assert.ok(workflow.indexOf('write_candidate:') < workflow.indexOf('receipt_ready:'), 'candidate-ready receipt remains after writer');
assert.equal(workflow.includes('UD_E9_VALIDATION_ATTEMPT_V2'), false, 'E7 must not create E9 attempt receipts');
assert.equal(reconcileSource.includes('GITHUB_TOKEN'), false, 'E27 reconciliation seam must not gain credential authority');
assert.equal(reconcileSource.includes('release_generation: E27'), false);

// E26/E15/E9/E11/E16 boundaries remain independently sealed after candidate publication.
assert.ok(reconciler.includes('release_validation_convergence_e26.cjs'));
assert.ok(e26Source.includes("require('./release_handoff_e15.cjs')"), 'E15 remains owned by the E26 convergence helper');
assert.ok(e26Source.includes('evaluateHandoff'), 'E26 must still evaluate E15 handoff before validation convergence');
assert.ok(e11Source.includes('MERGE_READY_NO_DRIFT'), 'E11 no-drift authority remains present');
assert.ok(e16Source.includes("require('./release_handoff_e15.cjs')"), 'E16 remains derived from the existing handoff authority chain');
assert.ok(e16Source.includes('MERGE_READY_NO_DRIFT'), 'E16 still requires a fresh ready E11 verdict');
assert.ok(validator.includes('tests/run-all.cjs'), 'E9 must still run the full discovered registry');

console.log('E27 Focused Preflight Convergence: OK · E7 shift-left · declared Pxx · E21 reuse · semantic owner · E9 authority preserved');
