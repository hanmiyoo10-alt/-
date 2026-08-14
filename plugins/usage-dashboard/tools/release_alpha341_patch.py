from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

SOURCE = '3.0.0-alpha.3.40'
TARGET = '3.0.0-alpha.3.41'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.3.41')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.40 or alpha.3.41')

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

cache_card_anchor = r'''          <div class=\"mini\"><span>Top Provider</span><b>${esc(scopeTopProvider)}</b></div>'''
cache_card_new = r'''          <div class=\"mini\"><span>캐시</span><b>${Number(scopeActivity.cacheCount || 0).toLocaleString()}회 · ${Number(scopeActivity.cacheRate || 0).toFixed(1)}%</b></div>
          <div class=\"mini\"><span>Top Provider</span><b>${esc(scopeTopProvider)}</b></div>'''
one('usage scope cache card', cache_card_anchor, cache_card_new)

diag_old = r'''      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)}`,'''
diag_new = r'''      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${Number(diagUsage?.cacheCount || 0).toLocaleString()}회 · ${Number(diagUsage?.cacheRate || 0).toFixed(1)}%`,'''
one('usage detail cache diagnostics', diag_old, diag_new)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.41 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    '<span>캐시</span><b>${Number(scopeActivity.cacheCount || 0).toLocaleString()}회 · ${Number(scopeActivity.cacheRate || 0).toFixed(1)}%</b>',
    'source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${Number(diagUsage?.cacheCount || 0).toLocaleString()}회 · ${Number(diagUsage?.cacheRate || 0).toFixed(1)}%',
    '최근 요청 · 요청 단위',
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
