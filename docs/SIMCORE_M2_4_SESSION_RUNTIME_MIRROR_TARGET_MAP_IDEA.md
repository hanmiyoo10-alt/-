# SimCore M2-4 — Session / Runtime Mirror Target Map

Status: `IDEA RECORDED · PRE-M2-4 OWNERSHIP RESEARCH · MUST REBASE AFTER M2-3 · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority while this idea is recorded: `release-simcore` v0.64.7.

Primary references:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_MODULE_COHESION_AND_EXTRACTION_GUIDELINE.md`
- `docs/SIMCORE_DESIGN_RESEARCH_CANDIDATES_2026-08-26.md`
- current `release-simcore` runtime source

## 1. Purpose

Prepare the ownership target for the checkpoint after M2-3 without implementing it early.

M2-3 is expected to remove Edit Reconcile decision ownership from the current Session/outer-shell shape and place it in the dedicated `edit-reconcile` application service.

M2-4 should then answer two questions:

```text
After Edit Reconcile extraction, what responsibilities legitimately remain in Core Session?

After Representation ownership moved in M2-2, is Runtime Mirror truly transport/host-observation only,
or does any policy interpretation still remain embedded in it?
```

This is a target-map exercise, not authorization to change v0.64.7 or to preempt the active M2-3 workstream.

Mandatory rebase rule:

```text
M2-3 physical shape lands / stabilizes
→ re-read actual source
→ compare this target map against the new ownership reality
→ only then freeze M2-4 implementation design
```

Do not implement M2-4 against an imagined post-M2-3 source tree.

## 2. Constitutional direction

Contracts v2 already defines the long-term Session target conceptually as:

```text
session identity / current-state holder
+
bounded orchestration
```

and identifies extraction candidates such as Edit Reconcile and bootstrap/migration coordination.

The architecture registry similarly marks Session as:

```text
status = orchestrator_reduce_in_m2
owns = session state holder and current request/output/persistence orchestration
```

while Runtime Mirror is already marked as:

```text
status = narrowed_m2_2
owns = Fresh-chat read
     + strict identity/location/staleness mirror guard
     + mirror write scheduling
```

The target is therefore not a rewrite. It is a narrowing/completion pass.

## 3. Important name boundary — `session` != `runtime-session`

These must remain separate concepts.

### Core/Application `session`

Layer:

```text
Application
```

Expected long-term role:

```text
per-chat state/session identity
+ request/output phase orchestration
+ persistence sequencing
```

### `runtime-session`

Layer:

```text
Runtime
```

Current role:

```text
host-facing CoreSession reuse
host/chat key resolution
cold-init/load selection
CoreRulesetSession construction
```

Current architecture explicitly excludes edit/output business logic from `runtime-session`.

Therefore M2-4 must not solve Session size by merging the two similarly named modules.

Canonical boundary:

```text
runtime-session
= which CoreSession instance belongs to this host/chat context?

session
= how does that CoreSession coordinate application work once selected?
```

## 4. Proposed M2-4 Session target

M2-4 should preserve a real Session. A zero-logic pass-through shell is not the goal.

Target identity:

```text
SESSION
= STATEFUL_APPLICATION_ORCHESTRATOR
```

### 4.1 KEEP in Session

#### A. Per-chat state identity

Session may continue to hold bounded current-session references such as:

```text
SnapshotStore instance
current semantic state
current output index / session-local position
bounded trusted current-output identity references when they are shared orchestration context
initialization source / bootstrap-needed flags
```

Important distinction:

```text
Session may hold an identity/reference
!= Session owns the classification policy applied to that identity
```

After M2-3, Edit Reconcile should own reconcile-path meaning even when Session provides the current session references it needs.

#### B. Request phase ordering

Session should remain the place that sequences application work conceptually as:

```text
load current state
→ request-domain preparation
→ request-scoped frame/authority inputs
→ prompt serialization call
→ snapshot persistence
```

The invoked domain/application owners retain their own semantics.

For example:

```text
Lifecycle owns lifecycle/request policy
Frame owns frame facts
Prompt owns prompt bytes
Store owns persistence mechanics
Session owns call ordering
```

#### C. Output phase ordering

Session should remain allowed to coordinate:

```text
load send/current state
→ output-compat preparation
→ Structure validation
→ application finalization call
→ output snapshot persistence
```

M2-4 must not confuse sequencing ownership with semantic ownership.

#### D. Persistence sequencing

Session may determine when application results are saved, while Store remains the sole persistence-mechanics owner.

Canonical distinction:

```text
Session: save this completed application state now
Store: perform bounded serialization/backend persistence/retention
```

Session must not absorb Store internals.

#### E. Bounded application timing collection

Session may continue collecting bounded phase timings required to attribute request/output cost.

Formatting and operator-facing rendering remain OPS/runtime-probe responsibilities.

## 5. Responsibilities that should NOT remain Session-owned after M2-3/M2-4

### 5.1 Edit Reconcile decision tree

M2-3 prerequisite:

```text
SAME_FAST / SAME_HOST_FAST
snapshot exact-match routing
REPRESENTATION_DRIFT_CORRELATED routing
USER_EDIT_CANDIDATE routing
AMBIGUOUS_CHANGE routing
manual rebuild fallback coordination
```

Target owner:

```text
edit-reconcile
```

Session should call the service and apply its bounded result; it should not retain a shadow copy of the decision tree.

Any clock-seeding compatibility behavior that exists only as part of the reconcile path should move with that complete responsibility unless post-M2-3 source evidence proves it is actually a separate owner.

### 5.2 Representation classification / provenance

Target owner remains:

```text
representation
```

Session may pass fingerprints/identity references to services but must not recreate `CANONICAL / HOST_RAW / FRESH_CHAT` taxonomy or own the provenance ledger.

### 5.3 Prompt wording

Target owner remains:

```text
prompt
```

Session may call prompt serialization, not own runtime prompt text/tiers.

### 5.4 Output compatibility semantics

Target owner remains:

```text
output-compat
```

Session should not gain envelope candidate/preamble/Fresh-confirmation policy merely because it coordinates output processing.

### 5.5 Bootstrap / migration semantic decisions

Target owner remains:

```text
bootstrap-migration
```

M2-4 should review the current `bootstrapHistoryIfNeeded` / legacy repair coordination and narrow Session to:

```text
request bootstrap/migration result
→ adopt returned state
→ persist when required
```

rather than retaining migration-policy internals.

However, do not move SnapshotStore ownership into `bootstrap-migration` merely to eliminate Session lines. Session may remain responsible for applying/persisting a migration result when that preserves the Store boundary cleanly.

### 5.6 Host calls

Core Session must not call host APIs directly.

Host-facing session selection remains `runtime-session`; Fresh/read-write mirror work remains `runtime-mirror` + `runtime-host`.

## 6. Output finalization is a separate M2-4-adjacent research boundary

Current Session output processing calls several owners around a shared finalization path.

This does not automatically authorize extracting a new module during M2-4.

Canonical rule:

```text
M2-4 Session narrowing
!= automatic output-finalize extraction
```

Instead classify the current finalization composition after M2-3 as one of:

```text
COHESIVE_APPLICATION_HELPER
WATCH_EXTRACTION
EXTRACTION_CANDIDATE
EXTRACTION_REQUIRED
```

A dedicated Output Finalization Ownership Map should decide whether a physical service is justified.

Do not create a generic Turn Pipeline as a shortcut. M1 already selected keeping Lifecycle as the request-domain coordinator during M2 rather than broad Turn-Pipeline extraction.

## 7. Proposed Runtime Mirror target

Target identity:

```text
RUNTIME_MIRROR
= HOST_OBSERVER
+ STRICT_GUARD
+ MIRROR_TRANSPORT
+ BOUNDED_OBSERVATION_RECEIPT
```

### 7.1 KEEP in Runtime Mirror

#### A. Fresh host observation

Runtime Mirror is the correct owner for the existing host-facing Fresh read because Core/Application modules must not directly read the host.

#### B. Strict guards

Keep strict runtime safety gates such as:

```text
runtime/epoch currentness
latest scheduled sequence
location identity
expected output slot/index
state/snapshot identity
staleness/supersession rejection
```

These are transport/write-safety responsibilities.

#### C. Mirror write scheduling

Keep:

```text
deferred scheduling
host chat preparation
strict safe-write decision boundary
host.setChat transport
fail-open/no-unsafe-write behavior
```

M2-4 must not weaken Deferred Mirror safety to simplify ownership.

#### D. Bounded observation receipt publication

Runtime Mirror may emit a bounded receipt containing facts it directly observed, for example:

```text
outIndex
locationKey
status
canonical fingerprint reference
host-raw fingerprint reference
Fresh fingerprint reference
exact candidate-match identity
bounded timing
```

Raw Fresh bodies remain forbidden.

Representation may consume that receipt to retain bounded provenance.

## 8. Runtime Mirror ownership debt candidate — observation vs policy interpretation

Current production is already described diagnostically as:

```text
Representation ownership: REPRESENTATION
mirror TRANSPORT_ONLY
```

But current Runtime Mirror still performs some interpretation while comparing Fresh against output-compat candidate fingerprints. It currently emits policy-shaped labels including families such as:

```text
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

This is not classified here as a correctness defect.

It is an M2-4 ownership question:

```text
Does Mirror need to know the semantic meaning of a matched candidate,
or only that Fresh matched candidate X exactly?
```

Preferred research direction:

```text
Runtime Mirror
→ observe Fresh fingerprint
→ exact-compare against opaque bounded candidate identities
→ emit observation receipt / matched candidate id

Output Compat
→ owns what candidate id means for envelope compatibility/recovery policy

Representation
→ owns CANONICAL/HOST_RAW/FRESH relation and provenance retention
```

Potential target interface concept:

```text
Mirror fact:
  fresh exactly matched candidate #2

Output-compat interpretation:
  candidate #2 = SAFE_BOUNDARY_CONFIRMATION

Representation interpretation:
  resulting accepted representation relation = EXACT alias / bounded provenance fact
```

Do not freeze exact API names yet.

### Why this is valuable

It would make the existing `TRANSPORT_ONLY` diagnostic claim correspond more literally to physical ownership.

### Why this must wait

Moving this interpretation may affect asynchronous mirror/recovery sequencing. It therefore needs a post-M2-3 source audit and equivalence plan, not a speculative refactor now.

Current classification:

```text
RUNTIME_MIRROR_CONFIRMATION_POLICY_INTERPRETATION
= WATCH_EXTRACTION
= OWNERSHIP_DEBT_CANDIDATE
= NOT A CORRECTNESS DEFECT
= NO IMPLEMENTATION AUTHORIZED
```

## 9. Representation receipt boundary

Current Runtime Mirror calls back into the Representation-owned registry after the deferred observation completes.

Conceptually this is acceptable if the direction is:

```text
Mirror produces bounded host observation
→ Representation stores/classifies bounded provenance
```

It becomes incorrect only if Mirror itself becomes the durable taxonomy/ledger authority again.

M2-4 should therefore preserve:

```text
representation ledger owner = representation
raw Fresh retention = NONE
persistent representation ledger = NONE
```

and prefer a narrow observation-receipt contract over shared mutable ownership.

## 10. Preliminary responsibility disposition map

| Responsibility | Current area | M2-4 disposition | Target owner |
|---|---|---|---|
| Per-chat current state holder | Session | KEEP | Session |
| SnapshotStore instance / persistence sequencing | Session + Store | KEEP boundary | Session orders, Store persists |
| Request lifecycle semantics | Lifecycle called by Session | KEEP owner | Lifecycle |
| Request/output call ordering | Session | KEEP | Session |
| Prompt bytes | Prompt | KEEP OUT of Session | Prompt |
| Edit reconcile path selection | Session/outer shell pre-M2-3 | MOVE in M2-3 | edit-reconcile |
| Representation taxonomy/provenance | Representation | KEEP OUT of Session/Mirror | representation |
| Bootstrap/migration policy | Session + Recovery facade coordination | NARROW/MOVE | bootstrap-migration |
| Output envelope compatibility | output-compat through Recovery facade | KEEP owner; later direct-call candidate | output-compat |
| Structure judgement | Structure | KEEP owner | structure |
| Output-finalization composition | application helper / Session path | DEFER dedicated study | TBD application boundary |
| Host CoreSession reuse/cold-init selection | runtime-session | KEEP | runtime-session |
| Fresh host read | runtime-mirror | KEEP | runtime-mirror |
| Mirror staleness/location/sequence guards | runtime-mirror | KEEP | runtime-mirror |
| Mirror host write scheduling | runtime-mirror | KEEP | runtime-mirror |
| Fresh candidate exact comparison | runtime-mirror | KEEP observation primitive, review representation | runtime-mirror observation |
| Meaning of matched envelope candidate | runtime-mirror currently partly interprets | REVIEW EXTRACTION | output-compat candidate |
| Representation observation retention | Representation callback/registry | KEEP | representation |
| Diagnostic rendering | OPS/runtime-probe | KEEP OUT | OPS/runtime-probe |

## 11. Session cohesion target

After M2-3, perform a post-extraction cohesion audit.

Ideal result:

```text
Session responsibilities all answer one sentence:

"hold the per-chat application session and sequence bounded request/output work"
```

If the remaining code can be described only as:

```text
state holder
+ migration engine
+ edit classifier
+ output recovery policy
+ finalizer
+ diagnostic formatter
+ persistence engine
```

then ownership drift still exists.

But size alone is not sufficient reason to split.

Possible classifications after M2-3:

```text
COHESIVE_LARGE
→ keep Session intact even if physically large

