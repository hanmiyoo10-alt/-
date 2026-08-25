# Local Usage Dashboard — E11 Diagnosable Merge-Readiness

Status: **E11-A..D IMPLEMENTATION IN PROGRESS / E11-E REAL RELEASE PROOF PENDING**

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

The helper reads only Git history. It uses the deterministic candidate's single parent as the frozen candidate-main base and compares that parent with the latest `main` SHA.

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

Protected drift fails closed and sends the same durable request back through source refresh → exact `source_sha` update → stage → exact-SHA validation.

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

The focused `e11-diagnosable-merge-readiness-contract.cjs` is registered in the full Usage Dashboard test registry and locks structured readiness, merge-guard path classification, PR-lane observability, generation wiring, and the no-new-writer rule.

## E11-E — first real release proof

Pending after E11-A..D maintenance merge.

The next real Usage Dashboard release must prove:

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
