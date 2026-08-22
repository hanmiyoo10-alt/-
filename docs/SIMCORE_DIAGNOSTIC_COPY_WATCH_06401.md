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

Earlier copied B_START/B_CONTINUE diagnostics from the same user environment were successfully obtained, while the B_END panel repeatedly showed `복사 실패`. This raises the priority of a B_END/report-builder-specific exception relative to a generic persistent clipboard-permission explanation, although the v0.64.1 code cannot distinguish the two.

The B_END report builder uniquely evaluates terminal broadcast timestamp/closure material including `time.narrativeTimestampSequence(...)`, `Broadcast closure`, and `Broadcast terminal coverage`.

## Evidence already preserved despite copy failure

The B_END screenshot preserved:

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
- Add a browser-local fallback copy path or equivalent bounded fallback.
- Do not add persistence, host chat writes, network calls, timers, or runtime semantic changes.
- Preserve the report body byte-for-byte when primary and fallback paths both succeed.

## v0.64.2 production response

Status: `PATCHED / LIVE ATTRIBUTION COMPLETE`

The report builder remained byte-identical. Report construction and clipboard transport were separated, the report was built exactly once, primary/fallback payloads were identical, DOM cleanup was unconditional, and four bounded UI results exposed the failed stage.

---

## v0.64.2 live attribution — B_END report builder failure CONFIRMED

Captured: 2026-08-22
Runtime generation: `mt4bcgc3-5556z8`
Production: `v0.64.2 — Diagnostic Copy Resilience`

The required natural discriminator occurred.

Earlier diagnostic reports in the same runtime generation were copied successfully for ordinary C and active B_START/B_CONTINUE turns. The final natural B_END panel remained fully renderable, but clicking the copy control changed the button text to:

```text
진단 생성 실패
```

In v0.64.2 this label maps only to:

```text
REPORT_BUILD_FAILED
```

The copy implementation performs report construction inside its own guarded step and returns `REPORT_BUILD_FAILED` before Clipboard API or textarea fallback transport when the builder throws. Therefore the old v0.64.1 ambiguity was resolved: this B_END failure was a **report-builder exception**, not a generic clipboard transport failure.

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

The B_END-only builder branch was:

```js
const broadcastTerminal = outputFresh && runtimeMode === 'B_END' && latestAssistantIndex >= 0
  ? time.narrativeTimestampSequence(kernel.textOfMessage(messages[latestAssistantIndex]))
  : null;
```

The outer runtime scope did not bind either `time` or `kernel` through `SimCore.require(...)`.

Consequently:

```text
non-B_END
→ conditional branch false
→ undefined identifiers not evaluated
→ report may build normally

current committed B_END
→ conditional branch true
→ evaluate unbound dependency
→ ReferenceError before report string exists
→ REPORT_BUILD_FAILED
```

Both dependencies therefore needed to be bound, or the calculation had to route through an already-owned helper.

### Updated classification after v0.64.2

```text
v0.64.1 failure attribution: RESOLVED
v0.64.2 transport split: WORKING AS DESIGNED
B_END report-builder defect: CONFIRMED
clipboard primary/fallback defect: NOT INDICATED BY THIS SAMPLE
runtime correctness: UNAFFECTED
surface: OBSERVABILITY ONLY
cause: UNBOUND B_END-ONLY REPORT-BUILDER DEPENDENCIES
```

The result authorized a separate narrow builder repair. It did not require reopening M2-3 design and did not prohibit M2-3 implementation from proceeding on its independent workstream.

Full natural B_START→B_END sequence evidence is preserved in `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`.

---

## v0.64.3 builder-binding repair — LIVE CLOSED

Production `v0.64.3 — B_END Diagnostic Builder Binding Repair` was statically released at:

```text
release commit: d7fd45cd193ef1ff187c73761ded958d89558ebf
release blob:   ff481aa904340b844ef29b0d89aa20bd6286286d
```

The confirmed v0.64.2 source defect was repaired by binding the existing Kernel and Time modules in the outer diagnostic runtime scope while keeping the report-builder body and clipboard transport contract unchanged.

### Natural current-turn B_END live close

Captured on runtime generation `mt4giy5r-34f2jf`:

```text
Turn: user @2090 → assistant @2091
Mode: B_END
Runtime status: ACTIVE · output COMMITTED
Stability: PASS · BOUND · COMMITTED · mirror COMMITTED
Broadcast lifecycle: ENDING · mode B_END
Broadcast end authority: ALLOWED · explicit-b-end
End boundary: END AUTHORIZED
Broadcast closure: PARTIAL · terminal EXPLICIT · structure QUARANTINED
Broadcast terminal coverage: EXPLICIT_TERMINAL
frame:    2031-03-14 09:25 PM
terminal: 2031-03-14 09:40 PM
stored:   2031-03-14 09:40 PM
Stored broadcast: UNLOCKED · airtime 09:40 PM
```

The full current-turn B_END diagnostic report was successfully generated and copied. This directly exercises the branch that failed on v0.64.2.

### Final classification

```text
v0.64.3 B_END report-builder repair: LIVE PASS
REPORT_BUILD_FAILED recurrence: NO
general report copy path: PASS
B_END-only closure/terminal report lines: PRESENT
v0.64.3 close gate: SATISFIED
runtime semantics: UNCHANGED
```

The same B_END report exposed a separate Structure quarantine. That is not a regression of the diagnostic builder repair and is tracked independently in `SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md` / deferred evidence.

M2-3 remains an independent implementation workstream and was already in progress while this observability mini was being live-closed.
