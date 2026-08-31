#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.70.1"
TARGET_VERSION = "0.70.3"

S1_RELEASE_NOTE = """// v0.70.3 Runtime Cache Hash Primitive Convergence:
// - Converges the three complete-string FNV-1a 32-bit loops inside runtime-cache onto one private local fnv1a32 helper
// - Keeps both rolling-prefix FNV loops byte-for-byte unchanged and does not create a runtime-cache -> runtime-topology dependency
// - Adds no export, require edge, await/yield, timer, storage/network/chat I/O, persistent state/schema or prompt/output semantic change
// - Preserves v0.70.1 cold-tail attribution, v0.70.0 Current Task Primacy Guard, COMMUNITY_CLASSIFIER_VERSION 3 and the frozen M2-6 architecture graph
//
"""

OLD_CACHE_HASH = """function cacheHash(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}"""
NEW_CACHE_HASH = """function fnv1a32(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function cacheHash(text) {
  return fnv1a32(text).toString(16).padStart(8, '0');
}"""
OLD_LINE_HASHES = """  const lineHashes = lines.map((line) => {
    let x = 0x811c9dc5;
    for (let i = 0; i < line.length; i++) {
      x ^= line.charCodeAt(i);
      x = Math.imul(x, 0x01000193);
    }
    return x >>> 0;
  });"""
NEW_LINE_HASHES = "  const lineHashes = lines.map(fnv1a32);"
OLD_CURRENT_LINE_HASHES = """  const currentLineHashes = currentLines.map((line) => {
    let x = 0x811c9dc5;
    for (let i = 0; i < line.length; i++) {
      x ^= line.charCodeAt(i);
      x = Math.imul(x, 0x01000193);
    }
    return x >>> 0;
  });"""
NEW_CURRENT_LINE_HASHES = "  const currentLineHashes = currentLines.map(fnv1a32);"

OLD_PROMPT_TAIL = """function compileRuntimePrompt(state) {
  return compileRuntimePromptParts(state).text;
}

function renderRuntimePrompt(state) {
  return compileRuntimePrompt(state);
}

module.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts, compileRuntimePrompt, renderRuntimePrompt };"""
NEW_PROMPT_TAIL = "module.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts };"
S2_1_SESSION_ALIAS = "const renderRuntimePrompt = prompt.renderRuntimePrompt;\n"
S2_1_SESSION_EXPORT = "  renderRuntimePrompt,\n"
S2_2_EXPORTS = (
    "  inspectPreviousBEndOutput,\n",
    "  validateStructure: structure.validateStructure,\n",
    "  communityBlocks: community.communityBlocks,\n",
    "  prepareTurn: lifecycle.prepareTurn,\n",
)
CACHE_EXPORTS_P3 = "module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, runtimeLineTier, runtimeIdentity, createRuntimePromptCacheTracker };"
CACHE_EXPORTS_P4 = "module.exports = { createRuntimePromptCacheTracker };"
TOPO_EXPORTS_P3 = "module.exports = { exactHash, messageSignature, leadingSystemCount, breakAttribution, createRequestTopologyTracker };"
TOPO_EXPORTS_P4 = "module.exports = { messageSignature, breakAttribution, createRequestTopologyTracker };"

HOST_REASON_AND_VALIDATE = """function hostReason(hostClaim, validation) {
  if (!hostClaim) return 'no-compatible-handoff';
  if (hostClaim.status !== 'CONSUMED') return `host-local-${String(hostClaim.status || 'unavailable').toLowerCase()}`;
  return validation?.reason || 'no-compatible-handoff';
}

function validate(claimed, locationKey, now = Date.now(), hostClaim = null) {"""
HOST_REASON_HELPER_AND_VALIDATE = """function hostReason(hostClaim, validation) {
  if (!hostClaim) return 'no-compatible-handoff';
  if (hostClaim.status !== 'CONSUMED') return `host-local-${String(hostClaim.status || 'unavailable').toLowerCase()}`;
  return validation?.reason || 'no-compatible-handoff';
}

function recordClaimSelection(memoryValidation, sessionValidation, hostValidation, selected, selectedRoot) {
  lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation, sessionValidation, hostValidation, selected, selectedRoot });
  return lastClaimProbe;
}

function validate(claimed, locationKey, now = Date.now(), hostClaim = null) {"""
S3_ASSIGNMENTS = (
    (
        "    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: 'exact', sessionValidation: (firstEntry || secondEntry) ? 'standby' : 'empty', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'memory', selectedRoot: 'NONE' });",
        "    recordClaimSelection('exact', (firstEntry || secondEntry) ? 'standby' : 'empty', hostClaim ? 'standby' : 'empty', 'memory', 'NONE');",
    ),
    (
        "    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'session', selectedRoot: firstEntry.root });",
        "    recordClaimSelection(validationClass(memory), 'exact', hostClaim ? 'standby' : 'empty', 'session', firstEntry.root);",
    ),
    (
        "    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'session', selectedRoot: secondEntry.root });",
        "    recordClaimSelection(validationClass(memory), 'exact', hostClaim ? 'standby' : 'empty', 'session', secondEntry.root);",
    ),
    (
        "    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(secondEntry ? secondValidation : firstValidation), hostValidation: 'exact', selected: 'host-local', selectedRoot: 'NONE' });",
        "    recordClaimSelection(validationClass(memory), validationClass(secondEntry ? secondValidation : firstValidation), 'exact', 'host-local', 'NONE');",
    ),
    (
        "  lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(secondEntry ? secondValidation : firstValidation), hostValidation: hostClaim ? validationClass(hostValidation) : 'empty', selected: 'NONE', selectedRoot: 'NONE' });",
        "  recordClaimSelection(validationClass(memory), validationClass(secondEntry ? secondValidation : firstValidation), hostClaim ? validationClass(hostValidation) : 'empty', 'NONE', 'NONE');",
    ),
)

