# Local Usage Dashboard — E10 Immediate Convergence

Status: **IMPLEMENTED — E10-A..D merged/regression-proven; E10-E real-release proof PENDING**

Design authority: Issue `#365`.
Feedback input: Issue `#363` from the first real E9 release, Product `3.0.0-alpha.5.76`.
Implementation PR: `#366`.
Implementation merge: `78ea71348e6644bd6c313f9161c369508566ddbd`.

## Objective

E10 keeps the proven E9 safety model and removes three remaining orchestration frictions:

```text
1. promotion-complete wake
2. exact-source materializer syntax readiness
3. one-shot generation qualification
```

E10 adds:

```text
new public release states: 0
new candidate/production ref writers: 0
new release state machines: 0
```

## Inherited safety — unchanged

E10 retains:
- one durable release request;
- exact source SHA authority;
- source-of-intent branches and generated-output denial;
- controller-owned deterministic candidate refs;
- CAS / fast-forward-only / postverify candidate writes;
- exact-SHA full registered Usage Dashboard validation;
- `VALIDATED_SHA == CURRENT_PR_HEAD_SHA == CURRENT_CANDIDATE_SHA` before merge;
- assistant-owned expected-head squash merge;
- monotonic exact-byte promotion without rebuild;
- independent main/release parity verification;
- no connected candidate/production ref mutation;
- physical verification as a separate user boundary.

## E10-A — promotion-complete wake — IMPLEMENTED

5.76 exposed a safe timing gap: the merged-PR reducer wake could observe old production and exit `DEPLOYMENT_PENDING`, while the promoter completed afterward without directly waking the reducer.

E10 extends the existing reducer with:

```text
workflow_run:
  workflows: ["Usage Dashboard Exact-Byte Promotion"]
  types: [completed]
```

Only successful upstream promotion runs execute the reducer. This wake is read-only with respect to candidate and production refs. The reducer independently re-reads the durable request, merged PR, production SHA/version and exact blob parity.

The existing 5-minute schedule remains anti-loss recovery only.

Acceptance target for the next real release:

```text
merge
→ exact-byte promotion succeeds
→ promotion-complete wake
→ production parity
→ same durable request DEPLOYED / closed
```

No issue edit and no normal schedule wait.

Post-implementation activation proof exists independently of E10-E: after maintenance PR #366 merged, the new `workflow_run` path actually fired `Usage Dashboard Durable Release Reconciler` run `32837370772`, which completed SUCCESS. No open durable feature-release request existed, so this proves trigger activation and safe idle behavior only; it does not substitute for the E10-E real-release proof.

## E10-B — exact-source materializer syntax readiness — IMPLEMENTED

`source_readiness_e9.cjs` remains the single readiness subsystem. For the exact requested source SHA it now:
1. reads the exact release spec;
2. resolves the spec-selected materializer;
3. reads that exact materializer from the exact source SHA;
4. parses Python syntax with `ast.parse` without executing release code;
5. emits `SOURCE_SHA_NOT_READY:materializer-syntax` on syntax failure.

Plugin `.part.js` fragments are not standalone-parsed. Existing boundary checks, stage behavior smoke and full exact-SHA regression remain authoritative.

The focused E10 contract includes a smart-quote invalid-Python fixture and proves this class fails before stage dispatch/candidate mutation.

## E10-C — one-shot generation qualification — IMPLEMENTED

Normal release closure and generation qualification are separate concerns.

Normal durable release closure remains repeatable/idempotent for every release.

Generation qualification runs only when:
- the configured generation issue is open; and
- its proof marker is absent; and
- a real release has reached verified `DEPLOYED`.

Supported durable generations during the E9→E10 transition are `E9` and `E10`.

Markers:

```text
E9  → E9_F_RELEASE_PROOF      → Issue #356
E10 → E10_REAL_RELEASE_PROOF  → Issue #365
```

A closed/already-qualified generation issue becomes a permanent no-op for later releases in that generation. The normal release closure path does not depend on generation qualification remaining open.

## E10-D — E9 evidence closure — COMPLETE

