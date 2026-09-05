# SimCore Diagnostic Three-Lens Operator Gating

Date: 2026-09-06 KST
Status: **ADOPTED INTERACTION RULE · NON-RUNTIME**
Scope: SimCore real-long-chat diagnostic review interaction

## Decision

The adopted three-lens diagnostic review remains:

1. Version Lens
2. Set Lens
3. Element-Inventory Lens

From now on, the three lenses are not to be automatically collapsed into one continuous assistant analysis. Each lens is a separately closed review step with an explicit operator gate before the next lens begins.

## Required interaction sequence

```text
diagnostic log(s) arrive
    ↓
Pass 1 — Version Lens
    ↓
assistant stops and reports Pass-1 verdict
    ↓
operator explicitly advances, e.g. "2차ㄱ"
    ↓
Pass 2 — Set Lens
    ↓
assistant stops and reports Pass-2 verdict
    ↓
operator explicitly advances, e.g. "3차ㄱ"
    ↓
Pass 3 — Element-Inventory Lens
```

The assistant may notice a potentially important anomaly while an earlier lens is in progress, but it must preserve the anomaly for the appropriate later lens instead of silently completing later passes in the same response. A genuinely urgent BLOCKER may be surfaced immediately, but the formal later-lens review is still performed only after the operator gate.

## Why

The lenses answer different questions:

- Version Lens: did the current release satisfy its intended contract and live gate?
- Set Lens: does the supplied sequence of logs form a coherent runtime/action/state transition set?
- Element-Inventory Lens: did every diagnostic surface receive an explicit disposition, including NOT_EXERCISED / NOT_APPLICABLE?

Separating them reduces anchoring, review fatigue, accidental scope blending, and hidden omissions. It also gives the operator a chance to add action context such as refresh/reroll/manual-edit information between passes.

## Non-goals

This rule does not change runtime code, release bytes, live-gate criteria, diagnostic fields, or the PASS/WATCH/DEFER/FIX/BLOCKER taxonomy.

It does not retroactively invalidate prior three-lens reviews. It governs future interactive reviews from adoption onward.

## Production boundary

This is an administrative diagnostic-review rule only.

```text
release-simcore mutation = NONE
latest.js mutation = NONE
install.js mutation = NONE
runtime behavior change = NONE
```
