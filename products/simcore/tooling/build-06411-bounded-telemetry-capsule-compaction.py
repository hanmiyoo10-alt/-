#!/usr/bin/env python3
from pathlib import Path
import re

VERSION_FROM = '0.64.10'
VERSION_TO = '0.64.11'
RELEASE_NAME = 'Bounded Telemetry Capsule Compaction'
FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06411_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


def wrap_last_function_before_exports(text, name, rich_name, wrapper, label):
    marker = f'function {name}('
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f'06411_PATCH_ANCHOR_INVALID {label}-fn count={count}')
    start = text.index(marker)
    end = text.index('\n\nmodule.exports =', start)
    original = text[start:end]
    renamed = original.replace(f'function {name}(', f'function {rich_name}(', 1)
    return text[:start] + renamed + '\n\n' + wrapper.strip() + text[end:]


RELEASE_NOTE = '''// v0.64.11 Bounded Telemetry Capsule Compaction:
// - Repairs the confirmed v0.64.10 RUNTIME_TELEMETRY_CAPSULE_OVERSIZE blocker without raising the frozen 16,384-character durable handoff cap
// - Keeps rich same-generation runtime-prompt/request-topology observers intact and serializes dedicated bounded reload-handoff representations only
// - Runtime-prompt handoff retains fixed identity facts plus at most 64 leading line summaries; no raw prompt or dense per-character prefix hash array is persisted
// - Request-topology handoff retains at most 64 compact message signatures plus bounded system0 head/tail edge hashes; no raw chat/system body is persisted
// - First post-reload comparison truthfully labels LINE_BOUND / COMPLETE_PREFIX / PREFIX_FLOOR precision; PREFIX_FLOOR cannot mutate cache trajectory as an exact regression
// - The first natural post-reload request reseeds the untouched rich trackers, so the next same-generation request returns to existing exact observer behavior
// - Checkpoint enforces component budgets 4,096 / 6,144 / 2,048 chars and the existing whole-capsule 16,384-character authority before SESSION/HOST_LOCAL I/O
// - Host-local one-shot mailbox, 10-minute TTL, exact location guard, MEMORY -> SESSION -> HOST_LOCAL priority and consume-before-adopt semantics remain unchanged
// - Provider cache remains UNVERIFIED; M2-3 and unrelated semantic owners remain frozen through 06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
//
'''

