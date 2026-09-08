#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SRC = UD / 'src'
ES = UD / 'runtime-src' / 'bridge-engine'
RT = UD / 'runtime'
T = UD / 'tools'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.106.json'
CORE = SRC / '00-runtime-core.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
DIAG = SRC / '40-diagnostics.part.js'
DASH = SRC / '50-dashboard-context.part.js'
ECORE = ES / '00-core.part.mjs'
CAPTURE = ES / '30-cli-runtime.part.mjs'
SOURCES = ES / '40-sources.part.mjs'
HTTP = ES / '70-http-diagnostics.part.mjs'
ENGINE = RT / 'bridge-engine.mjs'
MANAGER = RT / 'bridge-manager.cjs'
BOOT = RT / 'bootstrap-bridge-manager.sh'
MANIFEST = RT / 'product-manifest.json'
LATEST = UD / 'latest.js'

BASE_PRODUCT = '3.0.0-alpha.5.105'
TARGET_PRODUCT = '3.0.0-alpha.5.106'
BASE_ENGINE = '1.6.39'
TARGET_ENGINE = '1.6.40'
MANAGER_VER = '1.3.6'
BASE_ENGINE_SHA = 'f9be84372a776dd743496ef811abea5a0a5582135efb5da9b1fcce58c4b001ae'
BASE_MANAGER_SHA = 'acdc069b42db088d69a3fd48b7c68b12b8ce56de384892fe388f0016e4e938c3'
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
        raise SystemExit(f'5.106 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def insert_before(path: Path, anchor: str, block: str, label: str) -> None:
    text = path.read_text()
    if block.strip() in text:
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'5.106 {label} anchor mismatch:{count}')
    path.write_text(text.replace(anchor, block + anchor, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'Credits Endpoint RPM Limits',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_credits_endpoint_rpm_5106.py',
        'newRegression': 'plugins/usage-dashboard/tests/p72-credits-endpoint-rpm-limits.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.106 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.106 contracts changed')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1874 or authority.get('designPullRequest') != 1875:
        raise SystemExit('5.106 feature/design authority mismatch')
    if authority.get('releaseGeneration') != 'E13':
        raise SystemExit('5.106 durable release generation mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.106 bounded notes missing')
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
        raise SystemExit('5.106 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.106 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.106 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.106 bootstrap mismatch')
    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    product = BRIDGE_IO.read_text() + DASH.read_text() + DIAG.read_text()
    for marker in (
        'const sanitizeGatewayLimits = (value) => {',
        'function normalizeGatewayLimitsCapture(capture, now = Date.now())',
        "cached(`gatewayLimits:${exactOrgId}`",
        "name.startsWith('gatewayLimits:') ? 300_000",
        "url.pathname === '/gateway-limits'",
        'function gatewayLimitsUtilizationPercent(value, cap)',
        'function gatewayNextTierProgressionHtml(nextTier)',
        'Gateway next tier: scope credits',
    ):
        if marker not in capture + sources + product + HTTP.read_text():
            raise SystemExit(f'5.106 accepted 5.105 marker missing:{marker}')
    sanitizer = capture[capture.find('  const sanitizeGatewayLimits = (value) => {'):capture.find('  const sanitizeModel = (row) => {')]
    if 'safe.endpoints' in sanitizer:
        raise SystemExit('5.106 baseline already retains endpoint RPM rows')
    helper = sources[sources.find('function gatewayLimitsNumber(value) {'):sources.find('async function captureGatewayLimitsViaCliSession')]
    if 'endpointRates:' in helper:
        raise SystemExit('5.106 baseline already normalizes endpoint RPM rows')


def patch_core(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.105', '//@version 3.0.0-alpha.5.106', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.105';", "const VERSION = '3.0.0-alpha.5.106';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.39';", "const REQUIRED_BRIDGE_VERSION = '1.6.40';", 'Product required Bridge version')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.106 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])


def patch_engine_capture() -> None:
    block = """    if (Object.prototype.hasOwnProperty.call(raw, 'endpoints')) {
      if (!Array.isArray(raw.endpoints) || raw.endpoints.length > 64) {
        safe.endpoints = null;
      } else {
        const rows = [];
        const seen = new Set();
        let valid = true;
        for (const row of raw.endpoints) {
          const key = row && typeof row === 'object' && !Array.isArray(row) && typeof row.key === 'string' ? row.key : '';
          const rpm = row && typeof row === 'object' && !Array.isArray(row) ? nonNegative(row.rpm) : null;
          if (!key.trim() || key.length > 96 || rpm === null || seen.has(key)) {
            valid = false;
            break;
          }
          seen.add(key);
          rows.push({key,rpm});
        }
        safe.endpoints = valid ? rows : null;
      }
    }
"""
    insert_before(
        CAPTURE,
        "    return Object.keys(safe).length ? safe : null;\n  };\n\n  const sanitizeModel = (row) => {\n",
        block,
        'bounded endpoint RPM sanitizer',
    )


def patch_engine_sources() -> None:
    rep(
        SOURCES,
        """    nextTier: { state:'unknown', currentTier:null, tier:null, daysUntilQualify:null, spendUsdUntilQualify:null, daysUntilSpendPathUnlocks:null },
    fetchedAt: Number(now),
""",
        """    nextTier: { state:'unknown', currentTier:null, tier:null, daysUntilQualify:null, spendUsdUntilQualify:null, daysUntilSpendPathUnlocks:null },
    endpointRates: { state:String(state) === 'permission-unavailable' ? 'permission-unavailable' : 'source-unavailable', rows:[] },
    fetchedAt: Number(now),
""",
        'endpoint RPM unknown state',
    )
    rep(
        SOURCES,
        """  const nextTierRaw = Object.prototype.hasOwnProperty.call(raw, 'nextTier') ? raw.nextTier : undefined;

  const trustTierState""",
        """  const nextTierRaw = Object.prototype.hasOwnProperty.call(raw, 'nextTier') ? raw.nextTier : undefined;
  const endpointsPresent = Object.prototype.hasOwnProperty.call(raw, 'endpoints');
  const endpointsRaw = endpointsPresent ? raw.endpoints : undefined;

  const trustTierState""",
        'endpoint RPM raw source identity',
    )
    block = """
  const endpointUnknown = (state = 'source-unavailable') => ({state,rows:[]});
  let endpointRates = endpointUnknown();
  if (enterprise === true || rateLimitsApply === false) {
    endpointRates = endpointUnknown('not-applicable');
  } else if (rateLimitsApply === true && !endpointsPresent) {
    endpointRates = endpointUnknown('source-unavailable');
  } else if (rateLimitsApply === true && !Array.isArray(endpointsRaw)) {
    endpointRates = endpointUnknown('invalid-endpoints');
  } else if (rateLimitsApply === true) {
    const rows = [];
    const seen = new Set();
    let valid = endpointsRaw.length <= 64;
    if (valid) {
      for (const row of endpointsRaw) {
        const key = row && typeof row === 'object' && !Array.isArray(row) && typeof row.key === 'string' ? row.key : '';
        const rpm = row && typeof row === 'object' && !Array.isArray(row) ? gatewayLimitsNumber(row.rpm) : null;
        if (!key.trim() || key.length > 96 || rpm === null || seen.has(key)) {
          valid = false;
          break;
        }
        seen.add(key);
        rows.push({key,rpm});
      }
    }
    endpointRates = valid ? {state:'value',rows} : endpointUnknown('invalid-endpoints');
  }

"""
    insert_before(
        SOURCES,
        "  return {\n    state: 'ok',\n    source: 'org-limits',\n",
        block,
        'endpoint RPM normalization',
    )
    rep(
        SOURCES,
        """    topUp,
    nextTier,
    fetchedAt: Number(now),
""",
        """    topUp,
    nextTier,
    endpointRates,
    fetchedAt: Number(now),
""",
        'endpoint RPM normalized output',
    )


def patch_product_transport() -> None:
    block = """    const endpointState = ['value','not-applicable','source-unavailable','permission-unavailable','invalid-endpoints'].includes(String(raw?.endpointRates?.state))
      ? String(raw.endpointRates.state)
      : 'source-unavailable';
    let endpointRates = {state:endpointState,rows:[]};
    if (endpointState === 'value') {
      const sourceRows = Array.isArray(raw?.endpointRates?.rows) ? raw.endpointRates.rows : null;
      const rows = [];
      const seen = new Set();
      let valid = Boolean(sourceRows) && sourceRows.length <= 64;
      if (valid) {
        for (const row of sourceRows) {
          const key = row && typeof row === 'object' && !Array.isArray(row) && typeof row.key === 'string' ? row.key : '';
          const rpm = row && typeof row === 'object' && !Array.isArray(row) && typeof row.rpm === 'number' && Number.isFinite(row.rpm) && row.rpm >= 0 ? Number(row.rpm) : null;
          if (!key.trim() || key.length > 96 || rpm === null || seen.has(key)) {
            valid = false;
            break;
          }
          seen.add(key);
          rows.push({key,rpm});
        }
      }
      endpointRates = valid ? {state:'value',rows} : {state:'invalid-endpoints',rows:[]};
    }
"""
    insert_before(
        BRIDGE_IO,
        "    return {\n      state:'ok',\n      source:'org-limits',\n",
        block,
        'Product endpoint RPM normalization',
    )
    rep(
        BRIDGE_IO,
        """      nextTier,
      fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now(),
""",
        """      nextTier,
      endpointRates,
      fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now(),
""",
        'Product endpoint RPM output',
    )


def patch_product_ui() -> None:
    helper = """  function gatewayEndpointRpmLimitsHtml(endpointRates) {
    const stateName = ['value','not-applicable','source-unavailable','permission-unavailable','invalid-endpoints'].includes(String(endpointRates?.state))
      ? String(endpointRates.state)
      : 'source-unavailable';
    if (stateName === 'not-applicable') return '<div class="gateway-endpoint-rpm"><p><b>Endpoint RPM · 조직 한도</b> · 미적용</p></div>';
    if (stateName !== 'value') return '<div class="gateway-endpoint-rpm"><p><b>Endpoint RPM · 조직 한도</b> · —</p></div>';
    const rows = Array.isArray(endpointRates?.rows) ? endpointRates.rows : [];
    const rowHtml = rows.map((row) => {
      const key = typeof row?.key === 'string' ? row.key : '';
      const rpm = typeof row?.rpm === 'number' && Number.isFinite(row.rpm) && row.rpm >= 0 ? Number(row.rpm) : null;
      if (!key.trim() || key.length > 96 || rpm === null) return '';
      const rpmText = rpm === 0 ? 'Unlimited' : `${rpm.toLocaleString('en-US')} /분`;
      return `<div class="mini"><span>${esc(key)}</span><b>${esc(rpmText)}</b></div>`;
    }).filter(Boolean).join('');
    if (rowHtml === '' && rows.length > 0) return '<div class="gateway-endpoint-rpm"><p><b>Endpoint RPM · 조직 한도</b> · —</p></div>';
    return `<details class="gateway-endpoint-rpm"><summary><b>Endpoint RPM · 조직 한도</b> · ${esc(rows.length)}개</summary><p>설정된 조직 한도 · 실시간 사용량/남은 RPM 아님</p><div class="minis">${rowHtml}</div></details>`;
  }

"""
    insert_before(DASH, '  function gatewayLimitsSectionHtml(truth) {\n', helper, 'endpoint RPM UI helper')
    rep(
        DASH,
        """      return `<div class=\"usage-detail-box gateway-limits-card\"><div class=\"recent-head\"><h3>Gateway Limits · Credits</h3><span>source org-limits · ok</span></div><p>Enterprise · 조직 단위 Gateway rate/spend cap 없음</p>${gatewayNextTierProgressionHtml(truth?.nextTier)}</div>`;
""",
        """      return `<div class=\"usage-detail-box gateway-limits-card\"><div class=\"recent-head\"><h3>Gateway Limits · Credits</h3><span>source org-limits · ok</span></div><p>Enterprise · 조직 단위 Gateway rate/spend cap 없음</p>${gatewayNextTierProgressionHtml(truth?.nextTier)}${gatewayEndpointRpmLimitsHtml(truth?.endpointRates)}</div>`;
""",
        'enterprise endpoint RPM placement',
    )
    rep(
        DASH,
        """    </div>${gatewayNextTierProgressionHtml(truth?.nextTier)}</div>`;
""",
        """    </div>${gatewayNextTierProgressionHtml(truth?.nextTier)}${gatewayEndpointRpmLimitsHtml(truth?.endpointRates)}</div>`;
""",
        'regular endpoint RPM placement',
    )


def patch_diagnostics() -> None:
    helper = """  function gatewayEndpointRpmDiagnosticText(value) {
    const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(value?.state)) ? String(value.state) : 'source-unavailable';
    if (sourceState !== 'ok') return `Gateway endpoint RPM: scope credits · source org-limits · state ${sourceState}`;
    const endpointRates = value?.endpointRates;
    const stateName = ['value','not-applicable','source-unavailable','permission-unavailable','invalid-endpoints'].includes(String(endpointRates?.state))
      ? String(endpointRates.state)
      : 'source-unavailable';
    if (stateName !== 'value') return `Gateway endpoint RPM: scope credits · source org-limits · state ${stateName}`;
    const rows = Array.isArray(endpointRates?.rows) ? endpointRates.rows : [];
    let unlimited = 0;
    const seen = new Set();
    for (const row of rows) {
      const key = row && typeof row === 'object' && !Array.isArray(row) && typeof row.key === 'string' ? row.key : '';
      const rpm = row && typeof row === 'object' && !Array.isArray(row) && typeof row.rpm === 'number' && Number.isFinite(row.rpm) && row.rpm >= 0 ? Number(row.rpm) : null;
      if (!key.trim() || key.length > 96 || rpm === null || seen.has(key)) return 'Gateway endpoint RPM: scope credits · source org-limits · state invalid-endpoints';
      seen.add(key);
      if (rpm === 0) unlimited += 1;
    }
    return `Gateway endpoint RPM: scope credits · rows ${rows.length} · unlimited ${unlimited} · source org-limits · state ok`;
  }

"""
    insert_before(DIAG, '  function modelCategoryCatalogDiagnosticText(diagnostics) {\n', helper, 'endpoint RPM diagnostics helper')
    old_line = "      gatewayNextTierDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n"
    rep(
        DIAG,
        old_line,
        old_line + "      gatewayEndpointRpmDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n",
        'endpoint RPM diagnostics line',
    )


def patch(value: dict) -> None:
    patch_core(value)
    rep(ECORE, "const VERSION = '1.6.39';", "const VERSION = '1.6.40';", 'Engine version')
    patch_engine_capture()
    patch_engine_sources()
    patch_product_transport()
    patch_product_ui()
    patch_diagnostics()


def target() -> None:
    manifest = json.loads(MANIFEST.read_text())
    engine_sha = sha(ENGINE)
    manager_sha = sha(MANAGER)
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.106 target Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != engine_sha:
        raise SystemExit('5.106 target Engine manifest mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.106 target Manager manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.106 target contracts changed')
    if engine_sha == BASE_ENGINE_SHA:
        raise SystemExit('5.106 target Engine bytes did not change')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.106 target bootstrap changed')

    capture = CAPTURE.read_text()
    sanitizer = capture[capture.find('  const sanitizeGatewayLimits = (value) => {'):capture.find('  const sanitizeModel = (row) => {')]
    for marker in ("safe.endpoints = null", "safe.endpoints = valid ? rows : null", "rows.push({key,rpm})"):
        if marker not in sanitizer:
            raise SystemExit(f'5.106 endpoint sanitizer marker missing:{marker}')
    for forbidden in ('row.path', 'raw.endpoints.path', 'endpoint.path'):
        if forbidden in sanitizer:
            raise SystemExit(f'5.106 endpoint path retention detected:{forbidden}')

    sources = SOURCES.read_text()
    helper = sources[sources.find('function gatewayLimitsNumber(value) {'):sources.find('async function captureGatewayLimitsViaCliSession')]
    for marker in ("endpointUnknown('invalid-endpoints')", "endpointUnknown('not-applicable')", "endpointRates", "rows.push({key,rpm})"):
        if marker not in helper:
            raise SystemExit(f'5.106 endpoint normalizer marker missing:{marker}')
    for marker in ("cached(`gatewayLimits:${exactOrgId}`", "name.startsWith('gatewayLimits:') ? 300_000"):
        if marker not in sources:
            raise SystemExit(f'5.106 selected-org/cache marker missing:{marker}')

    http = HTTP.read_text()
    if "url.pathname === '/gateway-limits'" not in http or '/gateway-endpoint-rpm' in http:
        raise SystemExit('5.106 local route boundary changed')

    latest = LATEST.read_text()
    for marker in (
        '//@version 3.0.0-alpha.5.106',
        "const REQUIRED_BRIDGE_VERSION = '1.6.40';",
        'Endpoint RPM · 조직 한도',
        'Unlimited',
        'Gateway endpoint RPM: scope credits',
        'Gateway next tier: scope credits',
    ):
        if marker not in latest:
            raise SystemExit(f'5.106 latest.js marker missing:{marker}')
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
    if engine_sha == BASE_ENGINE_SHA:
        raise SystemExit('5.106 Engine bump expected but bytes did not change')

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.105';", "const PRODUCT_VERSION = '3.0.0-alpha.5.106';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.39';", "const BUNDLED_ENGINE_VERSION = '1.6.40';", 'Manager Engine')
    rep(
        MANAGER,
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        'Manager Engine hash',
    )

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
