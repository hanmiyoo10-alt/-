import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPOSURE_LINES } from './exposure-prompt-contract-offline-evaluator.mjs';
import {
  PROTOCOL_VERSION,
  candidateContractHash,
} from './exposure-model-compliance-eval-harness.mjs';
import {
  HOST_ADAPTER_CANDIDATE,
  PREP_VERSION,
} from './exposure-model-compliance-m1-execution-prep.mjs';
import {
  ADAPTER_VERSION,
  EXPECTED_CANDIDATE_HASH,
  EXPECTED_REQUEST_STAGE,
  PREFLIGHT_VERSION,
} from './exposure-model-compliance-m1-target-host-preflight.mjs';
import { RESULT_TOOL_VERSION } from './exposure-m1-result-ingest-and-scoring.mjs';

const DRIFT_GUARD_VERSION = 'EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD_2026-09-01';
const EXPECTED_PRODUCTION_AUTHORITY = Object.freeze({
  version: '0.70.1',
  releaseName: 'Cold First-Turn Tail Attribution',
  releaseBranch: 'release-simcore',
  releaseCommit: '861100f4771967aa5b8ab8811d06f11702c0d3ff',
});
const SOURCE_PROVENANCE_PRECEDING_LINE =
  'specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support;CURRENT_SOURCE_EVIDENCE_may_support_only_nonconflicting_rendered_details=1;outside_root_specifics_omit=1';
const SOURCE_PROVENANCE_ANCHOR =
  'outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1';
const NEW_SOURCE_BRANCH_TOKEN = 'if (p.communitySourceHandoffNewSource) {';
const NEW_SOURCE_GUIDANCE_TOKEN = 'short_community_request_reused_with_new_source=${sourceRootMode}';
const PROMPT_CHANGE_REASON_TOKEN = "if (/short_community_|derive_reaction_from_current_source/m.test(text)) return 'handoff/lineage';";
const RUNTIME_LINE_TIER_FALLBACK_TOKEN = "if (promptChangeReason('', value) !== 'other') return 'volatile';";
const EXPECTED_INSERTION_CONTRACT = 'AFTER_EXISTING_SOURCE_PROVENANCE_BEFORE_NEW_SOURCE_GUIDANCE';
const EXPECTED_MUTATION_SCOPE = 'REQUEST_LOCAL_BEFORE_REQUEST_MESSAGE_ARRAY_ONLY';
const EXPECTED_PROVIDER_OBSERVATION_SCOPE = 'READ_ONLY_PROVIDER_REQUEST_BODY_HASH_AND_CANDIDATE_VISIBILITY';
const EXPECTED_CANDIDATE_HASH = '3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc';

function sha256Utf8(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function countExactLine(source, target) {
  return String(source || '').split(/\r?\n/).filter((line) => line.trim() === target).length;
}

function countSubstring(source, target) {
  const text = String(source || '');
  if (!target) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const index = text.indexOf(target, from);
    if (index < 0) return count;
    count += 1;
    from = index + target.length;
  }
}

function sameAuthority(actual, expected = EXPECTED_PRODUCTION_AUTHORITY) {
  return ['version', 'releaseName', 'releaseBranch', 'releaseCommit'].every((key) => actual?.[key] === expected[key]);
}

function sourceOrderPass(source) {
  const text = String(source || '');
  const preceding = text.indexOf(SOURCE_PROVENANCE_PRECEDING_LINE);
  const anchor = text.indexOf(SOURCE_PROVENANCE_ANCHOR);
  const branch = text.indexOf(NEW_SOURCE_BRANCH_TOKEN, Math.max(anchor, 0));
  const guidance = text.indexOf(NEW_SOURCE_GUIDANCE_TOKEN, Math.max(branch, 0));
  return preceding >= 0 && anchor > preceding && branch > anchor && guidance > branch;
}

function hostAdapterContractFailures(hostAdapterSource) {
  const source = String(hostAdapterSource || '');
  const failures = [];
  if (!source.trim()) return ['HOST_ADAPTER_SOURCE_MISSING'];
  if (countSubstring(source, `const ADAPTER_VERSION = '${ADAPTER_VERSION}'`) !== 1) failures.push('HOST_ADAPTER_VERSION_DRIFT');
  if (countSubstring(source, `const EXPECTED_CANDIDATE_HASH = '${EXPECTED_CANDIDATE_HASH}'`) !== 1) failures.push('HOST_ADAPTER_CANDIDATE_HASH_DRIFT');
  if (countSubstring(source, `'${SOURCE_PROVENANCE_ANCHOR}'`) !== 1) failures.push('HOST_ADAPTER_ANCHOR_DRIFT');
  if (countSubstring(source, `requestStage: '${EXPECTED_REQUEST_STAGE}'`) < 1 && countSubstring(source, `requestStage: '${EXPECTED_REQUEST_STAGE}'`) < 1) {
    failures.push('HOST_ADAPTER_REQUEST_STAGE_DRIFT');
  }
  for (const line of EXPOSURE_LINES) {
    if (countSubstring(source, `'${line}'`) !== 1) failures.push(`HOST_ADAPTER_CANDIDATE_LINE_DRIFT:${sha256Utf8(line).slice(0, 12)}`);
  }
  if (!source.includes("mutationScope: 'REQUEST_LOCAL_BEFORE_REQUEST_MESSAGE_ARRAY_ONLY'") && !source.includes(EXPECTED_MUTATION_SCOPE)) {
    failures.push('HOST_ADAPTER_MUTATION_SCOPE_DRIFT');
  }
  return failures;
}

