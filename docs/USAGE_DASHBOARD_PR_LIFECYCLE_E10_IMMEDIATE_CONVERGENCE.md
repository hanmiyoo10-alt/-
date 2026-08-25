# Local Usage Dashboard — E10 Immediate Convergence

Status: **IMPLEMENTATION IN PROGRESS — E10-A..D maintenance; E10-E real-release proof pending**

Design authority: Issue `#365`.
Feedback input: Issue `#363` from the first real E9 release, Product `3.0.0-alpha.5.76`.

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

## E10-A — promotion-complete wake

5.76 exposed a safe timing gap: the merged-PR reducer wake could observe old production and exit `DEPLOYMENT_PENDING`, while the promoter completed afterward without directly waking the reducer.

E10 extends the existing reducer with:

```text
workflow_run:
  workflows: ["Usage Dashboard Exact-Byte Promotion"]
  types: [completed]
```

Only successful upstream promotion runs execute the reducer. This wake is read-only with respect to candidate and production refs. The reducer independently re-reads the durable request, merged PR, production SHA/version and exact blob parity.

The existing 5-minute schedule remains anti-loss recovery only.

Acceptance:

```text
merge
→ exact-byte promotion succeeds
→ promotion-complete wake
→ production parity
→ same durable request DEPLOYED / closed
```

No issue edit and no normal schedule wait.

## E10-B — exact-source materializer syntax readiness

`source_readiness_e9.cjs` remains the single readiness subsystem. For the exact requested source SHA it now:
1. reads the exact release spec;
2. resolves the spec-selected materializer;
3. reads that exact materializer from the exact source SHA;
4. parses Python syntax with `ast.parse` without executing release code;
5. emits `SOURCE_SHA_NOT_READY:materializer-syntax` on syntax failure.

Plugin `.part.js` fragments are not standalone-parsed. Existing boundary checks, stage behavior smoke and full exact-SHA regression remain authoritative.

Acceptance: the 5.76 smart-quote invalid-Python class fails before stage dispatch and before candidate mutation.

## E10-C — one-shot generation qualification

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

A closed/already-qualified generation issue becomes a permanent no-op for later releases in that generation.

## E10-D — E9 evidence closure

`docs/USAGE_DASHBOARD_PR_LIFECYCLE_E9_DURABLE_TRANSACTION.md` now records E9-F COMPLETE using the exact 5.76 proof:
- source `5833a65a...`;
- candidate `22da0cef...`;
- validation `32834686344` GREEN;
- `TEST_REGISTRY_GREEN:85`;
- main merge `ab59b81e...`;
- production `8635e826...`;
- exact-byte parity VERIFIED.

The post-promotion wake gap is recorded as convergence feedback, not a release-safety failure.

## E10-E — next real release proof

After E10-A..D are merged/regression-proven, the next real Local Usage Dashboard feature release must prove:

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

## Maintenance implementation boundary

E10-A..D is release-control maintenance only. It must not intentionally modify:
- `plugins/usage-dashboard/latest.js`;
- `plugins/usage-dashboard/runtime/bridge-engine.mjs`;
- Product/Engine/Manager/contracts tuple;
- `release-usage-dashboard` production bytes.

Post-merge main/release blob parity is required before E10-A..D is considered complete.

## Current target state

```text
E9 safety model: RETAINED
E10-A: implementation pending proof
E10-B: implementation pending proof
E10-C: implementation pending proof
E10-D: implementation pending proof
E10-E: next real release proof pending
```

## Principle

> **Do not redesign proven safety; remove waits and special cases while keeping exact identities authoritative.**
