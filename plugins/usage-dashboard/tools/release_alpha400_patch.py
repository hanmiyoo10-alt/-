from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

SOURCE = '3.0.0-alpha.3.41'
TARGET = '3.0.0-alpha.4.0'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.4.0')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.41 or alpha.4.0')

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
    'schema constants',
    "  const REQUIRED_BRIDGE_VERSION = '1.6.1';\n",
    "  const REQUIRED_BRIDGE_VERSION = '1.6.1';\n  const SNAPSHOT_SCHEMA_VERSION = 1;\n  const RECENT_REQUEST_SCHEMA_VERSION = 1;\n"
)

one(
    'state hydration helper',
    '  function bridgeSemver(value) {',
    "  function hydrateState(saved) {\n    return {...DEFAULTS,...(saved && typeof saved === 'object' ? saved : {})};\n  }\n\n  function bridgeSemver(value) {"
)

one(
    'recent cache input',
    "      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);\n      const requestNumberRaw = recentRequestValue(row, ['sequence','seq','requestNumber','request_number','number'], null);",
    "      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);\n      const cacheRaw = recentRequestValue(row, ['cacheHit','cache_hit','cached','isCached','is_cached','cache.hit'], null);\n      const cacheText = typeof cacheRaw === 'string' ? cacheRaw.trim().toLowerCase() : '';\n      const cacheHit = typeof cacheRaw === 'boolean' ? cacheRaw\n        : num(cacheRaw) ? Number(cacheRaw) > 0\n        : ['true','yes','hit','cached'].includes(cacheText) ? true\n        : ['false','no','miss','uncached'].includes(cacheText) ? false\n        : null;\n      const requestNumberRaw = recentRequestValue(row, ['sequence','seq','requestNumber','request_number','number'], null);"
)

one(
    'recent cache output',
    "        totalTokens:num(tokensRaw) ? Number(tokensRaw) : null,\n        requestNumber:requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '',",
    "        totalTokens:num(tokensRaw) ? Number(tokensRaw) : null,\n        cacheHit,\n        requestNumber:requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '',"
)

old_rows = """    const rows = value => Array.isArray(value) ? value.map(row => ({
      name:String(row?.name || 'Unknown'),
      requests:num(row?.requests) ? Number(row.requests) : 0,
      cost:num(row?.cost) ? Number(row.cost) : 0
    })) : [];"""
new_rows = """    const rows = value => Array.isArray(value) ? value.map(row => ({
      name:String(row?.name || 'Unknown'),
      requests:num(row?.requests) ? Number(row.requests) : 0,
      cost:num(row?.cost) ? Number(row.cost) : 0,
      totalTokens:num(row?.totalTokens ?? row?.total_tokens) ? Number(row.totalTokens ?? row.total_tokens) : null,
      inputTokens:num(row?.inputTokens ?? row?.input_tokens) ? Number(row.inputTokens ?? row.input_tokens) : null,
      outputTokens:num(row?.outputTokens ?? row?.output_tokens) ? Number(row.outputTokens ?? row.output_tokens) : null,
      errorCount:num(row?.errorCount ?? row?.error_count) ? Number(row.errorCount ?? row.error_count) : null,
      errorRate:num(row?.errorRate ?? row?.error_rate) ? Number(row.errorRate ?? row.error_rate) : null,
      cacheCount:num(row?.cacheCount ?? row?.cache_count) ? Number(row.cacheCount ?? row.cache_count) : null,
      cacheRate:num(row?.cacheRate ?? row?.cache_rate) ? Number(row.cacheRate ?? row.cache_rate) : null
    })) : [];"""
one('aggregate metric preservation', old_rows, new_rows)

one(
    'schema diagnostics',
    "      `Adapter: devpass-bridge-v1.6.x + local-json-v1`,\n      `Health: ${h.status || '—'}`,",
    "      `Adapter: devpass-bridge-v1.6.x + local-json-v1`,\n      `Schema: snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION}`,\n      `Health: ${h.status || '—'}`,"
)

one(
    'export schema metadata',
    "        plugin: {name:'Local Usage Dashboard', version:VERSION},\n        usage: state.data || null,",
    "        plugin: {name:'Local Usage Dashboard', version:VERSION},\n        schema: {snapshot:SNAPSHOT_SCHEMA_VERSION, recentRequest:RECENT_REQUEST_SCHEMA_VERSION},\n        usage: state.data || null,"
)

one(
    'state hydration use',
    "    state={...DEFAULTS,...((await store.getItem(STATE_KEY))||{})};",
    "    state=hydrateState(await store.getItem(STATE_KEY));"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('alpha.4.0 foundation must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    'const SNAPSHOT_SCHEMA_VERSION = 1;',
    'const RECENT_REQUEST_SCHEMA_VERSION = 1;',
    'function hydrateState(saved)',
    'state=hydrateState(await store.getItem(STATE_KEY));',
    'cacheHit,',
    'cacheRate:num(row?.cacheRate ?? row?.cache_rate)',
    'Schema: snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION}',
    'schema: {snapshot:SNAPSHOT_SCHEMA_VERSION, recentRequest:RECENT_REQUEST_SCHEMA_VERSION}',
    'Usage detail:',
    'Resume route: requested',
    'Stall/render coincidence:',
    'Bridge detail:',
    'Performance settings:',
    'Runtime state:',
    'Resume input:',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'UI stall probe:',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
