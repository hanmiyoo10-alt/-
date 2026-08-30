# SimCore Post-M2 Simplification Execution Architecture

Date: 2026-08-31 KST
Status: **OVERALL DESIGN FROZEN · DIRECT DESIGN→IMPLEMENT CYCLES · NO SEPARATE EXPERIMENT RELEASES · v0.70.2 CACHE DESIGN PARKED**
Classification: **POST-M2 MAINTENANCE PROGRAM / MODULARITY + STABILITY + SIMPLIFICATION / EXECUTION ARCHITECTURE**

## 1. Authority and supersession

This document is the current execution authority for the Post-M2 Simplification Program.

It preserves the principles and frozen boundaries of:

`docs/SIMCORE_POST_M2_SIMPLIFICATION_PROGRAM_DESIGN_2026-08-31.md`

but supersedes that document's earlier `AUDIT FIRST` scheduling model.

Current execution model:

```text
PROGRAM DESIGN
→ MINI DESIGN 1
→ IMPLEMENT 1
→ STATIC / CI / DIFFERENTIAL VERIFICATION
→ RELEASE-SIMCORE TRANSACTION IF RUNTIME CHANGED
→ REQUIRED REAL-LONG-CHAT REGRESSION VALIDATION
→ MINI DESIGN 2
→ IMPLEMENT 2
→ ...
→ PROGRAM CLOSURE
→ RESUME CACHE PROGRAM
```

There is no separate experiment-only or audit-only runtime version between design and implementation.

Canonical distinction:

```text
NO SEPARATE EXPERIMENT RELEASE
!=
NO VERIFICATION
```

Each implementation must already have a source-grounded mechanical design. Verification remains mandatory and is treated as an acceptance gate, not as a discovery product.

## 2. Program objective

The goal is to make the existing SimCore runtime easier to reason about, safer to modify, and cheaper to verify without changing product semantics.

Target properties:

```text
LESS duplicate code
LESS public API surface
LESS pass-through glue
LESS repeated bookkeeping
LESS hidden side-effect ownership
LESS code on ordinary hot paths
LESS verification surface

MORE obvious ownership
MORE local reasoning
MORE deterministic control flow
MORE bounded failure handling
MORE mechanical equivalence proof
```

Canonical quality equation:

```text
GOOD SIMPLIFICATION
= same semantics
+ smaller reasoning surface
+ fewer unnecessary seams
+ same or fewer side effects
+ easier differential verification
```

The program optimizes for less structure, not more modules.

## 3. Frozen architecture boundary

This program does not reopen M2.

```text
M2-6 = FROZEN
M2-7 = NOT AUTHORIZED
```

Current layer/owner graph remains authoritative:

```text
Foundation
  contracts / store / kernel

Domain
  community / recurrence / lineage / handoff / state-reconcile
  evidence / time / frame / lifecycle / reaction

Validation
  structure

Representation
  representation

Application
  prompt / session / edit-reconcile
  output-compat / bootstrap-migration / output-finalize

Observability
  ops

Runtime
  runtime-contracts / runtime-host / runtime-cache
  runtime-topology / runtime-cache-candidates / runtime-telemetry
  runtime-session / runtime-mirror / runtime-hooks / runtime-probe
```

Allowed:

```text
retire dead code
inline trivial pass-throughs
dedupe proven-equivalent primitives
narrow exports
simplify control flow inside an existing owner
reduce repeated local bookkeeping
remove redundant scans or object construction when equivalence is proven
make side-effect boundaries more explicit without moving semantic ownership
```

Not allowed under this program:

```text
new architecture layer
new generic state subsystem
new upward dependency
M2-7-scale ownership move
new semantic owner
request-pipeline / turn-pipeline extraction by default
prompt semantic change
history rewrite
provider-cache tuning
Community feature expansion
3M feature work
release-system redesign
persistent schema redesign
```

If a candidate requires one of those, classify it `DEFER_ARCHITECTURE` and continue without it.

## 4. Transformation order

Preferred order:

```text
1. RETIRE
2. INLINE
3. DEDUPE
4. NARROW
5. SIMPLIFY
6. EXTRACT only with source-proven independent responsibility
```

Rules:

```text
large file != bad architecture
shared-looking code != shared semantics
single caller != automatic inline
new module != progress
fewer lines != correctness proof
```

A transformation is justified only when its owner, callers, side effects and equivalence contract are explicit.

## 5. Mini transaction contract

Each mini must be small enough to answer all of these before implementation:

```text
WHAT exact code changes?
WHY is the current form redundant or unnecessarily complex?
WHO currently owns the behavior?
WHO owns it after the change?
WHICH callers change?
WHICH side effects remain exactly unchanged?
WHICH persistent/runtime fields remain unchanged?
HOW is semantic equivalence proven?
WHAT live surfaces require regression validation?
```

A mini may touch multiple files only when they belong to one coherent mechanical transformation.

Forbidden mixed transaction example:

```text
fingerprint dedupe
+ telemetry redesign
+ cache optimization
+ Community cleanup
```

