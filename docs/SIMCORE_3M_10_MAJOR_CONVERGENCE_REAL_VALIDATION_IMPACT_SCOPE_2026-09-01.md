# SimCore 3M-10 Major Convergence / Real-Validation Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-10 IMPACT SCOPE FROZEN · DESIGN CONVERGENCE TARGET SELECTED · REAL RUNTIME PASS NOT CLAIMED · IMPLEMENTATION NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-10 · MAJOR CONVERGENCE · IMPLEMENTATION-READINESS GATES · REAL-VALIDATION PROTOCOL · DESIGN-ONLY**

## 0. Purpose

3M-10 is the final design checkpoint of the 3.0M Source Intelligence program.

It does not add a new source family or runtime feature.

It answers:

```text
What exactly may be declared complete at the end of the design-only 3.0M workstream?
What still blocks runtime activation?
What evidence must exist before implementation can start?
What real long-chat lanes must later pass before the runtime major can close?
How are PASS / WATCH / FIX / BLOCKER outcomes handled?
What remains deliberately outside the first 3.0M runtime major?
```

This impact scope selects the convergence seam before the final 3M-10 design is written.

## 1. Authority chain

3M-10 consumes the complete design sequence:

```text
3M-0  Master Contract
3M-1  Source Projection Envelope / Legacy Community compatibility
3M-2  Assertion / Exposure Boundary
3M-3  Structured Sidecar / Validation
3M-4  Presentation Renderer Architecture
3M-5  BOARD Source Family
3M-6  Current-Projection Support / Invalidation
3M-7  Context Re-entry / Source History
3M-8  NEWS / Publication Maturity
3M-9  Integration / Performance / Source-Irrelevant Baseline
```

It also consumes the separate Exposure target-host/model-compliance research authority.

Production runtime remains independently authoritative on `release-simcore`.

## 2. Selected convergence seam

The 3M-10 convergence seam is:

```text
DESIGN_CONVERGENCE_AND_RUNTIME_ACCEPTANCE_GATE
```

The major must keep two closure states separate:

```text
DESIGN CONVERGENCE
!=
RUNTIME IMPLEMENTATION READINESS
!=
REAL LONG-CHAT PASS
```

This distinction prevents a completed architecture document from being mistaken for deployed product evidence.

## 3. What may close now

At the end of design-only 3M-10, the program may declare:

```text
3.0M design architecture converged
first-major family set frozen
first-major authority boundaries frozen
first-major validation semantics frozen
first-major presentation contracts frozen
first-major history/persistence policy frozen
first-major performance acceptance dimensions frozen
future runtime acceptance protocol frozen
```

It may not declare:

```text
runtime implemented
runtime deployed
real target-host performance pass
real model-compliance pass
real renderer mount pass
real long-chat source correctness pass
major runtime release closed
```

## 4. First-major product scope

The converged first-major family set is:

```text
LIVE_REACTION
BOARD
NEWS
```

Deferred families remain outside first-major closure:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

Their absence does not block first-major design convergence because they were explicitly deferred by earlier checkpoints.

## 5. Frozen cross-cutting invariants

3M-10 must preserve these cross-major invariants:

```text
canonical authority != derived source projection
source family != core runtime mode
validated semantics != presentation
presentation state != semantic authority
source support != assertion exposure
assertion exposure != publication maturity
publication maturity != canonical truth
visible source UI != future model context
source history/persistence = none for first-major objects
family output != truth authority for another family
source-irrelevant request = DORMANT / zero source semantic burden
```

Any final convergence design that weakens these is invalid.

## 6. Runtime-readiness gate set

The first active runtime implementation remains blocked until all applicable gates below are explicitly closed.

### G1 · Current production re-preflight

Runtime work must begin from then-current `release-simcore`, not the historical production SHA used during design.

Required:

```text
fresh production authority scan
fresh module ownership / impact scope
fresh latest.js == install.js release invariant check
no assumption that design-time source lines remain exact
```

### G2 · Exposure target-host mechanics + model-compliance evidence

Current research gate remains:

```text
HOLD_TARGET_HOST_EVIDENCE_REQUIRED
```

Required before active exposure-dependent production behavior:

```text
target-host preflight PASS
paired B0/E6 mechanics proof
then authorized model-compliance smoke
semantic results reviewed against frozen oracle
```

Design-only 3M-10 must not bypass this research gate.

### G3 · Current source-job selection authority

3M-9 consumes an already-authorized current source job but does not define the runtime producer.

Required:

```text
who decides DORMANT / ACTIVE / UNSUPPORTED
which current request facts it may inspect
how family selection is authorized
how false activation is prevented
```

History residue, old cards, and lexical mentions remain invalid activation authority.

### G4 · Structured sidecar producer / transport

Current status:

```text
ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
```

Required:

