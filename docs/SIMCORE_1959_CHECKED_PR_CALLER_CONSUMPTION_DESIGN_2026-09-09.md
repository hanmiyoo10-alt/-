# SimCore #1959 Checked-PR Caller Consumption Design

Date: 2026-09-09 KST
Status: **DESIGN FROZEN · IMPLEMENTATION AUTHORIZED · RELEASE-SYSTEM / CONTROL-PLANE · NONRUNTIME**
Tracking: #1959
Predecessor infrastructure: #1950
Live specimen: SimCore v0.70.11 post-publish state declaration

## 1. Purpose

Repair the permanent post-publish state caller so native protected-main checked-PR recovery is a first-class, bounded integration path instead of a generic release failure.

This task does not alter SimCore runtime behavior, release bytes, candidate identity, approval identity, publication authority, release-simcore, HUMAN_EVIDENCE, or LIVE_PASS semantics.

## 2. Preserved live evidence

The v0.70.11 runtime publication succeeded and remains authoritative:

```text
releaseId         = simcore-v0.70.11-new-03
production commit = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob   = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
publisher run     = 34318469138
latest == install = YES
```

The post-publish owner generated exact state commit:

```text
payload commit = 0d3b9efbca0c0dee7fa0f8767a0c31aac7ca5e02
```

`repo-main-write.py` then proved the exact replayed candidate through `MAIN_HEALTH / Required`, observed native Required enforcement, preserved the exact staging ref, and emitted:

```text
MAIN_WRITE_NATIVE_PROTECTION_ACTIVE
MAIN_WRITE_CHECKED_PR_REQUIRED:
  base=<exact main base>
  commit=<exact gated candidate>
  ref=<exact preserved staging ref>
```

The shared writer therefore behaved correctly. The failure is the caller integration above it.

## 3. Exact current root cause

`products/simcore/tooling/release-state-main-gate.mjs` currently invokes the shared writer through a generic command wrapper.

Any non-zero child status is converted into:

```text
R2_6_MAIN_GATE_FAIL
```

Therefore shared-writer exit `9` and its exact checked-PR coordinates are lost as structured state.

The caller then never has a legitimate way to distinguish:

```text
real gateway failure
```

from:

```text
exact payload gated successfully
native branch protection requires ordinary checked PR
```

Simply turning exit `9` into ordinary success is forbidden because durable reobservation would run before the checked PR reaches main.

## 4. Frozen integration model

The permanent solution is an automatic checked-PR consumer that still uses ordinary protected-branch PR semantics.

Conceptual flow:

```text
post-publish owner payload
→ release-state-main-gate
→ repo-main-write exact staging
→ MAIN_HEALTH / Required PASS on exact staged candidate
→ native protection active
→ structured CHECKED_PR_REQUIRED handoff
→ create normal same-repository PR from preserved exact ref to exact main base
→ run explicit PR_RECOVERY validation on exact base/head
→ same path classification as PR_MAIN
→ same trusted predecessor lane as PR_MAIN when CI_SELF applies
→ same proposed permanent verifier as PR_MAIN
→ Required PASS on exact PR head
→ re-read main base
→ if moved: fail closed, do not merge
→ ordinary GitHub PR merge API using exact expected head
→ fetch main
→ durable payload equality reobserve
→ cleanup preserved staging ref
```

No direct main push is reintroduced.

## 5. Why explicit PR_RECOVERY validation is required

A PR opened by a GitHub Actions workflow using its `GITHUB_TOKEN` does not provide a dependable recursive `pull_request` workflow trigger.

Reusing the earlier staging `MAIN_HEALTH` result is also insufficient.

`PR_MAIN` has release-system semantics not present in `MAIN_HEALTH`, especially for CI_SELF/HARNESS payloads:

```text
classify base...head paths
→ trusted predecessor verifier on exact PR base
→ proposed verifier on exact PR head
```

The v0.70.11 #1960 incident proved this distinction is material: a payload that had already passed a MAIN_HEALTH gate still failed the trusted predecessor lane when evaluated as a real PR against an unsynchronized base.

Therefore checked-PR automation requires an explicit workflow-dispatch profile that reproduces PR_MAIN semantics from frozen base/head identities.

## 6. PR_RECOVERY profile contract

`.github/workflows/simcore-ci.yml` may add one workflow-dispatch-only profile:

```text
PR_RECOVERY
```

Required inputs:

```text
pr_base_commit = exact 40-hex main base
pr_head_commit = exact 40-hex checked PR head
```

