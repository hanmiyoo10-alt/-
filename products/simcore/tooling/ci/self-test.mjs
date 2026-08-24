#!/usr/bin/env node
import fs from 'node:fs';
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
ok('release-infra-classification', () => {
  for (const p of [
    '.github/workflows/simcore-release.yml',
    'products/simcore/releases/release-schema-v1.json',
    'products/simcore/tooling/release/controller.mjs',
  ]) {
    const r = classifyPaths([p]);
    expect(r.labels.includes('CI_SELF') && r.labels.includes('RELEASE_INFRA'), `${p}: ${JSON.stringify(r)}`);
    expect(!r.labels.includes('LEGACY_VERIFICATION'), `${p} classified as legacy`);
  }
});
ok('state-sync-classification', () => {
  const r = classifyPaths(['products/simcore/tooling/sync-state.mjs']);
  expect(r.labels.includes('STATE_SYNC'), JSON.stringify(r));
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
  const forbidden = [
    'contents: write',
    'pull_request_target:',
    '${{ secrets.',
    'repo-main-write.py',
    'sync-state.mjs --write',
    'git push',
    'id-token: write',
  ];
  for (const token of forbidden) expect(!workflow.includes(token), `forbidden workflow token: ${token}`);
  expect(workflow.includes('permissions:\n  contents: read'), 'contents: read permission missing');
  expect(workflow.includes('name: Required'), 'stable Required job missing');
  expect(workflow.includes('candidate_required_authority'), 'candidate-required authority input missing');
  expect(workflow.includes('SHADOW_ONLY'), 'shadow candidate-required authority missing');
  expect(!/uses:\s+[^\n]+@(?![0-9a-f]{40}\b)/.test(workflow), 'external action is not full-SHA pinned');
});

ok('release-workflow-shadow-only-trust-boundary', () => {
  const workflow = fs.readFileSync('.github/workflows/simcore-release.yml', 'utf8');
  expect(workflow.includes('permissions:\n  contents: read'), 'release workflow must remain contents: read');
  expect(workflow.includes('candidate_required_authority: SHADOW_ONLY'), 'release workflow must call shadow-only candidate gate');
  expect(workflow.includes('--authority SHADOW_ONLY'), 'release controller shadow authority missing');
  for (const token of ['contents: write', 'git push origin', '--force-with-lease', 'refs/heads/release-simcore']) {
    expect(!workflow.includes(token), `shadow release workflow contains forbidden mutation token: ${token}`);
  }
});

ok('legacy-map-complete', () => {
  const map = JSON.parse(fs.readFileSync('products/simcore/ci/legacy-gate-map.json','utf8'));
  const mapped = new Set(map.workflows.map((row) => row.legacyWorkflow));
  const permanent = new Set(['simcore-ci.yml', 'simcore-release.yml']);
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
