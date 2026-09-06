import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader, extractModuleSource } from '../../tooling/bundle-loader.mjs';
import {
  VALIDATION_CONTRACT_MODES,
  assertProfileBindsSource,
  normalizeMetadataVersion,
  resolveValidationContract,
} from '../../tooling/validation-contract-profile.mjs';
import { runSuite as runReloadV06902 } from './reload-cache-continuity-v06902.test.mjs';
import { runSuite as runOperatorV06902 } from './operator-release-card-v06902.test.mjs';
import { runSuite as runBoundedV06902 } from './bounded-telemetry-capsule-v06902.test.mjs';

const BEHAVIOR_AUTHORITIES = Object.freeze({
  'reload-cache-continuity': Object.freeze({ '0.69.2': runReloadV06902 }),
  'operator-release-card': Object.freeze({ '0.69.2': runOperatorV06902 }),
  'bounded-telemetry-capsule': Object.freeze({ '0.69.2': runBoundedV06902 }),
});

function contractError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function countOf(source, needle) {
  return String(source).split(needle).length - 1;
}

function authorityRunner(contractId, authorityVersion) {
  const runner = BEHAVIOR_AUTHORITIES[contractId]?.[authorityVersion];
  if (!runner) throw contractError('VALIDATION_AUTHORITY_UNRESOLVED', `${contractId} authority ${authorityVersion} is not explicitly registered`);
  return runner;
}

function replaceExactlyOnce(source, needle, replacement, label) {
  const count = countOf(source, needle);
  if (count !== 1) throw contractError('VALIDATION_IDENTITY_NORMALIZATION_AMBIGUOUS', `${label}: expected exactly one occurrence, found ${count}`);
  return source.replace(needle, replacement);
}

async function runInheritedBehavior(contractId, ctx, profile) {
  const plan = resolveValidationContract(profile, contractId);
  if (plan.mode !== VALIDATION_CONTRACT_MODES.INHERIT_BEHAVIOR) {
    throw contractError('VALIDATION_CONTRACT_MODE_MISMATCH', `${contractId} requires INHERIT_BEHAVIOR`);
  }
  const runner = authorityRunner(contractId, plan.authorityVersion);
  const compatSource = normalizeMetadataVersion(ctx.source, plan.releaseVersion, plan.authorityVersion);
  const result = await runner({ ...ctx, source: compatSource });
  return {
    ...result,
    assertions: [
      ...(result.assertions || []),
      { id: `r2-9-${contractId}-explicit-authority-${plan.authorityVersion}`, status: 'PASS' },
    ],
  };
}

async function runOperatorCurrentIdentityInherited(ctx, profile) {
  const contractId = 'operator-release-card';
  const plan = resolveValidationContract(profile, contractId);
  if (plan.mode !== VALIDATION_CONTRACT_MODES.CURRENT_IDENTITY_INHERIT_BEHAVIOR) {
    throw contractError('VALIDATION_CONTRACT_MODE_MISMATCH', `${contractId} requires CURRENT_IDENTITY_INHERIT_BEHAVIOR`);
  }

  const source = ctx.source;
  const start = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const end = source.indexOf('  async function openPanel() {', start);
  assert(start >= 0 && end > start, `${plan.releaseVersion} operator card bounds missing`);
  const card = source.slice(start, end);
  assert(card.includes(`version: '${plan.releaseVersion}'`), `${plan.releaseVersion} card version missing`);
  assert(card.includes(`name: '${plan.releaseName}'`), `${plan.releaseVersion} card name missing`);
  equal(countOf(source, 'id="toggle-release-card"'), 1, `${plan.releaseVersion} release card button count`);
  equal(countOf(source, 'id="operator-release-card"'), 1, `${plan.releaseVersion} release card section count`);
  assert(source.includes('id="operator-release-card" class="card" style="display:none;'), `${plan.releaseVersion} card must default collapsed`);
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `${plan.releaseVersion} release card side effect ${forbidden}`);
  }

  let compatSource = normalizeMetadataVersion(source, plan.releaseVersion, plan.authorityVersion);
  compatSource = replaceExactlyOnce(
    compatSource,
    `    version: '${plan.releaseVersion}',\n    name: '${plan.releaseName}',`,
    `    version: '${plan.authorityVersion}',\n    name: '${plan.authorityIdentity.releaseName}',`,
    'operator release identity',
  );
  const runner = authorityRunner(contractId, plan.authorityVersion);
  const result = await runner({ ...ctx, source: compatSource });
  return {
    ...result,
    assertions: [
      ...(result.assertions || []),
      { id: 'r2-9-operator-card-current-identity', status: 'PASS' },
      { id: `r2-9-operator-card-explicit-authority-${plan.authorityVersion}`, status: 'PASS' },
    ],
  };
}

