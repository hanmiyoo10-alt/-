# SimCore Simple-First Runtime Implementation Handoff — 2026-08-27

Status: `USER AUTHORIZED · SIMPLE-FIRST RUNTIME IMPLEMENTATION ORDER · S-02 SELECTED FIRST · BLOCKED ONLY BY v0.64.7 LIVE GATE · NO RUNTIME CHANGE`

## 1. User direction

The standing product direction is now:

```text
implement the already-designed SimCore plugin ideas
→ prefer the simplest legitimate implementation first
→ do not reopen broad ideation for frozen designs
```

This authorization does not waive SimCore release sequencing, evidence requirements, or the current production live gate.

## 2. Current production gate

Current declared production remains:

```text
version: 0.64.7
release: Cross-Reload Cache Observer Continuity
release commit: a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release blob: 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
validation: PENDING_REAL_LONG_CHAT
priority: 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

`CURRENT_DEVELOPMENT.md` remains authoritative that no next runtime release or physical M2-3 implementation starts before this live gate is classified and closed.

Therefore:

```text
runtime implementation authorization = RECORDED
runtime byte mutation today           = BLOCKED BY SEQUENCING GATE
```

This is a sequencing gate, not a runtime defect classification.

## 3. First selected runtime idea

The first implementation after the v0.64.7 live gate closes is:

```text
S-02 — Diagnostic Quick Summary
```

Selection reason:

```text
size: SMALL
design: FROZEN
importance: 5 / VERY HIGH
design difficulty: 1 / VERY EASY
surface: existing diagnostic panel only
interaction: read-only
new semantic authority: NONE
new persistent state: NONE
new network: NONE
new polling/background task: NONE
new Host chat read/write: NONE
```

This matches the user's simple-first instruction without inventing a new idea or widening the frozen design.

## 4. Frozen S-02 product slice

S-02 v1 adds one compact read-only summary at the top of the existing diagnostic panel.

Exactly six semantic fields:

```text
Runtime
Mode
Binding
Warnings
Hotspot
Mirror
```

Presentation context may distinguish current/stale/unbound/unavailable view, but must not create a competing machine enum or a synthesized whole-system health score.

The detailed diagnostic remains available and authoritative below the summary.

## 5. v0.64.7 source seam review

Pre-implementation source inspection of production `release-simcore` v0.64.7 shows the required facts already exist in the current diagnostic path.

### 5.1 Existing report builder

`buildLastTurnDiagnosticReport(chat, state)` already resolves/coheres the current diagnostic observation and formats existing facts including:

```text
Runtime status
Mode
Warnings
Request hotspot
Deferred mirror
```

It already separates ordinary `Warnings` from `Compatibility diagnostics`.

S-02 must not parse its rendered report text to reconstruct these facts. Future implementation should reuse the underlying bounded values already present in the builder/open-panel scope or extract one pure shallow projection helper shared by the panel summary.

### 5.2 Existing panel seam

`openPanel()` already:

```text
loads current indices/chat
loads the Core session for that chat
uses the existing fullscreen SimCore container
constructs diagnostic DOM
binds the existing diagnostic-copy button
shows the existing container
```

The same runtime also registers the existing SimCore chat button/setting and unregisters registered UI parts on unload.

Therefore the preferred S-02 implementation seam is:

```text
existing diagnostic facts
→ small pure Quick Summary projection
→ small panel-header formatter/DOM block
→ existing full diagnostic body
```

Do not create a second panel, status service, observer loop, registry, storage layer, or background freshness watcher.

## 6. Runtime-audit lens for the first slice

Apply `SIMCORE_PRE_RELEASE_RUNTIME_AUDIT_PROMPT.md` during implementation.

Initial static risk expectation from the frozen design/source seam:

```text
memory pressure: LOW
retained-reference risk: LOW if no new long-lived listener/timer is introduced
CPU/main-thread risk: LOW because projection is bounded O(1)
async race risk: must preserve one-observation coherence and fail closed on unavailable binding
resource lifecycle risk: LOW if S-02 reuses existing panel lifecycle and adds no independent UI registration
```

Important implementation rule:

```text
no field may trigger a second expensive scan/read solely for Quick Summary
```

The existing diagnostic panel may already perform its normal capture work; S-02 should project that result rather than duplicate it.

## 7. Minimum implementation shape after gate open

Preferred narrow work item:

```text
1. record implementation evidence against exact production parent
2. create dedicated runtime work branch
3. add a bounded pure Quick Summary projection helper only if needed
4. add the compact header to existing openPanel DOM
5. add focused fixtures to the existing SimCore harness
6. keep latest.js and install.js identical
7. run syntax + permanent SimCore CI + regression controls
8. publish through the normal release-simcore authority path
9. run real long-chat UI validation
10. sync main evidence/continuity only after live result
```

No release-system/repository-system restructuring may be mixed into this feature slice.

## 8. Minimum static proof for S-02

At implementation time prove at least:

```text
healthy CURRENT_BOUND observation projects all six fields
warnings count uses finalized ordinary warning set only
compatibility diagnostics do not inflate Warnings
hotspot reuses existing timing fact without a second timing pass
Mirror reuses existing owner-produced result without a new Fresh read
unbound/unavailable observation never guesses CURRENT
all fields belong to one coherent observation instance
summary formatter failure cannot break the detailed panel or runtime
no raw user/assistant/Fresh body retention
no SnapshotStore semantic write
no network/polling/background task
no new Host chat mutation
existing diagnostic-copy semantics unchanged
v0.64.7 cache-continuity controls unchanged
latest.js == install.js
```

## 9. After S-02

Do not permanently freeze a long implementation sequence based only on design difficulty because design difficulty is not implementation LOC.

After S-02 closes, re-rank the remaining frozen runtime ideas by actual source-level implementation simplicity and regression surface.

Current frozen parked pool includes:

```text
S-01 MINI_WARNING_WIDGET_V1
S-03 Diagnostic Copy Profiles
S-04 Live Evidence Packet Builder
S-07 Host Capability Receipt
S-08 History Frontier Confidence Surface
```

Gated items remain gated even if they look easy.

Each next selection must preserve:

```text
legitimate gate open
→ smallest source/runtime surface
→ lowest regression risk
→ then value/leverage
```

## 10. Current verdict

```text
USER_SIMPLE_FIRST_DIRECTION = RECORDED
FIRST_RUNTIME_SLICE         = S-02 DIAGNOSTIC QUICK SUMMARY
DESIGN                      = FROZEN
SOURCE_SEAM                 = REVIEWED
IMPLEMENTATION_READINESS    = READY AFTER LIVE GATE
CURRENT RUNTIME MUTATION    = NONE
CURRENT BLOCKER             = v0.64.7 REAL LONG-CHAT SEQUENCING GATE
release-simcore             = UNCHANGED
latest.js/install.js        = UNCHANGED
```
