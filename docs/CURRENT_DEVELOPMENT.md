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
- Version: `0.63.46`
- Release: `Prompt Prefix Stabilization`
- Release branch: `release-simcore`
- Release commit: `b8d7a00f7f97c4ff08a414c4e7664a98907ba33d`
- Release blob: `e152f302f2130bcf0b6f70d0721eb7eee7907bf0`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `PROMPT_PREFIX_STABILIZATION_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

- The observed prompt-prefix first break repeatedly occurred in `PRE_SIMCORE · CHAT_HISTORY` under v0.63.44/v0.63.45.
- SimCore runtime repeatedly reported `SimCore contribution: NOT_FIRST_BREAK` for the cache break under investigation.
- Compiler `stable` / `slow` identity remained stable across the relevant lifecycle-mode changes while `volatile` / `full` changed as designed.
- Repeated historical assistant slots appeared as the same compact `assistant/text 21:4a852496` representation before later appearing as substantially larger assistant text.
- A rolling stable-prefix frontier was observed moving forward across natural turns: `@24 → @26`, with the following C request trajectory advancing to `@28` before a retry produced a 100% stable re-observation.
- v0.63.45 directly observed a first-break slot with identical `PRE_RECONCILE`, `POST_RECONCILE`, and `FINAL` full fingerprints and classified it `PREEXISTING_REQUEST_MUTATION · HIGH`.
- Therefore the tracked first-break representation change already existed before manual-edit reconcile; `reconcileManualEdit` was not the generator of that observed mutation.
- `MANUAL_EDIT_REBUILT` is not required for frontier progression: frontier progression remained observable across a subsequent `SAME_HOST_FAST` request path.
- A prior divergent `FRESH_CHAT` Deferred Mirror result was blocked by the strict mismatch gate; the next observed history break did not match that divergent FRESH fingerprint.
- Provider/gateway cache behavior remains unverified without external cache-token or hit/miss telemetry.

## SUPPORTED HYPOTHESES

- Historical assistant representations are likely being progressively materialized or re-projected by a host/request-history path before SimCore reconcile, producing the rolling CHAT_HISTORY prefix frontier.
- Stabilizing the request-only history projection from an exactly aligned authoritative raw-chat suffix may prevent repeated compact-to-full frontier movement without rewriting visible/persistent chat.
- Better request-history representation stability may indirectly reduce expensive rebuild/cache churn, but that is a secondary metric and must be measured rather than assumed.

## UNKNOWN

- Which exact host/history projection stage initially creates the repeated compact `21:4a852496` assistant representation.
- Why the observed frontier tends to move by two request messages at a time.
- Whether v0.63.46's conservative raw-chat alignment gate can safely resolve all relevant compact slots in real long-chat requests without frequent fail-open skips.
- Whether successful request-only stabilization materially improves natural-request common-prefix retention across multiple distinct turns.
- Actual gateway/provider prompt-cache hit behavior.

---

## Current v0.63.46 Live Gate

Primary natural-turn validation sequence:

```text
B_START
→ B_CONTINUE
→ B_END
→ C
```

Rules:

- apply v0.63.46, then reload once if needed for the update itself
- no reload between the four observed validation turns
- no regeneration between the four observed validation turns
- use natural new user turns; a 100% retry observation is not sufficient evidence by itself

Inspect especially:

```text
History stabilization
Cache topology
Cache break
History mutation
Frontier movement
Repeated break
Edit reconcile
Rebuild attribution
SimCore contribution
Deferred mirror
Broadcast / Frame / Continuity
```

Primary stabilization outcomes:

```text
APPLIED
NOOP_NO_KNOWN_COMPACT
SKIPPED_*
```

Interpretation:

- `APPLIED` means the strict gate deterministically aligned compact assistant slot(s) to substantial raw `# 응답` assistant bodies for this request only.
- `NOOP_NO_KNOWN_COMPACT` is valid when the inspected request contains no exact known compact signature.
- `SKIPPED_*` is fail-open safety behavior; do not broaden the repair gate until the skip reason is understood.
- Success requires improvement across natural distinct requests, not merely a retry that compares an identical request to itself.

Desired evidence after several natural turns:

```text
rolling 21:4a852496 break disappears or sharply decreases
frontier stops advancing one assistant at a time
PRE_SIMCORE CHAT_HISTORY first break moves later or becomes NONE
persistent mutation remains NONE
stabilization cost remains small
Broadcast / Frame / Continuity remain PASS
Deferred Mirror strict mismatch safety remains unchanged
```

Provider cache remains `UNVERIFIED` unless gateway/provider telemetry is supplied.

---

## v0.63.46 Repair Scope

The History Materialization Gate is intentionally narrow:

- active SimCore model requests only
- exact known compact signature `assistant/text 21:4a852496`
- hard cap of 12 compact candidate slots
- exact current-user and historical-user anchor agreement
- at least one exact substantial full-assistant calibration
- candidate raw assistant must be a substantial string and contain `# 응답`
- all candidates must align deterministically or the request is left untouched
- request projection only; no visible chat rewrite
- no persistent raw-body cache
- no new network call or timer

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
Recovery output policy
Deferred Mirror strict mismatch safety
Persistent storage schema
Network policy
Timer policy
Provider-cache policy
```

The earlier B_END unresolved preamble/community quarantine remains a separate output/recovery issue and is not part of the v0.63.46 cache repair.

---

## Next Candidate

If v0.63.46 safely improves natural-request prefix retention, the next candidate is:

```text
v0.63.47 — Cache Effect Verification
```

Its purpose is to measure the resulting local prefix/frontier/rebuild effects and, if gateway telemetry is available, compare them against actual cached-input behavior without inferring provider hits from local evidence alone.

---

## Maintenance Rule

After each release:

1. automated release-state sync should update the bounded Production Snapshot and `product-manifest.json`;
2. if release-token event chaining prevents the automatic sync, the release operator must synchronize them before declaring the update complete;
3. real long-chat validation determines whether VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN sections need revision;
4. durable architectural or operational principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
5. historical conclusions should be superseded explicitly rather than silently erased.
