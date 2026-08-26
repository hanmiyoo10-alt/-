# SimCore Live Document Consistency Policy

Status: `ACTIVE OPERATING POLICY · MAIN DOCUMENT AUTHORITY · NON_RUNTIME`

Purpose: keep SimCore living documentation synchronized with the repository state during normal work instead of accumulating a separate documentation-cleanup backlog.

Related active routine:
- `docs/SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`

## 1. Default rule

Every substantive SimCore task includes a document-consistency close step.

```text
perform bounded task
→ verify result
→ update current living authorities in the same work cycle
→ preserve point-in-time evidence/design history
→ stop only when current next-action/status documents agree
```

Do not defer obvious current-document drift merely because the runtime or implementation work itself is complete.

## 2. Documents that should track current state in real time

When materially affected, synchronize living/current authorities such as:

- `product-manifest.json`
- `docs/CURRENT_DEVELOPMENT.md`
- current priority / queue documents
- current progress ledgers
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_ANOMALY_WATCH.md`
- release/operator current-state documents
- implementation-progress authorities

The exact set depends on the task. Do not mechanically edit unrelated files.

## 3. Historical/frozen records

Do not rewrite point-in-time design, audit, release evidence, implementation evidence, or frozen research merely to make old wording sound current.

```text
frozen / historical record
= preserve original point-in-time meaning

living current authority
= update immediately when status changes
```

If old historical wording can be mistaken for current authority, add or update a current superseding authority rather than silently rewriting history.

## 4. Drift handling

When a stale living statement is discovered during another SimCore task:

```text
identify drift
→ classify as DOC_DRIFT / FIX / NON_RUNTIME unless stronger impact exists
→ repair the living authority immediately when the repair is bounded and does not mix runtime/release-system changes
→ record any important exception or unresolved conflict
```

If correcting the drift would require a separate release-system, CI-authority, runtime-semantic, or repository-writer redesign, do not hide that work inside documentation cleanup. Preserve it as a separate gated item.

## 5. Authority boundaries remain unchanged

- `release-simcore` remains authority for deployed plugin code and release bytes.
- `main` remains authority for design, evidence, roadmap, administration, and living project memory.
- `plugins/simcore/latest.js` and `plugins/simcore/install.js` on `release-simcore` must remain identical for production.
- Document synchronization never upgrades unverified runtime behavior to PASS.

## 6. Close criterion

A SimCore task is documentation-consistent when all living authorities touched by the task agree on:

```text
current production identity
current gate / phase
completed vs pending work
next legitimate operation
WATCH / DEFER / FIX / BLOCKER disposition where applicable
```

This policy is operational and intentionally living.

## 7. Relationship to the real-time close-step routine

Document consistency is one mandatory surface inside the broader active close routine.

```text
SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY
= document-state consistency rule

SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE
= complete task-close operating sequence
```

The broader routine additionally covers triggered production-boundary verification, authority drift, evidence/corpus/fixture projections, gate unlock propagation, verification-claim honesty, transaction hygiene, and canonical next-operation recomputation.

Neither document authorizes background automation, runtime changes, release publication, CI-authority changes, or fabricated live evidence.