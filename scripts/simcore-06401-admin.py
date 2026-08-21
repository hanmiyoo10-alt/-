#!/usr/bin/env python3
import json
import os
import re
from pathlib import Path

VERSION = '0.64.1'
RELEASE_NAME = 'Summary Scope Authority'
RELEASE_COMMIT = os.environ['RELEASE_COMMIT']
RELEASE_BLOB = os.environ['RELEASE_BLOB']
PRIORITY = '06401_SUMMARY_SCOPE_AUTHORITY_LIVE_VALIDATION'

# Manifest
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
manifest.pop('managed_by', None)
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Current development memory
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

`v{VERSION}` is the current production release. It is a bounded correctness insert on top of the still-active M2-2 Representation Ownership Split checkpoint: Lifecycle now classifies eligible Mode-C year-end summaries as `ANNUAL_ONLY`, `CUMULATIVE_YOY`, or fail-closed `NONE`, and Prompt serializes the resulting temporal authority. Recurrence may still guide structure/style but is explicitly below Summary Scope for factual target-year/baseline authority. Lineage/Recurrence implementations, Representation/Edit/Runtime Mirror, persistent schema, and the rest of the M2 frozen surface are unchanged.

The v0.64.0 M2-2 natural mismatch pair already proved `REPRESENTATION_FAST_RECONCILED` after the ownership split. The remaining major M2-2 positive control is a genuine visible user edit on the v0.64.x line (`USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`). Summary Scope live validation is now the immediate mini-release gate before returning to that control and M2-3.
'''
dev, n = re.subn(r'## Production verdict\n\n.*?(?=\nHistorical precursor evidence retained below)', verdict.rstrip() + '\n', dev, count=1, flags=re.S)
if n != 1:
    raise SystemExit('CURRENT_DEVELOPMENT production verdict block not found')

section = f'''## v{VERSION} — {RELEASE_NAME}

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

Production identity:

```text
Version: {VERSION}
Release: {RELEASE_NAME}
Release commit: {RELEASE_COMMIT}
Release blob: {RELEASE_BLOB}
Parent production baseline: v0.64.0 M2-2 Representation Ownership Split
Major checkpoint remains: M2-2
```

Direct triggering evidence came from paired year-end C requests in runtime `mt2qjgt5-9oi0sk`:

```text
ANNUAL_ONLY candidate @2020:
- target-year achievements may be omitted while earlier achievements can bleed into the annual summary
- standalone summary remained over-chained to root A@2014 (WATCH; Lineage not patched)

CUMULATIVE_YOY @2022:
- explicit 2029.12.31 -> 2030.12.31 baseline/current comparison
- visible COSMIC section used 3,400만 as the 2029 baseline, while a later comment reused 720만
- several requested per-metric absolute/percentage YoY deltas were omitted
- recurrence matched an older template; correlation preserved, causality not assumed
```

Patch boundary:

```text
Lifecycle request classifier: NONE / ANNUAL_ONLY / CUMULATIVE_YOY
pending metadata only; no persistent schema
Prompt compiler v3 serializes scope authority
Summary factual authority > Recurrence factual carryover
Recurrence/Lineage implementation unchanged
no output-body parser or semantic repair
```

Static release gate:

```text
python helper compile            PASS
node --check latest/install      PASS
latest == install               PASS
Contracts v2 checker             PASS
summary classifier fixtures 9/9 PASS
M2-2 frozen markers retained     PASS
```

Live targets:

```text
ANNUAL_ONLY input -> Summary scope ANNUAL_ONLY / target 2030
- target-year achievements stay target-year scoped
- earlier facts only labeled context/metadata
- cumulative counters labeled year-end snapshot

CUMULATIVE_YOY input -> Summary scope CUMULATIVE_YOY / target 2030 / comparison 2029
- every requested comparable metric gets previous/current/absolute delta/percentage delta
- older historical values cannot replace the requested 2029 baseline

Lineage over-chain remains WATCH and is intentionally unchanged for attribution isolation.
```

'''
anchor = '## v0.64.0 — M2-2 Representation Ownership Split'
if f'## v{VERSION} — {RELEASE_NAME}' not in dev:
    if anchor not in dev:
        raise SystemExit('CURRENT_DEVELOPMENT v0.64.0 anchor missing')
    dev = dev.replace(anchor, section + anchor, 1)
dev_path.write_text(dev, encoding='utf-8')

# M2 live evidence: prepend mini-release evidence before M2-2 section.
evidence_path = Path('docs/SIMCORE_M2_LIVE_EVIDENCE.md')
evidence = evidence_path.read_text(encoding='utf-8')
evidence_section = f'''## M2-2 correctness insert — v{VERSION} {RELEASE_NAME}

Production baseline:

```text
Version: {VERSION}
Release: {RELEASE_NAME}
Release commit: {RELEASE_COMMIT}
Release blob: {RELEASE_BLOB}
Parent: v0.64.0 M2-2 Representation Ownership Split
Major checkpoint: M2-2 (unchanged)
```

Reason for insert: paired real long-chat summary requests established two different temporal-authority contracts. `ANNUAL_ONLY` must keep achievements inside the target year, while `CUMULATIVE_YOY` must use the requested previous-year-end baseline and complete previous/current/absolute/percentage comparisons. A visible CUMULATIVE_YOY response mixed two incompatible COSMIC historical baselines (`3,400만` and `720만`) and omitted some requested per-metric YoY deltas.