PROMPT_WRAPPER = r'''
const MAX_HANDOFF_PROMPT_LINES = 64;
const MAX_HANDOFF_TRACKER_KEY_CHARS = 512;
const RUNTIME_PROMPT_HANDOFF_BUDGET = 4096;

function handoffFNV1a32(value) {
  const text = String(value == null ? '' : value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function boundedPromptReason(line) {
  const raw = String(promptChangeReason('', String(line || '')) || 'other');
  return raw.length <= 48 ? raw : 'other';
}

function buildRuntimePromptHandoffV2(key, text, richState) {
  const trackerKey = String(key || '');
  if (!trackerKey || trackerKey.length > MAX_HANDOFF_TRACKER_KEY_CHARS) {
    return Object.freeze({ version: 2, disposition: 'IDENTITY_UNREPRESENTABLE' });
  }
  const value = String(text == null ? '' : text);
  const lines = value ? value.split('\n') : [];
  const retained = lines.slice(0, MAX_HANDOFF_PROMPT_LINES).map((line) => Object.freeze([
    line.length,
    handoffFNV1a32(line),
    boundedPromptReason(line),
  ]));
  const identity = richState?.identityMode === 'COMPILER_TIERS' && richState?.identity?.source === 'COMPILER_TIERS'
    ? richState.identity
    : null;
  const out = Object.freeze({
    version: 2,
    disposition: 'OK',
    key: trackerKey,
    chars: value.length,
    fullHash: handoffFNV1a32(value),
    lineCount: lines.length,
    retainedLines: Object.freeze(retained),
    identity,
    identityMode: identity ? 'COMPILER_TIERS' : null,
    precision: lines.length > MAX_HANDOFF_PROMPT_LINES ? 'PREFIX_FLOOR' : 'LINE_BOUND',
  });
  let chars = 0;
  try { chars = JSON.stringify(out).length; } catch (_) { chars = RUNTIME_PROMPT_HANDOFF_BUDGET + 1; }
  if (chars > RUNTIME_PROMPT_HANDOFF_BUDGET) return Object.freeze({ version: 2, disposition: 'COMPONENT_OVERSIZE', chars });
  return out;
}

function buildRuntimePromptCacheProbeFromHandoffV2(handoff, currentText) {
  const current = String(currentText == null ? '' : currentText);
  if (!handoff || Number(handoff.version) !== 2 || handoff.disposition !== 'OK' || !Array.isArray(handoff.retainedLines)) {
    return buildRuntimePromptCacheProbe(null, current);
  }
  const currentLines = current ? current.split('\n') : [];
  const previousChars = Math.max(0, Number(handoff.chars || 0));
  const stable = previousChars === current.length && Number(handoff.fullHash) === handoffFNV1a32(current);
  if (stable) {
    return {
      baseline: false, stable: true, previousChars, currentChars: current.length,
      stablePrefixChars: current.length, stablePrefixPercent: 100,
      stablePrefixLines: Math.min(Number(handoff.lineCount || 0), currentLines.length),
      firstChangedLine: null, changedLineSlots: 0, reason: 'stable',
      continuitySource: 'HANDOFF_COMPACT_V2', precision: 'EXACT_IDENTITY', prefixIsFloor: false,
    };
  }
  const retained = handoff.retainedLines;
  const limit = Math.min(retained.length, currentLines.length);
  let prefixLines = 0;
  let prefixChars = 0;
  while (prefixLines < limit) {
    const prior = retained[prefixLines];
    const line = currentLines[prefixLines];
    if (!Array.isArray(prior) || Number(prior[0]) !== line.length || Number(prior[1]) !== handoffFNV1a32(line)) break;
    prefixChars += line.length + (prefixLines < Number(handoff.lineCount || 0) - 1 ? 1 : 0);
    prefixLines += 1;
  }
  const retainedAllMatched = prefixLines === retained.length;
  const unresolvedAfterRetained = retainedAllMatched && Number(handoff.lineCount || 0) > retained.length;
  const precision = unresolvedAfterRetained ? 'PREFIX_FLOOR' : 'LINE_BOUND';
  const firstChangedLine = unresolvedAfterRetained ? null : prefixLines;
  const denominator = Math.max(previousChars, current.length, 1);
  const priorReason = firstChangedLine == null ? null : retained[firstChangedLine]?.[2];
  const currentReason = firstChangedLine == null || currentLines[firstChangedLine] == null ? null : boundedPromptReason(currentLines[firstChangedLine]);
  return {
    baseline: false, stable: false, previousChars, currentChars: current.length,
    stablePrefixChars: prefixChars,
    stablePrefixPercent: (prefixChars / denominator) * 100,
    stablePrefixLines: prefixLines,
    firstChangedLine,
    changedLineSlots: firstChangedLine == null ? 0 : 1,
    reason: currentReason || priorReason || (unresolvedAfterRetained ? 'unresolved-after-retained-prefix' : 'other'),
    continuitySource: 'HANDOFF_COMPACT_V2', precision, prefixIsFloor: unresolvedAfterRetained,
  };
}

function createRuntimePromptCacheTracker(contract = null) {
  const rich = createRuntimePromptCacheTrackerRich(contract);
  let handoff = null;
  let lastKey = null;
  let lastText = null;
  return Object.freeze({
    observe(key, currentText, extra = null) {
      const currentKey = String(key || '');
      if (handoff && handoff.disposition === 'OK' && String(handoff.key || '') === currentKey) {
        const probe = buildRuntimePromptCacheProbeFromHandoffV2(handoff, currentText);
        rich.observe(key, currentText, extra);
        lastKey = currentKey;
        lastText = String(currentText == null ? '' : currentText);
        handoff = null;
        return probe;
      }
      const probe = rich.observe(key, currentText, extra);
      lastKey = currentKey;
      lastText = String(currentText == null ? '' : currentText);
      handoff = null;
      return probe;
    },
    exportState() { return rich.exportState(); },
    exportHandoffState() {
      if (!lastKey || lastText == null) return null;
      return buildRuntimePromptHandoffV2(lastKey, lastText, rich.exportState());
    },
    importState(state) {
      if (state && Number(state.version) === 2) {
        if (state.disposition !== 'OK' || typeof state.key !== 'string' || !state.key) return false;
        handoff = state;
        lastKey = null;
        lastText = null;
        return true;
      }
      handoff = null;
      return rich.importState(state);
    },
    importHandoffState(state) { return this.importState(state); },
    reset() { handoff = null; lastKey = null; lastText = null; return rich.reset(); },
  });
}
'''

