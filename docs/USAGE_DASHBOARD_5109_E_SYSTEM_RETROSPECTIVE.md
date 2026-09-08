# Local Usage Dashboard 5.109 E-system retrospective

Date: 2026-09-09

Scope: the real `3.0.0-alpha.5.109` DevPass Recent Billing History release transaction, from source readiness through exact-SHA validation, fresh-main merge authority, exact-byte promotion, and deployment receipt.

## Executive verdict

The E-system was **strong on safety and weak-to-moderate on convergence efficiency** in 5.109.

The most important correction to a superficial reading is that **E27 itself did not fail to protect the current release**. For the 5.109 candidate, E27 correctly ran the declared new regression `p76-devpass-billing-history.cjs` plus E21 before candidate authority advanced, and that focused preflight was GREEN. The repeated RED churn appeared later inside the authoritative full registry because the E27 *meta-contract* executed the historical 5.108 P75 regression inside the live 5.109 checkout/current-release context.

That is a transition-context isolation defect in the validation architecture, not a DevPass billing-history product defect and not evidence that E27 should simply grow into another full-registry gate.

At the same time, E9, E11, E16, and exact-byte promotion all behaved as intended: exact candidate mistakes were rejected, stale-main authority was refused, stale merge capsules were not reused, expected-head merge was enforced, and production advanced monotonically with exact-byte parity.

**Overall assessment: B+**. Fail-closed authority safety is already high. The next gain should come from eliminating avoidable candidate churn while preserving the same authority boundaries.

## Release facts

Final release lineage:

- release: `3.0.0-alpha.5.109`
- feature: DevPass Recent Billing History
- feature issue: `#1916`
- design PR: `#1917`
- durable release request: `#1918`
- release PR: `#1919`
- final source SHA: `320a2733229eb4ec8ae25e1da1fab8318c5ef823`
- final candidate SHA: `c0a4880e0685e7366a8d068e6207f2a5d46cf726`
- frozen main for final candidate: `44b7264f3b0d497161036d706c1c042414b7d9d1`
- merge SHA: `f986e59d290afa5ff2fd0a75478aa183660cba2f`
- release branch SHA: `2d09d4e714c23c14cae96f5561aa8bfd79fc1aaa`
- deployed Engine: `1.6.43`
- deployed Manager: `1.3.6`
- deployed CLI: `1.10.0`
- deployed Models: `1.280.0`
- contracts: `snapshot:1`, `recentRequest:1`
- engine SHA256: `85530cd53bfeb7f5b410b3cb33e27528cf55be6279211487eec2bdcc8eec3179`
- exact-byte parity: `VERIFIED`

## What worked well

### 1. Source readiness failed early on a real authoring defect

Before staging, source readiness rejected a 5.109 source SHA with:

- `SOURCE_SHA_NOT_READY`
- `reason_code: release-spec-contract`
- `text-too-long@highlights[2]=162`

This is exactly the kind of cheap, deterministic failure that belongs before candidate publication. The system prevented an invalid release-spec shape from consuming later E9/E11 machinery.

**Verdict: strong.**

### 2. E27 correctly shifted the current release's local logical proof left

For the 5.109 candidate, reconciliation showed all of the following before the full registry:

- current release contract GREEN
- P76 DevPass billing-history contract GREEN
- E21 evidence consumer convergence GREEN
- `UD_E27_FOCUSED_PREFLIGHT:GREEN:plugins/usage-dashboard/tests/p76-devpass-billing-history.cjs`
- `E27_FOCUSED_PREFLIGHT_GREEN:.github/usage-dashboard/releases/5.109.json`

So the 5.108 retrospective's E27 objective was actually realized: the current release's declared new regression did not have to wait for the full 146-test registry to prove its central product contract.

**Verdict: E27's current-release execution model is sound and should remain narrow.**

### 3. E9 remained the correct ultimate exact-SHA authority

E9 bound the durable request, PR, and exact candidate SHA, checked out that exact candidate, then ran the generic reusable validator. Candidate identities were not inferred from moving branches.

This mattered because 5.109 encountered multiple different candidate SHAs. Old GREEN evidence was not treated as authority for a newer candidate.

**Verdict: strong.**

### 4. E11 and E16 stopped stale-main merges instead of optimizing safety away

