# SimCore Release System v2.5 — Approval Boundary Convergence Design

Date: **2026-08-28 KST**

Status: **DESIGN FROZEN · STABILIZE · NON_RUNTIME · IMPLEMENTATION NOT STARTED**

Predecessor: `R2.4 — Preflight Compression`

Primary trigger: `docs/SIMCORE_RELEASE_SYSTEM_V2_1_V06500_OPERATIONAL_RETROSPECTIVE_2026-08-28.md`

Continuous-feedback authority: `docs/SIMCORE_RELEASE_SYSTEM_CONTINUOUS_FEEDBACK_LOOP.md`

Runtime mutation from this design: **NONE**

`release-simcore` mutation from this design: **NONE**

---

## 1. Decision

R2.5 is a **bounded stabilization**, not a release-engine replacement.

The v0.65.0 release proved that R2.4 and the existing R2.1 / RS2-4 authority model still protect production correctly, but also proved a narrower operational defect:

```text
PR2 exact approval can pass pre-merge repository CI
→ merge succeeds
→ Exact Approval Activation rejects deterministic envelope facts
→ append-only recovery transaction becomes necessary
```

The proven v0.65.0 examples were:

```text
canonical approval PR title mismatch
exact authorized spec path mismatch
```

Both failures were safe. Neither mutated production. However, both were deterministically knowable before merge.

That changes the release-system disposition from the v0.64.11 `KEEP` verdict to:

```text
R2.5 = STABILIZE
```

The architecture remains sound. The correct response is therefore to converge duplicated approval-boundary logic and remove unnecessary operator-supplied transaction metadata.

Canonical R2.5 principle:

```text
ONE TRANSACTION SHAPE
ONE SHARED VALIDATOR
CHECK BEFORE MERGE
RECHECK AFTER MERGE
ONE PUBLISHER
```

A shorter form is:

```text
AUTOMATE DETERMINISTIC PREPARATION
FAIL EARLY
REVALIDATE LATE
DO NOT ADD AUTHORITY
```

---

## 2. What R2.5 preserves unchanged

R2.5 must preserve all still-valid R2.1 / R2.2 / R2.3 / R2.4 invariants.

### 2.1 Authority model

```text
release-simcore = actual runtime / deployment authority
main            = design / evidence / roadmap / admin authority
Generic Candidate = durable candidate authority
Exact Approval    = bounded release authorization object
Permanent Release = sole production publisher
HUMAN_EVIDENCE    = real-world LIVE_PASS authority
```

No new publisher is introduced.

No new actor may write `release-simcore`.

### 2.2 Production safety

The following remain mandatory:

```text
exact immutable candidate identity
exact observed production parent
candidate / production blob binding
fast-forward-only production mutation
latest.js == install.js
append-only failed-attempt evidence
post-publish durable state convergence
human real-long-chat gate
```

### 2.3 Clean-path operating cost

R2.5 must not add a clean-path stage.

Frozen target:

```text
PR1 product + release intent
→ candidate + receipt
→ PR2 exact approval
→ permanent publication + LIVE_PENDING
→ HUMAN_EVIDENCE
→ PR3 terminal evidence/admin closure when required
```

Cost targets remain:

```text
2 PRs → LIVE_PENDING
3 PRs → terminal closure when HUMAN_EVIDENCE / PR3 is required
0 user manual pre-live GitHub operations
1 publisher
0 new release PR stage
0 new approval gate
0 new issue controller
0 new background daemon
0 new standing retry loop
```

---

## 3. Problem statement

R2.4 successfully moved **candidate-authoring** failures into PR1 before merge.

The v0.65.0 release exposed the next duplicated-boundary problem at PR2.

Current exact-approval preparation and activation are distributed across three places:

```text
release-approval-package.mjs
release-approval.test.mjs
simcore-release-pr-activation.yml inline validation
```

The package materializer already knows the canonical approval path and spec path, but its CLI still requires the operator to repeat them as arguments:

```text
--approval-out <path>
--spec-out <path>
```

Activation independently reconstructs:

```text
approval path
spec path
shadow path
canonical title
receipt path rules
releaseId grammar
changed-file shape
candidate identity
production identity
resolved spec equality
```

This creates two forms of avoidable complexity.

### 3.1 Duplicated validation logic

The same transaction shape is described in multiple implementations.

When those surfaces drift, PR CI can say green while the post-merge adapter says red.

### 3.2 Operator-supplied values that are already machine-known

