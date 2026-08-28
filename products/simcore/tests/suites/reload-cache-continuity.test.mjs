import { equal, assert } from '../../tooling/assertions.mjs';

class MemorySessionStorage {
  constructor() { this.map = new Map(); this.setCount = 0; this.getCount = 0; this.removeCount = 0; }
  getItem(key) { this.getCount += 1; return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.setCount += 1; this.map.set(String(key), String(value)); }
  removeItem(key) { this.removeCount += 1; this.map.delete(String(key)); }
}

class ThrowingSetStorage extends MemorySessionStorage {
  setItem() { this.setCount += 1; throw new Error('write disabled'); }
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

  if (version === '0.64.6') {
    assert(source.includes("const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';"), 'v0.64.6 memory handoff baseline missing');
    assert(!source.includes(fixture.input.sessionKey), 'v0.64.6 unexpectedly contains session handoff');
    pass('unchanged-reload-control');
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
  }

  assert(['0.64.7', '0.64.8', '0.64.9'].includes(version), `reload continuity gate version ${version}`);
  const checkpointRepair = version === '0.64.8' || version === '0.64.9';
  const rootRepair = version === '0.64.9';
  assert(source.includes("const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';"), 'memory handoff compatibility control missing');
  pass('unchanged-reload-control');

  const telemetry = loader.load('runtime-telemetry');
  for (const name of ['capture', 'publish', 'claim', 'validate', 'diagnostics']) assert(typeof telemetry[name] === 'function', `${name} surface missing`);
  const SESSION_KEY = fixture.input.sessionKey;
  const MEMORY_KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
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
    equal(adopted.transport, 'memory', 'memory must win claim');
    equal(storage.getItem(SESSION_KEY), null, 'session fallback replay not consumed');
    pass('reload-full-match');
    pass('same-request-memory-priority-control');
  }

  {
    const storage = new MemorySessionStorage();
    assert(telemetry.publish(null, { sessionStorage: storage }, make()), 'session-only publish failed');
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

  assert(source.includes('provider cache ${probe.providerCache || contract?.providerCache || \'UNVERIFIED\'}') || source.includes('provider UNVERIFIED'), 'provider cache UNVERIFIED wording missing');
  pass('provider-cache-header-absent');

  {
    const adopted = telemetry.validate(make(), loc, now + 1);
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
    const processCall = source.indexOf('    const result = await cs.processOutput(outIndex, content, outputDetail);');
    const activeGate = source.indexOf('    if (!result.active) {', processCall);
    const checkpointCall = source.indexOf("      checkpointRuntimeTelemetry('OUTPUT_COMMIT');", activeGate);
    const committedMark = source.indexOf("    markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED', outputAt: Date.now() });", checkpointCall);
    assert(processCall >= 0 && activeGate > processCall && checkpointCall > activeGate && committedMark > checkpointCall, 'OUTPUT_COMMIT checkpoint ordering invalid');
    equal(countOf(source, "checkpointRuntimeTelemetry('OUTPUT_COMMIT')"), 1, 'OUTPUT_COMMIT checkpoint call count');
    pass('output-commit-callsite');
    assert(source.includes("    if (runtimeIsCurrent() && String(coreKey || coreLocationKey || '')) {\n      checkpointRuntimeTelemetry('OUTPUT_COMMIT');\n    }"), 'OUTPUT_COMMIT checkpoint eligibility guard missing');
    pass('output-commit-eligibility-guard');

    const unloadStart = source.indexOf('  await Risuai.onUnload(async () => {');
    const unloadCall = source.indexOf("    checkpointRuntimeTelemetry('UNLOAD');", unloadStart);
    const unloadEnd = source.indexOf('    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);', unloadStart);
    assert(unloadStart >= 0 && unloadCall > unloadStart && unloadEnd > unloadCall, 'UNLOAD checkpoint redundancy missing');
    assert(!source.slice(unloadStart, unloadEnd).includes('runtimeTelemetryRules.publish('), 'UNLOAD forked direct publish path');
    equal(countOf(source, "checkpointRuntimeTelemetry('UNLOAD')"), 1, 'UNLOAD checkpoint call count');
    pass('unload-redundancy-callsite');

    assert(source.includes('  function checkpointRuntimeTelemetry(trigger) {'), 'canonical checkpoint wrapper missing');
    assert(source.includes('    } catch (_) {'), 'checkpoint wrapper does not fail closed');
    if (rootRepair) assert(source.includes("        sessionRoot: 'NONE',\n        fallbackFrom: null,\n        attempted: '',"), 'root-aware failure-isolation probe missing');
    else assert(source.includes("        session: 'FAILED',\n        serializedChars: 0,\n        elapsedMs: 0,\n        retainedBodies: false,"), 'checkpoint failure-isolation probe missing');
    pass('checkpoint-failure-isolation');

    if (rootRepair) {
      assert(source.includes('`Session surface: ${lastTelemetryCheckpointProbe?.surface ?'), 'Session surface diagnostic missing');
      assert(source.includes('`Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `MEMORY ${lastTelemetryCheckpointProbe.memory'), 'root-aware checkpoint diagnostic missing');
    } else assert(source.includes('`Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `SESSION · ${lastTelemetryCheckpointProbe.session'), 'bounded checkpoint diagnostic missing');
    assert(source.includes('· trigger ${lastTelemetryCheckpointProbe.trigger'), 'checkpoint trigger diagnostic missing');
    pass('checkpoint-diagnostic-surface');

    assert(source.includes('const MAX_AGE_MS = 10 * 60 * 1000;'), '10-minute telemetry age bound changed');
    assert(source.includes('const MAX_SESSION_CHARS = 16384;'), 'session telemetry size bound changed');
    assert(source.includes("const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';"), 'session key changed');
    pass('checkpoint-transport-contract-frozen');
  }

  if (rootRepair) {
    const moduleStart = source.indexOf('SimCore.define("runtime-telemetry"');
    const moduleEnd = source.indexOf('SimCore.define("runtime-session"', moduleStart);
    const telemetrySource = source.slice(moduleStart, moduleEnd);
    assert(moduleStart >= 0 && moduleEnd > moduleStart, 'runtime-telemetry module bounds missing');
    assert(telemetrySource.includes("inspectSessionSurface(windowLike, 'WINDOW')"), 'WINDOW inspection missing');
    assert(telemetrySource.includes("inspectSessionSurface(root, 'GLOBAL_THIS')"), 'GLOBAL_THIS inspection missing');
    for (const state of ['ROOT_ABSENT', 'STORAGE_ABSENT', 'ACCESS_ERROR', 'METHODS_INCOMPLETE', 'USABLE']) assert(telemetrySource.includes(`'${state}'`), `surface state ${state} missing`);
    pass('root-surface-classification');

    {
      const w = new MemorySessionStorage();
      telemetry.publish({}, { sessionStorage: w }, make());
      const write = telemetry.diagnostics().write;
      equal(write.sessionRoot, 'WINDOW', 'WINDOW-only root attribution');
      equal(write.surface.window, 'USABLE', 'WINDOW surface');
      equal(write.surface.globalThis, 'STORAGE_ABSENT', 'GLOBAL_THIS absent surface');
      pass('window-only-session-root');
    }
    {
      const g = new MemorySessionStorage();
      telemetry.publish({ sessionStorage: g }, {}, make());
      const write = telemetry.diagnostics().write;
      equal(write.sessionRoot, 'GLOBAL_THIS', 'GLOBAL_THIS-only root attribution');
      equal(write.surface.window, 'STORAGE_ABSENT', 'WINDOW absent surface');
      equal(write.surface.globalThis, 'USABLE', 'GLOBAL_THIS surface');
      pass('global-this-only-session-root');
    }
    {
      const w = new MemorySessionStorage();
      const g = new MemorySessionStorage();
      telemetry.publish({ sessionStorage: g }, { sessionStorage: w }, make());
      const write = telemetry.diagnostics().write;
      equal(write.sessionRoot, 'WINDOW', 'distinct first-success root');
      equal(write.surface.relation, 'DISTINCT_OBJECTS', 'distinct relation');
      equal(w.setCount, 1, 'WINDOW write count');
      equal(g.setCount, 0, 'GLOBAL_THIS must not write after first success');
      pass('distinct-root-first-success');
    }
    {
      const shared = new MemorySessionStorage();
      telemetry.publish({ sessionStorage: shared }, { sessionStorage: shared }, make());
      const write = telemetry.diagnostics().write;
      equal(write.surface.relation, 'SAME_OBJECT', 'same storage relation');
      equal(write.sessionRoot, 'WINDOW', 'same-object canonical root');
      equal(shared.setCount, 1, 'same object must write exactly once');
      pass('same-storage-deduped');
    }
    {
      const w = new ThrowingSetStorage();
      const g = new MemorySessionStorage();
      telemetry.publish({ sessionStorage: g }, { sessionStorage: w }, make());
      const write = telemetry.diagnostics().write;
      equal(write.session, 'WRITTEN', 'fallback write status');
      equal(write.sessionRoot, 'GLOBAL_THIS', 'fallback root');
      equal(write.fallbackFrom, 'WINDOW_FAILED', 'fallback attribution');
      equal(w.setCount, 1, 'first attempt count');
      equal(g.setCount, 1, 'second attempt count');
      pass('first-write-fails-second-once');
    }
    {
      const w = new ThrowingSetStorage();
      const g = new ThrowingSetStorage();
      telemetry.publish({ sessionStorage: g }, { sessionStorage: w }, make());
      const write = telemetry.diagnostics().write;
      equal(write.session, 'FAILED', 'both-write failure status');
      equal(w.setCount, 1, 'failed WINDOW count');
      equal(g.setCount, 1, 'failed GLOBAL_THIS count');
      pass('both-writes-fail-bounded');
    }
    {
      const shared = new MemorySessionStorage();
      const huge = make({ runtimePromptCache: { payload: 'x'.repeat(fixture.input.maxSessionChars + 256) } });
      telemetry.publish({ sessionStorage: shared }, { sessionStorage: shared }, huge);
      equal(telemetry.diagnostics().write.session, 'OVERSIZE', 'oversize status');
      equal(shared.getItem(SESSION_KEY), null, 'oversize stale cleanup');
      equal(shared.setCount, 0, 'oversize must not attempt write');
      pass('oversize-no-write-cleanup');
    }
    {
      const w = new MemorySessionStorage();
      const g = new MemorySessionStorage();
      w.setItem(SESSION_KEY, '{broken');
      g.setItem(SESSION_KEY, JSON.stringify(make()));
      const adopted = telemetry.validate(telemetry.claim({ sessionStorage: g }, { sessionStorage: w }), loc, now + 1);
      assert(adopted.accepted, 'valid second root not adopted');
      equal(adopted.transport, 'session', 'second-root transport');
      equal(adopted.sessionRoot, 'GLOBAL_THIS', 'second-root attribution');
      equal(adopted.fallbackFrom, 'session-malformed', 'malformed-first reason');
      equal(w.getItem(SESSION_KEY), null, 'first candidate not consumed');
      equal(g.getItem(SESSION_KEY), null, 'second candidate not consumed');
      pass('malformed-first-valid-second-claim');
    }
    {
      const w = new MemorySessionStorage();
      const g = new MemorySessionStorage();
      const root = { sessionStorage: g };
      telemetry.publish(root, { sessionStorage: w }, make());
      root[MEMORY_KEY] = make();
      const adopted = telemetry.validate(telemetry.claim(root, { sessionStorage: w }), loc, now + 1);
      equal(adopted.transport, 'memory', 'memory-first priority changed');
      equal(w.getItem(SESSION_KEY), null, 'standby session not consumed');
      pass('root-aware-memory-priority');
    }
    {
      const g = new MemorySessionStorage();
      const root = { sessionStorage: g };
      telemetry.publish(root, {}, make());
      delete root[MEMORY_KEY];
      const first = telemetry.validate(telemetry.claim(root, {}), loc, now + 1);
      assert(first.accepted, 'GLOBAL_THIS session claim failed');
      equal(first.sessionRoot, 'GLOBAL_THIS', 'claim root diagnostic');
      const second = telemetry.validate(telemetry.claim(root, {}), loc, now + 2);
      assert(!second.accepted, 'consumed session replayed');
      pass('session-claim-root-and-one-time-consume');
    }

    assert(telemetrySource.includes("relation = 'SAME_OBJECT'"), 'same-object de-duplication contract missing');
    assert(telemetrySource.includes("attempted = `${first.label},${second.label}`"), 'bounded fallback attribution missing');
    assert(!/\b(for|while)\s*\(/.test(telemetrySource), 'root resolution introduced loop');
    for (const forbidden of ['setInterval(', 'setTimeout(', 'fetch(', 'XMLHttpRequest', 'pluginStorage', 'localStorage']) assert(!telemetrySource.includes(forbidden), `root resolution introduced forbidden ${forbidden}`);
    pass('root-resolution-bounded-no-new-io');

    assert(source.includes('sessionRoot: adoption.sessionRoot || null'), 'session adoption root not propagated');
    assert(source.includes("probe.transport === 'session' && probe.sessionRoot"), 'continuity root diagnostic missing');
    pass('root-attributed-diagnostics');
  }

  equal(assertions.filter((row) => fixture.input.cases.includes(row.id)).length, fixture.input.cases.length, 'frozen fixture coverage');
  if (checkpointRepair) equal(assertions.filter((row) => fixture.input.checkpointCases.includes(row.id)).length, fixture.input.checkpointCases.length, 'checkpoint fixture coverage');
  if (rootRepair) equal(assertions.filter((row) => fixture.input.rootCases.includes(row.id)).length, fixture.input.rootCases.length, 'v0.64.9 root fixture coverage');
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
