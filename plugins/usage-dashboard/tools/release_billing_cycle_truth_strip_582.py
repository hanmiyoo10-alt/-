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
CORE = SRC / '00-runtime-core.part.js'
ANALYTICS = SRC / '16-usage-analytics.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
DASHBOARD = SRC / '50-dashboard-context.part.js'
ANALYTICS_CONTEXT = SRC / '52-analytics-context.part.js'
ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
ENGINE_SOURCES = RUNTIME_SRC / '40-sources.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.81'
TARGET_VERSION = '3.0.0-alpha.5.82'
BASE_ENGINE = '1.6.22'
TARGET_ENGINE = '1.6.23'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Service-Tier Presentation Ownership Consolidation'
TARGET_RELEASE_TITLE = 'Billing Cycle Truth Strip'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.80 — Request Ledger Provenance Ownership Consolidation`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'
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


def replace_literal_once_or_target(path: Path, old: str, new: str, label: str) -> None:
    replace_once_or_target(path, old, new, label)


def function_slice(text: str, start_marker: str, end_marker: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'missing function boundary: {start_marker}')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'missing function end boundary: {end_marker}')
    return text[start:end]


ENGINE_BILLING_HELPERS = '''
function explicitBillingCycle(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  return text || null;
}

function explicitBillingBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

'''

UI_BILLING_VALUES = '''    const billingPlanText = devpassAccount && String(devpassAccount.plan || '').trim() && String(devpassAccount.plan).toLowerCase() !== 'none'
      ? String(devpassAccount.plan).toUpperCase()
      : '—';
    const billingCycleText = typeof devpassAccount?.cycle === 'string' && devpassAccount.cycle.trim()
      ? devpassAccount.cycle.trim()
      : '—';
    const billingStartText = dashboardDateText(devpassAccount?.billingCycleStart, true);
    const billingEndText = dashboardDateText(devpassAccount?.expiresAt, true);
    const billingEndTimestamp = resetTimestamp(devpassAccount?.expiresAt);
    const billingRemainingText = Number.isFinite(billingEndTimestamp) && billingEndTimestamp > Date.now()
      ? remainingTimeForDashboard(devpassAccount.expiresAt)
      : '—';
    const billingCancelledText = devpassAccount?.cancelled === true ? '취소 예정' : '—';
'''

BILLING_TRUTH_BOX = '''          <div class="usage-detail-box billing-cycle-truth-strip"><div class="recent-head"><h3>Billing Cycle</h3><span>source truth</span></div><div class="minis">
            <div class="mini"><span>Plan</span><b>${esc(billingPlanText)}</b></div>
            <div class="mini"><span>Cycle</span><b>${esc(billingCycleText)}</b></div>
            <div class="mini"><span>기간 시작</span><b>${esc(billingStartText)}</b></div>
            <div class="mini"><span>기간 종료</span><b>${esc(billingEndText)}</b></div>
            <div class="mini"><span>남은 기간</span><b>${esc(billingRemainingText)}</b></div>
            <div class="mini"><span>취소 상태</span><b>${esc(billingCancelledText)}</b></div>
          </div></div>
'''

DIAG_BILLING_LINE = "      `DevPass billing period: plan ${diagAccount && String(diagAccount.plan || '').trim() && String(diagAccount.plan).toLowerCase() !== 'none' ? String(diagAccount.plan) : '—'} · cycle ${typeof diagAccount?.cycle === 'string' && diagAccount.cycle.trim() ? diagAccount.cycle.trim() : '—'} · start ${dashboardDateText(diagAccount?.billingCycleStart, true)} · end ${dashboardDateText(diagAccount?.expiresAt, true)} · cancelled ${typeof diagAccount?.cancelled === 'boolean' ? (diagAccount.cancelled ? 'yes' : 'no') : 'unknown'}`,\n"


def apply_engine_fidelity() -> None:
    replace_once_or_target(
        ENGINE_SOURCES,
        "\nfunction normalizeOrganizations(rawOrgs, rawCredits) {",
        "\n" + ENGINE_BILLING_HELPERS + "function normalizeOrganizations(rawOrgs, rawCredits) {",
        '5.82 Engine billing helper insertion',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "      devPlanCycle: String(pick(row, ['devPlanCycle', 'dev_plan_cycle'], 'monthly') || 'monthly'),",
        "      devPlanCycle: explicitBillingCycle(pick(row, ['devPlanCycle', 'dev_plan_cycle'], null)),",
        '5.82 organization cycle fidelity',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "      devPlanExpiresAt: pick(row, ['devPlanExpiresAt', 'dev_plan_expires_at'], null),\n      devPlanResetPassesLite:",
        "      devPlanExpiresAt: pick(row, ['devPlanExpiresAt', 'dev_plan_expires_at'], null),\n      devPlanCancelled: explicitBillingBoolean(pick(row, ['devPlanCancelled', 'dev_plan_cancelled'], null)),\n      devPlanResetPassesLite:",
        '5.82 organization cancelled fidelity',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "    devPlanCycle: String(pick(raw, ['devPlanCycle', 'dev_plan_cycle'], current.devPlanCycle || 'monthly') || current.devPlanCycle || 'monthly'),",
        "    devPlanCycle: explicitBillingCycle(pick(raw, ['devPlanCycle', 'dev_plan_cycle', 'cycle'], null)) ?? current.devPlanCycle ?? null,",
        '5.82 enriched cycle fidelity',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "    devPlanExpiresAt: pick(raw, [\n      'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',\n      'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'\n    ], current.devPlanExpiresAt),\n    devPlanPremiumWeekStart:",
        "    devPlanExpiresAt: pick(raw, [\n      'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',\n      'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'\n    ], current.devPlanExpiresAt),\n    devPlanCancelled: explicitBillingBoolean(pick(raw, ['devPlanCancelled', 'dev_plan_cancelled', 'cancelled'], null)) ?? current.devPlanCancelled ?? null,\n    devPlanPremiumWeekStart:",
        '5.82 enriched cancelled fidelity',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "  const cycle = String(pick(raw, ['devPlanCycle', 'dev_plan_cycle', 'cycle'], 'monthly') || 'monthly').toLowerCase();",
        "  const cycle = explicitBillingCycle(pick(raw, ['devPlanCycle', 'dev_plan_cycle', 'cycle'], null));",
        '5.82 independent cycle fidelity',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "    cancelled: Boolean(pick(raw, ['devPlanCancelled', 'dev_plan_cancelled', 'cancelled'], false)),",
        "    cancelled: explicitBillingBoolean(pick(raw, ['devPlanCancelled', 'dev_plan_cancelled', 'cancelled'], null)),",
        '5.82 independent cancelled fidelity',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "        cycle: devOrg.devPlanCycle || 'monthly',",
        "        cycle: explicitBillingCycle(devOrg.devPlanCycle),",
        '5.82 fallback cycle fidelity',
    )
    replace_once_or_target(
        ENGINE_SOURCES,
        "        expiresAt: devOrg.devPlanExpiresAt || null,\n        premiumWeekStart:",
        "        expiresAt: devOrg.devPlanExpiresAt || null,\n        cancelled: explicitBillingBoolean(devOrg.devPlanCancelled),\n        premiumWeekStart:",
        '5.82 fallback cancelled fidelity',
    )


def apply_plugin_adapter() -> None:
    replace_once_or_target(
        ANALYTICS,
        "        cycle:ds.cycle === null || ds.cycle === undefined ? '' : String(ds.cycle),",
        "        cycle:typeof ds.cycle === 'string' ? ds.cycle.trim() : '',",
        '5.82 plugin cycle fidelity',
    )
    replace_once_or_target(
        ANALYTICS,
        "        cancelled:ds.cancelled === true,",
        "        cancelled:typeof ds.cancelled === 'boolean' ? ds.cancelled : null,",
        '5.82 plugin cancelled fidelity',
    )


def apply_billing_ui() -> None:
    status_block = '''    const devpassAccountStatus = !devpassAccount
      ? '—'
      : devpassAccount.cancelled
        ? '취소 예정'
        : String(devpassAccount.plan || 'none') !== 'none'
          ? 'ACTIVE'
          : '—';
'''
    replace_once_or_target(
        DASHBOARD,
        status_block + "    const devpassIncludedPassText =",
        status_block + UI_BILLING_VALUES + "    const devpassIncludedPassText =",
        '5.82 billing truth values',
    )
    old_tail = '''            <div class="mini cyan"><span>Regular Credits</span><b>${money(devpassAccount.regularCredits)}</b></div>
          </div></div>
        </div>`'''
    new_tail = '''            <div class="mini cyan"><span>Regular Credits</span><b>${money(devpassAccount.regularCredits)}</b></div>
          </div></div>