The operator should not need to manually choose or repeat values that can be derived from `releaseId` and the durable candidate receipt.

The v0.65.0 spec-path incident is direct evidence.

### 3.3 Mutable PR metadata carrying release authority

The current activation treats the exact PR title as an authorization invariant:

```text
SimCore exact release approval: <releaseId>
```

The v0.65.0 operation proved two weaknesses of that choice:

1. the title is already redundant with the exact approval JSON/path and releaseId;
2. GitHub workflow reruns preserve the original event envelope, so correcting a title after the original merge event cannot repair that activation attempt.

A mutable UI/presentation field should not carry unique production authorization when immutable repository content already binds the same release identity more strongly.

---

## 4. R2.5 system-level goal

R2.5 should make the exact-approval boundary behave like this:

```text
candidate receipt + spec shadow
        ↓
canonical approval package materializer
        ↓
exact two-file PR2
        ↓
shared approval-envelope validator in PR Verify
        ↓
merge
        ↓
same shared validator in activation + merge-only checks
        ↓
existing permanent publisher
```

The desired semantic relationship is:

```text
PREMERGE VALIDATION
= every deterministic non-publication invariant knowable from PR head + current observed refs

POSTMERGE ACTIVATION
= same invariants reobserved
+ merge-only history/event invariants
+ permanent publisher dispatch
```

PR2 green should therefore mean:

```text
this transaction is structurally activation-ready at this exact head
```

It must **not** mean publication is authorized before merge.

---

## 5. R2.5-A — Shared Approval Envelope Validator

Classification:

```text
FIX / PREMERGE_ACTIVATION_CONTRACT_PARITY / NON_RUNTIME
```

### 5.1 New ownership boundary

Create one pure/non-publishing validator owner for exact approval transaction shape.

Directional path:

```text
products/simcore/tooling/release-approval-envelope.mjs
```

The exact filename may change during implementation if repository ownership makes another bounded name more appropriate, but the ownership rule is frozen:

```text
approval-envelope semantic validation has one implementation owner
```

### 5.2 Inputs

The shared validator may consume only machine/repository-known transaction inputs, such as:

```text
approval JSON
approval path
authorized spec JSON
spec path
candidate receipt
candidate receipt path
spec shadow
spec shadow path
observed candidate ref head
observed release-simcore head
PR base/head changed-file shape
validation mode: PREMERGE or POSTMERGE
```

PR title may be supplied only as presentation diagnostics. It must not be required to establish release authority under R2.5.

### 5.3 Normalized output

On PASS, return one bounded normalized envelope such as:

```text
schemaVersion
releaseId
approvalPath
specPath
candidateReceiptPath
specShadowPath
candidateFetchRef
candidateCommit
expectedProductionCommit
candidateReleaseBlob
authorityConfirmation
canonicalTitle
resolvedSpec
productionMutation = NONE
publicationDispatch = NONE_VALIDATION_ONLY
```

This output is not a new durable release authority.

It is a normalized view of existing authority.

### 5.4 Forbidden capabilities

The shared validator must contain no primitive for:

```text
release publication
repo main writing
GitHub issue mutation
PR creation
PR merge
git push
force update
workflow dispatch
polling
runtime/plugin mutation
```

It may read local repository state and receive already-observed remote ref identities as inputs.

### 5.5 Shared error taxonomy

The same semantic failure should have the same base code in PREMERGE and POSTMERGE mode.

Examples:

```text
APPROVAL_ENVELOPE_CHANGED_PATH_INVALID
APPROVAL_ENVELOPE_APPROVAL_PATH_INVALID
APPROVAL_ENVELOPE_SPEC_PATH_INVALID
APPROVAL_ENVELOPE_RECEIPT_INVALID
APPROVAL_ENVELOPE_SHADOW_INVALID
APPROVAL_ENVELOPE_CANDIDATE_MOVED
APPROVAL_ENVELOPE_PRODUCTION_PARENT_MOVED
APPROVAL_ENVELOPE_SPEC_NOT_MACHINE_DERIVED
APPROVAL_ENVELOPE_AUTHORITY_INVALID
```

The caller may prefix/report stage context, but duplicated independent semantic definitions are forbidden.

---

## 6. R2.5-B — Canonical Package Materialization Without Manual Output Paths

Classification:

```text
SIMPLIFY / OPERATOR_FOOTGUN_REMOVAL / NON_RUNTIME
```

