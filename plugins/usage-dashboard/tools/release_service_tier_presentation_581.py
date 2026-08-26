from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
SERVICE = SRC / '12-service-tier.part.js'
PROVENANCE = SRC / '15-request-provenance.part.js'
PARTS = SRC / 'parts.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.80'
TARGET_VERSION = '3.0.0-alpha.5.81'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Request Ledger Provenance Ownership Consolidation'
TARGET_RELEASE_TITLE = 'Service-Tier Presentation Ownership Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.79 — Diagnostics Workspace Composition Ownership Consolidation`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.80 — Request Ledger Provenance Ownership Consolidation`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'

ACCOUNT_SCOPE_LABEL = '''
  function requestAccountScopeLabel(value) {
    const scope = requestAccountScopeValue(value);
    if (scope === 'devpass') return 'DevPass';
    if (scope === 'credits') return 'Credits';
    return '—';
  }
'''

OLD_TIER_TEXT = '''
  function requestServiceTierText(row) {
    const requested = normalizeServiceTierValue(row?.requestedServiceTier);
    const served = normalizeServiceTierValue(row?.servedServiceTier);
    const label = value => value === 'flex' ? 'FLEX' : value === 'priority' ? 'PRIORITY' : value === 'standard' ? 'STANDARD' : '?';
    if (serviceTierKnown(requested) && serviceTierKnown(served)) {
      return requested === served ? label(served) : `요청 ${label(requested)} → 실제 ${label(served)}`;
    }
    if (serviceTierKnown(served)) return `실제 ${label(served)}`;
    if (serviceTierKnown(requested)) return `요청 ${label(requested)} · 실제 ?`;
    return 'TIER ?';
  }
'''

NEW_TIER_TEXT = '''
  function requestServiceTierText(row) {
    const scopeText = requestAccountScopeLabel(row?.requestAccountScope);
    const requested = normalizeServiceTierValue(row?.requestedServiceTier);
    const served = normalizeServiceTierValue(row?.servedServiceTier);
    const label = value => value === 'flex' ? 'FLEX' : value === 'priority' ? 'PRIORITY' : value === 'standard' ? 'STANDARD' : '?';
    let tierText = 'TIER ?';
    if (serviceTierKnown(requested) && serviceTierKnown(served)) {
      tierText = requested === served ? label(served) : `요청 ${label(requested)} → 실제 ${label(served)}`;
    } else if (serviceTierKnown(served)) {
      tierText = `실제 ${label(served)}`;
    } else if (serviceTierKnown(requested)) {
      tierText = `요청 ${label(requested)} · 실제 ?`;
    }
    return `${scopeText} · ${tierText}`;
  }
'''

SERVICE_TIER_WRAPPER = '''
  const requestServiceTierTextBeforeProvenance = requestServiceTierText;
  requestServiceTierText = function requestServiceTierTextWithProvenance(row) {
    const scopeText = requestAccountScopeLabel(row?.requestAccountScope);
    const tierText = requestServiceTierTextBeforeProvenance(row);
    return `${scopeText} · ${tierText}`;
  };
'''

