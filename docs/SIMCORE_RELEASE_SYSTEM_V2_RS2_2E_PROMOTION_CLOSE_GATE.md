# SimCore Release System v2 — RS2-2E Promotion / Close Gate & RS2-3 Handoff

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2D_DRIFT_CONTRADICTION_CHECK_MODE.md`
Target mapping: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2C_TARGET_MAPPING_WRITE_SAFETY_MIGRATION.md`
Tool contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2B_SYNC_STATE_TOOL_CONTRACT.md`
Authority foundation: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2A_STATE_AUTHORITY_MACHINE_BLOCK_CONTRACT.md`
Prior durable-test close contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1E_PROMOTION_CLOSE_GATE.md`
Phase: `RS2-2 — State Synchronization`
Subphase: `RS2-2E — Promotion / Close Gate & RS2-3 Handoff`
Authority class: release-infrastructure design / operational-promotion and phase-close contract

---

## 1. Purpose

RS2-2E is the final design subphase of RS2-2 State Synchronization.

RS2-2A through RS2-2D froze:

```text
what state is authoritative
which bytes may be machine-owned
how sync-state verifies local production identity
which exact document blocks may be rendered
how marker ownership migrates
how writer ownership remains single
what drift/contradiction classes exist
how check mode reports and exits
```

RS2-2E freezes the final operational question:

> When has the new state-synchronization path earned enough authority to be called operational, close RS2-2, and hand a stable check contract to RS2-3 Permanent CI?

This document defines:

- operational promotion claims;
- exact promotion prerequisites;
- the distinction between phase completion and full release-system replacement;
- minimum post-cutover clean checks;
- treatment of nonblocking human observations;
- transitional manifest-declaration ownership;
- legacy full-writer rollback-only status;
- rollback triggers and sequencing;
- bounded machine-readable close status;
- evidence required to close RS2-2;
- exact RS2-3 handoff contract.

This document does **not** implement the sync tool, migrate markers, modify the current manifest, modify SimCore runtime code, modify `release-simcore`, install permanent CI, create the permanent release workflow, or delete the legacy state-sync path.

---

## 2. Core principle — phase completion is not full replacement

RS2-2 follows the same separation principle established by RS2-1E.

```text
RS2-2 PHASE COMPLETE
!=
ENTIRE RELEASE SYSTEM REPLACED
```

State synchronization may become operational before RS2-4 owns the permanent release transaction.

The intended first stable end state is:

```text
RS2-2 phase                         COMPLETE
state-sync tool                    OPERATIONAL
document machine-block owner       sync-state
legacy full document writer        ROLLBACK_ONLY
manifest declaration owner         TRANSITIONAL
main branch integration            repo-main-write.py
permanent CI                       NOT YET OWNED BY RS2-2
permanent release transaction      NOT YET OWNED BY RS2-2
```

That is a successful RS2-2 outcome.

RS2-2 must not remain artificially open merely because RS2-4 has not yet replaced the manifest/release transaction.

---

## 3. Operational promotion claims

RS2-2E freezes five positive operational claims.

```text
STATE_SYNC_AVAILABLE
DOCUMENT_SYNC_CUTOVER_COMPLETE
LEGACY_FULL_ROLLBACK_ONLY
RS2_2_CLOSED
RS2_3_ENTRY_AUTHORIZED
```

A separate retained transitional condition is:

```text
MANIFEST_DECLARATION_TRANSITIONAL
```

This condition is expected after RS2-2 closes and does not indicate failure.

### 3.1 Claims are independent facts

The claims are not aliases.

Example:

```text
STATE_SYNC_AVAILABLE = YES
DOCUMENT_SYNC_CUTOVER_COMPLETE = NO
RS2_2_CLOSED = NO
```

is valid during shadow verification.

Likewise:

```text
RS2_2_CLOSED = YES
MANIFEST_DECLARATION_TRANSITIONAL = YES
```

is the expected initial closed state.

---

## 4. Negative / transitional status vocabulary

Before promotion, the implementation may use bounded state values:

```text
NOT_IMPLEMENTED
IMPLEMENTED_UNVERIFIED
SHADOW_VERIFIED
CUTOVER_PENDING
CUTOVER_ACTIVE
OPERATIONAL
ROLLBACK_ACTIVE
BLOCKED
```

These are infrastructure lifecycle states, not product validation states.

They must not be confused with:

```text
STATIC_PASS
DEPLOYED
LIVE_PENDING
LIVE_PASS
```

which describe product/release validation state.

---

## 5. Required prior-phase implementation authority

Design work may proceed independently, but RS2-2 implementation may not be declared operational unless the RS2-1 implementation close contract has been satisfied.

Minimum prerequisite:

```text
RS2_1_CLOSED                    = YES
DURABLE_TESTS_AVAILABLE         = YES
PARTIAL_REPLACEMENT_AUTHORIZED  = YES
```

`FULL_REPLACEMENT_AUTHORIZED` from RS2-1 is **not** required.

Reason:

RS2-1 already established that permanent durable tests can be operational while some runtime surfaces remain intentionally transitional.

RS2-2 must not wait for unrelated M2-3 or B_END architecture extraction merely to synchronize repository state safely.

---

## 6. `STATE_SYNC_AVAILABLE` definition

`STATE_SYNC_AVAILABLE` means:

> The new local state synchronization implementation is sufficiently implemented and verified to render/check the registered state targets safely, even if production document ownership has not yet been cut over to it.

It does not mean the legacy writer is disabled.

### 6.1 Required gate

All must pass:

```text
sync-state executable exists                         PASS
CLI contract from RS2-2B implemented                 PASS
production identity record validation                PASS
local latest/install verification                    PASS
manifest read-only guarantee                         PASS
target registry schema valid                         PASS
renderer registry valid                              PASS
CURRENT_DEVELOPMENT renderer-v1 tests                PASS
GUIDELINES renderer-v1 tests                         PASS
marker parser tests                                  PASS
unmanaged-byte preservation tests                    PASS
check mode tests                                     PASS
render-preview tests                                 PASS
write-mode local atomicity tests                     PASS
concurrent local-change guard tests                  PASS
bounded report tests                                 PASS
exit-code tests                                      PASS
human-current-claim probe tests                      PASS
historical/code-fence exclusion tests                PASS
writer-policy checker tests                          PASS
same-version correction drift fixture                PASS
current historical identity-drift shape fixture      PASS
network/GitHub capability                            NONE
manifest write capability                            NONE
release-simcore write capability                     NONE
main push capability                                 NONE
runtime diff                                          NONE
```

### 6.2 Required shadow result

Before production document ownership cutover, the tool must run against an isolated candidate state and produce:

```text
source identity          IDENTITY_VERIFIED
registry                 VALID
candidate markers        VALID
candidate managed blocks CLEAN
writer policy            SHADOW_COMPATIBLE
unmanaged bytes          PRESERVED
exit                     0
```

This establishes:

```text
STATE_SYNC_AVAILABLE = YES
```

but does not yet authorize:

```text
DOCUMENT_SYNC_CUTOVER_COMPLETE = YES
```

---

## 7. Current identity drift is a hard cutover prerequisite

The current repository has direct historical evidence of manifest/production divergence.

RS2-2 implementation must preserve this rule:

```text
SOURCE_IDENTITY_DRIFT
→ no document ownership cutover
```

The drift must be resolved **before** the migration/cutover using the then-current authoritative declaration path.

The new sync-state tool must not repair the manifest as a side effect.

Required pre-cutover source result:

```text
IDENTITY_VERIFIED
```

Only then may the canonical marker migration and document-writer cutover proceed.

---

## 8. `DOCUMENT_SYNC_CUTOVER_COMPLETE` definition

This claim means:

> The two initial registered document spans have moved from legacy document synchronization to canonical sync-state ownership, and there is exactly one active document writer.

Initial targets remain exactly:

```text
docs/CURRENT_DEVELOPMENT.md
  SIMCORE_SYNC:PRODUCTION_SNAPSHOT

