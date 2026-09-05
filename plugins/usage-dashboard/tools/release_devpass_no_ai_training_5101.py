#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SRC = UD / 'src'
ES = UD / 'runtime-src' / 'bridge-engine'
RT = UD / 'runtime'
T = UD / 'tools'
TEST = UD / 'tests'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.101.json'
CORE = SRC / '00-runtime-core.part.js'
DASH = SRC / '50-dashboard-context.part.js'
DIAG = SRC / '40-diagnostics.part.js'
LEDGER = SRC / '14-request-ledger.part.js'
PROV = SRC / '15-request-provenance.part.js'
ECORE = ES / '00-core.part.mjs'
CAPTURE = ES / '30-cli-runtime.part.mjs'
SOURCES = ES / '40-sources.part.mjs'
ENGINE = RT / 'bridge-engine.mjs'
MANAGER = RT / 'bridge-manager.cjs'
BOOT = RT / 'bootstrap-bridge-manager.sh'
MANIFEST = RT / 'product-manifest.json'
LATEST = UD / 'latest.js'
P67 = TEST / 'p67-devpass-no-ai-training-status.cjs'

BASE_PRODUCT = '3.0.0-alpha.5.100'
TARGET_PRODUCT = '3.0.0-alpha.5.101'
BASE_ENGINE = '1.6.35'
TARGET_ENGINE = '1.6.36'
MANAGER_VER = '1.3.6'
BASE_RELEASE_SHA = '478fcd368734b1cf1aa5a98932cb34bb29f1d1e4'
BASE_ENGINE_SHA = '6fc3faab12d5c37344bc2799b8182c209d8168d01ce50025bbaa35b8465409f5'
BASE_MANAGER_SHA = '55c6fc1e873a113f365650325946e6d045bf80f6f7e86318ff598062ce592e4d'
BOOT_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def rep(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.101 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'DevPass No-AI-Training Status',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_devpass_no_ai_training_5101.py',
        'newRegression': 'plugins/usage-dashboard/tests/p67-devpass-no-ai-training-status.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.101 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.101 contracts changed')
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = (value.get('releaseEvidence') or {}).get(role) or {}
        actual = (row.get('productVersion'), row.get('releaseSha'), row.get('issue'), row.get('commentId'), row.get('verdict'))
        expected_row = (BASE_PRODUCT, BASE_RELEASE_SHA, 1540, 5553562006, 'accepted')
        if actual != expected_row:
            raise SystemExit(f'5.101 evidence mismatch:{role}:{actual}')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1598 or authority.get('designPullRequest') != 1600:
        raise SystemExit('5.101 feature/design authority mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.101 bounded notes missing')
    out = '  const RELEASE_NOTES = Object.freeze({\n'
    out += f"    title: {json.dumps(value['releaseTitle'], ensure_ascii=False)},\n"
    out += '    highlights: Object.freeze([\n'
    out += ''.join(f"    {json.dumps(item, ensure_ascii=False)},\n" for item in highlights)
    out += '    ]),\n'
    out += '    diagnosticHints: Object.freeze([\n'
    out += ''.join(f"    {json.dumps(item, ensure_ascii=False)},\n" for item in hints)
    out += '    ]),\n  });\n'
    return out


def baseline() -> None:
    manifest = json.loads(MANIFEST.read_text())
    if manifest.get('productVersion') == TARGET_PRODUCT:
        target()
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}')
        raise SystemExit(0)
    if manifest.get('productVersion') != BASE_PRODUCT:
        raise SystemExit('5.101 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.101 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.101 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.101 bootstrap mismatch')
    for marker in (
        'function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())',
        'function requestModelLifecycleText(row)',
        'Model lifecycle fidelity:',
    ):
        if marker not in (ES / '45-model-category.part.mjs').read_text() + PROV.read_text() + DIAG.read_text():
            raise SystemExit(f'5.101 accepted 5.100 behavior missing:{marker}')


