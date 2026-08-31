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
ROLLING_PREFIX_1 = """  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    prefixHashes[i] = h >>> 0;
  }"""
ROLLING_PREFIX_2 = """  let h = 0x811c9dc5;
  let prefixChars = 0;
  for (let i = 0; i < limit; i++) {
    h ^= current.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    if ((h >>> 0) !== Number(sketch.prefixHashes[i])) break;
    prefixChars = i + 1;
  }"""

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
SESSION_CAPABILITY_EXPR = "typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function'"

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
SESSION_SIDE_EFFECT_MARKERS = (
    "candidate.storage.getItem(SESSION_KEY)",
    "candidate.storage.removeItem(SESSION_KEY)",
    "JSON.parse(String(raw))",
)


def fail(code, detail=""):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("S3_3_PATCH_ANCHOR_INVALID", f"{label} count={count}")
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail("S3_3_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
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


def function_slice(source, name):
    declaration = re.compile(rf"(?m)^(?:async\s+)?function\s+{re.escape(name)}\s*\(")
    matches = list(declaration.finditer(source))
    if len(matches) != 1:
        fail("S3_3_FUNCTION_BOUNDARY_INVALID", f"{name} starts={[m.start() for m in matches]}")
    start = matches[0].start()
    next_function = re.search(r"(?m)^(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(", source[matches[0].end():])
    end = matches[0].end() + next_function.start() if next_function else len(source)
    return source[start:end]


def fnv_equivalence():
    script = r"""
function oldRaw(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function fnv1a32(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const samples = [null, undefined, '', 'abc', '한글 테스트', 'line1\nline2', 'line1\r\nline2', 'emoji 😀 🚀', ('가😀\n').repeat(4096)];
for (const sample of samples) {
  if (oldRaw(sample) !== fnv1a32(sample)) throw new Error('FNV_RAW_DIFF');
  if (oldRaw(sample).toString(16).padStart(8, '0') !== fnv1a32(sample).toString(16).padStart(8, '0')) throw new Error('FNV_FORMAT_DIFF');
}
console.log('S3_3_FNV_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S3_3_FNV_EQ_PASS" not in result.stdout:
        fail("S3_3_S1_FNV_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


def claim_probe_equivalence():
    script = r"""
function oldAssembly(prior, memoryValidation, sessionValidation, hostValidation, selected, selectedRoot) {
  return Object.freeze({ ...(prior || {}), memoryValidation, sessionValidation, hostValidation, selected, selectedRoot });
}
let lastClaimProbe = null;
function recordClaimSelection(memoryValidation, sessionValidation, hostValidation, selected, selectedRoot) {
  lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation, sessionValidation, hostValidation, selected, selectedRoot });
  return lastClaimProbe;
}
const priors = [null, {}, {memory:'available', session:'empty', retainedBodies:false}, {hostLocal:'CONSUMED', surface:{relation:'NONE'}}];
const tuples = [
  ['exact','empty','empty','memory','NONE'],
  ['mismatch','exact','standby','session','WINDOW'],
  ['empty','exact','empty','session','GLOBAL_THIS'],
  ['stale','mismatch','exact','host-local','NONE'],
  ['empty','empty','mismatch','NONE','NONE'],
];
for (const prior of priors) for (const tuple of tuples) {
  const expected = oldAssembly(prior, ...tuple);
  lastClaimProbe = prior;
  const actual = recordClaimSelection(...tuple);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('CLAIM_PROBE_DIFF');
  if (!Object.isFrozen(actual)) throw new Error('CLAIM_PROBE_NOT_FROZEN');
}
console.log('S3_3_CLAIM_PROBE_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S3_3_CLAIM_PROBE_EQ_PASS" not in result.stdout:
        fail("S3_3_CLAIM_PROBE_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


def session_candidate_result_equivalence():
    script = r"""
function oldResult(root, status, capsule, serializedChars) {
  return Object.freeze({ root, status, capsule, serializedChars });
}
function sessionCandidateResult(root, status, capsule = null, serializedChars = 0) {
  return Object.freeze({ root, status, capsule, serializedChars });
}
const cases = [
  ['WINDOW','failed',null,0],
  ['GLOBAL_THIS','empty',null,0],
  ['WINDOW','oversize',null,16385],
  ['GLOBAL_THIS','available',{schema:1,sourceVersion:'0.70.3'},128],
  ['WINDOW','malformed',null,16384],
];
for (const row of cases) {
  const expected = oldResult(...row);
  const actual = sessionCandidateResult(...row);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('SESSION_CANDIDATE_RESULT_DIFF');
  if (Object.keys(expected).join(',') !== Object.keys(actual).join(',')) throw new Error('SESSION_CANDIDATE_PROPERTY_ORDER_DIFF');
  if (!Object.isFrozen(actual)) throw new Error('SESSION_CANDIDATE_RESULT_NOT_FROZEN');
}
console.log('S3_3_SESSION_CANDIDATE_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S3_3_SESSION_CANDIDATE_EQ_PASS" not in result.stdout:
        fail("S3_3_SESSION_CANDIDATE_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


def session_surface_result_equivalence():
    script = r"""
function oldResult(label, status, storage) {
  return Object.freeze({ label, status, storage });
}
function sessionSurfaceResult(label, status, storage = null) {
  return Object.freeze({ label, status, storage });
}
const store = { tag: 'representative-storage' };
const cases = [
  ['WINDOW','ROOT_ABSENT',null],
  ['GLOBAL_THIS','ACCESS_ERROR',null],
  ['WINDOW','STORAGE_ABSENT',null],
  ['GLOBAL_THIS','METHODS_INCOMPLETE',null],
  ['WINDOW','USABLE',store],
  ['GLOBAL_THIS','USABLE',store],
];
for (const row of cases) {
  const expected = oldResult(...row);
  const actual = sessionSurfaceResult(...row);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('SESSION_SURFACE_RESULT_DIFF');
  if (Object.keys(expected).join(',') !== Object.keys(actual).join(',')) throw new Error('SESSION_SURFACE_PROPERTY_ORDER_DIFF');
  if (!Object.isFrozen(actual)) throw new Error('SESSION_SURFACE_RESULT_NOT_FROZEN');
}
console.log('S3_3_SESSION_SURFACE_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S3_3_SESSION_SURFACE_EQ_PASS" not in result.stdout:
        fail("S3_3_SESSION_SURFACE_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


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
    return one(p5, S3_2_OLD, S3_2_NEW, "session-candidate-result-convergence")


def apply_s3_3(p6):
    return one(p6, S3_3_OLD, S3_3_NEW, "session-surface-result-convergence")


def verify_prior_stages(p0, p1, p2, p3, p4):
    if not (module_names(p0) == module_names(p1) == module_names(p2) == module_names(p3) == module_names(p4)):
        fail("S3_3_PRIOR_MODULE_GRAPH_CHANGED")
    c0, c1 = module_text(p0, "runtime-cache"), module_text(p1, "runtime-cache")
    if c0.count("0x811c9dc5") != 5 or c1.count("0x811c9dc5") != 3:
        fail("S3_3_S1_FNV_SHAPE_INVALID")
    for marker in ("function fnv1a32(text)", "lines.map(fnv1a32)", "currentLines.map(fnv1a32)", ROLLING_PREFIX_1, ROLLING_PREFIX_2):
        if marker not in c1:
            fail("S3_3_S1_FNV_MARKER_MISSING", marker[:80])
    if require_surface(c0) != require_surface(c1):
        fail("S3_3_S1_CACHE_REQUIRES_CHANGED")
    fnv_equivalence()

    if "function compileRuntimePrompt(state)" in p2 or "function renderRuntimePrompt(state)" in p2 or S2_1_SESSION_ALIAS in p2 or S2_1_SESSION_EXPORT in p2:
        fail("S3_3_S2_1_DEAD_SEAM_SURVIVED")
    if "function compileRuntimePromptParts(state)" not in module_text(p2, "prompt") or "const promptCompiled = compileRuntimePromptParts(state);" not in module_text(p2, "session"):
        fail("S3_3_S2_1_LIVE_PATH_MISSING")

    for marker in S2_2_EXPORTS:
        if marker in module_text(p3, "session"):
            fail("S3_3_S2_2_DEAD_EXPORT_SURVIVED", marker.strip())
    for marker in ("function inspectPreviousBEndOutput(historyMessages, sendIndex) {", "structure.validateStructure(prepared.content, base.pending)", "lifecycle.prepareTurn(base, userText, promptProbe, sendIndex, previousOutputFacts)", "CoreRulesetSession,", "fingerprintText: kernel.fingerprintText,"):
        if marker not in module_text(p3, "session"):
            fail("S3_3_S2_2_LIVE_PATH_MISSING", marker)

    cb, ca = module_text(p3, "runtime-cache"), module_text(p4, "runtime-cache")
    tb, ta = module_text(p3, "runtime-topology"), module_text(p4, "runtime-topology")
    if cb.replace(CACHE_EXPORTS_P3, CACHE_EXPORTS_P4, 1) != ca:
        fail("S3_3_S2_3_RUNTIME_CACHE_DELTA_WIDENED")
    if tb.replace(TOPO_EXPORTS_P3, TOPO_EXPORTS_P4, 1) != ta:
        fail("S3_3_S2_3_RUNTIME_TOPOLOGY_DELTA_WIDENED")
    if require_surface(cb) != require_surface(ca) or require_surface(tb) != require_surface(ta):
        fail("S3_3_S2_3_REQUIRE_SURFACE_CHANGED")
    for name in module_names(p3):
        if name not in ("runtime-cache", "runtime-topology") and module_text(p3, name) != module_text(p4, name):
            fail("S3_3_S2_3_NON_TARGET_MODULE_CHANGED", name)
    same_counts(p0, p1, SIDE_EFFECT_MARKERS, "S3_3_S1_SIDE_EFFECT_CHANGED")
    same_counts(p1, p2, SIDE_EFFECT_MARKERS, "S3_3_S2_1_SIDE_EFFECT_CHANGED")
    same_counts(p2, p3, SIDE_EFFECT_MARKERS, "S3_3_S2_2_SIDE_EFFECT_CHANGED")
    same_counts(p3, p4, SIDE_EFFECT_MARKERS, "S3_3_S2_3_SIDE_EFFECT_CHANGED")


def verify_s3_1(p4, p5):
    if module_names(p4) != module_names(p5):
        fail("S3_3_S3_1_MODULE_GRAPH_CHANGED")
    for name in module_names(p4):
        if name != "runtime-telemetry" and module_text(p4, name) != module_text(p5, name):
            fail("S3_3_S3_1_NON_TARGET_MODULE_CHANGED", name)
    t4 = module_text(p4, "runtime-telemetry")
    t5 = module_text(p5, "runtime-telemetry")
    expected = t4.replace(HOST_REASON_AND_VALIDATE, HOST_REASON_HELPER_AND_VALIDATE, 1)
    for old, new in S3_ASSIGNMENTS:
        expected = expected.replace(old, new, 1)
    if expected != t5:
        fail("S3_3_S3_1_RUNTIME_TELEMETRY_DELTA_WIDENED")
    if require_surface(t4) != require_surface(t5):
        fail("S3_3_S3_1_REQUIRE_SURFACE_CHANGED")
    if t5.count("function recordClaimSelection(") != 1 or t5.count("recordClaimSelection(") != 6:
        fail("S3_3_S3_1_HELPER_COUNT_INVALID")
    exports_match = re.search(r"module\.exports\s*=\s*\{[^}]+\};", t5, re.S)
    if not exports_match or "recordClaimSelection" in exports_match.group(0):
        fail("S3_3_S3_1_HELPER_EXPORT_INVALID")
    for name in ("claim", "updateHostProbe", "getHostLocalTelemetryStoreOnce", "claimHostLocalOnce", "publish", "publishWithHostLocal", "validateCapsule", "validationClass", "sessionReason", "hostReason"):
        if function_slice(t4, name) != function_slice(t5, name):
            fail("S3_3_S3_1_FROZEN_FUNCTION_CHANGED", name)
    for marker in TELEMETRY_CONSTANTS:
        if t4.count(marker) != 1 or t5.count(marker) != 1:
            fail("S3_3_S3_1_TELEMETRY_CONSTANT_CHANGED", marker)
    if "const HOST_COMPAT_VERSION = '0.70.3';" not in t4 or "const HOST_COMPAT_VERSION = '0.70.3';" not in t5:
        fail("S3_3_S3_1_HOST_COMPAT_IDENTITY_CHANGED")
    positions = [t5.find(new) for _, new in S3_ASSIGNMENTS]
    if any(pos < 0 for pos in positions) or positions != sorted(positions):
        fail("S3_3_S3_1_SELECTION_ORDER_CHANGED", repr(positions))
    same_counts(p4, p5, SIDE_EFFECT_MARKERS, "S3_3_S3_1_SIDE_EFFECT_CHANGED")
    claim_probe_equivalence()


def verify_s3_2(p5, p6):
    if module_names(p5) != module_names(p6):
        fail("S3_3_S3_2_MODULE_GRAPH_CHANGED")
    for name in module_names(p5):
        if name != "runtime-telemetry" and module_text(p5, name) != module_text(p6, name):
            fail("S3_3_S3_2_NON_TARGET_MODULE_CHANGED", name)

    t5 = module_text(p5, "runtime-telemetry")
    t6 = module_text(p6, "runtime-telemetry")
    if t5.replace(S3_2_OLD, S3_2_NEW, 1) != t6:
        fail("S3_3_S3_2_RUNTIME_TELEMETRY_DELTA_WIDENED")
    if require_surface(t5) != require_surface(t6):
        fail("S3_3_S3_2_REQUIRE_SURFACE_CHANGED")
    if t6.count("function sessionCandidateResult(") != 1 or t6.count("sessionCandidateResult(") != 6:
        fail("S3_3_S3_2_HELPER_COUNT_INVALID")
    exports_match = re.search(r"module\.exports\s*=\s*\{[^}]+\};", t6, re.S)
    if not exports_match or "sessionCandidateResult" in exports_match.group(0):
        fail("S3_3_S3_2_HELPER_EXPORT_INVALID")

    frozen_functions = (
        "inspectSessionSurface", "resolveSessionCandidates", "surfaceDiagnostics", "serializeCapsule",
        "publishPrepared", "publish", "updateHostProbe", "getHostLocalTelemetryStoreOnce",
        "publishWithHostLocal", "takeMemory", "claim", "hostExportShape",
        "classifyConsumedHostCapsule", "claimHostLocalOnce", "validateCapsule",
        "validationClass", "sessionReason", "hostReason", "recordClaimSelection", "validate", "diagnostics",
    )
    for name in frozen_functions:
        if function_slice(t5, name) != function_slice(t6, name):
            fail("S3_3_S3_2_FROZEN_FUNCTION_CHANGED", name)

    old_take = function_slice(t5, "takeSessionCandidate")
    new_take = function_slice(t6, "takeSessionCandidate")
    expected_take = S3_2_NEW[S3_2_NEW.find("function takeSessionCandidate(candidate) {"):]
    if new_take.strip() != expected_take.strip():
        fail("S3_3_S3_2_TAKE_SESSION_CANDIDATE_SHAPE_INVALID")
    if old_take.strip() != S3_2_OLD.strip():
        fail("S3_3_S3_2_PARENT_TAKE_SESSION_CANDIDATE_DRIFT")

    for marker in SESSION_SIDE_EFFECT_MARKERS:
        if old_take.count(marker) != 1 or new_take.count(marker) != 1:
            fail("S3_3_S3_2_SESSION_SIDE_EFFECT_COUNT_CHANGED", marker)
    order_markers = (
        "candidate.storage.getItem(SESSION_KEY)",
        "if (raw == null)",
        "candidate.storage.removeItem(SESSION_KEY)",
        "const serializedChars = String(raw).length;",
        "if (serializedChars > MAX_SESSION_CHARS)",
        "JSON.parse(String(raw))",
    )
    old_positions = [old_take.find(marker) for marker in order_markers]
    new_positions = [new_take.find(marker) for marker in order_markers]
    if any(pos < 0 for pos in old_positions + new_positions):
        fail("S3_3_S3_2_SESSION_ORDER_MARKER_MISSING")
    if old_positions != sorted(old_positions) or new_positions != sorted(new_positions):
        fail("S3_3_S3_2_SESSION_SIDE_EFFECT_ORDER_CHANGED", f"old={old_positions} new={new_positions}")
    for status in ("failed", "empty", "oversize", "available", "malformed"):
        if old_take.count(f"status: '{status}'") != 1:
            fail("S3_3_S3_2_PARENT_STATUS_MAPPING_DRIFT", status)
        if new_take.count(f"'{status}'") != 1:
            fail("S3_3_S3_2_NEW_STATUS_MAPPING_INVALID", status)
    if "if (!candidate) return null;" not in new_take:
        fail("S3_3_S3_2_NULL_CANDIDATE_BEHAVIOR_CHANGED")
    for marker in TELEMETRY_CONSTANTS:
        if t5.count(marker) != 1 or t6.count(marker) != 1:
            fail("S3_3_S3_2_TELEMETRY_CONSTANT_CHANGED", marker)
    if "const HOST_COMPAT_VERSION = '0.70.3';" not in t5 or "const HOST_COMPAT_VERSION = '0.70.3';" not in t6:
        fail("S3_3_S3_2_HOST_COMPAT_IDENTITY_CHANGED")
    same_counts(p5, p6, SIDE_EFFECT_MARKERS, "S3_3_S3_2_SIDE_EFFECT_CHANGED")
    session_candidate_result_equivalence()


def verify_s3_3(p6, p7):
    if module_names(p6) != module_names(p7):
        fail("S3_3_MODULE_GRAPH_CHANGED")
    for name in module_names(p6):
        if name != "runtime-telemetry" and module_text(p6, name) != module_text(p7, name):
            fail("S3_3_NON_TARGET_MODULE_CHANGED", name)

    t6 = module_text(p6, "runtime-telemetry")
    t7 = module_text(p7, "runtime-telemetry")
    if t6.replace(S3_3_OLD, S3_3_NEW, 1) != t7:
        fail("S3_3_RUNTIME_TELEMETRY_DELTA_WIDENED")
    if require_surface(t6) != require_surface(t7):
        fail("S3_3_REQUIRE_SURFACE_CHANGED")
    if t7.count("function sessionSurfaceResult(") != 1 or t7.count("sessionSurfaceResult(") != 6:
        fail("S3_3_HELPER_COUNT_INVALID")
    exports_match = re.search(r"module\.exports\s*=\s*\{[^}]+\};", t7, re.S)
    if not exports_match or "sessionSurfaceResult" in exports_match.group(0):
        fail("S3_3_HELPER_EXPORT_INVALID")

    old_surface = function_slice(t6, "inspectSessionSurface")
    new_surface = function_slice(t7, "inspectSessionSurface")
    expected_surface = S3_3_NEW[S3_3_NEW.find("function inspectSessionSurface(root, label) {"):]
    if old_surface.strip() != S3_3_OLD.strip():
        fail("S3_3_PARENT_INSPECT_SESSION_SURFACE_DRIFT")
    if new_surface.strip() != expected_surface.strip():
        fail("S3_3_INSPECT_SESSION_SURFACE_SHAPE_INVALID")
    if old_surface.count("root.sessionStorage") != 1 or new_surface.count("root.sessionStorage") != 1:
        fail("S3_3_SESSION_STORAGE_ACCESS_COUNT_CHANGED")
    if old_surface.count(SESSION_CAPABILITY_EXPR) != 1 or new_surface.count(SESSION_CAPABILITY_EXPR) != 1:
        fail("S3_3_SESSION_CAPABILITY_EXPR_CHANGED")
    statuses = ("ROOT_ABSENT", "ACCESS_ERROR", "STORAGE_ABSENT", "METHODS_INCOMPLETE", "USABLE")
    old_positions = [old_surface.find(status) for status in statuses]
    new_positions = [new_surface.find(status) for status in statuses]
    if any(pos < 0 for pos in old_positions + new_positions):
        fail("S3_3_STATUS_MARKER_MISSING")
    if old_positions != sorted(old_positions) or new_positions != sorted(new_positions):
        fail("S3_3_STATUS_ORDER_CHANGED", f"old={old_positions} new={new_positions}")
    for status in statuses:
        if old_surface.count(status) != 1 or new_surface.count(status) != 1:
            fail("S3_3_STATUS_COUNT_CHANGED", status)

    frozen_functions = (
        "resolveSessionCandidates", "surfaceDiagnostics", "serializeCapsule", "publishPrepared", "publish",
        "updateHostProbe", "getHostLocalTelemetryStoreOnce", "publishWithHostLocal", "takeMemory",
        "sessionCandidateResult", "takeSessionCandidate", "claim", "hostExportShape", "classifyConsumedHostCapsule",
        "claimHostLocalOnce", "validateCapsule", "validationClass", "sessionReason", "hostReason",
        "recordClaimSelection", "validate", "diagnostics",
    )
    for name in frozen_functions:
        if function_slice(t6, name) != function_slice(t7, name):
            fail("S3_3_FROZEN_FUNCTION_CHANGED", name)
    for marker in TELEMETRY_CONSTANTS:
        if t6.count(marker) != 1 or t7.count(marker) != 1:
            fail("S3_3_TELEMETRY_CONSTANT_CHANGED", marker)
    if "const HOST_COMPAT_VERSION = '0.70.3';" not in t6 or "const HOST_COMPAT_VERSION = '0.70.3';" not in t7:
        fail("S3_3_HOST_COMPAT_IDENTITY_CHANGED")

    protected = (
        "recordClaimSelection", "sessionCandidateResult", "claimHostLocalOnce", "getHostLocalTelemetryStoreOnce",
        "__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__", "__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__",
        "provider cache UNVERIFIED", "Post-onSend attribution:", "const PROMPT_COMPILER_VERSION = 4;",
        "const COMMUNITY_CLASSIFIER_VERSION = 3;", "const STATE_VERSION = 5;", "const CORE_STATE_VERSION = 10;", "TAIL_AFTER_CURRENT_USER",
    )
    same_counts(p6, p7, protected, "S3_3_PROTECTED_MARKER_CHANGED")
    same_counts(p6, p7, SIDE_EFFECT_MARKERS, "S3_3_SIDE_EFFECT_CHANGED")
    session_surface_result_equivalence()


def verify_identity(text):
    values = [
        re.search(r"^//@version\s+([^\s]+)\s*$", text, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text),
    ]
    got = [m.group(1) if m else None for m in values]
    if got != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail("S3_3_CUMULATIVE_IDENTITY_INVALID", repr(got))


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("S3_3_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail("S3_3_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]:
        fail("S3_3_PARENT_LATEST_INSTALL_DIVERGED")
    if originals[0].count(f"//@version {FROM_VERSION}") != 1:
        fail("S3_3_PARENT_VERSION_MISMATCH")

    p0 = originals[0]
    p1 = apply_s1(p0)
    p2 = apply_s2_1(p1)
    p3 = apply_s2_2(p2)
    p4 = apply_s2_3(p3)
    p5 = apply_s3_1(p4)
    p6 = apply_s3_2(p5)
    p7 = apply_s3_3(p6)
    verify_prior_stages(p0, p1, p2, p3, p4)
    verify_s3_1(p4, p5)
    verify_s3_2(p5, p6)
    verify_s3_3(p6, p7)
    verify_identity(p7)

    for path in FILES:
        path.write_text(p7, encoding="utf-8")
        syntax_check(path)
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail("S3_3_OUTPUT_LATEST_INSTALL_DIVERGED")
    print("S3_3_BUILD_PASS")


if __name__ == "__main__":
    main()
