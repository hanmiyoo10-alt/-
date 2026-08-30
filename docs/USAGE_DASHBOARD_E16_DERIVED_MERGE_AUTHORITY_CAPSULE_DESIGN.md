# Local Usage Dashboard — E16 Derived Merge-Authority Capsule Design

Status: **IMPLEMENTATION IN PROGRESS**

Tracking: #906

Scope: `plugins/usage-dashboard/` release-control only.

## Goal

E16 reduces the last repetitive merge-handoff choreography without creating a new authority axis.

Today a valid release merge requires the assistant to join several already-authoritative facts:

- durable request version/source/generation/PR number;
- deterministic PR base/head/body;
- E15 canonical handoff presentation;
- E9 exact-SHA validation;
- candidate materialization version/source identity;
- E11 current-main/readiness classification;
- expected-head merge identity.

E16 compiles these facts into one deterministic, fail-closed, read-only capsule.

## Governance

E16 is not a durable release generation.

The durable generation remains E13. E14 remains candidate-DAG ancestry, E15 remains first-write handoff hygiene, E9 remains exact-SHA validation, and E11 remains current-main merge readiness.

The E16 capsule is derived evidence only. It cannot merge, stage, validate, publish, promote, or mutate a ref.

## Canonical capsule

A ready capsule binds:

```text
schema
kind = usage-dashboard-e16-merge-authority-capsule
release_version
request_number
source_sha
release_generation = E13
pr_number
pr_head_branch
expected_head_sha
fresh_main_sha
validation_status = GREEN
merge_guard_verdict
candidate_base_sha
candidate_base_source
candidate_dag_mode
candidate_materialization_version
candidate_materialization_source_sha
authority = derived-read-only
next = assistant-fresh-reread-and-expected-head-merge
```

A capsule is valid only for the exact `expected_head_sha` + `fresh_main_sha` pair it names.

## Pure helper

Add:

`plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs`

The helper accepts already-read request/PR/E9/E11 facts and performs no I/O. It reuses E15 body validation and produces deterministic JSON / receipt text.

It must reject mismatches with stable E16 error codes instead of silently normalizing authority.

## E11 extension

`merge_guard_e11.cjs --classify` already parses the materialization commit message. Expose the parsed candidate materialization version and source SHA in its existing classification result.

This is derived data from the same candidate commit, not a new parser or authority source.

## Reconciler integration

Extend the existing durable E9 reconciler after E9 GREEN and E11 READY.

The reconciler already owns issue-comment writes, PR reads, main reads, validation reads, and E11 classification. It should invoke the pure E16 helper and post one immutable marker:

```text
UD_E16_MERGE_CAPSULE:<candidate_sha>:<fresh_main_sha>
```

No new workflow, token class, queue, timer, schedule, or writer is added.

The existing `UD_E9_VALIDATED` compatibility marker remains.

## Freshness and merge authority

The capsule does not replace the assistant's final fresh read.

Before merge the assistant still re-reads:

- current PR head;
- current main;
- PR mergeability/state.

The merge may proceed only when those identities still equal the capsule's `expected_head_sha` and `fresh_main_sha`, and the GitHub merge call remains expected-head bound.

If main or PR head moves, the old capsule is stale by definition. The next normal reconciler pass can derive a new capsule for the new identity pair.

## Fail-closed rules

Reject when:

1. request generation is not E13;
2. request PR number is missing or differs from the PR;
3. PR base is not main;
4. PR head repo/branch is not the deterministic Usage Dashboard stage identity;
5. PR head SHA differs from the E9/E11 candidate;
6. E15 PR body validation fails;
7. E9 validation is missing, RED, unknown, or for another SHA;
8. candidate materialization version differs from request version;
9. candidate materialization source SHA differs from request source SHA;
10. E11 current-main differs from the fresh main supplied to the capsule;
11. E11 verdict is not `MERGE_READY_NO_DRIFT` or `MERGE_READY_WITH_UNRELATED_MAIN_DRIFT`.

## Non-goals

E16 does not:

- add `release_generation: E16`;
- auto-merge main;
- grant candidate code write authority;
- add a production writer;
- mutate the release request or PR body;
- replace E9/E11/E15;
- make physical verification a repository gate;
- create a release solely for release-control maintenance.

## Product boundary

Implementation is byte-neutral for Product/Plugin/Engine/Manager/bootstrap runtime artifacts.

Production remains whatever `release-usage-dashboard` currently declares; E16 maintenance itself does not authorize a version bump or promotion.

## Regression plan

The E16 contract must prove:

- canonical capsule determinism;
- request/PR/E9/E11/materialization exact identity binding;
- E15 body validation remains mandatory;
- all mismatch classes fail closed;
- blocked protected-main drift cannot yield a ready capsule;
- no-drift and unrelated-drift E11 ready verdicts can yield a capsule;
- `expected_head_sha` is exposed but no merge writer exists in the helper;
- reconciler uses its existing comment writer and no second workflow/writer appears;
- E13 remains durable generation and E16 remains rejected by `release_generation` parsing;
- runtime artifacts are unchanged;
- full Usage Dashboard registry remains GREEN.

## Expected result

Normal pre-merge handoff becomes:

```text
E15 canonical request/PR
-> E9 exact-SHA GREEN
-> E11 fresh main/readiness
-> E16 derived merge capsule
-> assistant fresh identity re-read
-> expected-head merge
-> exact-byte promotion/parity
-> physical acceptance separately
```

This makes the merge handoff smaller and more machine-checkable while preserving the existing authority boundaries.