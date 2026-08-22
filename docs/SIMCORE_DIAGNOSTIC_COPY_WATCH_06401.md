# SimCore v0.64.1 — Diagnostic Copy Failure Watch

## Status

Classification: `DIRECT_EVIDENCE / OBSERVABILITY DEFECT / NON-RUNTIME-BLOCKING`

Observed during the natural B_END evidence sequence on v0.64.1. The diagnostics panel rendered normally, but the manual diagnostic copy action repeatedly returned `복사 실패`.

## Important code fact

Current v0.64.1 copy implementation is:

```js
async function copyLastTurnDiagnostic(chat, state) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(buildLastTurnDiagnosticReport(chat, state));
      return true;
    }
  } catch (_) {}
  return false;
}
```

Therefore the UI collapses at least two distinct failure stages into the same visible result:

1. `buildLastTurnDiagnosticReport(chat, state)` throws while building the report.
2. `navigator.clipboard.writeText(...)` rejects/fails after a valid report was built.

There is no fallback path and the caught error is not surfaced in diagnostics.

## Why B_END is a high-value discriminator

Earlier copied B_START/B_CONTINUE diagnostics from the same user environment were successfully obtained, while the B_END panel repeatedly showed `복사 실패`. This raises the priority of a B_END/report-builder-specific exception relative to a generic persistent clipboard-permission explanation, although the current code cannot distinguish the two.

The B_END report builder uniquely evaluates terminal broadcast timestamp/closure material including `time.narrativeTimestampSequence(...)`, `Broadcast closure`, and `Broadcast terminal coverage`. No defect in those calculations is proven yet; this is only a narrowed investigation target.

## Evidence already preserved despite copy failure

The B_END screenshot preserves:

```text
SimCore v0.64.1
Mode B_END
Broadcast UNLOCKED
Last broadcast airtime 2031-02-28 09:55 PM
ROOT B@2048 -> PARENT B@2060 -> B@current
Volume 77 -> 77 SAME
Chapter 3 -> 3 SAME
Chatindex 1001 -> 1002 ADVANCED
FRAME REGRESSION NONE
Warnings 2 (COMMUNITY comment-tag warnings)
Compatibility diagnostics 0
```

Full `Broadcast closure` / `Broadcast terminal coverage` lines were not captured.

## Recommended narrow fix

Do not mix this with M2-3 Edit Reconcile behavior. If patched, keep it UI/observability-only:

- Build the report in a separate guarded step and distinguish `BUILD_FAILED` from `CLIPBOARD_FAILED`.
- Keep `navigator.clipboard.writeText` as the primary path.
- Add a browser-local fallback copy path (e.g. temporary textarea + selection + legacy copy command where supported), or expose the generated report in a selectable readonly text area when clipboard writing fails.
- Do not add persistence, host chat writes, network calls, timers, or runtime semantic changes.
- Preserve the report body byte-for-byte when primary and fallback paths both succeed.

## Current decision

This defect blocks convenient evidence collection, not SimCore runtime correctness. It should not by itself block M2 progression, but it is worth fixing before future high-value diagnostic gates because the current single `복사 실패` result hides whether report generation or clipboard transport failed.

## v0.64.2 production response

Status: `PATCHED / LIVE ATTRIBUTION PENDING`

The report builder remains byte-identical. Report construction and clipboard transport are now separate, the report is built exactly once, primary/fallback payloads are identical, DOM cleanup is unconditional, and four bounded UI results expose the failed stage. A natural B_END builder repair remains forbidden until `REPORT_BUILD_FAILED` directly attributes the failure.

---

## v0.64.2 live attribution — B_END report builder failure CONFIRMED

Captured: 2026-08-22
Runtime generation: `mt4bcgc3-5556z8`
Production: `v0.64.2 — Diagnostic Copy Resilience`

The required natural discriminator has now occurred.

Earlier diagnostic reports in the same runtime generation were copied successfully for ordinary C and active B_START/B_CONTINUE turns. The final natural B_END panel remained fully renderable, but clicking the copy control changed the button text to:

```text
진단 생성 실패
```

In v0.64.2 this label maps only to:

```text
REPORT_BUILD_FAILED
```

The copy implementation performs report construction inside its own guarded step and returns `REPORT_BUILD_FAILED` before Clipboard API or textarea fallback transport when the builder throws. Therefore the old v0.64.1 ambiguity is now resolved: this B_END failure is a **report-builder exception**, not a generic clipboard transport failure.

### B_END screenshot evidence

```text
SimCore v0.64.2
MODE B_END
RUNTIME ACTIVE
Stored last mode B_END
Broadcast UNLOCKED
Last broadcast airtime 2031-03-07 09:55 PM
ROOT B@2066 · PARENT B@2078 · B@current
Volume 77→77 SAME
Chapter 4→4 SAME
Chatindex 1010→1011 ADVANCED
FRAME REGRESSION: NONE
Warnings: 4
Compatibility diagnostics: 0
Runtime prompt: 2,670 chars / 52 lines · mode B_END
```

### Root-cause source correlation

The current B_END-only builder branch is:

```js
const broadcastTerminal = outputFresh && runtimeMode === 'B_END' && latestAssistantIndex >= 0
  ? time.narrativeTimestampSequence(kernel.textOfMessage(messages[latestAssistantIndex]))
  : null;
```

The outer runtime scope does not bind either `time` or `kernel` through `SimCore.require(...)`.

Consequently:

```text
non-B_END
→ conditional branch false
→ undefined identifiers are not evaluated
→ report may build normally

current committed B_END
→ conditional branch true
→ evaluate `time...` first
→ ReferenceError before report string exists
→ REPORT_BUILD_FAILED
```

Even if `time` alone were bound, `kernel` is also unbound in the same expression; both bindings must be corrected or the branch must call an already-owned exported helper.

### Updated classification

```text
v0.64.1 failure attribution: RESOLVED
v0.64.2 transport split: WORKING AS DESIGNED
B_END report-builder defect: CONFIRMED
clipboard primary/fallback defect: NOT INDICATED BY THIS SAMPLE
runtime correctness: UNAFFECTED
surface: OBSERVABILITY ONLY
cause: UNBOUND B_END-ONLY REPORT-BUILDER DEPENDENCIES
```

### Release gate consequence

The v0.64.2 source contract explicitly states that a future natural `REPORT_BUILD_FAILED` is the gate for a separate builder-repair mini. That gate is now satisfied.

Required ordering:

```text
1. freeze completed M2-3 detailed design
2. ship one narrow diagnostic builder repair mini before M2-3 implementation
3. directly re-test a current-turn B_END report build/copy
4. resume M2-3 implementation after that mini passes
```

Do not combine this repair with Edit Reconcile, Broadcast semantics, Structure/COMMUNITY behavior, Store performance, Prompt, or host-history work.

Full natural B_START→B_END sequence evidence is preserved in `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`.


## v0.64.3 builder-binding repair

Production `v0.64.3 — B_END Diagnostic Builder Binding Repair` is statically released at `d7fd45cd193ef1ff187c73761ded958d89558ebf` / blob `ff481aa904340b844ef29b0d89aa20bd6286286d`. The confirmed v0.64.2 `REPORT_BUILD_FAILED` source defect is repaired by binding the existing Kernel and Time modules in the outer diagnostic runtime scope while keeping the report-builder body and clipboard transport contract unchanged. Natural current-turn B_END copy remains this mini's close gate. The separate `POST_BEND_C_CLOCK_DOMAIN_GAP` must be reviewed after that close gate before M2-3 is allowed to start.
