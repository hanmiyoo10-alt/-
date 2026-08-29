# SimCore post-v0.66 deferred / WATCH triage

Date: 2026-08-29

Status: **TRIAGE COMPLETE · PRIORITIES RECORDED · NO RUNTIME CHANGE · DO NOT BUNDLE UNRELATED FIXES INTO M2-5**

Current production:

```text
v0.66.0
M2-4 Session / Runtime Mirror Boundary Completion
LIVE_PASS
checkpoint M2-4
release-simcore 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
blob f0da13d4c47fd98e9065d7dbf253a3296151ee16
```

Current durable priority:

```text
M2_5_POST_06600_TRANSITION_DEBT_REVIEW
```

This document reviews deferred runtime/quality/architecture observations before selecting the v0.67.0 design. It does not promote an item to runtime FIX merely because it is important.

---

## 1. Triage rules

```text
recurrence != root cause
severity != attribution
healthy local diagnostics != semantic correctness proof
one slow specimen != optimization authority
historical unexercised rare path != failure
mechanical architecture debt != feature/quality bug
```

Selection rule:

```text
next structural release
→ only transition debt with exact current-source ownership proof

quality/performance anomaly
→ separate investigation and dedicated release only after a bounded owner + repair contract exists
```

Do not use one version to clear the backlog cosmetically.

---

## 2. Priority 0 — must close before v0.67 implementation

### POST_06600_ARCH_CONTRACT_DRIFT

Authority:

`docs/SIMCORE_POST_06600_ARCH_CONTRACT_DRIFT_PRE_M2_5_BLOCKER_2026-08-29.md`

Classification:

```text
FIX
NON_RUNTIME
PRE_M2_5 IMPLEMENTATION BLOCKER
```

Reason:

`product-manifest` / `CURRENT_DEVELOPMENT` are at v0.66.0 LIVE_PASS / M2-4 while Contracts v2 and the machine architecture config still describe older/pre-publication M2 state.

Action:

```text
separate architecture authority convergence
→ permanent CI
→ exact v0.66 source re-audit
→ only then runtime implementation authorization decision
```

Not a v0.67 runtime slice.

---

## 3. Selected M2-5 transition debt

### Recovery compatibility facade retirement

Existing evidence:

- M2-4 migrated runtime callers to physical owners;
- v0.66 implementation acceptance target was zero runtime Recovery callers while retaining the shim;
- FIX01/FIX03 explicitly proved Session had no `require('./recovery')` / `recovery.*` runtime caller while preserving the standalone compatibility module;
- M2-4 activation explicitly deferred physical Recovery deletion to M2-5+.

Current disposition:

```text
RECOVERY_FACADE_RETIREMENT
= SELECTED FOR v0.67.0 DESIGN
= MECHANICAL
= ZERO NEW SEMANTICS
= REQUIRES EXACT v0.66 SOURCE RE-AUDIT
```

This is the strongest next-version candidate because the transition artifact exists specifically for staged retirement and its consumers were already migrated in M2-4.

### Stale transition metadata / exceptions

M2-5 may remove architecture transition declarations only where exact v0.66 source proves the corresponding physical edge/artifact is absent.

```text
source edge absent + stale exception present
→ retire exception in same architecture checkpoint

source edge still present
→ preserve exception; do not force unrelated inversion work
```

In particular, current Kernel transition exceptions must be re-audited rather than assumed removable.

---

## 4. M2-5 candidates reviewed but NOT selected by default

### Remaining Session migration / diagnostic receipts

Candidate fields historically called out by M2-4:

```text
loadedFromLegacySnapshot
communityAliasRepairStats
templateRecurrenceBootstrapStats
narrativeClockMigrationStats
```

Disposition:

```text
DEFER / SOURCE-AUDIT CANDIDATE
```

Reason:

These are not required to retire Recovery. Move them only if post-v0.66 source shows a direct physical producer can expose a bounded receipt with no new coupling or behavior. Otherwise leave them in Session and preserve the debt.

### Runtime-topology fingerprint primitive deduplication