def patch(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.100', '//@version 3.0.0-alpha.5.101', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.100';", "const VERSION = '3.0.0-alpha.5.101';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.35';", "const REQUIRED_BRIDGE_VERSION = '1.6.36';", 'Plugin Engine')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.101 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])

    rep(ECORE, "const VERSION = '1.6.35';", "const VERSION = '1.6.36';", 'Engine version')

    rep(
        CAPTURE,
        "      'organizationId','projectId','devPlanServiceTier','defaultRoutingStrategy'\n",
        "      'organizationId','projectId','devPlanServiceTier','defaultRoutingStrategy','blockApiTraining'\n",
        'status safe allowlist',
    )

    helper = """
function devPassNoAiTrainingTruth(raw) {
  if (!raw || typeof raw !== 'object' || !Object.prototype.hasOwnProperty.call(raw, 'blockApiTraining')) {
    return { state:'unknown', source:'unavailable' };
  }
  if (raw.blockApiTraining === true) return { state:'enabled', source:'/dev-plans/status.blockApiTraining' };
  if (raw.blockApiTraining === false) return { state:'disabled', source:'/dev-plans/status.blockApiTraining' };
  return { state:'unknown', source:'unavailable' };
}

"""
    source_text = SOURCES.read_text()
    if 'function devPassNoAiTrainingTruth(raw)' not in source_text:
        anchor = 'function normalizeIndependentDevPassStatus(payload) {'
        if source_text.count(anchor) != 1:
            raise SystemExit('5.101 no-training helper anchor mismatch')
        SOURCES.write_text(source_text.replace(anchor, helper + anchor, 1))

    rep(
        SOURCES,
        "  const expiresAt = pick(raw, [\n    'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',\n    'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'\n  ], null);\n\n  // Important:",
        "  const expiresAt = pick(raw, [\n    'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',\n    'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'\n  ], null);\n  const noAiTraining = devPassNoAiTrainingTruth(raw);\n\n  // Important:",
        'no-training normalization input',
    )
    rep(
        SOURCES,
        "    routingStrategy: String(pick(raw, ['defaultRoutingStrategy', 'default_routing_strategy'], 'auto') || 'auto'),\n    fetchedAt: Date.now(),",
        "    routingStrategy: String(pick(raw, ['defaultRoutingStrategy', 'default_routing_strategy'], 'auto') || 'auto'),\n    noAiTrainingState: noAiTraining.state,\n    noAiTrainingSource: noAiTraining.source,\n    fetchedAt: Date.now(),",
        'no-training normalized fields',
    )
    rep(
        SOURCES,
        "  const useful = (out.plan && out.plan !== 'none') || out.organizationId || out.billingCycleStart || out.expiresAt ||\n    Object.keys(numberFields).some((key) => out[key] !== undefined);",
        "  const useful = (out.plan && out.plan !== 'none') || out.organizationId || out.billingCycleStart || out.expiresAt ||\n    out.noAiTrainingState !== 'unknown' || Object.keys(numberFields).some((key) => out[key] !== undefined);",
        'no-training useful truth',
    )
    rep(
        SOURCES,
        "        autoTopUpAmount: finite(devOrg.devPlanAutoTopUpAmount),\n        fetchedAt: Date.now(),",
        "        autoTopUpAmount: finite(devOrg.devPlanAutoTopUpAmount),\n        noAiTrainingState: 'unknown',\n        noAiTrainingSource: 'unavailable',\n        fetchedAt: Date.now(),",
        'no-training fallback unknown',
    )

    rep(
        DASH,
        "    const devpassAccountDetailHtml = devpassAccount\n",
        "    const devpassNoAiTrainingText = devpassAccount?.noAiTrainingState === 'enabled' ? '사용' : devpassAccount?.noAiTrainingState === 'disabled' ? '꺼짐' : '—';\n    const devpassAccountDetailHtml = devpassAccount\n",
        'DevPass no-training UI truth',
    )
    rep(
        DASH,
        "            <div class=\"mini\"><span>Routing</span><b>${esc(String(devpassAccount.routingStrategy || '—'))}</b></div>\n            <div class=\"mini\"><span>Pending tier</span>",
        "            <div class=\"mini\"><span>Routing</span><b>${esc(String(devpassAccount.routingStrategy || '—'))}</b></div>\n            <div class=\"mini\"><span>AI 학습 차단</span><b>${esc(devpassNoAiTrainingText)}</b></div>\n            <div class=\"mini\"><span>Pending tier</span>",
        'DevPass no-training UI row',
    )

    diagnostic_helper = """
  function devPassNoAiTrainingDiagnosticText(account) {
    const state = account?.noAiTrainingState === 'enabled' ? 'enabled' : account?.noAiTrainingState === 'disabled' ? 'disabled' : 'unknown';
    const source = state !== 'unknown' && account?.noAiTrainingSource === '/dev-plans/status.blockApiTraining'
      ? '/dev-plans/status.blockApiTraining'
      : 'unavailable';
    return `DevPass no-AI-training: ${state} · source ${source}`;
  }

"""
    diag_text = DIAG.read_text()
    if 'function devPassNoAiTrainingDiagnosticText(account)' not in diag_text:
        anchor = '  function modelCategoryCatalogDiagnosticText(diagnostics) {'
        if diag_text.count(anchor) != 1:
            raise SystemExit('5.101 diagnostics helper anchor mismatch')
        DIAG.write_text(diag_text.replace(anchor, diagnostic_helper + anchor, 1))

    account_line = "      `DevPass account tier: service ${diagAccount?.serviceTier || '—'} · routing ${diagAccount?.routingStrategy || '—'} · pending ${diagAccount?.pendingTier || '—'} · personal org ${diagAccount?.hasPersonalOrg === null || diagAccount?.hasPersonalOrg === undefined ? '—' : diagAccount.hasPersonalOrg ? 'yes' : 'no'}`,\n"
    rep(
        DIAG,
        account_line,
        account_line + "      devPassNoAiTrainingDiagnosticText(diagAccount),\n",
        'DevPass no-training diagnostics line',
    )


def target() -> None:
    manifest = json.loads(MANIFEST.read_text())
    engine_sha = sha(ENGINE)
    manager_sha = sha(MANAGER)
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.101 target Product mismatch')
    if manifest['components']['bridge'].get('requiredVersion') != TARGET_ENGINE or manifest['components']['bridge'].get('sha256') != engine_sha:
        raise SystemExit('5.101 target Engine manifest mismatch')
    manager = manifest['components']['bridgeManager']
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.101 target Manager manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.101 target contracts changed')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.101 bootstrap changed')

    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    dashboard = DASH.read_text()
    diagnostics = DIAG.read_text()
    for marker in (
        "'defaultRoutingStrategy','blockApiTraining'",
        'function devPassNoAiTrainingTruth(raw)',
        "raw.blockApiTraining === true",
        "raw.blockApiTraining === false",
        "noAiTrainingState: noAiTraining.state",
        "noAiTrainingSource: noAiTraining.source",
    ):
        if marker not in capture + sources:
            raise SystemExit(f'5.101 Engine truth marker missing:{marker}')
    for marker in ('AI 학습 차단', 'devpassNoAiTrainingText', 'DevPass no-AI-training:', 'devPassNoAiTrainingDiagnosticText'):
        if marker not in dashboard + diagnostics:
            raise SystemExit(f'5.101 Plugin truth marker missing:{marker}')
    for forbidden_owner in (LEDGER, PROV):
        text = forbidden_owner.read_text()
        if any(marker in text for marker in ('noAiTrainingState', 'noAiTrainingSource', 'blockApiTraining')):
            raise SystemExit(f'5.101 no-training truth leaked into request owner:{forbidden_owner.name}')

    run('node', 'plugins/usage-dashboard/tools/build_bridge_engine.cjs', '--check')
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--check')
    run('python3', 'plugins/usage-dashboard/tools/sync_project_guidelines.py', '--check')
    run('node', '--check', str(ENGINE))
    run('node', '--check', str(MANAGER))
    run('node', '--check', str(LATEST))


