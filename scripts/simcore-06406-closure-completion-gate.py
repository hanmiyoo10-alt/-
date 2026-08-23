from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


text = LATEST.read_text(encoding='utf-8')

for marker in (
    '//@version 0.64.6',
    "const SIMCORE_RUNTIME_VERSION = '0.64.6';",
    '// v0.64.6 Post-B_END C Clock Handoff Authority:',
    'function resolvePostBEndCurrentTimeFloor(narrativeTimestamp, eligibility)',
    'function derivePostBEndClockEligibility(mode, previousMode, state, requestLineage)',
    'function prepareTurn(baseState, userText, promptProbe, sendIndex)',
    'async onSend(sendIndex, userText, promptProbe, perfDetail = null, historyMessages = null)',
    'Post-B_END clock handoff:',
):
    if marker not in text:
        raise SystemExit(f'missing initial v0.64.6 candidate marker: {marker}')

if 'function inspectPreviousBEndOutput(' in text:
    raise SystemExit('closure-completion gate already present')

release_anchor = """// - Source Handoff eligibility is intentionally not a clock prerequisite; a recurrence-owned Source Handoff may still receive the post-B_END clock bridge when lifecycle/lineage conditions are direct and valid
// - Consolidates regression checks for Current Timeline Authority, Narrative Tail Time, B_END terminal airtime authority, explicit past-scene allowance, current calendar baseline, Representation/Edit controls, Summary Scope, and v0.64.5 COMMUNITY multiline behavior without changing those owners
"""
release_replacement = """// - Source Handoff eligibility is intentionally not a clock prerequisite; a recurrence-owned Source Handoff may still receive the post-B_END clock bridge when lifecycle/lineage conditions are direct and valid
// - Pre-live closure hardening reconstructs bounded facts from the directly preceding visible B_END output and requires Structure-clean closure plus an explicit monotonic terminal timestamp; Time also requires that visible terminal to equal the stored B_END airtime before the floor can apply
// - Consolidates regression checks for Current Timeline Authority, Narrative Tail Time, B_END terminal airtime authority, explicit past-scene allowance, current calendar baseline, Representation/Edit controls, Summary Scope, and v0.64.5 COMMUNITY multiline behavior without changing those owners
"""
text = one(text, release_anchor, release_replacement, 'release note closure-hardening bullet')

old_time = """function resolvePostBEndCurrentTimeFloor(narrativeTimestamp, eligibility) {
  const narrativeRaw = typeof narrativeTimestamp === 'string' && narrativeTimestamp.trim() ? narrativeTimestamp.trim() : null;
  const base = eligibility && typeof eligibility === 'object' ? eligibility : { eligible: false, reason: 'not-eligible' };
  if (!base.eligible) {
    return Object.freeze({
      disposition: 'INELIGIBLE',
      source: base.source || 'NONE',
      reason: base.reason || 'not-eligible',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const terminal = parseTimestamp(base.floorTimestamp);
  if (!terminal) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'invalid-b-end-terminal',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const narrative = narrativeRaw ? parseTimestamp(narrativeRaw) : null;
  if (!narrative || terminal.minuteKey > narrative.minuteKey) {
    return Object.freeze({
      disposition: 'APPLIED',
      source: base.source || 'B_END_TERMINAL',
      reason: narrative ? 'b-end-terminal-after-narrative' : 'narrative-missing',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrative ? narrative.raw : narrativeRaw,
      effectiveFloor: terminal.raw,
    });
  }

  return Object.freeze({
    disposition: 'ALREADY_SATISFIED',
    source: base.source || 'B_END_TERMINAL',
    reason: terminal.minuteKey === narrative.minuteKey ? 'narrative-equals-terminal' : 'narrative-after-terminal',
    terminalTimestamp: terminal.raw,
    narrativeTimestamp: narrative.raw,
    effectiveFloor: narrative.raw,
  });
}
"""
new_time = """function resolvePostBEndCurrentTimeFloor(narrativeTimestamp, eligibility) {
  const narrativeRaw = typeof narrativeTimestamp === 'string' && narrativeTimestamp.trim() ? narrativeTimestamp.trim() : null;
  const base = eligibility && typeof eligibility === 'object' ? eligibility : { eligible: false, reason: 'not-eligible' };
  if (!base.eligible) {
    return Object.freeze({
      disposition: 'INELIGIBLE',
      source: base.source || 'NONE',
      reason: base.reason || 'not-eligible',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const terminal = parseTimestamp(base.floorTimestamp);
  if (!terminal) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'invalid-b-end-terminal',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const stored = parseTimestamp(base.storedBroadcastAirtime);
  if (!stored) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'missing-or-invalid-stored-b-end-airtime',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }
  if (stored.minuteKey !== terminal.minuteKey) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'terminal-stored-airtime-mismatch',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const narrative = narrativeRaw ? parseTimestamp(narrativeRaw) : null;
  if (!narrative || terminal.minuteKey > narrative.minuteKey) {
    return Object.freeze({
      disposition: 'APPLIED',
      source: base.source || 'B_END_TERMINAL',
      reason: narrative ? 'b-end-terminal-after-narrative' : 'narrative-missing',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrative ? narrative.raw : narrativeRaw,
      effectiveFloor: terminal.raw,
    });
  }

  return Object.freeze({
    disposition: 'ALREADY_SATISFIED',
    source: base.source || 'B_END_TERMINAL',
    reason: terminal.minuteKey === narrative.minuteKey ? 'narrative-equals-terminal' : 'narrative-after-terminal',
    terminalTimestamp: terminal.raw,
    narrativeTimestamp: narrative.raw,
    effectiveFloor: narrative.raw,
  });
}
"""
text = one(text, old_time, new_time, 'Time source-consistency gate')

