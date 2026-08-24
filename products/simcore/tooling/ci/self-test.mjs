#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { classifyPaths } from './classify.mjs';

const checks = [];
const ok = (id, fn) => { fn(); checks.push(id); };
const expect = (value, message) => { if (!value) throw new Error(message); };

ok('unrelated-noop-classification', () => {
  const r = classifyPaths(['products/usage-dashboard/README.md']);
  expect(r.unrelated && r.labels.length === 0, JSON.stringify(r));
});
ok('simcore-doc-only-classification', () => {
  const r = classifyPaths(['docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md']);
  expect(r.docOnly && r.labels.includes('SIMCORE_DOC_ONLY'), JSON.stringify(r));
});
ok('ci-self-classification', () => {
  const r = classifyPaths(['.github/workflows/simcore-ci.yml']);
  expect(r.labels.includes('CI_SELF'), JSON.stringify(r));
});
ok('release-system-classification', () => {
  for (const p of [
    '.github/workflows/simcore-release.yml',
    '.github/workflows/simcore-release-permanent.yml',
    '.github/workflows/simcore-release-required.yml',
    'products/simcore/tooling/release-shadow.mjs',
    'products/simcore/tooling/release-authority.mjs',
    'products/simcore/tooling/release-publish.mjs',
    'products/simcore/tooling/post-publish-state.mjs',
    'products/simcore/tests/release-controller-qualification.test.mjs',
    'products/simcore/tests/post-publish-state-permanent.test.mjs',
    'products/simcore/releases/release-schema-v1.json',
  ]) {
    const r=classifyPaths([p]);
    expect(r.labels.includes('CI_SELF') && r.labels.includes('HARNESS') && !r.labels.includes('LEGACY_VERIFICATION'), `${p}: ${JSON.stringify(r)}`);
  }
});
ok('state-sync-classification', () => {
  for (const p of [
    'products/simcore/tooling/sync-state.mjs',
    'products/simcore/tooling/declare-production.mjs',
    'products/simcore/tooling/post-publish-state-shadow.mjs',
    'products/simcore/tooling/post-publish-state.mjs',
    'products/simcore/tests/post-publish-state-shadow.test.mjs',
    'products/simcore/tests/post-publish-state-permanent.test.mjs',
    'products/simcore/tooling/admin-state-transition.mjs',
    'products/simcore/tests/admin-state-transition.test.mjs',
    '.github/workflows/simcore-release-state-sync.yml',
    '.github/workflows/simcore-release-permanent.yml',
  ]) {
    const r = classifyPaths([p]);
    expect(r.labels.includes('STATE_SYNC'), `${p}: ${JSON.stringify(r)}`);
  }
});
ok('permanent-release-coordination-classification', () => {
  const r = classifyPaths(['.github/workflows/simcore-release-permanent.yml']);
  for (const id of ['CI_SELF','HARNESS','STATE_SYNC','SHARED_MAIN_COORDINATION']) expect(r.labels.includes(id), JSON.stringify(r));
  expect(!r.labels.includes('LEGACY_VERIFICATION'), JSON.stringify(r));
});
ok('post-publish-shadow-coordination-classification', () => {
  const r = classifyPaths(['products/simcore/tests/post-publish-state-shadow.test.mjs']);
  expect(r.labels.includes('SHARED_MAIN_COORDINATION'), JSON.stringify(r));
});
ok('admin-state-writer-coordination-classification', () => {
  const r = classifyPaths(['.github/workflows/simcore-release-state-sync.yml']);
  for (const id of ['CI_SELF','HARNESS','STATE_SYNC','SHARED_MAIN_COORDINATION']) expect(r.labels.includes(id), JSON.stringify(r));
});
ok('contract-multilabel-classification', () => {
  const r = classifyPaths(['products/simcore/contracts/frozen-surfaces-v1.json']);
  for (const id of ['CI_SELF','HARNESS','ARCH_CONTRACT']) expect(r.labels.includes(id), JSON.stringify(r));
});
ok('legacy-workflow-classification', () => {
  const r = classifyPaths(['.github/workflows/simcore-06406-closure-completion-gate-v2.yml']);
  expect(r.labels.includes('LEGACY_VERIFICATION'), JSON.stringify(r));
});

