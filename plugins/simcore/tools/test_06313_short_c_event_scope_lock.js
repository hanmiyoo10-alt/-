const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06313-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

const OLD = [
  'short_community_scope=current_root_by_default;expand_only_if_user_explicitly_requests_overall_history_comparison_or_retrospective=1',
  'reaction_freedom=opinion_joke_tone_emphasis_only;all_factual_premises_obey_scope=1',
  'current_event_fact_boundary=title_body_comments_descriptions_Knowledge;outside_root_background_never_as_current_event_action=1',
];
const NEXT = [
  'short_community_default_scope=current_root_event;stable_character_world_background_allowed_as_background_only=1;outside_root_event_details_forbidden=1',
  'expand_event_scope_only_if_current_user_explicitly_requests_overall_history_comparison_retrospective_or_prior_events=1;otherwise_no_series_wide_recap_compilation_or_prior_event_examples=1',
  'reaction_freedom=opinion_joke_tone_emphasis_only;event_fact_premises_in_title_body_comments_descriptions_Knowledge_obey_event_scope=1',
];
const SOURCE_FACTS = 'source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1';
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

function moduleBlock(source, name) {
  const marker = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`module missing: ${name}`);
  let end = source.indexOf('\nSimCore.define("', start + marker.length);
  if (end < 0) end = source.indexOf('\n(async () => {', start + marker.length);
  if (end < 0) throw new Error(`module end missing: ${name}`);
  return source.slice(start, end);
}
function loadPrompt(source, label) {
  const promptSource = moduleBlock(source, 'prompt');
  let factory = null;
  vm.runInNewContext(promptSource, {
    SimCore: { define(name, fn) { if (name === 'prompt') factory = fn; } },
  }, { filename: `${label}-prompt.js` });
  if (!factory) throw new Error(`${label}: prompt factory missing`);
  const module = { exports: {} };
  factory((name) => modules[String(name).replace(/^\.\//, '').replace(/\.js$/, '')], module, module.exports);
  return { promptSource, ...module.exports };
}

const allModules = ['contracts','store','community','recurrence','lineage','handoff','kernel','time','lifecycle','reaction','structure','recovery','prompt','session','ops'];
for (const name of allModules) {
  if (name === 'prompt') continue;
  if (moduleBlock(oldSource, name) !== moduleBlock(newSource, name)) throw new Error(`frozen module changed: ${name}`);
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
    worldYear: 2029,
    community: { platformMax: overrides.platformMax || { ...PLATFORM_MAX } },
    pending: {
      active: true,
      mode,
      secondaryConfigured: true,
      secondaryActive: false,
      narrativeProgressionActive: !isB,
      narrativeProgressionReason: 'calendar-transition',
      narrativeClockGuard: !isB,
      narrativeTimestampPrevious: !isB ? '2029-01-29 오후 2:30' : null,
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
  for (const token of NEXT) if (newText.includes(token)) throw new Error(`${state.pending.mode}: 0.63.13 scope contract leaked outside eligible Short-C`);
  if (state.pending.mode === 'C' && !newText.includes(MODE_C_BOUNDARY)) throw new Error('Mode C boundary missing');
}

const sourceCases = [
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: false, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 } }),
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: true, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 } }),
];
for (const state of sourceCases) {
  const oldText = oldPrompt.renderRuntimePrompt(state);
  const newText = nextPrompt.renderRuntimePrompt(state);
  const oldBlock = `${OLD.join('\n')}\n`;
  const newBlock = `${NEXT.join('\n')}\n`;
  if (!oldText.includes(oldBlock)) throw new Error('0.63.12 scope block missing in baseline');
  if (newText !== oldText.replace(oldBlock, newBlock)) throw new Error('eligible Short-C prompt changed beyond exact 3-line scope replacement');
  for (const token of NEXT) if ((newText.split(token).length - 1) !== 1) throw new Error(`new scope contract count != 1: ${token}`);
  for (const token of OLD) if (newText.includes(token)) throw new Error(`retired 0.63.12 wording remains: ${token}`);
  for (const token of ['short_community_source_is_authoritative=1','do_not_substitute_prior_similar_source_or_prior_community_answer=1',SOURCE_FACTS,MODE_C_BOUNDARY]) {
    if (!newText.includes(token)) throw new Error(`protected source contract missing: ${token}`);
  }
  const lineDelta = newText.split('\n').length - oldText.split('\n').length;
  if (lineDelta !== 0) throw new Error(`eligible Short-C line delta expected 0, got ${lineDelta}`);
}

for (const token of [
  'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
  'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
  'function canonicalizeResponseEnvelope',
  'function isKnownThoughtsPreamble',
  'function isThoughtsCompatibilityPreamble',
  'Diagnostic format: raw-lineage-v2',
  'Frame continuity:',
  'Frame regression:',
  'Storage diagnostics ·',
  '<summary>Diagnostic Tools</summary>',
  "addRisuReplacer('beforeRequest'",
  "addRisuScriptHandler('output'",
]) {
  if (oldSource.split(token).length !== newSource.split(token).length) throw new Error(`protected behavior/UI token drift: ${token}`);
}

