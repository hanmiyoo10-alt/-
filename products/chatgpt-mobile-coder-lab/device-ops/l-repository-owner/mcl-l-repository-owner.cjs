#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const COORDINATION = path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination');
const taskHandoff = require(path.join(COORDINATION, 'task-handoff.cjs'));
const workspaceHolder = require(path.join(COORDINATION, 'mcl-workspace-holder.cjs'));

const FIXED_REPO = 'hanmiyoo10-alt/-';
const FIXED_ROUTE = 'L';
const FIXED_EXECUTOR = 'L';
const FIXED_LANDING = '/home/alsl0/nyang-repo';
const FIXED_WORKTREE_ROOT = '/home/alsl0/nyang-worktrees';
const FIXED_BOT_NAME = 'mcl-repository-patch[bot]';
const FIXED_BOT_EMAIL = 'mcl-repository-patch@users.noreply.github.com';
const REQUEST_SCHEMA = 'mcl-l-repository-owner-request.v1';
const CONTINUATION_REQUEST_SCHEMA = 'mcl-l-prepared-continuation-request.v1';
const PRIOR_MANIFEST_REF_PREFIX = 'receipt:mcl-task-manifest:';
const PRIOR_BLOCKED_RECEIPT_REF_PREFIX = 'receipt:mcl-task-completion-receipt:';
const BLOCKER_REPAIR_REF_PREFIX = 'receipt:canonical-main-stage:';
const PREPARED_DIFF_REF_PREFIX = 'receipt:mcl-l-prepared-diff:';
const PR_REQUEST_SCHEMA = 'mcl-l-pr-publication-request.v1';
const OUTPUT_SCHEMA = 'mcl-l-repository-owner.v1';
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_PATCH_BYTES = 64 * 1024;
const MAX_FILES = 20;
const COMMAND_TIMEOUT_MS = 120000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_REF_RE = /^#[1-9][0-9]*$/;
const BRANCH_RE = /^laptop\/[A-Za-z0-9._/-]+$/;
const WORKFLOW_PATH_PREFIX = '.github/workflows/';
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

class OwnerError extends Error {
  constructor(kind, reasonCodes) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function output(status, reasonCodes = [], extra = {}) {
  return {
    schema: OUTPUT_SCHEMA,
    status,
    reason_codes: [...new Set(reasonCodes)].sort(),
    ...extra,
    authority: {...FALSE_AUTHORITY},
    details: 'withheld',
  };
}

function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function same(left, right) {
  return JSON.stringify(taskHandoff.stable(left)) === JSON.stringify(taskHandoff.stable(right));
}

function exactKeys(value, expected, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OwnerError('UNKNOWN', [field + '_OBJECT_REQUIRED']);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!same(actual, wanted)) {
    throw new OwnerError('UNKNOWN', [field + '_FIELDS_INVALID']);
  }
}

function readRegular(filePath, field, maxBytes = MAX_INPUT_BYTES) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); }
  catch { throw new OwnerError('UNKNOWN', [field + '_READ_FAILED']); }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new OwnerError('UNKNOWN', [field + '_REGULAR_FILE_REQUIRED']);
  }
  if (stat.size > maxBytes) throw new OwnerError('UNKNOWN', [field + '_TOO_LARGE']);
  return fs.readFileSync(resolved);
}

function validateRepoPath(value) {
  if (typeof value !== 'string' || !value || value.startsWith('/')
      || value.includes('\\') || value.includes('\0')) {
    throw new OwnerError('UNKNOWN', ['REQUEST_PATH_INVALID']);
  }
  const parts = value.split('/');
  if (parts.some((item) => ['', '.', '..'].includes(item))) {
    throw new OwnerError('UNKNOWN', ['REQUEST_PATH_INVALID']);
  }
}

function validateBranch(branch) {
  if (!BRANCH_RE.test(branch || '') || branch === 'laptop/work'
      || branch.includes('..') || branch.includes('//')
      || branch.endsWith('/') || branch.includes('@{')) {
    throw new OwnerError('BLOCKED', ['WORKSPACE_BRANCH_INVALID']);
  }
}

function validateWorktreePath(worktree, profile = DEFAULT_PROFILE) {
  if (typeof worktree !== 'string' || !path.posix.isAbsolute(worktree)
      || path.posix.normalize(worktree) !== worktree
      || worktree === profile.worktreeRoot
      || !worktree.startsWith(profile.worktreeRoot + '/')
      || worktree === profile.landing) {
    throw new OwnerError('BLOCKED', ['WORKTREE_PATH_INVALID']);
  }
}

function parseManifestText(text) {
  const parsed = taskHandoff.parseManifest(String(text));
  if (parsed.status !== 'VALID') {
    throw new OwnerError(parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      parsed.reasonCodes || ['MANIFEST_INVALID']);
  }
  return parsed.value;
}

function parseRequestText(text) {
  let value;
  try { value = JSON.parse(String(text)); }
  catch { throw new OwnerError('UNKNOWN', ['REQUEST_JSON_INVALID']); }
  exactKeys(value, new Set(['schema', 'packet_ref', 'message', 'expected_paths', 'patch_sha256']), 'REQUEST');
  if (value.schema !== REQUEST_SCHEMA || !PACKET_REF_RE.test(value.packet_ref || '')) {
    throw new OwnerError('UNKNOWN', ['REQUEST_SCHEMA_OR_PACKET_INVALID']);
  }
  if (typeof value.message !== 'string' || value.message.length < 1
      || value.message.length > 200 || value.message.includes('\0')) {
    throw new OwnerError('UNKNOWN', ['REQUEST_MESSAGE_INVALID']);
  }
  if (!Array.isArray(value.expected_paths) || value.expected_paths.length < 1
      || value.expected_paths.length > MAX_FILES
      || value.expected_paths.some((item) => typeof item !== 'string')
      || new Set(value.expected_paths).size !== value.expected_paths.length) {
    throw new OwnerError('UNKNOWN', ['REQUEST_PATHS_INVALID']);
  }
  for (const item of value.expected_paths) validateRepoPath(item);
  if (!SHA256_RE.test(value.patch_sha256 || '')) {
    throw new OwnerError('UNKNOWN', ['REQUEST_PATCH_SHA_INVALID']);
  }
  return {
    schema: value.schema,
    packet_ref: value.packet_ref,
    message: value.message,
    expected_paths: [...value.expected_paths].sort(),
    patch_sha256: value.patch_sha256,
  };
}

function parsePreparedContinuationRequestText(text) {
  let value;
  try { value = JSON.parse(String(text)); }
  catch { throw new OwnerError('UNKNOWN', ['CONTINUATION_REQUEST_JSON_INVALID']); }
  exactKeys(value, new Set([
    'schema', 'message', 'expected_paths', 'prepared_digest', 'prior_manifest_id',
    'prior_blocked_receipt_id', 'blocker_repair_receipt',
  ]), 'CONTINUATION_REQUEST');
  if (value.schema !== CONTINUATION_REQUEST_SCHEMA) {
    throw new OwnerError('UNKNOWN', ['CONTINUATION_REQUEST_SCHEMA_INVALID']);
  }
  if (typeof value.message !== 'string' || value.message.length < 1
      || value.message.length > 200 || /[\u0000-\u001f\u007f]/.test(value.message)) {
    throw new OwnerError('UNKNOWN', ['CONTINUATION_REQUEST_MESSAGE_INVALID']);
  }
  if (!Array.isArray(value.expected_paths) || value.expected_paths.length < 1
      || value.expected_paths.length > MAX_FILES
      || value.expected_paths.some((item) => typeof item !== 'string')
      || new Set(value.expected_paths).size !== value.expected_paths.length) {
    throw new OwnerError('UNKNOWN', ['CONTINUATION_REQUEST_PATHS_INVALID']);
  }
  for (const item of value.expected_paths) validateRepoPath(item);
  for (const [field, reason] of [
    ['prepared_digest', 'CONTINUATION_PREPARED_DIGEST_INVALID'],
    ['prior_manifest_id', 'CONTINUATION_PRIOR_MANIFEST_INVALID'],
    ['prior_blocked_receipt_id', 'CONTINUATION_PRIOR_RECEIPT_INVALID'],
    ['blocker_repair_receipt', 'CONTINUATION_BLOCKER_REPAIR_RECEIPT_INVALID'],
  ]) {
    if (!SHA256_RE.test(value[field] || '')) throw new OwnerError('UNKNOWN', [reason]);
  }
  return {
    schema: value.schema,
    message: value.message,
    expected_paths: [...value.expected_paths].sort(),
    prepared_digest: value.prepared_digest,
    prior_manifest_id: value.prior_manifest_id,
    prior_blocked_receipt_id: value.prior_blocked_receipt_id,
    blocker_repair_receipt: value.blocker_repair_receipt,
  };
}

