# Local Usage Dashboard — E6 Repairable Single-Transaction Release Flow

Status: **IMPLEMENTED — E6-A/B/C/D merged; E6-E real-release repair proof RECORDED on 5.73; PR-bootstrap/event-trust hardening remains; physical verification pending**

Recorded: `2026-08-25`

Reference design: Issue `#239`.
Reference retrospective: Issue `#235`.
Implementation PR: `#243`.
Implementation merge SHA: `5343c3c89def76b32e70612f5eee5d0bc780bf13`.
First real feature proof: `3.0.0-alpha.5.73`, PR `#248`.
5.73 closure: `docs/USAGE_DASHBOARD_573_RELEASE_CLOSURE.md`.

## Implementation closure

E6-A/B/C/D are implemented on `main`.

Repository proof from PR `#243` established:

- `Usage Dashboard Candidate Validation` run `#100` GREEN;
- authoritative registry `TEST_REGISTRY_GREEN:77`;
- source/derived candidate preparation contract GREEN;
- repairable stage transaction contract GREEN;
- Product remained `3.0.0-alpha.5.72` during the infrastructure-only implementation;
- Engine remained `1.6.22` with SHA-256 `85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69`;
- Manager remained `1.3.0`;
- contracts remained `1 / 1`;
- the maintenance implementation did not promote a new product release;
- main/release production blobs remained exact-equal after the maintenance merge.

The implementation proof intentionally left E6-E open for the next real feature release because a maintenance PR could not prove the repair loop under actual feature-release pressure.

5.73 supplied that real-release proof.

## Goal

Reduce release coordination state without weakening release validation.

The normal command remains one command:

```text
/usage-dashboard stage <release/usage-dashboard-source-branch>
```

The source branch and generated candidate have different authority.

## Authority split

### Source branch

`release/usage-dashboard-*`

Assistant-authored source of intent only. Generated release output is rejected by stage policy.

### Derived candidate branch

`stage/usage-dashboard-<product-version>`

Controller-owned materialized output only. The assistant does not hand-edit it.

Every stage transaction freezes trusted main and exact source identity before candidate code executes.

The read-only materialization side reconstructs the candidate from trusted main plus exact source intent, runs the release materializer, generic two-pass reconciliation and focused smoke, then emits immutable candidate data for the constrained writer.

## Reentrant repair

A later `/stage` after CI finds a defect does not use previous generated candidate bytes as source authority.

It freezes the repaired source SHA and reconstructs a fresh candidate tree. The new derived candidate commit parents the prior controller-owned candidate head while carrying a freshly reconstructed tree.

Therefore:

- candidate history remains fast-forward-only;
- no force push is used;
- old generated output is never source authority;
- the same derived branch can advance after a source fix;
- the same release PR can be reused;
- ordinary `-v2/-v3` replacement candidate branches are unnecessary.

## Privilege boundary

The E4-B/E5 security boundary remains intact.

### Read-only materialization

- trusted control workflow;
- exact frozen trusted-main/source identities;
- no repository write credential exposed to candidate/materializer/test code;
- release materializer/builders/reconciliation/tests execute only here;
- immutable candidate bundle/tree data produced.

### Write-only derived candidate writer

- repository write authority only where required;
- trusted control-plane checkout only;
- never executes candidate materializer/test code;
- verifies expected parent, digest, path/mode policy and branch CAS;
- fast-forward-only write;
- exact post-write ref verification.

### PR management

The intended design uses a separate trusted PR-management boundary that does not execute candidate code.

The 5.73 real release exposed a portability/configuration limit in the current Actions-token implementation: PR creation returned HTTP `403` despite the job-scoped PR/Actions permissions. This is now a recorded infrastructure defect, not a reason to grant write authority to candidate code and not a reason to ask the user to alter repository settings.

Until simplified, the connected GitHub control surface may bootstrap the already-materialized release PR while preserving the same candidate SHA and ordinary PR validation.

## Receipts

The control plane emits actionable receipts:

- `UD_STAGE_ACCEPTED` with source/candidate identity;
- `UD_CANDIDATE_READY` with exact candidate SHA and readiness state;
- `UD_STAGE_REJECTED` with failure class and safe next action;
- `UD_RELEASE_DEPLOYED` after exact-byte promotion.

The 5.73 first PR-management failure proved the rejection receipt can correctly state:

```text
retry the same stage command; no candidate rebuild is required
```

This is a key E6 operational property.

## Full CI

Stage smoke remains pre-PR protection only. Full authoritative PR regression remains mandatory.

- Engine source changed: registered black-box behavior suite three consecutive GREEN runs before candidate write.
- Plugin source changed without Engine: registered behavior suite once before candidate write.
- Full authoritative test registry remains the PR integration gate.

5.73 final full result:

```text
P36 Diagnostics Instant Mode Switch: OK
P37 Runtime Weight & Lifecycle Audit: OK
TEST_REGISTRY_GREEN:78
```

## Merge and production

Merge authority remains explicit:

- full PR CI GREEN;
- current PR head re-read;
- mergeability re-read;
- exact expected head supplied to squash merge;
- existing classifier and monotonic guard;
- existing exact-byte promotion with no rebuild.

5.73 final identities:

```text
source:    42d6198d9abdfa2c2cc16144bab29bef7e59b266
candidate: 85585fa604bb7f98f706bdf88e548855a6e56cc1
main:      bb7e51101da55b2877e5cd0ee6350e058a1e2299
release:   87b934a0e153c1c7ddd77ab44750154cd195f57b
```

The automatic deployment receipt verified:

```text
release: 3.0.0-alpha.5.73
engine: 1.6.22
manager: 1.3.0
contracts: 1 / 1
engine_sha256: 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
exact_byte_parity: VERIFIED
physical_verification: PENDING
```

## E6-E operational proof — 5.73

5.73 exercised E6 with two real PR-CI repair cycles.

### Stage/PR bootstrap

Initial source stage successfully created/materialized the deterministic derived candidate. PR management then failed with `E6_PR_OR_DISPATCH_FAILED` at GitHub PR creation with HTTP `403`.

A same-command retry reused the source authority and derived candidate; materialization/writer work stayed GREEN. The failure was isolated to PR bootstrap.

PR `#248` was then created through the connected GitHub control surface without modifying candidate bytes or requiring user GitHub UI/settings.

### Repair cycle 1 — P36 stale release assertion

Authoritative CI caught a stale P36 assertion pinned to `3.0.0-alpha.5.72`.

The source branch alone was repaired. Then the exact same stage command was run again.

Result:

```text
same source branch
→ same stage command
→ same derived branch
→ same PR #248
```

No candidate replacement branch or PR supersession was required.

### Repair cycle 2 — P37 mutation-guard false positive

The next candidate reached P37. A static test regex treated strict equality `===` as if it were single assignment. The runtime audit itself was read-only.

P37 was repaired on the source branch only and the exact same stage command was run again.

The same derived branch advanced fast-forward and the same PR `#248` remained the integration surface.

Final candidate `85585fa604bb7f98f706bdf88e548855a6e56cc1` passed the full registry.

### Operational verdict

The following E6 properties are now proven by a real feature release:

1. source branch remains source authority;
2. generated candidate remains controller authority;
3. same stage command is safe after source repair;
4. derived candidate advances fast-forward without force;
5. prior generated bytes do not become source authority;
6. same release PR can survive multiple source repair cycles;
7. full PR CI remains authoritative and can find real/stale test defects;
8. exact-head squash merge remains the final integration gate;
9. existing exact-byte promotion remains authoritative;
10. deployment receipt records exact production parity and physical `PENDING` state.

The intended automatic PR bootstrap is **not** fully proven because Actions-token PR creation returned `403`. That limitation is explicitly separated from the proven reentrant-stage/same-PR architecture.

## Trusted event limitation observed on 5.73

When controller-authored candidate heads advanced PR `#248`, GitHub marked the automatically triggered PR workflows `action_required`.

The established no-byte-change workaround was:

```text
close PR
→ reopen PR through the connected user GitHub control surface
→ trusted pull_request event
→ authoritative validation on identical candidate bytes
```

This required no user GitHub UI interaction but is still avoidable control-plane choreography.

A future maintenance improvement should remove both:

- dependence on Actions-token PR creation where repository policy blocks it;
- the bot-head `action_required` close/reopen workaround where a simpler trusted event path can preserve the same validation guarantees.

Do not solve either problem by weakening PR CI or exposing write credentials to candidate code.

## Emergency fallback

Historical exact-SHA `prepare`, `ready` and `ready-branch` flows remain emergency/diagnostic fallbacks.

They are not the normal repair path.

## Physical verification boundary

Repository/CI/deployment completion is not physical completion.

5.73 actual-device evidence remains `PENDING` until PocketRisu `+` update and runtime acceptance are recorded.

The E6-E release-flow proof is already durable because it concerns source/candidate/PR/CI/merge/promotion behavior in GitHub. Physical proof must be recorded separately and must not be inferred from repository evidence.

## Current follow-up

E6 itself no longer needs a replacement release-flow redesign before normal product work.

The bounded infrastructure follow-up is:

```text
simplify PR bootstrap + trusted PR event activation
while preserving
source/derived authority split
+ same-stage repair
+ fast-forward candidate history
+ full authoritative PR CI
+ exact-head merge
+ exact-byte promotion
+ no user GitHub UI requirement
```

That follow-up is maintenance work and must not change production product bytes by itself.