async function runOperatorChangedContract(ctx, profile) {
  const contractId = 'operator-release-card';
  const plan = resolveValidationContract(profile, contractId);
  if (plan.mode !== VALIDATION_CONTRACT_MODES.CHANGED_CONTRACT) {
    throw contractError('VALIDATION_CONTRACT_MODE_MISMATCH', `${contractId} requires CHANGED_CONTRACT`);
  }
  if (plan.authorityVersion !== plan.releaseVersion) {
    throw contractError('VALIDATION_AUTHORITY_UNRESOLVED', `${contractId} changed contract must bind exact current authority ${plan.releaseVersion}`);
  }

  const source = ctx.source;
  const metadata = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  equal(metadata, plan.releaseVersion, `${plan.releaseVersion} operator changed-contract source identity`);

  const start = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const end = source.indexOf('  async function openPanel() {', start);
  assert(start >= 0 && end > start, `${plan.releaseVersion} operator changed-contract card bounds missing`);
  const card = source.slice(start, end);
  assert(card.includes(`version: '${plan.releaseVersion}'`), `${plan.releaseVersion} changed-contract card version missing`);
  assert(card.includes(`name: '${plan.releaseName}'`), `${plan.releaseVersion} changed-contract card name missing`);
  equal(countOf(source, 'id="toggle-release-card"'), 1, `${plan.releaseVersion} changed-contract release card button count`);
  equal(countOf(source, 'id="operator-release-card"'), 1, `${plan.releaseVersion} changed-contract release card section count`);
  assert(source.includes('id="operator-release-card" class="card" style="display:none;'), `${plan.releaseVersion} changed-contract card must default collapsed`);
  assert(source.includes('${buildOperatorReleaseCardHtml()}'), `${plan.releaseVersion} changed-contract card must remain mounted in the existing panel`);
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `${plan.releaseVersion} changed-contract release card side effect ${forbidden}`);
  }

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'r2-9-operator-changed-contract-exact-current-identity', status: 'PASS' },
      { id: 'r2-9-operator-changed-contract-single-panel-surface', status: 'PASS' },
      { id: 'r2-9-operator-changed-contract-default-collapsed', status: 'PASS' },
      { id: 'r2-9-operator-changed-contract-static-pure-envelope', status: 'PASS' },
    ],
  };
}

function hostWith(raw) {
  return {
    async getLocalPluginStorage() {
      return {
        async getItem() { return raw; },
        async setItem() {},
        async removeItem() {},
      };
    },
  };
}

