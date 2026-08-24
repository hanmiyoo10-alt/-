import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assert, equal } from '../../tooling/assertions.mjs';
import { materialize, validateRequest, evaluateExistingCandidate } from '../../tooling/candidate-materialize.mjs';

function run(cwd, command, args) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${command} ${args.join(' ')}: ${r.stderr || r.stdout}`);
  return String(r.stdout || '').trim();
}
function git(cwd, ...args) { return run(cwd, 'git', args); }
function write(root, rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf8');
}
function expectCode(fn, code) {
  let seen = null;
  try { fn(); } catch (error) { seen = error?.code || null; }
  equal(seen, code, `expected failure ${code}`);
}
function jobSlice(workflow, startName, endName = null) {
  const start = workflow.indexOf(`\n  ${startName}:`);
  assert(start >= 0, `workflow job missing: ${startName}`);
  const end = endName ? workflow.indexOf(`\n  ${endName}:`, start + 1) : workflow.length;
  assert(endName === null || end > start, `workflow job boundary missing: ${startName}->${endName}`);
  return workflow.slice(start, end);
}

export async function runSuite({ fixtures }) {
  const f = fixtures[0].input;
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  const sample = {
    schemaVersion: 1,
    intentId: f.intentId,
    product: 'SimCore',
    targetVersion: f.targetVersion,
    releaseName: f.releaseName,
    releaseMode: f.releaseMode,
    expectedProductionCommit: 'a'.repeat(40),
    builderPath: 'products/simcore/tooling/build-fixture.py',
    verificationSuite: f.verificationSuite,
    allowedRuntimePaths: ['plugins/simcore/latest.js', 'plugins/simcore/install.js'],
    changeClass: 'RUNTIME_FEATURE',
    primaryGoalId: f.primaryGoalId,
    liveGate: { required: true, scenarioId: f.liveScenarioId, closeAuthority: 'HUMAN_EVIDENCE' },
    evidenceRefs: [],
  };
  validateRequest(sample);
  pass('B-N1-valid-schema-control');
  expectCode(() => validateRequest({ ...sample, schemaVersion: 2 }), 'CANDIDATE_REQUEST_SCHEMA_INVALID');
  pass('B-N1-invalid-schema');
  expectCode(() => validateRequest({ ...sample, builderPath: 'scripts/evil.py' }), 'CANDIDATE_REQUEST_BUILDER_INVALID');
  pass('B-N4-builder-allowlist');
  expectCode(() => validateRequest({ ...sample, allowedRuntimePaths: ['plugins/simcore/latest.js'] }), 'CANDIDATE_REQUEST_PATHS_INVALID');
  pass('B-N6-runtime-path-allowlist');
  equal(evaluateExistingCandidate({ parent: 'p', tree: 't', expectedParent: 'p', expectedTree: 't' }), 'ALREADY_MATERIALIZED', 'exact existing');
  equal(evaluateExistingCandidate({ parent: 'p', tree: 'x', expectedParent: 'p', expectedTree: 't' }), 'CANDIDATE_REF_CONFLICT', 'tree conflict');
  pass('B-N11-N12-policy');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-candidate-test-'));
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-candidate-origin-'));
  try {
    git(root, 'init');
    git(root, 'config', 'user.name', 'fixture');
    git(root, 'config', 'user.email', 'fixture@example.invalid');
    write(root, 'plugins/simcore/latest.js', '//@version 0.0.1\nconst value = 1;\n');
    write(root, 'plugins/simcore/install.js', '//@version 0.0.1\nconst value = 1;\n');
    git(root, 'add', '.');
    git(root, 'commit', '-m', 'fixture production');
    const P = git(root, 'rev-parse', 'HEAD');

    const builder = `from pathlib import Path\ntext='//@version 0.0.2\\nconst value = 2;\\n'\nfor rel in ['plugins/simcore/latest.js','plugins/simcore/install.js']:\n    Path(rel).write_text(text, encoding='utf-8')\n`;
    write(root, 'products/simcore/tooling/build-fixture.py', builder);
    const request = { ...sample, expectedProductionCommit: P };
    write(root, `products/simcore/releases/candidate-requests/${f.intentId}.json`, `${JSON.stringify(request, null, 2)}\n`);
    git(root, 'add', '.');
    git(root, 'commit', '-m', 'fixture product intent');
    const S = git(root, 'rev-parse', 'HEAD');

    git(bare, 'init', '--bare');
    git(root, 'remote', 'add', 'origin', bare);
    git(root, 'push', 'origin', 'HEAD:refs/heads/main');

    const args = {
      root,
      request: `products/simcore/releases/candidate-requests/${f.intentId}.json`,
      'source-commit': S,
      'production-commit': P,
      report: 'candidate-report.json',
      mode: 'materialize',
      skipRegression: true,
    };
    const created = materialize(args);
    equal(created.candidateDisposition, 'CREATED', 'candidate created');
    assert(created.candidateCommit && created.candidateReleaseBlob, 'candidate identity missing');
    equal(git(root, 'rev-parse', `${created.candidateCommit}^`), P, 'direct parent');
    equal(git(root, 'rev-parse', `${created.candidateCommit}:plugins/simcore/latest.js`), git(root, 'rev-parse', `${created.candidateCommit}:plugins/simcore/install.js`), 'mirror blob');
    pass('B-created-direct-child');

    const replay = materialize(args);
    equal(replay.candidateDisposition, 'ALREADY_MATERIALIZED', 'exact retry must pass/noop');
    equal(replay.candidateCommit, created.candidateCommit, 'exact retry identity');
    pass('B-N11-exact-existing-noop');

    const conflictTree = git(root, 'rev-parse', `${P}^{tree}`);
    const conflict = run(root, 'git', ['commit-tree', conflictTree, '-p', P, '-m', 'conflict']);
    git(root, 'push', '--force', 'origin', `${conflict}:refs/heads/candidate/simcore/${f.intentId}`);
    expectCode(() => materialize(args), 'CANDIDATE_REF_CONFLICT');
    pass('B-N12-conflicting-existing-block');

    const moved = { ...args, 'production-commit': S };
    expectCode(() => materialize(moved), 'CANDIDATE_PRODUCTION_PARENT_MOVED');
    pass('B-N2-parent-move');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(bare, { recursive: true, force: true });
  }

  const tool = fs.readFileSync('products/simcore/tooling/candidate-materialize.mjs', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/product-simcore-candidate-materialize.yml', 'utf8');
  const materializeJob = jobSlice(workflow, 'materialize', 'receipt');
  for (const token of ['release-publish.mjs', 'repo-main-write.py', 'force-with-lease', 'git push --force']) {
    assert(!tool.includes(token), `candidate tool publication primitive: ${token}`);
    assert(!materializeJob.includes(token), `candidate materialize job publication primitive: ${token}`);
  }
  assert(materializeJob.includes('contents: write'), 'candidate transport write permission missing');
  assert(materializeJob.includes('release-simcore'), 'production parent observation missing');
  assert(materializeJob.includes('candidate-materialize.mjs'), 'generic materializer invocation missing');
  pass('B-N13-N14-static-authority-boundary');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