ok('workflow-read-only-trust-boundary', () => {
  const workflow = fs.readFileSync('.github/workflows/simcore-ci.yml', 'utf8');
  const forbidden = ['contents: write','pull_request_target:','${{ secrets.','repo-main-write.py','sync-state.mjs --write','git push','id-token: write'];
  for (const token of forbidden) expect(!workflow.includes(token), `forbidden workflow token: ${token}`);
  expect(workflow.includes('permissions:\n  contents: read'), 'contents: read permission missing');
  expect(workflow.includes('name: Required'), 'stable Required job missing');
  expect(!/uses:\s+[^\n]+@(?![0-9a-f]{40}\b)/.test(workflow), 'external action is not full-SHA pinned');
});

ok('automated-state-writer-bot-provenance', () => {
  const workflow = fs.readFileSync('.github/workflows/simcore-release-state-sync.yml', 'utf8');
  const names = [...workflow.matchAll(/git config user\.name '([^']+)'/g)].map((m) => m[1]);
  const emails = [...workflow.matchAll(/git config user\.email '([^']+)'/g)].map((m) => m[1]);
  expect(names.length === 1 && names[0] === 'github-actions[bot]', `unexpected automated writer name: ${JSON.stringify(names)}`);
  expect(emails.length === 1 && emails[0] === '41898282+github-actions[bot]@users.noreply.github.com', `unexpected automated writer email identity: ${JSON.stringify(emails)}`);
});

ok('admin-state-writer-boundary', () => {
  const workflow = fs.readFileSync('.github/workflows/simcore-release-state-sync.yml', 'utf8');
  const admin = workflow.indexOf('node products/simcore/tooling/admin-state-transition.mjs');
  const render = workflow.indexOf('node products/simcore/tooling/sync-state.mjs');
  expect(workflow.includes("TRANSITION='products/simcore/state-sync/active-admin-transition.json'"), 'registered admin transition path missing');
  expect(admin >= 0 && render > admin, 'admin transition must run before sync-state rendering');
  expect(workflow.includes('--required-profile MAIN_HEALTH'), 'state writer must use MAIN_HEALTH project gateway');
  expect(workflow.includes('--required-job Required'), 'state writer Required gate missing');
  expect(workflow.includes('--allow product-manifest.json'), 'manifest allowlist missing');
  expect(workflow.includes('--allow docs/CURRENT_DEVELOPMENT.md'), 'current-development allowlist missing');
  expect(!workflow.includes('--allow products/simcore/state-sync/active-admin-transition.json'), 'transition spec must not be part of generated state payload');
});

ok('release-shadow-read-only-boundary', () => {
  const workflow=fs.readFileSync('.github/workflows/simcore-release.yml','utf8');
  for(const token of ['contents: write','git push','--force','release-simcore:']) expect(!workflow.includes(token),`shadow release workflow forbidden token: ${token}`);
  expect(workflow.includes('permissions:\n  contents: read'),'shadow release contents:read missing');
  expect(workflow.includes('profile: CANDIDATE_REQUIRED'),'candidate required caller missing');
  expect(workflow.includes("releaseAuthority']=='SHADOW_ONLY'"),'shadow authority assertion missing');
  expect(!/uses:\s+actions\/(?:checkout|upload-artifact)@(?![0-9a-f]{40}\b)/.test(workflow),'release external action is not pinned');
});