''' + BILLING_TRUTH_BOX + '''        </div>`'''
    replace_once_or_target(DASHBOARD, old_tail, new_tail, '5.82 Billing Cycle Truth Strip')
    replace_once_or_target(
        DASHBOARD,
        '<span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : \'—\'}</b>',
        '<span>기간 종료</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : \'—\'}</b>',
        '5.82 DevPass scope period wording',
    )
    replace_once_or_target(
        ANALYTICS_CONTEXT,
        '<span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : \'—\'}</b>',
        '<span>기간 종료</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : \'—\'}</b>',
        '5.82 DevPass analytics period wording',
    )


def apply_billing_diagnostics() -> None:
    anchor = "      `DevPass account tier: service ${diagAccount?.serviceTier || '—'} · routing ${diagAccount?.routingStrategy || '—'} · pending ${diagAccount?.pendingTier || '—'} · personal org ${diagAccount?.hasPersonalOrg === null || diagAccount?.hasPersonalOrg === undefined ? '—' : diagAccount.hasPersonalOrg ? 'yes' : 'no'}`,\n"
    replace_once_or_target(
        DIAGNOSTICS,
        anchor + "      `DevPass account detail:",
        anchor + DIAG_BILLING_LINE + "      `DevPass account detail:",
        '5.82 billing diagnostics',
    )


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        if text.count(BASE_RELEASE_MEMORY) != 1:
            raise SystemExit(f'5.82 release memory sync mismatch: {text.count(BASE_RELEASE_MEMORY)}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if VERIFIED_BASELINE not in text:
        raise SystemExit('5.82 must retain the last verified real-device baseline at 5.80')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.82 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.82 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.82 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.82 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.82 contracts changed from 1/1')
    if bridge.get('sha256') != sha256(ENGINE):
        raise SystemExit('5.82 Engine hash mismatch')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.82 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP) or sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.82 bootstrap must remain byte-identical')

    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    engine_sources = ENGINE_SOURCES.read_text(encoding='utf-8')
    analytics = ANALYTICS.read_text(encoding='utf-8')
    dashboard = DASHBOARD.read_text(encoding='utf-8')
    analytics_context = ANALYTICS_CONTEXT.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    latest = LATEST.read_text(encoding='utf-8')

    for marker in [f'//@version {TARGET_VERSION}', f"const VERSION = '{TARGET_VERSION}';", f"const REQUIRED_BRIDGE_VERSION = '{TARGET_ENGINE}';"]:
        if marker not in core:
            raise SystemExit(f'5.82 plugin core identity missing: {marker}')
    if f"const VERSION = '{TARGET_ENGINE}';" not in engine_core:
        raise SystemExit('5.82 Engine source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in manager_text:
        raise SystemExit('5.82 Manager product identity mismatch')

    independent = function_slice(engine_sources, 'function normalizeIndependentDevPassStatus(payload) {', '\n\nasync function loadDevPassStatus()')
    fallback = function_slice(engine_sources, 'async function loadDevPassStatus() {', '\n\nfunction deepFindNumber')
    if "const cycle = explicitBillingCycle" not in independent or "'monthly'" in independent:
        raise SystemExit('5.82 independent billing cycle must be explicit-or-null without monthly inference')
    if "cancelled: explicitBillingBoolean" not in independent or 'cancelled: Boolean(' in independent:
        raise SystemExit('5.82 independent cancellation must be explicit boolean-or-null')
    if "cycle: explicitBillingCycle(devOrg.devPlanCycle)" not in fallback or "cancelled: explicitBillingBoolean(devOrg.devPlanCancelled)" not in fallback:
        raise SystemExit('5.82 org fallback must preserve nullable cycle/cancelled')
    if "cancelled:typeof ds.cancelled === 'boolean' ? ds.cancelled : null" not in analytics:
        raise SystemExit('5.82 plugin adapter must preserve cancellation tri-state')
    if "cycle:typeof ds.cycle === 'string' ? ds.cycle.trim() : ''" not in analytics:
        raise SystemExit('5.82 plugin adapter must preserve explicit cycle only')

    for marker in ['billing-cycle-truth-strip', '>Billing Cycle<', '>기간 시작<', '>기간 종료<', '>남은 기간<', '>취소 상태<', 'billingEndTimestamp > Date.now()', "devpassAccount?.cancelled === true ? '취소 예정' : '—'"]:
        if marker not in dashboard:
            raise SystemExit(f'5.82 billing strip marker missing: {marker}')
    for forbidden in ['자동 갱신', '다음 결제일', '<span>월간 갱신</span>']:
        if forbidden in dashboard or forbidden in analytics_context:
            raise SystemExit(f'5.82 truth UI forbidden wording remains: {forbidden}')
    if 'DevPass billing period:' not in diagnostics or "cancelled ${typeof diagAccount?.cancelled === 'boolean' ? (diagAccount.cancelled ? 'yes' : 'no') : 'unknown'}" not in diagnostics:
        raise SystemExit('5.82 bounded billing diagnostics missing')

    billing_box_start = dashboard.index('billing-cycle-truth-strip')
    billing_box_end = dashboard.index('</div></div>\n        </div>`', billing_box_start)
    if billing_box_start < 0 or billing_box_end < billing_box_start:
        raise SystemExit('5.82 billing truth strip boundary missing')
    billing_box = dashboard[billing_box_start:billing_box_end]
    for forbidden in ['nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(', 'scheduleRefresh(', 'schedulePanelRender(', 'store.setItem(', 'organizationId', 'projectId', 'apiKey', 'payment']:
        if forbidden in billing_box:
            raise SystemExit(f'5.82 billing truth strip must add zero I/O/persistence/identifier surface: {forbidden}')

    if f'//@version {TARGET_VERSION}' not in latest or 'billing-cycle-truth-strip' not in latest:
        raise SystemExit('5.82 built plugin identity/strip missing')
    if f"const VERSION = '{TARGET_ENGINE}';" not in ENGINE.read_text(encoding='utf-8'):
        raise SystemExit('5.82 built Engine version mismatch')


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.82 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.82 baseline contracts are not 1/1')
if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
    raise SystemExit('5.82 baseline bootstrap diverged')
if current == BASE_VERSION:
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.82 baseline Engine version is not 1.6.22')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.82 baseline Engine artifact diverged from 5.81')

