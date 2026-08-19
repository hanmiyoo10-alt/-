# SimCore Current Development Memory

> Living operational memory for the current SimCore investigation.
>
> This file is intentionally different from `SIMCORE_GUIDELINES.md`.
> Guidelines contain durable principles; this file records the current production state,
> verified evidence, supported hypotheses, unknowns, live validation gate, and next candidates.

---

<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.45`
- Release: `History Rebuild Frontier Attribution`
- Release branch: `release-simcore`
- Release commit: `eeec4a58417d32acd8161844e8c2d071e17e212f`
- Release blob: `49b21dd121cc508fa5d5e1b736d088a10cfe2aa5`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `PROMPT_PREFIX_STABILITY`
- Provider cache: `UNVERIFIED`

This block is machine-managed by `.github/workflows/simcore-release-state-sync.yml` after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

- The observed prompt-prefix first break has repeatedly occurred in `PRE_SIMCORE · CHAT_HISTORY`.
- SimCore runtime has repeatedly reported `SimCore contribution: NOT_FIRST_BREAK` for the cache break under investigation.
- Compiler `stable` / `slow` identity has remained stable across the relevant lifecycle-mode changes while `volatile` / `full` may change as designed.
- Repeated historical assistant slots have appeared as the same compact `21:4a852496` representation before later appearing as substantially larger assistant text.
- A rolling stable-prefix frontier has been observed moving forward across natural turns.
- `MANUAL_EDIT_REBUILT` has co-occurred with important degraded-prefix samples and can dominate SimCore request-preparation time.
- A prior divergent `FRESH_CHAT` Deferred Mirror result was blocked by the strict mismatch gate; the next observed history break did not match that divergent FRESH fingerprint.
- Provider/gateway cache behavior remains unverified without external cache-token or hit/miss telemetry.

## SUPPORTED HYPOTHESES

- Historical assistant representations may be progressively materialized or re-projected across requests, causing a moving CHAT_HISTORY prefix frontier.
- `MANUAL_EDIT_REBUILT` is strongly associated with the observed representation frontier, but v0.63.44 evidence did not yet prove whether reconcile causes the mutation or merely observes an earlier host/request mutation.
- Improving request-history representation stability may improve prompt-cache friendliness and may indirectly reduce rebuild/cache churn, but this must be measured rather than assumed.

## UNKNOWN

- Whether the current CHAT_HISTORY first-break representation already exists before manual-edit reconcile.
- Whether `reconcileManualEdit` directly mutates the relevant request representation.
- Whether the mutation occurs later in request preparation after reconcile.
- Which host/history projection path initially creates the repeated compact assistant representation.
- Actual gateway/provider prompt-cache hit behavior.

---

## Current v0.63.45 Live Gate

Primary natural-turn validation sequence:

```text
B_START
→ B_CONTINUE
→ B_END
→ C
```

Rules:

- no reload between the four observed turns
- no regeneration between the four observed turns
- use natural new user turns

Inspect especially:

```text
Edit reconcile
History mutation
Reconcile frontier
Frontier movement
Repeated break
Representation correlation
Mutation attribution
Rebuild attribution
```

Decisive labels:

```text
PREEXISTING_REQUEST_MUTATION · HIGH
RECONCILE_MUTATED_REQUEST · HIGH
POST_RECONCILE_REQUEST_MUTATION · HIGH
```

Lower-confidence / bounded-window outcomes such as `OUT_OF_WINDOW` or `MULTISTAGE_REQUEST_MUTATION` do not authorize repair yet.

---

## Current Hard Freeze

```text
Broadcast End Authority
Frame
Continuity
Evidence
Lineage
Source Handoff
Reaction
Recurrence
Structure
Runtime placement / TAIL_AFTER_CURRENT_USER
Compiler tier semantics
Deferred Mirror strict mismatch safety
Persistent storage schema
Network policy
Timer policy
Provider-cache policy
```

---

## Next Candidate

If v0.63.45 establishes a high-confidence causal location, the next candidate is:

```text
v0.63.46 — Prompt Prefix Stabilization
```

The exact repair target must follow the v0.63.45 evidence rather than being chosen in advance.

---

## Maintenance Rule

After each release:

1. automated release-state sync updates the bounded Production Snapshot and `product-manifest.json`;
2. real long-chat validation determines whether VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN sections need human/agent revision;
3. durable architectural or operational principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
4. historical conclusions should be superseded explicitly rather than silently erased.
