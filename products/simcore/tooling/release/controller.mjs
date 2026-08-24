#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ReleaseError,
  blobAt,
  isGitSha,
  releaseSpecDigest,
  requireCondition,
  sha256,
  textAt,
  validateAuthorizationEvent,
  validateCandidateAgainstSpec,
  fail,
  gitText,
} from './lib.mjs';

const AUTHORITY = 'SHADOW_ONLY';
const MAX_REPORT_BYTES = 256 * 1024;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || i + 1 >= argv.length) fail('RELEASE_CONTROLLER_ARGUMENT_INVALID', `invalid argument ${arg}`);
    out[arg.slice(2)] = argv[++i];
  }
  requireCondition(['resolve', 'finalize'].includes(out.phase), 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--phase resolve|finalize required');
  requireCondition(out.authority === AUTHORITY, 'RELEASE_AUTHORITY_NOT_ACTIVATED', 'only SHADOW_ONLY authority is available');
  requireCondition(out.report, 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--report required');
  if (out.phase === 'resolve') {
    requireCondition(out['authorization-commit'], 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--authorization-commit required');
    requireCondition(out['release-spec-path'], 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--release-spec-path required');
    requireCondition(out['production-ref'], 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--production-ref required');
  } else {
    requireCondition(out['resolved-transaction'], 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--resolved-transaction required');
    requireCondition(out['verifier-receipt'], 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--verifier-receipt required');
    requireCondition(out['production-ref'], 'RELEASE_CONTROLLER_ARGUMENT_INVALID', '--production-ref required');
  }
  return out;
}

function readJson(filePath, code) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  } catch (error) {
    fail(code, `cannot read JSON ${filePath}: ${error?.message || error}`);
  }
}

function writeReport(filePath, report) {
  const bytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, 'utf8');
  requireCondition(bytes.length <= MAX_REPORT_BYTES, 'RELEASE_REPORT_TOO_LARGE', 'release report exceeds 256 KiB');
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), bytes);
}

function resolveProduction(cwd, productionRef) {
  const commit = gitText(cwd, ['rev-parse', productionRef], 'PRODUCTION_PARENT_NOT_FOUND');
  requireCondition(isGitSha(commit), 'PRODUCTION_PARENT_NOT_FOUND', `production ref ${productionRef} did not resolve to full commit`);
  const latestBlob = blobAt(cwd, commit, 'plugins/simcore/latest.js', 'PRODUCTION_PARENT_NOT_FOUND');
  const installBlob = blobAt(cwd, commit, 'plugins/simcore/install.js', 'PRODUCTION_PARENT_NOT_FOUND');
  requireCondition(latestBlob === installBlob, 'PRODUCTION_PARENT_BLOB_MISMATCH', 'production latest/install differ');
  return { commit, blob: latestBlob };
}

function resolvePhase(cwd, args) {
  const production = resolveProduction(cwd, args['production-ref']);
  const authorization = validateAuthorizationEvent(
    cwd,
    args['authorization-commit'],
    args['release-spec-path'],
    args['expected-release-id'] || '',
  );
  requireCondition(
    production.commit === authorization.expectedProductionCommit,
    'PRODUCTION_PARENT_MOVED',
    `production ${production.commit} != expected ${authorization.expectedProductionCommit}`,
  );

  const transaction = {
    schemaVersion: 1,
    authority: AUTHORITY,
    releaseId: authorization.releaseId,
    authorizationCommit: authorization.authorizationCommit,
    authorizationParent: authorization.authorizationParent,
    releaseSpecPath: authorization.releaseSpecPath,
    releaseSpecSha256: authorization.releaseSpecSha256,
    candidateCommit: authorization.candidateCommit,
    expectedProductionCommit: authorization.expectedProductionCommit,
    candidateReleaseBlob: authorization.candidateReleaseBlob,
    candidateLatestBlob: authorization.candidateLatestBlob,
    candidateInstallBlob: authorization.candidateInstallBlob,
    releaseMode: authorization.releaseMode,
    candidateVersion: authorization.candidateVersion,
    parentVersion: authorization.parentVersion,
    releaseName: authorization.releaseName,
    changedPaths: authorization.changedPaths,
    resolvedProductionCommit: production.commit,
    resolvedProductionBlob: production.blob,
    spec: authorization.spec,
  };
  return {
    schemaVersion: 1,
    phase: 'RESOLVE_AUTHORIZATION',
    authority: AUTHORITY,
    status: 'READY_FOR_CANDIDATE_REQUIRED',
    publicationDisposition: 'NOT_ATTEMPTED',
    productionMutation: 'NONE',
    reasonCode: 'NONE',
    transaction,
  };
}

function validateResolvedTransaction(cwd, transaction) {
  requireCondition(transaction && typeof transaction === 'object', 'RELEASE_TRANSACTION_INVALID', 'resolved transaction missing');
  requireCondition(transaction.schemaVersion === 1, 'RELEASE_TRANSACTION_INVALID', 'transaction schema invalid');
  requireCondition(transaction.authority === AUTHORITY, 'RELEASE_AUTHORITY_NOT_ACTIVATED', 'resolved transaction not SHADOW_ONLY');
  for (const key of ['releaseId', 'authorizationCommit', 'releaseSpecPath', 'releaseSpecSha256', 'candidateCommit', 'expectedProductionCommit', 'candidateReleaseBlob', 'releaseMode']) {
    requireCondition(transaction[key], 'RELEASE_TRANSACTION_INVALID', `transaction.${key} required`);
  }
  requireCondition(isGitSha(transaction.authorizationCommit), 'RELEASE_TRANSACTION_INVALID', 'authorization commit invalid');
  requireCondition(isGitSha(transaction.candidateCommit), 'RELEASE_TRANSACTION_INVALID', 'candidate commit invalid');
  requireCondition(isGitSha(transaction.expectedProductionCommit), 'RELEASE_TRANSACTION_INVALID', 'expected production invalid');
  requireCondition(isGitSha(transaction.candidateReleaseBlob), 'RELEASE_TRANSACTION_INVALID', 'candidate blob invalid');

  const exactSpec = JSON.parse(textAt(cwd, transaction.authorizationCommit, transaction.releaseSpecPath, 'RELEASE_SPEC_SCHEMA_INVALID'));
  const digest = releaseSpecDigest(exactSpec);
  requireCondition(digest === transaction.releaseSpecSha256, 'RELEASE_SPEC_DIGEST_MISMATCH', 'authorization spec digest changed');
  requireCondition(exactSpec.releaseId === transaction.releaseId, 'RELEASE_TRANSACTION_INVALID', 'release ID mismatch');
  requireCondition(exactSpec.candidateCommit === transaction.candidateCommit, 'RELEASE_TRANSACTION_INVALID', 'candidate mismatch');
  requireCondition(exactSpec.expectedProductionCommit === transaction.expectedProductionCommit, 'RELEASE_TRANSACTION_INVALID', 'production parent mismatch');
  requireCondition(exactSpec.candidateReleaseBlob === transaction.candidateReleaseBlob, 'RELEASE_TRANSACTION_INVALID', 'candidate blob mismatch');
  requireCondition(exactSpec.releaseMode === transaction.releaseMode, 'RELEASE_TRANSACTION_INVALID', 'release mode mismatch');

  const candidate = validateCandidateAgainstSpec(cwd, exactSpec);
  requireCondition(candidate.candidateReleaseBlob === transaction.candidateReleaseBlob, 'CANDIDATE_PUBLISH_BLOB_MISMATCH', 'candidate blob no longer matches tuple');
  return { exactSpec, candidate };
}

function validateVerifierReceipt(receipt, transaction) {
  requireCondition(receipt && typeof receipt === 'object', 'CANDIDATE_REQUIRED_FAILED', 'verifier receipt missing');
  requireCondition(receipt.schemaVersion === 1, 'VERIFIER_IDENTITY_MISMATCH', 'verifier receipt schema invalid');
  requireCondition(receipt.authority === AUTHORITY, 'VERIFIER_IDENTITY_MISMATCH', 'verifier authority mismatch');
  requireCondition(receipt.profile === 'CANDIDATE_REQUIRED', 'VERIFIER_IDENTITY_MISMATCH', 'verifier profile mismatch');
  requireCondition(receipt.ciConclusion === 'PASS', 'CANDIDATE_REQUIRED_FAILED', `candidate required conclusion ${receipt.ciConclusion || 'MISSING'}`);
  requireCondition(receipt.verifiedCandidateCommit === transaction.candidateCommit, 'VERIFIER_IDENTITY_MISMATCH', 'verified candidate mismatch');
  requireCondition(receipt.verifiedProductionCommit === transaction.expectedProductionCommit, 'VERIFIER_IDENTITY_MISMATCH', 'verified production mismatch');
  requireCondition(receipt.verifiedCandidateLatestBlob === transaction.candidateReleaseBlob, 'VERIFIER_IDENTITY_MISMATCH', 'verified latest blob mismatch');
  requireCondition(receipt.verifiedCandidateInstallBlob === transaction.candidateReleaseBlob, 'VERIFIER_IDENTITY_MISMATCH', 'verified install blob mismatch');
  requireCondition(isGitSha(receipt.verifierCommit), 'VERIFIER_IDENTITY_MISMATCH', 'verifier commit missing/invalid');
  requireCondition(/^[0-9a-f]{64}$/.test(String(receipt.reportSha256 || '')), 'VERIFIER_IDENTITY_MISMATCH', 'verifier report SHA-256 invalid');
  if (receipt.releaseSpecSha256 != null) {
    requireCondition(receipt.releaseSpecSha256 === transaction.releaseSpecSha256, 'VERIFIER_IDENTITY_MISMATCH', 'release spec digest mismatch');
  }
}

function finalizePhase(cwd, args) {
  const resolved = readJson(args['resolved-transaction'], 'RELEASE_TRANSACTION_INVALID');
  const transaction = resolved.transaction || resolved;
  const receipt = readJson(args['verifier-receipt'], 'CANDIDATE_REQUIRED_FAILED');
  validateResolvedTransaction(cwd, transaction);
  validateVerifierReceipt(receipt, transaction);

  const production = resolveProduction(cwd, args['production-ref']);
  if (transaction.releaseMode === 'NOOP_IDENTICAL') {
    requireCondition(
      production.commit === transaction.expectedProductionCommit,
      'PRODUCTION_PARENT_MOVED',
      `NOOP production ${production.commit} != expected ${transaction.expectedProductionCommit}`,
    );
    requireCondition(production.blob === transaction.candidateReleaseBlob, 'CANDIDATE_PUBLISH_BLOB_MISMATCH', 'NOOP deployed blob mismatch');
    return {
      schemaVersion: 1,
      phase: 'REPORT_TRANSACTION',
      authority: AUTHORITY,
      status: 'SHADOW_COMPLETE',
      releaseId: transaction.releaseId,
      publicationDisposition: 'WOULD_NOOP',
      prePublishDisposition: 'NOOP_IDENTICAL',
      productionMutation: 'NONE',
      observedProductionCommit: production.commit,
      observedProductionBlob: production.blob,
      reasonCode: 'NONE',
      verifierCommit: receipt.verifierCommit,
      verificationReportSha256: receipt.reportSha256,
      transaction,
    };
  }

  if (production.commit === transaction.candidateCommit) {
    requireCondition(production.blob === transaction.candidateReleaseBlob, 'POST_PUBLISH_IDENTITY_MISMATCH', 'production candidate commit has unexpected blob');
    return {
      schemaVersion: 1,
      phase: 'REPORT_TRANSACTION',
      authority: AUTHORITY,
      status: 'SHADOW_COMPLETE',
      releaseId: transaction.releaseId,
      publicationDisposition: 'WOULD_ALREADY_PROMOTED',
      prePublishDisposition: 'ALREADY_PROMOTED',
      productionMutation: 'NONE',
      observedProductionCommit: production.commit,
      observedProductionBlob: production.blob,
      reasonCode: 'NONE',
      verifierCommit: receipt.verifierCommit,
      verificationReportSha256: receipt.reportSha256,
      transaction,
    };
  }

  requireCondition(
    production.commit === transaction.expectedProductionCommit,
    'PRODUCTION_PARENT_MOVED',
    `production ${production.commit} != expected ${transaction.expectedProductionCommit}`,
  );
  requireCondition(production.blob === transaction.resolvedProductionBlob, 'PRODUCTION_STATE_DRIFT', 'production blob changed under same expected identity');

  return {
    schemaVersion: 1,
    phase: 'REPORT_TRANSACTION',
    authority: AUTHORITY,
    status: 'SHADOW_COMPLETE',
    releaseId: transaction.releaseId,
    publicationDisposition: 'WOULD_PUBLISH',
    prePublishDisposition: 'READY_TO_PUBLISH',
    productionMutation: 'NONE',
    observedProductionCommit: production.commit,
    observedProductionBlob: production.blob,
    reasonCode: 'NONE',
    verifierCommit: receipt.verifierCommit,
    verificationReportSha256: receipt.reportSha256,
    transaction,
  };
}

export function runController(cwd, args) {
  return args.phase === 'resolve' ? resolvePhase(cwd, args) : finalizePhase(cwd, args);
}

function blockedReport(args, error) {
  return {
    schemaVersion: 1,
    phase: String(args.phase || 'UNKNOWN').toUpperCase(),
    authority: AUTHORITY,
    status: 'RELEASE_BLOCKED',
    publicationDisposition: 'BLOCKED',
    productionMutation: 'NONE',
    reasonCode: error?.releaseCode || 'RELEASE_CONTROLLER_ERROR',
    detailDigest: sha256(Buffer.from(String(error?.message || error).slice(0, 2048), 'utf8')),
  };
}

function main() {
  let args = {};
  try {
    args = parseArgs(process.argv.slice(2));
    const report = runController(process.cwd(), args);
    writeReport(args.report, report);
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } catch (error) {
    const reportPath = args.report || (() => {
      const at = process.argv.indexOf('--report');
      return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : null;
    })();
    const report = blockedReport(args, error);
    if (reportPath) writeReport(reportPath, report);
    console.error(`${error?.releaseCode || 'RELEASE_CONTROLLER_ERROR'}: ${error?.message || error}`);
    process.exit(error instanceof ReleaseError ? 1 : 2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
