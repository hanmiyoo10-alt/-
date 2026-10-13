#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(HERE, 'policy.json');
const SHA_RE = /^[0-9a-f]{40}$/;
const ALLOWED_MODES = new Set(['plan', 'publish']);
const ALLOWED_CHANNELS = new Set(['all', 'termux', 'simcore', 'usage-dashboard']);

function fail(code, detail = '') {
  throw new Error(detail ? code + ': ' + detail : code);
}

function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: options.encoding === null ? null : 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitText(cwd, args) {
  return String(git(cwd, args)).trim();
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assertSafeRelativePath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').some(part => part === '' || part === '.' || part === '..')
  ) {
    fail('INVALID_POLICY_PATH', String(value));
  }
}

export function loadPolicy() {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

export function validatePolicy(policy) {
  if (!policy || policy.schemaVersion !== 1) fail('INVALID_POLICY_SCHEMA');
  if (policy.publisherVersion !== '1.0.0') fail('INVALID_PUBLISHER_VERSION');
  if (policy.sourceRepository !== 'hanmiyoo10-alt/-') fail('INVALID_SOURCE_REPOSITORY');
  if (policy.targetRepository !== 'hanmiyoo10-alt/myang') fail('INVALID_TARGET_REPOSITORY');
  if (policy.targetSshUrl !== 'git@github.com:hanmiyoo10-alt/myang.git') fail('INVALID_TARGET_SSH_URL');
  if (policy.provenancePath !== '.distribution/provenance.json') fail('INVALID_PROVENANCE_PATH');

  const exactOrder = ['termux', 'simcore', 'usage-dashboard'];
  if (JSON.stringify(policy.channelOrder) !== JSON.stringify(exactOrder)) fail('INVALID_CHANNEL_ORDER');

  const expected = {
    termux: {
      sourceRef: 'main',
      targetBranch: 'main',
      files: ['local/termux/00-update-local-stack', 'local/termux/10-start-local-stack'],
      generated: ['README.md', '.distribution/provenance.json'],
    },
    simcore: {
      sourceRef: 'release-simcore',
      targetBranch: 'release-simcore',
      files: ['plugins/simcore/latest.js', 'plugins/simcore/install.js'],
      generated: ['.distribution/provenance.json'],
    },
    'usage-dashboard': {
      sourceRef: 'release-usage-dashboard',
      targetBranch: 'release-usage-dashboard',
      files: [
        'plugins/usage-dashboard/latest.js',
        'plugins/usage-dashboard/runtime/product-manifest.json',
        'plugins/usage-dashboard/runtime/bridge-engine.mjs',
        'plugins/usage-dashboard/runtime/bridge-manager.cjs',
        'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
      ],
      generated: ['.distribution/provenance.json'],
    },
  };

  if (JSON.stringify(policy.channels) !== JSON.stringify(expected)) fail('INVALID_CHANNEL_POLICY');
  for (const channel of Object.values(policy.channels)) {
    for (const file of [...channel.files, ...channel.generated]) assertSafeRelativePath(file);
  }
  return policy;
}

export function parseArgs(argv) {
  const out = { mode: null, channel: null, targetDir: null, report: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--mode' || arg === '--channel' || arg === '--target-dir' || arg === '--report') {
      if (!next || next.startsWith('--')) fail('MISSING_ARGUMENT_VALUE', arg);
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[key] = next;
      i += 1;
      continue;
    }
    fail('UNKNOWN_ARGUMENT', arg);
  }
  if (!ALLOWED_MODES.has(out.mode)) fail('INVALID_MODE', String(out.mode));
  if (!ALLOWED_CHANNELS.has(out.channel)) fail('INVALID_CHANNEL', String(out.channel));
  if (!out.targetDir) fail('TARGET_DIR_REQUIRED');
  if (!out.report) fail('REPORT_PATH_REQUIRED');
  return out;
}

function normalizeGithubRemote(value) {
  const raw = String(value || '').trim().replace(/\/$/, '').replace(/\.git$/, '');
  if (raw.startsWith('git@github.com:')) return raw.slice('git@github.com:'.length);
  if (raw.startsWith('ssh://git@github.com/')) return raw.slice('ssh://git@github.com/'.length);
  if (raw.startsWith('https://github.com/')) return raw.slice('https://github.com/'.length);
  return raw;
}