function validatePreparedContinuationManifestBinding(manifest, request) {
  const reasons = [];
  if (typeof manifest.phaseId !== 'string' || !manifest.phaseId.includes('recovery-rebind')) {
    reasons.push('CONTINUATION_RECOVERY_REBIND_REQUIRED');
  }
  if (!same(manifestPathScopes(manifest), request.expected_paths)) {
    reasons.push('CONTINUATION_SCOPE_CONFLICT');
  }
  const refs = manifest.inputRefs || [];
  const expected = [
    [PRIOR_MANIFEST_REF_PREFIX, request.prior_manifest_id, 'CONTINUATION_PRIOR_MANIFEST_REF'],
    [PRIOR_BLOCKED_RECEIPT_REF_PREFIX, request.prior_blocked_receipt_id, 'CONTINUATION_PRIOR_RECEIPT_REF'],
    [BLOCKER_REPAIR_REF_PREFIX, request.blocker_repair_receipt, 'CONTINUATION_BLOCKER_REPAIR_REF'],
    [PREPARED_DIFF_REF_PREFIX, request.prepared_digest, 'CONTINUATION_PREPARED_DIFF_REF'],
  ];
  for (const [prefix, digest, label] of expected) {
    const matching = refs.filter((item) => typeof item === 'string' && item.startsWith(prefix));
    if (matching.length !== 1) reasons.push(matching.length ? label + '_AMBIGUOUS' : label + '_REQUIRED');
    else if (matching[0] !== prefix + digest) reasons.push(label + '_CONFLICT');
  }
  if (reasons.length) {
    const conflict = reasons.some((item) => item.endsWith('_CONFLICT'));
    throw new OwnerError(conflict ? 'CONFLICT' : 'BLOCKED', reasons);
  }
}

function parsePrRequestText(text, packetRef) {
  let value;
  try { value = JSON.parse(String(text)); }
  catch { throw new OwnerError('UNKNOWN', ['PR_REQUEST_JSON_INVALID']); }
  exactKeys(value, new Set(['schema', 'title', 'body']), 'PR_REQUEST');
  if (value.schema !== PR_REQUEST_SCHEMA) {
    throw new OwnerError('UNKNOWN', ['PR_REQUEST_SCHEMA_INVALID']);
  }
  if (typeof value.title !== 'string' || value.title.length < 1 || value.title.length > 120
      || value.title.includes('\0')) {
    throw new OwnerError('UNKNOWN', ['PR_TITLE_INVALID']);
  }
  if (typeof value.body !== 'string' || value.body.length < 1 || value.body.length > 2048
      || value.body.includes('\0')) {
    throw new OwnerError('UNKNOWN', ['PR_BODY_INVALID']);
  }
  if (!value.body.includes('Refs ' + packetRef)) {
    throw new OwnerError('BLOCKED', ['PR_BODY_REFS_REQUIRED']);
  }
  if (/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#[1-9][0-9]*/i.test(value.body)) {
    throw new OwnerError('BLOCKED', ['PR_CLOSING_LINK_FORBIDDEN']);
  }
  return {schema: value.schema, title: value.title, body: value.body};
}
const DEFAULT_PROFILE = Object.freeze({
  landing: FIXED_LANDING,
  worktreeRoot: FIXED_WORKTREE_ROOT,
  route: FIXED_ROUTE,
  executor: FIXED_EXECUTOR,
});

function validateManifestShape(manifest, profile = DEFAULT_PROFILE) {
  const reasons = [];
  if (manifest?.phaseClass !== 'REPOSITORY_MUTATION') reasons.push('MANIFEST_PHASE_CLASS_INVALID');
  if (manifest?.route !== profile.route || manifest?.executor !== profile.executor) {
    reasons.push('MANIFEST_ROUTE_EXECUTOR_INVALID');
  }
  if (manifest?.leaseRequirement !== 'REQUIRED') reasons.push('MANIFEST_LEASE_REQUIRED');
  if (manifest?.workspace?.kind !== 'repository') reasons.push('MANIFEST_WORKSPACE_KIND_INVALID');
  if (!PACKET_REF_RE.test(manifest?.packetRef || '')) reasons.push('MANIFEST_PACKET_INVALID');
  if (!SHA40_RE.test(manifest?.observedBaseSha || '')) reasons.push('MANIFEST_BASE_SHA_INVALID');
  try { validateBranch(manifest?.workspace?.branch); }
  catch (error) { reasons.push(...(error.reasonCodes || ['WORKSPACE_BRANCH_INVALID'])); }
  try { validateWorktreePath(manifest?.workspace?.worktree, profile); }
  catch (error) { reasons.push(...(error.reasonCodes || ['WORKTREE_PATH_INVALID'])); }
  if (reasons.length) throw new OwnerError('BLOCKED', reasons);
  return manifest;
}

function manifestPathScopes(manifest) {
  return [...new Set((manifest.scopes || [])
    .filter((item) => typeof item === 'string' && item.startsWith('path:'))
    .map((item) => item.slice(5)))].sort();
}

function evidenceContext({manifestPath, ledgerPath, packetPath, profile = DEFAULT_PROFILE}) {
  const manifestBytes = readRegular(manifestPath, 'MANIFEST_FILE');
  const ledgerBytes = readRegular(ledgerPath, 'LEDGER_FILE');
  const packetBytes = readRegular(packetPath, 'PACKET_FILE');
  const manifest = validateManifestShape(parseManifestText(manifestBytes.toString('utf8')), profile);
  const checked = workspaceHolder.validateEvidence({
    manifest,
    ledgerBody: ledgerBytes.toString('utf8'),
    packetBody: packetBytes.toString('utf8'),
    requireActiveLease: true,
  });
  if (!checked.ok) {
    throw new OwnerError('BLOCKED', ['COORDINATION_EVIDENCE_INVALID', ...(checked.reasonCodes || [])]);
  }
  return {
    manifest,
    manifestPath: path.resolve(manifestPath),
    ledgerPath: path.resolve(ledgerPath),
    packetPath: path.resolve(packetPath),
  };
}

function safeChildEnv(env = process.env) {
  const out = {};
  for (const key of ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'GH_CONFIG_DIR']) {
    if (typeof env[key] === 'string' && env[key]) out[key] = env[key];
  }
  return out;
}

function defaultRunner(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeoutMs || COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
    shell: false,
    env: options.env || safeChildEnv(),
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    signal: result.signal || null,
    error: result.error || null,
  };
}

function runChecked(runner, command, args, options = {}, reason = 'COMMAND_FAILED') {
  const result = runner(command, args, options);
  if (result.error || result.signal || result.code !== 0) {
    throw new OwnerError('BLOCKED', [reason]);
  }
  return result.stdout;
}

function git(runner, cwd, args, options = {}) {
  return runChecked(runner, 'git', ['-C', cwd, ...args], options, options.reason || 'GIT_COMMAND_FAILED');
}

function gh(runner, args, options = {}) {
  return runChecked(runner, 'gh', args, options, options.reason || 'GH_COMMAND_FAILED');
}

function requiresWorkflowOauthScope(paths) {
  return Array.isArray(paths)
    && paths.some((item) => typeof item === 'string' && item.startsWith(WORKFLOW_PATH_PREFIX));
}

