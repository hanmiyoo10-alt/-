import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const sourcePath = args[0] || 'plugins/simcore/latest.js';
const mode = args[1] || '--print';
const targetPath = args[2] || null;
const text = fs.readFileSync(sourcePath, 'utf8');

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function moduleSlice(name) {
  const marker = `SimCore.define(\"${name}\"`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`module start missing: ${name}`);
  const next = text.indexOf('\nSimCore.define(\"', start + marker.length);
  if (next < 0) throw new Error(`module end missing: ${name}`);
  return text.slice(start, next);
}

function loadModule(name, deps = {}) {
  let out = null;
  const SimCore = {
    define(n, factory) {
      if (n !== name) return;
      const module = { exports: {} };
      factory((id) => {
        if (!Object.prototype.hasOwnProperty.call(deps, id)) {
          throw new Error(`unbound dependency ${id} for module ${name}`);
        }
        return deps[id];
      }, module, module.exports);
      out = module.exports;
    },
  };
  new Function('SimCore', moduleSlice(name))(SimCore);
  if (!out) throw new Error(`requested module not loaded: ${name}`);
  return out;
}

const kernel = loadModule('kernel');
const community = loadModule('community');
const recurrence = loadModule('recurrence');
const lineage = loadModule('lineage');
const handoff = loadModule('handoff');
const stateReconcile = loadModule('state-reconcile', {
  './kernel': kernel,
  './community': community,
  './recurrence': recurrence,
  './lineage': lineage,
  './handoff': handoff,
});
const time = loadModule('time');
const lifecycle = loadModule('lifecycle', {
  './kernel': kernel,
  './state-reconcile': stateReconcile,
  './time': time,
  './recurrence': recurrence,
  './lineage': lineage,
  './handoff': handoff,
});
const prompt = loadModule('prompt', {
  './kernel': kernel,
  './state-reconcile': stateReconcile,
  './lifecycle': lifecycle,
  './time': time,
  './recurrence': recurrence,
});

function pending(modeName = 'A', extra = {}) {
  return {
    active: true,
    mode: modeName,
    secondaryConfigured: false,
    secondaryActive: false,
    ...extra,
  };
}

function activeState(modeName = 'A', statePatch = {}, pendingPatch = {}) {
  const state = stateReconcile.initialState();
  Object.assign(state, statePatch);
  state.pending = pending(modeName, pendingPatch);
  return state;
}

function withPlatformMax(order) {
  const state = activeState('C');
  state.community.platformMax = {};
  for (const [key, value] of order) state.community.platformMax[key] = value;
  return state;
}

function compile(state) {
  const result = prompt.compileRuntimePromptParts(state);
  const promptText = String(result.text || '');
  const stable = String(result.identityTiers?.stable || '');
  const slow = String(result.identityTiers?.slow || '');
  const volatile = String(result.identityTiers?.volatile || '');
  return {
    text: promptText,
    byteLength: Buffer.byteLength(promptText, 'utf8'),
    lineCount: promptText ? promptText.split('\n').length : 0,
    sha256: sha256(promptText),
    stable: {
      text: stable,
      byteLength: Buffer.byteLength(stable, 'utf8'),
      lineCount: stable ? stable.split('\n').length : 0,
      sha256: sha256(stable),
    },
    slow: {
      text: slow,
      byteLength: Buffer.byteLength(slow, 'utf8'),
      lineCount: slow ? slow.split('\n').length : 0,
      sha256: sha256(slow),
    },
    volatile: {
      text: volatile,
      byteLength: Buffer.byteLength(volatile, 'utf8'),
      lineCount: volatile ? volatile.split('\n').length : 0,
      sha256: sha256(volatile),
    },
    endAuthority: result.endAuthority,
  };
}

const T1 = 'T1';
const T3 = 'T3';
const T5 = 'T5';
const NONE = 'NONE';

