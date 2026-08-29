# SimCore Release System R2.8 — Direction Draft

Date: 2026-08-29 KST

Status: **DRAFT · NOT FROZEN · NON_RUNTIME · NO IMPLEMENTATION AUTHORIZATION**

Working name: **Deterministic Approval Packaging**

Predecessor: `R2.7 — Evidence-Derived Operations`

Required predecessor closure:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_DURABLE_OPERATIONAL_STATUS_PROJECTION_DESIGN_DRAFT_2026-08-29.md`

Primary evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_V06800_FIRST_USE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_06800_EXACT_APPROVAL_TRANSACTION_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_06500_APPROVAL_ACTIVATION_TITLE_BLOCKER_2026-08-28.md`
- `docs/SIMCORE_06500_APPROVAL_SPEC_PATH_BLOCKER_2026-08-28.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_5_APPROVAL_BOUNDARY_CONVERGENCE_DESIGN.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_5_IMPLEMENTATION_WORKSHEET_2026-08-28.md`

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

## 1. Direction

R2.8 should preserve the complete R2.7/R2.6 safety shell while removing the remaining operator-memory requirements at the exact-approval boundary.

R2.8 is not a new approval philosophy. R2.5 already designed the correct direction:

```text
ONE TRANSACTION SHAPE
ONE SHARED VALIDATOR
CHECK BEFORE MERGE
RECHECK AFTER MERGE
ONE PUBLISHER
```

Current `main` does not fully realize those frozen R2.5 intentions. R2.8 should therefore complete that convergence on top of the stronger R2.6/R2.7 safety model.

Canonical R2.8 principles:

```text
KEEP THE SAFETY WALL
FINISH THE EXISTING APPROVAL CONTRACT
ONE PACKAGE OWNER
ONE ENVELOPE VALIDATOR
VALIDATE BEFORE MERGE
REOBSERVE AFTER MERGE
TITLE IS PRESENTATION; IMMUTABLE CONTENT IS AUTHORITY
AUTOMATE PREPARATION, NOT APPROVAL AUTHORITY
```

Disposition:

```text
R2.8 = STABILITY + SIMPLICITY + BOUNDED AUTOMATION
```

## 2. Required predecessor closure

Before R2.8 implementation begins, R2.7 durable operational status projection should be designed/frozen and completed in a separate transaction.

Do not hide R2.7 documentary status debt inside R2.8 approval work.

R2.8 no longer owns R-system status convergence.

## 3. Current-main reality check

The present code shows the approval boundary is only partially converged.

### 3.1 Package owner still asks for machine-known output paths

`products/simcore/tooling/release-approval-package.mjs` already derives:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

but its normal CLI still requires:

```text
--approval-out
--spec-out
```

and merely checks that the supplied paths match the paths it already knows.

Classification:

```text
APPROVAL_PACKAGE_REDUNDANT_OPERATOR_PATH_INPUTS
= FIX · SIMPLIFY
```

### 3.2 Frozen R2.5 shared envelope owner is absent

R2.5 designed:

```text
products/simcore/tooling/release-approval-envelope.mjs
```

as the one approval-envelope semantic owner.

That file is not present on current `main`.

Classification:

```text
APPROVAL_ENVELOPE_SINGLE_OWNER_NOT_PRESENT_CURRENT_MAIN
= FIX · DESIGN_INHERITANCE
```

### 3.3 PR Verify has no exact-approval premerge gate

Current `products/simcore/tooling/check.mjs` plans ordinary static/architecture/regression/state/coordination gates, plus PR1 candidate dry qualification, but has no approval-specific premerge qualification gate.

Therefore a malformed exact approval transaction can pass repository CI and fail only after merge in activation.

Classification:

```text
APPROVAL_PREMERGE_ACTIVATION_PARITY_GAP
= FIX
```

### 3.4 Activation still duplicates semantic rules inline

Current `.github/workflows/simcore-release-pr-activation.yml` independently reconstructs:

```text
changed-file count
approval path
spec path
releaseId grammar
approval schema
receipt path
candidate identity
production identity
canonical PR title
spec-shadow binding
resolved spec equality
```

and then separately invokes `release-approval-resolve.mjs`.

This is duplicated semantic ownership in workflow YAML.

Classification:

```text
APPROVAL_ACTIVATION_INLINE_SEMANTIC_DUPLICATION
= FIX
```

### 3.5 PR title still carries authorization failure semantics

Current activation fails when:

```text
PR_TITLE != SimCore exact release approval: <releaseId>
```

The v0.65 rerun evidence already proved that GitHub reruns retain the original merge-event title, making a presentation field a sticky transaction blocker.

R2.5 had already concluded that immutable repository content carries stronger identity than the PR title.

Classification:

```text
APPROVAL_TITLE_AUTHORITY_REDUNDANCY
= FIX · SIMPLIFY_AUTHORITY_SURFACE
```

## 4. Frozen invariants

