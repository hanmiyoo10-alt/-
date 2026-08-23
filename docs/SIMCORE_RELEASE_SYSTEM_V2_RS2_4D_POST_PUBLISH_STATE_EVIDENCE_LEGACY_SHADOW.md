# SimCore Release System v2 — RS2-4D Post-Publish State Sync / Evidence / LIVE_PENDING / Legacy Writer Shadow

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4C_PERMANENT_PROMOTION_CONTROLLER.md`
State-sync foundation: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2B_SYNC_STATE_TOOL_CONTRACT.md`
State-sync close contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2E_PROMOTION_CLOSE_GATE.md`
Phase: `RS2-4 — Permanent Release Workflow`
Subphase: `RS2-4D — Post-Publish State Sync / Evidence / LIVE_PENDING / Legacy Writer Shadow`
Authority class: release-infrastructure design / post-publication administrative-state and replacement-proof contract

---

## 1. Purpose

RS2-4C ends production publication only after the exact verified candidate `C` has become the `release-simcore` HEAD and its `latest.js` / `install.js` blobs have been reverified.

RS2-4D freezes everything that must happen **after production is already `C`** without confusing administrative state with production truth.

Core rule:

> Once `release-simcore` has moved to verified candidate `C`, `C` is production truth immediately. Main-side declaration, machine blocks, release records, and LIVE_PENDING state must catch up from that actual production identity. Failure to catch up is an administrative recovery problem, not permission to pretend production is still `P`.

RS2-4D defines:

```text
explicit state-sync handoff after publication
manifest declaration ownership transition from RS2-2 transitional path
manifest-only declaration helper boundary
reuse of sync-state without widening its authority
one bounded post-publish main payload
LIVE_PENDING machine state
per-release deployment record
main-write ownership / retry behavior
post-main verification
admin recovery / idempotent retry
legacy release-writer shadow-equivalence model
legacy state-writer shadow/cutover model
command-PR compatibility disposition
candidate-ref cleanup eligibility
first real-release evidence handoff to RS2-4E
```

RS2-4D does **not**:

```text
implement the permanent publisher
implement the state declaration helper
implement workflow_call wiring
modify release-simcore
modify product-manifest.json
modify current docs
run a release
run real long-chat validation
retire the legacy release writer
close RS2-4
start M2-3
```

---

## 2. Production truth boundary

After 4C reaches:

```text
POST_PUBLISH_VERIFIED
```

all of these are already true:

```text
release-simcore HEAD == C
blob(release-simcore:latest.js) == L
blob(release-simcore:install.js) == L
latest/install identical
CANDIDATE_REQUIRED(C,P) == identity-bound PASS
```

Therefore:

```text
actualProductionCommit = C
actualProductionBlob   = L
```

No subsequent main-side failure may change this fact by wording.

---

## 3. Administrative state is downstream

Post-publish administrative state consists of:

```text
product-manifest.json release declaration
registered CURRENT_DEVELOPMENT production snapshot machine block
registered SIMCORE_GUIDELINES production baseline machine block
per-release deployment record
bounded release evidence links/status
LIVE_PENDING declaration
```

These are synchronized **from** actual production.

They do not retroactively authorize publication.

---

## 4. RS2-2 ownership preserved

RS2-2 deliberately froze:

```text
sync-state.mjs
= read/verify declared state + render registered document machine blocks
```

and explicitly forbids:

```text
manifest says old identity
production says new identity
→ sync-state auto-rewrites manifest
```

RS2-4D does not weaken that rule.

The permanent release transaction owns the manifest declaration transition.

Then `sync-state` verifies the new declaration against actual production and renders documents.

---

## 5. Permanent manifest declaration owner

RS2-4 replaces:

```text
MANIFEST_DECLARATION_TRANSITIONAL = YES
```

with a permanent bounded release-state declaration step.

Logical helper target:

```text
products/simcore/tooling/declare-production.mjs
```

The exact filename may be implementation-adjusted, but authority is frozen.

It is a **local file-state helper**, not a GitHub publisher.

---

## 6. `declare-production` responsibility

Input is identity-bound post-publish data:

```text
releaseId
releaseMode
authorizationCommit R
releaseSpecPath Q
releaseSpecSha256 S
productionCommit C
previousProductionCommit P
productionBlob L
version
releaseName
verificationReportSha256 H
verifierCommit V
```

It updates only the manifest fields owned by production declaration/lifecycle state.

Initial conceptual fields include:

```text
production_version
release_name
release_branch
release_commit
release_blob
validation_status
current release instance ID if schema migration authorizes it
```

It does not render docs.

It does not contact GitHub.

It does not update `release-simcore`.

---

## 7. Manifest lifecycle status after publication

After a runtime-affecting successful publication, manifest validation state must represent:

```text
LIVE_PENDING
```

or the established compatible persisted token corresponding to pending real long-chat validation.

During schema transition the literal may remain:

```text
PENDING_REAL_LONG_CHAT
```

if existing manifest contracts require it.

The semantic invariant is:

> Production identity must already be the newly deployed `C`; only live validation remains pending.

Forbidden state:

```text
manifest still declares P
because C has not yet passed long-chat validation
```

That would confuse production truth with live-close confidence.

---

## 8. Manifest declaration source

The declaration helper receives version and release name only after they have been independently parsed/verified from exact production candidate `C` and matched to the immutable release spec.

It does not trust free-form workflow inputs for these values.

Required binding:

```text
C source version == spec.version == manifest new production_version
C release header == spec.releaseName == manifest new release_name
C == manifest new release_commit
L == manifest new release_blob
release_branch == release-simcore
```

---

## 9. Manifest write scope

`declare-production` may only modify a fixed registry of production-declaration/lifecycle fields.

It must preserve unrelated manifest fields byte/semantic-equivalently where possible.

It may not change:

```text
major roadmap milestone/phase/checkpoint unless separately authorized by human/admin transition
current_priority human reasoning
provider cache status
architecture contract paths
governance paths
deferred-work semantics
unrelated product fields
```

A release deployment is not permission to rewrite roadmap judgment.

---

## 10. Manifest declaration does not land alone

Normal RS2-4 post-publish flow creates one **local bounded main payload** containing the mutually consistent administrative state.

Logical sequence in an isolated main checkout/worktree:

```text
1. materialize actual deployed production C into bounded local identity record
2. run declare-production locally
3. manifest now declares C/L/version/name/LIVE_PENDING
4. run sync-state --write using that manifest + production identity C
5. create/update bounded per-release deployment record
6. validate diff/path allowlist
7. commit one local main payload
8. integrate through repo-main-write.py
9. fresh-check landed main against production C
```

This avoids landing a manifest update that intentionally leaves registered machine blocks stale for an avoidable interval.

---

## 11. Post-publish main payload allowlist

Normal automated post-publish payload may touch only:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
products/simcore/releases/records/<releaseId>.json
```

