# SimCore Release System R2.7 — Evidence-Derived Operations Design Draft

Date: 2026-08-29 KST

Status: **DESIGN DRAFT · NOT FROZEN · NON_RUNTIME**

Predecessor: `R2.6 — Post-Publish Boundary Convergence`

Primary evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_V06700_FIRST_USE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_FIRST_USE_SCORECARD_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_IMPLEMENTATION_CLOSURE_2026-08-29.md`

Runtime mutation from this design: **NONE**

`release-simcore` mutation from this design: **NONE**

---

## 1. Decision

R2.7 should preserve the R2.6 safety shell and optimize the release system for **simplicity plus bounded automation**.

The target is not more authority and not more background machinery. The target is fewer duplicated facts, fewer operator-memory rules, and more deterministic decisions derived from evidence that already exists.

Canonical principle:

```text
KEEP THE SAFETY WALL
DERIVE STATUS FROM PROOF
ROOT IS FILESYSTEM AUTHORITY
AUTOMATE RECOVERY DIAGNOSIS
ROUTE THROUGH EXISTING AUTHORITY
```

Short form:

```text
DERIVE, DON'T REMEMBER
AUTOMATE JUDGMENT, NOT AUTHORITY
```

Disposition:

```text
R2.7 = SIMPLIFY + AUTOMATE
WITH R2.6 SAFETY INVARIANTS FROZEN
```

---

## 2. Safety invariants frozen from R2.6

R2.7 must preserve unchanged:

```text
1 production publisher = RS2_4_PERMANENT
1 main integration gateway = repo-main-write.py
Candidate Required
exact C / P / blob binding
postmerge approval revalidation
fast-forward-only publication
PREPLAY BEFORE PUBLISH
PostPublishStateEnvelope semantic ownership
shared main gate
shared durable reobserver
latest.js == install.js
append-only failed transaction/recovery evidence
HUMAN_EVIDENCE remains human authority
trusted predecessor semantics unchanged
no automatic HUMAN_EVIDENCE
no background retry/polling
```

No R2.7 feature may weaken these to save steps.

---

## 3. Primary debt from R2.6 first use

The v0.67 first genuine use proved the R2.6 core architecture but exposed three operational debts:

1. **Status truth drift**
   - R2.6 executed successfully in production while living status still said activation pending.
   - duplicated documentary booleans became stale relative to immutable proof.

2. **Root/cwd topology drift**
   - a root-aware tool behaved correctly under `cwd == root` but failed under the actual `cwd != root` workflow topology.

3. **Recovery decision burden**
   - after Resolve freezes verifier identity, a control-plane fix requires a fresh Permanent dispatch.
   - the authority behavior was correct, but the operator had to infer the correct recovery route.

These are not reasons to redesign the release engine. They are reasons to reduce duplicated state and automate deterministic control-plane decisions.

---

## 4. R2.7-A — Evidence-Derived Operational Status

Classification:

```text
SIMPLIFY / ADMIN_TRUTH_CONVERGENCE / NON_RUNTIME
```

Rule:

```text
operational status must be derived from immutable evidence where possible,
not maintained as an independent boolean that can drift.
```

R2.6 migration requirement:

```text
activationAuthorized=false + genuine successful first use
→ converge R2.6 living status once
→ preserve historical implementation-closure text unchanged
```

R2.7 target model:

```text
implementationAuthorized = explicit design/admin authority
implementationVerified = static/permanent-CI evidence
operationalProof = exact immutable release evidence
operationallyProven = derivable from operationalProof validity
```

`activationAuthorized` must no longer remain an ambiguous executable-looking boolean with documentary-only behavior.

Preferred migration:

1. explicitly classify the R2.6 activation field as a consumed documentary gate;
2. converge it for R2.6 first-use closure;
3. R2.7 uses evidence-backed `operationalProof` as the living first-use truth;
4. CI verifies that projection against immutable evidence instead of hardcoding a forever-false value.

No new publisher, writer, PR, or product lifecycle state is introduced.

---

## 5. R2.7-B — One Root-Aware Filesystem Contract

Classification:

```text
STABILIZE + SIMPLIFY / PATH_AUTHORITY_CONVERGENCE
```

Any release-system tool that accepts `--root` must share one path contract.

Canonical rules:

```text
relative input/output/report path
→ resolve below --root

absolute path
→ reject unless explicitly declared safe by that tool

../ escape outside --root
→ reject

cwd == root
→ PASS fixture

