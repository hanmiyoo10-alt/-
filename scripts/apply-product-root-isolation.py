from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> bool:
    text = path.read_text(encoding='utf-8')
    if new in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one migration anchor, got {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


changed = []

simcore_command = Path('.github/workflows/simcore-release-command.yml')
old = """  memory-sync:
    needs: release
    if: github.event.pull_request.title == 'SimCore v0.63.52 release command'
    runs-on: ubuntu-latest
    steps:
"""
new = """  memory-sync:
    needs: release
    if: github.event.pull_request.title == 'SimCore v0.63.52 release command'
    runs-on: ubuntu-latest
    concurrency:
      group: repo-main-write
      cancel-in-progress: false
    steps:
"""
if replace_once(simcore_command, old, new, 'SimCore release-command memory-sync lock'):
    changed.append(str(simcore_command))

simcore_sync = Path('.github/workflows/simcore-release-state-sync.yml')
old = """concurrency:
  group: simcore-release-state-sync
  cancel-in-progress: false
"""
new = """concurrency:
  group: repo-main-write
  cancel-in-progress: false
"""
if replace_once(simcore_sync, old, new, 'SimCore release-state-sync lock'):
    changed.append(str(simcore_sync))

usage_stage = Path('.github/workflows/stage-usage-dashboard-557-organization-discovery-dedup.yml')
old = """permissions:
  contents: write

jobs:
"""
new = """permissions:
  contents: write

concurrency:
  group: repo-main-write
  cancel-in-progress: false

jobs:
"""
if replace_once(usage_stage, old, new, 'Usage Dashboard main-write lock'):
    changed.append(str(usage_stage))

for required in [
    Path('products/README.md'),
    Path('products/simcore/README.md'),
    Path('products/usage-dashboard/README.md'),
]:
    if not required.exists():
        raise SystemExit(f'missing product-root contract: {required}')

print('product-root isolation migration: ' + ('updated ' + ', '.join(changed) if changed else 'already applied'))