Rules:

1. `PR_RECOVERY` is allowed only under `workflow_dispatch`.
2. head must equal the workflow run checkout SHA.
3. base must be an existing commit.
4. base must be an ancestor boundary appropriate for `base...head` classification.
5. path classification uses `git diff --name-only base...head` exactly as PR_MAIN.
6. trusted predecessor execution uses the explicit base exactly as PR_MAIN uses `github.event.pull_request.base.sha`.
7. proposed verifier receives explicit base/head exactly as PR_MAIN does.
8. candidate validation semantics are not enabled by this profile.
9. public required job remains `Required`.
10. manual use with missing/invalid identities fails closed.

This profile is a transport-compatible projection of PR_MAIN validation semantics, not a weaker profile.

## 7. Structured main-gate handoff

`release-state-main-gate.mjs` must recognize only the exact shared-writer checked-PR exit contract.

Accepted child result:

```text
status = 9
stdout contains exactly one:
MAIN_WRITE_CHECKED_PR_REQUIRED: base=<40hex> commit=<40hex> ref=<safe-ref>
stdout also contains:
MAIN_WRITE_NATIVE_PROTECTION_ACTIVE
```

The adapter must reject malformed, ambiguous, missing, or mismatched coordinates.

For a valid handoff it writes a machine report containing at least:

```text
result              = CHECKED_PR_REQUIRED
mainMutation        = CHECKED_PR_PENDING
payloadCommit       = original owner payload commit
checkedPr.base      = exact main base
checkedPr.commit    = exact gated candidate
checkedPr.ref       = exact preserved staging ref
checkedPr.workflow  = simcore-ci.yml
checkedPr.profile   = PR_RECOVERY
checkedPr.job       = Required
```

The CLI must preserve a distinct checked-PR-required exit state for callers; generic gateway failures remain failures.

## 8. Checked-PR consumer owner

A bounded release-state checked-PR consumer may be added under `products/simcore/tooling/`.

Responsibilities:

1. consume only a valid `CHECKED_PR_REQUIRED` main-gate report;
2. re-read `origin/main` and require exact equality with `checkedPr.base` before PR creation;
3. require preserved remote ref to resolve to `checkedPr.commit`;
4. require actual `base...commit` changed paths to equal the state envelope changed paths and writer allowlist;
5. create one same-repository PR with canonical release-state recovery title and machine provenance in the body;
6. dispatch `simcore-ci.yml` on the exact preserved ref with `profile=PR_RECOVERY`, exact base, exact head;
7. locate exactly one matching workflow run bound to the exact head and start window;
8. require workflow SUCCESS and exactly one `Required` job SUCCESS;
9. re-read `origin/main` immediately before merge and require it still equals the frozen base;
10. merge through GitHub's ordinary pull-request merge endpoint using the exact expected head SHA;
11. require merge response `merged=true`;
12. fetch main and verify the merged payload paths equal the checked candidate bytes;
13. invoke the existing durable release-state reobserver;
14. delete the preserved staging ref only after durable reobservation PASS.

If main moves at any point before merge, the consumer must fail closed and must not merge a stale checked PR.

## 9. Main writer authority remains singular

This design does not restore direct push and does not create a second low-level main writer.

Authority remains layered:

```text
repo-main-write.py
= exact replay + bounded allowlist + MAIN_HEALTH gate + native protection observation + preserved ref

checked-PR consumer
= ordinary PR transport required by native protection

GitHub branch protection
= final protected-main enforcement
```

The consumer is not allowed to call:

```text
git push origin HEAD:main
update-ref main
force push
force-with-lease
branch-protection bypass
admin bypass
```

## 10. Caller integration

Both installed owners that call `release-state-main-gate.mjs` must understand the same result vocabulary:

```text
.github/workflows/simcore-release-permanent.yml
.github/workflows/simcore-release-state-sync.yml
```

For direct gateway landing:

```text
MAIN_GATE_PASS
→ existing durable reobserve path
```

For native checked-PR handoff:

```text
CHECKED_PR_REQUIRED
→ checked-PR consumer
→ PR_RECOVERY Required PASS
→ ordinary merge
→ durable reobserve
```

The permanent release workflow may report success only after durable reobservation succeeds. Merely creating a PR or obtaining recovery coordinates is not sufficient for Permanent Release success.

This preserves existing Exact Approval Activation semantics, which currently requires the Permanent Release workflow itself to conclude `success`.

