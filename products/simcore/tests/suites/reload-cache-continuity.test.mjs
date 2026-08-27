import { equal, assert } from '../../tooling/assertions.mjs';

class MemorySessionStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

function disabledWindow() {
  const value = {};
  Object.defineProperty(value, 'sessionStorage', { get() { throw new Error('disabled'); } });
  return value;
}

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

export async function runSuite({ source, loader, fixtures }) {
  const fixture = fixtures[0];
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  // Historical pre-session transport baseline remains executable when replayed.
  if (version === '0.64.6') {
    assert(source.includes("const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';"), 'v0.64.6 memory handoff baseline missing');
    assert(!source.includes(fixture.input.sessionKey), 'v0.64.6 unexpectedly contains session handoff');
    pass('unchanged-reload-control');
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
  }

  assert(['0.64.7', '0.64.8'].includes(version), `reload continuity gate version ${version}`);
  const checkpointRepair = version === '0.64.8';
  assert(source.includes("const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';"), 'memory handoff compatibility control missing');
  pass('unchanged-reload-control');
  const telemetry = loader.load('runtime-telemetry');
  for (const name of ['capture', 'publish', 'claim', 'validate', 'diagnostics']) assert(typeof telemetry[name] === 'function', `${name} surface missing`);
  const SESSION_KEY = fixture.input.sessionKey;
  const now = 2000000000000;
  const loc = 'character:chat';
  const make = (overrides = {}) => telemetry.capture({
    sourceVersion: version,
    locationKey: loc,
    capturedAt: now,
    runtimePromptCache: { version: 1, key: 'k', previous: { stable: true } },
    requestTopology: { version: 2, key: 'k', previous: { signatures: [{ role: 'user', kind: 'text', chars: 3, hash: 'abc' }] } },
    cacheCandidates: { version: 2, state: { key: 'k', familyId: 'f' } },
    rawBody: 'SHOULD_NOT_BE_RETAINED',
    ...overrides,
  });

  {
    const root = {};
    const storage = new MemorySessionStorage();
    const capsule = make();
    assert(telemetry.publish(root, { sessionStorage: storage }, capsule), 'dual publish failed');
    const write = telemetry.diagnostics().write;
    equal(write.memory, 'WRITTEN', 'memory write');
    equal(write.session, 'WRITTEN', 'session write');
    assert(write.serializedChars <= fixture.input.maxSessionChars, 'session bound exceeded');
    assert(!JSON.stringify(capsule).includes('SHOULD_NOT_BE_RETAINED'), 'raw body retained');
    const claimed = telemetry.claim(root, { sessionStorage: storage });
    const adopted = telemetry.validate(claimed, loc, now + 1000);
    assert(adopted.accepted, 'memory full-match not adopted');
    equal(adopted.transport, 'memory', 'memory must win claimBest');
    equal(storage.getItem(SESSION_KEY), null, 'session fallback replay not consumed');
    pass('reload-full-match');
    pass('same-request-memory-priority-control');
  }

  {
    const storage = new MemorySessionStorage();
    const capsule = make();
    assert(telemetry.publish(null, { sessionStorage: storage }, capsule), 'session-only publish failed');
    const adopted = telemetry.validate(telemetry.claim(null, { sessionStorage: storage }), loc, now + 1000);
    assert(adopted.accepted, 'session fallback not adopted');
    equal(adopted.transport, 'session', 'session fallback transport');
    equal(adopted.capsule.requestTopology.previous.signatures[0].hash, 'abc', 'retained signature metadata');
    pass('reload-retained-signature-partial-match');
  }

  {
    const storage = new MemorySessionStorage();
    telemetry.publish(null, { sessionStorage: storage }, make());
    const rejected = telemetry.validate(telemetry.claim(null, { sessionStorage: storage }), 'other-chat', now + 1000);
    assert(!rejected.accepted, 'location mismatch accepted');
    equal(rejected.reason, 'location-mismatch', 'location mismatch reason');
    pass('reload-mismatch-control');
  }

  {
    const storage = new MemorySessionStorage();
    telemetry.publish(null, { sessionStorage: storage }, make({ capturedAt: now - fixture.input.maxAgeMs - 1 }));
    const rejected = telemetry.validate(telemetry.claim(null, { sessionStorage: storage }), loc, now);
    assert(!rejected.accepted, 'stale capsule accepted');
    equal(rejected.reason, 'expired', 'stale reason');
    pass('stale-capsule');
  }

  {
    const storage = new MemorySessionStorage();
    storage.setItem(SESSION_KEY, '{broken');
    const rejected = telemetry.validate(telemetry.claim(null, { sessionStorage: storage }), loc, now);
    assert(!rejected.accepted, 'malformed session accepted');
    equal(rejected.reason, 'session-malformed', 'malformed reason');
    equal(storage.getItem(SESSION_KEY), null, 'malformed session not deleted');
    pass('malformed-session-capsule');
  }

  {
    const win = disabledWindow();
    assert(!telemetry.publish(null, win, make()), 'disabled session publish should fail open');
    const rejected = telemetry.validate(telemetry.claim(null, win), loc, now);
    assert(!rejected.accepted, 'disabled session produced adoption');
    equal(telemetry.diagnostics().claim.session, 'unavailable', 'disabled session classification');
    pass('disabled-session-storage');
  }

  {
    assert(source.includes('provider cache ${probe.providerCache || contract?.providerCache || \'UNVERIFIED\'}') || source.includes('provider UNVERIFIED'), 'provider cache UNVERIFIED wording missing');
    pass('provider-cache-header-absent');
  }

  {
    const capsule = make();
    const adopted = telemetry.validate(capsule, loc, now + 1);
    assert(adopted.accepted, 'legacy/in-memory direct validate control failed');
    equal(adopted.transport, 'memory', 'legacy direct validation transport');
    pass('pre-reload-in-memory-control');
  }

  {
    const root = {};
    const storage = new MemorySessionStorage();
    const huge = make({ runtimePromptCache: { payload: 'x'.repeat(fixture.input.maxSessionChars + 256) } });
    assert(telemetry.publish(root, { sessionStorage: storage }, huge), 'oversize memory fallback should still publish');
    const write = telemetry.diagnostics().write;
    equal(write.memory, 'WRITTEN', 'oversize memory write');
    equal(write.session, 'OVERSIZE', 'oversize session classification');
    equal(storage.getItem(SESSION_KEY), null, 'oversize session retained');
    pass('bounded-session-serialization');
  }

  if (!checkpointRepair) {
    assert(!source.includes("checkpointRuntimeTelemetry('OUTPUT_COMMIT')"), 'v0.64.7 unexpectedly contains output checkpoint repair');
  } else {
    const activeGate = source.indexOf('    if (!result.active) {');
    const processCall = source.indexOf('    const result = await cs.processOutput(outIndex, content, outputDetail);');
    const checkpointCall = source.indexOf("      checkpointRuntimeTelemetry('OUTPUT_COMMIT');");
    const committedMark = source.indexOf("    markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED', outputAt: Date.now() });");
    assert(processCall >= 0 && activeGate > processCall && checkpointCall > activeGate && committedMark > checkpointCall,
      'OUTPUT_COMMIT checkpoint is not wired after active authoritative processOutput and before COMMITTED bookkeeping');
    equal(countOf(source, "checkpointRuntimeTelemetry('OUTPUT_COMMIT')"), 1, 'OUTPUT_COMMIT checkpoint call count');
    pass('output-commit-callsite');

    assert(source.includes("    if (runtimeIsCurrent() && String(coreKey || coreLocationKey || '')) {\n      checkpointRuntimeTelemetry('OUTPUT_COMMIT');\n    }"),
      'OUTPUT_COMMIT checkpoint eligibility guard missing');
    pass('output-commit-eligibility-guard');

    const unloadStart = source.indexOf('  await Risuai.onUnload(async () => {');
    const unloadCall = source.indexOf("    checkpointRuntimeTelemetry('UNLOAD');", unloadStart);
    const unloadEnd = source.indexOf('    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);', unloadStart);
    assert(unloadStart >= 0 && unloadCall > unloadStart && unloadEnd > unloadCall, 'UNLOAD checkpoint redundancy missing');
    assert(!source.slice(unloadStart, unloadEnd).includes('runtimeTelemetryRules.publish('), 'UNLOAD forked a second direct publish path');
    equal(countOf(source, "checkpointRuntimeTelemetry('UNLOAD')"), 1, 'UNLOAD checkpoint call count');
    pass('unload-redundancy-callsite');

    assert(source.includes('  function checkpointRuntimeTelemetry(trigger) {'), 'canonical checkpoint wrapper missing');
    assert(source.includes("        session: 'FAILED',\n        serializedChars: 0,\n        elapsedMs: 0,\n        retainedBodies: false,"),
      'checkpoint failure-isolation probe missing');
    assert(source.includes('    } catch (_) {'), 'checkpoint wrapper does not fail closed');
    pass('checkpoint-failure-isolation');

    assert(source.includes('`Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `SESSION · ${lastTelemetryCheckpointProbe.session'),
      'bounded Telemetry checkpoint diagnostic missing');
    assert(source.includes('· trigger ${lastTelemetryCheckpointProbe.trigger'), 'checkpoint trigger diagnostic missing');
    pass('checkpoint-diagnostic-surface');

    assert(source.includes('const MAX_AGE_MS = 10 * 60 * 1000;'), '10-minute telemetry age bound changed');
    assert(source.includes('const MAX_SESSION_CHARS = 16384;'), 'session telemetry size bound changed');
    assert(source.includes("const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';"), 'session key changed');
    pass('checkpoint-transport-contract-frozen');
  }

  equal(assertions.filter((row) => fixture.input.cases.includes(row.id)).length, fixture.input.cases.length, 'frozen fixture coverage');
  if (checkpointRepair) {
    equal(assertions.filter((row) => fixture.input.checkpointCases.includes(row.id)).length, fixture.input.checkpointCases.length, 'v0.64.8 checkpoint fixture coverage');
  }
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