function assertSourceRepository(sourceRepo, policy, enforceSourceRepository) {
  if (!enforceSourceRepository) return;
  const remote = gitText(sourceRepo, ['config', '--get', 'remote.origin.url']);
  if (normalizeGithubRemote(remote) !== policy.sourceRepository) fail('SOURCE_REPOSITORY_MISMATCH', remote);
}

function assertTargetRepository(targetDir, policy, enforceTargetRepository) {
  if (!enforceTargetRepository) return;
  const remote = gitText(targetDir, ['config', '--get', 'remote.origin.url']);
  if (normalizeGithubRemote(remote) !== policy.targetRepository) fail('TARGET_REPOSITORY_MISMATCH', remote);
}

function resolveSourceSha(sourceRepo, sourceRef) {
  const sha = gitText(sourceRepo, ['rev-parse', '--verify', 'refs/remotes/origin/' + sourceRef + '^{commit}']);
  if (!SHA_RE.test(sha)) fail('INVALID_SOURCE_SHA', sourceRef + '@' + sha);
  return sha;
}

function readSourceFile(sourceRepo, sourceSha, file) {
  return git(sourceRepo, ['show', sourceSha + ':' + file], { encoding: null });
}

function sourceFileMode(sourceRepo, sourceSha, file) {
  const line = gitText(sourceRepo, ['ls-tree', sourceSha, '--', file]);
  const match = line.match(/^(100644|100755)\s+blob\s+[0-9a-f]{40}\t/);
  if (!match) fail('INVALID_SOURCE_MODE', file);
  return match[1];
}

function lsRemoteSourceBranch(sourceRepo, branch) {
  const out = gitText(sourceRepo, ['ls-remote', '--heads', 'origin', 'refs/heads/' + branch]);
  if (!out) fail('SOURCE_BRANCH_MISSING', branch);
  const rows = out.split('\n').filter(Boolean);
  if (rows.length !== 1) fail('SOURCE_BRANCH_AMBIGUOUS', branch);
  const sha = rows[0].split(/\s+/)[0];
  if (!SHA_RE.test(sha)) fail('INVALID_SOURCE_REMOTE_SHA', branch + '@' + sha);
  return sha;
}

function lsRemoteBranch(targetDir, branch) {
  const out = gitText(targetDir, ['ls-remote', '--heads', 'origin', 'refs/heads/' + branch]);
  if (!out) return null;
  const rows = out.split('\n').filter(Boolean);
  if (rows.length !== 1) fail('TARGET_BRANCH_AMBIGUOUS', branch);
  const sha = rows[0].split(/\s+/)[0];
  if (!SHA_RE.test(sha)) fail('INVALID_TARGET_SHA', branch + '@' + sha);
  return sha;
}

function fetchRemoteBranch(targetDir, branch) {
  git(targetDir, [
    'fetch',
    '--no-tags',
    'origin',
    'refs/heads/' + branch + ':refs/remotes/origin/' + branch,
  ]);
}

function publicReadme(policy) {
  return Buffer.from([
    '# MYANG Public Distribution',
    '',
    'This repository is a bounded public distribution plane.',
    '',
    'Canonical source/control-plane authority: ' + policy.sourceRepository + '.',
    'Published branches mirror already-authoritative bytes and are not release authorities.',
    '',
    '- main: Termux local-stack bootstrap/runtime distribution',
    '- release-simcore: SimCore install/update artifacts',
    '- release-usage-dashboard: Local Usage Dashboard plugin/runtime artifacts',
    '',
    'Publication is generated by the reviewed one-way publisher in the canonical repository.',
    '',
  ].join('\n'));
}

function provenanceBytes(policy, channelName, sourceSha, productFiles) {
  const channel = policy.channels[channelName];
  return Buffer.from(JSON.stringify({
    schemaVersion: 1,
    publisherVersion: policy.publisherVersion,
    channel: channelName,
    sourceRepository: policy.sourceRepository,
    sourceRef: channel.sourceRef,
    sourceCommit: sourceSha,
    targetRepository: policy.targetRepository,
    targetBranch: channel.targetBranch,
    files: productFiles.map(row => ({ path: row.path, mode: row.mode, sha256: row.sha256 })),
  }, null, 2) + '\n');
}

