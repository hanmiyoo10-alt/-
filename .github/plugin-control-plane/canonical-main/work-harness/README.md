# Repository Work Harness — Phase A complete / Phase B WRAP / Phase C canary

This directory implements bounded slices of U-25 `Repository Work Harness`.

Phase A is complete as **read-only shadow governance**. Completed/proven slices:

- A1: Work Record v1 + pure semantic PREFLIGHT;
- A2: repository-visible active Work Record discovery;
- A3: automatic read-only Shadow Scan + Actions summary/artifact;
- B1: audited executor adapters + dry-run DISPATCH;
- B2: deterministic Executor Handoff v1 + one audited local read-only invocation;
- B3: deterministic persistent Coordination Receipt v1 + pure mutation-boundary readiness validation;
- B4: automatic read-only Coordination Receipt revalidation inside the existing Shadow Scan.

B5 adds the first executable **Phase C insertion-point groundwork**: a read-only/fail-closed receipt gate process.

B6 adds the first bounded writer-side **opt-in canary**: a manual Canonical Main Operations dispatch may name an active coordination work issue and must pass the B5 gate before the existing issue-reconciliation writer runs. Automatic operations remain unchanged.

B7 adds an explicit opt-in **repository-native receipt sync**: an open Work Record issue carrying `<!-- repository-coordination-receipt-request:v1 -->` may receive or refresh its B3 Coordination Receipt from fresh repository evidence on issue lifecycle events. This automates coordination evidence creation only; it does not run a writer.

B8 adds an explicit opt-in **automatic authoritative handoff** for one canonical-main route only: after successful B7 receipt sync, a Work Record carrying `<!-- repository-authoritative-handoff-request:v1 -->` may hand the same issue number to the existing Canonical Main Operations workflow only when fresh B5 gate evidence is READY and the audited route is exactly `CANONICAL_MAIN_OPERATIONS_REFRESH`. The called writer re-runs the gate before its unchanged mutation. Implementation packet: #510.

The Harness coordinates work transactions. It does **not** own Git, CI, main-write, release, production, product-runtime, or project authority.

## Authority boundary

Existing authorities remain authoritative. Harness evidence cannot widen a Work Record, bypass a failed gate, upgrade release/production truth, or infer mutation permission from a route or receipt.

The existing project registry remains `.github/plugin-control-plane/registry.json`. Harness-specific executor facts live in `executor-adapters.json`; release branches, manifests and product authority must not be copied into a competing registry.

## Work Record v1 and PREFLIGHT

`work-record.schema.json` + `contract.cjs` define repository-reconstructible work identity, source authority, task/gate state, read/write authorities, protected/close-sync surfaces, dependencies, base assumptions and stop condition.

Write roles retain the SYS-49 semantics:

- `PRIMARY_WRITE`
- `SUPPORTING_WRITE`
- `CLOSE_SYNC_WRITE`
- `EVIDENCE_WRITE`

`preflight.cjs` emits SYS-49-compatible dispositions:

- `PARALLEL_SAFE`
- `PARALLEL_GUARDED`
- `PARALLEL_SERIALIZE_REQUIRED`
- `PARALLEL_NOT_STARTABLE`
- `PARALLEL_BLOCKED`

Precedence: `BLOCKED > NOT_STARTABLE > SERIALIZE_REQUIRED > GUARDED > SAFE`.

Different branches/files/scopes never independently prove concurrency safety.

## Active Work discovery + automatic Shadow Scan

`active-work.cjs` discovers exact `repository-work-record:v1` markers from open, non-PR GitHub issues. Closed/unmarked issues are ignored; malformed records and duplicate active `workId` values fail closed with issue provenance.

`scan.cjs` uses trusted canonical-main GitHub read infrastructure. `.github/workflows/repository-work-harness-shadow.yml` invokes it on issue lifecycle events with read-only `contents: read` + `issues: read` permissions. Exact JSON is retained as an artifact and `report.cjs` renders Actions summary evidence.

## Audited executor routing and bounded invocation

`dispatch.cjs` resolves validated `scopeId + requiredCapability` against `executor-adapters.json` after PREFLIGHT. Dispatch remains routing evidence.