S3_2_OLD = """function takeSessionCandidate(candidate) {
  if (!candidate) return null;
  let raw = null;
  try { raw = candidate.storage.getItem(SESSION_KEY); }
  catch (_) { return Object.freeze({ root: candidate.label, status: 'failed', capsule: null, serializedChars: 0 }); }
  if (raw == null) return Object.freeze({ root: candidate.label, status: 'empty', capsule: null, serializedChars: 0 });
  try { candidate.storage.removeItem(SESSION_KEY); } catch (_) {}
  const serializedChars = String(raw).length;
  if (serializedChars > MAX_SESSION_CHARS) return Object.freeze({ root: candidate.label, status: 'oversize', capsule: null, serializedChars });
  try { return Object.freeze({ root: candidate.label, status: 'available', capsule: JSON.parse(String(raw)), serializedChars }); }
  catch (_) { return Object.freeze({ root: candidate.label, status: 'malformed', capsule: null, serializedChars }); }
}"""
S3_2_NEW = """function sessionCandidateResult(root, status, capsule = null, serializedChars = 0) {
  return Object.freeze({ root, status, capsule, serializedChars });
}

function takeSessionCandidate(candidate) {
  if (!candidate) return null;
  let raw = null;
  try { raw = candidate.storage.getItem(SESSION_KEY); }
  catch (_) { return sessionCandidateResult(candidate.label, 'failed', null, 0); }
  if (raw == null) return sessionCandidateResult(candidate.label, 'empty', null, 0);
  try { candidate.storage.removeItem(SESSION_KEY); } catch (_) {}
  const serializedChars = String(raw).length;
  if (serializedChars > MAX_SESSION_CHARS) return sessionCandidateResult(candidate.label, 'oversize', null, serializedChars);
  try { return sessionCandidateResult(candidate.label, 'available', JSON.parse(String(raw)), serializedChars); }
  catch (_) { return sessionCandidateResult(candidate.label, 'malformed', null, serializedChars); }
}"""

S3_3_OLD = """function inspectSessionSurface(root, label) {
  if (!root) return Object.freeze({ label, status: 'ROOT_ABSENT', storage: null });
  let storage = null;
  try { storage = root.sessionStorage; }
  catch (_) { return Object.freeze({ label, status: 'ACCESS_ERROR', storage: null }); }
  if (storage == null) return Object.freeze({ label, status: 'STORAGE_ABSENT', storage: null });
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    return Object.freeze({ label, status: 'METHODS_INCOMPLETE', storage: null });
  }
  return Object.freeze({ label, status: 'USABLE', storage });
}"""
S3_3_NEW = """function sessionSurfaceResult(label, status, storage = null) {
  return Object.freeze({ label, status, storage });
}

function inspectSessionSurface(root, label) {
  if (!root) return sessionSurfaceResult(label, 'ROOT_ABSENT');
  let storage = null;
  try { storage = root.sessionStorage; }
  catch (_) { return sessionSurfaceResult(label, 'ACCESS_ERROR'); }
  if (storage == null) return sessionSurfaceResult(label, 'STORAGE_ABSENT');
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    return sessionSurfaceResult(label, 'METHODS_INCOMPLETE');
  }
  return sessionSurfaceResult(label, 'USABLE', storage);
}"""

S3_4_OLD = """function resolveSessionCandidates(root, windowLike) {
  const windowSurface = inspectSessionSurface(windowLike, 'WINDOW');
  const globalSurface = inspectSessionSurface(root, 'GLOBAL_THIS');
  const windowUsable = windowSurface.status === 'USABLE';
  const globalUsable = globalSurface.status === 'USABLE';
  let relation = 'NONE';
  let first = null;
  let second = null;
  if (windowUsable && globalUsable) {
    if (windowSurface.storage === globalSurface.storage) {
      relation = 'SAME_OBJECT';
      first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
    } else {
      relation = 'DISTINCT_OBJECTS';
      first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
      second = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });
    }
  } else if (windowUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
  } else if (globalUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });
  }
  const surface = Object.freeze({ window: windowSurface.status, globalThis: globalSurface.status, relation });
  lastSurfaceProbe = surface;
  return Object.freeze({ surface, first, second });
}"""
S3_4_NEW = """function sessionStorageCandidate(label, storage) {
  return Object.freeze({ label, storage });
}

function resolveSessionCandidates(root, windowLike) {
  const windowSurface = inspectSessionSurface(windowLike, 'WINDOW');
  const globalSurface = inspectSessionSurface(root, 'GLOBAL_THIS');
  const windowUsable = windowSurface.status === 'USABLE';
  const globalUsable = globalSurface.status === 'USABLE';
  let relation = 'NONE';
  let first = null;
  let second = null;
  if (windowUsable && globalUsable) {
    if (windowSurface.storage === globalSurface.storage) {
      relation = 'SAME_OBJECT';
      first = sessionStorageCandidate('WINDOW', windowSurface.storage);
    } else {
      relation = 'DISTINCT_OBJECTS';
      first = sessionStorageCandidate('WINDOW', windowSurface.storage);
      second = sessionStorageCandidate('GLOBAL_THIS', globalSurface.storage);
    }
  } else if (windowUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = sessionStorageCandidate('WINDOW', windowSurface.storage);
  } else if (globalUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = sessionStorageCandidate('GLOBAL_THIS', globalSurface.storage);
  }
  const surface = Object.freeze({ window: windowSurface.status, globalThis: globalSurface.status, relation });
  lastSurfaceProbe = surface;
  return Object.freeze({ surface, first, second });
}"""

S4_1_HELPER_OLD = """  function runtimeIsCurrent(epoch = runtimeEpoch) {
    return !runtimeDisposed && Number(epoch) === Number(runtimeEpoch);
  }

  function dropStaleRuntime() {
    staleRuntimeDrops += 1;
    return false;
  }"""
