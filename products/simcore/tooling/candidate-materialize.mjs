#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  materialize as coreMaterialize,
  validateRequest as coreValidateRequest,
  evaluateExistingCandidate,
} from './candidate-materialize-core.mjs';
import { assertActiveReleaseSpecContract } from './release-spec-contract.mjs';

function normalizedSpec(request) {
  return {
    version: request.targetVersion,
    releaseName: request.releaseName,
    releaseMode: request.releaseMode,
    changeClass: request.changeClass,
    primaryGoalId: request.primaryGoalId,
    evidenceRefs: request.evidenceRefs,
    liveGate: request.liveGate,
  };
}

export { evaluateExistingCandidate };

export function validateRequest(input) {
  const request = coreValidateRequest(input);
  assertActiveReleaseSpecContract(normalizedSpec(request), 'CANDIDATE_REQUEST');
  return request;
}

export function materialize(args) {
  const root = path.resolve(args?.root || '.');
  const requestPath = path.resolve(root, String(args?.request || ''));
  validateRequest(JSON.parse(fs.readFileSync(requestPath, 'utf8')));
  return coreMaterialize({ ...args, root });
}

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) fail('CANDIDATE_ARGUMENT_INVALID', arg);
    if (arg === '--skip-regression') { out.skipRegression = true; continue; }
    if (i + 1 >= argv.length) fail('CANDIDATE_ARGUMENT_INVALID', arg);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['request', 'source-commit', 'production-commit', 'report']) {
    if (!out[key]) fail('CANDIDATE_ARGUMENT_MISSING', key);
  }
  out.root = path.resolve(out.root || '.');
  out.mode = out.mode || 'materialize';
  if (!['materialize', 'verify'].includes(out.mode)) fail('CANDIDATE_MODE_INVALID');
  return out;
}

function main() {
  const result = materialize(parseArgs(process.argv.slice(2)));
  console.log(`SIMCORE_CANDIDATE_MATERIALIZE_PASS intent=${result.intentId} disposition=${result.candidateDisposition} C=${result.candidateCommit || 'NONE'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(`${error.code || 'CANDIDATE_MATERIALIZE_ERROR'}: ${error.message || error}`);
    process.exit(2);
  }
}
