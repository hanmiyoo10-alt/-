#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ALLOWED_PRODUCTION_PATHS,
  ReleaseError,
  blobAt,
  changedPaths,
  ensureCommit,
  fail,
  gitText,
  isGitSha,
  parentCommits,
  parseSourceMetadata,
  requireCondition,
} from './lib.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--') || i + 1 >= argv.length) fail('CANDIDATE_MATERIALIZATION_ARGUMENT_INVALID', `invalid argument ${key}`);
    out[key.slice(2)] = argv[++i];
  }
  for (const key of ['source-commit', 'expected-production-commit', 'release-id', 'version', 'release-name', 'release-mode', 'report']) {
    requireCondition(out[key], 'CANDIDATE_MATERIALIZATION_ARGUMENT_INVALID', `--${key} required`);
  }
  return out;
}

function gitEnv(cwd, args, env, code = 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', options = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, ...env },
    input: options.input,
  });
  if (result.status !== 0) fail(code, String(result.stderr || result.stdout || 'git command failed').trim().slice(0, 2048));
  return String(result.stdout || '').trimEnd();
}

function candidateMessage(args) {
  const lines = [
    `SimCore v${args.version} ${args['release-name']}`,
    '',
    `Release-Id: ${args['release-id']}`,
    `Release-Mode: ${args['release-mode']}`,
  ];
  if (args['correction-reason']) lines.push(`Correction-Reason: ${args['correction-reason']}`);
  if (args['rollback-source']) lines.push(`Rollback-Source: ${args['rollback-source']}`);
  return `${lines.join('\n')}\n`;
}

function sourceMode(cwd, commit, filePath) {
  const row = gitText(cwd, ['ls-tree', commit, '--', filePath], 'CANDIDATE_SOURCE_NOT_FOUND');
  const match = /^(100644|100755)\s+blob\s+[0-9a-f]{40}\t/.exec(row);
  requireCondition(match, 'CANDIDATE_SOURCE_NOT_FOUND', `invalid source mode for ${filePath}`);
  return match[1];
}

function exactMessage(cwd, commit, expected) {
  const actual = `${gitText(cwd, ['show', '-s', '--format=%B', commit], 'CANDIDATE_SOURCE_NOT_FOUND')}\n`;
  return actual === expected;
}

