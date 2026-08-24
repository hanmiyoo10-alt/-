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

export async function runSuite({ source, loader, fixtures }) {
  const fixture = fixtures[0];
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  // The verifier lands before the candidate. Keep the current v0.64.6 production
  // as an explicit negative/baseline control until CANDIDATE_REQUIRED evaluates 0.64.7.
  if (version === '0.64.6') {
    assert(source.includes("const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';"), 'v0.64.6 memory handoff baseline missing');
    assert(!source.includes(fixture.input.sessionKey), 'v0.64.6 unexpectedly contains session handoff');
    pass('unchanged-reload-control');
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
  }

  equal(version, '0.64.7', 'reload continuity gate version');
  assert(source.includes("const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';"), 'v0.64.7 memory handoff compatibility control missing');
  pass('unchanged-reload-control');
  const telemetry = loader.load('runtime-telemetry');
  for (const name of ['capture', 'publish', 'claim', 'validate', 'diagnostics']) assert(typeof telemetry[name] === 'function', `${name} surface missing`);
  const SESSION_KEY = fixture.input.sessionKey;
  const now = 2000000000000;
  const loc = 'character:chat';
  const make = (overrides = {}) => telemetry.capture({
    sourceVersion: '0.64.7',
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

  equal(assertions.filter((row) => fixture.input.cases.includes(row.id)).length, fixture.input.cases.length, 'frozen fixture coverage');
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
