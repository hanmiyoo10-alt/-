# SimCore v0.66.0 Runtime FIX02 Self-Contained Recovery Builder Evidence

Date: 2026-08-29 KST

Status:

`DESIGN FROZEN · FIX02 IMPLEMENTED · PERMANENT PR CI PENDING · PRODUCTION UNCHANGED`

Classification:

`FIX · BLOCKER RECOVERY · RUNTIME CANDIDATE BUILDER · SELF_CONTAINED`

## Context

The first permanent v0.66.0 candidate `ea88eecb4428a42682894c96980bef420b0a0d27` failed closed in Permanent Candidate Required because Session removed its runtime Recovery dependency but retained an unbound shorthand `recovery,` in Session `module.exports`.

The first recovery builder FIX01 preserved the correct one-line runtime repair, but PR1 dry for `intent-03/new-03` proved that generic candidate materialization copies only the requested builder into a temporary directory. FIX01 depended on the sibling original M2-4 builder and therefore failed before candidate creation with `06600_FIX01_BASE_BUILDER_MISSING`.

Durable prerequisite evidence:

- `docs/SIMCORE_06600_PERMANENT_RELEASE_LEGACY_COMPAT_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_06600_RUNTIME_FIX01_SESSION_RECOVERY_EXPORT_EVIDENCE_2026-08-29.md`
- `docs/SIMCORE_06600_RELEASE_INTENT_FAILURE_02_FIX01_BUILDER_SELF_CONTAINMENT_2026-08-29.md`

## FIX02 design

FIX02 is one self-contained builder file. It does not import, execute, or read a sibling v0.66 builder.

Implementation:

`products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion-fix02.py`

Instead it uses the immutable failed candidate as the exact M2-4 runtime provenance:

```text
failed candidate C = ea88eecb4428a42682894c96980bef420b0a0d27
expected parent P   = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
latest blob         = 766c3b758ca26ae72546a38bfa1c053efa666c45
install blob        = 766c3b758ca26ae72546a38bfa1c053efa666c45
raw SHA-256         = af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
raw bytes           = 563052
```

The builder:

1. resolves the exact failed candidate object, fetching only its candidate ref locally if the object is absent;
2. proves the candidate parent is exact production `P`;
3. proves latest/install Git blobs, raw bytes and SHA-256 match the frozen failed-candidate identity;
4. reads those exact candidate runtime bytes;
5. isolates only the `session` module;
6. proves Session already has no `require('./recovery')` or `recovery.` runtime caller;
7. removes exactly one line matching the stale shorthand export `recovery,` from Session and nothing else;
8. proves the standalone `recovery` compatibility facade remains present;
9. writes byte-identical `plugins/simcore/latest.js` and `plugins/simcore/install.js`;
10. enforces a bounded output delta of at most 32 bytes from failed candidate C;
11. runs Node syntax checks;
12. runs `scripts/simcore-06406-closure-completion-gate-test.mjs` directly against both generated runtime files, because this exact adapter exposed the permanent blocker;
13. leaves all release-system, repository-system and production refs untouched.

## Mutation budget

Expected generated-runtime delta from failed candidate C:

```text
Session module: delete exactly one stale export line
all other runtime bytes: unchanged
latest.js == install.js: required
```

The new candidate itself will still be materialized from production `P` by the generic candidate controller. The failed candidate is only a frozen byte source/provenance anchor inside FIX02, not a publication authority.

## Validation boundary

The implementation is not accepted merely because the builder file exists. It must pass permanent SimCore PR `Verify` and `Required`, then a fresh PR1 dry must execute this builder through the generic single-file candidate materializer.

The decisive repair proof is therefore:

```text
FIX02 permanent PR CI PASS
+ intent-04 PR1 dry PASS
+ materialized candidate full gates PASS
```

## Release transaction rule

`intent-02/new-02` and `intent-03/new-03` remain immutable failed history and must never be rewritten or reused.

Only after FIX02 reaches main through permanent PR CI may a fresh append-only transaction be created:

```text
intentId  = simcore-v0.66.0-intent-04
releaseId = simcore-v0.66.0-new-04
```

The human live gate remains:

`06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT`

Close authority remains:

`HUMAN_EVIDENCE`

## Safety boundary

This document authorizes only the bounded FIX02 runtime recovery builder. It does not authorize release-system changes, direct `release-simcore` mutation, approval fabrication, publication, or live-gate closure.