`handoff.cjs` binds the validated work/dispatch/route into deterministic Executor Handoff v1. `invoke.cjs` can execute only an audited `READ_ONLY_LOCAL` Node route with fixed arguments. The intentionally narrow live proof is:

```text
SIMCORE_HARNESS_SELF_TEST
→ products/simcore/tooling/test.mjs --self-test
```

Mutating and workflow routes remain `HANDOFF_ONLY`.

### Generic execution receipt projection for audited invoke results

`invoke-execution-receipt.cjs` is a pure/read-only adapter from an already-produced Work Harness `EXECUTOR_HANDOFF + EXECUTOR_RESULT` pair into facts accepted by the repository-wide `execution-receipt.cjs` projector.

```text
validated Work Record + PREFLIGHT
→ existing dispatch / handoff
→ existing invoke.cjs
→ EXECUTOR_RESULT
→ invoke-execution-receipt.cjs
→ execution-receipt.cjs
→ REPOSITORY_EXECUTION_RECEIPT
```

The adapter never invokes a route and never grants execution authority. It checks envelope integrity and evidence consistency only. `PASS` and `FAIL` require an already-authorized, actually executed read-only handoff; `INFRA_ERROR` becomes `BLOCKED`; `NOT_EXECUTED` remains `BLOCKED`; identity or authorization contradictions become `CONFLICT`.

Normal PASS stdout is deliberately omitted from the GPT-facing facts. The original bounded `EXECUTOR_RESULT` stays behind the caller-supplied artifact locator for targeted drill-down. For non-PASS results, only a bounded stderr tail may be forwarded, and the generic execution-receipt projector still owns sensitive-material rejection and final fail-closed normalization.

Exact source/ref identity, execution-surface identity, and the invocation-result artifact locator are caller-supplied evidence. The adapter does not discover freshness, re-plan PREFLIGHT, select routes, mutate repository state, call GitHub, or broaden the audited adapter registry. The existing `invoke.cjs` remains the sole execution owner for this surface.

## Coordination Receipt v1 — HARNESS-B3

`receipt.cjs` issues and validates a repository-visible Coordination Receipt only from freshly recomputed, unguarded `STARTABLE + PARALLEL_SAFE` evidence with exact observed refs/bases and audited adapter/project registries.

Receipt markers use:

~~~~text
<!-- repository-coordination-receipt:v1 -->
```json
{ "schemaVersion": 1, "mode": "COORDINATION_RECEIPT", "...": "..." }
```
<!-- /repository-coordination-receipt:v1 -->
~~~~

Receipts bind work/profile/active-set/PREFLIGHT/base/adapter/project/authority evidence. They are not leases and have no hidden time lifetime. Drift invalidates them.

Invariant: every receipt has `mutationAuthorized: false` and `executionAuthorized: false`.

`mutation-boundary.cjs` can prove that an exact mutating handoff has a currently valid required receipt, but a successful result is only coordination readiness. Existing mutation authority is still required and the Harness does not infer mutation permission from this result.

## Live receipt revalidation shadow — HARNESS-B4

`receipt-shadow.cjs` pairs each active Work Record with its optional receipt marker and revalidates it from current repository evidence. It emits one of:

- `ABSENT` — active work has no persistent receipt;
- `VALID` — the receipt still matches fresh work/PREFLIGHT/ref/adapter/project evidence;
- `STALE` — a previously valid receipt no longer matches current evidence;
- `INVALID` — malformed, duplicate, unsupported, tampered or otherwise structurally invalid receipt evidence.

`scan.cjs` attaches this as a separate `receiptRevalidation` projection. `report.cjs` shows counts and per-work reason codes.

**B4 does not alter the work concurrency disposition.** A stale/invalid receipt is surfaced as read-only evidence only; it does not itself mutate, block, dispatch, or grant authority.

## Executable Coordination Receipt Gate — HARNESS-B5

