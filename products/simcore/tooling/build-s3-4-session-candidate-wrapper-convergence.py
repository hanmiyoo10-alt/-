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
        fail("S3_4_PATCH_ANCHOR_INVALID", f"{label} count={count}")
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail("S3_4_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    return start, next_start if next_start >= 0 else len(text)


def module_text(text, name):
    start, end = module_bounds(text, name)
    return text[start:end]


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)", function \(require, module, exports\) \{', text)


def require_surface(source):
    return re.findall(r"require\(['\"]([^'\"]+)['\"]\)", source)


def same_counts(before, after, markers, code):
    for marker in markers:
        if before.count(marker) != after.count(marker):
            fail(code, f"{marker}: {before.count(marker)} -> {after.count(marker)}")


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


def equivalence_harness():
    script = r"""
function oldRaw(text) {
  const value = String(text == null ? '' : text); let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function fnv1a32(text) {
  const value = String(text == null ? '' : text); let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
for (const x of [null, undefined, '', 'abc', '한글 테스트', 'emoji 😀 🚀', ('가😀\n').repeat(1024)]) {
  if (oldRaw(x) !== fnv1a32(x)) throw new Error('FNV_DIFF');
}
function oldSession(root,status,capsule,serializedChars){ return Object.freeze({root,status,capsule,serializedChars}); }
function sessionCandidateResult(root,status,capsule=null,serializedChars=0){ return Object.freeze({root,status,capsule,serializedChars}); }
for (const row of [['WINDOW','failed',null,0],['GLOBAL_THIS','available',{schema:1},12],['WINDOW','malformed',null,7]]) {
  const a=oldSession(...row), b=sessionCandidateResult(...row);
  if (JSON.stringify(a)!==JSON.stringify(b) || Object.keys(a).join(',')!==Object.keys(b).join(',') || !Object.isFrozen(b)) throw new Error('SESSION_RESULT_DIFF');
}
function oldSurface(label,status,storage){ return Object.freeze({label,status,storage}); }
function sessionSurfaceResult(label,status,storage=null){ return Object.freeze({label,status,storage}); }
for (const row of [['WINDOW','ROOT_ABSENT',null],['GLOBAL_THIS','USABLE',{id:1}]]) {
  const a=oldSurface(...row), b=sessionSurfaceResult(...row);
  if (JSON.stringify(a)!==JSON.stringify(b) || Object.keys(a).join(',')!==Object.keys(b).join(',') || !Object.isFrozen(b)) throw new Error('SURFACE_RESULT_DIFF');
}
function oldCandidate(label,storage){ return Object.freeze({label,storage}); }
function sessionStorageCandidate(label,storage){ return Object.freeze({label,storage}); }
for (const label of ['WINDOW','GLOBAL_THIS']) {
  const storage={id:label}; const a=oldCandidate(label,storage), b=sessionStorageCandidate(label,storage);
  if (JSON.stringify(a)!==JSON.stringify(b) || Object.keys(a).join(',')!==Object.keys(b).join(',') || b.storage!==storage || !Object.isFrozen(b)) throw new Error('WRAPPER_DIFF');
}
console.log('S3_4_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S3_4_EQ_PASS" not in result.stdout:
        fail("S3_4_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


def verify_stages(stages):
    p0, p1, p2, p3, p4, p5, p6, p7, p8 = stages
    names = module_names(p0)
    if not names or any(module_names(x) != names for x in stages[1:]):
        fail("S3_4_MODULE_GRAPH_CHANGED")
    if require_surface(p0) != require_surface(p8):
        fail("S3_4_REQUIRE_SURFACE_CHANGED")
    same_counts(p0, p8, SIDE_EFFECT_MARKERS, "S3_4_SIDE_EFFECT_CHANGED")
    same_counts(p0, p8, PROTECTED_MARKERS, "S3_4_PROTECTED_MARKER_CHANGED")

    c0 = module_text(p0, "runtime-cache")
    c1 = module_text(p1, "runtime-cache")
    if c0.count("0x811c9dc5") != 5 or c1.count("0x811c9dc5") != 3:
        fail("S3_4_S1_FNV_SHAPE_INVALID")
    for marker in ("function fnv1a32(text)", "lines.map(fnv1a32)", "currentLines.map(fnv1a32)"):
        if marker not in c1:
            fail("S3_4_S1_MARKER_MISSING", marker)

    if "function compileRuntimePrompt(state)" in p2 or "function renderRuntimePrompt(state)" in p2 or S2_1_SESSION_ALIAS in p2 or S2_1_SESSION_EXPORT in p2:
        fail("S3_4_S2_1_DEAD_SEAM_SURVIVED")
    for marker in S2_2_EXPORTS:
        if marker in module_text(p3, "session"):
            fail("S3_4_S2_2_DEAD_EXPORT_SURVIVED", marker.strip())
    if CACHE_EXPORTS_P4 not in module_text(p4, "runtime-cache") or TOPO_EXPORTS_P4 not in module_text(p4, "runtime-topology"):
        fail("S3_4_S2_3_EXPORT_SHAPE_INVALID")

    t4 = module_text(p4, "runtime-telemetry")
    t5 = module_text(p5, "runtime-telemetry")
    t6 = module_text(p6, "runtime-telemetry")
    t7 = module_text(p7, "runtime-telemetry")
    t8 = module_text(p8, "runtime-telemetry")
    if t5.count("function recordClaimSelection(") != 1 or t5.count("recordClaimSelection(") != 6:
        fail("S3_4_S3_1_HELPER_COUNT_INVALID")
    if t6.count("function sessionCandidateResult(") != 1 or t6.count("sessionCandidateResult(") != 6:
        fail("S3_4_S3_2_HELPER_COUNT_INVALID")
    if t7.count("function sessionSurfaceResult(") != 1 or t7.count("sessionSurfaceResult(") != 6:
        fail("S3_4_S3_3_HELPER_COUNT_INVALID")
    if t8.count("function sessionStorageCandidate(") != 1 or t8.count("sessionStorageCandidate(") != 6:
        fail("S3_4_HELPER_COUNT_INVALID")
    if t7.replace(S3_4_OLD, S3_4_NEW, 1) != t8:
        fail("S3_4_P7_P8_DELTA_WIDENED")
    for name in names:
        if name != "runtime-telemetry" and module_text(p7, name) != module_text(p8, name):
            fail("S3_4_P8_NON_TARGET_MODULE_CHANGED", name)

    for marker in TELEMETRY_CONSTANTS:
        if any(module_text(x, "runtime-telemetry").count(marker) != 1 for x in (p4, p5, p6, p7, p8)):
            fail("S3_4_TELEMETRY_CONSTANT_CHANGED", marker)
    if "const HOST_COMPAT_VERSION = '0.70.3';" not in t8:
        fail("S3_4_HOST_COMPAT_IDENTITY_INVALID")

    order = (
        "inspectSessionSurface(windowLike, 'WINDOW')",
        "inspectSessionSurface(root, 'GLOBAL_THIS')",
        "windowSurface.storage === globalSurface.storage",
        "relation = 'SAME_OBJECT'",
        "relation = 'DISTINCT_OBJECTS'",
        "relation = 'SINGLE_CANDIDATE'",
    )
    positions = [t8.find(x) for x in order]
    if any(x < 0 for x in positions) or positions != sorted(positions):
        fail("S3_4_RELATION_ORDER_CHANGED", repr(positions))

    exports_match = re.search(r"module\.exports\s*=\s*\{[^}]+\};", t8, re.S)
    for helper in ("recordClaimSelection", "sessionCandidateResult", "sessionSurfaceResult", "sessionStorageCandidate"):
        if not exports_match or helper in exports_match.group(0):
            fail("S3_4_PRIVATE_HELPER_EXPORTED", helper)
    equivalence_harness()


def verify_identity(text):
    values = [
        re.search(r"^//@version\s+([^\s]+)\s*$", text, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text),
    ]
    got = [m.group(1) if m else None for m in values]
    if got != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail("S3_4_CUMULATIVE_IDENTITY_INVALID", repr(got))


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("S3_4_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail("S3_4_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]:
        fail("S3_4_PARENT_LATEST_INSTALL_DIVERGED")
    if originals[0].count(f"//@version {FROM_VERSION}") != 1:
        fail("S3_4_PARENT_VERSION_MISMATCH")

    p0 = originals[0]
    p1 = apply_s1(p0)
    p2 = apply_s2_1(p1)
    p3 = apply_s2_2(p2)
    p4 = apply_s2_3(p3)
    p5 = apply_s3_1(p4)
    p6 = apply_s3_2(p5)
    p7 = apply_s3_3(p6)
    p8 = apply_s3_4(p7)
    verify_stages((p0, p1, p2, p3, p4, p5, p6, p7, p8))
    verify_identity(p8)

    for path in FILES:
        path.write_text(p8, encoding="utf-8")
        syntax_check(path)
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail("S3_4_OUTPUT_LATEST_INSTALL_DIVERGED")
    print("S3_4_BUILD_PASS")


if __name__ == "__main__":
    main()