```text
bounded producer contract
bounded transport contract
no unsafe in-band hidden payload assumption
exact prompt/output byte budget
schema caps
failure / retry semantics
```

### G5 · Source presentation host mount authority

Current status:

```text
ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

Required:

```text
actual target-host mount seam
ownership of host record / DOM fields
preservation of unowned host metadata
reroll/edit/reload behavior
mount failure isolation
```

### G6 · Family hard caps

Before runtime activation every active family must freeze explicit constants for:

```text
max current assertions / entries / stories
max semantic chars per item
max aggregate semantic chars
max receipt entries
```

Boundedness without concrete implementation caps is not enough for runtime readiness.

### G7 · NEWS trusted maturity-context producer

NEWS design defines a deterministic maturity policy over trusted context but does not define the active trusted producer.

Required:

```text
owner-bounded derivation from current Frame / Time / Continuity / reachability
contradiction rejection
no model-authored timing authority
no NEWS-owned clock
```

### G8 · 3M-9 evidence instrumentation

Runtime activation must expose bounded evidence sufficient to prove the 3M-9 dimensions without creating a persistent source-history system.

At minimum evidence must cover:

```text
activation state
family
source history scans
source prompt / re-entry bytes
payload / validator / presentation counts
persistent source reads/writes
network / extra-model / background counts
source-path latency
```

Equivalent field names are allowed.

## 7. Candidate C remains closed at design convergence

The first-major design still requires none of the C1-C8 activation conditions.

Therefore:

```text
CANDIDATE_C = CONDITIONALLY_READY / NOT ACTIVATED
```

If any runtime implementation plan adds cross-turn derived survival, stable source identity, item mutation, append/merge, derived-to-derived propagation, future context re-entry, partial descendant survival, or delayed semantic side effects, Candidate C must be reopened before that behavior is authorized.

## 8. Real-validation protocol layers

Future runtime close must produce evidence in three layers.

### L1 · Static / CI proof

Required examples:

```text
family registry integrity
schema and enum integrity
no unauthorized persistence/history store
no network/auxiliary-model dependency in first-major path
DORMANT path excludes source prompt/history injection
renderer mapping / CSS namespace isolation
latest.js == install.js
release branch exact identity and CI
```

### L2 · Deterministic semantic / integration fixtures

Required examples include all 3M-9 semantic, dormancy, accumulation, and cross-family matrices.

This layer proves deterministic policy behavior but is not a substitute for the target host.

### L3 · Real target-host long-chat proof

Required after an active runtime exists.

This is the only layer that may support a real 3.0M runtime-major close.

## 9. Required real long-chat lanes

3M-10 final design should freeze a minimum real validation matrix containing at least:

```text
R0 ordinary source-irrelevant long-chat baseline
R1 direct B → C LIVE_REACTION
R2 direct B → C BOARD
R3 direct B → C NEWS with maturity variation
R4 mixed source-active / ordinary-chat alternation
R5 repeated mixed source use with no accumulation
R6 source reroll / replacement invalidates stale projection
R7 source edit / replacement then fresh projection from current authority
R8 same exposed event independently projected across LIVE_REACTION / BOARD / NEWS
R9 renderer / presentation failure isolation
R10 renderer switch / style change without semantic mutation
R11 legacy <COMMUNITY> coexistence / no duplicate structured re-entry
R12 reload / re-entry boundary where presentation residue cannot reactivate source semantics
```

Exact runtime steps belong to the final protocol, not this impact scope.

## 10. Real-validation lane principles

Every real lane must capture:

```text
setup authority
current request / mode / source job
expected family
expected policy class
observable result
bounded diagnostics
reroll/edit/reload action when applicable
post-action source support state
ordinary-chat follow-up where applicable
```

No lane may infer success merely from attractive UI output.

## 11. Cross-family convergence proof

The signature 3.0M real validation is:

```text
one exposed event E
→ LIVE_REACTION projection from E
→ BOARD projection from E
→ NEWS projection from E
```

The wording / DOM may differ by family.

Acceptance requires:

```text
same underlying current authority
no family-to-family truth handoff
no core mode mutation
no exposure upgrade caused by source family
NEWS maturity does not upgrade truth
renderer differences do not mutate semantic fields
```

## 12. Reroll / edit convergence proof

For current snapshot-only first-major objects:

```text
source authority changes
→ old projection support fails
→ old projection not reused
→ next authorized source request builds from current authority
```

No item-level salvage is expected.

If real product requirements demand item-level survival, Candidate C activates and first-major acceptance must be amended before runtime close.

## 13. Source-irrelevant baseline is a hard blocker

A runtime major cannot close if ordinary source-irrelevant chat regresses in:

```text
Current Task Primacy
continuity
stale-topic replay
source-to-world leakage
instruction competition
context/token pressure
latency attribution
```

Canonical blocker:

```text
BLOCKER · SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
```

Source-feature quality cannot compensate for this failure.

## 14. Performance close principles

3M-10 must not invent numeric latency claims before runtime exists.

Future runtime close must compare at least:

```text
ordinary baseline before/after source implementation
source-irrelevant turns immediately after source-active turns
repeated mixed source sequences
per-family current-projection cost
source prompt / output bytes
validation / presentation latency
```

Acceptance requires no hidden cost growth proportional to prior source-turn count.

## 15. Outcome taxonomy

Every anomaly found during future implementation/real validation must be preserved immediately as:

```text
WATCH
DEFER
FIX
BLOCKER
```

Meaning:

### WATCH

Observed uncertainty or non-blocking anomaly. Must be preserved and monitored. May proceed if the applicable gate explicitly permits it.

### DEFER

Intentionally outside the current first-major scope. Must not silently leak into implementation.

### FIX

Concrete defect whose bounded repair is understood. Repair and re-run affected evidence before close.

### BLOCKER

Violation of a major invariant or missing required authority/evidence. Runtime-major close cannot proceed.

## 16. No evidence laundering

Forbidden closure logic:

```text
static CI PASS
→ declare target-host PASS

