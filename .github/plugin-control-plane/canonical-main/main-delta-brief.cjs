'use strict';

const { execFileSync } = require('node:child_process');

function runGit(args, { cwd = process.cwd() } = {}) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = String(error.stderr || '').trim();
    const detail = stderr ? `:${stderr.split('\n')[0]}` : '';
    throw new Error(`MAIN_DELTA_GIT_FAILED:${args[0]}${detail}`);
  }
}

function resolveCommit(ref, { cwd = process.cwd() } = {}) {
  if (!ref || typeof ref !== 'string') throw new Error('MAIN_DELTA_REF_REQUIRED');
  try {
    return execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(`MAIN_DELTA_REF_UNRESOLVED:${ref}`);
  }
}

function assertAncestor(baseSha, headSha, { cwd = process.cwd() } = {}) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', baseSha, headSha], {
      cwd,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch {
    throw new Error(`MAIN_DELTA_BASE_NOT_ANCESTOR:${baseSha}:${headSha}`);
  }
}

function listCommits(baseSha, headSha, { cwd = process.cwd() } = {}) {
  if (baseSha === headSha) return [];
  const output = runGit(['log', '--reverse', '--format=%H%x00%s', `${baseSha}..${headSha}`], { cwd });
  if (!output) return [];
  return output.split('\n').filter(Boolean).map((line) => {
    const separator = line.indexOf('\0');
    if (separator < 0) throw new Error('MAIN_DELTA_COMMIT_PARSE_FAILED');
    return {
      sha: line.slice(0, separator),
      subject: line.slice(separator + 1),
    };
  });
}

function listFiles(baseSha, headSha, { cwd = process.cwd() } = {}) {
  if (baseSha === headSha) return [];
  const output = runGit(['diff', '--name-only', '-z', '--no-renames', baseSha, headSha], { cwd });
  if (!output) return [];
  return [...new Set(output.split('\0').filter(Boolean))].sort();
}

function buildMainDeltaBrief({ base, head, cwd = process.cwd() }) {
  const baseSha = resolveCommit(base, { cwd });
  const headSha = resolveCommit(head, { cwd });
  assertAncestor(baseSha, headSha, { cwd });

  const commits = listCommits(baseSha, headSha, { cwd });
  const files = listFiles(baseSha, headSha, { cwd });

  return {
    schemaVersion: 1,
    state: 'OK',
    baseSha,
    headSha,
    commitCount: commits.length,
    fileCount: files.length,
    commits,
    files,
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2) throw new Error('usage: main-delta-brief.cjs <base-sha-or-ref> <head-sha-or-ref>');
  const brief = buildMainDeltaBrief({ base: argv[0], head: argv[1] });
  process.stdout.write(`${JSON.stringify(brief, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`MAIN_DELTA_BRIEF:ERROR:${error.message || String(error)}`);
    process.exitCode = 1;
  }
}

module.exports = {
  assertAncestor,
  buildMainDeltaBrief,
  listCommits,
  listFiles,
  resolveCommit,
};
