import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

class MemorySessionStorage {
  constructor() { this.map = new Map(); this.setCount = 0; this.getCount = 0; this.removeCount = 0; }
  getItem(key) { this.getCount += 1; return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.setCount += 1; this.map.set(String(key), String(value)); }
  removeItem(key) { this.removeCount += 1; this.map.delete(String(key)); }
}

class ThrowingSessionStorage extends MemorySessionStorage {
  setItem() { this.setCount += 1; throw new Error('session write disabled'); }
}

class HostStore {
  constructor({ remove = true, throwGet = false, throwSet = false, throwRemove = false } = {}) {
    this.map = new Map();
    this.getCount = 0;
    this.setCount = 0;
    this.removeCount = 0;
    this.throwGet = throwGet;
    this.throwSet = throwSet;
    this.throwRemove = throwRemove;
    if (!remove) this.removeItem = undefined;
  }
  async getItem(key) {
    this.getCount += 1;
    if (this.throwGet) throw new Error('read failed');
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }
  async setItem(key, value) {
    this.setCount += 1;
    if (this.throwSet) throw new Error('write failed');
    this.map.set(String(key), String(value));
  }
  async removeItem(key) {
    this.removeCount += 1;
    if (this.throwRemove) throw new Error('remove failed');
    this.map.delete(String(key));
  }
}

function disabledWindow() {
  const value = {};
  Object.defineProperty(value, 'sessionStorage', { get() { throw new Error('disabled'); } });
  return value;
}

function hostApi(store, options = {}) {
  const state = { acquireCount: 0 };
  const api = options.absent ? {} : {
    async getLocalPluginStorage() {
      state.acquireCount += 1;
      if (options.rejectAcquire) throw new Error('acquire failed');
      return options.returnValue !== undefined ? options.returnValue : store;
    },
  };
  return { api, state };
}