R2.8 must preserve:

```text
1 production publisher = RS2_4_PERMANENT
1 main integration gateway = repo-main-write.py
Candidate Required
exact C/P/blob binding
postmerge exact-approval revalidation
fast-forward-only publication
PREPLAY BEFORE PUBLISH
shared post-publish state envelope/main gate/reobserver
append-only failed transaction evidence
latest.js == install.js
HUMAN_EVIDENCE remains human
no automatic publication authority
no background retry/polling
```

No convenience change may weaken these invariants.

## 5. Slice A — One shared approval-envelope semantic owner

Create the owner already intended by R2.5:

```text
products/simcore/tooling/release-approval-envelope.mjs
```

It should reuse `release-approval-resolve.mjs` rather than fork its approval/spec/receipt semantics.

### Inputs

Bounded inputs may include:

```text
mode = PREMERGE | POSTMERGE
approval JSON + path
committed spec JSON + path
candidate receipt + canonical path
spec shadow + canonical path
changed paths
observed candidate commit
observed production commit
```

PR title may be supplied only for diagnostics/presentation consistency.

### Semantic ownership

The envelope owner is the one implementation owner for:

```text
exact two-file shape
canonical approval/spec paths
releaseId binding
approval schema
receipt binding
spec-shadow binding
candidate C
expected production P
candidate blob
resolved spec == committed spec
authorityConfirmation
```

### Output

Normalized PASS output should contain:

```text
releaseId
approvalPath
specPath
candidateReceiptPath
specShadowPath
candidateFetchRef
candidateCommit
expectedProductionCommit
candidateReleaseBlob
canonicalTitle
resolvedSpecSha256
authorityConfirmation
validationMode
productionMutation = NONE
publicationDispatch = NONE_VALIDATION_ONLY
result = PASS
```

### Forbidden primitives

The owner contains no:

```text
push
merge
workflow dispatch
publication
main write
PR creation
HUMAN_EVIDENCE
polling/retry
```

## 6. Slice B — Package materializer becomes truly canonical

Keep:

```text
products/simcore/tooling/release-approval-package.mjs
```

but remove redundant operator authority over output paths.

Preferred normal CLI:

```text
release-approval-package.mjs
  --candidate-receipt <canonical receipt>
  --spec-shadow <canonical shadow>
  --report <bounded report>
```

The tool derives and writes only:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

It also derives:

```text
canonicalTitle = SimCore exact release approval: <releaseId>
```

Required behavior:

```text
outputs absent -> create exact package
output already exists -> fail closed / never overwrite prior authorization history
arbitrary output path flags -> not part of normal R2.8 path
```

The materializer remains package-only and non-publishing.

## 7. Slice C — Exact-approval premerge qualification inside existing CI

Do not add a new required job.

Add one bounded gate inside the existing `Verify / Required` model when PR scope contains exact approval surfaces.

Directional gate:

```text
GATE_APPROVAL_PREFLIGHT
```

Preferred observer adapter:

```text
products/simcore/tooling/ci/pr2-approval-qualification.mjs
```

Responsibilities:

```text
observe PR base/head exact changed paths
load approval/spec from PR head
load canonical receipt/shadow
observe candidate ref
observe release-simcore parent
invoke release-approval-envelope.mjs in PREMERGE mode
emit bounded CI report
```

Malformed deterministic packages fail before merge.

Examples:

```text
one file only -> FAIL PREMERGE
three files -> FAIL PREMERGE
wrong approval path -> FAIL PREMERGE
wrong spec path -> FAIL PREMERGE
spec not equal to machine-derived shadow -> FAIL PREMERGE
candidate ref moved -> FAIL PREMERGE
production parent moved -> FAIL PREMERGE
```

No append-only recovery identity is consumed because the invalid approval transaction never lands on main.

## 8. Slice D — Activation becomes orchestration + merge-only checks

`.github/workflows/simcore-release-pr-activation.yml` should retain only responsibilities that are inherently postmerge/event/history specific:

```text
merged PR required
same-repository head required
checkout exact merge commit
verify exact merge ancestry
approval/spec first-touch belongs to this merge
reobserve candidate ref
reobserve release-simcore parent
invoke shared envelope owner in POSTMERGE mode
dispatch existing Permanent Release after PASS
observe exact Permanent run
```

Move semantic schema/path/identity definitions out of inline YAML and into the shared owner.

Defense in depth remains:

```text
PREMERGE PASS
+ POSTMERGE REOBSERVATION PASS
+ Candidate Required PASS
+ Permanent publication
```

## 9. Slice E — PR title is presentation, not unique authorization

Recommended title remains:

```text
SimCore exact release approval: <releaseId>
```

The package report emits it so operators/automation naturally use the canonical title.

But immutable release authorization is already bound by:

```text
exact two-file diff
canonical approval/spec paths
approval releaseId
candidate receipt
spec shadow
candidate C
production P
candidate blob
authority marker
committed spec equality
```

