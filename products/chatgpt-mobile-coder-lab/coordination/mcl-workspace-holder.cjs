'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const lease = require('./task-lease.cjs');
const handoff = require('./task-handoff.cjs');

const HOLDER_FILE = 'mcl-workspace-holder.v1.json';
const CLAIM_ENV = 'MCL_WORKSPACE_HOLDER_CLAIM';
const AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function output(status, reasonCodes = [], extras = {}) {
  return {schemaVersion: 1, mode: 'MCL_WORKSPACE_HOLDER', status,
    reasonCodes: [...new Set(reasonCodes)].sort(), ...extras, authority: {...AUTHORITY}};
}
function claimDigest(secret) {
  return crypto.createHash('sha256').update(`MCL_WORKSPACE_HOLDER_CLAIM_V1:${secret}`).digest('hex');
}
function readText(file) { return fs.readFileSync(file, 'utf8'); }
function readManifest(file) {
  const text = readText(file);
  try {
    const parsed = JSON.parse(text);
    const verified = handoff.verifyManifestObject(parsed);
    if (!verified.ok) return {ok: false, reasonCodes: verified.errors, value: null};
    return {ok: true, reasonCodes: [], value: verified.value};
  } catch (_) {
    const parsed = handoff.parseManifest(text);
    if (parsed.status !== 'VALID') return {ok: false, reasonCodes: parsed.reasonCodes, value: null};
    return {ok: true, reasonCodes: [], value: parsed.value};
  }
}
function strippedGitEnv() {
  const env = {...process.env};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']) delete env[key];
  return env;
}
function runGit(worktree, args) {
  const result = childProcess.spawnSync('git', ['-C', worktree, ...args], {
    encoding: 'utf8', shell: false, env: strippedGitEnv(),
  });
  if (result.status !== 0) throw new Error('GIT_READ_FAILED');
  return (result.stdout || '').trim();
}
function absoluteGitPath(worktree, value) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(worktree, value);
}
function validateEvidence({manifest, ledgerBody, packetBody, requireActiveLease = true}) {
  const reasons = [];
  if (manifest.leaseRequirement !== 'REQUIRED') reasons.push('MANIFEST_LEASE_REQUIRED');
  if (manifest.workspace?.kind !== 'repository') reasons.push('MANIFEST_REPOSITORY_WORKSPACE_REQUIRED');
  reasons.push(...lease.validateWorkspace(manifest.workspace, manifest.executor));
  if (lease.digest(packetBody) !== manifest.packetBodySha256) reasons.push('PACKET_BODY_HASH_DRIFT');
  const parsed = lease.parseLedger(ledgerBody);
  if (!parsed.ok) return {ok: false, reasonCodes: ['LEDGER_INVALID', ...parsed.reasonCodes], state: null, activeLease: null};
  if (parsed.state.status !== 'ACTIVE') reasons.push('LEDGER_NOT_ACTIVE');
  const matches = parsed.state.activeLeases.filter((item) => item.leaseId === manifest.leaseEvidence?.leaseId);
  if (requireActiveLease && matches.length !== 1) reasons.push('LEASE_NOT_ACTIVE');
  if (!requireActiveLease && matches.length !== 0) reasons.push('LEASE_STILL_ACTIVE');
  const activeLease = matches[0] || null;
  if (activeLease) {
    if (activeLease.packetRef !== manifest.packetRef) reasons.push('LEASE_PACKET_CONFLICT');
    if (activeLease.packetBodySha256 !== manifest.packetBodySha256) reasons.push('LEASE_PACKET_HASH_CONFLICT');
    if (activeLease.route !== manifest.route || activeLease.executor !== manifest.executor) reasons.push('LEASE_ROUTE_CONFLICT');
    if (JSON.stringify(activeLease.scopes) !== JSON.stringify(manifest.scopes)) reasons.push('LEASE_SCOPE_CONFLICT');
    if (JSON.stringify(activeLease.workspace) !== JSON.stringify(manifest.workspace)) reasons.push('LEASE_WORKSPACE_CONFLICT');
    if (activeLease.observedBaseSha !== manifest.observedBaseSha) reasons.push('LEASE_BASE_CONFLICT');
  }
  return {ok: reasons.length === 0, reasonCodes: [...new Set(reasons)].sort(), state: parsed.state, activeLease};
}
function inspectWorkspace(manifest) {
  const worktree = manifest.workspace.worktree;
  const reasons = [];
  if (!path.isAbsolute(worktree) || path.normalize(worktree) !== worktree) reasons.push('WORKTREE_PATH_INVALID');
  if (!fs.existsSync(worktree)) reasons.push('WORKTREE_MISSING');
  if (reasons.length) return {ok: false, reasonCodes: reasons, holderPath: null};
  let realWorktree;
  try { realWorktree = fs.realpathSync(worktree); } catch (_) { return {ok: false, reasonCodes: ['WORKTREE_REALPATH_FAILED'], holderPath: null}; }
  if (realWorktree !== worktree) reasons.push('WORKTREE_SYMLINK_OR_ALIAS');
  let top, branch, gitDirRaw, commonRaw;
  try {
    top = runGit(worktree, ['rev-parse', '--show-toplevel']);
    branch = runGit(worktree, ['branch', '--show-current']);
    gitDirRaw = runGit(worktree, ['rev-parse', '--absolute-git-dir']);
    commonRaw = runGit(worktree, ['rev-parse', '--git-common-dir']);
  } catch (_) { return {ok: false, reasonCodes: ['WORKTREE_GIT_READ_FAILED'], holderPath: null}; }
  if (top !== worktree) reasons.push('WORKTREE_TOPLEVEL_CONFLICT');
  if (branch !== manifest.workspace.branch) reasons.push('WORKTREE_BRANCH_CONFLICT');
  const gitDir = fs.realpathSync(absoluteGitPath(worktree, gitDirRaw));
  const commonDir = fs.realpathSync(absoluteGitPath(worktree, commonRaw));
  const rel = path.relative(commonDir, gitDir);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !rel.split(path.sep).includes('worktrees')) {
    reasons.push('WORKTREE_GIT_ADMIN_NOT_LINKED');
  }
  return {ok: reasons.length === 0, reasonCodes: reasons, holderPath: path.join(gitDir, HOLDER_FILE)};
}
function readHolder(holderPath) {
  let stat;
  try { stat = fs.lstatSync(holderPath); } catch (error) {
    return error.code === 'ENOENT'
      ? {ok: false, missing: true, reasonCodes: ['HOLDER_MISSING'], value: null}
      : {ok: false, missing: false, reasonCodes: ['HOLDER_READ_FAILED'], value: null};
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return {ok: false, missing: false, reasonCodes: ['HOLDER_NOT_REGULAR_FILE'], value: null};
  let value;
  try { value = JSON.parse(fs.readFileSync(holderPath, 'utf8')); } catch (_) {
    return {ok: false, missing: false, reasonCodes: ['HOLDER_MALFORMED'], value: null};
  }
  const keys = Object.keys(value).sort().join(',');
  const expected = ['claimDigest', 'leaseId', 'manifestId', 'mode', 'schemaVersion'].sort().join(',');
  const reasons = [];
  if (keys !== expected || value.schemaVersion !== 1 || value.mode !== 'MCL_WORKSPACE_HOLDER') reasons.push('HOLDER_SCHEMA_INVALID');
  if (!/^[0-9a-f]{64}$/.test(value.manifestId || '')) reasons.push('HOLDER_MANIFEST_ID_INVALID');
  if (!/^[0-9a-f]{64}$/.test(value.leaseId || '')) reasons.push('HOLDER_LEASE_ID_INVALID');
  if (!/^[0-9a-f]{64}$/.test(value.claimDigest || '')) reasons.push('HOLDER_CLAIM_DIGEST_INVALID');
  return {ok: reasons.length === 0, missing: false, reasonCodes: reasons, value};
}
function holderMatches(holder, manifest, secret) {
  const reasons = [];
  if (holder.manifestId !== manifest.manifestId) reasons.push('HOLDER_MANIFEST_CONFLICT');
  if (holder.leaseId !== manifest.leaseEvidence.leaseId) reasons.push('HOLDER_LEASE_CONFLICT');
  if (!/^[0-9a-f]{64}$/.test(secret || '') || holder.claimDigest !== claimDigest(secret || '')) reasons.push('HOLDER_CLAIM_INVALID');
  return reasons;
}
function loadCurrent(input, requireActiveLease = true) {
  const manifestRead = readManifest(input.manifestPath);
  if (!manifestRead.ok) return {result: output('BLOCKED', manifestRead.reasonCodes), manifest: null, workspace: null};
  const manifest = manifestRead.value;
  const evidence = validateEvidence({manifest, ledgerBody: readText(input.ledgerPath), packetBody: readText(input.packetPath), requireActiveLease});
  if (!evidence.ok) return {result: output('BLOCKED', evidence.reasonCodes), manifest, workspace: null};
  const workspace = inspectWorkspace(manifest);
  if (!workspace.ok) return {result: output('BLOCKED', workspace.reasonCodes), manifest, workspace};
  return {result: null, manifest, workspace};
}
function claimHolder(input) {
  const current = loadCurrent(input, true);
  if (current.result) return {result: current.result, secret: null};
  const holderPath = current.workspace.holderPath;
  if (fs.existsSync(holderPath)) return {result: output('BLOCKED', ['HOLDER_ALREADY_EXISTS']), secret: null};
  const secret = crypto.randomBytes(32).toString('hex');
  const record = {schemaVersion: 1, mode: 'MCL_WORKSPACE_HOLDER', manifestId: current.manifest.manifestId,
    leaseId: current.manifest.leaseEvidence.leaseId, claimDigest: claimDigest(secret)};
  let fd;
  try {
    fd = fs.openSync(holderPath, 'wx', 0o600);
    fs.writeFileSync(fd, `${JSON.stringify(record)}\n`, 'utf8');
    fs.fsyncSync(fd);
  } catch (error) {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
    return {result: output('BLOCKED', [error.code === 'EEXIST' ? 'HOLDER_ALREADY_EXISTS' : 'HOLDER_CREATE_FAILED']), secret: null};
  }
  fs.closeSync(fd);
  return {result: output('CLAIMED', [], {manifestId: record.manifestId, leaseId: record.leaseId, claimDigest: record.claimDigest}), secret};
}
function checkHolder(input, secret) {
  const current = loadCurrent(input, true);
  if (current.result) return current.result;
  const holder = readHolder(current.workspace.holderPath);
  if (!holder.ok) return output('BLOCKED', holder.reasonCodes);
  const reasons = holderMatches(holder.value, current.manifest, secret);
  return reasons.length ? output('BLOCKED', reasons) : output('CHECK_PASS', [], {
    manifestId: holder.value.manifestId, leaseId: holder.value.leaseId, claimDigest: holder.value.claimDigest,
  });
}
function releaseHolder(input, secret) {
  const current = loadCurrent(input, false);
  if (current.result) return current.result;
  const holder = readHolder(current.workspace.holderPath);
  if (!holder.ok) return output('BLOCKED', holder.reasonCodes);
  const reasons = holderMatches(holder.value, current.manifest, secret);
  if (reasons.length) return output('BLOCKED', reasons);
  try { fs.unlinkSync(current.workspace.holderPath); } catch (_) { return output('BLOCKED', ['HOLDER_REMOVE_FAILED']); }
  return output('RELEASED', [], {manifestId: holder.value.manifestId, leaseId: holder.value.leaseId, claimDigest: holder.value.claimDigest});
}
function cleanupStale(input) {
  const manifestRead = readManifest(input.manifestPath);
  if (!manifestRead.ok) return output('BLOCKED', manifestRead.reasonCodes);
  const manifest = manifestRead.value;
  const parsed = lease.parseLedger(readText(input.ledgerPath));
  if (!parsed.ok) return output('BLOCKED', ['LEDGER_INVALID', ...parsed.reasonCodes]);
  if (parsed.state.activeLeases.some((item) => item.leaseId === manifest.leaseEvidence?.leaseId)) return output('BLOCKED', ['LEASE_STILL_ACTIVE']);
  const workspace = inspectWorkspace(manifest);
  if (!workspace.ok) return output('BLOCKED', workspace.reasonCodes);
  const holder = readHolder(workspace.holderPath);
  if (!holder.ok) return output('BLOCKED', holder.reasonCodes);
  if (holder.value.manifestId !== manifest.manifestId || holder.value.leaseId !== manifest.leaseEvidence.leaseId) return output('BLOCKED', ['HOLDER_IDENTITY_CONFLICT']);
  try { fs.unlinkSync(workspace.holderPath); } catch (_) { return output('BLOCKED', ['HOLDER_REMOVE_FAILED']); }
  return output('STALE_CLEANED', [], {manifestId: holder.value.manifestId, leaseId: holder.value.leaseId, claimDigest: holder.value.claimDigest});
}
function parseArgs(argv) {
  const command = argv[0];
  const values = {};
  for (let i = 1; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || i + 1 >= argv.length) throw new Error('ARGUMENT_INVALID');
    values[argv[i].slice(2)] = argv[i + 1];
  }
  return {command, values};
}
function cliInput(values, needsPacket = true) {
  if (!values.manifest || !values.ledger || (needsPacket && !values.packet)) throw new Error('EVIDENCE_PATH_REQUIRED');
  return {manifestPath: values.manifest, ledgerPath: values.ledger, packetPath: values.packet || null};
}
function runCli(argv = process.argv.slice(2), env = process.env) {
  const {command, values} = parseArgs(argv);
  let result;
  if (command === 'claim') {
    try { fs.fstatSync(3); } catch (_) { return {code: 2, text: `${JSON.stringify(output('BLOCKED', ['CLAIM_FD3_REQUIRED']))}\n`}; }
    const claimed = claimHolder(cliInput(values));
    result = claimed.result;
    if (result.status === 'CLAIMED') fs.writeSync(3, `${claimed.secret}\n`);
  } else if (command === 'check') {
    result = checkHolder(cliInput(values), env[CLAIM_ENV]);
  } else if (command === 'release') {
    result = releaseHolder(cliInput(values), env[CLAIM_ENV]);
  } else if (command === 'cleanup-stale') {
    result = cleanupStale(cliInput(values, false));
  } else {
    throw new Error('COMMAND_UNSUPPORTED');
  }
  return {code: ['CLAIMED', 'CHECK_PASS', 'RELEASED', 'STALE_CLEANED'].includes(result.status) ? 0 : 2, text: `${JSON.stringify(result)}\n`};
}
if (require.main === module) {
  try {
    const {code, text} = runCli();
    process.stdout.write(text);
    process.exitCode = code;
  } catch (error) {
    process.stdout.write(`${JSON.stringify(output('BLOCKED', [String(error?.message || error)]))}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  AUTHORITY,
  CLAIM_ENV,
  HOLDER_FILE,
  claimDigest,
  claimHolder,
  checkHolder,
  cleanupStale,
  inspectWorkspace,
  output,
  readHolder,
  readManifest,
  releaseHolder,
  runCli,
  validateEvidence,
};
