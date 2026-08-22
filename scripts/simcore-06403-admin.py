import json
import os
import re
from pathlib import Path

release_commit = os.environ.get('RELEASE_COMMIT', '').strip()
release_blob = os.environ.get('RELEASE_BLOB', '').strip()
if not release_commit or not release_blob:
    raise SystemExit('RELEASE_COMMIT / RELEASE_BLOB required')

manifest_path = Path('product-manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest.update({
    'production_version': '0.64.3',
    'release_name': 'B_END Diagnostic Builder Binding Repair',
    'release_commit': release_commit,
    'release_blob': release_blob,
    'current_priority': '06403_B_END_DIAGNOSTIC_BUILDER_LIVE_VALIDATION',
    'validation_status': 'PENDING_REAL_LONG_CHAT',
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')
block_re = re.compile(r'<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->.*?<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->', re.S)
new_block = f'''<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.64.3`
- Release: `B_END Diagnostic Builder Binding Repair`
- Release branch: `release-simcore`
- Release commit: `{release_commit}`
- Release blob: `{release_blob}`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `06403_B_END_DIAGNOSTIC_BUILDER_LIVE_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'''
if len(block_re.findall(dev)) != 1:
    raise SystemExit('production snapshot block count mismatch')
dev = block_re.sub(new_block, dev, count=1)

prod_start = dev.index('## Production verdict')
prod_end = dev.index('\n## Validated precursor problem', prod_start)
new_prod = '''## Production verdict

`v0.64.3` is the current production release. It is a narrow diagnostic-only repair for the confirmed v0.64.2 natural B_END `REPORT_BUILD_FAILED`: the outer runtime now binds the existing Kernel and Time modules used by `buildLastTurnDiagnosticReport()`. The report-builder body, B_END terminal-coverage calculation, clipboard transport contract, request/output hot paths, Broadcast/Time semantics, persistent state, M2-2 behavior, and the frozen v0.65.0 M2-3 design are unchanged.

The live close gate is one natural current-turn B_END diagnostic copy with `output COMMITTED`, report construction success, Broadcast closure / terminal coverage lines present, and copy result `COPIED` or `COPIED_FALLBACK`. Only after that result should v0.65.0 M2-3 Edit Reconcile Ownership Extraction begin. The genuine visible-edit control remains required before M2-3 closes or M2-4 begins.
'''
dev = dev[:prod_start] + new_prod + dev[prod_end:]

section_anchor = '## v0.64.2 — Diagnostic Copy Resilience'
if section_anchor not in dev:
    raise SystemExit('v0.64.2 section anchor missing')
if '## v0.64.3 — B_END Diagnostic Builder Binding Repair' not in dev:
    section = f'''## v0.64.3 — B_END Diagnostic Builder Binding Repair

Status: **PRODUCTION · PENDING NATURAL B_END LIVE CLOSE GATE**

```text
Version: 0.64.3
Release: B_END Diagnostic Builder Binding Repair
Release commit: {release_commit}
Release blob: {release_blob}
Parent: v0.64.2 Diagnostic Copy Resilience
Major checkpoint: M2-2 unchanged
```

Primary contract:

```text
outer runtime binds existing Kernel + Time modules
buildLastTurnDiagnosticReport body byte-identical
B_END terminal coverage expression byte-identical
COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED unchanged
no request/output hot-path behavior change
no Broadcast/Time semantic change
no persistent schema or host/storage/network/timer surface change
M2-3 design remains frozen for v0.65.0
```

Static release gate requires syntax, latest/install identity, Contracts v2, B_END report-builder binding fixture, unchanged builder body, unchanged protected side-effect counts, and unchanged diagnostic-copy stage fixtures.

Natural live close gate:

```text
current runtime mode B_END
output COMMITTED
report build succeeds
Broadcast closure / terminal coverage lines present
copy result COPIED or COPIED_FALLBACK
```

Only after this live close gate passes should v0.65.0 M2-3 implementation begin.

'''
    dev = dev.replace(section_anchor, section + section_anchor, 1)
dev_path.write_text(dev, encoding='utf-8')

guide_path = Path('docs/SIMCORE_GUIDELINES.md')
guide = guide_path.read_text(encoding='utf-8')
section44 = re.compile(r'(## 44\. Current Production Baseline\s+Current production family at the time this document was created:\s+```text\s+)(.*?)(\s+```)', re.S)
match = section44.search(guide)
if not match:
    raise SystemExit('guideline current production baseline section missing')
guide = section44.sub(r'\1SimCore v0.64.3 — B_END Diagnostic Builder Binding Repair\3', guide, count=1)
guide_path.write_text(guide, encoding='utf-8')

gate_path = Path('docs/SIMCORE_NEXT_RELEASE_GATE_06403.md')
gate = gate_path.read_text(encoding='utf-8')
if '## Release status' not in gate:
    gate += f'''\n\n## Release status\n\n```text\nSTATIC RELEASED\nVersion: 0.64.3\nRelease commit: {release_commit}\nRelease blob: {release_blob}\nLive close gate: PENDING natural current-turn B_END diagnostic copy\n```\n\nM2-3 remains blocked until the natural B_END close gate passes.\n'''
gate_path.write_text(gate, encoding='utf-8')

watch_path = Path('docs/SIMCORE_DIAGNOSTIC_COPY_WATCH_06401.md')
watch = watch_path.read_text(encoding='utf-8')
if '## v0.64.3 builder-binding repair' not in watch:
    watch += f'''\n\n## v0.64.3 builder-binding repair\n\nProduction `v0.64.3 — B_END Diagnostic Builder Binding Repair` is statically released at `{release_commit}` / blob `{release_blob}`. The confirmed v0.64.2 `REPORT_BUILD_FAILED` source defect is repaired by binding the existing Kernel and Time modules in the outer diagnostic runtime scope while keeping the report-builder body and clipboard transport contract unchanged. Natural current-turn B_END copy remains the close gate before M2-3.\n'''
watch_path.write_text(watch, encoding='utf-8')

print('SimCore v0.64.3 durable memory synchronized')