docs/SIMCORE_GUIDELINES.md
  SIMCORE_SYNC:PRODUCTION_BASELINE
```

### 8.1 Cutover gate

All must pass:

```text
source identity verified                           PASS
CURRENT_DEVELOPMENT canonical marker pair          exactly 1
CURRENT_DEVELOPMENT legacy marker pair             exactly 0
GUIDELINES canonical marker pair                   exactly 1
GUIDELINES unmarked legacy baseline ownership      retired as writer surface
sync-state registered owner                        ACTIVE
legacy document writer automatic path              DISABLED
legacy manifest-only path                          ACTIVE/AVAILABLE
DUAL_WRITE configuration                           NONE
writer policy check                                CLEAN
managed block check                                CLEAN
unmanaged-byte migration proof                     PASS
repo-main-write changed-path allowlist              PASS
post-main replay state check                       PASS
```

### 8.2 No dual-write grace period

There is no valid state such as:

```text
legacy full writes docs
AND
sync-state writes docs
```

not even for one release.

Cutover must be a single bounded repository transition.

---

## 9. Minimum post-cutover clean checks

RS2-2E requires **two distinct post-cutover clean checks**.

They prove different properties.

### 9.1 CLEAN-1 — canonical-main check

Immediately after the cutover payload has landed on then-current `main` through the repository main-write coordination path:

```text
fresh checkout of resulting main
+ fresh materialization of production identity
+ sync-state --check
→ exit 0
```

Allowed result:

```text
CHECK_CLEAN
```

or:

```text
CHECK_CLEAN_WITH_OBSERVATIONS
```

provided there is no BLOCKER or DRIFT.

This proves the payload that actually landed on main is valid.

A pre-replay local PASS does not substitute for CLEAN-1.

### 9.2 CLEAN-2 — independent idempotent recheck

A second independent invocation must run from a fresh filesystem/process context against the same canonical main and same verified production identity.

Expected:

```text
sync-state --check
→ exit 0
→ managed blocks unchanged
→ no write required
```

This proves:

```text
canonical state is stable
renderer output is deterministic
no hidden one-run migration dependency exists
second run is a no-op
```

CLEAN-2 may occur immediately after CLEAN-1 in a distinct clean checkout/job.

It does not require waiting for a future product release.

### 9.3 Future real release not required for RS2-2 close

RS2-2 close does not require a later SimCore runtime release solely to exercise synchronization.

That would couple release-infrastructure completion to unrelated product work.

The first subsequent real release becomes an additional operational confirmation, not a design-mandated close prerequisite.

---

## 10. Human observations do not block RS2-2 close by default

RS2-2D defined bounded human current-state probes as observations rather than automatic repair authority.

Therefore:

```text
CHECK_CLEAN_WITH_OBSERVATIONS
```

may satisfy CLEAN-1 and CLEAN-2.

### 10.1 Allowed outstanding observation

Example:

```text
HUMAN_CURRENT_PRODUCTION_CLAIM_STALE
severity OBSERVATION
```

may remain open if:

```text
source identity                VERIFIED
machine blocks                 CLEAN
writer ownership               CLEAN
marker structure               CLEAN
observation is human-owned     YES
automatic repair authority     NONE
```

### 10.2 Observation retention requirement

An outstanding observation must be recorded with bounded metadata:

```text
observation id
registered probe id
target document
reason code
expected authority class
human owner
status OPEN / RESOLVED / DEFERRED
```

No full paragraph body is required in machine status.

### 10.3 What cannot be downgraded to observation

These remain blocking:

```text
source identity drift
invalid canonical markers
legacy marker resurrection
mixed legacy/canonical marker authority
dual writer configuration
managed block stale during required close check
registry ambiguity
renderer non-determinism
unmanaged-byte mutation
unsafe path/write scope
```

Human observations do not create a loophole for machine-owned drift.

---

## 11. `LEGACY_FULL_ROLLBACK_ONLY` definition

After successful cutover, the old full document-sync mode loses ordinary operational authority.

The expected state is:

```text
legacy --manifest-only   TRANSITIONAL_ACTIVE
legacy --legacy-full     ROLLBACK_ONLY
implicit legacy full     FORBIDDEN
```

### 11.1 Conditions

`LEGACY_FULL_ROLLBACK_ONLY = YES` requires:

```text
DOCUMENT_SYNC_CUTOVER_COMPLETE = YES
automatic workflow no longer invokes legacy full doc writes
unqualified legacy invocation fails closed
explicit --legacy-full remains available only to rollback procedure
rollback marker reversal procedure is documented/tested
no active run can invoke both writers
```

### 11.2 Rollback-only is not retirement

This state does **not** authorize deletion of:

```text
scripts/simcore-sync-memory.py
legacy marker rollback support
legacy full document renderer behavior needed for fallback
```

Deletion/retirement requires later proof.

RS2-4 is the earliest phase that may decide whether the transitional manifest owner and legacy full fallback can be removed or replaced.

---

## 12. Manifest declaration ownership after RS2-2

RS2-2 intentionally does not own the release declaration transaction.

Expected closed-state authority:

```text
release-simcore
  actual production code authority