old_lifecycle = """function derivePostBEndClockEligibility(mode, previousMode, state, requestLineage) {
  if (String(mode || '') !== 'C') return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'not-c' });
  if (String(previousMode || '') !== 'B_END') return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'not-direct-post-b-end-c' });
  if (state?.broadcastLocked) return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'broadcast-still-locked' });
  const floorTimestamp = typeof state?.broadcastAirtime === 'string' && state.broadcastAirtime.trim() ? state.broadcastAirtime.trim() : null;
  if (!floorTimestamp) return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'missing-b-end-terminal' });
  const priorFamily = String(requestLineage?.lastRequestMode || '');
  const priorIndex = Number(requestLineage?.lastRequestIndex);
  if (priorFamily !== 'B' || !Number.isInteger(priorIndex) || priorIndex < 0) {
    return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'previous-request-not-b' });
  }
  return Object.freeze({ eligible: true, floorTimestamp, source: 'B_END_TERMINAL', reason: 'eligible-direct-post-b-end-c' });
}

function prepareTurn(baseState, userText, promptProbe, sendIndex) {
"""
new_lifecycle = """function derivePostBEndClockEligibility(mode, previousMode, state, requestLineage, previousOutputFacts = null, sendIndex = -1) {
  if (String(mode || '') !== 'C') return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'not-c' });
  if (String(previousMode || '') !== 'B_END') return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'not-direct-post-b-end-c' });
  if (state?.broadcastLocked) return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'broadcast-still-locked' });
  const currentSendIndex = Number(sendIndex);
  if (!Number.isInteger(currentSendIndex) || currentSendIndex < 2) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'invalid-current-send-index' });
  }
  const priorFamily = String(requestLineage?.lastRequestMode || '');
  const priorIndex = Number(requestLineage?.lastRequestIndex);
  if (priorFamily !== 'B' || !Number.isInteger(priorIndex) || priorIndex !== currentSendIndex - 2) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'previous-request-not-direct-b' });
  }
  const facts = previousOutputFacts && typeof previousOutputFacts === 'object' ? previousOutputFacts : null;
  if (!facts?.available) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: facts?.reason || 'previous-b-end-output-unavailable' });
  }
  if (Number(facts.outIndex) !== currentSendIndex - 1) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'previous-output-not-direct' });
  }
  if (!facts.closureComplete) {
    return Object.freeze({ eligible: false, floorTimestamp: facts.terminalTimestamp || null, storedBroadcastAirtime: state?.broadcastAirtime || null, source: 'NONE', reason: 'previous-b-end-closure-incomplete' });
  }
  const floorTimestamp = typeof facts.terminalTimestamp === 'string' && facts.terminalTimestamp.trim() ? facts.terminalTimestamp.trim() : null;
  if (!floorTimestamp) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: state?.broadcastAirtime || null, source: 'NONE', reason: 'missing-b-end-terminal' });
  }
  const storedBroadcastAirtime = typeof state?.broadcastAirtime === 'string' && state.broadcastAirtime.trim() ? state.broadcastAirtime.trim() : null;
  return Object.freeze({
    eligible: true,
    floorTimestamp,
    storedBroadcastAirtime,
    source: 'B_END_TERMINAL',
    reason: 'eligible-direct-complete-post-b-end-c',
  });
}

function prepareTurn(baseState, userText, promptProbe, sendIndex, previousOutputFacts = null) {
"""
text = one(text, old_lifecycle, new_lifecycle, 'Lifecycle direct-complete eligibility')

old_call = """  const postBEndClockEligibility = derivePostBEndClockEligibility(c.mode, previousMode, state, state.requestLineage);
"""
new_call = """  const postBEndClockEligibility = derivePostBEndClockEligibility(
    c.mode,
    previousMode,
    state,
    state.requestLineage,
    previousOutputFacts,
    sendIndex,
  );
"""
text = one(text, old_call, new_call, 'Lifecycle eligibility call')

