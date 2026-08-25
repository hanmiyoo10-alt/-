from pathlib import Path
import hashlib
import json
import subprocess

# UD_HISTORICAL_VERSION_LOCK: 5.77/5.76 literals below are deterministic prior-release baselines.

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
AUDIT = SRC / '64-runtime-weight-audit.part.js'
PARTS = SRC / 'parts.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
P37 = ROOT / 'tests/p37-runtime-weight-lifecycle-audit.cjs'
P38 = ROOT / 'tests/p38-diagnostics-mode-handler-ownership.cjs'
P41 = ROOT / 'tests/p41-diagnostics-instant-mode-patch-layer-consolidation.cjs'
P42 = ROOT / 'tests/p42-runtime-weight-audit-patch-layer-consolidation.cjs'

BASE_VERSION = '3.0.0-alpha.5.77'
TARGET_VERSION = '3.0.0-alpha.5.78'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Diagnostics Instant Mode Patch-Layer Consolidation'
TARGET_RELEASE_TITLE = 'Runtime Weight Audit Ownership Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.76 — Request Provenance Diagnostics Ownership Consolidation`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.77 — Diagnostics Instant Mode Patch-Layer Consolidation`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'

AUDIT_HELPERS = '''  const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;

  function runtimeWeightAuditKnown(value) {
    return value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function runtimeWeightAuditMs(value) {
    const known = runtimeWeightAuditKnown(value);
    return known === null ? 'UNKNOWN' : `${roundPerfMs(known)}ms`;
  }

  function runtimeWeightAuditTimers() {
    return [
      ['refresh', refreshTimer],
      ['reset-sync', resetSyncTimer],
      ['refresh-scheduler', refreshSchedulerTimer],
      ['panel-render', panelRenderTimer],
      ['ui-stall-probe', uiStallProbeTimer],
      ['resume-probe', resumeProbeTimer],
      ['resume-measure', resumeMeasureTimer],
      ['resume-refresh', resumeRefreshTimer],
    ];
  }

  function runtimeWeightAuditModel() {
    const bridgeDiag = bridgeStabilitySnapshot();
    const snapshotPerformance = bridgeDiag.snapshotPerformance && typeof bridgeDiag.snapshotPerformance === 'object'
      ? bridgeDiag.snapshotPerformance
      : null;
    const secondary = snapshotPerformance?.secondaryRefresh && typeof snapshotPerformance.secondaryRefresh === 'object'
      ? snapshotPerformance.secondaryRefresh
      : null;
    const phases = performanceRuntime.lastRefreshPhases && typeof performanceRuntime.lastRefreshPhases === 'object'
      ? performanceRuntime.lastRefreshPhases
      : null;
    const timers = runtimeWeightAuditTimers();
    const activeTimers = timers.filter(([, handle]) => handle !== null).map(([name]) => name);
    const idleHandles = [refreshSchedulerIdleHandle, panelIdleHandle].filter(handle => handle !== null).length;
    const ledgerRows = Array.isArray(state.requestLedger) ? state.requestLedger.length : 0;
    const responsiveStyleKeys = widgetRenderCache?.responsiveStyles && typeof widgetRenderCache.responsiveStyles === 'object'
      ? Object.keys(widgetRenderCache.responsiveStyles).length
      : 0;
    const widgetCacheFields = ['html','width','display','layout'].filter(key => widgetRenderCache?.[key] !== null && widgetRenderCache?.[key] !== undefined).length;
    return {
      ledgerRows,
      ledgerLimit:RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT,
      stateKeys:state && typeof state === 'object' ? Object.keys(state).length : null,
      activeTimers,
      timerSlots:timers.length,
      idleHandles,
      observerActive:resumeLongTaskObserver !== null,
      remoteListeners:Array.isArray(remoteListeners) ? remoteListeners.length : null,
      widgetRemoteListeners:Array.isArray(widgetRemoteListeners) ? widgetRemoteListeners.length : null,
      domListeners:Array.isArray(domListeners) ? domListeners.length : null,
      refreshInFlight:Boolean(refreshInFlight),
      resumePending:Boolean(performanceRuntime.resumePending),
      resumeMeasurePending:Boolean(performanceRuntime.resumeMeasurePending),
      schedulerQueued:Number(performanceRuntime.schedulerQueued || 0),
      schedulerMerged:Number(performanceRuntime.schedulerMerged || 0),
      schedulerExecuted:Number(performanceRuntime.schedulerExecuted || 0),
      schedulerDeferred:Number(performanceRuntime.schedulerDeferredForInteraction || 0),
      bridgeCacheEntries:runtimeWeightAuditKnown(bridgeDiag.cacheEntries),
      bridgeCacheInFlight:runtimeWeightAuditKnown(bridgeDiag.inFlight),
      cliActive:runtimeWeightAuditKnown(bridgeDiag.cliActive),
      cliQueued:runtimeWeightAuditKnown(bridgeDiag.cliQueued),
      secondaryQueued:runtimeWeightAuditKnown(secondary?.queued),
      secondaryRunning:runtimeWeightAuditKnown(secondary?.running),
      widgetCacheFields,
      responsiveStyleKeys,
      normalizeMs:runtimeWeightAuditKnown(phases?.['normalize-ledger']),
      persistMs:runtimeWeightAuditKnown(phases?.persist),
      widgetRenderPhaseMs:runtimeWeightAuditKnown(phases?.['widget-render']),
      renderMs:runtimeWeightAuditKnown(performanceRuntime.lastRenderMs),
      panelRenderMs:runtimeWeightAuditKnown(performanceRuntime.lastPanelRenderMs),
      persistWrites:Number(powerRuntime.persistWrites || 0),
      staleAsyncDrops:Number(staleAsyncDrops || 0),
    };
  }

  function runtimeWeightAuditValue(value) {
    return value === null || value === undefined ? 'UNKNOWN' : String(value);
  }

  function runtimeWeightAuditLines(model = runtimeWeightAuditModel()) {
    const timerNames = model.activeTimers.length ? model.activeTimers.join(',') : 'none';
    return [
      'Runtime Weight Audit: measurement-only · network 0 · CLI 0 · polling 0 · heap bytes UNKNOWN · pruning 0',
      `Retained state: Request Ledger ${model.ledgerRows}/${model.ledgerLimit} · state keys ${runtimeWeightAuditValue(model.stateKeys)} · widget cache fields ${model.widgetCacheFields}/4 · responsive style keys ${model.responsiveStyleKeys}`,
      `Lifecycle ownership: timers ${model.activeTimers.length}/${model.timerSlots} [${timerNames}] · idle handles ${model.idleHandles}/2 · long-task observer ${model.observerActive ? 'active' : 'idle'}`,
      `Listener ownership: remote ${runtimeWeightAuditValue(model.remoteListeners)} · widget remote ${runtimeWeightAuditValue(model.widgetRemoteListeners)} · DOM ${runtimeWeightAuditValue(model.domListeners)}`,
      `In-flight ownership: refresh ${model.refreshInFlight ? 'active' : 'idle'} · resume ${model.resumePending ? 'pending' : 'idle'} · resume measure ${model.resumeMeasurePending ? 'pending' : 'idle'} · stale async drops ${model.staleAsyncDrops}`,
      `Scheduler counters: queued ${model.schedulerQueued} · merged ${model.schedulerMerged} · executed ${model.schedulerExecuted} · interaction deferred ${model.schedulerDeferred}`,
      `Bridge retained work: cache entries ${runtimeWeightAuditValue(model.bridgeCacheEntries)} · cache in-flight ${runtimeWeightAuditValue(model.bridgeCacheInFlight)} · CLI active ${runtimeWeightAuditValue(model.cliActive)} · CLI queued ${runtimeWeightAuditValue(model.cliQueued)} · secondary queued ${runtimeWeightAuditValue(model.secondaryQueued)} · running ${runtimeWeightAuditValue(model.secondaryRunning)}`,
      `Local cost: normalize-ledger ${runtimeWeightAuditMs(model.normalizeMs)} · persist ${runtimeWeightAuditMs(model.persistMs)} · widget-render phase ${runtimeWeightAuditMs(model.widgetRenderPhaseMs)} · last render ${runtimeWeightAuditMs(model.renderMs)} · panel ${runtimeWeightAuditMs(model.panelRenderMs)} · persist writes ${model.persistWrites}`,
      'Slimming decision: S0 evidence only · removal classification pending repository/real-device evidence',
    ];
  }

'''

