# SimCore Post-Architecture Next Element Menu — 2026-08-26

Status: `ROADMAP / ADMIN MAP · ARCHITECTURE RESEARCH CLOSED · DOC-ONLY DRIFT CLOSED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority: `release-simcore` v0.64.7.

Related:
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_ARCHITECTURE_DESIGN_RESEARCH_COMPLETENESS_AUDIT_2026-08-26.md`
- `docs/SIMCORE_NEXT_FOCUS_REFRESH_AFTER_RESEARCH_CLOSES_2026-08-26.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`
- `docs/SIMCORE_DIAGNOSTIC_UX_PREIMPLEMENTATION_CLOSE_2026-08-25.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`

## 1. Purpose

Broad SimCore architecture design research is closed for the current source/evidence set.

The next useful work is therefore not another horizontal architecture framework. The remaining product/repository space is grouped into distinct elements so future work can select one without mixing unrelated scopes.

## 2. Element A — Permanent regression evidence implementation

Status: `IMPLEMENTATION READY · NON-RUNTIME`

Frozen order:

```text
1. summary-scope
2. narrative-clock
3. frame
4. broadcast-closure lifecycle/airtime expansion
```

Characteristics:

```text
uses existing permanent harness
no runtime artifact change required
no release-simcore deployment solely for fixture work
one fixture family per bounded work item
```

This is the cleanest work that can proceed independently of runtime live validation when selected.

## 3. Element B — Diagnostic UX narrow product slices

Status: `DESIGN READY · BROAD RESEARCH CLOSED`

Candidates:

```text
MINI_WARNING_WIDGET_V1
Diagnostic Snapshot Freshness repair
```

Rules:

```text
select one narrow slice
no broad diagnostic framework rewrite
reuse existing observations/validators
no second polling/validation authority
runtime release workflow applies if plugin bytes change
```

## 4. Element C — Natural-evidence WATCH families

Status: `WAIT FOR INFORMATIVE SPECIMEN`

Families:

```text
long-chat Store/backend latency variance
CORE_HANDSHAKE_TRANSIENT_MISS
PRE_SIMCORE host-history frontier
Gemini/provider cache authority
explicit flashback natural validation
Summary Scope rendered semantics
Reaction stale-scale fallback
Community platform-family diversity
GENERATION_SEMANTIC_EXCURSION
PARTIAL_PREVIOUS_TURN_REPLAY
```

These are not invitations for more framework design.

Canonical rule:

```text
new informative natural evidence
→ preserve immediately
→ classify WATCH / DEFER / FIX / BLOCKER
→ reopen only the narrow affected contract
```

## 5. Element D — Bounded transition-debt cleanup

Status: `MILESTONE / TRIGGER BASED`

Examples already mapped:

```text
TD-13 Prompt read-only compile boundary
TD-14 structured Evidence eligibility handoff
TD-05 Representation / Output Compat label coupling
TD-08 transient Session receipt placement
TD-09 Kernel upward dependency edges
Recovery facade retirement
Session Store-housekeeping placement
```

These are not one cleanup release.

Each must be a separate mechanical work item when its trigger is reached.

## 6. Element E — M2 implementation path

Status: `RUNTIME PATH · CURRENT LIVE GATE FIRST`

Canonical sequence:

```text
v0.64.7 real-long-chat close
→ M2-3 Edit Reconcile implementation/stabilization
→ direct post-M2-3 genuine-edit close control
→ M2-4A actual post-M2-3 responsibility inventory
→ rebase M2-4B/C/D/E
→ bounded physical M2-4 slices
```

No physical M2-3 implementation should leapfrog the current v0.64.7 production gate.

## 7. Element F — Release / repository operations

Status: `SEPARATE INFRA / ADMIN TRACK`

Known items:

```text
R2.1 genuine release end-to-end operational proof
open PR / repository hygiene review when selected
machine-managed authority/document synchronization
future evidence-backed documentation drift cleanup
```

