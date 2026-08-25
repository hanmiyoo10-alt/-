from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
USAGE = SRC / '16-usage-analytics.part.js'
WRAPPER = SRC / '18-request-provenance-analytics.part.js'
PARTS = SRC / 'parts.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.74'
TARGET_VERSION = '3.0.0-alpha.5.75'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Diagnostics Mode Handler Ownership Consolidation'
TARGET_RELEASE_TITLE = 'Provenance Analytics Wrapper Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.73 — Runtime Weight & Lifecycle Audit`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'

PROVENANCE_FUNCTION = '''  function normalizeRequestProvenanceMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const captureMode = ['account-wide','project-fallback','unknown'].includes(String(raw.captureMode))
      ? String(raw.captureMode)
      : 'unknown';
    const bounded = value => num(value) ? Math.max(0, Number(value)) : 0;
    return {
      captureMode,
      rows:bounded(raw.rows),
      fallbackCount:bounded(raw.fallbackCount),
      devpass:bounded(raw.devpass),
      credits:bounded(raw.credits),
      unknown:bounded(raw.unknown),
      conflict:bounded(raw.conflict),
      modelInference:0,
      authority:String(raw.authority || '') === 'project-exact+credits-org-used-mode'
        ? 'project-exact+credits-org-used-mode'
        : 'unknown',
    };
  }

'''

BASE_RETURN = "    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};"
TARGET_RETURN = "    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};"
PART_ENTRY = "  {file:'18-request-provenance-analytics.part.js', marker:'\\n  function normalizeRequestProvenanceMetadata(raw) {', label:'request provenance analytics'},\n"


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


def consolidate_provenance_owner() -> None:
    usage = USAGE.read_text(encoding='utf-8')
    if PROVENANCE_FUNCTION not in usage:
        marker = '  function normalizeScopeActivity(raw) {'
        if usage.count(marker) != 1:
            raise SystemExit('5.75 normalizeScopeActivity insertion point mismatch')
        usage = usage.replace(marker, PROVENANCE_FUNCTION + marker, 1)
    if TARGET_RETURN not in usage:
        if usage.count(BASE_RETURN) != 1:
            raise SystemExit('5.75 normalizeScopeActivity return authority mismatch')
        usage = usage.replace(BASE_RETURN, TARGET_RETURN, 1)
    if 'normalizeScopeActivityBeforeProvenance' in usage or 'normalizeScopeActivityWithProvenance' in usage:
        raise SystemExit('5.75 wrapper reassignment leaked into module 16')
    USAGE.write_text(usage, encoding='utf-8')

    if WRAPPER.exists():
        wrapper = WRAPPER.read_text(encoding='utf-8')
        required = [
            'function normalizeRequestProvenanceMetadata(raw)',
            'const normalizeScopeActivityBeforeProvenance = normalizeScopeActivity;',
            'normalizeScopeActivity = function normalizeScopeActivityWithProvenance(raw)',
        ]
        for marker in required:
            if marker not in wrapper:
                raise SystemExit(f'5.75 module 18 unexpected content: missing {marker}')
        WRAPPER.unlink()

    parts = PARTS.read_text(encoding='utf-8')
    if PART_ENTRY in parts:
        parts = parts.replace(PART_ENTRY, '', 1)
        PARTS.write_text(parts, encoding='utf-8')
    if "18-request-provenance-analytics.part.js" in PARTS.read_text(encoding='utf-8'):
        raise SystemExit('5.75 module 18 remains registered')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        count = text.count(BASE_RELEASE_MEMORY)
        if count != 1:
            raise SystemExit(f'5.75 release memory sync: expected exactly one 5.74 memory line, found {count}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if VERIFIED_BASELINE not in text:
        raise SystemExit('5.75 verified baseline must remain the repository-proven 5.73 baseline')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_consolidation_source() -> None:
    usage = USAGE.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')
    if WRAPPER.exists():
        raise SystemExit('5.75 module 18 must be deleted')
    if usage.count('function normalizeRequestProvenanceMetadata(raw)') != 1:
        raise SystemExit('5.75 module 16 must directly own exactly one provenance normalizer')
    if TARGET_RETURN not in usage:
        raise SystemExit('5.75 normalizeScopeActivity must directly emit requestProvenance')
    for forbidden in ['normalizeScopeActivityBeforeProvenance', 'normalizeScopeActivityWithProvenance']:
        if forbidden in usage:
            raise SystemExit(f'5.75 wrapper marker remains: {forbidden}')
    i15 = parts.find("file:'15-request-provenance.part.js'")
    i16 = parts.find("file:'16-usage-analytics.part.js'")
    i20 = parts.find("file:'20-bridge-io.part.js'")
    if not (0 <= i15 < i16 < i20):
        raise SystemExit('5.75 module order must be 15 -> 16 -> 20')
    if parts.count("{file:") != 27:
        raise SystemExit(f'5.75 production module count must be 27, got {parts.count("{file:")}')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.75 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.75 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.75 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.75 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.75 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.75 Engine artifact must remain byte-identical to 5.74')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.75 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.75 bootstrap hash mismatch')
    guidelines = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in guidelines:
        raise SystemExit('5.75 current release memory mismatch')
    if VERIFIED_BASELINE not in guidelines:
        raise SystemExit('5.75 verified real-device baseline mismatch')
    core = CORE.read_text(encoding='utf-8')
    latest = (ROOT / 'latest.js').read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.75 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.75 Manager product version not synchronized')
    for marker in ['normalizeRequestProvenanceMetadata', 'requestProvenance:normalizeRequestProvenanceMetadata', 'Runtime Weight Audit']:
        if marker not in latest:
            raise SystemExit(f'5.75 built consolidation marker missing: {marker}')
    validate_consolidation_source()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.75 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.75 baseline Engine artifact diverged from 5.74')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.75 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.75 baseline contracts are not 1/1')

consolidate_provenance_owner()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.74', '//@version 3.0.0-alpha.5.75', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.74';", "const VERSION = '3.0.0-alpha.5.75';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.74';", "const PRODUCT_VERSION = '3.0.0-alpha.5.75';", 'manager Product version')
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(ROOT / 'latest.js'))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · provenance analytics wrapper consolidated 28→27')
