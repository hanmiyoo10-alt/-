import { runSuite as runV06500Suite } from './reload-cache-continuity-v06500.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.66.0') return runV06500Suite(ctx);

  // M2-4 changes ownership boundaries, not the frozen reload/cache continuity
  // semantics. Normalize release metadata only, then reuse the v0.65 bridge.
  const compatSource = ctx.source.replace('//@version 0.66.0', '//@version 0.65.0');
  return runV06500Suite({ ...ctx, source: compatSource });
}
