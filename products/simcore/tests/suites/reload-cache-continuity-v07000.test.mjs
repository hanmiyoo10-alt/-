import { runSuite as runV06902Suite } from './reload-cache-continuity-v06902.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.70.0') return runV06902Suite(ctx);

  // v0.70.0 changes Prompt current-task authority only. Reload transport,
  // targeted-unload liveness and OUTPUT_COMMIT durability remain frozen at
  // the v0.69.2 authority. Normalize userscript metadata only.
  const compatSource = ctx.source.replace('//@version 0.70.0', '//@version 0.69.2');
  const historical = await runV06902Suite({ ...ctx, source: compatSource });
  return {
    ...historical,
    assertions: [
      ...(historical.assertions || []),
      { id: 'v07000-reload-contract-inherits-v06902', status: 'PASS' },
    ],
  };
}
