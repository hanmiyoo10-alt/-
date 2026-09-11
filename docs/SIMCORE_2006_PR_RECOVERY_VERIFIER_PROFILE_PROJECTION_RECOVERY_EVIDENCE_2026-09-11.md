# SimCore #2006 PR_RECOVERY Verifier Profile Projection Recovery Evidence

Date: 2026-09-11 KST
Status: **FIX MERGED · POSTMERGE CI PASS · FRESH R2.8 OPERATIONAL REPROOF PENDING**
Tracking: #2006
Related checked transport: #2005
Authority: `docs/SIMCORE_1959_CHECKED_PR_CALLER_CONSUMPTION_DESIGN_2026-09-09.md`

## 1. Classification

```text
BLOCKER · PR_RECOVERY_VERIFIER_PROFILE_PROJECTION · RELEASE-SYSTEM / CONTROL-PLANE · NONRUNTIME
```

The v0.70.11 R2.8 terminal transport produced an exact checked state PR, but its explicit `PR_RECOVERY` validation failed before the proposed permanent verifier could run.

## 2. Live failure evidence

Checked transport coordinates:

```text
PR                    = #2005
frozen base           = f6327214b322752424233d083facb33eb68571dd
exact checked head    = ce0d1e084029ad7a928208c5a23687d9e3525a46
production commit     = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob       = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

Two workflow-dispatch runs on the same checked head proved the distinction:

```text
34542993530 · MAIN_HEALTH · Verify SUCCESS · Required SUCCESS
34543094153 · PR_RECOVERY · Verify FAILURE · Required FAILURE
```

The failing PR_RECOVERY run successfully proved the exact checkout, frozen base, base ancestry, `STATE_SYNC` path classification, expected production identity, and unchanged production authority. It then failed only at the proposed verifier boundary:

```text
resolver output: verifier_profile=PR_MAIN
proposed verifier env: PROFILE=PR_RECOVERY
check.mjs: CI_PROFILE_INVALID: unsupported profile
bounded result: INFRA_ERROR / REPORT_MISSING
```

## 3. Frozen contract

The already-frozen #1959 design requires `PR_RECOVERY` to remain a workflow-dispatch transport profile that reproduces `PR_MAIN` validation semantics. In particular, the proposed permanent verifier must run with the same verifier profile as `PR_MAIN` while retaining explicit PR base/head identities.

No new runtime, release, HUMAN_EVIDENCE, or LIVE_PASS semantics are introduced by this repair.

## 4. Minimal repair

Implementation PR #2007 changed only:

```text
.github/workflows/simcore-ci.yml
products/simcore/tests/suites/release-system-r2-6.test.mjs
```

Repair:

```text
Run proposed permanent verifier
PROFILE = steps.profile.outputs.verifier_profile
```

The regression now scopes the actual proposed-verifier workflow section and proves both:

```text
resolved verifier profile is consumed
outer PR_RECOVERY transport profile does not leak into check.mjs
```

## 5. Qualification

Implementation head:

```text
8526b0639c4a29f9cb9cce38d910ae890a247266
```

PR #2007 qualification:

```text
SimCore CI run 34546850110
Verify   SUCCESS
Required SUCCESS
Plugin Control Plane PR observe 34546850033 SUCCESS
```

Merged main:

```text
0cd33102d2d82361594db7ae4b71fc804f9301cd
```

Merged-main SimCore CI:

```text
run 34546986975
Verify   SUCCESS
Required SUCCESS
```

## 6. Preserved authority

```text
runtime mutation                  NONE
release-simcore mutation          NONE
production identity change        NONE
HUMAN_EVIDENCE semantic change    NONE
LIVE_PASS semantic change         NONE
PR_RECOVERY base/head guards      PRESERVED
STATE_SYNC classification         PRESERVED
Required public gate              PRESERVED
```

`release-simcore` deployment and real long-chat validation are **N/A** for this transaction because it is a release-system/control-plane-only repair and does not modify runtime bytes or live behavior.

## 7. Fresh operational reproof

The old #2005 head predates the workflow repair and must not be rewritten or treated as post-fix operational proof.

A fresh R2.8 transaction must therefore be triggered from the repaired main while preserving the exact accepted v0.70.11 HUMAN_EVIDENCE decision and production identity. Expected proof:

```text
fresh repaired-main R2.8 staging head
→ checked transport PR
→ PR_RECOVERY resolves outer profile to PR_MAIN verifier profile
→ Verify SUCCESS
→ Required SUCCESS
→ frozen-base revalidation
→ protected-main merge
→ durable reobservation PASS / ALREADY_DURABLE as applicable
```

Until that sequence completes, #2006 remains operationally open and v0.70.11 terminal convergence is not declared complete by this document.