old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size

apply_engine_fidelity()
apply_plugin_adapter()
apply_billing_ui()
apply_billing_diagnostics()

if current == BASE_VERSION:
    replace_literal_once_or_target(CORE, '//@version 3.0.0-alpha.5.81', '//@version 3.0.0-alpha.5.82', 'plugin header version')
    replace_literal_once_or_target(CORE, "const VERSION = '3.0.0-alpha.5.81';", "const VERSION = '3.0.0-alpha.5.82';", 'plugin runtime version')
    replace_literal_once_or_target(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.22';", "const REQUIRED_BRIDGE_VERSION = '1.6.23';", 'plugin Engine requirement')
    replace_literal_once_or_target(ENGINE_CORE, "const VERSION = '1.6.22';", "const VERSION = '1.6.23';", 'Engine source version')
    replace_literal_once_or_target(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.81';", "const PRODUCT_VERSION = '3.0.0-alpha.5.82';", 'Manager Product version')
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
new_plugin_bytes = LATEST.stat().st_size
new_engine_bytes = ENGINE.stat().st_size
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} · billing cycle truth preserved · plugin bytes {old_plugin_bytes}->{new_plugin_bytes} ({new_plugin_bytes-old_plugin_bytes:+d}) · engine bytes {old_engine_bytes}->{new_engine_bytes} ({new_engine_bytes-old_engine_bytes:+d})')
