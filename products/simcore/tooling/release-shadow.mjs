#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const HEX40 = /^[0-9a-f]{40}$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const RELEASE_ID = /^simcore-v([0-9]+\.[0-9]+\.[0-9]+)-(new|correction|rollback|noop)-([0-9]{2,})$/;
const MODES = new Set(['NEW_VERSION', 'SAME_VERSION_CORRECTION', 'ROLLBACK', 'NOOP_IDENTICAL']);
const CHANGE_CLASSES = new Set(['RUNTIME_FEATURE', 'RUNTIME_CORRECTION', 'ROLLBACK', 'NOOP']);
const ALLOWED_PATHS = new Set(['plugins/simcore/latest.js', 'plugins/simcore/install.js']);

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}

function argsOf(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const x = argv[i];
    if (!x.startsWith('--')) fail('RELEASE_SHADOW_ARGS_INVALID', x);
    const key = x.slice(2);
    if (key === 'self-test') { out.selfTest = true; continue; }
    const value = argv[++i];
    if (value == null || value.startsWith('--')) fail('RELEASE_SHADOW_ARGS_INVALID', key);
    out[key] = value;
  }
  return out;
}

function git(...argv) {
  return execFileSync('git', argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function parseVersion(v) {
  if (!VERSION.test(v)) fail('RELEASE_SPEC_VERSION_INVALID', v);
  return v.split('.').map(Number);
}

function compareVersion(a, b) {
  const aa = parseVersion(a); const bb = parseVersion(b);
  for (let i = 0; i < 3; i += 1) if (aa[i] !== bb[i]) return aa[i] < bb[i] ? -1 : 1;
  return 0;
}

function validateSpec(spec, specPath) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) fail('RELEASE_SPEC_INVALID');
  const allowed = new Set(['schemaVersion','releaseId','product','version','releaseName','releaseMode','candidateCommit','expectedProductionCommit','candidateReleaseBlob','primaryGoalId','changeClass','evidenceRefs','liveGate','rollback']);
  for (const k of Object.keys(spec)) if (!allowed.has(k)) fail('RELEASE_SPEC_UNKNOWN_FIELD', k);
  if (spec.schemaVersion !== 1) fail('RELEASE_SPEC_SCHEMA_VERSION_INVALID');
  if (spec.product !== 'SimCore') fail('RELEASE_SPEC_PRODUCT_INVALID');
  if (!RELEASE_ID.test(spec.releaseId)) fail('RELEASE_SPEC_ID_INVALID');
  const stem = path.basename(specPath, '.json');
  if (stem !== spec.releaseId) fail('RELEASE_SPEC_FILENAME_MISMATCH', `${stem} != ${spec.releaseId}`);
  parseVersion(spec.version);
  if (typeof spec.releaseName !== 'string' || !spec.releaseName || spec.releaseName.length > 160) fail('RELEASE_SPEC_NAME_INVALID');
  if (!MODES.has(spec.releaseMode)) fail('RELEASE_SPEC_MODE_INVALID');
  for (const key of ['candidateCommit','expectedProductionCommit','candidateReleaseBlob']) if (!HEX40.test(spec[key] || '')) fail('RELEASE_SPEC_IDENTITY_INVALID', key);
  if (typeof spec.primaryGoalId !== 'string' || !spec.primaryGoalId || spec.primaryGoalId.length > 80) fail('RELEASE_SPEC_GOAL_INVALID');
  if (!CHANGE_CLASSES.has(spec.changeClass)) fail('RELEASE_SPEC_CHANGE_CLASS_INVALID');
  if (!Array.isArray(spec.evidenceRefs) || spec.evidenceRefs.length > 32 || spec.evidenceRefs.some(x => typeof x !== 'string' || !/^(docs|products\/simcore)\//.test(x) || x.length > 240)) fail('RELEASE_SPEC_EVIDENCE_INVALID');
  const g = spec.liveGate;
  if (!g || typeof g !== 'object' || typeof g.required !== 'boolean' || typeof g.scenarioId !== 'string' || !g.scenarioId || !['HUMAN_EVIDENCE','NOT_REQUIRED'].includes(g.closeAuthority)) fail('RELEASE_SPEC_LIVE_GATE_INVALID');
  if (spec.releaseMode === 'ROLLBACK') {
    if (!spec.rollback || !HEX40.test(spec.rollback.approvedSafeCommit || '') || !HEX40.test(spec.rollback.approvedSafeBlob || '') || typeof spec.rollback.reasonCode !== 'string' || !spec.rollback.reasonCode) fail('RELEASE_SPEC_ROLLBACK_INVALID');
  } else if ('rollback' in spec) fail('RELEASE_SPEC_ROLLBACK_UNEXPECTED');
  const kind = { NEW_VERSION:'new', SAME_VERSION_CORRECTION:'correction', ROLLBACK:'rollback', NOOP_IDENTICAL:'noop' }[spec.releaseMode];
  const match = RELEASE_ID.exec(spec.releaseId);
  if (match[1] !== spec.version || match[2] !== kind) fail('RELEASE_SPEC_ID_MODE_MISMATCH');
  return spec;
}

function extractHeader(source) {
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || source.match(/\bversion\s*[:=]\s*["']([^"']+)["']/)?.[1] || '';
  const releaseName = source.match(/^\/\/@release\s+(.+)$/m)?.[1]?.trim() || source.match(/\breleaseName\s*[:=]\s*["']([^"']+)["']/)?.[1] || '';
  return { version, releaseName };
}

export function evaluateShadow({ spec, specPath, ciConclusion = 'PASS', currentProductionCommit = null }) {
  validateSpec(spec, specPath);
  const P = currentProductionCommit || git('rev-parse', 'origin/release-simcore');
  if (!HEX40.test(P)) fail('PRODUCTION_IDENTITY_INVALID');
  if (P !== spec.expectedProductionCommit) fail('PRODUCTION_PARENT_MOVED', `${P} != ${spec.expectedProductionCommit}`);

  git('cat-file', '-e', `${spec.candidateCommit}^{commit}`);
  const parents = git('show', '-s', '--format=%P', spec.candidateCommit).split(/\s+/).filter(Boolean);
  if (parents.length !== 1 || parents[0] !== spec.expectedProductionCommit) fail('CANDIDATE_PARENT_INVALID');

  const latestBlob = git('rev-parse', `${spec.candidateCommit}:plugins/simcore/latest.js`);
  const installBlob = git('rev-parse', `${spec.candidateCommit}:plugins/simcore/install.js`);
  if (latestBlob !== installBlob) fail('CANDIDATE_LATEST_INSTALL_MISMATCH');
  if (latestBlob !== spec.candidateReleaseBlob) fail('CANDIDATE_PUBLISH_BLOB_MISMATCH');

  const changedPaths = git('diff', '--name-only', spec.expectedProductionCommit, spec.candidateCommit).split(/\r?\n/).filter(Boolean);
  const unexpected = changedPaths.filter(p => !ALLOWED_PATHS.has(p));
  if (unexpected.length) fail('CANDIDATE_PATH_SCOPE_INVALID', unexpected.join(','));

  const latest = git('show', `${spec.candidateCommit}:plugins/simcore/latest.js`);
  const install = git('show', `${spec.candidateCommit}:plugins/simcore/install.js`);
  if (Buffer.from(latest).compare(Buffer.from(install)) !== 0) fail('CANDIDATE_BYTES_MISMATCH');
  const header = extractHeader(latest);
  if (header.version !== spec.version) fail('RELEASE_SPEC_VERSION_MISMATCH', `${header.version} != ${spec.version}`);
  if (header.releaseName && header.releaseName !== spec.releaseName) fail('RELEASE_SPEC_NAME_MISMATCH');

  const prodLatestBlob = git('rev-parse', `${spec.expectedProductionCommit}:plugins/simcore/latest.js`);
  const prodLatest = git('show', `${spec.expectedProductionCommit}:plugins/simcore/latest.js`);
  const prodVersion = extractHeader(prodLatest).version;
  const relation = compareVersion(spec.version, prodVersion);
  if (spec.releaseMode === 'NEW_VERSION' && relation <= 0) fail('RELEASE_MODE_RELATION_INVALID');
  if (spec.releaseMode === 'SAME_VERSION_CORRECTION' && relation !== 0) fail('RELEASE_MODE_RELATION_INVALID');
  if (spec.releaseMode === 'ROLLBACK') {
    if (spec.rollback.approvedSafeBlob !== spec.candidateReleaseBlob) fail('ROLLBACK_APPROVED_BLOB_MISMATCH');
    const approvedBlob = git('rev-parse', `${spec.rollback.approvedSafeCommit}:plugins/simcore/latest.js`);
    if (approvedBlob !== spec.rollback.approvedSafeBlob) fail('ROLLBACK_APPROVED_SOURCE_MISMATCH');
  }
  if (spec.releaseMode === 'NOOP_IDENTICAL' && latestBlob !== prodLatestBlob) fail('NOOP_IDENTICAL_BLOB_CHANGED');
  if (spec.releaseMode !== 'NOOP_IDENTICAL' && latestBlob === prodLatestBlob) fail('RELEASE_MODE_IDENTICAL_UNDECLARED');
  if (ciConclusion !== 'PASS') fail('CANDIDATE_REQUIRED_FAILED');

  const specDigest = sha256(canonicalBytes(spec));
  const disposition = spec.releaseMode === 'NOOP_IDENTICAL' ? 'WOULD_NOOP' : 'WOULD_PUBLISH';
  return {
    schemaVersion: 1,
    releaseAuthority: 'SHADOW_ONLY',
    publicationDisposition: disposition,
    productionMutation: 'NONE',
    authorization: {
      releaseSpecPath: specPath,
      releaseSpecSha256: specDigest,
      releaseId: spec.releaseId
    },
    candidate: {
      commit: spec.candidateCommit,
      parent: spec.expectedProductionCommit,
      releaseBlob: latestBlob,
      changedPaths
    },
    production: {
      commit: P,
      releaseBlob: prodLatestBlob,
      version: prodVersion
    },
    verification: { candidateRequired: 'PASS' }
  };
}

function selfTest() {
  const ids = [
    ['simcore-v0.65.0-new-01','0.65.0','NEW_VERSION'],
    ['simcore-v0.64.6-correction-01','0.64.6','SAME_VERSION_CORRECTION'],
    ['simcore-v0.64.5-rollback-01','0.64.5','ROLLBACK'],
    ['simcore-v0.64.6-noop-01','0.64.6','NOOP_IDENTICAL']
  ];
  for (const [id,v,m] of ids) {
    const kind = {NEW_VERSION:'new',SAME_VERSION_CORRECTION:'correction',ROLLBACK:'rollback',NOOP_IDENTICAL:'noop'}[m];
    const x = RELEASE_ID.exec(id); if (!x || x[1] !== v || x[2] !== kind) throw new Error(`self-test id ${id}`);
  }
  if (!(compareVersion('0.65.0','0.64.6') > 0 && compareVersion('0.64.6','0.64.6') === 0 && compareVersion('0.64.5','0.64.6') < 0)) throw new Error('self-test version compare');
  console.log('RS2_4_SHADOW_SELF_TEST_PASS');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const a = argsOf(process.argv);
    if (a.selfTest) selfTest();
    else {
      if (!a.spec || !a.report) fail('RELEASE_SHADOW_ARGS_INVALID');
      const raw = fs.readFileSync(a.spec, 'utf8');
      const spec = JSON.parse(raw);
      const result = evaluateShadow({ spec, specPath: a.spec, ciConclusion: a['ci-conclusion'] || 'PASS' });
      fs.mkdirSync(path.dirname(a.report), { recursive: true });
      fs.writeFileSync(a.report, `${JSON.stringify(result, null, 2)}\n`);
      console.log(JSON.stringify({ releaseAuthority: result.releaseAuthority, publicationDisposition: result.publicationDisposition, releaseId: spec.releaseId }));
    }
  } catch (e) {
    const code = e?.code || 'RELEASE_SHADOW_FAILED';
    console.error(code, e?.message || '');
    process.exit(2);
  }
}