ok('permanent-required-read-only-boundary', () => {
  const workflow=fs.readFileSync('.github/workflows/simcore-release-required.yml','utf8');
  for(const token of ['contents: write','git push','--force','force-with-lease','pull_request_target:']) expect(!workflow.includes(token),`permanent Required forbidden token: ${token}`);
  expect(workflow.includes('permissions:\n  contents: read'),'permanent Required contents:read missing');
  expect(workflow.includes('--profile CANDIDATE_REQUIRED'),'permanent Required profile missing');
  expect(workflow.includes('--candidate-required-authority RS2_4_RELEASE'),'permanent release authority marker missing');
  expect(workflow.includes('name: Required'),'permanent Required stable terminal job missing');
  expect(!/uses:\s+actions\/(?:checkout|setup-node|setup-python|upload-artifact)@(?![0-9a-f]{40}\b)/.test(workflow),'permanent Required external action is not pinned');
});

ok('permanent-release-controller-boundary', () => {
  const workflow=fs.readFileSync('.github/workflows/simcore-release-permanent.yml','utf8');
  const writes=[...workflow.matchAll(/contents:\s+write/g)];
  expect(writes.length===2,`permanent caller write scope count=${writes.length}`);
  expect(workflow.includes('permissions:\n  contents: read\n  actions: read'),'permanent caller top-level read-only permission missing');
  for(const token of ['authority_confirmation','RS2_4_RELEASE','uses: ./.github/workflows/simcore-release-required.yml','release-publish.mjs','--mode publish','post-publish-state.mjs','repo-main-write.py','--required-profile MAIN_HEALTH','--required-job Required','PENDING_REAL_LONG_CHAT']) expect(workflow.includes(token),`permanent caller required token missing: ${token}`);
  for(const token of ['--force','force-with-lease','git push --force','+refs/heads/release-simcore']) expect(!workflow.includes(token),`permanent caller forbidden token: ${token}`);
  expect(!/uses:\s+actions\/(?:checkout|download-artifact|upload-artifact)@(?![0-9a-f]{40}\b)/.test(workflow),'permanent caller external action is not pinned');
});

ok('permanent-required-authority-set-bounded', () => {
  const check=fs.readFileSync('products/simcore/tooling/check.mjs','utf8');
  expect(check.includes("new Set(['RS2_4_SHADOW', 'RS2_4_RELEASE'])"),'CANDIDATE_REQUIRED authority set is not exact');
  expect(check.includes('CANDIDATE_REQUIRED_RESERVED_FOR_RS2_4'),'reserved authority failure code missing');
});

ok('release-shadow-deterministic-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/release-shadow.test.mjs'],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
  expect(r.status===0,`release shadow tests failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('RS2_4_SHADOW_TESTS_PASS'),'release shadow pass marker missing');
});

ok('rs2-4e-controller-qualification-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/release-controller-qualification.test.mjs'],{encoding:'utf8',timeout:240000,maxBuffer:1024*1024});
  expect(r.status===0,`RS2-4E controller qualification failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('RS2_4E_CONTROLLER_QUALIFICATION_PASS E-A1-E-A6 P2 P3 R1 N1-N9'),'RS2-4E qualification pass marker missing');
});

ok('admin-state-transition-deterministic-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/admin-state-transition.test.mjs'],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
  expect(r.status===0,`RS2-4E admin-state transition tests failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('RS2_4E_ADMIN_STATE_TRANSITION_TEST_PASS'),'admin-state transition pass marker missing');
});

ok('post-publish-state-shadow-deterministic-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/post-publish-state-shadow.test.mjs'],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024});
  expect(r.status===0,`RS2-4D state shadow tests failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('RS2_4D_POST_PUBLISH_STATE_SHADOW_TEST_PASS S1-S8'),'RS2-4D state shadow pass marker missing');
});

