from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
RUNTIME_SRC = ROOT / 'runtime-src' / 'bridge-engine'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.84.json')

CORE = SRC / '00-runtime-core.part.js'
SERVICE_TIER = SRC / '12-service-tier.part.js'
LEDGER = SRC / '14-request-ledger.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
ENGINE_CAPTURE = RUNTIME_SRC / '35-request-provenance-capture.part.mjs'
ENGINE_SOURCES = RUNTIME_SRC / '40-sources.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.83'
TARGET_VERSION = '3.0.0-alpha.5.84'
BASE_ENGINE = '1.6.24'
TARGET_ENGINE = '1.6.25'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Exact Final HTTP Status Fidelity'
TARGET_RELEASE_TITLE = 'Service Tier Selection-Source Fidelity'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.83 — Exact Final HTTP Status Fidelity`.'
BASE_ENGINE_SHA = '887064e1bd019cf8d8a8d851c8c7a8e0c61b105a37578cdde806f2eeab16eebc'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def replace_once_or_target(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def load_release_notes():
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    if spec.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.84 release spec product version mismatch')
    if spec.get('engineVersion') != TARGET_ENGINE:
        raise SystemExit('5.84 release spec Engine version mismatch')
    if spec.get('managerVersion') != TARGET_MANAGER:
        raise SystemExit('5.84 release spec Manager version mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.84 release spec contracts changed from 1/1')
    if spec.get('materializer') != 'plugins/usage-dashboard/tools/release_service_tier_selection_source_584.py':
        raise SystemExit('5.84 release spec materializer mismatch')
    title = spec.get('releaseTitle')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    if not isinstance(title, str) or not title.strip():
        raise SystemExit('5.84 releaseTitle must be a non-empty string')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.84 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 160 for item in value):
            raise SystemExit(f'5.84 {key} items must be non-empty bounded strings')
    return title.strip(), [x.strip() for x in highlights], [x.strip() for x in hints]


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def release_notes_constant(title, highlights, hints) -> str:
    h = ',\n    '.join(js_string(item) for item in highlights)
    d = ',\n    '.join(js_string(item) for item in hints)
    return (
        "  const RELEASE_NOTES = Object.freeze({\n"
        f"    title: {js_string(title)},\n"
        "    highlights: Object.freeze([\n"
        f"    {h}\n"
        "    ]),\n"
        "    diagnosticHints: Object.freeze([\n"
        f"    {d}\n"
        "    ]),\n"
        "  });\n"
    )


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.83', '//@version 3.0.0-alpha.5.84', '5.84 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.83';", "  const VERSION = '3.0.0-alpha.5.84';", '5.84 plugin runtime version')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_VERSION = '1.6.24';", "  const REQUIRED_BRIDGE_VERSION = '1.6.25';", '5.84 plugin Engine requirement')
    replace_once_or_target(ENGINE_CORE, "const VERSION = '1.6.24';", "const VERSION = '1.6.25';", '5.84 Engine source version')

    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.84 static release notes boundary missing')
    current = text[start:end]
    if current != notes:
        text = text[:start] + notes + text[end:]
        CORE.write_text(text, encoding='utf-8')


def apply_capture_selection_source() -> None:
    replace_once_or_target(
        ENGINE_CAPTURE,
        '"llmgateway.devpass.bridge.capture.v12",',
        '"llmgateway.devpass.bridge.capture.v13",',
        '5.84 capture marker v13',
    )
    old_input = (
        "      const requestUsedMode = logField(row, ['usedMode','used_mode']);\\n"
        "      const finalHttpStatus = logField(row, ['errorDetails.statusCode']);\\n"
        "      const cacheUsage = normalizeProviderCacheUsage(row);"
    )
    new_input = (
        "      const requestUsedMode = logField(row, ['usedMode','used_mode']);\\n"
        "      const finalHttpStatus = logField(row, ['errorDetails.statusCode']);\\n"
        "      const serviceTierSelection = logField(row, ['routingMetadata.serviceTierSource']);\\n"
        "      const cacheUsage = normalizeProviderCacheUsage(row);"
    )
    replace_once_or_target(ENGINE_CAPTURE, old_input, new_input, '5.84 selection-source capture input')

    old_fields = (
        "        httpStatusFidelity: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? 'explicit' : 'unknown',\\n"
        "        requestProjectId: requestProject.value === null ? '' : String(requestProject.value),"
    )
    new_fields = (
        "        httpStatusFidelity: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? 'explicit' : 'unknown',\\n"
        "        serviceTierSelectionSource: ['request','coding-plan-default'].includes(String(serviceTierSelection.value || '').trim().toLowerCase()) ? String(serviceTierSelection.value).trim().toLowerCase() : 'unknown',\\n"
        "        requestProjectId: requestProject.value === null ? '' : String(requestProject.value),"
    )
    replace_once_or_target(ENGINE_CAPTURE, old_fields, new_fields, '5.84 selection-source capture field')


def apply_engine_selection_source() -> None:
    old = """    const httpStatusExplicit = row?.httpStatusFidelity === 'explicit'
      && row?.httpStatusSource === 'errorDetails.statusCode'
      && typeof row?.httpStatusCode === 'number'
      && Number.isInteger(row.httpStatusCode)
      && row.httpStatusCode >= 100
      && row.httpStatusCode <= 599;
"""
    new = old + """    const serviceTierSelectionSource = ['request','coding-plan-default'].includes(String(row?.serviceTierSelectionSource || '').trim().toLowerCase())
      ? String(row.serviceTierSelectionSource).trim().toLowerCase()
      : 'unknown';
"""
    replace_once_or_target(ENGINE_SOURCES, old, new, '5.84 Engine selection-source predicate')

    old_out = """      servedServiceTierSource: String(row.servedServiceTierSource || ''),
      requestNumber,
"""
    new_out = """      servedServiceTierSource: String(row.servedServiceTierSource || ''),
      serviceTierSelectionSource,
      requestNumber,
"""
    replace_once_or_target(ENGINE_SOURCES, old_out, new_out, '5.84 Engine public selection-source field')


def apply_plugin_selection_helpers() -> None:
    old = """  function serviceTierKnown(value) {
    return ['flex','standard','priority'].includes(normalizeServiceTierValue(value));
  }

"""
    new = old + """  function normalizeServiceTierSelectionSource(value) {
    const text = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
    if (text === 'request') return 'request';
    if (text === 'coding-plan-default') return 'coding-plan-default';
    return 'unknown';
  }

  function serviceTierSelectionSourceKnown(value) {
    return ['request','coding-plan-default'].includes(normalizeServiceTierSelectionSource(value));
  }

  function preferKnownServiceTierSelectionSource(next, current) {
    const nextSource = normalizeServiceTierSelectionSource(next);
    const currentSource = normalizeServiceTierSelectionSource(current);
    if (serviceTierSelectionSourceKnown(nextSource)) return nextSource;
    if (serviceTierSelectionSourceKnown(currentSource)) return currentSource;
    return 'unknown';
  }

"""
    replace_once_or_target(SERVICE_TIER, old, new, '5.84 Plugin selection-source normalizer')

    old_text = """  function requestServiceTierStats(rows) {
"""
    helper = """  function requestServiceTierSelectionSourceText(row) {
    const source = normalizeServiceTierSelectionSource(row?.serviceTierSelectionSource);
    if (source === 'request') return '요청 지정';
    if (source === 'coding-plan-default') return '플랜 기본';
    return '';
  }

"""
    replace_once_or_target(SERVICE_TIER, old_text, helper + old_text, '5.84 Plugin selection-source presentation')

    old_stats = """    const stats = {rows:list.length, requestedKnown:0, servedKnown:0, flex:0, standard:0, priority:0, unknown:0, requestedSources:[], servedSources:[]};
    const requestedSources = new Set();
    const servedSources = new Set();
    for (const row of list) {
      const requested = normalizeServiceTierValue(row?.requestedServiceTier);
      const served = normalizeServiceTierValue(row?.servedServiceTier);
      if (serviceTierKnown(requested)) stats.requestedKnown += 1;
      if (serviceTierKnown(served)) {
        stats.servedKnown += 1;
        stats[served] += 1;
      } else stats.unknown += 1;
      if (row?.requestedServiceTierSource) requestedSources.add(String(row.requestedServiceTierSource));
      if (row?.servedServiceTierSource) servedSources.add(String(row.servedServiceTierSource));
    }
"""
    new_stats = """    const stats = {
      rows:list.length, requestedKnown:0, servedKnown:0,
      flex:0, standard:0, priority:0, unknown:0,
      requested:{flex:0,standard:0,priority:0,unknown:0},
      served:{flex:0,standard:0,priority:0,unknown:0},
      selectionSource:{request:0,planDefault:0,unknown:0},
      requestedSources:[], servedSources:[]
    };
    const requestedSources = new Set();
    const servedSources = new Set();
    for (const row of list) {
      const requested = normalizeServiceTierValue(row?.requestedServiceTier);
      const served = normalizeServiceTierValue(row?.servedServiceTier);
      const selection = normalizeServiceTierSelectionSource(row?.serviceTierSelectionSource);
      if (serviceTierKnown(requested)) {
        stats.requestedKnown += 1;
        stats.requested[requested] += 1;
      } else stats.requested.unknown += 1;
      if (serviceTierKnown(served)) {
        stats.servedKnown += 1;
        stats[served] += 1;
        stats.served[served] += 1;
      } else {
        stats.unknown += 1;
        stats.served.unknown += 1;
      }
      if (selection === 'request') stats.selectionSource.request += 1;
      else if (selection === 'coding-plan-default') stats.selectionSource.planDefault += 1;
      else stats.selectionSource.unknown += 1;
      if (row?.requestedServiceTierSource) requestedSources.add(String(row.requestedServiceTierSource));
      if (row?.servedServiceTierSource) servedSources.add(String(row.servedServiceTierSource));
    }
"""
    replace_once_or_target(SERVICE_TIER, old_stats, new_stats, '5.84 Plugin selection-source stats')


def apply_ledger_selection_source() -> None:
    old = """      const requestedServiceTierSource = String(recentRequestValue(row, ['requestedServiceTierSource','requested_service_tier_source'], requestedTierField.key) || requestedTierField.key || '');
      const servedServiceTierSource = String(recentRequestValue(row, ['servedServiceTierSource','served_service_tier_source'], servedTierField.key) || servedTierField.key || '');
"""
    new = old + """      const serviceTierSelectionSource = normalizeServiceTierSelectionSource(recentRequestValue(row, ['serviceTierSelectionSource','service_tier_selection_source'], 'unknown'));
"""
    replace_once_or_target(LEDGER, old, new, '5.84 ledger selection-source normalize input')

    old_out = """        requestedServiceTierSource,
        servedServiceTierSource,
        requestNumber,
"""
    new_out = """        requestedServiceTierSource,
        servedServiceTierSource,
        serviceTierSelectionSource,
        requestNumber,
"""
    replace_once_or_target(LEDGER, old_out, new_out, '5.84 ledger normalized selection-source field')

    old_merge = """          requestedServiceTier:preferKnownServiceTier(row.requestedServiceTier, current?.requestedServiceTier),
          servedServiceTier:preferKnownServiceTier(row.servedServiceTier, current?.servedServiceTier),
          requestedServiceTierSource:String(row.requestedServiceTierSource || current?.requestedServiceTierSource || ''),
          servedServiceTierSource:String(row.servedServiceTierSource || current?.servedServiceTierSource || ''),
          timestampPrecision:String(row.timestampPrecision || current?.timestampPrecision || 'unknown'),
"""
    new_merge = """          requestedServiceTier:preferKnownServiceTier(row.requestedServiceTier, current?.requestedServiceTier),
          servedServiceTier:preferKnownServiceTier(row.servedServiceTier, current?.servedServiceTier),
          requestedServiceTierSource:String(row.requestedServiceTierSource || current?.requestedServiceTierSource || ''),
          servedServiceTierSource:String(row.servedServiceTierSource || current?.servedServiceTierSource || ''),
          serviceTierSelectionSource:preferKnownServiceTierSelectionSource(row.serviceTierSelectionSource, current?.serviceTierSelectionSource),
          timestampPrecision:String(row.timestampPrecision || current?.timestampPrecision || 'unknown'),
"""
    replace_once_or_target(LEDGER, old_merge, new_merge, '5.84 ledger selection-source enrichment merge')

    old_hourly = """        const cacheText = requestCacheDetailText(row) || '캐시 정보 없음';
        const tierText = requestServiceTierText(row);
        const durationText = `Duration ${requestDurationText(row)}`;
        const httpStatusText = requestHttpStatusText(row);
        const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');
"""
    new_hourly = """        const cacheText = requestCacheDetailText(row) || '캐시 정보 없음';
        const tierText = requestServiceTierText(row);
        const tierSelectionText = requestServiceTierSelectionSourceText(row);
        const durationText = `Duration ${requestDurationText(row)}`;
        const httpStatusText = requestHttpStatusText(row);
        const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, tierSelectionText, durationText, cacheText].filter(Boolean).join(' · ');
"""
    replace_once_or_target(LEDGER, old_hourly, new_hourly, '5.84 hourly selection-source suffix')

    old_recent = """      const cacheText = requestCacheDetailText(row);
      const tierText = requestServiceTierText(row);
      const durationText = `Duration ${requestDurationText(row)}`;
      const httpStatusText = requestHttpStatusText(row);
      const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');
"""
    new_recent = """      const cacheText = requestCacheDetailText(row);
      const tierText = requestServiceTierText(row);
      const tierSelectionText = requestServiceTierSelectionSourceText(row);
      const durationText = `Duration ${requestDurationText(row)}`;
      const httpStatusText = requestHttpStatusText(row);
      const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, tierSelectionText, durationText, cacheText].filter(Boolean).join(' · ');
"""
    replace_once_or_target(LEDGER, old_recent, new_recent, '5.84 recent selection-source suffix')


def apply_diagnostics_selection_source() -> None:
    old = """      `Service tier fidelity: requested known ${diagTierFidelity.requestedKnown}/${diagTierFidelity.rows} · served known ${diagTierFidelity.servedKnown}/${diagTierFidelity.rows} · served flex ${diagTierFidelity.flex} · standard ${diagTierFidelity.standard} · priority ${diagTierFidelity.priority} · unknown ${diagTierFidelity.unknown}`,
      `Service tier source fields: requested ${diagTierFidelity.requestedSources.join(',') || 'none'} · served ${diagTierFidelity.servedSources.join(',') || 'none'}`,
"""
    new = """      `Service tier fidelity: requested known ${diagTierFidelity.requestedKnown}/${diagTierFidelity.rows} · served known ${diagTierFidelity.servedKnown}/${diagTierFidelity.rows} · served flex ${diagTierFidelity.flex} · standard ${diagTierFidelity.standard} · priority ${diagTierFidelity.priority} · unknown ${diagTierFidelity.unknown}`,
      `Service tier requested: FLEX ${diagTierFidelity.requested.flex} · STANDARD ${diagTierFidelity.requested.standard} · PRIORITY ${diagTierFidelity.requested.priority} · unknown ${diagTierFidelity.requested.unknown}`,
      `Service tier served: FLEX ${diagTierFidelity.served.flex} · STANDARD ${diagTierFidelity.served.standard} · PRIORITY ${diagTierFidelity.served.priority} · unknown ${diagTierFidelity.served.unknown}`,
      `Service tier selection source: request ${diagTierFidelity.selectionSource.request} · plan-default ${diagTierFidelity.selectionSource.planDefault} · unknown ${diagTierFidelity.selectionSource.unknown}`,
      `Service tier source fields: requested ${diagTierFidelity.requestedSources.join(',') || 'none'} · served ${diagTierFidelity.servedSources.join(',') || 'none'}`,
"""
    replace_once_or_target(DIAGNOSTICS, old, new, '5.84 selection-source diagnostics')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        if text.count(BASE_RELEASE_MEMORY) != 1:
            raise SystemExit(f'5.84 release memory sync mismatch: {text.count(BASE_RELEASE_MEMORY)}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    baseline_re = re.compile(r'Last verified real-device baseline: `[^`]+`\.', re.M)
    if VERIFIED_BASELINE + '.' not in text:
        text, count = baseline_re.subn(VERIFIED_BASELINE + '.', text, count=1)
        if count != 1:
            raise SystemExit('5.84 verified baseline marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manager_engine_identity() -> None:
    engine_sha = sha256(ENGINE)
    manager_text = MANAGER.read_text(encoding='utf-8')
    manager_text, product_count = re.subn(
        r"const PRODUCT_VERSION = '[^']+';",
        f"const PRODUCT_VERSION = '{TARGET_VERSION}';",
        manager_text,
        count=1,
    )
    manager_text, version_count = re.subn(
        r"const BUNDLED_ENGINE_VERSION = '[^']+';",
        f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';",
        manager_text,
        count=1,
    )
    manager_text, sha_count = re.subn(
        r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]+';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        manager_text,
        count=1,
    )
    if product_count != 1 or version_count != 1 or sha_count != 1:
        raise SystemExit('5.84 Manager identity markers missing')
    MANAGER.write_text(manager_text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest.get('productVersion') == TARGET_VERSION:
        return
    if manifest.get('productVersion') != BASE_VERSION:
        raise SystemExit(f'5.84 baseline product mismatch: {manifest.get("productVersion")}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.84 baseline Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.84 baseline Manager version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.84 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.84 baseline Engine artifact diverged from verified 5.83')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.84 bootstrap baseline diverged')


title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
apply_capture_selection_source()
apply_engine_selection_source()
apply_plugin_selection_helpers()
apply_ledger_selection_source()
apply_diagnostics_selection_source()
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
sync_manager_engine_identity()
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))

print(f'5.84 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; Engine {old_engine_bytes}->{ENGINE.stat().st_size} bytes; Engine SHA {sha256(ENGINE)}')
