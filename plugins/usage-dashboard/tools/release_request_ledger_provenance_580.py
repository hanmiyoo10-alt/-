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
LEDGER = SRC / '14-request-ledger.part.js'
PROVENANCE = SRC / '15-request-provenance.part.js'
PARTS = SRC / 'parts.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.79'
TARGET_VERSION = '3.0.0-alpha.5.80'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Diagnostics Workspace Composition Ownership Consolidation'
TARGET_RELEASE_TITLE = 'Request Ledger Provenance Ownership Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.78 — Runtime Weight Audit Ownership Consolidation`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.79 — Diagnostics Workspace Composition Ownership Consolidation`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'

SCOPE_HELPERS = '''
  function requestAccountScopeValue(value) {
    const text = String(value || '').trim().toLowerCase();
    return ['devpass','credits','unknown'].includes(text) ? text : 'unknown';
  }

  function requestScopeFidelityValue(value, scope = 'unknown') {
    const text = String(value || '').trim().toLowerCase();
    const normalizedScope = requestAccountScopeValue(scope);
    if (normalizedScope === 'devpass' && text === 'explicit-project') return text;
    if (normalizedScope === 'credits' && text === 'explicit-org-billing') return text;
    return 'unknown';
  }
'''

OLD_LEDGER_KEY = '''
  function requestLedgerKey(row) {
    return [
      Number(row?.timestamp || 0),
      String(row?.requestNumber || ''),
      String(row?.provider || 'Unknown'),
      String(row?.model || 'Unknown'),
      num(row?.cost) ? Number(row.cost) : '',
      num(row?.totalTokens) ? Number(row.totalTokens) : '',
      row?.success === false ? 'error' : 'success',
      String(row?.errorCode || ''),
      String(row?.errorType || '')
    ].join('|');
  }
'''

NEW_LEDGER_KEY = '''
  function requestLedgerKey(row) {
    const requestNumber = String(row?.requestNumber || '').trim();
    if (requestNumber) return `request:${requestNumber}`;
    return [
      Number(row?.timestamp || 0),
      String(row?.requestNumber || ''),
      String(row?.provider || 'Unknown'),
      String(row?.model || 'Unknown'),
      num(row?.cost) ? Number(row.cost) : '',
      num(row?.totalTokens) ? Number(row.totalTokens) : '',
      row?.success === false ? 'error' : 'success',
      String(row?.errorCode || ''),
      String(row?.errorType || '')
    ].join('|');
  }
'''

OLD_SCOPE_ROWS = '''
  function requestLedgerRowsForScope(scopeKey) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const key = ['all','devpass','credits'].includes(String(scopeKey)) ? String(scopeKey) : 'all';
    return (Array.isArray(state.requestLedger) ? state.requestLedger : [])
      .filter(row => row && num(row.timestamp) && Number(row.timestamp) >= cutoff)
      .filter(row => key === 'all' || (Array.isArray(row.scopes) && row.scopes.includes(key)))
      .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }
'''

NEW_SCOPE_ROWS = '''
  function requestLedgerRowsForScope(scopeKey) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const key = ['all','devpass','credits'].includes(String(scopeKey)) ? String(scopeKey) : 'all';
    const rows = (Array.isArray(state.requestLedger) ? state.requestLedger : [])
      .filter(row => row && num(row.timestamp) && Number(row.timestamp) >= cutoff)
      .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    if (key === 'all') return rows;
    return rows.filter((row) => requestAccountScopeValue(row?.requestAccountScope) === key);
  }
'''

LEDGER_KEY_WRAPPER = '''
  const requestLedgerKeyBeforeProvenance = requestLedgerKey;
  requestLedgerKey = function requestLedgerKeyWithProvenance(row) {
    const requestNumber = String(row?.requestNumber || '').trim();
    return requestNumber ? `request:${requestNumber}` : requestLedgerKeyBeforeProvenance(row);
  };
'''

