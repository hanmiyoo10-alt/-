# Local Usage Dashboard — E21 / E22 Feedback after 5.100

Status: **FEEDBACK RECORDED / NO E22 DESIGN FROZEN**

Recorded: `2026-09-05`

## Fresh baseline

The repository baseline for this feedback is the merged Local Usage Dashboard 5.100 release:

- Product: `3.0.0-alpha.5.100`
- Engine: `1.6.35`
- Manager: `1.3.6`
- managed CLI: `1.10.0`
- managed Models: `1.280.0`
- contracts: snapshot `1` / recent-request `1`
- main merge: `ca84419a176a047482d500497d2bba44926f41ef`
- production release branch: `478fcd368734b1cf1aa5a98932cb34bb29f1d1e4`
- exact-byte production parity: `VERIFIED`
- physical verification: `PENDING`

5.100 is therefore repository/CI/deployment complete and still waiting only for PocketRisu real-device acceptance.

## E21 feedback

E21 is already a completed maintenance layer and should stay sealed.

Canonical closure: `docs/USAGE_DASHBOARD_E21_IMPLEMENTATION_CLOSURE.md`.

The E21 value is clear:

- E20 structured evidence remains the authority;
- generic evidence consumers converge through one compatibility/view owner;
- raw evidence representation drift is rejected by regression canaries;
- version ordering has one shared pure owner and parity against monotonic publisher policy;
- synthetic forward structured evidence is exercised before a real Product bump;
- runtime/release bytes remain unaffected;
- physical acceptance remains a separate real-device boundary.

5.98, 5.99 and 5.100 all continued to require E21 GREEN, which is the intended result: E21 is infrastructure that later product releases consume, not a feature that needs to keep growing.

Recommendation: **KEEP E21 SEALED.** Do not turn E21 into a catch-all for later release lifecycle work.

## Is there already an E22?

No canonical Local Usage Dashboard E22 design/closure/test owner is present in the current repository baseline.

Do not assign the E22 number retroactively to unrelated historical references. If an E22 is introduced, it should be a new explicitly designed maintenance layer with a narrow authority boundary.

## What 5.100 exposed after E21

The 5.100 transaction showed that the remaining friction is no longer evidence representation inside release specs. It is **release lifecycle closure across durable request, deployment receipt and physical acceptance**.

Observed boundary:

1. durable release request `#1549` carried source/spec/PR identity;
2. deterministic candidate and PR were produced correctly;
3. exact-head merge and exact-byte promotion succeeded;
4. the promotion workflow posted `UD_RELEASE_DEPLOYED` to the release PR and shared evidence issue `#197`;
5. the durable release request itself still needed a separate assistant-side repository comment to carry the final deployment state;
6. physical acceptance correctly remained `PENDING` and cannot be inferred from CI;
7. the next release spec will again need source-backed accepted/latest-installed evidence from the completed real-device acceptance.

None of these are E21 representation problems. They are lifecycle-convergence problems after deployment.

## Recommended E22 direction

If E22 is created, the strongest bounded candidate is:

> **E22 — Durable Release Closure Convergence**

Goal: make one durable release request carry the complete monotonic lifecycle from source intent through production deployment and later real-device acceptance, without adding runtime authority or inferring physical evidence.

### Proposed lifecycle

A release request may move monotonically through repository-backed states such as:

```text
REQUESTED
-> SOURCE_READY
-> CANDIDATE_READY
-> PR_READY
-> MERGED
-> DEPLOYED_PENDING_PHYSICAL
-> ACCEPTED
```

A real-device rejection should be recorded explicitly rather than silently converted to UNKNOWN or ACCEPTED.

The exact state vocabulary should be frozen only in a dedicated design; the key requirement is monotonic, source-backed closure.

### E22 should own

- canonical projection of the existing source/candidate/PR/deployment receipts onto the durable release request;
- automatic posting of the exact-byte deployment receipt to that durable request after successful promotion;
- a bounded parser/view for current lifecycle state so the assistant does not have to manually reconstruct it from several issue threads;
- explicit `physical_verification: PENDING` after deployment;
- assistant-side recording of user-supplied PocketRisu evidence as the only path to physical `ACCEPTED`/rejected outcome;
- next-release evidence lookup from that accepted durable record, while preserving E20/E21 evidence semantics;
- regression proving CI/deployment can never manufacture physical acceptance.

### E22 must not own

- plugin runtime bytes;
- Engine or Manager runtime behavior;
- new network/CLI/package-fetch loops;
- product request identity;
- release version choice;
- merge or promotion authority;
- a replacement for E20 structured release evidence;
- a replacement for E21 canonical evidence view;
- automatic physical acceptance;
- rewriting historical release specs or historical acceptance records.

## Why this is preferable to more E21 work

Extending E21 would mix two different concerns:

- E21: **how release evidence representations are consumed safely**;
- proposed E22: **how one release transaction reaches durable closure after those representations and release gates already work**.

Keeping them separate preserves the current architecture and makes regressions easier to localize.

## Priority feedback

Recommended order:

1. finish 5.100 PocketRisu physical acceptance first;
2. keep E21 sealed;
3. if the real-device acceptance flow confirms the same multi-thread/manual closure friction, freeze an E22 Durable Release Closure Convergence design;
4. make E22 byte-neutral maintenance with dedicated regression before the next product feature release;
5. only then start the next product mini-design.

Do not make E22 merely because the number is available. Its justification should be the observed durable-closure gap, not sequence numbering.

## Verdict

**E21: KEEP SEALED.** It is implemented, validated and doing its job.

**E22: NOT YET CANONICAL.** If introduced, the best next layer is Durable Release Closure Convergence: unify request -> deployment -> physical-acceptance evidence without changing release or runtime authority.