Those are separate transactions.

## 6. Overall phase order

The program proceeds from the lowest-risk pure/mechanical surfaces toward orchestration surfaces.

### S1 · Runtime fingerprint / signature primitive convergence

Primary targets:

```text
hash/fingerprint helpers
request signature construction
topology identity helpers
cache trajectory signatures
small bounded identity helpers
safe numeric/time normalization helpers used by these surfaces
```

Goal:

```text
one owner per genuinely equivalent primitive family
```

Eligibility:

```text
same input domain
+ same normalization
+ same output contract
+ same precision/collision assumptions
= eligible for dedupe
```

Similar-looking helpers with different normalization contracts remain separate.

Expected transformations:

```text
DEDUPE / NARROW / RETIRE
```

Risk: LOW when exact equivalence is provable.

This is the recommended first mini.

### S2 · Public API / compatibility seam slimming

Targets:

```text
unused exports
single-caller aliases
re-exports with no policy
compatibility names whose runtime callers are gone
pass-through wrappers that only rename arguments/results
obsolete transitional flags/state with zero live readers
```

Goal:

```text
smaller exported surface
fewer compatibility seams
no semantic owner movement
```

Expected transformations:

```text
RETIRE / INLINE / NARROW
```

Hard stop:

Any seam still involved in persisted state, reload, reroll/edit, telemetry adoption or historical recovery is not removed without its own explicit proof.

### S3 · Diagnostics / telemetry bookkeeping simplification

Scope:

```text
diagnostic object construction
bounded timing aggregation
probe formatting/accounting helpers
capsule import/export adapter duplication
one-shot adoption bookkeeping
repeated finite/non-negative guards
repeated status/disposition construction
```

Goal:

```text
make observability cheaper to maintain and easier to attribute
without changing telemetry semantics
```

Frozen here:

```text
Host-local one-shot mailbox semantics
claimHostLocalOnce call order/count
telemetry durability authority
capsule schema / TTL / size rules
provider cache UNVERIFIED policy
```

The currently suspicious cold Host-local claim is not optimized in this program phase. Its latency behavior remains owned by the parked cache-attribution design.

Expected transformations:

```text
DEDUPE / NARROW / SIMPLIFY
```

### S4 · Outer runtime shell control-flow slimming

Scope the shell around:

```text
host/chat/session acquisition
request hook sequencing
onSend sequencing
post-onSend bookkeeping
cache observer invocation
diagnostics capture
output handling
telemetry checkpoint
```

Default goal:

```text
same shell
fewer moving pieces
```

Look for:

```text
repeated guards
repeated local snapshots
pass-through variable copies
unnecessarily wide variable lifetime
repeated object materialization
one-shot branches that can be mechanically localized
identical error-containment wrappers
redundant local scans
```

The default is not extraction. Only a source-proven independent responsibility may be proposed as a later extraction mini.

Expected transformations:

```text
INLINE / DEDUPE / SIMPLIFY
```

Risk: MEDIUM. Keep transactions especially small.

### S5 · Session / State Reconcile local simplification

Conservative cleanup only.

Frozen ownership:

```text
Session = per-chat application holder/orchestrator
State Reconcile = Domain integration owner for portable state assembly/reconciliation
```

Allowed:

```text
remove dead local aliases
collapse duplicate local normalization calls if provably identical
narrow internal helpers
remove redundant object copying
simplify mechanically equivalent branching
```

Forbidden:

```text
generic foundation state module
restore Kernel reconcile facade
move semantic policy into Session
merge Representation/Edit Reconcile ownership
new persistent schema
```

Risk: MEDIUM/HIGH. Skip anything not strongly mechanical.

### S6 · Prompt / Community / semantic-module restraint pass

Default disposition:

```text
KEEP
```

Only exact-equivalence cleanup may proceed, for example:

```text
unused private helper
zero-caller compatibility branch
exact duplicate formatting primitive
unreachable fallback proven by current contract
```

No prompt bytes/order, Community classification, Structure acceptance, Evidence semantics or Reaction semantics may change under a simplification label.

### S7 · Program convergence

After the mechanical passes:

```text
re-run architecture checker
compare module inventory
compare export inventory
compare require edges
compare async boundaries
compare side-effect counts
compare persistent schema markers
compare protected semantic markers
confirm latest.js == install.js
run final broad real-long-chat regression matrix across all touched runtime surfaces
```

Remaining candidates terminate as:

```text
DONE
KEEP
DEFER_ARCHITECTURE
DEFER_LOW_VALUE
RESUME_CACHE
```

## 7. Per-mini design template

Each mini design should contain:

```text
Transaction/release identity
Exact parent production source/blob
Problem statement
Exact current owner
Exact callers
Current redundant/complex shape
Proposed mechanical delta
Ownership before/after
Side-effect before/after
Persistent-state before/after
Async boundary before/after
Protected semantic invariants
Static/differential proof contract
Real-long-chat regression matrix
Rollback condition
```

