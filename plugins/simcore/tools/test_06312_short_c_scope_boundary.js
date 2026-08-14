const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06312-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

const OLD_1 = 'current_event_fact_claims=current_root_supported_only;omit_absent_details;no_prior_similar_event_fill=1';
const OLD_2 = 'reaction_opinion_jokes_emphasis_are_free=1;broader_retrospective_event_facts_only_if_user_explicitly_asks=1';
const NEW_1 = 'short_community_scope=current_root_by_default;expand_only_if_user_explicitly_requests_overall_history_comparison_or_retrospective=1';
const NEW_2 = 'reaction_freedom=opinion_joke_tone_emphasis_only;all_factual_premises_obey_scope=1';
const NEW_3 = 'current_event_fact_boundary=title_body_comments_descriptions_Knowledge;outside_root_background_never_as_current_event_action=1';
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
  if (moduleBlock(oldSource, name) !== moduleBlock(newSource, name)) {
    throw new Error(`frozen module changed: ${name}`);
  }
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
      narrativeTimestampPrevious: !isB ? '2029-02-05 오전 10:00' : null,
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

// A/B, ordinary/long C, recurrence-owned C, and C without source lock must not change at all.
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
  for (const token of [NEW_1, NEW_2, NEW_3]) {
    if (newText.includes(token)) throw new Error(`${state.pending.mode}: scope boundary leaked outside eligible Short-C`);
  }
  if (state.pending.mode === 'C' && !newText.includes(MODE_C_BOUNDARY)) throw new Error('Mode C boundary missing');
}

// Exact live-reproduction shape: short Mode C, authoritative A@1614 root, Source Lock ON, NEW SOURCE.
const sourceCases = [
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: false, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 } }),
  makeState('C', { pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: true, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 } }),
];
for (const state of sourceCases) {
  const oldText = oldPrompt.renderRuntimePrompt(state);
  const newText = nextPrompt.renderRuntimePrompt(state);
  const oldBlock = `${OLD_1}\n${OLD_2}\n`;
  const newBlock = `${NEW_1}\n${NEW_2}\n${NEW_3}\n`;
  if (!oldText.includes(oldBlock)) throw new Error('0.63.11 evidence block missing in baseline');
  const expected = oldText.replace(oldBlock, newBlock);
  if (newText !== expected) throw new Error('eligible Short-C prompt changed beyond exact scope-boundary replacement');

  for (const token of [NEW_1, NEW_2, NEW_3]) {
    if ((newText.split(token).length - 1) !== 1) throw new Error(`new scope contract count != 1: ${token}`);
  }
  for (const retired of [OLD_1, OLD_2]) {
    if (newText.includes(retired)) throw new Error(`retired 0.63.11 wording remains in eligible prompt: ${retired}`);
  }
  for (const protectedToken of [
    'short_community_source_is_authoritative=1',
    'do_not_substitute_prior_similar_source_or_prior_community_answer=1',
    SOURCE_FACTS,
    MODE_C_BOUNDARY,
  ]) {
    if (!newText.includes(protectedToken)) throw new Error(`protected source contract missing: ${protectedToken}`);
  }

  const lineDelta = newText.split('\n').length - oldText.split('\n').length;
  if (lineDelta !== 1) throw new Error(`eligible Short-C line delta expected +1, got ${lineDelta}`);
}

// Protected runtime/UI sentinels must keep the same count.
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

// Entire artifact must equal 0.63.11 plus only release metadata/changelog, exact two->three Prompt swap,
// and the two visible diagnostic version labels.
const CHANGELOG = `// v0.63.12 Short-C Scope Boundary:\n// - Refines the eligible Short-C source contract after v0.63.11 live testing showed that prior event details could still be presented as if they occurred in the current source event\n// - Replaces the two v0.63.11 evidence lines with three compact scope lines: current lineage root is the default event scope, reaction style remains free, and every factual premise must obey that scope\n// - Scope may expand only when the current user explicitly requests overall/history/comparison/retrospective context; outside-root background may remain background but must never be presented as an action from the current event\n// - Applies the current-event fact boundary across title/body/comments/descriptions/Knowledge without parsing source semantics, copying source bodies, scanning history, or repairing output\n// - Keeps Lineage, Handoff, Recurrence, Frame, Time, Recovery, Store, Community, Reaction, Session, OPS, and v0.63.10 diagnostics UI frozen; A/B/ordinary long-C/recurrence-owned C/non-source-lock Short-C prompts remain byte-identical\n//\n`;
let expectedSource = oldSource;
expectedSource = expectedSource.replace('//@version 0.63.11', '//@version 0.63.12');
expectedSource = expectedSource.replace('// v0.63.11 Short-C Evidence Boundary:\n', CHANGELOG + '// v0.63.11 Short-C Evidence Boundary:\n');
expectedSource = expectedSource.replace(
  `    lines.push('${OLD_1}');\n    lines.push('${OLD_2}');\n`,
  `    lines.push('${NEW_1}');\n    lines.push('${NEW_2}');\n    lines.push('${NEW_3}');\n`
);
expectedSource = expectedSource.replace('⚙️ SimCore v0.63.11', '⚙️ SimCore v0.63.12');
expectedSource = expectedSource.replace("'Version: 0.63.11'", "'Version: 0.63.12'");
if (newSource !== expectedSource) throw new Error('artifact changed outside exact 0.63.12 scope');

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
  C_SHORT: sourceCases[1],
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
    if (oldPct - newPct > 8.0 + 1e-9) throw new Error(`cache regression too large ${from}->${to}: ${oldPct.toFixed(2)} -> ${newPct.toFixed(2)}`);
  }
}

const hot2 = makeState('C', {
  platformMax: { ...PLATFORM_MAX, X: PLATFORM_MAX.X + 999 },
  pending: { communitySourceHandoffEligible: true, communitySourceHandoffNewSource: true, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 1614 },
});
const oldHot = commonPrefixPercent(oldPrompt.renderRuntimePrompt(sourceCases[1]), oldPrompt.renderRuntimePrompt(hot2));
const newHot = commonPrefixPercent(nextPrompt.renderRuntimePrompt(sourceCases[1]), nextPrompt.renderRuntimePrompt(hot2));
if (newHot + 1e-9 < 60) throw new Error(`hot Short-C prefix target failed: ${newHot.toFixed(2)}%`);

const oldEligible = oldPrompt.renderRuntimePrompt(sourceCases[1]);
const newEligible = nextPrompt.renderRuntimePrompt(sourceCases[1]);
const charDelta = newEligible.length - oldEligible.length;
if (charDelta < 0 || charDelta > 180) throw new Error(`unexpected Short-C prompt char delta: ${charDelta}`);

if (/pluginStorage|Risuai\.|getChatFromIndex|setChatToIndex/.test(nextPrompt.promptSource)) {
  throw new Error('Prompt module acquired host/storage I/O');
}

console.log(`0.63.12 Scope Boundary OK; eligible Short-C net delta +${charDelta} chars / +1 line; A/B/long-C byte-identical`);
console.log(`cache structure: worst ${oldWorst.pair} ${oldWorst.pct.toFixed(2)}% -> ${newWorst.pair} ${newWorst.pct.toFixed(2)}%; max regression ${maxRegression.toFixed(2)}pp; hot Short-C ${oldHot.toFixed(2)}% -> ${newHot.toFixed(2)}%`);
console.log('all non-Prompt internal modules frozen; 0.63.10 UI/diagnostics and 0.63.11 source-lock infrastructure preserved');
