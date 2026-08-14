const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06305-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

function expectedCommunityBlocks(mode) {
  return mode === 'B_END' ? 2
    : (mode === 'B_START' || mode === 'B_CONTINUE' || mode === 'C') ? 1 : 0;
}
function modeFamily(mode) {
  return /^B_/.test(String(mode || '')) ? 'B' : (mode === 'C' ? 'C' : 'A');
}
function elapsedMinutes(start, previous) {
  if (!start || !previous) return null;
  return 75;
}

const modules = {
  kernel: { reconcileState: (state) => state },
  lifecycle: { expectedCommunityBlocks },
  time: { elapsedMinutes },
  recurrence: { modeFamily },
};

function loadPrompt(source, label) {
  const startMarker = 'SimCore.define("prompt", function (require, module, exports) {';
  const endMarker = 'SimCore.define("session", function (require, module, exports) {';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + 1);
  if (start < 0 || end < 0) throw new Error(`${label}: prompt module boundary missing`);
  const promptSource = source.slice(start, end);
  let factory = null;
  const context = {
    SimCore: {
      define(name, fn) {
        if (name === 'prompt') factory = fn;
      },
    },
  };
  vm.runInNewContext(promptSource, context, { filename: `${label}-prompt-module.js` });
  if (!factory) throw new Error(`${label}: prompt module factory not captured`);
  const promptModule = { exports: {} };
  factory((name) => modules[String(name).replace(/^\.\//, '').replace(/\.js$/, '')], promptModule, promptModule.exports);
  if (promptModule.exports.PROMPT_COMPILER_VERSION !== 1) throw new Error(`${label}: unexpected compiler version`);
  return promptModule.exports.renderRuntimePrompt;
}

const oldRender = loadPrompt(oldSource, '0.63.4');
const newRender = loadPrompt(newSource, '0.63.5');

const PLATFORM_MAX = {
  YouTube: 1000001,
  TikTok: 1000002,
  X: 1000003,
  Reddit: 1000004,
  DC: 1000005,
};

function makeState(mode, overrides = {}) {
  const isB = /^B_/.test(mode);
  const pending = {
    active: true,
    mode,
    secondaryConfigured: true,
    secondaryActive: false,
    narrativeProgressionActive: !isB,
    narrativeProgressionReason: 'calendar-transition',
    narrativeClockGuard: !isB,
    narrativeTimestampPrevious: !isB ? '2028-12-31 오후 11:50' : null,
    broadcastAirtimePrevious: isB ? '2027-09-16 오후 7:15' : null,
    broadcastAirtimeStart: isB ? '2027-09-16 오후 6:30' : null,
    templateRecurrenceRepeated: false,
    templateRecurrenceModeFamily: modeFamily(mode),
    communitySourceHandoffNewSource: false,
    communitySourceHandoffEligible: mode === 'C',
    communitySourceHandoffRootMode: mode === 'C' ? 'A' : null,
    communitySourceHandoffRootIndex: mode === 'C' ? 1578 : null,
    requestLineageRootMode: mode === 'C' ? 'A' : modeFamily(mode),
    requestLineageRootIndex: mode === 'C' ? 1578 : 1576,
    ...overrides.pending,
  };
  return {
    broadcastLocked: isB,
    episodeNo: overrides.episodeNo ?? (isB ? 12 : 11),
    koreanAgeOffset: overrides.koreanAgeOffset ?? 8,
    worldYear: overrides.worldYear ?? 2028,
    community: { platformMax: overrides.platformMax || { ...PLATFORM_MAX } },
    pending,
  };
}

const LINE_1 = 'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline';
const LINE_2 = 'do_not_replay_completed_prior_period_transition_as_current_period_transition=1';
const OLD_ANCHOR = 'response_envelope=exactly_one_no_restart\nreference_sources=character_card+currently_exposed_lore_if_present';
const NEW_ANCHOR = `response_envelope=exactly_one_no_restart\n${LINE_1}\n${LINE_2}\nreference_sources=character_card+currently_exposed_lore_if_present`;

function expectedNewPrompt(oldText) {
  const count = oldText.split(OLD_ANCHOR).length - 1;
  if (count !== 1) throw new Error(`expected old stable anchor once, got ${count}`);
  return oldText.replace(OLD_ANCHOR, NEW_ANCHOR);
}

const cases = [
  makeState('A'),
  makeState('A', { koreanAgeOffset: 0, pending: { narrativeProgressionActive: false, narrativeClockGuard: false, narrativeTimestampPrevious: null } }),
  makeState('C'),
  makeState('C', { pending: { templateRecurrenceRepeated: true, templateRecurrenceModeFamily: 'C', communitySourceHandoffEligible: false } }),
  makeState('C', { pending: { communitySourceHandoffNewSource: true, communitySourceHandoffEligible: true, communitySourceHandoffRootMode: 'B', communitySourceHandoffRootIndex: 1400 } }),
  makeState('B_START'),
  makeState('B_CONTINUE'),
  makeState('B_END'),
];

let fixedCharDelta = null;
for (const state of cases) {
  const oldText = oldRender(state);
  const newText = newRender(state);
  const expected = expectedNewPrompt(oldText);
  if (newText !== expected) throw new Error(`runtime prompt changed beyond the two continuity lines for ${state.pending.mode}`);
  if ((newText.match(new RegExp(LINE_1, 'g')) || []).length !== 1) throw new Error('period continuity line count drift');
  if ((newText.match(new RegExp(LINE_2, 'g')) || []).length !== 1) throw new Error('prior-transition guard line count drift');
  const lineDelta = newText.split('\n').length - oldText.split('\n').length;
  if (lineDelta !== 2) throw new Error(`prompt line delta must be +2, got ${lineDelta}`);
  const charDelta = newText.length - oldText.length;
  if (fixedCharDelta == null) fixedCharDelta = charDelta;
  if (charDelta !== fixedCharDelta) throw new Error(`prompt char delta is not fixed: ${charDelta} vs ${fixedCharDelta}`);
}
if (fixedCharDelta > 200) throw new Error(`fixed prompt delta too large: +${fixedCharDelta} chars`);

function commonPrefixPercent(previous, current) {
  const a = String(previous || '');
  const b = String(current || '');
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1;
  return b.length ? (i / b.length) * 100 : 100;
}

const transitionStates = {
  A: makeState('A', { worldYear: 2028, koreanAgeOffset: 8, episodeNo: 11, pending: { secondaryActive: false } }),
  C: makeState('C', { worldYear: 2029, koreanAgeOffset: 9, episodeNo: 11, pending: { secondaryActive: true } }),
  B_START: makeState('B_START', { worldYear: 2029, koreanAgeOffset: 9, episodeNo: 12, pending: { secondaryActive: false } }),
  B_CONTINUE: makeState('B_CONTINUE', { worldYear: 2029, koreanAgeOffset: 9, episodeNo: 12, pending: { secondaryActive: true } }),
  B_END: makeState('B_END', { worldYear: 2030, koreanAgeOffset: 10, episodeNo: 13, pending: { secondaryActive: false } }),
};

const names = Object.keys(transitionStates);
let oldWorst = { pair: '', percent: Infinity };
let newWorst = { pair: '', percent: Infinity };
for (const from of names) {
  for (const to of names) {
    if (from === to) continue;
    const oldPct = commonPrefixPercent(oldRender(transitionStates[from]), oldRender(transitionStates[to]));
    const newPct = commonPrefixPercent(newRender(transitionStates[from]), newRender(transitionStates[to]));
    if (oldPct < oldWorst.percent) oldWorst = { pair: `${from}->${to}`, percent: oldPct };
    if (newPct < newWorst.percent) newWorst = { pair: `${from}->${to}`, percent: newPct };
    if (newPct + 1e-9 < 20) throw new Error(`cache floor failed ${from}->${to}: ${newPct.toFixed(2)}%`);
    if (newPct + 0.01 < oldPct) throw new Error(`cache-prefix regression ${from}->${to}: ${oldPct.toFixed(2)} -> ${newPct.toFixed(2)}%`);
  }
}

const sameC1 = makeState('C', { platformMax: { ...PLATFORM_MAX } });
const sameC2 = makeState('C', { platformMax: { ...PLATFORM_MAX, DC: PLATFORM_MAX.DC + 999 } });
const oldHot = commonPrefixPercent(oldRender(sameC1), oldRender(sameC2));
const newHot = commonPrefixPercent(newRender(sameC1), newRender(sameC2));
if (newHot < 60) throw new Error(`same-mode hot C prefix target failed: ${newHot.toFixed(2)}%`);
if (newHot + 0.01 < oldHot) throw new Error(`same-mode hot C cache-prefix regression: ${oldHot.toFixed(2)} -> ${newHot.toFixed(2)}%`);

console.log(`0.63.5 prompt contract OK; fixed delta +${fixedCharDelta} chars / +2 lines`);
console.log(`cache structure: worst 0.63.4 ${oldWorst.pair} ${oldWorst.percent.toFixed(2)}% -> 0.63.5 ${newWorst.pair} ${newWorst.percent.toFixed(2)}%; hot C ${oldHot.toFixed(2)}% -> ${newHot.toFixed(2)}%`);