ok('post-publish-state-permanent-deterministic-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/post-publish-state-permanent.test.mjs'],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024});
  expect(r.status===0,`RS2-4E permanent state tests failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('RS2_4E_POST_PUBLISH_STATE_PERMANENT_TEST_PASS P1-P5'),'RS2-4E permanent state pass marker missing');
});

ok('legacy-map-complete', () => {
  const map = JSON.parse(fs.readFileSync('products/simcore/ci/legacy-gate-map.json','utf8'));
  const mapped = new Set(map.workflows.map((row) => row.legacyWorkflow));
  const permanent = new Set(['simcore-ci.yml','simcore-release.yml','simcore-release-permanent.yml','simcore-release-required.yml']);
  const files = fs.readdirSync('.github/workflows')
    .filter((name) => /^simcore-.*\.yml$/.test(name))
    .filter((name) => !permanent.has(name))
    .map((name) => `.github/workflows/${name}`);
  for (const file of files) expect(mapped.has(file), `LEGACY_GATE_UNCLASSIFIED: ${file}`);
  for (const row of map.workflows) expect(row.status !== 'UNMAPPED', `unmapped workflow: ${row.legacyWorkflow}`);
  expect(map.status === 'SHADOW_VERIFIED', `legacy map status=${map.status}`);
  const pure = map.workflows.find((row) => row.class === 'CHECK_ONLY_PREDECESSOR');
  expect(pure?.status === 'SHADOW_VERIFIED' && pure?.retirementEligibility === 'YES', 'pure predecessor is not retirement-eligible');
  for (const row of map.workflows.filter((x) => x.class === 'MIXED_BUILD_VALIDATOR')) {
    expect(row.status === 'VALIDATION_REPLACED', `mixed validator not validation-replaced: ${row.legacyWorkflow}`);
    expect(row.writeDisposition === 'RS2_4_PENDING', `mixed validator write disposition changed: ${row.legacyWorkflow}`);
  }
});

ok('legacy-compat-bounded', () => {
  const cfg = JSON.parse(fs.readFileSync('products/simcore/ci/legacy-compat.json','utf8'));
  expect(cfg.status === 'TRANSITIONAL_BOUNDED', 'legacy compat status');
  expect(cfg.assertions.length > 0 && cfg.assertions.length <= 8, 'legacy compat assertion count');
  for (const row of cfg.assertions) {
    expect(row.execution === 'READ_ONLY_SOURCE_ARGUMENT', row.id);
    expect(row.nonBlockingForRelease === true, row.id);
    expect(Boolean(row.futurePermanentOwner), row.id);
  }
});

ok('shadow-ledger-verified', () => {
  const ledger = JSON.parse(fs.readFileSync('products/simcore/ci/shadow-equivalence.json','utf8'));
  expect(ledger.requiredPositivePerRetirementUnit === 3, 'positive shadow threshold');
  expect(ledger.requiredDistinctEvidenceIdentities === 2, 'shadow diversity threshold');
  expect(ledger.status === 'SHADOW_VERIFIED', `shadow status=${ledger.status}`);
  expect(Array.isArray(ledger.records) && ledger.records.length >= 3, 'insufficient positive shadow records');
  const verifiers = new Set(ledger.records.map((row) => row.verifierCommit));
  expect(verifiers.size >= 2, `insufficient verifier diversity=${verifiers.size}`);
  expect(ledger.records.every((row) => row.permanent === 'PASS' && row.legacyArchitecture === 'PASS' && row.legacyRobust25 === 'PASS'), 'positive shadow record not PASS');
  expect(Array.isArray(ledger.negativeParity) && ledger.negativeParity.length >= 4, 'negative parity evidence incomplete');
  expect(Array.isArray(ledger.openMismatchIds) && ledger.openMismatchIds.length === 0, `open shadow mismatches=${JSON.stringify(ledger.openMismatchIds)}`);
  expect(ledger.runtimeMutation === 'NONE' && ledger.releaseSimcoreMutation === 'NONE', 'shadow proof crossed runtime/release boundary');
});

console.log(`SimCore CI self-test PASS (${checks.length})`);