transitional legacy declaration path
  product-manifest release identity declaration

sync-state
  verification + registered document block rendering/checking

repo-main-write.py
  bounded latest-main integration
```

This is recorded as:

```text
MANIFEST_DECLARATION_TRANSITIONAL = YES
```

### 12.1 Required manifest-only behavior

Until RS2-4 replaces it, the transitional declaration step may change only the explicitly authorized manifest release/declaration fields.

It must not regain document ownership.

### 12.2 RS2-4 responsibility

RS2-4 later decides the permanent transaction for:

```text
validated candidate
→ release-simcore promotion
→ manifest declaration update
→ identity verification
→ document synchronization
→ final release-state confirmation
```

RS2-2 does not pre-empt that design.

---

## 13. `RS2_2_CLOSED` definition

RS2-2 is complete when the new document-state synchronization path is operational and its remaining transitional boundaries are explicit.

Required:

```text
RS2_1_CLOSED                         YES
STATE_SYNC_AVAILABLE                 YES
DOCUMENT_SYNC_CUTOVER_COMPLETE       YES
LEGACY_FULL_ROLLBACK_ONLY            YES
MANIFEST_DECLARATION_TRANSITIONAL    YES
CLEAN-1 canonical-main check         PASS
CLEAN-2 independent recheck          PASS
blocking contradiction count         0
drift count                           0
open human observations               allowed / bounded
close evidence record                 PRESENT
runtime diff                           NONE
release-simcore diff                   NONE
```

Then:

```text
RS2_2_CLOSED = YES
```

### 13.1 Human observation count may be nonzero

A nonzero observation count does not change phase status if all findings are explicitly nonblocking human-owned observations.

### 13.2 Transitional manifest ownership may remain

`MANIFEST_DECLARATION_TRANSITIONAL = YES` is expected and does not block close.

### 13.3 Legacy full rollback capability may remain

Rollback capability is a safety feature, not evidence that the new path lacks authority.

---

## 14. `RS2_3_ENTRY_AUTHORIZED` definition

RS2-3 Permanent CI may begin implementation/design handoff when:

```text
RS2_2_CLOSED                         YES
STATE_SYNC_AVAILABLE                 YES
check mode result/exit contract      FROZEN + IMPLEMENTED
bounded report schema                FROZEN + IMPLEMENTED
source materialization boundary      FROZEN + IMPLEMENTED
writer policy checker                AVAILABLE
registered current-claim probes      AVAILABLE
CLEAN-1 / CLEAN-2                    PASS
fallback                             DOCUMENTED
```

Then:

```text
RS2_3_ENTRY_AUTHORIZED = YES
```

Permanent CI itself is still owned by RS2-3.

---

## 15. Exact RS2-3 handoff package

RS2-2 must hand RS2-3 a bounded set of stable interfaces.

### 15.1 Executable

```text
products/simcore/tooling/sync-state.mjs
```

Required read-only CI entrypoint:

```text
node products/simcore/tooling/sync-state.mjs --check ...
```

### 15.2 Schemas/config

At minimum:

```text
production-identity schema
state target registry schema
state check report schema
writer-policy configuration / checker input schema
current-claim probe registry
```

### 15.3 Exit semantics

Frozen:

```text
0  CLEAN or CLEAN_WITH_OBSERVATIONS
1  DRIFT
2  BLOCKED / invalid authority or safety input
```

RS2-3 must not reinterpret these codes inconsistently across workflows.

### 15.4 Severity semantics

Frozen:

```text
BLOCKER
DRIFT
OBSERVATION
CLEAN
```

### 15.5 Deterministic result ordering

CI may format presentation around the bounded report but must not reorder severity/authority meaning or infer repairs.

---

## 16. Recommended RS2-3 check profiles

RS2-2E defines semantic profiles for handoff but does not create workflows.

### 16.1 `PR_STATE_CHECK`

Use on ordinary relevant pull requests.

Required:

```text
source identity verification
registered target marker validity
writer-policy consistency
managed block freshness
bounded human-current observations
```

Policy:

```text
BLOCKER -> fail
DRIFT   -> fail
OBSERVATION -> report, do not fail by default
CLEAN -> pass
```

### 16.2 `RELEASE_STATE_CHECK`

Use after a release-state synchronization candidate is produced and again after it lands on main.

Policy:

```text
BLOCKER -> fail
DRIFT   -> fail
OBSERVATION -> report
CLEAN/CLEAN_WITH_OBSERVATIONS -> pass
```

### 16.3 `MAIN_HEALTH_CHECK`

RS2-3 may later decide whether to run a scheduled/manual health check.

If used, it must consume the same checker contract rather than duplicate state logic in YAML.

---

## 17. No CI-side repair

RS2-3 receives a checker, not a fixer.

Permanent CI must not turn:

```text
CHECK_DRIFT
```

into:

```text
automatically rewrite main
```

The intended distinction remains:

```text
CI
  observes / blocks

