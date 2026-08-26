# Repository Work Harness — Phase A complete / Phase B WRAP

This directory implements bounded slices of U-25 `Repository Work Harness`.

Completed slices:

- A1: Work Record v1 + pure semantic PREFLIGHT;
- A2: repository-visible active Work Record discovery;
- A3: automatic read-only Shadow Scan + Actions summary/artifact;
- B1: audited executor adapters + dry-run DISPATCH;
- B2: deterministic Executor Handoff v1 + one audited local read-only invocation;
- B3: deterministic persistent Coordination Receipt v1 + pure mutation-boundary readiness validation;
- B4: automatic read-only Coordination Receipt revalidation inside the existing Shadow Scan.

The Harness coordinates work transactions. It does **not** own Git, CI, main-write, release, production, product-runtime, or project authority.

## Authority boundary

Existing authorities remain authoritative. Harness evidence cannot widen a Work Record, bypass a failed gate, upgrade release/production truth, or infer mutation permission from a route or receipt.

The existing project registry remains `.github/plugin-control-plane/registry.json`. Harness-specific executor facts live in `executor-adapters.json`; release branches, manifests and product authority must not be copied into a competing registry.

## Work Record v1 and PREFLIGHT

`work-record.schema.json` + `contract.cjs` define repository-reconstructible work identity, source authority, task/gate state, read/write authorities, protected/close-sync surfaces, dependencies, base assumptions and stop condition.

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

`mutation-boundary.cjs` can prove that an exact mutating handoff has a currently valid required receipt, but a successful result is only coordination readiness. Existing mutation authority is still required and B3/B4 do not spawn or dispatch mutating executors.

## Live receipt revalidation shadow — HARNESS-B4

`receipt-shadow.cjs` pairs each active Work Record with its optional receipt marker and revalidates it from current repository evidence. It emits one of:

- `ABSENT` — active work has no persistent receipt;
- `VALID` — the receipt still matches fresh work/PREFLIGHT/ref/adapter/project evidence;
- `STALE` — a previously valid receipt no longer matches current evidence;
- `INVALID` — malformed, duplicate, unsupported, tampered or otherwise structurally invalid receipt evidence.

`scan.cjs` attaches this as a separate `receiptRevalidation` projection. `report.cjs` shows counts and per-work reason codes.

**B4 does not alter the work concurrency disposition.** A stale/invalid receipt is surfaced as read-only evidence only; it does not itself mutate, block, dispatch, or grant authority.

## Current non-goals

The current Harness still does **not** add:

- mutation enforcement at authoritative writers;
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
```
