import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const RELEASE_MODES = Object.freeze([
  'NEW_VERSION',
  'SAME_VERSION_CORRECTION',
  'ROLLBACK',
  'NOOP_IDENTICAL',
]);

export const CHANGE_CLASSES = Object.freeze([
  'RUNTIME_FEATURE',
  'CORRECTNESS_MINI',
  'SAME_VERSION_CORRECTION',
  'ROLLBACK',
  'RELEASE_INFRA_QUALIFICATION',
]);

export const ALLOWED_PRODUCTION_PATHS = Object.freeze([
  'plugins/simcore/latest.js',
  'plugins/simcore/install.js',
]);

const SHA_RE = /^[0-9a-f]{40}$/;
const VERSION_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const RELEASE_ID_RE = /^simcore-v([0-9]+\.[0-9]+\.[0-9]+)-(new|correction|rollback|noop)-([0-9]{2,})$/;
const EVIDENCE_RE = /^docs\/[A-Za-z0-9_./-]+\.md(?:#[A-Za-z0-9_.:-]+)?$/;
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

export class ReleaseError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReleaseError';
    this.releaseCode = code;
  }
}

export function fail(code, message) {
  throw new ReleaseError(code, message);
}

export function requireCondition(condition, code, message) {
  if (!condition) fail(code, message);
}