const CHANGELOG = `// v0.63.13 Short-C Event Scope Lock:\n// - Refines the v0.63.12 Short-C scope contract after live testing showed that outside-root events were correctly labeled as past but the model still widened a plain current-scene reaction into a series-wide recap\n// - Replaces the three v0.63.12 scope lines with three sharper lines that separate stable character/world background from concrete outside-root event details\n// - Stable background remains available as background only; concrete prior-event details are forbidden unless the current user explicitly requests overall/history/comparison/retrospective/prior-event scope\n// - Without explicit scope expansion, the model must not reframe the current-root reaction as a series-wide recap, compilation, history, or prior-event example set\n// - Keeps Frame handling deliberately frozen despite the separately observed chapter/chatindex regression so the next live test can determine whether that regression persists independently; all non-Prompt modules and v0.63.10 diagnostics UI remain unchanged\n//\n`;
let expectedSource = oldSource;
expectedSource = expectedSource.replace('//@version 0.63.12', '//@version 0.63.13');
expectedSource = expectedSource.replace('// v0.63.12 Short-C Scope Boundary:\n', CHANGELOG + '// v0.63.12 Short-C Scope Boundary:\n');
expectedSource = expectedSource.replace(
  OLD.map(x => `    lines.push('${x}');`).join('\n') + '\n',
  NEXT.map(x => `    lines.push('${x}');`).join('\n') + '\n'
);
expectedSource = expectedSource.replace('⚙️ SimCore v0.63.12', '⚙️ SimCore v0.63.13');
expectedSource = expectedSource.replace("'Version: 0.63.12'", "'Version: 0.63.13'");
if (newSource !== expectedSource) throw new Error('artifact changed outside exact 0.63.13 scope');

function commonPrefixPercent(previous, current) {
  const a = String(previous || '');
  const b = String(current || '');
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return b.length ? (i / b.length) * 100 : 100;
}
const transitionStates = {
  A: makeState('A'), C_LONG: makeState('C'), C_SHORT: sourceCases[1],
  B_START: makeState('B_START'), B_CONTINUE: makeState('B_CONTINUE', { pending: { secondaryActive: true } }), B_END: makeState('B_END'),
};
const names = Object.keys(transitionStates);
let oldWorst = { pair: '', pct: Infinity }, newWorst = { pair: '', pct: Infinity }, maxRegression = 0;
for (const from of names) for (const to of names) {
  if (from === to) continue;
  const oldPct = commonPrefixPercent(oldPrompt.renderRuntimePrompt(transitionStates[from]), oldPrompt.renderRuntimePrompt(transitionStates[to]));
  const newPct = commonPrefixPercent(nextPrompt.renderRuntimePrompt(transitionStates[from]), nextPrompt.renderRuntimePrompt(transitionStates[to]));
  if (oldPct < oldWorst.pct) oldWorst = { pair: `${from}->${to}`, pct: oldPct };
  if (newPct < newWorst.pct) newWorst = { pair: `${from}->${to}`, pct: newPct };
  maxRegression = Math.max(maxRegression, oldPct - newPct);
  if (newPct + 1e-9 < 20) throw new Error(`cache floor failed ${from}->${to}: ${newPct.toFixed(2)}%`);
  if (oldPct - newPct > 8.0 + 1e-9) throw new Error(`cache regression too large ${from}->${to}: ${oldPct.toFixed(2)} -> ${newPct.toFixed(2)}`);
}
const hot2 = makeState('C', { platformMax: { ...PLATFORM_MAX, X: PLATFORM_MAX.X + 999 }, pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: true, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 } });
const oldHot = commonPrefixPercent(oldPrompt.renderRuntimePrompt(sourceCases[1]), oldPrompt.renderRuntimePrompt(hot2));
const newHot = commonPrefixPercent(nextPrompt.renderRuntimePrompt(sourceCases[1]), nextPrompt.renderRuntimePrompt(hot2));
if (newHot + 1e-9 < 60) throw new Error(`hot Short-C prefix target failed: ${newHot.toFixed(2)}%`);

const charDelta = nextPrompt.renderRuntimePrompt(sourceCases[1]).length - oldPrompt.renderRuntimePrompt(sourceCases[1]).length;
if (charDelta !== 131) throw new Error(`eligible Short-C char delta expected +131, got ${charDelta}`);
if (/pluginStorage|Risuai\.|getChatFromIndex|setChatToIndex/.test(nextPrompt.promptSource)) throw new Error('Prompt module acquired host/storage I/O');

console.log(`0.63.13 Event Scope Lock OK; eligible Short-C net delta +${charDelta} chars / +0 lines; A/B/long-C byte-identical`);
console.log(`cache structure: worst ${oldWorst.pair} ${oldWorst.pct.toFixed(2)}% -> ${newWorst.pair} ${newWorst.pct.toFixed(2)}%; max regression ${maxRegression.toFixed(2)}pp; hot Short-C ${oldHot.toFixed(2)}% -> ${newHot.toFixed(2)}%`);
console.log('all non-Prompt internal modules frozen; Frame handling and 0.63.10 diagnostics UI untouched');
