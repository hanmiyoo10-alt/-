#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const taskLease = require('../../coordination/task-lease.cjs');
const handoff = require('../../coordination/task-handoff.cjs');
const packetProjection = require('../../../../.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs');

const SCHEMA = 'mcl-l-landing-residue-cleanup.v1';
const FIXED_REPO = 'hanmiyoo10-alt/-';
const FIXED_LANDING = '/home/alsl0/nyang-repo';
const FIXED_BRANCH = 'main';
const FIXED_PATH = 'tools/repo-write/__pycache__/currentness_replay.cpython-312.pyc';
const FIXED_PATH_SCOPE = 'path:' + FIXED_PATH;
const FIXED_SURFACE = 'surface:mcl:l-landing-residue-cleanup-currentness-replay-pyc';
const FIXED_SCOPES = Object.freeze([FIXED_PATH_SCOPE, FIXED_SURFACE].sort());
const RESIDUE_REF_PREFIX = 'receipt:mcl-l-landing-residue-sha256:';
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const MAX_EVIDENCE_BYTES = 128 * 1024;
const CANONICAL_ORIGINS = Object.freeze([
  'https://github.com/hanmiyoo10-alt/-.git',
  'https://github.com/hanmiyoo10-alt/-',
  'git@github.com:hanmiyoo10-alt/-.git',
  'ssh://git@github.com/hanmiyoo10-alt/-.git',
]);
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});
const DEFAULT_PROFILE = Object.freeze({landing: FIXED_LANDING, allowedOrigins: CANONICAL_ORIGINS});