`mutation-gate.cjs` is a bounded executable gate process for a specific active work issue:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/mutation-gate.cjs --work-issue <number>
```

The process reconstructs its decision from current repository evidence rather than trusting caller-supplied work/profile/ref state:

1. read open repository issues and discover the active Work Record set;
2. resolve exactly one target active work issue;
3. parse the target `repository-coordination-receipt:v1` marker;
4. observe current `main` through the GitHub branch API;
5. load the audited executor adapter registry and canonical project registry;
6. delegate the decision to the existing B3 `validateMutationBoundary()`.

Machine result is `MUTATION_GATE_READY` only when the underlying boundary is `MUTATION_BOUNDARY_READY`; all missing, malformed, stale, conflicting or ambiguous evidence fails closed as `MUTATION_GATE_BLOCKED` with stable reason codes and a legal next action. The CLI process exits `0` only for `MUTATION_GATE_READY`; ordinary coordination blocks exit nonzero.

Even on success:

- `coordinationReady=true`;
- `mutationAuthorized=false`;
- `executionAuthorized=false`;
- `legalNextAction=HANDOFF_TO_EXISTING_MUTATION_AUTHORITY_WITH_VALID_RECEIPT`.

B5 itself performs only GitHub reads. It does not mutate issues/refs, dispatch workflows, spawn executors, call main-write/release tooling, or become an authority.

## Canonical Main Operations manual canary — HARNESS-B6

`.github/workflows/canonical-main-ops.yml` retains its existing authoritative `orchestrator/refresh.cjs` writer and automatic schedule/workflow-run/push paths. B6 adds one optional manual input:

```text
coordination_work_issue=<open issue containing active Work Record + fresh receipt>
```

When a manual `workflow_dispatch` supplies a non-empty value, the workflow runs `mutation-gate.cjs` before the existing refresh. A blocked gate stops the job before issue reconciliation. A READY gate only permits handoff; the existing orchestrator still owns the mutation.

B6 deliberately does **not** require a receipt for automatic operations or an empty manual break-glass dispatch. This is a canary rollout, not the default enforcement policy.

The canary work-issue value is passed into the shell through an environment variable, not direct expression interpolation into the command line.

## Automatic requested receipt sync — HARNESS-B7

`receipt-sync.cjs` adds a bounded coordination-evidence writer for one explicitly requested open Work Record issue:

```text
<!-- repository-coordination-receipt-request:v1 -->
```

`.github/workflows/repository-work-harness-receipt-sync.yml` reacts only to `opened`, `edited`, or `reopened` issue events whose body contains exactly this opt-in marker. It checks out trusted default-branch code, reconstructs the entire active Work Record set, observes current `main`, loads the audited adapter/project registries, and delegates issuance to the existing B3 receipt contract.

The sync fails closed and does not edit the issue when discovery, request markers, existing receipt evidence, exact base, PREFLIGHT, adapter routing, or registry evidence is invalid/ambiguous/stale. A valid receipt is inserted or replaced deterministically; an already-current identical receipt is a no-op. Workflow-authored issue edits are excluded from resync to avoid recursive churn.

B7 uses `issues: write` only to persist coordination evidence on the requested Work Record issue. It does not dispatch workflows, run authoritative writers, mutate refs, or infer mutation/execution authority from receipt readiness.

## Opt-in automatic authoritative handoff — HARNESS-B8

`authoritative-handoff.cjs` evaluates a second standalone request marker:

```text
<!-- repository-authoritative-handoff-request:v1 -->
```

No marker means ordinary B7-only behavior. Duplicate request markers fail closed. A unique request is eligible only when:

- the active Work Record scope is exactly `canonical-main`;
- `requiredCapability` is exactly `CANONICAL_MAIN_OPERATIONS_REFRESH`;
- the audited adapter route is exactly the existing `canonical-main-ops.yml` `GITHUB_WORKFLOW` route with `MUTATING / ISSUE_RECONCILIATION / HANDOFF_ONLY` semantics;
- a freshly recomputed B5 mutation gate is `MUTATION_GATE_READY` for the same Work Record issue.

When all conditions pass, the receipt-sync workflow calls `canonical-main-ops.yml` as a reusable workflow with that exact issue number. The called workflow resolves the bounded input through environment state, re-runs `mutation-gate.cjs`, and only then reaches the unchanged `orchestrator/refresh.cjs refresh` writer.

B8 therefore automates **handoff**, not mutation authority. It does not set `mutationAuthorized` or `executionAuthorized`, add a generic dispatcher, or permit any other adapter/workflow route.

## Canonical-main stage checkpoint composition

`stage-checkpoint.cjs` is a bounded issue-only composition harness for the RCR-D15 interaction checkpoint boundary. It does not replace either durable destination. The packet issue remains packet handoff evidence and #293 remains the raw append-only main-management audit log.

Use one short repository-native invocation for one semantic checkpoint:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/stage-checkpoint.cjs \
  --packet <canonical-main-packet-issue> \
  --stage <AUTHORITY_SCOPE|IMPLEMENTATION_PR|VALIDATION_MERGE|POSTMERGE_CONVERGENCE|EXPERIMENT_CLOSE> \
  --body-file <bounded-checkpoint-markdown>
```

