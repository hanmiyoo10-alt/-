#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run as declareRun } from './declare-production.mjs';
import { run as syncRun } from './sync-state.mjs';

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) fail('POST_PUBLISH_SHADOW_ARGS_INVALID', a);
    const key = a.slice(2);
    const value = argv[++i];
    if (value == null || value.startsWith('--')) fail('POST_PUBLISH_SHADOW_ARGS_INVALID', key);
    out[key] = value;
  }
  return out;
}
function under(root, rel) {
  if (!rel || typeof rel !== 'string' || path.isAbsolute(rel)) fail('POST_PUBLISH_SHADOW_PATH_INVALID', String(rel));
  const p = path.resolve(root, rel);
  if (p !== root && !p.startsWith(root + path.sep)) fail('POST_PUBLISH_SHADOW_PATH_OUTSIDE_ROOT', rel);
  return p;
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function gitBlobSha1(bytes) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex'); }
function hashOrMissing(file) { return fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null; }
function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.simcore-post-publish-${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}
function sourceIdentity(bytes, version) {
  const text = bytes.toString('utf8');
  const v = text.match(/^\/\/@version\s+([^\r\n]+)$/m)?.[1]?.trim() || '';
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const n = text.match(new RegExp(`^// v${escaped}\\s+(.+?):\\s*$`, 'm'))?.[1]?.trim() || '';
  return { version: v, releaseName: n };
}
function verifyObservedProduction(root, input, identityPath) {
  const identity = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
  if (!identity || identity.schemaVersion !== 1 || identity.product !== 'SimCore' || identity.resolvedBranch !== 'release-simcore') fail('PUBLISHED_IDENTITY_NOT_OBSERVED', 'identity envelope');
  if (identity.resolvedCommit !== input.productionCommit) fail('PUBLISHED_IDENTITY_NOT_OBSERVED', 'commit');
  if (identity.latest?.blob !== input.productionBlob || identity.install?.blob !== input.productionBlob) fail('PUBLISHED_IDENTITY_NOT_OBSERVED', 'declared blob');
  const latestPath = under(root, identity.latest.path);
  const installPath = under(root, identity.install.path);
  const latest = fs.readFileSync(latestPath);
  const install = fs.readFileSync(installPath);
  const lb = gitBlobSha1(latest), ib = gitBlobSha1(install);
  if (lb !== input.productionBlob || ib !== input.productionBlob || !latest.equals(install)) fail('PUBLISHED_IDENTITY_NOT_OBSERVED', 'materialized latest/install');
  const parsed = sourceIdentity(latest, input.version);
  if (parsed.version !== input.version || parsed.releaseName !== input.releaseName) fail('PUBLISHED_IDENTITY_NOT_OBSERVED', 'source header');
  return { commit:identity.resolvedCommit, blob:lb, version:parsed.version, releaseName:parsed.releaseName };
}

export function run(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  for (const k of ['root','input','production-identity','report']) if (!a[k]) fail('POST_PUBLISH_SHADOW_ARGS_INVALID', k);
  const root = path.resolve(a.root);
  const manifestRel = a.manifest || 'product-manifest.json';
  const targetsRel = a.targets || 'products/simcore/state-sync/target-registry.json';
  const probesRel = a.probes || 'products/simcore/state-sync/current-claim-probes.json';
  const writerPolicyRel = a['writer-policy'] || 'products/simcore/state-sync/writer-policy.json';
  const recordDirRel = a['record-dir'] || 'products/simcore/releases/records';
  const inputPath = under(root, a.input);
  const identityPath = under(root, a['production-identity']);
  const reportPath = under(root, a.report);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const recordRel = path.posix.join(recordDirRel, `${input.releaseId}.json`);
  const managed = [manifestRel, 'docs/CURRENT_DEVELOPMENT.md', 'docs/SIMCORE_GUIDELINES.md', recordRel];
  const before = Object.fromEntries(managed.map((rel) => [rel, hashOrMissing(under(root, rel))]));

  const observed = verifyObservedProduction(root, input, identityPath);
  const workDirRel = a['work-dir'] || '.simcore-release/post-publish-shadow';
  const declareReportRel = path.posix.join(workDirRel, 'declare-report.json');
  const writeReportRel = path.posix.join(workDirRel, 'sync-write-report.json');
  const checkReportRel = path.posix.join(workDirRel, 'sync-check-report.json');

  const declaration = declareRun([
    '--root', root,
    '--manifest', manifestRel,
    '--input', a.input,
    '--record-dir', recordDirRel,
    '--report', declareReportRel,
  ]);

  const syncBase = [
    '--root', root,
    '--manifest', manifestRel,
    '--production-identity', a['production-identity'],
    '--targets', targetsRel,
    '--writer-policy', writerPolicyRel,
  ];
  if (a.probes !== 'NONE' && fs.existsSync(under(root, probesRel))) syncBase.push('--probes', probesRel);
  const writeResult = syncRun(['--write', ...syncBase, '--report', writeReportRel]);
  if (writeResult.exitCode !== 0) fail('STATE_SYNC_RENDER_FAILED', writeResult.result);
  const checkResult = syncRun(['--check', ...syncBase, '--report', checkReportRel]);
  if (checkResult.exitCode !== 0) fail('MAIN_STATE_REPLAY_DRIFT', checkResult.result);

  const recordPath = under(root, recordRel);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  record.releaseState = 'LIVE_PENDING';
  record.productionTruth = 'PUBLISHED_IDENTITY_SIMULATED_IN_SHADOW';
  record.stateSyncStatus = 'PASS';
  record.stateMainCommit = null;
  writeJsonAtomic(recordPath, record);

  const after = Object.fromEntries(managed.map((rel) => [rel, hashOrMissing(under(root, rel))]));
  const changedPaths = managed.filter((rel) => before[rel] !== after[rel]);
  const already = changedPaths.length === 0;
  const result = {
    schemaVersion:1,
    tool:'post-publish-state-shadow',
    releaseAuthority:'SHADOW_ONLY',
    productionMutation:'NONE',
    mainMutation:'LOCAL_WORKTREE_ONLY',
    releaseId:input.releaseId,
    production:observed,
    declaration:declaration.status,
    stateSync:checkResult.result,
    lifecycleState:'LIVE_PENDING',
    disposition:already ? 'ADMIN_STATE_ALREADY_SYNCED' : 'POST_PUBLISH_PATH_SHADOW_PASS',
    persistentPayloadAllowlist:managed,
    changedPaths,
  };
  writeJsonAtomic(reportPath, result);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    console.log(JSON.stringify(r));
  } catch (e) {
    console.error(e.code || 'POST_PUBLISH_STATE_SHADOW_FAILED', e.message || '');
    process.exit(2);
  }
}
