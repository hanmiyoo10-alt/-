# SimCore Real-Time Close-Step Operating Routine

Status: `ACTIVE OPERATING ROUTINE · MAIN ADMIN/MEMORY AUTHORITY · NO RUNTIME CHANGE · NO NEW AUTOMATION SYSTEM`

Purpose: make the frozen real-time close-step design part of normal SimCore work immediately, without waiting for a new executable automation layer.

Design authority:
- `docs/SIMCORE_REALTIME_CLOSE_STEP_SURFACES_DESIGN_2026-08-26.md`

Related living authority:
- `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_EVIDENCE_INDEX.md`
- `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md`

## 1. Operating decision

The real-time close-step surfaces are adopted as assistant operating discipline now.

```text
ADOPT NOW
= task-close procedure
= reuse existing authorities/tools
= no new runtime/plugin code
= no new background automation
= no new CI/release authority
```

Do not wait for a separate implementation project before using these close steps.

## 2. Default close routine

After every substantive SimCore task:

```text
1. verify the bounded task result
2. preserve/classify live anomaly if one exists
3. verify production boundary when materially relevant
4. run/reuse authority checks when relevant
5. synchronize triggered evidence/corpus/fixture projections
6. recompute gates and queues
7. synchronize affected living documents
8. inspect transaction hygiene when branch/PR work occurred
9. recompute one canonical next operation
10. stop
```

Only affected surfaces are evaluated; do not mechanically rewrite unrelated files.

## 3. Active procedural surfaces

Treat these as active immediately:

```text
RT-01 Living-document consistency
RT-02 Current gate + queue recomputation
RT-04 Production boundary receipt when material
RT-06 Natural-evidence corpus intake when triggered
RT-07 Immediate anomaly capture + disposition propagation
RT-08 Verification-claim honesty propagation
RT-09 Fixture/coverage portfolio synchronization when triggered
RT-11 Gate-unlock propagation when triggered
RT-12 Canonical next-operation recomputation
```

Reuse existing tools/authorities for:

```text
RT-03 Authority drift
→ S-10 authority-drift-check.mjs + sync-state.mjs semantics

RT-05 Evidence navigation consistency
→ M-13 evidence-index source/generator discipline

RT-10 PR/work transaction hygiene
→ S-11 stale-pr-hygiene classification where applicable
```

## 4. No-code-by-default rule

A close-step concern does not become an implementation project merely because it repeats.

Default handling:

```text
procedural close-step is sufficient
→ keep procedural

existing tool already covers it
→ reuse existing tool

repetition cost becomes materially high
AND a stable mechanical contract exists
→ design a separate NON_RUNTIME item
```

Do not add a second checker, daemon, scheduler, hidden writer, or generated authority merely for convenience.

## 5. Protected escalation rule

The following require separate design/implementation and are not silently authorized by this routine:

```text
permanent CI discovery changes
fixture-harness authority changes
repo writer/branch authority changes
automatic PR or branch deletion/closure
release workflow changes
background scheduling/polling
automatic publication
```

If such work becomes worthwhile, classify it independently as NON_RUNTIME and normally `NR_PROTECTED` when it touches CI/release/repository authority.

## 6. Human/evidence boundaries

This routine must never manufacture evidence.

Forbidden automatic promotions:

```text
LIVE_PENDING → LIVE_PASS without supplied real-chat evidence
WATCH → FIX/BLOCKER without forensic evidence
provider/cache/root-cause inference from local observations
runtime implementation completion from document-only prep
HYBRID_TRANSITIONAL → EXECUTABLE without direct owner execution
```

## 7. Historical record rule

```text
frozen design/audit/evidence
= preserve point-in-time meaning

living current authority
= update immediately when affected
```

If a historical statement is stale as a current instruction, update a current superseding authority instead of rewriting historical evidence.

## 8. Current production boundary

Adopting this routine changes repository operating discipline only.

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repo writer authority = unchanged
current v0.64.7 real-long-chat gate = unchanged / PENDING_REAL_LONG_CHAT
```

## 9. Current verdict

```text
REAL-TIME CLOSE-STEP ROUTINE
= ACTIVE NOW

NEW EXECUTABLE IMPLEMENTATION
= NOT REQUIRED

FUTURE AUTOMATION
= ONLY WHEN SEPARATELY JUSTIFIED AND DESIGNED
```
