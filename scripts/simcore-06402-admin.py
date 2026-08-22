#!/usr/bin/env python3
import json
import os
import re
from pathlib import Path

VERSION = '0.64.2'
RELEASE_NAME = 'Diagnostic Copy Resilience'
RELEASE_COMMIT = os.environ['RELEASE_COMMIT']
RELEASE_BLOB = os.environ['RELEASE_BLOB']
PRIORITY = '06402_DIAGNOSTIC_COPY_LIVE_VALIDATION'

manifest_path = Path('product-manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest.update({
    'production_version': VERSION,
    'release_name': RELEASE_NAME,
    'release_branch': 'release-simcore',
    'release_commit': RELEASE_COMMIT,
    'release_blob': RELEASE_BLOB,
    'current_priority': PRIORITY,
    'validation_status': 'PENDING_REAL_LONG_CHAT',
    'major_update_milestone': '2.0M',
    'major_update_phase': 'M2',
    'major_update_checkpoint': 'M2-2',
})
manifest['provider_cache_status'] = 'UNVERIFIED'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')
begin = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->'
end = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'
snapshot = f'''{begin}
## Current Production Snapshot

- Product: SimCore
- Version: `{VERSION}`
- Release: `{RELEASE_NAME}`
- Release branch: `release-simcore`
- Release commit: `{RELEASE_COMMIT}`
- Release blob: `{RELEASE_BLOB}`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `{PRIORITY}`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
{end}'''
dev, n = re.subn(re.escape(begin) + r'.*?' + re.escape(end), snapshot, dev, count=1, flags=re.S)
if n != 1:
    raise SystemExit('CURRENT_DEVELOPMENT snapshot markers missing/ambiguous')

verdict = f'''## Production verdict

`v{VERSION}` is the current production release. It hardens only the manual diagnostic-copy path: report construction runs exactly once, Clipboard API transport is isolated, a DOM-local textarea fallback is available, and the UI exposes `COPIED`, `COPIED_FALLBACK`, `REPORT_BUILD_FAILED`, or `CLIPBOARD_WRITE_FAILED`. `buildLastTurnDiagnosticReport()` remains byte-identical to v0.64.1, and no request/output hot-path, persistent state, generation, M2-2, Summary Scope, Broadcast, Time, Representation, Recovery, Prompt, or Store behavior changed.

The ordinary live gate is one successful `COPIED` or `COPIED_FALLBACK` result. A future natural B_END `REPORT_BUILD_FAILED` directly attributes a builder defect and must be handled in a separate narrow mini; `CLIPBOARD_WRITE_FAILED` instead narrows the problem to WebView clipboard transport. Diagnostic-copy hardening no longer blocks starting M2-3 Edit Reconcile extraction. The v0.64.x/M2-3-line genuine visible-edit control remains required before M2-3 closes or M2-4 begins.
'''
dev, n = re.subn(r'## Production verdict\n\n.*?(?=\nHistorical precursor evidence retained below)', verdict.rstrip() + '\n', dev, count=1, flags=re.S)
if n != 1:
    raise SystemExit('CURRENT_DEVELOPMENT production verdict block not found')

section = f'''## v{VERSION} — {RELEASE_NAME}

Status: **PRODUCTION · PENDING ONE LIVE COPY RESULT**

```text
Version: {VERSION}
Release: {RELEASE_NAME}
Release commit: {RELEASE_COMMIT}
Release blob: {RELEASE_BLOB}
Parent: v0.64.1 Summary Scope Authority
Major checkpoint: M2-2 unchanged
```

Primary contract:

```text
BUILD exactly once
primary Clipboard API
fallback temporary textarea + execCommand('copy')
results: COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED
bounded memory-only probe; no raw report retention
builder body byte-identical; runtime semantics unchanged
```

Static CI verifies report build count, primary/fallback exact payload identity, builder-failure short circuit, fallback cleanup/focus restoration, latest/install equality, architecture contracts, Summary Scope fixtures, frozen M2 markers, and unchanged storage/chat/network/timer call counts.

Live routing:

```text
COPIED or COPIED_FALLBACK -> v0.64.2 live gate PASS; proceed with M2-3
REPORT_BUILD_FAILED       -> separate builder-repair mini before M2-3
CLIPBOARD_WRITE_FAILED    -> PocketRisu/WebView clipboard transport scope
```

'''
anchor = '## v0.64.1 — Summary Scope Authority'
if f'## v{VERSION} — {RELEASE_NAME}' not in dev:
    if anchor not in dev:
        raise SystemExit('CURRENT_DEVELOPMENT v0.64.1 anchor missing')
    dev = dev.replace(anchor, section + anchor, 1)
dev_path.write_text(dev, encoding='utf-8')

ledger_path = Path('docs/SIMCORE_DEFERRED_LEDGER.md')
ledger = ledger_path.read_text(encoding='utf-8')
ledger = ledger.replace('Production: v0.64.1 — Summary Scope Authority (M2-2 correctness insert)', f'Production: v{VERSION} — {RELEASE_NAME} (M2-2 diagnostic hardening)', 1)
ledger = ledger.replace('Next physical move: Edit Reconcile extraction may begin after diagnostic-copy hardening', 'Next physical move: M2-3 Edit Reconcile extraction may begin after one successful v0.64.2 live copy result', 1)
ledger_path.write_text(ledger, encoding='utf-8')

watch_path = Path('docs/SIMCORE_DIAGNOSTIC_COPY_WATCH_06401.md')
watch = watch_path.read_text(encoding='utf-8')
note = f'''\n## v{VERSION} production response\n\nStatus: `PATCHED / LIVE ATTRIBUTION PENDING`\n\nThe report builder remains byte-identical. Report construction and clipboard transport are now separate, the report is built exactly once, primary/fallback payloads are identical, DOM cleanup is unconditional, and four bounded UI results expose the failed stage. A natural B_END builder repair remains forbidden until `REPORT_BUILD_FAILED` directly attributes the failure.\n'''
if f'## v{VERSION} production response' not in watch:
    watch = watch.rstrip() + '\n' + note
watch_path.write_text(watch, encoding='utf-8')

guide_path = Path('docs/SIMCORE_GUIDELINES.md')
guide = guide_path.read_text(encoding='utf-8')
pattern = re.compile(r'(## \d+\. Current Production Baseline.*?```text\n)(SimCore v[^\n]+)(\n```)', re.S)
guide, n = pattern.subn(rf'\1SimCore v{VERSION} — {RELEASE_NAME}\3', guide, count=1)
if n != 1:
    raise SystemExit('Guideline current production baseline not found')
guide_path.write_text(guide, encoding='utf-8')

print('SimCore v0.64.2 administrative sync: OK')
