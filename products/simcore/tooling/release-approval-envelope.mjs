#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveApproval } from './release-approval-resolve.mjs';

const MODES = new Set(['PREMERGE', 'POSTMERGE']);
const RELEASE_ID = /^simcore-v\d+\.\d+\.\d+-(?:new|correction|rollback)-\d{2,}$/;
const APPROVAL_PATH = /^products\/simcore\/releases\/approvals\/[A-Za-z0-9._-]+\.json$/;
const SPEC_PATH = /^products\/simcore\/releases\/specs\/[A-Za-z0-9._-]+\.json$/;

function fail(code, detail = '') {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}
function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}
function normalizeJson(value) {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeJson(value[key])]));
  }
  return value;
}
function semanticallyEqual(a, b) {
  return JSON.stringify(normalizeJson(a)) === JSON.stringify(normalizeJson(b));
}
function mapResolverError(error) {
  const code = String(error?.code || '');
  if (code.startsWith('APPROVAL_ENVELOPE_')) return error;
  if (code === 'APPROVAL_PATH_MISMATCH') return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_APPROVAL_PATH_INVALID' });
  if (code === 'APPROVAL_CANDIDATE_REF_MOVED') return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_CANDIDATE_MOVED' });
  if (code === 'APPROVAL_PRODUCTION_PARENT_MOVED') return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_PRODUCTION_PARENT_MOVED' });
  if (code === 'APPROVAL_AUTHORITY_INVALID') return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_AUTHORITY_INVALID' });
  if (code.includes('RECEIPT')) return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_RECEIPT_INVALID' });
  if (code.includes('SHADOW')) return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_SHADOW_INVALID' });
  if (code.includes('SPEC')) return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_SHADOW_INVALID' });
  if (code.startsWith('APPROVAL_')) return Object.assign(new Error(code), { code: 'APPROVAL_ENVELOPE_APPROVAL_INVALID' });
  return Object.assign(new Error(error?.message || String(error)), { code: 'APPROVAL_ENVELOPE_VALIDATION_ERROR' });
}
function inside(root, rel) {
  const base = path.resolve(root || '.');
  const target = path.resolve(base, normalizePath(rel));
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) fail('APPROVAL_ENVELOPE_PATH_OUTSIDE_ROOT', rel);
  return target;
}
function readJson(root, rel, missingCode) {
  const file = inside(root, rel);
  if (!fs.existsSync(file)) fail(missingCode, rel);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail('APPROVAL_ENVELOPE_JSON_INVALID', `${rel}: ${error?.message || error}`); }
}

export function deriveApprovalEnvelopePaths({ approval, approvalPath }) {
  const ap = normalizePath(approvalPath);
  const releaseId = String(approval?.releaseId || '');
  if (!RELEASE_ID.test(releaseId)) fail('APPROVAL_ENVELOPE_APPROVAL_INVALID', 'releaseId');
  const expectedApprovalPath = `products/simcore/releases/approvals/${releaseId}.json`;
  const specPath = `products/simcore/releases/specs/${releaseId}.json`;
  const specShadowPath = `products/simcore/releases/spec-shadows/${releaseId}.json`;
  const candidateReceiptPath = normalizePath(approval?.candidateReceiptPath);
  if (ap !== expectedApprovalPath || !APPROVAL_PATH.test(ap)) fail('APPROVAL_ENVELOPE_APPROVAL_PATH_INVALID', ap);
  return {
    releaseId,
    approvalPath: ap,
    specPath,
    specShadowPath,
    candidateReceiptPath,
    canonicalTitle: `SimCore exact release approval: ${releaseId}`,
  };
}

export function loadApprovalEnvelopeFiles({ root = '.', approvalPath, specPath }) {
  const ap = normalizePath(approvalPath);
  const sp = normalizePath(specPath);
  const approval = readJson(root, ap, 'APPROVAL_ENVELOPE_APPROVAL_MISSING');
  const derived = deriveApprovalEnvelopePaths({ approval, approvalPath: ap });
  const authorizedSpec = readJson(root, sp, 'APPROVAL_ENVELOPE_SPEC_MISSING');
  const candidateReceipt = readJson(root, derived.candidateReceiptPath, 'APPROVAL_ENVELOPE_RECEIPT_MISSING');
  const specShadow = readJson(root, derived.specShadowPath, 'APPROVAL_ENVELOPE_SHADOW_MISSING');
  return {
    ...derived,
    specPath: sp,
    approval,
    authorizedSpec,
    candidateReceipt,
    specShadow,
  };
}

