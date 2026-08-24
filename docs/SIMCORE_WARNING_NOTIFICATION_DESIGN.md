# SimCore Warning Notification Surface — Design Candidate

Date: 2026-08-25
Status: `DESIGN RECORDED · POST-v0.64.7 LIVE-CLOSE CANDIDATE · NO RUNTIME CHANGE`
Current production: `v0.64.7 — Cross-Reload Cache Observer Continuity`

## 1. Motivation

Long-chat operation currently requires the user to open/copy diagnostics and visually notice:

```text
Warnings: N
Warnings detail:
- ...
```

That is safe but easy to miss during ordinary use. A transient, non-blocking notification when a real SimCore warning is produced would shorten the detection loop without changing any semantic validator.

This is an observability/UI feature only. It must not change whether a warning exists, whether output commits, whether Structure quarantines, or any Core state.

## 2. Existing warning authority

Current runtime already has one bounded warning authority after output processing:

```text
lastCore.issues
```

The diagnostic report uses the same array for `Warnings: N` and warning details.

Therefore the notification feature must consume the already-finalized warning result rather than introducing a second parser or re-running validators.

Frozen rule:

```text
validators / Structure / Reaction / Recovery
        ↓
existing output processing
        ↓
lastCore.issues finalized
        ↓
notification projection only
```

No notification logic may influence the upstream result.

## 3. Trigger semantics

Trigger only after the current assistant output has completed SimCore output processing and `lastCore.issues` is finalized.

Notify when:

```text
current output is bound/current
AND lastCore.issues.length > 0
AND this exact output-warning occurrence has not already been notified
```

Do not trigger on request preparation alone.

Do not trigger from stale diagnostic copies.

Do not trigger on `Compatibility diagnostics` by default. Compatibility diagnostics such as successful Thoughts compatibility handling are intentionally noisy/normal and are separate from `Warnings`.

## 4. Dedupe / occurrence identity

The same output may be touched by deferred mirror/UI/report flows more than once. Notification must be at-most-once per output-warning occurrence.

Conceptual key:

```text
assistant output index
+ bounded fingerprint of normalized warning codes/messages
```

A warning on a later assistant output is a new occurrence even if the warning text is the same and should be allowed to notify again.

Bounded in-memory dedupe only. No persistent warning-history schema is needed.

## 5. Notification levels

Keep the first version deliberately small:

```text
WARNING
- one or more ordinary `lastCore.issues`
- transient amber/neutral warning surface

QUARANTINE
- stateCommit / Structure explicitly rejected unsafe COMMUNITY/output state
- stronger visual surface
```

Do not invent Critical/High/Medium severity taxonomy for validator strings that do not currently carry such semantics.

Compatibility diagnostics remain panel-only unless a later evidence-backed design promotes a specific compatibility event.

## 6. Notification contents

Default UI copy should be bounded and content-free:

```text
⚠️ SimCore warning 1개
진단 패널에서 확인
```

For quarantine:

```text
⚠️ SimCore 구조 경고 — 상태 반영 제한
진단 패널에서 확인
```

Optional bounded category may be shown if it is already available as a structural reason code.

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
bounded lifetime or user-dismissable
click/tap may open the existing SimCore diagnostic panel
```

Do NOT use blocking browser `alert()`.

Implementation must first use a supported host transient-notification surface if one is available in the actual plugin API. If no such host API is available, use a small SimCore-owned DOM toast/badge with bounded lifecycle and unconditional cleanup.

Do not use the existing fullscreen diagnostic container itself as the automatic warning surface; auto-opening fullscreen would interrupt normal chat use.

## 8. Ownership

Preferred ownership boundary:

```text
output handler
→ receives already-finalized `lastCore.issues`
→ calls small notification/UI helper

notification helper
→ presentation + dedupe only
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

## 9. Resource lifecycle

If DOM fallback is used:

```text
at most one active warning surface at a time
replace/update rather than append unbounded nodes
track any one-shot cleanup timer/listener
remove node/listener/timer on replacement and plugin unload
```

No interval/polling loop.

If a timer is used for auto-dismiss, it must be one-shot and bounded. A notification failure must be swallowed/logged as UI-only and must never fail output processing.

## 10. Configuration

Initial recommendation: notification enabled by default because it surfaces an already-existing exceptional state, but keep the feature easy to disable if practical.

Preferred future toggle:

```text
Warning notifications: ON / OFF
```

Do not create multiple severity/filter settings in the first mini unless live use proves they are needed.

## 11. Static fixtures

A future implementation must test at least:

```text
1. Warnings 0
   → no notification

2. one ordinary warning
   → one non-blocking notification

3. multiple warnings in one output
   → one notification with bounded count, not N popups

4. same output observed again
   → no duplicate popup

5. same warning on next output
   → new notification allowed

6. compatibility diagnostic only, warnings 0
   → no notification

7. Structure/quarantine warning
   → stronger quarantine notification

8. stale/non-current output callback
   → no notification

9. notification UI throws/unavailable
   → output processing still succeeds

10. no raw bodies persisted/logged by notification helper

11. no new network/storage/request-history write

12. lifecycle cleanup removes active UI/timer/listener

13. latest.js == install.js

14. v0.64.7 cache-continuity fixtures unchanged PASS

15. Representation/Edit/Broadcast/Time/Community frozen controls unchanged
```

## 12. Natural live gate

After deployment, wait for a natural warning rather than manufacturing semantic corruption in the long chat.

When a natural warning occurs, verify:

```text
notification appears once
chat remains usable immediately
Warnings count/detail in diagnostic matches the notification occurrence
output/state disposition remains exactly what the existing validator decided
next healthy Warnings 0 output produces no stale notification
```

If no natural warning appears, feature behavior remains statically proven / live NOT_EXERCISED. Do not intentionally damage a production long chat solely to trigger it.

## 13. Release ordering

Do not modify the currently deployed v0.64.7 while its real-long-chat close gate is pending.

Ordering:

```text
v0.64.7 live validation close
→ deferred/WATCH re-check
→ decide whether warning notification is the next mini
→ work branch implementation
→ static/CI
→ release-simcore
→ natural long-chat warning live gate
→ main evidence sync
```

If another evidence-backed correctness FIX appears before then, correctness takes priority and this UI mini remains deferred.

## 14. Current verdict

```text
idea: ACCEPTED AS GOOD DESIGN CANDIDATE
value: HIGH for long-chat observability
runtime correctness change: NONE
recommended behavior: edge/occurrence-triggered, non-modal, deduped
warning authority: existing lastCore.issues only
compatibility diagnostics: NO POPUP by default
implementation: NOT STARTED
version assignment: NOT FROZEN until v0.64.7 live close
```