If RS2-2 implementation chooses a different canonical machine-status path, that path may be added by explicit design amendment.

Forbidden same payload:

```text
plugins/simcore/**
.github/workflows/**
products/simcore/tests/**
release spec mutation
unrelated evidence prose
Usage Dashboard files
```

---

## 12. Main integration authority

The payload is integrated using the existing shared-main coordination helper:

```text
scripts/repo-main-write.py
```

with explicit SimCore allowlist.

State writer concurrency remains product-local:

```text
simcore-main-state-sync
cancel-in-progress: false
```

No cross-product global lock is introduced.

Correctness still relies on:

```text
bounded payload
path allowlist
latest-main replay
content-conflict fail closed
ordinary push retry
post-land verification
```

not solely on concurrency.

---

## 13. Explicit state-sync workflow handoff

Normal release correctness must not rely on the publisher's `GITHUB_TOKEN` push to `release-simcore` triggering another workflow.

Permanent topology should support an explicit trusted handoff.

Preferred direction:

```text
simcore-release.yml
  publication job
      ↓ needs
  state-sync job
      uses: ./.github/workflows/simcore-release-state-sync.yml
```

or equivalent explicit same-run/reusable invocation.

The state-sync workflow receives immutable published identity rather than reinterpreting the initiating user request.

