# SimCore M2-4B — Session State Holder Contract

Status: `DESIGN FROZEN PROVISIONALLY · PRE-M2-3 CONTRACT · MUST REBASE AGAINST POST-M2-3 SOURCE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority while this contract is recorded: `release-simcore` v0.64.7.

Parent design:
- `docs/SIMCORE_M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP_IDEA.md`

Primary references:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_MODULE_COHESION_AND_EXTRACTION_GUIDELINE.md`
- current `release-simcore` v0.64.7 `CoreRulesetSession`

## 1. Purpose

Freeze the constitutional boundary for what Core/Application `session` is allowed to retain after M2-3 removes Edit Reconcile decision ownership.

This contract answers:

```text
What state/reference may legitimately live for the lifetime of a CoreRulesetSession?
What may be held only as bounded orchestration context?
What is merely a receipt from another owner?
What must not remain Session-owned after M2-4?
```

This is not an implementation plan against the current pre-M2-3 physical shape.

Mandatory rebase remains:

```text
M2-3 lands and stabilizes
→ enumerate actual post-M2-3 Session fields/methods
→ compare them to this contract
→ adjust only where actual source evidence requires
→ then freeze M2-4 implementation design
```

## 2. Constitutional identity

Target Session identity remains:

```text
SESSION
= PER_CHAT_STATEFUL_APPLICATION_ORCHESTRATOR
```

A real Session remains useful because one per-chat object must maintain current application identity across request/output phases.

Session is not intended to become:

```text
EDIT_POLICY_ENGINE
MIGRATION_ENGINE
REPRESENTATION_REGISTRY
OUTPUT_COMPAT_POLICY_OWNER
PERSISTENCE_ENGINE
HOST_ADAPTER
DIAGNOSTIC_JUNK_DRAWER
```

Size is not the deciding factor. Ownership cohesion is.

## 3. Current v0.64.7 field inventory

The current production constructor retains the following direct fields:

```text
store
current
initSource
needsHistoryBootstrap
loadedFromLegacySnapshot
trustedOutputFingerprint
trustedHostOutputFingerprint
currentOutputIndex
lastPreparedSendIndex
deferredPruneIndex
deferredPruneRunning
communityAliasRepairStats
templateRecurrenceBootstrapStats
narrativeClockMigrationStats
```

This mixture demonstrates why M2-4B is necessary: legitimate session anchors, migration/bootstrap facts, persistence-housekeeping state, and owner-specific diagnostic receipts currently coexist on one object.

No correctness defect is inferred from that coexistence. This document classifies ownership only.

## 4. Allowed Session-held categories

Session may retain only four conceptual categories long-term.

### 4.1 Canonical current application state

Allowed:

```text
current
```

Meaning:

```text
current reconciled per-chat Core state adopted by Session
```

Rules:

```text
Session may hold the state reference/value.
Session may replace/adopt a state returned by the correct semantic owner.
Session may sequence persistence of the completed state.
Session does not thereby own every semantic field inside the state.
```

For example, holding `current.community`, `current.pending`, or clock fields does not transfer Community, Lifecycle, Time, Representation, or other semantic ownership into Session.

Canonical distinction:

```text
STATE HOLDER != FIELD POLICY OWNER
```

### 4.2 Current session/output identity anchors

Allowed:

```text
currentOutputIndex
trustedOutputFingerprint
trustedHostOutputFingerprint
```

These are legitimate only as bounded identity references for the currently adopted output/session position.

Session may use them to build an immutable/bounded call context for application services such as post-M2-3 `edit-reconcile`.

Session must not interpret them into Representation taxonomy or edit meaning.

Canonical distinction:

```text
Session holds identity anchors.
Representation classifies representation relation.
Edit Reconcile decides reconcile path.
Output Compat decides envelope compatibility meaning.
```

### 4.3 Request/output phase coordination markers

Allowed:

```text
lastPreparedSendIndex
```

and any future equivalent bounded phase marker that is required solely to sequence or deduplicate current request/output application work.

Requirements:

```text
bounded scalar/identity only
no body retention
no semantic-history reconstruction
no independent policy taxonomy
no unbounded accumulation
```

A phase marker may answer:

```text
"Have I already prepared this send index in this Session?"
```

It may not answer semantic questions such as:

```text
"What kind of edit happened?"
"What representation is authoritative?"
"What migration should run?"
```

### 4.4 Bounded initialization/orchestration receipt

Provisionally allowed:

```text
initSource
needsHistoryBootstrap
```

but only under a narrow meaning.

`initSource` may remain a bounded receipt describing which already-selected initialization path produced the current Session state, for example:

```text
fresh
snapshot
mirror
```

It must not grow into host-selection policy or migration semantics.

`needsHistoryBootstrap` may remain only as an orchestration pending flag if post-M2-3 source still needs it to decide whether to call the bootstrap owner.

Canonical target:

```text
Session: bootstrap work is pending / completed
Bootstrap Migration: whether and how bootstrap/migration is semantically required
```

If the post-M2-3/bootstrap cleanup can replace this boolean with a returned bootstrap status without complicating sequencing, prefer that narrower shape.

Therefore `needsHistoryBootstrap` is:

```text
PROVISIONAL_KEEP
= ORCHESTRATION_STATUS_ONLY
= RECHECK_AFTER_M2_3
```

## 5. Field disposition map

| Current field | M2-4B disposition | Long-term meaning / target |
|---|---|---|
| `store` | `KEEP_HANDLE` | Per-chat SnapshotStore association; Store owns mechanics/retention |
| `current` | `KEEP` | Current reconciled per-chat application state |
| `initSource` | `KEEP_BOUNDED_RECEIPT` | Initialization source receipt only |
| `needsHistoryBootstrap` | `PROVISIONAL_KEEP` | Pending orchestration status only; semantic decision belongs elsewhere |
| `loadedFromLegacySnapshot` | `MOVE_POLICY_FACT / REMOVE_AS_SESSION_AUTHORITY` | Legacy/trust interpretation belongs to bootstrap/migration result, not Session policy |
| `trustedOutputFingerprint` | `KEEP_IDENTITY_ANCHOR` | Current trusted canonical identity reference only |
| `trustedHostOutputFingerprint` | `KEEP_IDENTITY_ANCHOR` | Current trusted host-visible identity reference only |
| `currentOutputIndex` | `KEEP_POSITION_ANCHOR` | Current adopted assistant output position |
| `lastPreparedSendIndex` | `KEEP_PHASE_MARKER` | Request preparation idempotence/ordering only |
| `deferredPruneIndex` | `MOVE_TO_STORE_HOUSEKEEPING` | Retention scheduling/dedupe belongs with Store retention mechanics |
| `deferredPruneRunning` | `MOVE_TO_STORE_HOUSEKEEPING` | Retention task lifecycle belongs with Store retention mechanics |
| `communityAliasRepairStats` | `RECEIPT_ONLY / MOVE_OUT_OF_CONSTITUTIONAL_SESSION_STATE` | Bounded repair/diagnostic receipt; owning repair path decides semantics |
| `templateRecurrenceBootstrapStats` | `RECEIPT_ONLY / MOVE_OUT_OF_CONSTITUTIONAL_SESSION_STATE` | Bounded bootstrap/diagnostic receipt; Recurrence/bootstrap owner decides semantics |
| `narrativeClockMigrationStats` | `RECEIPT_ONLY / MOVE_OUT_OF_CONSTITUTIONAL_SESSION_STATE` | Bounded migration/diagnostic receipt; Time/bootstrap migration decides semantics |

## 6. `store` boundary

Session may retain one per-chat `SnapshotStore` handle because request/output orchestration must load/save the selected Session state.

That does not authorize Session to own persistence mechanics.

Target split:

```text
Session
→ decides application sequencing point at which load/save/retention request is appropriate

Store
→ keying mechanics
→ serialization mechanics
→ persistence backend calls
→ snapshot bundle mechanics
→ retention/prune mechanics
→ prune dedupe/running state
```

The current `deferredPruneIndex` / `deferredPruneRunning` pair is therefore ownership debt even though Session currently knows when the output path has completed enough to request housekeeping.

Preferred target:

```text
Session output orchestration
→ store.requestDeferredPrune(outIndex)   // conceptual only; API name not frozen

Store
→ cadence eligibility
→ duplicate suppression
→ running-state guard
→ prune execution
```

Do not move output-phase semantic decisions into Store merely to remove Session lines.

## 7. Trusted identity tuple invariant

The following fields form one conceptual identity tuple:

```text
currentOutputIndex
trustedOutputFingerprint
trustedHostOutputFingerprint
```

M2-4 implementation must preserve their coherence.

Required invariants:

```text
A. fingerprints describe only the currently trusted/adopted output identity
B. a change of adopted output position must update/clear the tuple coherently
C. an untrusted/legacy/unknown load must not manufacture trusted fingerprints
D. fingerprints remain bounded identity evidence only; no raw body accompanies them
E. Representation classification is not cached here as a second taxonomy
F. Edit Reconcile result labels are not persisted into this tuple as policy state
```

After M2-3, `edit-reconcile` may consume this tuple as call input, but it must not require Session to duplicate its decision tree.

## 8. Legacy/bootstrap fact boundary

Current v0.64.7 uses `loadedFromLegacySnapshot` while deciding whether loaded fingerprints are trusted.

That is a real current compatibility behavior, so M2-4 must preserve its outcome.

However, the long-term owner boundary should be:

```text
Bootstrap/Migration owner
→ inspect legacy/version/migration facts
→ reconcile/repair as authorized
→ return bounded adoption/trust result

Session
→ adopt returned state
→ adopt or clear returned trusted identity references
→ remember only bounded initialization status if still useful
```

Session should not retain a parallel long-lived `loadedFromLegacySnapshot` policy flag and later reinterpret it independently.

Preferred semantic output from the bootstrap/migration side is conceptually:

```text
state
source
trustedIdentityEligible
bootstrapStatus
bounded migration receipt
```

Exact object/API names are intentionally not frozen before the post-M2-3 source audit.

## 9. Diagnostic/repair receipt rule

Session currently retains several bounded last-operation statistics.

Their bounded nature is healthy, but their presence on Session does not make Session their semantic owner.

M2-4B rule:

```text
Session may temporarily carry/forward an owner-produced bounded receipt when orchestration or diagnostics need it.
Session must not become the canonical semantic source for that receipt.
Session must not accumulate receipt history.
Session must overwrite/clear rather than append unboundedly.
```

Long-term preferred direction:

```text
owner executes operation
→ returns bounded receipt
→ Session forwards/adopts only what current orchestration needs
→ OPS/runtime-probe renders diagnostics
```

Therefore the three current `*Stats` fields are not part of the constitutional Session state-holder core.

They are:

```text
TRANSITIONAL_BOUNDED_RECEIPTS
```

A later source audit may choose one of:

```text
KEEP_AS_TRANSIENT_FORWARDING_RECEIPT
RETURN_DIRECTLY_FROM_OWNER
MOVE_TO_BOUNDED_DIAGNOSTIC_ENVELOPE
```

Do not invent a new diagnostic subsystem solely to remove three fields.

## 10. Forbidden Session-held state after M2-4

Session must not retain or own:

```text
raw Fresh bodies
raw response-body copies beyond immediate call scope
full host history as Session state
representation provenance ledger
CANONICAL/HOST_RAW/FRESH_CHAT taxonomy cache
edit-reconcile decision taxonomy/state machine
output-compat candidate semantic tables
mirror policy labels
migration algorithms or legacy-version policy tables
Store retention task state
provider cache state/claims
host API handles solely for semantic work
runtime epoch/location/staleness guard state
unbounded diagnostic history
unbounded timing samples
renderer/body repair policy
```

Temporary method-local inputs are not Session-held state if they are released after the call and not captured by long-lived closures.

## 11. Mutation rule

Session may mutate its own anchors only for orchestration identity/state adoption.

Allowed conceptual mutations:

```text
adopt returned current state
advance/restore currentOutputIndex
set/clear trusted identity tuple
mark current send as prepared
record bounded init source/status
```

Disallowed conceptual mutations:

```text
classify representation relation itself
reinterpret Fresh candidate semantic meaning
choose manual-edit rebuild policy itself after M2-3
perform migration semantic transformation itself after owner extraction
change Store retention policy itself
invent diagnostic reason taxonomies
```

When another owner returns a result, Session should prefer:

```text
call owner
→ receive state/result/receipt
→ adopt bounded result
→ persist at the correct orchestration point
```

over:

```text
call helper primitives
→ reconstruct owner decision tree inside Session
```

## 12. Lifetime rules

### Session lifetime

May persist for the lifetime of one CoreRulesetSession:

```text
store handle
current
currentOutputIndex
trusted identity tuple
bounded init source/status
```

### Turn/request-output lifetime

May persist only as needed for current sequencing/idempotence:

```text
lastPreparedSendIndex
future equivalent scalar phase markers
```

### Operation receipt lifetime

May exist only as bounded last-result metadata and must not accumulate:

```text
repair/bootstrap/migration diagnostic receipts
bounded phase timings
```

