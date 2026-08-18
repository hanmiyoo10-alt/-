from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    assert count == 1, f'{label}: expected 1 anchor, got {count}'
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.S)
    assert count == 1, f'{label}: expected 1 regex match, got {count}'
    return out


candidate_module = r'''SimCore.define("runtime-cache-candidates", function (require, module, exports) {
const WINDOW = 3;
const EMA_ALPHA = 0.35;

function freshState(key, familyId) {
  return {
    version: 2,
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
    version: 2,
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
    lastObservation: distinctObservation ? 'DISTINCT' : 'RETRY',
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
      const userSignature = String(topology?.currentUserSignature || 'none');
      const distinctToken = `${sendIndex}:${userSignature}`;
      const distinctObservation = state.lastDistinctToken !== distinctToken;
      if (!distinctObservation) return summarize(state, familyReset, false);

      const at = Number.isFinite(Number(extra?.at)) ? Number(extra.at) : (Number.isFinite(Number(topology?.at)) ? Number(topology.at) : Date.now());
      const distinctCadence = state.lastAt == null ? null : Math.max(0, at - state.lastAt);
      state.lastDistinctToken = distinctToken;
      state.distinct += 1;
      if (distinctCadence != null) {
        state.cadenceEmaMs = state.cadenceEmaMs == null
          ? distinctCadence
          : (EMA_ALPHA * distinctCadence) + ((1 - EMA_ALPHA) * state.cadenceEmaMs);
      }

      if (topology?.baseline || familyReset) {
        state.status = 'BASELINE';
        state.lastAt = at;
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
      state.lastAt = at;
      return summarize(state, familyReset, true);
    },
    exportState() { return state ? { version: 2, state: cloneState(state) } : null; },
    importState(saved) {
      if (!saved || Number(saved.version) !== 2) return false;
      const restored = cloneState(saved.state);
      if (!restored || !restored.key || !restored.familyId) return false;
      state = restored;
      return true;
    },
    reset() { state = null; },
  });
}
module.exports = { createCacheCandidateTracker };
});'''