---

## 14. State-sync reusable inputs

Minimum trusted inputs:

```text
release_id
release_mode
authorization_commit R
release_spec_path Q
release_spec_sha256 S
published_commit C
previous_production_commit P
published_blob L
verifier_commit V
verification_report_sha256 H
```

The state workflow must re-fetch actual `release-simcore` and prove:

```text
HEAD == C
latest/install blobs == L
```

before preparing the main payload.

Caller inputs are cross-checks, not permission to declare an unobserved production identity.

---

## 15. State-sync reusable permissions

The post-publish state writer needs bounded `main` content write authority.

It may use:

```text
contents: write
```

because it must create/integrate a main payload.

It must not have authority to mutate:

```text
release-simcore beyond ordinary read/fetch
branch protection
repository rulesets
other product branches
```

The state writer does not republish runtime.

---

## 16. Recovery triggers retained

The permanent state-sync workflow may retain additional recovery entrypoints such as:

```text
workflow_dispatch with immutable published release identity
push to release-simcore from external/user-mediated release paths
```

But these are recovery/compatibility paths.

Normal RS2-4 release completion uses the explicit post-publish handoff.

Recovery must still resolve actual production and fail closed on identity mismatch.

---

## 17. Per-release deployment record

Permanent machine record path:

```text
products/simcore/releases/records/<releaseId>.json
```

The spec is immutable release intent.

The record is bounded release lifecycle/evidence state.

These roles must not be conflated.

---

## 18. Deployment record initial state

After publication + main synchronization, the record is created in state:

```text
LIVE_PENDING
```

Conceptual schema:

```json
{
  "schemaVersion": 1,
  "releaseId": "...",
  "releaseMode": "NEW_VERSION",
  "releaseState": "LIVE_PENDING",
  "authorizationCommit": "R",
  "releaseSpecPath": "Q",
  "releaseSpecSha256": "S",
  "previousProductionCommit": "P",
  "productionCommit": "C",
  "productionBlob": "L",
  "version": "...",
  "releaseName": "...",
  "verifierCommit": "V",
  "verificationReportSha256": "H",
  "publisherRunId": "...",
  "stateSyncStatus": "PASS",
  "stateMainCommit": "...",
  "liveGate": {
    "required": true,
    "scenarioId": "...",
    "result": "PENDING"
  },
  "openAnomalyIds": []
}
```

Exact implementation formatting may evolve without weakening identities.

---

## 19. Deployment record mutation policy

Unlike immutable release spec, a release record may transition through a strict monotonic lifecycle.

Allowed conceptual transitions:

```text
LIVE_PENDING
→ LIVE_PASS

LIVE_PENDING
→ LIVE_FAILED / BLOCKER_OPEN

LIVE_PENDING
→ SUPERSEDED_BY_CORRECTION

PUBLISHED_ADMIN_RECOVERY_REQUIRED
→ LIVE_PENDING
```

No transition may erase prior production identity.

The record must retain the original `R/Q/S/P/C/L/V/H` tuple.

If correction/rollback produces another deployment, that gets a new release ID/record.

---

## 20. Human live evidence remains separate

The machine release record stores bounded references/result codes.

Raw real long-chat diagnostic text belongs in dedicated evidence documents or the user's controlled evidence workflow, not the JSON record.

Live close updates should point to:

```text
liveEvidenceRefs
anomaly IDs
bounded scenario result
```

The record does not become a raw transcript archive.

