# Local Usage Dashboard E23 — Accepted Baseline Handoff Simplification

Status: **DESIGN FROZEN / IMPLEMENTATION NOT STARTED**

Canonical issue: `#1611`  
Design transaction: `#1612`  
Design branch: `design/usage-dashboard-e23-accepted-baseline-handoff-simplification`

## 1. Purpose

E23 is the next byte-neutral release-control maintenance step after the narrowed E22 design.

The objective is deliberately smaller than another release controller:

> Preserve the current stability and authority graph, while removing repeated manual reconstruction of the physically accepted baseline when preparing the next Product release specification.

E23 is primarily **simplicity + automation**. Stability is a preserved invariant, not a new authority layer.

## 2. Fresh repository evidence

Fresh main at design start:

`538273b14e6d86cffdf49a85692de6678fc2d86c`

Current production evidence:

- latest deployed Product: `3.0.0-alpha.5.101`;
- production branch: `release-usage-dashboard`;
- production SHA: `fa27d1dd6eaa17a8388c96da475ea3965e0572c8`;
- Product `3.0.0-alpha.5.101` / Engine `1.6.36` / Manager `1.3.6` / CLI `1.10.0` / Models `1.280.0` / contracts `1/1`;
- exact-byte promotion receipt: VERIFIED;
- current 5.101 physical state: PENDING until user-supplied PocketRisu evidence is recorded.

Latest physically accepted baseline:

- Product `3.0.0-alpha.5.100`;
- production SHA `478fcd368734b1cf1aa5a98932cb34bb29f1d1e4`;
- physical authority: feature issue `#1540`, comment `5553562006` (`PASS_PHYSICAL`);
- release acceptance handoff: request `#1549`, comment `5553562775`.

This is the exact real state E23 must preserve:

```text
latest deployed = 5.101
latest physically accepted = 5.100
```

E23 must never collapse those two concepts.

## 3. Existing authority remains sealed

E23 must preserve the E17 stability envelope and existing authority graph:

```text
E13 -> E14 -> E15 -> E9 -> E11 -> E16
-> assistant fresh reread
-> expected-head merge
-> exact-byte promotion
-> separate physical acceptance
```

E23 is a maintenance/design label only.

Forbidden:

```text
release_generation: E23
```

E23 does not replace or reopen:

- E17 stability-envelope authority;
- E20 structured `releaseEvidence` authority;
- E21 canonical `evidenceView` consumer compatibility;
- E22 deployment/physical projection and physical acceptance binding;
- E7 staging/materialization authority;
- E9 durable request transaction authority;
- E11/E16 merge authority;
- exact-byte promotion authority;
- user-supplied physical acceptance authority.

## 4. Why E23 is needed

The 5.101 release specification correctly embeds the accepted 5.100 physical baseline in E20 structured evidence:

```json
{
  "releaseEvidence": {
    "schemaVersion": 1,
    "acceptedBaseline": {
      "productVersion": "3.0.0-alpha.5.100",
      "releaseSha": "478fcd368734b1cf1aa5a98932cb34bb29f1d1e4",
      "verdict": "accepted",
      "issue": 1540,
      "commentId": 5553562006
    },
    "latestInstalled": {
      "productVersion": "3.0.0-alpha.5.100",
      "releaseSha": "478fcd368734b1cf1aa5a98932cb34bb29f1d1e4",
      "verdict": "accepted",
      "issue": 1540,
      "commentId": 5553562006
    }
  }
}
```

The shape is correct and remains authoritative.

The remaining friction is that every new Product release can still require the assistant/materializer to reconstruct version, release SHA, physical issue, physical comment, verdict, and note text manually.

That duplication creates avoidable drift risk even though the canonical physical truth already exists in durable repository evidence.

E23 removes only that reconstruction step.

## 5. Core thesis

**Do not persist another “latest baseline” state file.**

E22 owns the canonical interpretation of deployment and physical acceptance. E23 consumes the E22 projection and derives the exact existing E20 release-evidence handoff for the next release transaction.

Conceptually:

```text
repository deployment + physical receipts
        |
        v
E22 acceptance projector
        |
        | exact latest physically accepted identity
        v
E23 baseline handoff projector
        |
        v
existing E20 releaseEvidence shape
        |
        v
next release spec/materializer
```

E23 therefore has no independent truth and no independent mutable state.

## 6. Stability — preserve, do not expand

### S1. Exact accepted identity only

E23 may derive a baseline only from an E22 projection that identifies an exact physically `ACCEPTED` release with at least:

- exact Product version;
- exact `release-usage-dashboard` SHA;
- exact physical evidence issue;
- exact physical evidence comment ID;
- verdict `ACCEPTED`;
- no blocking E22 conflict finding for that identity.

Missing data fails closed.

### S2. Pending deployed release never replaces accepted baseline

