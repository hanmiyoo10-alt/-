#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.66.0"
TARGET_VERSION = "0.67.0"

RELEASE_NOTE = """// v0.67.0 M2-5 Recovery Transition Debt Retirement:
// - Removes the zero-runtime-caller Recovery compatibility facade after v0.66 live acceptance and exact source/seam re-audit
// - Keeps Output Compat, Bootstrap Migration, Output Finalize, Edit Reconcile and Representation as the same physical owners; no replacement barrel is introduced
// - Changes only release identity, current module inventory/contract metadata, operator guidance and the standalone Recovery module registration; all other runtime modules remain byte-identical
// - Preserves SAME_FAST / REPRESENTATION_FAST_RECONCILED / USER_EDIT_CANDIDATE / MANUAL_EDIT_REBUILT, Deferred Mirror fail-closed guards, reload telemetry, persistent schema and all domain semantics
// - Keeps latest.js and install.js byte-identical and requires real long-chat ordinary continuity plus same-tab reload/bootstrap evidence after publication
//
"""

RECOVERY_CONTRACT_LINE = "  recovery: Object.freeze({ owns: 'deprecated M2 compatibility facade over output-compat + bootstrap-migration with zero runtime callers', excludes: 'new policy ownership' }),"
RECOVERY_INVENTORY_LINE = "// - Recovery: M2 compatibility facade preserving the v0.63.55 public recovery API"

CARD = r'''  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.67.0',
    name: 'M2-5 Recovery Transition Debt Retirement',
    scenario: '06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT',
    summary: Object.freeze([
      'M2-5 - runtime caller가 0인 Recovery compatibility facade를 제거하고 direct physical owner 경계를 최종화',
      'Output Compat / Bootstrap Migration / Output Finalize / Edit Reconcile / Representation 동작은 v0.66과 동일하게 유지',
      '자연 A/C 요청과 same-tab reload/continuation에서 boot, commit, bootstrap 경로 회귀가 없는지 확인',
      '이상 징후는 현재 진단을 먼저 보존하고 WATCH / DEFER / FIX / BLOCKER로 분류',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.67.0', name: 'M2-5 Recovery Debt Retirement', bullets: Object.freeze(['zero-caller Recovery facade physical retirement', 'direct owner topology retained']) }),
      Object.freeze({ version: '0.66.0', name: 'M2-4 Boundary Completion', bullets: Object.freeze(['Session finalization/housekeeping ownership 축소', 'Mirror Observe→Interpret→Apply→Record 경계 완성']) }),
      Object.freeze({ version: '0.65.0', name: 'M2-3 + Runtime Identity Convergence', bullets: Object.freeze(['Edit Reconcile application service 추출', 'metadata/runtime/host identity convergence']) }),
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
<ol style="margin:7px 0 10px 18px;padding:0"><li>자연 A/C 요청에서 Version 0.67.0 · Runtime ACTIVE · output COMMITTED 확인</li><li>ordinary exact carryover → SAME_FAST · Edit origin NONE · snapshot UNCHANGED 확인</li><li>same-tab refresh 뒤 Host-local handoff가 기존 identity/TTL 규칙대로 ADOPTED 또는 truthful fail-closed 되는지 확인</li><li>다음 same-generation 요청이 missing-module/bootstrap 오류 없이 정상 continuation 되는지 확인</li><li>자연스럽게 representation mismatch 또는 genuine edit가 나오면 기존 M2 control 의미가 그대로인지 증거 보존</li></ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>missing Recovery/module 초기화 오류, bootstrap/load/reload 회귀, Output Compat 의미 변화, unsafe mirror apply 또는 예상 밖 state/schema 변화가 보이면 <b>다음 acceptance로 진행하지 말고 현재 진단을 먼저 보존</b></div>
<div style="font-weight:700;margin:10px 0 5px">이번 버전 실험</div><div><code>${escapeHtml(card.scenario)}</code></div>
<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>
<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>
<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>
</section>`;
  }'''


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"06700_PATCH_ANCHOR_INVALID {label} count={count}")
    return text.replace(old, new, 1)


def module_bounds(text, name):
    start_token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(start_token), text)]
    if len(starts) != 1:
        raise SystemExit(f"06700_MODULE_BOUNDARY_INVALID {name} count={len(starts)}")
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(start_token))
    end = next_start if next_start >= 0 else len(text)
    return start, end


def module_text(text, name):
    s, e = module_bounds(text, name)
    return text[s:e]


