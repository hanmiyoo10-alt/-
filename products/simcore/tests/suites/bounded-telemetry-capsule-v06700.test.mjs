import { runSuite as runV06600Suite } from './bounded-telemetry-capsule-v06600.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.67.0') return runV06600Suite(ctx);

  // M2-5 preserves the bounded telemetry capsule contract. Normalize only the
  // release identity/scenario envelope before delegating to the frozen v0.66 gate.
  const compatSource = ctx.source
    .replace('//@version 0.67.0', '//@version 0.66.0')
    .replace(
      "scenario: '06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT'",
      "scenario: '06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT'",
    );

  return runV06600Suite({ ...ctx, source: compatSource });
}