pretty renderer
→ declare semantic PASS

model compliance sample
→ declare transport/mount PASS

one source family PASS
→ declare all family PASS

one short chat PASS
→ declare long-chat performance PASS
```

Each claim must be supported by evidence from the layer that owns it.

## 17. Release and workflow boundary

3M-10 design does not assign a runtime semver or release target.

When runtime work is separately authorized, the normal SimCore workflow applies:

```text
repo design/evidence
→ work branch implementation
→ static / CI verification
→ release-simcore deployment
→ real long-chat validation
→ main docs / durable memory sync
```

Feature runtime work must remain separate from release/repository-system restructuring.

## 18. S7 / v0.70.3 boundary

S7 / v0.70.3 remains a separate product lane.

The practical v0.70.3 long-chat window may collect the already-deferred Exposure target-host evidence, but:

```text
S7 validation
!=
3.0M implementation authorization
!=
3.0M runtime-major close
```

No 3.0M runtime code is authorized by this design convergence.

## 19. Deferred first-major capabilities

The following remain outside first-major runtime closure unless a later explicit amendment says otherwise:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE settlement
structured source history/retrieval
persistent source DB
cross-turn participant/article identity
item-level reroll/edit survival
multi-family simultaneous fanout
derived-to-derived truth propagation
network/media materialization
auxiliary-model fanout
source semantic cache
```

## 20. Selected 3M-10 design output

The final 3M-10 design should freeze one major acceptance package with four sections:

```text
A. design convergence declaration
B. runtime-readiness gate matrix
C. real-validation lane matrix
D. major-close decision rule
```

No implementation schema is required by 3M-10 itself.

## 21. Major-close decision rule direction

The final design should preserve this direction:

```text
DESIGN PACKAGE COMPLETE
+ applicable runtime-readiness gates closed
+ implementation/static CI PASS
+ deployed release evidence PASS
+ required real target-host lanes PASS
+ no unresolved BLOCKER
→ runtime 3.0M major may close
```

A WATCH may remain only if explicitly classified non-blocking with rationale and no contradicted invariant.

A FIX must be repaired/retested.

A DEFER must remain outside the accepted runtime scope.

## 22. Impact-scope disposition

```text
3M_10_IMPACT_SCOPE                     = FROZEN
SELECTED_SEAM                          = DESIGN_CONVERGENCE_AND_RUNTIME_ACCEPTANCE_GATE
DESIGN_CONVERGENCE_CLOSE               = ALLOWED BY FINAL 3M-10 DESIGN
RUNTIME_IMPLEMENTATION_READY           = NO
REAL_LONG_CHAT_PASS                    = NOT CLAIMED
FIRST_MAJOR_FAMILIES                   = LIVE_REACTION / BOARD / NEWS
CANDIDATE_C                            = NOT ACTIVATED
EXPOSURE_TARGET_HOST_GATE              = PENDING
ACTIVE_SIDECAR_TRANSPORT               = PENDING
ACTIVE_SOURCE_JOB_SELECTOR             = PENDING
PRESENTATION_HOST_MOUNT                = PENDING
FAMILY_IMPLEMENTATION_CAPS             = PENDING
NEWS_MATURITY_CONTEXT_PRODUCER         = PENDING
INTEGRATION_EVIDENCE_INSTRUMENTATION   = PENDING
PRODUCTION                             = UNCHANGED
S7 / v0.70.3                           = UNCHANGED
release-simcore                        = UNCHANGED
NEXT                                   = 3M-10 MAJOR CONVERGENCE / REAL-VALIDATION DESIGN
```
