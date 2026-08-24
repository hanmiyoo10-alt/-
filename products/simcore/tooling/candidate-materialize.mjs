#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const CANONICAL_RUNTIME_PATHS = Object.freeze([
  'plugins/simcore/latest.js',
  'plugins/simcore/install.js',
]);
const RELEASE_MODES = new Set(['NEW_VERSION', 'SAME_VERSION_CORRECTION', 'ROLLBACK']);
const HEX40 = /^[0-9a-f]{40}$/;
const INTENT = /^simcore-v\d+\.\d+\.\d+-intent-\d{2,}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const BUILDER = /^products\/simcore\/tooling\/build-[A-Za-z0-9._-]+\.(?:py|mjs)$/;

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: 'utf8',
    timeout: options.timeout || 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail(options.code || 'CANDIDATE_COMMAND_FAILED', `${command} ${args.join(' ')}\n${result.stderr || result.stdout || ''}`.trim());
  }
  return String(result.stdout || '').trim();
}
function git(root, args, options = {}) { return run('git', args, { cwd: root, ...options }); }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) fail('CANDIDATE_ARGUMENT_INVALID', arg);
    if (arg === '--skip-regression') { out.skipRegression = true; continue; }
    if (i + 1 >= argv.length) fail('CANDIDATE_ARGUMENT_INVALID', arg);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['request', 'source-commit', 'production-commit', 'report']) if (!out[key]) fail('CANDIDATE_ARGUMENT_MISSING', key);
  out.root = path.resolve(out.root || '.');
  out.mode = out.mode || 'materialize';
  if (!['materialize', 'verify'].includes(out.mode)) fail('CANDIDATE_MODE_INVALID');
  return out;
}

export function validateRequest(input) {
  const r = structuredClone(input || {});
  if (r.schemaVersion !== 1) fail('CANDIDATE_REQUEST_SCHEMA_INVALID');
  if (r.product !== 'SimCore') fail('CANDIDATE_REQUEST_PRODUCT_INVALID');
  if (!INTENT.test(String(r.intentId || ''))) fail('CANDIDATE_REQUEST_INTENT_INVALID');
  if (!VERSION.test(String(r.targetVersion || ''))) fail('CANDIDATE_REQUEST_VERSION_INVALID');
  if (!String(r.releaseName || '').trim()) fail('CANDIDATE_REQUEST_RELEASE_NAME_MISSING');
  if (!RELEASE_MODES.has(r.releaseMode)) fail('CANDIDATE_REQUEST_RELEASE_MODE_INVALID');
  if (!HEX40.test(String(r.expectedProductionCommit || ''))) fail('CANDIDATE_REQUEST_PARENT_INVALID');
  if (!BUILDER.test(String(r.builderPath || ''))) fail('CANDIDATE_REQUEST_BUILDER_INVALID');
  if (typeof r.verificationSuite !== 'string' || !r.verificationSuite) fail('CANDIDATE_REQUEST_SUITE_INVALID');
  if (!Array.isArray(r.allowedRuntimePaths)) fail('CANDIDATE_REQUEST_PATHS_INVALID');
  const actual = [...new Set(r.allowedRuntimePaths.map(String))].sort();
  const canonical = [...CANONICAL_RUNTIME_PATHS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(canonical)) fail('CANDIDATE_REQUEST_PATHS_INVALID');
  if (!String(r.changeClass || '').trim() || !String(r.primaryGoalId || '').trim()) fail('CANDIDATE_REQUEST_INTENT_FIELDS_MISSING');
  if (!r.liveGate || r.liveGate.required !== true || !String(r.liveGate.scenarioId || '').trim() || r.liveGate.closeAuthority !== 'HUMAN_EVIDENCE') {
    fail('CANDIDATE_REQUEST_LIVE_GATE_INVALID');
  }
  if (!Array.isArray(r.evidenceRefs)) fail('CANDIDATE_REQUEST_EVIDENCE_INVALID');
  return Object.freeze(r);
}

export function evaluateExistingCandidate({ parent, tree, expectedParent, expectedTree }) {
  if (!parent || !tree) return 'ABSENT';
  if (parent === expectedParent && tree === expectedTree) return 'ALREADY_MATERIALIZED';
  return 'CANDIDATE_REF_CONFLICT';
}