export function isGitSha(value) {
  return SHA_RE.test(String(value || ''));
}

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(sorted(value), null, 2)}\n`;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function boundedString(value, label, min, max, pattern = null) {
  requireCondition(typeof value === 'string', 'RELEASE_SPEC_SCHEMA_INVALID', `${label} must be string`);
  requireCondition(value.length >= min && value.length <= max, 'RELEASE_SPEC_SCHEMA_INVALID', `${label} length invalid`);
  requireCondition(!/[\u0000-\u001f\u007f]/.test(value), 'RELEASE_SPEC_SCHEMA_INVALID', `${label} contains control character`);
  if (pattern) requireCondition(pattern.test(value), 'RELEASE_SPEC_SCHEMA_INVALID', `${label} format invalid`);
  return value;
}

function exactKeys(object, allowed, label) {
  requireCondition(object && typeof object === 'object' && !Array.isArray(object), 'RELEASE_SPEC_SCHEMA_INVALID', `${label} must be object`);
  for (const key of Object.keys(object)) {
    requireCondition(allowed.has(key), 'RELEASE_SPEC_SCHEMA_INVALID', `${label}.${key} is not allowed`);
  }
}

function requiredKeys(object, required, label) {
  for (const key of required) {
    requireCondition(Object.prototype.hasOwnProperty.call(object, key), 'RELEASE_SPEC_SCHEMA_INVALID', `${label}.${key} required`);
  }
}

function validateEvidenceRefs(value, label = 'evidenceRefs') {
  requireCondition(Array.isArray(value) && value.length <= 12, 'RELEASE_SPEC_SCHEMA_INVALID', `${label} must be bounded array`);
  const seen = new Set();
  for (const item of value) {
    boundedString(item, `${label}[]`, 8, 220, EVIDENCE_RE);
    requireCondition(!seen.has(item), 'RELEASE_SPEC_SCHEMA_INVALID', `${label} contains duplicate`);
    seen.add(item);
  }
}

function validateLiveGate(value) {
  exactKeys(value, new Set(['required', 'scenarioId', 'closeAuthority']), 'liveGate');
  requiredKeys(value, ['required', 'scenarioId', 'closeAuthority'], 'liveGate');
  requireCondition(typeof value.required === 'boolean', 'RELEASE_SPEC_SCHEMA_INVALID', 'liveGate.required must be boolean');
  boundedString(value.scenarioId, 'liveGate.scenarioId', 1, 96, TOKEN_RE);
  requireCondition(value.closeAuthority === 'HUMAN_EVIDENCE', 'RELEASE_SPEC_SCHEMA_INVALID', 'liveGate.closeAuthority invalid');
}

function validateNewVersion(value) {
  exactKeys(value, new Set(['expectedParentVersion']), 'newVersion');
  requiredKeys(value, ['expectedParentVersion'], 'newVersion');
  boundedString(value.expectedParentVersion, 'newVersion.expectedParentVersion', 5, 32, VERSION_RE);
}

function validateCorrection(value) {
  exactKeys(value, new Set(['reasonCode', 'evidenceRefs', 'priorLifecycleState', 'preserveReleaseName']), 'correction');
  requiredKeys(value, ['reasonCode', 'evidenceRefs', 'priorLifecycleState', 'preserveReleaseName'], 'correction');
  requireCondition(['PRE_LIVE_BLOCKER', 'DEPLOYMENT_CORRECTION'].includes(value.reasonCode), 'RELEASE_SPEC_SCHEMA_INVALID', 'correction.reasonCode invalid');
  validateEvidenceRefs(value.evidenceRefs, 'correction.evidenceRefs');
  requireCondition(['LIVE_PENDING', 'DEPLOYED_PRE_LIVE', 'ADMIN_RECOVERY_REQUIRED'].includes(value.priorLifecycleState), 'CORRECTION_LIFECYCLE_NOT_ALLOWED', 'correction lifecycle not allowed');
  requireCondition(value.preserveReleaseName === true, 'RELEASE_SPEC_SCHEMA_INVALID', 'correction.preserveReleaseName must be true');
}

function validateRollback(value) {
  exactKeys(value, new Set(['reasonCode', 'sourceReleaseCommit', 'sourceReleaseBlob', 'evidenceRefs', 'targetSafetyState']), 'rollback');
  requiredKeys(value, ['reasonCode', 'sourceReleaseCommit', 'sourceReleaseBlob', 'evidenceRefs', 'targetSafetyState'], 'rollback');
  requireCondition(['LIVE_BLOCKER', 'POST_PUBLISH_BLOCKER', 'EMERGENCY_CORRECTNESS_ROLLBACK'].includes(value.reasonCode), 'RELEASE_SPEC_SCHEMA_INVALID', 'rollback.reasonCode invalid');
  requireCondition(isGitSha(value.sourceReleaseCommit), 'RELEASE_SPEC_SCHEMA_INVALID', 'rollback.sourceReleaseCommit invalid');
  requireCondition(isGitSha(value.sourceReleaseBlob), 'RELEASE_SPEC_SCHEMA_INVALID', 'rollback.sourceReleaseBlob invalid');
  validateEvidenceRefs(value.evidenceRefs, 'rollback.evidenceRefs');
  requireCondition(value.targetSafetyState === 'LAST_KNOWN_SAFE', 'RELEASE_SPEC_SCHEMA_INVALID', 'rollback.targetSafetyState invalid');
}

export function validateReleaseSpec(spec) {
  const baseKeys = new Set([
    'schemaVersion', 'releaseId', 'product', 'version', 'releaseName', 'releaseMode',
    'candidateCommit', 'expectedProductionCommit', 'candidateReleaseBlob', 'primaryGoalId',
    'changeClass', 'evidenceRefs', 'liveGate', 'newVersion', 'correction', 'rollback',
  ]);
  exactKeys(spec, baseKeys, 'spec');
  requiredKeys(spec, [
    'schemaVersion', 'releaseId', 'product', 'version', 'releaseName', 'releaseMode',
    'candidateCommit', 'expectedProductionCommit', 'candidateReleaseBlob', 'primaryGoalId',
    'changeClass', 'evidenceRefs', 'liveGate',
  ], 'spec');

  requireCondition(spec.schemaVersion === 1, 'RELEASE_SPEC_SCHEMA_INVALID', 'schemaVersion must be 1');
  requireCondition(spec.product === 'SimCore', 'RELEASE_SPEC_SCHEMA_INVALID', 'product must be SimCore');
  boundedString(spec.version, 'version', 5, 32, VERSION_RE);
  boundedString(spec.releaseName, 'releaseName', 1, 160);
  boundedString(spec.releaseId, 'releaseId', 12, 96, RELEASE_ID_RE);
  requireCondition(RELEASE_MODES.includes(spec.releaseMode), 'RELEASE_SPEC_SCHEMA_INVALID', 'releaseMode invalid');
  requireCondition(CHANGE_CLASSES.includes(spec.changeClass), 'RELEASE_SPEC_SCHEMA_INVALID', 'changeClass invalid');
  requireCondition(isGitSha(spec.candidateCommit), 'RELEASE_SPEC_SCHEMA_INVALID', 'candidateCommit invalid');
  requireCondition(isGitSha(spec.expectedProductionCommit), 'RELEASE_SPEC_SCHEMA_INVALID', 'expectedProductionCommit invalid');
  requireCondition(isGitSha(spec.candidateReleaseBlob), 'RELEASE_SPEC_SCHEMA_INVALID', 'candidateReleaseBlob invalid');
  boundedString(spec.primaryGoalId, 'primaryGoalId', 1, 80, TOKEN_RE);
  validateEvidenceRefs(spec.evidenceRefs);
  validateLiveGate(spec.liveGate);

  const idMatch = RELEASE_ID_RE.exec(spec.releaseId);
  requireCondition(idMatch && idMatch[1] === spec.version, 'RELEASE_SPEC_ID_INVALID', 'releaseId version does not match spec.version');
  const expectedKind = {
    NEW_VERSION: 'new',
    SAME_VERSION_CORRECTION: 'correction',
    ROLLBACK: 'rollback',
    NOOP_IDENTICAL: 'noop',
  }[spec.releaseMode];
  requireCondition(idMatch[2] === expectedKind, 'RELEASE_SPEC_ID_INVALID', 'releaseId kind does not match releaseMode');

  if (spec.releaseMode === 'NEW_VERSION') {
    requireCondition(spec.newVersion !== undefined && spec.correction === undefined && spec.rollback === undefined, 'RELEASE_SPEC_SCHEMA_INVALID', 'NEW_VERSION mode object invalid');
    validateNewVersion(spec.newVersion);
  } else if (spec.releaseMode === 'SAME_VERSION_CORRECTION') {
    requireCondition(spec.correction !== undefined && spec.newVersion === undefined && spec.rollback === undefined, 'RELEASE_SPEC_SCHEMA_INVALID', 'SAME_VERSION_CORRECTION mode object invalid');
    validateCorrection(spec.correction);
  } else if (spec.releaseMode === 'ROLLBACK') {
    requireCondition(spec.rollback !== undefined && spec.newVersion === undefined && spec.correction === undefined, 'RELEASE_SPEC_SCHEMA_INVALID', 'ROLLBACK mode object invalid');
    validateRollback(spec.rollback);
  } else {
    requireCondition(spec.newVersion === undefined && spec.correction === undefined && spec.rollback === undefined, 'RELEASE_SPEC_SCHEMA_INVALID', 'NOOP_IDENTICAL has no mode object');
  }

  return spec;
}

export function releaseSpecDigest(spec) {
  validateReleaseSpec(spec);
  return sha256(Buffer.from(canonicalJson(spec), 'utf8'));
}

export function compareVersions(a, b) {
  requireCondition(VERSION_RE.test(String(a)), 'RELEASE_SPEC_VERSION_MISMATCH', `invalid version ${a}`);
  requireCondition(VERSION_RE.test(String(b)), 'RELEASE_SPEC_VERSION_MISMATCH', `invalid version ${b}`);
  const aa = a.split('.').map(Number);
  const bb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  }
  return 0;
}

export function parseSourceMetadata(text) {
  const source = String(text);
  const metadataMatches = [...source.matchAll(/^\/\/@version\s+([0-9]+\.[0-9]+\.[0-9]+)\s*$/gm)];
  requireCondition(metadataMatches.length === 1, 'RELEASE_SPEC_VERSION_MISMATCH', `expected one //@version, got ${metadataMatches.length}`);
  const runtimeMatches = [...source.matchAll(/^const SIMCORE_RUNTIME_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';\s*$/gm)];
  requireCondition(runtimeMatches.length === 1, 'RELEASE_SPEC_VERSION_MISMATCH', `expected one runtime version, got ${runtimeMatches.length}`);
  const version = metadataMatches[0][1];
  requireCondition(runtimeMatches[0][1] === version, 'RELEASE_SPEC_VERSION_MISMATCH', 'metadata/runtime version mismatch');
  const prefix = `// v${version} `;
  const headers = source.split(/\r?\n/).filter((line) => line.startsWith(prefix) && line.endsWith(':'));
  requireCondition(headers.length > 0, 'RELEASE_NAME_NOT_FOUND', `release header for ${version} not found`);
  requireCondition(headers.length === 1, 'RELEASE_NAME_AMBIGUOUS', `multiple release headers for ${version}`);
  const releaseName = headers[0].slice(prefix.length, -1);
  boundedString(releaseName, 'parsed releaseName', 1, 160);
  return { version, runtimeVersion: runtimeMatches[0][1], releaseName };
}

export function gitText(cwd, args, code = 'RELEASE_GIT_ERROR') {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) fail(code, String(result.stderr || result.stdout || `git ${args[0]} failed`).trim().slice(0, 2048));
  return String(result.stdout || '').trimEnd();
}