def replace_module(text, name, new_module):
    s, e = module_bounds(text, name)
    return text[:s] + new_module.rstrip() + "\n" + text[e:]


def remove_module(text, name):
    s, e = module_bounds(text, name)
    if e >= len(text):
        return text[:s].rstrip() + "\n"
    # module_bounds points at the newline immediately before the next definition.
    # Keep the predecessor's existing spacing and consume only that one boundary newline.
    return text[:s] + text[e + 1:]


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function\s*\(require,\s*module,\s*exports\)\s*\{', text)


def module_require_edges(text):
    edges = {}
    for name in module_names(text):
        body = module_text(text, name)
        edges[name] = sorted(set(re.findall(r"require\(['\"]\./([^'\"]+)['\"]\)", body)))
    return edges


def patch_header(text):
    text = one(text, f"//@version {FROM_VERSION}", f"//@version {TARGET_VERSION}", "metadata-version")
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.66.0';", "const SIMCORE_RUNTIME_VERSION = '0.67.0';", "runtime-version")
    text = one(text, "const HOST_COMPAT_VERSION = '0.66.0';", "const HOST_COMPAT_VERSION = '0.67.0';", "host-version")
    text = one(text, RECOVERY_INVENTORY_LINE + "\n", "", "inventory-recovery-retire")
    text = one(
        text,
        "// v0.66.0 M2-4 Session / Runtime Mirror Boundary Completion:",
        RELEASE_NOTE + "// v0.66.0 M2-4 Session / Runtime Mirror Boundary Completion:",
        "release-note",
    )
    return text


def patch_runtime_contract(text):
    mod = module_text(text, "contracts")
    mod = one(mod, RECOVERY_CONTRACT_LINE + "\n", "", "runtime-contract-recovery-retire")
    return replace_module(text, "contracts", mod)


def patch_operator_card(text):
    start = "  const OPERATOR_RELEASE_CARD = Object.freeze({"
    end = "\n\n\n  async function openPanel() {"
    s = text.find(start)
    e = text.find(end, s + len(start)) if s >= 0 else -1
    if s < 0 or e < 0:
        raise SystemExit(f"06700_PATCH_ANCHOR_INVALID operator-release-card start={s} end={e}")
    return text[:s] + CARD + text[e:]


def assert_identity(text):
    metadata = re.search(r"^//@version\s+([^\s]+)\s*$", text, re.M)
    runtime = re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text)
    host = re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text)
    values = [metadata.group(1) if metadata else None, runtime.group(1) if runtime else None, host.group(1) if host else None]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        raise SystemExit(f"06700_RUNTIME_IDENTITY_SPLIT values={values}")


def assert_preconditions(original):
    if f"//@version {FROM_VERSION}" not in original:
        raise SystemExit("06700_UNEXPECTED_SOURCE_VERSION")
    names = module_names(original)
    if names.count("recovery") != 1:
        raise SystemExit(f"06700_RECOVERY_PHYSICAL_PRECONDITION count={names.count('recovery')}")
    edges = module_require_edges(original)
    consumers = sorted(name for name, deps in edges.items() if name != "recovery" and "recovery" in deps)
    if consumers:
        raise SystemExit(f"06700_RUNTIME_RECOVERY_CONSUMERS_PRESENT consumers={consumers}")
    recovery = module_text(original, "recovery")
    required_forwarders = (
        "outputCompat.classifyPreamble",
        "outputCompat.buildSafeEnvelopeBoundaryConfirmation",
        "outputCompat.canonicalizeResponseEnvelope",
        "outputCompat.normalizeTailPlacement",
        "outputCompat.prepareOutput",
        "bootstrapMigration.bootstrapFromHistory",
        "bootstrapMigration.repairLegacyAgeClock",
        "bootstrapMigration.repairLegacyClockState",
        "bootstrapMigration.repairLatestGlobalFloorContamination",
    )
    for marker in required_forwarders:
        if marker not in recovery:
            raise SystemExit(f"06700_RECOVERY_FACADE_SHAPE_UNEXPECTED marker={marker}")
    if "module.exports = {" not in recovery:
        raise SystemExit("06700_RECOVERY_FACADE_EXPORT_SHAPE_MISSING")


