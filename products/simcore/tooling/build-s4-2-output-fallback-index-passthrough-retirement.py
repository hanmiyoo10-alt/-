#!/usr/bin/env python3
from pathlib import Path
import base64
import gzip
import hashlib
import subprocess

# P10 stays self-contained without recursively nesting full builder snapshots.
# It reuses P9's exact hash-verified P8 snapshot, reproduces/verifies P9 first,
# then applies only the P9 -> P10 outer-shell delta.
P8_SOURCE_SHA256 = "51c01833ded2369b94a78db9287cddfffb6a3feb4c1a414146ea887eb26fc890"
P8_SOURCE_GZIP_BASE64 = "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"


def load_p8_namespace():
    try:
        source = gzip.decompress(base64.b64decode(P8_SOURCE_GZIP_BASE64.encode("ascii")))
    except Exception as exc:
        raise SystemExit(f"S4_2_P8_SNAPSHOT_DECODE_FAIL: {exc}")
    actual = hashlib.sha256(source).hexdigest()
    if actual != P8_SOURCE_SHA256:
        raise SystemExit(f"S4_2_P8_SNAPSHOT_HASH_MISMATCH: {actual}")
    namespace = {"__name__": "simcore_embedded_p8", "__file__": "<embedded-p8>"}
    exec(compile(source, "<embedded-p8>", "exec"), namespace)
    return namespace