export async function runSuite({ source, fixtures }) {
  const fixture = fixtures[0];
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  if (version !== '0.64.10') {
    assert(!source.includes(fixture.input.hostLocalKey), 'Host-local key appeared before v0.64.10');
    pass('pre-06410-host-local-absent-control');
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
  }

  const HOST_KEY = fixture.input.hostLocalKey;
  const SESSION_KEY = fixture.input.sessionKey;
  const MEMORY_KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
  const now = 2000000000000;
  const loc = 'character:chat';
  const fresh = () => new BundleLoader(source).load('runtime-telemetry');
  const make = (telemetry, overrides = {}) => telemetry.capture({
    sourceVersion: '0.64.10',
    locationKey: loc,
    capturedAt: now,
    runtimePromptCache: { version: 1, key: 'k', previous: { stable: true } },
    requestTopology: { version: 2, key: 'k', previous: { signatures: [{ role: 'user', kind: 'text', chars: 3, hash: 'abc' }] } },
    cacheCandidates: { version: 2, state: { key: 'k', familyId: 'f' } },
    rawBody: 'SHOULD_NOT_BE_RETAINED',
    ...overrides,
  });

  const moduleStart = source.indexOf('SimCore.define("runtime-telemetry"');
  const moduleEnd = source.indexOf('SimCore.define("runtime-session"', moduleStart);
  const telemetrySource = source.slice(moduleStart, moduleEnd);
  assert(moduleStart >= 0 && moduleEnd > moduleStart, 'runtime telemetry bounds');
  equal((telemetrySource.match(/__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__/g) || []).length, 2, 'single Host-local key declaration/use contract');
  equal((telemetrySource.match(/getLocalPluginStorage/g) || []).length, 1, 'single Host acquisition surface');
  for (const forbidden of ['localStorage', 'IndexedDB', 'XMLHttpRequest', 'setInterval(', 'setTimeout(', 'keys(', 'Object.keys(', 'fetch(']) {
    assert(!telemetrySource.includes(forbidden), `forbidden Host-local transport primitive: ${forbidden}`);
  }
  pass('host-local-bounded-source-surface');

  {
    const telemetry = fresh();
    const session = new MemorySessionStorage();
    const store = new HostStore();
    const h = hostApi(store);
    await telemetry.publishWithHostLocal({}, { sessionStorage: session }, h.api, make(telemetry));
    const write = telemetry.diagnostics().write;
    equal(write.session, 'WRITTEN', 'session positive control');
    equal(write.hostLocal, 'NOT_NEEDED', 'Host-local must not run after session success');
    equal(h.state.acquireCount, 0, 'Host acquisition must not occur when session wrote');
    equal(store.setCount, 0, 'Host write must not occur when session wrote');
    pass('session-written-host-local-not-needed');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    const capsule = make(telemetry);
    await telemetry.publishWithHostLocal({}, disabledWindow(), h.api, capsule);
    const write = telemetry.diagnostics().write;
    equal(write.session, 'UNAVAILABLE', 'session unavailable classification');
    equal(write.hostLocal, 'WRITTEN', 'Host-local fallback write');
    equal(store.setCount, 1, 'Host-local exactly one write');
    equal(h.state.acquireCount, 1, 'Host store exactly one acquire');
    assert(store.map.has(HOST_KEY), 'Host-local mailbox missing');
    assert(!String(store.map.get(HOST_KEY)).includes('SHOULD_NOT_BE_RETAINED'), 'raw body retained in Host-local capsule');
    pass('session-unavailable-host-local-one-write');
  }

  {
    const telemetry = fresh();
    const w = new ThrowingSessionStorage();
    const g = new ThrowingSessionStorage();
    const store = new HostStore();
    const h = hostApi(store);
    await telemetry.publishWithHostLocal({ sessionStorage: g }, { sessionStorage: w }, h.api, make(telemetry));
    const write = telemetry.diagnostics().write;
    equal(write.session, 'FAILED', 'session real failure classification');
    equal(w.setCount, 1, 'WINDOW one attempt');
    equal(g.setCount, 1, 'GLOBAL_THIS one fallback attempt');
    equal(write.hostLocal, 'WRITTEN', 'Host-local after session failure');
    equal(store.setCount, 1, 'Host-local no retry');
    pass('session-failed-host-local-one-write');
  }

  {
    const telemetry = fresh();
    const h = hostApi(null, { absent: true });
    const ok = await telemetry.publishWithHostLocal({}, disabledWindow(), h.api, make(telemetry));
    assert(ok, 'memory write must keep checkpoint successful');
    const write = telemetry.diagnostics().write;
    equal(write.hostLocal, 'UNAVAILABLE', 'API absent Host-local classification');
    equal(telemetry.diagnostics().host.store, 'API_ABSENT', 'API absent surface');
    pass('host-api-absent-fail-open');
  }

  {
    const telemetry = fresh();
    const h = hostApi(null, { rejectAcquire: true });
    await telemetry.publishWithHostLocal({}, disabledWindow(), h.api, make(telemetry));
    equal(telemetry.diagnostics().write.hostLocal, 'UNAVAILABLE', 'acquire reject checkpoint');
    equal(telemetry.diagnostics().host.store, 'ACQUIRE_FAILED', 'acquire reject surface');
    equal(h.state.acquireCount, 1, 'acquire reject no retry');
    pass('host-acquire-failed-bounded');
  }

  {
    const telemetry = fresh();
    const h = hostApi({ getItem: async () => null });
    await telemetry.publishWithHostLocal({}, disabledWindow(), h.api, make(telemetry));
    equal(telemetry.diagnostics().host.store, 'METHODS_INCOMPLETE', 'incomplete store surface');
    equal(telemetry.diagnostics().write.hostLocal, 'UNAVAILABLE', 'incomplete store checkpoint');
    pass('host-methods-incomplete');
  }

  {
    const telemetry = fresh();
    const store = new HostStore({ throwSet: true });
    const h = hostApi(store);
    await telemetry.publishWithHostLocal({}, disabledWindow(), h.api, make(telemetry));
    equal(telemetry.diagnostics().write.hostLocal, 'FAILED', 'Host real write failure');
    equal(store.setCount, 1, 'Host real write failure retried');
    pass('host-real-write-failed-no-retry');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    const huge = make(telemetry, { runtimePromptCache: { payload: 'x'.repeat(fixture.input.maxSerializedChars + 1024) } });
    await telemetry.publishWithHostLocal({}, disabledWindow(), h.api, huge);
    const write = telemetry.diagnostics().write;
    equal(write.hostLocal, 'OVERSIZE', 'Host-local oversize classification');
    equal(store.setCount, 0, 'oversize Host write attempted');
    equal(h.state.acquireCount, 0, 'oversize must not acquire Host store');
    pass('host-oversize-no-write');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    const empty = await telemetry.claimHostLocalOnce(h.api, loc, now);
    equal(empty.status, 'EMPTY', 'empty boot result');
    const again = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    equal(again.status, 'EMPTY', 'one-shot cached boot result');
    equal(store.getCount, 1, 'boot mailbox read count');
    await telemetry.publishWithHostLocal({}, disabledWindow(), h.api, make(telemetry));
    equal(h.state.acquireCount, 1, 'claim/checkpoint acquisition race not deduped');
    pass('host-acquire-once-read-once');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    const capsule = make(telemetry, { locationKey: 'other-chat' });
    store.map.set(HOST_KEY, JSON.stringify(capsule));
    const claim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    equal(claim.status, 'FOREIGN_LOCATION', 'foreign location classification');
    equal(store.removeCount, 0, 'foreign mailbox destructively removed');
    equal(store.setCount, 0, 'foreign mailbox empty-write cleared');
    assert(store.map.has(HOST_KEY), 'foreign mailbox lost');
    pass('foreign-location-non-destructive');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    const capsule = make(telemetry);
    store.map.set(HOST_KEY, JSON.stringify(capsule));
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    equal(hostClaim.status, 'CONSUMED', 'matching mailbox consume status');
    equal(store.removeCount, 1, 'matching remove count');
    const adopted = telemetry.validate(telemetry.claim(null, null), loc, now + 1, hostClaim);
    assert(adopted.accepted, 'Host-local compatible capsule not adopted');
    equal(adopted.transport, 'host-local', 'Host-local attribution');
    equal(store.map.has(HOST_KEY), false, 'consumed mailbox remains');
    pass('matching-remove-consume-host-adopt');
  }

  {
    const telemetry = fresh();
    const store = new HostStore({ remove: false });
    const h = hostApi(store);
    store.map.set(HOST_KEY, JSON.stringify(make(telemetry)));
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    equal(hostClaim.status, 'CONSUMED', 'empty-write consume status');
    equal(store.setCount, 1, 'empty-write consume count');
    equal(store.map.get(HOST_KEY), '', 'empty-write clear value');
    equal(telemetry.diagnostics().host.clear, 'EMPTY_WRITE', 'clear mode');
    pass('matching-empty-write-consume');
  }

  {
    const telemetry = fresh();
    const store = new HostStore({ throwRemove: true });
    const h = hostApi(store);
    store.map.set(HOST_KEY, JSON.stringify(make(telemetry)));
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    equal(hostClaim.status, 'CONSUME_FAILED', 'consume failure classification');
    const adopted = telemetry.validate(telemetry.claim(null, null), loc, now + 1, hostClaim);
    assert(!adopted.accepted, 'consume failure adopted');
    pass('consume-failed-no-adopt');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    store.map.set(HOST_KEY, JSON.stringify(make(telemetry, { capturedAt: now - fixture.input.maxAgeMs - 1 })));
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now);
    equal(hostClaim.status, 'STALE', 'stale matching classification');
    equal(store.removeCount, 1, 'stale matching not consumed');
    pass('stale-matching-consumed-rejected');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    store.map.set(HOST_KEY, JSON.stringify(make(telemetry, { runtimePromptCache: [] })));
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    equal(hostClaim.status, 'MALFORMED', 'malformed matching classification');
    equal(store.removeCount, 1, 'malformed matching not consumed');
    pass('malformed-matching-consumed-rejected');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    store.map.set(HOST_KEY, JSON.stringify(make(telemetry, { sourceVersion: '0.64.9' })));
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    equal(hostClaim.status, 'INCOMPATIBLE', 'incompatible matching classification');
    equal(store.removeCount, 1, 'incompatible matching not consumed');
    pass('incompatible-matching-consumed-rejected');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    const capsule = make(telemetry);
    store.map.set(HOST_KEY, JSON.stringify(capsule));
    const root = { [MEMORY_KEY]: capsule };
    const claimed = telemetry.claim(root, null);
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    const adopted = telemetry.validate(claimed, loc, now + 1, hostClaim);
    equal(adopted.transport, 'memory', 'memory priority changed');
    equal(store.removeCount, 1, 'matching lower Host duplicate not consumed');
    pass('memory-beats-consumed-host-local');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const h = hostApi(store);
    const capsule = make(telemetry);
    store.map.set(HOST_KEY, JSON.stringify(capsule));
    const session = new MemorySessionStorage();
    session.map.set(SESSION_KEY, JSON.stringify(capsule));
    const claimed = telemetry.claim(null, { sessionStorage: session });
    const hostClaim = await telemetry.claimHostLocalOnce(h.api, loc, now + 1);
    const adopted = telemetry.validate(claimed, loc, now + 1, hostClaim);
    equal(adopted.transport, 'session', 'session priority changed');
    equal(store.removeCount, 1, 'matching Host duplicate not consumed behind session');
    pass('session-beats-consumed-host-local');
  }

  assert(source.includes("const hostLocalClaim = await runtimeTelemetryRules.claimHostLocalOnce(Risuai, runtimePromptKey, Date.now());"), 'first-request Host claim await missing');
  assert(source.includes("const adoption = runtimeTelemetryRules.validate(pendingTelemetryHandoff, runtimePromptKey, Date.now(), hostLocalClaim);"), 'Host claim not bound into adoption');
  pass('first-request-host-claim-before-observer-adoption');

  {
    const processCall = source.indexOf('    const result = await cs.processOutput(outIndex, content, outputDetail);');
    const activeGate = source.indexOf('    if (!result.active) {', processCall);
    const checkpointCall = source.indexOf("      await checkpointRuntimeTelemetry('OUTPUT_COMMIT');", activeGate);
    const committedMark = source.indexOf("    markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED', outputAt: Date.now() });", checkpointCall);
    assert(processCall >= 0 && activeGate > processCall && checkpointCall > activeGate && committedMark > checkpointCall, 'awaited Host checkpoint ordering invalid');
    pass('authoritative-output-awaits-host-checkpoint-after-success');
  }

  assert(source.includes("    await checkpointRuntimeTelemetry('UNLOAD');"), 'UNLOAD canonical async checkpoint missing');
  assert(source.includes('`Host-local transport: ${lastTelemetryCheckpointProbe?.host ?'), 'Host-local diagnostic surface missing');
  assert(source.includes('· HOST_LOCAL ${lastTelemetryCheckpointProbe.hostLocal'), 'Host-local checkpoint diagnostic missing');
  assert(source.includes("provider cache UNVERIFIED"), 'provider cache contract changed');
  pass('bounded-host-diagnostics-provider-unverified');

  equal((source.match(/Risuai\.registerButton\(/g) || []).length, fixture.expected.topLevelRegisterButtonCount, 'top-level UI button count changed');
  equal((source.match(/Risuai\.registerSetting\(/g) || []).length, fixture.expected.topLevelRegisterSettingCount, 'top-level UI setting count changed');
  pass('host-local-no-new-top-level-ui');

  equal(assertions.filter((row) => fixture.input.requiredCases.includes(row.id)).length, fixture.input.requiredCases.length, 'Host-local fixture coverage');
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
