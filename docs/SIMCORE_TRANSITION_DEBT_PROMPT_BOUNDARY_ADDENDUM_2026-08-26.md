# SimCore Transition Debt — Prompt Boundary Addendum — 2026-08-26

Status: `TRANSITION-DEBT ADDENDUM · TD-13 / TD-14 RECORDED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority: `release-simcore` v0.64.7.

Parent map:
- `docs/SIMCORE_CONTRACTS_V2_TRANSITION_DEBT_RETIREMENT_MAP_IDEA.md`

Source review:
- `docs/SIMCORE_PROMPT_RUNTIME_BOUNDARY_COHESION_REVIEW_2026-08-26.md`

This addendum extends the parent transition-debt inventory with two Prompt/Runtime boundary debts discovered after the parent map was frozen. It is authoritative for TD-13 / TD-14 until the parent map is next consolidated.

## TD-13 — Prompt reconcile-input mutation capability

```text
ID: TD-13
classification: FIX / ARCHITECTURE OWNERSHIP DRIFT
current impact: no established user-visible correctness incident
blocking: NO
runtime implementation now: NONE
```

Current physical shape:

```text
Prompt.compileRuntimePromptParts(state)
→ kernel.reconcileState(state)
```

Kernel reconciliation mutates the supplied object while normalizing it, so Prompt currently has a physical path capable of mutating semantic state despite its serializer-only contract.

Target:

```text
Prompt compilation consumes a read-only-equivalent state view
→ prompt bytes unchanged
→ caller semantic state unchanged by compilation
```

Retirement trigger:

```text
current v0.64.7 live gate closed
+ selected standalone architecture-cleanup slice
```

Preferred proof:

```text
A/B/C/B_END/recurrence/handoff/summary/clock prompt byte identity
input state deep-equivalent before/after compile
identity tiers unchanged
no new Store/Host/network/timer surface
```

Do not globally redesign Kernel reconciliation solely for TD-13 without separate ownership proof.

## TD-14 — Prompt-byte Evidence control coupling

```text
ID: TD-14
classification: FIX / APPLICATION-RUNTIME CONTROL-PLANE COUPLING
current impact: no established user-visible correctness incident
blocking: NO
runtime implementation now: NONE
post-M2-3 rebase preferred: YES
```

Current physical shape:

```text
owner-produced source-lock eligibility
→ Prompt emits `short_community_source_is_authoritative=1`
→ Runtime reparses rendered Prompt lines
→ derives `sourceAnchor`
→ `sourceAnchor` gates evidence.inspectAndFence(...)
```

The rendered Prompt byte stream therefore participates in deciding whether another subsystem runs.

Target:

```text
Handoff/Lifecycle-owned bounded request fact
├─ Prompt serializes source-lock wording
└─ Runtime gates Evidence directly from the structured fact
```

Rendered Prompt bytes may still be inspected for diagnostics that explicitly describe what was emitted, but they must not be the authoritative control transport for Evidence eligibility.

Retirement trigger:

```text
post-M2-3 request-shell rebase
→ select smallest mechanical structured-fact handoff
```

Required proof:

```text
same exact Prompt bytes
same eligible Short-C Evidence invocation
same ineligible/recurrence/ordinary-C/A/B non-invocation behavior
no wider fencing scope
no extra request/history scan
no raw body retention
```

## Ordering

```text
v0.64.7 live gate close
→ M2-3 according to existing plan
→ re-read actual request shell
→ TD-14 structured Evidence eligibility cleanup

TD-13
→ may be independent after live-gate close
→ keep separate from prompt semantic changes and performance work
```

Neither item changes the current verdict that Prompt is cohesive and should remain one Application-layer compiler/serializer module.
