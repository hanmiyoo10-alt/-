#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.68.0"
TARGET_VERSION = "0.69.0"

RELEASE_NOTE = """// v0.69.0 M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion:
// - Extracts portable-state initial assembly and cross-domain reconciliation composition from Kernel into one physical Domain integration owner, State Reconcile
// - Removes Kernel's four upward dependencies on Community, Recurrence, Lineage and Handoff while preserving every existing state value, deletion rule, ordering rule and migration seed
// - Switches Lifecycle, Bootstrap Migration, Prompt, Edit Reconcile, Output Finalize and Session from kernel.initialState/reconcileState to the new owner without changing their other Kernel helper usage
// - Keeps STATE_VERSION 5, CORE_STATE_VERSION 10, Community classifier v3 migration behavior, persistent schema, SnapshotStore/mirror shape and every unrelated semantic owner unchanged
// - Requires deep v0.68→v0.69 state/session equivalence, zero Kernel transition exceptions, latest/install identity and real long-chat warm + persisted-state + Community continuity before terminal LIVE_PASS
//
"""

KERNEL_DOMAIN_REQUIRES = [
    "const { normalizePlatformMaxMap } = require('./community');\n",
    "const recurrence = require('./recurrence');\n",
    "const lineage = require('./lineage');\n",
    "const handoff = require('./handoff');\n",
]

CONSUMERS = [
    "lifecycle",
    "bootstrap-migration",
    "prompt",
    "edit-reconcile",
    "output-finalize",
    "session",
]

CARD = r'''  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.69.0',
    name: 'M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion',
    scenario: '06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT',
    summary: Object.freeze([
      'Kernel의 portable-state 조립/정규화 composition을 State Reconcile Domain owner로 기계적으로 이동',
      'Kernel → Community/Recurrence/Lineage/Handoff upward dependency 4개와 transition exception 4개를 제거',
      'STATE_VERSION/CORE_STATE_VERSION과 persistent schema는 그대로 두고 v0.68 state 결과와 deep-equivalent 유지',
      '이상 징후는 현재 진단을 먼저 보존하고 WATCH / DEFER / FIX / BLOCKER로 분류',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.69.0', name: 'M2-6 State Reconcile / Kernel Inversion', bullets: Object.freeze(['state assembly/reconcile ownership extraction', 'Kernel foundation upward edges retired']) }),
      Object.freeze({ version: '0.68.0', name: 'Community Parent-Local Alias Repair', bullets: Object.freeze(['descriptor-aware bounded parent/local alias classification', 'classifier v3 bounded reaction-max backfill']) }),
      Object.freeze({ version: '0.67.0', name: 'M2-5 Recovery Debt Retirement', bullets: Object.freeze(['zero-caller Recovery facade physical retirement', 'direct owner topology retained']) }),
    ]),
  });

  function buildOperatorReleaseCardHtml() {
    const card = OPERATOR_RELEASE_CARD;
    const bullets = card.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const recent = card.recent.map((item) => `<li><b>v${escapeHtml(item.version)} · ${escapeHtml(item.name)}</b><br>${item.bullets.map((bullet) => `• ${escapeHtml(bullet)}`).join('<br>')}</li>`).join('');
    return `<section id="operator-release-card" class="card" style="display:none;margin-bottom:10px;padding:13px">
<div style="font-weight:800;margin-bottom:6px">📦 업데이트 내역 · v${escapeHtml(card.version)}</div>
<div style="color:#9fb3d7;margin-bottom:8px">${escapeHtml(card.name)}</div>
<ul style="margin:0 0 12px 18px;padding:0">${bullets}</ul>
<div style="font-weight:700;margin:8px 0 5px">실전 확인</div>
<ol style="margin:7px 0 10px 18px;padding:0"><li>자연 A/C 요청에서 Version 0.69.0 · CURRENT TURN · request hook SEEN · core handshake FOUND · binding BOUND · output COMMITTED 확인</li><li>새로고침/재진입 후 mirror-fast 또는 snapshot 등 non-fresh state source가 실제로 재사용되고 다음 ordinary turn이 정상 commit되는지 확인</li><li>Mode C에서 classifier v3, reaction/platform maxima와 Structure/Frame continuity가 기존과 동일하게 유지되는지 확인</li><li>STATE_VERSION/CORE_STATE_VERSION 또는 persistent schema migration이 새로 나타나면 즉시 중지하고 증거 보존</li><li>기존 WATCH 재현은 State Reconcile causal evidence가 없으면 별도 lane으로 유지</li></ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>state field/ordering 변화, unexpected bootstrap/migration, Kernel upward dependency 재등장, mirror/snapshot 재수화 손상, Structure/Community 의미 변화 또는 latest/install 불일치가 보이면 <b>다음 acceptance로 진행하지 말고 현재 진단을 먼저 보존</b></div>
<div style="font-weight:700;margin:10px 0 5px">이번 버전 실험</div><div><code>${escapeHtml(card.scenario)}</code></div>
<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>
<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>
<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>
</section>`;
  }'''