NORMALIZE_WRAPPER = '''
  const normalizeRecentRequestRowsBeforeProvenance = normalizeRecentRequestRows;
  normalizeRecentRequestRows = function normalizeRecentRequestRowsWithProvenance(rows, limit = 12) {
    const normalized = normalizeRecentRequestRowsBeforeProvenance(rows, limit);
    const sourceByRequest = new Map();
    for (const row of (Array.isArray(rows) ? rows : [])) {
      if (!row || typeof row !== 'object') continue;
      const requestNumberRaw = recentRequestValue(row, ['id','requestId','request_id','sequence','seq','requestNumber','request_number','number'], null);
      const requestNumber = requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '';
      if (requestNumber) sourceByRequest.set(requestNumber, row);
    }
    return normalized.map((row) => {
      const source = sourceByRequest.get(String(row?.requestNumber || '')) || null;
      const scope = requestAccountScopeValue(recentRequestValue(source || {}, ['requestAccountScope','request_account_scope'], 'unknown'));
      return {
        ...row,
        requestAccountScope:scope,
        requestScopeFidelity:requestScopeFidelityValue(recentRequestValue(source || {}, ['requestScopeFidelity','request_scope_fidelity'], 'unknown'), scope),
        requestScopeConflict:source?.requestScopeConflict === true,
      };
    });
  };
'''

ROWS_WRAPPER = '''
  const requestLedgerRowsForScopeBeforeProvenance = requestLedgerRowsForScope;
  requestLedgerRowsForScope = function requestLedgerRowsForScopeWithProvenance(scopeKey) {
    const key = ['all','devpass','credits'].includes(String(scopeKey)) ? String(scopeKey) : 'all';
    const rows = requestLedgerRowsForScopeBeforeProvenance('all');
    if (key === 'all') return rows;
    return rows.filter((row) => requestAccountScopeValue(row?.requestAccountScope) === key);
  };
'''

OLD_PART_MARKER = "  {file:'15-request-provenance.part.js', marker:'\\n  function requestAccountScopeValue(value) {', label:'request account provenance'},"
NEW_PART_MARKER = "  {file:'15-request-provenance.part.js', marker:'\\n  function requestAccountScopeLabel(value) {', label:'request account provenance'},"


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


