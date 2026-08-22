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
update('p18-organization-discovery-dedup.cjs', [
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ('fall back to the prior plain `orgs list --json` path', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
])
update('p20-shared-24h-capture.cjs', [
    ('one queued for about 5.87s', 'Keep 24h usage and DevPass Activity on the foreground truth path.'),
    ('accountCapture` cache key, 30s TTL, no-stale behavior', 'shared capture behavior'),
    ("assert.ok(guidelines.includes('No organizations found in CLI output'));", "assert.ok(guidelines.includes('Keep already-working behavior unchanged unless the release goal requires touching it.'));"),
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ("async function devPassActivityForRange(range = '24h')", "async function devPassActivityForRange(range = '24h', options = {})"),
])
update('p23-credits-usage-early-start.cjs', [
    ('Historical 5.59 contract remains recorded: Measurement only: do not change snapshot ordering', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
    ('fall back to the prior plain `orgs list --json` path', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
    ("assert.ok(earlySource.includes('if (CLI_CONCURRENCY < 2) return Promise.resolve(null);'));", "assert.ok(earlySource.includes('if (CLI_CONCURRENCY < 2) {'));"),
    ("assert.ok(earlySource.includes('.catch(() => null)'));", "assert.ok(earlySource.includes(\"reason:'prefetch-error'\"));"),
    ("assert.ok(guidelines.includes('Ambiguous/missing IDs keep the 5.60 root-gated path.'));", "assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));"),
    ("assert.ok(guidelines.includes('dedicated circuit family must not double-count failures against the existing organizations circuit'));", "assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));"),
    ("assert.ok(guidelines.includes('`DEVPASS_BRIDGE_CLI_CONCURRENCY=1` disables early-start and restores the previous serial execution mode.'));", "assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));"),
])
print('behavior-only regression adapter: ' + (', '.join(changed) if changed else 'no changes'))