---

## 21. LIVE_PENDING meaning

`LIVE_PENDING` means all automated release facts have passed:

```text
candidate identity frozen
permanent CI passed
production publish verified
manifest declares actual production
registered document blocks synchronized
release record durable on main
post-main state check clean
```

and only the registered real long-chat evidence gate remains.

It is stronger than merely `PUBLISHED`.

---

## 22. Required post-main clean check

After `repo-main-write.py` lands the administrative payload, run from a fresh checkout/process:

```text
materialize release-simcore C
→ build production identity record
→ sync-state --check
```

Required:

```text
source identity = IDENTITY_VERIFIED
managed blocks = CLEAN or CLEAN_WITH_OBSERVATIONS
manifest agrees with C/L/version/name
writer policy = CLEAN
exit = 0
```

This proof binds the **landed latest main**, not only the pre-integration local payload.

---

## 23. Post-main drift response

If the main payload landed but fresh check fails:

```text
production = C
releaseState = PUBLISHED_ADMIN_RECOVERY_REQUIRED
```

Classification examples:

```text
MAIN_STATE_REPLAY_DRIFT
MAIN_STATE_CONTENT_CONFLICT
MANIFEST_POST_LAND_MISMATCH
MACHINE_BLOCK_POST_LAND_DRIFT
```

Do not roll production backward automatically.

Repair main state from actual C.

---

## 24. Admin recovery invariant

Every post-publish recovery starts by observing actual production.

```text
fetch release-simcore
→ if HEAD == C and blob == L
   continue admin recovery
→ if HEAD differs
   stop and classify current production before any main write
```

The workflow must never force main's manifest to old `C` if another valid release has since superseded it.

---

## 25. Idempotent admin recovery

For same release tuple, if:

```text
release-simcore == C/L
```

then rerun may:

```text
redeclare manifest C if stale
rerun sync-state rendering
recreate/mend bounded release record
replay payload to latest main
fresh-check
```

without republishing runtime.

If main is already clean:

```text
ADMIN_STATE_ALREADY_SYNCED
```

is idempotent success.

---

## 26. Do not overwrite a newer release during recovery

If actual production is `C2 != C`:

```text
ADMIN_RECOVERY_RELEASE_SUPERSEDED
→ old C recovery cannot rewrite current production snapshot
```

Historical release record for old `C` may still be repaired only if that write does not claim it is current production.

Current manifest/docs must follow actual `C2`.

---

## 27. Existing manifest drift becomes a migration prerequisite

The currently observed v0.64.3 manifest vs v0.64.6 release branch drift is direct evidence that the future flow must be able to recover administrative state without republishing runtime.

Before RS2-4 becomes production authority, RS2-2 operational migration must repair current state using the then-current transitional declaration owner.

RS2-4D does not use the first permanent real release as an excuse to leap over existing drift.

Required promotion precondition remains:

```text
current sync-state --check = PASS
```

---

## 28. Project-source snapshot disposition

Current legacy state-sync workflow builds a project-source zip artifact.

RS2-4D classifies this as:

```text
OPTIONAL_OPERATIONAL_ARTIFACT
not production authority
not release correctness authority
```

It may remain if useful for human portability.

Its failure must not by itself cause a verified production `C` to be misreported as unpublished.

If retained, artifact generation happens after canonical state is prepared and is separately classified.

---

## 29. Release evidence durability

Raw Actions logs expire.

Durable main evidence must preserve bounded fields sufficient to reconstruct release identity and outcome:

```text
releaseId
R/Q/S
P/C/L
release mode
verifier V/H
publisher run ID
publication disposition
post-publish verification disposition
state main commit
state check result
LIVE_PENDING scenario ID
bounded anomaly IDs
```

The per-release record is the primary machine carrier.

Human evidence interpretation remains in dedicated docs.

---

## 30. Legacy release writer inventory

The current mixed legacy release path includes at least:

```text
.github/workflows/simcore-release-command.yml
```

which contains historical version-specific logic and combines:

```text
release-state resolution
version-specific patch loading
runtime mutation
inline version-specific validation
release-simcore push
memory/manifest synchronization
project-source artifact generation
```

It cannot be replayed blindly against future source.

---

## 31. Legacy shadow principle — responsibility parity, not unsafe execution

Because the legacy writer is version-bound and mutation-capable, RS2-4 shadow proof does **not** require running it against current production.

Shadow comparison is responsibility-level.

For overlapping safety responsibilities, demonstrate that permanent paths preserve or strengthen the old intent.

Examples:

| Legacy responsibility | Permanent owner |
|---|---|
| expected release state / parent | 4A/4C exact `P` |
| source/product validation | RS2-3 CANDIDATE_REQUIRED |
| latest/install identity | RS2-3 + 4C publish identity |
| release branch mutation | 4C fast-forward `P → C` |
| already-current idempotency | 4C `ALREADY_PROMOTED` / NOOP |
| manifest release declaration | 4D `declare-production` |
| document sync | RS2-2 `sync-state` |
| shared-main race handling | `repo-main-write.py` |
| project-source zip | optional 4D artifact |

The permanent system may be stricter or support new modes not present in legacy.

---

## 32. Legacy shadow fixture classes

4D requires a read-only shadow/regression model for at least these transaction classes:

```text
S1 normal NEW_VERSION from exact expected parent
S2 expected parent mismatch
S3 latest/install divergence
S4 duplicate/already promoted
S5 publisher race / parent moved
S6 same-version correction
S7 explicit rollback
S8 publish-success + state-sync-failure recovery
```

For S1–S4 where legacy intent exists, permanent disposition must be equivalent or stricter.

S5–S8 are permanent safety extensions and are validated against frozen RS2 contracts rather than pretending the old workflow had equivalent support.

---

## 33. No shadow production mutation

Legacy shadow and permanent publisher shadow must use:

```text
isolated Git repositories/worktrees
historical fixtures
temporary refs not named release-simcore
publication plan mode
```

They must not move actual `release-simcore`.

A real release is not a shadow test.

---

## 34. Legacy state-writer shadow

RS2-2 already defines legacy full document writer as rollback-only after cutover and manifest declaration as transitional until RS2-4.

4D shadow proof must separately cover:

```text
legacy manifest declaration intent
→ permanent declare-production

legacy doc rendering intent
→ sync-state managed blocks

legacy main push intent
→ repo-main-write bounded payload
```

Do not treat the old monolithic `simcore-sync-memory.py` as one indivisible replacement target.

---

## 35. Manifest cutover target state

After 4D operational promotion:

```text
manifest declaration owner     PERMANENT_RS2_4
sync-state doc owner           RS2_2
legacy manifest-only owner     ROLLBACK_ONLY
legacy full doc owner          ROLLBACK_ONLY
```

No normal release invokes legacy state mutation.

Physical deletion waits for 4E retirement proof.

---

## 36. Legacy release writer target state before deletion

Before 4E physical retirement, expected state:

```text
validationAuthority = PERMANENT_CI
publicationAuthority = PERMANENT_RS2_4
stateAuthority = PERMANENT_RS2_4 + RS2_2
normalInvocation = FORBIDDEN
rollbackReference = RECORDED
fileRetired = NO / PENDING_4E
```

This separates loss of authority from file deletion.

---

## 37. Command-PR compatibility disposition

The permanent target does **not** require a title-magic command PR.

Normal authorization already uses a real main PR adding one immutable release spec.

Therefore schema-v1 target is:

```text
commandPrCompatibilityRequired = NO
```

Do not create a new command-only wrapper merely to preserve the old interaction shape.

If future platform evidence proves release-spec PR flow cannot trigger the controller, a compatibility wrapper may be designed separately but it must resolve the same immutable `R/Q/S/C/P/L/M` tuple.

