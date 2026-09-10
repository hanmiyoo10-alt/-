# SimCore R2.8 v0.70.11 stderr-handoff recovery evidence

Date: 2026-09-10 KST
Status: **#1985 FIX IMPLEMENTED · POSTMERGE QUALIFIED · FRESH R2.8 RETRY AUTHORIZED**
Classification: **NON-RUNTIME RELEASE-SYSTEM RECOVERY EVIDENCE**

## Triggering blocker

Issue `#1985` records the second v0.70.11 R2.8 terminal-convergence blocker exposed by fresh recovery run `34415827838`.

That run reached `ELIGIBLE_TO_PROJECT`, created checked candidate `0707d2957af2702109a5b4aca49b5cec6ae5a5d9`, and obtained required candidate CI run `34415847435` with `Verify = SUCCESS` and `Required = SUCCESS`, but the strict checked-PR handoff parser rejected the writer result as `unexpected stderr`.

The old checked candidate remains failure evidence only and must not be force-landed after `main` has advanced.

## Dedicated repair

Authority scope: issue `#1985`, comment `5610178534`.

Implementation:

```text
PR #1986
fix(repo): keep protected-main checked-PR handoff stderr clean
merge = f6f5fb70debfcc2de082b052efa6c4faf047a597
```

The repair is owned by `scripts/repo-main-write.py`. Routine successful Git subprocess output is captured so a valid protected-main exit-9 handoff keeps stderr empty, while real Git failures remain nonzero and re-surface diagnostics. The strict consumer parser and exact marker/base/commit/ref checks remain unchanged.

Changed runtime/plugin files: `NONE`.
Changed `release-simcore` bytes: `NONE`.

## Postmerge qualification

Exact merged main before this recovery transaction:

```text
f6f5fb70debfcc2de082b052efa6c4faf047a597
```

Merged-main proof:

```text
SimCore CI run 34419025474
Verify   = SUCCESS
Required = SUCCESS

Canonical Main Protection Guard run 34419073235 = SUCCESS
Canonical Main Operations run 34419091376 = SUCCESS
Canonical Main Proof Bundle run 34419025450 = SUCCESS
```

The repaired writer is durably readable on merged `main`, including the quiet checked Git helper used by successful fetch / checkout / reset / commit paths.

## Current production and release-state barrier

Before this retry:

```text
production version = 0.70.11
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
manifest validation = PENDING_REAL_LONG_CHAT
manifest current priority = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
```

No production, runtime, publication, or `release-simcore` mutation is authorized by this document.

## Frozen HUMAN_EVIDENCE coordinates

This recovery does not create a new release decision. The canonical v0.70.11 HUMAN_EVIDENCE envelope must preserve:

```text
releaseId = simcore-v0.70.11-new-03
productionCommit = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
productionBlob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
liveScenarioId = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
decision = LIVE_PASS
checkpoint = M2-6
nextPriority = POST_07011_NEXT_STEP_REVIEW
authorityConfirmation = HUMAN_EVIDENCE
```

The only intended envelope change is appending this document to `humanEvidence[]` so the current repaired R2.8 workflow receives a fresh main push event and derives a fresh terminal candidate from the then-current `main`.

## Recovery requirement

The retry is successful only if the fresh R2.8 transaction proves all of the following:

```text
fresh evidence transaction resolved
fresh production identity re-observed exactly
fresh terminal candidate derived from current main
required candidate gate PASS
protected-main checked transport completes through existing PR_RECOVERY path
durable resolver readback = ALREADY_DURABLE
manifest validation = LIVE_PASS
manifest priority = POST_07011_NEXT_STEP_REVIEW
production/runtime/release-simcore bytes unchanged
```

Any new contradiction remains fail-closed and prevents terminal closure.

## Separate unresolved product FIX

Issue `#1660` remains separate OPEN / FIX for visible standalone `internal:` planning-control contamination. Successful v0.70.11 terminal recovery does not resolve or reclassify it and does not authorize a next runtime version.

## Verdict

```text
R2_8_STDERR_HANDOFF_GAP = FIXED_AND_POSTMERGE_QUALIFIED
OLD_CHECKED_CANDIDATE_FORCE_LAND = FORBIDDEN
FRESH_V07011_R2_8_PROJECTION_RETRY = AUTHORIZED
HUMAN_TERMINAL_DECISION_COORDINATES = PRESERVED
PRODUCTION MUTATION = NONE
RUNTIME MUTATION = NONE
RELEASE_SIMCORE MUTATION = NONE
```