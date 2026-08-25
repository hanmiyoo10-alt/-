from pathlib import Path
import hashlib
import json
import subprocess

# UD_HISTORICAL_VERSION_LOCK: 5.75/5.73 literals below are deterministic prior-release baselines.

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
WRAPPER = SRC / '42-request-provenance-diagnostics.part.js'
PARTS = SRC / 'parts.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.75'
TARGET_VERSION = '3.0.0-alpha.5.76'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Provenance Analytics Wrapper Consolidation'
TARGET_RELEASE_TITLE = 'Request Provenance Diagnostics Ownership Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.73 — Runtime Weight & Lifecycle Audit`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.75 — Provenance Analytics Wrapper Consolidation`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'

PROVENANCE_HELPER = '''  function requestProvenanceDiagnosticMetadata() {
    const source = state.data?.usageScopes?.scopes?.all?.requestProvenance || null;
    if (source && typeof source === 'object') return source;
    const stats = requestAccountScopeStats(requestLedgerRowsForScope('all'));
    return {
      captureMode:'unknown',
      rows:stats.rows,
      fallbackCount:0,
      devpass:stats.devpass,
      credits:stats.credits,
      unknown:stats.unknown,
      conflict:stats.conflict,
      modelInference:0,
      authority:'unknown',
    };
  }

'''

BASE_SCOPE_LINES = '''    const diagDevpassRows = requestLedgerRowsForScope('devpass');
    const diagTierFidelity = requestServiceTierStats(diagDevpassRows);
    const diagOutcome = requestOutcomeStats(diagDevpassRows);'''

TARGET_SCOPE_LINES = '''    const diagTierFidelity = requestServiceTierStats(diagLedgerRows);
    const diagOutcome = requestOutcomeStats(diagLedgerRows);
    const diagRequestProvenance = requestProvenanceDiagnosticMetadata();
    const diagRequestProvenanceRows = Math.max(0, Number(diagRequestProvenance?.rows || 0));
    const diagRequestProvenanceMode = ['account-wide','project-fallback'].includes(String(diagRequestProvenance?.captureMode))
      ? String(diagRequestProvenance.captureMode)
      : 'unknown';'''

OUTCOME_LINE = '      `Request outcome taxonomy: success ${diagOutcome.success} · error ${diagOutcome.error} · cancelled ${diagOutcome.cancelled} · unknown ${diagOutcome.unknown} · rows ${diagOutcome.rows}`,'
TARGET_OUTCOME_BLOCK = OUTCOME_LINE + '''
      `Account request capture: ${diagRequestProvenanceMode} · rows ${diagRequestProvenanceRows} · fallback ${Math.max(0, Number(diagRequestProvenance?.fallbackCount || 0))}`,
      `Request account scope fidelity: DevPass ${Math.max(0, Number(diagRequestProvenance?.devpass || 0))}/${diagRequestProvenanceRows} · Credits ${Math.max(0, Number(diagRequestProvenance?.credits || 0))}/${diagRequestProvenanceRows} · Unknown ${Math.max(0, Number(diagRequestProvenance?.unknown || 0))}/${diagRequestProvenanceRows} · conflict ${Math.max(0, Number(diagRequestProvenance?.conflict || 0))}`,
      `Scope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0`,'''

PART_ENTRY = "  {file:'42-request-provenance-diagnostics.part.js', marker:'\\n  function requestProvenanceDiagnosticMetadata() {', label:'request provenance diagnostics'},\n"


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


