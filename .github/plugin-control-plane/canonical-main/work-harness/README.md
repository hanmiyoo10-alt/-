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
```
