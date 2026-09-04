import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

function moduleText(source, name) {
  const token = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(token);
  assert(start >= 0, `${name} module missing`);
  const next = source.indexOf('\nSimCore.define("', start + token.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

function moduleNames(source) {
  return [...source.matchAll(/SimCore\.define\("([^"]+)"\s*,\s*function/g)].map((m) => m[1]);
}

function requireLines(source, name) {
  return [...moduleText(source, name).matchAll(/^const [^\n=]+ = require\('[^']+'\);$/gm)].map((m) => m[0]);
}

function count(source, marker) {
  return source.split(marker).length - 1;
}

function manualStubs(commitMetric) {
  return {
    './kernel': {
      STATE_VERSION: 5,
      fingerprintText: (value) => `fp:${String(value)}`,
      stripControlTags: (value) => String(value),
    },
    './state-reconcile': {
      reconcileState: (value) => ({ ...(value || {}) }),
      initialState: () => ({}),
    },
    './time': {
      CLOCK_REPAIR_VERSION: 1,
      applyWorldYear: () => false,
      timestampYear: () => null,
      syncNarrativeTimestamp: () => false,
    },
    './output-compat': {
      prepareOutput: (content) => ({
        content: String(content),
        envelope: { resolved: false, repaired: false, issues: [], diagnostics: [] },
      }),
    },
    './bootstrap-migration': { repairLegacyClockState: async () => false },
    './output-finalize': {
      finalizePreparedOutput: (base, prepared) => ({
        state: { ...(base || {}), pending: null, lastMode: 'A' },
        content: String(prepared?.content || ''),
        mode: 'A',
      }),
    },
    __commitMetric: commitMetric,
  };
}

function manualSession(stubs) {
  const savedOut = {
    stateVersion: 5,
    clockRepairVersion: 1,
    outputFingerprint: 'fp:old-canonical',
    hostOutputFingerprint: 'fp:old-host',
    manualEditRevision: 2,
    lastMode: 'A',
  };
  const sendState = { pending: { active: true }, lastMode: 'A' };
  let saveCalls = 0;
  return {
    session: {
      current: {},
      currentOutputIndex: 2,
      trustedOutputFingerprint: null,
      trustedHostOutputFingerprint: null,
      loadedFromLegacySnapshot: false,
      store: {
        load: async (kind) => kind === 'out' ? { ...savedOut } : (kind === 'send' ? { ...sendState } : null),
        save: async (_kind, _index, _state, opts = {}) => {
          saveCalls += 1;
          if (opts.metric) Object.assign(opts.metric, stubs.__commitMetric || {});
        },
      },
      seedBroadcastAirtimeFromVisible: () => false,
      seedNarrativeTimestampFromVisible: () => false,
    },
    saveCalls: () => saveCalls,
  };
}

async function runManualCase(source, metric) {
  const stubs = manualStubs(metric);
  const edit = new BundleLoader(source, { stubs }).load('edit-reconcile');
  const { session, saveCalls } = manualSession(stubs);
  const detail = { editClassifyMs: 0.25 };
  const result = await edit.reconcileSessionEditedOutput(session, 2, 'edited-visible-body', detail);
  return { result, detail, saveCalls: saveCalls() };
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.70.4') {
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v07005-builder-predecessor-source-not-active', status: 'PASS' }] };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-07005-manual-edit-commit-boundary-attribution.py');
  assert(fs.existsSync(builder), 'v0.70.5 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07005-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.70.5 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('07005_BUILD_PASS'), `v0.70.5 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.70.5 latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.5', 'metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.5', 'runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.5', 'Host identity');
    assert(latest.includes("version: '0.70.5',\n    name: 'Manual Edit Commit Boundary Attribution',"), 'operator release card identity');

    equal(JSON.stringify(moduleNames(latest)), JSON.stringify(moduleNames(ctx.source)), 'module inventory/order frozen');
    equal(JSON.stringify(requireLines(latest, 'edit-reconcile')), JSON.stringify(requireLines(ctx.source, 'edit-reconcile')), 'edit-reconcile require graph frozen');
    equal(moduleText(latest, 'store'), moduleText(ctx.source, 'store'), 'Store module byte-preserved');

    for (const marker of [
      'const PROMPT_COMPILER_VERSION = 4;',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      'USER_EDIT_CANDIDATE',
      'MANUAL_EDIT_REBUILT',
      'REPRESENTATION_FAST_RECONCILED',
    ]) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} frozen`);
    }

    for (const marker of ['setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(', 'XMLHttpRequest', 'history.splice(', 'messages.splice(']) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} side-effect surface frozen`);
    }

    equal(count(latest, 'Manual edit commit: serialize'), 1, 'manual commit diagnostic line singular');
    assert(latest.includes("requestBreakdown?.editPath === 'manual-edit-rebuilt' && requestBreakdown.editRebuildConfidence === 'BOUNDED'"), 'manual commit diagnostic branch gate');
    assert(latest.includes('editRebuildCommitSerializeMs: editNumber(manualEdit?.commitSerializeMs)'), 'serialize projection present');
    assert(latest.includes('editRebuildCommitSetMs: editNumber(manualEdit?.commitSetMs)'), 'set projection present');
    assert(latest.includes('editRebuildCommitPruneMs: editNumber(manualEdit?.commitPruneMs)'), 'prune projection present');

    const measured = await runManualCase(latest, { serializeMs: 1.25, setMs: 2.5, pruneMs: 3.75 });
    equal(measured.result.changed, true, 'genuine edit remains changed');
    equal(measured.detail.path, 'manual-edit-rebuilt', 'genuine edit path remains manual-edit-rebuilt');
    equal(measured.saveCalls, 1, 'genuine edit snapshot save remains exactly once');
    assert(measured.detail.manualEditAttribution, 'manual edit attribution present');
    equal(measured.detail.manualEditAttribution.commitSerializeMs, 1.25, 'serialize metric retained');
    equal(measured.detail.manualEditAttribution.commitSetMs, 2.5, 'set metric retained');
    equal(measured.detail.manualEditAttribution.commitPruneMs, 3.75, 'prune metric retained');
    equal(measured.detail.manualEditAttribution.commitMs, 7.5, 'commit total closes exactly');
    equal(measured.detail.manualEditAttribution.commitConfidence, 'EXACT', 'complete existing Store metrics are exact component attribution');
    equal(measured.detail.manualEditAttribution.confidence, 'BOUNDED', 'overall rebuild attribution remains bounded');

    const zero = await runManualCase(latest, { serializeMs: 0, setMs: 0, pruneMs: 0 });
    equal(zero.detail.manualEditAttribution.commitSerializeMs, 0, 'known serialize zero remains numeric zero');
    equal(zero.detail.manualEditAttribution.commitSetMs, 0, 'known set zero remains numeric zero');
    equal(zero.detail.manualEditAttribution.commitPruneMs, 0, 'known prune zero remains numeric zero');
    equal(zero.detail.manualEditAttribution.commitMs, 0, 'known total zero remains numeric zero');
    equal(zero.detail.manualEditAttribution.commitConfidence, 'EXACT', 'known zeros remain exact');

    const unknown = await runManualCase(latest, {});
    equal(unknown.result.changed, true, 'unknown component metrics cannot alter edit correctness');
    equal(unknown.detail.manualEditAttribution.commitSerializeMs, null, 'unknown serialize remains n/a metadata');
    equal(unknown.detail.manualEditAttribution.commitSetMs, null, 'unknown set remains n/a metadata');
    equal(unknown.detail.manualEditAttribution.commitPruneMs, null, 'unknown prune remains n/a metadata');
    equal(unknown.detail.manualEditAttribution.commitMs, null, 'unknown total remains n/a metadata');
    equal(unknown.detail.manualEditAttribution.commitConfidence, 'BOUNDED', 'unknown component attribution remains bounded');

    const fastStubs = manualStubs({ serializeMs: 1, setMs: 2, pruneMs: 3 });
    const fastEdit = new BundleLoader(latest, { stubs: fastStubs }).load('edit-reconcile');
    const fastDetail = {};
    const fastSession = {
      current: { outputFingerprint: 'fp:same-visible' },
      trustedOutputFingerprint: 'fp:same-visible',
      trustedHostOutputFingerprint: null,
      seedBroadcastAirtimeFromVisible: () => false,
      seedNarrativeTimestampFromVisible: () => false,
      store: { load: async () => { throw new Error('same-fast must not read snapshots'); } },
    };
    const fastResult = await fastEdit.reconcileSessionEditedOutput(fastSession, 2, 'same-visible', fastDetail);
    equal(fastResult.changed, false, 'ordinary exact carryover unchanged');
    equal(fastDetail.path, 'same-fast', 'ordinary exact carryover remains same-fast');
    equal(fastDetail.manualEditAttribution, null, 'same-fast has no manual component attribution');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v07005-latest-install-identity', status: 'PASS' },
        { id: 'v07005-store-module-byte-preserved', status: 'PASS' },
        { id: 'v07005-existing-store-metrics-projected', status: 'PASS' },
        { id: 'v07005-complete-components-close-exactly', status: 'PASS' },
        { id: 'v07005-unknown-components-remain-na', status: 'PASS' },
        { id: 'v07005-known-zero-not-fabricated-unknown', status: 'PASS' },
        { id: 'v07005-genuine-edit-save-cardinality-frozen', status: 'PASS' },
        { id: 'v07005-same-fast-branch-only', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
