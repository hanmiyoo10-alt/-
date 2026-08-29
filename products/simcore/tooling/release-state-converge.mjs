#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run as declareRun } from './declare-production.mjs';
import { run as syncRun } from './sync-state.mjs';

const LIVE_BEGIN = '<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:BEGIN -->';
const LIVE_END = '<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:END -->';
const RELEASE_BEGIN_RE = /<!-- SIMCORE_RELEASE_STATE:([^:]+):BEGIN -->/g;
const RELEASE_END_RE = /<!-- SIMCORE_RELEASE_STATE:([^:]+):END -->/g;
const SNAPSHOT_END = '<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->';
const HEX40 = /^[0-9a-f]{40}$/;
const SAFE_GATE = /^[A-Za-z0-9_.:-]{1,128}$/;
const MODES = new Set(['PERMANENT', 'RECOVERY', 'PREPUBLICATION_SIMULATION']);

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) fail('STATE_CONVERGE_ARGS_INVALID', a);
    const key = a.slice(2);
    const value = argv[++i];
    if (value == null || value.startsWith('--')) fail('STATE_CONVERGE_ARGS_INVALID', key);
    out[key] = value;
  }
  return out;
}
function under(root, rel) {
  if (!rel || typeof rel !== 'string' || path.isAbsolute(rel)) fail('STATE_CONVERGE_PATH_INVALID', String(rel));
  const p = path.resolve(root, rel);
  if (p !== root && !p.startsWith(root + path.sep)) fail('STATE_CONVERGE_PATH_OUTSIDE_ROOT', rel);
  return p;
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function gitBlobSha1(bytes) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex'); }
function hashOrMissing(file) { return fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null; }
function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const tmp = `${file}.simcore-state-converge-${process.pid}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, file);
  return bytes;
}
function writeTextAtomic(file, text) {
  const tmp = `${file}.simcore-state-converge-${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}
function sourceIdentity(bytes, version) {
  const text = bytes.toString('utf8');
  const v = text.match(/^\/\/@version\s+([^\r\n]+)$/m)?.[1]?.trim() || '';
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const n = text.match(new RegExp(`^// v${escaped}\\s+(.+?):\\s*$`, 'm'))?.[1]?.trim() || '';
  return { version: v, releaseName: n };
}
function validatePublicationInput(input) {
  if (!input || input.schemaVersion !== 1 || input.product !== 'SimCore') fail('STATE_CONVERGE_INPUT_INVALID', 'envelope');
  for (const k of ['releaseId','productionCommit','previousProductionCommit','productionBlob','version','releaseName','liveScenarioId','publisherRunId']) {
    if (typeof input[k] !== 'string' || !input[k]) fail('STATE_CONVERGE_INPUT_INVALID', k);
  }
  for (const k of ['productionCommit','previousProductionCommit','productionBlob']) if (!HEX40.test(input[k])) fail('STATE_CONVERGE_INPUT_INVALID', k);
  if (!SAFE_GATE.test(input.liveScenarioId) || input.liveScenarioId === 'UNASSIGNED') fail('LIVE_PENDING_GATE_REQUIRED', input.liveScenarioId || 'missing');
  if (input.publisherRunId.length > 128 || /[\r\n\0]/.test(input.publisherRunId)) fail('STATE_CONVERGE_INPUT_INVALID', 'publisherRunId');
}
function resolveMode(value) {
  const mode = value || 'PERMANENT';
  if (!MODES.has(mode)) fail('R2_6_STATE_ENVELOPE_INVALID', `mode=${mode}`);
  return mode;
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
function liveBlock(input) {
  return [
    LIVE_BEGIN,
    '## Current Release Live Gate',
    '',
    `- Release transaction: \`${input.releaseId}\``,
    `- Production commit: \`${input.productionCommit}\``,
    '- Validation status: `PENDING_REAL_LONG_CHAT`',
    `- Current priority / live gate: \`${input.liveScenarioId}\``,
    '- R lifecycle: `REAL_RELEASE_LIVE_PENDING`',
    '',
    'This block is machine-managed by `release-state-converge` from immutable publication evidence.',
    LIVE_END,
  ].join('\n');
}
function renderLiveBlock(file, input) {
  let text = fs.readFileSync(file, 'utf8');
  const expected = liveBlock(input);
  const begins = [...text.matchAll(RELEASE_BEGIN_RE)];
  const ends = [...text.matchAll(RELEASE_END_RE)];
  if (begins.length !== ends.length || begins.length > 1) fail('LIVE_PENDING_DOC_MARKER_INVALID');
  if (begins.length === 1) {
    const begin = begins[0], end = ends[0];
    if (begin[1] !== end[1] || end.index < begin.index) fail('LIVE_PENDING_DOC_MARKER_INVALID');
    const start = begin.index;
    const finish = end.index + end[0].length;
    text = `${text.slice(0,start)}${expected}${text.slice(finish)}`;
  } else {
    const anchor = text.indexOf(SNAPSHOT_END);
    if (anchor < 0) fail('LIVE_PENDING_DOC_ANCHOR_MISSING');
    const finish = anchor + SNAPSHOT_END.length;
    text = `${text.slice(0,finish)}\n\n${expected}${text.slice(finish)}`;
  }
  writeTextAtomic(file, text);
}
function expectedReceipt(input, recordRel, productionMutation) {
  return {
    schemaVersion:1,
    product:'SimCore',
    releaseId:input.releaseId,
    publisherRunId:input.publisherRunId,
    productionCommit:input.productionCommit,
    previousProductionCommit:input.previousProductionCommit,
    productionBlob:input.productionBlob,
    liveScenarioId:input.liveScenarioId,
    validationStatus:'PENDING_REAL_LONG_CHAT',
    lifecycleState:'REAL_RELEASE_LIVE_PENDING',
    releaseRecordPath:recordRel,
    productionMutation,
    releaseAuthority:'RS2_4_PERMANENT',
    result:'PASS',
  };
}
function persistReceipt(file, expected) {
  if (fs.existsSync(file)) {
    let existing;
    try { existing = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { fail('STATE_RECEIPT_CONFLICT', 'invalid existing receipt'); }
    if (JSON.stringify(existing) !== JSON.stringify(expected)) fail('STATE_RECEIPT_CONFLICT', expected.releaseId);
    return;
  }
  writeJsonAtomic(file, expected);
}
function persistentManifest(root, paths) {
  return paths.map((rel) => {
    const file = under(root, rel);
    if (!fs.existsSync(file)) fail('R2_6_STATE_ENVELOPE_INVALID', `persistent member missing ${rel}`);
    return { path: rel, required: true, sha256: sha256(fs.readFileSync(file)) };
  });
}

export function validatePostPublishStateEnvelope(envelope) {
  if (!envelope || envelope.schemaVersion !== 1 || envelope.envelopeKind !== 'PostPublishStateEnvelope') fail('R2_6_STATE_ENVELOPE_INVALID', 'schema');
  if (!MODES.has(envelope.mode)) fail('R2_6_STATE_ENVELOPE_INVALID', 'mode');
  for (const k of ['releaseId','releaseAuthority','productionCommit','previousProductionCommit','productionBlob','version','releaseName','publisherRunId','liveScenarioId','validationStatus','lifecycleState','rLifecycleState','disposition','stateReceiptPath','releaseRecordPath','productionMutation','mainMutation']) {
    if (typeof envelope[k] !== 'string' || !envelope[k]) fail('R2_6_STATE_ENVELOPE_INVALID', k);
  }
  if (envelope.releaseAuthority !== 'RS2_4_PERMANENT') fail('R2_6_STATE_ENVELOPE_INVALID', 'releaseAuthority');
  for (const k of ['productionCommit','previousProductionCommit','productionBlob']) if (!HEX40.test(envelope[k])) fail('R2_6_STATE_ENVELOPE_INVALID', k);
  if (envelope.validationStatus !== 'PENDING_REAL_LONG_CHAT' || envelope.lifecycleState !== 'LIVE_PENDING' || envelope.rLifecycleState !== 'REAL_RELEASE_LIVE_PENDING') fail('R2_6_STATE_ENVELOPE_INVALID', 'lifecycle');
  if (!Array.isArray(envelope.persistentPayloadManifest) || envelope.persistentPayloadManifest.length === 0) fail('R2_6_STATE_ENVELOPE_INVALID', 'persistentPayloadManifest');
  const seen = new Set();
  for (const row of envelope.persistentPayloadManifest) {
    if (!row || typeof row.path !== 'string' || row.required !== true || !/^[0-9a-f]{64}$/.test(row.sha256 || '') || seen.has(row.path)) fail('R2_6_STATE_ENVELOPE_INVALID', 'persistent member');
    seen.add(row.path);
  }
  if (!Array.isArray(envelope.changedPaths) || envelope.changedPaths.some((p) => typeof p !== 'string' || !seen.has(p)) || new Set(envelope.changedPaths).size !== envelope.changedPaths.length) fail('R2_6_STATE_ENVELOPE_INVALID', 'changedPaths');
  if (!envelope.expectedDurableClaims || typeof envelope.expectedDurableClaims !== 'object') fail('R2_6_STATE_ENVELOPE_INVALID', 'expectedDurableClaims');
  return envelope;
}

export function run(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  for (const k of ['root','input','production-identity','report']) if (!a[k]) fail('STATE_CONVERGE_ARGS_INVALID', k);
  const mode = resolveMode(a.mode);
  const root = path.resolve(a.root);
  const manifestRel = a.manifest || 'product-manifest.json';
  const targetsRel = a.targets || 'products/simcore/state-sync/target-registry.json';
  const probesRel = a.probes || 'products/simcore/state-sync/current-claim-probes.json';
  const writerPolicyRel = a['writer-policy'] || 'products/simcore/state-sync/writer-policy.json';
  const recordDirRel = a['record-dir'] || 'products/simcore/releases/records';
  const receiptDirRel = a['receipt-dir'] || 'products/simcore/releases/state-receipts';
  const inputPath = under(root, a.input);
  const identityPath = under(root, a['production-identity']);
  const reportPath = under(root, a.report);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  validatePublicationInput(input);
  const recordRel = path.posix.join(recordDirRel, `${input.releaseId}.json`);
  const receiptRel = path.posix.join(receiptDirRel, `${input.releaseId}.json`);
  const developmentRel = 'docs/CURRENT_DEVELOPMENT.md';
  const managed = [manifestRel, developmentRel, 'docs/SIMCORE_GUIDELINES.md', recordRel, receiptRel];
  const before = Object.fromEntries(managed.map((rel) => [rel, hashOrMissing(under(root, rel))]));

  const observed = verifyObservedProduction(root, input, identityPath);
  const workDirRel = a['work-dir'] || '.simcore-release/state-converge';
  const declareReportRel = path.posix.join(workDirRel, 'declare-report.json');
  const writeReportRel = path.posix.join(workDirRel, 'sync-write-report.json');
  const checkReportRel = path.posix.join(workDirRel, 'sync-check-report.json');
  const finalCheckReportRel = path.posix.join(workDirRel, 'sync-final-check-report.json');

  const declaration = declareRun([
    '--root', root,
    '--manifest', manifestRel,
    '--input', a.input,
    '--record-dir', recordDirRel,
    '--report', declareReportRel,
  ]);

  const manifestPath = under(root, manifestRel);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.current_priority = input.liveScenarioId;
  writeJsonAtomic(manifestPath, manifest);

  const syncBase = [
    '--root', root,
    '--manifest', manifestRel,
    '--production-identity', a['production-identity'],
    '--targets', targetsRel,
    '--writer-policy', writerPolicyRel,
  ];
  if (a.probes !== 'NONE' && fs.existsSync(under(root, probesRel))) syncBase.push('--probes', probesRel);
  const writeResult = syncRun(['--write', ...syncBase, '--report', writeReportRel]);
  if (writeResult.exitCode !== 0) fail(mode === 'PREPUBLICATION_SIMULATION' ? 'R2_6_PREPLAY_STATE_RENDER_FAIL' : 'STATE_SYNC_RENDER_FAILED', writeResult.result);
  const checkResult = syncRun(['--check', ...syncBase, '--report', checkReportRel]);
  if (checkResult.exitCode !== 0) fail(mode === 'PREPUBLICATION_SIMULATION' ? 'R2_6_PREPLAY_STATE_RENDER_FAIL' : 'MAIN_STATE_REPLAY_DRIFT', checkResult.result);

  const recordPath = under(root, recordRel);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  if (record.liveGate?.required !== true || record.liveGate?.scenarioId !== input.liveScenarioId) fail('LIVE_PENDING_RECORD_GATE_MISMATCH');
  record.releaseState = 'LIVE_PENDING';
  record.productionTruth = 'PUBLISHED_IDENTITY_VERIFIED';
  record.stateSyncStatus = 'PASS';
  record.stateMainCommit = null;
  writeJsonAtomic(recordPath, record);

  renderLiveBlock(under(root, developmentRel), input);
  const productionMutation = mode === 'PREPUBLICATION_SIMULATION' ? 'NONE' : 'ALREADY_PUBLISHED_UPSTREAM';
  const receipt = expectedReceipt(input, recordRel, productionMutation);
  persistReceipt(under(root, receiptRel), receipt);

  const finalCheck = syncRun(['--check', ...syncBase, '--report', finalCheckReportRel]);
  if (finalCheck.exitCode !== 0) fail(mode === 'PREPUBLICATION_SIMULATION' ? 'R2_6_PREPLAY_STATE_RENDER_FAIL' : 'MAIN_STATE_REPLAY_DRIFT', finalCheck.result);

  const after = Object.fromEntries(managed.map((rel) => [rel, hashOrMissing(under(root, rel))]));
  const changedPaths = managed.filter((rel) => before[rel] !== after[rel]);
  const already = changedPaths.length === 0;
  const payloadManifest = persistentManifest(root, managed);
  const expectedDurableClaims = {
    releaseId: input.releaseId,
    releaseAuthority: 'RS2_4_PERMANENT',
    productionCommit: input.productionCommit,
    previousProductionCommit: input.previousProductionCommit,
    productionBlob: input.productionBlob,
    version: input.version,
    releaseName: input.releaseName,
    publisherRunId: input.publisherRunId,
    liveScenarioId: input.liveScenarioId,
    validationStatus: 'PENDING_REAL_LONG_CHAT',
    lifecycleState: 'LIVE_PENDING',
    rLifecycleState: 'REAL_RELEASE_LIVE_PENDING',
    receiptResult: 'PASS',
    currentPriority: input.liveScenarioId,
  };
  const disposition = mode === 'PREPUBLICATION_SIMULATION'
    ? (already ? 'PREPLAY_ALREADY_EQUIVALENT' : 'PREPLAY_PASS')
    : (already ? 'ALREADY_CONVERGED' : 'LIVE_PENDING_PAYLOAD_READY');
  const result = {
    schemaVersion:1,
    envelopeKind:'PostPublishStateEnvelope',
    tool:'release-state-converge',
    mode,
    releaseId:input.releaseId,
    releaseAuthority:'RS2_4_PERMANENT',
    productionCommit:input.productionCommit,
    previousProductionCommit:input.previousProductionCommit,
    productionBlob:input.productionBlob,
    version:input.version,
    releaseName:input.releaseName,
    publisherRunId:input.publisherRunId,
    liveScenarioId:input.liveScenarioId,
    validationStatus:'PENDING_REAL_LONG_CHAT',
    lifecycleState:'LIVE_PENDING',
    rLifecycleState:'REAL_RELEASE_LIVE_PENDING',
    disposition,
    persistentPayloadManifest:payloadManifest,
    changedPaths,
    stateReceiptPath:receiptRel,
    releaseRecordPath:recordRel,
    expectedDurableClaims,
    productionMutation,
    mainMutation:mode === 'PREPUBLICATION_SIMULATION' ? 'SIMULATION_ONLY' : (already ? 'NONE' : 'LOCAL_PAYLOAD_PENDING_GATEWAY'),
    production:observed,
    declaration:declaration.status,
    stateSync:finalCheck.result,
    currentPriority:input.liveScenarioId,
    persistentPayloadAllowlist:managed,
  };
  validatePostPublishStateEnvelope(result);
  writeJsonAtomic(reportPath, result);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    console.log(JSON.stringify(r));
  } catch (e) {
    console.error(e.code || 'RELEASE_STATE_CONVERGE_FAILED', e.message || '');
    process.exit(2);
  }
}
