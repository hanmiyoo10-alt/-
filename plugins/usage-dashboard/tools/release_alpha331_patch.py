from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

if '//@version 3.0.0-alpha.3.30' not in s or "const VERSION = '3.0.0-alpha.3.30';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.30')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', '//@version 3.0.0-alpha.3.30', '//@version 3.0.0-alpha.3.31')
one('runtime version', "const VERSION = '3.0.0-alpha.3.30';", "const VERSION = '3.0.0-alpha.3.31';")

# SimCore's visible item in the circled in-chat quick menu is registered at location:'chat'.
# Keep the existing settings registration untouched and move only the Usage shortcut.
one(
    'quick menu location',
    "    uiParts.push(await Risuai.registerButton({name:'Usage',icon:'$',iconType:'html',location:'hamburger',id:'local-usage-dashboard-button-v3'},openSettings));",
    "    uiParts.push(await Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat',id:'local-usage-dashboard-button-v3'},openSettings));"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.31 must not change floating widget HTML')

for marker in [
    '//@version 3.0.0-alpha.3.31',
    "const VERSION = '3.0.0-alpha.3.31';",
    "Risuai.registerSetting('Local Usage Dashboard',openSettings,'◴','html','local-usage-dashboard-settings-v3')",
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat',id:'local-usage-dashboard-button-v3'},openSettings)",
    'Resume input:',
    'Resume Input ·',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'Resume probe:',
    'Resume long task:',
    'UI stall probe:',
    'Performance guard:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

if "location:'hamburger',id:'local-usage-dashboard-button-v3'" in s:
    raise SystemExit('old Usage hamburger registration still present')

p.write_text(s)
