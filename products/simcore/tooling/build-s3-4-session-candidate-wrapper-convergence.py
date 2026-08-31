#!/usr/bin/env python3
from pathlib import Path
import importlib.util
import re
import subprocess

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
BASE_BUILDER = Path("products/simcore/tooling/build-s3-3-session-surface-result-convergence.py")
TARGET_VERSION = "0.70.3"

OLD_RESOLVE = """function resolveSessionCandidates(root, windowLike) {
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

NEW_RESOLVE = """function sessionStorageCandidate(label, storage) {
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


def function_slice(source, name):
    declaration = re.compile(rf"(?m)^(?:async\s+)?function\s+{re.escape(name)}\s*\(")
    matches = list(declaration.finditer(source))
    if len(matches) != 1:
        fail("S3_4_FUNCTION_BOUNDARY_INVALID", f"{name} starts={[m.start() for m in matches]}")
    start = matches[0].start()
    next_function = re.search(r"(?m)^(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(", source[matches[0].end():])
    end = matches[0].end() + next_function.start() if next_function else len(source)
    return source[start:end]


def same_counts(before, after, markers, code):
    for marker in markers:
        if before.count(marker) != after.count(marker):
            fail(code, f"{marker}: {before.count(marker)} -> {after.count(marker)}")


def load_base_builder():
    if not BASE_BUILDER.exists():
        fail("S3_4_BASE_BUILDER_MISSING", str(BASE_BUILDER))
    spec = importlib.util.spec_from_file_location("simcore_s3_3_builder", BASE_BUILDER)
    if spec is None or spec.loader is None:
        fail("S3_4_BASE_BUILDER_LOAD_FAILED")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not callable(getattr(module, "main", None)):
        fail("S3_4_BASE_BUILDER_MAIN_MISSING")
    return module


def wrapper_equivalence():
    script = r"""
function oldCandidate(label, storage) {
  return Object.freeze({ label, storage });
}
function sessionStorageCandidate(label, storage) {
  return Object.freeze({ label, storage });
}
const storages = [
  { id: 'window', getItem(){}, setItem(){}, removeItem(){} },
  { id: 'global', getItem(){}, setItem(){}, removeItem(){} },
];
for (const label of ['WINDOW', 'GLOBAL_THIS']) for (const storage of storages) {
  const expected = oldCandidate(label, storage);
  const actual = sessionStorageCandidate(label, storage);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('CANDIDATE_WRAPPER_DIFF');
  if (Object.keys(expected).join(',') !== Object.keys(actual).join(',')) throw new Error('CANDIDATE_WRAPPER_PROPERTY_ORDER_DIFF');
  if (actual.storage !== storage) throw new Error('CANDIDATE_STORAGE_IDENTITY_DIFF');
  if (!Object.isFrozen(actual)) throw new Error('CANDIDATE_WRAPPER_NOT_FROZEN');
}
console.log('S3_4_CANDIDATE_WRAPPER_EQ_PASS');
"""
    result = subprocess.run(["node", "-e", script], text=True, capture_output=True)
    if result.returncode != 0 or "S3_4_CANDIDATE_WRAPPER_EQ_PASS" not in result.stdout:
        fail("S3_4_CANDIDATE_WRAPPER_EQUIVALENCE_FAIL", (result.stderr or result.stdout).strip())


def verify_s3_4(p7, p8):
    if module_names(p7) != module_names(p8):
        fail("S3_4_MODULE_GRAPH_CHANGED")
    for name in module_names(p7):
        if name != "runtime-telemetry" and module_text(p7, name) != module_text(p8, name):
            fail("S3_4_NON_TARGET_MODULE_CHANGED", name)

    t7 = module_text(p7, "runtime-telemetry")
    t8 = module_text(p8, "runtime-telemetry")
    if t7.replace(OLD_RESOLVE, NEW_RESOLVE, 1) != t8:
        fail("S3_4_RUNTIME_TELEMETRY_DELTA_WIDENED")
    if require_surface(t7) != require_surface(t8):
        fail("S3_4_REQUIRE_SURFACE_CHANGED")
    if t7.count(OLD_RESOLVE) != 1:
        fail("S3_4_PARENT_RESOLVE_DRIFT")

    if t8.count("function sessionStorageCandidate(") != 1 or t8.count("sessionStorageCandidate(") != 6:
        fail("S3_4_HELPER_COUNT_INVALID")
    exports_match = re.search(r"module\.exports\s*=\s*\{[^}]+\};", t8, re.S)
    if not exports_match or "sessionStorageCandidate" in exports_match.group(0):
        fail("S3_4_HELPER_EXPORT_INVALID")

    frozen_functions = (
        "sessionSurfaceResult", "inspectSessionSurface", "surfaceDiagnostics", "serializeCapsule",
        "publishPrepared", "publish", "updateHostProbe", "getHostLocalTelemetryStoreOnce",
        "publishWithHostLocal", "takeMemory", "sessionCandidateResult", "takeSessionCandidate",
        "claim", "hostExportShape", "classifyConsumedHostCapsule", "claimHostLocalOnce",
        "validateCapsule", "validationClass", "sessionReason", "hostReason",
        "recordClaimSelection", "validate", "diagnostics",
    )
    for name in frozen_functions:
        if function_slice(t7, name) != function_slice(t8, name):
            fail("S3_4_FROZEN_FUNCTION_CHANGED", name)

    old_resolve = function_slice(t7, "resolveSessionCandidates")
    new_resolve = function_slice(t8, "resolveSessionCandidates")
    if old_resolve.strip() != OLD_RESOLVE.strip():
        fail("S3_4_PARENT_RESOLVE_SHAPE_INVALID")
    expected_new_resolve = NEW_RESOLVE[NEW_RESOLVE.find("function resolveSessionCandidates(root, windowLike) {"):]
    if new_resolve.strip() != expected_new_resolve.strip():
        fail("S3_4_NEW_RESOLVE_SHAPE_INVALID")

    order_markers = (
        "inspectSessionSurface(windowLike, 'WINDOW')",
        "inspectSessionSurface(root, 'GLOBAL_THIS')",
        "windowSurface.storage === globalSurface.storage",
        "relation = 'SAME_OBJECT'",
        "relation = 'DISTINCT_OBJECTS'",
        "relation = 'SINGLE_CANDIDATE'",
    )
    old_positions = [old_resolve.find(marker) for marker in order_markers]
    new_positions = [new_resolve.find(marker) for marker in order_markers]
    if any(pos < 0 for pos in old_positions + new_positions):
        fail("S3_4_ORDER_MARKER_MISSING")
    if old_positions != sorted(old_positions) or new_positions != sorted(new_positions):
        fail("S3_4_RELATION_ORDER_CHANGED", f"old={old_positions} new={new_positions}")

    expected_calls = (
        "sessionStorageCandidate('WINDOW', windowSurface.storage)",
        "sessionStorageCandidate('WINDOW', windowSurface.storage)",
        "sessionStorageCandidate('GLOBAL_THIS', globalSurface.storage)",
        "sessionStorageCandidate('WINDOW', windowSurface.storage)",
        "sessionStorageCandidate('GLOBAL_THIS', globalSurface.storage)",
    )
    positions = []
    cursor = 0
    for call in expected_calls:
        pos = new_resolve.find(call, cursor)
        if pos < 0:
            fail("S3_4_CANDIDATE_CALL_ORDER_INVALID", call)
        positions.append(pos)
        cursor = pos + len(call)
    if positions != sorted(positions):
        fail("S3_4_CANDIDATE_CALL_ORDER_CHANGED")

    for marker in TELEMETRY_CONSTANTS:
        if t7.count(marker) != 1 or t8.count(marker) != 1:
            fail("S3_4_TELEMETRY_CONSTANT_CHANGED", marker)
    if "const HOST_COMPAT_VERSION = '0.70.3';" not in t7 or "const HOST_COMPAT_VERSION = '0.70.3';" not in t8:
        fail("S3_4_HOST_COMPAT_IDENTITY_CHANGED")

    protected = (
        "sessionSurfaceResult", "sessionCandidateResult", "recordClaimSelection",
        "claimHostLocalOnce", "getHostLocalTelemetryStoreOnce",
        "__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__", "__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__",
        "provider cache UNVERIFIED", "Post-onSend attribution:", "const PROMPT_COMPILER_VERSION = 4;",
        "const COMMUNITY_CLASSIFIER_VERSION = 3;", "const STATE_VERSION = 5;", "const CORE_STATE_VERSION = 10;", "TAIL_AFTER_CURRENT_USER",
    )
    same_counts(p7, p8, protected, "S3_4_PROTECTED_MARKER_CHANGED")
    same_counts(p7, p8, SIDE_EFFECT_MARKERS, "S3_4_SIDE_EFFECT_CHANGED")
    wrapper_equivalence()


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
    base = load_base_builder()
    base.main()

    p7_latest = FILES[0].read_text(encoding="utf-8")
    p7_install = FILES[1].read_text(encoding="utf-8")
    if p7_latest != p7_install:
        fail("S3_4_P7_LATEST_INSTALL_DIVERGED")
    if p7_latest.count(OLD_RESOLVE) != 1:
        fail("S3_4_P7_RESOLVE_ANCHOR_INVALID", f"count={p7_latest.count(OLD_RESOLVE)}")

    p8 = one(p7_latest, OLD_RESOLVE, NEW_RESOLVE, "session-candidate-wrapper-convergence")
    verify_s3_4(p7_latest, p8)
    verify_identity(p8)

    for path in FILES:
        path.write_text(p8, encoding="utf-8")
        syntax_check(path)
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail("S3_4_OUTPUT_LATEST_INSTALL_DIVERGED")
    print("S3_4_BUILD_PASS")


if __name__ == "__main__":
    main()
