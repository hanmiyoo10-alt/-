# Local Usage Dashboard — E11 Diagnosable Merge-Readiness

Status: **E11-A..D IMPLEMENTED / REGRESSION-PROVEN — E11-E REAL RELEASE PROOF PENDING**

Generation authority: Issue `#372`.

E11 is a small stabilization layer on top of the proven E10 durable release transaction. It does not create a second state machine, a new public release state, a new candidate/production writer, automatic PR creation, or automatic main merge.

The retained authority chain is:

```text
one durable request
→ exact-source readiness
→ trusted stage writer
→ one deterministic candidate
→ one PR
→ authoritative exact-SHA full registry
→ read-only E11 merge guard
→ assistant expected-head merge
→ trusted monotonic exact-byte promotion
→ promotion-complete wake
→ production parity
→ durable request closure
```

## E11-A — structured source-readiness failure receipts

The existing `plugins/usage-dashboard/tools/source_readiness_e9.cjs` remains the single readiness engine.

Known failures now carry structured operator fields and the CLI emits a machine-readable `UD_SOURCE_READINESS_ERROR:<json>` sentinel. The Actions stack remains in trusted logs, while the durable request receives a concise receipt with:

- `reason_code`;
- `offending_path` when available;
- `owner_path` when available;
- bounded detail;
- deterministic repair hint when known.

Examples include deleted-owner references, historical product literals, stale part boundaries, missing/invalid release specifications, invalid/missing materializer paths, and materializer Python syntax failures. Unknown exceptions are explicitly labeled `unexpected-readiness-error`; the reducer must not invent a diagnosis.

## E11-B — read-only post-validation main-drift merge guard

After authoritative exact-SHA validation is GREEN and before the assistant merges, the existing durable reducer calls `plugins/usage-dashboard/tools/merge_guard_e11.cjs`.

The helper reads only Git history. Every newly trusted deterministic materialization records the exact main commit used to reconstruct its tree as a commit-message trailer:

```text
Usage-Dashboard-Frozen-Main: <TRUSTED_BASE_SHA>
```

The E7 materialization job writes that identity into the immutable candidate payload, and the constrained writer verifies the imported payload carries exactly the same frozen-main SHA already authenticated in bundle metadata before it may fast-forward the deterministic candidate ref. The candidate topology remains single-parent and fast-forward-only; the trailer adds identity, not a second ancestry edge or a second writer.

The merge guard prefers this explicit frozen-main identity whenever it is present. Candidates created before the trailer existed remain supported through a compatibility fallback: if the latest deterministic materialization has no explicit trailer, the guard walks backward through consecutive trusted `materialize: Usage Dashboard <same version> from source <sha>` commits and uses the first non-materialization parent as the legacy frozen main base. This preserves the already-created 5.78 evidence without rewriting candidate history.

The resolution remains fail-closed:
- an explicit `Usage-Dashboard-Frozen-Main` line must occur exactly once and contain one lowercase 40-hex commit SHA;
- the explicit frozen-main commit must exist locally;
- compatibility fallback follows only the trusted deterministic materialization message grammar for the same product version;
- every traversed materialization commit must have exactly one parent;
- the fallback walk is bounded;
- the resolved frozen base must be an ancestor of current `main`;
- the guard remains completely read-only and does not rewrite candidate history.

Protected drift includes:

- `plugins/usage-dashboard/**`;
- `.github/usage-dashboard/**`;
- Usage Dashboard and reusable Usage Dashboard workflows;
- `docs/USAGE_DASHBOARD_*` durable memory;
- shared `.github/plugin-control-plane/**` authority paths;
- `scripts/bootstrap-usage-dashboard.sh`.

The three receipts are merge decisions, not new release states:

- `MERGE_READY_NO_DRIFT`;
- `MERGE_READY_WITH_UNRELATED_MAIN_DRIFT`;
- `MERGE_BLOCKED_PROTECTED_MAIN_DRIFT`.

Every receipt is keyed by exact `candidate_sha` and exact `current_main_sha`. If main moves again, the old receipt is stale and a new classification is required. The guard never rebases, force-pushes, writes candidate/main refs, or performs a merge.

Protected drift fails closed and sends the same durable request back through source refresh → exact `source_sha` update → stage → exact-SHA validation. The refreshed candidate can then point its explicit frozen-main trailer at the newer trusted main even though its single parent remains the prior deterministic candidate, preventing already-absorbed protected drift from blocking the release forever.

## E11-C — unmistakable non-authoritative ordinary PR lane

The workflow/status context name `Usage Dashboard Candidate Validation` is retained for compatibility.

For deterministic `stage/usage-dashboard-*` PRs its note job now emits:

`NON-AUTHORITATIVE PR LANE — exact-SHA validator owns release decision`

and writes the same authority statement to `GITHUB_STEP_SUMMARY`.

This changes observability only. The durable-request exact-SHA validator remains the sole release GREEN authority.

## E11-D — generation wiring and focused contract

The durable request parser accepts `release_generation: E11` while retaining E9/E10 compatibility.

