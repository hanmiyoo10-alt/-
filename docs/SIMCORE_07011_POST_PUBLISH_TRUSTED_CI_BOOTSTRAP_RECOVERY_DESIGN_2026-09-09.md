# SimCore v0.70.11 Post-Publish Trusted-CI Bootstrap Recovery Design

Date: 2026-09-09 (Asia/Seoul)
Status: **FROZEN · IMPLEMENTATION AUTHORIZED · NONRUNTIME · TRANSITIONAL ADMIN IDENTITY ONLY**
Tracking: #1961
Parent release transaction: #1957
Sibling infrastructure blocker: #1959
Failed exact LIVE_PENDING PR: #1960

## 1. Problem boundary

SimCore v0.70.11 production publication already succeeded and remains authoritative:

```text
releaseId             = simcore-v0.70.11-new-03
production C           = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob        = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
previous production P  = ecc55f026315c6482c34d267aba2adb97527cdbc
publisher run          = 34318469138
latest.js == install.js = YES
```

Production must be kept. Rollback, republish, candidate rebuild, and runtime mutation are forbidden.

The original Permanent Release generated the exact LIVE_PENDING admin payload commit:

```text
0d3b9efbca0c0dee7fa0f8767a0c31aac7ca5e02
```

but the post-publish caller could not consume the protected-main checked-PR handoff. That distinct defect is #1959.

Normal checked recovery PR #1960 then failed before payload qualification because its release record/state receipt paths are classified `CI_SELF,HARNESS`. The trusted lane executes the predecessor verifier from pre-state main against already-advanced v0.70.11 production and returns `INFRA_ERROR / REPORT_MISSING`.

Therefore:

```text
#1960 payload semantic rejection = NOT OBSERVED
#1960 exact payload = KEEP
#1960 red bypass = FORBIDDEN
trusted-CI bootstrap = REQUIRED
```

## 2. Historical authority

This is the same post-publish trust bootstrap class preserved for v0.66.0 and v0.69.0.

Canonical precedent:

```text
production already advanced
→ main administrative production identity still predecessor
→ CI-self trusted predecessor verifier cannot establish coherent current truth
→ synchronize transitional production/admin identity only
→ rebuild/retry recovery from synchronized main
→ require ordinary trusted predecessor + proposed verifier + Required PASS
→ converge canonical LIVE_PENDING authority
```

Relevant durable authorities:

- `docs/SIMCORE_RELEASE_STATE_MARKER_TRANSITION_FIX_2026-08-29.md`
- `docs/SIMCORE_06900_POST_PUBLISH_TRUSTED_CI_BOOTSTRAP_CYCLE_2026-08-30.md`
- `docs/SIMCORE_06900_POST_PUBLISH_BOUNDED_CYCLE_BREAK_DESIGN_2026-08-30.md`
- `docs/SIMCORE_06900_POST_PUBLISH_RECOVERY_CLOSURE_2026-08-30.md`

v0.70.11 does not currently show the additional v0.69 historical-fixture contradiction. Do not import that fourth-file fixture repair unless actual bootstrap CI evidence proves it necessary.

## 3. Current owner and protected-main adaptation

The installed `SimCore release state sync` owner already defines transitional synchronization as:

```text
python3 scripts/simcore-sync-memory.py --manifest-only
node products/simcore/tooling/sync-state.mjs --write ...
```

and stages exactly:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

It intentionally does not create:

```text
release record
state receipt
new LIVE_PENDING authority
HUMAN_EVIDENCE
runtime bytes
```

Under current native main protection, the workflow's final `repo-main-write.py` call correctly emits a checked-PR handoff, but its caller does not yet consume that handoff. Re-running the command adapter would therefore reproduce #1959 rather than complete the bootstrap.

The bounded v0.70.11 adaptation is:

```text
fresh branch from current main
→ independently reobserve exact production C/blob/latest==install
→ run the same installed state-sync owner commands locally
→ do not hand-edit lifecycle truth
→ require diff exactly the three registered admin surfaces
→ open normal protected-main PR
→ require SimCore Verify + Required PASS
→ exact-head merge
→ reobserve main production/admin identity == v0.70.11 C/blob
→ require release record/state receipt for v0.70.11 still absent from bootstrap mutation
```

This does not create a new main writer. GitHub's normal protected-main PR merge remains the integration mechanism.

## 4. Transitional state semantics

Bootstrap may update only production/admin identity. It must preserve the predecessor release-state authority until exact post-publish recovery lands.

Expected intermediate state:

```text
product-manifest production_version = 0.70.11
product-manifest release_commit     = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
product-manifest release_blob       = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
CURRENT_DEVELOPMENT production snapshot = v0.70.11 C/blob
SIMCORE_GUIDELINES production snapshot  = v0.70.11 C/blob
release-state authority = predecessor state until recovery
v0.70.11 release record = not created by bootstrap
v0.70.11 state receipt  = not created by bootstrap
```

No LIVE_PASS or LIVE_PENDING release authority may be invented by the bootstrap.

## 5. Qualification

Before bootstrap merge:

```text
production reobservation exact = PASS
latest.js == install.js         = PASS
owner-derived diff              = exactly 3 files
unexpected path                 = NONE
manual lifecycle editing        = NONE
PR Verify                       = SUCCESS
PR Required                     = SUCCESS
```

If the three-file PR still exposes a new deterministic trusted-CI contradiction, stop and record it. Do not add extra files opportunistically.

## 6. Exact LIVE_PENDING recovery after bootstrap

The existing #1960 head is based on pre-bootstrap main and must not be reused as merge authority after main moves.

After bootstrap:

1. preserve #1960 as failed evidence and close/supersede without merge;
2. use the original Permanent Release-generated state envelope/commit as source authority, not manual reconstruction;
3. invoke the canonical post-publish state recovery path or reproduce its exact owner-generated five-path payload from synchronized main;
4. require `productionMutation = ALREADY_PUBLISHED_UPSTREAM` semantics where the canonical recovery path applies;
5. require a fresh normal PR with trusted predecessor PASS, proposed verifier PASS, and Required PASS;
6. merge only exact qualified head;
7. independently reobserve durable main record, state receipt, manifest, docs, and unchanged `release-simcore`;
8. only then declare v0.70.11 `LIVE_PENDING / PENDING_REAL_LONG_CHAT`.

#1959 remains a permanent infrastructure defect until the post-publish caller learns to consume `MAIN_WRITE_CHECKED_PR_REQUIRED`; urgent v0.70.11 state convergence does not silently close that defect.

## 7. Forbidden scope

```text
release-simcore mutation                 FORBIDDEN
runtime byte mutation                    FORBIDDEN
candidate / approval mutation            FORBIDDEN
publisher rerun / republish              FORBIDDEN
production rollback                      FORBIDDEN
force push / branch-protection bypass    FORBIDDEN
red CI merge                              FORBIDDEN
manual release record fabrication        FORBIDDEN
manual state receipt fabrication         FORBIDDEN
HUMAN_EVIDENCE synthesis                 FORBIDDEN
LIVE_PASS inference                      FORBIDDEN
mixing #1959 permanent repair into bootstrap FORBIDDEN
```

## 8. Verdict

```text
V07011_POST_PUBLISH_TRUSTED_CI_BOOTSTRAP = AUTHORIZED
TRANSACTION_CLASS = CONTROL_PLANE RECOVERY / NONRUNTIME
OWNER = existing SimCore state-sync tooling
BOOTSTRAP_PAYLOAD = 3 ADMIN FILES EXACT
PRODUCTION = KEEP v0.70.11
RELEASE_SIMCORE_MUTATION = NONE
LIVE_PENDING = NOT YET DURABLE
HUMAN_EVIDENCE = PENDING
```
