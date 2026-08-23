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
  expect(!/uses:\s+[^\n]+@(?![0-9a-f]{40}\b)/.test(workflow), 'external action is not full-SHA pinned');
});

ok('legacy-map-complete', () => {
  const map = JSON.parse(fs.readFileSync('products/simcore/ci/legacy-gate-map.json','utf8'));
  const mapped = new Set(map.workflows.map((row) => row.legacyWorkflow));
  const files = fs.readdirSync('.github/workflows')
    .filter((name) => /^simcore-.*\.yml$/.test(name))
    .filter((name) => !['simcore-ci.yml'].includes(name))
    .map((name) => `.github/workflows/${name}`);
  for (const file of files) expect(mapped.has(file), `LEGACY_GATE_UNCLASSIFIED: ${file}`);
  for (const row of map.workflows) expect(row.status !== 'UNMAPPED', `unmapped workflow: ${row.legacyWorkflow}`);
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

ok('shadow-ledger-honest', () => {
  const ledger = JSON.parse(fs.readFileSync('products/simcore/ci/shadow-equivalence.json','utf8'));
  expect(ledger.requiredPositivePerRetirementUnit === 3, 'positive shadow threshold');
  expect(ledger.requiredDistinctEvidenceIdentities === 2, 'shadow diversity threshold');
});

console.log(`SimCore CI self-test PASS (${checks.length})`);
