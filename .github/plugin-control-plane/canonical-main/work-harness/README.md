# Repository Work Harness — Phase A complete / Phase B WRAP / Phase C groundwork

This directory implements bounded slices of U-25 `Repository Work Harness`.

Phase A is complete as **read-only shadow governance**. Completed/proven slices:

- A1: Work Record v1 + pure semantic PREFLIGHT;
- A2: repository-visible active Work Record discovery;
- A3: automatic read-only Shadow Scan + Actions summary/artifact;
- B1: audited executor adapters + dry-run DISPATCH;
- B2: deterministic Executor Handoff v1 + one audited local read-only invocation;
- B3: deterministic persistent Coordination Receipt v1 + pure mutation-boundary readiness validation;
- B4: automatic read-only Coordination Receipt revalidation inside the existing Shadow Scan.

B5 adds the first executable **Phase C insertion-point groundwork**: a read-only/fail-closed receipt gate process. It does not install mandatory enforcement at an authoritative writer.

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

B5 itself performs only GitHub reads. It does not mutate issues/refs, dispatch workflows, spawn executors, call main-write/release tooling, or become an authority. It is a reusable Phase C insertion point for a later, separately reviewed writer/canary integration.

## Current non-goals

The current Harness still does **not** add:

- mandatory receipt enforcement at any authoritative writer;
- mutating executor invocation;
- GitHub workflow dispatch through the Harness;
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
```