Architecture audit historically noted duplicated normalization/hash identity between Runtime Topology and Kernel/Representation.

Disposition:

```text
DEFER
```

Reason:

Useful cleanup, but it broadens Foundation/Representation/Runtime Topology surface and is not required to close the M2-1 Recovery transition artifact. Do not inflate v0.67 merely for aesthetic deduplication.

### Kernel foundation inversion / State module / Request Pipeline

Disposition:

```text
DEFER
```

These are larger ownership topics from M0/M1. M2-5 transition-debt retirement must not become a second architecture mega-refactor.

---

## 5. High-attention quality / performance investigations

These items deserve active attention after v0.66, but remain separate from the v0.67 structural patch unless new evidence promotes one to a blocking FIX before implementation begins.

### 5.1 PARTIAL_PREVIOUS_TURN_REPLAY

Evidence posture:

```text
independent natural specimens >= 3
recurrence CONFIRMED
symptom confidence HIGH
same-input reroll clearance observed repeatedly
root cause UNPROVEN
SimCore mutation cause UNPROVEN
provider/model cause UNPROVEN
runtime FIX authority NONE
```

Authority:

- `docs/SIMCORE_PARTIAL_PREVIOUS_TURN_REPLAY_RECURRENCE_2026-08-27.md`
- `docs/SIMCORE_06411_PARTIAL_PREVIOUS_TURN_REPLAY_REROLL_CONTROL_AND_POST_06500_DISPOSITION_2026-08-28.md`

Post-v0.66 priority:

```text
INVESTIGATION PRIORITY = HIGH
PATCH INSIDE v0.67 M2-5 = NO
```

Next useful evidence:

```text
natural post-v0.66 recurrence
+ preceding response
+ exact current input
+ first anomalous output/diagnostic
+ same-input reroll output/diagnostic
+ no-edit/no-reload action record
```

If recurrence becomes materially more frequent/severe or correlates reproducibly with a SimCore-owned context/prompt path, promote to a separate FIX design.

### 5.2 Genuine-edit MANUAL_EDIT_REBUILT 40.224 s

Authority:

`docs/SIMCORE_LIVE_06600_RELEASE_CLOSE_2026-08-29.md`

Observed:

```text
v0.65 direct positive control 4.401 s
v0.66 direct positive control 40.224 s
request total 41.495 s
Edit Reconcile 96.9%
correctness PASS
```

Disposition:

```text
WATCH
HIGH-SEVERITY PERFORMANCE EVIDENCE
CAUSE NOT PROVEN
NEXT COMPARABLE MULTI-TENS-SECOND CASE -> FIX INVESTIGATION
PATCH INSIDE v0.67 M2-5 = NO BY CURRENT EVIDENCE
```

Do not weaken conservative genuine-edit rebuild correctness to chase this one specimen.

### 5.3 COMMUNITY platform-family diversity recurrence

Authority:

- `docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_WATCH_2026-08-28.md`
- `docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_RECURRENCE_2026-08-28.md`

Evidence:

```text
recurrence directly observed
visible three platform sections
validator recognizes only two families
unknown platform warning recurs
root owner unresolved: taxonomy vs label normalization vs prompt selection vs generated selection
```

Disposition:

```text
ACTIVE NARROW INVESTIGATION
RECURRENCE PROVEN
PATCH INSIDE v0.67 M2-5 = NO
```

Recommended investigation compares visible labels, Community taxonomy mapping, diversity contract, Structure judgement and state/quarantine result. Once one physical owner is established, design a separate narrow quality release.

---

## 6. Continue WATCH / no promotion yet

### B_START open-scene closure-expression warning

Known recurrence:

```text
visible episode-ending wording
while lifecycle remains OPEN / LOCKED
Broadcast end authority DENIED
no lifecycle state harm observed
```

Disposition:

```text
WATCH
KNOWN WARNING FAMILY
NO M2 ATTRIBUTION
NO v0.67 PATCH
```

If warning begins causing incorrect lifecycle transition, false quarantine, or repeated noisy false positives across ordinary open scenes, reclassify separately.

### PRE_SIMCORE cache/history frontier movement