def consolidate_request_ledger_provenance() -> None:
    ledger = LEDGER.read_text(encoding='utf-8')
    if 'function requestAccountScopeValue(value)' not in ledger:
        marker = '\n  function normalizeRecentRequestRows(rows, limit = 12) {'
        if ledger.count(marker) != 1:
            raise SystemExit(f'5.80 module-14 scope helper insertion mismatch: {ledger.count(marker)}')
        ledger = ledger.replace(marker, SCOPE_HELPERS + marker, 1)

    request_number_line = "      const requestNumber = requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '';\n"
    provenance_lines = (
        "      const requestAccountScope = requestNumber ? requestAccountScopeValue(recentRequestValue(row, ['requestAccountScope','request_account_scope'], 'unknown')) : 'unknown';\n"
        "      const requestScopeFidelity = requestNumber ? requestScopeFidelityValue(recentRequestValue(row, ['requestScopeFidelity','request_scope_fidelity'], 'unknown'), requestAccountScope) : 'unknown';\n"
        "      const requestScopeConflict = requestNumber ? row?.requestScopeConflict === true : false;\n"
    )
    if provenance_lines not in ledger:
        if ledger.count(request_number_line) != 1:
            raise SystemExit(f'5.80 request provenance gate insertion mismatch: {ledger.count(request_number_line)}')
        ledger = ledger.replace(request_number_line, request_number_line + provenance_lines, 1)

    return_marker = '        requestNumber,\n        requestStatus:status,\n'
    direct_fields = '        requestNumber,\n        requestAccountScope,\n        requestScopeFidelity,\n        requestScopeConflict,\n        requestStatus:status,\n'
    if direct_fields not in ledger:
        if ledger.count(return_marker) != 1:
            raise SystemExit(f'5.80 normalized-row provenance return mismatch: {ledger.count(return_marker)}')
        ledger = ledger.replace(return_marker, direct_fields, 1)

    if OLD_LEDGER_KEY in ledger:
        ledger = ledger.replace(OLD_LEDGER_KEY, NEW_LEDGER_KEY, 1)
    elif NEW_LEDGER_KEY not in ledger:
        raise SystemExit('5.80 requestLedgerKey ownership mismatch')

    if OLD_SCOPE_ROWS in ledger:
        ledger = ledger.replace(OLD_SCOPE_ROWS, NEW_SCOPE_ROWS, 1)
    elif NEW_SCOPE_ROWS not in ledger:
        raise SystemExit('5.80 requestLedgerRowsForScope ownership mismatch')
    LEDGER.write_text(ledger, encoding='utf-8')

    provenance = PROVENANCE.read_text(encoding='utf-8')
    for block, label in [
        (SCOPE_HELPERS, 'scope helpers'),
        (LEDGER_KEY_WRAPPER, 'ledger-key wrapper'),
        (NORMALIZE_WRAPPER, 'normalize wrapper'),
        (ROWS_WRAPPER, 'scope-row wrapper'),
    ]:
        if block in provenance:
            provenance = provenance.replace(block, '', 1)
        elif label == 'scope helpers' and 'function requestAccountScopeValue(value)' in provenance:
            raise SystemExit('5.80 module-15 scope helper shape changed unexpectedly')
    PROVENANCE.write_text(provenance, encoding='utf-8')

    parts = PARTS.read_text(encoding='utf-8')
    if OLD_PART_MARKER in parts:
        parts = parts.replace(OLD_PART_MARKER, NEW_PART_MARKER, 1)
        PARTS.write_text(parts, encoding='utf-8')
    elif NEW_PART_MARKER not in parts:
        raise SystemExit('5.80 module-15 PARTS boundary marker mismatch')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        if text.count(BASE_RELEASE_MEMORY) != 1:
            raise SystemExit(f'5.80 release memory sync mismatch: {text.count(BASE_RELEASE_MEMORY)}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if TARGET_VERIFIED_BASELINE not in text:
        if text.count(BASE_VERIFIED_BASELINE) != 1:
            raise SystemExit(f'5.80 verified baseline sync mismatch: {text.count(BASE_VERIFIED_BASELINE)}')
        text = text.replace(BASE_VERIFIED_BASELINE, TARGET_VERIFIED_BASELINE, 1)
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_source_ownership() -> None:
    ledger = LEDGER.read_text(encoding='utf-8')
    provenance = PROVENANCE.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')

    for marker in ['function requestAccountScopeValue(value)', 'function requestScopeFidelityValue(value, scope = \'unknown\')']:
        if ledger.count(marker) != 1:
            raise SystemExit(f'5.80 module-14 direct provenance helper ownership mismatch: {marker}')
    for retired in [
        'requestLedgerKeyBeforeProvenance',
        'normalizeRecentRequestRowsBeforeProvenance',
        'requestLedgerRowsForScopeBeforeProvenance',
        'requestLedgerKeyWithProvenance',
        'normalizeRecentRequestRowsWithProvenance',
        'requestLedgerRowsForScopeWithProvenance',
    ]:
        if retired in provenance:
            raise SystemExit(f'5.80 module-15 ledger compatibility wrapper remains: {retired}')
    for reassignment in [r'\brequestLedgerKey\s*=\s*function\b', r'\bnormalizeRecentRequestRows\s*=\s*function\b', r'\brequestLedgerRowsForScope\s*=\s*function\b']:
        if re.search(reassignment, provenance):
            raise SystemExit(f'5.80 module-15 ledger reassignment remains: {reassignment}')
    for retained in ['function requestAccountScopeLabel(value)', 'function requestAccountScopeStats(rows)', 'requestServiceTierTextBeforeProvenance', 'requestServiceTierTextWithProvenance']:
        if retained not in provenance:
            raise SystemExit(f'5.80 module-15 retained presentation owner missing: {retained}')

    normalize_start = ledger.index('function normalizeRecentRequestRows(rows, limit = 12)')
    normalize_end = ledger.index('\n\n  function requestOutcomeCategory', normalize_start)
    normalize = ledger[normalize_start:normalize_end]
    for marker in [
        "const requestAccountScope = requestNumber ? requestAccountScopeValue(",
        "const requestScopeFidelity = requestNumber ? requestScopeFidelityValue(",
        "const requestScopeConflict = requestNumber ? row?.requestScopeConflict === true : false;",
        'requestAccountScope,',
        'requestScopeFidelity,',
        'requestScopeConflict,',
    ]:
        if marker not in normalize:
            raise SystemExit(f'5.80 direct normalized provenance marker missing: {marker}')
    if "sourceByRequest" in normalize or '.map((row)' in normalize:
        raise SystemExit('5.80 second-pass provenance remap must be retired')

    key_start = ledger.index('function requestLedgerKey(row)')
    key_end = ledger.index('\n\n  function collectRecentRequestLedger', key_start)
    key = ledger[key_start:key_end]
    if "if (requestNumber) return `request:${requestNumber}`;" not in key:
        raise SystemExit('5.80 exact request-number ledger identity missing')
    for forbidden in ['requestAccountScope', 'requestScopeFidelity', 'requestScopeConflict', 'projectId', 'organizationId']:
        if forbidden in key:
            raise SystemExit(f'5.80 dedupe identity unexpectedly includes {forbidden}')

    rows_start = ledger.index('function requestLedgerRowsForScope(scopeKey)')
    rows_end = ledger.index('\n\n  function requestHourKey', rows_start)
    rows = ledger[rows_start:rows_end]
    if "requestAccountScopeValue(row?.requestAccountScope) === key" not in rows:
        raise SystemExit('5.80 ledger scope filtering must use provenance')
    if 'row.scopes.includes(key)' in rows:
        raise SystemExit('5.80 stale scopes membership must not own DevPass/Credits filtering')
    if '.slice(0, 2000)' not in ledger or 'Date.now() - 24 * 60 * 60 * 1000' not in rows:
        raise SystemExit('5.80 Request Ledger bound/window changed')
    if 'const current = byKey.get(key) || null;' not in ledger:
        raise SystemExit('5.80 same-request enrichment owner missing')

    for public_source in [ledger, provenance]:
        if re.search(r'requestProjectId|requestOrganizationId|project_id|organization_id', public_source):
            raise SystemExit('5.80 raw project/org identity leaked into plugin source')

    if parts.count("{file:") != 24:
        raise SystemExit(f'5.80 source module count must remain 24, got {parts.count("{file:")}')
    order = [parts.find(f"file:'{name}'") for name in [
        '12-service-tier.part.js', '14-request-ledger.part.js', '15-request-provenance.part.js', '16-usage-analytics.part.js'
    ]]
    if not all(index >= 0 for index in order) or order != sorted(order):
        raise SystemExit('5.80 module order must remain 12 -> 14 -> 15 -> 16')
    if NEW_PART_MARKER not in parts:
        raise SystemExit('5.80 module-15 surviving PARTS marker missing')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.80 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.80 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.80 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.80 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.80 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.80 Engine artifact must remain byte-identical to 5.79')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.80 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.80 bootstrap hash mismatch')
    core = CORE.read_text(encoding='utf-8')
    latest = LATEST.read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.80 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.80 Manager product version not synchronized')
    for retired in [
        'requestLedgerKeyBeforeProvenance',
        'normalizeRecentRequestRowsBeforeProvenance',
        'requestLedgerRowsForScopeBeforeProvenance',
    ]:
        if retired in latest:
            raise SystemExit(f'5.80 built plugin still contains retired ledger provenance wrapper: {retired}')
    if 'requestServiceTierTextBeforeProvenance' not in latest:
        raise SystemExit('5.80 service-tier presentation wrapper must remain')
    validate_source_ownership()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.80 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.80 baseline Engine artifact diverged from 5.79')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.80 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.80 baseline contracts are not 1/1')

old_plugin_bytes = LATEST.stat().st_size
consolidate_request_ledger_provenance()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.79', '//@version 3.0.0-alpha.5.80', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.79';", "const VERSION = '3.0.0-alpha.5.80';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.79';", "const PRODUCT_VERSION = '3.0.0-alpha.5.80';", 'manager Product version')
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
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · request ledger provenance ownership consolidated · plugin bytes {old_plugin_bytes}->{new_plugin_bytes} ({new_plugin_bytes-old_plugin_bytes:+d})')