### 6.1 Current unnecessary inputs

The current CLI asks the operator to provide:

```text
--approval-out
--spec-out
```

while `buildApprovalPackage()` already derives both exact paths from `releaseId`.

R2.5 removes those values as authoritative operator inputs.

### 6.2 Target CLI shape

Directional target:

```text
release-approval-package.mjs
  --candidate-receipt <canonical receipt path>
  --spec-shadow <canonical shadow path>
```

The tool derives and writes only:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

No arbitrary output path flag is accepted on the normal R2.5 path.

### 6.3 Fail-closed file behavior

The materializer should fail rather than silently overwrite a prior authorization transaction.

Required behavior:

```text
canonical output absent → create package
canonical output already exists with any prior authorization history → fail
```

Append-only recovery remains the correct response after a committed failed transaction.

### 6.4 Operator summary

The package materializer should emit one machine-readable and human-readable bounded summary containing at least:

```text
releaseId
canonicalTitle
approvalPath
specPath
candidateReceiptPath
specShadowPath
candidateFetchRef
candidateCommit
expectedProductionCommit
candidateReleaseBlob
```

This summary is convenience output only.

It must not become a competing durable release authority.

### 6.5 No auto-publication

The package materializer remains non-publisher.

It must still report semantics equivalent to:

```text
productionMutation = NONE
publicationDispatch = NONE_PACKAGE_ONLY
```

---

## 7. R2.5-C — PR2 Activation-Equivalent Premerge Qualification

Classification:

```text
FIX / FAIL_EARLIER / NON_RUNTIME
```

### 7.1 Trigger

Strengthen the existing SimCore PR Verify lane when a PR modifies exact-approval surfaces.

Directional trigger:

```text
PR_MAIN
AND PR diff contains an approval JSON
```

Do not add a third required job or separate approval workflow gate merely for R2.5.

The preferred implementation is another bounded branch inside the existing permanent `Verify / Required` model.

### 7.2 Premerge checks

Before PR2 may become green, require all deterministic non-publication invariants that activation can already know from the PR head.

At minimum:

```text
changed files = exactly 2
one canonical approvals/<releaseId>.json
one canonical specs/<releaseId>.json
both files absent from PR base
approval schema exact
releaseId grammar valid
approval path derived from releaseId
spec path derived from releaseId
receipt path canonical
receipt exists and result = PASS
receipt releaseId matches
spec shadow exists and matches releaseId
candidate ref currently equals receipt candidateCommit
release-simcore currently equals receipt expectedProductionCommit
resolved spec equals committed authorized spec
authorityConfirmation = RS2_4_RELEASE
productionMutation remains NONE
```

A failure here is ordinary premerge authoring failure:

```text
FIX / PR2_PREFLIGHT / NON_PRODUCTION
```

It is **not** a release incident and does not require append-only recovery because no approval transaction has been committed yet.

### 7.3 No publication authority

PR2 preflight may only:

```text
PASS Verify
or
FAIL Verify
```

It may not:

```text
merge PR
create approval authority beyond the PR files
create candidate receipt
change candidate ref
publish production
dispatch Permanent Release
write main release state
close issues
```

### 7.4 Why this preserves simplicity

This adds checking, not a new lifecycle step.

Operator-visible path remains:

```text
create exact approval PR2
→ existing Verify / Required turns green
→ delegated merge
```

No new user action is introduced.

---

## 8. R2.5-D — PR Title Becomes Presentation, Not Authorization

Classification:

```text
SIMPLIFY / AUTHORITY_MINIMIZATION / NON_RUNTIME
```

### 8.1 Decision

Under R2.5, the PR title is no longer an authorization-bearing invariant.

Recommended title remains:

```text
SimCore exact release approval: <releaseId>
```

The canonical package summary should emit that exact title so the delegated operator normally uses it.

However:

```text
wrong title ≠ release authorization failure
```

### 8.2 Safety rationale

Release identity is already exactly bound by stronger immutable repository facts:

```text
approval path
approval JSON releaseId
matching spec path
candidate receipt
spec shadow
candidate commit
production parent
candidate blob
RS2_4_RELEASE marker
exact two-file diff
```

The title contributes no unique production identity after those checks pass.

Removing title from authority therefore removes a mutable event-envelope dependency without weakening C/P/blob authorization.

### 8.3 Rerun consequence

The v0.65.0 observation remains useful operating guidance:

```text
GitHub workflow rerun reuses original event payload
```