function parseGithubOauthScopes(text) {
  const matches = [];
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^x-oauth-scopes:\s*(.*)$/i.exec(line);
    if (match) matches.push(match[1]);
  }
  if (matches.length !== 1) throw new OwnerError('UNKNOWN', ['GITHUB_AUTH_SCOPE_UNOBSERVED']);
  return [...new Set(matches[0].split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean))].sort();
}

function requireGithubWorkflowScope(paths, {runner = defaultRunner} = {}) {
  if (!requiresWorkflowOauthScope(paths)) return false;
  const result = runner('gh', ['api', '-i', 'user'], {
    env: safeChildEnv(),
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
  if (result.error || result.signal || result.code !== 0) {
    throw new OwnerError('UNKNOWN', ['GITHUB_AUTH_SCOPE_UNOBSERVED']);
  }
  const scopes = parseGithubOauthScopes(result.stdout);
  if (!scopes.includes('workflow')) {
    throw new OwnerError('BLOCKED', ['GITHUB_WORKFLOW_SCOPE_REQUIRED']);
  }
  return true;
}

function remoteBranchHead(runner, landing, branch) {
  const ref = 'refs/heads/' + branch;
  const text = git(runner, landing, ['ls-remote', '--heads', 'origin', ref], {reason:'REMOTE_REF_READ_FAILED'}).trim();
  if (!text) return null;
  const rows = text.split('\n').filter(Boolean);
  if (rows.length !== 1) throw new OwnerError('CONFLICT', ['REMOTE_REF_AMBIGUOUS']);
  const fields = rows[0].trim().split(/\s+/);
  if (fields.length !== 2 || !SHA40_RE.test(fields[0]) || fields[1] !== ref) {
    throw new OwnerError('CONFLICT', ['REMOTE_REF_INVALID']);
  }
  return fields[0];
}

function protectedMain(runner) {
  const value = gh(runner, ['api', 'repos/' + FIXED_REPO + '/branches/main', '--jq', '.commit.sha'],
    {reason:'PROTECTED_MAIN_READ_FAILED'}).trim();
  if (!SHA40_RE.test(value)) throw new OwnerError('UNKNOWN', ['PROTECTED_MAIN_INVALID']);
  return value;
}

function inspectLanding(manifest, {profile = DEFAULT_PROFILE, runner = defaultRunner} = {}) {
  let real;
  try { real = fs.realpathSync(profile.landing); }
  catch { throw new OwnerError('BLOCKED', ['LANDING_MISSING']); }
  if (real !== profile.landing) throw new OwnerError('BLOCKED', ['LANDING_ALIAS_DENIED']);
  const branch = git(runner, profile.landing, ['branch', '--show-current'], {reason:'LANDING_BRANCH_READ_FAILED'}).trim();
  const head = git(runner, profile.landing, ['rev-parse', 'HEAD'], {reason:'LANDING_HEAD_READ_FAILED'}).trim();
  const dirty = git(runner, profile.landing, ['status', '--porcelain=v1', '-uall'], {reason:'LANDING_STATUS_READ_FAILED'});
  const liveRemote = remoteBranchHead(runner, profile.landing, 'main');
  const main = protectedMain(runner);
  const reasons = [];
  if (branch !== 'main') reasons.push('LANDING_BRANCH_INVALID');
  if (dirty) reasons.push('LANDING_DIRTY');
  if (liveRemote !== manifest.observedBaseSha) reasons.push('REMOTE_MAIN_STALE');
  if (main !== manifest.observedBaseSha) reasons.push('PROTECTED_MAIN_STALE');
  const object = runner('git', ['-C', profile.landing, 'cat-file', '-e', manifest.observedBaseSha + '^{commit}'], {env:safeChildEnv()});
  const baseObjectPresent = !object.error && !object.signal && object.code === 0;
  if (!baseObjectPresent) reasons.push('BASE_OBJECT_MISSING');
  if (head !== manifest.observedBaseSha && baseObjectPresent) {
    const ancestry = runner('git', ['-C', profile.landing, 'merge-base', '--is-ancestor', head, manifest.observedBaseSha],
      {env:safeChildEnv()});
    if (ancestry.error || ancestry.signal || ![0, 1].includes(ancestry.code)) {
      throw new OwnerError('UNKNOWN', ['LANDING_ANCESTRY_READ_FAILED']);
    }
    if (ancestry.code !== 0) reasons.push('LANDING_HEAD_NOT_ANCESTOR_OF_BASE');
  }
  if (reasons.length) throw new OwnerError('BLOCKED', reasons);
  return {main, head, remoteMain: liveRemote, landingRelation: head === manifest.observedBaseSha ? 'equal' : 'behind_ff'};
}

function localBranchState(runner, landing, branch) {
  const result = runner('git', ['-C', landing, 'show-ref', '--verify', '--quiet', 'refs/heads/' + branch],
    {env:safeChildEnv()});
  if (result.error || result.signal || ![0,1].includes(result.code)) {
    throw new OwnerError('UNKNOWN', ['LOCAL_BRANCH_READ_FAILED']);
  }
  return result.code === 0 ? 'PRESENT' : 'ABSENT';
}

function inspectPreparedWorkspace(manifest, {profile = DEFAULT_PROFILE, runner = defaultRunner} = {}) {
  const branchState = localBranchState(runner, profile.landing, manifest.workspace.branch);
  const pathState = fs.existsSync(manifest.workspace.worktree) ? 'PRESENT' : 'ABSENT';
  const remoteHead = remoteBranchHead(runner, profile.landing, manifest.workspace.branch);
  if (branchState === 'ABSENT' && pathState === 'ABSENT' && remoteHead === null) {
    return {state:'ABSENT', remoteHead:null};
  }
  if (branchState !== 'PRESENT' || pathState !== 'PRESENT' || remoteHead !== manifest.observedBaseSha) {
    throw new OwnerError('CONFLICT', ['WORKSPACE_PARTIAL_STATE']);
  }
  let real;
  try { real = fs.realpathSync(manifest.workspace.worktree); }
  catch { throw new OwnerError('CONFLICT', ['WORKTREE_REALPATH_FAILED']); }
  if (real !== manifest.workspace.worktree) throw new OwnerError('CONFLICT', ['WORKTREE_ALIAS_DENIED']);
  const top = git(runner, manifest.workspace.worktree, ['rev-parse', '--show-toplevel']).trim();
  const branch = git(runner, manifest.workspace.worktree, ['branch', '--show-current']).trim();
  const head = git(runner, manifest.workspace.worktree, ['rev-parse', 'HEAD']).trim();
  const dirty = git(runner, manifest.workspace.worktree, ['status', '--porcelain=v1', '-uall']);
  if (top !== manifest.workspace.worktree || branch !== manifest.workspace.branch
      || head !== manifest.observedBaseSha || dirty) {
    throw new OwnerError('CONFLICT', ['WORKSPACE_IDENTITY_CONFLICT']);
  }
  return {state:'PREPARED', remoteHead};
}
function prepareWorkspace(context, {profile = DEFAULT_PROFILE, runner = defaultRunner} = {}) {
  const {manifest} = context;
  inspectLanding(manifest, {profile, runner});
  const before = inspectPreparedWorkspace(manifest, {profile, runner});
  if (before.state !== 'ABSENT') throw new OwnerError('BLOCKED', ['WORKSPACE_ALREADY_PREPARED']);
  runChecked(runner, 'git', [
    '-C', profile.landing, 'worktree', 'add', '-b', manifest.workspace.branch,
    manifest.workspace.worktree, manifest.observedBaseSha,
  ], {}, 'WORKTREE_CREATE_FAILED');
  inspectLanding(manifest, {profile, runner});
  const ref = 'refs/heads/' + manifest.workspace.branch;
  gh(runner, [
    'api', 'repos/' + FIXED_REPO + '/git/refs', '--method', 'POST',
    '-f', 'ref=' + ref, '-f', 'sha=' + manifest.observedBaseSha,
  ], {reason:'REMOTE_REF_CREATE_FAILED'});
  inspectLanding(manifest, {profile, runner});
  const after = inspectPreparedWorkspace(manifest, {profile, runner});
  if (after.state !== 'PREPARED') throw new OwnerError('CONFLICT', ['WORKSPACE_PREPARE_READBACK_FAILED']);
  return output('PREPARED', [], {
    route: manifest.route,
    executor: manifest.executor,
    branch: manifest.workspace.branch,
    worktree: manifest.workspace.worktree,
    base_sha: manifest.observedBaseSha,
    next_legal_action: 'CLAIM_WORKSPACE_HOLDER_THEN_APPLY',
  });
}

function holderCheck(context, env = process.env) {
  const claim = env.MCL_WORKSPACE_HOLDER_CLAIM;
  const result = workspaceHolder.checkHolder({
    manifestPath: context.manifestPath,
    ledgerPath: context.ledgerPath,
    packetPath: context.packetPath,
  }, claim);
  if (result.status !== 'CHECK_PASS') {
    throw new OwnerError('BLOCKED', ['HOLDER_CHECK_FAILED', ...(result.reasonCodes || [])]);
  }
  return result;
}

function stagedPaths(runner, worktree) {
  const raw = git(runner, worktree, ['diff', '--cached', '--name-only', '-z', '--']);
  return raw.split('\0').filter(Boolean).sort();
}

function ensureNoResidue(runner, worktree) {
  const unstaged = git(runner, worktree, ['diff', '--name-only', '-z', '--']);
  const untracked = git(runner, worktree, ['ls-files', '--others', '--exclude-standard', '-z']);
  if (unstaged || untracked) throw new OwnerError('BLOCKED', ['UNSTAGED_OR_UNTRACKED_PRESENT']);
}

function stagedDigest(runner, worktree) {
  const raw = git(runner, worktree, ['diff', '--cached', '--binary', '--']);
  if (!raw) throw new OwnerError('BLOCKED', ['PATCH_EMPTY_AFTER_APPLY']);
  return sha256Bytes(Buffer.from(raw, 'utf8'));
}

function validateStagedModes(runner, worktree, expectedPaths) {
  const summary = git(runner, worktree, ['diff', '--cached', '--summary', '--']);
  if (/mode change|create mode 160000|delete mode 160000/.test(summary)) {
    throw new OwnerError('BLOCKED', ['SPECIAL_MODE_DENIED']);
  }
  for (const item of expectedPaths) {
    const index = git(runner, worktree, ['ls-files', '-s', '--', item]).trim();
    if (index) {
      const mode = index.split(/\s+/)[0];
      if (mode !== '100644') throw new OwnerError('BLOCKED', ['SPECIAL_MODE_DENIED']);
    }
  }
}

function gitResult(runner, cwd, args, options = {}) {
  return runner('git', ['-C', cwd, ...args], {...options, env: options.env || safeChildEnv()});
}

function nulPaths(text) {
  return String(text || '').split('\0').filter(Boolean).sort();
}

function indexEntry(runner, worktree, repoPath, env = null) {
  const raw = git(runner, worktree, ['ls-files', '-s', '--', repoPath], env ? {env} : {}).trim();
  if (!raw) return null;
  const rows = raw.split('\n').filter(Boolean);
  if (rows.length !== 1) throw new OwnerError('CONFLICT', ['CONTINUATION_INDEX_ENTRY_AMBIGUOUS']);
  const fields = rows[0].split(/\s+/);
  if (fields.length < 4) throw new OwnerError('UNKNOWN', ['CONTINUATION_INDEX_ENTRY_INVALID']);
  return {mode: fields[0], blob: fields[1]};
}

function treeEntry(runner, worktree, rev, repoPath) {
  const raw = git(runner, worktree, ['ls-tree', rev, '--', repoPath]).trim();
  if (!raw) return null;
  const rows = raw.split('\n').filter(Boolean);
  if (rows.length !== 1) throw new OwnerError('CONFLICT', ['CONTINUATION_TREE_ENTRY_AMBIGUOUS']);
  const fields = rows[0].split(/\s+/);
  if (fields.length < 3) throw new OwnerError('UNKNOWN', ['CONTINUATION_TREE_ENTRY_INVALID']);
  return {mode: fields[0], blob: fields[2]};
}

function patchId(runner, cwd, diffText) {
  const result = runner('git', ['patch-id', '--stable'], {cwd, input: diffText, env: safeChildEnv()});
  if (result.error || result.signal || result.code !== 0 || !String(result.stdout || '').trim()) {
    throw new OwnerError('UNKNOWN', ['CONTINUATION_PATCH_ID_FAILED']);
  }
  return String(result.stdout).trim().split(/\s+/)[0];
}

function continuationCurrentMain(manifest, {profile = DEFAULT_PROFILE, runner = defaultRunner} = {}) {
  let real;
  try { real = fs.realpathSync(profile.landing); }
  catch { throw new OwnerError('BLOCKED', ['LANDING_MISSING']); }
  if (real !== profile.landing) throw new OwnerError('BLOCKED', ['LANDING_ALIAS_DENIED']);
  const branch = git(runner, profile.landing, ['branch', '--show-current'], {reason:'LANDING_BRANCH_READ_FAILED'}).trim();
  const dirty = git(runner, profile.landing, ['status', '--porcelain=v1', '-uall'], {reason:'LANDING_STATUS_READ_FAILED'});
  if (branch !== 'main') throw new OwnerError('BLOCKED', ['LANDING_BRANCH_INVALID']);
  if (dirty) throw new OwnerError('BLOCKED', ['LANDING_DIRTY']);
  const remoteMain = remoteBranchHead(runner, profile.landing, 'main');
  const main = protectedMain(runner);
  if (!remoteMain || remoteMain !== main) throw new OwnerError('CONFLICT', ['CONTINUATION_MAIN_IDENTITY_CONFLICT']);
  for (const sha of [manifest.observedBaseSha, main]) {
    const object = gitResult(runner, profile.landing, ['cat-file', '-e', sha + '^{commit}']);
    if (object.error || object.signal || object.code !== 0) {
      throw new OwnerError('BLOCKED', [sha === main ? 'CONTINUATION_CURRENT_MAIN_OBJECT_MISSING' : 'CONTINUATION_PREPARED_BASE_OBJECT_MISSING']);
    }
  }
  const ancestry = gitResult(runner, profile.landing, ['merge-base', '--is-ancestor', manifest.observedBaseSha, main]);
  if (ancestry.error || ancestry.signal || ![0, 1].includes(ancestry.code)) {
    throw new OwnerError('UNKNOWN', ['CONTINUATION_MAIN_ANCESTRY_READ_FAILED']);
  }
  if (ancestry.code !== 0) throw new OwnerError('CONFLICT', ['CONTINUATION_MAIN_NOT_DESCENDANT_OF_BASE']);
  return main;
}

function preparedDiff(runner, worktree) {
  const text = git(runner, worktree, ['diff', '--cached', '--binary', '--']);
  if (!text || Buffer.byteLength(text, 'utf8') > MAX_PATCH_BYTES) {
    throw new OwnerError('BLOCKED', ['CONTINUATION_PREPARED_DIFF_INVALID']);
  }
  return text;
}

function verifyReplayAgainstCurrent(manifest, request, currentMain, {runner = defaultRunner, candidateHead = null} = {}) {
  const worktree = manifest.workspace.worktree;
  const patch = candidateHead
    ? git(runner, worktree, ['diff', '--binary', manifest.observedBaseSha, candidateHead, '--'])
    : preparedDiff(runner, worktree);
  if (!patch || sha256Bytes(Buffer.from(patch, 'utf8')) !== request.prepared_digest) {
    throw new OwnerError('CONFLICT', ['CONTINUATION_PREPARED_DIGEST_CONFLICT']);
  }
  const originalStatus = candidateHead
    ? git(runner, worktree, ['diff', '--name-status', '-z', manifest.observedBaseSha, candidateHead, '--'])
    : git(runner, worktree, ['diff', '--cached', '--name-status', '-z', '--']);
  const originalPatchId = patchId(runner, worktree, candidateHead
    ? git(runner, worktree, ['diff', '--no-ext-diff', '--no-textconv', '-M', manifest.observedBaseSha, candidateHead, '--'])
    : git(runner, worktree, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '-M', '--']));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-l-current-replay-'));
  const indexFile = path.join(dir, 'index');
  const env = {...safeChildEnv(), GIT_INDEX_FILE:indexFile};
  try {
    runChecked(runner, 'git', ['-C', worktree, 'read-tree', currentMain], {env}, 'CONTINUATION_REPLAY_READ_TREE_FAILED');
    runChecked(runner, 'git', ['-C', worktree, 'apply', '--cached', '--check', '-'], {env, input:patch}, 'CONTINUATION_REPLAY_APPLY_CHECK_FAILED');
    runChecked(runner, 'git', ['-C', worktree, 'apply', '--cached', '-'], {env, input:patch}, 'CONTINUATION_REPLAY_APPLY_FAILED');
    const replayPaths = nulPaths(git(runner, worktree, ['diff', '--cached', '--name-only', '-z', currentMain, '--'], {env}));
    if (!same(replayPaths, request.expected_paths)) throw new OwnerError('CONFLICT', ['CONTINUATION_REPLAY_PATH_CONFLICT']);
    const replayStatus = git(runner, worktree, ['diff', '--cached', '--name-status', '-z', currentMain, '--'], {env});
    if (replayStatus !== originalStatus) throw new OwnerError('CONFLICT', ['CONTINUATION_REPLAY_CHANGE_IDENTITY_CONFLICT']);
    for (const item of request.expected_paths) {
      const original = candidateHead
        ? treeEntry(runner, worktree, candidateHead, item)
        : indexEntry(runner, worktree, item);
      const replay = indexEntry(runner, worktree, item, env);
      if (!original || !replay || !same(original, replay)) throw new OwnerError('CONFLICT', ['CONTINUATION_REPLAY_BLOB_MODE_CONFLICT']);
    }
    const replayPatchId = patchId(runner, worktree,
      git(runner, worktree, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '-M', currentMain, '--'], {env}));
    if (replayPatchId !== originalPatchId) throw new OwnerError('CONFLICT', ['CONTINUATION_REPLAY_PATCH_ID_CONFLICT']);
    return {patchId: originalPatchId, currentMain};
  } finally {
    try { fs.rmSync(dir, {recursive:true, force:true}); } catch {}
  }
}