sync-state --write
  local bounded renderer

outer state-sync workflow
  decides when a write is authorized

repo-main-write.py
  lands the bounded payload
```

---

## 18. Rollback trigger classes

RS2-2E freezes three response classes.

```text
FIX_IN_PLACE
CUTOVER_ROLLBACK
REPORT_ONLY
```

### 18.1 `FIX_IN_PLACE`

Use when the new path remains safely bounded but an implementation defect can be corrected without restoring legacy document ownership.

Examples:

```text
report formatting bug
non-authoritative observation grammar bug
self-test harness issue
bounded renderer defect caught before write
registry metadata typo caught by validation
```

During fix:

```text
production runtime unaffected
release-simcore unaffected
current canonical document owner may remain sync-state
writes may be temporarily disabled
```

### 18.2 `CUTOVER_ROLLBACK`

Use only when the new active document ownership cannot safely fulfill its contract and an operational state update cannot wait for a bounded in-place repair.

Examples:

```text
canonical marker parser corrupts managed boundaries
unmanaged-byte preservation failure after activation
repeated partial local write failure with uncertain target state
writer exclusivity cannot be guaranteed
repo integration repeatedly lands invalid managed spans
critical sync-state defect prevents safe document synchronization
```

### 18.3 `REPORT_ONLY`

Examples:

```text
human current-state observation
historical prose mismatch outside registered current claim
nonblocking diagnostic notice
```

These never trigger rollback by themselves.

---

## 19. Conditions that do not justify legacy rollback

Do not restore legacy full document ownership merely because:

```text
human prose contains a stale current claim
one ordinary PR reports an observation
manifest declaration is still transitional by design
RS2-4 is not implemented
one renderer fixture had a pre-cutover harness failure
an unrelated runtime release is urgent
```

Fallback must remain exceptional.

Otherwise the system would oscillate between owners and recreate the original race problem.

---

## 20. Rollback sequence

Rollback must preserve the one-writer invariant.

Required sequence:

```text
1. stop/disable new document write trigger
2. verify no sync-state document write run remains active
3. freeze main integration payload creation for this state-sync transaction
4. execute explicit canonical->legacy marker rollback migration
5. verify legacy expected document anchors
6. enable explicit legacy --legacy-full authority
7. run legacy full sync in isolated bounded transaction
8. land via repo-main-write.py
9. re-read resulting main
10. verify exactly one legacy writer is active
11. record rollback evidence
```

Forbidden sequence:

```text
enable legacy full first
→ leave sync-state writes enabled
→ hope concurrency prevents overlap
```

That is `DUAL_WRITE` and remains a BLOCKER.

---

## 21. Re-promotion after rollback

Rollback does not permanently invalidate RS2-2 design.

To re-promote:

```text
repair root cause
→ rerun STATE_SYNC_AVAILABLE gate
→ shadow verify
→ resolve source identity
→ repeat canonical marker cutover
→ CLEAN-1
→ CLEAN-2
→ restore LEGACY_FULL_ROLLBACK_ONLY
→ update close evidence
```

No shortcut may reuse stale pre-rollback clean evidence.

---

## 22. Legacy retirement eligibility

RS2-2E deliberately distinguishes:

```text
ROLLBACK_ONLY
```

from:

```text
RETIREMENT_ELIGIBLE
```

At RS2-2 close:

```text
legacy full document writer = ROLLBACK_ONLY
legacy manifest-only owner   = TRANSITIONAL_ACTIVE
legacy script deletion       = NOT AUTHORIZED
```

### 22.1 Earliest retirement review

The earliest broad retirement review belongs to RS2-4 after the permanent release transaction has equivalent replacement/fallback evidence.

RS2-4 must answer:

```text
who now updates manifest?
what is the rollback path if permanent release transaction fails?
is legacy full document rendering still needed?
is marker reverse migration still needed?
are old workflow assertions permanently covered?
```

RS2-2 cannot answer those on behalf of RS2-4.

---

## 23. Bounded machine-readable RS2-2 status record

RS2-2 implementation close should produce:

```text
products/simcore/state-sync/RS2_2_STATUS.json
```

This is a bounded infrastructure status record.

It is not production identity authority.

### 23.1 Suggested schema

```json
{
  "schemaVersion": 1,
  "phase": "RS2-2",
  "phaseStatus": "COMPLETE",
  "stateSyncAvailable": true,
  "documentSyncCutoverComplete": true,
  "legacyFullMode": "ROLLBACK_ONLY",
  "manifestDeclaration": "TRANSITIONAL",
  "rs2_3EntryAuthorized": true,
  "sourceIdentityStatus": "IDENTITY_VERIFIED",
  "managedTargetsStatus": "CLEAN",
  "writerPolicyStatus": "CLEAN",
  "cleanChecks": {
    "canonicalMain": "PASS",
    "independentRecheck": "PASS"
  },
  "openObservationIds": [],
  "toolCommit": "<commit>",
  "registryBlob": "<blob>",
  "cutoverCommit": "<commit>",
  "evidenceDocument": "<path>"
}
```

### 23.2 Forbidden fields

Do not duplicate full production authority into this status file.

Forbidden as canonical truth:

```text
production version
release name
release commit
release blob
next release
current bug
runtime live verdict
```

If a production source identity is needed for evidence, store a bounded reference/hash under implementation evidence, clearly marked as the source checked at close time, not as durable production authority.

---

## 24. Close evidence document

Implementation should also create a human-readable evidence record, directionally:

```text
docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2_IMPLEMENTATION_EVIDENCE.md
```

It records:

```text
implementation base main
sync-state tool commit
registry/config commits
self-test summary
source identity verification evidence
legacy marker counts before/after
canonical marker counts before/after
unmanaged-byte preservation proof
writer exclusivity proof
CLEAN-1 result
CLEAN-2 result
open observations
rollback procedure validation
legacy full rollback-only proof
manifest transitional owner
runtime diff NONE
release-simcore diff NONE
RS2-3 handoff status
```

Evidence must stay bounded.

No full Markdown bodies or production source bodies are required.

---

## 25. Close-state observation ledger

Open human observations at close should be included either in the implementation evidence or a bounded companion record.

Each entry:

```text
id
probe id
severity = OBSERVATION
document
reason
owner = HUMAN
status
first observed evidence
```

A future human doc edit may resolve them without changing RS2-2 phase status.

When resolved, update the observation status/evidence; do not reopen the phase merely for ordinary human-memory maintenance.

---

## 26. Reopening RS2-2 vs ordinary maintenance

RS2-2 is not reopened for every state-sync bug.

### 26.1 Ordinary maintenance

Examples:

```text
add a new renderer field through explicit reviewed mapping
fix a bounded parser bug without changing authority model
add a new current-claim probe
improve report formatting
resolve a human observation
```

These are maintenance within the frozen architecture.

### 26.2 Design-level reopen condition

Reopen/revise the RS2-2 design only if evidence requires a foundational authority change, such as:

```text
sync-state must become a remote GitHub client
whole-document ownership is required
manifest must become writable by sync-state
multiple simultaneous document writers are required
human prose must become machine-generated authority
current target count/ownership model must fundamentally change
```

Such changes contradict frozen design boundaries and require explicit redesign rather than a quiet patch.

---

## 27. Interaction with repo-wide main-write coordination

The repository-wide main-write helper remains the only integration concern inherited by RS2-2.

Required operational sequence:

```text
verified local state-sync payload
→ local commit
→ repo-main-write.py
→ latest-main replay/retry
→ resulting main
→ CLEAN-1
→ independent CLEAN-2
```

### 27.1 Main movement during cutover

If another product advances main before state-sync payload lands:

```text
repo-main-write.py replays bounded payload
→ sync-state check reruns on landed main
```

A clean pre-replay candidate is insufficient.

### 27.2 Product isolation remains required

State-sync payload allowlist must remain SimCore-owned paths only.

It must not rewrite Usage Dashboard or other product state merely because main advanced concurrently.

---

## 28. Same-version production corrections remain first-class identity changes

Operational promotion and CI handoff must preserve exact commit/blob identity.

A later correction may keep:

```text
version = X.Y.Z
```

while changing:

```text
release commit
release blob
```

Therefore:

```text
same version
!=
same production identity
```

No close status or CI profile may collapse identity to semantic version alone.

---

## 29. Product validation state remains declarative

RS2-2 may render the declared validation value but may not infer promotion from state-sync health.

Example:

```text
state sync CLEAN
```

never implies:

```text
runtime LIVE_PASS
```

Likewise:

```text
runtime LIVE_PENDING
```

is not a reason to fail state synchronization if that declared value is valid and matches the verified declared state.

The systems answer different questions.

---

## 30. What `RS2_2_CLOSED` does authorize

After close, future repository work may rely on these facts:

```text
registered SimCore state blocks have a single canonical writer
sync-state can verify/render/check them deterministically
legacy full doc sync is not an ordinary writer
machine-owned state drift is mechanically detectable
human current-state contradictions are bounded observations
main replay requires post-landing recheck
RS2-3 may make the read-only check permanent CI
```

---

## 31. What `RS2_2_CLOSED` does not authorize

It does not authorize:

```text
deleting all legacy workflows
making sync-state update product-manifest
making sync-state deploy release-simcore
making every human observation a CI blocker
rewriting all historical version references
moving active development reasoning into generated blocks
adding network/GitHub writes to sync-state
creating permanent release automation
changing runtime behavior
```

Those remain separate authorities.

---

## 32. RS2-3 handoff invariants

RS2-3 must preserve:

```text
CHECK IS READ-ONLY
SOURCE IDENTITY BEFORE TARGET VERDICT
BLOCKER > DRIFT > OBSERVATION > CLEAN
EXIT 2 > EXIT 1 > EXIT 0
HISTORICAL PROSE EXCLUDED BY DEFAULT
HUMAN OBSERVATIONS NONBLOCKING BY DEFAULT
NO CI AUTO-REPAIR
NO NEW GITHUB WRITE IN sync-state
NO MANIFEST MUTATION IN sync-state
```

A permanent CI workflow that reimplements these rules independently in shell/YAML instead of invoking the canonical checker is noncompliant.

---

## 33. RS2-3 may begin before RS2-4

This is explicitly allowed.

Expected sequencing:

```text
RS2-2 close
→ RS2-3 Permanent CI
→ RS2-4 Permanent Release Workflow
```

During RS2-3:

```text
manifest declaration remains transitional
legacy full remains rollback-only
sync-state remains document owner
```

This is not architectural debt that blocks CI adoption; it is an explicit migration stage.

---

## 34. Failure classification during implementation

Any implementation anomaly must follow existing SimCore infrastructure evidence discipline.

Use:

```text
FIX
WATCH
DEFER
BLOCKER
```

Examples:

```text
source identity verifier accepts mismatch       BLOCKER
unmanaged bytes mutate                          BLOCKER
dual writer path remains active                 BLOCKER
self-test harness false negative                FIX
human probe noisy but bounded/nonblocking       FIX or WATCH
future manifest schema cleanup                  DEFER
```

Do not hide a failed close gate by relabeling it as an observation.

---

## 35. Implementation sequence after authorization

Directional sequence:

```text
E0  verify RS2-1 implementation close prerequisites
E1  implement/finish RS2-2A/B tool primitives
E2  implement RS2-2C registry/renderers/migration helpers
E3  implement RS2-2D checker/report extensions
E4  run complete self-test suite
E5  resolve current manifest/production drift through existing declaration authority
E6  materialize verified production identity
E7  run isolated shadow verification
E8  declare STATE_SYNC_AVAILABLE
E9  prepare single-writer cutover payload
E10 prove unmanaged-byte preservation
E11 land payload through repo-main-write.py
E12 run CLEAN-1 from resulting main
E13 run CLEAN-2 from independent clean checkout
E14 confirm legacy full = ROLLBACK_ONLY
E15 write RS2_2_STATUS.json
E16 freeze RS2-2 implementation evidence
E17 declare RS2_2_CLOSED
E18 declare RS2_3_ENTRY_AUTHORIZED
```

No runtime/release-simcore change belongs in this work item.

---

## 36. Required implementation validation gate

Before `RS2_2_CLOSED = YES`:

```text
RS2-1 implementation close prerequisite                PASS
sync-state self-tests                                   PASS
source identity negative fixtures                       PASS
same-version correction fixture                         PASS
current drift-shape fixture                             PASS
renderer exact-byte fixtures                            PASS
marker migration fixtures                               PASS
historical false-positive fixtures                      PASS
writer-policy fixtures                                  PASS
legacy explicit-mode split                              PASS
manifest-only mode does not write docs                  PASS
legacy-full automatic invocation                        NONE
canonical marker migration                              PASS
unmanaged-byte preservation                             PASS
DUAL_WRITE                                               NONE
STATE_SYNC_AVAILABLE                                    YES
DOCUMENT_SYNC_CUTOVER_COMPLETE                          YES
CLEAN-1                                                 PASS
CLEAN-2                                                 PASS
managed DRIFT count                                     0
BLOCKER count                                           0
human OBSERVATION count                                 bounded / allowed
LEGACY_FULL_ROLLBACK_ONLY                               YES
MANIFEST_DECLARATION_TRANSITIONAL                       YES
repo-main-write integration                             PASS
runtime diff                                             NONE
release-simcore diff                                     NONE
permanent CI workflow creation                           NONE
permanent release workflow creation                      NONE
legacy script deletion                                   NONE
```

---

## 37. Expected first promotion record

If implementation follows the design, the expected initial result is:

```text
STATE_SYNC_AVAILABLE                 YES
DOCUMENT_SYNC_CUTOVER_COMPLETE       YES
LEGACY_FULL_ROLLBACK_ONLY            YES
MANIFEST_DECLARATION_TRANSITIONAL    YES
RS2_2_CLOSED                         YES
RS2_3_ENTRY_AUTHORIZED               YES
```

Human observation state may be:

```text
NONE
```

or:

```text
OPEN_NONBLOCKING
```

without changing the above result.

---

## 38. Example close report — fully clean human state

```text
RS2-2 State Synchronization
Phase: COMPLETE