The body file is bounded to 8 KiB. The harness verifies the target is one open canonical-main work packet, derives one SHA-256 checkpoint identity from packet number + stage + normalized body, then uses surface-specific provenance markers to record the same checkpoint payload on the packet and #293.

Retries are idempotent within the bounded comment scan. Existing matching packet/audit comments are reused; if a prior attempt wrote only one side, the next attempt writes only the missing side. Duplicate checkpoint markers fail closed rather than adding another record. Comment discovery is bounded to 20 pages per destination, matching the repository's existing bounded issue-bookkeeping pattern.

The machine result is compact JSON with `COMPLETE`, `PARTIAL`, `UNKNOWN`, or `FAILED`, the checkpoint identity, and both destination issue/comment identities. One side failing never becomes green by absence. `PARTIAL`/`UNKNOWN` use a nonzero exit so an agent cannot silently treat incomplete audit synchronization as complete.

This surface uses only the existing GitHub issue API through the canonical-main GitHub client. It adds no workflow-wide `issue_comment` listener, no contents/ref/PR/release/production authority, no new mutable truth owner, no mutation capability to `tools/repo-ci-mcp/**`, and no claim that repository code can suppress host UI activity cards. Its compactness benefit is narrower: when this harness is available, one visible repository command can preserve the two required durable issue comments internally.

## Derived canonical-main stage receipt

`stage-receipt.cjs` is a read-only projector for #2275 item 10. It accepts bounded structured stage facts already established by owning authority/evidence and emits one deterministic `CANONICAL_MAIN_STAGE_RECEIPT` plus a compact Markdown projection. It does not read GitHub, discover truth, parse arbitrary packet prose, or write repository/issue state.

```sh
node .github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs --input-file facts.json
node .github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs --input-file facts.json --format markdown
```

V1 carries packet/stage identity, exact authority refs, required gates and evidence locators, bounded scope/diff identity, Work System proof terms, required UNKNOWN/conflict/blocker/dependency evidence, and the exact next legal action. `mutationAuthorized=false` and `executionAuthorized=false` are invariant. Output identity is a stable SHA-256 digest over the normalized semantic receipt.

The input shape is strict and bounded. Unsupported fields, control characters, oversized values, suspicious credential-like material, malformed exact SHA/diff identities, and contradictory duplicate authority/gate facts fail closed. Required semantic fields that are omitted are projected as explicit UNKNOWN evidence rather than silently meaning NONE. A claimed PASS without an evidence locator becomes UNKNOWN. `CONTRACT_PROVEN` never implies `LIVE_PROVEN`, and unresolved required evidence rejects a supplied `DONE` claim.

`PASS`/`FAIL`/`BLOCKED`/`UNKNOWN`/`CONFLICT` on this receipt describe only the completeness and supplied stage evidence of this derived projection. They do not grant stage transition, mutation, execution, merge, release, production, or runtime authority. `NOT_APPLICABLE` and `EXPECTED_NO_RUN` are resolved gate results only when the caller supplies an evidence locator from the owning trigger/gate classifier.

For durable checkpoint recording, render the receipt as Markdown into a bounded body file and pass that body to the existing `stage-checkpoint.cjs`. The existing checkpoint harness remains the sole packet + #293 recording/idempotency adapter; the receipt projector adds no second writer or truth store.

