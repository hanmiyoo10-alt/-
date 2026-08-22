from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

TARGET = '3.0.0-alpha.3.36'
SOURCE = '3.0.0-alpha.3.35'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.3.36')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.35 or alpha.3.36')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', f'//@version {SOURCE}', f'//@version {TARGET}')
one('runtime version', f"const VERSION = '{SOURCE}';", f"const VERSION = '{TARGET}';")
one(
    'required bridge version',
    "  const DEFAULT_BRIDGE = 'http://127.0.0.1:39117';",
    "  const DEFAULT_BRIDGE = 'http://127.0.0.1:39117';\n  const REQUIRED_BRIDGE_VERSION = '1.6.1';"
)

core_anchor = "  const pct = v => Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Number(v))) : 0;\n"
bridge_helpers = r'''

  function bridgeSemver(value) {
    const match = String(value || '').match(/(?:^|[^0-9])(\d+)\.(\d+)\.(\d+)(?:[^0-9]|$)/);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
  }

  function bridgeCompatibleVersion(value, compatibility = null) {
    if (typeof compatibility?.compatible === 'boolean') return compatibility.compatible;
    const current = bridgeSemver(value);
    const required = bridgeSemver(REQUIRED_BRIDGE_VERSION);
    if (!current || !required) return null;
    for (let i = 0; i < 3; i += 1) {
      if (current[i] > required[i]) return true;
      if (current[i] < required[i]) return false;
    }
    return true;
  }

  function bridgeTimestamp(value) {
    if (value === null || value === undefined || value === '') return null;
    if (num(value)) {
      const n = Number(value);
      return n > 0 && n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeBridgeMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const version = String(raw.bridgeVersion || raw.version || '');
    const compatibility = raw.compatibility && typeof raw.compatibility === 'object' ? raw.compatibility : null;
    const modules = raw.modules && typeof raw.modules === 'object' ? raw.modules : null;
    const diagnostics = raw.diagnostics && typeof raw.diagnostics === 'object' ? raw.diagnostics : null;
    const protocolVersion = num(raw.protocolVersion) ? Number(raw.protocolVersion) : null;
    const fetchedAt = bridgeTimestamp(raw.fetchedAt) || Date.now();
    if (!version && !compatibility && !modules && !diagnostics && raw.__bridgeSnapshot !== true) return null;
    return {
      version,
      protocolVersion,
      compatibility,
      compatible: bridgeCompatibleVersion(version, compatibility),
      modules,
      diagnostics,
      fetchedAt
    };
  }

  function bridgeStabilitySnapshot() {
    const bridge = state?.data?.bridge || null;
    const modules = bridge?.modules && typeof bridge.modules === 'object' ? bridge.modules : null;
    const moduleRows = modules ? Object.values(modules).filter(row => row && typeof row === 'object') : [];
    const diagnostics = bridge?.diagnostics && typeof bridge.diagnostics === 'object' ? bridge.diagnostics : null;
    const cache = diagnostics?.cache && typeof diagnostics.cache === 'object' ? diagnostics.cache : null;
    const cli = diagnostics?.cli && typeof diagnostics.cli === 'object' ? diagnostics.cli : null;
    const circuits = diagnostics?.circuits && typeof diagnostics.circuits === 'object' ? diagnostics.circuits : null;
    const circuitStats = diagnostics?.circuitStats && typeof diagnostics.circuitStats === 'object' ? diagnostics.circuitStats : null;
    const moduleError = row => {
      const status = String(row?.status || '').toLowerCase();
      return ['error','open','partial'].includes(status) || Boolean(row?.errorCode) || Boolean(row?.error);
    };
    const numeric = value => num(value) ? Number(value) : null;
    return {
      version: bridge?.version || '',
      compatible: typeof bridge?.compatible === 'boolean' ? bridge.compatible : null,
      fetchedAt: bridge?.fetchedAt || null,
      moduleCount: modules ? Object.keys(modules).length : null,
      staleModules: modules ? moduleRows.filter(row => row?.stale === true).length : null,
      errorModules: modules ? moduleRows.filter(moduleError).length : null,
      cacheHitRate: numeric(cache?.hitRate),
      cacheEntries: numeric(cache?.entries ?? diagnostics?.cacheEntries),
      inFlight: numeric(cache?.inFlight ?? diagnostics?.inFlight),
      staleFallbacks: numeric(cache?.staleFallbacks),
      cliActive: numeric(cli?.active),
      cliQueued: numeric(cli?.queued),
      openCircuits: circuits ? Object.values(circuits).filter(row => String(row?.state || '').toLowerCase() === 'open').length : null,
      circuitRecoveries: numeric(circuitStats?.recoveries)
    };
  }
'''
one('bridge metadata helpers', core_anchor, core_anchor + bridge_helpers)