for path in FILES:
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, '//@version 0.63.38', '//@version 0.63.39', f'{path}: version')
    release_note = '''// v0.63.39 Cache Trajectory Identity & Representation Diagnostics:\n// - Corrects trajectory identity so repeated sends/regenerations of the same user turn increment attempts but not distinct observations; distinct identity is location + send index + current-user compact signature, while full-request topology remains separately observed\n// - Corrects cadence EMA initialization and scope: BASELINE contributes no zero sample, the first real distinct-turn interval becomes the EMA seed, and retry timing remains visible only in request cadence\n// - Adds diagnostic-only canonical↔fresh representation length-delta reporting from existing fingerprints, fixes stale Diagnostic Version output, and renders BASELINE cadence/frontier values as BASELINE/n/a instead of synthetic zeroes\n// - Bumps cache-candidate handoff state to v2 so polluted v0.63.38 trajectory state is rejected while compatible runtime-prefix/topology telemetry may still be adopted across refreshless reloads\n// - Keeps request order/runtime prompt bytes, provider routing/cache policy, edit acceptance, Deferred Mirror acceptance gate, host/storage/API/timer surface and all 17 Core generation modules frozen\n//\n'''
    text = replace_once(text, '// v0.63.38 Cache Trajectory & Refreshless Telemetry Continuity:\n', release_note + '// v0.63.38 Cache Trajectory & Refreshless Telemetry Continuity:\n', f'{path}: release note')

    topology_old = """        retainedBodies: false, signatureKind: 'role+kind+chars+fnv1a32',\n        requestFingerprint: requestFingerprint(signatures),\n        familyId: familyFingerprint(signatures),"""
    topology_new = """        retainedBodies: false, signatureKind: 'role+kind+chars+fnv1a32',\n        currentUserSignature: currentUserIndex >= 0 ? signatureKey(signatures[currentUserIndex]) : 'none',\n        requestFingerprint: requestFingerprint(signatures),\n        familyId: familyFingerprint(signatures),"""
    text = replace_once(text, topology_old, topology_new, f'{path}: current-user signature')

    text = sub_once(
        text,
        r'SimCore\.define\("runtime-cache-candidates", function \(require, module, exports\) \{.*?\n\}\);\n\nSimCore\.define\("runtime-telemetry"',
        candidate_module + '\n\nSimCore.define("runtime-telemetry"',
        f'{path}: candidate module',
    )

    text = replace_once(text, "function cadence(ms) {\n  if (!Number.isFinite(Number(ms))) return 'BASELINE';", "function cadence(ms) {\n  if (ms == null || !Number.isFinite(Number(ms))) return 'BASELINE';", f'{path}: cadence baseline')
    text = replace_once(text,
        "  const frontier = `${Number(probe.movingFrontierMessages || 0)} msgs / ${Number(probe.movingFrontierChars || 0).toLocaleString('en-US')} chars`;\n  const ema = probe.cadenceEmaMs == null ? 'BASELINE' : cadence(probe.cadenceEmaMs);\n  return `${probe.status || 'n/a'} · family ${family}${probe.familyReset ? ' · FAMILY_RESET' : ''} · distinct ${Number(probe.distinct || 0)} · attempts ${Number(probe.attempts || 0)} · floor ${floor} · frontier ${frontier} · streak ${Number(probe.frontierStreak || 0)} · divergence ${Number(probe.divergenceCount || 0)} · cadence EMA ${ema}`;",
        "  const frontier = probe.distinct <= 1 ? 'n/a' : `${Number(probe.movingFrontierMessages || 0)} msgs / ${Number(probe.movingFrontierChars || 0).toLocaleString('en-US')} chars`;\n  const ema = probe.cadenceEmaMs == null ? 'BASELINE' : cadence(probe.cadenceEmaMs);\n  return `${probe.status || 'n/a'} · family ${family}${probe.familyReset ? ' · FAMILY_RESET' : ''} · distinct ${Number(probe.distinct || 0)} · attempts ${Number(probe.attempts || 0)} · last ${probe.lastObservation || 'n/a'} · floor ${floor} · frontier ${frontier} · streak ${Number(probe.frontierStreak || 0)} · divergence ${Number(probe.divergenceCount || 0)} · cadence EMA ${ema}`;",
        f'{path}: trajectory formatting')

    probe_export_old = 'module.exports = { cachePosture, cadence, topology, trajectory, continuity };'
    probe_export_new = '''function fingerprintChars(value) {\n  const match = /^(\\d+):/.exec(String(value || ''));\n  return match ? Number(match[1]) : null;\n}\nfunction representation(probe) {\n  if (!probe) return 'n/a';\n  const canonical = fingerprintChars(probe.canonicalFingerprint);\n  const fresh = fingerprintChars(probe.freshFingerprint);\n  if (canonical == null || fresh == null) return 'n/a';\n  const delta = fresh - canonical;\n  const relation = probe.fingerprintMatch === 'CANONICAL' ? 'EXACT' : (probe.fingerprintMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'DIFFERENT');\n  return `CANONICAL↔FRESH Δchars ${delta >= 0 ? '+' : ''}${delta} · ${relation} · raw bodies NOT RETAINED`;\n}\nmodule.exports = { cachePosture, cadence, topology, trajectory, continuity, representation };'''
    text = replace_once(text, probe_export_old, probe_export_new, f'{path}: representation probe')

    text = replace_once(text, "      'Version: 0.63.36',", "      'Version: 0.63.39',", f'{path}: diagnostic version')
    output_line = "      `Output provenance: ${deferredMirror ? `HOST_RAW ${deferredMirror.hostRawFingerprint || 'n/a'} · CANONICAL ${deferredMirror.canonicalFingerprint || 'n/a'} · FRESH_CHAT ${deferredMirror.freshFingerprint || 'n/a'} · match ${deferredMirror.fingerprintMatch || 'n/a'}` : 'n/a'}`,"
    text = replace_once(text, output_line, output_line + "\n      `Output representation: ${deferredMirror ? runtimeProbeRules.representation(deferredMirror) : 'n/a'}`,", f'{path}: output representation line')
    text = replace_once(text, "sourceVersion: '0.63.38',", "sourceVersion: '0.63.39',", f'{path}: telemetry source version')

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.39 Cache Trajectory Identity & Representation Diagnostics')