export function ensureCommit(cwd, sha, code = 'CANDIDATE_SOURCE_NOT_FOUND') {
  requireCondition(isGitSha(sha), code, `invalid commit ${sha}`);
  gitText(cwd, ['cat-file', '-e', `${sha}^{commit}`], code);
  return sha;
}

export function blobAt(cwd, commit, filePath, code = 'CANDIDATE_SOURCE_NOT_FOUND') {
  ensureCommit(cwd, commit, code);
  const blob = gitText(cwd, ['rev-parse', `${commit}:${filePath}`], code);
  requireCondition(isGitSha(blob), code, `${filePath} did not resolve to blob`);
  return blob;
}

export function textAt(cwd, commit, filePath, code = 'CANDIDATE_SOURCE_NOT_FOUND') {
  ensureCommit(cwd, commit, code);
  return gitText(cwd, ['show', `${commit}:${filePath}`], code);
}

export function parentCommits(cwd, commit) {
  ensureCommit(cwd, commit);
  const fields = gitText(cwd, ['rev-list', '--parents', '-n', '1', commit]).split(/\s+/).filter(Boolean);
  return fields.slice(1);
}

export function changedPaths(cwd, fromCommit, toCommit) {
  ensureCommit(cwd, fromCommit);
  ensureCommit(cwd, toCommit);
  const output = gitText(cwd, ['diff', '--name-only', fromCommit, toCommit]);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function validateCandidateCommitMessage(cwd, spec) {
  const raw = gitText(cwd, ['show', '-s', '--format=%B', spec.candidateCommit], 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH');
  const lines = raw.split(/\r?\n/);
  requireCondition(lines[0] === `SimCore v${spec.version} ${spec.releaseName}`, 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', 'candidate subject mismatch');
  const trailers = new Map();
  for (const line of lines.slice(1)) {
    const match = /^([A-Za-z][A-Za-z0-9-]*):\s*(.+)$/.exec(line);
    if (match) trailers.set(match[1], match[2]);
  }
  requireCondition(trailers.get('Release-Id') === spec.releaseId, 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', 'Release-Id trailer mismatch');
  requireCondition(trailers.get('Release-Mode') === spec.releaseMode, 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', 'Release-Mode trailer mismatch');
}

export function validateCandidateAgainstSpec(cwd, spec) {
  validateReleaseSpec(spec);
  const C = spec.candidateCommit;
  const P = spec.expectedProductionCommit;
  ensureCommit(cwd, C);
  ensureCommit(cwd, P, 'PRODUCTION_PARENT_NOT_FOUND');

  const latestBlob = blobAt(cwd, C, ALLOWED_PRODUCTION_PATHS[0]);
  const installBlob = blobAt(cwd, C, ALLOWED_PRODUCTION_PATHS[1]);
  requireCondition(latestBlob === installBlob, 'CANDIDATE_BLOB_BINDING_MISMATCH', 'candidate latest/install blobs differ');
  requireCondition(latestBlob === spec.candidateReleaseBlob, 'CANDIDATE_BLOB_BINDING_MISMATCH', 'candidate blob does not match spec');

  const parentLatestBlob = blobAt(cwd, P, ALLOWED_PRODUCTION_PATHS[0], 'PRODUCTION_PARENT_NOT_FOUND');
  const parentInstallBlob = blobAt(cwd, P, ALLOWED_PRODUCTION_PATHS[1], 'PRODUCTION_PARENT_NOT_FOUND');
  requireCondition(parentLatestBlob === parentInstallBlob, 'PRODUCTION_PARENT_BLOB_MISMATCH', 'production parent latest/install differ');

  const candidateMeta = parseSourceMetadata(textAt(cwd, C, ALLOWED_PRODUCTION_PATHS[0]));
  const parentMeta = parseSourceMetadata(textAt(cwd, P, ALLOWED_PRODUCTION_PATHS[0], 'PRODUCTION_PARENT_NOT_FOUND'));
  requireCondition(candidateMeta.version === spec.version, 'RELEASE_SPEC_VERSION_MISMATCH', 'candidate version does not match spec');
  requireCondition(candidateMeta.releaseName === spec.releaseName, 'RELEASE_SPEC_NAME_MISMATCH', 'candidate release name does not match spec');

  let paths = [];
  if (spec.releaseMode === 'NOOP_IDENTICAL') {
    requireCondition(C === P, 'CANDIDATE_DIRECT_CHILD_REQUIRED', 'NOOP_IDENTICAL must bind current production commit directly');
    requireCondition(latestBlob === parentLatestBlob, 'CANDIDATE_BLOB_BINDING_MISMATCH', 'NOOP_IDENTICAL candidate differs from production');
  } else {
    const parents = parentCommits(cwd, C);
    requireCondition(parents.length === 1 && parents[0] === P, 'CANDIDATE_DIRECT_CHILD_REQUIRED', 'candidate must have exactly expected production parent');
    paths = changedPaths(cwd, P, C);
    requireCondition(paths.length > 0, 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', 'non-NOOP candidate has no change');
    for (const changed of paths) {
      requireCondition(ALLOWED_PRODUCTION_PATHS.includes(changed), 'CANDIDATE_MATERIALIZATION_PATH_DENIED', `candidate path denied: ${changed}`);
    }
    validateCandidateCommitMessage(cwd, spec);
  }

  const relation = compareVersions(candidateMeta.version, parentMeta.version);
  if (spec.releaseMode === 'NEW_VERSION') {
    requireCondition(relation > 0, 'RELEASE_SPEC_VERSION_MISMATCH', 'NEW_VERSION candidate must be newer');
    requireCondition(latestBlob !== parentLatestBlob, 'RELEASE_SPEC_VERSION_MISMATCH', 'NEW_VERSION candidate bytes must differ');
    requireCondition(spec.newVersion.expectedParentVersion === parentMeta.version, 'EXPECTED_PARENT_VERSION_MISMATCH', 'expected parent version mismatch');
  } else if (spec.releaseMode === 'SAME_VERSION_CORRECTION') {
    requireCondition(relation === 0, 'UNDECLARED_SAME_VERSION_DIVERGENCE', 'correction version must equal production');
    requireCondition(latestBlob !== parentLatestBlob, 'UNDECLARED_SAME_VERSION_DIVERGENCE', 'correction bytes must differ');
    if (spec.correction.preserveReleaseName) {
      requireCondition(candidateMeta.releaseName === parentMeta.releaseName, 'RELEASE_SPEC_NAME_MISMATCH', 'correction must preserve release name');
    }
  } else if (spec.releaseMode === 'ROLLBACK') {
    requireCondition(relation <= 0, 'UNDECLARED_DOWNGRADE', 'rollback candidate must not be newer than production');
    ensureCommit(cwd, spec.rollback.sourceReleaseCommit, 'ROLLBACK_SOURCE_NOT_APPROVED');
    const rollbackLatest = blobAt(cwd, spec.rollback.sourceReleaseCommit, ALLOWED_PRODUCTION_PATHS[0], 'ROLLBACK_SOURCE_NOT_APPROVED');
    const rollbackInstall = blobAt(cwd, spec.rollback.sourceReleaseCommit, ALLOWED_PRODUCTION_PATHS[1], 'ROLLBACK_SOURCE_NOT_APPROVED');
    requireCondition(rollbackLatest === rollbackInstall && rollbackLatest === spec.rollback.sourceReleaseBlob, 'ROLLBACK_SOURCE_BLOB_MISMATCH', 'rollback source blob mismatch');
    requireCondition(spec.rollback.sourceReleaseBlob === latestBlob, 'ROLLBACK_SOURCE_BLOB_MISMATCH', 'candidate does not contain approved rollback blob');
  } else {
    requireCondition(relation === 0, 'RELEASE_SPEC_VERSION_MISMATCH', 'NOOP version must equal production');
  }

  if (spec.liveGate.required === false) {
    requireCondition(spec.releaseMode === 'NOOP_IDENTICAL' && latestBlob === parentLatestBlob, 'RELEASE_SPEC_SCHEMA_INVALID', 'live gate may be disabled only for identical no-op qualification');
  }

  return {
    candidateCommit: C,
    expectedProductionCommit: P,
    candidateReleaseBlob: latestBlob,
    candidateLatestBlob: latestBlob,
    candidateInstallBlob: installBlob,
    candidateVersion: candidateMeta.version,
    parentVersion: parentMeta.version,
    releaseName: candidateMeta.releaseName,
    changedPaths: paths,
  };
}

function authorizationDiff(cwd, authorizationCommit) {
  ensureCommit(cwd, authorizationCommit, 'RELEASE_AUTHORIZATION_NOT_FOUND');
  const parents = parentCommits(cwd, authorizationCommit);
  requireCondition(parents.length >= 1, 'RELEASE_AUTHORIZATION_SCOPE_MIXED', 'authorization commit has no parent');
  const firstParent = parents[0];
  const output = gitText(cwd, ['diff', '--name-status', firstParent, authorizationCommit], 'RELEASE_AUTHORIZATION_SCOPE_MIXED');
  const rows = output ? output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [status, ...rest] = line.split('\t');
    return { status, path: rest.at(-1) || '' };
  }) : [];
  return { firstParent, rows };
}

export function validateAuthorizationEvent(cwd, authorizationCommit, releaseSpecPath, expectedReleaseId = '') {
  requireCondition(/^products\/simcore\/releases\/specs\/[A-Za-z0-9_.-]+\.json$/.test(releaseSpecPath), 'RELEASE_SPEC_ID_INVALID', 'release spec path invalid');
  const { firstParent, rows } = authorizationDiff(cwd, authorizationCommit);
  requireCondition(rows.length === 1, 'RELEASE_AUTHORIZATION_SCOPE_MIXED', `authorization must change exactly one path, got ${rows.length}`);
  requireCondition(rows[0].status === 'A' && rows[0].path === releaseSpecPath, 'RELEASE_SPEC_HISTORY_MUTATION', 'authorization must add exactly the selected release spec');

  let spec;
  try {
    spec = JSON.parse(textAt(cwd, authorizationCommit, releaseSpecPath, 'RELEASE_SPEC_SCHEMA_INVALID'));
  } catch (error) {
    if (error instanceof ReleaseError) throw error;
    fail('RELEASE_SPEC_SCHEMA_INVALID', `invalid release spec JSON: ${error?.message || error}`);
  }
  validateReleaseSpec(spec);
  const stem = releaseSpecPath.split('/').at(-1).replace(/\.json$/, '');
  requireCondition(stem === spec.releaseId, 'RELEASE_SPEC_ID_INVALID', 'release spec filename does not match releaseId');
  if (expectedReleaseId) requireCondition(spec.releaseId === expectedReleaseId, 'RELEASE_SPEC_ID_INVALID', 'expected release ID mismatch');

  const specDigest = releaseSpecDigest(spec);
  const candidate = validateCandidateAgainstSpec(cwd, spec);
  return {
    schemaVersion: 1,
    authorizationCommit,
    authorizationParent: firstParent,
    releaseSpecPath,
    releaseSpecSha256: specDigest,
    releaseId: spec.releaseId,
    releaseMode: spec.releaseMode,
    spec,
    ...candidate,
  };
}