TOPOLOGY_WRAPPER = r'''
const MAX_HANDOFF_TOPOLOGY_SIGNATURES = 64;
const MAX_HANDOFF_SYSTEM_HEAD_BLOCKS = 8;
const MAX_HANDOFF_SYSTEM_TAIL_BLOCKS = 8;
const REQUEST_TOPOLOGY_HANDOFF_BUDGET = 6144;

function topologyTuple(sig) {
  const role = String(sig?.role || '');
  const kind = String(sig?.kind || '');
  const hash = String(sig?.hash || '');
  if (!role || role.length > 32 || kind.length > 32 || hash.length > 64) return null;
  return Object.freeze([role, kind, Math.max(0, Number(sig?.chars || 0)), hash]);
}

function topologyTupleToSignature(row) {
  if (!Array.isArray(row) || row.length < 4) return null;
  const role = String(row[0] || '');
  const kind = String(row[1] || '');
  const hash = String(row[3] || '');
  if (!role || role.length > 32 || kind.length > 32 || hash.length > 64) return null;
  return { role, kind, chars: Math.max(0, Number(row[2] || 0)), hash };
}

function compactSystem0Handoff(sketch) {
  if (!sketch) return null;
  const blockChars = Math.max(1, Number(sketch.blockChars || 512));
  const chars = Math.max(0, Number(sketch.chars || 0));
  return Object.freeze({
    chars,
    blockChars,
    totalBlocks: Math.ceil(chars / blockChars),
    headBlocks: Object.freeze((Array.isArray(sketch.headBlocks) ? sketch.headBlocks : []).slice(0, MAX_HANDOFF_SYSTEM_HEAD_BLOCKS).map(String)),
    tailBlocks: Object.freeze((Array.isArray(sketch.tailBlocks) ? sketch.tailBlocks : []).slice(0, MAX_HANDOFF_SYSTEM_TAIL_BLOCKS).map(String)),
  });
}

function buildRequestTopologyHandoffV3(saved) {
  const key = String(saved?.key || '');
  const previous = saved?.previous;
  if (!key || key.length > 512 || !previous || !Array.isArray(previous.signatures)) {
    return Object.freeze({ version: 3, disposition: 'IDENTITY_UNREPRESENTABLE' });
  }
  const tuples = [];
  for (const sig of previous.signatures.slice(0, MAX_HANDOFF_TOPOLOGY_SIGNATURES)) {
    const tuple = topologyTuple(sig);
    if (!tuple) return Object.freeze({ version: 3, disposition: 'IDENTITY_UNREPRESENTABLE' });
    tuples.push(tuple);
  }
  const out = Object.freeze({
    version: 3,
    disposition: 'OK',
    key,
    at: Number(previous.at || 0),
    totalMessages: previous.signatures.length,
    totalChars: Math.max(0, Number(previous.totalChars || 0)),
    currentUserIndex: Number(previous.currentUserIndex ?? -1),
    runtimeIndex: Number(previous.runtimeIndex ?? -1),
    leadingSystemMessages: Math.max(0, Number(previous.leadingSystemMessages || 0)),
    signatures: Object.freeze(tuples),
    requestFingerprint: requestFingerprint(previous.signatures),
    familyId: familyFingerprint(previous.signatures),
    system0: compactSystem0Handoff(previous.system0Sketch),
    precision: previous.signatures.length > MAX_HANDOFF_TOPOLOGY_SIGNATURES ? 'PREFIX_FLOOR' : 'COMPLETE_PREFIX',
  });
  let chars = 0;
  try { chars = JSON.stringify(out).length; } catch (_) { chars = REQUEST_TOPOLOGY_HANDOFF_BUDGET + 1; }
  if (chars > REQUEST_TOPOLOGY_HANDOFF_BUDGET) return Object.freeze({ version: 3, disposition: 'COMPONENT_OVERSIZE', chars });
  return out;
}

function hostPrefixProbeFromHandoffV3(handoff, currentSketch, previousSignature, currentSignature, previousFamilyId, currentFamilyId) {
  if (!handoff?.system0 || !currentSketch) return buildHostPrefixProbe(null, currentSketch, previousSignature, currentSignature, previousFamilyId, currentFamilyId, false);
  if (sameSignature(previousSignature, currentSignature)) {
    return buildHostPrefixProbe(handoff.system0, currentSketch, previousSignature, currentSignature, previousFamilyId, currentFamilyId, false);
  }
  const prior = handoff.system0;
  const block = Math.max(1, Number(prior.blockChars || currentSketch.blockChars || 512));
  const currentHead = Array.isArray(currentSketch.headBlocks) ? currentSketch.headBlocks : [];
  const currentTail = Array.isArray(currentSketch.tailBlocks) ? currentSketch.tailBlocks : [];
  let head = 0;
  while (head < Math.min(prior.headBlocks.length, currentHead.length) && String(prior.headBlocks[head]) === String(currentHead[head])) head += 1;
  let tail = 0;
  while (tail < Math.min(prior.tailBlocks.length, currentTail.length) && String(prior.tailBlocks[tail]) === String(currentTail[tail])) tail += 1;
  const edgesMatch = head === prior.headBlocks.length && tail === prior.tailBlocks.length;
  if (edgesMatch && Number(prior.totalBlocks || 0) > head + tail) {
    return Object.freeze({
      previousSignature: compactSignature(previousSignature), currentSignature: compactSignature(currentSignature),
      previousFamilyId: previousFamilyId || null, currentFamilyId: currentFamilyId || null,
      status: 'INTERIOR_CHANGED_UNLOCALIZED', shape: 'INTERIOR_CHANGE', confidence: 'BOUNDED',
      deltaChars: Number(currentSketch.chars || 0) - Number(prior.chars || 0),
      commonHeadChars: head * block, commonTailChars: tail * block,
      previousChangedChars: null, currentChangedChars: null, bounded: true,
    });
  }
  const base = buildHostPrefixProbe(prior, currentSketch, previousSignature, currentSignature, previousFamilyId, currentFamilyId, false);
  return Object.freeze({ ...base, confidence: base?.status === 'STABLE' ? base.confidence : 'BOUNDED', bounded: true });
}

function buildTopologyProbeFromHandoffV3(handoff, key, messages, extra = null) {
  const list = Array.isArray(messages) ? messages : [];
  const signatures = list.map((row) => messageSignature(row));
  let totalChars = 0;
  let currentUserIndex = -1;
  for (let i = 0; i < signatures.length; i += 1) {
    totalChars += Number(signatures[i].chars || 0);
    if (signatures[i].role === 'user') currentUserIndex = i;
  }
  const runtimeIndex = Number.isInteger(Number(extra?.runtimeIndex)) ? Number(extra.runtimeIndex) : (list.length ? list.length - 1 : -1);
  const leadingSystemMessages = leadingSystemCount(signatures);
  const currentSystem0Sketch = leadingSystemMessages > 0 ? buildSystem0Sketch(list[0]) : null;
  const at = Number.isFinite(Number(extra?.at)) ? Number(extra.at) : Date.now();
  const locationKey = String(extra?.locationKey || '');
  const priorSignatures = (Array.isArray(handoff.signatures) ? handoff.signatures : []).map(topologyTupleToSignature).filter(Boolean);
  let commonMessages = 0;
  let commonChars = 0;
  const limit = Math.min(priorSignatures.length, signatures.length);
  while (commonMessages < limit && sameSignature(priorSignatures[commonMessages], signatures[commonMessages])) {
    commonChars += Number(signatures[commonMessages].chars || 0);
    commonMessages += 1;
  }
  const currentRequestFingerprint = requestFingerprint(signatures);
  const exactIdentity = Number(handoff.totalMessages || 0) === signatures.length && String(handoff.requestFingerprint || '') === String(currentRequestFingerprint || '');
  const retainedAllMatched = commonMessages === priorSignatures.length;
  const prefixFloor = !exactIdentity && retainedAllMatched && Number(handoff.totalMessages || 0) > priorSignatures.length;
  let firstChangeIndex = null;
  if (!exactIdentity && !prefixFloor && (commonMessages < limit || Number(handoff.totalMessages || 0) !== signatures.length)) firstChangeIndex = commonMessages;
  const stable = exactIdentity;
  const previousRole = firstChangeIndex == null ? null : (priorSignatures[firstChangeIndex]?.role || 'END');
  const currentRole = firstChangeIndex == null ? null : (signatures[firstChangeIndex]?.role || 'END');
  const previousBreak = firstChangeIndex == null ? null : priorSignatures[firstChangeIndex];
  const currentBreak = firstChangeIndex == null ? null : signatures[firstChangeIndex];
  const mutation = firstChangeIndex == null ? 'NONE' : mutationShape(priorSignatures, signatures, firstChangeIndex);
  const currentBreakFingerprint = currentBreak ? outputCompatibleFingerprint(list[firstChangeIndex]) : null;
  const cadenceMs = Number(handoff.at || 0) > 0 ? Math.max(0, at - Number(handoff.at || 0)) : null;
  const ratio = totalChars > 0 ? Math.max(0, Math.min(100, (commonChars / totalChars) * 100)) : 100;
  const attribution = breakAttribution(firstChangeIndex, currentUserIndex, runtimeIndex, leadingSystemMessages, Number(handoff.leadingSystemMessages || 0), false, stable);
  const exposureChars = Math.max(0, totalChars - commonChars);
  const exposureRatio = totalChars > 0 ? Math.max(0, Math.min(100, (exposureChars / totalChars) * 100)) : 0;
  const currentFamilyId = familyFingerprint(signatures);
  const previousFamilyId = String(handoff.familyId || '') || null;
  const hostPrefixProbe = hostPrefixProbeFromHandoffV3(handoff, currentSystem0Sketch, priorSignatures[0] || null, signatures[0] || null, previousFamilyId, currentFamilyId);
  return Object.freeze({
    baseline: false, stable, at, cadenceMs,
    messages: signatures.length, previousMessages: Number(handoff.totalMessages || 0),
    totalChars, previousChars: Number(handoff.totalChars || 0),
    commonMessages, commonChars, commonRatio: ratio, firstChangeIndex, previousRole, currentRole,
    previousBreakSignature: compactSignature(previousBreak), currentBreakSignature: compactSignature(currentBreak),
    mutationShape: mutation, currentBreakFingerprint, locationKey,
    currentUserIndex, runtimeIndex, leadingSystemMessages,
    breakOwner: attribution.owner, breakZone: attribution.zone,
    exposureChars, exposureRatio,
    currentUserPosition: relativePosition(currentUserIndex, firstChangeIndex, false, stable),
    runtimePosition: relativePosition(runtimeIndex, firstChangeIndex, false, stable),
    retainedBodies: false, signatureKind: 'role+kind+chars+fnv1a32',
    currentUserSignature: currentUserIndex >= 0 ? signatureKey(signatures[currentUserIndex]) : 'none',
    requestFingerprint: currentRequestFingerprint,
    familyId: currentFamilyId, previousFamilyId, hostPrefixProbe,
    precision: exactIdentity ? 'EXACT_IDENTITY' : (prefixFloor ? 'PREFIX_FLOOR' : 'COMPLETE_PREFIX'),
    continuitySource: 'HANDOFF_COMPACT_V3',
    prefixIsFloor: prefixFloor,
    firstChangeResolved: !prefixFloor,
  });
}

function createRequestTopologyTracker() {
  const rich = createRequestTopologyTrackerRich();
  let handoff = null;
  return Object.freeze({
    observe(key, messages, extra = null) {
      const currentKey = String(key || '');
      if (handoff && handoff.disposition === 'OK' && String(handoff.key || '') === currentKey) {
        const probe = buildTopologyProbeFromHandoffV3(handoff, key, messages, extra);
        rich.observe(key, messages, extra);
        handoff = null;
        return probe;
      }
      handoff = null;
      return rich.observe(key, messages, extra);
    },
    exportState() { return rich.exportState(); },
    exportHandoffState() { return buildRequestTopologyHandoffV3(rich.exportState()); },
    importState(state) {
      if (state && Number(state.version) === 3) {
        if (state.disposition !== 'OK' || typeof state.key !== 'string' || !state.key || !Array.isArray(state.signatures)) return false;
        handoff = state;
        return true;
      }
      handoff = null;
      return rich.importState(state);
    },
    importHandoffState(state) { return this.importState(state); },
    reset() { handoff = null; return rich.reset(); },
  });
}
'''

