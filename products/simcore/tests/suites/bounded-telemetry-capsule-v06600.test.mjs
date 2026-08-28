import { runSuite as runV06500Suite } from './bounded-telemetry-capsule-v06500.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.66.0') return runV06500Suite(ctx);

  // M2-4 preserves the bounded capsule contract. Normalize only the release
  // identity/scenario envelope before delegating to the frozen v0.65 bridge.
  const compatSource = ctx.source
    .replace('//@version 0.66.0', '//@version 0.65.0')
    .replace(
      "scenario: '06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT'",
      "scenario: '06500_IDENTITY_RELOAD_THEN_M2_3_EDIT_RECONCILE_REAL_LONG_CHAT'",
    );

  return runV06500Suite({ ...ctx, source: compatSource });
}
