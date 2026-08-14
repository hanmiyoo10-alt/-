const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06314-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

const OLD = [
  'short_community_default_scope=current_root_event;stable_character_world_background_allowed_as_background_only=1;outside_root_event_details_forbidden=1',
  'expand_event_scope_only_if_current_user_explicitly_requests_overall_history_comparison_retrospective_or_prior_events=1;otherwise_no_series_wide_recap_compilation_or_prior_event_examples=1',
  'reaction_freedom=opinion_joke_tone_emphasis_only;event_fact_premises_in_title_body_comments_descriptions_Knowledge_obey_event_scope=1',
];
const NEXT = [
  'abstract_generalization_from_current_root_allowed=1;stable_character_world_background_allowed_as_context_not_event_evidence=1;reaction_opinion_joke_tone_emphasis_free=1',
  'specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support=1;outside_root_specifics_omit=1',
  'outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1',
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

// Mini-patch isolation: A/B, ordinary long-C, recurrence-owned C, and C without source lock are byte-identical.
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
  for (const token of NEXT) if (newText.includes(token)) throw new Error(`${state.pending.mode}: provenance contract leaked outside eligible Short-C`);
  if (state.pending.mode === 'C' && !newText.includes(MODE_C_BOUNDARY)) throw new Error('Mode C boundary missing');
}

// Exact live-reproduction shape: Short-C, A@1614 authoritative root, Source Lock ON, both SAME/NEW source variants.
const sourceCases = [
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: false, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 } }),
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: true, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 } }),
];
for (const state of sourceCases) {
  const oldText = oldPrompt.renderRuntimePrompt(state);
  const newText = nextPrompt.renderRuntimePrompt(state);
  const oldBlock = `${OLD.join('\n')}\n`;
  const newBlock = `${NEXT.join('\n')}\n`;
  if (!oldText.includes(oldBlock)) throw new Error('0.63.13 event-scope block missing in baseline');
  if (newText !== oldText.replace(oldBlock, newBlock)) throw new Error('eligible Short-C prompt changed beyond exact 3-line provenance replacement');
  for (const token of NEXT) if ((newText.split(token).length - 1) !== 1) throw new Error(`new provenance contract count != 1: ${token}`);
  for (const token of OLD) if (newText.includes(token)) throw new Error(`retired 0.63.13 wording remains: ${token}`);
  for (const token of ['short_community_source_is_authoritative=1','do_not_substitute_prior_similar_source_or_prior_community_answer=1',SOURCE_FACTS,MODE_C_BOUNDARY]) {
    if (!newText.includes(token)) throw new Error(`protected source contract missing: ${token}`);
  }
  const lineDelta = newText.split('\n').length - oldText.split('\n').length;
  if (lineDelta !== 0) throw new Error(`eligible Short-C line delta expected 0, got ${lineDelta}`);
}

// Provenance wording must preserve the intended freedom/boundary split from the live evidence.
const eligible = nextPrompt.renderRuntimePrompt(sourceCases[1]);
for (const required of [
  'abstract_generalization_from_current_root_allowed=1',
  'stable_character_world_background_allowed_as_context_not_event_evidence=1',
  'reaction_opinion_joke_tone_emphasis_free=1',
  'specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support=1',
  'outside_root_specifics_omit=1',
  'outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1',
  'boundary_applies_title_body_comments_descriptions_Knowledge=1',
]) {
  if (!eligible.includes(required)) throw new Error(`provenance semantic sentinel missing: ${required}`);
}

// Protect known-good runtime/UI/Frame paths by sentinel count and exact non-Prompt module freeze.
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
  if (oldSource.split(token).length !== newSource.split(token).length) throw new Error(`protected behavior/UI/Frame token drift: ${token}`);
}

// Whole-artifact transform gate: only metadata/changelog + exact 3-line Prompt replacement + visible version labels.
const CHANGELOG = `// v0.63.14 Short-C Example Provenance Lock:\n// - Refines the eligible Short-C evidence contract after v0.63.13 live testing showed that broad character-pattern generalization was legitimate but unsupported concrete prior-event examples still leaked into posts/comments\n// - Replaces the three v0.63.13 scope lines with three provenance-focused lines: abstract generalization and stable background remain available, while every concrete event example/scene/action/item/quote/outcome requires support from the authoritative current root\n// - Outside-root specific event evidence is omitted unless the current user explicitly requests prior-event/history/comparison/retrospective context; the boundary applies across title/body/comments/descriptions/Knowledge\n// - Preserves reaction/opinion/joke/tone/emphasis freedom and does not parse source semantics, copy source bodies, scan history, store event facts, or repair output\n// - Keeps Frame/Chapter/Chatindex handling deliberately frozen for independent live validation; all non-Prompt modules, state/storage paths, compiler structure, and v0.63.10 diagnostics UI remain unchanged\n//\n`;
let expectedSource = oldSource;
expectedSource = expectedSource.replace('//@version 0.63.13', '//@version 0.63.14');
expectedSource = expectedSource.replace('// v0.63.13 Short-C Event Scope Lock:\n', CHANGELOG + '// v0.63.13 Short-C Event Scope Lock:\n');
expectedSource = expectedSource.replace(
  OLD.map(x => `    lines.push('${x}');`).join('\n') + '\n',
  NEXT.map(x => `    lines.push('${x}');`).join('\n') + '\n'
);
expectedSource = expectedSource.replace('⚙️ SimCore v0.63.13', '⚙️ SimCore v0.63.14');
expectedSource = expectedSource.replace("'Version: 0.63.13'", "'Version: 0.63.14'");
if (newSource !== expectedSource) throw new Error('artifact changed outside exact 0.63.14 scope');

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

const oldEligible = oldPrompt.renderRuntimePrompt(sourceCases[1]);
const newEligible = nextPrompt.renderRuntimePrompt(sourceCases[1]);
const charDelta = newEligible.length - oldEligible.length;
const expectedCharDelta = NEXT.join('\n').length - OLD.join('\n').length;
if (charDelta !== expectedCharDelta) throw new Error(`eligible Short-C char delta expected ${expectedCharDelta}, got ${charDelta}`);
if (Math.abs(charDelta) > 220) throw new Error(`unexpectedly large Short-C prompt delta: ${charDelta}`);
if (/pluginStorage|Risuai\.|getChatFromIndex|setChatToIndex/.test(nextPrompt.promptSource)) throw new Error('Prompt module acquired host/storage I/O');

console.log(`0.63.14 Example Provenance Lock OK; eligible Short-C net delta ${charDelta >= 0 ? '+' : ''}${charDelta} chars / +0 lines; A/B/long-C byte-identical`);
console.log(`cache structure: worst ${oldWorst.pair} ${oldWorst.pct.toFixed(2)}% -> ${newWorst.pair} ${newWorst.pct.toFixed(2)}%; max regression ${maxRegression.toFixed(2)}pp; hot Short-C ${oldHot.toFixed(2)}% -> ${newHot.toFixed(2)}%`);
console.log('all non-Prompt internal modules frozen; Frame/Chapter/Chatindex handling and 0.63.10 diagnostics UI untouched');
