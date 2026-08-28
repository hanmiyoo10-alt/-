# SimCore v0.66.0 Runtime FIX03 Inline Session Smoke Evidence

Date: 2026-08-29 KST

Status:

`DESIGN FROZEN · FIX03 IMPLEMENTATION PENDING · PRODUCTION UNCHANGED`

Classification:

`FIX · BLOCKER RECOVERY · RUNTIME CANDIDATE BUILDER · SELF_CONTAINED_VALIDATION`

## Prerequisite failures

The v0.66.0 release remains fail-closed after two separate recovery-builder packaging failures:

1. `intent-03/new-03` failed because FIX01 depended on a sibling original M2-4 builder that generic candidate materialization does not copy into the candidate temp directory.
2. `intent-04/new-04` failed because FIX02 depended on `scripts/simcore-06406-closure-completion-gate-test.mjs` being present in the deployed production worktree, where main-only validation files are not guaranteed.

Durable evidence:

- `docs/SIMCORE_06600_PERMANENT_RELEASE_LEGACY_COMPAT_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_06600_RELEASE_INTENT_FAILURE_02_FIX01_BUILDER_SELF_CONTAINMENT_2026-08-29.md`
- `docs/SIMCORE_06600_RELEASE_INTENT_FAILURE_03_FIX02_VALIDATION_DEPENDENCY_SCOPE_2026-08-29.md`

## Frozen runtime repair

The original runtime defect remains unchanged:

`FIX · BLOCKER · RUNTIME · DANGLING_SESSION_RECOVERY_EXPORT`

Frozen failed candidate provenance:

```text
C = ea88eecb4428a42682894c96980bef420b0a0d27
P = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
latest/install Git blob = 766c3b758ca26ae72546a38bfa1c053efa666c45
raw SHA-256 = af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
raw bytes = 563052
```

The only authorized runtime mutation remains removal of exactly one stale shorthand `recovery,` line from Session `module.exports` after proving Session has no remaining Recovery runtime caller.

## FIX03 design

FIX03 must be fully executable with only:

```text
production worktree
+ copied FIX03 builder file
+ git object database already used by the generic candidate controller
+ Node/Python toolchain
```

It must not depend on any sibling builder or repository validation script path.

FIX03 must:

1. resolve and prove frozen failed candidate C/P/blob/raw digest;
2. read exact latest/install bytes from C and prove equality;
3. isolate the Session module;
4. prove no Session `require('./recovery')` or `recovery.` caller remains;
5. remove exactly one stale `recovery,` export line from Session export tail;
6. preserve the standalone Recovery compatibility facade;
7. enforce a bounded generated-byte delta from C;
8. write latest/install byte-identically;
9. run `node --check` on both files;
10. run an inline Node Session module-factory smoke test generated inside the builder itself;
11. fail if Session factory evaluation throws, if module exports are not produced, or if `recovery` remains an own exported property;
12. leave full historical semantic compatibility to the permanent `CANDIDATE_REQUIRED` legacy gate once an actual candidate exists.

## Inline smoke contract

The smoke test is intentionally narrow. It reproduces the failure class that blocked Permanent Required without importing the old adapter file:

```text
extract SimCore.define("session", ...)
→ execute module slice
→ capture session factory
→ call factory with inert recursive dependency stubs
→ require no exception
→ require module.exports object
→ require !hasOwnProperty("recovery")
```

This does not replace the permanent legacy semantic gate. It only makes the candidate builder self-contained against the exact dangling-export initialization defect.

## Release transaction rule

Failed history remains immutable:

```text
intent-02/new-02 = failed permanent CANDIDATE_REQUIRED
intent-03/new-03 = failed PR1 dry sibling-builder dependency
intent-04/new-04 = failed PR1 dry main-only validation dependency
```

After FIX03 reaches main through permanent PR CI, the next fresh release transaction must use an unused later ID, expected `intent-05/new-05` if still available.

Human live gate remains:

`06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT`

Close authority remains `HUMAN_EVIDENCE`.