## 11. Recovery workflow parity

The canonical one-shot permanent post-publish recovery workflow uses the same main-gate adapter and must gain the same checked-PR consumption behavior.

This prevents a repaired permanent publisher from leaving the recovery path on the old failure contract.

No new publication occurs in RECOVERY mode.

## 12. Idempotence

Required idempotent states:

```text
payload already durable
→ ALREADY_DURABLE / no PR

checked PR already merged and main bytes match
→ durable reobserve PASS / no second PR

matching open checked PR exists with exact base/head
→ reuse exact PR only if provenance and head/base match

matching PR exists but base/head differs
→ fail closed

staging ref missing or moved
→ fail closed

main moved before merge
→ fail closed, preserve evidence, no merge
```

The consumer must never silently create multiple competing PRs for the same exact checked handoff.

## 13. Expected implementation surfaces

Authorized release-system/control-plane scope may include only files proven necessary, expected:

```text
products/simcore/tooling/release-state-main-gate.mjs
products/simcore/tooling/release-state-checked-pr.mjs
.github/workflows/simcore-ci.yml
.github/workflows/simcore-release-permanent.yml
.github/workflows/simcore-release-state-sync.yml
products/simcore/tests/post-publish-state-permanent.test.mjs
products/simcore/tests/suites/release-system-r2-6.test.mjs
products/simcore/tooling/ci/self-test.mjs
```

Additional dedicated tests are allowed if they remain release-system-only.

Forbidden scope:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
runtime behavior
candidate/approval/release spec identity
HUMAN_EVIDENCE
LIVE_PASS projection
unrelated repository infrastructure refactor
```

## 14. Required regression coverage

Implementation cannot merge without tests proving at least:

```text
repo-main-write exit 9 + exact tokens
→ main-gate structured CHECKED_PR_REQUIRED

exit 9 + malformed coordinates
→ fail closed

other nonzero gateway exit
→ fail closed

PR_RECOVERY classification
→ same path labels as PR_MAIN for same base/head

PR_RECOVERY CI_SELF
→ trusted predecessor executes on explicit base
→ proposed verifier executes on explicit head

checked consumer
→ exact main/base/ref verification
→ exact allowlist verification
→ one PR only
→ exact PR head
→ PR_RECOVERY Required PASS required
→ base movement blocks merge
→ Required failure blocks merge
→ wrong head blocks merge
→ ordinary PR merge only
→ durable byte equality required
→ staging cleanup only after durable PASS
```

Static guards must forbid force/bypass/direct-main-update tokens in the consumer.

## 15. Qualification gates

Before merge:

```text
node syntax for changed JS                         PASS
YAML parse for changed workflows                   PASS
release-system R2.6 tests                          PASS
post-publish permanent tests                       PASS
permanent CI self-test                             PASS
new checked-PR integration tests                   PASS
Plugin Control Plane CI where applicable           PASS
SimCore CI trusted predecessor                     PASS
SimCore CI proposed verifier                       PASS
SimCore CI Required                                PASS
production identity readback                       unchanged v0.70.11
latest.js == install.js                            PASS
runtime/release branch diff                        NONE
```

## 16. Live proof after merge

Do not republish v0.70.11 solely to test this fix.

The first legitimate future post-publish checked-PR requirement is the preferred full live proof.

Before that, implementation qualification must include a bounded repository integration test using synthetic exact refs / fake GitHub CLI or another non-production harness that proves the state machine without mutating `release-simcore` or protected main.

v0.70.11 remains:

```text
LIVE_PENDING
PENDING_REAL_LONG_CHAT
```

and is not converted to HUMAN_EVIDENCE or LIVE_PASS by this infrastructure repair.

## 17. Disposition

```text
#1959 = BLOCKER / FIX AUTHORIZED
TRANSACTION_CLASS = RELEASE-SYSTEM / CONTROL-PLANE / NONRUNTIME
DIRECT_MAIN_PUSH = FORBIDDEN
PROTECTED_PR_MERGE = REQUIRED WHEN NATIVE HANDOFF OCCURS
PR_VALIDATION = PR_RECOVERY WITH PR_MAIN-EQUIVALENT SEMANTICS
PERMANENT_RELEASE_SUCCESS BEFORE DURABLE MAIN = FORBIDDEN
RELEASE-SIMCORE MUTATION = NONE
V0.70.11 PRODUCT STATE = UNCHANGED / LIVE_PENDING
HUMAN_EVIDENCE = PENDING
```
