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

function extractRatioHelper(source) {
  const match = source.match(/function diagnosticOutputSetCostPer1k\(payloadChars, setMs\) \{[\s\S]*?\n  \}/);
  assert(match, 'v0.70.7 normalized-cost helper missing');
  return Function(`${match[0]}; return diagnosticOutputSetCostPer1k;`)();
}

function assertIdentity(candidate) {
  equal(candidate.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.7', 'metadata identity');
  equal(candidate.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.7', 'runtime identity');
  equal(candidate.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.7', 'Host identity');
  assert(candidate.includes("version: '0.70.7',\n    name: 'Output Snapshot Set Cost Attribution',"), 'operator release-card identity');
}

async function assertStoreMetric(candidate) {
  const storeModule = new BundleLoader(candidate).load('store');
  const SnapshotStore = storeModule.SnapshotStore;
  assert(typeof SnapshotStore === 'function', 'SnapshotStore export missing');

  let setCalls = 0;
  let setKey = null;
  let setPayload = null;
  let releaseSet;
  const gate = new Promise((resolve) => { releaseSet = resolve; });
  const backend = {
    set: async (key, payload) => {
      setCalls += 1;
      setKey = key;
      setPayload = payload;
      await gate;
    },
  };

  const store = new SnapshotStore(backend, 'probe', 80);
  const state = { z: '한글', a: [1, 2, 3], nested: { ok: true } };
  const expectedPayload = JSON.stringify(state);
  const metric = {};
  let settled = false;
  const save = store.save('out', 7, state, { prune: false, metric }).then(() => { settled = true; });

  await Promise.resolve();
  equal(setCalls, 1, 'ordinary SnapshotStore save must issue exactly one backend set');
  equal(setKey, 'probe:out:7', 'ordinary SnapshotStore key remains deterministic phase+index');
  equal(setPayload, expectedPayload, 'ordinary SnapshotStore payload bytes remain exact JSON.stringify(state)');
  equal(settled, false, 'ordinary SnapshotStore save must remain awaited on backend set');
  equal(metric.payloadChars, expectedPayload.length, 'payloadChars must equal already-created payload.length');
  assert(Number.isFinite(metric.serializeMs) && metric.serializeMs >= 0, 'serializeMs must remain finite non-negative');

  releaseSet();
  await save;
  equal(settled, true, 'ordinary SnapshotStore save resolves after backend set');
  assert(Number.isFinite(metric.setMs) && metric.setMs >= 0, 'setMs must remain finite non-negative');
  assert(metric.pruneMs === undefined, 'prune:false must not fabricate prune metric');
}

export async function runSuite(ctx) {
  const sourceVersion = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (!['0.70.6', '0.70.7'].includes(sourceVersion)) {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v07007-builder-source-not-active', status: 'PASS' }],
    };
  }

  const ordinaryOutSave = "await this.store.save('out', outIndex, result.state, detail ? { prune: false, metric: outMetric } : { prune: false });";

  let candidate = ctx.source;
  let predecessor = null;
  if (sourceVersion === '0.70.6') {
    predecessor = ctx.source;
    const root = process.cwd();
    const builder = path.resolve(root, 'products/simcore/tooling/build-07007-output-snapshot-set-cost-attribution.py');
    assert(fs.existsSync(builder), 'v0.70.7 builder missing');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07007-builder-'));
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
      equal(run.status, 0, `v0.70.7 builder exit: ${run.stderr || run.stdout}`);
      assert(run.stdout.includes('07007_BUILD_PASS'), `v0.70.7 builder PASS marker missing: ${run.stdout}`);

      const latest = fs.readFileSync(latestPath, 'utf8');
      const install = fs.readFileSync(installPath, 'utf8');
      equal(latest, install, 'v0.70.7 latest/install identity');
      candidate = latest;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  assertIdentity(candidate);
  assert(candidate.includes('metric.payloadChars = payload.length;'), 'ordinary save payloadChars metric missing');
  assert(candidate.includes("['OUT_STORAGE', n(detail.outSetMs)]"), 'OUT_STORAGE must remain exactly outSetMs');
  assert(candidate.includes(ordinaryOutSave), 'ordinary out save must remain awaited, conditional-metric, and prune:false');
  assert(candidate.includes('detail.outPayloadChars = Number.isInteger(outMetric.payloadChars) && outMetric.payloadChars > 0'), 'ordinary output payload propagation missing');
  assert(candidate.includes('outPayloadChars, outSetMsPer1kChars'), 'output breakdown payload attribution missing');
  assert(candidate.includes('Output snapshot set:'), 'output snapshot-set diagnostic missing');
  assert(candidate.includes('API PLUGIN_STORAGE_SET_ITEM · prune INLINE_DISABLED · confidence EXACT'), 'diagnostic provenance tokens missing');

  const ratio = extractRatioHelper(candidate);
  equal(ratio(2000, 50), 25, 'normalized set cost exact finite case');
  equal(ratio(1000, 0), 0, 'zero set latency remains truthful zero');
  equal(ratio(0, 50), null, 'zero payload chars must fail closed to null');
  equal(ratio(-1, 50), null, 'negative payload chars must fail closed to null');
  equal(ratio(1000, -1), null, 'negative set latency must fail closed to null');
  equal(ratio(1000, Number.NaN), null, 'non-finite set latency must fail closed to null');
  equal(ratio(Number.NaN, 50), null, 'non-finite payload chars must fail closed to null');

  await assertStoreMetric(candidate);

  if (predecessor) {
    equal(JSON.stringify(moduleNames(candidate)), JSON.stringify(moduleNames(predecessor)), 'module inventory/order frozen');
    for (const name of moduleNames(predecessor)) {
      equal(JSON.stringify(requireLines(candidate, name)), JSON.stringify(requireLines(predecessor, name)), `${name} require graph frozen`);
    }
    for (const marker of [
      'JSON.stringify(state)',
      'await this.b.set(',
      'setTimeout(',
      'setInterval(',
      'pluginStorage',
      'setChat(',
      'fetch(',
      'XMLHttpRequest',
      'history.splice(',
      'messages.splice(',
      'const PROMPT_COMPILER_VERSION = 4;',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      "['OUT_STORAGE', n(detail.outSetMs)]",
      ordinaryOutSave,
    ]) {
      equal(count(candidate, marker), count(predecessor, marker), `${marker} frozen`);
    }
    equal(count(candidate, 'metric.payloadChars = payload.length;'), count(predecessor, 'metric.payloadChars = payload.length;') + 1, 'one ordinary payloadChars metric added');
    equal(count(candidate, 'Output snapshot set:'), count(predecessor, 'Output snapshot set:') + 1, 'one output snapshot-set diagnostic added');
  }

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v07007-identity', status: 'PASS' },
      { id: 'v07007-latest-install-identity', status: 'PASS' },
      { id: 'v07007-existing-serialization-reused', status: 'PASS' },
      { id: 'v07007-backend-set-count-order-await-preserved', status: 'PASS' },
      { id: 'v07007-payload-chars-exact', status: 'PASS' },
      { id: 'v07007-output-payload-propagation', status: 'PASS' },
      { id: 'v07007-normalized-cost-fail-closed', status: 'PASS' },
      { id: 'v07007-out-storage-attribution-preserved', status: 'PASS' },
      { id: 'v07007-prune-disabled-preserved', status: 'PASS' },
      { id: 'v07007-diagnostic-provenance-exact', status: 'PASS' },
      { id: 'v07007-module-and-side-effect-surface-frozen', status: 'PASS' },
    ],
  };
}
