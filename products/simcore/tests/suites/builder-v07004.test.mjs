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

function manualStubs({ commitMetric = { serializeMs: 0, setMs: 0, pruneMs: 0 } } = {}) {
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
    './bootstrap-migration': {
      repairLegacyClockState: async () => false,
    },
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
          if (opts.metric) Object.assign(opts.metric, stubs.__commitMetric);
        },
      },
      seedBroadcastAirtimeFromVisible: () => false,
      seedNarrativeTimestampFromVisible: () => false,
    },
    saveCalls: () => saveCalls,
  };
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.70.3') {
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v07004-builder-predecessor-source-not-active', status: 'PASS' }] };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-07004-manual-edit-rebuild-attribution.py');
  assert(fs.existsSync(builder), 'v0.70.4 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07004-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.70.4 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('07004_BUILD_PASS'), `v0.70.4 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.70.4 latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.4', 'metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.4', 'runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.4', 'Host identity');
    assert(latest.includes("version: '0.70.4',\n    name: 'Manual Edit Rebuild Attribution',"), 'operator release card identity');

    equal(JSON.stringify(moduleNames(latest)), JSON.stringify(moduleNames(ctx.source)), 'module inventory/order frozen');
    equal(JSON.stringify(requireLines(latest, 'edit-reconcile')), JSON.stringify(requireLines(ctx.source, 'edit-reconcile')), 'edit-reconcile require graph frozen');

    for (const name of [
      'prompt', 'community', 'runtime-session', 'store', 'lifecycle', 'representation',
      'output-finalize', 'runtime-mirror', 'runtime-cache', 'runtime-topology', 'session',
    ]) {
      equal(moduleText(latest, name), moduleText(ctx.source, name), `${name} module byte-preserved`);
    }

    for (const marker of [
      'const PROMPT_COMPILER_VERSION = 4;',
      'current_input_task=primary_generation_authority',
      'prior_assistant_output=continuity_reference_context_not_current_task_authority',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      'USER_EDIT_CANDIDATE',
      'MANUAL_EDIT_REBUILT',
      'REPRESENTATION_FAST_RECONCILED',
    ]) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} frozen`);
    }

    for (const marker of ['await ', 'setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(', 'XMLHttpRequest', 'history.splice(', 'messages.splice(']) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} side-effect surface frozen`);
    }

    assert(latest.includes('Manual edit breakdown: classify'), 'manual edit diagnostic line missing');
    equal(count(latest, 'Manual edit breakdown: classify'), 1, 'manual edit diagnostic line is singular');
    assert(latest.includes("requestBreakdown?.editPath === 'manual-edit-rebuilt' && requestBreakdown.editRebuildConfidence === 'BOUNDED'"), 'manual edit diagnostic must be branch-gated');
    assert(latest.includes('const editDetail = perf ? { editReconcileStart: t } : null;'), 'outer existing edit clock must seed attribution');

    const stubs = manualStubs();
    const loader = new BundleLoader(latest, { stubs });
    const edit = loader.load('edit-reconcile');
    const { session, saveCalls } = manualSession(stubs);
    const detail = { editClassifyMs: 0.25 };
    const result = await edit.reconcileSessionEditedOutput(session, 2, 'edited-visible-body', detail);
    equal(result.changed, true, 'genuine edit remains changed');
    equal(detail.path, 'manual-edit-rebuilt', 'genuine edit path remains manual-edit-rebuilt');
    equal(saveCalls(), 1, 'genuine edit snapshot save remains exactly once');
    assert(detail.manualEditAttribution, 'manual edit attribution must be present on genuine rebuild');
    equal(detail.manualEditAttribution.confidence, 'BOUNDED', 'manual rebuild attribution confidence');
    equal(detail.manualEditAttribution.commitMs, 0, 'zero-cost stub commit remains a real measured numeric bucket');
    assert(detail.manualEditAttribution.rebuildTotalMs >= 0, 'manual rebuild total nonnegative');
    assert(detail.manualEditAttribution.prepareMs >= 0, 'manual rebuild prepare nonnegative');
    assert(detail.manualEditAttribution.recoveryMs >= 0, 'manual rebuild recovery nonnegative');
    assert(detail.manualEditAttribution.finalizeMs >= 0, 'manual rebuild finalize nonnegative');
    assert(detail.manualEditAttribution.otherMs >= 0, 'manual rebuild residual nonnegative');
    const named = detail.manualEditAttribution.prepareMs + detail.manualEditAttribution.recoveryMs
      + detail.manualEditAttribution.finalizeMs + detail.manualEditAttribution.commitMs;
    assert(named <= detail.manualEditAttribution.rebuildTotalMs + 0.5, 'manual rebuild named accounting bounded by total');

    const fastStubs = manualStubs();
    const fastLoader = new BundleLoader(latest, { stubs: fastStubs });
    const fastEdit = fastLoader.load('edit-reconcile');
    const fastDetail = {};
    const fastSession = {
      current: { outputFingerprint: 'fp:same-visible' },
      trustedOutputFingerprint: 'fp:same-visible',
      trustedHostOutputFingerprint: null,
      seedBroadcastAirtimeFromVisible: () => false,
      seedNarrativeTimestampFromVisible: () => false,
      store: { load: async () => { throw new Error('fast path must not read snapshots'); } },
    };
    const fastResult = await fastEdit.reconcileSessionEditedOutput(fastSession, 2, 'same-visible', fastDetail);
    equal(fastResult.changed, false, 'ordinary carryover remains unchanged');
    equal(fastDetail.path, 'same-fast', 'ordinary carryover remains same-fast');
    equal(fastDetail.manualEditAttribution, null, 'ordinary carryover has no manual breakdown attribution');

    const outerDetail = { editReconcileStart: Date.now() };
    let delegated = 0;
    await edit.reconcileVisiblePreviousAssistant(
      { currentOutputIndex: 0, current: {}, trustedOutputFingerprint: null },
      { message: [{ role: 'assistant', content: 'edited-visible-body' }] },
      outerDetail,
      {
        coreRules: { fingerprintText: (value) => `fp:${String(value)}` },
        textMessageContent: (message) => String(message?.content || ''),
        representationRegistry: { latest: () => null },
        representationRules: {
          inspectCarryover: () => ({
            priorCanonical: null, priorFresh: null, priorHostRaw: null, priorMatch: null,
            priorRepresentation: 'UNAVAILABLE', currentMatch: 'NONE', deltaCanonical: null,
            deltaFresh: null, deltaShape: 'UNCLASSIFIED',
          }),
        },
        coreLocationKey: 'test/location',
        SIMCORE_LOG_PREFIX: '[test]',
        reconcileSession: async (_index, _content, perfDetail) => {
          delegated += 1;
          perfDetail.path = 'manual-edit-rebuilt';
          return { changed: true, mode: 'A', revision: 3 };
        },
      },
    );
    equal(delegated, 1, 'genuine outer edit delegates exactly once');
    assert(Number.isFinite(Number(outerDetail.editClassifyMs)) && Number(outerDetail.editClassifyMs) >= 0, 'outer classify bucket measured on delegated path');
    assert(Number.isFinite(Number(outerDetail.editRebuildStart)), 'outer rebuild start handed to edit owner');

    const badStubs = manualStubs({ commitMetric: { serializeMs: 1000, setMs: 1000, pruneMs: 1000 } });
    const badEdit = new BundleLoader(latest, { stubs: badStubs }).load('edit-reconcile');
    const badSession = manualSession(badStubs).session;
    const badDetail = {};
    const badResult = await badEdit.reconcileSessionEditedOutput(badSession, 2, 'edited-visible-body', badDetail);
    equal(badResult.changed, true, 'invalid attribution cannot alter edit correctness');
    equal(badDetail.path, 'manual-edit-rebuilt', 'invalid attribution cannot alter manual path');
    equal(badDetail.manualEditAttribution, null, 'impossible accounting fails closed instead of inventing ownership');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v07004-builder-executes-from-exact-v07003-source', status: 'PASS' },
        { id: 'v07004-runtime-identities-converged', status: 'PASS' },
        { id: 'v07004-latest-install-identical', status: 'PASS' },
        { id: 'v07004-module-and-require-graph-frozen', status: 'PASS' },
        { id: 'v07004-side-effect-surfaces-frozen', status: 'PASS' },
        { id: 'v07004-genuine-edit-path-executable-with-bounded-accounting', status: 'PASS' },
        { id: 'v07004-fast-path-has-no-manual-attribution', status: 'PASS' },
        { id: 'v07004-classification-boundary-measured-only-on-delegated-path', status: 'PASS' },
        { id: 'v07004-impossible-accounting-fails-closed', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
