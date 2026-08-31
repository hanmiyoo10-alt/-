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

SIDE_EFFECT_MARKERS = (
    "await ", "setTimeout(", "setInterval(", "pluginStorage", "setChat(", "fetch(",
    "XMLHttpRequest", "history.splice(", "messages.splice(",
    "messages.push({ role: 'system', content: result.promptBlock });",
)


def fail(code, detail=""):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("S2_3_PATCH_ANCHOR_INVALID", f"{label} count={count}")
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail("S2_3_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
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


def fnv_equivalence():
    script = r"""
function oldRaw(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function fnv1a32(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const samples = [null, undefined, '', 'abc', '한글 테스트', 'line1\nline2', 'line1\r\nline2', 'emoji 😀 🚀', ('가😀\n').repeat(4096)];
for (const sample of samples) {
  if (oldRaw(sample) !== fnv1a32(sample)) throw new Error('FNV_RAW_DIFF');
  if (oldRaw(sample).toString(16).padStart(8, '0') !== fnv1a32(sample).toString(16).padStart(8, '0')) throw new Error('FNV_FORMAT_DIFF');
}
console.log('S2_3_FNV_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S2_3_FNV_EQ_PASS" not in result.stdout:
        fail("S2_3_S1_FNV_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


def apply_s1(p0):
    out = one(p0, f"//@version {FROM_VERSION}", f"//@version {TARGET_VERSION}", "metadata-version")
    out = one(out, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TARGET_VERSION}';", "runtime-version")
    out = one(out, f"const HOST_COMPAT_VERSION = '{FROM_VERSION}';", f"const HOST_COMPAT_VERSION = '{TARGET_VERSION}';", "host-version")
    out = one(out, "// v0.70.1 Cold First-Turn Tail Attribution:", S1_RELEASE_NOTE + "// v0.70.1 Cold First-Turn Tail Attribution:", "release-note")
    out = one(out, OLD_CACHE_HASH, NEW_CACHE_HASH, "cache-hash")
    out = one(out, OLD_LINE_HASHES, NEW_LINE_HASHES, "line-hashes")
    out = one(out, OLD_CURRENT_LINE_HASHES, NEW_CURRENT_LINE_HASHES, "current-line-hashes")
    out = one(
        out,
        "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',",
        "    version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',",
        "operator-card",
    )
    return out


def apply_s2_1(p1):
    out = one(p1, OLD_PROMPT_TAIL, NEW_PROMPT_TAIL, "prompt-dead-render")
    out = one(out, S2_1_SESSION_ALIAS, "", "session-render-alias")
    out = one(out, S2_1_SESSION_EXPORT, "", "session-render-export")
    return out


def apply_s2_2(p2):
    out = p2
    for marker in S2_2_EXPORTS:
        out = one(out, marker, "", f"session-export-{marker.strip()}")
    return out


def apply_s2_3(p3):
    out = one(p3, CACHE_EXPORTS_P3, CACHE_EXPORTS_P4, "runtime-cache-exports")
    out = one(out, TOPO_EXPORTS_P3, TOPO_EXPORTS_P4, "runtime-topology-exports")
    return out


def verify_stages(p0, p1, p2, p3, p4):
    if module_names(p0) != module_names(p1) or module_names(p1) != module_names(p2) or module_names(p2) != module_names(p3) or module_names(p3) != module_names(p4):
        fail("S2_3_MODULE_GRAPH_CHANGED")

    c0, c1 = module_text(p0, "runtime-cache"), module_text(p1, "runtime-cache")
    if c0.count("0x811c9dc5") != 5 or c1.count("0x811c9dc5") != 3:
        fail("S2_3_S1_FNV_SHAPE_INVALID")
    for marker in ("function fnv1a32(text)", "lines.map(fnv1a32)", "currentLines.map(fnv1a32)", ROLLING_PREFIX_1, ROLLING_PREFIX_2):
        if marker not in c1:
            fail("S2_3_S1_FNV_MARKER_MISSING", marker[:80])
    if require_surface(c0) != require_surface(c1):
        fail("S2_3_S1_CACHE_REQUIRES_CHANGED")
    fnv_equivalence()

    if "function compileRuntimePrompt(state)" in p2 or "function renderRuntimePrompt(state)" in p2 or S2_1_SESSION_ALIAS in p2 or S2_1_SESSION_EXPORT in p2:
        fail("S2_3_S2_1_DEAD_SEAM_SURVIVED")
    if "function compileRuntimePromptParts(state)" not in module_text(p2, "prompt"):
        fail("S2_3_S2_1_LIVE_PROMPT_COMPILER_MISSING")
    if "const promptCompiled = compileRuntimePromptParts(state);" not in module_text(p2, "session"):
        fail("S2_3_S2_1_LIVE_SESSION_PROMPT_PATH_MISSING")

    for marker in S2_2_EXPORTS:
        if marker in module_text(p3, "session"):
            fail("S2_3_S2_2_DEAD_EXPORT_SURVIVED", marker.strip())
    for marker in (
        "function inspectPreviousBEndOutput(historyMessages, sendIndex) {",
        "structure.validateStructure(prepared.content, base.pending)",
        "lifecycle.prepareTurn(base, userText, promptProbe, sendIndex, previousOutputFacts)",
        "CoreRulesetSession,",
        "fingerprintText: kernel.fingerprintText,",
    ):
        if marker not in module_text(p3, "session"):
            fail("S2_3_S2_2_LIVE_PATH_MISSING", marker)

    for name in module_names(p3):
        if name not in ("runtime-cache", "runtime-topology") and module_text(p3, name) != module_text(p4, name):
            fail("S2_3_NON_TARGET_MODULE_CHANGED", name)

    cb, ca = module_text(p3, "runtime-cache"), module_text(p4, "runtime-cache")
    tb, ta = module_text(p3, "runtime-topology"), module_text(p4, "runtime-topology")
    if cb.replace(CACHE_EXPORTS_P3, CACHE_EXPORTS_P4, 1) != ca:
        fail("S2_3_RUNTIME_CACHE_DELTA_WIDENED")
    if tb.replace(TOPO_EXPORTS_P3, TOPO_EXPORTS_P4, 1) != ta:
        fail("S2_3_RUNTIME_TOPOLOGY_DELTA_WIDENED")
    if require_surface(cb) != require_surface(ca) or require_surface(tb) != require_surface(ta):
        fail("S2_3_REQUIRE_SURFACE_CHANGED")

    for helper in ("promptChangeReason", "buildRuntimePromptCacheProbe", "runtimeLineTier", "runtimeIdentity"):
        if f"function {helper}(" not in ca or re.search(rf"\b{helper}\b", CACHE_EXPORTS_P4):
            fail("S2_3_CACHE_HELPER_OR_EXPORT_INVALID", helper)
    for helper in ("exactHash", "leadingSystemCount"):
        if f"function {helper}(" not in ta or re.search(rf"\b{helper}\b", TOPO_EXPORTS_P4):
            fail("S2_3_TOPO_HELPER_OR_EXPORT_INVALID", helper)

    for marker in (
        CACHE_EXPORTS_P4,
        TOPO_EXPORTS_P4,
        "cacheRules.createRuntimePromptCacheTracker",
        "runtimeCacheRules.createRuntimePromptCacheTracker",
        "runtimeTopologyRules.messageSignature",
        "breakAttribution(",
        "runtimeTopologyRules.createRequestTopologyTracker",
    ):
        if marker not in p4:
            fail("S2_3_LIVE_EXPORT_OR_CALL_MISSING", marker)

    protected = (
        "const PROMPT_COMPILER_VERSION = 4;",
        "const COMMUNITY_CLASSIFIER_VERSION = 3;",
        "const STATE_VERSION = 5;",
        "const CORE_STATE_VERSION = 10;",
        "TAIL_AFTER_CURRENT_USER",
        "provider cache UNVERIFIED",
        "Post-onSend attribution:",
        "claimHostLocalOnce",
    )
    same_counts(p3, p4, protected, "S2_3_PROTECTED_MARKER_CHANGED")
    same_counts(p0, p1, SIDE_EFFECT_MARKERS, "S2_3_S1_SIDE_EFFECT_CHANGED")
    same_counts(p1, p2, SIDE_EFFECT_MARKERS, "S2_3_S2_1_SIDE_EFFECT_CHANGED")
    same_counts(p2, p3, SIDE_EFFECT_MARKERS, "S2_3_S2_2_SIDE_EFFECT_CHANGED")
    same_counts(p3, p4, SIDE_EFFECT_MARKERS, "S2_3_SIDE_EFFECT_CHANGED")


def verify_identity(text):
    values = [
        re.search(r"^//@version\s+([^\s]+)\s*$", text, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text),
    ]
    got = [m.group(1) if m else None for m in values]
    if got != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail("S2_3_CUMULATIVE_IDENTITY_INVALID", repr(got))


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("S2_3_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail("S2_3_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]:
        fail("S2_3_PARENT_LATEST_INSTALL_DIVERGED")
    if originals[0].count(f"//@version {FROM_VERSION}") != 1:
        fail("S2_3_PARENT_VERSION_MISMATCH")

    p0 = originals[0]
    p1 = apply_s1(p0)
    p2 = apply_s2_1(p1)
    p3 = apply_s2_2(p2)
    p4 = apply_s2_3(p3)
    verify_stages(p0, p1, p2, p3, p4)
    verify_identity(p4)

    for path in FILES:
        path.write_text(p4, encoding="utf-8")
        syntax_check(path)
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail("S2_3_OUTPUT_LATEST_INSTALL_DIVERGED")
    print("S2_3_BUILD_PASS")


if __name__ == "__main__":
    main()