`docs/USAGE_DASHBOARD_PR_LIFECYCLE_E9_DURABLE_TRANSACTION.md` now records E9-F COMPLETE using the exact 5.76 proof:
- source `5833a65a21c9ce5b7ae346a4e9523a5718a1cff7`;
- candidate `22da0cef846623d5d5d09150b87149238e198cac`;
- validation `32834686344` GREEN;
- `TEST_REGISTRY_GREEN:85`;
- main merge `ab59b81e058b6aea48f15d2ecfc0e83ee9d6311a`;
- production `8635e8265ad183b4355c6a1e727262e7dee1c099`;
- exact-byte parity VERIFIED.

The post-promotion wake gap is recorded as convergence feedback, not a release-safety failure.

## E10-A..D implementation / regression evidence

Maintenance branch:

```text
maintenance/usage-dashboard-e10-immediate-convergence
```

Implementation PR #366 final validated head:

```text
c562a2f132a2d5a99b03968a9723d2da89ae9ce1
```

Final authoritative maintenance regression:

```text
Usage Dashboard Candidate Validation: 32837195713 — SUCCESS
usage-dashboard E9 durable release transaction contract: GREEN
usage-dashboard E10 immediate convergence contract: GREEN
P35 / P38 / P39 / P40: GREEN
TEST_REGISTRY_GREEN:86
Product / Engine / Manager / contracts: 3.0.0-alpha.5.76 / 1.6.22 / 1.3.0 / 1/1
Engine SHA256: 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
SimCore CI: SUCCESS
```

PR #366 was re-read with the same validated head, unchanged base and `mergeable=true`, then squash-merged using `expected_head_sha`.

Main implementation merge:

```text
78ea71348e6644bd6c313f9161c369508566ddbd
```

### Retained RED evidence

Two pre-merge REDs were retained rather than hidden:
1. run `32836903109`: E9 documentation contract expected the old exact text `A / M / D / R / T` after the runbook was simplified to semantically identical `A/M/D/R/T`; the contract token was aligned. No release-control behavior changed.
2. run `32837010391`: the new E10 test fixture referenced `release.releaseSpecPath`; the authoritative helper exposes `specPath`. The fixture was corrected. The E9 release-control contract was already GREEN in that run.

Neither RED changed candidate, main production artifacts or `release-usage-dashboard`.

## Maintenance byte-neutral closure

E10-A..D is release-control maintenance only. Post-merge production remained:

```text
Product: 3.0.0-alpha.5.76
Engine: 1.6.22
Manager: 1.3.0
Contracts: 1 / 1
release-usage-dashboard: 8635e8265ad183b4355c6a1e727262e7dee1c099
```

Direct main/release blob parity after merge:

```text
product-manifest.json: 9e4ff2c797cf7f2ce2f73a90708435fa96afe28a
latest.js:             5f1a22b1b5e7b6367a3c72e914bd3384e8294218
bridge-engine.mjs:     c9090717394ed4da4458923535f5f089205e65da
```

No product version bump, product rebuild or production promotion was performed by E10 maintenance.

## E10-E — next real release proof — PENDING

The next real Local Usage Dashboard feature release must prove:

```text
one durable request
→ exact SOURCE_SHA_READY including materializer syntax
→ trusted stage
→ one deterministic candidate
→ one deterministic PR
→ automatic exact-SHA full registry
→ assistant expected-head merge
→ exact-byte promotion
→ promotion-complete wake
→ production parity
→ automatic durable request DEPLOYED closure
→ exactly one E10_REAL_RELEASE_PROOF
```

Required operational acceptance:
- no user GitHub action;
- no stage/validate slash command;
- no PR close/reopen choreography;
- no issue no-op edit for deployment closure;
- no normal reliance on the 5-minute schedule;
- no connected candidate/production ref mutation;
- physical verification remains separate.

## Deliberately retained assistant boundaries

The connected assistant still:
- ensures/reuses the deterministic PR and records `pr_number`;
- re-reads current PR head/mergeability;
- performs expected-head squash merge.

E10 does not broaden GitHub Actions main/ref write authority merely to reduce visible step count.

## Current state

```text
E9 safety model: RETAINED
E10-A: IMPLEMENTED / promotion wake activation PROVEN
E10-B: IMPLEMENTED / REGRESSION-PROVEN
E10-C: IMPLEMENTED / REGRESSION-PROVEN
E10-D: COMPLETE
E10-E: REAL-RELEASE PROOF PENDING
```

5.76 PocketRisu physical verification remains separately PENDING in Issue #359 and is never inferred from maintenance or repository evidence.

## Principle

> **Do not redesign proven safety; remove waits and special cases while keeping exact identities authoritative.**
