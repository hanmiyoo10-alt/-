#!/usr/bin/env python3
from pathlib import Path

p = Path('docs/CURRENT_DEVELOPMENT.md')
text = p.read_text(encoding='utf-8')

replacements = [
    (
        '`v0.63.55` is the current production release. Static release gates passed and the request-side Representation Fast Reconcile has now passed real long-chat validation.',
        '`v0.63.56` is the current production release. Static M2-1 release gates passed; real long-chat validation of the mechanical Recovery boundary split is pending. `v0.63.55` Representation Fast Reconcile remains the validated behavioral regression baseline.',
        'production verdict',
    ),
    (
        '## Current highest-value problem',
        '## Validated precursor problem — v0.63.55',
        'precursor heading',
    ),
    (
        'v0.63.55 has now validated this **next-turn false manual-edit rebuild** fix in natural long chat. The next task is the 2.0M Major M2 mechanical boundary refactor, with the validated fast path and genuine-user-edit behavior frozen as regression controls.',
        'v0.63.55 validated this **next-turn false manual-edit rebuild** fix in natural long chat. M2-1 is now deployed as `v0.63.56`; the current task is to validate that the Recovery boundary split preserves the validated fast path, genuine-user-edit behavior, and ordinary A/B/C operation.',
        'precursor conclusion',
    ),
    (
        'Status: **PRODUCTION · VALIDATED REAL LONG-CHAT**',
        'Status: **SUPERSEDED BY v0.63.56 · VALIDATED REAL LONG-CHAT**',
        'v0.63.55 status',
    ),
    (
        '2.0M Major M2 — Mechanical Boundary Refactor',
        'Validate v0.63.56 M2-1 — Recovery Boundary Split in natural long chat',
        'quick resume action',
    ),
]

for old, new, label in replacements:
    if new in text:
        continue
    if old not in text:
        if label == 'quick resume action':
            continue
        raise SystemExit(f'{label}: expected text not found')
    text = text.replace(old, new, 1)

p.write_text(text, encoding='utf-8')
print('CURRENT_DEVELOPMENT M2-1 continuity repaired.')