one(
    'devpass bridge metadata',
    "        health:{status:r.ok === false ? 'error' : 'ok', bridgeVersion:r.bridgeVersion || null},\n        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes",
    "        health:{status:r.ok === false ? 'error' : 'ok', bridgeVersion:r.bridgeVersion || null},\n        bridge:normalizeBridgeMetadata(r),\n        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes"
)
one(
    'local-json bridge metadata',
    "      source: String(r.source || 'Local Bridge'), health: r.health && typeof r.health === 'object' ? r.health : null,\n      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes, analytics, analyticsScopes",
    "      source: String(r.source || 'Local Bridge'), health: r.health && typeof r.health === 'object' ? r.health : null,\n      bridge: normalizeBridgeMetadata(r),\n      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes, analytics, analyticsScopes"
)

one(
    'diagnostics stability binding',
    "  function diagText() {\n    const d = state.data || {}, h = d.health || {};",
    "  function diagText() {\n    const d = state.data || {}, h = d.health || {};\n    const bridgeDiag = bridgeStabilitySnapshot();"
)

diag_health = "      `Health: ${h.status || '—'}`,"
diag_bridge = diag_health + r'''
      `Bridge detail: ${bridgeDiag.version ? `v${bridgeDiag.version}` : '—'} · required >=${REQUIRED_BRIDGE_VERSION} · compatible ${bridgeDiag.compatible === null ? 'unknown' : bridgeDiag.compatible ? 'yes' : 'no'} · snapshot ${bridgeDiag.fetchedAt ? age(bridgeDiag.fetchedAt) : '—'}`,
      `Bridge modules: ${bridgeDiag.moduleCount ?? '—'} · stale ${bridgeDiag.staleModules ?? '—'} · errors ${bridgeDiag.errorModules ?? '—'}`,
      `Bridge cache: hit ${bridgeDiag.cacheHitRate === null ? '—' : `${bridgeDiag.cacheHitRate.toFixed(0)}%`} · entries ${bridgeDiag.cacheEntries ?? '—'} · in-flight ${bridgeDiag.inFlight ?? '—'} · stale fallback ${bridgeDiag.staleFallbacks ?? '—'}`,
      `Bridge CLI/circuit: active ${bridgeDiag.cliActive ?? '—'} · queued ${bridgeDiag.cliQueued ?? '—'} · open ${bridgeDiag.openCircuits ?? '—'} · recoveries ${bridgeDiag.circuitRecoveries ?? '—'}`,'''
one('bridge diagnostics text', diag_health, diag_bridge)

one(
    'settings bridge diagnostics binding',
    "    const d = state.data || {}, c = d.credits, a = d.activity, runway = d.runway, h = d.health || {};",
    "    const d = state.data || {}, c = d.credits, a = d.activity, runway = d.runway, h = d.health || {};\n    const bridgeDiag = bridgeStabilitySnapshot();"
)

ui_anchor = '<p>Updater · GitHub HTTPS · ${VERSION}</p><p>Runtime State ·'
ui_bridge = '''<p>Updater · GitHub HTTPS · ${VERSION}</p><p>Bridge Stability · ${bridgeDiag.version?`v${esc(bridgeDiag.version)}`:'—'} · required ≥${esc(REQUIRED_BRIDGE_VERSION)} · compatible ${bridgeDiag.compatible===null?'unknown':bridgeDiag.compatible?'yes':'no'} · modules ${bridgeDiag.moduleCount??'—'} · stale ${bridgeDiag.staleModules??'—'} · errors ${bridgeDiag.errorModules??'—'}</p><p>Bridge Runtime · cache ${bridgeDiag.cacheHitRate===null?'—':bridgeDiag.cacheHitRate.toFixed(0)+'%'} · entries ${bridgeDiag.cacheEntries??'—'} · in-flight ${bridgeDiag.inFlight??'—'} · stale fallback ${bridgeDiag.staleFallbacks??'—'} · CLI ${bridgeDiag.cliActive??'—'}/${bridgeDiag.cliQueued??'—'} · circuit ${bridgeDiag.openCircuits??'—'} open / ${bridgeDiag.circuitRecoveries??'—'} recoveries</p><p>Runtime State ·'''
one('bridge stability ui', ui_anchor, ui_bridge)

one(
    'json export bridge metadata',
    "        creditDailyUsage: state.creditDailyUsage || null,\n        sync: {",
    "        creditDailyUsage: state.creditDailyUsage || null,\n        bridge: state.data?.bridge || null,\n        sync: {"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.36 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    "const REQUIRED_BRIDGE_VERSION = '1.6.1';",
    'function normalizeBridgeMetadata',
    'function bridgeStabilitySnapshot',
    'Bridge detail:',
    'Bridge modules:',
    'Bridge cache:',
    'Bridge CLI/circuit:',
    'Bridge Stability ·',
    'Bridge Runtime ·',
    'bridge: state.data?.bridge || null',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Performance settings:',
    'Runtime state:',
    'Resume input:',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'UI stall probe:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