## Generic repository execution receipt

`execution-receipt.cjs` is the Work Harness read-only projector/validator for #2142's bounded execution-evidence layer. It accepts bounded facts already produced by an owning local, remote, CI, analysis, build, test, or validation surface and emits one deterministic `REPOSITORY_EXECUTION_RECEIPT`. It does not execute the operation, read GitHub, discover authority, mutate repository state, or become a generic runner.

```sh
node .github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs --input-file execution-facts.json
```

V1 is preserved for compatibility. Its `attentionState` field intentionally remains the legacy combined axis `RUNNING / COMPLETE / NEEDS_REVIEW / BLOCKED / UNKNOWN`; `result` remains `PASS / FAIL / PARTIAL / UNKNOWN / CONFLICT / BLOCKED`. Existing v1 producers keep their current input/output shape and deterministic digest semantics.

V2 is an explicit opt-in contract with three independent concerns. `executionLifecycle` is `QUEUED / RUNNING / FINISHED / UNKNOWN`; `attentionDisposition` is `COMPLETE / NEEDS_REVIEW / BLOCKED / UNKNOWN / CONFLICT`; `result` keeps the existing result vocabulary. Lifecycle `UNKNOWN` is first-class because completion itself may be unproven. A v2 producer must supply both new axes and must not send legacy `attentionState`. The projector does not infer v2 axes from v1 or silently migrate existing producers.

`NEEDS_REVIEW` remains the explicit semantic-judgment boundary and can coexist with a nonterminal v2 lifecycle. The receipt carries operation/primitive identity, bounded source identity, execution surface and substage, proof scope, executed-step evidence, generic counters, affected files, artifact/log locators, reason codes, required UNKNOWN/conflict/blocker evidence, optional bounded exit code/stderr tail, and the next legal action. Arrays are normalized for deterministic SHA-256 receipt identity. Missing required evidence cannot remain a green PASS, conflicting duplicate evidence is preserved as CONFLICT, and a nonzero exit cannot coexist with PASS.

Raw logs are not copied into the default receipt. Callers retain them behind bounded artifact/log locators and drill down only when the receipt exposes `NEEDS_REVIEW`, failure, UNKNOWN, CONFLICT, a blocker, ambiguity, or insufficient proof. The projector rejects credential-like material and oversized failure tails rather than sanitizing an unsafe payload into apparent validity.

Every execution receipt fixes `mutationAuthorized=false`, `executionAuthorized=false`, `mergeAuthorized=false`, `releaseAuthorized=false`, `productionAuthorized=false`, `runtimeAuthorityGranted=false`, and `securityAuthorityGranted=false`. Those flags describe the receipt's non-authority boundary, not whether an already-authorized external executor previously ran. Stage, coordination, project-specific, and agent-orchestrator receipts remain separate owners; an execution receipt may only be linked as evidence into those contracts.

## Repository agent decision view v1

`agent-decision-view.cjs` is a pure read-only consumer projection over an already-produced **VALID v2** `REPOSITORY_EXECUTION_RECEIPT`. It does not execute work, fetch GitHub, discover authority, mutate state, infer v2 axes from a legacy v1 receipt, or strengthen a canonical result.

```text
owner report / raw bounded evidence
→ canonical REPOSITORY_EXECUTION_RECEIPT v2
→ REPOSITORY_AGENT_DECISION_VIEW v1
→ normal agent decision
→ targeted drill-down only when attention requires it
```

The projector re-projects the supplied v2 receipt through the canonical execution-receipt owner and requires exact normalized receipt identity before use. It copies `executionLifecycle`, `attentionDisposition`, `result`, `nextLegalAction`, and receipt identity rather than independently deciding them. Summary counts come only from canonical receipt step evidence.

Attention items are fixed to `subject / reasonCode / severity / constraint / nextPhase / locator`. At most five are shown. Priority is deterministic: `CONFLICT → UNKNOWN → BLOCKER → FAIL → INFRA → WARN`. Truncation is explicit, including `criticalTruncated`; unresolved critical attention never becomes green by omission. A non-PASS canonical receipt with no owner-specific attention receives one generic drill-down item instead of an empty list.

