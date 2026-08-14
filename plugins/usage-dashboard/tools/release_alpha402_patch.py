from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

SOURCE = '3.0.0-alpha.4.1'
TARGET = '3.0.0-alpha.4.2'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.4.2')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.4.1 or alpha.4.2')

before = s
widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

if s.count(f'//@version {SOURCE}') != 1:
    raise SystemExit('metadata version anchor mismatch')
if s.count(f"const VERSION = '{SOURCE}';") != 1:
    raise SystemExit('runtime version anchor mismatch')

s = s.replace(f'//@version {SOURCE}', f'//@version {TARGET}', 1)
s = s.replace(f"const VERSION = '{SOURCE}';", f"const VERSION = '{TARGET}';", 1)

# P2 is source/build structure only. Runtime bytes must differ from 4.1 solely by version strings.
roundtrip = s.replace(f'//@version {TARGET}', f'//@version {SOURCE}', 1).replace(
    f"const VERSION = '{TARGET}';", f"const VERSION = '{SOURCE}';", 1
)
if roundtrip != before:
    raise SystemExit('alpha.4.2 runtime change detected outside version strings')

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('alpha.4.2 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    "const STATE_KEY = 'local-usage-dashboard-v3';",
    'Schema: snapshot v',
    'Bridge module freshness:',
    'Bridge module duration:',
    'Bridge partial:',
    'Usage detail:',
    'Resume route: requested',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing regression marker: ' + marker)

p.write_text(s)
print('patched Local Usage Dashboard alpha.4.2 · runtime version-only')
