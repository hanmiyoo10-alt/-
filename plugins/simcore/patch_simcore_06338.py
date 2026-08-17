from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    assert count == 1, f'{label}: expected 1 anchor, got {count}'
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    assert count == 1, f'{label}: expected 1 regex match, got {count}'
    return out


runtime_cache_tracker = r'''function cacheSketch(text) {
  const value = String(text == null ? '' : text);
  const prefixHashes = new Array(value.length);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    prefixHashes[i] = h >>> 0;
  }
  const lines = value ? value.split('\n') : [];
  const lineHashes = lines.map((line) => {
    let x = 0x811c9dc5;
    for (let i = 0; i < line.length; i++) {
      x ^= line.charCodeAt(i);
      x = Math.imul(x, 0x01000193);
    }
    return x >>> 0;
  });
  const lineReasons = lines.map((line) => promptChangeReason('', line));
  return Object.freeze({ version: 1, chars: value.length, prefixHashes, lineHashes, lineReasons });
}

function buildRuntimePromptCacheProbeFromSketch(sketch, currentText) {
  const current = String(currentText || '');
  if (!sketch || Number(sketch.version) !== 1 || !Array.isArray(sketch.prefixHashes)) {
    return buildRuntimePromptCacheProbe(null, current);
  }
  const previousChars = Math.max(0, Number(sketch.chars || 0));
  const limit = Math.min(previousChars, current.length, sketch.prefixHashes.length);
  let h = 0x811c9dc5;
  let prefixChars = 0;
  for (let i = 0; i < limit; i++) {
    h ^= current.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    if ((h >>> 0) !== Number(sketch.prefixHashes[i])) break;
    prefixChars = i + 1;
  }
  const stable = previousChars === current.length && prefixChars === current.length;
  const denominator = Math.max(previousChars, current.length, 1);
  const currentLines = current ? current.split('\n') : [];
  const currentLineHashes = currentLines.map((line) => {
    let x = 0x811c9dc5;
    for (let i = 0; i < line.length; i++) {
      x ^= line.charCodeAt(i);
      x = Math.imul(x, 0x01000193);
    }
    return x >>> 0;
  });
  const previousLineHashes = Array.isArray(sketch.lineHashes) ? sketch.lineHashes : [];
  let prefixLines = 0;
  const lineLimit = Math.min(previousLineHashes.length, currentLineHashes.length);
  while (prefixLines < lineLimit && Number(previousLineHashes[prefixLines]) === Number(currentLineHashes[prefixLines])) prefixLines += 1;
  let changedLineSlots = 0;
  const maxLines = Math.max(previousLineHashes.length, currentLineHashes.length);
  for (let i = 0; i < maxLines; i++) {
    if (Number(previousLineHashes[i]) !== Number(currentLineHashes[i])) changedLineSlots += 1;
  }
  const firstChangedLine = stable ? null : prefixLines + 1;
  const previousReason = Array.isArray(sketch.lineReasons) ? sketch.lineReasons[prefixLines] : null;
  const currentReason = currentLines[prefixLines] == null ? null : promptChangeReason('', currentLines[prefixLines]);
  return {
    baseline: false,
    stable,
    previousChars,
    currentChars: current.length,
    stablePrefixChars: prefixChars,
    stablePrefixPercent: stable ? 100 : (prefixChars / denominator) * 100,
    stablePrefixLines: prefixLines,
    firstChangedLine,
    changedLineSlots,
    reason: stable ? 'stable' : (currentReason || previousReason || 'other'),
    continuitySource: 'HANDOFF_SKETCH',
  };
}

function createRuntimePromptCacheTracker(contract = null) {
  let previousText = null;
  let previousKey = null;
  let previousSketch = null;
  return Object.freeze({
    observe(key, currentText, extra = null) {
      const currentKey = String(key || '');
      let probe;
      if (previousKey === currentKey && previousText != null) probe = buildRuntimePromptCacheProbe(previousText, currentText);
      else if (previousKey === currentKey && previousSketch) probe = buildRuntimePromptCacheProbeFromSketch(previousSketch, currentText);
      else probe = buildRuntimePromptCacheProbe(null, currentText);
      probe = Object.freeze({
        ...probe,
        requestOrder: contract?.requestOrder || 'FROZEN',
        placement: contract?.runtimePromptPlacement || 'TAIL_AFTER_CURRENT_USER',
        providerCache: contract?.providerCache || 'UNVERIFIED',
        key: currentKey,
        sendIndex: Number.isInteger(Number(extra?.sendIndex)) ? Number(extra.sendIndex) : -1,
        mode: String(extra?.mode || ''),
        at: Number.isFinite(Number(extra?.at)) ? Number(extra.at) : Date.now(),
      });
      previousText = String(currentText || '');
      previousSketch = cacheSketch(previousText);
      previousKey = currentKey;
      return probe;
    },
    exportState() {
      if (!previousKey || !previousSketch) return null;
      return { version: 1, key: previousKey, sketch: previousSketch };
    },
    importState(state) {
      if (!state || Number(state.version) !== 1 || typeof state.key !== 'string' || !state.key || !state.sketch) return false;
      previousKey = state.key;
      previousText = null;
      previousSketch = state.sketch;
      return true;
    },
    reset() {
      previousText = null;
      previousKey = null;
      previousSketch = null;
    },
  });
}
module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, createRuntimePromptCacheTracker };'''

