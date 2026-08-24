# SimCore Warning Notification Surface — Design Candidate

Date: 2026-08-25
Status: `DESIGN REFINED · LOCAL FLOATING MINI-WIDGET · POST-v0.64.7 LIVE-CLOSE CANDIDATE · NO RUNTIME CHANGE`
Current production: `v0.64.7 — Cross-Reload Cache Observer Continuity`

## 1. Motivation

Long-chat operation currently requires the user to open/copy diagnostics and visually notice:

```text
Warnings: N
Warnings detail:
- ...
```

That is safe but easy to miss during ordinary use. A small, non-blocking local floating surface when a real SimCore warning is produced would shorten the detection loop without changing any semantic validator.

This is an observability/UI feature only. It must not change whether a warning exists, whether output commits, whether Structure quarantines, or any Core state.

## 2. Existing warning authority

Current runtime already has one bounded warning authority after output processing:

```text
lastCore.issues
```

The diagnostic report uses the same array for `Warnings: N` and warning details.

Therefore the warning widget must consume the already-finalized warning result rather than introducing a second parser or re-running validators.

Frozen rule:

```text
validators / Structure / Reaction / Recovery
        ↓
existing output processing
        ↓
lastCore.issues finalized
        ↓
floating widget projection only
```

No widget logic may influence the upstream result.

## 3. Trigger semantics

Trigger only after the current assistant output has completed SimCore output processing and `lastCore.issues` is finalized.

Show/update the widget when:

```text
current output is bound/current
AND lastCore.issues.length > 0
AND this exact output-warning occurrence has not already been surfaced
```

Do not trigger on request preparation alone.

Do not trigger from stale diagnostic copies.

Do not trigger on `Compatibility diagnostics` by default. Compatibility diagnostics such as successful Thoughts compatibility handling are intentionally noisy/normal and are separate from `Warnings`.

## 4. Dedupe / occurrence identity

The same output may be touched by deferred mirror/UI/report flows more than once. The widget transition must be at-most-once per output-warning occurrence.

Conceptual key:

```text
assistant output index
+ bounded fingerprint of normalized warning codes/messages
```

A warning on a later assistant output is a new occurrence even if the warning text is the same and should be allowed to surface again.

Bounded in-memory dedupe only. No persistent warning-history schema is needed.

## 5. Notification levels

Keep the first version deliberately small:

```text
WARNING
- one or more ordinary `lastCore.issues`
- compact warning widget

QUARANTINE
- stateCommit / Structure explicitly rejected unsafe COMMUNITY/output state
- same widget shell with stronger bounded label
```

Do not invent Critical/High/Medium severity taxonomy for validator strings that do not currently carry such semantics.

Compatibility diagnostics remain panel-only unless a later evidence-backed design promotes a specific compatibility event.

## 6. Widget contents

Default compact copy should be bounded and content-free:

```text
⚠ SimCore · 1
```

For multiple warnings:

```text
⚠ SimCore · 3
```

For quarantine, a slightly wider bounded state is allowed:

```text
⚠ SimCore · 구조 경고
```

Optional secondary microcopy may say:

```text
진단 보기
```

Never include:

```text
raw user text
raw assistant body
COMMUNITY comments
system prompt text
full exception messages
large warning dumps
```

The full existing warning detail remains in the diagnostic panel/copy report.

## 7. UI behavior

Required UX:

```text
non-modal
non-blocking
must not steal text focus
must not pause generation
must not require dismissal to continue chat
small local floating widget
click/tap opens the existing SimCore diagnostic panel
```

Do NOT use blocking browser `alert()`.

Do not automatically open the fullscreen diagnostic container. The floating surface exists precisely to signal the exceptional state without interrupting the current chat.

### v1 display state machine

Freeze the first implementation to three small states:

```text
IDLE
Warnings 0
→ widget hidden

WARNING
Warnings > 0
→ one fixed compact floating widget appears/updates
→ `⚠ SimCore · N`

NEXT CLEAN OUTPUT
Warnings 0
→ prior warning widget removed
→ no separate “resolved” popup
```

A click/tap while the warning widget is current opens the existing SimCore diagnostic panel for details.

The first version does not retain a stale warning badge after a newer clean output, because the diagnostic panel is a last-turn/current-turn surface and a stale badge could point at unrelated clean diagnostics.

## 8. Local-plugin UI reference — Usage Dashboard

Repository reference:

```text
plugins/usage-dashboard/latest.js
```

The local Usage Dashboard plugin already demonstrates the desired UI family:

```text
main-screen floating DOM widget
compact/full presentation
viewport-aware fixed placement
single widget node updated in place
drag/dock support
widget lifecycle cleanup
mainDom permission before direct DOM insertion
```

This is a useful **UX and host-integration reference**, not a code-ownership dependency. SimCore must not import or couple to Usage Dashboard.

The warning widget should borrow only the small local-floating interaction style required for v1.

### v1 deliberately does NOT copy the full dashboard widget system

Defer these Usage Dashboard features:

```text
dragging
left/right docking
persistent coordinates
compact/full user toggle
pluginStorage-backed widget preferences
always-visible healthy status
```

Reason:

```text
warning notification = exceptional observability surface
usage dashboard = persistent informational dashboard
```

Copying the full interaction system would turn a narrow warning mini into a general UI framework change.

Frozen first-shape decision:

```text
MINI_WARNING_WIDGET_V1
= FIXED_COMPACT_FLOATING_BADGE
= HIDDEN_WHEN_HEALTHY
= CLICK_TO_DIAGNOSTIC
```

