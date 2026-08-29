# SimCore Release System R2.8 — Human-Evidence Terminal Convergence

Date: 2026-08-30 KST

Status: **DESIGN FROZEN · IMPLEMENTATION NOT AUTHORIZED · NON_RUNTIME**

Predecessor: `R2.7 — Evidence-Derived Operations`

Primary evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_OPERATIONAL_CLOSURE_2026-08-29.md`
- `products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json`
- `docs/SIMCORE_LIVE_06600_RELEASE_CLOSE_2026-08-29.md`
- `docs/SIMCORE_06600_LIVE_PASS_TERMINAL_CLOSURE_V2_2026-08-29.md`
- `docs/SIMCORE_06700_TERMINAL_ADMIN_CLOSURE_2026-08-29.md`
- `.github/workflows/simcore-release-state-sync.yml`
- `products/simcore/tooling/admin-state-transition.mjs`
- `products/simcore/tooling/release-state-converge.mjs`

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

---

## 1. Decision

R2.8 removes the remaining manual administrative handoff between accepted human live evidence and durable terminal project state.

Canonical direction:

```text
KEEP HUMAN AUTHORITY HUMAN
AUTOMATE THE BOOKKEEPING AFTER AUTHORITY
DERIVE THE TERMINAL TRANSITION FROM ACCEPTED EVIDENCE
REUSE THE EXISTING STATE ENGINE
REUSE THE EXISTING MAIN GATEWAY
DELETE ONE-SHOT TRANSPORT, NOT SAFETY
```

Disposition:

```text
R2.8 = TERMINAL CONVERGENCE SIMPLIFICATION
PRIMARY GOAL = HUMAN_EVIDENCE -> DURABLE TERMINAL STATE WITHOUT ONE-SHOT COMMAND PR
SAFETY MODEL = R2.7 + R2.6 INVARIANTS FROZEN
```

R2.8 does not automate the decision that a real long chat passed.
It automates only deterministic repository bookkeeping after that decision has already been durably authorized by a human evidence record.

---

## 2. Problem

The release system already automates most of the path:

```text
exact approval
-> permanent publication
-> post-publish state convergence
-> LIVE_PENDING
-> durable release record / receipt
-> current production + live gate projection
```

R2.7 also proved that immutable operational proof can safely project documentary system status through the existing main gateway.

The remaining repeated manual seam appears after real-long-chat acceptance:

```text
human accepts LIVE_PASS
-> write close evidence
-> manually construct/register active-admin-transition.json
-> open transport-only "SimCore durable memory sync command" PR
-> workflow consumes one-shot transition
-> update product-manifest / CURRENT_DEVELOPMENT / GUIDELINES
-> main gateway admission
-> re-read durable terminal state
-> retire active-admin-transition.json
-> close transport PR without merge
-> write terminal closure prose
```

v0.66 and v0.67 both required this family of actions. The state engine itself already existed and worked; the recurring cost was transaction packaging, invocation, one-shot retirement, and stale human/documentary duplication.

This creates avoidable surfaces:

```text
operator memory
one-shot JSON construction
transport PR lifecycle
one-shot retirement
manual replay of terminal fields
stale nested/current prose risk
extra failure opportunities unrelated to runtime correctness
```

The simplification target is therefore not a new state system.
It is the elimination of manual glue around the existing one.

---

## 3. Frozen invariants

R2.8 must preserve all currently proven authority boundaries:

```text
1 production publisher = RS2_4_PERMANENT
1 main writer/integration gateway = repo-main-write.py
Candidate Required remains
exact C/P/blob binding remains
preplay remains
post-publish reobservation remains
latest.js == install.js remains
append-only failure/recovery evidence remains
HUMAN_EVIDENCE remains human authority
no automatic determination of LIVE_PASS
no automatic major-checkpoint advancement without explicit human-authorized terminal evidence
no background polling
no automatic release retry
no automatic publication
no automatic PR merge
no force push/publication
runtime/plugin semantics unchanged
release-simcore unchanged
```

R2.8 may automate transport and deterministic projection only after an explicit accepted human evidence transaction exists.

---

## 4. Core model — Authority first, projection second

The terminal path is split into two semantically different operations.

### 4.1 Human authority

A human-reviewed terminal evidence record decides that the frozen live acceptance contract is satisfied.

This remains the sole source of:

```text
LIVE_PASS authorization
accepted live scenario completion
durable checkpoint advancement, when applicable
next current priority selection
material live anomaly disposition
```

The machine may validate the shape and binding of that authority, but may not infer it from chat logs, diagnostics, timestamps, CI, release records, or absence of errors.

### 4.2 Machine projection

After the human authority exists, deterministic fields are projected into current state:

```text
validation_status
major_update_checkpoint when explicitly authorized by evidence
current_priority
Current Production Snapshot validation/checkpoint coordinates
Current Release Live Gate -> terminal LIVE_PASS projection
R lifecycle -> REAL_RELEASE_LIVE_PASS
bounded identity-free current operational prose if owned by a deterministic template
```

The projection cannot alter production identity.

Target flow:

```text
HUMAN TERMINAL EVIDENCE
  [authority]
        |
        v