DETAIL_OLD = '''  function diagnosticsWorkspaceDetailedSections() {
    const groups = new Map(DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => [section.key, []]));
    for (const line of diagText().split('\\n')) groups.get(diagnosticsWorkspaceSectionKey(line)).push(line);
    return DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => ({...section,lines:groups.get(section.key)}));
  }
'''

DETAIL_NEW = '''  function diagnosticsWorkspaceDetailedSections() {
    const groups = new Map(DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => [section.key, []]));
    for (const line of diagText().split('\\n')) groups.get(diagnosticsWorkspaceSectionKey(line)).push(line);
    const sections = DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => ({...section,lines:groups.get(section.key)}));
    return [...sections, {key:'runtime-weight', title:'Runtime Weight Audit', lines:runtimeWeightAuditLines()}];
  }
'''

PART_ENTRY = "  {file:'64-runtime-weight-audit.part.js', marker:'\\n  const diagnosticsRuntimeWeightLegacyDetailedSections = diagnosticsWorkspaceDetailedSections;', label:'diagnostics runtime weight audit'},\n"


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


def consolidate_runtime_weight_owner() -> None:
    text = WORKSPACE.read_text(encoding='utf-8')
    if 'const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;' not in text:
        if text.count(DETAIL_OLD) != 1:
            raise SystemExit('5.78 Detailed insertion point mismatch')
        text = text.replace(DETAIL_OLD, AUDIT_HELPERS + DETAIL_NEW, 1)
    elif DETAIL_NEW not in text:
        if text.count(DETAIL_OLD) != 1:
            raise SystemExit('5.78 direct Detailed owner replacement mismatch')
        text = text.replace(DETAIL_OLD, DETAIL_NEW, 1)
    WORKSPACE.write_text(text, encoding='utf-8')

    if AUDIT.exists():
        audit = AUDIT.read_text(encoding='utf-8')
        for marker in [
            'const diagnosticsRuntimeWeightLegacyDetailedSections = diagnosticsWorkspaceDetailedSections;',
            'const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;',
            'function runtimeWeightAuditModel()',
            'function runtimeWeightAuditLines(model = runtimeWeightAuditModel())',
            'diagnosticsWorkspaceDetailedSections = function runtimeWeightAuditDetailedSections()',
        ]:
            if marker not in audit:
                raise SystemExit(f'5.78 module 64 unexpected content: missing {marker}')
        AUDIT.unlink()

    parts = PARTS.read_text(encoding='utf-8')
    if PART_ENTRY in parts:
        parts = parts.replace(PART_ENTRY, '', 1)
        PARTS.write_text(parts, encoding='utf-8')
    if '64-runtime-weight-audit.part.js' in PARTS.read_text(encoding='utf-8'):
        raise SystemExit('5.78 module 64 remains registered')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        count = text.count(BASE_RELEASE_MEMORY)
        if count != 1:
            raise SystemExit(f'5.78 release memory sync: expected exactly one 5.77 memory line, found {count}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if TARGET_VERIFIED_BASELINE not in text:
        count = text.count(BASE_VERIFIED_BASELINE)
        if count != 1:
            raise SystemExit(f'5.78 verified baseline sync: expected stale 5.76 baseline, found {count}')
        text = text.replace(BASE_VERIFIED_BASELINE, TARGET_VERIFIED_BASELINE, 1)
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_consolidation_source() -> None:
    workspace = WORKSPACE.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')
    if AUDIT.exists():
        raise SystemExit('5.78 module 64 must be deleted')
    if workspace.count('const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;') != 1:
        raise SystemExit('5.78 module 62 must directly own Runtime Weight Audit helpers exactly once')
    if 'diagnosticsRuntimeWeightLegacyDetailedSections' in workspace:
        raise SystemExit('5.78 legacy audit wrapper leaked into workspace')
    if 'diagnosticsWorkspaceDetailedSections = function' in workspace:
        raise SystemExit('5.78 Detailed owner must not be reassigned')
    for marker in [
        'function runtimeWeightAuditKnown(value)',
        'function runtimeWeightAuditMs(value)',
        'function runtimeWeightAuditTimers()',
        'function runtimeWeightAuditModel()',
        'function runtimeWeightAuditValue(value)',
        'function runtimeWeightAuditLines(model = runtimeWeightAuditModel())',
        "title:'Runtime Weight Audit'",
        'lines:runtimeWeightAuditLines()',
        'network 0 · CLI 0 · polling 0 · heap bytes UNKNOWN · pruning 0',
        'RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000',
    ]:
        if marker not in workspace:
            raise SystemExit(f'5.78 direct audit owner marker missing: {marker}')
    i62 = parts.find("file:'62-diagnostics-workspace.part.js'")
    i70 = parts.find("file:'70-widget-render.part.js'")
    if not (0 <= i62 < i70):
        raise SystemExit('5.78 diagnostics boundary must be 62 -> 70')
    if parts.count("{file:") != 24:
        raise SystemExit(f'5.78 production module count must be 24, got {parts.count("{file:")}')
    for test_path, marker in [
        (P37, 'module 62 direct audit owner'),
        (P38, 'module 62 sole instant/audit workspace owner'),
        (P41, 'P41 Diagnostics Instant Mode Patch-Layer Consolidation'),
        (P42, 'P42 Runtime Weight Audit Patch-Layer Consolidation'),
    ]:
        if not test_path.exists() or marker not in test_path.read_text(encoding='utf-8'):
            raise SystemExit(f'5.78 migrated regression missing marker: {test_path}')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.78 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.78 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.78 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.78 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.78 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.78 Engine artifact must remain byte-identical to 5.77')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.78 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.78 bootstrap hash mismatch')
    guidelines = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in guidelines or TARGET_VERIFIED_BASELINE not in guidelines:
        raise SystemExit('5.78 durable release memory mismatch')
    core = CORE.read_text(encoding='utf-8')
    latest = (ROOT / 'latest.js').read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.78 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.78 Manager product version not synchronized')
    for marker in ['setDiagnosticsModeInstant', 'Runtime Weight Audit', 'runtimeWeightAuditLines']:
        if marker not in latest:
            raise SystemExit(f'5.78 built consolidation marker missing: {marker}')
    if 'diagnosticsRuntimeWeightLegacyDetailedSections' in latest:
        raise SystemExit('5.78 built plugin still contains retired module-64 wrapper')
    validate_consolidation_source()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.78 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.78 baseline Engine artifact diverged from 5.77')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.78 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.78 baseline contracts are not 1/1')

consolidate_runtime_weight_owner()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.77', '//@version 3.0.0-alpha.5.78', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.77';", "const VERSION = '3.0.0-alpha.5.78';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.77';", "const PRODUCT_VERSION = '3.0.0-alpha.5.78';", 'manager Product version')
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
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · runtime-weight audit patch layer consolidated 25→24')