S4_1_HELPER_NEW = """  function runtimeIsCurrent(epoch = runtimeEpoch) {
    return !runtimeDisposed && Number(epoch) === Number(runtimeEpoch);
  }

  function dropStaleRuntime() {
    staleRuntimeDrops += 1;
    return false;
  }

  function guardCurrentRuntime(epoch = runtimeEpoch) {
    if (runtimeIsCurrent(epoch)) return true;
    dropStaleRuntime();
    return false;
  }"""
S4_1_PREP_OLD = """    if (!runtimeIsCurrent()) {
      dropStaleRuntime();
      markDiagnosticRequestProbe(sendIndex, { status: 'UNAVAILABLE', active: false, mode: null, errorStage: 'runtime-unloaded' });
      return { active: false };
    }"""
S4_1_PREP_NEW = """    if (!guardCurrentRuntime()) {
      markDiagnosticRequestProbe(sendIndex, { status: 'UNAVAILABLE', active: false, mode: null, errorStage: 'runtime-unloaded' });
      return { active: false };
    }"""
S4_1_PROCESS_OLD = "    if (!runtimeIsCurrent()) { dropStaleRuntime(); return content; }"
S4_1_PROCESS_NEW = "    if (!guardCurrentRuntime()) return content;"
S4_1_BEFORE_OLD = "    if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return messages; }"
S4_1_BEFORE_NEW = "    if (!guardCurrentRuntime(hookEpoch)) return messages;"
S4_1_OUTPUT_OLD = "    if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return content; }"
S4_1_OUTPUT_NEW = "    if (!guardCurrentRuntime(hookEpoch)) return content;"
S4_1_POSITIVE_TELEMETRY_GUARD = "if (runtimeIsCurrent() && String(coreKey || coreLocationKey || '')) {"
S4_CALL_MARKERS = (
    "await host.currentIndices()", "await host.getChat(chaIdx, chatIdx)",
    "runtimeSession.loadCoreForChat(", "await cs.onSend(", "await cs.processOutput(",
    "await checkpointRuntimeTelemetry('OUTPUT_COMMIT')",
)

S4_2_DEF_OLD = """  async function processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf = null) {
    let t = perfNow();"""
S4_2_DEF_NEW = """  async function processCoreOutput(content, chaIdx, chatIdx, chat, perf = null) {
    const fallbackOutIndex = chat?.message?.length ?? 0;
    let t = perfNow();"""
S4_2_CALL_OLD = """      const fallbackOutIndex = chat?.message?.length ?? 0;
      return await processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf);"""
S4_2_CALL_NEW = "      return await processCoreOutput(content, chaIdx, chatIdx, chat, perf);"
S4_2_SESSION_RESOLVE = "resolveOutputIndex(fallbackOutIndex = -1) {"
S4_2_RESOLVE_CALL = "const outIndex = cs.resolveOutputIndex(fallbackOutIndex);"
S4_2_FALLBACK_EXPR = "chat?.message?.length ?? 0"

S4_3_TEMPLATE_BRIDGE_OLD = """        };
      } else {
        lastTemplateRecurrenceProbe = null;
      }
      if (pendingProbe) {
        const l = result.state.requestLineage || {};"""
S4_3_TEMPLATE_BRIDGE_NEW = """        };
        const l = result.state.requestLineage || {};"""
S4_3_LINEAGE_BRIDGE_OLD = """        };
      } else {
        lastRequestLineageProbe = null;
      }
      if (pendingProbe) {
        lastCommunitySourceHandoffProbe = {"""
S4_3_LINEAGE_BRIDGE_NEW = """        };
        lastCommunitySourceHandoffProbe = {"""
S4_3_FINAL_CLEAR_OLD = """        };
      } else {
        lastCommunitySourceHandoffProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };"""
S4_3_FINAL_CLEAR_NEW = """        };
      } else {
        lastTemplateRecurrenceProbe = null;
        lastRequestLineageProbe = null;
        lastCommunitySourceHandoffProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };"""
S4_3_NARRATIVE = "if (pendingProbe && !/^B_/.test(String(pendingProbe.mode || ''))) {"
S4_3_PROJECTIONS = (
    "lastTemplateRecurrenceProbe = {",
    "const l = result.state.requestLineage || {};",
    "lastRequestLineageProbe = {",
    "lastCommunitySourceHandoffProbe = {",
)

S5_1_HELPER_ANCHOR = "const { STATE_VERSION, CORE_STATE_VERSION } = kernel;\n\nfunction initialState() {"
S5_1_HELPER_INSERT = """const { STATE_VERSION, CORE_STATE_VERSION } = kernel;

function optionalTrimmedString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function initialState() {"""
S5_1_REPLACEMENTS = (
    ("  s.broadcastAirtime = typeof s.broadcastAirtime === 'string' && s.broadcastAirtime.trim() ? s.broadcastAirtime.trim() : null;", "  s.broadcastAirtime = optionalTrimmedString(s.broadcastAirtime);"),
    ("  s.broadcastAirtimeStart = typeof s.broadcastAirtimeStart === 'string' && s.broadcastAirtimeStart.trim() ? s.broadcastAirtimeStart.trim() : null;", "  s.broadcastAirtimeStart = optionalTrimmedString(s.broadcastAirtimeStart);"),
    ("  s.narrativeTimestamp = typeof s.narrativeTimestamp === 'string' && s.narrativeTimestamp.trim() ? s.narrativeTimestamp.trim() : null;", "  s.narrativeTimestamp = optionalTrimmedString(s.narrativeTimestamp);"),
)
S5_1_MIGRATION_MARKERS = (
    "delete s.community.globalReactionMax;",
    "delete s.narrativeYear;",
    "delete s.currentEpisodeSegments;",
    "delete s.lastCompletedEpisode;",
    "delete s.exposed;",
    "delete s.community.recent;",
    "delete s.community.commenters;",
)
S5_1_NORMALIZER_MARKERS = (
    "recurrence.normalizeRegistry(s.templateRegistry)",
    "lineage.normalizeLineage(s.requestLineage)",
    "handoff.normalizeRegistry(s.communitySourceRegistry)",
    "normalizePlatformMaxMap(s.community.platformMax)",
)

