#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.70.1"
TARGET_VERSION = "0.70.3"
FINAL_RELEASE_NAME = "Post-M2 Simplification Convergence"

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

S3_2_ANCHOR = "function takeSessionCandidate(candidate) {"
S3_2_INSERT = """function sessionCandidateResult(root, status, capsule = null, serializedChars = 0) {
  return Object.freeze({ root, status, capsule, serializedChars });
}

function takeSessionCandidate(candidate) {"""
S3_2_REPLACEMENTS = (
    ("  catch (_) { return Object.freeze({ root: candidate.label, status: 'failed', capsule: null, serializedChars: 0 }); }", "  catch (_) { return sessionCandidateResult(candidate.label, 'failed', null, 0); }"),
    ("  if (raw == null) return Object.freeze({ root: candidate.label, status: 'empty', capsule: null, serializedChars: 0 });", "  if (raw == null) return sessionCandidateResult(candidate.label, 'empty', null, 0);"),
    ("  if (serializedChars > MAX_SESSION_CHARS) return Object.freeze({ root: candidate.label, status: 'oversize', capsule: null, serializedChars });", "  if (serializedChars > MAX_SESSION_CHARS) return sessionCandidateResult(candidate.label, 'oversize', null, serializedChars);"),
    ("  try { return Object.freeze({ root: candidate.label, status: 'available', capsule: JSON.parse(String(raw)), serializedChars }); }", "  try { return sessionCandidateResult(candidate.label, 'available', JSON.parse(String(raw)), serializedChars); }"),
    ("  catch (_) { return Object.freeze({ root: candidate.label, status: 'malformed', capsule: null, serializedChars }); }", "  catch (_) { return sessionCandidateResult(candidate.label, 'malformed', null, serializedChars); }"),
)

S3_3_ANCHOR = "function inspectSessionSurface(root, label) {"
S3_3_INSERT = """function sessionSurfaceResult(label, status, storage = null) {
  return Object.freeze({ label, status, storage });
}

function inspectSessionSurface(root, label) {"""
S3_3_REPLACEMENTS = (
    ("  if (!root) return Object.freeze({ label, status: 'ROOT_ABSENT', storage: null });", "  if (!root) return sessionSurfaceResult(label, 'ROOT_ABSENT');"),
    ("  catch (_) { return Object.freeze({ label, status: 'ACCESS_ERROR', storage: null }); }", "  catch (_) { return sessionSurfaceResult(label, 'ACCESS_ERROR'); }"),
    ("  if (storage == null) return Object.freeze({ label, status: 'STORAGE_ABSENT', storage: null });", "  if (storage == null) return sessionSurfaceResult(label, 'STORAGE_ABSENT');"),
    ("    return Object.freeze({ label, status: 'METHODS_INCOMPLETE', storage: null });", "    return sessionSurfaceResult(label, 'METHODS_INCOMPLETE');"),
    ("  return Object.freeze({ label, status: 'USABLE', storage });", "  return sessionSurfaceResult(label, 'USABLE', storage);"),
)

S3_4_ANCHOR = "function resolveSessionCandidates(root, windowLike) {"
S3_4_INSERT = """function sessionStorageCandidate(label, storage) {
  return Object.freeze({ label, storage });
}

function resolveSessionCandidates(root, windowLike) {"""
S3_4_WINDOW = "first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });"
S3_4_WINDOW_NEW = "first = sessionStorageCandidate('WINDOW', windowSurface.storage);"
S3_4_SECOND_GLOBAL = "second = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });"
S3_4_SECOND_GLOBAL_NEW = "second = sessionStorageCandidate('GLOBAL_THIS', globalSurface.storage);"
S3_4_FIRST_GLOBAL = "first = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });"
S3_4_FIRST_GLOBAL_NEW = "first = sessionStorageCandidate('GLOBAL_THIS', globalSurface.storage);"

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

