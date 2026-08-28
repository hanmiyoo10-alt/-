# SimCore v0.66.0 Release Intent Failure 03: FIX02 Validation Dependency Scope

Date: 2026-08-29 KST

Status:

`BLOCKER OPEN · PR1 DRY FAILED · PRODUCTION UNCHANGED`

Classification:

`FIX · BLOCKER · BUILDER_VALIDATION_DEPENDENCY_SCOPE · NON_RUNTIME · PRODUCTION_UNCHANGED`

## Trigger

Fresh append-only recovery transaction:

```text
intentId  = simcore-v0.66.0-intent-04
releaseId = simcore-v0.66.0-new-04
PR        = #774
```

FIX02 had already reached `main` through PR #773 with permanent SimCore `Verify` and `Required` passing.

PR #774 then exercised FIX02 through the generic PR1 dry single-file candidate materializer.

SimCore CI run:

`33205560129`

Exact failure:

```text
GATE_PR1_DRY = FAIL
reasonCode   = PR1_DRY_QUALIFICATION_FAIL

CANDIDATE_BUILDER_FAILED:
python3 /tmp/simcore-candidate-Q97VKc/build-06600-m2-4-session-runtime-mirror-boundary-completion-fix02.py
06600_FIX02_LEGACY_ADAPTER_MISSING scripts/simcore-06406-closure-completion-gate-test.mjs
```

## Root cause

Generic candidate materialization executes the requested builder with `cwd` set to a detached worktree of deployed production `P`.

For this release:

```text
P = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

FIX02 correctly stopped depending on the sibling original v0.66 builder, but its final targeted validation still assumed this main-side validation script existed in the production worktree:

`scripts/simcore-06406-closure-completion-gate-test.mjs`

That assumption is false for the deployed production tree used by the candidate controller.

The builder therefore completed its frozen failed-candidate identity checks, bounded Session repair and Node syntax checks, then failed before completing its targeted semantic validation.

## Interpretation

This is not evidence that the one-line runtime repair is wrong.

It is a second packaging/scope defect in the recovery builder:

```text
candidate builder executable context = production worktree + copied builder file
main-only validation script availability = NOT GUARANTEED
```

A candidate builder must not require repository validation files that are absent from deployed production unless those validation bytes are carried inside the builder itself.

## Safety state

```text
candidate C for intent-04 = NONE
release-simcore mutation  = NONE
permanent publication     = NOT REACHED
production version        = 0.65.0
production commit         = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

The fail-closed shell again prevented publication.

## Transaction disposition

`intent-04/new-04` is abandoned and must not be reused or rewritten.

PR #774 must remain closed without merge as durable failed-transaction evidence.

A fresh transaction may use only a later unused intent/release ID after the repair reaches main.

## Required repair direction

Create append-only FIX03. FIX03 must preserve the exact runtime repair but remove all dependency on external validation scripts from the production worktree.

The preferred bounded validation is self-contained and directly targets the original defect:

1. prove frozen failed candidate C/P/blob/raw digest exactly;
2. isolate Session;
3. prove no Session `require('./recovery')` / `recovery.` caller exists;
4. remove exactly one stale `recovery,` export line;
5. preserve the standalone Recovery facade;
6. keep latest/install byte-identical;
7. run Node syntax checks;
8. run an inline/self-contained Session module-factory load smoke test that fails if the repaired Session factory still throws or exports stale Recovery ownership;
9. rely on the permanent CANDIDATE_REQUIRED legacy compatibility gate for the full historical semantic adapter after a real candidate exists.

Do not copy release-system changes into this runtime recovery.

## Advancement rule

No new release intent may be created until:

```text
FIX03 design/evidence recorded
→ FIX03 implemented on work branch
→ permanent PR Verify + Required PASS
→ FIX03 merged to main
```

Then use a fresh append-only transaction such as `intent-05/new-05`, provided those IDs remain unused at that time.
