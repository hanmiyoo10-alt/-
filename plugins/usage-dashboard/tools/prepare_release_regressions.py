#!/usr/bin/env python3
"""Apply temporary behavior-only compatibility shims to incident regressions.

Current release identity is owned by tests/helpers/current-release.cjs. This
adapter must never rewrite versions, release titles, baselines, or workflow
paths. Remaining shims are retired after dependency-injected behavior harnesses
replace source-shape extraction.
"""

import argparse
import json
from pathlib import Path


parser = argparse.ArgumentParser(description='Prepare behavior-only Usage Dashboard regressions.')
parser.add_argument('--spec', required=True)
args = parser.parse_args()
spec = json.loads(Path(args.spec).read_text())
required = [
    'productVersion', 'engineVersion', 'managerVersion', 'snapshotContract',
    'recentRequestContract', 'releaseTitle', 'callerWorkflow', 'sharedWorkflow',
]
missing = [key for key in required if key not in spec]
if missing:
    raise SystemExit(f'release spec missing: {", ".join(missing)}')

root = Path('plugins/usage-dashboard/tests')
changed = []


def update(name, replacements):
    path = root / name
    text = path.read_text()
    original = text
    for old, new in replacements:
        if new in text:
            continue
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        changed.append(name)


update('p5-bundled-engine.cjs', [
    ("async function analyticsScopes(creditsOrgId = '')", "async function analyticsScopes(creditsOrgId = '', options = {})"),
])
update('p10-independent-cache-observer.cjs', [
    ("Symbol.for('llmgateway.devpass.bridge.capture.v8')", "Symbol.for('llmgateway.devpass.bridge.capture.v10')"),
])
print('behavior-only regression adapter: ' + (', '.join(changed) if changed else 'no changes'))