State sync: AVAILABLE
Document cutover: COMPLETE
Legacy full: ROLLBACK_ONLY
Manifest declaration: TRANSITIONAL
RS2-3 entry: AUTHORIZED

Source identity: VERIFIED
Managed targets: CLEAN
Writer policy: CLEAN
Human current-state observations: 0

Canonical-main check: PASS
Independent recheck: PASS
```

---

## 39. Example close report — human observation remains

```text
RS2-2 State Synchronization
Phase: COMPLETE

State sync: AVAILABLE
Document cutover: COMPLETE
Legacy full: ROLLBACK_ONLY
Manifest declaration: TRANSITIONAL
RS2-3 entry: AUTHORIZED

Source identity: VERIFIED
Managed targets: CLEAN
Writer policy: CLEAN
Human current-state observations: 1 OPEN

Canonical-main check: CLEAN_WITH_OBSERVATIONS
Independent recheck: CLEAN_WITH_OBSERVATIONS
```

This is a valid close.

The human observation is a maintenance item, not a reason to give machine state ownership back to the legacy writer.

---

## 40. Example non-close — machine block stale

```text
Source identity: VERIFIED
Managed target: STALE
Result: CHECK_DRIFT
Exit: 1
```

Outcome:

```text
RS2_2_CLOSED = NO
```

Human observations are irrelevant until machine drift is resolved.

---

## 41. Example non-close — source identity mismatch

```text
manifest version/commit/blob
!=
materialized release-simcore identity

