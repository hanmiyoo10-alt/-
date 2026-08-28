#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadApprovalEnvelopeFiles, validateApprovalEnvelope } from '../release-approval-envelope.mjs';

function fail(code, detail = '') { const e = new Error(detail ? `${code}: ${detail}` : code); e.code = code; throw e; }
function runGit(root, args, allowFailure = false) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
  if (!allowFailure && r.status !== 0) fail('PR2_APPROVAL_GIT_ERROR', String(r.stderr || r.stdout || '').trim());
  return r;
}
function normalize(value) { return String(value || '').replaceAll('\\', '/').replace(/^\.\//, ''); }
function writeReport(file, value) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function qualifyPr2({ root = '.', 'base-commit': baseCommit, 'head-commit': headCommit, 'production-commit': productionCommit, report }) {
  const repo = path.resolve(root);
  if (!baseCommit || !headCommit || !productionCommit) fail('PR2_APPROVAL_IDENTITY_MISSING');
  const diff = runGit(repo, ['diff', '--name-only', `${baseCommit}...${headCommit}`]).stdout;
  const changedPaths = String(diff || '').split(/\r?\n/).map((x) => normalize(x.trim())).filter(Boolean);
  if (changedPaths.length !== 2) fail('APPROVAL_ENVELOPE_CHANGED_PATH_INVALID', changedPaths.join(','));
  const approvalCandidates = changedPaths.filter((p) => /^products\/simcore\/releases\/approvals\/[^/]+\.json$/.test(p));
  if (approvalCandidates.length !== 1) fail('APPROVAL_ENVELOPE_CHANGED_PATH_INVALID', changedPaths.join(','));
  const approvalPath = approvalCandidates[0];
  const specPath = changedPaths.find((p) => p !== approvalPath);
  if (!specPath) fail('APPROVAL_ENVELOPE_CHANGED_PATH_INVALID', changedPaths.join(','));

  for (const rel of [approvalPath, specPath]) {
    const prior = runGit(repo, ['cat-file', '-e', `${baseCommit}:${rel}`], true);
    if (prior.status === 0) fail('APPROVAL_ENVELOPE_PRIOR_AUTHORIZATION_EXISTS', rel);
    if (![1, 128].includes(prior.status)) fail('PR2_APPROVAL_GIT_ERROR', rel);
  }

  const loaded = loadApprovalEnvelopeFiles({ root: repo, approvalPath, specPath });
  const ref = String(loaded.candidateReceipt?.candidateFetchRef || '');
  if (!/^candidate\/simcore\/[A-Za-z0-9._/-]+$/.test(ref)) fail('APPROVAL_ENVELOPE_RECEIPT_INVALID', 'candidateFetchRef');
  const observed = runGit(repo, ['ls-remote', 'origin', `refs/heads/${ref}`]);
  const candidateHead = String(observed.stdout || '').trim().split(/\s+/)[0] || '';
  if (!/^[0-9a-f]{40}$/.test(candidateHead)) fail('APPROVAL_ENVELOPE_CANDIDATE_MOVED', ref);

  const envelope = validateApprovalEnvelope({
    mode: 'PREMERGE',
    approval: loaded.approval,
    approvalPath: loaded.approvalPath,
    authorizedSpec: loaded.authorizedSpec,
    specPath: loaded.specPath,
    candidateReceipt: loaded.candidateReceipt,
    candidateReceiptPath: loaded.candidateReceiptPath,
    specShadow: loaded.specShadow,
    specShadowPath: loaded.specShadowPath,
    observedCandidateCommit: candidateHead,
    observedProductionCommit: productionCommit,
    changedPaths,
  });
  const result = {
    ...envelope,
    qualificationAuthority: 'EPHEMERAL_QUALIFICATION_ONLY',
    durableAuthorizationCreated: false,
  };
  if (report) writeReport(path.resolve(repo, report), result);
  return result;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || i + 1 >= argv.length) fail('PR2_APPROVAL_ARGUMENT_INVALID', arg);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['root', 'base-commit', 'head-commit', 'production-commit', 'report']) if (!out[key]) fail('PR2_APPROVAL_ARGUMENT_MISSING', key);
  return out;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = qualifyPr2(args);
  console.log(`SIMCORE_PR2_APPROVAL_PREFLIGHT_PASS release=${result.releaseId}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error(`${error?.code || 'PR2_APPROVAL_QUALIFICATION_ERROR'}: ${error?.message || error}`); process.exit(1); }
}
