# SimCore Pre-Major Simplification Routine

Date: 2026-08-31 KST
Status: **ROUTINE FROZEN · REUSABLE PRE-MAJOR MAINTENANCE POLICY**
Classification: **SIMCORE MAINTENANCE POLICY / PRE-MAJOR MODULARITY + STABILITY + SIMPLIFICATION**

## 1. Purpose

When a future major SimCore update is approaching and we intentionally choose to clean up the plugin's internal module/runtime structure first, use one cumulative simplification train rather than publishing every mechanical mini as an independent runtime release.

This routine exists for maintenance whose primary goal is:

```text
less duplication
less unnecessary API/glue
clearer ownership
simpler control flow
same product semantics
```

It is not a feature-development shortcut and not authority to mix unrelated product work into maintenance.

## 2. Trigger

This routine activates only when the pre-major cleanup is explicitly chosen.

Canonical trigger:

```text
major update is approaching
+ plugin-internal simplification/stabilization is desired first
+ the work can be decomposed into bounded mechanical minis
```

A major milestone by itself does not automatically trigger cleanup.

## 3. Core execution model

The routine is one construction train with internal checkpoints and one release/live boundary.

```text
S0 baseline freeze

S1 mini design -> implementation -> static/CI/differential checkpoint
S2 mini design -> implementation -> static/CI/differential checkpoint
S3 mini design -> implementation -> static/CI/differential checkpoint
...
Sn mini design -> implementation -> static/CI/differential checkpoint

S7 / FINAL CONVERGENCE
-> cumulative architecture + semantic verification
-> one final release-simcore transaction
-> one broad real-long-chat regression program
-> human LIVE decision
-> main documentation/long-memory convergence
-> resume the major update program
```

Canonical distinction:

```text
INTERNAL CHECKPOINT != RUNTIME RELEASE
NO MINI LIVE TEST != NO VERIFICATION
```

## 4. Internal checkpoint contract

Every pre-S7 mini still requires:

```text
repo design/evidence first
bounded work branch implementation
syntax/static checks
Contracts/architecture checks
targeted regression tests
exact differential proof where applicable
module/export/require/async/side-effect invariant checks as applicable
persistent/schema marker checks
Prompt/Community semantic protection as applicable
anomaly preservation as WATCH / DEFER / FIX / BLOCKER
```

But an ordinary internal simplification checkpoint does **not** do:

```text
release-simcore deployment
independent runtime release identity
independent live gate
independent LIVE_PASS
user-facing experiment release
broad real-long-chat campaign
```

The implementation is cumulative construction evidence for the final simplification release.

## 5. Cumulative construction rule

Later minis are allowed to simplify, inline, retire, or replace code introduced or reshaped by earlier minis in the same train.

This is intentional.

Example:

```text
S1 dedupes a helper
S3 proves the helper can disappear entirely
-> final cumulative candidate keeps only the S3 end state
```

We do not preserve temporary intermediate structure merely because an earlier mini already passed its checkpoint.

The final production artifact is judged against the pre-simplification production baseline and the full cumulative evidence chain.

## 6. Release boundary

The release boundary is the final convergence phase, not each mini.

At final convergence:

```text
materialize the cumulative runtime candidate
confirm latest.js == install.js
run syntax + full Contracts/architecture validation
compare module inventory
compare public exports
compare require edges
compare async boundaries
compare storage/network/chat-write side effects
compare persistent/schema markers
compare protected Prompt/Community/State/Representation markers
run cumulative differential suites
```

Only after those gates pass:

```text
release-simcore deployment
-> broad real-long-chat validation
-> human explicit LIVE decision
-> main documentation/current-development sync
```

## 7. Broad real-long-chat matrix

The final release should exercise all touched surfaces, normally including:

```text
ordinary long-chat continuation
fresh-runtime cold -> warm pair
Mode A/B/C paths as relevant
Community/source path when shared runtime is touched
reroll
manual edit positive control
refresh/reload
state/telemetry adoption when touched
Representation exactness
Deferred Mirror
Frame/Time/continuity sentinels
warnings/compatibility diagnostics review
```

The exact matrix is frozen during final convergence from the cumulative touched-surface ledger.

## 8. Safety exception

Do not batch a newly discovered production-critical defect just to preserve the routine.

If an internal checkpoint reveals:

```text
BLOCKER correctness regression in current production
urgent state corruption risk
reload/edit/reroll safety failure
security/privacy issue
or another defect that requires immediate production correction
```

then:

```text
pause the simplification train
-> preserve evidence
-> handle the corrective release as a separate transaction
-> validate/close it normally
-> rebase the simplification train on the new production authority
```

Feature work, release-system redesign, provider-cache work, and major-product scope remain separate transactions.

## 9. Version rule

A simplification program is one release train, not a sequence of version numbers for its internal checkpoints.

```text
S1/S2/S3/... = maintenance lineage
final version = actual runtime release identity at final convergence
```

Do not bump runtime identity only to represent an internal checkpoint.

If an intended final identity is reserved at program start, it remains provisional until final convergence unless repo authority explicitly freezes it.

## 10. Relationship to the existing Post-M2 program

This policy supersedes the **per-mini release-simcore and per-mini real-long-chat requirement** in:

`docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`

for the currently active Post-M2 Simplification Program.

All other boundaries in that document remain active, including:

```text
M2-6 frozen
M2-7 not authorized
RETIRE -> INLINE -> DEDUPE -> NARROW -> SIMPLIFY -> EXTRACT-last
no semantic owner movement without explicit architecture authority
no mixed feature/cache/Community/release-system transaction
static/CI/differential proof mandatory at every mini
```

Current Post-M2 interpretation:

```text
S1-S6 = INTERNAL CONSTRUCTION CHECKPOINTS
S7 = FINAL CONVERGENCE + RELEASE/LIVE BOUNDARY
```

## 11. Current v0.70.3 application

For the current train:

```text
production remains v0.70.1 during S1-S6
v0.70.2 Cache Observer Cold-Path Attribution remains PARKED / PRESERVED
v0.70.3 is reserved as the cumulative Post-M2 simplification release target
```

Therefore the existing S1-1 implementation must not be published as a standalone v0.70.3 release.

The open S1-1 implementation transaction is to be treated as construction work and must be adjusted before merge so that it cannot independently materialize/publish the final runtime candidate.

At S7, v0.70.3 is materialized from the full cumulative S1-S6 end state, then receives the broad real-long-chat validation.

## 12. Reusable future routine

For future pre-major simplification work, default to:

```text
BASELINE FREEZE
-> bounded design <-> implementation checkpoints
-> cumulative static/differential safety ledger
-> final convergence
-> one release-simcore deployment
-> broad real-long-chat validation
-> human LIVE decision
-> major update resumes
```

This is the preferred SimCore routine whenever the job is a coherent pre-major internal simplification program rather than a set of unrelated production fixes.

## 13. Final disposition

```text
PRE_MAJOR_SIMPLIFICATION_ROUTINE = FROZEN
MINI_RELEASES = NO
MINI_BROAD_LIVE = NO
MINI_STATIC_CI_DIFFERENTIAL = REQUIRED
CUMULATIVE_CONSTRUCTION = YES
FINAL_RELEASE_BOUNDARY = FINAL CONVERGENCE / S7
FINAL_BROAD_LONG_CHAT = REQUIRED
URGENT_PRODUCTION_FIXES = SEPARATE TRANSACTION
CURRENT_POST_M2_PROGRAM = ADOPTS THIS ROUTINE
CURRENT_v0.70.3 = CUMULATIVE FINAL TARGET, NOT S1-1 STANDALONE RELEASE
```
