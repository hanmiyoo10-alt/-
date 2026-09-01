import assert from 'node:assert/strict';
import { classifyPaths } from './ci/classify.mjs';
import { EXPOSURE_LINES } from './exposure-prompt-contract-offline-evaluator.mjs';
import {
  ADAPTER_VERSION,
  EXPECTED_REQUEST_STAGE,
} from './exposure-model-compliance-m1-target-host-preflight.mjs';
import {
  assessExposureAnchorAndContractDrift,
  assertExposureDriftGuardIntegrity,
  EXPECTED_CANDIDATE_HASH,
  EXPECTED_MUTATION_SCOPE,
  EXPECTED_PRODUCTION_AUTHORITY,
  NEW_SOURCE_BRANCH_TOKEN,
  NEW_SOURCE_GUIDANCE_TOKEN,
  PROMPT_CHANGE_REASON_TOKEN,
  RUNTIME_LINE_TIER_FALLBACK_TOKEN,
  SOURCE_PROVENANCE_ANCHOR,
  SOURCE_PROVENANCE_PRECEDING_LINE,
} from './exposure-anchor-and-contract-drift-guard.mjs';

function productionSource() {
  return [
    '//@name simcore',
    '//@version 0.70.1',
    'function buildRuntimePrompt(p) {',
    "  lines.push('short_community_source_is_authoritative=1');",
    `  lines.push('${SOURCE_PROVENANCE_PRECEDING_LINE}');`,
    `  lines.push('${SOURCE_PROVENANCE_ANCHOR}');`,
    `  ${NEW_SOURCE_BRANCH_TOKEN}`,
    `    lines.push(\`${NEW_SOURCE_GUIDANCE_TOKEN}\`);`,
    '  }',
    '}',
    'function promptChangeReason(prev, next) {',
    '  const text = `${prev}\\n${next}`;',
    `  ${PROMPT_CHANGE_REASON_TOKEN}`,
    "  return 'other';",
    '}',
    'function runtimeLineTier(line) {',
    "  const value = String(line || '');",
    `  ${RUNTIME_LINE_TIER_FALLBACK_TOKEN}`,
    "  return 'stable';",
    '}',
  ].join('\n');
}

function hostAdapterSource() {
  return [
    `const ADAPTER_VERSION = '${ADAPTER_VERSION}';`,
    `const EXPECTED_CANDIDATE_HASH = '${EXPECTED_CANDIDATE_HASH}';`,
    `const SOURCE_PROVENANCE_ANCHOR = '${SOURCE_PROVENANCE_ANCHOR}';`,
    'const EXPOSURE_LINES = Object.freeze([',
    ...EXPOSURE_LINES.map((line) => `  '${line}',`),
    ']);',
    `const requestPolicy = { requestStage: '${EXPECTED_REQUEST_STAGE}', mutationScope: '${EXPECTED_MUTATION_SCOPE}' };`,
  ].join('\n');
}

function baseInput() {
  return {
    productionSource: productionSource(),
    productionAuthority: { ...EXPECTED_PRODUCTION_AUTHORITY },
    hostAdapterSource: hostAdapterSource(),
  };
}

const mixedScope = classifyPaths([
  'products/simcore/tooling/exposure-anchor-and-contract-drift-guard.mjs',
  'products/simcore/tooling/exposure-anchor-and-contract-drift-guard.test.mjs',
  'docs/SIMCORE_EXPOSURE_ANCHOR_AND_CONTRACT_DRIFT_GUARD_2026-09-01.md',
]);
assert.equal(mixedScope.docOnly, false, JSON.stringify(mixedScope));
assert.ok(mixedScope.labels.includes('CI_SELF'), JSON.stringify(mixedScope));
assert.ok(mixedScope.labels.includes('HARNESS'), JSON.stringify(mixedScope));
assert.ok(mixedScope.labels.includes('SIMCORE_DOC_ONLY'), JSON.stringify(mixedScope));

const pass = assessExposureAnchorAndContractDrift(baseInput());
assert.equal(pass.status, 'PASS_EXPOSURE_EVAL_CONTRACT_DRIFT_GUARD', pass.failures.join('\n'));
assert.equal(pass.readyToResumeTargetHostPreflight, true);
assert.deepEqual(pass.failures, []);
assert.deepEqual(pass.missing, []);
assert.equal(pass.candidateLineCount, 6);
assert.equal(pass.candidateContractHash, EXPECTED_CANDIDATE_HASH);
assert.equal(pass.productionImplementationAuthorized, false);
assert.equal(pass.runtimeMutationAuthorized, false);
assert.equal(pass.modelCallsExecuted, false);
assert.deepEqual(assertExposureDriftGuardIntegrity(pass), { pass: true, failures: [] });

const missing = assessExposureAnchorAndContractDrift();
assert.equal(missing.status, 'HOLD_EXPOSURE_EVAL_GUARD_INPUT_REQUIRED');
assert.equal(missing.readyToResumeTargetHostPreflight, false);
assert.ok(missing.missing.includes('PRODUCTION_SOURCE'));
assert.ok(missing.missing.includes('PRODUCTION_AUTHORITY'));
assert.ok(missing.missing.includes('HOST_ADAPTER_SOURCE'));

