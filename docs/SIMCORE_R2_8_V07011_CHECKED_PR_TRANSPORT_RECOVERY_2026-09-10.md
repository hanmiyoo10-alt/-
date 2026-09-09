# SimCore R2.8 v0.70.11 Checked-PR Transport Recovery Evidence

Date: 2026-09-10 KST
Status: **FIX IMPLEMENTED · POSTMERGE QUALIFIED · FRESH HUMAN-EVIDENCE PROJECTION RETRY AUTHORIZED**
Classification: **NON-RUNTIME RELEASE-SYSTEM RECOVERY EVIDENCE**

## Triggering blocker

Issue `#1981` recorded a caller-integration blocker during the first v0.70.11 R2.8 terminal convergence attempt.

The original run `34375688321` reached:

```text
ELIGIBLE_TO_PROJECT
```

and produced a bounded terminal payload, but `repo-main-write.py` correctly returned the protected-main checked-PR handoff with exit code 9. The R2.8 workflow did not yet consume that handoff, so terminal LIVE_PASS projection did not become durable.

The old generated candidate was:

```text
15ccdb2b5fbe808431f855ee1f8f4cf2e48e1885
```

on the then-current main base:

```text
b56ec2444519e21897b0e30ffd6356cd9b01d09c
```

That old candidate must not be force-landed after main has advanced.

## Dedicated repair

Design authority:

```text
docs/SIMCORE_1981_R2_8_CHECKED_PR_TRANSPORT_DESIGN_2026-09-10.md
PR #1982
merge 7902e25da583457b727da455e134db1cf9b8fb32
```

Implementation:

```text
PR #1983
fix(simcore): consume R2.8 checked-PR terminal handoff
merge d0834dd5ae23796ae6cfe60b66d4666335936e62
```

The bounded repair:

```text
repo-main-write.py structured exit-9 handoff
-> truthful terminal main-write adapter
-> existing checked transport core
-> PR_RECOVERY / Required validation
-> frozen base/ref/path/production revalidation
-> protected-main transport merge
-> terminal ALREADY_DURABLE readback
-> checked staging cleanup
```

It does not fabricate release-state-main-gate or post-publish reports. Terminal cleanup is bound to the terminal resolver's own durable `ALREADY_DURABLE` proof.

Changed runtime/plugin files:

```text
NONE
```

Changed `release-simcore` bytes:

```text
NONE
```

## Postmerge qualification

Exact merged main before this recovery transaction:

```text
d0834dd5ae23796ae6cfe60b66d4666335936e62
```

Merged-main proof:

```text
SimCore CI run 34414234499
Verify   = SUCCESS
Required = SUCCESS

Canonical Main Operations = SUCCESS
Canonical Main Protection Guard run 34414288841 = SUCCESS
Canonical Main Proof Bundle run 34414234453 = SUCCESS
```

The repaired implementation is durably readable on exact merged main, including:

```text
products/simcore/tooling/release-terminal-main-write.mjs
.github/workflows/product-simcore-terminal-convergence-r2-8.yml
```

## Production safety and currentness barrier

Fresh recovery-entry readback:

```text
main = d0834dd5ae23796ae6cfe60b66d4666335936e62
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production version = 0.70.11
production blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
manifest validation = PENDING_REAL_LONG_CHAT
manifest current priority = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
```

No production, runtime, publication, or release-simcore mutation is authorized by this recovery evidence document.

## Frozen human terminal decision coordinates

The existing canonical v0.70.11 HUMAN_EVIDENCE envelope already contains the human terminal decision. This recovery does not create a second product decision and does not alter any semantic coordinate.

The following values MUST remain unchanged:

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

Existing human evidence remains authoritative for the release acceptance decision:

```text
docs/SIMCORE_LIVE_07011_RELEASE_CLOSE_2026-09-10.md
docs/SIMCORE_07011_REAL_LONG_CHAT_MIXED_PATH_EVIDENCE_2026-09-09.md
```

## Fresh retry authority

The failed old workflow run must not be rerun as authority because it is bound to the pre-repair workflow source and old main head.

R2.8 has no manual workflow-dispatch authority. The proven recovery pattern is therefore:

```text
preserve the exact existing HUMAN_EVIDENCE decision coordinates
+ append this durable release-system repair evidence to humanEvidence[]
+ merge the updated canonical envelope from current main
-> fresh R2.8 push event
-> repaired current workflow source
-> derive a fresh exact terminal payload from current main
-> route any protected-main exit-9 through checked PR_RECOVERY transport
-> require durable ALREADY_DURABLE / LIVE_PASS readback
```

Operator continuation explicitly authorized proceeding with the v0.70.11 terminal recovery after #1983 postmerge qualification. That continuation authorizes this deterministic recovery transaction only; it does not authorize a new runtime version or a #1660 runtime repair.

## Separate unresolved product FIX

Issue `#1660` remains OPEN / FIX for visible standalone `internal:` planning-control contamination. Terminal closure of v0.70.11 does not reclassify or repair that issue.

```text
v0.70.11 release terminal convergence = may complete
next runtime advancement = still held by #1660 until separately resolved or evidence-reclassified
```

## Verdict

```text
R2_8_CHECKED_PR_CALLER_GAP = FIXED_AND_POSTMERGE_QUALIFIED
OLD_STALE_TERMINAL_CANDIDATE_FORCE_LAND = FORBIDDEN
FRESH_V07011_R2_8_PROJECTION_RETRY = AUTHORIZED
HUMAN_TERMINAL_DECISION_COORDINATES = PRESERVED
PRODUCTION MUTATION = NONE
RUNTIME MUTATION = NONE
RELEASE_SIMCORE MUTATION = NONE
```
