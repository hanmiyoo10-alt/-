# Local Usage Dashboard — E7 Config-Free Release Orchestration

Status: **IMPLEMENTED — E7-A/B/C/D merged and full regression GREEN; E7-E real-release operational proof pending**

Recorded: `2026-08-25`

Design: Issue `#261`.
5.73 release-system retrospective: Issue `#259`.
PR-bootstrap/event-trust follow-up: Issue `#254`.
Implementation PR: `#263`.
Implementation merge SHA: `65a62b03288546ba1196271dd619499e8ff8b9ed`.
Authoritative validation: `Usage Dashboard Candidate Validation` run `#112`.
Registry result: `TEST_REGISTRY_GREEN:80`.

## Latest-generation rule

E7 is the current complete release-system generation for Local Usage Dashboard.

It does not mean that E1–E6 were deleted and replaced by only the newest feedback items.

Operationally:

```text
E7
=
all previously proven E1–E6 contracts that remain valid
+
E7 PR/bootstrap/validation simplification
```

A normal operator should use this E7 document as the current cohesive runbook instead of mentally composing E1, E2, E3, E4, E5 and E6 separately.

Historical E-generation documents remain evidence for how the current contracts were established.

---

# 1. Inherited from E1–E6 — unchanged

These are E7 baseline contracts. E7 did not redesign or weaken them.

## Source / derived-candidate authority

- Source branches remain under `release/usage-dashboard-*`.
- Source branches remain source-of-intent only.
- Hand-authored generated output remains denied on source branches.
- Materialized candidates remain controller-owned under `stage/usage-dashboard-<product-version>`.
- Every stage freezes exact trusted-main and exact source SHA authority.
- Candidate trees are freshly reconstructed from trusted base + current source intent.
- Prior generated candidate bytes never become source authority.

## Reentrant repair

The normal release-stage command remains one command:

```text
/usage-dashboard stage <source-branch>
```

It is used both for the first candidate and after a source repair.

Normal repair remains:

```text
source fix
→ same stage command
→ same derived candidate branch advances
→ same release PR is reused
```

No normal `restage` command, no `-v2/-v3` successor candidate and no replacement PR are required for ordinary repair.

## Privilege separation

- Candidate/materializer/test code receives no repository write credential.
- Read-only materialization is isolated from repository write authority.
- The derived candidate writer executes trusted control-plane code only.
- The writer does not execute candidate materializers, behavior tests or the full registry.
- Candidate writes remain exact digest/path/mode/parent checked.
- Candidate ref mutation remains CAS-guarded, fast-forward-only and postverified.
- Force push remains forbidden.

## Test authority

- Stage smoke remains pre-PR protection only.
- The complete registered Usage Dashboard regression remains authoritative.
- Regression registration remains fail-closed.
- Engine/plugin behavior contracts, UNKNOWN semantics, privacy, cache/CLI/scheduler behavior and product data fidelity remain unchanged by E7.

## Merge authority

GREEN alone never authorizes a blind merge.

Before merge:

```text
current PR head is re-read
+ validation identity is checked
+ mergeability is re-read
+ expected head SHA is supplied to squash merge
```

## Production promotion

The established strongest release boundary remains unchanged:

```text
merged main candidate
→ release/maintenance classifier
→ monotonic guard
→ exact-byte promotion
→ release-usage-dashboard
```

Production is never rebuilt during promotion.

## Receipts and repository closure

- Deployment receipts remain automatic for real product releases.
- Product / Engine / Manager / contracts, merge SHA, production SHA, Engine hash and exact-byte parity remain recorded.
- Repository/CI/deployment closure remains separate from PocketRisu physical verification.
- Physical verification remains explicitly `PENDING` until actual-device evidence exists.

---

# 2. New in E7 — changed from E6

E7 changes only the remaining PR/bootstrap/validation friction observed on the 5.73 release.

## E7-A — `stage` succeeds at `CANDIDATE_READY`

E6 coupled successful candidate preparation to PR creation/validation activation. On 5.73, candidate materialization succeeded but the Actions-token PR POST failed with HTTP 403, causing a valid candidate transaction to be reported as failed.

