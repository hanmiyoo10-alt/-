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

function editStubs() {
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
  };
}

function manualSession({ savedOut = true, metric = { serializeMs: 1.25, setMs: 2.5, pruneMs: 3.75 } } = {}) {
  const outState = {
    stateVersion: 5,
    clockRepairVersion: 1,
    outputFingerprint: 'fp:old-canonical',
    hostOutputFingerprint: 'fp:old-host',
    manualEditRevision: 2,
    lastMode: 'A',
  };
  const sendState = { pending: { active: true }, lastMode: 'A' };
  const map = new Map();
  if (savedOut) map.set('out:2', { ...outState });
  let saveCalls = 0;
  let backendSetCalls = 0;
  let pruneCalls = 0;
  let lastSave = null;
  return {
    session: {
      current: {},
      currentOutputIndex: 2,
      trustedOutputFingerprint: null,
      trustedHostOutputFingerprint: null,
      loadedFromLegacySnapshot: false,
      store: {
        load: async (kind, index) => {
          if (kind === 'out') return map.has(`${kind}:${index}`) ? { ...map.get(`${kind}:${index}`) } : null;
          if (kind === 'send') return { ...sendState };
          return null;
        },
        save: async (kind, index, state, opts = {}) => {
          saveCalls += 1;
          backendSetCalls += 1;
          lastSave = { kind, index, opts: { ...opts } };
          map.set(`${kind}:${index}`, { ...(state || {}) });

          const serializeMs = Number(metric.serializeMs);
          const setMs = Number(metric.setMs);
          const pruneMs = Number(metric.pruneMs);
          const executedSyntheticMs =
            (Number.isFinite(serializeMs) && serializeMs >= 0 ? serializeMs : 0)
            + (Number.isFinite(setMs) && setMs >= 0 ? setMs : 0)
            + (opts.prune !== false && Number.isFinite(pruneMs) && pruneMs >= 0 ? pruneMs : 0);
          if (executedSyntheticMs > 0) {
            const until = performance.now() + executedSyntheticMs + 1;
            while (performance.now() < until) {
              // Keep synthetic wall time coherent with the synthetic Store metric envelope.
            }
          }

          if (opts.metric) {
            opts.metric.serializeMs = serializeMs;
            opts.metric.setMs = setMs;
          }
          if (opts.prune !== false) {
            pruneCalls += 1;
            if (opts.metric) opts.metric.pruneMs = pruneMs;
          }
        },
      },
      seedBroadcastAirtimeFromVisible: () => false,
      seedNarrativeTimestampFromVisible: () => false,
    },
    keyCount: () => map.size,
    saveCalls: () => saveCalls,
    backendSetCalls: () => backendSetCalls,
    pruneCalls: () => pruneCalls,
    lastSave: () => lastSave,
  };
}