def fail(code, detail=""):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("06900_PATCH_ANCHOR_INVALID", f"{label} count={count}")
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail("06900_MODULE_BOUNDARY_INVALID", f"{name} count={len(starts)}")
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    end = next_start if next_start >= 0 else len(text)
    return start, end


def module_text(text, name):
    s, e = module_bounds(text, name)
    return text[s:e]


def replace_module(text, name, replacement):
    s, e = module_bounds(text, name)
    return text[:s] + replacement.rstrip() + "\n" + text[e:]


def insert_after_module(text, name, new_module):
    _s, e = module_bounds(text, name)
    return text[:e] + "\n" + new_module.rstrip() + "\n" + text[e:]


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function\s*\(require,\s*module,\s*exports\)\s*\{', text)


def extract_kernel_state_functions(kernel_mod):
    initial_start = kernel_mod.find("function initialState() {")
    reconcile_start = kernel_mod.find("function reconcileState(raw) {")
    text_start = kernel_mod.find("function textOfMessage(m) {")
    if min(initial_start, reconcile_start, text_start) < 0 or not (initial_start < reconcile_start < text_start):
        fail("06900_KERNEL_STATE_FUNCTION_BOUNDS_INVALID")
    initial = kernel_mod[initial_start:reconcile_start].rstrip()
    reconcile = kernel_mod[reconcile_start:text_start].rstrip()
    return initial, reconcile, initial_start, text_start


def patch_header(text):
    text = one(text, f"//@version {FROM_VERSION}", f"//@version {TARGET_VERSION}", "metadata-version")
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.68.0';", "const SIMCORE_RUNTIME_VERSION = '0.69.0';", "runtime-version")
    text = one(text, "const HOST_COMPAT_VERSION = '0.68.0';", "const HOST_COMPAT_VERSION = '0.69.0';", "host-version")
    text = one(text, "// v0.68.0 Community Parent-Local Alias Classification Repair:", RELEASE_NOTE + "// v0.68.0 Community Parent-Local Alias Classification Repair:", "release-note")
    return text


def patch_contracts(text):
    mod = module_text(text, "contracts")
    old_kernel = "  kernel: Object.freeze({ owns: 'state schema and shared primitives/normalization glue', excludes: 'mode policy, prompt wording, output repair' }),"
    new_rows = "  kernel: Object.freeze({ owns: 'shared state-version constants and cross-cutting primitives', excludes: 'cross-domain state reconciliation, mode policy, prompt wording, output repair' }),\n  'state-reconcile': Object.freeze({ owns: 'portable-state initial assembly and cross-domain reconciliation composition', excludes: 'domain normalizer semantics, persistence I/O, prompt wording or creative decisions' }),"
    mod = one(mod, old_kernel, new_rows, "contracts-state-reconcile-row")
    return replace_module(text, "contracts", mod)


def patch_kernel_and_add_owner(text):
    original_kernel = module_text(text, "kernel")
    initial, reconcile, initial_start, text_start = extract_kernel_state_functions(original_kernel)
    kernel = original_kernel
    for req in KERNEL_DOMAIN_REQUIRES:
        kernel = one(kernel, req, "", f"kernel-require-{req.strip()}")
    # Remove the two complete function blocks without modifying neighboring helpers.
    initial2, reconcile2, state_start, state_end = extract_kernel_state_functions(kernel)
    if initial2 != initial or reconcile2 != reconcile:
        fail("06900_KERNEL_STATE_FUNCTION_DRIFT_DURING_REQUIRE_REMOVAL")
    kernel = kernel[:state_start] + kernel[state_end:]
    kernel = one(kernel, "  initialState,\n", "", "kernel-export-initialState")
    kernel = one(kernel, "  reconcileState,\n", "", "kernel-export-reconcileState")
    text = replace_module(text, "kernel", kernel)

    owner = f'''SimCore.define("state-reconcile", function (require, module, exports) {{
const kernel = require('./kernel');
const {{ normalizePlatformMaxMap }} = require('./community');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');
const {{ STATE_VERSION, CORE_STATE_VERSION }} = kernel;

{initial}

{reconcile}

module.exports = {{ initialState, reconcileState }};
}});'''
    text = insert_after_module(text, "kernel", owner)
    return text, initial, reconcile


def patch_consumer(text, name):
    mod = module_text(text, name)
    kernel_req = "const kernel = require('./kernel');"
    if mod.count(kernel_req) != 1:
        fail("06900_CONSUMER_KERNEL_REQUIRE_INVALID", f"{name} count={mod.count(kernel_req)}")
    before_calls = mod.count("kernel.initialState") + mod.count("kernel.reconcileState")
    if before_calls <= 0:
        fail("06900_CONSUMER_STATE_CALL_MISSING", name)
    mod = mod.replace(kernel_req, kernel_req + "\nconst stateReconcile = require('./state-reconcile');", 1)
    mod = mod.replace("kernel.initialState", "stateReconcile.initialState")
    mod = mod.replace("kernel.reconcileState", "stateReconcile.reconcileState")
    if "kernel.initialState" in mod or "kernel.reconcileState" in mod:
        fail("06900_CONSUMER_STATE_CALL_SURVIVED", name)
    return replace_module(text, name, mod)


def patch_runtime_probe(text):
    start = "  const OPERATOR_RELEASE_CARD = Object.freeze({"
    end = "\n\n\n  async function openPanel() {"
    s = text.find(start)
    e = text.find(end, s + len(start)) if s >= 0 else -1
    if s < 0 or e < 0:
        fail("06900_OPERATOR_CARD_BOUNDS_INVALID", f"start={s} end={e}")
    return text[:s] + CARD + text[e:]


def assert_identity(text):
    metadata = re.search(r"^//@version\s+([^\s]+)\s*$", text, re.M)
    runtime = re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text)
    host = re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text)
    values = [metadata.group(1) if metadata else None, runtime.group(1) if runtime else None, host.group(1) if host else None]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail("06900_RUNTIME_IDENTITY_SPLIT", repr(values))


