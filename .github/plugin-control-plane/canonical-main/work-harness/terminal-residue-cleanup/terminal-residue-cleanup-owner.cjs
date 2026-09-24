#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const packetProjection = require('../../work-system/packet-projection.cjs');
const executionReceipt = require('../execution-receipt.cjs');
const agentDecisionView = require('../agent-decision-view.cjs');
const {canonicalize, stableHash} = require('../handoff.cjs');

const REPO = 'hanmiyoo10-alt/-';
const OWNER = 'hanmiyoo10-alt';
const PROFILE = Object.freeze({
  controlRepo: '/root/nyang-repo',
  worktreeRoot: '/root/nyang-worktrees',
  remote: 'origin',
  branchPrefix: 'server/',
  permanentBranch: 'server/work',
});
const EVIDENCE_DIRS = Object.freeze([
  'validation-attention-evidence',
  'validation-continuation-evidence',
  'validation-merge-evidence',
]);
const MAX_EVIDENCE_FILES = 32;
const MAX_EVIDENCE_FILE_BYTES = 64 * 1024;
const MAX_EVIDENCE_TOTAL_BYTES = 512 * 1024;
const MAX_REPORT_BYTES = 32 * 1024;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SAFE_TAIL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

class CleanupError extends Error {
  constructor(kind, reasonCodes, locator = null) {
    const unique = [...new Set(reasonCodes || [])].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
    this.locator = locator;
  }
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function sha256File(filePath) {
  return sha256Bytes(fs.readFileSync(filePath));
}
function unique(values) {
  return [...new Set(values)].sort();
}
function same(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}
function safeTail(branch) {
  if (typeof branch !== 'string' || !branch.startsWith(PROFILE.branchPrefix)) return null;
  if (branch === PROFILE.permanentBranch) return null;
  const tail = branch.slice(PROFILE.branchPrefix.length);
  return SAFE_TAIL_RE.test(tail) ? tail : null;
}
function modeOf(stat) {
  return stat.mode & 0o777;
}
function ensureDirMode(dirPath, mode = 0o700) {
  fs.mkdirSync(dirPath, {recursive: true, mode});
  fs.chmodSync(dirPath, mode);
}
function commandResult(executable, args, {cwd = null} = {}) {
  const result = childProcess.spawnSync(executable, args, {
    cwd: cwd || undefined,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    code: result.status === null ? 1 : result.status,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  };
}
function mustRun(runner, executable, args, options, reasonCode) {
  const result = runner(executable, args, options);
  if (result.code !== 0) {
    throw new CleanupError('UNKNOWN', [reasonCode]);
  }
  return result.stdout.trim();
}
function gitRead(profile, runner, args, cwd = null, reasonCode = 'GIT_READ_FAILED') {
  return mustRun(runner, 'git', args, {cwd: cwd || profile.controlRepo}, reasonCode);
}
function gitEffect(profile, runner, args, cwd = null, reasonCode = 'GIT_EFFECT_FAILED') {
  const result = runner('git', args, {cwd: cwd || profile.controlRepo});
  if (result.code !== 0) {
    throw new CleanupError('CONFLICT', [reasonCode]);
  }
  return result.stdout.trim();
}
function parseJson(text, reasonCode) {
  try {
    return JSON.parse(text);
  } catch {
    throw new CleanupError('UNKNOWN', [reasonCode]);
  }
}
function ghJson(runner, endpoint, fields = []) {
  const args = ['api', '-X', 'GET', endpoint];
  for (const [key, value] of fields) args.push('-f', key + '=' + value);
  const result = runner('gh', args, {cwd: PROFILE.controlRepo});
  if (result.code !== 0) {
    throw new CleanupError('UNKNOWN', ['GITHUB_READ_FAILED'], endpoint);
  }
  return parseJson(result.stdout, 'GITHUB_JSON_INVALID');
}
function createLiveAdapter({runner = commandResult} = {}) {
  return {
    async readMainAndOps() {
      const branch = ghJson(runner, 'repos/' + REPO + '/branches/main');
      const issue = ghJson(runner, 'repos/' + REPO + '/issues/485');
      return {branch, issue};
    },
    async readPacket(packetNumber) {
      return ghJson(runner, 'repos/' + REPO + '/issues/' + packetNumber);
    },
    async readPr(prNumber) {
      return ghJson(runner, 'repos/' + REPO + '/pulls/' + prNumber);
    },
    async compare(base, head) {
      return ghJson(runner, 'repos/' + REPO + '/compare/' + base + '...' + head);
    },
    async openPrsForBranch(branch) {
      return ghJson(runner, 'repos/' + REPO + '/pulls', [
        ['state', 'open'],
        ['head', OWNER + ':' + branch],
        ['per_page', '100'],
      ]);
    },
  };
}
function mainOpsFacts(raw) {
  const mainSha = raw?.branch?.commit?.sha;
  const body = String(raw?.issue?.body || '');
  const match = body.match(/- MAIN: `([0-9a-f]{40})` \/ Required PASS — run ([0-9]+)/);
  if (!SHA40_RE.test(String(mainSha || '')) || !match) {
    throw new CleanupError('UNKNOWN', ['MAIN_OPS_IDENTITY_UNKNOWN'], 'issue:#485');
  }
  if (match[1] !== mainSha) {
    throw new CleanupError('UNKNOWN', ['MAIN_OPS_SETTLING'], 'issue:#485');
  }
  if (!body.includes('- STATE: `CLEAR`')
      || !body.includes('Convergence: `STABLE`')
      || !body.includes('- UNKNOWN: NONE')) {
    throw new CleanupError('UNKNOWN', ['MAIN_OPS_NOT_HEALTHY'], 'issue:#485');
  }
  const productionMatch = body.includes('AUTHORITY: Production MATCH')
    || body.includes('Production authority: MATCH');
  if (!productionMatch) {
    throw new CleanupError('UNKNOWN', ['PRODUCTION_IDENTITY_NOT_MATCH'], 'issue:#485');
  }
  return {mainSha, requiredRunId: Number(match[2])};
}
function packetFacts(issue, packetNumber) {
  if (!issue || Number(issue.number) !== packetNumber) {
    throw new CleanupError('CONFLICT', ['PACKET_IDENTITY_CONFLICT'], 'issue:#' + packetNumber);
  }
  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition === 'CONFLICT') {
    throw new CleanupError('CONFLICT', projection.reasonCodes.length
      ? projection.reasonCodes : ['PACKET_PROJECTION_CONFLICT'], 'issue:#' + packetNumber);
  }
  if (projection.disposition !== 'PASS') {
    throw new CleanupError('UNKNOWN', projection.reasonCodes.length
      ? projection.reasonCodes : ['PACKET_PROJECTION_UNKNOWN'], 'issue:#' + packetNumber);
  }
  const nativeClosed = issue.state === 'closed';
  if (nativeClosed !== (projection.lifecycle === 'DONE')) {
    throw new CleanupError('CONFLICT', ['PACKET_NATIVE_LIFECYCLE_CONFLICT'], 'issue:#' + packetNumber);
  }
  if (!nativeClosed || projection.lifecycle !== 'DONE') {
    throw new CleanupError('BLOCKED', ['PACKET_NOT_TERMINAL'], 'issue:#' + packetNumber);
  }
  return {projection};
}
function prFacts(pr, prNumber) {
  if (!pr || Number(pr.number) !== prNumber) {
    throw new CleanupError('CONFLICT', ['PR_IDENTITY_CONFLICT'], 'pr:#' + prNumber);
  }
  if (pr.state !== 'closed' || pr.merged !== true) {
    throw new CleanupError('BLOCKED', ['PR_NOT_MERGED'], 'pr:#' + prNumber);
  }
  if (pr.base?.ref !== 'main') {
    throw new CleanupError('BLOCKED', ['PR_BASE_NOT_MAIN'], 'pr:#' + prNumber);
  }
  if (pr.head?.repo?.full_name !== REPO) {
    throw new CleanupError('BLOCKED', ['PR_HEAD_REPOSITORY_UNSUPPORTED'], 'pr:#' + prNumber);
  }
  const branch = pr.head?.ref;
  const candidateHead = pr.head?.sha;
  const mergeCommit = pr.merge_commit_sha;
  const tail = safeTail(branch);
  if (!tail) {
    throw new CleanupError('BLOCKED', [
      branch === PROFILE.permanentBranch ? 'PERMANENT_BRANCH_DENIED' : 'PR_HEAD_BRANCH_UNSUPPORTED',
    ], 'pr:#' + prNumber);
  }
  if (!SHA40_RE.test(String(candidateHead || '')) || !SHA40_RE.test(String(mergeCommit || ''))) {
    throw new CleanupError('UNKNOWN', ['PR_COMMIT_IDENTITY_UNKNOWN'], 'pr:#' + prNumber);
  }
  return {branch, tail, candidateHead, mergeCommit};
}
function compareRetained(compare, base, head, locator) {
  if (!compare || compare?.base_commit?.sha !== base
      || !SHA40_RE.test(String(compare?.merge_base_commit?.sha || ''))
      || typeof compare.status !== 'string') {
    throw new CleanupError('UNKNOWN', ['COMPARE_IDENTITY_UNKNOWN'], locator);
  }
  const status = compare.status.toLowerCase();
  const retained = compare.merge_base_commit.sha === base
    && (status === 'ahead' || status === 'identical');
  if (!retained) {
    throw new CleanupError('BLOCKED', ['CANDIDATE_NOT_RETAINED_BY_MAIN'], locator);
  }
  return {status, mergeBase: compare.merge_base_commit.sha};
}
function parseWorktreeList(text) {
  const blocks = String(text || '').trim().split(/\n\n+/).filter(Boolean);
  return blocks.map((block) => {
    const row = {};
    for (const line of block.split('\n')) {
      const [key, ...rest] = line.split(' ');
      if (key === 'worktree') row.worktree = rest.join(' ');
      else if (key === 'HEAD') row.head = rest.join(' ');
      else if (key === 'branch') row.branch = rest.join(' ').replace(/^refs\/heads\//, '');
      else if (key === 'detached') row.detached = true;
    }
    return row;
  });
}
function commonGitDir(profile, runner) {
  const raw = gitRead(profile, runner, ['rev-parse', '--git-common-dir']);
  return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(profile.controlRepo, raw);
}
function exactTarget(profile, branch) {
  const tail = safeTail(branch);
  if (!tail) throw new CleanupError('BLOCKED', ['PR_HEAD_BRANCH_UNSUPPORTED']);
  const target = path.resolve(profile.worktreeRoot, tail);
  if (path.dirname(target) !== path.resolve(profile.worktreeRoot)) {
    throw new CleanupError('CONFLICT', ['WORKTREE_PATH_ESCAPE']);
  }
  return {tail, target};
}
function localRefState(profile, runner, branch, expectedHead) {
  const ref = 'refs/heads/' + branch;
  const result = runner('git', ['-C', profile.controlRepo, 'show-ref', '--verify', '--hash', ref], {});
  if (result.code !== 0) return {state: 'ABSENT', sha: null, ref};
  const sha = result.stdout.trim();
  if (!SHA40_RE.test(sha)) throw new CleanupError('UNKNOWN', ['LOCAL_REF_UNKNOWN'], 'ref:' + branch);
  if (sha !== expectedHead) throw new CleanupError('CONFLICT', ['LOCAL_REF_HEAD_CONFLICT'], 'ref:' + branch);
  return {state: 'EXACT', sha, ref};
}
function remoteRefState(profile, runner, branch, expectedHead) {
  const ref = 'refs/heads/' + branch;
  const result = runner('git', ['-C', profile.controlRepo, 'ls-remote', '--heads', profile.remote, ref], {});
  if (result.code !== 0) throw new CleanupError('UNKNOWN', ['REMOTE_REF_READ_FAILED'], 'remote-ref:' + branch);
  const lines = result.stdout.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return {state: 'ABSENT', sha: null, ref};
  if (lines.length !== 1) throw new CleanupError('CONFLICT', ['REMOTE_REF_AMBIGUOUS'], 'remote-ref:' + branch);
  const sha = lines[0].split(/\s+/)[0];
  if (!SHA40_RE.test(sha)) throw new CleanupError('UNKNOWN', ['REMOTE_REF_UNKNOWN'], 'remote-ref:' + branch);
  if (sha !== expectedHead) throw new CleanupError('CONFLICT', ['REMOTE_REF_HEAD_CONFLICT'], 'remote-ref:' + branch);
  return {state: 'EXACT', sha, ref};
}
function worktreeState(profile, runner, branch, expectedHead) {
  const {tail, target} = exactTarget(profile, branch);
  const list = parseWorktreeList(gitRead(profile, runner, ['worktree', 'list', '--porcelain']));
  const registered = list.find((row) => path.resolve(row.worktree || '') === target) || null;
  const exists = fs.existsSync(target);
  if (exists !== Boolean(registered)) {
    throw new CleanupError('CONFLICT', ['WORKTREE_REGISTRATION_CONFLICT'], 'worktree:' + tail);
  }
  if (!exists) return {state: 'ABSENT', tail, target, gitDir: null};

  const st = fs.lstatSync(target);
  if (st.isSymbolicLink() || !st.isDirectory()) {
    throw new CleanupError('CONFLICT', ['WORKTREE_PATH_INVALID'], 'worktree:' + tail);
  }
  const real = fs.realpathSync(target);
  if (path.dirname(real) !== fs.realpathSync(profile.worktreeRoot)) {
    throw new CleanupError('CONFLICT', ['WORKTREE_PATH_ESCAPE'], 'worktree:' + tail);
  }
  if (registered.branch !== branch || registered.head !== expectedHead) {
    throw new CleanupError('CONFLICT', ['WORKTREE_IDENTITY_CONFLICT'], 'worktree:' + tail);
  }
  const branchRead = gitRead(profile, runner, ['branch', '--show-current'], target);
  const headRead = gitRead(profile, runner, ['rev-parse', 'HEAD'], target);
  if (branchRead !== branch || headRead !== expectedHead) {
    throw new CleanupError('CONFLICT', ['WORKTREE_IDENTITY_CONFLICT'], 'worktree:' + tail);
  }
  const status = gitRead(profile, runner, [
    'status', '--porcelain=v1', '--untracked-files=all', '--ignored=matching',
  ], target);
  if (status.trim()) {
    throw new CleanupError('BLOCKED', ['WORKTREE_DIRTY'], 'worktree:' + tail);
  }
  const gitDir = gitRead(profile, runner, ['rev-parse', '--absolute-git-dir'], target);
  const holder = path.join(gitDir, 'mcl-workspace-holder.v1.json');
  if (fs.existsSync(holder)) {
    throw new CleanupError('BLOCKED', ['WORKSPACE_HOLDER_PRESENT'], 'worktree:' + tail);
  }
  return {state: 'PRESENT', tail, target, gitDir};
}
function inventoryEvidence(gitDir, packetNumber, prNumber) {
  if (!gitDir) return null;
  const prefix = 'packet-' + packetNumber + '-pr-' + prNumber + '.';
  const files = [];
  const unknownDirs = [];
  for (const entry of fs.readdirSync(gitDir, {withFileTypes: true})) {
    if (!entry.isDirectory() || !entry.name.endsWith('-evidence')) continue;
    const dir = path.join(gitDir, entry.name);
    const packetFiles = fs.readdirSync(dir, {withFileTypes: true})
      .filter((item) => item.name.startsWith(prefix));
    if (!packetFiles.length) continue;
    if (!EVIDENCE_DIRS.includes(entry.name)) {
      unknownDirs.push(entry.name);
      continue;
    }
    for (const item of packetFiles) {
      const filePath = path.join(dir, item.name);
      const st = fs.lstatSync(filePath);
      if (st.isSymbolicLink() || !st.isFile()) {
        throw new CleanupError('UNKNOWN', ['EVIDENCE_FILE_NOT_REGULAR'],
          'evidence:' + entry.name + '/' + item.name);
      }
      if (modeOf(st) !== 0o600) {
        throw new CleanupError('UNKNOWN', ['EVIDENCE_FILE_MODE_INVALID'],
          'evidence:' + entry.name + '/' + item.name);
      }
      if (st.size > MAX_EVIDENCE_FILE_BYTES) {
        throw new CleanupError('UNKNOWN', ['EVIDENCE_FILE_TOO_LARGE'],
          'evidence:' + entry.name + '/' + item.name);
      }
      files.push({
        path: entry.name + '/' + item.name,
        bytes: st.size,
        sha256: sha256File(filePath),
        sourcePath: filePath,
      });
    }
  }
  if (unknownDirs.length) {
    throw new CleanupError('UNKNOWN', ['UNRECOGNIZED_PACKET_EVIDENCE_DIRECTORY'],
      'evidence-dir:' + unknownDirs.sort()[0]);
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  if (!files.length) {
    throw new CleanupError('UNKNOWN', ['PACKET_EVIDENCE_MISSING']);
  }
  if (files.length > MAX_EVIDENCE_FILES) {
    throw new CleanupError('UNKNOWN', ['EVIDENCE_FILE_COUNT_EXCEEDED']);
  }
  const totalBytes = files.reduce((sum, row) => sum + row.bytes, 0);
  if (totalBytes > MAX_EVIDENCE_TOTAL_BYTES) {
    throw new CleanupError('UNKNOWN', ['EVIDENCE_TOTAL_TOO_LARGE']);
  }
  const seen = new Set();
  for (const row of files) {
    if (seen.has(row.path)) throw new CleanupError('CONFLICT', ['EVIDENCE_DUPLICATE_PATH']);
    seen.add(row.path);
  }
  return {files, totalBytes};
}
function archivePath(commonDir, packetNumber, prNumber) {
  return path.join(commonDir, 'canonical-main-evidence-archive',
    'packet-' + packetNumber + '-pr-' + prNumber);
}
function manifestBase(packetNumber, prNumber, candidateHead, mergeCommit, files) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_TERMINAL_EVIDENCE_ARCHIVE',
    packetRef: '#' + packetNumber,
    prRef: '#' + prNumber,
    candidateHead,
    mergeCommit,
    fileCount: files.length,
    files: files.map(({path: rel, bytes, sha256}) => ({path: rel, bytes, sha256})),
  };
}
function buildManifest(packetNumber, prNumber, candidateHead, mergeCommit, files) {
  const base = manifestBase(packetNumber, prNumber, candidateHead, mergeCommit, files);
  return {...base, archiveDigest: stableHash(base)};
}
function validateManifestShape(value, packetNumber, prNumber, candidateHead, mergeCommit) {
  const keys = Object.keys(value || {}).sort();
  const expectedKeys = [
    'archiveDigest', 'candidateHead', 'fileCount', 'files', 'mergeCommit',
    'mode', 'packetRef', 'prRef', 'schemaVersion',
  ].sort();
  if (!same(keys, expectedKeys)) throw new CleanupError('CONFLICT', ['ARCHIVE_MANIFEST_SHAPE_CONFLICT']);
  if (value.schemaVersion !== 1 || value.mode !== 'CANONICAL_MAIN_TERMINAL_EVIDENCE_ARCHIVE'
      || value.packetRef !== '#' + packetNumber || value.prRef !== '#' + prNumber
      || value.candidateHead !== candidateHead || value.mergeCommit !== mergeCommit
      || !Array.isArray(value.files) || value.fileCount !== value.files.length
      || typeof value.archiveDigest !== 'string') {
    throw new CleanupError('CONFLICT', ['ARCHIVE_MANIFEST_IDENTITY_CONFLICT']);
  }
  if (value.archiveDigest !== stableHash(manifestBase(
    packetNumber, prNumber, candidateHead, mergeCommit, value.files))) {
    throw new CleanupError('CONFLICT', ['ARCHIVE_DIGEST_CONFLICT']);
  }
}
function verifyArchive(root, packetNumber, prNumber, candidateHead, mergeCommit, expectedInventory = null) {
  if (!fs.existsSync(root)) return {state: 'ABSENT'};
  const rootStat = fs.lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory() || modeOf(rootStat) !== 0o700) {
    throw new CleanupError('CONFLICT', ['ARCHIVE_ROOT_INVALID'], 'archive:packet-' + packetNumber);
  }
  const manifestPath = path.join(root, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new CleanupError('CONFLICT', ['ARCHIVE_MANIFEST_MISSING'], 'archive:packet-' + packetNumber);
  }
  const manifestStat = fs.lstatSync(manifestPath);
  if (manifestStat.isSymbolicLink() || !manifestStat.isFile() || modeOf(manifestStat) !== 0o600) {
    throw new CleanupError('CONFLICT', ['ARCHIVE_MANIFEST_INVALID'], 'archive:packet-' + packetNumber);
  }
  const manifest = parseJson(fs.readFileSync(manifestPath, 'utf8'), 'ARCHIVE_MANIFEST_JSON_INVALID');
  validateManifestShape(manifest, packetNumber, prNumber, candidateHead, mergeCommit);
  const rows = [];
  for (const row of manifest.files) {
    if (!row || typeof row.path !== 'string' || path.isAbsolute(row.path)
        || row.path.includes('..') || !EVIDENCE_DIRS.includes(row.path.split('/')[0])
        || !Number.isSafeInteger(row.bytes) || row.bytes < 0
        || !/^[0-9a-f]{64}$/.test(String(row.sha256 || ''))) {
      throw new CleanupError('CONFLICT', ['ARCHIVE_FILE_RECORD_INVALID']);
    }
    const filePath = path.join(root, row.path);
    const st = fs.lstatSync(filePath);
    if (st.isSymbolicLink() || !st.isFile() || modeOf(st) !== 0o600) {
      throw new CleanupError('CONFLICT', ['ARCHIVE_FILE_INVALID'], 'archive:' + row.path);
    }
    if (st.size !== row.bytes || sha256File(filePath) !== row.sha256) {
      throw new CleanupError('CONFLICT', ['ARCHIVE_FILE_IDENTITY_CONFLICT'], 'archive:' + row.path);
    }
    const parent = path.dirname(filePath);
    if (modeOf(fs.statSync(parent)) !== 0o700) {
      throw new CleanupError('CONFLICT', ['ARCHIVE_DIRECTORY_MODE_CONFLICT'], 'archive:' + row.path);
    }
    rows.push({path: row.path, bytes: row.bytes, sha256: row.sha256});
  }
  const actualFiles = [];
  for (const item of walkFiles(root)) actualFiles.push(item);
  const expectedFileCount = manifest.files.length + 1;
  if (actualFiles.length !== expectedFileCount) {
    throw new CleanupError('CONFLICT', ['ARCHIVE_EXTRA_OR_MISSING_FILE']);
  }
  rows.sort((a, b) => a.path.localeCompare(b.path));
  if (expectedInventory) {
    const expected = expectedInventory.files.map(({path: rel, bytes, sha256}) => ({path: rel, bytes, sha256}));
    if (!same(rows, expected)) {
      throw new CleanupError('CONFLICT', ['ARCHIVE_SOURCE_IDENTITY_CONFLICT']);
    }
  }
  return {
    state: 'VERIFIED',
    manifest,
    manifestSha256: sha256File(manifestPath),
    totalBytes: rows.reduce((sum, row) => sum + row.bytes, 0),
  };
}
function* walkFiles(root) {
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const p = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      throw new CleanupError('CONFLICT', ['ARCHIVE_SYMLINK_PRESENT']);
    }
    if (entry.isDirectory()) yield* walkFiles(p);
    else if (entry.isFile()) yield p;
    else throw new CleanupError('CONFLICT', ['ARCHIVE_NONREGULAR_PRESENT']);
  }
}
function publishArchive(root, commonDir, packetNumber, prNumber, candidateHead, mergeCommit, inventory) {
  const finalPath = archivePath(commonDir, packetNumber, prNumber);
  const existing = verifyArchive(finalPath, packetNumber, prNumber, candidateHead, mergeCommit, inventory);
  if (existing.state === 'VERIFIED') return existing;

  const archiveParent = path.dirname(finalPath);
  ensureDirMode(archiveParent, 0o700);
  const tmp = finalPath + '.tmp-' + process.pid;
  if (fs.existsSync(tmp)) fs.rmSync(tmp, {recursive: true, force: true});
  fs.mkdirSync(tmp, {mode: 0o700});
  fs.chmodSync(tmp, 0o700);
  try {
    for (const row of inventory.files) {
      const out = path.join(tmp, row.path);
      ensureDirMode(path.dirname(out), 0o700);
      fs.copyFileSync(row.sourcePath, out);
      fs.chmodSync(out, 0o600);
    }
    const manifest = buildManifest(packetNumber, prNumber, candidateHead, mergeCommit, inventory.files);
    const manifestPath = path.join(tmp, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(canonicalize(manifest), null, 2) + '\n',
      {encoding: 'utf8', mode: 0o600});
    fs.chmodSync(manifestPath, 0o600);
    verifyArchive(tmp, packetNumber, prNumber, candidateHead, mergeCommit, inventory);
    if (fs.existsSync(finalPath)) {
      const raced = verifyArchive(finalPath, packetNumber, prNumber, candidateHead, mergeCommit, inventory);
      fs.rmSync(tmp, {recursive: true, force: true});
      return raced;
    }
    fs.renameSync(tmp, finalPath);
    return verifyArchive(finalPath, packetNumber, prNumber, candidateHead, mergeCommit, inventory);
  } catch (error) {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, {recursive: true, force: true});
    throw error;
  }
}
function errorAxes(error) {
  const kind = error instanceof CleanupError ? error.kind : 'UNKNOWN';
  const reasons = error?.reasonCodes?.length ? error.reasonCodes : ['TERMINAL_CLEANUP_INTERNAL_ERROR'];
  if (kind === 'CONFLICT') return {result: 'CONFLICT', attention: 'CONFLICT', reasons};
  if (kind === 'BLOCKED') return {result: 'BLOCKED', attention: 'BLOCKED', reasons};
  return {result: 'UNKNOWN', attention: 'UNKNOWN', reasons};
}
function makeAttention(receipt, locator) {
  if (receipt.result === 'PASS') return [];
  const severity = receipt.result === 'CONFLICT' ? 'CONFLICT'
    : receipt.result === 'UNKNOWN' ? 'UNKNOWN'
      : receipt.result === 'BLOCKED' ? 'BLOCKER' : 'FAIL';
  return [{
    subject: 'repo:terminal-residue-cleanup',
    reasonCode: receipt.reasonCodes[0] || 'TERMINAL_CLEANUP_ATTENTION',
    severity,
    constraint: 'TERMINAL_RESIDUE_CLEANUP',
    nextPhase: receipt.nextLegalAction,
    locator: locator || 'UNKNOWN',
  }];
}
function makeReceipt({
  operation, packetNumber, prNumber, result, attentionDisposition, reasonCodes = [],
  unknowns = [], conflicts = [], blockers = [], nextLegalAction, output, steps = [],
  artifactLocators = [], counters = {},
}) {
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'repo-terminal-residue-cleanup:' + operation + ':' + packetNumber + ':' + prNumber,
    primitiveId: 'repo:terminal-residue-cleanup-' + operation,
    sourceIdentity: {kind: 'ISSUE', locator: 'issue:#' + packetNumber, identity: String(packetNumber)},
    executionSurface: 'CANONICAL_MAIN:TERMINAL_RESIDUE_CLEANUP',
    stage: 'EXPERIMENT_CLOSE',
    executionLifecycle: 'FINISHED',
    attentionDisposition,
    result,
    proofScope: operation === 'inspect'
      ? 'read-only exact terminal residue classification'
      : 'archive-first exact terminal residue cleanup transaction',
    steps: steps.length ? steps : [{name: 'terminal-residue', result, evidenceLocator: 'issue:#' + packetNumber}],
    counters: [
      {name: 'archive_writes', value: counters.archiveWrites || 0},
      {name: 'worktree_removals', value: counters.worktreeRemovals || 0},
      {name: 'remote_ref_deletes', value: counters.remoteRefDeletes || 0},
      {name: 'local_ref_deletes', value: counters.localRefDeletes || 0},
      {name: 'evidence_files', value: output.fileCount || 0},
    ],
    affectedFiles: [],
    artifactLocators: unique(artifactLocators),
    reasonCodes: unique(reasonCodes),
    requiredUnknowns: unique(unknowns),
    conflicts: unique(conflicts),
    blockers: unique(blockers),
    exitCode: null,
    stderrTail: null,
    nextLegalAction,
  });
}
function reportFromFacts(operation, packetNumber, prNumber, facts, receipt, effects = {}) {
  return {
    schemaVersion: 1,
    mode: 'TERMINAL_RESIDUE_CLEANUP_REPORT',
    operation,
    packetNumber,
    prNumber,
    candidateHead: facts?.candidateHead || null,
    mergeCommit: facts?.mergeCommit || null,
    branch: facts?.branch || null,
    cleanupDisposition: facts?.cleanupDisposition || 'UNKNOWN',
    archiveDigest: facts?.archive?.manifest?.archiveDigest || null,
    manifestSha256: facts?.archive?.manifestSha256 || null,
    evidenceFileCount: facts?.inventory?.files?.length || facts?.archive?.manifest?.fileCount || 0,
    effects: {
      archiveWrites: effects.archiveWrites || 0,
      worktreeRemovals: effects.worktreeRemovals || 0,
      remoteRefDeletes: effects.remoteRefDeletes || 0,
      localRefDeletes: effects.localRefDeletes || 0,
    },
    output: facts?.output || {
      archive: 'UNKNOWN', worktree: 'UNKNOWN', remoteRef: 'UNKNOWN',
      localRef: 'UNKNOWN', residue: 'UNKNOWN',
    },
    reasonCodes: receipt.reasonCodes,
    receiptDigest: receipt.receiptDigest,
  };
}
function outputFor(facts) {
  return {
    archive: facts.archive.state === 'VERIFIED' ? 'VERIFIED'
      : facts.archive.state === 'ABSENT' ? 'ABSENT' : 'UNKNOWN',
    worktree: facts.worktree.state === 'PRESENT' ? 'PRESENT' : 'ABSENT',
    remoteRef: facts.remoteRef.state,
    localRef: facts.localRef.state,
    residue: facts.cleanupDisposition === 'ALREADY_CLEAN' ? 'NONE'
      : facts.cleanupDisposition === 'COMPLETE' ? 'NONE' : 'PRESENT',
    disposition: facts.cleanupDisposition,
    fileCount: facts.inventory?.files?.length || facts.archive?.manifest?.fileCount || 0,
  };
}
function classifyDisposition(worktree, archive, localRef, remoteRef) {
  if (archive.state !== 'VERIFIED') {
    if (worktree.state === 'PRESENT') return 'ARCHIVE_REQUIRED';
    throw new CleanupError('UNKNOWN', ['ARCHIVE_REQUIRED_BUT_SOURCE_WORKTREE_ABSENT']);
  }
  if (worktree.state === 'PRESENT') return 'CLEANUP_READY';
  if (localRef.state === 'ABSENT' && remoteRef.state === 'ABSENT') return 'ALREADY_CLEAN';
  return 'PARTIAL_CLEANUP_RECOVERY';
}
async function collectFacts({
  packetNumber, prNumber, adapter, profile = PROFILE, runner = commandResult,
}) {
  const current = mainOpsFacts(await adapter.readMainAndOps());
  const packet = await adapter.readPacket(packetNumber);
  packetFacts(packet, packetNumber);
  const pr = await adapter.readPr(prNumber);
  const prInfo = prFacts(pr, prNumber);
  const retained = compareRetained(await adapter.compare(prInfo.candidateHead, current.mainSha),
    prInfo.candidateHead, current.mainSha,
    'compare:' + prInfo.candidateHead + '...' + current.mainSha);
  const open = await adapter.openPrsForBranch(prInfo.branch);
  if (!Array.isArray(open)) throw new CleanupError('UNKNOWN', ['OPEN_PR_BRANCH_QUERY_UNKNOWN']);
  const otherOpen = open.filter((row) => Number(row.number) !== prNumber);
  if (otherOpen.length) {
    throw new CleanupError('BLOCKED', ['OPEN_PR_USES_FEATURE_BRANCH'], 'pr:#' + otherOpen[0].number);
  }

  const worktree = worktreeState(profile, runner, prInfo.branch, prInfo.candidateHead);
  const localRef = localRefState(profile, runner, prInfo.branch, prInfo.candidateHead);
  const remoteRef = remoteRefState(profile, runner, prInfo.branch, prInfo.candidateHead);
  if (worktree.state === 'PRESENT' && localRef.state !== 'EXACT') {
    throw new CleanupError('CONFLICT', ['WORKTREE_LOCAL_REF_CONFLICT']);
  }

  const commonDir = commonGitDir(profile, runner);
  const inventory = worktree.state === 'PRESENT'
    ? inventoryEvidence(worktree.gitDir, packetNumber, prNumber) : null;
  const archiveRoot = archivePath(commonDir, packetNumber, prNumber);
  const archive = verifyArchive(
    archiveRoot, packetNumber, prNumber, prInfo.candidateHead, prInfo.mergeCommit, inventory);
  const cleanupDisposition = classifyDisposition(worktree, archive, localRef, remoteRef);
  const facts = {
    ...current,
    ...prInfo,
    packetLifecycle: 'DONE',
    retained,
    worktree,
    localRef,
    remoteRef,
    inventory,
    archive,
    archiveRoot,
    commonDir,
    cleanupDisposition,
  };
  facts.output = outputFor(facts);
  return facts;
}
function errorResult(operation, packetNumber, prNumber, error) {
  const axes = errorAxes(error);
  const locator = error?.locator || 'issue:#' + packetNumber;
  const receipt = makeReceipt({
    operation, packetNumber, prNumber,
    result: axes.result,
    attentionDisposition: axes.attention,
    reasonCodes: axes.reasons,
    unknowns: axes.result === 'UNKNOWN' ? axes.reasons : [],
    conflicts: axes.result === 'CONFLICT' ? axes.reasons : [],
    blockers: axes.result === 'BLOCKED' ? axes.reasons : [],
    nextLegalAction: 'TARGETED_TERMINAL_CLEANUP_REVIEW',
    output: {fileCount: 0},
    artifactLocators: [locator],
  });
  return {
    receipt,
    report: {
      schemaVersion: 1,
      mode: 'TERMINAL_RESIDUE_CLEANUP_REPORT',
      operation, packetNumber, prNumber,
      cleanupDisposition: axes.result,
      output: {archive: 'UNKNOWN', worktree: 'UNKNOWN', remoteRef: 'UNKNOWN',
        localRef: 'UNKNOWN', residue: 'UNKNOWN'},
      attention: makeAttention(receipt, locator),
      reasonCodes: receipt.reasonCodes,
      receiptDigest: receipt.receiptDigest,
    },
  };
}
async function inspectTransaction(options) {
  const {packetNumber, prNumber} = options;
  try {
    const facts = await collectFacts(options);
    const nextLegalAction = facts.cleanupDisposition === 'ALREADY_CLEAN'
      ? 'NONE' : 'APPLY_TERMINAL_RESIDUE_CLEANUP';
    const artifacts = ['issue:#' + packetNumber, 'pr:#' + prNumber];
    if (facts.archive.state === 'VERIFIED') {
      artifacts.push('archive:' + facts.archive.manifest.archiveDigest);
    }
    const receipt = makeReceipt({
      operation: 'inspect', packetNumber, prNumber,
      result: 'PASS', attentionDisposition: 'COMPLETE',
      nextLegalAction, output: facts.output,
      artifactLocators: artifacts,
      steps: [
        {name: 'terminal-authority', result: 'PASS', evidenceLocator: 'issue:#' + packetNumber},
        {name: 'retention-proof', result: 'PASS',
          evidenceLocator: 'compare:' + facts.candidateHead + '...' + facts.mainSha},
        {name: 'cleanup-classification', result: 'PASS',
          evidenceLocator: facts.archive.state === 'VERIFIED'
            ? 'archive:' + facts.archive.manifest.archiveDigest : 'worktree:' + facts.worktree.tail},
      ],
    });
    return {facts, receipt, report: {...reportFromFacts(
      'inspect', packetNumber, prNumber, facts, receipt), attention: []}};
  } catch (error) {
    return errorResult('inspect', packetNumber, prNumber, error);
  }
}
function removeWorktree(profile, runner, facts) {
  gitEffect(profile, runner, ['-C', profile.controlRepo, 'worktree', 'remove', facts.worktree.target],
    null, 'WORKTREE_REMOVE_FAILED');
  if (fs.existsSync(facts.worktree.target)) {
    throw new CleanupError('CONFLICT', ['WORKTREE_REMOVE_READBACK_FAILED']);
  }
  const list = parseWorktreeList(gitRead(profile, runner, ['worktree', 'list', '--porcelain']));
  if (list.some((row) => path.resolve(row.worktree || '') === facts.worktree.target)) {
    throw new CleanupError('CONFLICT', ['WORKTREE_STILL_REGISTERED']);
  }
}
function deleteRemoteRef(profile, runner, branch, candidateHead) {
  const ref = 'refs/heads/' + branch;
  gitEffect(profile, runner, [
    '-C', profile.controlRepo, 'push',
    '--force-with-lease=' + ref + ':' + candidateHead,
    profile.remote, ':' + ref,
  ], null, 'REMOTE_REF_CAS_DELETE_FAILED');
  const state = remoteRefState(profile, runner, branch, candidateHead);
  if (state.state !== 'ABSENT') throw new CleanupError('CONFLICT', ['REMOTE_REF_DELETE_READBACK_FAILED']);
}
function deleteLocalRef(profile, runner, branch, candidateHead) {
  const ref = 'refs/heads/' + branch;
  gitEffect(profile, runner, ['-C', profile.controlRepo, 'update-ref', '-d', ref, candidateHead],
    null, 'LOCAL_REF_CAS_DELETE_FAILED');
  const state = localRefState(profile, runner, branch, candidateHead);
  if (state.state !== 'ABSENT') throw new CleanupError('CONFLICT', ['LOCAL_REF_DELETE_READBACK_FAILED']);
}
async function applyTransaction({
  packetNumber, prNumber, adapter, profile = PROFILE, runner = commandResult,
}) {
  const effects = {archiveWrites: 0, worktreeRemovals: 0, remoteRefDeletes: 0, localRefDeletes: 0};
  try {
    let initial = await collectFacts({packetNumber, prNumber, adapter, profile, runner});
    if (initial.cleanupDisposition === 'ALREADY_CLEAN') {
      const receipt = makeReceipt({
        operation: 'apply', packetNumber, prNumber,
        result: 'PASS', attentionDisposition: 'COMPLETE', nextLegalAction: 'NONE',
        output: initial.output,
        artifactLocators: ['archive:' + initial.archive.manifest.archiveDigest],
        counters: effects,
        steps: [{name: 'already-clean', result: 'PASS',
          evidenceLocator: 'archive:' + initial.archive.manifest.archiveDigest}],
      });
      return {facts: initial, receipt, report: {...reportFromFacts(
        'apply', packetNumber, prNumber, initial, receipt, effects), attention: []}};
    }

    if (initial.archive.state !== 'VERIFIED') {
      if (initial.worktree.state !== 'PRESENT' || !initial.inventory) {
        throw new CleanupError('UNKNOWN', ['ARCHIVE_SOURCE_UNAVAILABLE']);
      }
      const archived = publishArchive(initial.archiveRoot, initial.commonDir,
        packetNumber, prNumber, initial.candidateHead, initial.mergeCommit, initial.inventory);
      effects.archiveWrites = 1;
      if (archived.state !== 'VERIFIED') throw new CleanupError('UNKNOWN', ['ARCHIVE_VERIFY_FAILED']);
    }

    let afterArchive = await collectFacts({packetNumber, prNumber, adapter, profile, runner});
    if (afterArchive.archive.state !== 'VERIFIED') {
      throw new CleanupError('UNKNOWN', ['ARCHIVE_VERIFY_FAILED']);
    }

    if (afterArchive.worktree.state === 'PRESENT') {
      if (afterArchive.cleanupDisposition !== 'CLEANUP_READY') {
        throw new CleanupError('BLOCKED', ['WORKTREE_CLEANUP_NOT_READY']);
      }
      removeWorktree(profile, runner, afterArchive);
      effects.worktreeRemovals = 1;
    }

    let afterWorktree = await collectFacts({packetNumber, prNumber, adapter, profile, runner});
    if (afterWorktree.archive.state !== 'VERIFIED') {
      throw new CleanupError('CONFLICT', ['ARCHIVE_LOST_AFTER_WORKTREE_REMOVAL']);
    }
    if (afterWorktree.worktree.state !== 'ABSENT') {
      throw new CleanupError('CONFLICT', ['WORKTREE_REMOVE_READBACK_FAILED']);
    }

    if (afterWorktree.remoteRef.state === 'EXACT') {
      deleteRemoteRef(profile, runner, afterWorktree.branch, afterWorktree.candidateHead);
      effects.remoteRefDeletes = 1;
    }
    let afterRemote = await collectFacts({packetNumber, prNumber, adapter, profile, runner});
    if (afterRemote.archive.state !== 'VERIFIED') {
      throw new CleanupError('CONFLICT', ['ARCHIVE_LOST_AFTER_REMOTE_REF_DELETE']);
    }
    if (afterRemote.remoteRef.state !== 'ABSENT') {
      throw new CleanupError('CONFLICT', ['REMOTE_REF_DELETE_READBACK_FAILED']);
    }

    if (afterRemote.localRef.state === 'EXACT') {
      deleteLocalRef(profile, runner, afterRemote.branch, afterRemote.candidateHead);
      effects.localRefDeletes = 1;
    }

    const finalFacts = await collectFacts({packetNumber, prNumber, adapter, profile, runner});
    if (finalFacts.cleanupDisposition !== 'ALREADY_CLEAN'
        || finalFacts.archive.state !== 'VERIFIED'
        || finalFacts.worktree.state !== 'ABSENT'
        || finalFacts.localRef.state !== 'ABSENT'
        || finalFacts.remoteRef.state !== 'ABSENT') {
      throw new CleanupError('CONFLICT', ['FINAL_CLEANUP_READBACK_CONFLICT']);
    }
    finalFacts.cleanupDisposition = 'COMPLETE';
    finalFacts.output = {
      ...outputFor(finalFacts),
      disposition: 'COMPLETE',
      residue: 'NONE',
    };
    const receipt = makeReceipt({
      operation: 'apply', packetNumber, prNumber,
      result: 'PASS', attentionDisposition: 'COMPLETE', nextLegalAction: 'NONE',
      output: finalFacts.output,
      artifactLocators: [
        'archive:' + finalFacts.archive.manifest.archiveDigest,
        'issue:#' + packetNumber,
        'pr:#' + prNumber,
      ],
      counters: effects,
      steps: [
        {name: 'archive-verified', result: 'PASS',
          evidenceLocator: 'archive:' + finalFacts.archive.manifest.archiveDigest},
        {name: 'worktree-absent', result: 'PASS', evidenceLocator: 'worktree:' + finalFacts.worktree.tail},
        {name: 'remote-ref-absent', result: 'PASS', evidenceLocator: 'remote-ref:' + finalFacts.branch},
        {name: 'local-ref-absent', result: 'PASS', evidenceLocator: 'ref:' + finalFacts.branch},
      ],
    });
    return {facts: finalFacts, receipt, report: {...reportFromFacts(
      'apply', packetNumber, prNumber, finalFacts, receipt, effects), attention: []}};
  } catch (error) {
    const result = errorResult('apply', packetNumber, prNumber, error);
    result.report.effects = effects;
    return result;
  }
}
function evidenceOutputPaths(profile, runner, packetNumber, prNumber, operation) {
  const commonDir = commonGitDir(profile, runner);
  const dir = path.join(commonDir, 'terminal-residue-cleanup-evidence');
  ensureDirMode(dir, 0o700);
  const prefix = 'packet-' + packetNumber + '-pr-' + prNumber + '.' + operation;
  return {
    receipt: path.join(dir, prefix + '.receipt.json'),
    report: path.join(dir, prefix + '.report.json'),
  };
}
function writeJsonAtomic(filePath, value) {
  const bytes = Buffer.from(JSON.stringify(canonicalize(value), null, 2) + '\n', 'utf8');
  if (bytes.length > MAX_REPORT_BYTES) throw new CleanupError('UNKNOWN', ['OWNER_REPORT_TOO_LARGE']);
  const tmp = filePath + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, bytes, {mode: 0o600});
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, filePath);
  return 'local-artifact:' + filePath + '#sha256=' + sha256Bytes(bytes);
}
function persistResult(result, profile, runner, packetNumber, prNumber, operation) {
  const paths = evidenceOutputPaths(profile, runner, packetNumber, prNumber, operation);
  const receiptLocator = writeJsonAtomic(paths.receipt, result.receipt);
  const reportLocator = writeJsonAtomic(paths.report, result.report);
  return {paths, receiptLocator, reportLocator};
}
function projectView(result, locators) {
  return agentDecisionView.projectAgentDecisionView({
    receipt: result.receipt,
    phase: 'EXPERIMENT_CLOSE',
    output: result.report.output || {},
    attention: result.report.attention || [],
    receiptLocator: locators.receiptLocator,
    reportLocator: locators.reportLocator,
  });
}
function parsePositive(value, field) {
  const text = String(value || '').replace(/^#/, '');
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error(field + '_INVALID');
  return Number(text);
}
function parseArgs(argv = process.argv.slice(2)) {
  const operation = argv[0];
  if (!['inspect', 'apply'].includes(operation)) throw new Error('COMMAND_INVALID');
  const allowed = new Set(['packet', 'pr', 'format', 'apply']);
  const values = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error('ARGUMENT_INVALID');
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    if (key === 'apply') {
      values[key] = true;
      continue;
    }
    const value = argv[++index];
    if (value === undefined) throw new Error('ARGUMENT_INVALID');
    values[key] = value;
  }
  const packetNumber = parsePositive(values.packet, 'PACKET');
  const prNumber = parsePositive(values.pr, 'PR');
  const format = values.format || 'agent-view';
  if (!['agent-view', 'receipt'].includes(format)) throw new Error('FORMAT_INVALID');
  if (operation === 'apply' && values.apply !== true) throw new Error('APPLY_FLAG_REQUIRED');
  if (operation === 'inspect' && values.apply) throw new Error('ARGUMENT_INVALID');
  return {operation, packetNumber, prNumber, format};
}
async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const runner = options.runner || commandResult;
  const profile = options.profile || PROFILE;
  const adapter = options.adapter || createLiveAdapter({runner});
  const result = args.operation === 'inspect'
    ? await inspectTransaction({packetNumber: args.packetNumber, prNumber: args.prNumber,
      adapter, profile, runner})
    : await applyTransaction({packetNumber: args.packetNumber, prNumber: args.prNumber,
      adapter, profile, runner});
  const locators = persistResult(result, profile, runner,
    args.packetNumber, args.prNumber, args.operation);
  if (args.format === 'receipt') {
    return {
      text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
      code: executionReceipt.exitCodeFor(result.receipt),
    };
  }
  const view = projectView(result, locators);
  return {
    text: JSON.stringify(canonicalize(view), null, 2) + '\n',
    code: agentDecisionView.exitCodeFor(view),
  };
}

if (require.main === module) {
  runCli().then(({text, code}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch(() => {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      mode: 'REPOSITORY_AGENT_DECISION_VIEW',
      validity: 'INVALID',
      phase: 'UNKNOWN',
      executionLifecycle: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN',
      result: 'UNKNOWN',
      reasonCodes: ['RUNTIME_ERROR'],
    }) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  EVIDENCE_DIRS,
  MAX_EVIDENCE_FILE_BYTES,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_TOTAL_BYTES,
  PROFILE,
  CleanupError,
  applyTransaction,
  archivePath,
  buildManifest,
  collectFacts,
  commandResult,
  createLiveAdapter,
  inspectTransaction,
  inventoryEvidence,
  localRefState,
  mainOpsFacts,
  packetFacts,
  parseArgs,
  parseWorktreeList,
  prFacts,
  projectView,
  publishArchive,
  remoteRefState,
  safeTail,
  verifyArchive,
  worktreeState,
};
