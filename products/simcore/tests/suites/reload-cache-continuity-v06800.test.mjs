import { runSuite as runV06700Suite } from './reload-cache-continuity-v06700.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.68.0') return runV06700Suite(ctx);

  // v0.68 changes Community classification only. Reload/cache continuity is frozen,
  // so normalize only release identity and reuse the permanent v0.67 gate.
  const compatSource = ctx.source.replace('//@version 0.68.0', '//@version 0.67.0');
  return runV06700Suite({ ...ctx, source: compatSource });
}