terminal evidence validator / resolver
  [pure, read-only]
        |
        v
existing admin-state-transition semantics
  [bounded state mutation in workspace]
        |
        v
existing sync-state render/check
        |
        v
existing repo-main-write.py MAIN_HEALTH gate
        |
        v
durable terminal readback
```

---

## 5. Canonical terminal evidence transaction

R2.8 should introduce one small structured terminal evidence envelope adjacent to the existing human-authored close document.

Preferred location:

```text
products/simcore/releases/live-evidence/<releaseId>.json
```

The JSON is not generated by CI and does not replace the human evidence document.
It is the machine-readable authorization envelope committed with or after the human close record.

Minimum proposed fields:

```json
{
  "schemaVersion": 1,
  "product": "SimCore",
  "releaseId": "simcore-vX.Y.Z-new-NN",
  "productionCommit": "<40hex>",
  "productionBlob": "<40hex>",
  "liveScenarioId": "<frozen scenario>",
  "decision": "LIVE_PASS",
  "checkpoint": "<existing checkpoint or explicitly advanced checkpoint>",
  "nextPriority": "<explicit bounded priority>",
  "humanEvidence": ["docs/...md"],
  "authorityConfirmation": "HUMAN_EVIDENCE"
}
```

Exact schema is implementation-time work and is not authorized by this design document.

Required semantics:

```text
decision must be explicit LIVE_PASS
releaseId must bind existing release record/state receipt
productionCommit/blob must equal current release-simcore
liveScenarioId must equal the frozen release live gate
humanEvidence must point to durable reviewed docs
checkpoint must never regress
nextPriority must be explicit, never guessed
```

The envelope is append-only per release identity. Contradictory second terminal authority for the same release must fail closed.

---

## 6. One pure terminal resolver

R2.8 should add one pure/read-only resolver that consumes:

```text
terminal evidence envelope
release record
state receipt
current product-manifest
current production identity
frozen live gate identity
```

and emits a deterministic transition plan compatible with existing admin-state-transition semantics.

Suggested target:

```text
products/simcore/tooling/release-terminal-transition.mjs
```

The resolver should answer only:

```text
ELIGIBLE_TO_PROJECT
ALREADY_DURABLE
BLOCKED_PRODUCTION_MOVED
BLOCKED_RELEASE_BINDING_MISMATCH
BLOCKED_LIVE_GATE_MISMATCH
BLOCKED_CURRENT_STATE_CONTRADICTION
BLOCKED_CHECKPOINT_REGRESSION
BLOCKED_EVIDENCE_INVALID
```

It must not:

```text
push
publish
merge
retry workflows
write main
create human evidence
choose a checkpoint
choose next priority
change production identity
```

The resolver should output the exact `expected` -> `set` transition rather than requiring an operator to hand-author `active-admin-transition.json`.

---

## 7. Reuse, then retire, the one-shot transition mechanism

`admin-state-transition.mjs` already provides valuable fail-closed semantics:

```text
allowlisted mutable fields
expected-before / set-after CAS behavior
production commit binding
identity mutation rejection
idempotent ALREADY_APPLIED behavior
bounded document replacements
```

R2.8 should reuse those semantics rather than replace them casually.

Preferred implementation shape:

```text
terminal resolver
-> emits in-memory / temporary derived transition
-> admin-state-transition owner applies it in workspace
-> sync-state renders canonical documents
-> repo-main-write.py lands bounded state
```

Once this path is permanently qualified, the repository-resident one-shot authority file:

```text
products/simcore/state-sync/active-admin-transition.json
```

should no longer be required for normal terminal release closure.

Likewise, the transport-only PR title path:

```text
SimCore durable memory sync command
```

should be retired from the normal clean path if no other proven owner still depends on it.

Retirement must be explicit and regression-proven. Do not delete legacy paths in the same commit that first proves the new path unless the implementation evidence demonstrates safe atomic replacement.

---

## 8. Event model — event driven, not polling

The preferred trigger is the durable arrival of a valid terminal evidence envelope on `main`.

Target behavior:

```text
push to main touching products/simcore/releases/live-evidence/*.json
-> validate exact changed evidence transaction
-> derive terminal transition
-> if already durable: clean NOOP
-> if eligible: run existing state projection path
-> pass existing MAIN_HEALTH gate
-> durable readback
```

No schedule is permitted.
No workflow should repeatedly scan chat history or poll for a human decision.

A generic `workflow_run` trigger is not preferred because it weakens provenance between explicit human authority and the projection event.

---

## 9. Current-state projection contract

A successful R2.8 terminal convergence should guarantee a single coherent terminal snapshot.

For a LIVE_PASS release:

```text
product-manifest.validation_status       = LIVE_PASS
product-manifest.current_priority         = evidence.nextPriority
product-manifest.major_update_checkpoint = evidence.checkpoint

CURRENT_DEVELOPMENT machine production snapshot
  validation = LIVE_PASS
  checkpoint = evidence.checkpoint

CURRENT_DEVELOPMENT release-state block
  validation = LIVE_PASS
  lifecycle  = REAL_RELEASE_LIVE_PASS
  transaction/production identity unchanged

SIMCORE_GUIDELINES generated/current coordinates
  coherent with manifest where already owned by sync-state
```

The terminal projection must not duplicate version/commit identity into human current prose where existing closure-integrity rules intentionally keep that prose identity-free.

---

## 10. Durable readback and idempotency

The transaction is not complete when the workspace files render successfully.
It is complete only after the existing main gateway lands the bounded commit and current `main` is re-read.

Required terminal proof:

```text
main commit contains only allowed state/document paths
MAIN_HEALTH Required = SUCCESS
product-manifest exact expected terminal fields
CURRENT_DEVELOPMENT exact machine-managed terminal state
production identity unchanged
latest.js == install.js still true
terminal evidence envelope remains unchanged
```

Reprocessing the same evidence must return:

```text
ALREADY_DURABLE
main mutation = NONE
production mutation = NONE
```

---

## 11. Simplicity budget

R2.8 is justified only if the normal closure path becomes smaller.

Target budget:

```text
new publishers                       0
new main writers                     0
new product lifecycle states         0
new required CI jobs                 0 preferred
background polling/retry             0
new clean-path transport PRs         0
new one-shot state files             0
manual transition JSON construction  -> 0
manual one-shot retirement           -> 0
manual command PR lifecycle          -> 0
shared terminal resolver             +1 bounded pure owner
existing state-sync reuse            maximum
```

A new helper is acceptable only if it removes the larger recurring transition/transport ceremony.

---

## 12. Regression requirements

### Positive

```text
valid human evidence + exact current production + LIVE_PENDING
-> ELIGIBLE_TO_PROJECT

exact transition projected
-> LIVE_PASS terminal state

same evidence after durable projection
-> ALREADY_DURABLE

checkpoint unchanged when evidence explicitly keeps same checkpoint
-> PASS

checkpoint advances by one authorized release checkpoint
-> PASS

nextPriority exactly evidence-bound
-> PASS

existing release-simcore/latest/install identity unchanged
-> PASS
```

### Negative / fail closed

```text
missing HUMAN_EVIDENCE authorityConfirmation
-> BLOCK

evidence releaseId != current release record
-> BLOCK

production commit/blob moved
-> BLOCK

live scenario mismatch
-> BLOCK

checkpoint regression
-> BLOCK

checkpoint advancement not explicit in evidence
-> BLOCK

nextPriority absent or guessed
-> BLOCK

terminal state partially applied / contradictory
-> BLOCK or bounded repair disposition, never silent overwrite

same release with conflicting second LIVE_PASS envelope
-> BLOCK

projection owner contains publish/push/merge/retry primitives
-> FAIL CI

latest != install
-> FAIL/BLOCK
```

---

## 13. Migration / compatibility

R2.8 must not rewrite historical terminal closures for v0.66 or v0.67.
Those one-shot transactions remain evidence of the predecessor mechanism.

The new path begins only after implementation activation.

Current v0.68 product live validation is a separate lane.
This design does not authorize using R2.8 implementation to alter, infer, or close the v0.68 human live gate.

If R2.8 is implemented before a future human terminal close, the first genuine eligible release may be used as operational proof.
If v0.68 LIVE_PASS occurs before R2.8 implementation is activated, v0.68 must close through the currently authorized predecessor terminal path rather than retroactively depending on an unproven R2.8 path.

---

## 14. Relationship to R2.7

R2.7 principle:

```text
AUTOMATE JUDGMENT, NOT AUTHORITY
DERIVE STATUS FROM PROOF
```

R2.8 extends it:

```text
HUMAN DECIDES LIVE_PASS
MACHINE DERIVES THE BOOKKEEPING CONSEQUENCES
```

R2.7 operational proof projection was documentary and consume-once.
R2.8 terminal convergence is per-release administrative state projection after explicit human terminal authority.

Neither creates production authority.

---

## 15. Relationship to document slimming / historical rollover

The frozen `CURRENT_DEVELOPMENT` slimming and historical rollover design is compatible but separate.

R2.8 should make current terminal state projection deterministic first.
It should not simultaneously migrate old release narratives into history files.

Reason:

```text
terminal convergence = release-system behavior
history rollover      = document architecture migration
```

Mixing them would obscure whether a failure came from state semantics or archive movement.

The existing deferred `FULL_PREDECESSOR_ROOT_HELPER_MECHANICAL_MIGRATION` also remains separate unless a narrow implementation dependency requires only the files touched by R2.8.

---

## 16. Implementation sequence if separately authorized

```text
A. implementation authorization record
B. exact ownership inventory of terminal close path
C. pure terminal evidence validator/resolver
D. regression fixtures for v0.66/v0.67 predecessor examples + synthetic future release
E. thin event adapter on explicit terminal evidence arrival
F. route through existing admin-state/sync-state/main gateway
G. durable readback + idempotency proof
H. permanent CI qualification
I. implementation closure on main
J. first genuine post-implementation HUMAN_EVIDENCE terminal close
K. only after proof, retire normal-path active-admin-transition / command-PR ceremony
```

Retirement may be staged after J if keeping the predecessor path temporarily makes first-use proof safer.

---

## 17. Non-goals

R2.8 does not authorize:

```text
automatic evaluation of chat quality
automatic LIVE_PASS decision
automatic HUMAN_EVIDENCE creation
automatic checkpoint selection
automatic next-priority selection
second publisher
second main writer
automatic release retry
automatic approval
automatic merge
runtime/plugin modification
release-simcore modification
CURRENT_DEVELOPMENT history rollover
Node20 maintenance migration
full predecessor root-helper mechanical migration
```

---

## 18. Expected clean-path reduction

Predecessor terminal path:

```text
human close doc
+ hand-authored transition JSON
+ registered one-shot file
+ transport command PR
+ workflow execution
+ PR close-without-merge
+ one-shot retirement
+ terminal readback/closure
```

R2.8 target:

```text
human close doc + explicit machine-readable terminal authority
-> event-driven deterministic projection
-> existing main gate
-> readback
```

The human decision remains visible and reviewable.
The mechanical ceremony disappears.

---

## 19. Design verdict

```text
VERSION = R2.8
NAME = Human-Evidence Terminal Convergence
PRIMARY_DIRECTION = STABILITY + SIMPLICITY + BOUNDED AUTOMATION
HUMAN_AUTHORITY = PRESERVED
TERMINAL_BOOKKEEPING = EVIDENCE-DERIVED
NORMAL_ONE_SHOT_TRANSITION_FILE = TARGET FOR RETIREMENT
NORMAL_TRANSPORT_COMMAND_PR = TARGET FOR RETIREMENT
PRODUCTION_PUBLISHER_COUNT = 1
MAIN_WRITER_COUNT = 1
BACKGROUND_POLLING = 0
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
DESIGN_FROZEN = YES
IMPLEMENTATION_AUTHORIZED = NO
```