runtime_topology_and_new_modules = r'''SimCore.define("runtime-topology", function (require, module, exports) {
function exactHash(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function messageSignature(message) {
  const role = String(message?.role || '');
  const content = message?.content;
  let text = '';
  let kind = 'text';
  if (typeof content === 'string') {
    text = content;
  } else {
    kind = Array.isArray(content) ? 'array' : typeof content;
    try { text = JSON.stringify(content == null ? '' : content); }
    catch (_) { text = String(content == null ? '' : content); }
  }
  return Object.freeze({ role, kind, chars: text.length, hash: exactHash(text) });
}

function sameSignature(a, b) {
  return !!a && !!b && a.role === b.role && a.kind === b.kind && a.chars === b.chars && a.hash === b.hash;
}

function relativePosition(index, firstChangeIndex, baseline, stable) {
  if (!Number.isInteger(index) || index < 0) return 'ABSENT';
  if (baseline) return 'BASELINE';
  if (stable || firstChangeIndex == null) return 'WITHIN_COMMON_PREFIX';
  if (index < firstChangeIndex) return 'WITHIN_COMMON_PREFIX';
  if (index === firstChangeIndex) return 'AT_PREFIX_BREAK';
  return 'AFTER_PREFIX_BREAK';
}

function signatureKey(sig) {
  return `${sig.role}|${sig.kind}|${sig.chars}|${sig.hash}`;
}

function requestFingerprint(signatures) {
  return exactHash(signatures.map(signatureKey).join('\u001f'));
}

function familyFingerprint(signatures) {
  const leading = [];
  for (const sig of signatures) {
    if (sig.role !== 'system') break;
    leading.push(signatureKey(sig));
  }
  return exactHash((leading.length ? leading : signatures.slice(0, Math.min(2, signatures.length)).map(signatureKey)).join('\u001f'));
}

function clonePrevious(previous) {
  if (!previous || !Array.isArray(previous.signatures)) return null;
  return {
    at: Number(previous.at || 0),
    signatures: previous.signatures.map((sig) => ({ role: String(sig.role || ''), kind: String(sig.kind || ''), chars: Number(sig.chars || 0), hash: String(sig.hash || '') })),
    totalChars: Number(previous.totalChars || 0),
    currentUserIndex: Number(previous.currentUserIndex ?? -1),
    runtimeIndex: Number(previous.runtimeIndex ?? -1),
  };
}

function createRequestTopologyTracker() {
  let previousKey = null;
  let previous = null;
  return Object.freeze({
    observe(key, messages, extra = null) {
      const currentKey = String(key || '');
      const list = Array.isArray(messages) ? messages : [];
      const signatures = new Array(list.length);
      let totalChars = 0;
      let currentUserIndex = -1;
      for (let i = 0; i < list.length; i++) {
        const sig = messageSignature(list[i]);
        signatures[i] = sig;
        totalChars += sig.chars;
        if (sig.role === 'user') currentUserIndex = i;
      }
      const runtimeIndex = Number.isInteger(Number(extra?.runtimeIndex)) ? Number(extra.runtimeIndex) : (list.length ? list.length - 1 : -1);
      const at = Number.isFinite(Number(extra?.at)) ? Number(extra.at) : Date.now();
      const prior = previousKey === currentKey ? previous : null;
      const baseline = !prior;
      let commonMessages = 0;
      let commonChars = 0;
      let firstChangeIndex = null;
      let previousRole = null;
      let currentRole = null;
      if (prior) {
        const limit = Math.min(prior.signatures.length, signatures.length);
        while (commonMessages < limit && sameSignature(prior.signatures[commonMessages], signatures[commonMessages])) {
          commonChars += signatures[commonMessages].chars;
          commonMessages += 1;
        }
        if (commonMessages < limit || prior.signatures.length !== signatures.length) {
          firstChangeIndex = commonMessages;
          previousRole = prior.signatures[firstChangeIndex]?.role || 'END';
          currentRole = signatures[firstChangeIndex]?.role || 'END';
        }
      }
      const stable = !!prior && firstChangeIndex == null;
      const cadenceMs = prior ? Math.max(0, at - prior.at) : null;
      const ratio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (commonChars / totalChars) * 100)) : 100);
      const probe = Object.freeze({
        baseline, stable, at, cadenceMs,
        messages: signatures.length, previousMessages: prior?.signatures?.length ?? null,
        totalChars, previousChars: prior?.totalChars ?? null,
        commonMessages, commonChars, commonRatio: ratio, firstChangeIndex, previousRole, currentRole,
        currentUserIndex, runtimeIndex,
        currentUserPosition: relativePosition(currentUserIndex, firstChangeIndex, baseline, stable),
        runtimePosition: relativePosition(runtimeIndex, firstChangeIndex, baseline, stable),
        retainedBodies: false, signatureKind: 'role+kind+chars+fnv1a32',
        requestFingerprint: requestFingerprint(signatures),
        familyId: familyFingerprint(signatures),
      });
      previousKey = currentKey;
      previous = { at, signatures, totalChars, currentUserIndex, runtimeIndex };
      return probe;
    },
    exportState() {
      if (!previousKey || !previous) return null;
      return { version: 1, key: previousKey, previous: clonePrevious(previous) };
    },
    importState(state) {
      if (!state || Number(state.version) !== 1 || typeof state.key !== 'string' || !state.key) return false;
      const restored = clonePrevious(state.previous);
      if (!restored) return false;
      previousKey = state.key;
      previous = restored;
      return true;
    },
    reset() { previousKey = null; previous = null; },
  });
}

module.exports = { exactHash, messageSignature, createRequestTopologyTracker };
});

SimCore.define("runtime-cache-candidates", function (require, module, exports) {
const WINDOW = 3;
const EMA_ALPHA = 0.35;

function freshState(key, familyId) {
  return {
    version: 1,
    key, familyId,
    attempts: 0, distinct: 0,
    lastDistinctToken: null,
    status: 'BASELINE',
    window: [],
    stableFloorChars: null,
    stableFloorMessages: null,
    movingFrontierChars: 0,
    movingFrontierMessages: 0,
    frontierStreak: 0,
    divergenceCount: 0,
    regressionStreak: 0,
    cadenceEmaMs: null,
    lastAt: null,
  };
}

function cloneState(state) {
  if (!state) return null;
  return {
    version: 1,
    key: String(state.key || ''), familyId: String(state.familyId || ''),
    attempts: Number(state.attempts || 0), distinct: Number(state.distinct || 0),
    lastDistinctToken: state.lastDistinctToken == null ? null : String(state.lastDistinctToken),
    status: String(state.status || 'BASELINE'),
    window: Array.isArray(state.window) ? state.window.slice(-WINDOW).map((x) => ({ chars: Number(x.chars || 0), messages: Number(x.messages || 0) })) : [],
    stableFloorChars: state.stableFloorChars == null ? null : Number(state.stableFloorChars),
    stableFloorMessages: state.stableFloorMessages == null ? null : Number(state.stableFloorMessages),
    movingFrontierChars: Number(state.movingFrontierChars || 0),
    movingFrontierMessages: Number(state.movingFrontierMessages || 0),
    frontierStreak: Number(state.frontierStreak || 0),
    divergenceCount: Number(state.divergenceCount || 0),
    regressionStreak: Number(state.regressionStreak || 0),
    cadenceEmaMs: state.cadenceEmaMs == null ? null : Number(state.cadenceEmaMs),
    lastAt: state.lastAt == null ? null : Number(state.lastAt),
  };
}

function summarize(state, familyReset, distinctObservation) {
  return Object.freeze({
    status: state.status,
    familyId: state.familyId,
    familyReset: !!familyReset,
    attempts: state.attempts,
    distinct: state.distinct,
    distinctObservation: !!distinctObservation,
    window: WINDOW,
    stableFloorChars: state.stableFloorChars,
    stableFloorMessages: state.stableFloorMessages,
    movingFrontierChars: state.movingFrontierChars,
    movingFrontierMessages: state.movingFrontierMessages,
    frontierStreak: state.frontierStreak,
    divergenceCount: state.divergenceCount,
    regressionStreak: state.regressionStreak,
    cadenceEmaMs: state.cadenceEmaMs,
  });
}

function createCacheCandidateTracker() {
  let state = null;
  return Object.freeze({
    observe(key, topology, extra = null) {
      const currentKey = String(key || '');
      const familyId = String(topology?.familyId || 'none');
      let familyReset = false;
      if (!state || state.key !== currentKey || state.familyId !== familyId) {
        familyReset = !!state;
        state = freshState(currentKey, familyId);
      }
      state.attempts += 1;
      const sendIndex = Number.isInteger(Number(extra?.sendIndex)) ? Number(extra.sendIndex) : -1;
      const distinctToken = `${sendIndex}:${String(topology?.requestFingerprint || '')}`;
      const distinctObservation = state.lastDistinctToken !== distinctToken;
      if (!distinctObservation) return summarize(state, familyReset, false);
      state.lastDistinctToken = distinctToken;
      state.distinct += 1;
      const cadence = Number(topology?.cadenceMs);
      if (Number.isFinite(cadence) && cadence >= 0) {
        state.cadenceEmaMs = state.cadenceEmaMs == null ? cadence : (EMA_ALPHA * cadence) + ((1 - EMA_ALPHA) * state.cadenceEmaMs);
      }
      if (topology?.baseline) {
        state.status = 'BASELINE';
        state.lastAt = Number(extra?.at || topology?.at || Date.now());
        return summarize(state, familyReset, true);
      }
      const chars = Math.max(0, Number(topology?.commonChars || 0));
      const messages = Math.max(0, Number(topology?.commonMessages || 0));
      const priorFrontier = state.movingFrontierChars;
      const priorFloor = state.stableFloorChars;
      const wasEstablished = state.status === 'ESTABLISHED' || state.status === 'REGRESSED' || state.status === 'VOLATILE';
      if (wasEstablished && priorFloor != null && chars < priorFloor) {
        state.regressionStreak += 1;
        state.divergenceCount += 1;
      } else {
        state.regressionStreak = 0;
      }
      state.window.push({ chars, messages });
      if (state.window.length > WINDOW) state.window.shift();
      state.movingFrontierChars = chars;
      state.movingFrontierMessages = messages;
      state.frontierStreak = priorFrontier > 0 && chars >= priorFrontier ? state.frontierStreak + 1 : 1;
      if (state.distinct < 3) {
        state.status = 'OBSERVING';
      } else if (state.regressionStreak >= 2) {
        state.status = 'VOLATILE';
      } else if (state.regressionStreak === 1) {
        state.status = 'REGRESSED';
      } else {
        state.status = 'ESTABLISHED';
        state.stableFloorChars = Math.min(...state.window.map((x) => x.chars));
        state.stableFloorMessages = Math.min(...state.window.map((x) => x.messages));
      }
      state.lastAt = Number(extra?.at || topology?.at || Date.now());
      return summarize(state, familyReset, true);
    },
    exportState() { return state ? { version: 1, state: cloneState(state) } : null; },
    importState(saved) {
      if (!saved || Number(saved.version) !== 1) return false;
      const restored = cloneState(saved.state);
      if (!restored || !restored.key || !restored.familyId) return false;
      state = restored;
      return true;
    },
    reset() { state = null; },
  });
}
module.exports = { createCacheCandidateTracker };
});

SimCore.define("runtime-telemetry", function (require, module, exports) {
const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
const MAX_AGE_MS = 10 * 60 * 1000;

function capture(input) {
  const locationKey = String(input?.locationKey || '');
  if (!locationKey) return null;
  return Object.freeze({
    schema: 1,
    sourceVersion: String(input?.sourceVersion || ''),
    locationKey,
    capturedAt: Number(input?.capturedAt || Date.now()),
    runtimePromptCache: input?.runtimePromptCache || null,
    requestTopology: input?.requestTopology || null,
    cacheCandidates: input?.cacheCandidates || null,
  });
}

function publish(root, capsule) {
  if (!root || !capsule) return false;
  try { root[KEY] = capsule; return true; } catch (_) { return false; }
}

function claim(root) {
  if (!root) return null;
  try {
    const capsule = root[KEY] || null;
    try { delete root[KEY]; } catch (_) { root[KEY] = undefined; }
    return capsule;
  } catch (_) { return null; }
}

function validate(capsule, locationKey, now = Date.now()) {
  if (!capsule) return { accepted: false, reason: 'no-compatible-handoff', capsule: null };
  if (Number(capsule.schema) !== 1) return { accepted: false, reason: 'schema-mismatch', capsule: null };
  if (String(capsule.locationKey || '') !== String(locationKey || '')) return { accepted: false, reason: 'location-mismatch', capsule: null };
  const ageMs = Math.max(0, Number(now) - Number(capsule.capturedAt || 0));
  if (!Number.isFinite(ageMs) || ageMs > MAX_AGE_MS) return { accepted: false, reason: 'expired', ageMs, capsule: null };
  return { accepted: true, reason: 'adopted', ageMs, capsule };
}
module.exports = { capture, publish, claim, validate };
});

SimCore.define("runtime-session"'''