export function validateApprovalEnvelope({
  mode,
  approval,
  approvalPath,
  authorizedSpec,
  specPath,
  candidateReceipt,
  candidateReceiptPath,
  specShadow,
  specShadowPath,
  observedCandidateCommit,
  observedProductionCommit,
  changedPaths,
  observedTitle = null,
}) {
  if (!MODES.has(mode)) fail('APPROVAL_ENVELOPE_MODE_INVALID', mode);
  const ap = normalizePath(approvalPath);
  const sp = normalizePath(specPath);
  const cp = normalizePath(candidateReceiptPath);
  const shp = normalizePath(specShadowPath);
  let derived;
  try { derived = deriveApprovalEnvelopePaths({ approval, approvalPath: ap }); }
  catch (error) { throw mapResolverError(error); }
  if (sp !== derived.specPath || !SPEC_PATH.test(sp)) fail('APPROVAL_ENVELOPE_SPEC_PATH_INVALID', sp);
  if (cp !== derived.candidateReceiptPath) fail('APPROVAL_ENVELOPE_RECEIPT_INVALID', cp);
  if (shp !== derived.specShadowPath) fail('APPROVAL_ENVELOPE_SHADOW_INVALID', shp);

  const paths = (changedPaths || []).map(normalizePath).filter(Boolean);
  if (paths.length !== 2 || new Set(paths).size !== 2) fail('APPROVAL_ENVELOPE_CHANGED_PATH_INVALID', paths.join(','));
  const expectedChanged = [ap, sp].sort();
  if (JSON.stringify([...paths].sort()) !== JSON.stringify(expectedChanged)) fail('APPROVAL_ENVELOPE_CHANGED_PATH_INVALID', paths.join(','));

  let resolved;
  try {
    resolved = resolveApproval({
      approval,
      approvalPath: ap,
      candidateReceipt,
      candidateReceiptPath: cp,
      specShadow,
      specShadowPath: shp,
      observedCandidateCommit,
      observedProductionCommit,
    });
  } catch (error) {
    throw mapResolverError(error);
  }
  if (!semanticallyEqual(authorizedSpec, resolved.resolvedSpec)) fail('APPROVAL_ENVELOPE_SPEC_NOT_MACHINE_DERIVED');
  if (resolved.productionMutation !== 'NONE') fail('APPROVAL_ENVELOPE_MUTATION_INVALID');

  const title = observedTitle == null ? null : String(observedTitle);
  return {
    schemaVersion: 1,
    product: 'SimCore',
    validationMode: mode,
    releaseId: derived.releaseId,
    approvalPath: ap,
    specPath: sp,
    candidateReceiptPath: cp,
    specShadowPath: shp,
    candidateFetchRef: candidateReceipt.candidateFetchRef,
    candidateCommit: candidateReceipt.candidateCommit,
    expectedProductionCommit: candidateReceipt.expectedProductionCommit,
    candidateReleaseBlob: candidateReceipt.candidateReleaseBlob,
    authorityConfirmation: 'RS2_4_RELEASE',
    canonicalTitle: derived.canonicalTitle,
    observedTitle: title,
    titleCanonical: title == null ? null : title === derived.canonicalTitle,
    resolvedSpec: resolved.resolvedSpec,
    resolvedSpecSha256: resolved.resolvedSpecSha256,
    releaseAuthority: 'APPROVAL_ENVELOPE_VALIDATION_ONLY',
    productionMutation: 'NONE',
    publicationDispatch: 'NONE_VALIDATION_ONLY',
    result: 'PASS',
  };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || i + 1 >= argv.length) fail('APPROVAL_ENVELOPE_ARGUMENT_INVALID', arg);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['mode', 'approval', 'spec', 'observed-candidate', 'observed-production', 'changed-paths', 'report']) {
    if (!out[key]) fail('APPROVAL_ENVELOPE_ARGUMENT_MISSING', key);
  }
  return out;
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const loaded = loadApprovalEnvelopeFiles({ root: '.', approvalPath: args.approval, specPath: args.spec });
  const changedPaths = fs.readFileSync(args['changed-paths'], 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const report = validateApprovalEnvelope({
    mode: args.mode,
    approval: loaded.approval,
    approvalPath: loaded.approvalPath,
    authorizedSpec: loaded.authorizedSpec,
    specPath: loaded.specPath,
    candidateReceipt: loaded.candidateReceipt,
    candidateReceiptPath: loaded.candidateReceiptPath,
    specShadow: loaded.specShadow,
    specShadowPath: loaded.specShadowPath,
    observedCandidateCommit: args['observed-candidate'],
    observedProductionCommit: args['observed-production'],
    changedPaths,
    observedTitle: args['observed-title'] ?? null,
  });
  writeJson(args.report, report);
  console.log(`SIMCORE_APPROVAL_ENVELOPE_PASS mode=${report.validationMode} release=${report.releaseId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(`${error?.code || 'APPROVAL_ENVELOPE_ERROR'}: ${error?.message || error}`);
    process.exit(1);
  }
}