Therefore R2.8 should make:

```text
wrong title -> warning / presentation drift
wrong immutable package -> authorization failure
```

This removes stale GitHub event-title semantics without weakening exact release identity.

## 10. Slice F — Optional PR2 preparation automation is deferred behind core proof

After Slices A-E are proven in permanent CI and one genuine release, R2.8 may consider automatically preparing/opening the existing PR2 from machine-derived package output.

This is deliberately not required for initial R2.8 implementation.

Reason:

```text
package correctness + validator parity = safety/simplicity core
GitHub PR creation automation = convenience layer
```

Do not mix the convenience layer into the first implementation unless the core path is already proven and the added automation deletes more operator work than authority surface it introduces.

Any future PR-opening automation must still leave merge/approval authority human/delegated and must not dispatch Permanent Release.

## 11. Automation boundary

Allowed in core R2.8:

```text
derive exact approval files
derive canonical title
validate exact approval transaction before merge
revalidate exact immutable transaction after merge
emit precise normalized envelope / diagnostics
```

Explicitly forbidden:

```text
automatic approval decision
automatic merge of approval PR
automatic Permanent publication authority
automatic HUMAN_EVIDENCE
automatic product LIVE_PASS
force publication
new publisher
new main writer
background retry/polling
```

## 12. Simplicity budget

```text
new publishers                   0
new main writers                 0
new product lifecycle states     0
new required jobs                0
new clean-path PRs               0
background polling/retry         0
shared envelope semantic owners  1
workflow-local duplicated rules  decrease sharply
operator-entered output paths    remove
PR-title authority dependency    remove
```

The one shared envelope owner is justified because it replaces duplicated YAML/CI/package semantics.

## 13. Regression targets

Positive:

```text
canonical candidate receipt + shadow -> exact two-file package
canonical paths derived without operator output-path inputs
canonical title derived exactly
v0.68 new-02 package shape passes PREMERGE and POSTMERGE semantics
same envelope owner used in both modes
existing Permanent/Candidate Required safety remains unchanged
```

Negative:

```text
v0.68 new-01 one-file shape would fail PREMERGE
three-file package fails PREMERGE
wrong approval path fails PREMERGE
wrong spec path fails PREMERGE
spec not machine-derived fails PREMERGE
candidate identity drift fails
production parent drift fails
attempt to overwrite prior approval/spec fails
noncanonical PR title does not create authorization failure but emits diagnostic warning
package/envelope owners contain no publication/write/merge/dispatch primitives
activation YAML no longer independently owns schema/path/title authorization rules
```

## 14. Historical R2.5 interpretation

Do not rewrite R2.5 historical feedback documents.

They correctly capture the intended stabilization direction and the evidence available at that time.

R2.8 should record a new current-main finding:

```text
R2_5_DESIGN_DIRECTION = KEEP
CURRENT_MAIN_FULL_R2_5_APPROVAL_CONVERGENCE = NOT PRESENT
R2_8_ACTION = REALIZE / COMPLETE ON TOP OF R2_7 SAFETY WALL
```

This avoids pretending R2.8 invented an older design and avoids silently assuming current code still matches the historical intended state.

## 15. Implementation order after design freeze

```text
0. complete R2.7 durable status projection separately
1. freeze R2.8 exact ownership / non-goals
2. add shared release-approval-envelope owner
3. simplify release-approval-package CLI/output behavior
4. add PR2 approval preflight inside existing Verify/Required
5. reduce activation YAML to orchestration + merge-only checks
6. demote title to presentation diagnostic
7. permanent regression + static authority scan
8. permanent CI qualification
9. implementation closure on main
10. first genuine release operational confirmation
11. only then evaluate optional auto-open PR2 convenience
```

## 16. Draft verdict

```text
VERSION = R2.8 candidate
WORKING_NAME = DETERMINISTIC_APPROVAL_PACKAGING
PRIMARY_DIRECTION = STABILITY + SIMPLICITY + BOUNDED AUTOMATION
DESIGN_INHERITANCE = COMPLETE THE UNREALIZED R2.5 APPROVAL CONVERGENCE INTENT
SAFETY_MODEL = R2.7/R2.6 INVARIANTS FROZEN
APPROVAL_MODEL = MACHINE-DERIVED PACKAGE + ONE SHARED VALIDATOR
PREMERGE_MODEL = FAIL DETERMINISTIC MALFORMED TRANSACTIONS BEFORE MERGE
POSTMERGE_MODEL = REOBSERVE + SAME VALIDATOR + EXISTING PERMANENT AUTHORITY
TITLE_MODEL = PRESENTATION / DIAGNOSTIC, NOT UNIQUE AUTHORITY
R2_7_STATUS_CONVERGENCE = SEPARATE PREDECESSOR CLOSURE
NEW_AUTHORITY = NONE
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
DESIGN_FROZEN = NO
IMPLEMENTATION_AUTHORIZED = NO
```