cwd != root
→ PASS fixture
```

Implementation direction:

```text
one small shared root/path utility
instead of per-tool path semantics
```

Candidate surfaces:

```text
release-state-converge
release-state-preplay
release-state-main-gate
release-state-reobserve
sync-state and other root-aware SimCore release report writers
```

Do not refactor unrelated repository tooling solely for stylistic uniformity.

---

## 6. R2.7-C — One Recovery Decision Function

Classification:

```text
AUTOMATE / GUIDED_RECOVERY / NO_NEW_AUTHORITY
```

The system should determine whether a failed transaction can safely reuse its frozen verifier or must start a fresh Permanent dispatch.

Normalized output examples:

```text
SAFE_TO_RERUN_FAILED_JOB
FRESH_PERMANENT_DISPATCH_REQUIRED
RECOVERY_REQUEST_REQUIRED
MANUAL_EVIDENCE_REQUIRED
BLOCKED_IDENTITY_MOVED
```

Minimum decisive case from v0.67:

```text
Resolve succeeded
+ verifier SHA frozen
+ control-plane main changed after Resolve
→ FRESH_PERMANENT_DISPATCH_REQUIRED
→ DO_NOT_RERUN_FAILED_PERMANENT_JOB_ONLY
```

This decision function must be pure or read-only. It does not publish, push, merge, or create HUMAN_EVIDENCE.

Automation means:

```text
system chooses the correct bounded recovery disposition
existing authorized command/workflow executes only when explicitly invoked
```

It must not mean autonomous retries or background release dispatch.

---

## 7. R2.7-D — Thin Recovery Routing

Permanent/recovery workflows should consume the shared recovery decision instead of duplicating phase-specific guidance.

Target:

```text
failure evidence
→ one recovery classifier
→ one machine-readable disposition
→ one human-readable next action
→ existing authority path
```

The operator should not need to remember whether verifier identity was frozen before or after a control-plane repair.

No extra required job is preferred. Use existing workflow steps/outputs where practical.

---

## 8. R2.7-E — Automatic Proof Projection, Not Automatic Authority

Where exact immutable evidence already proves a documentary state transition, R2.7 may automatically project that state through existing `main` authority.

Eligible example:

```text
successful genuine release
+ exact R-system version binding
+ preplay PASS
+ permanent publication PASS
+ shared main gate PASS
+ durable reobserver PASS
→ operationalProof projection eligible
```

The projection must:

```text
be deterministic
be idempotent
name exact evidence
use existing main integration authority
never mutate release-simcore
never create HUMAN_EVIDENCE
never authorize a new release by itself
```

If automatic projection would require a second writer or hidden cross-domain authority, do not do it. Fall back to an explicit bounded admin projection through the existing main gateway.

---

## 9. Simplicity budget

R2.7 is successful only if the control plane gets easier to reason about.

Preferred deltas:

```text
new publishers                 0
new main writers               0
new product lifecycle states   0
new required jobs              0 preferred
background polling/retry       0
new clean-path PRs             0
operator memory rules          decrease
workflow-local duplicated logic decrease
independent mutable status facts decrease
shared deterministic helpers   small increase
```

A helper is justified only when it deletes more duplicated semantics than it creates.

---

## 10. Regression matrix

Required positive controls:

```text
cwd == root root-aware tool path PASS
cwd != root root-aware tool path PASS
relative report remains below root
first-use operational proof derives current status
same verifier/current control-plane → safe rerun classification
changed control-plane after Resolve → fresh dispatch classification
R2.6 preplay/publisher/main-gate/reobserver path unchanged
```

Required negative controls:

```text
../ root escape rejected
absolute path rejected unless explicit contract
stale status contradicting immutable proof fails validation
stale verifier incorrectly classified safe fails
recovery classifier cannot publish/push/write main
operational proof cannot create HUMAN_EVIDENCE
latest != install remains fail
unexpected production movement remains fail/blocker
```

Authority controls:

```text
publisher count remains one
main gateway remains one
HUMAN_EVIDENCE remains human
trusted predecessor unchanged
no automatic release retry
no automatic merge
```

---

## 11. Clean-path target

R2.7 must not make the successful release path longer.

Target remains:

```text
2 PRs → LIVE_PENDING
3 PRs → terminal closure when required
0 user manual pre-live GitHub repair operations on clean path
```

R2.7 primarily improves the exceptional path:

```text
failure occurs
→ correct next action is derived automatically
→ no operator guesswork
→ no authority widening
```

---

## 12. Proposed implementation order

Do not implement R2.7 before R2.6 living status is converged.

Recommended sequence:

```text
A. close R2.6 activation/status drift as separate admin transaction
B. freeze R2.7 design
C. implement shared root-aware path contract
D. implement pure recovery decision function
E. migrate workflow diagnostics/routing to shared decision
F. add evidence-derived operational status validation/projection
G. permanent CI/regression qualification
H. activate only through separate explicit R2.7 decision
I. use next genuine release as clean-path confirmation
```

Do not mix product runtime work with this release-system transaction.

---

## 13. Non-goals

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
release-simcore mutation as part of R2.7 implementation
```

---

## 14. Design verdict

```text
NEXT_RELEASE_SYSTEM_VERSION = R2.7
NAME = Evidence-Derived Operations
PRIMARY_DIRECTION = SIMPLICITY + BOUNDED AUTOMATION
SAFETY_MODEL = R2.6 INVARIANTS FROZEN
PRIMARY_SIMPLIFICATION = DERIVE STATUS FROM PROOF
PRIMARY_HARDENING = ONE ROOT-AWARE FILESYSTEM CONTRACT
PRIMARY_AUTOMATION = ONE RECOVERY DECISION FUNCTION
AUTOMATION_SCOPE = DIAGNOSIS / PROJECTION / ROUTING
AUTHORITY_AUTOMATION = NONE
CLEAN_PATH_COST = UNCHANGED
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
DESIGN_STATE = DRAFT / NOT FROZEN
```

Bottom line:

R2.6 proved that safety improves when deterministic defects are moved before irreversible publication. R2.7 should keep that wall exactly where it is and make the surrounding control plane quieter: fewer duplicated facts, fewer remembered recovery rules, and more state derived from immutable evidence.
