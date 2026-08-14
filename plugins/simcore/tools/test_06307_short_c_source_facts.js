const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06307-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');
const CONTRACT = 'source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1';
const MODE_C_BOUNDARY = 'mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1';

function expectedCommunityBlocks(mode) {
  return mode === 'B_END' ? 2 : ((mode === 'B_START' || mode === 'B_CONTINUE' || mode === 'C') ? 1 : 0);
}
function modeFamily(mode) { return /^B_/.test(String(mode || '')) ? 'B' : (mode === 'C' ? 'C' : 'A'); }
function elapsedMinutes(start, previous) { return start && previous ? 75 : null; }

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
  vm.runInNewContext(promptSource, {
    SimCore: { define(name, fn) { if (name === 'prompt') factory = fn; } },
  }, { filename: `${label}-prompt.js` });
  if (!factory) throw new Error(`${label}: prompt factory missing`);
  const module = { exports: {} };
  factory((name) => modules[String(name).replace(/^\.\//, '').replace(/\.js$/, '')], module, module.exports);
  return { promptSource, ...module.exports };
}

const oldPrompt = loadPrompt(oldSource, 'old');
const nextPrompt = loadPrompt(newSource, 'new');
if (oldPrompt.PROMPT_COMPILER_VERSION !== nextPrompt.PROMPT_COMPILER_VERSION) throw new Error('prompt compiler version drift');

const PLATFORM_MAX = { YouTube: 1000001, TikTok: 1000002, Reddit: 1000003, X: 1000004 };
function makeState(mode, overrides = {}) {
  const isB = /^B_/.test(mode);
  return {
    broadcastLocked: isB,
    episodeNo: isB ? 12 : 11,
    koreanAgeOffset: 9,
    worldYear: 2028,
    community: { platformMax: overrides.platformMax || { ...PLATFORM_MAX } },
    pending: {
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
      communitySourceHandoffEligible: false,
      communitySourceHandoffNewSource: false,
      communitySourceHandoffRootMode: null,
      communitySourceHandoffRootIndex: null,
      ...overrides.pending,
    },
  };
}

const ordinaryCases = [
  makeState('A'),
  makeState('B_START'),
  makeState('B_CONTINUE'),
  makeState('B_END'),
  makeState('C'),
  makeState('C', { pending: { templateRecurrenceRepeated: true, templateRecurrenceModeFamily: 'C' } }),
];
for (const state of ordinaryCases) {
  const oldText = oldPrompt.renderRuntimePrompt(state);
  const newText = nextPrompt.renderRuntimePrompt(state);
  if (newText !== oldText) throw new Error(`${state.pending.mode}: non-source-lock runtime prompt changed`);
  if (newText.includes(CONTRACT)) throw new Error(`${state.pending.mode}: source-facts contract leaked outside eligible source lock`);
  if (state.pending.mode === 'C' && !newText.includes(MODE_C_BOUNDARY)) throw new Error('0.63.6 Mode C boundary missing');
}

const sourceCases = [
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: false, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1578 } }),
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: true, communitySourceHandoffRootMode: 'B', communitySourceHandoffRootIndex: 1600 } }),
];
for (const state of sourceCases) {
  const oldText = oldPrompt.renderRuntimePrompt(state);
  const newText = nextPrompt.renderRuntimePrompt(state);
  const anchor = 'do_not_substitute_prior_similar_source_or_prior_community_answer=1\n';
  if (!oldText.includes(anchor)) throw new Error('source-lock anchor missing in 0.63.6 baseline');
  const expected = oldText.replace(anchor, `${anchor}${CONTRACT}\n`, 1);
  if (newText !== expected) throw new Error('eligible Short-C prompt changed beyond exactly one source-facts line');
  if ((newText.match(new RegExp(CONTRACT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) {
    throw new Error('eligible Short-C source-facts contract count != 1');
  }
  if (!newText.includes('short_community_source_is_authoritative=1')) throw new Error('existing source authority contract missing');
  if (!newText.includes('do_not_substitute_prior_similar_source_or_prior_community_answer=1')) throw new Error('existing substitution guard missing');
  if (!newText.includes(MODE_C_BOUNDARY)) throw new Error('0.63.6 Mode C boundary missing on Short-C');
}

if (!newSource.includes('period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline')) {
  throw new Error('0.63.5 period continuity contract missing');
}
if (!newSource.includes('do_not_replay_completed_prior_period_transition_as_current_period_transition=1')) {
  throw new Error('0.63.5 completed-transition guard missing');
}

function commonPrefixPercent(previous, current) {
  const a = String(previous || '');
  const b = String(current || '');
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return b.length ? (i / b.length) * 100 : 100;
}

const transitionStates = {
  A: makeState('A'),
  C_LONG: makeState('C'),
  C_SHORT: sourceCases[0],
  B_START: makeState('B_START'),
  B_CONTINUE: makeState('B_CONTINUE', { pending: { secondaryActive: true } }),
  B_END: makeState('B_END'),
};
const names = Object.keys(transitionStates);
let oldWorst = { pair: '', pct: Infinity };
let newWorst = { pair: '', pct: Infinity };
let maxRegression = 0;
for (const from of names) {
  for (const to of names) {
    if (from === to) continue;
    const oldPct = commonPrefixPercent(oldPrompt.renderRuntimePrompt(transitionStates[from]), oldPrompt.renderRuntimePrompt(transitionStates[to]));
    const newPct = commonPrefixPercent(nextPrompt.renderRuntimePrompt(transitionStates[from]), nextPrompt.renderRuntimePrompt(transitionStates[to]));
    if (oldPct < oldWorst.pct) oldWorst = { pair: `${from}->${to}`, pct: oldPct };
    if (newPct < newWorst.pct) newWorst = { pair: `${from}->${to}`, pct: newPct };
    maxRegression = Math.max(maxRegression, oldPct - newPct);
    if (newPct + 1e-9 < 20) throw new Error(`cache floor failed ${from}->${to}: ${newPct.toFixed(2)}%`);
    if (oldPct - newPct > 5.0 + 1e-9) throw new Error(`cache regression too large ${from}->${to}: ${oldPct.toFixed(2)} -> ${newPct.toFixed(2)}`);
  }
}

const oldShort1 = sourceCases[0];
const oldShort2 = makeState('C', { platformMax: { ...PLATFORM_MAX, X: PLATFORM_MAX.X + 999 }, pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: false, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1578 } });
const newShort1 = sourceCases[0];
const newShort2 = oldShort2;
const oldHot = commonPrefixPercent(oldPrompt.renderRuntimePrompt(oldShort1), oldPrompt.renderRuntimePrompt(oldShort2));
const newHot = commonPrefixPercent(nextPrompt.renderRuntimePrompt(newShort1), nextPrompt.renderRuntimePrompt(newShort2));
if (newHot + 1e-9 < 60) throw new Error(`hot Short-C prefix target failed: ${newHot.toFixed(2)}%`);

const sourceDelta = nextPrompt.renderRuntimePrompt(sourceCases[0]).length - oldPrompt.renderRuntimePrompt(sourceCases[0]).length;
if (sourceDelta !== CONTRACT.length + 1) throw new Error(`unexpected Short-C prompt char delta: ${sourceDelta}`);

if (/pluginStorage|Risuai\.|getChatFromIndex|setChatToIndex/.test(nextPrompt.promptSource)) {
  throw new Error('Prompt module acquired host/storage I/O');
}

console.log(`0.63.7 Short-C source-facts contract OK; eligible Short-C delta +${sourceDelta} chars / +1 line; A/B/long-C byte-identical`);
console.log(`cache structure: worst ${oldWorst.pair} ${oldWorst.pct.toFixed(2)}% -> ${newWorst.pair} ${newWorst.pct.toFixed(2)}%; max regression ${maxRegression.toFixed(2)}pp; hot Short-C ${oldHot.toFixed(2)}% -> ${newHot.toFixed(2)}%`);
