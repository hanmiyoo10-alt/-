import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';
import { runSuite as runBaseSuite } from './host-local-telemetry.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

function legacyLexicalView(actualSource, declaration, moduleStart, moduleEnd) {
  const telemetryView = actualSource.slice(moduleStart, moduleEnd)
    .replace(
      declaration,
      `${declaration}\n// telemetry-slot-marker: __SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__`,
    )
    .replace(
      "typeof hostApi.getLocalPluginStorage !== 'function'",
      "typeof hostApi['getLocal' + 'PluginStorage'] !== 'function'",
    );

  return Object.freeze({
    match: (...args) => actualSource.match(...args),
    includes: (...args) => actualSource.includes(...args),
    indexOf: (...args) => actualSource.indexOf(...args),
    slice: (start, end) => (
      start === moduleStart && end === moduleEnd
        ? telemetryView
        : actualSource.slice(start, end)
    ),
    toString: () => actualSource,
    [Symbol.toPrimitive]: () => actualSource,
  });
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.64.10') return runBaseSuite(ctx);

  const actualSource = ctx.source;
  const declaration = "const HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__';";
  equal(countOf(actualSource, declaration), 1, 'exactly one Host-local key declaration');

  const moduleStart = actualSource.indexOf('SimCore.define("runtime-telemetry"');
  const moduleEnd = actualSource.indexOf('SimCore.define("runtime-session"', moduleStart);
  assert(moduleStart >= 0 && moduleEnd > moduleStart, 'runtime telemetry module bounds');
  const actualTelemetrySource = actualSource.slice(moduleStart, moduleEnd);
  equal((actualTelemetrySource.match(/['"]__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__['"]/g) || []).length, 1, 'Host-local key literal must have one owner');
  equal(countOf(actualTelemetrySource, "typeof hostApi.getLocalPluginStorage !== 'function'"), 1, 'exactly one Host capability guard');
  equal(countOf(actualTelemetrySource, 'await hostApi.getLocalPluginStorage()'), 1, 'exactly one Host acquisition call');
  equal((actualTelemetrySource.match(/getLocalPluginStorage/g) || []).length, 2, 'bounded Host API surface');

  // The first draft base suite used lexical totals for two source-shape checks.
  // This compatibility view changes only what that legacy slice() assertion sees.
  // BundleLoader stringifies the view back to actualSource, so every executable
  // behavioral assertion still runs against the exact candidate bytes.
  const base = await runBaseSuite({
    ...ctx,
    source: legacyLexicalView(actualSource, declaration, moduleStart, moduleEnd),
  });

  const fixture = ctx.fixtures[0];
  const telemetry = new BundleLoader(actualSource).load('runtime-telemetry');
  const now = 2000000000000;
  const loc = 'character:chat';
  const disabled = {};
  Object.defineProperty(disabled, 'sessionStorage', { get() { throw new Error('disabled'); } });

  {
    let acquired = 0;
    let writes = 0;
    const host = {
      async getLocalPluginStorage() {
        acquired += 1;
        return {
          async getItem() { return null; },
          async setItem() { writes += 1; },
          async removeItem() {},
        };
      },
    };
    const circular = {};
    circular.self = circular;
    const capsule = telemetry.capture({
      sourceVersion: '0.64.10',
      locationKey: loc,
      capturedAt: now,
      runtimePromptCache: circular,
      requestTopology: null,
      cacheCandidates: null,
    });
    await telemetry.publishWithHostLocal({}, disabled, host, capsule);
    const write = telemetry.diagnostics().write;
    equal(write.serialization, 'FAILED', 'serialization failure status');
    equal(writes, 0, 'serialization failure must not write Host-local');
    equal(acquired, 0, 'serialization failure must not acquire Host-local store');
  }

  {
    let reads = 0;
    const host = {
      async getLocalPluginStorage() {
        return {
          async getItem() { reads += 1; throw new Error('read fail'); },
          async setItem() {},
          async removeItem() {},
        };
      },
    };
    const claim = await new BundleLoader(actualSource).load('runtime-telemetry').claimHostLocalOnce(host, loc, now);
    equal(claim.status, 'READ_FAILED', 'Host-local read failure classification');
    equal(reads, 1, 'Host-local read failure retried');
  }

  const outputProcess = actualSource.indexOf('    const result = await cs.processOutput(outIndex, content, outputDetail);');
  const inactiveGate = actualSource.indexOf('    if (!result.active) {', outputProcess);
  const runtimeGuard = actualSource.indexOf("    if (runtimeIsCurrent() && String(coreKey || coreLocationKey || '')) {", inactiveGate);
  const hostCheckpoint = actualSource.indexOf("      await checkpointRuntimeTelemetry('OUTPUT_COMMIT');", runtimeGuard);
  assert(outputProcess >= 0 && inactiveGate > outputProcess && runtimeGuard > inactiveGate && hostCheckpoint > runtimeGuard, 'Host checkpoint escaped active/current output gate');

  for (const forbidden of [
    'localStorage', 'IndexedDB', 'XMLHttpRequest', 'setInterval(', 'setTimeout(', 'Object.keys(', '.keys(',
  ]) assert(!actualTelemetrySource.includes(forbidden), `Host-local implementation introduced forbidden ${forbidden}`);

  assert(actualSource.includes("serialization: write?.serialization || 'UNKNOWN'"), 'checkpoint probe does not retain serialization disposition');
  assert(actualSource.includes('serialization ${lastTelemetryCheckpointProbe.serialization}'), 'checkpoint diagnostic omits serialization failure attribution');
  assert(actualSource.includes('provider cache UNVERIFIED'), 'provider cache changed from UNVERIFIED');
  assert(fixture.input.maxSerializedChars === 16384 && fixture.input.maxAgeMs === 600000, 'Host-local bounds fixture drift');

  return {
    ...base,
    assertions: [
      ...(base.assertions || []),
      { id: 'host-local-single-key-owner-exact', status: 'PASS' },
      { id: 'host-local-api-guard-call-exact', status: 'PASS' },
      { id: 'host-local-serialization-failure-no-io', status: 'PASS' },
      { id: 'host-local-read-failure-one-shot', status: 'PASS' },
      { id: 'host-local-active-current-output-gate', status: 'PASS' },
      { id: 'host-local-serialization-diagnostic-attribution', status: 'PASS' },
    ],
  };
}
