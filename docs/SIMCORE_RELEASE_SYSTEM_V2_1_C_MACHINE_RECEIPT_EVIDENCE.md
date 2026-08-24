# SimCore Release System v2.1 — C Machine Candidate Receipt / Spec Shadow Evidence

Date: 2026-08-25
Status: **IMPLEMENTED · PENDING PERMANENT CI · SHADOW-FIRST · NON-RUNTIME**

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

## Operation finding

During implementation, a contents-API update used a commit SHA where a blob SHA was required and returned HTTP 409 before mutation.

```text
CANDIDATE_RECEIPT_CONTENT_SHA_PREWRITE_MISMATCH
= FIX / TOOLING / PREWRITE / NON_RUNTIME
```

Impact: none; no repository write occurred from the rejected call.

R2.1-C is not closed until permanent Verify/Required PASS, merge, and durable-main re-observation.
