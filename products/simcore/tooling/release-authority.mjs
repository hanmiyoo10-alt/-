#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { evaluateShadow } from './release-shadow.mjs';

const HEX40 = /^[0-9a-f]{40}$/;

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function git(...args) {
  return execFileSync('git', args, { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim();
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function canonicalBytes(value) { return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8'); }

function verifyRequiredReport(spec, report, expectedVerifierCommit, requiredAuthority) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) fail('REQUIRED_REPORT_MISSING');
  if (report.profile !== 'CANDIDATE_REQUIRED') fail('REQUIRED_REPORT_PROFILE_INVALID');
  if (report.conclusion !== 'PASS') fail('REQUIRED_REPORT_NOT_PASS', String(report.conclusion || 'MISSING'));
  if (report.candidateCommit !== spec.candidateCommit) fail('REQUIRED_REPORT_CANDIDATE_MISMATCH');
  if (report.expectedProductionCommit !== spec.expectedProductionCommit) fail('REQUIRED_REPORT_PARENT_MISMATCH');
  if (report.productionCommit !== spec.expectedProductionCommit) fail('REQUIRED_REPORT_PRODUCTION_MISMATCH');
  if (report.candidateRequiredAuthority !== requiredAuthority) fail('REQUIRED_REPORT_AUTHORITY_MISMATCH');
  if (!HEX40.test(report.verifierCommit || '')) fail('REQUIRED_REPORT_VERIFIER_INVALID');
  if (expectedVerifierCommit && report.verifierCommit !== expectedVerifierCommit) fail('REQUIRED_REPORT_VERIFIER_MISMATCH');
}

function verifyImmutableAuthorization(spec, specPath, authorizationCommit) {
  if (!authorizationCommit) return null;
  if (!HEX40.test(authorizationCommit)) fail('RELEASE_AUTHORIZATION_COMMIT_INVALID');
  git('cat-file','-e',`${authorizationCommit}^{commit}`);
  let authorizedText;
  try { authorizedText = git('show',`${authorizationCommit}:${specPath}`); }
  catch { fail('RELEASE_AUTHORIZATION_SPEC_MISSING'); }
  let authorizedSpec;
  try { authorizedSpec = JSON.parse(authorizedText); }
  catch { fail('RELEASE_AUTHORIZATION_SPEC_INVALID'); }
  const authorizedBytes = canonicalBytes(authorizedSpec);
  const expected = canonicalBytes(spec);
  if (!authorizedBytes.equals(expected)) fail('RELEASE_AUTHORIZATION_MIXED_COMMIT');
  const touches = git('log','--format=%H','--',specPath).split(/\r?\n/).filter(Boolean);
  if (touches.length !== 1 || touches[0] !== authorizationCommit) fail('RELEASE_SPEC_MUTATED_AFTER_AUTHORIZATION');
  return { authorizationCommit, releaseSpecSha256:sha256(expected) };
}

export function authorizeRelease({
  spec,
  specPath,
  ciReport,
  currentProductionCommit,
  expectedVerifierCommit = null,
  requiredAuthority = 'RS2_4_RELEASE',
  authorizationCommit = null,
}) {
  verifyRequiredReport(spec, ciReport, expectedVerifierCommit, requiredAuthority);
  const shadow = evaluateShadow({ spec, specPath, ciConclusion:'PASS', currentProductionCommit });
  const authorization = verifyImmutableAuthorization(spec, specPath, authorizationCommit);
  const tuple = {
    releaseId:spec.releaseId,
    candidateCommit:spec.candidateCommit,
    expectedProductionCommit:spec.expectedProductionCommit,
    candidateReleaseBlob:spec.candidateReleaseBlob,
    verifierCommit:ciReport.verifierCommit,
    requiredAuthority,
  };
  return {
    schemaVersion:1,
    releaseAuthority:'RS2_4_PERMANENT_CANDIDATE',
    decision:shadow.publicationDisposition === 'WOULD_NOOP' ? 'AUTHORIZED_NOOP' : 'AUTHORIZED_PUBLISH',
    tuple,
    tupleSha256:sha256(canonicalBytes(tuple)),
    authorization,
    candidate:shadow.candidate,
    production:shadow.production,
    verification:{ candidateRequired:'PASS', reportAuthority:requiredAuthority },
  };
}