class CleanupError extends Error {
  constructor(kind, reasonCodes, stateChanged = false) {
    super((reasonCodes || [kind])[0]);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes || [kind])].sort();
    this.stateChanged = Boolean(stateChanged);
  }
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function output(operation, status, reasonCodes = [], extra = {}) {
  return {
    schema: SCHEMA,
    operation,
    status,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    stateChanged: Boolean(extra.stateChanged),
    cleanupPath: FIXED_PATH,
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
    ...extra,
  };
}
function readRegular(file, label) {
  let stat;
  try { stat = fs.lstatSync(file); }
  catch { throw new CleanupError('UNKNOWN', [label + '_READ_FAILED']); }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_EVIDENCE_BYTES) {
    throw new CleanupError('UNKNOWN', [label + '_INVALID']);
  }
  return fs.readFileSync(file, 'utf8');
}
function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: 'utf8',
    shell: false,
    env: options.env || process.env,
    maxBuffer: 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error || null,
    signal: result.signal || null,
  };
}
function checked(command, args, reason) {
  const result = run(command, args);
  if (result.error || result.signal || result.code !== 0) {
    throw new CleanupError('UNKNOWN', [reason]);
  }
  return result.stdout;
}
function git(profile, args, reason = 'GIT_READ_FAILED') {
  return checked('git', ['-C', profile.landing, ...args], reason);
}
function configPresent(profile, key) {
  const result = run('git', ['-C', profile.landing, 'config', '--get', key]);
  if (result.error || result.signal || ![0, 1].includes(result.code)) {
    throw new CleanupError('UNKNOWN', ['GIT_CONFIG_READ_FAILED']);
  }
  return result.code === 0;
}
function resolveGitPath(profile, name) {
  const raw = git(profile, ['rev-parse', '--git-path', name], 'GIT_PATH_READ_FAILED').trim();
  if (!raw) throw new CleanupError('UNKNOWN', ['GIT_PATH_INVALID']);
  return path.isAbsolute(raw) ? raw : path.resolve(profile.landing, raw);
}
function fileSnapshot(file) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) return {present:true, invalid:true, sha256:null};
    return {present:true, invalid:false, sha256:sha256(fs.readFileSync(file))};
  } catch (error) {
    if (error.code === 'ENOENT') return {present:false, invalid:false, sha256:null};
    throw new CleanupError('UNKNOWN', ['SNAPSHOT_FILE_READ_FAILED']);
  }
}
function repositorySnapshot(profile) {
  return {
    head: git(profile, ['rev-parse', 'HEAD'], 'HEAD_READ_FAILED').trim(),
    branch: git(profile, ['branch', '--show-current'], 'BRANCH_READ_FAILED').trim(),
    index: fileSnapshot(resolveGitPath(profile, 'index')),
    refsSha256: sha256(git(profile, ['for-each-ref', '--format=%(refname)%00%(objectname)'], 'REFS_READ_FAILED')),
    fetchHead: fileSnapshot(resolveGitPath(profile, 'FETCH_HEAD')),
  };
}
function exactResidueRef(manifest) {
  const rows = manifest.inputRefs.filter((ref) => ref.startsWith(RESIDUE_REF_PREFIX));
  if (rows.length !== 1) throw new CleanupError('BLOCKED', ['RESIDUE_SHA_REF_REQUIRED']);
  const digest = rows[0].slice(RESIDUE_REF_PREFIX.length);
  if (!SHA256_RE.test(digest)) throw new CleanupError('BLOCKED', ['RESIDUE_SHA_REF_INVALID']);
  return digest;
}
function validateEvidence({manifestText, ledgerText, packetText}) {
  const parsedManifest = handoff.parseManifest(manifestText);
  if (parsedManifest.status !== 'VALID') {
    throw new CleanupError(parsedManifest.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      ['MANIFEST_INVALID', ...(parsedManifest.reasonCodes || [])]);
  }
  const manifest = parsedManifest.value;
  const projection = packetProjection.classifyPacketProjection(packetText);
  if (projection.disposition !== 'PASS') {
    throw new CleanupError(projection.disposition === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      ['PACKET_PROJECTION_INVALID', ...(projection.reasonCodes || [])]);
  }
  if (['DONE', 'CANCELLED', 'SUPERSEDED'].includes(projection.lifecycle)) {
    throw new CleanupError('BLOCKED', ['PACKET_TERMINAL']);
  }
  if (projection.interactionStage !== 'EXPERIMENT_CLOSE') {
    throw new CleanupError('BLOCKED', ['PACKET_STAGE_NOT_EXPERIMENT_CLOSE']);
  }
  const ledger = taskLease.parseLedger(ledgerText);
  if (!ledger.ok || ledger.state.status !== 'ACTIVE') {
    throw new CleanupError('UNKNOWN', ['LEDGER_INVALID', ...(ledger.reasonCodes || [])]);
  }
  if (manifest.route !== 'L' || manifest.executor !== 'L' || manifest.phaseClass !== 'REPOSITORY_MUTATION'
      || manifest.workspace.kind !== 'landing_residue_cleanup'
      || manifest.workspace.branch !== FIXED_BRANCH || manifest.workspace.worktree !== FIXED_LANDING
      || !SHA40_RE.test(manifest.observedBaseSha || '')
      || !same([...manifest.scopes].sort(), FIXED_SCOPES)
      || manifest.leaseRequirement !== 'REQUIRED'
      || !same(manifest.expectedOutputRefs, [FIXED_PATH_SCOPE])) {
    throw new CleanupError('CONFLICT', ['MANIFEST_BINDING_CONFLICT']);
  }
  if (taskLease.digest(packetText) !== manifest.packetBodySha256) {
    throw new CleanupError('CONFLICT', ['PACKET_BODY_SHA_CONFLICT']);
  }
  const active = ledger.state.activeLeases.filter(
    (row) => row.leaseId === manifest.leaseEvidence?.leaseId);
  if (active.length !== 1) throw new CleanupError('BLOCKED', ['ACTIVE_LEASE_NOT_EXACT']);
  const lease = active[0];
  if (lease.packetRef !== manifest.packetRef
      || lease.packetBodySha256 !== manifest.packetBodySha256
      || lease.route !== manifest.route || lease.executor !== manifest.executor
      || !same(lease.scopes, manifest.scopes)
      || !same(lease.workspace, manifest.workspace)
      || lease.observedBaseSha !== manifest.observedBaseSha) {
    throw new CleanupError('CONFLICT', ['LEASE_MANIFEST_CONFLICT']);
  }
  return {manifest, lease, projection, expectedSha256: exactResidueRef(manifest)};
}
function inspectPhysical(evidence, {profile = DEFAULT_PROFILE} = {}) {
  let real;
  try { real = fs.realpathSync(profile.landing); }
  catch { throw new CleanupError('BLOCKED', ['LANDING_MISSING']); }
  if (real !== profile.landing) throw new CleanupError('BLOCKED', ['LANDING_ALIAS_DENIED']);
  const top = git(profile, ['rev-parse', '--show-toplevel'], 'TOPLEVEL_READ_FAILED').trim();
  if (top !== profile.landing) throw new CleanupError('CONFLICT', ['LANDING_TOPLEVEL_CONFLICT']);
  const branch = git(profile, ['branch', '--show-current'], 'BRANCH_READ_FAILED').trim();
  const head = git(profile, ['rev-parse', 'HEAD'], 'HEAD_READ_FAILED').trim();
  if (branch !== FIXED_BRANCH) throw new CleanupError('BLOCKED', ['LANDING_BRANCH_INVALID']);
  if (head !== evidence.manifest.observedBaseSha) throw new CleanupError('CONFLICT', ['LANDING_HEAD_CONFLICT']);
  const configured = git(profile, ['config', '--get', 'remote.origin.url'], 'ORIGIN_READ_FAILED').trim();
  const effective = git(profile, ['remote', 'get-url', 'origin'], 'ORIGIN_READ_FAILED').trim();
  const allowed = new Set(profile.allowedOrigins || CANONICAL_ORIGINS);
  if (!allowed.has(configured) || !allowed.has(effective)) {
    throw new CleanupError('BLOCKED', ['ORIGIN_IDENTITY_INVALID']);
  }
  if (configPresent(profile, 'remote.origin.uploadpack') || configPresent(profile, 'remote.origin.proxy')) {
    throw new CleanupError('BLOCKED', ['ORIGIN_OVERRIDE_DENIED']);
  }
  const status = git(profile, ['status', '--porcelain=v1', '-uall'], 'STATUS_READ_FAILED');
  if (status !== `?? ${FIXED_PATH}\n`) {
    throw new CleanupError('BLOCKED', ['WORKTREE_STATUS_NOT_EXACT_RESIDUE']);
  }
  if (git(profile, ['diff', '--binary', '--'], 'TRACKED_DIFF_READ_FAILED') !== '') {
    throw new CleanupError('BLOCKED', ['TRACKED_DIFF_PRESENT']);
  }
  if (git(profile, ['diff', '--cached', '--binary', '--'], 'STAGED_DIFF_READ_FAILED') !== '') {
    throw new CleanupError('BLOCKED', ['STAGED_DIFF_PRESENT']);
  }
  const target = path.join(profile.landing, FIXED_PATH);
  const parent = path.dirname(target);
  let stat;
  try { stat = fs.lstatSync(target); }
  catch { throw new CleanupError('BLOCKED', ['RESIDUE_MISSING']); }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new CleanupError('BLOCKED', ['RESIDUE_TYPE_INVALID']);
  if ((stat.mode & 0o777) !== 0o644) throw new CleanupError('BLOCKED', ['RESIDUE_MODE_INVALID']);
  if (sha256(fs.readFileSync(target)) !== evidence.expectedSha256) {
    throw new CleanupError('CONFLICT', ['RESIDUE_HASH_MISMATCH']);
  }
  const tracked = run('git', ['-C', profile.landing, 'ls-files', '--error-unmatch', '--', FIXED_PATH]);
  if (tracked.error || tracked.signal || ![0, 1].includes(tracked.code)) {
    throw new CleanupError('UNKNOWN', ['TRACKED_IDENTITY_READ_FAILED']);
  }
  if (tracked.code === 0) throw new CleanupError('CONFLICT', ['RESIDUE_TRACKED']);
  const headEntry = run('git', ['-C', profile.landing, 'cat-file', '-e', 'HEAD:' + FIXED_PATH]);
  if (headEntry.error || headEntry.signal) throw new CleanupError('UNKNOWN', ['HEAD_ENTRY_READ_FAILED']);
  if (headEntry.code === 0) throw new CleanupError('CONFLICT', ['RESIDUE_PRESENT_IN_HEAD']);
  let parentStat;
  try { parentStat = fs.lstatSync(parent); }
  catch { throw new CleanupError('BLOCKED', ['PARENT_DIR_MISSING']); }
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new CleanupError('BLOCKED', ['PARENT_DIR_INVALID']);
  }
  const entries = fs.readdirSync(parent).sort();
  if (!same(entries, [path.basename(target)])) throw new CleanupError('BLOCKED', ['PARENT_DIR_NOT_EXACT']);
  return {target, parent, before: repositorySnapshot(profile)};
}
function inspectEvidence(input, options = {}) {
  const evidence = validateEvidence(input);
  const physical = inspectPhysical(evidence, options);
  return output('inspect', 'ELIGIBLE', [], {
    packetRef: evidence.manifest.packetRef,
    leaseId: evidence.lease.leaseId,
    observedBaseSha: evidence.manifest.observedBaseSha,
    expectedResidueSha256: evidence.expectedSha256,
    snapshot: physical.before,
    nextLegalAction: 'APPLY_EXACT_RESIDUE_CLEANUP',
  });
}
function postcheck(before, {profile = DEFAULT_PROFILE} = {}) {
  if (fs.existsSync(path.join(profile.landing, FIXED_PATH))) {
    throw new CleanupError('CONFLICT', ['RESIDUE_STILL_PRESENT'], true);
  }
  if (fs.existsSync(path.dirname(path.join(profile.landing, FIXED_PATH)))) {
    throw new CleanupError('CONFLICT', ['PARENT_DIR_STILL_PRESENT'], true);
  }
  if (git(profile, ['status', '--porcelain=v1', '-uall'], 'POST_STATUS_READ_FAILED') !== '') {
    throw new CleanupError('CONFLICT', ['POST_WORKTREE_NOT_CLEAN'], true);
  }
  if (git(profile, ['diff', '--binary', '--'], 'POST_TRACKED_DIFF_READ_FAILED') !== ''
      || git(profile, ['diff', '--cached', '--binary', '--'], 'POST_STAGED_DIFF_READ_FAILED') !== '') {
    throw new CleanupError('CONFLICT', ['POST_DIFF_PRESENT'], true);
  }
  const after = repositorySnapshot(profile);
  if (!same(before, after)) throw new CleanupError('CONFLICT', ['REPOSITORY_IDENTITY_CHANGED'], true);
  return after;
}
function applyEvidence(input, options = {}) {
  const evidence = validateEvidence(input);
  const physical = inspectPhysical(evidence, options);
  let changed = false;
  try {
    fs.unlinkSync(physical.target);
    changed = true;
    if (fs.readdirSync(physical.parent).length !== 0) {
      throw new CleanupError('CONFLICT', ['PARENT_DIR_CHANGED_AFTER_UNLINK'], true);
    }
    fs.rmdirSync(physical.parent);
    const after = postcheck(physical.before, options);
    return output('apply', 'PASS', [], {
      stateChanged: true,
      packetRef: evidence.manifest.packetRef,
      leaseId: evidence.lease.leaseId,
      observedBaseSha: evidence.manifest.observedBaseSha,
      expectedResidueSha256: evidence.expectedSha256,
      snapshotPreserved: same(physical.before, after),
      nextLegalAction: 'RELEASE_D013_THEN_D014_COMPLETE',
    });
  } catch (error) {
    if (error instanceof CleanupError) throw error;
    throw new CleanupError('BLOCKED',
      [changed ? 'CLEANUP_POST_EFFECT_FAILED' : 'CLEANUP_EFFECT_FAILED'], changed);
  }
}
function parseArgs(argv) {
  const operation = argv[0];
  if (!['inspect', 'apply'].includes(operation)) throw new CleanupError('UNKNOWN', ['OPERATION_UNSUPPORTED']);
  const values = {};
  let apply = false;
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--apply') {
      if (apply) throw new CleanupError('UNKNOWN', ['ARGUMENT_DUPLICATE:apply']);
      apply = true;
      continue;
    }
    if (!token.startsWith('--') || i + 1 >= argv.length) throw new CleanupError('UNKNOWN', ['ARGUMENT_INVALID']);
    const key = token.slice(2);
    if (!['manifest', 'ledger', 'packet'].includes(key) || key in values) {
      throw new CleanupError('UNKNOWN', ['ARGUMENT_UNSUPPORTED']);
    }
    values[key] = argv[++i];
  }
  for (const key of ['manifest', 'ledger', 'packet']) {
    if (!values[key]) throw new CleanupError('UNKNOWN', ['ARGUMENT_REQUIRED:' + key]);
  }
  if (operation === 'inspect' && apply) throw new CleanupError('UNKNOWN', ['APPLY_FLAG_FORBIDDEN']);
  if (operation === 'apply' && !apply) throw new CleanupError('BLOCKED', ['APPLY_FLAG_REQUIRED']);
  return {operation, values};
}
function runCli(argv = process.argv.slice(2), options = {}) {
  const {operation, values} = parseArgs(argv);
  const input = {
    manifestText: readRegular(values.manifest, 'MANIFEST_FILE'),
    ledgerText: readRegular(values.ledger, 'LEDGER_FILE'),
    packetText: readRegular(values.packet, 'PACKET_FILE'),
  };
  try {
    const result = operation === 'inspect'
      ? inspectEvidence(input, options)
      : applyEvidence(input, options);
    return {code: 0, text: JSON.stringify(result) + '\n'};
  } catch (error) {
    const kind = error instanceof CleanupError ? error.kind : 'UNKNOWN';
    const reasons = error instanceof CleanupError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
    const stateChanged = error instanceof CleanupError ? error.stateChanged : false;
    return {
      code: kind === 'UNKNOWN' ? 3 : 2,
      text: JSON.stringify(output(operation, kind, reasons, {stateChanged})) + '\n',
    };
  }
}
if (require.main === module) {
  try {
    const {code, text} = runCli();
    process.stdout.write(text);
    process.exitCode = code;
  } catch (error) {
    const kind = error instanceof CleanupError ? error.kind : 'UNKNOWN';
    const reasons = error instanceof CleanupError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
    process.stdout.write(JSON.stringify(output(process.argv[2] || 'unknown', kind, reasons)) + '\n');
    process.exitCode = kind === 'UNKNOWN' ? 3 : 2;
  }
}
module.exports = {
  CANONICAL_ORIGINS,
  CleanupError,
  DEFAULT_PROFILE,
  FALSE_AUTHORITY,
  FIXED_BRANCH,
  FIXED_LANDING,
  FIXED_PATH,
  FIXED_PATH_SCOPE,
  FIXED_REPO,
  FIXED_SCOPES,
  FIXED_SURFACE,
  RESIDUE_REF_PREFIX,
  SCHEMA,
  applyEvidence,
  inspectEvidence,
  inspectPhysical,
  output,
  parseArgs,
  postcheck,
  repositorySnapshot,
  runCli,
  sha256,
  validateEvidence,
};