def main() -> None:
    value = load_spec()
    baseline()
    patch(value)

    run('node', str(T / 'build_bridge_engine.cjs'), '--write')
    run('node', str(T / 'build_bridge_engine.cjs'), '--check')
    engine_sha = sha(ENGINE)

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.100';", "const PRODUCT_VERSION = '3.0.0-alpha.5.101';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.35';", "const BUNDLED_ENGINE_VERSION = '1.6.36';", 'Manager Engine')
    manager_text = MANAGER.read_text()
    manager_text, count = re.subn(
        r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        manager_text,
        count=1,
    )
    if count != 1:
        raise SystemExit('5.101 Manager hash anchor mismatch')
    MANAGER.write_text(manager_text)

    run('node', str(T / 'build_usage_dashboard.cjs'), '--write')
    run('node', str(T / 'build_usage_dashboard.cjs'), '--check')
    manager_sha = sha(MANAGER)

    manifest = json.loads(MANIFEST.read_text())
    manifest['productVersion'] = TARGET_PRODUCT
    manifest['components']['plugin']['version'] = TARGET_PRODUCT
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manager = manifest['components']['bridgeManager']
    manager['version'] = MANAGER_VER
    manager['productVersion'] = TARGET_PRODUCT
    manager['sha256'] = manager_sha
    manager['bootstrapSha256'] = BOOT_SHA
    manager['managedCliVersion'] = '1.10.0'
    manager['managedModelCatalogVersion'] = '1.280.0'
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')

    run('python3', str(T / 'sync_project_guidelines.py'))
    target()
    print(
        f'MATERIALIZED:{TARGET_PRODUCT} · Engine {TARGET_ENGINE} {engine_sha} · '
        f'Manager {MANAGER_VER} {manager_sha} · CLI 1.10.0 · Models 1.280.0 · contracts 1/1'
    )


if __name__ == '__main__':
    main()