R2.1 proof belongs to the next genuine runtime release after the current v0.64.7 gate.

Do not mix release-system restructuring with a product feature or architecture extraction.

## 8. Element G — Legacy / bootstrap compatibility

Status: `TRIGGER ONLY`

Reopen when:

```text
schema evolution occurs
bootstrap/migration ownership changes
Recovery retirement reaches migration callers
a real legacy state specimen appears
```

Do not manufacture destructive legacy state solely for coverage.

## 9. Administrative drift closure

The previously identified current-status documentation drift is closed.

### `SIMCORE_DEFERRED_LEDGER_CURRENT_BASELINE_STALE`

Previous classification:

```text
FIX
DOC_DRIFT
NON_RUNTIME
NON_BLOCKING
```

Resolved on 2026-08-26:

```text
production baseline updated to v0.64.7
current live gate updated to 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
genuine-edit status updated with the v0.64.5 DIRECT LIVE PASS baseline
post-M2-3 genuine-edit recheck separated from the already-proven pre-M2-3 control
Summary Scope moved from ACTIVE_MINI_VALIDATION to natural VALIDATION_ONLY status
next action updated to v0.64.7 close → M2-3 sequencing
R2.1 active/pending-proof status synchronized
```

Commit:

```text
5d54fb21e79e4759ec98d78a39b26534abd1ef00
```

### `SIMCORE_RELEASE_SYSTEM_V2_PLAN` status drift

The original plan is now explicitly marked as a historical base plan rather than a current `PLANNED / NOT ACTIVE` authority.

Current delegated-operation truth points to the later R2.1 policy/evidence documents.

Commit:

```text
3282dfc106b6fe6d5d5668e6f776800b52133a7b
```

Current classification:

```text
KNOWN CURRENT DOC_DRIFT
= CLOSED FOR THIS SWEEP

HISTORICAL POINT-IN-TIME DOCS
= PRESERVE AS EVIDENCE
= NOT AUTOMATICALLY REWRITE TO CURRENT VERSION
```

Historical release/watch/evidence files may legitimately contain v0.64.2 or earlier point-in-time facts. Their age alone is not documentation drift when they are scoped as historical evidence.

## 10. Current priority map

```text
PRODUCTION AUTHORITY FIRST
→ v0.64.7 REAL-LONG-CHAT CLOSE

SAFE PARALLEL NON-RUNTIME WORK
→ permanent regression fixtures

NEXT RUNTIME ARCHITECTURE
→ M2-3

OPTIONAL PRODUCT MINI
→ Diagnostic UX narrow slice

EVIDENCE-TRIGGERED ONLY
→ Store / Host-History / Gemini / semantic WATCH families
→ legacy/bootstrap

NEXT GENUINE RELEASE INFRA PROOF
→ R2.1 end-to-end operation

ADMIN DOC
→ no promoted current drift item after this sweep
→ reopen only when a concrete contradiction is observed
```

## 11. Selection rule

When choosing a next element, first classify it as one of:

```text
NON_RUNTIME_TEST
RUNTIME_PRODUCT
RUNTIME_ARCHITECTURE
DIAGNOSTIC_UX
WATCH_EVIDENCE
RELEASE_INFRA
ADMIN_DOC
LEGACY_MIGRATION
```

Then keep that work item isolated from the other classes unless an explicit dependency requires otherwise.

## 12. Verdict

```text
BROAD ARCHITECTURE IDEATION
= CLOSED

CURRENT DOC-ONLY DRIFT SWEEP
= CLOSED

NEXT ELEMENT SPACE
= PERMANENT EVIDENCE
+ NARROW DIAGNOSTIC PRODUCT
+ NATURAL WATCHES
+ BOUNDED TRANSITION CLEANUP
+ M2 IMPLEMENTATION
+ RELEASE / ADMIN OPERATIONS
+ LEGACY TRIGGER WORK

NO NEW GENERIC SUBSYSTEM
= REQUIRED

RUNTIME CHANGE NOW
= NONE
```
