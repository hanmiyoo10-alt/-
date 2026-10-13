#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(HERE, 'policy.json');
const PUBLIC_DISTRIBUTION_POLICY_PATH = path.join(HERE, '..', 'public-distribution', 'policy.json');
const HEADERS_PATH = path.join(HERE, '_headers');
const SHA_RE = /^[0-9a-f]{40}$/;

function fail(code, detail = '') {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: options.encoding === null ? null : 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitText(cwd, args) {
  return String(git(cwd, args)).trim();
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function normalizeGithubRemote(value) {
  const raw = String(value || '').trim().replace(/\/$/, '').replace(/\.git$/, '');
  if (raw.startsWith('git@github.com:')) return raw.slice('git@github.com:'.length);
  if (raw.startsWith('ssh://git@github.com/')) return raw.slice('ssh://git@github.com/'.length);
  if (raw.startsWith('https://github.com/')) return raw.slice('https://github.com/'.length);
  return raw;
}

function safeRelative(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    value.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

export function loadPolicy() {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

export function validatePolicy(policy) {
  if (!policy || policy.schemaVersion !== 1) fail('INVALID_POLICY_SCHEMA');
  if (policy.workerName !== 'myang-public-delivery') fail('INVALID_WORKER_NAME');
  if (policy.publicBaseUrl !== 'https://update.myang.link') fail('INVALID_PUBLIC_BASE_URL');
  if (policy.sourceRepository !== 'hanmiyoo10-alt/-') fail('INVALID_SOURCE_REPOSITORY');
  if (policy.mirrorRepository !== 'hanmiyoo10-alt/myang') fail('INVALID_MIRROR_REPOSITORY');
  if (policy.provenancePath !== '.distribution/provenance.json') fail('INVALID_PROVENANCE_PATH');

  const expected = [
    ['termux', 'main', 'main', [
      ['local/termux/00-update-local-stack', 'termux/00-update-local-stack', 'text/plain; charset=utf-8', false],
      ['local/termux/10-start-local-stack', 'termux/10-start-local-stack', 'text/plain; charset=utf-8', false],
    ]],
    ['simcore', 'release-simcore', 'release-simcore', [
      ['plugins/simcore/latest.js', 'simcore/latest.js', 'application/javascript; charset=utf-8', true],
      ['plugins/simcore/install.js', 'simcore/install.js', 'application/javascript; charset=utf-8', true],
    ]],
    ['usage-dashboard', 'release-usage-dashboard', 'release-usage-dashboard', [
      ['plugins/usage-dashboard/latest.js', 'usage-dashboard/latest.js', 'application/javascript; charset=utf-8', true],
      ['plugins/usage-dashboard/runtime/product-manifest.json', 'usage-dashboard/runtime/product-manifest.json', 'application/json; charset=utf-8', false],
      ['plugins/usage-dashboard/runtime/bridge-engine.mjs', 'usage-dashboard/runtime/bridge-engine.mjs', 'application/javascript; charset=utf-8', false],
      ['plugins/usage-dashboard/runtime/bridge-manager.cjs', 'usage-dashboard/runtime/bridge-manager.cjs', 'application/javascript; charset=utf-8', false],
      ['plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh', 'usage-dashboard/runtime/bootstrap-bridge-manager.sh', 'text/x-shellscript; charset=utf-8', false],
    ]],
  ];

  const actual = policy.channels?.map((channel) => [
    channel.name,
    channel.sourceRef,
    channel.mirrorBranch,
    channel.files?.map((file) => [file.sourcePath, file.publicPath, file.contentType, file.rangeProof]),
  ]);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('INVALID_CHANNEL_POLICY');

  const sourcePaths = new Set();
  const publicPaths = new Set();
  for (const channel of policy.channels) {
    for (const file of channel.files) {
      if (!safeRelative(file.sourcePath) || !safeRelative(file.publicPath)) fail('INVALID_POLICY_PATH');
      if (sourcePaths.has(file.sourcePath)) fail('DUPLICATE_SOURCE_PATH', file.sourcePath);
      if (publicPaths.has(file.publicPath)) fail('DUPLICATE_PUBLIC_PATH', file.publicPath);
      sourcePaths.add(file.sourcePath);
      publicPaths.add(file.publicPath);
    }
  }
  if (sourcePaths.size !== 9 || publicPaths.size !== 9) fail('INVALID_ARTIFACT_COUNT');
  return policy;
}

export function validateAgainstPromotionPolicy(deliveryPolicy, promotionPolicy) {
  if (!promotionPolicy || promotionPolicy.schemaVersion !== 1) fail('INVALID_PROMOTION_POLICY');
  if (promotionPolicy.sourceRepository !== deliveryPolicy.sourceRepository) fail('PROMOTION_SOURCE_REPOSITORY_MISMATCH');
  if (promotionPolicy.targetRepository !== deliveryPolicy.mirrorRepository) fail('PROMOTION_TARGET_REPOSITORY_MISMATCH');
  if (promotionPolicy.provenancePath !== deliveryPolicy.provenancePath) fail('PROMOTION_PROVENANCE_PATH_MISMATCH');

  const expectedChannels = deliveryPolicy.channels.map((channel) => ({
    name: channel.name,
    sourceRef: channel.sourceRef,
    targetBranch: channel.mirrorBranch,
    files: channel.files.map((file) => file.sourcePath),
  }));
  const actualChannels = promotionPolicy.channelOrder.map((name) => ({
    name,
    sourceRef: promotionPolicy.channels?.[name]?.sourceRef,
    targetBranch: promotionPolicy.channels?.[name]?.targetBranch,
    files: promotionPolicy.channels?.[name]?.files,
  }));
  if (JSON.stringify(actualChannels) !== JSON.stringify(expectedChannels)) fail('PROMOTION_POLICY_DIVERGENCE');
}

export function parseArgs(argv) {
  const out = {mirrorDir: null, outputDir: null, report: null};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === '--mirror-dir' || key === '--output-dir' || key === '--report') {
      if (!value || value.startsWith('--')) fail('MISSING_ARGUMENT_VALUE', key);
      out[key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      index += 1;
      continue;
    }
    fail('UNKNOWN_ARGUMENT', key);
  }
  if (!out.mirrorDir) fail('MIRROR_DIR_REQUIRED');
  if (!out.outputDir) fail('OUTPUT_DIR_REQUIRED');
  if (!out.report) fail('REPORT_PATH_REQUIRED');
  return out;
}

function assertRepository(cwd, expected) {
  const remote = gitText(cwd, ['config', '--get', 'remote.origin.url']);
  if (normalizeGithubRemote(remote) !== expected) fail('REPOSITORY_IDENTITY_MISMATCH', expected);
}

function resolveRemoteTrackingSha(cwd, ref) {
  const sha = gitText(cwd, ['rev-parse', '--verify', `refs/remotes/origin/${ref}^{commit}`]);
  if (!SHA_RE.test(sha)) fail('INVALID_TRACKING_SHA', ref);
  return sha;
}

function remoteBranchSha(cwd, ref) {
  const out = gitText(cwd, ['ls-remote', '--heads', 'origin', `refs/heads/${ref}`]);
  const rows = out.split('\n').filter(Boolean);
  if (rows.length !== 1) fail(rows.length ? 'REMOTE_BRANCH_AMBIGUOUS' : 'REMOTE_BRANCH_MISSING', ref);
  const sha = rows[0].split(/\s+/)[0];
  if (!SHA_RE.test(sha)) fail('INVALID_REMOTE_SHA', ref);
  return sha;
}

function readBlob(cwd, sha, file) {
  return git(cwd, ['show', `${sha}:${file}`], {encoding: null});
}

function readMode(cwd, sha, file) {
  const line = gitText(cwd, ['ls-tree', sha, '--', file]);
  const match = line.match(/^(100644|100755)\s+blob\s+[0-9a-f]{40}\t/);
  if (!match) fail('INVALID_FILE_MODE', file);
  return match[1];
}

function readJsonBlob(cwd, sha, file) {
  try {
    return JSON.parse(String(readBlob(cwd, sha, file)));
  } catch {
    fail('INVALID_JSON_BLOB', file);
  }
}

function validateProvenance({provenance, policy, channel, sourceSha, canonicalRows}) {
  if (!provenance || provenance.schemaVersion !== 1) fail('INVALID_PROVENANCE_SCHEMA', channel.name);
  if (provenance.publisherVersion !== '1.0.0') fail('INVALID_PROVENANCE_PUBLISHER', channel.name);
  if (provenance.channel !== channel.name) fail('PROVENANCE_CHANNEL_MISMATCH', channel.name);
  if (provenance.sourceRepository !== policy.sourceRepository) fail('PROVENANCE_SOURCE_REPOSITORY_MISMATCH', channel.name);
  if (provenance.sourceRef !== channel.sourceRef) fail('PROVENANCE_SOURCE_REF_MISMATCH', channel.name);
  if (provenance.sourceCommit !== sourceSha) fail('PROVENANCE_SOURCE_COMMIT_STALE', channel.name);
  if (provenance.targetRepository !== policy.mirrorRepository) fail('PROVENANCE_TARGET_REPOSITORY_MISMATCH', channel.name);
  if (provenance.targetBranch !== channel.mirrorBranch) fail('PROVENANCE_TARGET_BRANCH_MISMATCH', channel.name);

  const expected = canonicalRows.map((row) => ({path: row.sourcePath, mode: row.mode, sha256: row.sha256}));
  if (JSON.stringify(provenance.files) !== JSON.stringify(expected)) fail('PROVENANCE_FILE_SET_MISMATCH', channel.name);
}

function validateStageForCurrentness(stage, policy) {
  if (!stage || stage.schemaVersion !== 1 || stage.kind !== 'CLOUDFLARE_DELIVERY_STAGE' || stage.status !== 'PASS') {
    fail('INVALID_STAGE_REPORT');
  }
  if (stage.workerName !== policy.workerName) fail('STAGE_WORKER_MISMATCH');
  if (stage.publicBaseUrl !== policy.publicBaseUrl) fail('STAGE_PUBLIC_BASE_URL_MISMATCH');
  if (stage.sourceRepository !== policy.sourceRepository) fail('STAGE_SOURCE_REPOSITORY_MISMATCH');
  if (stage.mirrorRepository !== policy.mirrorRepository) fail('STAGE_MIRROR_REPOSITORY_MISMATCH');
  if (!Array.isArray(stage.channels) || stage.channels.length !== policy.channels.length) {
    fail('STAGE_CHANNEL_COUNT_MISMATCH');
  }
  const byName = new Map();
  for (const row of stage.channels) {
    if (!row || typeof row.channel !== 'string' || byName.has(row.channel)) fail('STAGE_CHANNEL_IDENTITY_INVALID');
    byName.set(row.channel, row);
  }
  return byName;
}

export function verifyStageCurrentness({
  sourceRepo,
  mirrorDir,
  stage,
  policy = loadPolicy(),
  enforceRepositoryIdentity = true,
}) {
  validatePolicy(policy);
  if (enforceRepositoryIdentity) {
    assertRepository(sourceRepo, policy.sourceRepository);
    assertRepository(mirrorDir, policy.mirrorRepository);
  }
  const byName = validateStageForCurrentness(stage, policy);
  const channels = [];
  for (const channel of policy.channels) {
    const recorded = byName.get(channel.name);
    if (!recorded) fail('STAGE_CHANNEL_MISSING', channel.name);
    if (recorded.sourceRef !== channel.sourceRef || recorded.mirrorBranch !== channel.mirrorBranch) {
      fail('STAGE_CHANNEL_POLICY_MISMATCH', channel.name);
    }
    if (!SHA_RE.test(recorded.sourceSha) || !SHA_RE.test(recorded.mirrorSha)) {
      fail('STAGE_CHANNEL_SHA_INVALID', channel.name);
    }
    const sourceRemoteSha = remoteBranchSha(sourceRepo, channel.sourceRef);
    if (sourceRemoteSha !== recorded.sourceSha) {
      fail('SOURCE_REF_MOVED', `${channel.sourceRef}:${recorded.sourceSha}->${sourceRemoteSha}`);
    }
    const mirrorRemoteSha = remoteBranchSha(mirrorDir, channel.mirrorBranch);
    if (mirrorRemoteSha !== recorded.mirrorSha) {
      fail('MIRROR_BRANCH_MOVED', `${channel.mirrorBranch}:${recorded.mirrorSha}->${mirrorRemoteSha}`);
    }
    channels.push({
      channel: channel.name,
      sourceRef: channel.sourceRef,
      sourceSha: recorded.sourceSha,
      mirrorBranch: channel.mirrorBranch,
      mirrorSha: recorded.mirrorSha,
    });
  }
  return {
    schemaVersion: 1,
    kind: 'CLOUDFLARE_DELIVERY_CURRENTNESS',
    status: 'PASS',
    channels,
  };
}

async function clearOutput(outputDir) {
  await fsp.rm(outputDir, {recursive: true, force: true});
  await fsp.mkdir(outputDir, {recursive: true});
}

async function listFiles(root) {
  const out = [];
  async function walk(dir, rel = '') {
    for (const entry of await fsp.readdir(dir, {withFileTypes: true})) {
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      const absolute = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) fail('OUTPUT_SYMLINK_FORBIDDEN', next);
      if (entry.isDirectory()) await walk(absolute, next);
      else if (entry.isFile()) out.push(next);
      else fail('OUTPUT_SPECIAL_FILE_FORBIDDEN', next);
    }
  }
  await walk(root);
  return out.sort();
}

async function writeOutput(outputDir, publicPath, bytes, mode) {
  const destination = path.join(outputDir, publicPath);
  await fsp.mkdir(path.dirname(destination), {recursive: true});
  await fsp.writeFile(destination, bytes);
  await fsp.chmod(destination, mode === '100755' ? 0o755 : 0o644);
}

function modeFromStat(stat) {
  return stat.mode & 0o111 ? '100755' : '100644';
}

async function verifyOutput(outputDir, expectedRows) {
  const expected = [...expectedRows.map((row) => row.publicPath), '_headers'].sort();
  const actual = await listFiles(outputDir);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('OUTPUT_INVENTORY_MISMATCH', JSON.stringify({expected, actual}));
  for (const row of expectedRows) {
    const absolute = path.join(outputDir, row.publicPath);
    const bytes = await fsp.readFile(absolute);
    if (sha256(bytes) !== row.sha256) fail('OUTPUT_DIGEST_MISMATCH', row.publicPath);
    const mode = modeFromStat(await fsp.stat(absolute));
    if (mode !== row.mode) fail('OUTPUT_MODE_MISMATCH', row.publicPath);
  }
}

export async function stageDelivery({
  sourceRepo,
  mirrorDir,
  outputDir,
  policy = loadPolicy(),
  promotionPolicy = JSON.parse(fs.readFileSync(PUBLIC_DISTRIBUTION_POLICY_PATH, 'utf8')),
  enforceRepositoryIdentity = true,
}) {
  validatePolicy(policy);
  validateAgainstPromotionPolicy(policy, promotionPolicy);
  if (enforceRepositoryIdentity) {
    assertRepository(sourceRepo, policy.sourceRepository);
    assertRepository(mirrorDir, policy.mirrorRepository);
  }

  await clearOutput(outputDir);
  const reportChannels = [];
  const allRows = [];

  for (const channel of policy.channels) {
    const sourceSha = resolveRemoteTrackingSha(sourceRepo, channel.sourceRef);
    const sourceRemoteSha = remoteBranchSha(sourceRepo, channel.sourceRef);
    if (sourceSha !== sourceRemoteSha) fail('SOURCE_TRACKING_STALE', channel.sourceRef);

    const mirrorSha = resolveRemoteTrackingSha(mirrorDir, channel.mirrorBranch);
    const mirrorRemoteSha = remoteBranchSha(mirrorDir, channel.mirrorBranch);
    if (mirrorSha !== mirrorRemoteSha) fail('MIRROR_TRACKING_STALE', channel.mirrorBranch);

    const canonicalRows = channel.files.map((file) => {
      const bytes = readBlob(sourceRepo, sourceSha, file.sourcePath);
      const mode = readMode(sourceRepo, sourceSha, file.sourcePath);
      return {...file, bytes, mode, sha256: sha256(bytes)};
    });
    const provenance = readJsonBlob(mirrorDir, mirrorSha, policy.provenancePath);
    validateProvenance({provenance, policy, channel, sourceSha, canonicalRows});

    const stagedRows = [];
    for (const row of canonicalRows) {
      const mirrorBytes = readBlob(mirrorDir, mirrorSha, row.sourcePath);
      const mirrorMode = readMode(mirrorDir, mirrorSha, row.sourcePath);
      if (mirrorMode !== row.mode) fail('MIRROR_MODE_MISMATCH', row.sourcePath);
      if (sha256(mirrorBytes) !== row.sha256) fail('MIRROR_DIGEST_MISMATCH', row.sourcePath);
      await writeOutput(outputDir, row.publicPath, mirrorBytes, row.mode);
      const staged = {
        channel: channel.name,
        sourceRef: channel.sourceRef,
        sourceSha,
        mirrorBranch: channel.mirrorBranch,
        mirrorSha,
        sourcePath: row.sourcePath,
        publicPath: row.publicPath,
        mode: row.mode,
        sha256: row.sha256,
        contentType: row.contentType,
        rangeProof: row.rangeProof,
      };
      allRows.push(staged);
      stagedRows.push(staged);
    }
    reportChannels.push({
      channel: channel.name,
      sourceRef: channel.sourceRef,
      sourceSha,
      mirrorBranch: channel.mirrorBranch,
      mirrorSha,
      files: stagedRows.map(({sourcePath, publicPath, mode, sha256, contentType, rangeProof}) =>
        ({sourcePath, publicPath, mode, sha256, contentType, rangeProof})),
    });
  }

  await fsp.copyFile(HEADERS_PATH, path.join(outputDir, '_headers'));
  await verifyOutput(outputDir, allRows);

  return {
    schemaVersion: 1,
    kind: 'CLOUDFLARE_DELIVERY_STAGE',
    status: 'PASS',
    workerName: policy.workerName,
    publicBaseUrl: policy.publicBaseUrl,
    sourceRepository: policy.sourceRepository,
    mirrorRepository: policy.mirrorRepository,
    files: allRows.map(({channel, sourceRef, sourceSha, mirrorBranch, mirrorSha, sourcePath, publicPath, mode, sha256, contentType, rangeProof}) =>
      ({channel, sourceRef, sourceSha, mirrorBranch, mirrorSha, sourcePath, publicPath, mode, sha256, contentType, rangeProof})),
    channels: reportChannels,
    outputInventory: [...allRows.map((row) => row.publicPath), '_headers'].sort(),
  };
}

function boundedErrorCode(error) {
  return String(error?.message || error || 'UNKNOWN_ERROR').split(':', 1)[0].slice(0, 120);
}

async function writeReport(reportPath, report) {
  await fsp.mkdir(path.dirname(reportPath), {recursive: true});
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRepo = process.cwd();
  const mirrorDir = path.resolve(args.mirrorDir);
  const outputDir = path.resolve(args.outputDir);
  const reportPath = path.resolve(args.report);
  try {
    const report = await stageDelivery({sourceRepo, mirrorDir, outputDir});
    await writeReport(reportPath, report);
    process.stdout.write(JSON.stringify({
      status: report.status,
      files: report.files.length,
      channels: report.channels.map((row) => row.channel),
      outputInventory: report.outputInventory,
    }) + '\n');
  } catch (error) {
    await writeReport(reportPath, {
      schemaVersion: 1,
      kind: 'CLOUDFLARE_DELIVERY_STAGE',
      status: 'ERROR',
      errorCode: boundedErrorCode(error),
    });
    throw error;
  }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${boundedErrorCode(error)}\n`);
    process.exitCode = 1;
  });
}