Result: CHECK_BLOCKED
Exit: 2
```

Outcome:

```text
STATE_SYNC_AVAILABLE may remain YES as a tool capability
DOCUMENT_SYNC_CUTOVER_COMPLETE cannot newly promote
RS2_2_CLOSED = NO
```

The source declaration must be repaired by its owner first.

---

## 42. Example non-close — dual writer configured

```text
sync-state document writer ACTIVE
legacy --legacy-full automatic path ACTIVE
```

Result:

```text
DUAL_WRITER_CONFIGURED
BLOCKER
exit 2
```

No amount of clean rendered bytes can override this safety failure.

---

## 43. Example rollback event after close

If a later operational defect requires cutover rollback:

```text
RS2_2_CLOSED historical close = remains recorded
current operational state      = ROLLBACK_ACTIVE
RS2_3 CI authority             = may be temporarily disabled/adjusted by explicit incident action
```

The historical phase close is not erased.

Instead record the operational incident and re-promotion evidence.

This preserves truthful history.

---

## 44. Relationship to RS2-1 status model

RS2-1 and RS2-2 intentionally use similar but separate claims.

```text
RS2-1
  DURABLE_TESTS_AVAILABLE
  PARTIAL_REPLACEMENT_AUTHORIZED
  FULL_REPLACEMENT_AUTHORIZED
  RS2_1_CLOSED