async function runManualCase(source, eligibility = 'UNPROVEN', options = {}) {
  const edit = new BundleLoader(source, { stubs: editStubs() }).load('edit-reconcile');
  const fixture = manualSession(options);
  const beforeKeys = fixture.keyCount();
  const detail = { editClassifyMs: 0.25 };
  const result = await edit.reconcileSessionEditedOutput(
    fixture.session,
    2,
    'edited-visible-body',
    detail,
    { manualEditPruneEligibility: eligibility },
  );
  return { result, detail, beforeKeys, afterKeys: fixture.keyCount(), fixture };
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.70.5') {
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v07006-builder-predecessor-source-not-active', status: 'PASS' }] };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-07006-manual-edit-redundant-prune-elision.py');
  assert(fs.existsSync(builder), 'v0.70.6 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07006-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.70.6 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('07006_BUILD_PASS'), `v0.70.6 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.70.6 latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.6', 'metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.6', 'runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.6', 'Host identity');
    assert(latest.includes("version: '0.70.6',\n    name: 'Manual Edit Redundant Prune Elision',"), 'operator release card identity');

    equal(JSON.stringify(moduleNames(latest)), JSON.stringify(moduleNames(ctx.source)), 'module inventory/order frozen');
    equal(JSON.stringify(requireLines(latest, 'edit-reconcile')), JSON.stringify(requireLines(ctx.source, 'edit-reconcile')), 'edit-reconcile require graph frozen');
    equal(moduleText(latest, 'store'), moduleText(ctx.source, 'store'), 'Store module byte-preserved');
    assert(latest.includes("_k(phase, index) { return `${this.p}:${phase}:${index}`; }"), 'Store deterministic phase+index key remains');
    assert(latest.includes("if (opts.prune !== false) {"), 'Store prune:false contract remains');

    for (const marker of [
      'const PROMPT_COMPILER_VERSION = 4;',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      'MANUAL_EDIT_REBUILT',
      'REPRESENTATION_FAST_RECONCILED',
    ]) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} frozen`);
    }

    for (const marker of ['setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(', 'XMLHttpRequest', 'history.splice(', 'messages.splice(']) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} side-effect surface frozen`);
    }

    assert(latest.includes("priorRepresentation === 'EXACT' ? 'USER_EDIT_CANDIDATE_WHEN_CHANGED' : 'UNPROVEN'"), 'existing prior EXACT fact transported before rebuild');
    assert(latest.includes("reconcileOptions?.manualEditPruneEligibility === 'USER_EDIT_CANDIDATE_WHEN_CHANGED'"), 'final manual save gates elision on bounded eligibility');
    equal(count(latest, 'Manual edit retention:'), 1, 'manual retention diagnostic line singular');

    const eligible = await runManualCase(latest, 'USER_EDIT_CANDIDATE_WHEN_CHANGED');
    equal(eligible.result.changed, true, 'eligible genuine edit remains changed');
    equal(eligible.detail.path, 'manual-edit-rebuilt', 'eligible path remains manual-edit-rebuilt');
    equal(eligible.fixture.saveCalls(), 1, 'eligible snapshot save exactly once');
    equal(eligible.fixture.backendSetCalls(), 1, 'eligible backend.set equivalent exactly once');
    equal(eligible.fixture.pruneCalls(), 0, 'eligible inline prune elided');
    equal(eligible.fixture.lastSave()?.kind, 'out', 'eligible save phase remains out');
    equal(eligible.fixture.lastSave()?.index, 2, 'eligible save index remains exact target');
    equal(eligible.fixture.lastSave()?.opts?.prune, false, 'eligible save opts.prune=false');
    equal(eligible.afterKeys - eligible.beforeKeys, 0, 'eligible same-key overwrite has zero key-count delta');
    equal(eligible.detail.manualEditAttribution?.commitPruneMs, 0, 'eligible skipped prune contributes known zero');
    equal(eligible.detail.manualEditAttribution?.inlinePruneSkipped, true, 'eligible attribution records explicit skip');
    equal(eligible.detail.manualEditAttribution?.retentionDisposition, 'INLINE_PRUNE_SKIPPED', 'eligible retention disposition explicit');
    equal(eligible.detail.manualEditAttribution?.retentionReason, 'SAME_OUT_KEY_OVERWRITE', 'eligible retention reason explicit');
    equal(eligible.detail.manualEditAttribution?.commitMs, 3.75, 'eligible total is serialize+set with prune zero');
    equal(eligible.detail.manualEditAttribution?.commitConfidence, 'EXACT', 'eligible explicit skip preserves exact accounting');

    const fallback = await runManualCase(latest, 'UNPROVEN');
    equal(fallback.result.changed, true, 'fallback manual edit remains changed');
    equal(fallback.fixture.saveCalls(), 1, 'fallback save remains exactly once');
    equal(fallback.fixture.backendSetCalls(), 1, 'fallback backend.set remains exactly once');
    equal(fallback.fixture.pruneCalls(), 1, 'fallback inline prune preserved');
    assert(fallback.fixture.lastSave()?.opts?.prune !== false, 'fallback does not fabricate prune:false');
    equal(fallback.detail.manualEditAttribution?.commitPruneMs, 3.75, 'fallback prune remains measured numeric value');
    equal(fallback.detail.manualEditAttribution?.inlinePruneSkipped, false, 'fallback skip flag false');
    equal(fallback.detail.manualEditAttribution?.retentionDisposition, null, 'fallback has no skip disposition');
    equal(fallback.detail.manualEditAttribution?.commitMs, 7.5, 'fallback total still includes executed prune');

    const unknown = await runManualCase(latest, 'UNKNOWN');
    equal(unknown.fixture.pruneCalls(), 1, 'UNKNOWN edit origin remains fail-closed and prunes');
    assert(unknown.fixture.lastSave()?.opts?.prune !== false, 'UNKNOWN cannot become eligible');

    const missing = await runManualCase(latest, 'USER_EDIT_CANDIDATE_WHEN_CHANGED', { savedOut: false });
    equal(missing.result.changed, false, 'missing prior out remains no-snapshot');
    equal(missing.fixture.saveCalls(), 0, 'missing prior out cannot reach optimized save');
    equal(missing.fixture.pruneCalls(), 0, 'missing prior out adds no housekeeping call');

    const fastEdit = new BundleLoader(latest, { stubs: editStubs() }).load('edit-reconcile');
    const fastDetail = {};
    const fastSession = {
      current: { outputFingerprint: 'fp:same-visible' },
      trustedOutputFingerprint: 'fp:same-visible',
      trustedHostOutputFingerprint: null,
      seedBroadcastAirtimeFromVisible: () => false,
      seedNarrativeTimestampFromVisible: () => false,
      store: { load: async () => { throw new Error('same-fast must not read snapshots'); } },
    };
    const fastResult = await fastEdit.reconcileSessionEditedOutput(fastSession, 2, 'same-visible', fastDetail, { manualEditPruneEligibility: 'USER_EDIT_CANDIDATE_WHEN_CHANGED' });
    equal(fastResult.changed, false, 'ordinary exact carryover unchanged');
    equal(fastDetail.path, 'same-fast', 'ordinary exact carryover remains same-fast');
    equal(fastDetail.manualEditAttribution, null, 'same-fast has no manual retention attribution');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v07006-latest-install-identity', status: 'PASS' },
        { id: 'v07006-store-module-byte-preserved', status: 'PASS' },
        { id: 'v07006-existing-user-edit-fact-transported', status: 'PASS' },
        { id: 'v07006-eligible-same-key-prune-elided', status: 'PASS' },
        { id: 'v07006-eligible-backend-set-preserved', status: 'PASS' },
        { id: 'v07006-same-key-cardinality-zero', status: 'PASS' },
        { id: 'v07006-explicit-skip-accounting-exact', status: 'PASS' },
        { id: 'v07006-fallback-prune-preserved', status: 'PASS' },
        { id: 'v07006-unknown-fails-closed', status: 'PASS' },
        { id: 'v07006-missing-saved-out-ineligible', status: 'PASS' },
        { id: 'v07006-same-fast-unchanged', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
