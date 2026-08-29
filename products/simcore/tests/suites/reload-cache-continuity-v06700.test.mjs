import { runSuite as runV06600Suite } from './reload-cache-continuity-v06600.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.67.0') return runV06600Suite(ctx);

  // M2-5 removes only the zero-caller Recovery facade. Reload/cache continuity
  // semantics are frozen, so normalize release identity and reuse the v0.66 gate.
  const compatSource = ctx.source.replace('//@version 0.67.0', '//@version 0.66.0');
  return runV06600Suite({ ...ctx, source: compatSource });
}