RS2-2
  STATE_SYNC_AVAILABLE
  DOCUMENT_SYNC_CUTOVER_COMPLETE
  LEGACY_FULL_ROLLBACK_ONLY
  RS2_2_CLOSED
  RS2_3_ENTRY_AUTHORIZED
```

Neither phase pretends that every future release-system component is already replaced.

This staged authority model prevents infrastructure refactors from blocking unrelated runtime development.

---

## 45. Relationship to active SimCore runtime releases

RS2-2 implementation is infrastructure work.

It must remain separate from:

```text
v0.64.x correctness minis
v0.65.x runtime architecture work
M2-3 Edit Reconcile ownership extraction
Representation behavior
Broadcast/Time/Frame behavior
Reaction/COMMUNITY behavior
Bootstrap Migration
host/cache work
persistent runtime storage schema
```

If an urgent runtime release occurs while RS2-2 implementation is incomplete:

```text
use last verified release/state path
complete runtime release independently
resume RS2-2 from current main afterward
```

Do not mix release-system migration with runtime behavior change.

---

## 46. Design close gate

RS2-2E design is complete when:

```text
phase completion vs full replacement separated          PASS
operational claim vocabulary defined                     PASS
STATE_SYNC_AVAILABLE gate defined                        PASS
current identity drift cutover prerequisite defined      PASS
DOCUMENT_SYNC_CUTOVER_COMPLETE gate defined              PASS
no dual-write grace period defined                       PASS
minimum CLEAN-1 check defined                            PASS
minimum CLEAN-2 independent recheck defined              PASS
future real release not required for close defined       PASS
human observations nonblocking close rule defined        PASS
human observation retention rule defined                 PASS
machine blockers not downgradeable defined               PASS
LEGACY_FULL_ROLLBACK_ONLY gate defined                    PASS
rollback-only vs retirement separated                    PASS
manifest transitional authority defined                  PASS
RS2_2_CLOSED gate defined                                PASS
RS2_3_ENTRY_AUTHORIZED gate defined                      PASS
exact RS2-3 handoff package defined                      PASS
CI semantic profiles defined                             PASS
CI auto-repair forbidden                                 PASS
rollback trigger classes defined                         PASS
rollback sequence defined                                PASS
re-promotion sequence defined                            PASS
legacy retirement deferred to RS2-4                      PASS
machine-readable RS2-2 status record defined             PASS
implementation evidence record defined                   PASS
main replay + post-landing recheck defined               PASS
same-version correction identity preserved               PASS
implementation sequence defined                          PASS
implementation validation gate defined                   PASS
runtime diff                                               NONE
release-simcore diff                                       NONE
manifest diff                                              NONE
permanent CI change                                        NONE
permanent release workflow change                          NONE
legacy deletion                                            NONE
```

No implementation is required to close the **design** subphase.

---

## 47. RS2-2 full design status after this document

With RS2-2E frozen:

```text
RS2-2A  State Authority & Machine-Managed Block Contract     COMPLETE
RS2-2B  Sync-State Tool / Read-Verify-Render Contract        COMPLETE
RS2-2C  Target Mapping & Write-Safety Migration              COMPLETE
RS2-2D  Drift / Contradiction Detection & Check Mode         COMPLETE
RS2-2E  Promotion / Close Gate & RS2-3 Handoff               COMPLETE
```

Therefore:

```text
RS2-2 DETAILED DESIGN = COMPLETE
```

Implementation remains a separate future workstream.

---

## 48. Handoff to RS2-3 Permanent CI design

The next design phase is RS2-3.

RS2-3 must decide how permanent CI invokes the already-frozen interfaces.

At minimum RS2-3 must design:

```text
workflow topology
trigger/path filters
required vs optional checks
PR_STATE_CHECK integration
RELEASE_STATE_CHECK integration
main-health/manual check integration if desired
permanent durable-test harness invocation from RS2-1
state-sync check invocation from RS2-2
check aggregation / naming
failure artifact retention
bounded report presentation
concurrency semantics
permissions
fork/untrusted PR behavior
main-write separation
release-simcore read-only materialization
how transitional retained legacy gates coexist
when old one-shot CI can be retired
```

RS2-3 may make checks permanent.

It may not redesign the state authority frozen in RS2-2 merely for workflow convenience.

---

## 49. Frozen final rule

> Close the phase when the new authority is proven, not when every transitional dependency in the wider release system has disappeared.

For RS2-2 that means:

```text
verify exact production identity
own only registered document bytes
keep exactly one document writer
prove canonical main after landing
prove an independent no-op recheck
retain human observations without machine overreach
keep legacy full only as explicit rollback
leave manifest declaration transitional until RS2-4
hand a stable read-only checker to RS2-3
```

The successful RS2-2 end state is deliberately boring:

```text
state facts are exact
machine blocks are deterministic
history stays intact
human judgment stays human
writers do not race
checks do not guess
fallback is explicit
```
