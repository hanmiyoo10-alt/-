import { runSuite as runV06900Suite } from './reload-cache-continuity-v06900.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.1') return runV06900Suite(ctx);

  // v0.69.1 changes targeted UNLOAD liveness only. Reload/cache continuity semantics stay frozen,
  // so normalize only userscript release metadata and reuse the permanent v0.69 gate.
  const compatSource = ctx.source.replace('//@version 0.69.1', '//@version 0.69.0');
  return runV06900Suite({ ...ctx, source: compatSource });
}
