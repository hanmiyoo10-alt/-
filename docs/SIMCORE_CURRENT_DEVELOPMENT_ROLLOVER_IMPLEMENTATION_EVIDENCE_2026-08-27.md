# SimCore Current Development Rollover — Implementation Evidence

Date: 2026-08-27
Status: **APPLIED · NON_RUNTIME · NR_DOC_ONLY · CURRENT SLIMMED · HISTORY PRESERVED · RELEASE BYTES UNCHANGED**

Design authority:
- `SIMCORE_CURRENT_DEVELOPMENT_SLIMMING_AND_HISTORY_ROLLOVER_DESIGN.md`

## 1. Scope

This transaction applies the frozen document-architecture split for `docs/CURRENT_DEVELOPMENT.md`.

It does not change:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
runtime behavior
persistent schema
provider routing
v0.64.8 live-gate result
M2-3 implementation state
```

The goal is lifecycle separation:

```text
CURRENT_DEVELOPMENT.md
→ LIVING_CURRENT only

closed detailed history
→ preserved outside the living file
```

## 2. Exact source boundary

Migration base:

```text
main parent commit: ec52c7510f9a12a24c6d1bac6cf655a7b645193b
CURRENT source path: docs/CURRENT_DEVELOPMENT.md
CURRENT source blob: 0d1413ebc0da79a5a7274f17ff4786bc9d850eb5
```

The source document contained both current R2.2-A machine-managed authority and extensive historical release/evidence content.

## 3. Lossless preservation first

Before slimming semantics are committed, the original CURRENT blob is reused directly at:

```text
docs/history/CURRENT_DEVELOPMENT_PRE_ROLLOVER_2026-08-27.md
```

The history path points to the same Git blob:

```text
0d1413ebc0da79a5a7274f17ff4786bc9d850eb5
```

Therefore the pre-rollover source is byte-identical. No historical wording is reconstructed from memory or rewritten as the only surviving evidence.

This snapshot preserves, among other material:

```text
Historical validated precursor — v0.63.55
Historical Validation Release Ledger
Major Roadmap old wording
Deferred / Waiting for Evidence old wording
Verified Evidence Ledger E-LIVE-055 / E1..E7
Known Unknowns old wording
Completed Major Milestones
Historical Release System v2 plan pointer
old Quick Resume wording
```

## 4. Release-family historical surfaces

Created:

```text
docs/history/SIMCORE_RELEASE_HISTORY_063.md
docs/history/SIMCORE_RELEASE_HISTORY_064.md
```

Role:

```text
POINT_IN_TIME_EVIDENCE
NON_AUTHORITATIVE for current production/gate truth
```

The family manifests provide:

- release chronology;
- historical release identities where known;
- exact original bounded section identities from the pre-rollover source;
- dedicated evidence pointers;
- notes showing which historical consequence remains an active current regression control.

The exact snapshot remains the lossless source when original wording or measurements are required.

## 5. Historical directory authority guard

Created:

```text
docs/history/README.md
```

It explicitly forbids deriving current production, live-gate, priority, or authorization from archive recency, highest version, file order, or old `PRODUCTION` wording.

No generated historical index was introduced because the frozen design requires a deterministic source/generation contract before such an index is promoted.

## 6. CURRENT slimming

`docs/CURRENT_DEVELOPMENT.md` is replaced by a living-only operational surface retaining:

```text
1. Current Production Snapshot machine-managed block
2. Current Release Live Gate machine-managed block
3. active v0.64.8 live-gate contract
4. active regression controls
5. immediate next / stop conditions
6. near-term roadmap
7. active deferred/WATCH items
8. current hard freeze
9. bounded historical navigation
10. current Quick Resume checklist
```

Removed from the living body as detailed historical accumulation:

```text
full historical release ledger
full old evidence ledger
full completed-milestone narratives
long v0.63.55 historical precursor narrative
superseded old Quick Resume release instructions
```

The removed detail remains available byte-for-byte in the exact pre-rollover snapshot and is mapped by the family manifests.

## 7. R2.2-A authority preservation

Before migration, machine-managed authority was:

```text
Current Production Snapshot
Version: 0.64.8
Release: Output-Complete Telemetry Checkpoint Repair
Release branch: release-simcore
Release commit: f5e29464452728f859a1a6a8191a846468353531
Release blob: bed3d5faff9641071cdd9003b67c45d42b3e32ee
Declared validation status: PENDING_REAL_LONG_CHAT
Major milestone/checkpoint: 2.0M / M2-2
```

and:

```text
Current Release Live Gate
Release transaction: simcore-v0.64.8-new-02
Production commit: f5e29464452728f859a1a6a8191a846468353531
Validation status: PENDING_REAL_LONG_CHAT
Current priority / live gate: 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
R lifecycle: REAL_RELEASE_LIVE_PENDING
```

The migration preserves both marker identities and all machine-managed field values exactly.

Historical files are not introduced as alternate/fallback current authority.

## 8. Living-prose drift repaired during migration

The pre-rollover human `Quick Resume` section still instructed the reader to run the v0.64.7 live gate even though the machine-managed blocks already identified v0.64.8 as production.

Because `Quick Resume` is living operational prose, not immutable point-in-time evidence, the slim CURRENT corrects that drift to:

```text
v0.64.8 natural output checkpoint proof
→ same-tab refresh
→ first natural request diagnostic
→ second natural request diagnostic
→ classify/close live gate
```

The old v0.64.7 Quick Resume wording remains preserved in the exact pre-rollover snapshot as historical source state.

## 9. Reference inventory

Repository code search before migration found:

```text
exact query: "CURRENT_DEVELOPMENT.md#"
result: 0
```

Therefore no verified inbound link targeted a specific Markdown anchor that would be stranded by heading removal.

A broader filename search found many references to `CURRENT_DEVELOPMENT.md`, but the path itself remains unchanged. Those references continue to resolve to the living authority as intended.

The migration therefore does not mass-rewrite generic inbound references merely because the file body became smaller.

## 10. Active regression residue retained

The living CURRENT keeps compact present-tense rules for historical behavior that still constrains current work, including:

```text
Representation exact-Fresh carryover fast reconcile
genuine-user-edit conservative rebuild
Summary Scope authority
Broadcast / Time / Frame contracts
provider cache UNVERIFIED wording
diagnostic episode review discipline
```

Detailed origin/evidence is moved behind historical pointers rather than duplicated indefinitely in the living file.

## 11. Exact files in the migration transaction

Intended bounded tree change:

```text
M docs/CURRENT_DEVELOPMENT.md
A docs/history/CURRENT_DEVELOPMENT_PRE_ROLLOVER_2026-08-27.md
A docs/history/SIMCORE_RELEASE_HISTORY_063.md
A docs/history/SIMCORE_RELEASE_HISTORY_064.md
A docs/history/README.md
A docs/SIMCORE_CURRENT_DEVELOPMENT_ROLLOVER_IMPLEMENTATION_EVIDENCE_2026-08-27.md
```

The exact snapshot path intentionally reuses the old CURRENT blob and therefore does not create a rewritten copy.

## 12. Acceptance disposition

Design acceptance contract disposition:

```text
A. CURRENT sufficient to resume current work without reading history first        PASS by construction
B. R2.2-A current authority singular and machine-readable                         PASS by exact marker/value preservation
C. removed historical detail has verified destination/provenance                   PASS via exact blob snapshot + family manifests
D. active regression controls remain compact/current with pointers                 PASS
E. required inbound moved-anchor references resolve                                PASS; exact-anchor search found none
F. historical documents create no current authority                                PASS by explicit authority guards
G. generated navigation non-authoritative                                          N/A; no generated index introduced
H. runtime/plugin/release mutation required                                         NONE
I. exact source/destination/files recorded                                          PASS
J. release validation/live correctness claimed by migration                         NO
```

## 13. Future rollover rule

After this first migration, do not allow CURRENT to re-accumulate closed release narratives.

At a release transition:

```text
new release becomes current
→ machine/current living state updates normally

previous detailed release material
→ classify ACTIVE_REGRESSION_REFERENCE vs ROLLOVER_ELIGIBLE
→ preserve under the appropriate history family / dedicated evidence
→ keep only current operative residue in CURRENT
```

Byte size may trigger review but never authorizes deletion or rollover by itself.

## 14. Final classification

```text
DOCUMENT_ARCHITECTURE_MIGRATION = APPLIED
CURRENT lifecycle               = LIVING_CURRENT
HISTORY preservation            = LOSSLESS SNAPSHOT + FAMILY MANIFESTS
CURRENT authority relocation    = NONE
RUNTIME EFFECT                  = NONE
RELEASE-SIMCORE EFFECT          = NONE
V0.64.8 LIVE GATE EFFECT        = NONE
M2-3 AUTHORIZATION              = NONE
```
