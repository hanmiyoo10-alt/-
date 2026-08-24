#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const MODES = new Set(['NEW_VERSION', 'SAME_VERSION_CORRECTION', 'ROLLBACK']);
const MANIFEST_FIELDS = new Set(['production_version','release_name','release_branch','release_commit','release_blob','validation_status']);
const IDENTITY_FIELDS = [
  'releaseId','releaseMode','authorizationCommit','releaseSpecPath','releaseSpecSha256',
  'productionCommit','previousProductionCommit','productionBlob','version','releaseName',
  'verificationReportSha256','verifierCommit'
];

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function under(root, rel) {
  if (!rel || typeof rel !== 'string' || path.isAbsolute(rel)) fail('DECLARE_PATH_INVALID', String(rel));
  const p = path.resolve(root, rel);
  if (p !== root && !p.startsWith(root + path.sep)) fail('DECLARE_PATH_OUTSIDE_ROOT', rel);
  return p;
}
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) fail('DECLARE_ARGS_INVALID', a);
    const k = a.slice(2);
    if (k === 'self-test') { o.selfTest = true; continue; }
    const v = argv[++i];
    if (v == null || v.startsWith('--')) fail('DECLARE_ARGS_INVALID', k);
    o[k] = v;
  }
  return o;
}
function validateInput(x) {
  if (!x || x.schemaVersion !== 1 || x.product !== 'SimCore') fail('DECLARE_INPUT_INVALID', 'identity envelope');
  for (const k of IDENTITY_FIELDS) if (typeof x[k] !== 'string' || !x[k]) fail('DECLARE_INPUT_INVALID', k);
  if (!MODES.has(x.releaseMode)) fail('DECLARE_MODE_INVALID', x.releaseMode);
  for (const k of ['authorizationCommit','productionCommit','previousProductionCommit','productionBlob','verifierCommit']) if (!HEX40.test(x[k])) fail('DECLARE_IDENTITY_INVALID', k);
  for (const k of ['releaseSpecSha256','verificationReportSha256']) if (!HEX64.test(x[k])) fail('DECLARE_DIGEST_INVALID', k);
  if (!VERSION.test(x.version)) fail('DECLARE_VERSION_INVALID');
  if (x.releaseName.length > 160 || /[\r\n\0]/.test(x.releaseName)) fail('DECLARE_RELEASE_NAME_INVALID');
  if (!/^simcore-v/.test(x.releaseId) || x.releaseId.length > 96) fail('DECLARE_RELEASE_ID_INVALID');
  if (!/^products\/simcore\/releases\/specs\/.+\.json$/.test(x.releaseSpecPath)) fail('DECLARE_SPEC_PATH_INVALID');
  if (x.liveScenarioId != null && (typeof x.liveScenarioId !== 'string' || !x.liveScenarioId || x.liveScenarioId.length > 96)) fail('DECLARE_LIVE_SCENARIO_INVALID');
  if (x.publisherRunId != null && (typeof x.publisherRunId !== 'string' || x.publisherRunId.length > 128 || /[\r\n\0]/.test(x.publisherRunId))) fail('DECLARE_PUBLISHER_RUN_INVALID');
}
function validateManifest(m) {
  if (!m || m.schema_version !== 1 || m.product !== 'SimCore' || m.release_branch !== 'release-simcore') fail('DECLARE_MANIFEST_INVALID');
  for (const k of ['production_version','release_name','release_commit','release_blob','validation_status']) if (!(k in m)) fail('DECLARE_MANIFEST_INVALID', k);
  if (!HEX40.test(m.release_commit) || !HEX40.test(m.release_blob)) fail('DECLARE_MANIFEST_INVALID', 'identity');
}
function identityTuple(x) {
  return Object.fromEntries(IDENTITY_FIELDS.map((k) => [k, x[k]]));
}
function recordMatches(record, input) {
  if (!record || record.schemaVersion !== 1 || record.product !== 'SimCore') return false;
  return IDENTITY_FIELDS.every((k) => record[k] === input[k]);
}
function buildRecord(input, existing = null) {
  if (existing && !recordMatches(existing, input)) fail('RELEASE_RECORD_IDENTITY_MISMATCH', input.releaseId);
  const record = existing ? structuredClone(existing) : {
    schemaVersion: 1,
    product: 'SimCore',
    ...identityTuple(input),
    publisherRunId: input.publisherRunId || null,
    releaseState: 'LIVE_PENDING',
    productionTruth: 'PUBLISHED_IDENTITY_VERIFIED',
    stateSyncStatus: 'PENDING',
    stateMainCommit: null,
    liveGate: { required: true, scenarioId: input.liveScenarioId || 'UNASSIGNED', result: 'PENDING' },
    openAnomalyIds: [],
  };
  record.releaseState = 'LIVE_PENDING';
  record.productionTruth = 'PUBLISHED_IDENTITY_VERIFIED';
  if (!record.liveGate || typeof record.liveGate !== 'object') record.liveGate = { required: true, scenarioId: input.liveScenarioId || 'UNASSIGNED', result: 'PENDING' };
  return record;
}
export function buildDeclaration(manifest, input, existingRecord = null) {
  validateManifest(manifest);
  validateInput(input);
  const isNormal = manifest.release_commit === input.previousProductionCommit;
  const isAlreadyCurrent = manifest.release_commit === input.productionCommit;
  if (!isNormal && !isAlreadyCurrent) fail('ADMIN_RECOVERY_RELEASE_SUPERSEDED', `${manifest.release_commit} not in {${input.previousProductionCommit},${input.productionCommit}}`);

  const next = structuredClone(manifest);
  if (isNormal) {
    next.production_version = input.version;
    next.release_name = input.releaseName;
    next.release_branch = 'release-simcore';
    next.release_commit = input.productionCommit;
    next.release_blob = input.productionBlob;
    next.validation_status = 'PENDING_REAL_LONG_CHAT';
  } else {
    const mismatches = [];
    if (next.production_version !== input.version) mismatches.push('production_version');
    if (next.release_name !== input.releaseName) mismatches.push('release_name');
    if (next.release_branch !== 'release-simcore') mismatches.push('release_branch');
    if (next.release_blob !== input.productionBlob) mismatches.push('release_blob');
    if (mismatches.length) fail('MANIFEST_POST_WRITE_MISMATCH', mismatches.join(','));
    if (next.validation_status !== 'PENDING_REAL_LONG_CHAT') next.validation_status = 'PENDING_REAL_LONG_CHAT';
  }

  const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(manifest[k]));
  for (const k of changed) if (!MANIFEST_FIELDS.has(k)) fail('MANIFEST_WRITE_SCOPE_DENIED', k);
  return {
    manifest: next,
    record: buildRecord(input, existingRecord),
    changedFields: changed,
    disposition: isAlreadyCurrent ? 'ADMIN_RECOVERY_REDECLARED' : 'DECLARED_LIVE_PENDING',
  };
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const tmp = `${file}.simcore-declare-${process.pid}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, file);
  return bytes;
}

function selfTest() {
  const m = { schema_version:1, product:'SimCore', production_version:'0.1.0', release_name:'Old', release_branch:'release-simcore', release_commit:'a'.repeat(40), release_blob:'b'.repeat(40), validation_status:'PASS', keep:{x:1} };
  const i = { schemaVersion:1, product:'SimCore', releaseId:'simcore-v0.2.0-new-01', releaseMode:'NEW_VERSION', authorizationCommit:'c'.repeat(40), releaseSpecPath:'products/simcore/releases/specs/simcore-v0.2.0-new-01.json', releaseSpecSha256:'d'.repeat(64), productionCommit:'e'.repeat(40), previousProductionCommit:'a'.repeat(40), productionBlob:'f'.repeat(40), version:'0.2.0', releaseName:'New', verificationReportSha256:'1'.repeat(64), verifierCommit:'2'.repeat(40), liveScenarioId:'smoke' };
  const r = buildDeclaration(m, i);
  if (r.manifest.keep.x !== 1 || r.manifest.validation_status !== 'PENDING_REAL_LONG_CHAT' || r.record.releaseState !== 'LIVE_PENDING') throw new Error('self-test normal');
  const again = buildDeclaration(r.manifest, i, r.record);
  if (again.disposition !== 'ADMIN_RECOVERY_REDECLARED') throw new Error('self-test recovery');
  let blocked = false;
  try { buildDeclaration({ ...m, release_commit:'9'.repeat(40) }, i); } catch (e) { blocked = e.code === 'ADMIN_RECOVERY_RELEASE_SUPERSEDED'; }
  if (!blocked) throw new Error('self-test superseded');
  console.log('DECLARE_PRODUCTION_SELF_TEST_PASS');
}

export function run(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  if (a.selfTest) { selfTest(); return { status:'SELF_TEST_PASS' }; }
  for (const k of ['root','manifest','input','record-dir','report']) if (!a[k]) fail('DECLARE_ARGS_INVALID', k);
  const root = path.resolve(a.root);
  const manifestPath = under(root, a.manifest);
  const inputPath = under(root, a.input);
  const recordDir = under(root, a['record-dir']);
  const reportPath = under(root, a.report);
  const beforeBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(beforeBytes);
  const input = JSON.parse(fs.readFileSync(inputPath));
  const recordPath = under(root, path.posix.join(a['record-dir'], `${input.releaseId}.json`));
  let existing = null;
  if (fs.existsSync(recordPath)) existing = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const r = buildDeclaration(manifest, input, existing);
  const manifestBytes = writeJsonAtomic(manifestPath, r.manifest);
  const recordBytes = writeJsonAtomic(recordPath, r.record);
  const report = {
    schemaVersion:1,
    status:r.disposition,
    releaseId:input.releaseId,
    changedFields:r.changedFields,
    manifestBeforeSha256:sha256(beforeBytes),
    manifestAfterSha256:sha256(manifestBytes),
    recordPath:path.relative(root, recordPath).replaceAll('\\','/'),
    recordSha256:sha256(recordBytes),
  };
  writeJsonAtomic(reportPath, report);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    if (r.status !== 'SELF_TEST_PASS') console.log(`DECLARE_PRODUCTION_PASS ${r.releaseId} ${r.status}`);
  } catch (e) {
    console.error(e.code || 'DECLARE_PRODUCTION_FAILED', e.message || '');
    process.exit(2);
  }
}
