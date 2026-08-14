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

one(
    'quick menu registration',
    "    uiParts.push(await Risuai.registerSetting('Local Usage Dashboard',openSettings,'◴','html','local-usage-dashboard-settings-v3'));\n    uiParts.push(await Risuai.registerButton({name:'Usage',icon:'$',iconType:'html',location:'hamburger',id:'local-usage-dashboard-button-v3'},openSettings));",
    "    // Use the same registerSetting path as SimCore so Usage appears in the same quick-menu section.\n    // With the current plugin load order this places Usage directly after SimCore.\n    uiParts.push(await Risuai.registerSetting('Usage',openSettings,'📊','html'));"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.31 must not change floating widget HTML')

for marker in [
    '//@version 3.0.0-alpha.3.31',
    "const VERSION = '3.0.0-alpha.3.31';",
    "Risuai.registerSetting('Usage',openSettings,'📊','html')",
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

if "registerButton({name:'Usage'" in s:
    raise SystemExit('legacy Usage hamburger registration must be removed')

p.write_text(s)
