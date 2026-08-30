import { runSuite as runV06900Suite } from './bounded-telemetry-capsule-v06900.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.1') return runV06900Suite(ctx);

  // v0.69.1 changes targeted UNLOAD liveness only. Telemetry capsule semantics remain frozen.
  // Normalize only userscript release metadata and reuse the exact v0.69 control chain.
  const compatSource = ctx.source.replace('//@version 0.69.1', '//@version 0.69.0');
  return runV06900Suite({ ...ctx, source: compatSource });
}
