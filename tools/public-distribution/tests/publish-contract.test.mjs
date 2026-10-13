import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import {
  assertSourceCurrentness,
  loadPolicy,
  parseArgs,
  planChannel,
  runPublisher,
  validatePolicy,
} from '../publish.mjs';

function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: options.encoding === null ? null : 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function gitText(cwd, args) {
  return String(git(cwd, args)).trim();
}

async function write(root, rel, content) {
  const dest = path.join(root, rel);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.writeFile(dest, content);
}

function configureIdentity(repo) {
  git(repo, ['config', 'user.name', 'fixture']);
  git(repo, ['config', 'user.email', 'fixture@example.invalid']);
}

async function initSource(root) {
  const bare = path.join(root, 'source.git');
  const seed = path.join(root, 'source-seed');
  const source = path.join(root, 'source');
  await fsp.mkdir(bare, { recursive: true });
  git(bare, ['init', '--bare']);

  await fsp.mkdir(seed, { recursive: true });
  git(seed, ['init', '-b', 'main']);
  configureIdentity(seed);

  await write(seed, 'local/termux/00-update-local-stack', '#!/bin/sh\necho update\n');
  await write(seed, 'local/termux/10-start-local-stack', '#!/bin/sh\necho start\n');
  await write(seed, 'plugins/simcore/latest.js', 'console.log("simcore");\n');
  await write(seed, 'plugins/simcore/install.js', 'console.log("simcore");\n');
  await write(seed, 'plugins/usage-dashboard/latest.js', 'console.log("usage");\n');
  await write(seed, 'plugins/usage-dashboard/runtime/product-manifest.json', '{"product":"fixture"}\n');
  await write(seed, 'plugins/usage-dashboard/runtime/bridge-engine.mjs', 'export const engine=1;\n');
  await write(seed, 'plugins/usage-dashboard/runtime/bridge-manager.cjs', 'module.exports={manager:1};\n');
  await write(seed, 'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh', '#!/bin/sh\necho bridge\n');
  for (const file of [
    'local/termux/00-update-local-stack',
    'local/termux/10-start-local-stack',
    'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
  ]) {
    await fsp.chmod(path.join(seed, file), 0o755);
  }

  git(seed, ['add', '.']);
  git(seed, ['commit', '-m', 'fixture source']);
  git(seed, ['branch', 'release-simcore']);
  git(seed, ['branch', 'release-usage-dashboard']);
  git(seed, ['remote', 'add', 'origin', bare]);
  git(seed, ['push', 'origin', 'main', 'release-simcore', 'release-usage-dashboard']);
  git(bare, ['symbolic-ref', 'HEAD', 'refs/heads/main']);

  git(root, ['clone', bare, source]);
  configureIdentity(source);
  git(source, ['fetch', 'origin']);
  return { source, sourceBare: bare, sha: gitText(source, ['rev-parse', 'refs/remotes/origin/main']) };
}

async function initTarget(root) {
  const bare = path.join(root, 'target.git');
  const seed = path.join(root, 'seed');
  const clone = path.join(root, 'target');
  await fsp.mkdir(bare, { recursive: true });
  git(bare, ['init', '--bare']);

  await fsp.mkdir(seed, { recursive: true });
  git(seed, ['init', '-b', 'main']);
  configureIdentity(seed);
  await write(seed, 'README.md', '# old myang\n');
  await write(seed, 'repo-cockpit-aggregator/server.mjs', 'console.log("old");\n');
  git(seed, ['add', '.']);
  git(seed, ['commit', '-m', 'old cockpit baseline']);
  git(seed, ['remote', 'add', 'origin', bare]);
  git(seed, ['push', '-u', 'origin', 'main']);
  git(bare, ['symbolic-ref', 'HEAD', 'refs/heads/main']);

  git(root, ['clone', bare, clone]);
  configureIdentity(clone);
  return { bare, clone };
}

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'public-distribution-'));
  const source = await initSource(root);
  const target = await initTarget(root);
  return {
    root,
    ...source,
    ...target,
    async cleanup() {
      await fsp.rm(root, { recursive: true, force: true });
    },
  };
}

function branchSha(bare, branch) {
  return gitText(bare, ['rev-parse', 'refs/heads/' + branch]);
}

function branchFiles(bare, branch) {
  const sha = branchSha(bare, branch);
  return gitText(bare, ['ls-tree', '-r', '--name-only', sha])
    .split('\n')
    .filter(Boolean)
    .sort();
}