probe_helpers = r'''function trajectory(probe) {
  if (!probe) return 'n/a';
  const family = probe.familyId ? String(probe.familyId).slice(0, 8) : 'n/a';
  const floor = probe.stableFloorChars == null ? 'n/a' : `${Number(probe.stableFloorMessages || 0)} msgs / ${Number(probe.stableFloorChars || 0).toLocaleString('en-US')} chars`;
  const frontier = `${Number(probe.movingFrontierMessages || 0)} msgs / ${Number(probe.movingFrontierChars || 0).toLocaleString('en-US')} chars`;
  const ema = probe.cadenceEmaMs == null ? 'BASELINE' : cadence(probe.cadenceEmaMs);
  return `${probe.status || 'n/a'} · family ${family}${probe.familyReset ? ' · FAMILY_RESET' : ''} · distinct ${Number(probe.distinct || 0)} · attempts ${Number(probe.attempts || 0)} · floor ${floor} · frontier ${frontier} · streak ${Number(probe.frontierStreak || 0)} · divergence ${Number(probe.divergenceCount || 0)} · cadence EMA ${ema}`;
}

function continuity(probe) {
  if (!probe) return 'FRESH · no compatible handoff';
  if (!probe.accepted) return `FRESH · ${probe.reason || 'no-compatible-handoff'}`;
  return `ADOPTED · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}`;
}
'''

