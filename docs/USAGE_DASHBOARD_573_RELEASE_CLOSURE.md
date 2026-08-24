# Local Usage Dashboard 5.73 — Release Closure

Status: **REPOSITORY / CI / DEPLOYMENT COMPLETE — PHYSICAL VERIFICATION PENDING**

Recorded: `2026-08-25`

Release:

- Product: `3.0.0-alpha.5.73 — Runtime Weight & Lifecycle Audit`
- Bridge Engine: `1.6.22`
- Bridge Manager: `1.3.0`
- Snapshot / recent-request contracts: `1 / 1`
- Release spec: `.github/usage-dashboard/releases/5.73.json`
- Feature PR: `#248`
- Final source authority: `release/usage-dashboard-573-runtime-weight-lifecycle-audit @ 42d6198d9abdfa2c2cc16144bab29bef7e59b266`
- Final derived candidate: `stage/usage-dashboard-3.0.0-alpha.5.73 @ 85585fa604bb7f98f706bdf88e548855a6e56cc1`
- Main release merge: `bb7e51101da55b2877e5cd0ee6350e058a1e2299`
- Production release branch: `release-usage-dashboard @ 87b934a0e153c1c7ddd77ab44750154cd195f57b`
- Engine SHA-256: `85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69`
- Exact-byte production parity: `VERIFIED`
- Physical verification: `PENDING`

## Release intent

5.73 is the S0 measurement-only release for the Runtime Slimming & Legacy Pruning backlog.

It does not delete compatibility paths, prune retained state, change scheduling, add polling, add source/network calls, or infer unknown values. It adds bounded runtime-weight and lifecycle evidence to **Detailed Diagnostics only** so later cleanup decisions can be evidence-led.

The new plugin source module is:

```text
plugins/usage-dashboard/src/64-runtime-weight-audit.part.js
```

The existing `62-diagnostics-workspace` remains the workspace owner; 5.73 keeps the new audit responsibility isolated in a separate module rather than continuing to grow the workspace module.

## Runtime contract

The 5.73 audit reads existing state, counters and lifecycle handles only.

Protected behavior:

- Basic Diagnostics remains the zero-cost path introduced before 5.73;
- Detailed Diagnostics lazily includes `Runtime Weight Audit`;
- new network calls: `0`;
- new CLI launches: `0`;
- new polling loops: `0`;
- new pruning behavior: `0`;
- heap-byte measurement remains `UNKNOWN` because no authoritative heap-byte source is provided;
- Request Ledger remains bounded by the existing `2000` row contract;
- Engine remains byte-identical to the prior release;
- unknown source values remain `UNKNOWN`, never guessed or coerced to `0`.

The audit exposes bounded evidence for retained state, timer/idle-handle ownership, listener ownership, refresh/resume in-flight state, scheduler counters, Bridge retained work, widget cache shape and existing local normalize/persist/render timings.

The release intentionally reports:

```text
Slimming decision: S0 evidence only · removal classification pending repository/real-device evidence
```

5.73 therefore does **not** authorize a broad S1 cleanup by itself.

## Materialization and regression proof

The generic two-pass release reconciliation remained clean and hash-stable:

```text
MATERIALIZER_IDEMPOTENT:3.0.0-alpha.5.73
```

The final trusted PR validation was `Usage Dashboard Candidate Validation` run `#108`, triggered against exact candidate head `85585fa604bb7f98f706bdf88e548855a6e56cc1` after a trusted user reopen event.

Final authoritative result:

```text
P36 Diagnostics Instant Mode Switch: OK
P37 Runtime Weight & Lifecycle Audit: OK
TEST_REGISTRY_GREEN:78
validated 3.0.0-alpha.5.73 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1
```

P37 specifically proved:

- Detailed-only bounded evidence;
- no new I/O or polling;
- `UNKNOWN` preservation;
- Engine byte identity.

## E6-E operational proof on a real feature release

5.73 was also the first real release used to exercise the E6 repairable single-transaction release flow.

### Initial stage and PR bootstrap gap

The source branch stayed source-only. The trusted stage controller successfully resolved, materialized and wrote the deterministic derived candidate branch.

The first PR-management attempt then failed with:

```text
E6_PR_OR_DISPATCH_FAILED
```

The rejection receipt correctly said that the candidate did not need reconstruction and that the same stage command was safe to retry.

A second stage reused the same source authority and the same derived candidate branch. Materialization/writer work remained GREEN. The `manage_pr` job again failed while attempting GitHub PR creation with HTTP `403`, despite its job-scoped PR/Actions permissions.

No repository setting change and no user GitHub UI action was requested. PR `#248` was created through the connected GitHub control surface against the already-materialized derived candidate.

