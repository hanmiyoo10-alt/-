#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
from pathlib import Path

VERSION = "0.64.0"
RELEASE_NAME = "M2-2 Representation Ownership Split"
RELEASE_COMMIT = os.environ["RELEASE_COMMIT"]
RELEASE_BLOB = os.environ["RELEASE_BLOB"]
PRIORITY = "06400_M2_2_REPRESENTATION_OWNERSHIP_LIVE_VALIDATION"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, got {count}")
    return text.replace(old, new, 1)


def insert_once(text: str, marker: str, block: str, label: str) -> str:
    if block.strip() in text:
        return text
    if marker not in text:
        raise SystemExit(f"{label}: marker missing")
    return text.replace(marker, block + marker, 1)


# ---------------------------------------------------------------------------
# product-manifest.json
# ---------------------------------------------------------------------------
manifest_path = Path("product-manifest.json")
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest.update({
    "production_version": VERSION,
    "release_name": RELEASE_NAME,
    "release_branch": "release-simcore",
    "release_commit": RELEASE_COMMIT,
    "release_blob": RELEASE_BLOB,
    "current_priority": PRIORITY,
    "provider_cache_status": manifest.get("provider_cache_status", "UNVERIFIED"),
    "validation_status": "PENDING_REAL_LONG_CHAT",
    "major_update_milestone": "2.0M",
    "major_update_phase": "M2",
    "major_update_checkpoint": "M2-2",
    "managed_by": ".github/workflows/simcore-release-state-sync.yml + simcore-06400-admin-sync",
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# config/simcore-architecture-v2.json
# ---------------------------------------------------------------------------
contract_path = Path("config/simcore-architecture-v2.json")
contract = json.loads(contract_path.read_text(encoding="utf-8"))
contract["production_baseline"] = {
    "version": VERSION,
    "release_name": RELEASE_NAME,
    "release_commit": RELEASE_COMMIT,
    "release_blob": RELEASE_BLOB,
}
major = contract.setdefault("major_update", {})
major.update({
    "milestone": "2.0M",
    "phase": "M2",
    "status": "M2_2_RELEASED_PENDING_LIVE_VALIDATION",
    "checkpoint": "M2-2",
    "runtime_refactor_authorized": True,
})
if isinstance(major.get("m2_1_release"), dict):
    major["m2_1_release"]["live_validation"] = "SUPPORTED_REAL_LONG_CHAT"
major["m2_2_release"] = {
    "version": VERSION,
    "release_commit": RELEASE_COMMIT,
    "release_blob": RELEASE_BLOB,
    "scope": "mechanical representation ownership split only",
    "static_validation": "PASS",
    "live_validation": "PENDING",
    "rollback_parent": "0.63.59",
}
modules = contract.setdefault("modules", {})
representation = modules["representation"]
representation.update({
    "physical": "required",
    "status": "m2_2_physical_pending_live_validation",
    "owns": "exact fingerprint identity, CANONICAL/HOST_RAW/FRESH_CHAT relations, bounded provenance and exact carryover classification",
})
representation["principle"] = "Fresh is identity evidence, not a body source."

runtime_mirror = modules["runtime-mirror"]
runtime_mirror.update({
    "status": "narrowed_m2_2",
    "owns": "fresh-chat read plus strict identity/location/staleness mirror guard and mirror write scheduling",
    "m2_target": [
        "representation_provenance_move_completed_in_m2_2",
        "keep_host_read_and_mirror_write_here",
    ],
})
excludes = list(runtime_mirror.get("excludes", []))
for item in ["representation taxonomy ownership", "bounded representation provenance ownership"]:
    if item not in excludes:
        excludes.append(item)
runtime_mirror["excludes"] = excludes

session = modules["session"]
s_excludes = [x for x in session.get("excludes", []) if x != "future representation classification ownership"]
if "representation classification ownership" not in s_excludes:
    s_excludes.append("representation classification ownership")
session["excludes"] = s_excludes

edit_reconcile = modules.get("edit-reconcile")
if isinstance(edit_reconcile, dict):
    edit_reconcile["status"] = "m2_next_after_representation_live_gate"

contract_path.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# docs/CURRENT_DEVELOPMENT.md
# ---------------------------------------------------------------------------
dev_path = Path("docs/CURRENT_DEVELOPMENT.md")
dev = dev_path.read_text(encoding="utf-8")
begin = "<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->"
end = "<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->"
if dev.count(begin) != 1 or dev.count(end) != 1:
    raise SystemExit("CURRENT_DEVELOPMENT production snapshot markers missing/ambiguous")

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
dev = re.sub(re.escape(begin) + r".*?" + re.escape(end), snapshot, dev, count=1, flags=re.S)

verdict_re = re.compile(r"(## Production verdict\n\n)(.*?)(?=\n\n(?:Observed|##|---))", re.S)
verdict = (
    "`v0.64.0` is the current production release and the M2-2 physical checkpoint. "
    "It moves bounded CANONICAL / HOST_RAW / FRESH_CHAT representation provenance and exact carryover classification out of Runtime Mirror / the outer shell into a first-class memory-only `representation` module. "
    "Runtime Mirror remains the host-facing Fresh observer and strict identity/location/staleness mirror transport boundary. "
    "The v0.63.55 representation-fast decision semantics, genuine-user-edit rebuild path, v0.63.56 Recovery split, v0.63.57/.58 timeline contracts, and v0.63.59 Broadcast closure contract remain frozen regression controls. "
    "Static/architecture validation passed; real long-chat validation is pending."
)
if verdict_re.search(dev):
    dev = verdict_re.sub(r"\1" + verdict, dev, count=1)
else:
    raise SystemExit("CURRENT_DEVELOPMENT Production verdict block not found")

m2_section = f'''## v0.64.0 — M2-2 Representation Ownership Split

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

Production identity:

```text
Version: {VERSION}
Release: {RELEASE_NAME}
Release commit: {RELEASE_COMMIT}
Release blob: {RELEASE_BLOB}
Parent production baseline: v0.63.59 Broadcast End Closure Contract
```

This is a mechanical ownership checkpoint, not a feature release.

```text
Before
Runtime Mirror
├─ Fresh observation / mirror transport
└─ bounded representation provenance ledger

Outer request shell
└─ prior/current representation taxonomy + carryover shape

After M2-2
Representation
├─ bounded fingerprint-only provenance ledger
├─ CANONICAL / HOST_RAW / FRESH_CHAT relation taxonomy
├─ prior representation classification
├─ current exact carryover classification
└─ fingerprint-length deltas / carryover shape

Runtime Mirror
├─ Fresh chat observation
├─ strict identity/location/staleness guards
└─ mirror write scheduling
```

Static checkpoint evidence:

```text
node syntax latest/install          PASS
latest.js == install.js             PASS
Contracts v2 architecture checker   PASS
representation module present       PASS
runtime-mirror provenance API gone  PASS
Fresh raw body retention             NONE
persistent schema change             NONE
new host/network/timer surfaces      NONE
```

Frozen behavioral controls that must remain unchanged in live validation:

```text
Prior OUTPUT_MISMATCH + current == prior FRESH_CHAT exact
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

Prior EXACT + current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT

Deferred Mirror unknown representation
→ conservative OUTPUT_MISMATCH / no unsafe mirror write
```

New diagnostic ownership line:

```text
Representation ownership: REPRESENTATION · ledger <N> · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED
```

Live gate before M2 advances to Edit Reconcile extraction:

1. ordinary A/C/B turns keep stable request/output/binding/mirror behavior;
2. a normal exact carryover remains `SAME_FAST` / `Edit origin NONE`;
3. when a natural CANONICAL↔FRESH mismatch occurs, exact Fresh carryover still reaches `REPRESENTATION_FAST_RECONCILED` without the old multi-second rebuild;
4. a genuine user edit still reaches `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`;
5. no regression appears in Recovery, timeline, Broadcast closure, Frame, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history observation, or persistent schema.

Do not start physical `edit-reconcile` extraction until this checkpoint has direct real-long-chat evidence.

'''
marker = "# 2. Current Validation Release\n\n"
if "## v0.64.0 — M2-2 Representation Ownership Split" not in dev:
    if marker not in dev:
        raise SystemExit("CURRENT_DEVELOPMENT validation marker missing")
    dev = dev.replace(marker, marker + m2_section, 1)

dev_path.write_text(dev, encoding="utf-8")


# ---------------------------------------------------------------------------
# docs/SIMCORE_GUIDELINES.md
# ---------------------------------------------------------------------------
guide_path = Path("docs/SIMCORE_GUIDELINES.md")
guide = guide_path.read_text(encoding="utf-8")
baseline_re = re.compile(r"(## 44\. Current Production Baseline.*?```text\n)(SimCore v[^\n]+)(\n```)", re.S)
guide, count = baseline_re.subn(rf"\1SimCore v{VERSION} — {RELEASE_NAME}\3", guide, count=1)
if count != 1:
    raise SystemExit(f"guideline production baseline match count={count}")

ownership_section = '''## 47A. Representation Ownership Boundary

As of M2-2, representation identity/provenance is a first-class memory-only boundary.

```text
Representation owns
- bounded CANONICAL / HOST_RAW / FRESH_CHAT fingerprint provenance
- prior representation taxonomy
- exact current carryover classification
- fingerprint delta / carryover shape metadata

Runtime Mirror owns
- Fresh host observation
- strict location / identity / staleness guards
- mirror transport and write scheduling

Edit Reconcile owns (current implementation location may still be transitional)
- the decision to accept a known representation alias or rebuild state
```

Non-negotiable invariant:

> **Fresh is identity evidence, never a body source.**

Therefore Representation must not retain raw Fresh bodies, mutate chat/history, create persistent Core fields, or add host/network/timer surfaces. Runtime Mirror must not regain bounded provenance/taxonomy ownership merely for convenience. When ownership moves again, diagnostics and Contracts v2 must move with it.

'''
part_marker = "---\n\n# Part XVII — Guideline Update Protocol"
if "## 47A. Representation Ownership Boundary" not in guide:
    guide = insert_once(guide, part_marker, ownership_section, "guideline representation ownership insertion")

changelog_entry = f'''## 2026-08-21 — v0.64.0 M2-2 Representation Ownership Split

- Advanced the production baseline to `v0.64.0 — {RELEASE_NAME}`.
- Promoted Representation from a planned Contracts v2 boundary to a physical memory-only subsystem.
- Moved bounded CANONICAL/HOST_RAW/FRESH_CHAT provenance ownership and exact carryover classification out of Runtime Mirror while keeping Fresh observation and mirror transport there.
- Preserved the `REPRESENTATION_FAST_RECONCILED` and genuine `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT` paths as frozen live regression controls.
- Reaffirmed that Fresh is identity evidence, never a raw-body source, and that no persistent schema/host/network/timer surface was added.

'''
changelog_marker = "# Guideline Changelog\n\n"
if "## 2026-08-21 — v0.64.0 M2-2 Representation Ownership Split" not in guide:
    if changelog_marker not in guide:
        raise SystemExit("guideline changelog marker missing")
    guide = guide.replace(changelog_marker, changelog_marker + changelog_entry, 1)

guide_path.write_text(guide, encoding="utf-8")


# ---------------------------------------------------------------------------
# docs/SIMCORE_CONTRACTS_V2.md
# ---------------------------------------------------------------------------
contracts_path = Path("docs/SIMCORE_CONTRACTS_V2.md")
human = contracts_path.read_text(encoding="utf-8")
human = re.sub(
    r"> Production baseline: `v[^`]+`",
    f"> Production baseline: `v{VERSION} — {RELEASE_NAME}`",
    human,
    count=1,
)
human = human.replace("Representation\n  representation (planned)", "Representation\n  representation (physical since M2-2)", 1)
human = human.replace("`representation` is a planned first-class subsystem.", "`representation` is a physical first-class subsystem as of M2-2 (`v0.64.0`).", 1)

old_runtime_move = '''Move later:

```text
representation relation classification
bounded representation provenance ownership
```

Deferred Mirror safety behavior itself remains frozen.'''
new_runtime_move = '''Moved in M2-2:

```text
representation relation classification
bounded representation provenance ownership
```

These now belong to the memory-only `representation` subsystem. Runtime Mirror keeps Fresh host observation plus strict identity/location/staleness gates and mirror write scheduling. Deferred Mirror safety behavior itself remains frozen.'''
if old_runtime_move in human:
    human = human.replace(old_runtime_move, new_runtime_move, 1)

order_re = re.compile(r"## 11\. M2 Mechanical Order\n\nAfter live authorization:\n\n```text\n.*?```\n\nEach step gets its own checkpoint\. New feature behavior must not be mixed into a mechanical move\.", re.S)
new_order = '''## 11. M2 Mechanical Order

Actual staged order after live authorization:

```text
M2-1 — completed in v0.63.56
Recovery boundary split:
recovery → output-compat + bootstrap-migration + compatibility facade

Pre-M2-2 correctness inserts — v0.63.57..v0.63.59
Current Timeline Authority / Narrative Tail Time / Broadcast End Closure
(no Representation/Edit ownership movement)

M2-2 — physical in v0.64.0, live validation pending
Extract Representation ownership from runtime-mirror / outer shell

M2-3 — planned only after M2-2 live gate
Extract Edit Reconcile from outer shell + Session

M2-4
Narrow Session and remaining Runtime Mirror orchestration contracts

M2-5+
Remove transition code only after equivalence evidence and shrink Contracts v2 exceptions as real source edges disappear
```

Each step gets its own checkpoint. New feature behavior must not be mixed into a mechanical move.'''
human, count = order_re.subn(new_order, human, count=1)
if count != 1:
    raise SystemExit(f"Contracts v2 M2 order match count={count}")

m2_2_human = f'''

---

## 16. M2-2 Physical Checkpoint — Representation Ownership Split

Production `v{VERSION}` materializes the planned Representation boundary.

```text
representation
├─ bounded fingerprint-only provenance ledger
├─ prior CANONICAL/HOST_RAW/FRESH_CHAT relation taxonomy
├─ exact current carryover classification
└─ fingerprint delta / shape metadata
```

Runtime Mirror no longer owns or exposes the provenance ledger. It keeps:

```text
Fresh chat observation
strict identity/location/staleness gates
mirror write scheduling
```

The outer request shell consumes Representation facts but the Edit Reconcile decision tree itself is **not yet physically extracted**. That is the next planned checkpoint only after live equivalence evidence.

Frozen positive controls:

```text
OUTPUT_MISMATCH + exact prior FRESH carryover
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

Prior EXACT + unknown edited representation
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

Static checkpoint validation passed before release: both installable files were syntax-valid and identical, Contracts v2 passed against the new module graph, Runtime Mirror's provenance API was removed, and no new persistent/host/network/timer surface was introduced.

Live status: **PENDING REAL LONG-CHAT VALIDATION**.
'''
if "## 16. M2-2 Physical Checkpoint — Representation Ownership Split" not in human:
    human = human.rstrip() + m2_2_human + "\n"
contracts_path.write_text(human, encoding="utf-8")


# ---------------------------------------------------------------------------
# docs/SIMCORE_M2_LIVE_EVIDENCE.md
# ---------------------------------------------------------------------------
evidence_path = Path("docs/SIMCORE_M2_LIVE_EVIDENCE.md")
evidence = evidence_path.read_text(encoding="utf-8")
m2_evidence = f'''## M2-2 — v0.64.0 Representation Ownership Split

Production baseline:

```text
Version: {VERSION}
Release: {RELEASE_NAME}
Release commit: {RELEASE_COMMIT}
Release blob: {RELEASE_BLOB}
Parent: v0.63.59 Broadcast End Closure Contract
```

### Release/CI checkpoint evidence — not yet live runtime evidence

The staged checkpoint moved bounded representation identity/provenance ownership without moving Edit Reconcile behavior.

```text
new physical module: representation
bounded provenance ledger owner: representation
Runtime Mirror provenance ledger/API: removed
Runtime Mirror Fresh observation + mirror transport: retained
raw Fresh body retention: none
persistent schema change: none
host/network/timer surface change: none
```

Pre-release static validation:

```text
patch application                    PASS
node --check latest.js               PASS
node --check install.js              PASS
latest.js == install.js              PASS
Contracts v2 architecture checker    PASS
v0.63.55 fast-path markers retained  PASS
genuine user-edit markers retained   PASS
v0.63.59 closure markers retained    PASS
```

The new diagnostic exposes the physical boundary directly:

```text
Representation ownership: REPRESENTATION · ledger <N> · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED
```

### Live validation status

`PENDING_REAL_LONG_CHAT`.

Required direct evidence before the next physical Edit Reconcile move:

```text
ordinary exact carryover
→ SAME_FAST / Edit origin NONE

natural CANONICAL != FRESH followed by exact Fresh carryover
→ Prior OUTPUT_MISMATCH
→ current FRESH_CHAT
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

genuine visible user edit
→ Prior EXACT
→ current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT

Deferred Mirror unknown representation
→ conservative OUTPUT_MISMATCH / unsafe mirror write blocked
```

Do not infer those live results from CI. The static checkpoint proves source/contract shape only.

'''
intro = "This file records production diagnostics gathered during the staged 2.0M Major refactor. It is evidence-only: do not infer behavior that the captured diagnostics did not exercise.\n\n"
if "## M2-2 — v0.64.0 Representation Ownership Split" not in evidence:
    if intro not in evidence:
        raise SystemExit("M2 evidence intro marker missing")
    evidence = evidence.replace(intro, intro + m2_evidence, 1)
evidence_path.write_text(evidence, encoding="utf-8")

print("SimCore v0.64.0 administrative state synchronized")