session_anchor = """const renderRuntimePrompt = prompt.renderRuntimePrompt;
const compileRuntimePromptParts = prompt.compileRuntimePromptParts;

function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) {
"""
session_replacement = """const renderRuntimePrompt = prompt.renderRuntimePrompt;
const compileRuntimePromptParts = prompt.compileRuntimePromptParts;

function inspectPreviousBEndOutput(historyMessages, sendIndex) {
  const rows = Array.isArray(historyMessages) ? historyMessages : [];
  const currentSendIndex = Number(sendIndex);
  const outIndex = Number.isInteger(currentSendIndex) ? currentSendIndex - 1 : -1;
  const unavailable = (reason) => Object.freeze({
    available: false,
    outIndex,
    closureComplete: false,
    terminalExplicit: false,
    terminalTimestamp: null,
    structureClean: false,
    issueCount: 0,
    reason,
  });
  if (!Number.isInteger(currentSendIndex) || currentSendIndex < 1 || outIndex < 0 || outIndex >= rows.length) {
    return unavailable('previous-output-index-unavailable');
  }
  const row = rows[outIndex];
  if (row?.role !== 'assistant' && row?.role !== 'char') return unavailable('previous-output-not-assistant');
  const raw = kernel.textOfMessage(row);
  if (!raw) return unavailable('previous-output-empty');
  const canonicalized = time.canonicalizeTimestampSyntax(raw);
  const content = canonicalized.content;
  const pending = Object.freeze({ active: true, mode: 'B_END' });
  const integrity = structure.responseEnvelopeIntegrity(content, pending);
  const issues = structure.validateStructure(content, pending);
  const terminal = time.narrativeTimestampSequence(content);
  const terminalExplicit = !!(terminal
    && terminal.sceneCount > 0
    && terminal.tailStatus === 'MONOTONIC'
    && terminal.candidate);
  const structureClean = !!integrity?.safe && issues.length === 0;
  const closureComplete = terminalExplicit && structureClean;
  return Object.freeze({
    available: true,
    outIndex,
    closureComplete,
    terminalExplicit,
    terminalTimestamp: terminalExplicit ? terminal.candidate : null,
    structureClean,
    issueCount: issues.length,
    reason: closureComplete ? 'complete' : (!terminalExplicit ? 'terminal-invalid' : 'structure-not-clean'),
  });
}

function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) {
"""
text = one(text, session_anchor, session_replacement, 'Session previous B_END fact inspector')

old_on_send = """    t = sessionNow();
    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex);
    if (state.pending?.active) {
"""
new_on_send = """    t = sessionNow();
    const previousOutputFacts = base?.lastMode === 'B_END'
      ? inspectPreviousBEndOutput(historyMessages, sendIndex)
      : null;
    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex, previousOutputFacts);
    if (state.pending?.active) {
"""
text = one(text, old_on_send, new_on_send, 'Session gather/pass previous B_END facts')

old_exports = """module.exports = {
  CoreRulesetSession,
  latestUserIndex: kernel.latestUserIndex,
"""
new_exports = """module.exports = {
  CoreRulesetSession,
  inspectPreviousBEndOutput,
  latestUserIndex: kernel.latestUserIndex,
"""
text = one(text, old_exports, new_exports, 'Session helper export')

for marker in (
    'storedBroadcastAirtime',
    "reason: 'terminal-stored-airtime-mismatch'",
    'previousOutputFacts = null',
    "reason: 'previous-b-end-closure-incomplete'",
    "reason: 'previous-request-not-direct-b'",
    "reason: 'previous-output-not-direct'",
    'function inspectPreviousBEndOutput(historyMessages, sendIndex)',
    'const integrity = structure.responseEnvelopeIntegrity(content, pending);',
    'const issues = structure.validateStructure(content, pending);',
    'const previousOutputFacts = base?.lastMode === \'B_END\'',
):
    if marker not in text:
        raise SystemExit(f'missing closure-gate post-patch marker: {marker}')

for forbidden in (
    'state.narrativeTimestamp = state.broadcastAirtime',
    'sourceHandoffEligible',
):
    if forbidden == 'sourceHandoffEligible':
        helper = text.split('function derivePostBEndClockEligibility', 1)[1].split('function prepareTurn', 1)[0]
        if forbidden in helper:
            raise SystemExit('clock eligibility depends on Source Handoff')
    elif forbidden in text:
        raise SystemExit(f'forbidden coupling introduced: {forbidden}')

LATEST.write_text(text, encoding='utf-8')
INSTALL.write_text(text, encoding='utf-8')
print('SimCore v0.64.6 pre-live closure-completion eligibility gate applied')
