import { runSuite as runV06411Suite } from './reload-cache-continuity-v06411.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.65.0') return runV06411Suite(ctx);
  const compatSource = ctx.source.replace('//@version 0.65.0', '//@version 0.64.11');
  return runV06411Suite({ ...ctx, source: compatSource });
}
