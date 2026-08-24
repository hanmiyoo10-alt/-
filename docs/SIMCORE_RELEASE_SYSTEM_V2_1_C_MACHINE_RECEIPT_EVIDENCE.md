# SimCore Release System v2.1 — C Machine Candidate Receipt / Spec Shadow Evidence

Date: 2026-08-25
Status: **IMPLEMENTED · PERMANENT CI REQUALIFICATION ACTIVE · SHADOW-FIRST · NON-RUNTIME**

## Purpose

R2.1-C removes manual transcription of machine-known candidate identity.

After generic candidate PASS, the workflow now derives and durably records:

```text
P
S
C
candidate blob
candidate ref
builder digest
verifier commit
candidate report digest
```

under:

`products/simcore/releases/candidate-receipts/<intentId>.json`

The candidate report digest binds the durable receipt to the bounded candidate verification artifact.

## Release identity input

The candidate request now carries a human/product release identifier such as:

`simcore-v0.64.8-new-01`

It does not carry C/P/blob hashes beyond the already-required expected production parent. The workflow validates that releaseId version and mode agree with targetVersion/releaseMode before materialization.

## Machine-derived release spec shadow

The same request + machine receipt derives:

`products/simcore/releases/spec-shadows/<releaseId>.json`

with:

```text
authority = SHADOW_ONLY
```

No permanent publisher consumes this shadow yet. Current immutable release-spec authority remains unchanged until shadow equivalence is qualified.

Permanent tests cover NEW_VERSION, SAME_VERSION_CORRECTION, ROLLBACK identity mapping and historical v0.64.7 spec semantic equivalence.

## Durable write authority

Candidate transport creation and main receipt persistence are separate jobs.

```text
materialize job:
  contents: write
  candidate refs only

receipt job:
  contents: write
  actions: write
  bounded main payload only
  MAIN_HEALTH project gateway
```

The receipt job writes only the exact receipt and spec-shadow paths and shares the `simcore-main-state-sync` concurrency group. It has no release publisher.

## Operation findings

During implementation, a contents-API update used a commit SHA where a blob SHA was required and returned HTTP 409 before mutation.

```text
CANDIDATE_RECEIPT_CONTENT_SHA_PREWRITE_MISMATCH
= FIX / TOOLING / PREWRITE / NON_RUNTIME
```

Impact: none; no repository write occurred from the rejected call.

PR `#270`, first permanent CI run `32763177565`:

```text
Verify   97546535805  FAIL
Required 97546699689  FAIL
GATE_CI_SELF       PASS
GATE_STATIC        PASS
GATE_ARCH          PASS
GATE_STATE         PASS
GATE_COORDINATION  PASS
GATE_REGRESSION    FAIL
reason = candidate-materialize: candidate workflow publication primitive: repo-main-write.py
```

Classification:

```text
R2_1_C_B_AUTHORITY_TEST_SCOPE_TOO_WIDE
= FIX / TEST_BOUNDARY / NON_RUNTIME / PRE_MERGE
```

Cause: the R2.1-B authority test inspected the entire shared workflow text. R2.1-C legitimately adds a separate receipt job that owns a bounded `repo-main-write.py` state write, so the old assertion falsely treated that state writer as if the candidate materialize job had acquired publication authority.

Repair: preserve the negative invariant but scope it to the `materialize` job boundary only. The materialize application/tool and job must still contain no `release-publish.mjs`, `repo-main-write.py`, force-update, or production publication primitive; the separate receipt job is independently constrained by C tests and the main-write gateway.

Production impact:

```text
runtime mutation = NONE
release-simcore mutation = NONE
v0.64.7 production unchanged
```

R2.1-C is not closed until permanent Verify/Required PASS, merge, and durable-main re-observation.