function desiredBytesForChannel(sourceRepo, policy, channelName, sourceSha) {
  const channel = policy.channels[channelName];
  const rows = channel.files.map(file => {
    const bytes = readSourceFile(sourceRepo, sourceSha, file);
    const mode = sourceFileMode(sourceRepo, sourceSha, file);
    return { path: file, bytes, mode, sha256: sha256(bytes), generated: false };
  });
  const productFiles = rows.map(row => ({ path: row.path, mode: row.mode, sha256: row.sha256 }));
  if (channelName === 'termux') {
    const bytes = publicReadme(policy);
    rows.push({ path: 'README.md', bytes, mode: '100644', sha256: sha256(bytes), generated: true });
  }
  const provenance = provenanceBytes(policy, channelName, sourceSha, productFiles);
  rows.push({
    path: policy.provenancePath,
    bytes: provenance,
    mode: '100644',
    sha256: sha256(provenance),
    generated: true,
  });
  return rows;
}

function expectedPathSet(rows) {
  return [...rows.map(row => row.path)].sort();
}

async function listWorktreeFiles(root) {
  const out = [];
  async function walk(dir, rel = '') {
    for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
      if (!rel && entry.name === '.git') continue;
      const nextRel = rel ? rel + '/' + entry.name : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(abs, nextRel);
      else if (entry.isFile() || entry.isSymbolicLink()) out.push(nextRel);
    }
  }
  await walk(root);
  return out.sort();
}

async function clearWorktree(root) {
  for (const entry of await fsp.readdir(root, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    await fsp.rm(path.join(root, entry.name), { recursive: true, force: true });
  }
}

async function writeDesiredTree(targetDir, rows) {
  await clearWorktree(targetDir);
  for (const row of rows) {
    const dest = path.join(targetDir, row.path);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.writeFile(dest, row.bytes, { mode: row.mode === '100755' ? 0o755 : 0o644 });
    await fsp.chmod(dest, row.mode === '100755' ? 0o755 : 0o644);
  }
}

async function verifyWorktree(targetDir, rows) {
  const actual = await listWorktreeFiles(targetDir);
  const expected = expectedPathSet(rows);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail('TARGET_INVENTORY_MISMATCH', JSON.stringify({ expected, actual }));
  }
  for (const row of rows) {
    const filePath = path.join(targetDir, row.path);
    const bytes = await fsp.readFile(filePath);
    if (sha256(bytes) !== row.sha256) fail('TARGET_DIGEST_MISMATCH', row.path);
    const statMode = (await fsp.stat(filePath)).mode & 0o111 ? '100755' : '100644';
    if (statMode !== row.mode) fail('TARGET_MODE_MISMATCH', row.path + ':' + statMode);
  }
}

function verifyCommitTree(targetDir, commitSha, rows) {
  const actual = gitText(targetDir, ['ls-tree', '-r', '--name-only', commitSha])
    .split('\n')
    .filter(Boolean)
    .sort();
  const expected = expectedPathSet(rows);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail('POST_PUSH_INVENTORY_MISMATCH', JSON.stringify({ expected, actual }));
  }
  for (const row of rows) {
    const treeLine = gitText(targetDir, ['ls-tree', commitSha, '--', row.path]);
    const match = treeLine.match(/^(100644|100755)\s+blob\s+[0-9a-f]{40}\t/);
    if (!match || match[1] !== row.mode) fail('POST_PUSH_MODE_MISMATCH', row.path);
    const bytes = git(targetDir, ['show', commitSha + ':' + row.path], { encoding: null });
    if (sha256(bytes) !== row.sha256) fail('POST_PUSH_DIGEST_MISMATCH', row.path);
  }
}

function hasStagedChanges(targetDir) {
  const result = spawnSync('git', ['diff', '--cached', '--quiet'], {
    cwd: targetDir,
    stdio: 'ignore',
  });
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  fail('GIT_DIFF_CHECK_FAILED', String(result.status));
}