Main advanced after otherwise-GREEN validation. E11 identified stale frozen-main ancestry and refused merge. The source branch was refreshed onto current main, restaged, and revalidated. E16 then emitted a merge capsule binding the final candidate and exact fresh-main SHA.

For the final transaction:

- candidate: `c0a4880e0685e7366a8d068e6207f2a5d46cf726`
- fresh main: `44b7264f3b0d497161036d706c1c042414b7d9d1`
- merge guard: `MERGE_READY_NO_DRIFT`

The assistant re-read PR head, main, and mergeability immediately before expected-head merge. That is the correct fail-closed behavior.

**Verdict: excellent merge safety.**

### 5. Promotion was clean and monotonic

The release branch was independently confirmed at the accepted 5.108 baseline before promotion. The official promotion workflow then:

1. classified the merged change as a release candidate,
2. promoted exact tested Git blobs,
3. advanced `release-usage-dashboard`,
4. verified production parity,
5. posted a deployment receipt.

The receipt bound:

- main merge SHA,
- release branch SHA,
- Product/Engine/Manager/contracts,
- Engine SHA256,
- `exact_byte_parity: VERIFIED`.

No manual release-ref bypass was used.

**Verdict: excellent deployment safety.**

## Where the system burned unnecessary cycles

### 1. E27 meta-contract leaked historical release tests into current-release globals

This was the clearest 5.109 convergence defect.

`plugins/usage-dashboard/tests/e27-focused-preflight-convergence-contract.cjs` directly exercises E27 against the historical 5.108 release spec. That causes E27 to execute 5.108's declared `p75-devpass-api-key-org-limit.cjs` while the checkout's global/current release is already 5.109.

The P75 regression itself contains current-release/baseline assertions. Therefore it is not a context-free historical fixture. Running it under 5.109 makes its result depend on the surrounding current checkout rather than only the historical 5.108 contract being inspected.

The result was authoritative E9 RED even though the current 5.109 E27 preflight had already passed.

#### Observed RED sequence

| Candidate | E9 run | Current 5.109 E27 | Full-registry failure |
| --- | --- | --- | --- |
| `7597751b...` | `34238914553` | GREEN | E27 meta-contract invoked historical P75; P75 expected release spec 5.108 but live current release resolved 5.109 |
| `b0e87182...` | `34239853679` | GREEN | historical P75 asserted stale accepted baseline 5.107 while current evidence had advanced to 5.108 |
| `eaf0b55d...` | `34240612258` | GREEN | same transition-context class: E27 meta-contract ran historical P75 under current 5.109 globals and failed on stale 5.107 baseline expectation |

The important distinction is:

> current release regression = valid E27 preflight target
>
> historical release regression = not automatically safe to execute inside current release globals

The fix should therefore be **context isolation**, not simply "run more tests in E27".

### 2. Source SHA handoff was once pinned one commit too early

During 5.109, the durable request was temporarily pinned to a source SHA that preceded a required P75 baseline correction. The moving source branch HEAD had the correction, but exact authority correctly followed the older pinned SHA.

That exposed a useful rule: after source repair, branch state and durable exact-SHA authority must be re-bound intentionally. A human-readable branch appearing correct is not enough once the release request has pinned an immutable source SHA.

The system eventually recovered correctly, but the handoff consumed another restage/validation loop.

### 3. Main movement was safe but expensive

E11/E16 correctly rejected stale authority when main moved. This is not a bug and must remain fail-closed.

However, once a candidate's frozen main is already known stale, there is little value in paying for additional expensive validation whose result cannot become merge authority without reconvergence.

A cheap freshness triage may be useful before costly E9 work, provided it remains only an optimization and never weakens E11/E16's final merge authority.

### 4. Exact-SHA checkout currently fetches the entire repository history/ref surface

The reusable validator uses `actions/checkout@v4` with `fetch-depth: 0`, and the 5.109 logs show a very large all-branches/all-tags fetch before validation.

This may be justified by ancestry/history checks, so it is **not yet a recommended code change**. It is an efficiency investigation item only. Any narrowing must prove parity for every history/ancestry/hygiene consumer first.

## Root-cause classification

5.109's friction should not be summarized as "too many strict gates." The gates caught real authority drift and prevented stale merges.