PR title can never regain release authority.

---

## 38. Existing legacy command PR during transition

Until 4E completes real-release proof and retirement, the old workflow may remain present for emergency fallback.

Its normal invocation is deprecated/forbidden once permanent release authority enters shadow-ready state.

Emergency fallback requires explicit evidence that the old workflow is safe for the target version; a hard-coded v0.63.54 writer is not automatically a valid fallback for a newer runtime.

The safer fallback may be manual bounded Git promotion following the frozen identity rules rather than replaying obsolete patch code.

---

## 39. Candidate-ref cleanup eligibility

After all are true:

```text
release-simcore HEAD == C
post-publish identity verified
main release record durable
state-sync landed clean
C reachable from permanent production history
```

candidate transport ref becomes:

```text
CLEANUP_ELIGIBLE
```

Ref deletion is housekeeping only.

It does not delete commit `C` from production history.

Automatic cleanup is not required for 4D close.

---

## 40. Aborted/unpublished candidate refs

A release spec that fails before publication may leave a candidate ref.

The durable spec/CI result should mark release instance:

```text
ABORTED_PRE_PUBLISH
```

Candidate ref cleanup may happen later after evidence is durable.

No cleanup action may accidentally delete a currently referenced production branch/ref.

---

## 41. Same-version correction post-publish record

For `SAME_VERSION_CORRECTION`, new release record uses a new `releaseId` even though:

```text
version and releaseName may equal prior deployment
```

Prior deployment record transitions to:

```text
SUPERSEDED_BY_CORRECTION
```

with pointer to new release ID.

Current manifest still reports product version/name and current production commit/blob.

This prevents same-version deployments from becoming indistinguishable administratively.

---

## 42. Rollback post-publish record

For `ROLLBACK`, manifest records actual restored source version/name/commit/blob.

New rollback release record retains:

```text
failed/superseded production P
rollback source historical commit/blob
new rollback candidate/production C
reason/evidence IDs
```

The record makes clear that production history moved forward even if product version moved backward.

---

## 43. Post-publish anomaly routing

Any anomaly discovered after publication must immediately be preserved and classified:

```text
WATCH
DEFER
FIX
BLOCKER
```

Examples:

```text
state-sync report wording only             WATCH/DEFER
bounded project-source artifact failure    FIX/DEFER depending need
manifest identity mismatch                 BLOCKER
post-main managed block drift              BLOCKER
release record write conflict              FIX/BLOCKER until recovered
real long-chat semantic regression         FIX/BLOCKER according evidence
```

Continue only according to the frozen SimCore evidence workflow.

---

## 44. LIVE_PENDING handoff package

When automated release reaches LIVE_PENDING, user/human validation receives a bounded package:

```text
releaseId
version
releaseName
releaseMode
productionCommit C
productionBlob L
live scenario ID
specific expected assertions/diagnostic markers
known WATCH/DEFER observations
release evidence record path
```

No need to copy raw CI logs into the chat.

---

## 45. Real long-chat authority

Only actual supported SimCore host usage may satisfy the registered live gate for a runtime release.

CI simulation, unit fixture, or publisher shadow cannot be relabeled as live validation.

After user evidence:

```text
PASS
or WATCH / DEFER / FIX / BLOCKER classification
```

must be recorded before final phase/roadmap synchronization.

---

## 46. Final live close is outside automated publisher

4D automated pipeline stops at LIVE_PENDING.

After live PASS, a separate bounded main-state close operation may update:

```text
release record live result
relevant dedicated evidence doc
CURRENT_DEVELOPMENT human next action
SIMCORE_GUIDELINES durable lesson if warranted
DEFERRED/WATCH ledgers as appropriate
```

This preserves the user-required ordering:

```text
repo design/evidence
→ implementation
→ static/CI
→ release-simcore deploy
→ real long-chat
→ main docs/long-memory final sync
```