Implementation is deliberately request/prompt scoped: Lifecycle classifies `NONE / ANNUAL_ONLY / CUMULATIVE_YOY`, stores only pending metadata, and Prompt compiler v3 emits temporal authority. Recurrence and Lineage implementations remain frozen. Summary authority is explicitly above recurrence factual carryover while recurrence can still guide structure/style.

Release CI directly passed nine classifier fixtures plus Node syntax, latest/install equality, Contracts v2 architecture checks, and frozen M2-2 markers. Live semantic validation remains pending.

'''
anchor = '## M2-2 — v0.64.0 Representation Ownership Split'
if f'## M2-2 correctness insert — v{VERSION} {RELEASE_NAME}' not in evidence:
    if anchor not in evidence:
        raise SystemExit('M2 live evidence M2-2 anchor missing')
    evidence = evidence.replace(anchor, evidence_section + anchor, 1)
evidence_path.write_text(evidence, encoding='utf-8')

# Deferred ledger baseline only; existing evidence remains additive.
ledger_path = Path('docs/SIMCORE_DEFERRED_LEDGER.md')
ledger = ledger_path.read_text(encoding='utf-8')
ledger = ledger.replace('Production: v0.64.0 — M2-2 Representation Ownership Split', f'Production: v{VERSION} — {RELEASE_NAME} (M2-2 correctness insert)', 1)
ledger = ledger.replace('Primary current phase: M2-2 real long-chat ownership validation', 'Primary current phase: M2-2 final live validation + v0.64.1 summary-scope validation', 1)
if '### Summary Scope Authority live validation' not in ledger:
    watch_anchor = '## WATCH_ONLY anomalies'
    item = '''### Summary Scope Authority live validation

Status: `DEFERRED_NON_BLOCKING / ACTIVE_MINI_VALIDATION`

v0.64.1 adds request-scoped `ANNUAL_ONLY` versus `CUMULATIVE_YOY` temporal authority after direct long-chat evidence of annual-scope omission/contamination and an internally inconsistent historical baseline in a YoY summary. Re-run the natural annual-only and cumulative-YoY request families. Keep the repeated standalone-C lineage over-chain on WATCH; v0.64.1 intentionally does not patch Lineage/Recurrence implementation so the live result can separate temporal-scope authority from source-chain debt.

'''
    if watch_anchor not in ledger:
        raise SystemExit('Deferred ledger WATCH anchor missing')
    ledger = ledger.replace(watch_anchor, item + watch_anchor, 1)
ledger_path.write_text(ledger, encoding='utf-8')

# Scope comparison note: preserve the before/after test plan.
scope_path = Path('docs/SIMCORE_M2_LIVE_06400_SCOPE_COMPARE.md')
scope = scope_path.read_text(encoding='utf-8')
release_note = f'''\n## v{VERSION} production response to this evidence\n\nStatus: `PATCHED / LIVE REVALIDATION PENDING`\n\n```text\nrelease: {RELEASE_NAME}\ncommit: {RELEASE_COMMIT}\nblob: {RELEASE_BLOB}\nmajor checkpoint: M2-2 unchanged\n```\n\nThe patch adds deterministic `ANNUAL_ONLY / CUMULATIVE_YOY / NONE` request classification and scope-specific prompt authority. It does not reset or rewrite Lineage, alter Recurrence matching, parse/repair output bodies, or add persistent state. This preserves the existing over-chain and recurrence signals as attribution controls while testing whether explicit temporal authority alone fixes annual-only contamination and YoY baseline/coverage defects.\n'''
if f'## v{VERSION} production response to this evidence' not in scope:
    scope = scope.rstrip() + '\n' + release_note
scope_path.write_text(scope, encoding='utf-8')

# Live inbox: close the design-to-release loop without inventing live semantic success.
inbox_path = Path('docs/SIMCORE_M2_LIVE_06400_INBOX.md')
inbox = inbox_path.read_text(encoding='utf-8')
inbox_note = f'''\n## v{VERSION} mini-release checkpoint\n\nStatus: `PRODUCTION / STATIC GATE PASS / LIVE SEMANTIC VALIDATION PENDING`\n\nThe Summary Scope Authority mini was released from the evidence captured above. Static CI passed nine deterministic classifier fixtures, syntax/equality, Contracts v2, and frozen M2-2 controls. Do not mark the annual-only or cumulative-YoY quality defect resolved until fresh production RAW confirms the intended scope and factual coverage. Lineage over-chain remains intentionally unchanged and on WATCH.\n'''
if f'## v{VERSION} mini-release checkpoint' not in inbox:
    inbox = inbox.rstrip() + '\n' + inbox_note
inbox_path.write_text(inbox, encoding='utf-8')

# Guideline: update only the production baseline; release-specific details live elsewhere.
guide_path = Path('docs/SIMCORE_GUIDELINES.md')
guide = guide_path.read_text(encoding='utf-8')
pattern = re.compile(r'(## \d+\. Current Production Baseline.*?```text\n)(SimCore v[^\n]+)(\n```)', re.S)
guide, n = pattern.subn(rf'\1SimCore v{VERSION} — {RELEASE_NAME}\3', guide, count=1)
if n != 1:
    raise SystemExit('Guideline current production baseline not found')
guide_path.write_text(guide, encoding='utf-8')

print('SimCore v0.64.1 administrative sync: OK')