def expected_consumer(original_mod):
    result = original_mod.replace("const kernel = require('./kernel');", "const kernel = require('./kernel');\nconst stateReconcile = require('./state-reconcile');", 1)
    result = result.replace("kernel.initialState", "stateReconcile.initialState")
    result = result.replace("kernel.reconcileState", "stateReconcile.reconcileState")
    return result


def assert_candidate(original, updated, initial, reconcile):
    assert_identity(updated)
    if updated.count("const STATE_VERSION = 5;") != original.count("const STATE_VERSION = 5;"):
        fail("06900_STATE_VERSION_CHANGED")
    if updated.count("const CORE_STATE_VERSION = 10;") != original.count("const CORE_STATE_VERSION = 10;"):
        fail("06900_CORE_STATE_VERSION_CHANGED")
    if updated.count("classifierVersion: 2") != original.count("classifierVersion: 2"):
        fail("06900_INITIAL_CLASSIFIER_SEED_CHANGED")
    if updated.count("const COMMUNITY_CLASSIFIER_VERSION = 3;") != 1:
        fail("06900_COMMUNITY_CLASSIFIER_VERSION_CHANGED")

    old_names = module_names(original)
    new_names = module_names(updated)
    expected_names = old_names.copy()
    kernel_index = expected_names.index("kernel")
    expected_names.insert(kernel_index + 1, "state-reconcile")
    if new_names != expected_names:
        fail("06900_MODULE_INVENTORY_INVALID", f"expected={expected_names} actual={new_names}")

    new_kernel = module_text(updated, "kernel")
    for token in ["require('./community')", "require('./recurrence')", "require('./lineage')", "require('./handoff')", "function initialState()", "function reconcileState(raw)", "  initialState,", "  reconcileState,"]:
        if token in new_kernel:
            fail("06900_KERNEL_TRANSITION_DEBT_SURVIVED", token)

    owner = module_text(updated, "state-reconcile")
    for token in ["require('./kernel')", "require('./community')", "require('./recurrence')", "require('./lineage')", "require('./handoff')", "const { STATE_VERSION, CORE_STATE_VERSION } = kernel;"]:
        if token not in owner:
            fail("06900_STATE_RECONCILE_DEPENDENCY_MISSING", token)
    if initial not in owner or reconcile not in owner:
        fail("06900_MOVED_FUNCTION_BODY_DRIFT")
    if owner.count("function initialState()") != 1 or owner.count("function reconcileState(raw)") != 1:
        fail("06900_STATE_RECONCILE_FUNCTION_COUNT_INVALID")

    for name in CONSUMERS:
        expected = expected_consumer(module_text(original, name))
        actual = module_text(updated, name)
        if actual != expected:
            fail("06900_CONSUMER_DIFFERENTIAL_INVALID", name)

    allowed_changed = set(CONSUMERS + ["contracts", "kernel", "runtime-telemetry", "runtime-probe"])
    for name in old_names:
        if name in allowed_changed:
            continue
        if module_text(original, name) != module_text(updated, name):
            fail("06900_UNAUTHORIZED_MODULE_BODY_CHANGE", name)

    expected_telemetry = module_text(original, "runtime-telemetry").replace("const HOST_COMPAT_VERSION = '0.68.0';", "const HOST_COMPAT_VERSION = '0.69.0';", 1)
    if module_text(updated, "runtime-telemetry") != expected_telemetry:
        fail("06900_RUNTIME_TELEMETRY_DIFFERENTIAL_INVALID")

    original_probe = module_text(original, "runtime-probe")
    start = "  const OPERATOR_RELEASE_CARD = Object.freeze({"
    end = "\n\n\n  async function openPanel() {"
    s = original_probe.find(start)
    e = original_probe.find(end, s + len(start)) if s >= 0 else -1
    expected_probe = original_probe[:s] + CARD + original_probe[e:] if s >= 0 and e >= 0 else ""
    if not expected_probe or module_text(updated, "runtime-probe") != expected_probe:
        fail("06900_RUNTIME_PROBE_DIFFERENTIAL_INVALID")

    original_contracts = module_text(original, "contracts")
    expected_contracts = original_contracts.replace(
        "  kernel: Object.freeze({ owns: 'state schema and shared primitives/normalization glue', excludes: 'mode policy, prompt wording, output repair' }),",
        "  kernel: Object.freeze({ owns: 'shared state-version constants and cross-cutting primitives', excludes: 'cross-domain state reconciliation, mode policy, prompt wording, output repair' }),\n  'state-reconcile': Object.freeze({ owns: 'portable-state initial assembly and cross-domain reconciliation composition', excludes: 'domain normalizer semantics, persistence I/O, prompt wording or creative decisions' }),",
        1,
    )
    if module_text(updated, "contracts") != expected_contracts:
        fail("06900_CONTRACTS_DIFFERENTIAL_INVALID")

    # Side-effect/surface budget: ownership movement must not add any new external authority primitives.
    for token in ["fetch(", "XMLHttpRequest", "pluginStorage", "registerButton", "registerSetting", "setInterval(", "setTimeout("]:
        if updated.count(token) != original.count(token):
            fail("06900_SIDE_EFFECT_SURFACE_CHANGED", f"{token} {original.count(token)}->{updated.count(token)}")


