import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader, extractModuleSource } from '../../tooling/bundle-loader.mjs';
import { runSuite as runV06902Suite } from './host-local-telemetry-v06902.test.mjs';

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

export async function runSuite(ctx) {
  const metadata = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (metadata !== '0.70.0') return runV06902Suite(ctx);

  const runtime = ctx.source.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '';
  const hostCompat = ctx.source.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '';
  equal(metadata, '0.70.0', 'metadata release identity');
  equal(runtime, metadata, 'runtime identity must equal metadata');
  equal(hostCompat, metadata, 'Host-local compatibility identity must equal metadata');

  assert(!ctx.source.includes('SimCore.define("recovery"'), 'physical Recovery module must remain retired');
  assert(!ctx.source.includes("require('./recovery')"), 'runtime Recovery require residue must remain absent');
  assert(ctx.source.includes('SimCore.define("state-reconcile"'), 'v0.70.0 State Reconcile owner missing');

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
  ]) assert(ctx.source.includes(marker), `v0.70.0 frozen owner marker missing: ${marker}`);

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
  const accepted = await exact.claimHostLocalOnce(hostWith(capsule('0.70.0')), locationKey, now + 1);
  equal(accepted.status, 'CONSUMED', 'v0.70.0 exact Host-local capsule must be compatible');

  const previous = new BundleLoader(ctx.source).load('runtime-telemetry');
  const rejected = await previous.claimHostLocalOnce(hostWith(capsule('0.69.2')), locationKey, now + 1);
  equal(rejected.status, 'INCOMPATIBLE', 'v0.69.2 capsule must not masquerade as v0.70.0');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v07000-metadata-runtime-host-identity-equal', status: 'PASS' },
      { id: 'v07000-recovery-retirement-preserved', status: 'PASS' },
      { id: 'v07000-state-reconcile-kernel-inversion-present', status: 'PASS' },
      { id: 'v07000-direct-owner-wiring-preserved', status: 'PASS' },
      { id: 'host-local-v07000-exact-version-compatible', status: 'PASS' },
      { id: 'host-local-v06902-cross-version-rejected', status: 'PASS' },
    ],
  };
}
