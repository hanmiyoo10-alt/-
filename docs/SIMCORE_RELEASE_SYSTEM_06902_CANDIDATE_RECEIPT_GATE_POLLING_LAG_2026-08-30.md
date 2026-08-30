# SimCore Release System v0.69.2 Candidate Receipt Gate Polling Lag

Date: 2026-08-30

## Classification

```text
SIMCORE_RELEASE_SYSTEM_06902_CANDIDATE_RECEIPT_GATE_POLLING_LAG
= WATCH
= NON_RUNTIME
= RELEASE_SYSTEM
= PRODUCTION_MUTATION_NONE_AT_OBSERVATION
```

## Observation

During `simcore-v0.69.2-intent-06` candidate receipt persistence, the candidate materialization itself had already passed and the protected staging SimCore CI run `33290051007` had completed successfully for receipt commit:

```text
67ea384767289212e5078f296654d2b89a4ddc5a
```

The commit was independently re-read and proven to be the direct child of then-current `main`, with exactly the two permitted paths:

- `products/simcore/releases/candidate-receipts/simcore-v0.69.2-intent-06.json`
- `products/simcore/releases/spec-shadows/simcore-v0.69.2-new-06.json`

Despite that completed staging proof, the candidate-receipt workflow remained in `Commit and gate machine-known candidate truth`, indicating delayed observation/polling convergence in the shared main-write gate.

## Recovery used

After confirming all conditions that the normal fast-forward writer enforces were already true, `main` was advanced non-forcibly to the already-gated receipt commit. Durable receipt/spec-shadow readback then succeeded exactly.

No `release-simcore` mutation occurred during this recovery. Publication happened later through the normal exact-approval and permanent publisher path.

## Disposition

Keep as WATCH unless this polling lag recurs or causes a failed/expired transaction. If repeated, promote to FIX and investigate the protected main-write gate's run-discovery/polling behavior for already-successful workflow-dispatch runs. Do not mix that release-system change with runtime feature work.