const movedAuthority = baseInput();
movedAuthority.productionAuthority.releaseCommit = '9'.repeat(40);
const moved = assessExposureAnchorAndContractDrift(movedAuthority);
assert.equal(moved.status, 'BLOCK_EXPOSURE_EVAL_CONTRACT_DRIFT');
assert.ok(moved.failures.includes('PRODUCTION_AUTHORITY_DRIFT'));

const missingAnchorInput = baseInput();
missingAnchorInput.productionSource = missingAnchorInput.productionSource.replace(SOURCE_PROVENANCE_ANCHOR, 'anchor_removed');
const missingAnchor = assessExposureAnchorAndContractDrift(missingAnchorInput);
assert.ok(missingAnchor.failures.includes('PRODUCTION_ANCHOR_CARDINALITY_DRIFT'));
assert.ok(missingAnchor.failures.includes('PRODUCTION_ANCHOR_ORDER_DRIFT'));

const duplicateAnchorInput = baseInput();
duplicateAnchorInput.productionSource += `\n${SOURCE_PROVENANCE_ANCHOR}`;
const duplicateAnchor = assessExposureAnchorAndContractDrift(duplicateAnchorInput);
assert.ok(duplicateAnchor.failures.includes('PRODUCTION_ANCHOR_CARDINALITY_DRIFT'));

const reorderedInput = baseInput();
reorderedInput.productionSource = reorderedInput.productionSource.replace(
  `${SOURCE_PROVENANCE_PRECEDING_LINE}');\n  lines.push('${SOURCE_PROVENANCE_ANCHOR}`,
  `${SOURCE_PROVENANCE_ANCHOR}');\n  lines.push('${SOURCE_PROVENANCE_PRECEDING_LINE}`,
);
const reordered = assessExposureAnchorAndContractDrift(reorderedInput);
assert.ok(reordered.failures.includes('PRODUCTION_ANCHOR_ORDER_DRIFT'));

const classifierDriftInput = baseInput();
classifierDriftInput.productionSource = classifierDriftInput.productionSource.replace(PROMPT_CHANGE_REASON_TOKEN, "if (/derive_reaction_from_current_source/m.test(text)) return 'handoff/lineage';");
const classifierDrift = assessExposureAnchorAndContractDrift(classifierDriftInput);
assert.ok(classifierDrift.failures.includes('PRODUCTION_PROMPT_CHANGE_REASON_CLASSIFIER_DRIFT'));

const tierDriftInput = baseInput();
tierDriftInput.productionSource = tierDriftInput.productionSource.replace(RUNTIME_LINE_TIER_FALLBACK_TOKEN, "if (promptChangeReason('', value) !== 'other') return 'stable';");
const tierDrift = assessExposureAnchorAndContractDrift(tierDriftInput);
assert.ok(tierDrift.failures.includes('PRODUCTION_RUNTIME_LINE_TIER_DRIFT'));

const alreadyInstalledInput = baseInput();
alreadyInstalledInput.productionSource += `\nlines.push('${EXPOSURE_LINES[0]}');`;
const alreadyInstalled = assessExposureAnchorAndContractDrift(alreadyInstalledInput);
assert.ok(alreadyInstalled.failures.includes('CANDIDATE_ALREADY_PRESENT_IN_PRODUCTION'));

const adapterHashDriftInput = baseInput();
adapterHashDriftInput.hostAdapterSource = adapterHashDriftInput.hostAdapterSource.replace(EXPECTED_CANDIDATE_HASH, '0'.repeat(64));
const adapterHashDrift = assessExposureAnchorAndContractDrift(adapterHashDriftInput);
assert.ok(adapterHashDrift.failures.includes('HOST_ADAPTER_CANDIDATE_HASH_DRIFT'));

const adapterAnchorDriftInput = baseInput();
adapterAnchorDriftInput.hostAdapterSource = adapterAnchorDriftInput.hostAdapterSource.replace(SOURCE_PROVENANCE_ANCHOR, 'wrong_anchor');
const adapterAnchorDrift = assessExposureAnchorAndContractDrift(adapterAnchorDriftInput);
assert.ok(adapterAnchorDrift.failures.includes('HOST_ADAPTER_ANCHOR_DRIFT'));

const adapterStageDriftInput = baseInput();
adapterStageDriftInput.hostAdapterSource = adapterStageDriftInput.hostAdapterSource.replace(EXPECTED_REQUEST_STAGE, 'WRONG_STAGE');
const adapterStageDrift = assessExposureAnchorAndContractDrift(adapterStageDriftInput);
assert.ok(adapterStageDrift.failures.includes('HOST_ADAPTER_REQUEST_STAGE_DRIFT'));

const adapterLineDriftInput = baseInput();
adapterLineDriftInput.hostAdapterSource = adapterLineDriftInput.hostAdapterSource.replace(EXPOSURE_LINES[5], `${EXPOSURE_LINES[5]}_drift`);
const adapterLineDrift = assessExposureAnchorAndContractDrift(adapterLineDriftInput);
assert.ok(adapterLineDrift.failures.some((failure) => failure.startsWith('HOST_ADAPTER_CANDIDATE_LINE_DRIFT:')));

console.log('exposure-anchor-and-contract-drift-guard: PASS');
