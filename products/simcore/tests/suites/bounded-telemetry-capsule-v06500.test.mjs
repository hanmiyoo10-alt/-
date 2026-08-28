import { runSuite as runV06411Suite } from './bounded-telemetry-capsule-v06411.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.65.0') return runV06411Suite(ctx);

  const compatSource = ctx.source
    .replace('//@version 0.65.0', '//@version 0.64.11')
    .replace(
      "scenario: '06500_IDENTITY_RELOAD_THEN_M2_3_EDIT_RECONCILE_REAL_LONG_CHAT'",
      "scenario: '06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT'",
    );

  return runV06411Suite({ ...ctx, source: compatSource });
}