function assertCandidateCommit(runner, manifest, request, candidateHead) {
  const worktree = manifest.workspace.worktree;
  const parent = git(runner, worktree, ['rev-parse', candidateHead + '^']).trim();
  if (parent !== manifest.observedBaseSha) throw new OwnerError('CONFLICT', ['CONTINUATION_COMMIT_PARENT_CONFLICT']);
  const paths = nulPaths(git(runner, worktree, ['diff', '--name-only', '-z', manifest.observedBaseSha, candidateHead, '--']));
  if (!same(paths, request.expected_paths)) throw new OwnerError('CONFLICT', ['CONTINUATION_COMMITTED_PATH_CONFLICT']);
  const diff = git(runner, worktree, ['diff', '--binary', manifest.observedBaseSha, candidateHead, '--']);
  if (sha256Bytes(Buffer.from(diff, 'utf8')) !== request.prepared_digest) throw new OwnerError('CONFLICT', ['CONTINUATION_COMMITTED_DIGEST_CONFLICT']);
  const message = git(runner, worktree, ['log', '-1', '--format=%B', candidateHead]).replace(/\n+$/, '');
  if (message !== request.message) throw new OwnerError('CONFLICT', ['CONTINUATION_COMMIT_MESSAGE_CONFLICT']);
  const identity = git(runner, worktree, ['log', '-1', '--format=%an%x00%ae%x00%cn%x00%ce', candidateHead])
    .replace(/\n+$/, '').split('\0');
  if (!same(identity, [FIXED_BOT_NAME, FIXED_BOT_EMAIL, FIXED_BOT_NAME, FIXED_BOT_EMAIL])) {
    throw new OwnerError('CONFLICT', ['CONTINUATION_COMMIT_IDENTITY_CONFLICT']);
  }
}