No implementation starts from a vague program item.

## 8. Implementation workflow

For every actual runtime mini:

```text
1. main design/evidence authority
2. work branch from exact current authority
3. implement bounded delta
4. latest.js == install.js
5. syntax + Contracts v2 + architecture + targeted regression
6. differential proof against parent
7. release through release-simcore
8. real-long-chat regression validation for touched surfaces
9. preserve anomalies immediately as WATCH / DEFER / FIX / BLOCKER
10. sync main documentation/current-development authority
11. proceed to the next mini design
```

There is no separate experimental release between design and implementation.

## 9. Static equivalence gates

Simplification work should use stronger static proof than feature work whenever possible.

Required where applicable:

```text
prompt module byte-identical
Community module byte-identical
protected semantic marker counts unchanged
persistent state/schema versions unchanged
network/timer/provider-routing markers unchanged
async await/yield boundaries unchanged or reduced only with explicit proof
storage/chat-write side-effect counts unchanged unless retiring a proven dead side effect
module dependency direction valid
no new circular edge
latest/install byte-identical
```

Targeted differential tests compare parent and candidate over the exact affected primitive or orchestration path.

## 10. Live validation posture

User-facing experimentation is not a design phase.

Live validation is a regression gate.

For a mechanical mini, use touched surfaces plus global safety sentinels:

```text
ordinary long-chat continuation
cold -> warm request
reroll
manual edit positive control
refresh/reload when runtime/session/telemetry touched
Community turn when shared runtime shell touched
Representation exactness
Deferred Mirror
Frame/Time/continuity sentinels
```

A pure primitive mini with exhaustive differential proof may use a narrower live matrix, but a runtime-changing release still receives real long-chat validation before closure.

## 11. Quantitative program ledger

Track from the pre-simplification baseline:

```text
runtime LOC                prefer down
module count               prefer same/down
public exports             prefer down
require edges              prefer same/down
compatibility aliases      prefer down
side-effect sites          same or proven dead removal
async boundaries           same/down
persistent fields          exactly same
hot-path scans/loops       same/down
protected semantic output  equivalent
```

No numeric target is mandatory. Useful boundaries are not deleted to win a line-count contest.

## 12. Stop conditions

Stop a mini and classify `BLOCK` when:

```text
semantic equivalence cannot be proven
owner changes unintentionally
persistent-state meaning changes
reload/edit/reroll safety weakens
raw body retention would increase
provider-cache inference would be introduced
new async/I/O is required
M2 layer graph must change
```

Stop the overall program early and resume cache work when:

```text
remaining candidates are low-value
or
remaining candidates are architecture-scale only
or
continued cleanup would add more abstraction than it removes
```

## 13. Version posture

The existing v0.70.2 identity remains reserved for:

```text
Cache Observer Cold-Path Attribution
```

Do not repurpose it silently.

If simplification minis require runtime releases, assign their version identities during each mini design based on the then-current production version. This program does not pre-allocate a version sequence.

```text
version = actual released transaction history
program phase = maintenance roadmap history
```

## 14. Relationship to the cache program

This simplification program is temporary and does not replace CACHE / COST work.

After program closure:

```text
resume CACHE / COST PROGRAM
```

The parked v0.70.2 design remains evidence-preserved. If simplification mechanically changes the exact source envelope referenced by that design, rebase/update the v0.70.2 design against the new production source before implementation.

Provider cache remains `UNVERIFIED` throughout this program.

## 15. First mini selected for design

Recommended first mini family:

```text
S1 · RUNTIME FINGERPRINT / SIGNATURE PRIMITIVE CONVERGENCE
```

Reason:

```text
already named as low-risk slimming in post-M2 authority
mostly pure/local logic
minimal semantic ownership movement
high differential-testability
reduces duplicated reasoning before runtime orchestration work
```

Next action:

```text
read exact fingerprint/signature implementations and callers
→ freeze S1 mini design
→ implement S1
```

No separate experiment stage is inserted.

## 16. Final disposition

```text
POST_M2_SIMPLIFICATION_PROGRAM = ACTIVE DESIGN TRACK
EXECUTION = DIRECT DESIGN -> IMPLEMENT ITERATION
SEPARATE EXPERIMENT RELEASES = NONE
STATIC / CI / DIFFERENTIAL PROOF = REQUIRED
REAL-LONG-CHAT REGRESSION = REQUIRED FOR RUNTIME RELEASE CLOSURE
M2_6 = FROZEN
M2_7 = NOT AUTHORIZED

PHASE ORDER
S1 primitive/fingerprint convergence
S2 API/compat seam slimming
S3 diagnostics/telemetry bookkeeping
S4 outer runtime shell slimming
S5 Session/State Reconcile local simplification
S6 semantic-module restraint cleanup only
S7 program convergence

v0.70.2 CACHE OBSERVER COLD-PATH ATTRIBUTION
= PARKED
= PRESERVED
= RESUME AFTER SIMPLIFICATION PROGRAM
```