async function runHostLocalExactCurrent(ctx, profile) {
  const contractId = 'host-local-telemetry';
  const plan = resolveValidationContract(profile, contractId);
  if (plan.mode !== VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY) {
    throw contractError('VALIDATION_CONTRACT_MODE_MISMATCH', `${contractId} requires EXACT_CURRENT_IDENTITY`);
  }

  const metadata = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  const runtime = ctx.source.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '';
  const hostCompat = ctx.source.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '';
  equal(metadata, plan.releaseVersion, 'metadata release identity');
  equal(runtime, metadata, 'runtime identity must equal metadata');
  equal(hostCompat, metadata, 'Host-local compatibility identity must equal metadata');

  assert(!ctx.source.includes('SimCore.define("recovery"'), 'physical Recovery module must remain retired');
  assert(!ctx.source.includes("require('./recovery')"), 'runtime Recovery require residue must remain absent');
  assert(ctx.source.includes('SimCore.define("state-reconcile"'), 'State Reconcile owner missing');

  const kernelSource = extractModuleSource(ctx.source, 'kernel');
  assert(!kernelSource.includes('function initialState()'), 'Kernel initialState facade must remain retired');
  assert(!kernelSource.includes('function reconcileState(raw)'), 'Kernel reconcileState facade must remain retired');
  for (const dep of ['community', 'recurrence', 'lineage', 'handoff']) {
    assert(!kernelSource.includes(`require('./${dep}')`), `Kernel upward dependency survived: ${dep}`);
  }
  for (const marker of [
    'SimCore.define("edit-reconcile"',
    'SimCore.define("output-finalize"',
    'SimCore.define("output-compat"',
    'SimCore.define("bootstrap-migration"',
    "const stateReconcile = require('./state-reconcile');",
    'buildFreshObservationPlan',
    'interpretFreshObservation',
  ]) assert(ctx.source.includes(marker), `frozen owner marker missing: ${marker}`);

  const now = 2000000000000;
  const locationKey = 'character:chat';
  const capsule = (sourceVersion) => JSON.stringify({
    schema: 1,
    sourceVersion,
    locationKey,
    capturedAt: now,
    runtimePromptCache: {},
    requestTopology: {},
    cacheCandidates: {},
  });

  const exact = new BundleLoader(ctx.source).load('runtime-telemetry');
  const accepted = await exact.claimHostLocalOnce(hostWith(capsule(plan.releaseVersion)), locationKey, now + 1);
  equal(accepted.status, 'CONSUMED', `${plan.releaseVersion} exact Host-local capsule must be compatible`);

  for (const rejectedVersion of plan.rejectVersions || []) {
    const previous = new BundleLoader(ctx.source).load('runtime-telemetry');
    const rejected = await previous.claimHostLocalOnce(hostWith(capsule(rejectedVersion)), locationKey, now + 1);
    equal(rejected.status, 'INCOMPATIBLE', `${rejectedVersion} capsule must not masquerade as ${plan.releaseVersion}`);
  }

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'r2-9-host-metadata-runtime-compat-identity-equal', status: 'PASS' },
      { id: 'r2-9-host-recovery-retirement-preserved', status: 'PASS' },
      { id: 'r2-9-host-state-reconcile-kernel-inversion-present', status: 'PASS' },
      { id: 'r2-9-host-direct-owner-wiring-preserved', status: 'PASS' },
      { id: 'r2-9-host-exact-current-compatible', status: 'PASS' },
      { id: 'r2-9-host-explicit-rejected-identities-incompatible', status: 'PASS' },
    ],
  };
}

export const R2_9_AUTHORITY_CAPABILITIES = Object.freeze({
  'reload-cache-continuity': Object.freeze({ versions: Object.freeze(['0.69.2']), exactCurrent: false }),
  'operator-release-card': Object.freeze({ versions: Object.freeze(['0.69.2']), exactCurrent: true }),
  'host-local-telemetry': Object.freeze({ versions: Object.freeze([]), exactCurrent: true }),
  'bounded-telemetry-capsule': Object.freeze({ versions: Object.freeze(['0.69.2']), exactCurrent: false }),
});

export async function runProjectedValidationContract(contractId, ctx, profile) {
  assertProfileBindsSource(profile, ctx.source);
  if (contractId === 'reload-cache-continuity') return runInheritedBehavior(contractId, ctx, profile);
  if (contractId === 'operator-release-card') {
    const plan = resolveValidationContract(profile, contractId);
    if (plan.mode === VALIDATION_CONTRACT_MODES.CURRENT_IDENTITY_INHERIT_BEHAVIOR) return runOperatorCurrentIdentityInherited(ctx, profile);
    if (plan.mode === VALIDATION_CONTRACT_MODES.CHANGED_CONTRACT) return runOperatorChangedContract(ctx, profile);
    throw contractError('VALIDATION_CONTRACT_MODE_MISMATCH', `${contractId} requires CURRENT_IDENTITY_INHERIT_BEHAVIOR or CHANGED_CONTRACT`);
  }
  if (contractId === 'host-local-telemetry') return runHostLocalExactCurrent(ctx, profile);
  if (contractId === 'bounded-telemetry-capsule') return runInheritedBehavior(contractId, ctx, profile);
  throw contractError('VALIDATION_CONTRACT_UNSUPPORTED', `unsupported projected contract: ${contractId}`);
}
