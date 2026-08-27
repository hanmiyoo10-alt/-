'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildMainDeltaPresentation,
  classifyPath,
  renderMainDeltaMarkdown,
} = require('../main-delta-presentation.cjs');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function commit(cwd, message) {
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', message]);
  return git(cwd, ['rev-parse', 'HEAD']);
}

function write(cwd, relativePath, content) {
  const absolute = path.join(cwd, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

const cwd = mkdtempSync(path.join(os.tmpdir(), 'canonical-main-delta-presentation-'));
try {
  git(cwd, ['init', '-q']);
  git(cwd, ['config', 'user.email', 'canonical-main@example.invalid']);
  git(cwd, ['config', 'user.name', 'Canonical Main Presentation Contract']);

  write(cwd, 'README.md', '# base\n');
  const base = commit(cwd, 'base');

  write(cwd, 'docs/guide.md', '# docs\n');
  const docsHead = commit(cwd, 'docs: update guide');

  write(cwd, 'plugins/example/index.js', "module.exports = 'runtime';\n");
  const productHead = commit(cwd, 'feat(example): runtime change');

  write(cwd, '.github/workflows/example.yml', 'name: example\n');
  const governanceHead = commit(cwd, 'ci: change workflow');

  assert.equal(classifyPath('.github/plugin-control-plane/canonical-main/tests/x.cjs').riskLevel, 'HIGH');
  assert.equal(classifyPath('plugins/example/tests/x.cjs').surface, 'TEST_ONLY');
  assert.equal(classifyPath('docs/guide.md').riskLevel, 'LOW');
  assert.equal(classifyPath('src/index.js').riskLevel, 'MEDIUM');

  const docsOnly = buildMainDeltaPresentation({ base, head: docsHead, cwd });
  assert.equal(docsOnly.schemaVersion, 1);
  assert.equal(docsOnly.mode, 'LAST_SEEN_MAIN_DELTA_PRESENTATION');
  assert.equal(docsOnly.state, 'OK');
  assert.equal(docsOnly.riskLevel, 'LOW');
  assert.equal(docsOnly.actionRequired, false);
  assert.equal(docsOnly.actionCode, 'NO_IMMEDIATE_ACTION');
  assert.equal(docsOnly.claimsCurrentHealth, false);
  assert.equal(docsOnly.currentHealthState, 'NOT_EVALUATED_BY_U02');
  assert.equal(docsOnly.advancementRequest.state, 'READY_AFTER_USER_VISIBLE_DELIVERY');
  assert.equal(docsOnly.advancementRequest.expectedAnchorSha, base);
  assert.equal(docsOnly.advancementRequest.targetMainSha, docsHead);
  assert.equal(docsOnly.advancementRequest.issueMutationAuthorized, false);
  assert.equal(docsOnly.advancementRequest.mainMutationAuthorized, false);
  assert.equal(docsOnly.advancementRequest.releaseMutationAuthorized, false);
  assert.equal(docsOnly.advancementRequest.executionAuthorized, false);

  const product = buildMainDeltaPresentation({ base, head: productHead, cwd });
  assert.equal(product.riskLevel, 'MEDIUM');
  assert.equal(product.actionRequired, true);
  assert.equal(product.actionCode, 'REVIEW_PRODUCT_OR_RUNTIME_CHANGE');
  assert(product.riskDrivers.includes('plugins/example/index.js'));

  const governance = buildMainDeltaPresentation({ base, head: governanceHead, cwd });
  assert.equal(governance.riskLevel, 'HIGH');
  assert.equal(governance.actionRequired, true);
  assert.equal(governance.actionCode, 'REVIEW_GOVERNANCE_OR_AUTOMATION_CHANGE');
  assert(governance.riskDrivers.includes('.github/workflows/example.yml'));
  assert.deepEqual(governance.commits.map((entry) => entry.sha), [docsHead, productHead, governanceHead]);

  const markdown = renderMainDeltaMarkdown(governance);
  assert.equal(markdown, renderMainDeltaMarkdown(governance), 'render must be deterministic');
  assert.match(markdown, /Last-Seen Main Delta Brief/);
  assert.match(markdown, /Risk: \*\*HIGH\*\*/);
  assert.match(markdown, /REVIEW_GOVERNANCE_OR_AUTOMATION_CHANGE/);
  assert.match(markdown, /Current health: not evaluated by U-02/);
  assert.match(markdown, /READY_AFTER_USER_VISIBLE_DELIVERY/);
  assert.doesNotMatch(markdown, /health: PASS|health: HEALTHY/i, 'U-02 must not claim current health');

  const empty = buildMainDeltaPresentation({ base: governanceHead, head: governanceHead, cwd });
  assert.equal(empty.hasChanges, false);
  assert.equal(empty.commitCount, 0);
  assert.equal(empty.fileCount, 0);
  assert.equal(empty.riskLevel, 'NONE');
  assert.equal(empty.actionRequired, false);
  assert.equal(empty.actionCode, 'NO_ACTION_REQUIRED');
  assert.deepEqual(empty.surfaces, []);

  assert.throws(
    () => buildMainDeltaPresentation({ base: governanceHead, head: base, cwd }),
    /MAIN_DELTA_BASE_NOT_ANCESTOR/,
  );
  assert.throws(
    () => buildMainDeltaPresentation({ base: 'missing-ref', head: governanceHead, cwd }),
    /MAIN_DELTA_REF_UNRESOLVED:missing-ref/,
  );

  const statusBefore = git(cwd, ['status', '--porcelain=v1']);
  buildMainDeltaPresentation({ base, head: governanceHead, cwd });
  const statusAfter = git(cwd, ['status', '--porcelain=v1']);
  assert.equal(statusAfter, statusBefore, 'presentation must not mutate the repository worktree');

  console.log('MAIN_DELTA_PRESENTATION_CONTRACT:PASS');
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