export function assessExposureAnchorAndContractDrift({
  productionSource,
  productionAuthority,
  hostAdapterSource,
} = {}) {
  const failures = [];
  const missing = [];
  const production = String(productionSource || '');
  const hostAdapter = String(hostAdapterSource || '');

  if (!production.trim()) missing.push('PRODUCTION_SOURCE');
  if (!productionAuthority) missing.push('PRODUCTION_AUTHORITY');
  if (!hostAdapter.trim()) missing.push('HOST_ADAPTER_SOURCE');

  const actualCandidateHash = candidateContractHash(EXPOSURE_LINES);
  if (EXPOSURE_LINES.length !== 6) failures.push('CANDIDATE_LINE_COUNT_DRIFT');
  if (new Set(EXPOSURE_LINES).size !== 6) failures.push('CANDIDATE_LINE_UNIQUENESS_DRIFT');
  if (!EXPOSURE_LINES.every((line) => line.startsWith('short_community_b_'))) failures.push('CANDIDATE_LINE_PREFIX_DRIFT');
  if (actualCandidateHash !== EXPECTED_CANDIDATE_HASH) failures.push('CANDIDATE_HASH_DRIFT');
  if (EXPECTED_CANDIDATE_HASH !== EXPECTED_CANDIDATE_HASH) failures.push('PREFLIGHT_CANDIDATE_HASH_DRIFT');

  if (HOST_ADAPTER_CANDIDATE.insertionContract !== EXPECTED_INSERTION_CONTRACT) failures.push('PREP_INSERTION_CONTRACT_DRIFT');
  if (HOST_ADAPTER_CANDIDATE.mutationScope !== EXPECTED_MUTATION_SCOPE) failures.push('PREP_MUTATION_SCOPE_DRIFT');
  if (HOST_ADAPTER_CANDIDATE.requestStage !== EXPECTED_REQUEST_STAGE) failures.push('PREP_REQUEST_STAGE_DRIFT');
  if (HOST_ADAPTER_CANDIDATE.providerObservationScope !== EXPECTED_PROVIDER_OBSERVATION_SCOPE) failures.push('PREP_PROVIDER_OBSERVATION_SCOPE_DRIFT');
  if (HOST_ADAPTER_CANDIDATE.providerRequestMutationAuthorized !== false) failures.push('PREP_PROVIDER_MUTATION_AUTHORITY_DRIFT');
  if (HOST_ADAPTER_CANDIDATE.productionInstallAuthorized !== false) failures.push('PREP_PRODUCTION_INSTALL_AUTHORITY_DRIFT');

  if (productionAuthority && !sameAuthority(productionAuthority)) failures.push('PRODUCTION_AUTHORITY_DRIFT');
  if (production.trim()) {
    if (countSubstring(production, '//@version 0.70.1') !== 1) failures.push('PRODUCTION_VERSION_METADATA_DRIFT');
    if (countSubstring(production, SOURCE_PROVENANCE_ANCHOR) !== 1) failures.push('PRODUCTION_ANCHOR_CARDINALITY_DRIFT');
    if (countSubstring(production, SOURCE_PROVENANCE_PRECEDING_LINE) !== 1) failures.push('PRODUCTION_PRECEDING_PROVENANCE_DRIFT');
    if (!sourceOrderPass(production)) failures.push('PRODUCTION_ANCHOR_ORDER_DRIFT');
    if (!production.includes(PROMPT_CHANGE_REASON_TOKEN)) failures.push('PRODUCTION_PROMPT_CHANGE_REASON_CLASSIFIER_DRIFT');
    if (!production.includes(RUNTIME_LINE_TIER_FALLBACK_TOKEN)) failures.push('PRODUCTION_RUNTIME_LINE_TIER_DRIFT');
    if (EXPOSURE_LINES.some((line) => countExactLine(production, line) > 0 || production.includes(`lines.push('${line}')`))) {
      failures.push('CANDIDATE_ALREADY_PRESENT_IN_PRODUCTION');
    }
  }

  if (hostAdapter.trim()) failures.push(...hostAdapterContractFailures(hostAdapter));

  let status = 'PASS_EXPOSURE_EVAL_CONTRACT_DRIFT_GUARD';
  if (failures.length) status = 'BLOCK_EXPOSURE_EVAL_CONTRACT_DRIFT';
  else if (missing.length) status = 'HOLD_EXPOSURE_EVAL_GUARD_INPUT_REQUIRED';

  return {
    schema: 1,
    driftGuardVersion: DRIFT_GUARD_VERSION,
    status,
    readyToResumeTargetHostPreflight: status === 'PASS_EXPOSURE_EVAL_CONTRACT_DRIFT_GUARD',
    runtimeMutationAuthorized: false,
    productionImplementationAuthorized: false,
    modelCallsExecuted: false,
    expectedProductionAuthority: { ...EXPECTED_PRODUCTION_AUTHORITY },
    observedProductionAuthority: productionAuthority ? { ...productionAuthority } : null,
    candidateContractHash: actualCandidateHash,
    candidateLineCount: EXPOSURE_LINES.length,
    protocolVersion: PROTOCOL_VERSION,
    prepVersion: PREP_VERSION,
    preflightVersion: PREFLIGHT_VERSION,
    adapterVersion: ADAPTER_VERSION,
    resultToolVersion: RESULT_TOOL_VERSION,
    insertionContract: HOST_ADAPTER_CANDIDATE.insertionContract,
    requestStage: HOST_ADAPTER_CANDIDATE.requestStage,
    sourceAnchor: SOURCE_PROVENANCE_ANCHOR,
    failures,
    missing,
    watches: [
      'MODEL_SETTINGS_FINGERPRINT_REMAINS_BOUNDED_HOST_PROJECTION',
      'PROVIDER_BODY_EXACT_OCCURRENCE_MULTIPLICITY_REQUIRES_TARGET_HOST_EVIDENCE',
      'OUTPUT_LISTENER_CORRELATION_REQUIRES_TARGET_HOST_PREFLIGHT',
    ],
  };
}