function channelNames(policy, selected) {
  return selected === 'all' ? [...policy.channelOrder] : [selected];
}

function targetBase(targetDir, channel) {
  const targetBefore = lsRemoteBranch(targetDir, channel.targetBranch);
  if (targetBefore) {
    fetchRemoteBranch(targetDir, channel.targetBranch);
    return { targetBefore, baseSha: targetBefore, createdFromMain: null };
  }
  if (channel.targetBranch === 'main') fail('TARGET_MAIN_MISSING');
  const mainSha = lsRemoteBranch(targetDir, 'main');
  if (!mainSha) fail('TARGET_MAIN_MISSING');
  fetchRemoteBranch(targetDir, 'main');
  return { targetBefore: null, baseSha: mainSha, createdFromMain: mainSha };
}

export function planChannel({
  sourceRepo,
  targetDir,
  policy,
  channelName,
  enforceSourceRepository = true,
  enforceTargetRepository = true,
}) {
  validatePolicy(policy);
  assertSourceRepository(sourceRepo, policy, enforceSourceRepository);
  assertTargetRepository(targetDir, policy, enforceTargetRepository);
  const channel = policy.channels[channelName];
  if (!channel) fail('UNKNOWN_CHANNEL', channelName);
  const sourceSha = resolveSourceSha(sourceRepo, channel.sourceRef);
  const rows = desiredBytesForChannel(sourceRepo, policy, channelName, sourceSha);
  const base = targetBase(targetDir, channel);
  return {
    channel: channelName,
    sourceRef: channel.sourceRef,
    sourceSha,
    targetBranch: channel.targetBranch,
    targetBefore: base.targetBefore,
    baseSha: base.baseSha,
    createdFromMain: base.createdFromMain,
    files: rows.map(row => ({
      path: row.path,
      mode: row.mode,
      sha256: row.sha256,
      generated: row.generated,
    })),
  };
}

export function assertSourceCurrentness(sourceRepo, plan) {
  const now = lsRemoteSourceBranch(sourceRepo, plan.sourceRef);
  if (now !== plan.sourceSha) {
    fail('SOURCE_REF_MOVED', plan.sourceRef + ':' + plan.sourceSha + '->' + now);
  }
}

function assertRemoteCurrentness(targetDir, plan) {
  const now = lsRemoteBranch(targetDir, plan.targetBranch);
  if (plan.targetBefore) {
    if (now !== plan.targetBefore) {
      fail('TARGET_BRANCH_MOVED', plan.targetBranch + ':' + plan.targetBefore + '->' + now);
    }
    return;
  }
  if (now !== null) fail('TARGET_BRANCH_APPEARED', plan.targetBranch);
  const mainNow = lsRemoteBranch(targetDir, 'main');
  if (mainNow !== plan.createdFromMain) {
    fail('TARGET_MAIN_MOVED_DURING_BRANCH_CREATE', String(mainNow));
  }
}

function configureCommitIdentity(targetDir) {
  git(targetDir, ['config', 'user.name', 'MYANG Public Distribution']);
  git(targetDir, ['config', 'user.email', 'hanmiyoo10-alt@users.noreply.github.com']);
}