def consolidate_diagnostics_owner() -> None:
    text = DIAGNOSTICS.read_text(encoding='utf-8')
    if PROVENANCE_HELPER not in text:
        marker = '  function diagText() {'
        if text.count(marker) != 1:
            raise SystemExit('5.76 diagText insertion point mismatch')
        text = text.replace(marker, PROVENANCE_HELPER + marker, 1)

    if TARGET_SCOPE_LINES not in text:
        if text.count(BASE_SCOPE_LINES) != 1:
            raise SystemExit('5.76 diagnostics scope authority mismatch')
        text = text.replace(BASE_SCOPE_LINES, TARGET_SCOPE_LINES, 1)

    if 'Account request capture: ${diagRequestProvenanceMode}' not in text:
        if text.count(OUTCOME_LINE) != 1:
            raise SystemExit('5.76 diagnostics outcome insertion point mismatch')
        text = text.replace(OUTCOME_LINE, TARGET_OUTCOME_BLOCK, 1)

    for forbidden in ['diagTextBeforeRequestProvenance', 'diagTextWithRequestProvenance', "String(base || '').split('\\n')"]:
        if forbidden in text:
            raise SystemExit(f'5.76 diagnostics wrapper marker leaked into module 40: {forbidden}')
    DIAGNOSTICS.write_text(text, encoding='utf-8')

    if WRAPPER.exists():
        wrapper = WRAPPER.read_text(encoding='utf-8')
        required = [
            'function requestProvenanceDiagnosticMetadata()',
            'const diagTextBeforeRequestProvenance = diagText;',
            'diagText = function diagTextWithRequestProvenance()',
        ]
        for marker in required:
            if marker not in wrapper:
                raise SystemExit(f'5.76 module 42 unexpected content: missing {marker}')
        WRAPPER.unlink()

    parts = PARTS.read_text(encoding='utf-8')
    if PART_ENTRY in parts:
        parts = parts.replace(PART_ENTRY, '', 1)
        PARTS.write_text(parts, encoding='utf-8')
    if '42-request-provenance-diagnostics.part.js' in PARTS.read_text(encoding='utf-8'):
        raise SystemExit('5.76 module 42 remains registered')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        count = text.count(BASE_RELEASE_MEMORY)
        if count != 1:
            raise SystemExit(f'5.76 release memory sync: expected exactly one 5.75 memory line, found {count}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if TARGET_VERIFIED_BASELINE not in text:
        count = text.count(BASE_VERIFIED_BASELINE)
        if count != 1:
            raise SystemExit(f'5.76 verified baseline sync: expected exactly one prior baseline line, found {count}')
        text = text.replace(BASE_VERIFIED_BASELINE, TARGET_VERIFIED_BASELINE, 1)
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_consolidation_source() -> None:
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')
    if WRAPPER.exists():
        raise SystemExit('5.76 module 42 must be deleted')
    if diagnostics.count('function requestProvenanceDiagnosticMetadata()') != 1:
        raise SystemExit('5.76 module 40 must directly own exactly one provenance diagnostic helper')
    if 'const diagTierFidelity = requestServiceTierStats(diagLedgerRows);' not in diagnostics:
        raise SystemExit('5.76 Service Tier diagnostics must use current-scope ledger rows directly')
    if 'const diagOutcome = requestOutcomeStats(diagLedgerRows);' not in diagnostics:
        raise SystemExit('5.76 Request Outcome diagnostics must use current-scope ledger rows directly')
    for marker in [
        'Account request capture: ${diagRequestProvenanceMode}',
        'Request account scope fidelity: DevPass',
        'Scope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0',
    ]:
        if marker not in diagnostics:
            raise SystemExit(f'5.76 direct diagnostics marker missing: {marker}')
    for forbidden in ['diagTextBeforeRequestProvenance', 'diagTextWithRequestProvenance']:
        if forbidden in diagnostics:
            raise SystemExit(f'5.76 wrapper marker remains: {forbidden}')
    i40 = parts.find("file:'40-diagnostics.part.js'")
    i50 = parts.find("file:'50-dashboard-context.part.js'")
    if not (0 <= i40 < i50):
        raise SystemExit('5.76 diagnostics boundary must be 40 -> 50')
    if parts.count("{file:") != 26:
        raise SystemExit(f'5.76 production module count must be 26, got {parts.count("{file:")}')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.76 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.76 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.76 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.76 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.76 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.76 Engine artifact must remain byte-identical to 5.75')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.76 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.76 bootstrap hash mismatch')
    guidelines = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in guidelines:
        raise SystemExit('5.76 current release memory mismatch')
    if TARGET_VERIFIED_BASELINE not in guidelines:
        raise SystemExit('5.76 verified real-device baseline mismatch')
    core = CORE.read_text(encoding='utf-8')
    latest = (ROOT / 'latest.js').read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.76 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.76 Manager product version not synchronized')
    for marker in [
        'requestProvenanceDiagnosticMetadata',
        'Account request capture:',
        'Request account scope fidelity:',
        'Scope authority: DevPass project exact',
        'Runtime Weight Audit',
    ]:
        if marker not in latest:
            raise SystemExit(f'5.76 built consolidation marker missing: {marker}')
    validate_consolidation_source()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.76 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.76 baseline Engine artifact diverged from 5.75')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.76 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.76 baseline contracts are not 1/1')

consolidate_diagnostics_owner()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.75', '//@version 3.0.0-alpha.5.76', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.75';", "const VERSION = '3.0.0-alpha.5.76';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.75';", "const PRODUCT_VERSION = '3.0.0-alpha.5.76';", 'manager Product version')
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
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · provenance diagnostics wrapper consolidated 27→26')
