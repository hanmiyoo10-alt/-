#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SRC = UD / 'src'
RT = UD / 'runtime'
T = UD / 'tools'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.104.json'
CORE = SRC / '00-runtime-core.part.js'
DASH = SRC / '50-dashboard-context.part.js'
MARKUP = SRC / '54-dashboard-markup.part.js'
ENGINE = RT / 'bridge-engine.mjs'
MANAGER = RT / 'bridge-manager.cjs'
BOOT = RT / 'bootstrap-bridge-manager.sh'
MANIFEST = RT / 'product-manifest.json'
LATEST = UD / 'latest.js'

BASE_PRODUCT = '3.0.0-alpha.5.103'
TARGET_PRODUCT = '3.0.0-alpha.5.104'
ENGINE_VER = '1.6.38'
MANAGER_VER = '1.3.6'
BASE_RELEASE_SHA = '7fc4e31ab28d726cc355915a57f0be566dab2b25'
BASE_ENGINE_SHA = '085273bd748b852de35cbcc7e00241f349ab0cb6ac38dd62c6c5354ad2f56fea'
BASE_MANAGER_SHA = '6503b0ce42a25a996be715ae57b32a97f751a9ee62fd04d32a6806509bd860bd'
BOOT_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    import subprocess
    subprocess.run(args, cwd=ROOT, check=True)


def rep(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.104 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'Gateway Limits Utilization Visualization',
        'engineVersion': ENGINE_VER,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_gateway_limits_utilization_5104.py',
        'newRegression': 'plugins/usage-dashboard/tests/p70-gateway-limits-utilization-visualization.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.104 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.104 contracts changed')
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = (value.get('releaseEvidence') or {}).get(role) or {}
        actual = (row.get('productVersion'), row.get('releaseSha'), row.get('issue'), row.get('commentId'), row.get('verdict'))
        expected_row = (BASE_PRODUCT, BASE_RELEASE_SHA, 1829, 5570738555, 'accepted')
        if actual != expected_row:
            raise SystemExit(f'5.104 evidence mismatch:{role}:{actual}')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1859 or authority.get('designPullRequest') != 1860:
        raise SystemExit('5.104 feature/design authority mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.104 bounded notes missing')
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
        raise SystemExit('5.104 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != ENGINE_VER or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.104 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.104 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.104 bootstrap mismatch')
    dashboard = DASH.read_text()
    markup = MARKUP.read_text()
    for marker in (
        'function gatewayLimitsMetricText(metric)',
        'function gatewayLimitsSectionHtml(truth)',
        'Gateway Limits · Credits',
        '일간 spend · UTC',
        '월간 spend',
        'Rolling 충전 여유',
    ):
        if marker not in dashboard:
            raise SystemExit(f'5.104 accepted 5.103 UI marker missing:{marker}')
    for marker in ('.bar{height:5px', '.bar i{display:block;height:100%;background:var(--g)}'):
        if marker not in markup:
            raise SystemExit(f'5.104 reusable bar primitive missing:{marker}')
    if 'gatewayLimitsUtilizationPercent' in dashboard:
        raise SystemExit('5.104 baseline already contains utilization helper')


