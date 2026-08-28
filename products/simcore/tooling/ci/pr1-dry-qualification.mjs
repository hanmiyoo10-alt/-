#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { materialize } from '../candidate-materialize.mjs';

const HEX40 = /^[0-9a-f]{40}$/;
const REQUEST_PATH = /^products\/simcore\/releases\/candidate-requests\/[^/]+\.json$/;
const INFRA_CODES = new Set([
  'PR1_DRY_GIT_FAILED',
  'CANDIDATE_REMOTE_QUERY_FAILED',
  'CANDIDATE_SOURCE_COMMIT_MISSING',
  'CANDIDATE_PRODUCTION_COMMIT_MISSING',
  'CANDIDATE_WORKTREE_FAILED',
  'CANDIDATE_FETCH_EXISTING_FAILED',
]);

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function runGit(root, args, code = 'PR1_DRY_GIT_FAILED') {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) fail(code, String(result.stderr || result.stdout || args.join(' ')).trim());
  return String(result.stdout || '').trim();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || i + 1 >= argv.length) fail('PR1_DRY_ARGUMENT_INVALID', arg);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['base-commit', 'head-commit', 'production-commit', 'report']) {
    if (!out[key]) fail('PR1_DRY_ARGUMENT_MISSING', key);
  }
  out.root = path.resolve(out.root || '.');
  return out;
}

function writeReport(reportPath, payload) {
  const target = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function changedRequestPaths(root, baseCommit, headCommit) {
  const raw = runGit(root, [
    'diff', '--name-only', `${baseCommit}...${headCommit}`, '--',
    'products/simcore/releases/candidate-requests/*.json',
  ]);
  return raw.split(/\r?\n/).filter(Boolean).filter((value) => REQUEST_PATH.test(value));
}

export function qualifyPr1(input) {
  const args = { ...input, root: path.resolve(input?.root || '.') };
  const baseCommit = String(args['base-commit'] || '');
  const headCommit = String(args['head-commit'] || '');
  const productionCommit = String(args['production-commit'] || '');
  if (!HEX40.test(baseCommit)) fail('PR1_DRY_BASE_COMMIT_INVALID');
  if (!HEX40.test(headCommit)) fail('PR1_DRY_HEAD_COMMIT_INVALID');
  if (!HEX40.test(productionCommit)) fail('PR1_DRY_PRODUCTION_COMMIT_INVALID');
  runGit(args.root, ['cat-file', '-e', `${baseCommit}^{commit}`], 'PR1_DRY_BASE_COMMIT_MISSING');
  runGit(args.root, ['cat-file', '-e', `${headCommit}^{commit}`], 'PR1_DRY_HEAD_COMMIT_MISSING');
  runGit(args.root, ['cat-file', '-e', `${productionCommit}^{commit}`], 'PR1_DRY_PRODUCTION_COMMIT_MISSING');

  const requests = changedRequestPaths(args.root, baseCommit, headCommit);
  if (requests.length !== 1) fail('PR1_DRY_REQUEST_COUNT_INVALID', JSON.stringify(requests));
  const requestPath = requests[0];
  const exactRequest = runGit(args.root, ['show', `${headCommit}:${requestPath}`], 'PR1_DRY_REQUEST_MISSING_AT_HEAD');

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-pr1-dry-'));
  const requestTemp = path.join(scratch, 'request.json');
  const innerReport = path.join(scratch, 'candidate-report.json');
  fs.writeFileSync(requestTemp, `${exactRequest}\n`, 'utf8');
  try {
    const result = materialize({
      root: args.root,
      request: requestTemp,
      'source-commit': headCommit,
      'production-commit': productionCommit,
      report: innerReport,
      mode: 'verify',
    });
    if (!['WOULD_CREATE', 'ALREADY_MATERIALIZED'].includes(result.candidateDisposition)) {
      fail('PR1_DRY_DISPOSITION_INVALID', String(result.candidateDisposition || ''));
    }
    const report = {
      schemaVersion: 1,
      product: 'SimCore',
      mode: 'PR1_DRY_QUALIFICATION',
      result: 'PASS',
      authority: 'EPHEMERAL_QUALIFICATION_ONLY',
      productionMutation: 'NONE',
      requestPath,
      intentId: result.intentId,
      sourceCommit: headCommit,
      productionCommit,
      builderPath: result.builderPath,
      builderSha256: result.builderSha256,
      verificationSuite: result.verificationSuite,
      changedPaths: result.changedPaths,
      candidateDisposition: result.candidateDisposition,
      durableCandidateCreated: false,
      createsCandidateRef: false,
      createsReceipt: false,
      createsSpecShadow: false,
      publishes: false,
    };
    writeReport(args.report, report);
    return report;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  try {
    const report = qualifyPr1(args);
    console.log(`SIMCORE_PR1_DRY_QUALIFICATION_PASS intent=${report.intentId} disposition=${report.candidateDisposition} authority=${report.authority}`);
  } catch (error) {
    const code = error?.code || 'PR1_DRY_QUALIFICATION_ERROR';
    const status = INFRA_CODES.has(code) ? 'INFRA_ERROR' : 'FAIL';
    try {
      writeReport(args.report, {
        schemaVersion: 1,
        product: 'SimCore',
        mode: 'PR1_DRY_QUALIFICATION',
        result: status,
        authority: 'EPHEMERAL_QUALIFICATION_ONLY',
        productionMutation: 'NONE',
        reasonCode: code,
      });
    } catch {}
    console.error(`${code}: ${error?.message || error}`);
    process.exit(status === 'FAIL' ? 1 : 2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