Generation qualification remains one-shot and separate from normal release closure:

- authority issue: `#372`;
- proof marker: `E11_REAL_RELEASE_PROOF`;
- first successful real E11 release may emit the marker once and close #372;
- later E11 releases are generation-proof no-ops.

The focused `e11-diagnosable-merge-readiness-contract.cjs` is registered in the full Usage Dashboard test registry and locks structured readiness, merge-guard path classification, explicit frozen-main identity, legacy repeated deterministic materialization compatibility fallback, protected-drift refresh convergence, PR-lane observability, generation wiring, and the no-new-writer rule.

## E11-A..D implementation evidence

Implementation PR `#374` final head:
`b92db942d40a00e1061a964640bb8e4982f529fe`

Final gates:
- Usage Dashboard Candidate Validation `32853928592` — SUCCESS;
- E9 durable release transaction contract — GREEN;
- E10 immediate convergence contract — GREEN;
- E11 diagnosable merge-readiness contract — GREEN;
- `TEST_REGISTRY_GREEN:88`;
- SimCore CI `32853928459` — SUCCESS;
- Engine SHA256 unchanged: `85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69`.

Retained RED:
- first run `32853637245` failed only because the focused E11 contract duplicated the three merge-guard verdict literals into the reducer ownership assertion. The contract was corrected to assert verdict ownership in `merge_guard_e11.cjs`; no release-control behavior or product bytes changed.

Main advanced from the implementation branch base only through unrelated SimCore documentation. The final expected-head squash merge succeeded without candidate or product mutation:
`c37d5547340273b98a2d7839059b73f177914260`.

Post-merge product manifest on main and `release-usage-dashboard` remains byte-identical at blob `ef1ae25970e9496a425b259e6d371eff364d1b1f`, still Product `3.0.0-alpha.5.77` / Engine `1.6.22` / Manager `1.3.0` / contracts `1/1`.

## E11-E live feedback — deterministic restage identity

The first real E11 release proof, 5.78 request `#376`, exposed two merge-readiness edge cases before PR merge authority was consumed.

### Feedback 1 — repeated materialization ancestry

The same semantic 5.78 source tree was re-submitted under a new exact source SHA after a bookkeeping-only source write was reverted. E11 readiness correctly re-qualified the new SHA and the trusted stage writer correctly fast-forwarded the same deterministic 5.78 candidate branch. The latest candidate therefore had the prior 5.78 candidate as its direct parent, while the original frozen main base remained farther back in the same first-parent chain.

The original E11-B implementation assumed the latest candidate's direct parent was always the main base. Maintenance PR `#378` retained the candidate evidence and repaired that assumption by walking backward through consecutive same-version trusted materialization commits. A real temporary-Git fixture proves a repeated legacy materialization does not become false main drift.

### Feedback 2 — protected-drift refresh needs an explicit base

Reviewing the protected-main-drift recovery path then exposed a second identity gap. E7 reconstructs every new candidate tree from exact `TRUSTED_BASE_SHA`, but its required single parent remains the prior deterministic candidate SHA. After refreshing a source branch onto a newer main, ancestry alone therefore cannot distinguish “old frozen base still applies” from “the candidate tree was intentionally rebuilt from this newer main.” An ancestry-only guard could keep reporting already-absorbed protected drift forever.

The retained repair keeps all writer and ancestry boundaries unchanged and adds the authenticated `Usage-Dashboard-Frozen-Main: <TRUSTED_BASE_SHA>` trailer. E11 uses that explicit base first and retains the #378 ancestry walk only as compatibility fallback for candidates that predate the trailer. Focused real-Git coverage proves `old main → candidate1 → candidate2`, then a refreshed candidate whose direct parent remains candidate2 while its explicit frozen base advances to a newer main commit. A malformed explicit trailer fails closed.

No candidate ref is reset or force-pushed, no production ref is touched by this repair, no new public release state is introduced, and 5.78 product/runtime bytes remain unchanged.

## E11-E — first real release proof

Pending after the explicit frozen-main maintenance repair is merged and the same 5.78 durable request is restaged from current trusted main.

The real Usage Dashboard release must prove:

```text
one durable request
→ structured SOURCE_SHA_READY / human-readable BLOCKED receipt if needed
→ trusted stage
→ one candidate
→ one PR
→ authoritative exact-SHA full registry
→ E11 merge guard for the current main SHA
→ assistant expected-head merge
→ exact-byte promotion
→ promotion-complete wake
→ parity VERIFIED
→ request auto DEPLOYED/closed
→ exactly one E11_REAL_RELEASE_PROOF
```

Acceptance keeps the E10 safety boundary:

- no user GitHub action;
- no stage/validate slash command;
- no PR close/reopen choreography;
- no issue no-op edit for deployment closure;
- no normal reliance on the five-minute recovery schedule;
- no connected candidate/production ref mutation;
- physical PocketRisu verification remains separate.

E11 simplifies operator decisions without weakening exact-source readiness, exact-SHA validation, expected-head merge, monotonic exact-byte promotion, or production parity verification.