def build(original):
    if f"//@version {FROM_VERSION}" not in original:
        fail("06900_UNEXPECTED_SOURCE_VERSION")
    if original.count("function initialState()") != 1 or original.count("function reconcileState(raw)") != 1:
        fail("06900_STATE_FUNCTION_PRECONDITION_INVALID")
    kernel = module_text(original, "kernel")
    for req in KERNEL_DOMAIN_REQUIRES:
        if kernel.count(req) != 1:
            fail("06900_KERNEL_DOMAIN_REQUIRE_PRECONDITION_INVALID", req.strip())

    updated = patch_header(original)
    updated = patch_contracts(updated)
    updated, initial, reconcile = patch_kernel_and_add_owner(updated)
    for name in CONSUMERS:
        updated = patch_consumer(updated, name)
    updated = patch_runtime_probe(updated)
    assert_candidate(original, updated, initial, reconcile)
    return updated


def main():
    for path in FILES:
        if not path.is_file():
            fail("06900_SOURCE_FILE_MISSING", str(path))
    originals = [p.read_text(encoding="utf-8") for p in FILES]
    if originals[0] != originals[1]:
        fail("06900_SOURCE_LATEST_INSTALL_DIVERGED")
    updated = build(originals[0])
    for path in FILES:
        path.write_text(updated, encoding="utf-8")
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail("06900_OUTPUT_LATEST_INSTALL_DIVERGED")
    print("06900_BUILD_PASS")


if __name__ == "__main__":
    main()