SIDE_EFFECT_MARKERS = (
    "await ", "setTimeout(", "setInterval(", "pluginStorage", "setChat(", "fetch(",
    "XMLHttpRequest", "history.splice(", "messages.splice(",
    "messages.push({ role: 'system', content: result.promptBlock });",
)
TELEMETRY_CONSTANTS = (
    "const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';",
    "const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';",
    "const HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__';",
    "const MAX_AGE_MS = 10 * 60 * 1000;",
    "const MAX_SESSION_CHARS = 16384;",
    "const MAX_SERIALIZED_CHARS = 16384;",
)
PROTECTED_MARKERS = (
    "provider cache UNVERIFIED", "Post-onSend attribution:",
    "const PROMPT_COMPILER_VERSION = 4;", "const COMMUNITY_CLASSIFIER_VERSION = 3;",
    "const STATE_VERSION = 5;", "const CORE_STATE_VERSION = 10;", "TAIL_AFTER_CURRENT_USER",
    "__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__", "__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__",
)


def fail(code, detail=""):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("S5_1_PATCH_ANCHOR_INVALID", f"{label} count={count}")
    return text.replace(old, new, 1)


def many(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        fail("S5_1_PATCH_ANCHOR_INVALID", f"{label} count={count} expected={expected}")
    return text.replace(old, new)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail("S5_1_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    return start, next_start if next_start >= 0 else len(text)


def module_text(text, name):
    start, end = module_bounds(text, name)
    return text[start:end]


def replace_module(text, name, replacement):
    start, end = module_bounds(text, name)
    return text[:start] + replacement.rstrip() + "\n" + text[end:]


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)", function \(require, module, exports\) \{', text)


def require_surface(source):
    return re.findall(r"require\(['\"]([^'\"]+)['\"]\)", source)


def same_counts(before, after, markers, code):
    for marker in markers:
        if before.count(marker) != after.count(marker):
            fail(code, f"{marker}: {before.count(marker)} -> {after.count(marker)}")


def bounded_module_text(text, name, names):
    if name != names[-1]:
        return module_text(text, name)
    if name != "runtime-probe":
        fail("S5_1_LAST_MODULE_IDENTITY_CHANGED", name)
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [i for i in range(len(text)) if text.startswith(token, i)]
    if len(starts) != 1:
        fail("S5_1_LAST_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
    end = text.find("\n\n(async () => {", starts[0] + len(token))
    if end < 0:
        fail("S5_1_OUTER_SHELL_BOUNDARY_MISSING")
    return text[starts[0]:end]


def apply_s1(p0):
    out = one(p0, f"//@version {FROM_VERSION}", f"//@version {TARGET_VERSION}", "metadata-version")
    out = one(out, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TARGET_VERSION}';", "runtime-version")
    out = one(out, f"const HOST_COMPAT_VERSION = '{FROM_VERSION}';", f"const HOST_COMPAT_VERSION = '{TARGET_VERSION}';", "host-version")
    out = one(out, "// v0.70.1 Cold First-Turn Tail Attribution:", S1_RELEASE_NOTE + "// v0.70.1 Cold First-Turn Tail Attribution:", "release-note")
    out = one(out, OLD_CACHE_HASH, NEW_CACHE_HASH, "cache-hash")
    out = one(out, OLD_LINE_HASHES, NEW_LINE_HASHES, "line-hashes")
    out = one(out, OLD_CURRENT_LINE_HASHES, NEW_CURRENT_LINE_HASHES, "current-line-hashes")
    return one(out, "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',", "    version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',", "operator-card")


def apply_s2_1(p1):
    out = one(p1, OLD_PROMPT_TAIL, NEW_PROMPT_TAIL, "prompt-dead-render")
    out = one(out, S2_1_SESSION_ALIAS, "", "session-render-alias")
    return one(out, S2_1_SESSION_EXPORT, "", "session-render-export")


def apply_s2_2(p2):
    out = p2
    for marker in S2_2_EXPORTS:
        out = one(out, marker, "", f"session-export-{marker.strip()}")
    return out


def apply_s2_3(p3):
    out = one(p3, CACHE_EXPORTS_P3, CACHE_EXPORTS_P4, "runtime-cache-exports")
    return one(out, TOPO_EXPORTS_P3, TOPO_EXPORTS_P4, "runtime-topology-exports")


def apply_s3_1(p4):
    out = one(p4, HOST_REASON_AND_VALIDATE, HOST_REASON_HELPER_AND_VALIDATE, "claim-selection-helper")
    for index, (old, new) in enumerate(S3_ASSIGNMENTS, 1):
        out = one(out, old, new, f"claim-selection-{index}")
    return out


def apply_s3_2(p5):
    return one(p5, S3_2_OLD, S3_2_NEW, "session-candidate-result")


def apply_s3_3(p6):
    return one(p6, S3_3_OLD, S3_3_NEW, "session-surface-result")


def apply_s3_4(p7):
    return one(p7, S3_4_OLD, S3_4_NEW, "session-candidate-wrapper")


def apply_s4_1(p8):
    out = one(p8, S4_1_HELPER_OLD, S4_1_HELPER_NEW, "runtime-current-helper")
    out = many(out, S4_1_PREP_OLD, S4_1_PREP_NEW, 2, "prepare-guards")
    out = many(out, S4_1_PROCESS_OLD, S4_1_PROCESS_NEW, 2, "process-guards")
    out = many(out, S4_1_BEFORE_OLD, S4_1_BEFORE_NEW, 3, "before-guards")
    out = many(out, S4_1_OUTPUT_OLD, S4_1_OUTPUT_NEW, 3, "output-guards")
    return out


def apply_s4_2(p9):
    out = one(p9, S4_2_DEF_OLD, S4_2_DEF_NEW, "process-core-output-definition")
    return one(out, S4_2_CALL_OLD, S4_2_CALL_NEW, "output-handler-pass-through")


def apply_s4_3(p10):
    out = one(p10, S4_3_TEMPLATE_BRIDGE_OLD, S4_3_TEMPLATE_BRIDGE_NEW, "template-lineage-bridge")
    out = one(out, S4_3_LINEAGE_BRIDGE_OLD, S4_3_LINEAGE_BRIDGE_NEW, "lineage-community-bridge")
    return one(out, S4_3_FINAL_CLEAR_OLD, S4_3_FINAL_CLEAR_NEW, "converged-clear-branch")


def apply_s5_1(p11):
    mod = module_text(p11, "state-reconcile")
    mod = one(mod, S5_1_HELPER_ANCHOR, S5_1_HELPER_INSERT, "state-reconcile-helper")
    for index, (old, new) in enumerate(S5_1_REPLACEMENTS, 1):
        mod = one(mod, old, new, f"optional-trimmed-field-{index}")
    return replace_module(p11, "state-reconcile", mod)


def run_node(script, success, code):
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or success not in result.stdout:
        fail(code, (result.stderr or result.stdout).strip())


def base_equivalence_harness():
    run_node(r"""
function oldRaw(text){const value=String(text==null?'':text);let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;}
function fnv1a32(text){const value=String(text==null?'':text);let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;}
for(const x of [null,undefined,'','abc','한글 테스트','emoji 😀 🚀',('가😀\n').repeat(1024)]) if(oldRaw(x)!==fnv1a32(x)) throw new Error('FNV_DIFF');
function oldSession(root,status,capsule,serializedChars){return Object.freeze({root,status,capsule,serializedChars});}
function sessionCandidateResult(root,status,capsule=null,serializedChars=0){return Object.freeze({root,status,capsule,serializedChars});}
for(const row of [['WINDOW','failed',null,0],['GLOBAL_THIS','available',{schema:1},12],['WINDOW','malformed',null,7]]){const a=oldSession(...row),b=sessionCandidateResult(...row);if(JSON.stringify(a)!==JSON.stringify(b)||Object.keys(a).join(',')!==Object.keys(b).join(',')||!Object.isFrozen(b))throw new Error('SESSION_RESULT_DIFF');}
function oldSurface(label,status,storage){return Object.freeze({label,status,storage});}
function sessionSurfaceResult(label,status,storage=null){return Object.freeze({label,status,storage});}
for(const row of [['WINDOW','ROOT_ABSENT',null],['GLOBAL_THIS','USABLE',{id:1}]]){const a=oldSurface(...row),b=sessionSurfaceResult(...row);if(JSON.stringify(a)!==JSON.stringify(b)||Object.keys(a).join(',')!==Object.keys(b).join(',')||!Object.isFrozen(b))throw new Error('SURFACE_RESULT_DIFF');}
function oldCandidate(label,storage){return Object.freeze({label,storage});}
function sessionStorageCandidate(label,storage){return Object.freeze({label,storage});}
for(const label of ['WINDOW','GLOBAL_THIS']){const storage={id:label};const a=oldCandidate(label,storage),b=sessionStorageCandidate(label,storage);if(JSON.stringify(a)!==JSON.stringify(b)||Object.keys(a).join(',')!==Object.keys(b).join(',')||b.storage!==storage||!Object.isFrozen(b))throw new Error('WRAPPER_DIFF');}
console.log('S5_1_BASE_EQ_PASS');
""", "S5_1_BASE_EQ_PASS", "S5_1_BASE_EQUIVALENCE_FAIL")


def fallback_equivalence_harness():
    run_node(r"""
function fallback(chat){return chat?.message?.length??0;}
function resolve(active,sendIndex,fallbackOutIndex){const n=Number(sendIndex);if(active&&Number.isInteger(n)&&n>=0)return n+1;return Number.isInteger(fallbackOutIndex)&&fallbackOutIndex>=0?fallbackOutIndex:-1;}
for(const chat of [null,{}, {message:null},{message:[]},{message:[1]},{message:[1,2,3]}]){const a=fallback(chat),b=fallback(chat);if(a!==b)throw new Error('FALLBACK_VALUE_DIFF');for(const p of [{a:false,s:-1},{a:false,s:3},{a:true,s:3},{a:true,s:-1}])if(resolve(p.a,p.s,a)!==resolve(p.a,p.s,b))throw new Error('RESOLVE_INPUT_DIFF');}
console.log('S5_1_FALLBACK_EQ_PASS');
""", "S5_1_FALLBACK_EQ_PASS", "S5_1_FALLBACK_EQUIVALENCE_FAIL")


def branch_equivalence_harness():
    run_node(r"""
function oldShape(p){const events=[];let ticks=0;const now=()=>{ticks+=1;events.push('time:'+ticks);return ticks;};let template=null,lineage=null,community=null;if(p){events.push('template');template={mode:p.mode,at:now()};}else{events.push('clear-template');template=null;}if(p){const l=p.requestLineage||{};events.push('lineage');lineage={rootMode:l.rootMode||null,at:now()};}else{events.push('clear-lineage');lineage=null;}if(p){events.push('community');community={eligible:!!p.eligible,at:now()};}else{events.push('clear-community');community=null;}return{events,template,lineage,community,ticks};}
function newShape(p){const events=[];let ticks=0;const now=()=>{ticks+=1;events.push('time:'+ticks);return ticks;};let template=null,lineage=null,community=null;if(p){events.push('template');template={mode:p.mode,at:now()};const l=p.requestLineage||{};events.push('lineage');lineage={rootMode:l.rootMode||null,at:now()};events.push('community');community={eligible:!!p.eligible,at:now()};}else{events.push('clear-template');template=null;events.push('clear-lineage');lineage=null;events.push('clear-community');community=null;}return{events,template,lineage,community,ticks};}
for(const p of [null,{mode:'A',eligible:true,requestLineage:{rootMode:'A'}}]){const a=oldShape(p),b=newShape(p);if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('PENDING_BRANCH_DIFF');}
console.log('S5_1_BRANCH_EQ_PASS');
""", "S5_1_BRANCH_EQ_PASS", "S5_1_BRANCH_EQUIVALENCE_FAIL")


def trimmed_string_equivalence_harness():
    run_node(r"""
function oldValue(value){return typeof value==='string'&&value.trim()?value.trim():null;}
function optionalTrimmedString(value){return typeof value==='string'&&value.trim()?value.trim():null;}
const values=[undefined,null,false,true,0,1,{},[],new String(' wrapped '),'',' ','\t\n','abc','  abc  ','한글','  한글 문장  ','A  B',' A\nB ','😀','  😀 🚀  '];
for(const value of values){const a=oldValue(value),b=optionalTrimmedString(value);if(!Object.is(a,b))throw new Error('VALUE_DIFF:'+String(value));}
function oldState(src){const s={...src};s.broadcastAirtime=oldValue(s.broadcastAirtime);s.broadcastAirtimeStart=oldValue(s.broadcastAirtimeStart);s.narrativeTimestamp=oldValue(s.narrativeTimestamp);return s;}
function newState(src){const s={...src};s.broadcastAirtime=optionalTrimmedString(s.broadcastAirtime);s.broadcastAirtimeStart=optionalTrimmedString(s.broadcastAirtimeStart);s.narrativeTimestamp=optionalTrimmedString(s.narrativeTimestamp);return s;}
const states=[
 {stateVersion:5,broadcastAirtime:'  x  ',broadcastAirtimeStart:'\t',episodeNo:2,narrativeTimestamp:' y ',pending:null},
 {stateVersion:5,broadcastAirtime:null,broadcastAirtimeStart:'z',episodeNo:0,narrativeTimestamp:42,pending:{active:false}},
 {stateVersion:5,broadcastAirtime:'A\nB',broadcastAirtimeStart:'  한글  ',episodeNo:1,narrativeTimestamp:'',pending:null},
];
for(const src of states){const a=oldState(src),b=newState(src);if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('STATE_VALUE_DIFF');if(Object.keys(a).join('|')!==Object.keys(b).join('|'))throw new Error('STATE_ORDER_DIFF');}
console.log('S5_1_TRIM_EQ_PASS');
""", "S5_1_TRIM_EQ_PASS", "S5_1_TRIM_EQUIVALENCE_FAIL")


def verify_p0_p8(stages):
    p0,p1,p2,p3,p4,p5,p6,p7,p8=stages
    names=module_names(p0)
    if not names or any(module_names(x)!=names for x in stages[1:]): fail("S5_1_P8_MODULE_GRAPH_CHANGED")
    if require_surface(p0)!=require_surface(p8): fail("S5_1_P8_REQUIRE_SURFACE_CHANGED")
    same_counts(p0,p8,SIDE_EFFECT_MARKERS,"S5_1_P8_SIDE_EFFECT_CHANGED")
    same_counts(p0,p8,PROTECTED_MARKERS,"S5_1_P8_PROTECTED_MARKER_CHANGED")
    c0,c1=module_text(p0,"runtime-cache"),module_text(p1,"runtime-cache")
    if c0.count("0x811c9dc5")!=5 or c1.count("0x811c9dc5")!=3: fail("S5_1_S1_FNV_SHAPE_INVALID")
    for marker in ("function fnv1a32(text)","lines.map(fnv1a32)","currentLines.map(fnv1a32)"):
        if marker not in c1: fail("S5_1_S1_MARKER_MISSING",marker)
    if "function compileRuntimePrompt(state)" in p2 or "function renderRuntimePrompt(state)" in p2 or S2_1_SESSION_ALIAS in p2 or S2_1_SESSION_EXPORT in p2: fail("S5_1_S2_1_DEAD_SEAM_SURVIVED")
    for marker in S2_2_EXPORTS:
        if marker in module_text(p3,"session"): fail("S5_1_S2_2_DEAD_EXPORT_SURVIVED",marker.strip())
    if CACHE_EXPORTS_P4 not in module_text(p4,"runtime-cache") or TOPO_EXPORTS_P4 not in module_text(p4,"runtime-topology"): fail("S5_1_S2_3_EXPORT_SHAPE_INVALID")
    t5,t6,t7,t8=[module_text(x,"runtime-telemetry") for x in (p5,p6,p7,p8)]
    if t5.count("function recordClaimSelection(")!=1 or t5.count("recordClaimSelection(")!=6: fail("S5_1_S3_1_HELPER_COUNT_INVALID")
    if t6.count("function sessionCandidateResult(")!=1 or t6.count("sessionCandidateResult(")!=6: fail("S5_1_S3_2_HELPER_COUNT_INVALID")
    if t7.count("function sessionSurfaceResult(")!=1 or t7.count("sessionSurfaceResult(")!=6: fail("S5_1_S3_3_HELPER_COUNT_INVALID")
    if t8.count("function sessionStorageCandidate(")!=1 or t8.count("sessionStorageCandidate(")!=6: fail("S5_1_S3_4_HELPER_COUNT_INVALID")
    if t7.replace(S3_4_OLD,S3_4_NEW,1)!=t8: fail("S5_1_P7_P8_DELTA_WIDENED")
    for marker in TELEMETRY_CONSTANTS:
        if any(module_text(x,"runtime-telemetry").count(marker)!=1 for x in (p4,p5,p6,p7,p8)): fail("S5_1_TELEMETRY_CONSTANT_CHANGED",marker)
    base_equivalence_harness()


def verify_s4_1(p8,p9):
    names=module_names(p8)
    if module_names(p9)!=names or require_surface(p8)!=require_surface(p9): fail("S5_1_P9_GRAPH_CHANGED")
    same_counts(p8,p9,SIDE_EFFECT_MARKERS,"S5_1_P9_SIDE_EFFECT_CHANGED")
    same_counts(p8,p9,PROTECTED_MARKERS,"S5_1_P9_PROTECTED_MARKER_CHANGED")
    same_counts(p8,p9,S4_CALL_MARKERS,"S5_1_P9_CALL_SURFACE_CHANGED")
    for name in names:
        if bounded_module_text(p8,name,names)!=bounded_module_text(p9,name,names): fail("S5_1_P9_MODULE_CHANGED",name)
    expected=p8.replace(S4_1_HELPER_OLD,S4_1_HELPER_NEW,1).replace(S4_1_PREP_OLD,S4_1_PREP_NEW).replace(S4_1_PROCESS_OLD,S4_1_PROCESS_NEW).replace(S4_1_BEFORE_OLD,S4_1_BEFORE_NEW).replace(S4_1_OUTPUT_OLD,S4_1_OUTPUT_NEW)
    if expected!=p9: fail("S5_1_P8_P9_DELTA_WIDENED")
    if p9.count("function guardCurrentRuntime(")!=1 or p9.count("guardCurrentRuntime(")!=11: fail("S5_1_P9_GUARD_COUNT_INVALID")
    if p9.count("dropStaleRuntime();")!=1 or p9.count("staleRuntimeDrops += 1;")!=1: fail("S5_1_P9_STALE_ACCOUNTING_CHANGED")
    if p9.count(S4_1_POSITIVE_TELEMETRY_GUARD)!=1: fail("S5_1_P9_POSITIVE_GUARD_CHANGED")


def verify_s4_2(p9,p10):
    names=module_names(p9)
    if module_names(p10)!=names or require_surface(p9)!=require_surface(p10): fail("S5_1_P10_GRAPH_CHANGED")
    same_counts(p9,p10,SIDE_EFFECT_MARKERS,"S5_1_P10_SIDE_EFFECT_CHANGED")
    same_counts(p9,p10,PROTECTED_MARKERS,"S5_1_P10_PROTECTED_MARKER_CHANGED")
    same_counts(p9,p10,S4_CALL_MARKERS,"S5_1_P10_CALL_SURFACE_CHANGED")
    for name in names:
        if bounded_module_text(p9,name,names)!=bounded_module_text(p10,name,names): fail("S5_1_P10_MODULE_CHANGED",name)
    expected=p9.replace(S4_2_DEF_OLD,S4_2_DEF_NEW,1).replace(S4_2_CALL_OLD,S4_2_CALL_NEW,1)
    if expected!=p10: fail("S5_1_P9_P10_DELTA_WIDENED")
    if p10.count(S4_2_FALLBACK_EXPR)!=1 or p10.count(S4_2_SESSION_RESOLVE)!=1 or p10.count(S4_2_RESOLVE_CALL)!=1: fail("S5_1_P10_FALLBACK_INVARIANT_CHANGED")
    fallback_equivalence_harness()


def post_onsend_region(text):
    start=text.find("      const pendingProbe = result.state.pending || null;")
    end=text.find("      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };",start)
    if start<0 or end<0: fail("S5_1_PENDING_REGION_MISSING")
    return text[start:end]


def verify_s4_3(p10,p11):
    names=module_names(p10)
    if module_names(p11)!=names or require_surface(p10)!=require_surface(p11): fail("S5_1_P11_GRAPH_CHANGED")
    same_counts(p10,p11,SIDE_EFFECT_MARKERS,"S5_1_P11_SIDE_EFFECT_CHANGED")
    same_counts(p10,p11,PROTECTED_MARKERS,"S5_1_P11_PROTECTED_MARKER_CHANGED")
    same_counts(p10,p11,S4_CALL_MARKERS,"S5_1_P11_CALL_SURFACE_CHANGED")
    for name in names:
        if bounded_module_text(p10,name,names)!=bounded_module_text(p11,name,names): fail("S5_1_P11_MODULE_CHANGED",name)
    expected=p10.replace(S4_3_TEMPLATE_BRIDGE_OLD,S4_3_TEMPLATE_BRIDGE_NEW,1).replace(S4_3_LINEAGE_BRIDGE_OLD,S4_3_LINEAGE_BRIDGE_NEW,1).replace(S4_3_FINAL_CLEAR_OLD,S4_3_FINAL_CLEAR_NEW,1)
    if expected!=p11: fail("S5_1_P10_P11_DELTA_WIDENED")
    if p10.count("      if (pendingProbe) {")!=3 or p11.count("      if (pendingProbe) {")!=1: fail("S5_1_PENDING_BRANCH_COUNT_INVALID")
    if p10.count(S4_3_NARRATIVE)!=1 or p11.count(S4_3_NARRATIVE)!=1: fail("S5_1_NARRATIVE_CONDITION_CHANGED")
    for marker in S4_3_PROJECTIONS:
        if p10.count(marker)!=p11.count(marker): fail("S5_1_PROJECTION_COUNT_CHANGED",marker)
    r10,r11=post_onsend_region(p10),post_onsend_region(p11)
    if r10.count("at: Date.now(),")!=r11.count("at: Date.now(),"): fail("S5_1_TIMESTAMP_COUNT_CHANGED")
    order=[r11.find(x) for x in S4_3_PROJECTIONS]
    if any(x<0 for x in order) or order!=sorted(order): fail("S5_1_TRUE_PATH_ORDER_CHANGED",repr(order))
    clears=[r11.rfind(x) for x in ("lastTemplateRecurrenceProbe = null;","lastRequestLineageProbe = null;","lastCommunitySourceHandoffProbe = null;")]
    if any(x<0 for x in clears) or clears!=sorted(clears): fail("S5_1_FALSE_PATH_ORDER_CHANGED",repr(clears))
    branch_equivalence_harness()


def verify_s5_1(p11,p12):
    names=module_names(p11)
    if module_names(p12)!=names or require_surface(p11)!=require_surface(p12): fail("S5_1_P12_GRAPH_CHANGED")
    same_counts(p11,p12,SIDE_EFFECT_MARKERS,"S5_1_P12_SIDE_EFFECT_CHANGED")
    same_counts(p11,p12,PROTECTED_MARKERS,"S5_1_P12_PROTECTED_MARKER_CHANGED")
    for name in names:
        if name=="state-reconcile": continue
        if module_text(p11,name)!=module_text(p12,name): fail("S5_1_P12_UNRELATED_MODULE_CHANGED",name)
    before=module_text(p11,"state-reconcile")
    after=module_text(p12,"state-reconcile")
    expected=before.replace(S5_1_HELPER_ANCHOR,S5_1_HELPER_INSERT,1)
    for old,new in S5_1_REPLACEMENTS: expected=expected.replace(old,new,1)
    if expected!=after: fail("S5_1_P11_P12_DELTA_WIDENED")
    if before.count("function optionalTrimmedString(")!=0 or after.count("function optionalTrimmedString(")!=1 or after.count("optionalTrimmedString(")!=4: fail("S5_1_HELPER_COUNT_INVALID")
    for old,_new in S5_1_REPLACEMENTS:
        if old not in before or old in after: fail("S5_1_OLD_EXPRESSION_DISPOSITION_INVALID")
    if before.count("module.exports = { initialState, reconcileState };")!=1 or after.count("module.exports = { initialState, reconcileState };")!=1: fail("S5_1_EXPORT_SURFACE_CHANGED")
    same_counts(before,after,S5_1_MIGRATION_MARKERS,"S5_1_MIGRATION_MARKER_CHANGED")
    same_counts(before,after,S5_1_NORMALIZER_MARKERS,"S5_1_NORMALIZER_CALL_CHANGED")
    for marker in ("const STATE_VERSION = 5;","const CORE_STATE_VERSION = 10;"):
        if p11.count(marker)!=p12.count(marker): fail("S5_1_STATE_VERSION_MARKER_CHANGED",marker)
    order_markers=(
        "s.broadcastAirtime = optionalTrimmedString(s.broadcastAirtime);",
        "s.broadcastAirtimeStart = optionalTrimmedString(s.broadcastAirtimeStart);",
        "s.episodeNo =",
        "s.narrativeTimestamp = optionalTrimmedString(s.narrativeTimestamp);",
    )
    positions=[after.find(x) for x in order_markers]
    if any(x<0 for x in positions) or positions!=sorted(positions): fail("S5_1_FIELD_ASSIGNMENT_ORDER_CHANGED",repr(positions))
    migration_positions=[after.find(x) for x in S5_1_MIGRATION_MARKERS]
    if any(x<0 for x in migration_positions) or migration_positions!=sorted(migration_positions): fail("S5_1_MIGRATION_ORDER_CHANGED",repr(migration_positions))
    trimmed_string_equivalence_harness()


def verify_identity(text):
    values=[re.search(r"^//@version\s+([^\s]+)\s*$",text,re.M),re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';",text),re.search(r"const HOST_COMPAT_VERSION = '([^']+)';",text)]
    got=[m.group(1) if m else None for m in values]
    if got!=[TARGET_VERSION,TARGET_VERSION,TARGET_VERSION]: fail("S5_1_CUMULATIVE_IDENTITY_INVALID",repr(got))


def syntax_check(path):
    result=subprocess.run(["node","--check",str(path)],text=True,capture_output=True)
    if result.returncode!=0: fail("S5_1_NODE_SYNTAX_FAIL",(result.stderr or result.stdout).strip())


def main():
    originals=[]
    for path in FILES:
        if not path.exists(): fail("S5_1_SOURCE_MISSING",str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0]!=originals[1]: fail("S5_1_PARENT_LATEST_INSTALL_DIVERGED")
    if originals[0].count(f"//@version {FROM_VERSION}")!=1: fail("S5_1_PARENT_VERSION_MISMATCH")

    p0=originals[0]
    p1=apply_s1(p0)
    p2=apply_s2_1(p1)
    p3=apply_s2_2(p2)
    p4=apply_s2_3(p3)
    p5=apply_s3_1(p4)
    p6=apply_s3_2(p5)
    p7=apply_s3_3(p6)
    p8=apply_s3_4(p7)
    verify_p0_p8((p0,p1,p2,p3,p4,p5,p6,p7,p8)); verify_identity(p8)
    p9=apply_s4_1(p8); verify_s4_1(p8,p9); verify_identity(p9)
    p10=apply_s4_2(p9); verify_s4_2(p9,p10); verify_identity(p10)
    p11=apply_s4_3(p10); verify_s4_3(p10,p11); verify_identity(p11)
    p12=apply_s5_1(p11); verify_s5_1(p11,p12); verify_identity(p12)

    for path in FILES:
        path.write_text(p12,encoding="utf-8")
        syntax_check(path)
    if FILES[0].read_bytes()!=FILES[1].read_bytes(): fail("S5_1_OUTPUT_LATEST_INSTALL_DIVERGED")
    print("S5_1_BUILD_PASS")


if __name__=="__main__":
    main()
