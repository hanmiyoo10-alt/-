import { runSuite as runV06800Suite } from './bounded-telemetry-capsule-v06800.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.0') return runV06800Suite(ctx);

  // v0.69 changes State Reconcile/Kernel ownership only. Telemetry capsule semantics are frozen.
  // Normalize only release metadata and the operator-card scenario before delegating to v0.68.
  const compatSource = ctx.source
    .replace('//@version 0.69.0', '//@version 0.68.0')
    .replace(
      "scenario: '06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT'",
      "scenario: '06800_COMMUNITY_PARENT_LOCAL_ALIAS_CLASSIFICATION_REPAIR_REAL_LONG_CHAT'",
    );

  return runV06800Suite({ ...ctx, source: compatSource });
}
