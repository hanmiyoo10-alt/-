# Repository Work Harness — Phase A complete / Phase B WRAP

This directory implements bounded slices of U-25 `Repository Work Harness`.

Phase A is complete as **read-only shadow governance**: Work Record normalization, active-record discovery, semantic PREFLIGHT, and automatic advisory surfacing are live. Phase B now has two bounded layers:

- B1: audited executor envelopes + pure dry-run DISPATCH planning;
- B2: deterministic Executor Handoff v1 + one explicitly audited local read-only invocation path.

The Harness still does not own release, production, main-write, product-runtime, or project authority.

## Authority boundary

The Harness coordinates work transactions. Existing authorities remain authoritative:

- repository/Git/CI/main-write/release/project authorities;
- canonical-main Work System for canonical-main packet identity/handoff;
- project-owned task/backlog/release contracts;
- `.github/plugin-control-plane/registry.json` for project/scope/authority location;
- product-specific build, validation, release and runtime tooling.

Harness evidence cannot upgrade task legitimacy, widen a Work Record, bypass a failed gate, or infer mutation permission from the existence of an executor route.

## Work Record v1

`work-record.schema.json` and `contract.cjs` define the reviewed, repository-reconstructible work transaction contract.

Important fields include stable work/objective/scope identity, source authority references, task/gate state, required capability, semantic read/write authorities, protected and close-sync surfaces, dependencies, base assumptions, and stop condition.

Write roles reuse the SimCore SYS-49 semantics:

- `PRIMARY_WRITE`
- `SUPPORTING_WRITE`
- `CLOSE_SYNC_WRITE`
- `EVIDENCE_WRITE`

## Shadow PREFLIGHT — HARNESS-A1

`preflight.cjs` is pure and side-effect free. It validates Work Records, evaluates startability, compares semantic authority overlap, and emits the SYS-49-compatible dispositions:

- `PARALLEL_SAFE`
- `PARALLEL_GUARDED`
- `PARALLEL_SERIALIZE_REQUIRED`
- `PARALLEL_NOT_STARTABLE`
- `PARALLEL_BLOCKED`

Precedence is:

`BLOCKED > NOT_STARTABLE > SERIALIZE_REQUIRED > GUARDED > SAFE`

Different branches/files/scopes never independently prove concurrency safety. Invalid or unknown posture fails closed.

## Active Work discovery — HARNESS-A2

`active-work.cjs` discovers repository-visible Work Records from open, non-PR GitHub issues using the exact marker pair:

~~~~text
<!-- repository-work-record:v1 -->
```json
{ "schemaVersion": 1, "workId": "...", "...": "..." }
```
<!-- /repository-work-record:v1 -->
~~~~

Closed/unmarked issues are ignored. Malformed marked records and duplicate active `workId` values fail closed with issue provenance.

`scan.cjs` is a read-only scan entrypoint using existing canonical-main GitHub read infrastructure. It is not the future general-purpose repository CLI.

## Automatic shadow surfacing — HARNESS-A3

`.github/workflows/repository-work-harness-shadow.yml` runs trusted-default-branch advisory scans on issue open/edit/reopen/close events and manual dispatch.

Its permissions remain read-only (`contents: read`, `issues: read`). Exact scan JSON is uploaded as an artifact and `report.cjs` renders the same evidence into the Actions summary. It does not mutate issues/refs or dispatch project/release executors.

## Audited executor adapters + dry-run DISPATCH — HARNESS-B1

`executor-adapters.json` is a Harness-owned static/audited registry of executor-specific capability envelopes. `.github/plugin-control-plane/registry.json` remains the project/scope ownership authority; the adapter registry must not duplicate release branches, manifests, artifacts, or project authority objects.

`dispatch.cjs` resolves validated `scopeId + requiredCapability` against the audited adapter envelope after PREFLIGHT and emits:

- `DISPATCH_READY`
- `DISPATCH_READY_WITH_GUARDS`
- `SERIALIZATION_REQUIRED`
- `NOT_STARTABLE`
- `DISPATCH_BLOCKED`

Every B1 dispatch result retains `executionAuthorized: false`. Dispatch is routing evidence, not execution permission.

## Deterministic Executor Handoff + bounded read-only invocation — HARNESS-B2

B2 adds exact capability-to-target `routes` inside each audited adapter. A route declares:

- exact `capability`;
- `targetKind`: `LOCAL_NODE` or `GITHUB_WORKFLOW`;
- exact repository `target`;
- audited `fixedArgs`;
- `executionClass`: `READ_ONLY` or `MUTATING`;
- optional `mutationClass`;
- `invokePolicy`: `READ_ONLY_LOCAL` or `HANDOFF_ONLY`.

Registry validation fails closed when route capability/target metadata escapes its adapter envelope. Any mutating route must name a mutation class already covered by `possibleMutationClasses` and `receiptRequiredFor`, and must remain `HANDOFF_ONLY`.

`handoff.cjs` converts validated Work Record + PREFLIGHT + B1 dispatch + exact route metadata into a deterministic Executor Handoff v1 with a stable SHA-256 `handoffHash`.

Handoff statuses:

- `HANDOFF_EXECUTABLE_READ_ONLY`
- `HANDOFF_READY`
- `HANDOFF_READY_WITH_GUARDS`
- `HANDOFF_BLOCKED`

B2 sets `executionAuthorized: true` only when all of these are true:

1. B1 dispatch is unguarded `DISPATCH_READY`;
2. exactly one audited route matches the requested capability;
3. route policy is `READ_ONLY_LOCAL`;
4. target kind is `LOCAL_NODE`;
5. execution class is `READ_ONLY`;
6. `mutationClass` is `null`.

`invoke.cjs` re-plans the handoff from authoritative inputs immediately before execution. It never trusts an arbitrary caller-supplied command. The wrapper executes `process.execPath` against the audited repository target with only the route's audited `fixedArgs`, `shell: false`, a bounded timeout, and bounded output.

The first audited executable route is intentionally narrow:

```text
SIMCORE_HARNESS_SELF_TEST
→ products/simcore/tooling/test.mjs --self-test
```

This proves a real existing specialized executor can be invoked through the common Harness without modifying SimCore executor code or granting mutation authority.

Canonical-main mutation routes, SimCore candidate/state/release routes, and Usage Dashboard workflow routes remain `HANDOFF_ONLY`. Guarded PREFLIGHT also remains non-executable until guards are satisfied and the handoff is recomputed.

## Current non-goals

The current Harness does **not** add:

- workflow dispatch through the Harness;
- mutating executor invocation;
- persistent coordination receipts;
- mutation-boundary enforcement;
- a top-level general-purpose repository CLI/default front door;
- main-write/release/production authority changes;
- product/runtime behavior changes;
- global locks or scheduler/prioritizer behavior.

Those require later bounded packets and fresh repository evidence.

## Tests

Run:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/tests/preflight-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/active-work-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/report-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/workflow-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/dispatch-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/handoff-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/invoke-contract.cjs
```
