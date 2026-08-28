import { equal } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';
import { runSuite as runV06410Suite } from './host-local-telemetry-v06410.test.mjs';

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
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.64.11') return runV06410Suite(ctx);

  // Re-run the established v0.64.10 Host-local transport mechanics through an
  // explicit compatibility view. Only version identity is projected backward;
  // the transport implementation remains the v0.64.11 candidate implementation.
  const compatSource = ctx.source
    .replace('//@version 0.64.11', '//@version 0.64.10')
    .replace("const HOST_COMPAT_VERSION = '0.64.11';", "const HOST_COMPAT_VERSION = '0.64.10';");
  const base = await runV06410Suite({ ...ctx, source: compatSource });

  // Exact-candidate positive/negative controls keep the real v0.64.11 version
  // guard under executable coverage rather than weakening it for legacy tests.
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
  const accepted = await exact.claimHostLocalOnce(hostWith(capsule('0.64.11')), locationKey, now + 1);
  equal(accepted.status, 'CONSUMED', 'v0.64.11 exact Host-local capsule must be compatible');

  const previous = new BundleLoader(ctx.source).load('runtime-telemetry');
  const rejected = await previous.claimHostLocalOnce(hostWith(capsule('0.64.10')), locationKey, now + 1);
  equal(rejected.status, 'INCOMPATIBLE', 'v0.64.10 Host-local capsule must not masquerade as v0.64.11');

  return {
    ...base,
    assertions: [
      ...(base.assertions || []),
      { id: 'host-local-v06411-exact-version-compatible', status: 'PASS' },
      { id: 'host-local-v06410-cross-version-rejected', status: 'PASS' },
    ],
  };
}
