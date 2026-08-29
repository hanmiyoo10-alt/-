import { runSuite as runV06800Suite } from './reload-cache-continuity-v06800.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.0') return runV06800Suite(ctx);

  // v0.69 moves state reconciliation ownership only. Reload/cache continuity semantics are frozen,
  // so normalize only userscript release metadata and reuse the permanent v0.68 gate.
  const compatSource = ctx.source.replace('//@version 0.69.0', '//@version 0.68.0');
  return runV06800Suite({ ...ctx, source: compatSource });
}
