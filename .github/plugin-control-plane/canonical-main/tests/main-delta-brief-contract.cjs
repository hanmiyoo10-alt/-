'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildMainDeltaBrief } = require('../main-delta-brief.cjs');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function commit(cwd, message) {
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', message]);
  return git(cwd, ['rev-parse', 'HEAD']);
}

const cwd = mkdtempSync(path.join(os.tmpdir(), 'canonical-main-delta-'));
try {
  git(cwd, ['init', '-q']);
  git(cwd, ['config', 'user.email', 'canonical-main@example.invalid']);
  git(cwd, ['config', 'user.name', 'Canonical Main Contract']);

  writeFileSync(path.join(cwd, 'alpha.txt'), 'one\n');
  const base = commit(cwd, 'base');

  writeFileSync(path.join(cwd, 'alpha.txt'), 'two\n');
  writeFileSync(path.join(cwd, 'beta.txt'), 'beta\n');
  const middle = commit(cwd, 'second');

  writeFileSync(path.join(cwd, 'alpha.txt'), 'three\n');
  const head = commit(cwd, 'third');

  const brief = buildMainDeltaBrief({ base, head, cwd });
  assert.equal(brief.schemaVersion, 1);
  assert.equal(brief.state, 'OK');
  assert.equal(brief.baseSha, base);
  assert.equal(brief.headSha, head);
  assert.equal(brief.commitCount, 2);
  assert.deepEqual(brief.commits.map((entry) => entry.sha), [middle, head]);
  assert.deepEqual(brief.commits.map((entry) => entry.subject), ['second', 'third']);
  assert.deepEqual(brief.files, ['alpha.txt', 'beta.txt']);
  assert.equal(brief.fileCount, 2);

  const empty = buildMainDeltaBrief({ base: head, head, cwd });
  assert.equal(empty.commitCount, 0);
  assert.equal(empty.fileCount, 0);
  assert.deepEqual(empty.commits, []);
  assert.deepEqual(empty.files, []);

  assert.throws(
    () => buildMainDeltaBrief({ base: head, head: base, cwd }),
    /MAIN_DELTA_BASE_NOT_ANCESTOR/,
  );
  assert.throws(
    () => buildMainDeltaBrief({ base: 'missing-ref', head, cwd }),
    /MAIN_DELTA_REF_UNRESOLVED:missing-ref/,
  );

  const statusBefore = git(cwd, ['status', '--porcelain=v1']);
  buildMainDeltaBrief({ base, head, cwd });
  const statusAfter = git(cwd, ['status', '--porcelain=v1']);
  assert.equal(statusAfter, statusBefore, 'delta core must not mutate the repository worktree');

  console.log('MAIN_DELTA_BRIEF_CONTRACT:PASS');
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