WATCH_EXTRACTION
→ one recognizable secondary responsibility remains

EXTRACTION_CANDIDATE
→ independently testable/changeable responsibility has clear owner

EXTRACTION_REQUIRED
→ unrelated responsibilities are actively creating dependency/maintenance debt
```

## 12. M2-4 research slices

Suggested design-only sequence after this initial map:

### M2-4A — Post-M2-3 Responsibility Inventory

```text
actual Session methods/fields/calls after M2-3
→ KEEP / CALL_ONLY / MOVE_LATER / DEBT
```

### M2-4B — Session State Holder Contract

Define which fields are legitimate Session-local coordination state versus representation/edit/bootstrap policy state.

### M2-4C — Runtime Mirror Observation Receipt Contract

Separate:

```text
host fact observation
from
semantic interpretation of that fact
```

without adding host reads or raw-body retention.

### M2-4D — Output Finalization Ownership Decision

Decide whether current finalization remains a cohesive application helper or becomes its own service.

This is a separate research artifact even if it later lands in the same broad M2 phase.

### M2-4E — Recovery Facade Call-Site Audit

Identify which Session callers still need the `recovery` compatibility facade after M2-3/M2-4 and which can safely call physical owners directly.

Do not retire the facade before equivalence evidence exists.

## 13. M2-4 non-goals

Do not use M2-4 research to justify:

```text
new feature semantics
new cache behavior
provider cache claims
history normalization or mutation
new host reads
raw Fresh retention
new persistent state
performance optimization mixed into extraction
warning-widget/UI changes
release-system redesign
Turn Pipeline mega-abstraction
renderer responsibility movement into SimCore
```

M2-4 remains mechanical/equivalence-first architecture work.

## 14. Evidence and test expectations

M2-4 should reuse existing permanent controls instead of inventing new behavior.

Important regression families include:

```text
representation-fast
genuine-edit
broadcast-closure
community-reaction
frame / narrative-clock / summary-scope when implemented
reload continuity
```

M2-3 is expected to improve direct executable coverage for `representation-fast` and `genuine-edit` by exposing `edit-reconcile`.

M2-4 should similarly treat improved testability as a useful consequence of cleaner ownership, not as permission to copy private algorithms into tests.

## 15. Promotion gates for any future M2-4 implementation

Before implementation design can become frozen:

```text
1. M2-3 actual source shape is available and stable enough to audit
2. v0.64.7 / intervening production live gates are closed according to normal sequencing
3. Session responsibility inventory is rerun against actual post-M2-3 code
4. every proposed extraction has a clear owns / does-not-own boundary
5. behavior-preservation regression controls are identified
6. no feature/performance/release-system change is mixed into the extraction
```

Runtime Mirror policy-label extraction additionally requires:

```text
exact asynchronous sequencing map
+ no additional Fresh read
+ no raw Fresh retention
+ no weakened mirror guard
+ differential proof of accepted/mismatched representation outcomes
```

## 16. Initial research verdict

```text
M2_4_SESSION_TARGET
= KEEP REAL SESSION
= STATEFUL APPLICATION ORCHESTRATOR
= SESSION IDENTITY/CURRENT STATE HOLDER
= REQUEST/OUTPUT/PERSISTENCE SEQUENCING
= NO EDIT RECONCILE POLICY AFTER M2-3
= NO REPRESENTATION TAXONOMY
= NO HOST I/O
= NO PROMPT WORDING

M2_4_RUNTIME_MIRROR_TARGET
= HOST FRESH OBSERVER
= STRICT IDENTITY/LOCATION/STALENESS GUARD
= DEFERRED MIRROR WRITE TRANSPORT
= BOUNDED OBSERVATION RECEIPT
= NO REPRESENTATION LEDGER OWNERSHIP
= NO RAW FRESH RETENTION

PRIMARY NEW RESEARCH CANDIDATE
= move semantic meaning of Fresh-matched output-compat candidates out of Runtime Mirror
  while preserving Mirror as the sole host observation/transport boundary

implementation: NONE
runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
release-simcore change: NONE
```

## 17. Next recommended artifact

The highest-value next design-only slice is:

```text
M2-4 SESSION STATE HOLDER CONTRACT
```

Reason:

Before deciding what else to extract from Session, freeze exactly which state/references Session is allowed to hold after Edit Reconcile leaves.

That gives later Output Finalization and Recovery-facade research a clean boundary to reason against.
