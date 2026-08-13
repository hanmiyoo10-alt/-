from pathlib import Path

path = Path('plugins/usage-dashboard/latest.js')
src = path.read_text()

if '//@version 3.0.0-alpha.3.20' not in src or "const VERSION = '3.0.0-alpha.3.20';" not in src:
    raise SystemExit('latest.js가 정확한 alpha.3.20이 아니야.')


def replace_once(label, old, new):
    global src
    count = src.count(old)
    if count != 1:
        raise SystemExit(f'{label}: 예상 1개, 실제 {count}개')
    src = src.replace(old, new, 1)


replace_once('메타 버전', '//@version 3.0.0-alpha.3.20', '//@version 3.0.0-alpha.3.21')
replace_once('런타임 버전', "const VERSION = '3.0.0-alpha.3.20';", "const VERSION = '3.0.0-alpha.3.21';")

# Dashboard: when one or more days remain, keep minutes instead of truncating them.
replace_once(
    'Dashboard 남은 시간 분 표시',
    "  if (days>0) return days+'일 '+hours+'시간';",
    "  if (days>0) return days+'일 '+hours+'시간 '+minutes+'분';",
)

# Floating detailed widget: same precision as the Dashboard.
replace_once(
    'Widget 남은 시간 분 표시',
    "      if (days > 0) return `${days}일 ${hours}시간`;",
    "      if (days > 0) return `${days}일 ${hours}시간 ${minutes}분`;",
)

# Guard: no reset calculation/network behavior is changed in this display-only release.
if "const totalMinutes=Math.ceil(diff/60000);" not in src:
    raise SystemExit('Dashboard reset 계산 guard 실패')
if "const totalMinutes = Math.ceil(diff / 60000);" not in src:
    raise SystemExit('Widget reset 계산 guard 실패')

path.write_text(src)
