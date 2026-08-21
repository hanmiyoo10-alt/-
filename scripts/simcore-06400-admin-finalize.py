#!/usr/bin/env python3
from pathlib import Path


def replace_if_present(text: str, old: str, new: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    return text


# CURRENT_DEVELOPMENT: remove stale current-production language from historical sections.
dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')
dev = replace_if_present(
    dev,
    "v0.63.55 validated this **next-turn false manual-edit rebuild** fix in natural long chat. M2-1 remains the active architectural baseline under `v0.63.57`; the current task is to validate the chronology guard while continuing to preserve the validated fast path, genuine-user-edit behavior, and ordinary A/B/C operation.",
    "v0.63.55 validated this **next-turn false manual-edit rebuild** fix in natural long chat and now serves as a frozen regression control. The active checkpoint is M2-2 (`v0.64.0`); the current task is to validate the new Representation ownership boundary while preserving the validated fast path, genuine-user-edit behavior, and ordinary A/B/C operation.",
)
dev = replace_if_present(
    dev,
    "## v0.63.58 — Narrative Tail Time Contract\n\nStatus: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**",
    "## v0.63.58 — Narrative Tail Time Contract\n\nStatus: **SUPERSEDED BY v0.64.0 · HISTORICAL CONTRACT / REGRESSION EVIDENCE**",
)
dev = replace_if_present(
    dev,
    "## v0.63.57 — Current Timeline Authority Guard\n\nStatus: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**",
    "## v0.63.57 — Current Timeline Authority Guard\n\nStatus: **SUPERSEDED BY v0.64.0 · HISTORICAL CONTRACT / REGRESSION EVIDENCE**",
)
dev = replace_if_present(
    dev,
    "## M2-1 — Recovery Boundary Split\n\nStatus: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**",
    "## M2-1 — Recovery Boundary Split\n\nStatus: **SUPERSEDED BY M2-2 · SUPPORTED REAL LONG-CHAT REGRESSION BASELINE**",
)

m59 = '''## v0.63.59 — Broadcast End Closure Contract

Status: **SUPERSEDED BY v0.64.0 · DIRECT PARENT / FROZEN REGRESSION CONTRACT**

`v0.63.59` is the direct production parent of M2-2. It closed the B_END terminal-airtime/structure contract before Representation ownership movement resumed.

```text
Version: 0.63.59
Release: Broadcast End Closure Contract
Release commit: 7c0f6f4a8e0b7e42a5996dc7bacd149f27e3751d
Release blob: da47e5d8123c0abfe9902f016c84ac758f766032
```

The motivating long-chat B_END showed an explicit allowed broadcast end and visible progression to the terminal airtime while persisted airtime remained at the opening frame. The release requires an explicit canonical terminal timestamp for B_END and keeps the COMMUNITY closure contract at exactly two blocks with three platform sections each. M2-2 does not alter this behavior.

'''
marker = "## v0.63.58 — Narrative Tail Time Contract\n"
if "## v0.63.59 — Broadcast End Closure Contract" not in dev:
    if marker not in dev:
        raise SystemExit('CURRENT_DEVELOPMENT v0.63.58 marker missing')
    dev = dev.replace(marker, m59 + marker, 1)

dev = replace_if_present(
    dev,
    "Observed in runtime `mt19j4wz-2a7t5e`:",
    "Historical precursor evidence retained below (not v0.64.0 live validation), observed in runtime `mt19j4wz-2a7t5e`:",
)
dev_path.write_text(dev.rstrip() + '\n', encoding='utf-8')


# Human Contracts v2: update physical-state wording now that M2-1/M2-2 are real.
contracts_path = Path('docs/SIMCORE_CONTRACTS_V2.md')
contracts = contracts_path.read_text(encoding='utf-8')
contracts = replace_if_present(
    contracts,
    "M1 is intentionally non-behavioral. It defines the target contract and adds a CI drift guard, but it does not move the v0.63.55 code currently under live validation.",
    "M1 was intentionally non-behavioral. At M1 completion it defined the target contract and CI drift guard without moving the then-current v0.63.55 runtime; later physical M2 checkpoints are recorded below.",
)
contracts = replace_if_present(
    contracts,
    "Application\n  prompt / session / current recovery\n  edit-reconcile / output-compat / bootstrap-migration (planned)",
    "Application\n  prompt / session / recovery compatibility facade\n  output-compat / bootstrap-migration (physical since M2-1)\n  edit-reconcile (planned after M2-2 live gate)",
)
contracts = replace_if_present(
    contracts,
    "Current `recovery` is a legacy container with two real execution phases.",
    "The legacy `recovery` container was physically split in M2-1 and now remains as a compatibility facade over two execution-phase modules.",
)
contracts = replace_if_present(contracts, "### Planned `output-compat`", "### Physical `output-compat` — since M2-1")
contracts = replace_if_present(contracts, "### Planned `bootstrap-migration`", "### Physical `bootstrap-migration` — since M2-1")
contracts = replace_if_present(
    contracts,
    "This split should initially be mechanical: move responsibility without changing decisions, ordering, storage behavior, output bytes, or diagnostics meaning.",
    "M2-1 performed this split mechanically: responsibility moved without intentionally changing decisions, ordering, storage behavior, output bytes, or diagnostics meaning. The compatibility facade remains until later transition cleanup is independently validated.",
)
contracts = replace_if_present(
    contracts,
    "Exit condition for M2-1: real long-chat behavior remains stable with no new warning/rebuild class attributable to the split. Only after that evidence may M2 continue to Representation/Edit ownership movement.",
    "M2-1 exit evidence is now supported by real long-chat ordinary paths, conservative mismatch handling, and the v0.63.55 Representation Fast Reconcile regression gate. M2 therefore advanced to the separate M2-2 Representation ownership checkpoint; Edit Reconcile extraction remains gated on M2-2 live evidence.",
)
contracts_path.write_text(contracts.rstrip() + '\n', encoding='utf-8')


# M2 live evidence: fill the direct v0.63.59 parent gap without pretending it is v0.64 live evidence.
evidence_path = Path('docs/SIMCORE_M2_LIVE_EVIDENCE.md')
evidence = evidence_path.read_text(encoding='utf-8')
m59_evidence = '''## Pre-M2-2 mini patch — v0.63.59 Broadcast End Closure Contract

Production baseline:

```text
Version: 0.63.59
Release: Broadcast End Closure Contract
Release commit: 7c0f6f4a8e0b7e42a5996dc7bacd149f27e3751d
Release blob: da47e5d8123c0abfe9902f016c84ac758f766032
```

### Triggering direct long-chat evidence

A natural 24-hour broadcast sequence reached B_END with end authority correctly allowing the explicit closure and unlocking the session. The visible response began at the `08:30 AM` frame and progressed through remaining-time cues to the `09:00 AM` terminal end, but the stored broadcast airtime remained `08:30 AM` because no later canonical terminal timestamp was committed.

The same evidence family also established the intended B_END structural closure as:

```text
2 COMMUNITY blocks
× exactly 3 platform sections each
```

`v0.63.59` therefore requires the terminal current broadcast airtime to be represented by a canonical timestamp line at B_END and makes terminal-time coverage independently diagnosable from end-authority/unlock success. It does not infer arbitrary prose time.

This release is the direct production parent of M2-2. Its behavior is a frozen regression contract during Representation ownership validation.

'''
marker = "## Pre-M2-2 mini patch — v0.63.58 Narrative Tail Time Contract\n"
if "## Pre-M2-2 mini patch — v0.63.59 Broadcast End Closure Contract" not in evidence:
    if marker not in evidence:
        raise SystemExit('M2 evidence v0.63.58 marker missing')
    evidence = evidence.replace(marker, m59_evidence + marker, 1)
evidence_path.write_text(evidence.rstrip() + '\n', encoding='utf-8')


# Deferred ledger: advance only the live baseline/current-next-phase wording; keep historical entries intact.
deferred_path = Path('docs/SIMCORE_DEFERRED_LEDGER.md')
deferred = deferred_path.read_text(encoding='utf-8')
deferred = replace_if_present(
    deferred,
    "Production: v0.63.59 — Broadcast End Closure Contract\nPrimary next phase: M2-2 Representation Ownership Split\nNatural B_END revalidation: DEFERRED / NON-BLOCKING",
    "Production: v0.64.0 — M2-2 Representation Ownership Split\nPrimary current phase: M2-2 real long-chat ownership validation\nNext physical move: Edit Reconcile extraction only after M2-2 live gate\nNatural B_END revalidation: DEFERRED / NON-BLOCKING",
)
deferred = replace_if_present(
    deferred,
    "v0.63.59 addresses the exact B_END closure boundary. Natural revalidation is desirable but does not block M2-2.",
    "v0.63.59 addresses the exact B_END closure boundary. Natural revalidation remains desirable but does not block M2-2 live validation or, by itself, justify delaying the Representation ownership checkpoint.",
)
deferred = replace_if_present(
    deferred,
    "Revisit if M2-2 touches migration ownership.",
    "M2-2 did not touch migration ownership. Revisit only when a later checkpoint changes bootstrap/migration coordination or a natural legacy path exposes new evidence.",
)
deferred_path.write_text(deferred.rstrip() + '\n', encoding='utf-8')


# Guideline: current freeze wording must match the actual M2-2 investigation, not the older cache-only phase.
guide_path = Path('docs/SIMCORE_GUIDELINES.md')
guide = guide_path.read_text(encoding='utf-8')
guide = replace_if_present(
    guide,
    "Unless new evidence directly requires otherwise, keep these areas frozen during the current cache investigation:",
    "Unless new evidence directly requires otherwise, keep these areas frozen during the current M2-2 live-validation checkpoint and any parallel cache observation:",
)
guide = replace_if_present(guide, "Runtime placement\nCompiler tier semantics", "Runtime prompt placement\nCompiler tier semantics")
guide_path.write_text(guide.rstrip() + '\n', encoding='utf-8')

print('SimCore v0.64.0 administrative finalization complete')