OLD_PART_MARKER = "  {file:'15-request-provenance.part.js', marker:'\\n  function requestAccountScopeLabel(value) {', label:'request account provenance'},"
NEW_PART_MARKER = "  {file:'15-request-provenance.part.js', marker:'\\n  function requestAccountScopeStats(rows) {', label:'request account provenance'},"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def consolidate_service_tier_presentation() -> None:
    service = SERVICE.read_text(encoding='utf-8')
    if ACCOUNT_SCOPE_LABEL not in service:
        if service.count(OLD_TIER_TEXT) != 1:
            raise SystemExit(f'5.81 module-12 service tier text mismatch: {service.count(OLD_TIER_TEXT)}')
        service = service.replace(OLD_TIER_TEXT, ACCOUNT_SCOPE_LABEL + NEW_TIER_TEXT, 1)
    elif NEW_TIER_TEXT not in service:
        raise SystemExit('5.81 module-12 account-scope helper exists without direct tier composition')
    SERVICE.write_text(service, encoding='utf-8')

    provenance = PROVENANCE.read_text(encoding='utf-8')
    if ACCOUNT_SCOPE_LABEL in provenance:
        provenance = provenance.replace(ACCOUNT_SCOPE_LABEL, '', 1)
    elif 'function requestAccountScopeLabel(value)' in provenance:
        raise SystemExit('5.81 module-15 account-scope label shape changed unexpectedly')
    if SERVICE_TIER_WRAPPER in provenance:
        provenance = provenance.replace(SERVICE_TIER_WRAPPER, '', 1)
    elif 'requestServiceTierTextBeforeProvenance' in provenance or 'requestServiceTierTextWithProvenance' in provenance:
        raise SystemExit('5.81 module-15 service-tier wrapper shape changed unexpectedly')
    PROVENANCE.write_text(provenance, encoding='utf-8')

    parts = PARTS.read_text(encoding='utf-8')
    if OLD_PART_MARKER in parts:
        parts = parts.replace(OLD_PART_MARKER, NEW_PART_MARKER, 1)
        PARTS.write_text(parts, encoding='utf-8')
    elif NEW_PART_MARKER not in parts:
        raise SystemExit('5.81 module-15 PARTS boundary marker mismatch')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        if text.count(BASE_RELEASE_MEMORY) != 1:
            raise SystemExit(f'5.81 release memory sync mismatch: {text.count(BASE_RELEASE_MEMORY)}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if TARGET_VERIFIED_BASELINE not in text:
        if text.count(BASE_VERIFIED_BASELINE) != 1:
            raise SystemExit(f'5.81 verified baseline sync mismatch: {text.count(BASE_VERIFIED_BASELINE)}')
        text = text.replace(BASE_VERIFIED_BASELINE, TARGET_VERIFIED_BASELINE, 1)
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_source_ownership() -> None:
    service = SERVICE.read_text(encoding='utf-8')
    provenance = PROVENANCE.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')

    if service.count('function requestAccountScopeLabel(value)') != 1:
        raise SystemExit('5.81 module 12 must directly own requestAccountScopeLabel exactly once')
    if service.count('function requestServiceTierText(row)') != 1:
        raise SystemExit('5.81 module 12 must directly own requestServiceTierText exactly once')
    for rendered in ['DevPass', 'Credits', 'TIER ?', 'return `${scopeText} · ${tierText}`;']:
        if rendered not in service:
            raise SystemExit(f'5.81 module-12 direct presentation marker missing: {rendered}')
    if 'function requestAccountScopeLabel(value)' in provenance:
        raise SystemExit('5.81 module 15 must not retain requestAccountScopeLabel')
    for retired in ['requestServiceTierTextBeforeProvenance', 'requestServiceTierTextWithProvenance']:
        if retired in provenance:
            raise SystemExit(f'5.81 module-15 service-tier compatibility wrapper remains: {retired}')
    if re.search(r'\brequestServiceTierText\s*=\s*function\b', provenance):
        raise SystemExit('5.81 module 15 must not reassign requestServiceTierText')
    if provenance.count('function requestAccountScopeStats(rows)') != 1:
        raise SystemExit('5.81 module 15 stats owner must remain exactly once')

    if parts.count("{file:") != 24:
        raise SystemExit(f'5.81 source module count must remain 24, got {parts.count("{file:")}')
    order = [parts.find(f"file:'{name}'") for name in [
        '12-service-tier.part.js', '14-request-ledger.part.js', '15-request-provenance.part.js', '16-usage-analytics.part.js'
    ]]
    if not all(index >= 0 for index in order) or order != sorted(order):
        raise SystemExit('5.81 module order must remain 12 -> 14 -> 15 -> 16')
    if NEW_PART_MARKER not in parts:
        raise SystemExit('5.81 module-15 stats-only PARTS marker missing')

    tier_start = service.index('function requestServiceTierText(row)')
    tier_end = service.index('\n\n  function requestServiceTierStats', tier_start)
    direct = service[tier_start:tier_end]
    for forbidden in ['nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(', 'scheduleRefresh(', 'schedulePanelRender(']:
        if forbidden in direct:
            raise SystemExit(f'5.81 presentation ownership must add zero I/O/polling/scheduler work: {forbidden}')
    for forbidden in ['requestedServiceTierSource', 'servedServiceTierSource', 'provider', 'model', 'cost']:
        if forbidden in direct:
            raise SystemExit(f'5.81 presentation must not infer tier/scope from {forbidden}')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.81 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.81 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.81 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.81 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.81 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.81 Engine artifact must remain byte-identical to 5.80')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.81 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.81 bootstrap hash mismatch')

    core = CORE.read_text(encoding='utf-8')
    latest = LATEST.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.81 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in manager_text:
        raise SystemExit('5.81 Manager product version not synchronized')
    for retired in ['requestServiceTierTextBeforeProvenance', 'requestServiceTierTextWithProvenance']:
        if retired in latest:
            raise SystemExit(f'5.81 built plugin still contains retired service-tier wrapper: {retired}')
    if latest.count('function requestAccountScopeLabel(value)') != 1:
        raise SystemExit('5.81 built plugin must contain one native requestAccountScopeLabel')
    validate_source_ownership()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.81 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.81 baseline Engine artifact diverged from 5.80')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.81 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.81 baseline contracts are not 1/1')

old_plugin_bytes = LATEST.stat().st_size
consolidate_service_tier_presentation()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.80', '//@version 3.0.0-alpha.5.81', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.80';", "const VERSION = '3.0.0-alpha.5.81';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.80';", "const PRODUCT_VERSION = '3.0.0-alpha.5.81';", 'manager Product version')
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
new_plugin_bytes = LATEST.stat().st_size
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · service-tier presentation ownership consolidated · plugin bytes {old_plugin_bytes}->{new_plugin_bytes} ({new_plugin_bytes-old_plugin_bytes:+d})')