function assertCurrentizedPayload(runner, manifest, request, candidateHead, currentMain, finalHead) {
  const worktree = manifest.workspace.worktree;
  const paths = nulPaths(git(runner, worktree, ['diff', '--name-only', '-z', currentMain, finalHead, '--']));
  if (!same(paths, request.expected_paths)) throw new OwnerError('CONFLICT', ['CONTINUATION_CURRENTIZED_PATH_CONFLICT']);
  for (const item of request.expected_paths) {
    const candidate = treeEntry(runner, worktree, candidateHead, item);
    const final = treeEntry(runner, worktree, finalHead, item);
    if (!candidate || !final || !same(candidate, final)) throw new OwnerError('CONFLICT', ['CONTINUATION_CURRENTIZED_BLOB_MODE_CONFLICT']);
  }
}

function classifyPreparedContinuationState(manifest, request, currentMain, {runner = defaultRunner, profile = DEFAULT_PROFILE} = {}) {
  const worktree = manifest.workspace.worktree;
  const top = git(runner, worktree, ['rev-parse', '--show-toplevel']).trim();
  const branch = git(runner, worktree, ['branch', '--show-current']).trim();
  const head = git(runner, worktree, ['rev-parse', 'HEAD']).trim();
  if (top !== worktree || branch !== manifest.workspace.branch || !SHA40_RE.test(head)) throw new OwnerError('CONFLICT', ['CONTINUATION_WORKSPACE_IDENTITY_CONFLICT']);
  const unmerged = nulPaths(git(runner, worktree, ['diff', '--name-only', '--diff-filter=U', '-z', '--']));
  const unstaged = nulPaths(git(runner, worktree, ['diff', '--name-only', '-z', '--']));
  const untracked = nulPaths(git(runner, worktree, ['ls-files', '--others', '--exclude-standard', '-z']));
  if (unmerged.length || unstaged.length || untracked.length) throw new OwnerError('CONFLICT', ['CONTINUATION_WORKTREE_RESIDUE_CONFLICT']);
  const remoteHead = remoteBranchHead(runner, profile.landing, manifest.workspace.branch);
  if (!remoteHead) throw new OwnerError('CONFLICT', ['CONTINUATION_REMOTE_BRANCH_MISSING']);
  const staged = stagedPaths(runner, worktree);
  if (head === manifest.observedBaseSha) {
    if (remoteHead !== manifest.observedBaseSha) throw new OwnerError('CONFLICT', ['CONTINUATION_REMOTE_HEAD_CONFLICT']);
    if (!same(staged, request.expected_paths)) throw new OwnerError('CONFLICT', ['CONTINUATION_STAGED_PATH_CONFLICT']);
    validateStagedModes(runner, worktree, request.expected_paths);
    if (stagedDigest(runner, worktree) !== request.prepared_digest) throw new OwnerError('CONFLICT', ['CONTINUATION_PREPARED_DIGEST_CONFLICT']);
    return {state:'PREPARED', candidateHead:null, finalHead:null, remoteHead};
  }
  if (staged.length) throw new OwnerError('CONFLICT', ['CONTINUATION_INDEX_NOT_CLEAN']);
  const parents = git(runner, worktree, ['rev-list', '--parents', '-n', '1', head]).trim().split(/\s+/);
  if (parents.length === 2) {
    const candidateHead = head;
    assertCandidateCommit(runner, manifest, request, candidateHead);
    if (currentMain !== manifest.observedBaseSha && remoteHead !== manifest.observedBaseSha) throw new OwnerError('CONFLICT', ['CONTINUATION_REMOTE_HEAD_CONFLICT']);
    if (currentMain === manifest.observedBaseSha && ![manifest.observedBaseSha, candidateHead].includes(remoteHead)) throw new OwnerError('CONFLICT', ['CONTINUATION_REMOTE_HEAD_CONFLICT']);
    return {state: remoteHead === candidateHead ? 'PUSHED' : 'COMMITTED', candidateHead, finalHead:candidateHead, remoteHead};
  }
  if (parents.length === 3) {
    const candidateHead = parents[1];
    const mergedMain = parents[2];
    assertCandidateCommit(runner, manifest, request, candidateHead);
    if (mergedMain !== currentMain) throw new OwnerError('CONFLICT', ['CONTINUATION_CURRENTIZATION_MAIN_CONFLICT']);
    assertCurrentizedPayload(runner, manifest, request, candidateHead, currentMain, head);
    if (![manifest.observedBaseSha, head].includes(remoteHead)) throw new OwnerError('CONFLICT', ['CONTINUATION_REMOTE_HEAD_CONFLICT']);
    return {state: remoteHead === head ? 'PUSHED' : 'CURRENTIZED', candidateHead, finalHead:head, remoteHead};
  }
  throw new OwnerError('CONFLICT', ['CONTINUATION_HEAD_SHAPE_CONFLICT']);
}

