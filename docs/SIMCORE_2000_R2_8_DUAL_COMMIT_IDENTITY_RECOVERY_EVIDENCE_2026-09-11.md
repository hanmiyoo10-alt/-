# SimCore #2000 — R2.8 Dual Commit Identity Recovery Evidence

Date: 2026-09-11 KST
Status: **#2000 FIX IMPLEMENTED · POSTMERGE QUALIFIED · FRESH R2.8 RETRY AUTHORIZED**
Classification: **NON-RUNTIME RELEASE-SYSTEM RECOVERY EVIDENCE**

## Triggering blocker

Fresh v0.70.11 recovery after #1990 reached R2.8 run `34540039653` and exposed a false terminal checked-PR identity assumption.

The transaction truthfully carried two distinct commits:

```text
semantic/local payload commit = 798d185104be7a38be0c80b7caf07dc51c4a5e91
protected staging commit      = 1dede57b66fe45fa2875140fa27fd17f04e8db05
```

The first is the HUMAN_EVIDENCE-derived semantic payload identity. The second is the immutable protected-main transport identity created by `repo-main-write.py` after replay onto the exact main base. The pre-fix consumer incorrectly required SHA equality and failed before #1990 fallback / PR_RECOVERY.

Issue: #2000.

## Frozen design

Design PR #2001 merged at:

```text
ca4deb6253dae4d27742995e780777e94da1325c
```

The frozen replacement invariant is exact dual-identity replay parity:

```text
payloadCommit = semantic terminal identity
checkedPr.commit = protected transport identity
SHA equality = NOT REQUIRED

required before PR mutation:
- exact semantic payload changed-path set
- exact checked candidate changed-path set
- exact final content/mode parity on every terminal path
- exact checked ref == checkedPr.commit
- current main == checkedPr.base
- exact production identity unchanged
```

PR_RECOVERY / Required, frozen-base revalidation, production reobservation, exact-head merge, durable checked-byte verification, and HUMAN_EVIDENCE authority remain unchanged.

## Implementation

Implementation PR #2003 changed only the frozen three owners:

```text
products/simcore/tooling/release-state-checked-pr.mjs
products/simcore/tests/release-state-checked-pr.integration.test.mjs
products/simcore/tests/release-terminal-main-write.integration.test.mjs
```

No writer, workflow, profile, token, runtime, release-simcore, production, or HUMAN_EVIDENCE semantic mutation was made.

The implementation branch was safely refreshed after independent docs-only PR #2002 advanced main. The refresh used a non-force merge commit and retained exactly the frozen three changed files.

Final implementation head:

```text
00eb062a31a7fa513d165848e59b4eecc10bc7e6
```

PR #2003 merged to main at:

```text
3dffffc542bba7cf0fd5d5b75b736455da8e1df0
```

## Regression correction during implementation

The first PR #2003 CI attempt failed in a newly added test helper, not in the production helper contract.

The test-only helper `makeSemanticCommit()` used `git add .`, unintentionally staging untracked fixture files `gate.json` and `envelope.json`. The semantic path-set guard correctly rejected those extra paths before the intended replay-parity negative could run.

The repair stayed inside the frozen test owner and changed staging to only explicitly requested semantic test paths. No runtime/helper invariant was weakened.

## Qualification

Final refreshed implementation head CI:

```text
SimCore CI run 34542481165
Verify   = SUCCESS
Required = SUCCESS
```

Merged-main qualification:

```text
SimCore CI run 34542601327
Verify   = SUCCESS
Required = SUCCESS
```

Production reobservation after merge:

```text
version = 0.70.11
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
runtime mutation = NONE
release-simcore mutation = NONE
```

## R-series disposition

```text
STABILIZATION = STRONGER
SAFE AUTOMATION = MORE AUTOMATIC AND SAFER
SIMPLIFICATION = NEUTRAL
```

The false SHA-equality invariant is replaced by exact path/content replay evidence. No third identity owner, workflow, profile, credential, state store, or policy bypass was introduced.

## Historical failed transport

PR #1999 is closed and unmerged historical failure evidence:

```text
base = 4d8ad2306782dab364194e7e6dd790ac147ea8bf
head = 1dede57b66fe45fa2875140fa27fd17f04e8db05
```

It must not be force-landed. Its old staging ref is historical failure evidence and is not terminal-success proof.

## Frozen v0.70.11 HUMAN_EVIDENCE coordinates

This recovery does not create or alter the release decision. Preserve exactly:

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

The only intended envelope mutation in this recovery transaction is appending this evidence path to `humanEvidence[]` so a fresh current-main push re-executes R2.8.

## Fresh recovery acceptance

Terminal closure is successful only if the fresh transaction proves:

```text
R2.8 resolver = ELIGIBLE_TO_PROJECT
fresh semantic payload derived from current main
fresh protected staging candidate derived from current main
dual-identity path/content replay parity = PASS
#1990 exact policy-denial fallback exercised naturally if Actions PR creation is denied
exact checked PR bound
PR_RECOVERY / Required = PASS
frozen base/head/ref revalidated
production reobserved unchanged
exact checked PR merged
terminal resolver readback = ALREADY_DURABLE
staging cleanup = PASS
main manifest validation_status = LIVE_PASS
main current_priority = POST_07011_NEXT_STEP_REVIEW
release-simcore remains 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob remains a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

Any new contradiction is a new BLOCKER and stops advancement. #1990 is not considered naturally live-proven until the supported policy-denial path is actually reached and resumed in a fresh transaction.

## Verdict

```text
#2000 = FIXED_AND_POSTMERGE_QUALIFIED
FRESH_V07011_R2_8_RETRY = AUTHORIZED
HUMAN_TERMINAL_DECISION = PRESERVED
PRODUCTION MUTATION = NONE
RUNTIME MUTATION = NONE
RELEASE_SIMCORE MUTATION = NONE
```
