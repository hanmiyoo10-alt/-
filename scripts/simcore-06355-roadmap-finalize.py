from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


# Keep the permanent release-memory synchronizer aware of the current priority.
sync_path = Path('scripts/simcore-sync-memory.py')
sync = sync_path.read_text(encoding='utf-8')
if "'0.63.55': 'REPRESENTATION_FAST_RECONCILE_VALIDATION'" not in sync:
    sync = replace_once(
        sync,
        "priority_by_version = {\n    '0.63.54': 'SAFE_ENVELOPE_STRUCTURAL_BOUNDARY_RECONCILE_VALIDATION',\n}",
        "priority_by_version = {\n    '0.63.54': 'SAFE_ENVELOPE_STRUCTURAL_BOUNDARY_RECONCILE_VALIDATION',\n    '0.63.55': 'REPRESENTATION_FAST_RECONCILE_VALIDATION',\n}",
        'sync priority map',
    )
sync_path.write_text(sync, encoding='utf-8')


dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')

dev = replace_once(
    dev,
    "`v0.63.54` is stable in the current long-chat validation run.",
    "`v0.63.55` is the current production release. Static release gates passed; real long-chat validation of the new request-side fast path is pending.",
    'production verdict',
)

dev = replace_once(
    dev,
    "The next release should target this **next-turn false manual-edit rebuild**, not broaden output normalization.",
    "v0.63.55 now targets this **next-turn false manual-edit rebuild** directly. The next task is to validate that confirmed Fresh carryover takes the fast path while genuine user edits still rebuild.",
    'highest-value problem status',
)

dev = replace_once(
    dev,
    "# 2. Immediate Next Release\n\n## v0.63.55 — Representation Fast Reconcile\n\nStatus: **NEXT VALIDATED RELEASE CANDIDATE**",
    "# 2. Current Validation Release\n\n## v0.63.55 — Representation Fast Reconcile\n\nStatus: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**",
    'section 2 deployment status',
)

dev = replace_once(
    dev,
    "If every gate passes, reconcile the expected previous representation to the already-known Fresh identity without running the expensive full manual-edit reconstruction.",
    "If every gate passes, accept the already-recorded Fresh identity as a request-side representation alias for that exact slot/location and skip the expensive full manual-edit reconstruction. The canonical CoreSession state is intentionally left untouched.",
    'fast-path semantics',
)

dev = replace_once(
    dev,
    "Edit reconcile: REPRESENTATION_FAST_RECONCILED · <small cost>\nPrior representation: OUTPUT_MISMATCH\nEdit origin: REPRESENTATION_DRIFT_CORRELATED\nEdit delta: vs canonical <delta> · vs fresh +0 · shape FRESH_EXACT_CARRYOVER\nRepresentation reconcile: ADOPTED_FRESH\npersistent NONE",
    "Edit reconcile: REPRESENTATION_FAST_RECONCILED · <small cost> · snapshot UNCHANGED · representation fresh-exact-carryover\nPrior representation: OUTPUT_MISMATCH\nEdit origin: REPRESENTATION_DRIFT_CORRELATED\nEdit delta: vs canonical <delta> · vs fresh +0 · shape FRESH_EXACT_CARRYOVER",
    'actual diagnostic shape',
)

dev = replace_once(
    dev,
    "- **A1 / v0.63.55:** Representation Fast Reconcile.",
    "- **A1 / v0.63.55:** Representation Fast Reconcile — deployed; real long-chat validation pending.",
    'phase A status',
)

milestone_anchor = "## Repository Product Root Isolation — Phase 1"
if "## v0.63.55 — Representation Fast Reconcile" not in dev.split('# 9. Completed Major Milestones', 1)[-1]:
    milestone = '''## v0.63.55 — Representation Fast Reconcile

Added a request-side fast reconcile for one fully proven representation case:

```text
previous output = OUTPUT_MISMATCH
current visible == prior FRESH_CHAT EXACT
same assistant slot/location provenance
live CoreSession still anchored to prior canonical identity
```

When all gates hold, SimCore reports `REPRESENTATION_FAST_RECONCILED`, keeps the canonical state untouched, performs no snapshot write, and skips the full manual-edit rebuild. Any missing/stale/third representation still falls back to the existing path.

Frozen positive control:

```text
genuine user edit
current != prior canonical
current != prior Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

Release identity:

```text
release-simcore commit 6156685a3edf0ec0c5017900a82990d4f17dfb49
production blob 8c42851df34831465403d12fc57c7499923bdbc6
```

Real long-chat activation remains the current validation target.

'''
    dev = replace_once(dev, milestone_anchor, milestone + milestone_anchor, 'completed milestone insertion')

dev = replace_once(
    dev,
    "Current promoted next action:\n\n```text\nv0.63.55 — Representation Fast Reconcile\n```\n\nCurrent reason:\n\n```text\nconfirmed Fresh exact carryover after OUTPUT_MISMATCH\n→ false MANUAL_EDIT_REBUILT\n→ 4.091 s and 6.257 s observed request-delay cases\n```",
    "Current promoted next action:\n\n```text\nValidate v0.63.55 — Representation Fast Reconcile in natural long chat\n```\n\nCurrent success condition:\n\n```text\nprior OUTPUT_MISMATCH + current == prior FRESH_CHAT EXACT\n→ REPRESENTATION_FAST_RECONCILED\n→ snapshot UNCHANGED\n→ no 4–6 s MANUAL_EDIT_REBUILT\n\ngenuine user edit\n→ USER_EDIT_CANDIDATE\n→ MANUAL_EDIT_REBUILT preserved\n```",
    'quick resume action',
)

dev_path.write_text(dev, encoding='utf-8')

print('SimCore v0.63.55 roadmap and permanent sync priority finalized')
