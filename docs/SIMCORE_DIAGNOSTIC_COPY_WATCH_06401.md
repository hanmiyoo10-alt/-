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
