#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classifyPath, classifyPaths, LABELS } from './classify.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
process.chdir(ROOT);
const ok = (name, fn) => { fn(); console.log(`CI_SELF_PASS ${name}`); };
const expect = (value, message) => { if (!value) throw new Error(message); };

ok('labels-unique', () => expect(new Set(LABELS).size === LABELS.length, 'labels duplicate'));
ok('unrelated-noop', () => {
  const r = classifyPaths(['README.md']);
  expect(r.unrelated === true, 'unrelated should remain unrelated');
  expect(r.labels.length === 0, 'unrelated labels');
});
ok('docs-noop', () => {
  const r = classifyPaths(['docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md']);
  expect(r.docOnly === true && r.labels.includes('SIMCORE_DOC_ONLY'), 'SimCore release-system docs should be doc-only');
});
ok('core-file-classification', () => {
  for (const [p, labels] of [
    ['products/simcore/tooling/check.mjs',['CI_SELF','HARNESS']],
    ['products/simcore/tooling/ci/classify.mjs',['CI_SELF']],
    ['products/simcore/tests/registry.mjs',['CI_SELF','HARNESS']],
    ['products/simcore/contracts/frozen-surfaces-v1.json',['CI_SELF','HARNESS','ARCH_CONTRACT']],
    ['product-manifest.json',['STATE_SYNC']],
    ['scripts/repo-main-write.py',['SHARED_MAIN_COORDINATION']],
  ]) {
    const actual=classifyPath(p);
    for(const label of labels)expect(actual.includes(label),`${p} missing ${label}`);
  }
});
ok('fixture-registry-loads', () => {
  const registryText=fs.readFileSync('products/simcore/tests/registry.mjs','utf8');
  expect(registryText.includes("id: 'release-system-r2-7'"),'R2.7 suite missing');
});
ok('permanent-workflows-classified', () => {
  for(const p of ['.github/workflows/simcore-release-permanent.yml','.github/workflows/simcore-release-required.yml','.github/workflows/simcore-release-pr-activation.yml']){
    const labels=classifyPath(p);expect(labels.includes('CI_SELF')&&labels.includes('HARNESS'),`${p} not permanent-classified`);
  }
});
ok('r2-7-owner-classification', () => {
  for(const p of ['products/simcore/tooling/root-path.mjs','products/simcore/tooling/release-recovery-decision.mjs','products/simcore/tooling/release-operational-proof.mjs']){
    const labels=classifyPath(p);expect(labels.includes('CI_SELF')&&labels.includes('HARNESS')&&labels.includes('STATE_SYNC'),`${p} missing R2.7 classification`);
  }
});
ok('release-schema-present', () => expect(fs.existsSync('products/simcore/releases/release-schema-v1.json'),'release schema missing'));
ok('approval-schema-present', () => expect(fs.existsSync('products/simcore/releases/release-approval-schema-v1.json'),'approval schema missing'));
ok('latest-install-present', () => {
  expect(fs.existsSync('plugins/simcore/latest.js'),'latest missing');
  expect(fs.existsSync('plugins/simcore/install.js'),'install missing');
});
ok('release-shadow-deterministic-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/release-shadow.test.mjs'],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024});
  expect(r.status===0,`release shadow tests failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('SIMCORE_RELEASE_SHADOW_TEST_PASS'),'release shadow pass marker missing');
});
ok('release-controller-qualification-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/release-controller-qualification.test.mjs'],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024});
  expect(r.status===0,`release controller qualification failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('SIMCORE_RELEASE_CONTROLLER_QUALIFICATION_PASS'),'controller qualification pass marker missing');
});
ok('admin-state-transition-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/admin-state-transition.test.mjs'],{encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
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
  expect(r.status===0,`R2.6 permanent state tests failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('RS2_6_POST_PUBLISH_BOUNDARY_TEST_PASS'),'R2.6 permanent state pass marker missing');
});
ok('release-declaration-transition-deterministic-tests', () => {
  const r=spawnSync(process.execPath,['products/simcore/tests/release-declaration-transition.test.mjs'],{encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
  expect(r.status===0,`RS2-4E release declaration transition failed: ${r.stderr || r.stdout}`);
  expect(String(r.stdout).includes('RS2_4E_RELEASE_DECLARATION_TRANSITION_TEST_PASS NEW SAME ROLLBACK'),'release declaration transition pass marker missing');
});
ok('legacy-map-complete', () => {
  const map = JSON.parse(fs.readFileSync('products/simcore/ci/legacy-gate-map.json','utf8'));
  const mapped = new Set(map.workflows.map((row) => row.legacyWorkflow));
  const permanent = new Set(['simcore-ci.yml','simcore-release.yml','simcore-release-permanent.yml','simcore-release-required.yml','simcore-release-pr-activation.yml','simcore-r2-7-status-projection.yml']);
  const files = fs.readdirSync('.github/workflows')
    .filter((name) => /^simcore-.*\.yml$/.test(name))
    .filter((name) => !permanent.has(name))
    .map((name) => `.github/workflows/${name}`);
  for (const file of files) expect(mapped.has(file), `LEGACY_GATE_UNCLASSIFIED: ${file}`);
  for (const row of map.workflows) expect(row.status !== 'UNMAPPED', `unmapped workflow: ${row.legacyWorkflow}`);
  expect(map.status === 'SHADOW_VERIFIED', `shadow status=${map.status}`);
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
