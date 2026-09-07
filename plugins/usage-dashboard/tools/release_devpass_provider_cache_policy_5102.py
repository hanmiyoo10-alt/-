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
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.102.json'
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
P68 = TEST / 'p68-devpass-provider-cache-policy-status.cjs'

BASE_PRODUCT = '3.0.0-alpha.5.101'
TARGET_PRODUCT = '3.0.0-alpha.5.102'
BASE_ENGINE = '1.6.36'
TARGET_ENGINE = '1.6.37'
MANAGER_VER = '1.3.6'
BASE_RELEASE_SHA = 'fa27d1dd6eaa17a8388c96da475ea3965e0572c8'
BASE_ENGINE_SHA = '2f42ef69962e459b274b23d5c28935738de749e36143d41d9af27774997d3b10'
BASE_MANAGER_SHA = '926c81cc78ae7c5fc8c53b78cd790e27f5be1ba4424eda69da405f04ac3637da'
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
        raise SystemExit(f'5.102 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'DevPass Provider Cache Policy Status',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_devpass_provider_cache_policy_5102.py',
        'newRegression': 'plugins/usage-dashboard/tests/p68-devpass-provider-cache-policy-status.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.102 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.102 contracts changed')
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = (value.get('releaseEvidence') or {}).get(role) or {}
        actual = (row.get('productVersion'), row.get('releaseSha'), row.get('issue'), row.get('commentId'), row.get('verdict'))
        expected_row = (BASE_PRODUCT, BASE_RELEASE_SHA, 1598, 5562249836, 'accepted')
        if actual != expected_row:
            raise SystemExit(f'5.102 evidence mismatch:{role}:{actual}')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1803 or authority.get('designPullRequest') != 1805:
        raise SystemExit('5.102 feature/design authority mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.102 bounded notes missing')
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
        raise SystemExit('5.102 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.102 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.102 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.102 bootstrap mismatch')
    current = CAPTURE.read_text() + SOURCES.read_text() + DASH.read_text() + DIAG.read_text()
    for marker in (
        "'defaultRoutingStrategy','blockApiTraining'",
        'function devPassNoAiTrainingTruth(raw)',
        "raw.blockApiTraining === true",
        "raw.blockApiTraining === false",
        'AI 학습 차단',
        'DevPass no-AI-training:',
    ):
        if marker not in current:
            raise SystemExit(f'5.102 accepted 5.101 behavior missing:{marker}')
    if 'providerCacheControlMode' in CAPTURE.read_text():
        raise SystemExit('5.102 baseline already contains provider cache policy capture')