const fixtureStates = [
  {
    id: 'F0_INACTIVE_PENDING',
    family: 'F0 inactive pending',
    expectedChangeClass: NONE,
    state: stateReconcile.initialState(),
  },
  {
    id: 'F1_MODE_A_ORDINARY',
    family: 'F1 ordinary Mode A',
    expectedChangeClass: T5,
    state: activeState('A'),
  },
  {
    id: 'F2_MODE_B_START',
    family: 'F2 Mode B START',
    expectedChangeClass: `${T3}+${T5}`,
    state: activeState('B_START', { episodeNo: 1, broadcastLocked: false }, {
      broadcastAirtimePrevious: null,
      broadcastAirtimeStart: null,
    }),
  },
  {
    id: 'F3_MODE_B_CONTINUE',
    family: 'F3 Mode B CONTINUE',
    expectedChangeClass: T5,
    state: activeState('B_CONTINUE', { episodeNo: 1, broadcastLocked: true }, {
      broadcastAirtimePrevious: '⏱️[2031-03-28 (Fri) 09:55 PM]',
      broadcastAirtimeStart: '⏱️[2031-03-28 (Fri) 09:45 PM]',
    }),
  },
  {
    id: 'F4_MODE_B_END',
    family: 'F4 Mode B END',
    expectedChangeClass: T5,
    state: activeState('B_END', { episodeNo: 1, broadcastLocked: true }, {
      broadcastAirtimePrevious: '⏱️[2031-03-28 (Fri) 10:15 PM]',
      broadcastAirtimeStart: '⏱️[2031-03-28 (Fri) 09:45 PM]',
    }),
  },
  {
    id: 'F5_MODE_C_COMMUNITY',
    family: 'F5 Mode C / Community',
    expectedChangeClass: T5,
    state: activeState('C'),
  },
  {
    id: 'F6_SECONDARY_CONFIGURED_INACTIVE',
    family: 'F6 secondary configured inactive',
    expectedChangeClass: T3,
    state: activeState('A', {}, { secondaryConfigured: true, secondaryActive: false }),
  },
  {
    id: 'F7_SECONDARY_ACTIVE',
    family: 'F7 secondary active',
    expectedChangeClass: T5,
    state: activeState('A', {}, { secondaryConfigured: true, secondaryActive: true }),
  },
  {
    id: 'F8A_AGE_OFFSET_INACTIVE',
    family: 'F8 age offset inactive',
    expectedChangeClass: T3,
    state: activeState('A', { koreanAgeOffset: 0 }),
  },
  {
    id: 'F8B_AGE_OFFSET_ACTIVE',
    family: 'F8 age offset active',
    expectedChangeClass: T3,
    state: activeState('A', { koreanAgeOffset: 2 }),
  },
  {
    id: 'F9_NARRATIVE_TIMELINE_ANCHOR',
    family: 'F9 narrative timeline anchor / world-year transition',
    expectedChangeClass: `${T3}+${T5}`,
    state: activeState('A', { worldYear: 2031 }, {
      narrativeCurrentTimeFloor: '⏱️[2031-03-28 (Fri) 10:50 PM]',
      narrativeTimestampPrevious: '⏱️[2031-03-28 (Fri) 10:15 PM]',
      narrativeProgressionActive: true,
      narrativeProgressionReason: 'fixture-forward',
      narrativeCalendarTarget: { eligible: false },
    }),
  },
  {
    id: 'F10_RECURRENCE_REPEATED',
    family: 'F10 recurrence repeated',
    expectedChangeClass: T5,
    state: activeState('A', {}, {
      templateRecurrenceRepeated: true,
      templateRecurrenceModeFamily: 'A',
    }),
  },
  {
    id: 'F11_SHORT_COMMUNITY_LINEAGE_HANDOFF',
    family: 'F11 short-Community lineage handoff',
    expectedChangeClass: T5,
    state: activeState('C', {}, {
      communitySourceHandoffEligible: true,
      communitySourceHandoffNewSource: true,
      communitySourceHandoffRootMode: 'A',
      communitySourceHandoffRootIndex: 11,
    }),
  },
  {
    id: 'F12A_REACTION_MAX_ORDER_ABC',
    family: 'F12 Community reaction_max construction order A',
    expectedChangeClass: T5,
    state: withPlatformMax([
      ['X(EN)', 101],
      ['유튜브', 303],
      ['더쿠', 202],
    ]),
  },
  {
    id: 'F12B_REACTION_MAX_ORDER_CBA',
    family: 'F12 Community reaction_max construction order B',
    expectedChangeClass: T5,
    state: withPlatformMax([
      ['더쿠', 202],
      ['유튜브', 303],
      ['X(EN)', 101],
    ]),
  },
];

const ordinaryReloadState = JSON.parse(JSON.stringify(activeState('A')));
fixtureStates.push({
  id: 'F13_RELOAD_EQUIVALENT_STATE',
  family: 'F13 reload-equivalent semantic state',
  expectedChangeClass: NONE,
  state: ordinaryReloadState,
});

fixtureStates.push({
  id: 'F14A_T6_NOISE_REQUEST_A',
  family: 'F14 same semantics with T6 noise A',
  expectedChangeClass: NONE,
  transportNoise: { requestId: 'req-a', generatedAt: 111, latencyMs: 7 },
  state: activeState('A'),
});
fixtureStates.push({
  id: 'F14B_T6_NOISE_REQUEST_B',
  family: 'F14 same semantics with T6 noise B',
  expectedChangeClass: NONE,
  transportNoise: { requestId: 'req-b', generatedAt: 999999, latencyMs: 987 },
  state: activeState('A'),
});

const fixtures = fixtureStates.map((fixture) => ({
  id: fixture.id,
  family: fixture.family,
  expectedChangeClass: fixture.expectedChangeClass,
  transportNoise: fixture.transportNoise || null,
  output: compile(fixture.state),
}));

