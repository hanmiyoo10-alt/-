#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const TOOL = path.resolve('products/simcore/tooling/admin-state-transition.mjs');
const P = '47969d24771f6cc188df6e32150fc6fde519182d';
const OLD_VERDICT = '## Production verdict\n\nOLD PRODUCTION\n';
const NEW_VERDICT = '## Production verdict\n\nCURRENT PRODUCTION\n';
const OLD_LEDGER = '# 2. Current Validation Release\n';
const NEW_LEDGER = '# 2. Historical Validation Release Ledger\n\nHistorical entries below preserve their original point-in-time status and do not define current production or current priority.\n';

function writeJson(root, rel, value) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function readJson(root, rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); }
function writeText(root, rel, value) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, 'utf8');
}
function run(root, extra = []) {
  return spawnSync(process.execPath, [TOOL, '--root', root, '--transition', 'transition.json', '--manifest', 'product-manifest.json', '--report', 'report.json', ...extra], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  });
}
function baseManifest(overrides = {}) {
  return {
    schema_version: 1,
    product: 'SimCore',
    production_version: '0.64.6',
    release_name: 'Post-B_END C Clock Handoff Authority',
    release_branch: 'release-simcore',
    release_commit: P,
    release_blob: '34da01aa131f760b92d65d961a7843e9cc0d37d6',
    validation_status: 'PENDING_REAL_LONG_CHAT',
    current_priority: '06403_B_END_DIAGNOSTIC_BUILDER_LIVE_VALIDATION',
    major_update_checkpoint: 'M2-3',
    ...overrides,
  };
}
function transition(overrides = {}) {
  return {
    schemaVersion: 1,
    product: 'SimCore',
    transitionId: 'rs2-4e-production-drift-repair',
    expectedProductionCommit: P,
    expected: {
      validation_status: 'PENDING_REAL_LONG_CHAT',
      current_priority: '06403_B_END_DIAGNOSTIC_BUILDER_LIVE_VALIDATION',
      major_update_checkpoint: 'M2-3',
    },
    set: {
      validation_status: 'LIVE_PASS',
      current_priority: 'RS2_4E_REAL_RELEASE_READY_QUALIFICATION',
      major_update_checkpoint: 'M2-4',
    },
    evidence: ['docs/SIMCORE_LIVE_06406_VALIDATION.md'],
    documentReplacements: [
      { id: 'production-verdict', path: 'docs/CURRENT_DEVELOPMENT.md', from: OLD_VERDICT, to: NEW_VERDICT },
      { id: 'historical-ledger-heading', path: 'docs/CURRENT_DEVELOPMENT.md', from: OLD_LEDGER, to: NEW_LEDGER },
    ],
    ...overrides,
  };
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-admin-transition-'));
  writeJson(root, 'product-manifest.json', baseManifest());
  writeJson(root, 'transition.json', transition());
  writeText(root, 'docs/CURRENT_DEVELOPMENT.md', `# Memory\n\n${OLD_VERDICT}\n${OLD_LEDGER}\nold history\n`);
  return root;
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

{
  const root = fixture();
  const beforeManifest = fs.readFileSync(path.join(root, 'product-manifest.json'), 'utf8');
  const beforeDoc = fs.readFileSync(path.join(root, 'docs/CURRENT_DEVELOPMENT.md'), 'utf8');
  const r = run(root);
  assert(r.status === 0, r.stderr || r.stdout);
  assert(r.stdout.includes('SIMCORE_ADMIN_STATE_TRANSITION_WOULD_APPLY'), r.stdout);
  assert(fs.readFileSync(path.join(root, 'product-manifest.json'), 'utf8') === beforeManifest, 'dry-run mutated manifest');
  assert(fs.readFileSync(path.join(root, 'docs/CURRENT_DEVELOPMENT.md'), 'utf8') === beforeDoc, 'dry-run mutated document');
  fs.rmSync(root, { recursive: true, force: true });
}
{
  const root = fixture();
  const r = run(root, ['--write']);
  assert(r.status === 0, r.stderr || r.stdout);
  const m = readJson(root, 'product-manifest.json');
  const doc = fs.readFileSync(path.join(root, 'docs/CURRENT_DEVELOPMENT.md'), 'utf8');
  assert(m.validation_status === 'LIVE_PASS', 'validation not transitioned');
  assert(m.current_priority === 'RS2_4E_REAL_RELEASE_READY_QUALIFICATION', 'priority not transitioned');
  assert(m.major_update_checkpoint === 'M2-4', 'checkpoint not transitioned');
  assert(m.release_commit === P && m.production_version === '0.64.6', 'production identity mutated');
  assert(doc.includes(NEW_VERDICT) && doc.includes(NEW_LEDGER), 'document transition missing');
  const second = run(root, ['--write']);
  assert(second.status === 0 && second.stdout.includes('ALREADY_APPLIED'), second.stderr || second.stdout);
  fs.rmSync(root, { recursive: true, force: true });
}
{
  const root = fixture();
  writeJson(root, 'product-manifest.json', baseManifest({ validation_status: 'LIVE_PASS' }));
  writeText(root, 'docs/CURRENT_DEVELOPMENT.md', `# Memory\n\n${NEW_VERDICT}\n${OLD_LEDGER}\nold history\n`);
  const r = run(root, ['--write']);
  assert(r.status === 0 && r.stdout.includes('APPLIED'), r.stderr || r.stdout);
  const m = readJson(root, 'product-manifest.json');
  const doc = fs.readFileSync(path.join(root, 'docs/CURRENT_DEVELOPMENT.md'), 'utf8');
  assert(m.current_priority === 'RS2_4E_REAL_RELEASE_READY_QUALIFICATION', 'partial manifest recovery failed');
  assert(m.major_update_checkpoint === 'M2-4', 'partial checkpoint recovery failed');
  assert(doc.includes(NEW_LEDGER), 'partial document recovery failed');
  fs.rmSync(root, { recursive: true, force: true });
}
{
  const root = fixture();
  writeJson(root, 'product-manifest.json', baseManifest({ current_priority: 'UNEXPECTED' }));
  const r = run(root, ['--write']);
  assert(r.status === 2 && r.stderr.includes('ADMIN_TRANSITION_STATE_MISMATCH'), r.stderr || r.stdout);
  fs.rmSync(root, { recursive: true, force: true });
}
{
  const root = fixture();
  writeJson(root, 'product-manifest.json', baseManifest({ release_commit: 'a'.repeat(40) }));
  const r = run(root, ['--write']);
  assert(r.status === 2 && r.stderr.includes('ADMIN_TRANSITION_PRODUCTION_MISMATCH'), r.stderr || r.stdout);
  fs.rmSync(root, { recursive: true, force: true });
}
{
  const root = fixture();
  writeJson(root, 'transition.json', transition({ expected: { release_commit: P }, set: { release_commit: 'a'.repeat(40) } }));
  const r = run(root, ['--write']);
  assert(r.status === 2 && r.stderr.includes('ADMIN_TRANSITION_FIELD_DENIED'), r.stderr || r.stdout);
  fs.rmSync(root, { recursive: true, force: true });
}
{
  const root = fixture();
  const t = transition();
  t.documentReplacements[0].path = 'plugins/simcore/latest.js';
  writeJson(root, 'transition.json', t);
  const r = run(root, ['--write']);
  assert(r.status === 2 && r.stderr.includes('ADMIN_TRANSITION_DOCUMENT_PATH_DENIED'), r.stderr || r.stdout);
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('RS2_4E_ADMIN_STATE_TRANSITION_TEST_PASS');