A better classification is:

1. **Safety gates:** worked.
2. **Current-release shift-left:** worked.
3. **Historical/meta-test isolation:** weak.
4. **Exact source handoff ergonomics:** needs tightening.
5. **Freshness/convergence cost:** safe but improvable.

## Scorecard

| Dimension | Assessment | Evidence |
| --- | --- | --- |
| Authority safety | A | exact source/candidate/main identities remained immutable authorities |
| Merge safety | A | E11 stale-main refusal + exact E16 capsule + expected-head merge |
| Deployment safety | A | monotonic release + exact tested blobs + parity receipt |
| Diagnosability | A- | RED class and exact test were discoverable; some diagnosis still required deep log reading |
| Current-release shift-left | A- | P76 + E21 caught before full registry and stayed GREEN |
| Transition safety | C+ | historical P75 executed under live 5.109 context |
| Convergence efficiency | B- | repeated candidates/restages from validation-context and main/source churn |
| Overall | B+ | highly trustworthy, but too many avoidable rerolls |

## Recommended next E-system design: E28

### E28: Transition-safe regression envelope

Goal: preserve E27's narrow current-release preflight while preventing historical/meta regression checks from borrowing current-release globals accidentally.

### Required invariants

1. **Two explicit execution contexts**
   - `current-release`
   - `historical-fixture`

2. **E27 remains current-release focused**
   - current spec's `newRegression`
   - E21
   - local/read-only
   - no new writer
   - no replacement of E9 full-registry authority

3. **Historical E27 contract tests must not execute an old Pxx under live current-release helpers by default**

4. Historical release verification should use one of two safe patterns:
   - structural verification of spec/path/registry resolution without executing the old version-bound Pxx, or
   - execution inside an explicitly frozen synthetic historical release context.

5. Version-bound historical Pxx assertions must read explicit fixture/spec/evidence inputs rather than implicit `loadCurrentRelease()` state where practical.

6. E9 remains the ultimate exact-SHA full-registry authority.

7. Add a transition regression proving:
   - release N current E27 preflight is GREEN,
   - E27 meta-contract can inspect release N-1 safely,
   - advancing current release N → N+1 does not make N-1 maintenance/meta tests fail merely because global current-release identity changed.

### E28 non-goals

- do not turn E27 into a second full registry,
- do not add a standalone workflow,
- do not add persistent state,
- do not reduce E9 authority,
- do not relax E11/E16 stale-main or expected-head safety,
- do not weaken historical release evidence semantics.

## Secondary follow-ups

### A. Source-SHA final-head seal

Immediately before dispatching a normal stage request, compare durable `source_sha` with the intended `source_branch` HEAD. If they differ, fail closed unless the request explicitly records a detached/exact historical source reason.

This is an ergonomics seal around immutable authority, not a replacement for exact-SHA semantics.

### B. Pre-E9 freshness triage

Before paying for the full exact-SHA registry, cheaply determine whether the candidate's frozen-main identity is already stale against current main. If stale, reconverge first.

E11/E16 must remain the final merge authority. This optimization only avoids work that is already known to be non-mergeable.

### C. Scoped checkout investigation

Measure whether exact-SHA validation truly needs `fetch-depth: 0` plus the entire ref surface. Only change checkout behavior after proving all ancestry/history/hygiene contracts remain equivalent.

## What should not change after 5.109

The following behaviors earned their keep and should be preserved:

- exact source SHA as source authority,
- exact candidate SHA as validation authority,
- E9 trusted-main controller,
- E11 fresh-main fail-closed merge guard,
- E16 derived read-only merge capsule,
- expected-head merge,
- release branch monotonic guard,
- exact-byte promotion and receipt,
- physical verification remaining distinct from deployment completion.

## Final takeaway

5.109 was not a case where the E-system was too strict. It was a case where **a strict system exposed one validation test that was not sufficiently explicit about which release context it owned**.

That distinction matters. The right next move is not to remove gates. It is to make version transitions first-class so the same gates produce fewer false rerolls.

E28 should therefore focus on **transition-safe historical regression isolation**, then separately tighten source-SHA handoff and optional freshness/checkout efficiency without changing the trust model that successfully protected the 5.109 release.