Current evidence repeatedly points to:

```text
PRE_SIMCORE / CHAT_HISTORY or host-prefix first break
SimCore contribution NOT_FIRST_BREAK
provider cache UNVERIFIED
```

Disposition:

```text
WATCH / OBSERVATION
NO CACHE ENGINEERING
```

Authoritative provider cache telemetry remains required before provider-cache claims or tuning.

### GENERATION_SEMANTIC_EXCURSION

One-off broader source/scene-boundary excursion remains preserved in `SIMCORE_ANOMALY_WATCH.md`.

Disposition:

```text
WATCH_ONLY
```

Do not merge it automatically with PARTIAL_PREVIOUS_TURN_REPLAY; the families have different discriminators.

---

## 7. Deferred validation controls, not bugs

### v0.63.53 `BOUNDARY_CONFIRMED_SUFFIX`

```text
natural special-path activation still not observed
```

### v0.63.54 `SAFE_BOUNDARY_CONFIRMED`

```text
natural special-path activation still not observed
```

Disposition for both:

```text
DEFERRED VALIDATION
NOT_EXERCISED != FAILED
DO NOT MANUFACTURE MALFORMED OUTPUT
```

Permanent static/differential coverage remains authority until the rare path occurs naturally.

### SILENT_COMPAT output mismatch family

Historical exact Fresh carryover is safely handled request-side, but the output-side transformation cause remains unknown.

Disposition:

```text
DEFER
NO NEW NORMALIZATION
```

Require a deterministic bounded transformation rule before widening output compatibility.

---

## 8. Mitigated / regression-control items

The following are preserved as regression controls rather than next-version fixes unless natural recurrence defeats the existing mitigation:

```text
VISIBLE_SCENE_TIME_REGRESSION_GUARD_GAP
→ v0.63.57 current-timeline mitigation exists

INTRA_TURN_NARRATIVE_TIME_ADVANCEMENT_GAP
→ v0.63.58 terminal timestamp observability mitigation exists

Frame repaired-to-correct specimens
→ bonus safety evidence when final state is correct and RAW regression NONE
```

Do not reopen them based solely on historical evidence.

---

## 9. Post-v0.66 planning order

Recommended order:

```text
A. close architecture contract/config drift (non-runtime FIX)
B. freeze v0.67.0 M2-5 Recovery Transition Debt Retirement design
C. exact v0.66 source re-audit for Recovery callers / transition edges / remaining receipt debt
D. authorize or revise v0.67 implementation
E. implement only selected mechanical M2-5 scope
F. static/CI -> release-simcore -> real long-chat -> main terminal sync

parallel design/investigation lanes that may proceed without contaminating v0.67:
- PARTIAL_PREVIOUS_TURN_REPLAY attribution investigation
- COMMUNITY platform diversity owner investigation
- genuine-edit rebuild latency recurrence capture
```

If one of those investigation lanes produces a true source-changing BLOCKER before v0.67 implementation starts, stop and re-evaluate ordering. Otherwise keep v0.67 mechanical.

---

## 10. Triage verdict

```text
NEXT STRUCTURAL VERSION
= v0.67.0 / M2-5
= transition debt retirement

SELECTED RUNTIME DEBT
= Recovery compatibility facade retirement

CONDITIONAL SAME-CHECKPOINT CLEANUP
= stale transition declarations only where exact source edge is gone

HIGH-ATTENTION SEPARATE INVESTIGATIONS
= PARTIAL_PREVIOUS_TURN_REPLAY
= COMMUNITY platform-family diversity
= genuine-edit 40.224 s rebuild latency

CONTINUE WATCH
= B_START closure-expression recurrence
= PRE_SIMCORE cache/history movement
= GENERATION_SEMANTIC_EXCURSION

DEFERRED VALIDATION
= v0.63.53 / v0.63.54 rare compatibility paths
= SILENT_COMPAT output-side cause

DO NOT BUNDLE
= release-system/repository-system restructuring
= provider-cache engineering
= broad Kernel/Lifecycle refactor
= feature/quality repairs without attribution
```