TRAJECTORY_WRAPPER = r'''
function createCacheCandidateTracker() {
  const rich = createCacheCandidateTrackerRich();
  return Object.freeze({
    observe(key, topology, extra = null) {
      if (topology?.continuitySource === 'HANDOFF_COMPACT_V3' && topology?.precision === 'PREFIX_FLOOR') {
        const saved = rich.exportState()?.state || null;
        return Object.freeze({
          status: saved?.status || 'OBSERVING', familyId: saved?.familyId || String(topology?.familyId || 'none'),
          familyReset: false, attempts: Number(saved?.attempts || 0), distinct: Number(saved?.distinct || 0),
          distinctObservation: false, lastObservation: 'SKIPPED_BOUNDED_REOBSERVE', window: 3,
          stableFloorChars: saved?.stableFloorChars ?? null, stableFloorMessages: saved?.stableFloorMessages ?? null,
          movingFrontierChars: Number(saved?.movingFrontierChars || 0), movingFrontierMessages: Number(saved?.movingFrontierMessages || 0),
          frontierStreak: Number(saved?.frontierStreak || 0), divergenceCount: Number(saved?.divergenceCount || 0),
          regressionStreak: Number(saved?.regressionStreak || 0), cadenceEmaMs: saved?.cadenceEmaMs ?? null,
          guard: 'SKIPPED_BOUNDED_REOBSERVE',
        });
      }
      return rich.observe(key, topology, extra);
    },
    exportState() { return rich.exportState(); },
    importState(state) { return rich.importState(state); },
    reset() { return rich.reset(); },
  });
}
'''


