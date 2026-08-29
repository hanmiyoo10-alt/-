# SimCore Release System R2.8 — Direction Draft

Date: 2026-08-29 KST

Status: **DRAFT · NOT FROZEN · NON_RUNTIME · NO IMPLEMENTATION AUTHORIZATION**

Predecessor: `R2.7 — Evidence-Derived Operations`

Primary evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_V06800_FIRST_USE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_06800_EXACT_APPROVAL_TRANSACTION_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_06500_APPROVAL_ACTIVATION_TITLE_BLOCKER_2026-08-28.md`
- `docs/SIMCORE_06500_APPROVAL_SPEC_PATH_BLOCKER_2026-08-28.md`

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

## 1. Direction

R2.8 should preserve the complete R2.7/R2.6 safety shell while removing remaining operator-memory requirements around the exact-approval boundary and operational-status convergence.

Canonical direction:

```text
KEEP THE SAFETY WALL
KEEP ONE PUBLISHER
KEEP ONE MAIN WRITER
DERIVE PACKAGE SHAPE FROM MACHINE EVIDENCE
VALIDATE BEFORE MERGE
DERIVE ADMIN STATUS FROM OPERATIONAL PROOF

AUTOMATE PACKAGE DERIVATION, NOT APPROVAL AUTHORITY
AUTOMATE CONVERGENCE, NOT HUMAN_EVIDENCE
```

Disposition:

```text
R2.8 = STABILITY + SIMPLICITY + BOUNDED AUTOMATION
```

## 2. Required predecessor closure

Before R2.8 implementation begins, R2.7 first-use operational proof/status drift should be converged in a separate administrative transaction.

Do not hide R2.7 closure debt inside R2.8 implementation.

## 3. Frozen invariants

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

## 4. Slice A — One machine-derived approval package owner

The recurring v0.65/v0.68 failures show that approval title, file count, paths, and committed spec packaging are still operator-memory rules.

R2.8 should introduce one deterministic owner that derives the existing exact-approval transaction package from canonical candidate evidence.

Preferred inputs:

```text
releaseId
canonical candidate receipt
canonical spec shadow / derived spec
```

Derived outputs:

```text
canonical approval JSON
canonical committed spec JSON
canonical approval path
canonical spec path
canonical PR title
package manifest / digest
```

Target invariant:

```text
candidate evidence
→ one package derivation owner
→ exactly two canonical files
→ exact canonical title
→ existing approval PR
```

No second approval format and no parallel authority.

## 5. Slice B — Premerge approval-envelope validation

The exact transaction must be rejected before merge when any of these are wrong:

```text
PR title
changed-file count
approval path
spec path
releaseId binding
candidate C/P/blob binding
spec-shadow/spec equivalence
```

The validation should reuse the same package semantics as activation rather than maintaining a second handwritten rule set.

Preferred behavior:

```text
malformed package
→ PR CI FAIL
→ no merged invalid approval transaction
→ no append-only recovery identity consumed
```

Activation remains fail-closed after merge as defense in depth.

## 6. Slice C — Evidence-derived R-system status convergence

R2.7 already validates canonical operational proof. R2.8 should remove the remaining manual documentary convergence gap.

Target:

```text
canonical genuine-release proof
→ validate operational proof
→ derive R-system first-use/operationally-proven projection
→ route durable write through existing main gateway
```

This projection must not:

```text
authorize a product release
create HUMAN_EVIDENCE
promote product LIVE_PASS
publish to release-simcore
create a second main writer
```

R-system administrative truth should follow immutable evidence instead of requiring a separate remembered edit.

## 7. Automation boundary

Allowed:

```text
derive exact approval files
derive exact approval PR title
validate exact approval transaction before merge
optionally prepare/open the existing approval PR through a bounded owner
project R-system documentary state from validated operational proof
emit precise recovery guidance
```

Forbidden:

```text
automatic approval decision
automatic merge of approval PR
automatic Permanent publication authority
automatic HUMAN_EVIDENCE
automatic product LIVE_PASS
force push/publication
new publisher
new main writer
```

## 8. Simplicity budget

```text
new publishers                 0
new main writers               0
new product lifecycle states   0
new required jobs              0 preferred
new clean-path PRs             0
background polling/retry       0
operator-entered package rules decrease sharply
workflow-local duplicated approval semantics decrease
mutable documentary flags decrease
```

One helper is justified only if it deletes more remembered/duplicated rules than it introduces.

## 9. Regression targets

Positive:

```text
canonical candidate evidence -> exact two-file approval package
canonical title derived exactly
canonical approval/spec paths derived exactly
premerge validator accepts machine-derived package
v0.68 new-02 shape passes
operational proof -> R-system status projection deterministic/idempotent
```

Negative:

```text
wrong title rejected premerge
one-file package rejected premerge
three-file package rejected premerge
wrong spec path rejected premerge
copied/noncanonical evidence rejected
candidate identity drift rejected
status projection without canonical proof rejected
no authority primitive in package/projection owners
```

## 10. Draft verdict

```text
VERSION = R2.8 candidate
PRIMARY_DIRECTION = STABILITY + SIMPLICITY + BOUNDED AUTOMATION
SAFETY_MODEL = R2.7/R2.6 INVARIANTS FROZEN
APPROVAL_MODEL = MACHINE-DERIVED PACKAGE, HUMAN APPROVAL AUTHORITY
STATUS_MODEL = EVIDENCE-DERIVED DURABLE CONVERGENCE
NEW_AUTHORITY = NONE
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
DESIGN_FROZEN = NO
IMPLEMENTATION_AUTHORIZED = NO
```