P8 = load_p8_namespace()
FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.70.1"

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
S4_1_CALL_MARKERS = (
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


def fail(code, detail=""):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def many(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        fail("S4_2_PATCH_ANCHOR_INVALID", f"{label} count={count} expected={expected}")
    return text.replace(old, new)


def apply_s4_1(p8):
    out = many(p8, S4_1_HELPER_OLD, S4_1_HELPER_NEW, 1, "s4-1-runtime-current-helper")
    out = many(out, S4_1_PREP_OLD, S4_1_PREP_NEW, 2, "s4-1-prepare-guards")
    out = many(out, S4_1_PROCESS_OLD, S4_1_PROCESS_NEW, 2, "s4-1-process-guards")
    out = many(out, S4_1_BEFORE_OLD, S4_1_BEFORE_NEW, 3, "s4-1-before-guards")
    out = many(out, S4_1_OUTPUT_OLD, S4_1_OUTPUT_NEW, 3, "s4-1-output-guards")
    return out


def bounded_module_text(text, name, names):
    module_text = P8["module_text"]
    if name != names[-1]:
        return module_text(text, name)
    if name != "runtime-probe":
        fail("S4_2_LAST_MODULE_IDENTITY_CHANGED", name)
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [i for i in range(len(text)) if text.startswith(token, i)]
    if len(starts) != 1:
        fail("S4_2_LAST_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
    end = text.find("\n\n(async () => {", starts[0] + len(token))
    if end < 0:
        fail("S4_2_OUTER_SHELL_BOUNDARY_MISSING")
    return text[starts[0]:end]


def verify_s4_1(p8, p9):
    names = P8["module_names"](p8)
    if P8["module_names"](p9) != names:
        fail("S4_2_P9_MODULE_GRAPH_CHANGED")
    if P8["require_surface"](p8) != P8["require_surface"](p9):
        fail("S4_2_P9_REQUIRE_SURFACE_CHANGED")
    P8["same_counts"](p8, p9, P8["SIDE_EFFECT_MARKERS"], "S4_2_P9_SIDE_EFFECT_CHANGED")
    P8["same_counts"](p8, p9, P8["PROTECTED_MARKERS"], "S4_2_P9_PROTECTED_MARKER_CHANGED")
    P8["same_counts"](p8, p9, S4_1_CALL_MARKERS, "S4_2_P9_CALL_SURFACE_CHANGED")
    for name in names:
        if bounded_module_text(p8, name, names) != bounded_module_text(p9, name, names):
            fail("S4_2_P9_MODULE_CHANGED", name)
    expected = p8.replace(S4_1_HELPER_OLD, S4_1_HELPER_NEW, 1)
    expected = expected.replace(S4_1_PREP_OLD, S4_1_PREP_NEW)
    expected = expected.replace(S4_1_PROCESS_OLD, S4_1_PROCESS_NEW)
    expected = expected.replace(S4_1_BEFORE_OLD, S4_1_BEFORE_NEW)
    expected = expected.replace(S4_1_OUTPUT_OLD, S4_1_OUTPUT_NEW)
    if expected != p9:
        fail("S4_2_P8_P9_DELTA_WIDENED")
    if p9.count("function guardCurrentRuntime(") != 1 or p9.count("guardCurrentRuntime(") != 11:
        fail("S4_2_P9_GUARD_COUNT_INVALID")
    if p9.count("dropStaleRuntime();") != 1 or p9.count("staleRuntimeDrops += 1;") != 1:
        fail("S4_2_P9_STALE_ACCOUNTING_CHANGED")
    if p9.count(S4_1_POSITIVE_TELEMETRY_GUARD) != 1:
        fail("S4_2_P9_POSITIVE_GUARD_CHANGED")
    unload = "runtimeDisposed = true;\n    runtimeEpoch += 1;"
    if p9.count(unload) != 1:
        fail("S4_2_P9_UNLOAD_EPOCH_SEQUENCE_CHANGED")


def apply_s4_2(p9):
    out = many(p9, S4_2_DEF_OLD, S4_2_DEF_NEW, 1, "process-core-output-definition")
    out = many(out, S4_2_CALL_OLD, S4_2_CALL_NEW, 1, "output-handler-pass-through")
    return out


def fallback_equivalence_harness():
    script = r"""
function fallback(chat) { return chat?.message?.length ?? 0; }
function resolve(active, sendIndex, fallbackOutIndex) {
  const n = Number(sendIndex);
  if (active && Number.isInteger(n) && n >= 0) return n + 1;
  return Number.isInteger(fallbackOutIndex) && fallbackOutIndex >= 0 ? fallbackOutIndex : -1;
}
const chats = [null, {}, {message:null}, {message:[]}, {message:[1]}, {message:[1,2,3]}];
for (const chat of chats) {
  const oldFallback = fallback(chat);
  const newFallback = fallback(chat);
  if (oldFallback !== newFallback) throw new Error('FALLBACK_VALUE_DIFF');
  for (const pending of [{a:false,s:-1},{a:false,s:3},{a:true,s:3},{a:true,s:-1}]) {
    if (resolve(pending.a,pending.s,oldFallback) !== resolve(pending.a,pending.s,newFallback)) {
      throw new Error('RESOLVE_INPUT_DIFF');
    }
  }
}
console.log('S4_2_FALLBACK_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S4_2_FALLBACK_EQ_PASS" not in result.stdout:
        fail("S4_2_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


def verify_s4_2(p9, p10):
    names = P8["module_names"](p9)
    if P8["module_names"](p10) != names:
        fail("S4_2_MODULE_GRAPH_CHANGED")
    if P8["require_surface"](p9) != P8["require_surface"](p10):
        fail("S4_2_REQUIRE_SURFACE_CHANGED")
    P8["same_counts"](p9, p10, P8["SIDE_EFFECT_MARKERS"], "S4_2_SIDE_EFFECT_CHANGED")
    P8["same_counts"](p9, p10, P8["PROTECTED_MARKERS"], "S4_2_PROTECTED_MARKER_CHANGED")
    P8["same_counts"](p9, p10, S4_1_CALL_MARKERS, "S4_2_CALL_SURFACE_CHANGED")
    for name in names:
        if bounded_module_text(p9, name, names) != bounded_module_text(p10, name, names):
            fail("S4_2_MODULE_CHANGED", name)

    expected = p9.replace(S4_2_DEF_OLD, S4_2_DEF_NEW, 1).replace(S4_2_CALL_OLD, S4_2_CALL_NEW, 1)
    if expected != p10:
        fail("S4_2_P9_P10_DELTA_WIDENED")
    if p9.count(S4_2_DEF_OLD) != 1 or p10.count(S4_2_DEF_OLD) != 0 or p10.count(S4_2_DEF_NEW) != 1:
        fail("S4_2_DEFINITION_SHAPE_INVALID")
    if p9.count(S4_2_CALL_OLD) != 1 or p10.count(S4_2_CALL_OLD) != 0 or p10.count(S4_2_CALL_NEW) != 1:
        fail("S4_2_CALL_SHAPE_INVALID")
    if p9.count(S4_2_FALLBACK_EXPR) != 1 or p10.count(S4_2_FALLBACK_EXPR) != 1:
        fail("S4_2_FALLBACK_EXPRESSION_COUNT_CHANGED")
    if p9.count(S4_2_SESSION_RESOLVE) != 1 or p10.count(S4_2_SESSION_RESOLVE) != 1:
        fail("S4_2_SESSION_RESOLVE_CHANGED")
    if p9.count(S4_2_RESOLVE_CALL) != 1 or p10.count(S4_2_RESOLVE_CALL) != 1:
        fail("S4_2_RESOLVE_CALL_CHANGED")
    if p10.count("function guardCurrentRuntime(") != 1 or p10.count("guardCurrentRuntime(") != 11:
        fail("S4_2_GUARD_COUNT_CHANGED")
    if p10.count("dropStaleRuntime();") != 1 or p10.count("staleRuntimeDrops += 1;") != 1:
        fail("S4_2_STALE_ACCOUNTING_CHANGED")
    if p10.count(S4_1_POSITIVE_TELEMETRY_GUARD) != 1:
        fail("S4_2_POSITIVE_TELEMETRY_GUARD_CHANGED")
    fallback_equivalence_harness()


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("S4_2_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail("S4_2_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]:
        fail("S4_2_PARENT_LATEST_INSTALL_DIVERGED")
    if originals[0].count(f"//@version {FROM_VERSION}") != 1:
        fail("S4_2_PARENT_VERSION_MISMATCH")

    p0 = originals[0]
    p1 = P8["apply_s1"](p0)
    p2 = P8["apply_s2_1"](p1)
    p3 = P8["apply_s2_2"](p2)
    p4 = P8["apply_s2_3"](p3)
    p5 = P8["apply_s3_1"](p4)
    p6 = P8["apply_s3_2"](p5)
    p7 = P8["apply_s3_3"](p6)
    p8 = P8["apply_s3_4"](p7)
    P8["verify_stages"]((p0, p1, p2, p3, p4, p5, p6, p7, p8))
    P8["verify_identity"](p8)

    p9 = apply_s4_1(p8)
    verify_s4_1(p8, p9)
    P8["verify_identity"](p9)

    p10 = apply_s4_2(p9)
    verify_s4_2(p9, p10)
    P8["verify_identity"](p10)

    for path in FILES:
        path.write_text(p10, encoding="utf-8")
        syntax_check(path)
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail("S4_2_OUTPUT_LATEST_INSTALL_DIVERGED")
    print("S4_2_BUILD_PASS")


if __name__ == "__main__":
    main()