for path in FILES:
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, '//@version 0.63.37', '//@version 0.63.38', f'{path}: version')
    marker = '// v0.63.37 Cache Topology, Cadence & Output Provenance Diagnostics:'
    notes = '''// v0.63.38 Cache Trajectory & Refreshless Telemetry Continuity:\n// - Extends v0.63.37 request-topology telemetry into a memory-only same-chat trajectory: cache-family id, distinct observations versus retry attempts, rolling stable floor, moving frontier, frontier streak, divergence count and cadence EMA\n// - Adds a pure-data refreshless telemetry handoff capsule so v0.63.38 and later targeted reloads can preserve runtime-prefix sketch, prior request signatures and cache trajectory without retaining raw request bodies or adding pluginStorage/network/timer work\n// - The first upgrade from v0.63.37-or-earlier intentionally starts FRESH because those older runtimes cannot publish a handoff capsule retroactively; no prior telemetry is required\n// - Handoff is schema/location/age checked and fail-open; functions, hooks, sessions, mirror work, Core state, raw chat messages and provider cache controls are never transferred\n// - Keeps request ordering, runtime prompt bytes, provider routing/cache policy, mirror acceptance gate, host/storage/API call surface and all 17 Core generation modules frozen\n//\n'''
    text = replace_once(text, marker, notes + marker, f'{path}: release notes')

    cache_pattern = r'function createRuntimePromptCacheTracker\(contract = null\) \{.*?\n\}\nmodule\.exports = \{ promptChangeReason, buildRuntimePromptCacheProbe, createRuntimePromptCacheTracker \};'
    text = sub_once(text, cache_pattern, runtime_cache_tracker, f'{path}: runtime-cache tracker')

    topology_pattern = r'SimCore\.define\("runtime-topology", function \(require, module, exports\) \{.*?\n\}\);\n\nSimCore\.define\("runtime-session"'
    text = sub_once(text, topology_pattern, runtime_topology_and_new_modules, f'{path}: topology/modules')

    probe_export = 'module.exports = { cachePosture, cadence, topology };'
    text = replace_once(text, probe_export, probe_helpers + probe_export.replace(' };', ', trajectory, continuity };'), f'{path}: probe helpers')

    require_anchor = "  const runtimeTopologyRules = SimCore.require('runtime-topology');\n  const runtimeSessionRules = SimCore.require('runtime-session');"
    require_repl = "  const runtimeTopologyRules = SimCore.require('runtime-topology');\n  const runtimeCacheCandidateRules = SimCore.require('runtime-cache-candidates');\n  const runtimeTelemetryRules = SimCore.require('runtime-telemetry');\n  const runtimeSessionRules = SimCore.require('runtime-session');"
    text = replace_once(text, require_anchor, require_repl, f'{path}: requires')

    vars_anchor = "  let lastRuntimePromptCacheProbe = null;\n  let lastRequestTopologyProbe = null;\n  let lastTimestampCanonicalization = null;"
    vars_repl = "  let lastRuntimePromptCacheProbe = null;\n  let lastRequestTopologyProbe = null;\n  let lastCacheTrajectoryProbe = null;\n  let lastCacheCandidateCostMs = null;\n  let lastTelemetryContinuityProbe = null;\n  let lastTimestampCanonicalization = null;"
    text = replace_once(text, vars_anchor, vars_repl, f'{path}: vars')

    tracker_anchor = "  const runtimePromptCache = runtimeCacheRules.createRuntimePromptCacheTracker(runtimeContracts.cache);\n  const requestTopology = runtimeTopologyRules.createRequestTopologyTracker();\n  const runtimeSession = runtimeSessionRules.createSessionRuntime({"
    tracker_repl = "  const runtimePromptCache = runtimeCacheRules.createRuntimePromptCacheTracker(runtimeContracts.cache);\n  const requestTopology = runtimeTopologyRules.createRequestTopologyTracker();\n  const cacheCandidates = runtimeCacheCandidateRules.createCacheCandidateTracker();\n  let pendingTelemetryHandoff = runtimeTelemetryRules.claim(globalThis);\n  let telemetryAdoptionAttempted = false;\n  const runtimeSession = runtimeSessionRules.createSessionRuntime({"
    text = replace_once(text, tracker_anchor, tracker_repl, f'{path}: trackers')

    active_anchor = "      const runtimePromptKey = String(coreKey || coreLocationKey || '');\n      lastRuntimePromptCacheProbe = runtimePromptCache.observe(runtimePromptKey, runtimeBudgetText, {"
    active_repl = "      const runtimePromptKey = String(coreKey || coreLocationKey || '');\n      if (!telemetryAdoptionAttempted) {\n        telemetryAdoptionAttempted = true;\n        const adoption = runtimeTelemetryRules.validate(pendingTelemetryHandoff, runtimePromptKey, Date.now());\n        let restoredRuntimePrefix = false;\n        let restoredTopology = false;\n        let restoredTrajectory = false;\n        if (adoption.accepted && adoption.capsule) {\n          restoredRuntimePrefix = runtimePromptCache.importState(adoption.capsule.runtimePromptCache);\n          restoredTopology = requestTopology.importState(adoption.capsule.requestTopology);\n          restoredTrajectory = cacheCandidates.importState(adoption.capsule.cacheCandidates);\n        }\n        lastTelemetryContinuityProbe = Object.freeze({\n          accepted: !!adoption.accepted, reason: adoption.reason || 'no-compatible-handoff',\n          sourceVersion: adoption.capsule?.sourceVersion || null, ageMs: adoption.ageMs ?? null,\n          runtimePrefix: restoredRuntimePrefix, topology: restoredTopology, trajectory: restoredTrajectory,\n        });\n        pendingTelemetryHandoff = null;\n      }\n      lastRuntimePromptCacheProbe = runtimePromptCache.observe(runtimePromptKey, runtimeBudgetText, {"
    text = replace_once(text, active_anchor, active_repl, f'{path}: adoption')

    topology_anchor = "      lastRequestTopologyProbe = requestTopology.observe(runtimePromptKey, messages, {\n        runtimeIndex: messages.length - 1,\n        at: Number(lastRuntimePromptCacheProbe?.at || Date.now()),\n      });\n      if (perf) perf.cacheTopologyMs = perfMs(topologyStarted);\n      const pendingProbe = result.state.pending || null;"
    topology_repl = "      lastRequestTopologyProbe = requestTopology.observe(runtimePromptKey, messages, {\n        runtimeIndex: messages.length - 1,\n        at: Number(lastRuntimePromptCacheProbe?.at || Date.now()),\n      });\n      if (perf) perf.cacheTopologyMs = perfMs(topologyStarted);\n      const candidateStarted = perfNow();\n      lastCacheTrajectoryProbe = cacheCandidates.observe(runtimePromptKey, lastRequestTopologyProbe, {\n        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,\n        at: Number(lastRequestTopologyProbe?.at || Date.now()),\n      });\n      lastCacheCandidateCostMs = perfMs(candidateStarted);\n      const pendingProbe = result.state.pending || null;"
    text = replace_once(text, topology_anchor, topology_repl, f'{path}: trajectory observe')

    inactive_anchor = "      lastRuntimePromptCacheProbe = null;\n      lastRequestTopologyProbe = null;\n      runtimePromptCache.reset();\n      requestTopology.reset();"
    inactive_repl = "      lastRuntimePromptCacheProbe = null;\n      lastRequestTopologyProbe = null;\n      lastCacheTrajectoryProbe = null;\n      lastCacheCandidateCostMs = null;\n      runtimePromptCache.reset();\n      requestTopology.reset();\n      cacheCandidates.reset();"
    text = replace_once(text, inactive_anchor, inactive_repl, f'{path}: inactive reset')

    diag_vars_anchor = "    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;\n    const topologyProbe = runtimeActive ? (lastRequestTopologyProbe || null) : null;\n    const budget = runtimeActive ? (lastRuntimePromptBudget || null) : null;"
    diag_vars_repl = "    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;\n    const topologyProbe = runtimeActive ? (lastRequestTopologyProbe || null) : null;\n    const trajectoryProbe = runtimeActive ? (lastCacheTrajectoryProbe || null) : null;\n    const budget = runtimeActive ? (lastRuntimePromptBudget || null) : null;"
    text = replace_once(text, diag_vars_anchor, diag_vars_repl, f'{path}: diagnostic vars')

    diag_line_anchor = "      `Cache cadence: ${probeFresh && topologyProbe ? `previous request +${runtimeProbeRules.cadence(topologyProbe.cadenceMs)} · signature ${topologyProbe.signatureKind || 'n/a'} · raw bodies ${topologyProbe.retainedBodies ? 'RETAINED' : 'NOT RETAINED'}` : 'n/a'}`,\n      `Cache topology cost: ${requestBreakdown ? diagnosticFormatMs(requestBreakdown.cacheTopologyMs) : 'n/a'} · provider cache UNVERIFIED`,"
    diag_line_repl = "      `Cache cadence: ${probeFresh && topologyProbe ? `previous request +${runtimeProbeRules.cadence(topologyProbe.cadenceMs)} · signature ${topologyProbe.signatureKind || 'n/a'} · raw bodies ${topologyProbe.retainedBodies ? 'RETAINED' : 'NOT RETAINED'}` : 'n/a'}`,\n      `Cache trajectory: ${probeFresh ? runtimeProbeRules.trajectory(trajectoryProbe) : 'n/a'}`,\n      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n      `Cache topology cost: ${requestBreakdown ? diagnosticFormatMs(requestBreakdown.cacheTopologyMs) : 'n/a'} · candidate ${lastCacheCandidateCostMs == null ? 'n/a' : diagnosticFormatMs(lastCacheCandidateCostMs)} · provider cache UNVERIFIED`,"
    text = replace_once(text, diag_line_anchor, diag_line_repl, f'{path}: diagnostic lines')

    unload_anchor = "  await Risuai.onUnload(async () => {\n    runtimeDisposed = true;\n    runtimeEpoch += 1;\n    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);"
    unload_repl = "  await Risuai.onUnload(async () => {\n    runtimeDisposed = true;\n    runtimeEpoch += 1;\n    try {\n      runtimeTelemetryRules.publish(globalThis, runtimeTelemetryRules.capture({\n        sourceVersion: '0.63.38',\n        locationKey: String(coreKey || coreLocationKey || ''),\n        capturedAt: Date.now(),\n        runtimePromptCache: runtimePromptCache.exportState(),\n        requestTopology: requestTopology.exportState(),\n        cacheCandidates: cacheCandidates.exportState(),\n      }));\n    } catch (_) {}\n    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);"
    text = replace_once(text, unload_anchor, unload_repl, f'{path}: unload handoff')

    unload_reset_anchor = "    lastRuntimePromptCacheProbe = null;\n    lastRequestTopologyProbe = null;\n    runtimePromptCache.reset();\n    requestTopology.reset();"
    unload_reset_repl = "    lastRuntimePromptCacheProbe = null;\n    lastRequestTopologyProbe = null;\n    lastCacheTrajectoryProbe = null;\n    lastCacheCandidateCostMs = null;\n    runtimePromptCache.reset();\n    requestTopology.reset();\n    cacheCandidates.reset();"
    text = replace_once(text, unload_reset_anchor, unload_reset_repl, f'{path}: unload reset')

    assert text.count("messages.push({ role: 'system', content: result.promptBlock });") == 1
    assert 'cache_control' not in text.lower()
    assert 'cached_content' not in text
    assert 'prompt_cache_key' not in text
    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.38 Cache Trajectory & Refreshless Telemetry Continuity')
