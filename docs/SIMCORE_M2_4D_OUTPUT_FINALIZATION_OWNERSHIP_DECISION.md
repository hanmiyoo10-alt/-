# SimCore M2-4D — Output Finalization Ownership Decision

Status: `DESIGN FROZEN PROVISIONALLY · EXTRACTION SELECTED · PRE-M2-3 CONTRACT · MUST REBASE AGAINST POST-M2-3 SOURCE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority while this decision is recorded: `release-simcore` v0.64.7.

Parent design:
- `docs/SIMCORE_M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`
- `docs/SIMCORE_M2_4C_RUNTIME_MIRROR_OBSERVATION_RECEIPT_CONTRACT.md`

Primary references:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- current `release-simcore` v0.64.7 `session` module
- current `finalizePreparedOutput()` helper
- current `CoreRulesetSession.processOutput()` path

## 1. Decision

M2-4 should extract the current deterministic output-finalization transaction from `session` into a dedicated Application service provisionally named:

```text
output-finalize
```

Classification:

```text
OUTPUT_FINALIZATION_COMPOSITION
= EXTRACTION_SELECTED
= COHESIVE_APPLICATION_SERVICE
= MECHANICAL / EQUIVALENCE-FIRST
= NOT A NEW TURN PIPELINE
= NOT A FEATURE CHANGE
```

This selection remains subject to the mandatory post-M2-3 source rebase. If M2-3 materially eliminates the independent finalization responsibility or changes its reuse shape, this decision must be rechecked before implementation.

## 2. Why extraction is justified

The current `finalizePreparedOutput(baseState, prepared, outIndex, opts)` helper is physically inside `session`, but its responsibility can already be described independently from Session identity and persistence:

```text
Take a prepared output plus the current semantic state
→ apply the existing deterministic output-domain finalization sequence
→ return finalized content, finalized cloned state, and bounded receipts
```

It currently composes multiple existing owners including:

```text
Frame continuity
Timestamp canonicalization
Structure commit-safety judgement
Reaction normalization / maxima recording
Community quarantine state
Narrative/Broadcast time commit
World-year synchronization
B_END unlock
lastMode / pending completion
bounded finalization receipts
```

This is not merely a long function. It is a coherent application transaction with its own input/output boundary.

It is also reused conceptually outside the ordinary happy-path output commit: edit/reconcile compatibility replay currently invokes the same finalization helper with reaction normalization disabled to test deterministic equivalence.

Therefore the responsibility is independently testable, independently reusable, and separately changeable while Session should remain the per-chat state holder and sequencing owner.

## 3. Target module identity

```text
OUTPUT_FINALIZE
= DETERMINISTIC_OUTPUT_STATE_TRANSITION_SERVICE
```

Layer:

```text
Application
```

Physical module target:

```js
SimCore.define("output-finalize", function (require, module, exports) {
  ...
});
```

The exact exported function name is not frozen until post-M2-3 rebase, but the semantic operation is provisionally:

```text
finalize(baseState, preparedOutput, outIndex, options)
→ FinalizationResult
```

## 4. What `output-finalize` OWNS

`output-finalize` owns only the fixed orchestration order needed to turn a prepared output into the finalized application state/content pair.

It may coordinate existing owner APIs in the same proven order as production.

Provisionally preserved transaction:

```text
clone/reconcile base semantic state
→ handle inactive/no-pending finalization
→ Frame continuity enforcement
→ timestamp syntax canonicalization
→ Structure state-commit safety judgement
→ Reaction normalization or maxima-only replay mode
→ quarantine bookkeeping when commit safety fails
→ existing narrative/current-time floor application where currently performed
→ world-year synchronization
→ Narrative or Broadcast clock commit using existing Time policy
→ B_END closure/unlock state transition
→ lastMode update
→ pending completion/clear
→ return bounded receipts
```

The service owns this ordering because the ordering itself is the application-level transaction.

The invoked modules retain the semantics of each step.

Canonical distinction:

```text
output-finalize decides WHEN existing owners run in the finalization transaction
!= output-finalize decides WHAT Frame/Time/Structure/Reaction semantics mean
```

## 5. What `output-finalize` does NOT own

The new service must not absorb neighboring responsibilities merely because they occur near output finalization.

### 5.1 Output envelope preparation / compatibility policy

Owner remains:

```text
output-compat
```

`output-finalize` receives already prepared output state/content metadata. It does not select THOUGHTS compatibility policy, envelope candidates, Fresh-confirmation candidates, CR/LF boundary meaning, or safe-envelope compatibility policy.

### 5.2 General Structure semantics

Owner remains:

```text
structure
```

`output-finalize` may call `stateCommitSafety` at the existing point in the transaction but must not duplicate or reinterpret Structure rules.

The existing pre-finalization `validateStructure` call is not automatically moved into the new service during the initial extraction because edit/reconcile replay currently invokes finalization without the same external validation sequence.

Mechanical equivalence takes priority over aesthetic consolidation.

### 5.3 Frame / Time / Reaction policy

Owners remain:

```text
frame
ntime
reaction
```

The service coordinates these modules but does not copy their algorithms or constants.

### 5.4 Persistence

Owner remains:

```text
Store = persistence mechanics
Session = persistence sequencing
```

The service must not call:

```text
SnapshotStore.save
SnapshotStore.load
SnapshotStore.prune
pluginStorage
```

or any persistence backend directly.

### 5.5 Session identity

The service must not own:

```text
current
currentOutputIndex
trustedOutputFingerprint
trustedHostOutputFingerprint
lastPreparedSendIndex
init/bootstrap lifecycle identity
```

It receives a base-state value and returns a result. Session applies the result to its per-chat anchors after persistence sequencing succeeds according to the existing contract.

### 5.6 Runtime Mirror / host transport

The service must not import or call:

```text
runtime-mirror
runtime-host
runtime-session
host.getChat
host.setChat
```

M2-4C remains authoritative for Fresh observation and mirror transport.

### 5.7 Diagnostic rendering

The service may return bounded receipts already naturally produced by finalization, but operator-facing formatting stays in OPS/runtime-probe.

### 5.8 Edit Reconcile policy

The service must not decide:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
```