E7 ends the stage transaction at exact candidate authority:

```text
SOURCE
→ release-generic preflight
→ read-only materialization
→ constrained derived-candidate write
→ exact ref postverify
→ UD_CANDIDATE_READY
```

`UD_CANDIDATE_READY` is a successful stage terminal state.

The receipt records:

- release identity;
- source branch and exact source SHA;
- trusted base SHA;
- candidate branch and exact candidate SHA;
- stage transaction identity;
- focused smoke result;
- next orchestration boundary.

PR bootstrap or validation activation failure does not invalidate already-verified candidate bytes.

## E7-B — deterministic PR orchestration leaves the Actions-token critical path

The candidate-stage workflow no longer receives or uses `pull-requests: write` or `actions: write` for normal PR bootstrap.

After `CANDIDATE_READY`, the assistant's authorized connected GitHub control surface owns deterministic PR ensure:

```text
head = stage/usage-dashboard-<product-version>
base = main
```

The assistant must:

1. search for the exact deterministic release PR;
2. create it when zero matches exist;
3. reuse it when exactly one match exists;
4. fail closed when multiple matching open PRs exist;
5. never alter candidate bytes merely to create/reuse the PR.

This removes the 5.73 Actions-token HTTP-403 bootstrap dependency from the normal stage transaction and requires no user repository-setting change.

## E7-C — exact-SHA authoritative validation

E7 no longer depends on GitHub deciding that a controller-authored PR branch update is a trusted `pull_request` event.

An owner-only control command on control Issue `#197` binds an open deterministic release PR to an exact candidate SHA:

```text
/usage-dashboard validate <pr-number> <candidate-sha>
```

This is an internal assistant/control-plane command. It is not a new user-facing release command.

The trusted controller verifies:

```text
PR is open
PR base == main
PR head repo == this repository
PR head branch matches deterministic stage namespace
PR head SHA == requested candidate SHA
remote candidate branch SHA == requested candidate SHA
```

Only then does it call the same full reusable Usage Dashboard validator with the exact candidate SHA.

The reusable validator independently checks its checkout identity before running the existing complete regression.

The acceptance invariant is:

```text
VALIDATED_SHA == CURRENT_PR_HEAD_SHA == CANDIDATE_READY_SHA
```

A mismatch fails closed.

Ordinary `pull_request` validation remains available as defense in depth, but the E7 authoritative activation path no longer requires the 5.73 no-byte-change close/reopen workaround.

## E7-D — release-generic preflight

E7 adds a narrow fail-closed preflight before release materialization/expensive smoke.

Its first protected stale-current-release pattern is a direct `assert.equal` / `assert.strictEqual` assertion against `.productVersion` using an older `3.0.0-alpha.5.N` literal when the current release spec targets a newer version.

This catches the class of mistake that caused the 5.73 P36 stale-5.72 CI failure before the expensive full integration gate.

Legitimate historical version locks remain possible only when explicitly annotated with:

```text
UD_HISTORICAL_VERSION_LOCK
```

The preflight does not rewrite tests automatically, does not infer intended versions and does not reject every historical version string merely for existing.

---

# 3. Current E7 normal flow

The latest normal release flow is:

```text
assistant implements source/tests/spec/materializer
→ /usage-dashboard stage <source-branch>
→ release-generic preflight
→ trusted materialization
→ derived candidate CAS write
→ CANDIDATE_READY
→ assistant ensures one deterministic PR through connected GitHub control surface
→ assistant activates full validator for exact candidate SHA
```

If full validation is RED:

```text
fix source only
→ same stage command
→ same candidate branch advances
→ same PR reused
→ exact-SHA full validation for the new candidate head
```

If GREEN:

```text
re-read PR head
→ require PR_HEAD_SHA == VALIDATED_SHA
→ re-read mergeability
→ exact-head squash merge
→ existing classifier / monotonic guard
→ exact-byte production promotion
→ deployment receipt
→ automatic repository documentation closure
→ user only PocketRisu + / physical verification when product bytes changed
```