function findFixture(id) {
  const fixture = fixtures.find((row) => row.id === id);
  if (!fixture) throw new Error(`fixture missing: ${id}`);
  return fixture;
}

function firstChangedByte(a, b) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  const n = Math.min(left.length, right.length);
  let i = 0;
  while (i < n && left[i] === right[i]) i += 1;
  if (i === left.length && i === right.length) return null;
  return i;
}

function firstChangedLine(a, b) {
  const left = String(a).split('\n');
  const right = String(b).split('\n');
  const n = Math.min(left.length, right.length);
  let i = 0;
  while (i < n && left[i] === right[i]) i += 1;
  if (i === left.length && i === right.length) return null;
  return i + 1;
}

function pair(baseId, candidateId, expectedOwner, expectedRelation) {
  const a = findFixture(baseId).output;
  const b = findFixture(candidateId).output;
  return {
    baseId,
    candidateId,
    expectedOwner,
    expectedRelation,
    samePromptBytes: a.text === b.text,
    sameStableTier: a.stable.text === b.stable.text,
    sameSlowTier: a.slow.text === b.slow.text,
    sameVolatileTier: a.volatile.text === b.volatile.text,
    firstChangedByte: firstChangedByte(a.text, b.text),
    firstChangedLine: firstChangedLine(a.text, b.text),
    baseSha256: a.sha256,
    candidateSha256: b.sha256,
  };
}

const changeMatrix = [
  pair('F1_MODE_A_ORDINARY', 'F6_SECONDARY_CONFIGURED_INACTIVE', 'T3 secondary configuration', 'slow tier only'),
  pair('F6_SECONDARY_CONFIGURED_INACTIVE', 'F7_SECONDARY_ACTIVE', 'T5 current-turn secondary activation', 'slow tier only, current implementation placement'),
  pair('F8A_AGE_OFFSET_INACTIVE', 'F8B_AGE_OFFSET_ACTIVE', 'T3 age configuration', 'slow tier only'),
  pair('F1_MODE_A_ORDINARY', 'F9_NARRATIVE_TIMELINE_ANCHOR', 'T3 world-year + T5 current timeline guidance', 'slow + volatile'),
  pair('F1_MODE_A_ORDINARY', 'F2_MODE_B_START', 'T3 episode lifecycle + T5 current mode', 'slow + volatile'),
  pair('F12A_REACTION_MAX_ORDER_ABC', 'F12B_REACTION_MAX_ORDER_CBA', 'serialization determinism', 'exact byte identity required'),
  pair('F1_MODE_A_ORDINARY', 'F13_RELOAD_EQUIVALENT_STATE', 'reload equivalence', 'exact byte identity required'),
  pair('F14A_T6_NOISE_REQUEST_A', 'F14B_T6_NOISE_REQUEST_B', 'T6 observability firewall', 'exact byte identity required'),
];

const pluginVersion = (text.match(/^\/\/@version\s+([^\s]+)$/m) || [])[1] || 'unknown';
const runtimeVersion = (text.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)'/) || [])[1] || 'unknown';

const baseline = {
  schema: 'SimCoreCacheA2ExactByteFixtureBaselineV1',
  source: {
    authority: 'release-simcore',
    sourcePath,
    pluginVersion,
    runtimeVersion,
    promptCompilerVersion: prompt.PROMPT_COMPILER_VERSION,
    sourceSha256: sha256(text),
  },
  invariants: {
    promptPlacement: 'TAIL_AFTER_CURRENT_USER',
    runtimePromptPolicy: 'OBSERVE_ONLY',
    providerCache: 'UNVERIFIED',
    fixtureSemantics: 'compiler-observation-only',
    runtimeMutation: 'NONE',
  },
  fixtures,
  changeMatrix,
};

const rendered = `${JSON.stringify(baseline, null, 2)}\n`;

if (mode === '--print') {
  process.stdout.write(rendered);
} else if (mode === '--write') {
  if (!targetPath) throw new Error('--write requires target path');
  fs.writeFileSync(targetPath, rendered, 'utf8');
  process.stdout.write(`wrote ${targetPath}\n`);
} else if (mode === '--verify') {
  if (!targetPath) throw new Error('--verify requires fixture path');
  const expected = fs.readFileSync(targetPath, 'utf8');
  if (expected !== rendered) {
    const expectedObj = JSON.parse(expected);
    const actualObj = baseline;
    const expectedSource = expectedObj?.source?.sourceSha256 || 'unknown';
    const actualSource = actualObj?.source?.sourceSha256 || 'unknown';
    throw new Error(`CACHE-A2 exact-byte fixture drift: expected source ${expectedSource}, actual source ${actualSource}`);
  }
  process.stdout.write(`CACHE-A2 exact-byte fixture baseline PASS (${fixtures.length} fixtures, ${changeMatrix.length} pairs)\n`);
} else {
  throw new Error(`unknown mode: ${mode}`);
}
