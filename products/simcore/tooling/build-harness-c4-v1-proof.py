#!/usr/bin/env python3
from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
MARKER = '// HARNESS_C4_V1_CANDIDATE_PROOF_ONLY'

contents = [p.read_text(encoding='utf-8') for p in FILES]
if contents[0] != contents[1]:
    raise SystemExit('HARNESS_C4_V1_PRODUCTION_MIRROR_MISMATCH')
if MARKER in contents[0]:
    raise SystemExit('HARNESS_C4_V1_MARKER_ALREADY_PRESENT')

updated = contents[0]
if not updated.endswith('\n'):
    updated += '\n'
updated += MARKER + '\n'

for path in FILES:
    path.write_text(updated, encoding='utf-8')

print('HARNESS_C4_V1_PROOF_BUILDER_PASS')
