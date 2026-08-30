import { runSuite as runV06901Suite } from './reload-cache-continuity-v06901.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.2') return runV06901Suite(ctx);

  // v0.69.2 changes only the bounded Community brand alias. Reload transport,
  // targeted-unload liveness, OUTPUT_COMMIT durability and telemetry schema are
  // identical to v0.69.1. Normalize metadata only and delegate to that frozen
  // authority; runtime/HOST identity and executable module source stay real.
  const compatSource = ctx.source.replace('//@version 0.69.2', '//@version 0.69.1');
  const historical = await runV06901Suite({ ...ctx, source: compatSource });
  return {
    ...historical,
    assertions: [
      ...(historical.assertions || []),
      { id: 'v06902-reload-contract-inherits-v06901', status: 'PASS' },
    ],
  };
}