Owner-specialized `output` is a small validated flat object only. Unsupported nested values, oversized/control-character text, credential-like material, contradictory PASS attention, malformed locators, or a forged/mutated canonical receipt fail closed to an invalid/UNKNOWN view.

This projector is presentation evidence only. It grants no stage transition, execution, mutation, merge, release, production, runtime, or security authority.

## CAS-style coordination issue-body patch

`coordination-body-patch.cjs` is the Work Harness issue-only adapter for narrow packet/queue body reconciliation. It does not decide what lifecycle or proof text is true; callers must already have authority for the requested coordination edit.

The CLI accepts one bounded JSON request file:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/coordination-body-patch.cjs \
  --request-file /path/to/request.json
```

A v1 request names exactly one eligible surface, one issue, the SHA-256 digest of the complete expected prior body, and one operation. Eligible surfaces are only:

- `WORK_PACKET`: a non-PR issue with exactly one standalone `canonical-main-work-packet:v1` marker line after trimming; open or closed packets are eligible for evidence-backed body reconciliation;
- `WORK_QUEUE`: exactly issue #465, open, with exactly one standalone `canonical-main-work-queue:v1` marker line after trimming.

Quoted or example marker text inside a longer prose, heading, or inline-code line does not count as an additional target marker surface. Exact patch-operation uniqueness remains raw byte/text occurrence based.

Every other issue/body class fails closed. The adapter PATCHes only the GitHub issue `body` field. It has no title, state, state_reason, label, assignee, comment, PR, ref, file, workflow, release, production, runtime, or protection mutation authority.

V1 transformations are exact only:

- `replaceExact` requires one non-empty `oldText` occurrence and replaces it once with exact `newText`;
- `replaceMarkerBlock` requires unique ordered start/end markers and an exact replacement block carrying those same boundary markers;
- zero/multiple matches, malformed marker ranges, no-op replacements, regex/fuzzy matching, append-if-missing, callbacks, evaluation, and arbitrary code all fail before mutation.

The currentness sequence is intentionally explicit:

1. read the eligible issue and require its complete body digest to equal `expectedBodySha256`;
2. derive the exact target body in memory;
3. re-read immediately before PATCH and require byte-identical body/digest evidence;
4. PATCH only `{ body: <derived target> }`;
5. perform mandatory post-write read-back and require byte-identical target body plus the expected after-digest before reporting `UPDATED`.

If the second read observes drift, the adapter returns `BLOCKED` and performs no PATCH. Once a PATCH has been attempted, read-back failure, mismatch, or an unknown PATCH response returns `UNKNOWN` with `mutationMayHaveOccurred=true`; the adapter does not retry from the stale expectation.

This is **CAS-style** currentness protection, not a server-atomic compare-and-swap primitive. GitHub issue PATCH transport does not establish an atomic conditional body write here, so a small final read-to-PATCH race remains possible. Mandatory post-write read-back detects observed divergence instead of pretending that interval cannot exist.

The request-file ceiling is 32 KiB. CLI exit status is `0` for `UPDATED`, `2` for `BLOCKED`, and `3` for `UNKNOWN`.

## Current non-goals

The current Harness still does **not** add:

- mandatory/default receipt enforcement across Canonical Main Operations;
- receipt enforcement at `repo-main-write.py` or product writers;
- mutating executor invocation;
- generic GitHub workflow dispatch through the Harness;
- automatic handoff to product/release/runtime writers;
- a top-level general-purpose repository CLI/default front door;
- main-write/release/production authority changes;
- product/runtime behavior changes;
- global locks or scheduler/prioritizer behavior.

Those require later explicitly activated bounded packets with fresh repository evidence.

## Tests

```sh
node .github/plugin-control-plane/canonical-main/work-harness/tests/preflight-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/active-work-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/report-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/workflow-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/dispatch-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/handoff-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/invoke-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/mutation-boundary-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/receipt-shadow-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/mutation-gate-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/canonical-main-canary-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/receipt-sync-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/receipt-sync-workflow-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/authoritative-handoff-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-checkpoint-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
```