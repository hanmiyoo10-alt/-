import { runSuite as runV06700Suite } from './bounded-telemetry-capsule-v06700.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.68.0') return runV06700Suite(ctx);

  const compatSource = ctx.source
    .replace('//@version 0.68.0', '//@version 0.67.0')
    .replace(
      "scenario: '06800_COMMUNITY_PARENT_LOCAL_ALIAS_CLASSIFICATION_REPAIR_REAL_LONG_CHAT'",
      "scenario: '06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT'",
    );

  return runV06700Suite({ ...ctx, source: compatSource });
}