export async function publishChannel({
  sourceRepo,
  targetDir,
  policy,
  channelName,
  enforceSourceRepository = true,
  enforceTargetRepository = true,
}) {
  const plan = planChannel({
    sourceRepo,
    targetDir,
    policy,
    channelName,
    enforceSourceRepository,
    enforceTargetRepository,
  });
  const rows = desiredBytesForChannel(sourceRepo, policy, channelName, plan.sourceSha);

  git(targetDir, ['checkout', '--detach', plan.baseSha]);
  git(targetDir, ['reset', '--hard', plan.baseSha]);
  await writeDesiredTree(targetDir, rows);
  await verifyWorktree(targetDir, rows);
  git(targetDir, ['add', '-A']);

  configureCommitIdentity(targetDir);
  let targetAfter = plan.baseSha;
  let disposition = 'NOOP';

  if (hasStagedChanges(targetDir)) {
    git(targetDir, [
      'commit',
      '-m',
      'publish(' + channelName + '): ' + plan.sourceRef + '@' + plan.sourceSha.slice(0, 12),
    ]);
    targetAfter = gitText(targetDir, ['rev-parse', 'HEAD']);
    if (!SHA_RE.test(targetAfter)) fail('INVALID_LOCAL_TARGET_SHA', targetAfter);
    disposition = 'PUBLISHED';
  }

  assertSourceCurrentness(sourceRepo, plan);
  assertRemoteCurrentness(targetDir, plan);

  if (disposition === 'PUBLISHED') {
    git(targetDir, ['push', 'origin', 'HEAD:refs/heads/' + plan.targetBranch], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else if (!plan.targetBefore) {
    git(targetDir, ['push', 'origin', plan.baseSha + ':refs/heads/' + plan.targetBranch], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    targetAfter = plan.baseSha;
    disposition = 'CREATED_NOOP';
  }

  const remoteAfter = lsRemoteBranch(targetDir, plan.targetBranch);
  if (remoteAfter !== targetAfter) {
    fail('POST_PUSH_BRANCH_MISMATCH', String(remoteAfter));
  }

  fetchRemoteBranch(targetDir, plan.targetBranch);
  verifyCommitTree(targetDir, targetAfter, rows);

  return {
    ...plan,
    disposition,
    targetAfter,
    postVerify: {
      branchSha: remoteAfter,
      inventory: expectedPathSet(rows),
      digests: rows.map(row => ({ path: row.path, sha256: row.sha256 })),
    },
  };
}

export async function runPublisher({
  sourceRepo,
  targetDir,
  mode,
  selectedChannel,
  policy = loadPolicy(),
  enforceSourceRepository = true,
  enforceTargetRepository = true,
}) {
  validatePolicy(policy);
  const results = [];
  for (const channelName of channelNames(policy, selectedChannel)) {
    if (mode === 'plan') {
      results.push(planChannel({
        sourceRepo,
        targetDir,
        policy,
        channelName,
        enforceSourceRepository,
        enforceTargetRepository,
      }));
    } else {
      results.push(await publishChannel({
        sourceRepo,
        targetDir,
        policy,
        channelName,
        enforceSourceRepository,
        enforceTargetRepository,
      }));
    }
  }
  return {
    schemaVersion: 1,
    mode,
    sourceRepository: policy.sourceRepository,
    targetRepository: policy.targetRepository,
    selectedChannel,
    results,
  };
}

function boundedErrorCode(error) {
  const message = String(error && error.message ? error.message : error || 'UNKNOWN_ERROR');
  return message.split(':', 1)[0].slice(0, 120);
}

function observeTargetBranches(targetDir, policy, selectedChannel) {
  return channelNames(policy, selectedChannel).map(channelName => {
    const targetBranch = policy.channels[channelName].targetBranch;
    try {
      return { channel: channelName, targetBranch, targetSha: lsRemoteBranch(targetDir, targetBranch), readError: null };
    } catch (error) {
      return { channel: channelName, targetBranch, targetSha: null, readError: boundedErrorCode(error) };
    }
  });
}

async function writeReport(reportPath, report) {
  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRepo = process.cwd();
  const targetDir = path.resolve(args.targetDir);
  const reportPath = path.resolve(args.report);

  const policy = loadPolicy();
  try {
    const report = await runPublisher({
      sourceRepo,
      targetDir,
      mode: args.mode,
      selectedChannel: args.channel,
      policy,
      enforceSourceRepository: true,
      enforceTargetRepository: true,
    });
    await writeReport(reportPath, { ...report, status: 'PASS' });
    process.stdout.write(JSON.stringify(report) + '\n');
  } catch (error) {
    await writeReport(reportPath, {
      schemaVersion: 1,
      mode: args.mode,
      status: 'ERROR',
      sourceRepository: policy.sourceRepository,
      targetRepository: policy.targetRepository,
      selectedChannel: args.channel,
      errorCode: boundedErrorCode(error),
      targetObservation: observeTargetBranches(targetDir, policy, args.channel),
    });
    throw error;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(String(error && error.stack ? error.stack : error) + '\n');
    process.exitCode = 1;
  });
}