This is a real infrastructure limitation: GitHub Actions-token PR creation is not currently a portable, config-free PR bootstrap authority for this repository. Future E6 maintenance should simplify that boundary rather than requiring the user to enable repository settings.

### First CI repair — stale P36 release pin

Full PR CI reached P36 and found an inherited stale structural assertion that required product version `3.0.0-alpha.5.72` exactly.

This was not a 5.73 runtime behavior defect. The test was repaired on the **source branch only** so the 5.72 behavior contract stayed locked while the product-version check became current-release-aware.

Repair path:

```text
CI RED
→ source-only P36 repair
→ same /usage-dashboard stage command
→ same stage/usage-dashboard-3.0.0-alpha.5.73 branch
→ same PR #248
```

No `-v2/-v3` candidate branch and no replacement PR were created.

### Second CI repair — P37 mutation-regex false positive

The next exact candidate passed P36 and reached P37. P37's static mutation guard incorrectly interpreted an equality comparison containing `===` as a single assignment because the regex could match the first `=` character.

The audit implementation itself remained read-only.

The P37 test was repaired on the source branch to reject actual single-assignment mutation while excluding strict equality syntax.

The same E6 repair path was used again:

```text
CI RED
→ source-only P37 test repair
→ same /usage-dashboard stage command
→ same derived candidate branch advances fast-forward
→ same PR #248
```

Final source authority became `42d6198d9abdfa2c2cc16144bab29bef7e59b266`; final derived candidate became `85585fa604bb7f98f706bdf88e548855a6e56cc1`.

This proves the core E6 repair property on a real feature release:

```text
source fix
→ same stage command
→ same derived branch
→ same PR
→ authoritative CI rerun
```

Old generated candidate bytes never became source authority and no force push was required.

## Trusted PR-event workaround observed

When the controller advanced the PR head, GitHub marked automatically triggered PR workflows as `action_required` because the new head was bot-authored.

The established no-byte-change workaround was used:

```text
close PR #248
→ reopen PR #248 through the connected user GitHub control surface
→ trusted user pull_request event
→ authoritative validation runs on the same candidate bytes
```

This did not alter the candidate SHA or product bytes. It is an operational GitHub event-trust workaround, not a product repair.

Future release-infrastructure maintenance may remove this extra event choreography, but it must not weaken full PR validation or ask the user to operate GitHub UI.

## Merge and production promotion

After run `#108` completed GREEN, PR `#248` was re-read and confirmed mergeable at exact head:

```text
85585fa604bb7f98f706bdf88e548855a6e56cc1
```

The PR was squash-merged with expected-head protection.

Main release merge:

```text
bb7e51101da55b2877e5cd0ee6350e058a1e2299
```

The existing release classifier / monotonic guard / exact-byte promoter then produced:

```text
release-usage-dashboard
87b934a0e153c1c7ddd77ab44750154cd195f57b
```

The automatic deployment receipt recorded:

```text
UD_RELEASE_DEPLOYED
release: 3.0.0-alpha.5.73
engine: 1.6.22
manager: 1.3.0
contracts: 1 / 1
main_merge_sha: bb7e51101da55b2877e5cd0ee6350e058a1e2299
release_branch_sha: 87b934a0e153c1c7ddd77ab44750154cd195f57b
engine_sha256: 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
exact_byte_parity: VERIFIED
physical_verification: PENDING
```

Promotion performed no rebuild.

## What is closed

The following 5.73 gates are closed:

- source implementation;
- source-only release intent;
- deterministic materialization;
- generic two-pass idempotency;
- full registered regression;
- P37 audit contract;
- exact-head PR merge;
- monotonic exact-byte production promotion;
- production parity verification;
- E6 reentrant source-repair / same-derived-branch / same-PR proof;
- documentation of the Actions-token PR-bootstrap limitation.

## What remains open

Only actual-device acceptance remains for the 5.73 product release.

The durable state is therefore:

```text
repository: COMPLETE
CI: COMPLETE
merge: COMPLETE
production promotion: COMPLETE
exact-byte parity: VERIFIED
physical verification: PENDING
```

Physical verification must not be inferred from repository evidence.

When PocketRisu evidence is later supplied, record it separately as real-device evidence without rewriting the historical repository/CI facts in this closure.

## Next maintenance implications

Two separate follow-ups are allowed after this closure:

1. **E6 PR bootstrap/event trust simplification** — remove dependence on Actions-token PR creation and ideally remove the bot-head `action_required` close/reopen choreography, without weakening the trusted PR validation boundary.
2. **Runtime slimming S1 planning** — only after repository evidence and real-device 5.73 evidence are sufficient to classify an exact path as a safe removal/consolidation candidate.

Do not treat missing real-device evidence as permission to prune. The S0 rule remains: **measure before delete**.