def patch(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.103', '//@version 3.0.0-alpha.5.104', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.103';", "const VERSION = '3.0.0-alpha.5.104';", 'Plugin version')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.104 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])

    old_helpers = """  function gatewayLimitsMetricText(metric) {
    if (metric?.state === 'not-applicable') return '미적용';
    if (metric?.state !== 'value' || !num(metric.used) || !num(metric.cap) || !num(metric.remaining)) return '—';
    return `${money(metric.used)} / ${money(metric.cap)} · 남음 ${money(metric.remaining)}`;
  }

  function gatewayLimitsSectionHtml(truth) {
"""
    new_helpers = """  function gatewayLimitsMetricText(metric) {
    if (metric?.state === 'not-applicable') return '미적용';
    if (metric?.state !== 'value' || !num(metric.used) || !num(metric.cap) || !num(metric.remaining)) return '—';
    return `${money(metric.used)} / ${money(metric.cap)} · 남음 ${money(metric.remaining)}`;
  }

  function gatewayLimitsUtilizationPercent(value, cap) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) return null;
    return Math.min(100, Math.max(0, (value / cap) * 100));
  }

  function gatewayLimitsUtilizationBarHtml(metric, mode, label) {
    if (metric?.state !== 'value') return '';
    const numerator = mode === 'remaining' ? metric?.remaining : metric?.used;
    const percent = gatewayLimitsUtilizationPercent(numerator, metric?.cap);
    if (percent === null) return '';
    const percentText = String(percent);
    const ariaText = `${String(label)} ${percentText}%`;
    return `<div class="bar gateway-limits-utilization" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${esc(percentText)}" aria-valuetext="${esc(ariaText)}"><i style="width:${esc(percentText)}%"></i></div>`;
  }

  function gatewayLimitsSectionHtml(truth) {
"""
    rep(DASH, old_helpers, new_helpers, 'utilization helper insertion')
    rep(
        DASH,
        '      <div class="mini"><span>일간 spend · UTC</span><b>${esc(gatewayLimitsMetricText(truth?.daily))}</b></div>\n      <div class="mini"><span>월간 spend</span><b>${esc(gatewayLimitsMetricText(truth?.monthly))}</b></div>\n      <div class="mini"><span>${esc(topUpLabel)}</span><b>${esc(topUpText)}</b></div>',
        '      <div class="mini"><span>일간 spend · UTC</span><b>${esc(gatewayLimitsMetricText(truth?.daily))}</b>${gatewayLimitsUtilizationBarHtml(truth?.daily,\'used\',\'일간 spend 사용률 · UTC\')}</div>\n      <div class="mini"><span>월간 spend</span><b>${esc(gatewayLimitsMetricText(truth?.monthly))}</b>${gatewayLimitsUtilizationBarHtml(truth?.monthly,\'used\',\'월간 spend 사용률\')}</div>\n      <div class="mini"><span>${esc(topUpLabel)}</span><b>${esc(topUpText)}</b>${gatewayLimitsUtilizationBarHtml(truth?.topUp,\'remaining\',\'Rolling top-up 남은 여유 비율\')}</div>',
        'Gateway Limits utilization bars',
    )


def target() -> None:
    manifest = json.loads(MANIFEST.read_text())
    engine_sha = sha(ENGINE)
    manager_sha = sha(MANAGER)
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.104 target Product mismatch')
    if manifest['components']['bridge'].get('requiredVersion') != ENGINE_VER or manifest['components']['bridge'].get('sha256') != BASE_ENGINE_SHA or engine_sha != BASE_ENGINE_SHA:
        raise SystemExit('5.104 Engine exact-byte drift')
    manager = manifest['components']['bridgeManager']
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.104 target Manager manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.104 target contracts changed')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.104 bootstrap changed')
    dashboard = DASH.read_text()
    latest = LATEST.read_text()
    for marker in (
        'function gatewayLimitsUtilizationPercent(value, cap)',
        'function gatewayLimitsUtilizationBarHtml(metric, mode, label)',
        'role="progressbar"',
        "gatewayLimitsUtilizationBarHtml(truth?.daily,'used','일간 spend 사용률 · UTC')",
        "gatewayLimitsUtilizationBarHtml(truth?.monthly,'used','월간 spend 사용률')",
        "gatewayLimitsUtilizationBarHtml(truth?.topUp,'remaining','Rolling top-up 남은 여유 비율')",
    ):
        if marker not in dashboard or marker not in latest:
            raise SystemExit(f'5.104 target visualization marker missing:{marker}')
    for forbidden in ('safe', 'warning', 'critical', 'approaching'):
        helper_start = dashboard.find('  function gatewayLimitsUtilizationPercent(value, cap)')
        helper_end = dashboard.find('  function gatewayLimitsSectionHtml(truth)', helper_start)
        if forbidden in dashboard[helper_start:helper_end].lower():
            raise SystemExit(f'5.104 threshold semantic leaked:{forbidden}')
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

    if sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.104 Engine changed before Product build')
    run('node', str(T / 'build_bridge_engine.cjs'), '--check')

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.103';", "const PRODUCT_VERSION = '3.0.0-alpha.5.104';", 'Manager Product')
    run('node', str(T / 'build_usage_dashboard.cjs'), '--write')
    run('node', str(T / 'build_usage_dashboard.cjs'), '--check')
    if sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.104 Engine changed during Product build')
    manager_sha = sha(MANAGER)

    manifest = json.loads(MANIFEST.read_text())
    manifest['productVersion'] = TARGET_PRODUCT
    manifest['components']['plugin']['version'] = TARGET_PRODUCT
    manifest['components']['bridge']['requiredVersion'] = ENGINE_VER
    manifest['components']['bridge']['sha256'] = BASE_ENGINE_SHA
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
        f'MATERIALIZED:{TARGET_PRODUCT} · Engine {ENGINE_VER} {BASE_ENGINE_SHA} · '
        f'Manager {MANAGER_VER} {manager_sha} · CLI 1.10.0 · Models 1.280.0 · contracts 1/1'
    )


if __name__ == '__main__':
    main()