function changedPaths(root) {
  return git(root, ['diff', '--name-only']).split(/\r?\n/).filter(Boolean).sort();
}
function assertAllowedPaths(paths, allowed) {
  const a = [...paths].sort();
  const b = [...allowed].sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) fail('CANDIDATE_CHANGED_PATHS_INVALID', JSON.stringify(a));
}
function builderCommand(builderPath, tempPath) {
  if (builderPath.endsWith('.py')) return ['python3', [tempPath]];
  if (builderPath.endsWith('.mjs')) return [process.execPath, [tempPath]];
  fail('CANDIDATE_REQUEST_BUILDER_INVALID');
}
function remoteHead(root, ref) {
  const result = spawnSync('git', ['ls-remote', '--heads', 'origin', ref], { cwd: root, encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) fail('CANDIDATE_REMOTE_QUERY_FAILED', result.stderr || result.stdout || 'ls-remote');
  const line = String(result.stdout || '').trim();
  if (!line) return null;
  const sha = line.split(/\s+/)[0];
  if (!HEX40.test(sha)) fail('CANDIDATE_REMOTE_IDENTITY_INVALID');
  return sha;
}
function singleParent(root, commit) {
  const fields = git(root, ['rev-list', '--parents', '-n', '1', commit]).split(/\s+/);
  if (fields.length !== 2) fail('CANDIDATE_PARENT_COUNT_INVALID');
  return fields[1];
}
function emitReport(reportPath, payload) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function materialize(args) {
  const requestPath = path.resolve(args.root, args.request);
  const request = validateRequest(JSON.parse(fs.readFileSync(requestPath, 'utf8')));
  const sourceCommit = String(args['source-commit']);
  const productionCommit = String(args['production-commit']);
  if (!HEX40.test(sourceCommit)) fail('CANDIDATE_SOURCE_COMMIT_INVALID');
  if (!HEX40.test(productionCommit)) fail('CANDIDATE_PRODUCTION_COMMIT_INVALID');
  if (productionCommit !== request.expectedProductionCommit) fail('CANDIDATE_PRODUCTION_PARENT_MOVED');
  git(args.root, ['cat-file', '-e', `${sourceCommit}^{commit}`], { code: 'CANDIDATE_SOURCE_COMMIT_MISSING' });
  git(args.root, ['cat-file', '-e', `${productionCommit}^{commit}`], { code: 'CANDIDATE_PRODUCTION_COMMIT_MISSING' });

  const latestBlob = git(args.root, ['rev-parse', `${productionCommit}:plugins/simcore/latest.js`]);
  const installBlob = git(args.root, ['rev-parse', `${productionCommit}:plugins/simcore/install.js`]);
  if (latestBlob !== installBlob) fail('CANDIDATE_PARENT_LATEST_INSTALL_DIVERGED');

  const builderBytes = Buffer.from(git(args.root, ['show', `${sourceCommit}:${request.builderPath}`], { code: 'CANDIDATE_BUILDER_MISSING' }), 'utf8');
  const builderDigest = sha256(builderBytes);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-candidate-'));
  const builderTemp = path.join(os.tmpdir(), `simcore-builder-${process.pid}-${path.basename(request.builderPath)}`);
  fs.writeFileSync(builderTemp, builderBytes);
  let candidateCommit = null;
  let disposition = null;
  let tree = null;
  let candidateBlob = null;
  const candidateRef = `refs/heads/candidate/simcore/${request.intentId}`;
  try {
    git(args.root, ['worktree', 'add', '--detach', work, productionCommit], { code: 'CANDIDATE_WORKTREE_FAILED' });
    const [cmd, cmdArgs] = builderCommand(request.builderPath, builderTemp);
    run(cmd, cmdArgs, { cwd: work, timeout: 180000, code: 'CANDIDATE_BUILDER_FAILED' });
    const paths = changedPaths(work);
    assertAllowedPaths(paths, request.allowedRuntimePaths);
    const latestPath = path.join(work, 'plugins/simcore/latest.js');
    const installPath = path.join(work, 'plugins/simcore/install.js');
    if (!fs.readFileSync(latestPath).equals(fs.readFileSync(installPath))) fail('CANDIDATE_LATEST_INSTALL_DIVERGED');
    run(process.execPath, ['--check', latestPath], { code: 'CANDIDATE_SYNTAX_INVALID' });
    run(process.execPath, ['--check', installPath], { code: 'CANDIDATE_SYNTAX_INVALID' });
    if (!args.skipRegression) {
      run(process.execPath, [
        path.join(args.root, 'products/simcore/tooling/test.mjs'),
        '--source', latestPath,
        '--suite', request.verificationSuite,
        '--report', path.join(work, '.candidate-regression.json'),
      ], { cwd: args.root, timeout: 300000, code: 'CANDIDATE_REGRESSION_FAILED' });
    }
    git(work, ['add', ...request.allowedRuntimePaths]);
    tree = git(work, ['write-tree']);
    const existing = remoteHead(args.root, candidateRef);
    if (existing) {
      git(args.root, ['fetch', '--no-tags', 'origin', `${candidateRef}:${candidateRef}`], { code: 'CANDIDATE_FETCH_EXISTING_FAILED' });
      const parent = singleParent(args.root, existing);
      const existingTree = git(args.root, ['rev-parse', `${existing}^{tree}`]);
      const state = evaluateExistingCandidate({ parent, tree: existingTree, expectedParent: productionCommit, expectedTree: tree });
      if (state !== 'ALREADY_MATERIALIZED') fail('CANDIDATE_REF_CONFLICT');
      candidateCommit = existing;
      disposition = state;
    } else {
      if (args.mode !== 'materialize') {
        disposition = 'WOULD_CREATE';
      } else {
        const sourceDate = git(args.root, ['show', '-s', '--format=%aI', sourceCommit]);
        const env = {
          ...process.env,
          GIT_AUTHOR_NAME: 'github-actions[bot]',
          GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
          GIT_COMMITTER_NAME: 'github-actions[bot]',
          GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
          GIT_AUTHOR_DATE: sourceDate,
          GIT_COMMITTER_DATE: sourceDate,
        };
        candidateCommit = run('git', ['commit-tree', tree, '-p', productionCommit], {
          cwd: work,
          env,
          code: 'CANDIDATE_COMMIT_CREATE_FAILED',
        });
        // commit-tree reads the message from stdin only when provided by spawn; use -m to keep invocation non-shell.
        candidateCommit = run('git', ['commit-tree', tree, '-p', productionCommit, '-m', `SimCore v${request.targetVersion} ${request.releaseName}`], {
          cwd: work,
          env,
          code: 'CANDIDATE_COMMIT_CREATE_FAILED',
        });
        if (!HEX40.test(candidateCommit)) fail('CANDIDATE_COMMIT_IDENTITY_INVALID');
        git(args.root, ['push', 'origin', `${candidateCommit}:${candidateRef}`], { code: 'CANDIDATE_PUSH_FAILED' });
        const observed = remoteHead(args.root, candidateRef);
        if (observed !== candidateCommit) fail('CANDIDATE_PUSH_REOBSERVE_FAILED');
        disposition = 'CREATED';
      }
    }
    if (candidateCommit) {
      if (singleParent(args.root, candidateCommit) !== productionCommit) fail('CANDIDATE_PARENT_MISMATCH');
      const l = git(args.root, ['rev-parse', `${candidateCommit}:plugins/simcore/latest.js`]);
      const i = git(args.root, ['rev-parse', `${candidateCommit}:plugins/simcore/install.js`]);
      if (l !== i) fail('CANDIDATE_LATEST_INSTALL_DIVERGED');
      candidateBlob = l;
    }
    const report = {
      schemaVersion: 1,
      product: 'SimCore',
      intentId: request.intentId,
      targetVersion: request.targetVersion,
      releaseName: request.releaseName,
      releaseMode: request.releaseMode,
      expectedProductionCommit: productionCommit,
      sourceCommit,
      candidateCommit,
      candidateReleaseBlob: candidateBlob,
      candidateFetchRef: candidateRef.replace(/^refs\/heads\//, ''),
      candidateDisposition: disposition,
      builderPath: request.builderPath,
      builderSha256: builderDigest,
      verificationSuite: request.verificationSuite,
      changedPaths: request.allowedRuntimePaths,
      productionMutation: 'NONE',
      releaseAuthority: 'CANDIDATE_TRANSPORT_ONLY',
      result: ['CREATED', 'ALREADY_MATERIALIZED', 'WOULD_CREATE'].includes(disposition) ? 'PASS' : 'FAIL',
    };
    emitReport(path.resolve(args.root, args.report), report);
    return report;
  } finally {
    try { git(args.root, ['worktree', 'remove', '--force', work]); } catch {}
    try { fs.rmSync(builderTemp, { force: true }); } catch {}
    try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = materialize(args);
  console.log(`SIMCORE_CANDIDATE_MATERIALIZE_PASS intent=${result.intentId} disposition=${result.candidateDisposition} C=${result.candidateCommit || 'NONE'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try { main(); }
  catch (error) {
    console.error(`${error.code || 'CANDIDATE_MATERIALIZE_ERROR'}: ${error.message || error}`);
    process.exit(2);
  }
}