def assert_candidate(original, updated):
    assert_identity(updated)
    before_names = module_names(original)
    after_names = module_names(updated)
    if "recovery" in after_names:
        raise SystemExit("06700_RECOVERY_PHYSICAL_MODULE_REMAINS")
    if len(after_names) != len(before_names) - 1:
        raise SystemExit(f"06700_MODULE_COUNT_UNEXPECTED before={len(before_names)} after={len(after_names)}")
    if sorted(after_names) != sorted(name for name in before_names if name != "recovery"):
        raise SystemExit("06700_MODULE_INVENTORY_DELTA_UNEXPECTED")

    for token in (
        "require('./recovery')",
        'require("./recovery")',
        "SimCore.require('recovery')",
        'SimCore.require("recovery")',
        'SimCore.define("recovery"',
    ):
        if token in updated:
            raise SystemExit(f"06700_RECOVERY_RUNTIME_RESIDUE {token}")

    contracts = module_text(updated, "contracts")
    if RECOVERY_CONTRACT_LINE in contracts or "  recovery: Object.freeze({" in contracts:
        raise SystemExit("06700_RUNTIME_CONTRACT_RECOVERY_RESIDUE")

    before_edges = module_require_edges(original)
    after_edges = module_require_edges(updated)
    expected_edges = {name: deps for name, deps in before_edges.items() if name != "recovery"}
    if after_edges != expected_edges:
        raise SystemExit("06700_RUNTIME_DEPENDENCY_GRAPH_CHANGED_OUTSIDE_RECOVERY_NODE")

    # Every surviving physical module body remains byte-identical except the current
    # contracts registry and runtime-telemetry's release-compatibility identity string.
    for name in after_names:
        if name in ("contracts", "runtime-telemetry"):
            continue
        if module_text(original, name) != module_text(updated, name):
            raise SystemExit(f"06700_UNEXPECTED_MODULE_BODY_CHANGE {name}")

    expected_contracts = module_text(original, "contracts").replace(RECOVERY_CONTRACT_LINE + "\n", "", 1)
    if module_text(updated, "contracts") != expected_contracts:
        raise SystemExit("06700_CONTRACTS_DELTA_NOT_EXACT_RECOVERY_RETIREMENT")

    expected_telemetry = module_text(original, "runtime-telemetry").replace(
        "const HOST_COMPAT_VERSION = '0.66.0';",
        "const HOST_COMPAT_VERSION = '0.67.0';",
        1,
    )
    if module_text(updated, "runtime-telemetry") != expected_telemetry:
        raise SystemExit("06700_RUNTIME_TELEMETRY_DELTA_NOT_VERSION_ONLY")

    for required in (
        'SimCore.define("output-compat"',
        'SimCore.define("bootstrap-migration"',
        'SimCore.define("output-finalize"',
        'SimCore.define("edit-reconcile"',
        'SimCore.define("representation"',
        "const outputCompat = require('./output-compat');",
        "const bootstrapMigration = require('./bootstrap-migration');",
        "const outputFinalize = require('./output-finalize');",
        "version: '0.67.0'",
        "M2-5 Recovery Transition Debt Retirement",
        "06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT",
    ):
        if required not in updated:
            raise SystemExit(f"06700_REQUIRED_MARKER_MISSING {required}")

    # The implementation is deletion-only with release metadata/guidance updates.
    # These runtime-effect surfaces therefore must not grow.
    for token in ("fetch(", "XMLHttpRequest", "setInterval(", "setTimeout(", "pluginStorage", "Risuai.registerButton(", "Risuai.registerSetting("):
        before = original.count(token)
        after = updated.count(token)
        if after > before:
            raise SystemExit(f"06700_RUNTIME_SURFACE_GREW token={token} before={before} after={after}")

    if RECOVERY_INVENTORY_LINE in updated:
        raise SystemExit("06700_CURRENT_HEADER_RECOVERY_INVENTORY_RESIDUE")
    if "provider cache UNVERIFIED" not in updated and "providerCache: 'UNVERIFIED'" not in updated:
        raise SystemExit("06700_PROVIDER_CACHE_CONTRACT_MISSING")


def patch(original):
    assert_preconditions(original)
    updated = patch_header(original)
    updated = patch_runtime_contract(updated)
    updated = remove_module(updated, "recovery")
    updated = patch_operator_card(updated)
    assert_candidate(original, updated)
    return updated


for target in FILES:
    original = target.read_text(encoding="utf-8")
    updated = patch(original)
    target.write_text(updated, encoding="utf-8")

latest = FILES[0].read_text(encoding="utf-8")
install = FILES[1].read_text(encoding="utf-8")
if latest != install:
    raise SystemExit("06700_LATEST_INSTALL_MISMATCH")

print("06700_BUILD_PASS")
print(f"version={TARGET_VERSION}")
print(f"bytes={len(latest.encode('utf-8'))}")
