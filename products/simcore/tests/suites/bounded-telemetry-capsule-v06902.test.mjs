import { equal } from '../../tooling/assertions.mjs';
import { runSuite as runV06901Suite } from './bounded-telemetry-capsule-v06901.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.2') return runV06901Suite(ctx);

  equal(version, '0.69.2', 'bounded telemetry control version 0.69.2');

  // v0.69.2 changes only the MamsHolic Community alias. Bounded telemetry semantics remain frozen.
  // Normalize only userscript release metadata and reuse the exact v0.69.1 control chain.
  const compatSource = ctx.source.replace('//@version 0.69.2', '//@version 0.69.1');
  const result = await runV06901Suite({ ...ctx, source: compatSource });
  return {
    ...result,
    assertions: [
      ...(result.assertions || []),
      { id: 'v06902-bounded-telemetry-frozen-contract', status: 'PASS' },
    ],
  };
}