After R2.5, a stale original PR title cannot block a semantically valid exact approval transaction because title is no longer part of release authority.

Other immutable merge-event facts remain fully revalidated.

### 8.4 Optional UX warning

Implementation may emit a non-blocking notice for a noncanonical title if useful.

Do not add a new required check only for presentation consistency.

---

## 9. R2.5-E — Postmerge Activation Reuses the Same Validator

Classification:

```text
STABILIZE / DUPLICATION_REMOVAL / NON_RUNTIME
```

### 9.1 Current problem

`simcore-release-pr-activation.yml` currently contains a substantial inline validator that independently reconstructs approval semantics.

R2.5 should reduce that workflow to orchestration plus merge-only checks.

### 9.2 Postmerge responsibilities

Activation still owns:

```text
merged PR event required
same-repository head required
checkout exact merge commit
verify exact merge ancestry
verify approval/spec first authorization touch belongs to this merge
reobserve candidate ref
reobserve release-simcore parent
invoke shared approval-envelope validator in POSTMERGE mode
require PASS
invoke existing permanent release workflow
observe exact permanent run success
```

### 9.3 What moves out of inline workflow code

Semantic definitions should leave the YAML inline script and live in the shared validator:

```text
releaseId grammar
canonical approval/spec/shadow paths
approval schema
receipt binding
candidate/production identity comparison
machine-derived spec equality
authority marker semantics
```

The workflow remains orchestration, not a second schema implementation.

### 9.4 Defense in depth remains

Premerge PASS never substitutes for postmerge validation.

R2.5 explicitly requires:

```text
PREMERGE PASS
+ POSTMERGE REOBSERVATION PASS
+ PERMANENT REQUIRED PASS
```

This is stronger than merely moving checks earlier.

---

## 10. Mutable-race semantics

A transaction may pass PR2 preflight and still fail after merge for facts that can legitimately change between observations.

Examples:

```text
candidate ref moved unexpectedly
release-simcore production parent moved
approval/spec merge history is not the expected first touch
merge event does not match same-repository delegated path
```

Those remain real postmerge blockers.

If a failure occurs after approval merge:

```text
preserve failed transaction
classify evidence
use fresh append-only intent/releaseId where recovery semantics require it
never rewrite historical authorization evidence
```

R2.5 only removes recovery caused by **deterministic authoring mistakes that should have failed before merge**.

It does not weaken append-only recovery.

---

## 11. Relationship to R2.4

R2.5 extends the same proven philosophy as R2.4.

```text
R2.4:
move candidate-authoring failure earlier into PR1

R2.5:
move approval-envelope failure earlier into PR2
```

Together:

```text
PR1 green
≈ candidate-authoring ready

PR2 green
≈ activation-envelope ready

postmerge activation green
≈ immutable/reobserved release transaction ready for permanent publisher
```

R2.5 must not remove or duplicate `GATE_PR1_DRY`.

R2.4 remains active and preserved.

---

## 12. Relationship to R2.1 delegated operator

R2.1 human boundary remains unchanged:

```text
explicit user update/release instruction
→ delegated operator handles all pre-live GitHub/release operations
→ release-simcore publication
→ LIVE_PENDING
→ user applies plugin and supplies real long-chat evidence
```

R2.5 makes the delegated operator safer by reducing values it must synthesize manually.

It does not create standing release authority.

It does not authorize background releases.

It does not eliminate the explicit user work-item authorization requirement.

---

## 13. Relationship to RS2-4 Permanent Release

RS2-4 remains the single publication authority.

R2.5 does **not** redesign:

```text
Permanent Release authorization
Candidate Required
fast-forward publication
post-publish state declaration
Permanent Release Required
```

The v0.65.0 successful permanent run proved that layer healthy once the approval envelope was correct.

Therefore RS2-4 publication semantics are frozen for this stabilization.

---

## 14. Explicit non-goals

R2.5 does not:

```text
replace the release engine
reduce the two-PR path to one PR
add a release bot publisher
add a second publication actor
auto-merge without delegated operator policy
remove exact approval
remove Candidate Required
remove postmerge activation
remove append-only recovery
auto-close release blocker issues
infer HUMAN_EVIDENCE
replace real long-chat validation
add a polling service
add a retry daemon
redesign runtime/plugin code
change latest.js or install.js
mutate release-simcore during design/implementation qualification
implement R2.4-C terminal debt seal without real PR3 evidence
```

