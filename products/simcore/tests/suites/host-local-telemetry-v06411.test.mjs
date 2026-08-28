import { runSuite as runV06410Suite } from './host-local-telemetry-v06410.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.64.11') return runV06410Suite(ctx);
  const compatSource = ctx.source.replace('//@version 0.64.11', '//@version 0.64.10');
  return runV06410Suite({ ...ctx, source: compatSource });
}