export function materializeCandidate(cwd, args) {
  const W = args['source-commit'];
  const P = args['expected-production-commit'];
  requireCondition(isGitSha(W) && isGitSha(P), 'CANDIDATE_MATERIALIZATION_ARGUMENT_INVALID', 'source/parent commit must be full SHA');
  ensureCommit(cwd, W);
  ensureCommit(cwd, P, 'PRODUCTION_PARENT_NOT_FOUND');

  if (args['production-ref']) {
    const observed = gitText(cwd, ['rev-parse', args['production-ref']], 'PRODUCTION_PARENT_NOT_FOUND');
    requireCondition(observed === P, 'PRODUCTION_PARENT_MOVED', `production ref ${args['production-ref']} is ${observed}, expected ${P}`);
  }

  const sourceLatest = blobAt(cwd, W, ALLOWED_PRODUCTION_PATHS[0]);
  const sourceInstall = blobAt(cwd, W, ALLOWED_PRODUCTION_PATHS[1]);
  requireCondition(sourceLatest === sourceInstall, 'CANDIDATE_BLOB_BINDING_MISMATCH', 'source latest/install differ');
  const parentLatest = blobAt(cwd, P, ALLOWED_PRODUCTION_PATHS[0], 'PRODUCTION_PARENT_NOT_FOUND');
  const parentInstall = blobAt(cwd, P, ALLOWED_PRODUCTION_PATHS[1], 'PRODUCTION_PARENT_NOT_FOUND');
  requireCondition(parentLatest === parentInstall, 'PRODUCTION_PARENT_BLOB_MISMATCH', 'production parent latest/install differ');

  const sourceText = gitText(cwd, ['show', `${W}:${ALLOWED_PRODUCTION_PATHS[0]}`], 'CANDIDATE_SOURCE_NOT_FOUND');
  const meta = parseSourceMetadata(sourceText);
  requireCondition(meta.version === args.version, 'RELEASE_SPEC_VERSION_MISMATCH', 'materializer version does not match source');
  requireCondition(meta.releaseName === args['release-name'], 'RELEASE_SPEC_NAME_MISMATCH', 'materializer release name does not match source');

  const expectedMessage = candidateMessage(args);
  if (args['release-mode'] === 'NOOP_IDENTICAL') {
    requireCondition(sourceLatest === parentLatest, 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', 'NOOP source differs from production');
    return {
      schemaVersion: 1,
      disposition: 'NOOP_IDENTICAL',
      sourceCommit: W,
      expectedProductionCommit: P,
      candidateCommit: P,
      candidateReleaseBlob: parentLatest,
      changedPaths: [],
      releaseId: args['release-id'],
      releaseMode: args['release-mode'],
    };
  }

  const sourceParents = parentCommits(cwd, W);
  const sourceChanges = sourceParents.length === 1 && sourceParents[0] === P ? changedPaths(cwd, P, W) : [];
  const sourceDirect = sourceParents.length === 1
    && sourceParents[0] === P
    && sourceChanges.length > 0
    && sourceChanges.every((p) => ALLOWED_PRODUCTION_PATHS.includes(p))
    && exactMessage(cwd, W, expectedMessage);

  let C = W;
  let disposition = 'DIRECT_REUSE';
  if (!sourceDirect) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-release-index-'));
    const indexFile = path.join(tempDir, 'index');
    const env = { GIT_INDEX_FILE: indexFile };
    try {
      gitEnv(cwd, ['read-tree', `${P}^{tree}`], env);
      for (const filePath of ALLOWED_PRODUCTION_PATHS) {
        const mode = sourceMode(cwd, W, filePath);
        gitEnv(cwd, ['update-index', '--add', '--cacheinfo', `${mode},${sourceLatest},${filePath}`], env);
      }
      const tree = gitEnv(cwd, ['write-tree'], env);
      const sourceDate = gitText(cwd, ['show', '-s', '--format=%aI', W], 'CANDIDATE_SOURCE_NOT_FOUND');
      const commitEnv = {
        ...env,
        GIT_AUTHOR_NAME: 'SimCore Release System',
        GIT_AUTHOR_EMAIL: 'simcore-release@users.noreply.github.com',
        GIT_COMMITTER_NAME: 'SimCore Release System',
        GIT_COMMITTER_EMAIL: 'simcore-release@users.noreply.github.com',
        GIT_AUTHOR_DATE: sourceDate,
        GIT_COMMITTER_DATE: sourceDate,
      };
      C = gitEnv(cwd, ['commit-tree', tree, '-p', P], commitEnv, 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', { input: expectedMessage });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    disposition = 'CANONICALIZED';
  }

  requireCondition(isGitSha(C), 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', 'candidate commit invalid');
  const parents = parentCommits(cwd, C);
  requireCondition(parents.length === 1 && parents[0] === P, 'CANDIDATE_DIRECT_CHILD_REQUIRED', 'materialized candidate parent mismatch');
  const candidateLatest = blobAt(cwd, C, ALLOWED_PRODUCTION_PATHS[0]);
  const candidateInstall = blobAt(cwd, C, ALLOWED_PRODUCTION_PATHS[1]);
  requireCondition(candidateLatest === sourceLatest && candidateInstall === sourceLatest, 'CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH', 'materialized blobs differ from source');
  const paths = changedPaths(cwd, P, C);
  requireCondition(paths.length > 0 && paths.every((p) => ALLOWED_PRODUCTION_PATHS.includes(p)), 'CANDIDATE_MATERIALIZATION_PATH_DENIED', `materialized paths denied: ${paths.join(',')}`);

  return {
    schemaVersion: 1,
    disposition,
    sourceCommit: W,
    expectedProductionCommit: P,
    candidateCommit: C,
    candidateReleaseBlob: candidateLatest,
    changedPaths: paths,
    releaseId: args['release-id'],
    releaseMode: args['release-mode'],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = materializeCandidate(process.cwd(), args);
  fs.mkdirSync(path.dirname(path.resolve(args.report)), { recursive: true });
  fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(`${error?.releaseCode || 'CANDIDATE_MATERIALIZATION_ERROR'}: ${error?.message || error}`);
    process.exit(error instanceof ReleaseError ? 1 : 2);
  }
}
