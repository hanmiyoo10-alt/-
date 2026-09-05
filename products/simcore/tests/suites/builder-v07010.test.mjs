import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

function count(source, marker) {
  return source.split(marker).length - 1;
}

function moduleNames(source) {
  return [...source.matchAll(/SimCore\.define\("([^"]+)"\s*,\s*function/g)].map((m) => m[1]);
}

function moduleText(source, name) {
  const token = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(token);
  assert(start >= 0, `${name} module missing`);
  const next = source.indexOf('\nSimCore.define("', start + token.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

function requireLines(source, name) {
  return [...moduleText(source, name).matchAll(/^const [^\n=]+ = require\('[^']+'\);$/gm)].map((m) => m[0]);
}

function assertIdentity(candidate) {
  equal(candidate.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.10', 'metadata identity');
  equal(candidate.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.10', 'runtime identity');
  equal(candidate.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.10', 'Host identity');
  equal(count(candidate, '// v0.70.10 Host-Local Telemetry Set Cost Attribution:'), 1, 'release-note source header identity');
  assert(candidate.includes("version: '0.70.10',\n    name: 'Host-Local Telemetry Set Cost Attribution',"), 'operator release-card identity');
}

class MemorySessionStorage {
  constructor() { this.map = new Map(); this.setCount = 0; }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.setCount += 1; this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

class HostStore {
  constructor({ throwSet = false } = {}) {
    this.map = new Map();
    this.getCount = 0;
    this.setCount = 0;
    this.removeCount = 0;
    this.throwSet = throwSet;
  }
  async getItem(key) {
    this.getCount += 1;
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }
  async setItem(key, value) {
    this.setCount += 1;
    if (this.throwSet) throw new Error('fixture write failed');
    this.map.set(String(key), String(value));
  }
  async removeItem(key) {
    this.removeCount += 1;
    this.map.delete(String(key));
  }
}

function disabledWindow() {
  const value = {};
  Object.defineProperty(value, 'sessionStorage', { get() { throw new Error('fixture session disabled'); } });
  return value;
}

function hostApi(store, options = {}) {
  const state = { acquireCount: 0 };
  const api = options.absent ? {} : {
    async getLocalPluginStorage() {
      state.acquireCount += 1;
      if (options.rejectAcquire) throw new Error('fixture acquire failed');
      return store;
    },
  };
  return { api, state };
}

async function withDeterministicClock(fn) {
  const original = Date.now;
  let tick = 1000000;
  Date.now = () => tick++;
  try {
    return await fn();
  } finally {
    Date.now = original;
  }
}

function makeCapsule(telemetry, overrides = {}) {
  return telemetry.capture({
    sourceVersion: '0.70.10',
    locationKey: 'character:chat',
    capturedAt: 2000000000000,
    runtimePromptCache: { version: 1, key: 'k', previous: { stable: true } },
    requestTopology: { version: 2, key: 'k', previous: { signatures: [{ role: 'user', kind: 'text', chars: 3, hash: 'abc' }] } },
    cacheCandidates: { version: 2, state: { key: 'k', familyId: 'f' } },
    rawBody: 'MUST_NOT_BE_RETAINED',
    ...overrides,
  });
}

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  assert(fixture, 'v0.70.10 builder fixture missing');
  equal(fixture.expected.runtimeMutation, 'HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_ONLY', 'fixture runtime mutation contract');
  equal(fixture.expected.releaseSystemMutation, 'NONE', 'fixture release-system non-mutation contract');
  equal(fixture.expected.extraHostIo, 0, 'fixture zero-extra-Host-I/O contract');

  const sourceVersion = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (!['0.70.9', '0.70.10'].includes(sourceVersion)) {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v07010-builder-source-not-active', status: 'PASS' }],
    };
  }

  let candidate = ctx.source;
  let predecessor = null;
  if (sourceVersion === '0.70.9') {
    predecessor = ctx.source;
    const root = process.cwd();
    const builder = path.resolve(root, 'products/simcore/tooling/build-07010-host-local-telemetry-set-cost-attribution.py');
    assert(fs.existsSync(builder), 'v0.70.10 builder missing');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07010-builder-'));
    try {
      const pluginDir = path.join(tmp, 'plugins', 'simcore');
      fs.mkdirSync(pluginDir, { recursive: true });
      const latestPath = path.join(pluginDir, 'latest.js');
      const installPath = path.join(pluginDir, 'install.js');
      fs.writeFileSync(latestPath, ctx.source, 'utf8');
      fs.writeFileSync(installPath, ctx.source, 'utf8');

      const run = spawnSync('python3', [builder], {
        cwd: tmp,
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      });
      equal(run.status, 0, `v0.70.10 builder exit: ${run.stderr || run.stdout}`);
      assert(run.stdout.includes('07010_BUILD_PASS'), `v0.70.10 builder PASS marker missing: ${run.stdout}`);

      const latest = fs.readFileSync(latestPath, 'utf8');
      const install = fs.readFileSync(installPath, 'utf8');
      equal(latest, install, 'v0.70.10 latest/install identity');
      candidate = latest;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  assertIdentity(candidate);
  equal(count(candidate, 'let hostAcquireMs = 0;'), 1, 'Host acquire timing owner cardinality');
  equal(count(candidate, 'let hostSetMs = 0;'), 1, 'Host set timing owner cardinality');
  equal(count(candidate, 'const acquireStartedAt = Date.now();'), 1, 'Host acquire timer boundary cardinality');
  equal(count(candidate, 'const setStartedAt = Date.now();'), 1, 'Host set timer boundary cardinality');
  equal(count(candidate, 'function diagnosticTelemetryHostCost(probe)'), 1, 'Host cost diagnostic helper cardinality');
  equal(count(candidate, 'Telemetry host cost:'), 1, 'Host cost copied-diagnostic line cardinality');
  equal(count(candidate, 'API RISUAI_LOCAL_PLUGIN_STORAGE_SET_ITEM'), 1, 'Host set API owner label cardinality');
  assert(candidate.includes("probe.hostLocal === 'WRITTEN' || probe.hostLocal === 'FAILED'"), 'real-set-attempt eligibility must use existing disposition');
  assert(candidate.includes('Math.max(0, totalMs - sumMs)'), 'Host residual must be bounded non-negative accounting');
  assert(candidate.includes('setMs / (chars / 1000)'), 'Host set normalized-cost derivation missing');
  assert(candidate.includes("confidence = validTotal && sumMs != null && totalMs >= sumMs ? 'EXACT' : 'BOUNDED'"), 'Host cost confidence contract missing');

  const fresh = () => new BundleLoader(candidate).load('runtime-telemetry');

  {
    const telemetry = fresh();
    const session = new MemorySessionStorage();
    const store = new HostStore();
    const host = hostApi(store);
    await telemetry.publishWithHostLocal({}, { sessionStorage: session }, host.api, makeCapsule(telemetry));
    const write = telemetry.diagnostics().write;
    equal(write.session, 'WRITTEN', 'SESSION positive control');
    equal(write.hostLocal, 'NOT_NEEDED', 'SESSION written must avoid Host-local');
    equal(write.hostAcquireMs, 0, 'SESSION written acquire timing must be explicit zero');
    equal(write.hostSetMs, 0, 'SESSION written set timing must be explicit zero');
    equal(write.hostElapsedMs, 0, 'SESSION written outer Host total must remain zero');
    equal(host.state.acquireCount, 0, 'SESSION written must not acquire Host store');
    equal(store.setCount, 0, 'SESSION written must not call Host setItem');
  }

  {
    const telemetry = fresh();
    const host = hostApi(null, { absent: true });
    await withDeterministicClock(() => telemetry.publishWithHostLocal({}, disabledWindow(), host.api, makeCapsule(telemetry)));
    const write = telemetry.diagnostics().write;
    equal(write.hostLocal, 'UNAVAILABLE', 'Host API absent disposition');
    assert(write.hostAcquireMs > 0, 'Host unavailable path must measure acquire/reuse-resolution span');
    equal(write.hostSetMs, 0, 'Host unavailable path must report zero set span');
    assert(write.hostElapsedMs >= write.hostAcquireMs, 'Host unavailable total must enclose acquire span');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const host = hostApi(store);
    await withDeterministicClock(() => telemetry.publishWithHostLocal({}, disabledWindow(), host.api, makeCapsule(telemetry)));
    const write = telemetry.diagnostics().write;
    equal(write.hostLocal, 'WRITTEN', 'Host WRITTEN disposition');
    equal(host.state.acquireCount, 1, 'Host WRITTEN acquisition count');
    equal(store.setCount, 1, 'Host WRITTEN setItem count');
    assert(write.hostAcquireMs > 0, 'Host WRITTEN acquire span must be measured');
    assert(write.hostSetMs > 0, 'Host WRITTEN set span must be measured');
    assert(write.hostElapsedMs >= write.hostAcquireMs + write.hostSetMs, 'Host WRITTEN total must enclose acquire + set');
    assert(Number(write.serializedChars) > 0, 'Host WRITTEN must reuse existing serializedChars');
  }

  {
    const telemetry = fresh();
    const store = new HostStore({ throwSet: true });
    const host = hostApi(store);
    await withDeterministicClock(() => telemetry.publishWithHostLocal({}, disabledWindow(), host.api, makeCapsule(telemetry)));
    const write = telemetry.diagnostics().write;
    equal(write.hostLocal, 'FAILED', 'Host failed set disposition unchanged');
    equal(store.setCount, 1, 'Host failed set must not retry');
    assert(write.hostAcquireMs > 0, 'Host failed set acquire span must remain measured');
    assert(write.hostSetMs > 0, 'Host failed real set attempt must remain measured');
    assert(write.hostElapsedMs >= write.hostAcquireMs + write.hostSetMs, 'Host failed set total must enclose measured spans');
  }

  {
    const telemetry = fresh();
    const store = new HostStore();
    const host = hostApi(store);
    const capsule = makeCapsule(telemetry);
    const oversize = {
      ...capsule,
      __simcorePreparedSerialized: Object.freeze({
        status: 'OVERSIZE',
        encoded: '',
        serializedChars: fixture.input.maxSerializedChars + 1,
      }),
    };
    await telemetry.publishWithHostLocal({}, disabledWindow(), host.api, oversize);
    const write = telemetry.diagnostics().write;
    equal(write.hostLocal, 'OVERSIZE', 'OVERSIZE disposition unchanged');
    equal(write.hostAcquireMs, 0, 'OVERSIZE acquire timing must be zero');
    equal(write.hostSetMs, 0, 'OVERSIZE set timing must be zero');
    equal(host.state.acquireCount, 0, 'OVERSIZE must not acquire Host store');
    equal(store.setCount, 0, 'OVERSIZE must not call Host setItem');
  }

  {
    const telemetry = fresh();
    const session = new MemorySessionStorage();
    telemetry.publish({}, { sessionStorage: session }, makeCapsule(telemetry));
    const write = telemetry.diagnostics().write;
    equal(write.hostLocal, 'UNOBSERVED', 'non-Host publish disposition unchanged');
    equal(write.hostAcquireMs, 0, 'non-Host publish acquire timing zero');
    equal(write.hostSetMs, 0, 'non-Host publish set timing zero');
  }

  if (predecessor) {
    equal(JSON.stringify(moduleNames(candidate)), JSON.stringify(moduleNames(predecessor)), 'module inventory/order frozen');
    for (const name of moduleNames(predecessor)) {
      equal(JSON.stringify(requireLines(candidate, name)), JSON.stringify(requireLines(predecessor, name)), `${name} require graph frozen`);
    }
    for (const marker of [
      'getLocalPluginStorage',
      'setItem(',
      'getItem(',
      'removeItem(',
      'pluginStorage.setItem(',
      'pluginStorage.getItem(',
      'pluginStorage.removeItem(',
      'pluginStorage.keys(',
      'setChatToIndex',
      'getChatFromIndex',
      'setTimeout(',
      'setInterval(',
      'fetch(',
      'XMLHttpRequest',
      'history.splice(',
      'messages.splice(',
      'const PROMPT_COMPILER_VERSION = 4;',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__',
      "await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);",
      "await checkpointRuntimeTelemetry('OUTPUT_COMMIT');",
    ]) {
      equal(count(candidate, marker), count(predecessor, marker), `${marker} frozen`);
    }
    equal(count(candidate, 'Date.now()'), count(predecessor, 'Date.now()') + 4, 'only four attribution clock reads added');
  }

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v07010-identity', status: 'PASS' },
      { id: 'v07010-session-no-host-zero-cost', status: 'PASS' },
      { id: 'v07010-unavailable-acquire-only', status: 'PASS' },
      { id: 'v07010-written-acquire-set-total', status: 'PASS' },
      { id: 'v07010-failed-set-measured', status: 'PASS' },
      { id: 'v07010-oversize-no-host-zero-cost', status: 'PASS' },
      { id: 'v07010-unload-publish-zero-cost', status: 'PASS' },
      { id: 'v07010-normalized-cost-derived-only', status: 'PASS' },
      { id: 'v07010-side-effect-parity', status: 'PASS' },
      { id: 'v07010-topology-frozen', status: 'PASS' },
      { id: 'v07010-latest-install', status: 'PASS' },
    ],
  };
}