---

## 47. Main payload separation at live close

The post-publish automated payload and later human live-close payload are distinct operations.

Post-publish automated payload:

```text
production identity + LIVE_PENDING machine state
```

Live-close payload:

```text
human evidence interpretation + next roadmap state
```

Do not invent LIVE_PASS in the initial automated payload to avoid a second main update.

---

## 48. 4D shadow-ready status

4D implementation may be called:

```text
POST_PUBLISH_PATH_SHADOW_READY
```

when:

```text
declare-production implemented/tested
explicit state-sync call implemented
one bounded payload generation implemented
repo-main-write integration tested
post-main check implemented
release record implemented
admin recovery tested
legacy responsibility map complete
legacy shadow fixtures S1-S8 pass
no runtime/release-simcore mutation in shadow tests
```

This is not yet permanent production authority.

4E owns promotion.

---

## 49. 4D failure vocabulary

Reserved classes:

```text
PUBLISHED_IDENTITY_NOT_OBSERVED
MANIFEST_DECLARATION_INPUT_MISMATCH
MANIFEST_WRITE_SCOPE_DENIED
MANIFEST_POST_WRITE_MISMATCH
STATE_SYNC_IDENTITY_MISMATCH
STATE_SYNC_RENDER_FAILED
STATE_SYNC_MAIN_PAYLOAD_PATH_DENIED
STATE_SYNC_MAIN_CONTENT_CONFLICT
STATE_SYNC_MAIN_RETRY_EXHAUSTED
MAIN_STATE_REPLAY_DRIFT
MANIFEST_POST_LAND_MISMATCH
MACHINE_BLOCK_POST_LAND_DRIFT
RELEASE_RECORD_INVALID
RELEASE_RECORD_IDENTITY_MISMATCH
RELEASE_RECORD_WRITE_CONFLICT
ADMIN_RECOVERY_RELEASE_SUPERSEDED
LEGACY_RELEASE_RESPONSIBILITY_GAP
LEGACY_STATE_RESPONSIBILITY_GAP
```

Post-publish failures report production `C` explicitly.

---

## 50. 4D close criteria

Design closes when these are frozen:

```text
production truth after publish
manifest declaration permanent owner
sync-state authority preserved
manifest → docs sequence
single bounded main payload
explicit workflow handoff
state-sync immutable inputs
main-write allowlist/concurrency
per-release record and LIVE_PENDING semantics
post-main clean proof
admin recovery/idempotency
newer-release protection
legacy release responsibility shadow
legacy state-writer shadow/cutover
command-PR compatibility = not required
candidate cleanup eligibility
live validation package and boundary
shadow-ready criteria
```

---

## 51. Handoff to RS2-4E

RS2-4E must now define final operational promotion and retirement.

It must answer:

```text
what exact prerequisites permit permanent release authority activation
how many qualifying shadow runs are required
how rollback is rehearsed without production mutation
what qualifies as the first real permanent-controller release
whether that first release must complete LIVE_PASS before legacy retirement
how old release/state writers are disabled/retired
what is preserved for rollback provenance
what machine status closes RS2-4
how release procedure changes for all future SimCore releases
what happens if first real release exposes a blocker
when RS2-5 may begin
```

---

## 52. Frozen summary

RS2-4D freezes the post-publication chain:

```text
production already C/L
        ↓
permanent manifest declaration to C/L + LIVE_PENDING
        ↓
RS2-2 sync-state verifies declaration and renders registered docs
        ↓
per-release LIVE_PENDING record
        ↓
one bounded SimCore main payload via repo-main-write
        ↓
fresh landed-main state check
        ↓
LIVE_PENDING handoff to real long-chat
```

and the replacement rule:

```text
legacy monolithic release/state writer
→ responsibility-level shadow proof
→ authority removed before file deletion
→ physical retirement only in 4E after real proof + rollback rehearsal
```
