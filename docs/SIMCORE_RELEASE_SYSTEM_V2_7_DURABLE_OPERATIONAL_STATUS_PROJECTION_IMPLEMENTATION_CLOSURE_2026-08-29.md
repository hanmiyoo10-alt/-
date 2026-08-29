# SimCore R2.7 Durable Operational Status Projection — Implementation Closure

Date: 2026-08-29 KST

Status: **IMPLEMENTATION VERIFIED · PERMANENT CI QUALIFIED · OPERATIONAL BOOTSTRAP PENDING**

Classification: **R2.7 CLOSURE FIX · NON_RUNTIME · DOCUMENTARY STATUS AUTOMATION ONLY**

## Authority

Design:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_DURABLE_OPERATIONAL_STATUS_PROJECTION_DESIGN.md`

Implementation authorization:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_DURABLE_OPERATIONAL_STATUS_PROJECTION_IMPLEMENTATION_AUTHORIZATION_2026-08-29.md`

Worksheet:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_DURABLE_OPERATIONAL_STATUS_PROJECTION_IMPLEMENTATION_WORKSHEET_2026-08-29.md`

Parent R2.7 implementation merge floor:
- `f01483956a8f3117852c501b17a366d77eefa1d8`

## Implemented closure

The missing R2.7 caller is now implemented without creating a new proof owner or write authority.

```text
canonical release record + state receipt
→ existing release-operational-proof.mjs
→ bounded proof report
→ release-rsystem-status-project.mjs
→ implementation ancestry gate
→ exact documentary R2.7 status projection
→ existing scripts/repo-main-write.py
→ durable origin/main equality reobservation
```

Implemented owner:
- `products/simcore/tooling/release-rsystem-status-project.mjs`

Event-driven caller:
- `.github/workflows/simcore-r2-7-status-projection.yml`

Permanent regression:
- `release-system-r2-7-status-projection`

## Frozen first-use policy

```text
mode = FIRST_GENUINE_RELEASE_AFTER_IMPLEMENTATION
implementationAncestor = f01483956a8f3117852c501b17a366d77eefa1d8
verifierRelationship = DESCENDANT_OR_EQUAL
consumeOnce = true
```

No product version number is used as the activation gate.

The projection owner accepts only canonical proof output and requires the corresponding release record verifier commit to be descendant-or-equal to the frozen R2.7 implementation ancestor.

## Idempotency semantics

```text
pending + first eligible proof
→ PROJECT

same first-use proof after durable projection
→ NO_OP_ALREADY_DURABLE

later valid release after gate consumption
→ NO_OP_GATE_ALREADY_CONSUMED

pre-implementation verifier
→ NO_PROJECTION_NOT_ELIGIBLE

same release + contradictory stored proof
→ FAIL CLOSED
```

A later release cannot replace the first-use proof.

## Authority boundary

Preserved exactly:

```text
production publisher count       1
production publisher             RS2_4_PERMANENT
main writer                       scripts/repo-main-write.py
Candidate Required               unchanged
HUMAN_EVIDENCE                   human only
product LIVE_PASS authority      unchanged
runtime mutation                 NONE
release-simcore mutation         NONE
new product lifecycle states     0
new required release jobs        0
new clean-path PRs               0
background polling/retry         0
```

The pure projection owner verifies that the existing main authority is named `repo-main-write.py`, but contains no gateway invocation, publication primitive, workflow dispatch, push, or polling capability.

## Workflow boundary

The workflow is event-driven on canonical main evidence:

```text
products/simcore/releases/records/**
products/simcore/releases/state-receipts/**
```

The workflow file itself is also a one-time bootstrap trigger for first landing.

The R2.7 living status path is intentionally not a trigger, so the gateway-generated status commit cannot self-trigger a projection loop.

The workflow calls `scripts/repo-main-write.py` exactly once on the PROJECT path with an exact one-file allowlist:

```text
products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json
```

The gateway remains protected by:

```text
required-workflow = simcore-ci.yml
required-profile = MAIN_HEALTH
required-job = Required
```

## Qualification evidence

First clean implementation qualification:

```text
PR                       #851
qualification head       262990c594a0a83f3d6b7d5593c8598ae24c198e
SimCore CI run            33258748655
Verify job                99116919706 PASS
Required job              99116983078 PASS
trusted predecessor lane  PASS
```

This qualification occurred after every known validation anomaly below had been corrected.

A final exact-head CI is still required after this closure/status bookkeeping is added. That later exact-head run is the merge gate for PR #851.

## Validation anomaly ledger

### FIX · RESOLVED — repository contents write identity

An early status update used a stale contents blob SHA and GitHub rejected it with HTTP 409. The branch blob was re-read and the update was rebound to the exact branch identity.

No semantic or production effect.

### FIX · RESOLVED — predecessor lifecycle regression

The predecessor R2.7 suite hardcoded `activationAuthorized = false` as if it were permanent. It is now lifecycle-aware and accepts only either the coherent pending state or the coherent consumed documentary state.

### FIX · RESOLVED — active workflow self-test classification

The new active workflow initially appeared in the legacy-workflow completeness scan. The legacy map was left untouched and only the current/permanent self-test exemption set was extended.

### FIX · RESOLVED — fixture envelope

The first new fixture lacked the common permanent-harness envelope. It now uses the canonical fixture schema.

### BLOCKER · RESOLVED BEFORE QUALIFICATION — partial-read self-test overwrite

A bounded partial read of the large self-test was momentarily written as if it were the full file. The mistake was detected before any successful qualification or merge.

The complete canonical main self-test was re-read in full line ranges and restored. PR diff verification confirmed that the final self-test delta is only the one intended active-workflow exemption, plus nonsemantic final-newline representation.

No qualification evidence from before that repair is accepted.

### FIX · RESOLVED — authority-name false positive

The regression initially rejected the documentary string `repo-main-write.py` inside the projection owner even though the owner only verifies the preserved authority name. The test now forbids executable authority primitives while requiring the documentary authority check.

## Deployment semantics

This transaction explicitly declares:

```text
runtimeMutation = NONE
releaseSimcoreMutation = NONE
```

Therefore release-simcore deployment is **N/A BY DESIGN**.

After merge, deployment closure requires reobserving that:

```text
release-simcore remains at the existing v0.68 production commit
latest.js == install.js
production blob remains unchanged
```

No release command or runtime publication may be performed for this work item.

## Operational bootstrap boundary

Implementation qualification does not itself consume the R2.7 first-use gate.

After PR #851 lands on main, the workflow bootstrap must prove the missing caller against durable genuine evidence. The expected first eligible evidence is the earliest canonical record/receipt pair whose verifier commit is descendant-or-equal to the frozen R2.7 implementation ancestor.

Current durable v0.68 evidence is an expected candidate, not a hardcoded exception.

A successful bootstrap may change only documentary R2.7 status. It MUST NOT change the product's LIVE_PENDING/LIVE_PASS state or create HUMAN_EVIDENCE.

## Final implementation disposition

**R2.7 DURABLE STATUS PROJECTION IMPLEMENTATION IS PERMANENT-CI QUALIFIED. FINAL EXACT-HEAD CI AND POST-MERGE OPERATIONAL BOOTSTRAP REMAIN REQUIRED BEFORE CLOSURE IS COMPLETE.**