function branchModes(bare, branch) {
  const sha = branchSha(bare, branch);
  return Object.fromEntries(
    gitText(bare, ['ls-tree', '-r', sha])
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^(100644|100755)\s+blob\s+[0-9a-f]{40}\t(.+)$/);
        assert.ok(match, 'unexpected tree row: ' + line);
        return [match[2], match[1]];
      }),
  );
}

test('policy is fixed to the reviewed repositories, refs, branches, and file allowlists', () => {
  const policy = validatePolicy(loadPolicy());
  assert.equal(policy.sourceRepository, 'hanmiyoo10-alt/-');
  assert.equal(policy.targetRepository, 'hanmiyoo10-alt/myang');
  assert.deepEqual(policy.channelOrder, ['termux', 'simcore', 'usage-dashboard']);
  assert.equal(
    policy.channels.termux.files.length +
      policy.channels.simcore.files.length +
      policy.channels['usage-dashboard'].files.length,
    9,
  );
});

test('CLI rejects unknown options and caller-selected channel values', () => {
  assert.throws(
    () => parseArgs(['--mode', 'plan', '--channel', 'other', '--target-dir', '/tmp/x', '--report', '/tmp/r']),
    /INVALID_CHANNEL/,
  );
  assert.throws(
    () => parseArgs(['--mode', 'plan', '--channel', 'all', '--target-dir', '/tmp/x', '--report', '/tmp/r', '--repo', 'evil/x']),
    /UNKNOWN_ARGUMENT/,
  );
});

test('production source-repository guard rejects an arbitrary git remote', async () => {
  const fx = await fixture();
  try {
    assert.throws(
      () => planChannel({
        sourceRepo: fx.source,
        targetDir: fx.clone,
        policy: loadPolicy(),
        channelName: 'termux',
        enforceSourceRepository: true,
        enforceTargetRepository: false,
      }),
      /SOURCE_REPOSITORY_MISMATCH/,
    );
  } finally {
    await fx.cleanup();
  }
});

test('production target-repository guard rejects an arbitrary git remote', async () => {
  const fx = await fixture();
  try {
    assert.throws(
      () => planChannel({
        sourceRepo: fx.source,
        targetDir: fx.clone,
        policy: loadPolicy(),
        channelName: 'termux',
        enforceSourceRepository: false,
        enforceTargetRepository: true,
      }),
      /TARGET_REPOSITORY_MISMATCH/,
    );
  } finally {
    await fx.cleanup();
  }
});

test('source ref movement after planning fails closed before publication', async () => {
  const fx = await fixture();
  try {
    const plan = planChannel({
      sourceRepo: fx.source,
      targetDir: fx.clone,
      policy: loadPolicy(),
      channelName: 'termux',
      enforceSourceRepository: false,
      enforceTargetRepository: false,
    });

    const writer = path.join(fx.root, 'source-writer');
    git(fx.root, ['clone', fx.sourceBare, writer]);
    configureIdentity(writer);
    await write(writer, 'local/termux/00-update-local-stack', '#!/bin/sh\necho moved\n');
    git(writer, ['add', 'local/termux/00-update-local-stack']);
    git(writer, ['commit', '-m', 'move source ref']);
    git(writer, ['push', 'origin', 'HEAD:refs/heads/main']);

    assert.throws(
      () => assertSourceCurrentness(fx.source, plan),
      /SOURCE_REF_MOVED/,
    );
  } finally {
    await fx.cleanup();
  }
});