Suggested placement:

```text
viewport bottom-right
small safe inset from chat controls
clamped to viewport
high enough z-index to remain visible
no full-width overlay
```

Exact pixel values belong to implementation/visual fixture work, not semantic contract.

## 9. Host / DOM integration boundary

The current SimCore UI uses registered chat/settings entries plus the existing fullscreen diagnostic container. No dedicated toast helper is established in the reviewed SimCore source.

For a floating mini-widget, follow the local plugin pattern:

```text
request/use supported `mainDom` permission
→ create at most one SimCore-owned floating node
→ update/hide/remove that node only
```

If `mainDom` permission or DOM access is unavailable:

```text
widget surface: NOT AVAILABLE
existing diagnostics: UNCHANGED / STILL AUTHORITY
output processing: MUST SUCCEED
```

Permission/UI failure is not a Core warning and must not recursively create another warning.

The helper must not mutate chat history or generated output.

## 10. Ownership

Preferred ownership boundary:

```text
output handler
→ receives already-finalized `lastCore.issues`
→ calls small warning-widget/UI helper

warning-widget helper
→ presentation + current occurrence dedupe + lifecycle only
```

No new semantic module is required unless implementation size justifies a small UI-only helper.

Forbidden ownership changes:

```text
Structure validation semantics
Reaction grammar/normalization
Recovery/output compatibility
Representation/Edit Reconcile
Lifecycle/Time/Frame/Broadcast
Prompt compiler
SnapshotStore/Core schema
cache/provider logic
```

## 11. Resource lifecycle

First-version resource rule:

```text
at most one active warning widget node
no append-per-warning DOM growth
no polling
no interval
no auto-dismiss timer required
```

The widget is removed on:

```text
next clean current output
plugin unload
UI replacement/disable
```

Any click listener is attached once to the owned widget and removed with the node/lifecycle cleanup.

This no-timer v1 is preferred over a toast timeout because it keeps lifecycle simpler and avoids a warning disappearing while the user is still looking at the corresponding output.

A UI failure must be swallowed/logged as UI-only and must never fail output processing.

## 12. Configuration

For the first implementation, avoid turning the warning mini into a settings subsystem.

Preferred v1:

```text
warning floating widget: enabled by default
no position persistence
no drag/dock preferences
```

A future simple toggle may be added if practical:

```text
Warning widget: ON / OFF
```

Do not create multiple severity/filter/layout settings unless live use proves they are needed.

## 13. Static fixtures

A future implementation must test at least:

```text
1. Warnings 0
   → widget absent/hidden

2. one ordinary warning
   → one compact floating widget

3. multiple warnings in one output
   → one widget with bounded count, not N nodes/popups

4. same output observed again
   → no duplicate widget transition/node

5. same warning on next output
   → new occurrence may update/surface widget

6. compatibility diagnostic only, warnings 0
   → no widget

7. Structure/quarantine warning
   → stronger bounded quarantine presentation

8. stale/non-current output callback
   → no widget transition

9. next current output has Warnings 0
   → prior widget removed

10. click/tap
    → existing SimCore diagnostic panel opens
    → chat focus is not forcibly stolen before click

11. mainDom/DOM permission unavailable
    → no throw
    → diagnostics/output remain healthy

12. widget helper throws
    → output processing still succeeds

13. no raw bodies persisted/logged by widget helper

14. at most one DOM node + bounded listener lifecycle

15. plugin unload removes widget/listener

16. no interval/polling/auto-dismiss timer in v1

17. no pluginStorage/Core SnapshotStore change for widget position/preferences

18. no new network/request-history write

19. latest.js == install.js

20. v0.64.7 cache-continuity fixtures unchanged PASS

21. Representation/Edit/Broadcast/Time/Community frozen controls unchanged
```

## 14. Natural live gate

After deployment, wait for a natural warning rather than manufacturing semantic corruption in the long chat.

When a natural warning occurs, verify:

```text
floating widget appears once
widget count/category matches current diagnostic warning state
chat remains usable immediately
click opens the existing diagnostic panel
Warnings count/detail in diagnostic matches the widget occurrence
output/state disposition remains exactly what the existing validator decided
next healthy Warnings 0 output removes the stale widget
no orphan widget remains after reload/update/unload
```

If no natural warning appears, feature behavior remains statically proven / live NOT_EXERCISED. Do not intentionally damage a production long chat solely to trigger it.

## 15. Release ordering

Do not modify the currently deployed v0.64.7 while its real-long-chat close gate is pending.

Ordering:

```text
v0.64.7 live validation close
→ deferred/WATCH re-check
→ decide whether warning floating widget is the next mini
→ work branch implementation
→ static/CI
→ release-simcore
→ natural long-chat warning live gate
→ main evidence sync
```

If another evidence-backed correctness FIX appears before then, correctness takes priority and this UI mini remains deferred.

## 16. Current verdict

```text
idea: ACCEPTED AS GOOD DESIGN CANDIDATE
UX reference: local Usage Dashboard floating widget family
v1 shape: FIXED_COMPACT_FLOATING_BADGE
healthy state: HIDDEN
warning state: VISIBLE / bounded count
interaction: CLICK_TO_DIAGNOSTIC
mainDom unavailable: FAIL SILENT / DIAGNOSTICS REMAIN AUTHORITY
drag/dock/persistent position: DEFERRED
runtime correctness change: NONE
warning authority: existing lastCore.issues only
compatibility diagnostics: NO WIDGET by default
implementation: NOT STARTED
version assignment: NOT FROZEN until v0.64.7 live close
```
