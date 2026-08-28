'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildMainDeltaPresentation,
  classifyPath,
  isRoutineGeneratedDocCommit,
  renderMainDeltaMarkdown,
  summarizeCommitNoise,
} = require('../main-delta-presentation.cjs');
const {isRepositoryNextAction} = require('../domains/next-action.cjs');

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

  write(cwd, 'docs/REPO_CHANGELOG.md', '# generated changelog\n');
  const routineHead = commit(cwd, 'docs: promote canonical-main generated documentation (#999)');

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
  assert.equal(isRoutineGeneratedDocCommit('docs: promote canonical-main generated documentation (#12)'), true);
  assert.equal(isRoutineGeneratedDocCommit('docs(repo): promote canonical documentation [repo-docs-generated]'), true);
  assert.equal(isRoutineGeneratedDocCommit('docs: update guide'), false);
  assert.deepEqual(summarizeCommitNoise([
    {subject: 'docs: promote canonical-main generated documentation (#12)'},
    {subject: 'ci: change workflow'},
  ], 2), {totalCommitCount: 2, meaningfulCommitCount: 1, routineGeneratedDocCommitCount: 1});

  const routineOnly = buildMainDeltaPresentation({ base, head: routineHead, cwd });
  assert.equal(routineOnly.riskLevel, 'LOW');
  assert.equal(routineOnly.actionRequired, false);
  assert.equal(routineOnly.actionCode, 'NONE');
  assert.equal(isRepositoryNextAction(routineOnly.actionCode), true);
  assert.equal(routineOnly.commitCount, 1);
  assert.equal(routineOnly.meaningfulCommitCount, 0);
  assert.equal(routineOnly.routineGeneratedDocCommitCount, 1);
  assert.equal(routineOnly.commits.length, 1, 'structured commit evidence must be retained');
  const routineMarkdown = renderMainDeltaMarkdown(routineOnly);
  assert.match(routineMarkdown, /1 total commit\(s\) \(0 meaningful \+ 1 routine generated-doc\)/);
  assert.match(routineMarkdown, /1 routine generated-documentation promotion commit\(s\) compacted; full structured commit evidence retained/);
  assert.doesNotMatch(routineMarkdown, /docs: promote canonical-main generated documentation/, 'routine generated-doc subject should be compacted from default markdown');

  const docsOnly = buildMainDeltaPresentation({ base, head: docsHead, cwd });
  assert.equal(docsOnly.schemaVersion, 1);
  assert.equal(docsOnly.mode, 'LAST_SEEN_MAIN_DELTA_PRESENTATION');
  assert.equal(docsOnly.state, 'OK');
  assert.equal(docsOnly.riskLevel, 'LOW');
  assert.equal(docsOnly.actionRequired, false);
  assert.equal(docsOnly.actionCode, 'NONE');
  assert.equal(docsOnly.meaningfulCommitCount, 1);
  assert.equal(docsOnly.routineGeneratedDocCommitCount, 1);
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
  assert.equal(product.actionCode, 'REVIEW_CHANGED_PRODUCT_RUNTIME_PATHS');
  assert.equal(isRepositoryNextAction(product.actionCode), true);
  assert(product.riskDrivers.includes('plugins/example/index.js'));
  assert.equal(product.routineGeneratedDocCommitCount, 1, 'routine docs must not erase a later product action');

  const governance = buildMainDeltaPresentation({ base, head: governanceHead, cwd });
  assert.equal(governance.riskLevel, 'HIGH');
  assert.equal(governance.actionRequired, true);
  assert.equal(governance.actionCode, 'REVIEW_CHANGED_GOVERNANCE_PATHS');
  assert.equal(isRepositoryNextAction(governance.actionCode), true);
  assert(governance.riskDrivers.includes('.github/workflows/example.yml'));
  assert.equal(governance.commitCount, 4);
  assert.equal(governance.meaningfulCommitCount, 3);
  assert.equal(governance.routineGeneratedDocCommitCount, 1);
  assert.deepEqual(governance.commits.map((entry) => entry.sha), [routineHead, docsHead, productHead, governanceHead]);

  const markdown = renderMainDeltaMarkdown(governance);
  assert.equal(markdown, renderMainDeltaMarkdown(governance), 'render must be deterministic');
  assert.match(markdown, /Last-Seen Main Delta Brief/);
  assert.match(markdown, /4 total commit\(s\) \(3 meaningful \+ 1 routine generated-doc\)/);
  assert.match(markdown, /Risk: \*\*HIGH\*\*/);
  assert.match(markdown, /REVIEW_CHANGED_GOVERNANCE_PATHS/);
  assert.match(markdown, /Current health: not evaluated by U-02/);
  assert.match(markdown, /READY_AFTER_USER_VISIBLE_DELIVERY/);
  assert.match(markdown, /routine generated-documentation promotion commit\(s\) compacted/);
  assert.doesNotMatch(markdown, /health: PASS|health: HEALTHY/i, 'U-02 must not claim current health');

  const empty = buildMainDeltaPresentation({ base: governanceHead, head: governanceHead, cwd });
  assert.equal(empty.hasChanges, false);
  assert.equal(empty.commitCount, 0);
  assert.equal(empty.meaningfulCommitCount, 0);
  assert.equal(empty.routineGeneratedDocCommitCount, 0);
  assert.equal(empty.fileCount, 0);
  assert.equal(empty.riskLevel, 'NONE');
  assert.equal(empty.actionRequired, false);
  assert.equal(empty.actionCode, 'NONE');
  assert.equal(isRepositoryNextAction(empty.actionCode), true);
  assert.deepEqual(empty.surfaces, []);

  for (const presentation of [routineOnly, docsOnly, product, governance, empty]) {
    assert.equal(typeof presentation.actionCode, 'string');
    assert.equal(isRepositoryNextAction(presentation.actionCode), true, `delta action must be repository-defined: ${presentation.actionCode}`);
  }

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