export function assertExposureDriftGuardIntegrity(result) {
  const failures = [];
  if (result?.schema !== 1) failures.push('SCHEMA');
  if (result?.driftGuardVersion !== DRIFT_GUARD_VERSION) failures.push('VERSION');
  if (result?.candidateContractHash !== EXPECTED_CANDIDATE_HASH) failures.push('CANDIDATE_HASH');
  if (result?.candidateLineCount !== 6) failures.push('CANDIDATE_LINE_COUNT');
  if (result?.runtimeMutationAuthorized !== false) failures.push('RUNTIME_AUTH');
  if (result?.productionImplementationAuthorized !== false) failures.push('PRODUCTION_AUTH');
  if (result?.modelCallsExecuted !== false) failures.push('MODEL_CALL_FLAG');
  if (![
    'PASS_EXPOSURE_EVAL_CONTRACT_DRIFT_GUARD',
    'BLOCK_EXPOSURE_EVAL_CONTRACT_DRIFT',
    'HOLD_EXPOSURE_EVAL_GUARD_INPUT_REQUIRED',
  ].includes(result?.status)) failures.push('STATUS');
  if (result?.readyToResumeTargetHostPreflight === true && result?.status !== 'PASS_EXPOSURE_EVAL_CONTRACT_DRIFT_GUARD') failures.push('READY_STATUS_MISMATCH');
  return { pass: failures.length === 0, failures };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--') || i + 1 >= argv.length) throw new Error(`invalid argument ${key}`);
    out[key.slice(2)] = argv[++i];
  }
  for (const key of ['production-source', 'production-commit', 'host-adapter-source']) {
    if (!out[key]) throw new Error(`--${key} required`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const productionSource = fs.readFileSync(path.resolve(args['production-source']), 'utf8');
  const hostAdapterSource = fs.readFileSync(path.resolve(args['host-adapter-source']), 'utf8');
  const result = assessExposureAnchorAndContractDrift({
    productionSource,
    productionAuthority: {
      version: args['production-version'] || EXPECTED_PRODUCTION_AUTHORITY.version,
      releaseName: args['production-release-name'] || EXPECTED_PRODUCTION_AUTHORITY.releaseName,
      releaseBranch: args['production-branch'] || EXPECTED_PRODUCTION_AUTHORITY.releaseBranch,
      releaseCommit: args['production-commit'],
    },
    hostAdapterSource,
  });
  const encoded = `${JSON.stringify(result, null, 2)}\n`;
  if (args.report) fs.writeFileSync(path.resolve(args.report), encoded, 'utf8');
  process.stdout.write(encoded);
  if (result.status === 'BLOCK_EXPOSURE_EVAL_CONTRACT_DRIFT') process.exit(1);
  if (result.status !== 'PASS_EXPOSURE_EVAL_CONTRACT_DRIFT_GUARD') process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(`EXPOSURE_DRIFT_GUARD_ERROR: ${error?.message || error}`);
    process.exit(2);
  }
}

export {
  DRIFT_GUARD_VERSION,
  EXPECTED_CANDIDATE_HASH,
  EXPECTED_INSERTION_CONTRACT,
  EXPECTED_MUTATION_SCOPE,
  EXPECTED_PRODUCTION_AUTHORITY,
  EXPECTED_PROVIDER_OBSERVATION_SCOPE,
  NEW_SOURCE_BRANCH_TOKEN,
  NEW_SOURCE_GUIDANCE_TOKEN,
  PROMPT_CHANGE_REASON_TOKEN,
  RUNTIME_LINE_TIER_FALLBACK_TOKEN,
  SOURCE_PROVENANCE_ANCHOR,
  SOURCE_PROVENANCE_PRECEDING_LINE,
};