function runContinuationValidation(manifest, request, {runner = defaultRunner, root = ROOT} = {}) {
  const checks = [
    ['owner-source-syntax', ['--check', path.join(root, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs')]],
    ['owner-contract', ['--test', path.join(root, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/tests/test-mcl-l-repository-owner.cjs')]],
    ['task-lease-contract', ['--test', path.join(root, 'products/chatgpt-mobile-coder-lab/coordination/tests/test-task-lease.cjs')]],
    ['task-handoff-contract', ['--test', path.join(root, 'products/chatgpt-mobile-coder-lab/coordination/tests/test-task-handoff.cjs')]],
    ['workspace-holder-contract', ['--test', path.join(root, 'products/chatgpt-mobile-coder-lab/coordination/tests/test-workspace-holder.cjs')]],
  ];
  for (const item of request.expected_paths) if (item.endsWith('.cjs')) {
    checks.push(['changed-cjs-syntax:' + item, ['--check', path.join(manifest.workspace.worktree, item)]]);
  }
  const passed = [];
  for (const [name, args] of checks) {
    const result = runner(process.execPath, args, {cwd:root, env:safeChildEnv(), timeoutMs:COMMAND_TIMEOUT_MS});
    if (result.error || result.signal || result.code !== 0) throw new OwnerError('BLOCKED', ['VALIDATION_FAILED:' + name]);
    passed.push(name);
  }
  runChecked(runner, 'git', ['-C', manifest.workspace.worktree, 'diff', '--check'], {}, 'CONTINUATION_DIFF_CHECK_FAILED');
  return passed;
}

function findExactOpenPr(runner, manifest, prRequest, expectedHead) {
  const raw = gh(runner, ['pr', 'list', '--repo', FIXED_REPO, '--state', 'open', '--head', manifest.workspace.branch,
    '--json', 'number,title,body,isDraft,headRefName,headRefOid,baseRefName'], {reason:'PR_READBACK_FAILED'});
  let rows;
  try { rows = JSON.parse(raw); } catch { throw new OwnerError('UNKNOWN', ['PR_READBACK_JSON_INVALID']); }
  if (!Array.isArray(rows)) throw new OwnerError('UNKNOWN', ['PR_READBACK_JSON_INVALID']);
  if (rows.length === 0) return null;
  if (rows.length !== 1) throw new OwnerError('CONFLICT', ['PR_READBACK_COUNT_INVALID']);
  const row = rows[0];
  if (!Number.isInteger(row.number) || row.isDraft !== false || row.headRefName !== manifest.workspace.branch
      || row.headRefOid !== expectedHead || row.baseRefName !== 'main' || row.title !== prRequest.title || row.body !== prRequest.body) {
    throw new OwnerError('CONFLICT', ['PR_READBACK_IDENTITY_CONFLICT']);
  }
  return row;
}

function executePreparedContinuation(context, request, prRequest, {profile = DEFAULT_PROFILE, runner = defaultRunner, env = process.env, root = ROOT} = {}) {
  const {manifest} = context;
  validatePreparedContinuationManifestBinding(manifest, request);
  if (!same(request.expected_paths, manifestPathScopes(manifest))) throw new OwnerError('CONFLICT', ['CONTINUATION_SCOPE_CONFLICT']);
  holderCheck(context, env);
  let currentMain = continuationCurrentMain(manifest, {profile, runner});
  let state = classifyPreparedContinuationState(manifest, request, currentMain, {runner, profile});
  if (state.state !== 'PUSHED') requireGithubWorkflowScope(request.expected_paths, {runner});
  let replay = null;
  let checks = [];
  if (state.state === 'PREPARED') {
    replay = verifyReplayAgainstCurrent(manifest, request, currentMain, {runner});
    checks = runContinuationValidation(manifest, request, {runner, root});
    holderCheck(context, env);
    if (continuationCurrentMain(manifest, {profile, runner}) !== currentMain) throw new OwnerError('CONFLICT', ['CONTINUATION_MAIN_CHANGED']);
    runChecked(runner, 'git', ['-C', manifest.workspace.worktree, '-c', 'user.name=' + FIXED_BOT_NAME, '-c', 'user.email=' + FIXED_BOT_EMAIL,
      'commit', '-m', request.message], {}, 'CONTINUATION_COMMIT_FAILED');
    state = classifyPreparedContinuationState(manifest, request, currentMain, {runner, profile});
    if (state.state !== 'COMMITTED' && state.state !== 'PUSHED') throw new OwnerError('CONFLICT', ['CONTINUATION_COMMIT_READBACK_CONFLICT']);
  }
  if (state.state === 'COMMITTED' && currentMain !== manifest.observedBaseSha) {
    if (!replay) {
      replay = verifyReplayAgainstCurrent(manifest, request, currentMain, {runner, candidateHead:state.candidateHead});
    }
    holderCheck(context, env);
    if (continuationCurrentMain(manifest, {profile, runner}) !== currentMain) throw new OwnerError('CONFLICT', ['CONTINUATION_MAIN_CHANGED']);
    runChecked(runner, 'git', ['-C', manifest.workspace.worktree, '-c', 'user.name=' + FIXED_BOT_NAME, '-c', 'user.email=' + FIXED_BOT_EMAIL,
      'merge', '--no-ff', '--no-edit', currentMain], {}, 'CONTINUATION_CURRENTIZATION_MERGE_FAILED');
    state = classifyPreparedContinuationState(manifest, request, currentMain, {runner, profile});
    if (state.state !== 'CURRENTIZED' && state.state !== 'PUSHED') throw new OwnerError('CONFLICT', ['CONTINUATION_CURRENTIZATION_READBACK_CONFLICT']);
    checks = runContinuationValidation(manifest, request, {runner, root});
  }
  if (state.state === 'COMMITTED' && currentMain === manifest.observedBaseSha) {
    checks = checks.length ? checks : runContinuationValidation(manifest, request, {runner, root});
  }
  if (state.state === 'CURRENTIZED' || state.state === 'COMMITTED') {
    holderCheck(context, env);
    if (continuationCurrentMain(manifest, {profile, runner}) !== currentMain) throw new OwnerError('CONFLICT', ['CONTINUATION_MAIN_CHANGED']);
    runChecked(runner, 'git', ['-C', manifest.workspace.worktree, 'push', 'origin', state.finalHead + ':refs/heads/' + manifest.workspace.branch], {}, 'PUSH_FAILED');
    state = classifyPreparedContinuationState(manifest, request, currentMain, {runner, profile});
    if (state.state !== 'PUSHED') throw new OwnerError('CONFLICT', ['PUSH_READBACK_FAILED']);
  }
  if (state.state !== 'PUSHED') throw new OwnerError('CONFLICT', ['CONTINUATION_STATE_UNSUPPORTED']);
  holderCheck(context, env);
  if (continuationCurrentMain(manifest, {profile, runner}) !== currentMain) throw new OwnerError('CONFLICT', ['CONTINUATION_MAIN_CHANGED']);
  let pr = findExactOpenPr(runner, manifest, prRequest, state.finalHead);
  if (!pr) {
    gh(runner, ['pr', 'create', '--repo', FIXED_REPO, '--base', 'main', '--head', manifest.workspace.branch, '--title', prRequest.title, '--body', prRequest.body], {reason:'PR_CREATE_FAILED'});
    pr = findExactOpenPr(runner, manifest, prRequest, state.finalHead);
    if (!pr) throw new OwnerError('CONFLICT', ['PR_READBACK_MISSING']);
  }
  holderCheck(context, env);
  return output('PASS', [], {
    route:manifest.route, executor:manifest.executor, base_sha:manifest.observedBaseSha, current_main:currentMain,
    branch:manifest.workspace.branch, changed_paths:request.expected_paths, prepared_digest:request.prepared_digest,
    replay_patch_id:replay?.patchId || null, candidate_head:state.candidateHead, new_head:state.finalHead,
    currentized:currentMain !== manifest.observedBaseSha, pr_number:pr.number, validation_checks:checks,
    next_legal_action:'RELEASE_D013_THEN_RELEASE_HOLDER_THEN_D014_COMPLETE',
  });
}

function fixedValidationChecks(request) {
  const checks = [
    ['owner-source-syntax', ['--check', 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs']],
    ['owner-contract', ['--test', 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/tests/test-mcl-l-repository-owner.cjs']],
    ['task-lease-contract', ['--test', 'products/chatgpt-mobile-coder-lab/coordination/tests/test-task-lease.cjs']],
    ['task-handoff-contract', ['--test', 'products/chatgpt-mobile-coder-lab/coordination/tests/test-task-handoff.cjs']],
    ['workspace-holder-contract', ['--test', 'products/chatgpt-mobile-coder-lab/coordination/tests/test-workspace-holder.cjs']],
  ];
  const already = new Set(checks.map((row) => row[1][1]));
  for (const item of request.expected_paths) {
    if (item.endsWith('.cjs') && !already.has(item)) {
      checks.push(['changed-cjs-syntax:' + item, ['--check', item]]);
    }
  }
  return checks;
}

function runFixedValidation(manifest, request, {runner = defaultRunner} = {}) {
  const passed = [];
  for (const [name, args] of fixedValidationChecks(request)) {
    const result = runner(process.execPath, args, {
      cwd: manifest.workspace.worktree,
      env: safeChildEnv(),
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    if (result.error || result.signal || result.code !== 0) {
      throw new OwnerError('BLOCKED', ['VALIDATION_FAILED:' + name]);
    }
    passed.push(name);
  }
  return passed;
}

function parseOpenPr(runner, manifest, prRequest, expectedHead) {
  const raw = gh(runner, [
    'pr', 'list', '--repo', FIXED_REPO, '--state', 'open',
    '--head', manifest.workspace.branch,
    '--json', 'number,title,body,isDraft,headRefName,headRefOid,baseRefName',
  ], {reason:'PR_READBACK_FAILED'});
  let rows;
  try { rows = JSON.parse(raw); } catch { throw new OwnerError('UNKNOWN', ['PR_READBACK_JSON_INVALID']); }
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new OwnerError('CONFLICT', ['PR_READBACK_COUNT_INVALID']);
  }
  const row = rows[0];
  if (!Number.isInteger(row.number) || row.isDraft !== false
      || row.headRefName !== manifest.workspace.branch
      || row.headRefOid !== expectedHead || row.baseRefName !== 'main'
      || row.title !== prRequest.title || row.body !== prRequest.body) {
    throw new OwnerError('CONFLICT', ['PR_READBACK_IDENTITY_CONFLICT']);
  }
  return row;
}

function executeApply(context, request, patchBytes, prRequest, {
  profile = DEFAULT_PROFILE,
  runner = defaultRunner,
  env = process.env,
} = {}) {
  const {manifest} = context;
  inspectLanding(manifest, {profile, runner});
  const prepared = inspectPreparedWorkspace(manifest, {profile, runner});
  if (prepared.state !== 'PREPARED') throw new OwnerError('BLOCKED', ['WORKSPACE_NOT_PREPARED']);
  if (request.packet_ref !== manifest.packetRef) throw new OwnerError('CONFLICT', ['REQUEST_PACKET_CONFLICT']);
  const scopedPaths = manifestPathScopes(manifest);
  if (!same(request.expected_paths, scopedPaths)) {
    throw new OwnerError('BLOCKED', ['REQUEST_PATH_SCOPE_CONFLICT']);
  }
  if (sha256Bytes(patchBytes) !== request.patch_sha256) {
    throw new OwnerError('CONFLICT', ['PATCH_SHA_CONFLICT']);
  }
  requireGithubWorkflowScope(request.expected_paths, {runner});
  holderCheck(context, env);
  const patchFile = path.join(manifest.workspace.worktree, '.git-mcl-l-owner.patch.tmp');
  if (fs.existsSync(patchFile)) throw new OwnerError('CONFLICT', ['PATCH_TEMP_ALREADY_EXISTS']);
  fs.writeFileSync(patchFile, patchBytes, {mode:0o600, flag:'wx'});
  try {
    runChecked(runner, 'git', ['-C', manifest.workspace.worktree, 'apply', '--check', patchFile],
      {}, 'PATCH_DOES_NOT_APPLY');
    runChecked(runner, 'git', ['-C', manifest.workspace.worktree, 'apply', '--index', patchFile],
      {}, 'PATCH_APPLY_FAILED');
  } finally {
    try { fs.unlinkSync(patchFile); } catch {}
  }
  if (!same(stagedPaths(runner, manifest.workspace.worktree), request.expected_paths)) {
    throw new OwnerError('CONFLICT', ['CHANGED_PATH_MISMATCH']);
  }
  validateStagedModes(runner, manifest.workspace.worktree, request.expected_paths);
  runChecked(runner, 'git', ['-C', manifest.workspace.worktree, 'diff', '--cached', '--check'],
    {}, 'PATCH_DIFF_CHECK_FAILED');
  ensureNoResidue(runner, manifest.workspace.worktree);
  const preparedDigest = stagedDigest(runner, manifest.workspace.worktree);
  holderCheck(context, env);
  const checks = runFixedValidation(manifest, request, {runner});
  holderCheck(context, env);
  inspectLanding(manifest, {profile, runner});
  runChecked(runner, 'git', [
    '-C', manifest.workspace.worktree,
    '-c', 'user.name=' + FIXED_BOT_NAME,
    '-c', 'user.email=' + FIXED_BOT_EMAIL,
    'commit', '-m', request.message,
  ], {}, 'COMMIT_FAILED');
  const newHead = git(runner, manifest.workspace.worktree, ['rev-parse', 'HEAD']).trim();
  const parent = git(runner, manifest.workspace.worktree, ['rev-parse', 'HEAD^']).trim();
  if (!SHA40_RE.test(newHead) || parent !== manifest.observedBaseSha) {
    throw new OwnerError('CONFLICT', ['COMMIT_SHAPE_INVALID']);
  }
  ensureNoResidue(runner, manifest.workspace.worktree);
  if (stagedPaths(runner, manifest.workspace.worktree).length) {
    throw new OwnerError('CONFLICT', ['INDEX_NOT_CLEAN_AFTER_COMMIT']);
  }
  const committed = git(runner, manifest.workspace.worktree,
    ['diff', '--binary', manifest.observedBaseSha, newHead, '--']);
  if (sha256Bytes(Buffer.from(committed, 'utf8')) !== preparedDigest) {
    throw new OwnerError('CONFLICT', ['COMMITTED_DIGEST_CONFLICT']);
  }
  holderCheck(context, env);
  inspectLanding(manifest, {profile, runner});
  const beforePush = remoteBranchHead(runner, profile.landing, manifest.workspace.branch);
  if (beforePush !== manifest.observedBaseSha) {
    throw new OwnerError('CONFLICT', ['REMOTE_HEAD_MOVED']);
  }
  runChecked(runner, 'git', [
    '-C', manifest.workspace.worktree, 'push', 'origin',
    newHead + ':refs/heads/' + manifest.workspace.branch,
  ], {}, 'PUSH_FAILED');
  const afterPush = remoteBranchHead(runner, profile.landing, manifest.workspace.branch);
  if (afterPush !== newHead) throw new OwnerError('CONFLICT', ['PUSH_READBACK_FAILED']);
  holderCheck(context, env);
  inspectLanding(manifest, {profile, runner});
  gh(runner, [
    'pr', 'create', '--repo', FIXED_REPO, '--base', 'main',
    '--head', manifest.workspace.branch, '--title', prRequest.title,
    '--body', prRequest.body,
  ], {reason:'PR_CREATE_FAILED'});
  const pr = parseOpenPr(runner, manifest, prRequest, newHead);
  holderCheck(context, env);
  return output('PASS', [], {
    route: manifest.route,
    executor: manifest.executor,
    base_sha: manifest.observedBaseSha,
    branch: manifest.workspace.branch,
    changed_paths: request.expected_paths,
    patch_sha256: request.patch_sha256,
    prepared_digest: preparedDigest,
    new_head: newHead,
    pr_number: pr.number,
    validation_checks: checks,
    next_legal_action: 'RELEASE_D013_THEN_RELEASE_HOLDER_THEN_D014_COMPLETE',
  });
}

function inspect(context, {profile = DEFAULT_PROFILE, runner = defaultRunner} = {}) {
  const {manifest} = context;
  const landing = inspectLanding(manifest, {profile, runner});
  const workspace = inspectPreparedWorkspace(manifest, {profile, runner});
  const holderInfo = workspace.state === 'PREPARED'
    ? workspaceHolder.inspectWorkspace(manifest)
    : {ok:false, holderPath:null};
  let holderState = 'NOT_APPLICABLE';
  if (workspace.state === 'PREPARED' && holderInfo.ok) {
    holderState = fs.existsSync(holderInfo.holderPath) ? 'PRESENT' : 'ABSENT';
  }
  return output('PASS', [], {
    route: manifest.route,
    executor: manifest.executor,
    base_sha: manifest.observedBaseSha,
    landing_state: 'CURRENT',
    workspace_state: workspace.state,
    holder_state: holderState,
    protected_main: landing.main,
    next_legal_action: workspace.state === 'ABSENT'
      ? 'PREPARE_WORKSPACE'
      : holderState === 'ABSENT' ? 'CLAIM_WORKSPACE_HOLDER' : 'APPLY',
  });
}

function parseArgs(argv) {
  const operation = argv[0];
  const allowedByOperation = {
    inspect: new Set(['manifest','ledger','packet']),
    'prepare-workspace': new Set(['manifest','ledger','packet']),
    apply: new Set(['manifest','ledger','packet','request','patch','pr-request']),
    'continue-prepared': new Set(['manifest','ledger','packet','continuation-request','pr-request']),
  };
  if (!allowedByOperation[operation]) throw new OwnerError('UNKNOWN', ['OPERATION_UNSUPPORTED']);
  const values = {};
  let apply = false;
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      if (apply) throw new OwnerError('UNKNOWN', ['ARGUMENT_DUPLICATE:apply']);
      apply = true;
      continue;
    }
    if (!token.startsWith('--') || index + 1 >= argv.length) throw new OwnerError('UNKNOWN', ['ARGUMENT_INVALID']);
    const key = token.slice(2);
    if (!allowedByOperation[operation].has(key)) throw new OwnerError('UNKNOWN', ['ARGUMENT_UNSUPPORTED:' + key]);
    if (Object.prototype.hasOwnProperty.call(values, key)) throw new OwnerError('UNKNOWN', ['ARGUMENT_DUPLICATE:' + key]);
    values[key] = argv[++index];
  }
  return {operation, values, apply};
}

function requiredEvidence(values) {
  for (const key of ['manifest', 'ledger', 'packet']) {
    if (!values[key]) throw new OwnerError('UNKNOWN', ['ARGUMENT_REQUIRED:' + key]);
  }
}

function runCli(argv = process.argv.slice(2), env = process.env, options = {}) {
  const {operation, values, apply} = parseArgs(argv);
  requiredEvidence(values);
  const context = evidenceContext({
    manifestPath: values.manifest,
    ledgerPath: values.ledger,
    packetPath: values.packet,
    profile: options.profile || DEFAULT_PROFILE,
  });
  let result;
  if (operation === 'inspect') {
    if (apply) throw new OwnerError('UNKNOWN', ['APPLY_FLAG_FORBIDDEN']);
    result = inspect(context, options);
  } else if (operation === 'prepare-workspace') {
    if (!apply) throw new OwnerError('BLOCKED', ['APPLY_FLAG_REQUIRED']);
    result = prepareWorkspace(context, options);
  } else if (operation === 'apply') {
    if (!apply) throw new OwnerError('BLOCKED', ['APPLY_FLAG_REQUIRED']);
    for (const key of ['request', 'patch', 'pr-request']) {
      if (!values[key]) throw new OwnerError('UNKNOWN', ['ARGUMENT_REQUIRED:' + key]);
    }
    const requestBytes = readRegular(values.request, 'REQUEST_FILE');
    const patchBytes = readRegular(values.patch, 'PATCH_FILE', MAX_PATCH_BYTES);
    const prBytes = readRegular(values['pr-request'], 'PR_REQUEST_FILE');
    const request = parseRequestText(requestBytes.toString('utf8'));
    const prRequest = parsePrRequestText(prBytes.toString('utf8'), request.packet_ref);
    result = executeApply(context, request, patchBytes, prRequest, {...options, env});
  } else if (operation === 'continue-prepared') {
    if (!apply) throw new OwnerError('BLOCKED', ['APPLY_FLAG_REQUIRED']);
    for (const key of ['continuation-request', 'pr-request']) {
      if (!values[key]) throw new OwnerError('UNKNOWN', ['ARGUMENT_REQUIRED:' + key]);
    }
    const requestBytes = readRegular(values['continuation-request'], 'CONTINUATION_REQUEST_FILE');
    const prBytes = readRegular(values['pr-request'], 'PR_REQUEST_FILE');
    const request = parsePreparedContinuationRequestText(requestBytes.toString('utf8'));
    const prRequest = parsePrRequestText(prBytes.toString('utf8'), context.manifest.packetRef);
    result = executePreparedContinuation(context, request, prRequest, {...options, env});
  } else {
    throw new OwnerError('UNKNOWN', ['OPERATION_UNSUPPORTED']);
  }
  return {code: result.status === 'PASS' || result.status === 'PREPARED' ? 0 : 2,
    text: JSON.stringify(result) + '\n'};
}

if (require.main === module) {
  try {
    const {code, text} = runCli();
    process.stdout.write(text);
    process.exitCode = code;
  } catch (error) {
    const kind = error instanceof OwnerError ? error.kind : 'UNKNOWN';
    const reasons = error instanceof OwnerError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
    process.stdout.write(JSON.stringify(output(kind, reasons)) + '\n');
    process.exitCode = kind === 'UNKNOWN' ? 3 : 2;
  }
}

module.exports = {
  BLOCKER_REPAIR_REF_PREFIX,
  CONTINUATION_REQUEST_SCHEMA,
  DEFAULT_PROFILE,
  FALSE_AUTHORITY,
  FIXED_BOT_EMAIL,
  FIXED_BOT_NAME,
  FIXED_EXECUTOR,
  FIXED_LANDING,
  FIXED_REPO,
  FIXED_ROUTE,
  FIXED_WORKTREE_ROOT,
  MAX_PATCH_BYTES,
  OUTPUT_SCHEMA,
  OwnerError,
  PR_REQUEST_SCHEMA,
  REQUEST_SCHEMA,
  evidenceContext,
  classifyPreparedContinuationState,
  continuationCurrentMain,
  executeApply,
  executePreparedContinuation,
  fixedValidationChecks,
  inspect,
  inspectLanding,
  inspectPreparedWorkspace,
  manifestPathScopes,
  output,
  parseArgs,
  parsePreparedContinuationRequestText,
  parseManifestText,
  parsePrRequestText,
  parseRequestText,
  parseGithubOauthScopes,
  prepareWorkspace,
  requireGithubWorkflowScope,
  requiresWorkflowOauthScope,
  protectedMain,
  runContinuationValidation,
  runCli,
  sha256Bytes,
  validateBranch,
  validateManifestShape,
  validatePreparedContinuationManifestBinding,
  verifyReplayAgainstCurrent,
  validateRepoPath,
  validateWorktreePath,
  WORKFLOW_PATH_PREFIX,
};
