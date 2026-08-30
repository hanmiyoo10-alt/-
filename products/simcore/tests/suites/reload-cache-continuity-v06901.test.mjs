import { assert, equal } from '../../tooling/assertions.mjs';
import { runSuite as runV06900Suite } from './reload-cache-continuity-v06900.test.mjs';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.1') return runV06900Suite(ctx);

  const source = ctx.source;
  const unloadStart = source.indexOf('  await Risuai.onUnload(async () => {');
  const removeCall = source.indexOf('    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);', unloadStart);
  const uiLoop = source.indexOf('    for (const part of simcoreUiParts.splice(0)) {', unloadStart);
  const unloadCheckpoint = source.indexOf("    await checkpointRuntimeTelemetry('UNLOAD');", unloadStart);
  const clearState = source.indexOf('    coreSession = null;', unloadStart);
  assert(unloadStart >= 0, 'v0.69.1 targeted UNLOAD callback missing');
  assert(removeCall > unloadStart && uiLoop > removeCall && unloadCheckpoint > uiLoop && clearState > unloadCheckpoint,
    'v0.69.1 targeted UNLOAD retirement ordering invalid');
  equal(countOf(source, "checkpointRuntimeTelemetry('UNLOAD')"), 1, 'v0.69.1 UNLOAD checkpoint call count');
  equal(countOf(source, "checkpointRuntimeTelemetry('OUTPUT_COMMIT')"), 1, 'v0.69.1 OUTPUT_COMMIT checkpoint call count');

  const localBranch = "if (normalizedTrigger === 'UNLOAD') {\n        runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, capsule);\n      } else {\n        await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);\n      }";
  assert(source.includes(localBranch), 'v0.69.1 UNLOAD local-only / OUTPUT_COMMIT durable split missing');

  // The old v0.64.8+ reload authority also freezes a now-intentionally-retired UNLOAD ordering.
  // Project only that changed seam back to its v0.69 form for unrelated historical reload controls;
  // the executable module loader remains bound to the real v0.69.1 source.
  let compatSource = source.replace('//@version 0.69.1', '//@version 0.69.0');
  compatSource = compatSource.replace(
    "      if (normalizedTrigger === 'UNLOAD') {\n        runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, capsule);\n      } else {\n        await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);\n      }",
    "      await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);"
  );
  compatSource = compatSource.replace(
    "    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);\n    for (const part of simcoreUiParts.splice(0)) {\n      if (!part?.id) continue;\n      try { await Risuai.unregisterUIPart(part.id); } catch (_) {}\n    }\n    await checkpointRuntimeTelemetry('UNLOAD');",
    "    checkpointRuntimeTelemetry('UNLOAD');\n    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);\n    for (const part of simcoreUiParts.splice(0)) {\n      if (!part?.id) continue;\n      try { await Risuai.unregisterUIPart(part.id); } catch (_) {}\n    }"
  );

  const historical = await runV06900Suite({ ...ctx, source: compatSource });
  return {
    ...historical,
    assertions: [
      ...(historical.assertions || []),
      { id: 'v06901-unload-hooks-retire-before-telemetry', status: 'PASS' },
      { id: 'v06901-unload-ui-retires-before-telemetry', status: 'PASS' },
      { id: 'v06901-unload-local-only-transport', status: 'PASS' },
      { id: 'v06901-output-commit-durable-transport-preserved', status: 'PASS' },
    ],
  };
}