### Method-call lifetime only

Should not become Session fields:

```text
raw message bodies
history arrays
Fresh body
output-compat candidate bodies
temporary parser structures
full rebuild working sets
```

## 13. Memory/resource safety overlay

The Session holder contract should make long-chat resource behavior mechanically bounded.

Required properties:

```text
no array/log growth with turn count on Session itself
no retained raw body/history copies
no timer/subscription ownership introduced
no Promise retained after operation completion
no duplicated Store cache
no persistent Representation ledger
bounded scalar/fingerprint/receipt fields only
```

`current` may naturally contain the bounded canonical Core state schema, while Store remains responsible for snapshot retention.

If a future Session field grows proportionally with chat length, that is presumptive ownership/resource debt and must be separately justified.

## 14. Post-M2-3 M2-4A audit checklist derived from this contract

Once M2-3 physically lands, enumerate every Session field and method and classify it against this contract.

For every field ask:

```text
1. Is it canonical current state, current identity, phase coordination, or bounded init status?
2. If not, is it only a transitional bounded receipt?
3. Which module actually owns the meaning of this value?
4. Does Session inspect the value semantically or merely forward/adopt it?
5. Does its lifetime exceed the operation that produced it?
6. Can it grow with chat length?
7. Does it exist only because another module lacks a proper result contract?
```

Classification vocabulary:

```text
KEEP_SESSION_ANCHOR
KEEP_PHASE_MARKER
KEEP_BOUNDED_RECEIPT
CALL_ONLY
MOVE_TO_OWNER
REMOVE_REDUNDANT
DEBT_REQUIRES_SEPARATE_EXTRACTION
```

## 15. M2-4B implementation constraints

Any later physical implementation must remain mechanical/equivalence-first.

Do not combine with:

```text
new user-facing semantics
performance tuning
new caching behavior
new persistence schema
new host reads/writes
warning-widget changes
release-system changes
M2-3 algorithm changes
Output Finalization extraction unless separately authorized
Runtime Mirror receipt extraction unless separately authorized
```

Moving Store housekeeping state is allowed only as a mechanical ownership change with identical retention behavior.

Moving bootstrap/migration facts is allowed only with differential proof that loaded-state/trusted-identity outcomes remain equivalent.

## 16. Regression/equivalence controls

At minimum preserve:

```text
fresh init
snapshot init
mirror init
legacy/untrusted load behavior
ordinary exact carryover
representation-fast exact Fresh carryover
genuine user edit rebuild
reroll/restore sequencing
request preparation idempotence
output current-index adoption
SnapshotStore load/save behavior
SnapshotStore retention outcome
reload continuity
no raw Fresh retention
```

When permanent suites become executable, use them rather than duplicating private algorithms in tests.

## 17. M2-4B verdict

```text
SESSION_CONSTITUTIONAL_STATE
= CURRENT CORE STATE
+ PER_CHAT STORE HANDLE
+ CURRENT OUTPUT POSITION
+ TRUSTED OUTPUT IDENTITY REFERENCES
+ BOUNDED REQUEST/OUTPUT PHASE MARKERS
+ BOUNDED INIT/BOOTSTRAP STATUS

SESSION_MAY_CARRY
= BOUNDED OWNER-PRODUCED TRANSIENT RECEIPTS

SESSION_MUST_NOT_OWN
= EDIT RECONCILE POLICY
= REPRESENTATION TAXONOMY/LEDGER
= OUTPUT COMPAT SEMANTICS
= BOOTSTRAP/MIGRATION POLICY
= STORE RETENTION TASK STATE
= HOST/MIRROR GUARD STATE
= RAW BODIES/HISTORY
= UNBOUNDED DIAGNOSTICS

CURRENT FIELD MOVEMENT CANDIDATES
= loadedFromLegacySnapshot -> bootstrap/migration result fact
= deferredPruneIndex/deferredPruneRunning -> Store retention machinery
= owner-specific *Stats -> transitional receipt, not constitutional Session state

implementation: NONE
runtime change: NONE
release-simcore change: NONE
```

## 18. Next design slice

With Session holder boundaries frozen provisionally, the next design-only slice may be:

```text
M2-4C — Runtime Mirror Observation Receipt Contract
```

That artifact should freeze exactly what Runtime Mirror may observe/emit as host facts and what semantic interpretation must remain in Output Compat / Representation, while preserving strict Deferred Mirror guards and zero raw-Fresh retention.