def patch(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.101', '//@version 3.0.0-alpha.5.102', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.101';", "const VERSION = '3.0.0-alpha.5.102';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.36';", "const REQUIRED_BRIDGE_VERSION = '1.6.37';", 'Plugin Engine')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.102 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])

    rep(ECORE, "const VERSION = '1.6.36';", "const VERSION = '1.6.37';", 'Engine version')

    rep(
        CAPTURE,
        "      'organizationId','projectId','devPlanServiceTier','defaultRoutingStrategy','blockApiTraining'\n",
        "      'organizationId','projectId','devPlanServiceTier','defaultRoutingStrategy','blockApiTraining','providerCacheControlMode'\n",
        'status safe allowlist',
    )

    helper = """
function devPassProviderCachePolicyTruth(raw) {
  if (!raw || typeof raw !== 'object' || !Object.prototype.hasOwnProperty.call(raw, 'providerCacheControlMode')) {
    return { state:'unknown', mode:'unknown', source:'unavailable' };
  }
  if (raw.providerCacheControlMode === 'auto') {
    return { state:'automatic', mode:'auto', source:'/dev-plans/status.providerCacheControlMode' };
  }
  if (raw.providerCacheControlMode === 'passthrough') {
    return { state:'client-managed', mode:'passthrough', source:'/dev-plans/status.providerCacheControlMode' };
  }
  if (raw.providerCacheControlMode === 'off') {
    return { state:'disabled', mode:'off', source:'/dev-plans/status.providerCacheControlMode' };
  }
  return { state:'unknown', mode:'unknown', source:'unavailable' };
}

"""
    source_text = SOURCES.read_text()
    if 'function devPassProviderCachePolicyTruth(raw)' not in source_text:
        anchor = 'function normalizeIndependentDevPassStatus(payload) {'
        if source_text.count(anchor) != 1:
            raise SystemExit('5.102 provider cache policy helper anchor mismatch')
        SOURCES.write_text(source_text.replace(anchor, helper + anchor, 1))

    rep(
        SOURCES,
        "  const noAiTraining = devPassNoAiTrainingTruth(raw);\n\n  // Important:",
        "  const noAiTraining = devPassNoAiTrainingTruth(raw);\n  const providerCachePolicy = devPassProviderCachePolicyTruth(raw);\n\n  // Important:",
        'provider cache policy normalization input',
    )
    rep(
        SOURCES,
        "    noAiTrainingState: noAiTraining.state,\n    noAiTrainingSource: noAiTraining.source,\n    fetchedAt: Date.now(),",
        "    noAiTrainingState: noAiTraining.state,\n    noAiTrainingSource: noAiTraining.source,\n    providerCachePolicyState: providerCachePolicy.state,\n    providerCachePolicyMode: providerCachePolicy.mode,\n    providerCachePolicySource: providerCachePolicy.source,\n    fetchedAt: Date.now(),",
        'provider cache policy normalized fields',
    )
    rep(
        SOURCES,
        "  const useful = (out.plan && out.plan !== 'none') || out.organizationId || out.billingCycleStart || out.expiresAt ||\n    out.noAiTrainingState !== 'unknown' || Object.keys(numberFields).some((key) => out[key] !== undefined);",
        "  const useful = (out.plan && out.plan !== 'none') || out.organizationId || out.billingCycleStart || out.expiresAt ||\n    out.noAiTrainingState !== 'unknown' || out.providerCachePolicyState !== 'unknown' || Object.keys(numberFields).some((key) => out[key] !== undefined);",
        'provider cache policy useful truth',
    )
    rep(
        SOURCES,
        "        noAiTrainingState: 'unknown',\n        noAiTrainingSource: 'unavailable',\n        fetchedAt: Date.now(),",
        "        noAiTrainingState: 'unknown',\n        noAiTrainingSource: 'unavailable',\n        providerCachePolicyState: 'unknown',\n        providerCachePolicyMode: 'unknown',\n        providerCachePolicySource: 'unavailable',\n        fetchedAt: Date.now(),",
        'provider cache policy fallback unknown',
    )

    rep(
        DASH,
        "    const devpassNoAiTrainingText = devpassAccount?.noAiTrainingState === 'enabled' ? '사용' : devpassAccount?.noAiTrainingState === 'disabled' ? '꺼짐' : '—';\n    const devpassAccountDetailHtml = devpassAccount\n",
        "    const devpassNoAiTrainingText = devpassAccount?.noAiTrainingState === 'enabled' ? '사용' : devpassAccount?.noAiTrainingState === 'disabled' ? '꺼짐' : '—';\n    const devpassProviderCachePolicyText = devpassAccount?.providerCachePolicyState === 'automatic' ? '자동' : devpassAccount?.providerCachePolicyState === 'client-managed' ? '클라이언트 관리' : devpassAccount?.providerCachePolicyState === 'disabled' ? '꺼짐' : '—';\n    const devpassAccountDetailHtml = devpassAccount\n",
        'DevPass provider cache policy UI truth',
    )
    rep(
        DASH,
        "            <div class=\"mini\"><span>AI 학습 차단</span><b>${esc(devpassNoAiTrainingText)}</b></div>\n            <div class=\"mini\"><span>Pending tier</span>",
        "            <div class=\"mini\"><span>AI 학습 차단</span><b>${esc(devpassNoAiTrainingText)}</b></div>\n            <div class=\"mini\"><span>Provider 캐시 정책</span><b>${esc(devpassProviderCachePolicyText)}</b></div>\n            <div class=\"mini\"><span>Pending tier</span>",
        'DevPass provider cache policy UI row',
    )

    diagnostic_helper = """
  function devPassProviderCachePolicyDiagnosticText(account) {
    const state = ['automatic','client-managed','disabled'].includes(String(account?.providerCachePolicyState || ''))
      ? String(account.providerCachePolicyState)
      : 'unknown';
    const expectedMode = state === 'automatic' ? 'auto' : state === 'client-managed' ? 'passthrough' : state === 'disabled' ? 'off' : 'unknown';
    const mode = state !== 'unknown' && account?.providerCachePolicyMode === expectedMode ? expectedMode : 'unknown';
    const source = mode !== 'unknown' && account?.providerCachePolicySource === '/dev-plans/status.providerCacheControlMode'
      ? '/dev-plans/status.providerCacheControlMode'
      : 'unavailable';
    return `DevPass provider cache policy: ${mode} · source ${source}`;
  }

"""
    diag_text = DIAG.read_text()
    if 'function devPassProviderCachePolicyDiagnosticText(account)' not in diag_text:
        anchor = '  function modelCategoryCatalogDiagnosticText(diagnostics) {'
        if diag_text.count(anchor) != 1:
            raise SystemExit('5.102 diagnostics helper anchor mismatch')
        DIAG.write_text(diag_text.replace(anchor, diagnostic_helper + anchor, 1))

    rep(
        DIAG,
        "      devPassNoAiTrainingDiagnosticText(diagAccount),\n",
        "      devPassNoAiTrainingDiagnosticText(diagAccount),\n      devPassProviderCachePolicyDiagnosticText(diagAccount),\n",
        'DevPass provider cache policy diagnostics line',
    )


def target() -> None:
    manifest = json.loads(MANIFEST.read_text())
    engine_sha = sha(ENGINE)
    manager_sha = sha(MANAGER)
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.102 target Product mismatch')
    if manifest['components']['bridge'].get('requiredVersion') != TARGET_ENGINE or manifest['components']['bridge'].get('sha256') != engine_sha:
        raise SystemExit('5.102 target Engine manifest mismatch')
    manager = manifest['components']['bridgeManager']
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.102 target Manager manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.102 target contracts changed')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.102 bootstrap changed')

    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    dashboard = DASH.read_text()
    diagnostics = DIAG.read_text()
    for marker in (
        "'blockApiTraining','providerCacheControlMode'",
        'function devPassProviderCachePolicyTruth(raw)',
        "raw.providerCacheControlMode === 'auto'",
        "raw.providerCacheControlMode === 'passthrough'",
        "raw.providerCacheControlMode === 'off'",
        'providerCachePolicyState: providerCachePolicy.state',
        'providerCachePolicyMode: providerCachePolicy.mode',
        'providerCachePolicySource: providerCachePolicy.source',
    ):
        if marker not in capture + sources:
            raise SystemExit(f'5.102 Engine truth marker missing:{marker}')
    for marker in (
        'AI 학습 차단',
        'Provider 캐시 정책',
        'devpassProviderCachePolicyText',
        'DevPass no-AI-training:',
        'DevPass provider cache policy:',
        'devPassProviderCachePolicyDiagnosticText',
    ):
        if marker not in dashboard + diagnostics:
            raise SystemExit(f'5.102 Plugin truth marker missing:{marker}')
    for forbidden_owner in (LEDGER, PROV):
        text = forbidden_owner.read_text()
        if any(marker in text for marker in (
            'providerCacheControlMode', 'providerCachePolicyState', 'providerCachePolicyMode', 'providerCachePolicySource'
        )):
            raise SystemExit(f'5.102 provider cache policy leaked into request owner:{forbidden_owner.name}')

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

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.101';", "const PRODUCT_VERSION = '3.0.0-alpha.5.102';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.36';", "const BUNDLED_ENGINE_VERSION = '1.6.37';", 'Manager Engine')
    manager_text = MANAGER.read_text()
    manager_text, count = re.subn(
        r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        manager_text,
        count=1,
    )
    if count != 1:
        raise SystemExit('5.102 Manager hash anchor mismatch')
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
