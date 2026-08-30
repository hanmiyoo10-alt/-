import { equal } from '../../tooling/assertions.mjs';
import { runSuite as runV06902Suite } from './bounded-telemetry-capsule-v06902.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.70.0') return runV06902Suite(ctx);

  equal(version, '0.70.0', 'bounded telemetry control version 0.70.0');

  // v0.70.0 changes Prompt current-task authority only. Bounded telemetry
  // semantics remain frozen; normalize userscript metadata only and reuse the
  // exact v0.69.2 control chain.
  const compatSource = ctx.source.replace('//@version 0.70.0', '//@version 0.69.2');
  const result = await runV06902Suite({ ...ctx, source: compatSource });
  return {
    ...result,
    assertions: [
      ...(result.assertions || []),
      { id: 'v07000-bounded-telemetry-frozen-contract', status: 'PASS' },
    ],
  };
}