Those belong to `edit-reconcile` after M2-3.

## 6. Provisional dependency boundary

The smallest expected direct dependency set is:

```text
kernel
frame
time
structure
reaction
```

Any additional dependency must be justified by the actual post-M2-3 source.

In particular, do not add dependencies on:

```text
store
session
runtime-*
representation
edit-reconcile
prompt
ops
```

without a new ownership review.

`output-compat` should remain outside the initial finalizer dependency set unless post-M2-3 evidence proves the post-finalization candidate-plan construction cannot remain cleanly sequenced by Session/application wiring.

## 7. Finalization result contract

The existing result shape already provides a strong basis for a bounded value result.

Provisionally preserve equivalent fields such as:

```text
state
content
active
mode
envelopeIssues
envelopeDiagnostics
envelopeRepaired
stateCommit
frameGuardProbe
narrativeClockProbe
timestampCanonicalization
```

Rules:

```text
returned state is the finalized clone/reconciled state
caller-owned base state is not mutated in place
raw history is not retained
raw Fresh is never accepted as an input
no host object is retained
receipts remain bounded
```

The result is an application value, not durable ownership state for the finalizer module.

## 8. Side-effect contract

The target service should remain synchronous and deterministic to the same extent as the current helper.

Allowed effects:

```text
mutate only the cloned semantic state being returned
transform the output string using already-owned deterministic domain helpers
produce bounded receipts
```

Forbidden effects:

```text
storage I/O
host I/O
network I/O
timers
subscriptions
runtime-global mutation
persistent caches
unbounded logs/history
```

## 9. Relationship to Session after extraction

Target `CoreRulesetSession.processOutput()` responsibility becomes approximately:

```text
resolve/load correct base state
→ call output-compat prepare
→ call existing full Structure validation where required
→ call output-finalize transaction
→ ask output-compat for any post-finalization bounded compatibility/candidate plan
→ compute/attach required canonical + host-raw fingerprints through the existing owner boundary
→ persist finalized state through Store
→ update Session anchors
→ return bounded output result for runtime mirror/diagnostics handoff
```

Session therefore remains the owner of application sequencing around persistence while `output-finalize` owns the inner deterministic semantic finalization transaction.

This preserves the M2-4B identity:

```text
Session = per-chat stateful application orchestrator
```

rather than reducing Session to a meaningless pass-through shell.

## 10. Relationship to M2-4C

M2-4C defines:

```text
Mirror OBSERVE
→ Output Compat INTERPRET
→ safe APPLY
→ Representation RECORD
```

M2-4D sits earlier in the output path:

```text
output-compat PREPARE
→ Structure external validation
→ output-finalize FINALIZE
→ output-compat builds post-finalization candidate/confirmation plan
→ Session persists state
→ Runtime Mirror later observes Fresh once
```

The two services must not merge.

`output-finalize` operates on deterministic Core/Application state before host Fresh observation.
`runtime-mirror` operates on later host observation/transport.

## 11. Relationship to M2-3 Edit Reconcile

Current production edit/manual-reconcile compatibility paths replay `finalizePreparedOutput(...)` in memory to test whether a visible representation deterministically maps back to the already committed output state.

After M2-3, the actual wiring must be re-read.

If deterministic finalization replay remains part of Edit Reconcile, the preferred dependency direction is:

```text
edit-reconcile
→ output-finalize
```

or an equivalent injected finalization operation.

Forbidden direction:

```text
output-finalize
→ edit-reconcile
```

This keeps finalization as a reusable lower application service and prevents a cycle.

Do not change the frozen M2-3 dependency contract preemptively. M2-3 lands first; M2-4 then rebases and selects direct-import versus injected-operation wiring from the actual source.

## 12. Why this is NOT a Turn Pipeline

M2-4D must not create a generic abstraction that owns request preparation, output preparation, persistence, mirror scheduling, and diagnostics.

The extracted boundary is deliberately narrow:

```text
prepared output + base semantic state
→ finalized output + finalized semantic state + bounded receipts
```

Nothing before or after that transaction is automatically part of `output-finalize`.

Therefore:

```text
output-finalize != turn-pipeline
output-finalize != output-controller
output-finalize != session replacement
```

## 13. Initial extraction strategy

If post-M2-3 rebase confirms the present shape, implementation should be mechanical:

```text
1. create physical `output-finalize` Application module
2. move `finalizePreparedOutput` body with behavior-equivalent ordering
3. preserve helper inputs/options/result fields
4. retarget Session normal-output call site
5. retarget any post-M2-3 Edit Reconcile replay call site
6. do not move Store calls
7. do not move Mirror calls
8. do not merge output-compat preparation into the service
9. do not redesign domain helper algorithms
```

The initial extraction should prefer byte/body equivalence where mechanically possible.

Any semantic cleanup discovered during extraction must be recorded separately as WATCH / DEFER / FIX and not smuggled into the ownership move.

## 14. Regression / differential proof requirements

Permanent/static proof should cover at minimum:

```text
inactive/no-pending output
ordinary Mode A finalization
ordinary Mode C finalization
B_START
B_CONTINUE
B_END
B_END unlock
Frame continuity repair path
timestamp canonicalization path
Narrative clock SAME / ADVANCED / seeded behavior
Broadcast airtime commit behavior
Structure-safe COMMUNITY commit
Structure-unsafe quarantine
Reaction normalization enabled
reaction maxima-only replay (`normalizeReactions: false`)
lastMode update
pending clear
result receipt equivalence
caller base-state non-mutation
no new storage calls
no new host calls
no new network/timer surfaces
```

If edit-reconcile replay remains after M2-3, add differential controls proving the same replay inputs produce the same fingerprints/state result before and after extraction.

## 15. Runtime/live requirements if implemented

Because moving the finalization transaction changes production runtime bytes, normal SimCore release sequencing applies:

```text
main design/evidence
→ dedicated M2-4 work branch after M2-3 gate
→ mechanical implementation
→ syntax / architecture / permanent regression CI
→ latest.js == install.js
→ release-simcore deployment
→ real long-chat validation
→ classify PASS / WATCH / FIX / BLOCKER
→ main evidence + long-term development memory sync
```

Live validation should exercise at least ordinary non-broadcast output and natural broadcast lifecycle coverage available during the validation window, while preserving all existing M2 regression controls.

## 16. Post-M2-3 rebase questions

Before implementation, explicitly answer:

```text
1. Does a single deterministic finalization transaction still exist?
2. Does Edit Reconcile still replay it independently?
3. Has any finalization step moved during M2-3?
4. Does Session still directly own any semantic finalization decision rather than call ordering?
5. Is the provisional dependency set still sufficient?
6. Can the helper move without changing preparation/validation/persistence ordering?
7. Does any new circular Application dependency appear?
```

If answers materially differ, update this contract before coding.

## 17. Final M2-4D verdict

```text
M2_4D_OUTPUT_FINALIZATION
= EXTRACT
= PHYSICAL TARGET `output-finalize`
= APPLICATION LAYER
= DETERMINISTIC OUTPUT STATE TRANSITION
= OWNS FINALIZATION CALL ORDER ONLY
= DOMAIN OWNERS KEEP THEIR SEMANTICS
= NO STORE
= NO HOST
= NO MIRROR
= NO OUTPUT-COMPAT POLICY OWNERSHIP
= NO EDIT-RECONCILE POLICY OWNERSHIP
= NO DIAGNOSTIC RENDERING
= MUST REBASE AFTER M2-3
= NO IMPLEMENTATION YET
```

## 18. Next design slice

Proceed to:

```text
M2-4E — Recovery Facade Call-Site Audit
```

Goal:

After M2-1 split Recovery into `output-compat` and `bootstrap-migration`, identify which post-M2-3/M2-4 callers still genuinely need the compatibility facade and which should call the physical owner directly.

Do not delete the facade merely because physical owners exist. Retirement requires call-site equivalence evidence and a clear compatibility boundary.