The existing permanent-run discovery polling is not changed by R2.5 because the current evidence classifies it as observation noise/WATCH rather than a proven publication defect.

---

## 15. v0.65.0 replay requirements

R2.5 permanent regression must encode the actual new evidence.

### 15.1 Wrong spec path negative control

Given a valid receipt/shadow but PR2 places the authorized spec outside:

```text
products/simcore/releases/specs/<releaseId>.json
```

Expected:

```text
PR2 Verify = FAIL
merge not authorized
activation never needed to discover this authoring error
productionMutation = NONE
```

### 15.2 Noncanonical title control

Given an otherwise exact valid PR2 with a noncanonical title:

Expected R2.5 semantics:

```text
release authorization semantics = unaffected
canonical title = emitted as package/operator guidance
optional UX warning = allowed
blocking authorization failure = NO
```

This permanently prevents title metadata from regaining production authority accidentally.

### 15.3 Valid v0.65.0 new-05 shape

Replay the final successful transaction shape and require:

```text
package materialization PASS
PR2 preflight envelope PASS
postmerge envelope PASS under unchanged observed refs
resolved spec exact equality PASS
publication authority remains outside validator/package tooling
```

### 15.4 Mutable production-parent negative control

Premerge PASS, then reobserve a different `release-simcore` head in POSTMERGE mode.

Expected:

```text
postmerge activation FAIL
permanent dispatch = NONE
```

This proves early validation does not weaken late revalidation.

### 15.5 Third-file negative control

An approval PR containing any third changed file must fail both relevant boundary checks.

### 15.6 Existing-file overwrite negative control

Attempt to materialize an approval/spec package for a releaseId whose canonical authorization files already exist.

Expected:

```text
FAIL CLOSED
no overwrite
append-only recovery required for a committed prior transaction
```

---

## 16. Validation architecture

R2.5 follows the same read/implementation/validation separation used by SimCore development.

```text
READ SCOPE
= approval package + approval resolver + PR classification + activation adapter + release-approval regression

IMPLEMENT SCOPE
= bounded approval-boundary stabilization only

VALIDATION SCOPE
= full applicable SimCore permanent CI / release-system guards
```

At minimum implementation must prove:

```text
existing release-approval suite PASS
new R2.5 replay suite PASS
R2.4 preflight-compression suite PASS
architecture contracts PASS
closure/stability seal regressions PASS
all applicable permanent SimCore Verify / Required PASS
forbidden publication primitives absent from new shared validator/package path
release-simcore unchanged by R2.5 implementation transaction
```

---

## 17. Simplicity budget

R2.5 is successful only if it removes more conceptual duplication than it adds.

Target simplifications:

```text
independent approval semantic validators: multiple → 1 owner
operator-selected approval output paths: 2 → 0
PR title authorization facts: 1 → 0
new clean-path PR stages: 0
new required jobs: 0
new publishers: 0
```

A new helper module is acceptable only because it replaces duplicated inline/schema logic.

Do not create a generalized release orchestration framework.

Do not create an AST/parser framework.

Do not introduce a new durable transaction record merely for convenience.

---

## 18. Automation budget

Allowed automation growth:

```text
derive canonical approval/spec paths
emit canonical PR title as presentation guidance
run approval-envelope validation automatically in existing PR Verify
reuse same validator postmerge
derive C/P/blob from existing durable receipt/shadow
produce bounded diagnostic failure code
```

Forbidden automation growth:

```text
new release authority
new publisher
automatic HUMAN_EVIDENCE
standing background release
new issue closer
unbounded retries
connector-noise polling service
silent overwrite of prior release transactions
```

Canonical automation rule remains:

```text
MORE AUTOMATIC DERIVATION
MORE EARLY CHECKING
SAME AUTHORITY
```

---

## 19. Implementation order if later authorized

Implementation must be a separate non-runtime release-system work item, not mixed with a SimCore runtime feature release.

Recommended order:

```text
1. record implementation worksheet/evidence on main authority surface
2. create dedicated R2.5 work branch
3. extract shared approval-envelope validator from existing activation semantics
4. extend package materializer to derive output paths and emit canonical operator summary
5. wire PR2 preflight into existing SimCore Verify classification
6. convert postmerge activation to shared validator + merge-only checks
7. remove PR title from authorization semantics while keeping canonical presentation guidance
8. add v0.65.0 replay regressions
9. run full applicable permanent CI
10. merge R2.5 implementation to main only after final exact-head Verify / Required PASS
11. do not mutate release-simcore during R2.5 implementation
12. use the resulting R2.5 system on the next genuine runtime release
13. record real operational feedback from that release
```