test('all channels publish exact bounded trees and second publish is a NOOP', async () => {
  const fx = await fixture();
  const policy = loadPolicy();
  const sourceHeadBefore = gitText(fx.source, ['rev-parse', 'HEAD']);

  try {
    const first = await runPublisher({
      sourceRepo: fx.source,
      targetDir: fx.clone,
      mode: 'publish',
      selectedChannel: 'all',
      policy,
      enforceSourceRepository: false,
      enforceTargetRepository: false,
    });

    assert.deepEqual(first.results.map(row => row.disposition), ['PUBLISHED', 'PUBLISHED', 'PUBLISHED']);
    assert.deepEqual(branchFiles(fx.bare, 'main'), [
      '.distribution/provenance.json',
      'README.md',
      'local/termux/00-update-local-stack',
      'local/termux/10-start-local-stack',
    ]);
    assert.deepEqual(branchFiles(fx.bare, 'release-simcore'), [
      '.distribution/provenance.json',
      'plugins/simcore/install.js',
      'plugins/simcore/latest.js',
    ]);
    assert.deepEqual(branchFiles(fx.bare, 'release-usage-dashboard'), [
      '.distribution/provenance.json',
      'plugins/usage-dashboard/latest.js',
      'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
      'plugins/usage-dashboard/runtime/bridge-engine.mjs',
      'plugins/usage-dashboard/runtime/bridge-manager.cjs',
      'plugins/usage-dashboard/runtime/product-manifest.json',
    ]);

    const termuxModes = branchModes(fx.bare, 'main');
    assert.equal(termuxModes['local/termux/00-update-local-stack'], '100755');
    assert.equal(termuxModes['local/termux/10-start-local-stack'], '100755');
    assert.equal(termuxModes['README.md'], '100644');
    assert.equal(termuxModes['.distribution/provenance.json'], '100644');
    const usageModes = branchModes(fx.bare, 'release-usage-dashboard');
    assert.equal(usageModes['plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh'], '100755');

    for (const [branch, ref, files] of [
      ['main', 'main', policy.channels.termux.files],
      ['release-simcore', 'release-simcore', policy.channels.simcore.files],
      ['release-usage-dashboard', 'release-usage-dashboard', policy.channels['usage-dashboard'].files],
    ]) {
      const targetSha = branchSha(fx.bare, branch);
      for (const file of files) {
        const sourceBytes = git(fx.source, ['show', 'refs/remotes/origin/' + ref + ':' + file], { encoding: null });
        const targetBytes = git(fx.bare, ['show', targetSha + ':' + file], { encoding: null });
        assert.deepEqual(targetBytes, sourceBytes, branch + ':' + file + ' must be byte-exact');
      }
    }

    const second = await runPublisher({
      sourceRepo: fx.source,
      targetDir: fx.clone,
      mode: 'publish',
      selectedChannel: 'all',
      policy,
      enforceSourceRepository: false,
      enforceTargetRepository: false,
    });
    assert.deepEqual(second.results.map(row => row.disposition), ['NOOP', 'NOOP', 'NOOP']);
    assert.equal(gitText(fx.source, ['rev-parse', 'HEAD']), sourceHeadBefore);
  } finally {
    await fx.cleanup();
  }
});

test('plan mode reads source/target identities without publishing', async () => {
  const fx = await fixture();
  try {
    const mainBefore = branchSha(fx.bare, 'main');
    const report = await runPublisher({
      sourceRepo: fx.source,
      targetDir: fx.clone,
      mode: 'plan',
      selectedChannel: 'all',
      policy: loadPolicy(),
      enforceSourceRepository: false,
      enforceTargetRepository: false,
    });
    assert.equal(report.results.length, 3);
    assert.equal(branchSha(fx.bare, 'main'), mainBefore);
    assert.throws(() => branchSha(fx.bare, 'release-simcore'));
    assert.throws(() => branchSha(fx.bare, 'release-usage-dashboard'));
  } finally {
    await fx.cleanup();
  }
});

test('implementation contains no force publication primitive and emits bounded error receipts', () => {
  const source = fs.readFileSync(new URL('../publish.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /--force|force-with-lease|\+refs\/heads/);
  assert.match(source, /\['push', 'origin'/);
  assert.match(source, /ls-remote', '--heads', 'origin'/);
  assert.match(source, /status: 'ERROR'/);
  assert.match(source, /targetObservation: observeTargetBranches/);
});

test('workflow is manual-only and keeps canonical permissions read-only', () => {
  const workflowPath = path.resolve(new URL('../../../.github/workflows/public-distribution-publish.yml', import.meta.url).pathname);
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*pull_request:\s*$/m);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /if:\s*\$\{\{ github\.ref == 'refs\/heads\/main' \}\}/);
  assert.match(workflow, /environment:\s*public-distribution-publisher/);
  assert.match(workflow, /with:\s*\n\s*ref:\s*main\s*\n\s*fetch-depth:\s*0/);
  assert.match(workflow, /\.ssh_keys\[\] \| "github\.com " \+ \./);
  assert.match(workflow, /MYANG_DISTRIBUTION_SSH_KEY/);
  assert.match(workflow, /git clone --no-tags git@github\.com:hanmiyoo10-alt\/myang\.git/);
  assert.match(workflow, /Upload publication receipts\s*\n\s*if:\s*\$\{\{ !cancelled\(\) \}\}/);
  assert.doesNotMatch(workflow, /\\\$\{\{/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
});