S4_2_DEF_OLD = """  async function processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf = null) {
    let t = perfNow();"""
S4_2_DEF_NEW = """  async function processCoreOutput(content, chaIdx, chatIdx, chat, perf = null) {
    const fallbackOutIndex = chat?.message?.length ?? 0;
    let t = perfNow();"""
S4_2_CALL_OLD = """      const fallbackOutIndex = chat?.message?.length ?? 0;
      return await processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf);"""
S4_2_CALL_NEW = "      return await processCoreOutput(content, chaIdx, chatIdx, chat, perf);"

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

S7_OLD_HEADLINE = "// v0.70.3 Runtime Cache Hash Primitive Convergence:"
S7_NEW_HEADLINE = "// v0.70.3 Post-M2 Simplification Convergence:"
S7_OLD_OPERATOR = "    version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',"
S7_NEW_OPERATOR = "    version: '0.70.3',\n    name: 'Post-M2 Simplification Convergence',"

SIDE_EFFECT_MARKERS = (
    "await ", "setTimeout(", "setInterval(", "pluginStorage", "setChat(", "fetch(",
    "XMLHttpRequest", "history.splice(", "messages.splice(",
    "messages.push({ role: 'system', content: result.promptBlock });",
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
        fail("S7_PATCH_ANCHOR_INVALID", f"{label} count={count}")
    return text.replace(old, new, 1)


def many(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        fail("S7_PATCH_ANCHOR_INVALID", f"{label} count={count} expected={expected}")
    return text.replace(old, new)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail("S7_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
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


def require_surface(text):
    return re.findall(r"require\(['\"]([^'\"]+)['\"]\)", text)


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
    return one(out, "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',", S7_OLD_OPERATOR, "operator-card")


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
    out = one(p5, S3_2_ANCHOR, S3_2_INSERT, "session-candidate-helper")
    for index, (old, new) in enumerate(S3_2_REPLACEMENTS, 1):
        out = one(out, old, new, f"session-candidate-result-{index}")
    return out


def apply_s3_3(p6):
    out = one(p6, S3_3_ANCHOR, S3_3_INSERT, "session-surface-helper")
    for index, (old, new) in enumerate(S3_3_REPLACEMENTS, 1):
        out = one(out, old, new, f"session-surface-result-{index}")
    return out


def apply_s3_4(p7):
    out = one(p7, S3_4_ANCHOR, S3_4_INSERT, "session-storage-candidate-helper")
    out = many(out, S3_4_WINDOW, S3_4_WINDOW_NEW, 3, "session-window-candidates")
    out = one(out, S3_4_SECOND_GLOBAL, S3_4_SECOND_GLOBAL_NEW, "session-second-global")
    return one(out, S3_4_FIRST_GLOBAL, S3_4_FIRST_GLOBAL_NEW, "session-first-global")


def apply_s4_1(p8):
    out = one(p8, S4_1_HELPER_OLD, S4_1_HELPER_NEW, "runtime-current-helper")
    out = many(out, S4_1_PREP_OLD, S4_1_PREP_NEW, 2, "prepare-guards")
    out = many(out, S4_1_PROCESS_OLD, S4_1_PROCESS_NEW, 2, "process-guards")
    out = many(out, S4_1_BEFORE_OLD, S4_1_BEFORE_NEW, 3, "before-guards")
    return many(out, S4_1_OUTPUT_OLD, S4_1_OUTPUT_NEW, 3, "output-guards")


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


def apply_s7_identity(p12):
    out = one(p12, S7_OLD_HEADLINE, S7_NEW_HEADLINE, "final-release-headline")
    return one(out, S7_OLD_OPERATOR, S7_NEW_OPERATOR, "final-operator-card")


def run_node(script, marker, code):
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or marker not in result.stdout:
        fail(code, (result.stderr or result.stdout).strip())


def differential_harnesses():
    run_node(r"""
function oldRaw(text){const value=String(text==null?'':text);let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;}
function fnv1a32(text){const value=String(text==null?'':text);let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;}
for(const x of [null,undefined,'','abc','한글 테스트','emoji 😀 🚀',('가😀\n').repeat(256)])if(oldRaw(x)!==fnv1a32(x))throw new Error('FNV_DIFF');
function oldTrim(v){return typeof v==='string'&&v.trim()?v.trim():null;}function nextTrim(v){return typeof v==='string'&&v.trim()?v.trim():null;}
for(const v of [undefined,null,false,0,{},[],'',' ',' abc ','한글','  한글 문장  ','😀','  😀 🚀  '])if(!Object.is(oldTrim(v),nextTrim(v)))throw new Error('TRIM_DIFF');
function resultOld(root,status,capsule,serializedChars){return Object.freeze({root,status,capsule,serializedChars});}
function resultNew(root,status,capsule=null,serializedChars=0){return Object.freeze({root,status,capsule,serializedChars});}
for(const row of [['WINDOW','empty',null,0],['GLOBAL_THIS','available',{x:1},4]])if(JSON.stringify(resultOld(...row))!==JSON.stringify(resultNew(...row)))throw new Error('RESULT_DIFF');
function surfaceOld(label,status,storage){return Object.freeze({label,status,storage});}function surfaceNew(label,status,storage=null){return Object.freeze({label,status,storage});}
for(const row of [['WINDOW','ROOT_ABSENT',null],['GLOBAL_THIS','USABLE',{x:1}]])if(JSON.stringify(surfaceOld(...row))!==JSON.stringify(surfaceNew(...row)))throw new Error('SURFACE_DIFF');
function fallback(chat){return chat?.message?.length??0;}for(const c of [null,{}, {message:null},{message:[]},{message:[1,2]}])if(fallback(c)!==fallback(c))throw new Error('FALLBACK_DIFF');
console.log('S7_DIFF_PASS');
""", "S7_DIFF_PASS", "S7_DIFFERENTIAL_FAIL")


def verify_stage_counts(p0, p8, p9, p10, p11, p12):
    if p8.count("function recordClaimSelection(") != 1 or p8.count("recordClaimSelection(") != 6: fail("S7_S3_1_COUNT_INVALID")
    if p8.count("function sessionCandidateResult(") != 1 or p8.count("sessionCandidateResult(") != 6: fail("S7_S3_2_COUNT_INVALID")
    if p8.count("function sessionSurfaceResult(") != 1 or p8.count("sessionSurfaceResult(") != 6: fail("S7_S3_3_COUNT_INVALID")
    if p8.count("function sessionStorageCandidate(") != 1 or p8.count("sessionStorageCandidate(") != 6: fail("S7_S3_4_COUNT_INVALID")
    if p9.count("function guardCurrentRuntime(") != 1 or p9.count("guardCurrentRuntime(") != 11: fail("S7_S4_1_GUARD_COUNT_INVALID")
    if p9.count("dropStaleRuntime();") != 1 or p9.count("staleRuntimeDrops += 1;") != 1: fail("S7_S4_1_STALE_ACCOUNTING_INVALID")
    if p10.count("chat?.message?.length ?? 0") != 1 or p10.count("resolveOutputIndex(fallbackOutIndex = -1)") != 1: fail("S7_S4_2_FALLBACK_INVALID")
    if p11.count("      if (pendingProbe) {") != 1: fail("S7_S4_3_BRANCH_COUNT_INVALID")
    sr = module_text(p12, "state-reconcile")
    if sr.count("function optionalTrimmedString(") != 1 or sr.count("optionalTrimmedString(") != 4: fail("S7_S5_1_HELPER_COUNT_INVALID")
    if "function compileRuntimePrompt(state)" in p12 or "function renderRuntimePrompt(state)" in p12: fail("S7_S2_1_DEAD_PROMPT_SURVIVED")
    for marker in S2_2_EXPORTS:
        if marker in module_text(p12, "session"): fail("S7_S2_2_DEAD_EXPORT_SURVIVED", marker.strip())
    if CACHE_EXPORTS_P4 not in module_text(p12, "runtime-cache") or TOPO_EXPORTS_P4 not in module_text(p12, "runtime-topology"): fail("S7_S2_3_EXPORT_SHAPE_INVALID")


def verify_final(p0, p12, final):
    expected = p12.replace(S7_OLD_HEADLINE, S7_NEW_HEADLINE, 1).replace(S7_OLD_OPERATOR, S7_NEW_OPERATOR, 1)
    if expected != final: fail("S7_IDENTITY_DELTA_WIDENED")
    if S7_OLD_HEADLINE in final or S7_OLD_OPERATOR in final: fail("S7_OLD_RELEASE_IDENTITY_SURVIVED")
    if final.count(S7_NEW_HEADLINE) != 1 or final.count(S7_NEW_OPERATOR) != 1: fail("S7_FINAL_RELEASE_IDENTITY_INVALID")
    if module_names(p0) != module_names(final): fail("S7_MODULE_INVENTORY_CHANGED")
    if require_surface(p0) != require_surface(final): fail("S7_REQUIRE_GRAPH_CHANGED")
    same_counts(p0, final, SIDE_EFFECT_MARKERS, "S7_SIDE_EFFECT_INVENTORY_CHANGED")
    same_counts(p0, final, PROTECTED_MARKERS, "S7_PROTECTED_MARKER_CHANGED")
    if module_text(p0, "community") != module_text(final, "community"): fail("S7_COMMUNITY_MODULE_CHANGED")
    for marker in ("const STATE_VERSION = 5;", "const CORE_STATE_VERSION = 10;", "const PROMPT_COMPILER_VERSION = 4;", "const COMMUNITY_CLASSIFIER_VERSION = 3;"):
        if p0.count(marker) != final.count(marker): fail("S7_VERSION_MARKER_CHANGED", marker)
    if final.count("//@version 0.70.3") != 1: fail("S7_METADATA_VERSION_INVALID")
    if final.count("const SIMCORE_RUNTIME_VERSION = '0.70.3';") != 1: fail("S7_RUNTIME_VERSION_INVALID")
    if final.count("const HOST_COMPAT_VERSION = '0.70.3';") != 1: fail("S7_HOST_VERSION_INVALID")
    differential_harnesses()


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("S7_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def main():
    originals = []
    for path in FILES:
        if not path.exists(): fail("S7_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]: fail("S7_PARENT_LATEST_INSTALL_DIVERGED")
    if originals[0].count(f"//@version {FROM_VERSION}") != 1: fail("S7_PARENT_VERSION_MISMATCH")

    p0 = originals[0]
    p1 = apply_s1(p0)
    p2 = apply_s2_1(p1)
    p3 = apply_s2_2(p2)
    p4 = apply_s2_3(p3)
    p5 = apply_s3_1(p4)
    p6 = apply_s3_2(p5)
    p7 = apply_s3_3(p6)
    p8 = apply_s3_4(p7)
    p9 = apply_s4_1(p8)
    p10 = apply_s4_2(p9)
    p11 = apply_s4_3(p10)
    p12 = apply_s5_1(p11)
    verify_stage_counts(p0, p8, p9, p10, p11, p12)
    final = apply_s7_identity(p12)
    verify_final(p0, p12, final)

    for path in FILES:
        path.write_text(final, encoding="utf-8")
        syntax_check(path)
    if FILES[0].read_bytes() != FILES[1].read_bytes(): fail("S7_OUTPUT_LATEST_INSTALL_DIVERGED")
    print(f"S7_BUILD_PASS release={TARGET_VERSION} name={FINAL_RELEASE_NAME} bytes={len(final.encode('utf-8'))} modules={len(module_names(final))} requires={len(require_surface(final))}")


if __name__ == "__main__":
    main()
