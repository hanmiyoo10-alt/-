import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';
import { runSuite as runV06500Suite } from './host-local-telemetry-v06500.test.mjs';

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
  if (metadata !== '0.66.0') return runV06500Suite(ctx);

  const runtime = ctx.source.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '';
  const hostCompat = ctx.source.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '';
  equal(metadata, '0.66.0', 'metadata release identity');
  equal(runtime, metadata, 'runtime identity must equal metadata');
  equal(hostCompat, metadata, 'Host-local compatibility identity must equal metadata');

  assert(ctx.source.includes('SimCore.define("edit-reconcile"'), 'physical edit-reconcile module missing');
  assert(ctx.source.includes('SimCore.define("output-finalize"'), 'physical output-finalize module missing');
  assert(ctx.source.includes("const outputFinalize = require('./output-finalize');"), 'output-finalize direct-owner wiring missing');
  assert(ctx.source.includes('buildFreshObservationPlan'), 'Output Compat Fresh observation-plan owner missing');
  assert(ctx.source.includes('interpretFreshObservation'), 'Output Compat Fresh interpretation owner missing');

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
  const accepted = await exact.claimHostLocalOnce(hostWith(capsule('0.66.0')), locationKey, now + 1);
  equal(accepted.status, 'CONSUMED', 'v0.66.0 exact Host-local capsule must be compatible');

  const previous = new BundleLoader(ctx.source).load('runtime-telemetry');
  const rejected = await previous.claimHostLocalOnce(hostWith(capsule('0.65.0')), locationKey, now + 1);
  equal(rejected.status, 'INCOMPATIBLE', 'v0.65.0 capsule must not masquerade as v0.66.0');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v06600-metadata-runtime-host-identity-equal', status: 'PASS' },
      { id: 'v06600-m2-4-physical-owner-wiring-present', status: 'PASS' },
      { id: 'host-local-v06600-exact-version-compatible', status: 'PASS' },
      { id: 'host-local-v06500-cross-version-rejected', status: 'PASS' },
    ],
  };
}
