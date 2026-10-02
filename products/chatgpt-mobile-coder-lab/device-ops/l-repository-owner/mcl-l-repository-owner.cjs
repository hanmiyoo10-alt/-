#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
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
  if (head !== manifest.observedBaseSha) reasons.push('LANDING_HEAD_STALE');
  if (liveRemote !== manifest.observedBaseSha) reasons.push('REMOTE_MAIN_STALE');
  if (main !== manifest.observedBaseSha) reasons.push('PROTECTED_MAIN_STALE');
  const object = runner('git', ['-C', profile.landing, 'cat-file', '-e', manifest.observedBaseSha + '^{commit}'], {env:safeChildEnv()});
  if (object.error || object.signal || object.code !== 0) reasons.push('BASE_OBJECT_MISSING');
  if (reasons.length) throw new OwnerError('BLOCKED', reasons);
  return {main, head, remoteMain: liveRemote};
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
  const values = {};
  let apply = false;
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      if (apply) throw new OwnerError('UNKNOWN', ['ARGUMENT_DUPLICATE:apply']);
      apply = true;
      continue;
    }
    if (!token.startsWith('--') || index + 1 >= argv.length) {
      throw new OwnerError('UNKNOWN', ['ARGUMENT_INVALID']);
    }
    const key = token.slice(2);
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      throw new OwnerError('UNKNOWN', ['ARGUMENT_DUPLICATE:' + key]);
    }
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
  executeApply,
  fixedValidationChecks,
  inspect,
  inspectPreparedWorkspace,
  manifestPathScopes,
  output,
  parseArgs,
  parseManifestText,
  parsePrRequestText,
  parseRequestText,
  prepareWorkspace,
  protectedMain,
  runCli,
  sha256Bytes,
  validateBranch,
  validateManifestShape,
  validateRepoPath,
  validateWorktreePath,
};
