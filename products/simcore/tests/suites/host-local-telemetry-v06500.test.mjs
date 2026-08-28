import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';
import { runSuite as runV06411Suite } from './host-local-telemetry-v06411.test.mjs';

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
  if (metadata !== '0.65.0') return runV06411Suite(ctx);

  const runtime = ctx.source.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '';
  const hostCompat = ctx.source.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '';
  equal(metadata, '0.65.0', 'metadata release identity');
  equal(runtime, metadata, 'runtime identity must equal metadata');
  equal(hostCompat, metadata, 'Host-local compatibility identity must equal metadata');

  assert(ctx.source.includes('SimCore.define("edit-reconcile"'), 'physical edit-reconcile module missing');
  assert(ctx.source.includes("const editReconcile = require('./edit-reconcile');"), 'Session edit-reconcile dependency missing');
  assert(ctx.source.includes("const editReconcileRules = SimCore.require('edit-reconcile');"), 'runtime edit-reconcile wiring missing');

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
  const accepted = await exact.claimHostLocalOnce(hostWith(capsule('0.65.0')), locationKey, now + 1);
  equal(accepted.status, 'CONSUMED', 'v0.65.0 exact Host-local capsule must be compatible');

  const previous = new BundleLoader(ctx.source).load('runtime-telemetry');
  const rejected = await previous.claimHostLocalOnce(hostWith(capsule('0.64.11')), locationKey, now + 1);
  equal(rejected.status, 'INCOMPATIBLE', 'v0.64.11 capsule must not masquerade as v0.65.0');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v06500-metadata-runtime-host-identity-equal', status: 'PASS' },
      { id: 'v06500-edit-reconcile-physical-wiring-present', status: 'PASS' },
      { id: 'host-local-v06500-exact-version-compatible', status: 'PASS' },
      { id: 'host-local-v06411-cross-version-rejected', status: 'PASS' },
    ],
  };
}