def patch(text):
    text = replace_once(text, '//@version 0.64.10', '//@version 0.64.11', 'header-version')
    text = replace_once(text, "const SIMCORE_RUNTIME_VERSION = '0.64.10';", "const SIMCORE_RUNTIME_VERSION = '0.64.11';", 'runtime-version')
    text = replace_once(text, "const HOST_COMPAT_VERSION = '0.64.10';", "const HOST_COMPAT_VERSION = '0.64.11';", 'host-compat-version')
    text = replace_once(text, '// v0.64.10 Host-Local One-Shot Telemetry Handoff:', RELEASE_NOTE + '// v0.64.10 Host-Local One-Shot Telemetry Handoff:', 'release-note')

    text = wrap_last_function_before_exports(text, 'createRuntimePromptCacheTracker', 'createRuntimePromptCacheTrackerRich', PROMPT_WRAPPER, 'runtime-prompt')
    text = wrap_last_function_before_exports(text, 'createRequestTopologyTracker', 'createRequestTopologyTrackerRich', TOPOLOGY_WRAPPER, 'request-topology')
    text = wrap_last_function_before_exports(text, 'createCacheCandidateTracker', 'createCacheCandidateTrackerRich', TRAJECTORY_WRAPPER, 'cache-trajectory')

    text = replace_once(
        text,
        '        runtimePromptCache: runtimePromptCache.exportState(),\n        requestTopology: requestTopology.exportState(),\n        cacheCandidates: cacheCandidates.exportState(),',
        "        runtimePromptCache: runtimePromptCache.exportHandoffState(),\n        requestTopology: requestTopology.exportHandoffState(),\n        cacheCandidates: cacheCandidates.exportState(),",
        'checkpoint-handoff-exporters',
    )

    text = replace_once(
        text,
        "      const capsule = runtimeTelemetryRules.capture({\n        sourceVersion: SIMCORE_RUNTIME_VERSION,",
        "      const promptHandoff = runtimePromptCache.exportHandoffState();\n      const topologyHandoff = requestTopology.exportHandoffState();\n      const trajectoryHandoff = cacheCandidates.exportState();\n      const componentChars = (value) => { try { return JSON.stringify(value).length; } catch (_) { return Number.POSITIVE_INFINITY; } };\n      const promptHandoffChars = componentChars(promptHandoff);\n      const topologyHandoffChars = componentChars(topologyHandoff);\n      const trajectoryHandoffChars = componentChars(trajectoryHandoff);\n      const compactionFailure = !promptHandoff || promptHandoff?.disposition !== 'OK' || promptHandoffChars > 4096\n        ? 'RUNTIME_PROMPT'\n        : (!topologyHandoff || topologyHandoff?.disposition !== 'OK' || topologyHandoffChars > 6144\n          ? 'REQUEST_TOPOLOGY'\n          : (trajectoryHandoffChars > 2048 ? 'CACHE_TRAJECTORY' : null));\n      if (compactionFailure) {\n        const probe = Object.freeze({ trigger: normalizedTrigger, memory: 'SKIPPED', session: 'SKIPPED', sessionRoot: 'NONE', fallbackFrom: null, attempted: '', hostLocal: 'SKIPPED', hostElapsedMs: 0, host: runtimeTelemetryRules.diagnostics().host || null, serialization: 'COMPACTION_FAILED', serializedChars: 0, capsuleFormat: 'COMPACT_V2', promptHandoffChars, topologyHandoffChars, trajectoryHandoffChars, compactionFailure, retainedBodies: false });\n        lastTelemetryCheckpointProbe = probe;\n        return probe;\n      }\n      const capsule = runtimeTelemetryRules.capture({\n        sourceVersion: SIMCORE_RUNTIME_VERSION,",
        'checkpoint-component-budget-preflight',
    )
    text = replace_once(text, '        runtimePromptCache: runtimePromptCache.exportHandoffState(),\n        requestTopology: requestTopology.exportHandoffState(),\n        cacheCandidates: cacheCandidates.exportState(),', '        runtimePromptCache: promptHandoff,\n        requestTopology: topologyHandoff,\n        cacheCandidates: trajectoryHandoff,', 'checkpoint-precomputed-components')

    text = replace_once(
        text,
        "        serialization: write?.serialization || 'UNKNOWN',\n        serializedChars: Number(write?.serializedChars || 0),",
        "        serialization: write?.serialization || 'UNKNOWN',\n        serializedChars: Number(write?.serializedChars || 0),\n        capsuleFormat: 'COMPACT_V2',\n        promptHandoffChars, topologyHandoffChars, trajectoryHandoffChars,\n        promptPrecision: promptHandoff?.precision || 'UNKNOWN',\n        topologyPrecision: topologyHandoff?.precision || 'UNKNOWN',",
        'checkpoint-size-attribution',
    )

    text = replace_once(
        text,
        "    const prefixLabel = !probeFresh || !cacheProbe\n      ? 'n/a'\n      : (cacheProbe.baseline\n        ? 'BASELINE'\n        : `${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${cacheProbe.reason || 'other'}`);",
        "    const prefixLabel = !probeFresh || !cacheProbe\n      ? 'n/a'\n      : (cacheProbe.baseline\n        ? 'BASELINE'\n        : (cacheProbe.precision === 'PREFIX_FLOOR'\n          ? `>=${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · HANDOFF_LINE_FLOOR`\n          : (cacheProbe.precision === 'LINE_BOUND'\n            ? `${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · HANDOFF_LINE_BOUND · ${cacheProbe.reason || 'other'}`\n            : `${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${cacheProbe.reason || 'other'}`)));",
        'prompt-floor-diagnostic',
    )

    text = replace_once(
        text,
        "      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n      `Session surface:",
        "      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n      `Telemetry capsule: ${lastTelemetryCheckpointProbe ? `${lastTelemetryCheckpointProbe.capsuleFormat || 'LEGACY'} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0).toLocaleString('en-US')}/16,384 chars · prompt ${Number(lastTelemetryCheckpointProbe.promptHandoffChars || 0).toLocaleString('en-US')}/4,096 · topology ${Number(lastTelemetryCheckpointProbe.topologyHandoffChars || 0).toLocaleString('en-US')}/6,144 · trajectory ${Number(lastTelemetryCheckpointProbe.trajectoryHandoffChars || 0).toLocaleString('en-US')}/2,048` : 'n/a'}`,\n      `Handoff precision: ${cacheProbe?.continuitySource === 'HANDOFF_COMPACT_V2' ? `prompt ${cacheProbe.precision || 'UNKNOWN'}` : 'prompt SAME_GENERATION'} · ${topologyProbe?.continuitySource === 'HANDOFF_COMPACT_V3' ? `topology ${topologyProbe.precision || 'UNKNOWN'}` : 'topology SAME_GENERATION'}`,\n      `Session surface:",
        'capsule-diagnostic-lines',
    )

    old_card = "    version: '0.64.10',\n    name: 'Host-Local One-Shot Telemetry Handoff',\n    scenario: '06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT',"
    new_card = "    version: '0.64.11',\n    name: 'Bounded Telemetry Capsule Compaction',\n    scenario: '06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT',"
    text = replace_once(text, old_card, new_card, 'operator-card-identity')
    text = replace_once(text,
        "      '브라우저 sessionStorage를 쓸 수 없을 때 Host 로컬 저장소를 telemetry handoff 대체 경로로 사용',\n      '저장 내용은 10분 TTL / location 일치 / 16KB 이하의 메타데이터-only capsule으로 제한',\n      '같은 location의 capsule은 안전하게 지운 뒤에만 한 번 채택',\n      'SESSION 또는 HOST_LOCAL이 실제 WRITTEN일 때만 새로고침 실험 진행',",
        "      '같은 세대의 정밀 관측은 유지하고 reload handoff만 bounded compact capsule로 직렬화',\n      'prompt 64줄 / topology 64 signatures / system0 8+8 edge hashes 상한과 전체 16KB cap을 함께 강제',\n      '첫 reload 관측의 PREFIX_FLOOR는 정확값처럼 trajectory를 변경하지 않고 다음 자연 요청부터 exact 복귀',\n      'COMPACTION_FAILED 없이 HOST_LOCAL WRITTEN일 때만 새로고침 실험 진행',",
        'operator-card-summary')
    text = replace_once(text,
        "    recent: Object.freeze([\n      Object.freeze({ version: '0.64.10',",
        "    recent: Object.freeze([\n      Object.freeze({ version: '0.64.11', name: 'Bounded Telemetry Capsule Compaction', bullets: Object.freeze(['reload handoff만 bounded compact export', 'PREFIX_FLOOR trajectory guard + 다음 요청 exact 복귀']) }),\n      Object.freeze({ version: '0.64.10',",
        'operator-card-recent-add')
    text = replace_once(text,
        "      Object.freeze({ version: '0.64.8', name: 'Output-Complete Telemetry Checkpoint Repair', bullets: Object.freeze(['정상 출력 완료 뒤 telemetry checkpoint 추가', 'checkpoint 결과를 Last Turn Diagnostic에 표시']) }),\n",
        '',
        'operator-card-recent-trim')

    required = [
        'function createRuntimePromptCacheTrackerRich(',
        'function createRequestTopologyTrackerRich(',
        'function createCacheCandidateTrackerRich(',
        'exportHandoffState()',
        "continuitySource: 'HANDOFF_COMPACT_V2'",
        "continuitySource: 'HANDOFF_COMPACT_V3'",
        "guard: 'SKIPPED_BOUNDED_REOBSERVE'",
        "capsuleFormat: 'COMPACT_V2'",
        '06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT',
    ]
    for needle in required:
        if needle not in text:
            raise SystemExit(f'06411_PATCH_POSTCONDITION_MISSING {needle}')
    if text.count('const MAX_SERIALIZED_CHARS = 16384;') != 1:
        raise SystemExit('06411_PATCH_POSTCONDITION_INVALID serialized-cap')
    if 'MAX_SERIALIZED_CHARS = 32768' in text or 'MAX_SERIALIZED_CHARS = 65536' in text:
        raise SystemExit('06411_PATCH_POSTCONDITION_INVALID cap-raised')
    return text


def main():
    before = []
    for path in FILES:
        if not path.exists():
            raise SystemExit(f'06411_SOURCE_MISSING {path}')
        source = path.read_text(encoding='utf-8')
        if '//@version 0.64.10' not in source:
            raise SystemExit(f'06411_SOURCE_VERSION_INVALID {path}')
        before.append(source)
    if before[0] != before[1]:
        raise SystemExit('06411_SOURCE_LATEST_INSTALL_MISMATCH')
    updated = patch(before[0])
    for path in FILES:
        path.write_text(updated, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        raise SystemExit('06411_OUTPUT_LATEST_INSTALL_MISMATCH')
    print('06411_BUILDER_PASS')


if __name__ == '__main__':
    main()
