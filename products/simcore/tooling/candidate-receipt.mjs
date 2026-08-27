#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  deriveReceipt,
  deriveSpecShadow as coreDeriveSpecShadow,
  validateReleaseIdentity,
} from './candidate-receipt-core.mjs';
import { assertActiveReleaseSpecContract } from './release-spec-contract.mjs';

export { deriveReceipt, validateReleaseIdentity };

function normalizedSpec(request, receipt) {
  return {
    version: request.targetVersion,
    releaseName: request.releaseName,
    releaseMode: request.releaseMode,
    candidateCommit: receipt?.candidateCommit,
    expectedProductionCommit: receipt?.expectedProductionCommit,
    candidateReleaseBlob: receipt?.candidateReleaseBlob,
    primaryGoalId: request.primaryGoalId,
    changeClass: request.changeClass,
    evidenceRefs: request.evidenceRefs,
    liveGate: request.liveGate,
  };
}

export function deriveSpecShadow(request, receipt) {
  assertActiveReleaseSpecContract(normalizedSpec(request, receipt), 'SPEC_SHADOW');
  const shadow = coreDeriveSpecShadow(request, receipt);
  assertActiveReleaseSpecContract(shadow.derivedSpec, 'SPEC_SHADOW');
  return shadow;
}

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || i + 1 >= argv.length) fail('CANDIDATE_RECEIPT_ARGUMENT_INVALID', arg);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['request', 'candidate-report', 'verifier-commit', 'receipt', 'spec-shadow']) {
    if (!out[key]) fail('CANDIDATE_RECEIPT_ARGUMENT_MISSING', key);
  }
  return out;
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const request = JSON.parse(fs.readFileSync(args.request, 'utf8'));
  const reportBytes = fs.readFileSync(args['candidate-report']);
  const report = JSON.parse(reportBytes);
  const receipt = deriveReceipt(request, report, args['verifier-commit'], sha256(reportBytes));
  const shadow = deriveSpecShadow(request, receipt);
  writeJson(args.receipt, receipt);
  writeJson(args['spec-shadow'], shadow);
  console.log(`SIMCORE_CANDIDATE_RECEIPT_PASS intent=${receipt.intentId} release=${receipt.releaseId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(`${error.code || 'CANDIDATE_RECEIPT_ERROR'}: ${error.message || error}`);
    process.exit(2);
  }
}