---

## 20. First-use operational proof

R2.5 is mechanically qualified by CI, but operational success requires a later genuine SimCore runtime release.

First-use success target:

```text
PR1 candidate-authoring defects caught premerge by R2.4 if any
→ first committed candidate transaction succeeds unless a genuinely postmerge-only condition fails
→ PR2 approval package generated without manual output paths
→ PR2 Verify proves activation-envelope readiness
→ PR2 merge
→ postmerge activation revalidation PASS
→ Permanent Release PASS
→ release-simcore exact publication
→ automatic LIVE_PENDING convergence
```

Target observed cost:

```text
2 PRs to LIVE_PENDING
0 recovery PR caused by approval title/path authoring mistakes
0 user manual pre-live GitHub operations
1 publisher
```

Any anomaly must be preserved and classified before further release-system evolution.

---

## 21. Failure criteria for R2.5

R2.5 should be reconsidered if real use proves any of the following:

```text
shared validator creates a second authority source
premerge validation materially diverges from postmerge semantics
package materializer overwrites prior authorization evidence
operator still must manually reconstruct canonical approval paths
valid PR2 repeatedly fails only after merge for deterministic envelope facts
new helper complexity exceeds removed duplication
R2.5 adds clean-path PR/gate/user action cost
postmerge revalidation is weakened because premerge passed
publication authority leaks into package/validator tooling
```

One isolated external observation failure does not automatically invalidate R2.5. Preserve/classify evidence first.

---

## 22. Deferred / unchanged findings

### 22.1 R2.4-C terminal debt seal

```text
DEFER / AWAIT_REAL_PR3
```

Still not part of R2.5.

### 22.2 Permanent activation run-discovery polling

```text
WATCH / OBSERVABILITY / NON_BLOCKING
```

No new polling system is justified.

### 22.3 Connected-tool run observation noise

```text
WATCH / TOOL_SURFACE / NON_RUNTIME
```

Durable receipts and release identities remain authority.

### 22.4 Architecture-contract transition mismatch from v0.65.0

The v0.65.0 architecture transition was repaired through its own contract ownership surface.

R2.5 does not use that incident as permission for a generalized architecture/release framework redesign.

If the same deterministic architecture-context mismatch recurs on a later runtime release, record it separately and evaluate whether R2.4 PR1 dry parity needs a bounded extension.

---

## 23. Acceptance criteria

R2.5 design is accepted only if the planned implementation preserves all of the following:

```text
R2.4 engine retained
R2.1 delegated operator boundary retained
RS2-4 permanent publisher retained as sole publisher
2 PR target to LIVE_PENDING retained
3 PR target through terminal closure retained
0 user manual pre-live GitHub operations retained
append-only recovery retained
postmerge activation retained
Candidate Required retained
latest.js == install.js retained
human LIVE_PASS retained
```

And adds all of the following:

```text
one shared approval-envelope validator owner
activation-equivalent PR2 premerge validation for deterministic non-publication invariants
canonical output paths derived, not manually selected
PR title removed from authorization authority
canonical title still emitted for presentation consistency
postmerge activation reuses shared semantics and reobserves mutable refs
v0.65.0 title/path incidents permanently replayed
no new publisher / PR stage / gate / daemon / issue controller
```

---

## 24. Final design verdict

```text
System version                    = R2.5
Name                              = Approval Boundary Convergence
Disposition                       = STABILIZE
Release engine replacement        = NO
R2.4 preserved                    = YES
R2.1 delegated operator preserved = YES
RS2-4 publisher preserved         = YES
Shared validator                  = DESIGN REQUIRED
PR2 premerge parity               = DESIGN REQUIRED
Manual approval output paths      = REMOVE
PR title release authority        = REMOVE
Postmerge revalidation            = PRESERVE
Append-only recovery              = PRESERVE
New clean-path PR                 = NO
New required job                  = NO
New publisher                     = NO
New polling                       = NO
Runtime mutation                  = NONE
release-simcore mutation          = NONE
First-use proof                   = NEXT GENUINE SIMCORE RUNTIME RELEASE
```

R2.5 therefore improves **stability, simplicity, and automation simultaneously by deleting duplicated choices and duplicated semantic validation, not by adding release authority**.