If:

```text
latest deployed = 5.101 @ fa27d1dd...
physical = PENDING
latest accepted = 5.100 @ 478fcd36...
```

then E23 must derive 5.100 for both existing E20 accepted roles.

It must not treat production branch head as accepted physical truth.

### S3. Rejected or conflict release never replaces accepted baseline

A newer deployment with:

```text
physical = REJECTED
```

or:

```text
composite = CONFLICT
```

must not advance the accepted baseline.

The prior exact accepted release remains authoritative.

### S4. UNKNOWN remains UNKNOWN

E23 may not synthesize:

- missing comment IDs;
- missing SHA;
- missing verdict;
- missing Product version;
- an accepted release from a closed issue;
- an accepted release from successful CI/promotion;
- an accepted release from elapsed time or lack of errors.

### S5. No authority inversion

E23 may validate and derive a handoff. It may not:

- post physical acceptance on its own;
- close/reopen release issues;
- mutate production;
- change promotion state;
- reinterpret an E22 conflict as accepted;
- rewrite historical release specs.

## 7. Simplicity — primary goal

### C1. One pure handoff owner

Tentative implementation owner:

```text
plugins/usage-dashboard/tools/release_baseline_handoff_e23.cjs
```

It should be a pure module over supplied objects.

No network calls. No GitHub calls. No filesystem discovery inside the projection function. No mutation.

Conceptual interface:

```js
resolveAcceptedBaselineHandoff(e22Projection, options) => Object.freeze({
  ok: true | false,
  releaseEvidence: object | null,
  acceptedIdentity: object | null,
  findings: readonlyArray
})
```

### C2. Output existing E20 shape, not E23 schema

Successful output must use the already-authoritative E20 structure:

```js
{
  schemaVersion: 1,
  acceptedBaseline: {
    productVersion,
    releaseSha,
    verdict: 'accepted',
    issue,
    commentId,
    note
  },
  latestInstalled: {
    productVersion,
    releaseSha,
    verdict: 'accepted',
    issue,
    commentId,
    note
  }
}
```

E23 must not add unknown top-level E20 fields merely to label itself.

### C3. `latestInstalled` semantics stay sealed

E23 must not reinterpret E20 `latestInstalled` as “latest deployed production”.

Under the current repository contract, the next release spec continues to use the exact physically accepted installed baseline. Therefore deployed/PENDING 5.101 does not replace accepted 5.100 in E20 evidence.

If E20 semantics ever need changing, that requires a separate redesign rather than an E23 shortcut.

### C4. No persistent handoff artifact

Forbidden new sources of truth include:

```text
latest-accepted.json
accepted-baseline.json
current-physical-baseline.json
state/accepted-release.txt
```

The handoff must be derived on demand from canonical evidence.

### C5. Product materializers should stop owning baseline selection

Future Product release materializers may consume the derived E23 handoff, but should not each implement their own search/order/physical-verdict logic.

Release-specific code may still add release-specific note wording only when it does not alter identity or verdict truth.

## 8. Automation — primary goal

### A1. Automatic next-release baseline derivation

Once E22 provides canonical accepted state, the next release source-intent preparation should be able to derive E20 `releaseEvidence` without manually typing the accepted Product/SHA/issue/comment tuple.

### A2. Automatic hold on pending/rejected latest deployment

No special manual branch is needed when the newest production release is not accepted.

The same pure derivation should naturally keep the previous accepted baseline.

Real fixture:

```text
5.100 ACCEPTED
5.101 DEPLOYED + PENDING
=> next baseline = 5.100
```

Future fixture:

```text
5.100 ACCEPTED
5.101 ACCEPTED
=> next baseline = 5.101
```

Rejected fixture:

```text
5.100 ACCEPTED
5.101 DEPLOYED + REJECTED
=> next baseline = 5.100
```

### A3. Shift-left mismatch detection

If a newly authored release spec contains `releaseEvidence` that disagrees with the E23 derived handoff available for the same source-freeze authority, generic preflight should fail closed before expensive candidate validation.

This is validation reuse, not a new release writer.

### A4. No new workflow stage

E23 should prefer existing source-readiness/preflight integration.

Do not create:

- `usage-dashboard-e23.yml`;
- a scheduled E23 reconciler;
- another issue-comment bot;
- another release-state queue.

### A5. Assistant workflow remains simple

Desired future path:

```text
user real-device evidence
-> ChatGPT records E22 physical receipt
-> E22 projects accepted state
-> next release preparation calls E23 handoff
-> release spec receives exact E20 evidence
```

The user performs no additional work.

## 9. Findings

Tentative deterministic finding codes:

```text
E23_ACCEPTED_BASELINE_MISSING
E23_ACCEPTED_IDENTITY_INCOMPLETE
E23_ACCEPTED_IDENTITY_CONFLICT
E23_E22_PROJECTION_CONFLICT
E23_RELEASE_EVIDENCE_MISMATCH
E23_ACCEPTED_ORDER_AMBIGUOUS
```

Findings must never be coerced into a fallback version or zero-like identity.

## 10. Maximum implementation surface

Expected allowed files:

```text
plugins/usage-dashboard/tools/release_baseline_handoff_e23.cjs
plugins/usage-dashboard/tests/e23-accepted-baseline-handoff-contract.cjs
plugins/usage-dashboard/tools/release_generic_preflight.cjs   # bounded validation integration only if needed
plugins/usage-dashboard/tests/test-registry.cjs               # only if explicit registration is needed
```

A small shared fixture/helper edit is allowed only when implementation evidence proves it necessary.

Not allowed without design amendment:

```text
plugins/usage-dashboard/latest.js
plugins/usage-dashboard/src/**
plugins/usage-dashboard/runtime/**
plugins/usage-dashboard/runtime-src/**
scripts/bootstrap-usage-dashboard.sh
release-usage-dashboard mutation logic
E20 release-evidence schema changes
E21 evidence-view semantic changes
E22 physical/deployment authority changes
new workflow stage
new scheduler/poller
new persistent baseline state file
new auto-merge or promotion writer
```

E23 is intended to be Product/Plugin/Engine/Manager/bootstrap byte-neutral.

## 11. Regression matrix

E23 implementation must prove at minimum:

1. accepted 5.100 + deployed/pending 5.101 derives accepted baseline 5.100;
2. accepted 5.101 derives accepted baseline 5.101;
3. deployed/rejected 5.101 preserves accepted 5.100;
4. deployed/conflict 5.101 preserves accepted 5.100 and emits a deterministic finding when required;
5. no accepted identity fails closed;
6. accepted identity missing Product version fails closed;
7. accepted identity missing production SHA fails closed;
8. accepted identity missing physical issue/comment binding fails closed;
9. E23 output validates through the existing E20 release-evidence contract;
10. E21 `evidenceView` consumes E23-produced E20 evidence without special E23 branching;
11. E23 does not map latest deployed/PENDING into E20 `latestInstalled`;
12. a manually authored mismatching baseline is rejected shift-left if integration is enabled;
13. repeated derivation is deterministic/idempotent;
14. no network/filesystem/process I/O is performed by the pure projector;
15. E17 stability-envelope contract remains GREEN;
16. E20 structured release-evidence contract remains GREEN;
17. E21 evidence-consumer convergence remains GREEN;
18. narrowed E22 acceptance projector contract remains GREEN;
19. E9 durable deployment auto-close remains GREEN and unchanged unless a proven regression requires a bounded fix;
20. exact-byte promotion/monotonic release tests remain GREEN;
21. full discovered Usage Dashboard registry remains GREEN;
22. no Product/Plugin/Engine/Manager/bootstrap/runtime artifact bytes change.

Do not freeze a registry-count integer.

## 12. Implementation dependency and entry gate

E23 design may freeze before E22 implementation.

E23 implementation must not begin until the narrowed E22 projector is implemented and validated, because E23 consumes E22 accepted-state projection rather than recreating deployment/physical comment parsing.

Entry conditions:

1. E22 pure projector exists and is GREEN;
2. E22 provides exact accepted identity or explicit absence/conflict;
3. E20/E21 remain sealed and GREEN;
4. current main and production are freshly reread;
5. no separate E23 authority already exists;
6. implementation can remain byte-neutral.

If E23 would need to parse GitHub comments independently because E22 does not provide enough information, stop and amend E22/E23 design instead of duplicating truth logic.

## 13. Relationship to product releases

E23 does not reserve Product `5.102` or any other Product version.

It is release-control maintenance. A later Product version remains independently designed from fresh upstream/product evidence.

A future Product release spec may state that its baseline evidence was *derived through E23*, but its durable release generation remains the existing release generation authority, not E23.

## 14. Physical boundary

E23 itself needs no device test because it changes no runtime/product bytes.

Real-device physical acceptance remains external authority supplied by the user. E23 only consumes the accepted identity after E22 has validated that evidence.

## 15. Frozen verdict

**Preserve stability. Reduce manual baseline reconstruction. Automate only derivation and validation.**

E23 is frozen around three rules:

1. **Stability stays sealed:** no authority-graph change, no inferred physical acceptance, no runtime/release writer.
2. **Simplicity improves:** one pure handoff owner, no persistent latest-baseline file, no per-release baseline-selection logic.
3. **Automation improves:** exact physically accepted identity automatically becomes the next release's existing E20 `releaseEvidence`, while newer PENDING/REJECTED/CONFLICT deployments cannot displace it.

Implementation remains **NOT STARTED** until E22 is implemented and validated.