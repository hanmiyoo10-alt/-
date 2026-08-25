# SimCore Next Focus After Diagnostic UX Close — 2026-08-25

Status: `FOCUS DECISION · HOST / HISTORY RESILIENCE NEXT · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_UX_PREIMPLEMENTATION_CLOSE_2026-08-25.md`
- `docs/SIMCORE_NEXT_FOCUS_AREAS_AFTER_CACHE_RESEARCH_2026-08-25.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_GEMINI_CACHE_RESEARCH_COMPLETENESS_AUDIT_2026-08-25.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BACKEND_SET_VARIANCE_MODEL_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Decision

With the broad Diagnostic UX research track now closed, the next independent SimCore research focus should be:

```text
HOST / HISTORY RESILIENCE
```

This is a research/design focus only.
It does not authorize implementation or a release.

## 2. Why this is the next useful axis

Several adjacent tracks are already occupied or intentionally waiting:

```text
M2-3 Edit Reconcile
→ active in a separate workstream

Store latency / backend.set variance
→ existing-evidence analysis done
→ waiting for better natural payload-aware samples

Diagnostic UX
→ pre-implementation research COMPLETE
→ broad ideation CLOSED

Gemini implicit cache
→ broad architecture COMPLETE / PAUSED
→ stronger runtime conclusions require real provider/gateway receipt evidence

Semantic validator families
→ evidence-triggered only
→ no new repair without natural failing specimen/recurrence
```

Host/history resilience remains one of the few evidence-backed areas with unresolved WATCH families and no broad architecture closure.

## 3. Existing evidence families

Primary surviving WATCH evidence:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
→ one directly observed fail-closed miss
→ same-runtime recovery confirmed
→ host/prompt-composition attribution remains open

PRE_SIMCORE_HOST_HISTORY_FRONTIER
→ repeated host/history first-break movement
→ SimCore classified NOT_FIRST_BREAK
→ observe-only attribution remains open

RELOAD_BOUNDARY_PROVENANCE_UNAVAILABLE_REBUILD
→ first-request expensive rebuild after a new runtime generation
→ correctness failure not established
→ provenance/host-history boundary remains interesting
```

The previously adjacent `DIAGNOSTIC_PANEL_SNAPSHOT_FRESHNESS_MISMATCH` is no longer a broad missing-design area because the Diagnostic UX research track now provides a complete pre-implementation contract for observation freshness/binding.

## 4. Proposed research scope

The first Host / History Resilience research should answer:

```text
Which facts belong to SimCore?
Which facts belong to the host/history observation boundary?
Which uncertainties must remain UNKNOWN / UNVERIFIED?
Which host/history movements are expected environmental variance versus actionable SimCore defects?
```

Recommended subtopics:

### A. Host / History Observation Authority Map

Map the current read-only observation path:

```text
host-visible chat/history
→ SimCore host adapter / request preparation
→ current-user / previous-assistant lineage
→ prompt/runtime coordination
→ diagnostics / cache-prefix attribution
```

Identify exact ownership boundaries without rewriting history.

### B. Handshake Miss Attribution Model

For `CORE_HANDSHAKE_TRANSIENT_MISS`, distinguish at least:

```text
SIMCORE_PREPARED_NOT_OBSERVED
HOST_PROMPT_COMPOSITION_CANDIDATE
REQUEST_REPLACED_OR_STALE
PROBE_BINDING_UNAVAILABLE
UNKNOWN_EXTERNAL
```

Do not invent these as runtime enums before evidence/contract review; they are research classes only.

Goal:

```text
fail-closed miss
→ explain where evidence stops
→ never convert one transient miss into host blame
```

### C. Pre-SimCore History Frontier Model

The existing cache work already identifies:

```text
CHAT_HISTORY
→ CURRENT_USER
→ SIMCORE_RUNTIME
```

and `PRE_SIMCORE_HOST_HISTORY_FRONTIER` indicates first-break movement can occur before SimCore's tail.

Host/history research should define what SimCore can and cannot attribute about that region without duplicating a full-history observer or rewriting the request.

### D. Reload Provenance Boundary

Clarify what information is legitimately unavailable after runtime reload and what can be retained safely as bounded observational provenance.

Hard rule:

```text
observational provenance
!= semantic Core state
```

Do not extend SnapshotStore semantic schema merely to make diagnostics more convenient.

## 5. Hard boundaries

This research must not authorize:

```text
history rewriting
synthetic history normalization
prompt relocation merely to hide host variance
new provider/network polling
persistent raw chat snapshots
second full-history scan per request
SnapshotStore semantic writes for host diagnostics
Main Model renderer responsibility movement
host blame without direct evidence
```

Canonical principle:

```text
observe / attribute / fail closed
!= mutate host/history to force stability
```

## 6. Suggested first artifact

The best first concrete artifact is:

```text
SIMCORE_HOST_HISTORY_OBSERVATION_AUTHORITY_MAP
```

It should be a source-grounded architecture map, not another runtime framework.

Questions to freeze:

```text
1. What host/history facts are already read today?
2. Which module owns each observation?
3. Which facts are direct versus inferred?
4. Which facts survive reload and which do not?
5. Which facts are reused by diagnostics/cache observation?
6. Where would duplicate history scans or duplicate attribution appear?
7. What must remain UNKNOWN when host evidence is insufficient?
```

After that map, decide whether the next narrow contract should be:

```text
Handshake Attribution Contract
or
Host-History Frontier Contract
or
no further research until new natural evidence
```

## 7. Relative priority of other available axes

Current ranking after Diagnostic UX closure:

```text
1. HOST / HISTORY RESILIENCE
   → best new independent research axis

2. REGRESSION EVIDENCE / FIXTURE EXPANSION
   → high leverage, low semantic risk
   → preferably component-triggered rather than broad standalone framework

3. M2-4 MIRROR / SESSION NARROWING
   → high-value architecture
   → should wait for M2-3 evidence/landing

4. SEMANTIC VALIDATOR / AUTHORITY COVERAGE
   → natural-failure triggered only

5. LEGACY / BOOTSTRAP MIGRATION
   → triggered only
```

## 8. Current classification

```text
NEXT_RESEARCH_FOCUS
= HOST_HISTORY_RESILIENCE

FIRST_ARTIFACT
= HOST_HISTORY_OBSERVATION_AUTHORITY_MAP

implementation
= NONE

runtime change
= NONE

prompt byte change
= NONE

SnapshotStore semantic change
= NONE

renderer responsibility change
= NONE
```

## 9. Stop rule

Do not automatically build a large Host/History framework.

Proceed:

```text
source/evidence map
→ identify one real unresolved ownership/attribution gap
→ freeze one narrow contract only if needed
→ completeness check
→ stop broad ideation when the evidence-supported questions are closed
```