---

# 4. Operational state reduction

The assistant should normally need to track only:

```text
SOURCE_BRANCH
SOURCE_SHA
CANDIDATE_SHA
PR_NUMBER
VALIDATED_SHA
MERGE_SHA
PRODUCTION_SHA
```

The normal E7 runbook does not require state for:

- replacement candidate branches;
- replacement PRs;
- `restage`;
- `prepare → ready` fallback choreography;
- close/reopen trusted-event workarounds;
- user GitHub settings.

Historical `prepare`, `ready` and `ready-branch` paths remain emergency/diagnostic fallbacks only.

---

# 5. Implementation evidence

Implementation PR `#263` changed Usage Dashboard release-control/test infrastructure only.

No product release specification, plugin generated runtime, Engine runtime, Manager runtime or product manifest was intentionally changed by E7 maintenance.

Final PR candidate validation run `#112` proved:

```text
usage-dashboard E7 stage transaction contract: OK
usage-dashboard E7 validation control command contract: OK
usage-dashboard E7 release-generic preflight contract: OK
P36 Diagnostics Instant Mode Switch: OK
P37 Runtime Weight & Lifecycle Audit: OK
TEST_REGISTRY_GREEN:80
validated 3.0.0-alpha.5.73 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1
```

Engine remained byte-identical with SHA-256:

```text
85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
```

PR `#263` was squash-merged with exact head:

```text
PR head: fddd0a144bbb4b954d0fbe1479e371d54c67a8ee
main merge: 65a62b03288546ba1196271dd619499e8ff8b9ed
```

The maintenance merge did not promote a new Local Usage Dashboard release.

Production remained:

```text
Product: 3.0.0-alpha.5.73
release-usage-dashboard: 87b934a0e153c1c7ddd77ab44750154cd195f57b
```

Post-merge main/release Git blobs were rechecked exact-equal for at least:

- `plugins/usage-dashboard/runtime/product-manifest.json` — `48fdeb4b67a16cdd40e8bd0bf761dca8ce079037`;
- `plugins/usage-dashboard/latest.js` — `a61a94019e6d3cf67f796202ab6cc0b72bcbf2a5`;
- `plugins/usage-dashboard/runtime/bridge-engine.mjs` — `c9090717394ed4da4458923535f5f089205e65da`.

Therefore E7 infrastructure implementation is product-byte neutral.

---

# 6. E7-E — next real feature-release proof

E7-A/B/C/D are implemented and repository-regression proven.

E7-E remains deliberately open because an infrastructure-only maintenance PR cannot prove the complete new PR/bootstrap/exact-SHA orchestration under a real feature candidate.

The next real Local Usage Dashboard feature release must prove:

```text
source
→ stage
→ CANDIDATE_READY
→ deterministic PR ensure through connected control surface
→ exact-SHA authoritative full validation
→ if RED: source fix → same stage → same PR → new exact-SHA validation
→ GREEN
→ exact-head merge
→ exact-byte promotion
→ deployment receipt
```

Acceptance requires:

- no Actions-token PR creation HTTP 403 on the normal path because Actions no longer owns PR bootstrap;
- no `action_required` close/reopen workaround;
- no replacement branch/PR for ordinary repair;
- no user GitHub UI/settings action;
- full authoritative registry remains required;
- candidate/PR/validated SHA identity remains exact;
- exact-byte production promotion remains unchanged.

Until that real-release evidence exists, E7 is **implemented but operational proof pending**.

---

# 7. Physical verification boundary

E7-A/B/C/D are release-infrastructure maintenance only and changed no production Usage Dashboard bytes, so they require no new PocketRisu update or device acceptance by themselves.

The currently deployed Product remains 5.73. Its separate physical-verification state remains whatever is recorded by the 5.73 release closure; E7 infrastructure maintenance must not fabricate or promote that device status.

---

## Verdict

E7 preserves the strongest proven release guarantees and simplifies only coordination boundaries.

The design principle is now operationally encoded:

> **Simplify by removing coordination state and GitHub-event dependence, not by removing validation layers.**
