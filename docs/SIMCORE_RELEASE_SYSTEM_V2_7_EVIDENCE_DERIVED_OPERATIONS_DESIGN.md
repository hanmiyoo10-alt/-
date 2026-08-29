# SimCore Release System R2.7 — Evidence-Derived Operations

Date: 2026-08-29 KST

Status: **DESIGN FROZEN · IMPLEMENTATION AUTHORIZED · NON_RUNTIME**

Predecessor: `R2.6 — Post-Publish Boundary Convergence`

Primary evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_V06700_FIRST_USE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_FIRST_USE_SCORECARD_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_FIRST_USE_ACTIVATION_CONVERGENCE_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_EVIDENCE_DERIVED_OPERATIONS_DESIGN_DRAFT.md`

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

## 1. Decision

R2.7 preserves the R2.6 safety shell and simplifies the surrounding control plane with bounded automation.

Canonical principles:

```text
KEEP THE SAFETY WALL
DERIVE STATUS FROM PROOF
ROOT IS FILESYSTEM AUTHORITY
AUTOMATE RECOVERY DIAGNOSIS
ROUTE THROUGH EXISTING AUTHORITY

DERIVE, DON'T REMEMBER
AUTOMATE JUDGMENT, NOT AUTHORITY
```

Disposition:

```text
R2.7 = SIMPLIFY + AUTOMATE
SAFETY MODEL = R2.6 INVARIANTS FROZEN
```

## 2. Frozen invariants

R2.7 must preserve:

```text
1 production publisher = RS2_4_PERMANENT
1 main integration gateway = repo-main-write.py
Candidate Required
exact C/P/blob binding
postmerge approval revalidation
fast-forward-only publication
PREPLAY BEFORE PUBLISH
PostPublishStateEnvelope semantic ownership
shared main gate
shared durable reobserver
latest.js == install.js
append-only failure/recovery evidence
HUMAN_EVIDENCE remains human authority
trusted predecessor semantics unchanged
no automatic HUMAN_EVIDENCE
no background retry/polling
```

No simplification may weaken these constraints.

## 3. R2.7-A — Evidence-derived operational status

Mutable documentary flags must not duplicate immutable proof.

Target model:

```text
implementationAuthorized = explicit admin authority
implementationVerified = permanent-CI evidence
operationalProof = exact immutable release evidence
operationallyProven = derived from validated operationalProof
```

R2.6 first-use activation drift is resolved before this implementation and remains historical evidence.

R2.7 operational proof projection must be deterministic, idempotent, evidence-bound, and use existing main authority only. It may never publish, authorize a release, or create HUMAN_EVIDENCE.

## 4. R2.7-B — One root-aware filesystem contract

Any SimCore release-system tool accepting `--root` must use one shared path contract:

```text
relative path -> resolve below --root
absolute path -> reject unless explicitly allowed
../ escape -> reject
cwd == root -> PASS fixture
cwd != root -> PASS fixture
```

Implementation target:

```text
products/simcore/tooling/root-path.mjs
```

Migrate only relevant release-system surfaces, not unrelated repository tooling.

## 5. R2.7-C — One recovery decision function

One pure/read-only classifier derives the correct next action from immutable transaction evidence and current control-plane identity.

Normalized dispositions:

```text
SAFE_TO_RERUN_FAILED_JOB
FRESH_PERMANENT_DISPATCH_REQUIRED
RECOVERY_REQUEST_REQUIRED
MANUAL_EVIDENCE_REQUIRED
BLOCKED_IDENTITY_MOVED
```

Required v0.67 case:

```text
Resolve succeeded
+ frozen verifier SHA
+ current control-plane main != frozen verifier
→ FRESH_PERMANENT_DISPATCH_REQUIRED
→ DO_NOT_RERUN_FAILED_PERMANENT_JOB_ONLY
```

The classifier cannot publish, push, merge, write main, retry workflows, or create HUMAN_EVIDENCE.

Implementation target:

```text
products/simcore/tooling/release-recovery-decision.mjs
```

## 6. R2.7-D — Thin recovery routing

Existing workflows consume the shared recovery decision for diagnostic/routing output instead of duplicating operator guidance.

Target:

```text
failure evidence
→ one recovery classifier
→ machine-readable disposition
→ human-readable next action
→ existing authorized authority path
```

No new required job is preferred. No autonomous retry.

## 7. R2.7-E — Evidence-derived proof validation/projection

A small owner validates an operational proof projection against exact durable evidence.

Eligible proof requires bounded evidence such as:

```text
exact release id
publisher run
production C/P/blob
RS2_4_PERMANENT authority
state receipt PASS
release record coherent
post-publish lifecycle coherent
```

Projection authority remains `main`; R2.7 creates no second writer.

Implementation target:

```text
products/simcore/tooling/release-operational-proof.mjs
```

Initial R2.7 implementation may ship validation/derivation first. Automatic durable projection is allowed only if it can route through the existing main gateway without adding hidden authority.

## 8. Simplicity budget

```text
new publishers                 0
new main writers               0
new product lifecycle states   0
new required jobs              0 preferred
background polling/retry       0
new clean-path PRs             0
operator memory rules          decrease
workflow-local duplicated logic decrease
independent mutable facts      decrease
shared deterministic helpers   small bounded increase
```

A helper is justified only when it removes more duplicated semantics than it adds.

## 9. Regression requirements

Positive:

```text
cwd == root PASS
cwd != root PASS
relative path remains below root
../ escape rejected
absolute path rejected by default
R2.6 safety path unchanged
same verifier/current control-plane -> SAFE_TO_RERUN_FAILED_JOB
changed control-plane after Resolve -> FRESH_PERMANENT_DISPATCH_REQUIRED
valid operational proof derives operationallyProven=true
```

Negative/authority:

```text
stale proof contradiction fails
stale verifier cannot classify safe
recovery classifier has no publication/write primitives
proof validator has no publication/HUMAN_EVIDENCE authority
publisher count remains one
main gateway remains one
latest != install remains failure
unexpected production movement remains fail/blocker
```

## 10. Implementation order

```text
A. R2.6 activation/status convergence          COMPLETE
B. freeze R2.7 design                         THIS TRANSACTION
C. shared root-aware path contract
D. pure recovery decision function
E. thin workflow diagnostic/routing integration
F. evidence-derived operational proof validation
G. permanent regression/classifier coverage
H. permanent CI qualification
I. implementation closure on main
J. first clean-path operational confirmation on a later genuine release
```

## 11. Non-goals

R2.7 does not authorize:

```text
second publisher
second main writer
background auto-retry
self-authorizing CI
automatic HUMAN_EVIDENCE
automatic PR merge
new product lifecycle states
Candidate Required removal
preplay removal
reobserver weakening
force publication
runtime/plugin mutation
release-simcore mutation
```

## 12. Final verdict

```text
VERSION = R2.7
NAME = Evidence-Derived Operations
PRIMARY_DIRECTION = SIMPLICITY + BOUNDED AUTOMATION
SAFETY_MODEL = R2.6 INVARIANTS FROZEN
STATUS_MODEL = EVIDENCE-DERIVED
PATH_MODEL = ONE ROOT-AWARE CONTRACT
RECOVERY_MODEL = ONE PURE DECISION FUNCTION
AUTHORITY_AUTOMATION = NONE
CLEAN_PATH_COST = UNCHANGED
DESIGN_AUTHORIZED = YES
DESIGN_FROZEN = YES
IMPLEMENTATION_AUTHORIZED = YES
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
```
