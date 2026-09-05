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
  equal(candidate.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.8', 'metadata identity');
  equal(candidate.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.8', 'runtime identity');
  equal(candidate.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.8', 'Host identity');
  equal(count(candidate, '// v0.70.8 Repeat-Send Representation Rewind Guard:'), 1, 'release-note source header identity');
  assert(candidate.includes("version: '0.70.8',\n    name: 'Repeat-Send Representation Rewind Guard',"), 'operator release-card identity');
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

const freshRelation = Object.freeze({
  priorCanonical: 'fp:canonical-visible',
  priorFresh: 'fp:fresh-visible',
  priorHostRaw: 'fp:host-visible',
  priorMatch: 'CANONICAL',
  priorRepresentation: 'OUTPUT_MISMATCH',
  currentMatch: 'FRESH_CHAT',
  deltaCanonical: 2,
  deltaFresh: 0,
  deltaShape: 'FRESH_EXACT_CARRYOVER',
});

function deps({
  relation = freshRelation,
  provenance = { outIndex: 0, locationKey: 'test/location' },
  sendIndex = 1,
  locationKey = 'test/location',
  delegateResult = { changed: true, mode: 'A', revision: 1 },
  onDelegate = null,
} = {}) {
  return {
    coreRules: { fingerprintText: (value) => `fp:${String(value)}` },
    textMessageContent: (message) => String(message?.content || ''),
    representationRegistry: { latest: () => provenance },
    representationRules: { inspectCarryover: () => ({ ...relation }) },
    coreLocationKey: locationKey,
    SIMCORE_LOG_PREFIX: '[v07008-test]',
    sendIndex,
    reconcileSession: async (_index, _content, perfDetail) => {
      if (onDelegate) onDelegate();
      if (perfDetail) perfDetail.path = delegateResult.changed ? 'manual-edit-rebuilt' : 'same-snapshot';
      return { ...delegateResult };
    },
  };
}

function session({ currentOutputIndex = 2, lastPreparedSendIndex = 1, currentFingerprint = 'fp:later-canonical', trustedFingerprint = 'fp:later-canonical' } = {}) {
  return {
    currentOutputIndex,
    lastPreparedSendIndex,
    current: { outputFingerprint: currentFingerprint },
    trustedOutputFingerprint: trustedFingerprint,
  };
}

function chatAt(lastAssistant, content = 'fresh-visible') {
  const messages = [];
  for (let i = 0; i <= lastAssistant; i += 1) messages.push({ role: 'user', content: `u${i}` });
  messages[lastAssistant] = { role: 'assistant', content };
  return { message: messages };
}

async function runOuter(edit, { cs, chat, dep }) {
  const detail = {};
  let delegated = 0;
  const result = await edit.reconcileVisiblePreviousAssistant(
    cs,
    chat,
    detail,
    { ...dep, reconcileSession: async (...args) => {
      delegated += 1;
      return dep.reconcileSession(...args);
    } },
  );
  return { result, detail, delegated };
}

export async function runSuite(ctx) {
  const sourceVersion = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (!['0.70.7', '0.70.8'].includes(sourceVersion)) {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v07008-builder-source-not-active', status: 'PASS' }],
    };
  }

  let candidate = ctx.source;
  let predecessor = null;
  if (sourceVersion === '0.70.7') {
    predecessor = ctx.source;
    const root = process.cwd();
    const builder = path.resolve(root, 'products/simcore/tooling/build-07008-repeat-send-representation-rewind-guard.py');
    assert(fs.existsSync(builder), 'v0.70.8 builder missing');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07008-builder-'));
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
      equal(run.status, 0, `v0.70.8 builder exit: ${run.stderr || run.stdout}`);
      assert(run.stdout.includes('07008_BUILD_PASS'), `v0.70.8 builder PASS marker missing: ${run.stdout}`);

      const latest = fs.readFileSync(latestPath, 'utf8');
      const install = fs.readFileSync(installPath, 'utf8');
      equal(latest, install, 'v0.70.8 latest/install identity');
      candidate = latest;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  assertIdentity(candidate);
  assert(candidate.includes('const commonFreshAliasFacts = !!('), 'common Fresh alias facts missing');
  assert(candidate.includes('const sameSlotAuthority = !!('), 'existing same-slot authority extraction missing');
  assert(candidate.includes('const repeatSendRewindAuthority = !!('), 'repeat-send rewind authority missing');
  assert(candidate.includes('Number.isInteger(sendIndex)'), 'sendIndex exact integer guard missing');
  assert(candidate.includes('Number(cs.lastPreparedSendIndex) === sendIndex'), 'lastPreparedSendIndex guard missing');
  assert(candidate.includes('Number(cs.currentOutputIndex) === sendIndex + 1'), 'currentOutputIndex rewind guard missing');
  assert(candidate.includes('lastAssistant === sendIndex - 1'), 'visible rewind guard missing');
  assert(candidate.includes('Number(priorProvenance?.outIndex) === lastAssistant'), 'provenance outIndex guard missing');
  assert(candidate.includes("(!coreLocationKey || String(priorProvenance?.locationKey || '') === String(coreLocationKey))"), 'provenance location guard missing');
  assert(candidate.includes("repeatSendRewindAuthority ? 'fresh-exact-repeat-send-rewind' : 'fresh-exact-carryover'"), 'bounded diagnostic provenance selection missing');
  assert(candidate.includes('await reconcileManualEdit(cs, chat, editDetail, sendIndex);'), 'outer request sendIndex handoff missing');

  const edit = new BundleLoader(candidate, { stubs: editStubs() }).load('edit-reconcile');

  const ordinary = await runOuter(edit, {
    cs: session({ currentOutputIndex: 0, lastPreparedSendIndex: 1, currentFingerprint: 'fp:canonical-visible', trustedFingerprint: 'fp:canonical-visible' }),
    chat: chatAt(0),
    dep: deps(),
  });
  equal(ordinary.delegated, 0, 'ordinary same-slot Fresh carryover must not delegate');
  equal(ordinary.result.changed, false, 'ordinary same-slot Fresh carryover remains unchanged');
  equal(ordinary.detail.path, 'representation-fast-reconciled', 'ordinary same-slot path preserved');
  equal(ordinary.detail.compatibilitySource, 'fresh-exact-carryover', 'ordinary same-slot provenance preserved');
  equal(ordinary.detail.editOrigin, 'REPRESENTATION_DRIFT_CORRELATED', 'ordinary representation drift attribution preserved');

  const target = await runOuter(edit, {
    cs: session(),
    chat: chatAt(0),
    dep: deps(),
  });
  equal(target.delegated, 0, 'target repeat-send rewind must bypass rebuild delegation');
  equal(target.result.changed, false, 'target repeat-send rewind keeps snapshot unchanged');
  equal(target.result.representationFastReconciled, true, 'target repeat-send rewind marks representation fast reconcile');
  equal(target.detail.path, 'representation-fast-reconciled', 'target repeat-send rewind path');
  equal(target.detail.compatibilitySource, 'fresh-exact-repeat-send-rewind', 'target rewind provenance marker');
  equal(target.detail.editOrigin, 'REPRESENTATION_DRIFT_CORRELATED', 'target edit origin remains representation drift');

  const negatives = [
    {
      id: 'last-prepared-send-index',
      cs: session({ lastPreparedSendIndex: 0 }),
      chat: chatAt(0),
      dep: deps(),
    },
    {
      id: 'current-output-index',
      cs: session({ currentOutputIndex: 1 }),
      chat: chatAt(0),
      dep: deps(),
    },
    {
      id: 'visible-last-assistant',
      cs: session(),
      chat: chatAt(1),
      dep: deps({ provenance: { outIndex: 1, locationKey: 'test/location' } }),
    },
    {
      id: 'provenance-out-index',
      cs: session(),
      chat: chatAt(0),
      dep: deps({ provenance: { outIndex: 9, locationKey: 'test/location' } }),
    },
    {
      id: 'provenance-location',
      cs: session(),
      chat: chatAt(0),
      dep: deps({ provenance: { outIndex: 0, locationKey: 'other/location' } }),
    },
  ];

  for (const negative of negatives) {
    const got = await runOuter(edit, negative);
    equal(got.delegated, 1, `${negative.id} mismatch must fail closed to existing reconcile`);
    equal(got.result.changed, true, `${negative.id} mismatch must not fabricate unchanged fast result`);
    assert(got.detail.compatibilitySource !== 'fresh-exact-repeat-send-rewind', `${negative.id} mismatch must not claim rewind provenance`);
  }

  const genuineEdit = await runOuter(edit, {
    cs: session(),
    chat: chatAt(0, 'third-visible'),
    dep: deps({
      relation: {
        priorCanonical: 'fp:canonical-visible',
        priorFresh: 'fp:fresh-visible',
        priorHostRaw: 'fp:host-visible',
        priorMatch: 'NONE',
        priorRepresentation: 'EXACT',
        currentMatch: 'NONE',
        deltaCanonical: 1,
        deltaFresh: 1,
        deltaShape: 'THIRD_REPRESENTATION',
      },
    }),
  });
  equal(genuineEdit.delegated, 1, 'genuine third representation must delegate');
  equal(genuineEdit.result.changed, true, 'genuine edit control remains changed');
  equal(genuineEdit.detail.editOrigin, 'USER_EDIT_CANDIDATE', 'genuine edit origin preserved');
  assert(genuineEdit.detail.compatibilitySource !== 'fresh-exact-repeat-send-rewind', 'genuine edit cannot claim rewind provenance');

  const cleanReroll = await runOuter(edit, {
    cs: session(),
    chat: chatAt(0, 'canonical-visible'),
    dep: deps({
      relation: {
        priorCanonical: 'fp:canonical-visible',
        priorFresh: 'fp:canonical-visible',
        priorHostRaw: 'fp:canonical-visible',
        priorMatch: 'CANONICAL',
        priorRepresentation: 'EXACT',
        currentMatch: 'CANONICAL',
        deltaCanonical: 0,
        deltaFresh: 0,
        deltaShape: 'EXACT',
      },
      delegateResult: { changed: false, reason: 'same-snapshot' },
    }),
  });
  equal(cleanReroll.delegated, 1, 'prior EXACT control must not take new OUTPUT_MISMATCH rewind exception');
  equal(cleanReroll.result.changed, false, 'clean reroll control remains unchanged through existing reconcile');
  equal(cleanReroll.detail.editOrigin, 'NONE', 'clean reroll edit origin remains NONE');
  assert(cleanReroll.detail.compatibilitySource !== 'fresh-exact-repeat-send-rewind', 'clean reroll cannot claim rewind provenance');

  if (predecessor) {
    equal(JSON.stringify(moduleNames(candidate)), JSON.stringify(moduleNames(predecessor)), 'module inventory/order frozen');
    for (const name of moduleNames(predecessor)) {
      equal(JSON.stringify(requireLines(candidate, name)), JSON.stringify(requireLines(predecessor, name)), `${name} require graph frozen`);
    }
    for (const marker of [
      'JSON.stringify(state)',
      'await this.b.set(',
      'pluginStorage',
      'setChat(',
      'fetch(',
      'XMLHttpRequest',
      'setTimeout(',
      'setInterval(',
      'history.splice(',
      'messages.splice(',
      'const PROMPT_COMPILER_VERSION = 4;',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      "['OUT_STORAGE', n(detail.outSetMs)]",
    ]) {
      equal(count(candidate, marker), count(predecessor, marker), `${marker} frozen`);
    }
    equal(count(candidate, '// v0.70.8 Repeat-Send Representation Rewind Guard:'), 1, 'one v0.70.8 release-note header added');
    equal(count(candidate, 'fresh-exact-repeat-send-rewind'), 1, 'one rewind diagnostic marker added');
  }

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v07008-identity', status: 'PASS' },
      { id: 'v07008-source-header-identity', status: 'PASS' },
      { id: 'v07008-existing-same-slot-authority-preserved', status: 'PASS' },
      { id: 'v07008-repeat-send-rewind-direct-owner-positive', status: 'PASS' },
      { id: 'v07008-repeat-send-rewind-independent-negatives', status: 'PASS' },
      { id: 'v07008-genuine-edit-preserved', status: 'PASS' },
      { id: 'v07008-clean-reroll-prior-exact-preserved', status: 'PASS' },
      { id: 'v07008-send-index-explicitly-forwarded', status: 'PASS' },
      { id: 'v07008-side-effect-and-schema-surface-frozen', status: 'PASS' },
      { id: 'v07008-r2-11-census-edit-not-required', status: 'PASS' },
    ],
  };
}
