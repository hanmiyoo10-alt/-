# SimCore Current Development Memory

> Living operational memory for the current SimCore investigation.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file records the current production state, verified evidence, supported hypotheses, unknowns, live validation gate, and next candidates.

---

<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.49`
- Release: `Cache Effect Verification`
- Release branch: `release-simcore`
- Release commit: `4af2bef0c9b9478e5a0b5f27a00dffe6ea4594c2`
- Release blob: `7478596cd9ccc862f425ae6efdd230a0198dc804`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `CACHE_EFFECT_VERIFICATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

- The investigated prompt-prefix first break repeatedly occurs before SimCore in `CHAT_HISTORY`; SimCore reports `NOT_FIRST_BREAK` for that break.
- Historical assistant slots repeatedly appear first as the exact compact signature `assistant/text 21:4a852496` and later as substantially larger assistant text.
- v0.63.45 proved one tracked assistant representation change already existed before reconcile: `PRE_RECONCILE == POST_RECONCILE == FINAL` and `Rebuild attribution: PREEXISTING_REQUEST_MUTATION · HIGH`.
- Frontier progression can occur with `SAME_FAST` / `SAME_HOST_FAST`; `MANUAL_EDIT_REBUILT` is not required to generate the rolling history representation change.
- v0.63.46 stayed fail-open because exact current-user comparison produced `SKIPPED_CURRENT_USER_MISMATCH`; no request repair executed and persistent mutation stayed `NONE`.
- v0.63.47 stayed fail-open because body/calibrator-derived alignment produced `NO_CANDIDATE` / `SKIPPED_INSUFFICIENT_CALIBRATORS`; no request repair executed and persistent mutation stayed `NONE`.
- v0.63.48 turn-ordinal alignment also stayed fail-open in the observed real long-chat sequence. The observed natural turns reported `History alignment: ROLE_DRIFT`, with only the endpoint role matching (`1/N`) and `targets 0/1`; no compact target was mapped or replaced.
- During that same v0.63.48 sequence, the compact assistant frontier continued to advance naturally at `@24 → @26 → @28`, each time with `assistant/text 21:4a852496 → full assistant` and `SimCore contribution: NOT_FIRST_BREAK`.
- The v0.63.48 common prefix nevertheless remained large and grew across the observed B sequence: approximately `382,389 chars / 86.4%` at B_START, `386,775 / 86.6%` at B_CONTINUE, and `394,679 / 87.4%` at B_END.
- The user externally observed caching on those distinct natural B_START, B_CONTINUE, and B_END turns even though the compact frontier remained and no v0.63.48 repair executed. This is strong operational evidence that the rolling compact-history frontier does **not by itself** prevent useful cache reuse.
- The external cache indication is not equivalent to provider-token telemetry. SimCore still has no authoritative gateway/provider cached-input counters, so provider cache status remains `UNVERIFIED` inside diagnostics.
- v0.63.48 safety remained intact: request-only stabilization never applied, persistent mutation stayed `NONE`, runtime remained `TAIL_AFTER_CURRENT_USER`, Broadcast/Frame/Continuity passed, and Deferred Mirror strict mismatch behavior remained unchanged.
- Same-turn retry `100% STABLE` observations remain sanity checks only; the decisive new evidence came from distinct natural requests where external caching was observed.

## SUPPORTED HYPOTHESES

- A host/request-history projection step before SimCore progressively materializes or re-projects historical conversation representations, producing the moving stable-prefix frontier.
- The host/raw and final-request conversational spines are not reliably endpoint-aligned by a simple one-to-one role ordinal in the observed long chat; v0.63.48 role drift makes further heuristic repair broadening unsafe.
- The compact `21:4a852496` frontier is better treated as a representation-boundary observation than as a cache-failure condition.
- Useful cache reuse can coexist with a moving first-break frontier when the reusable prefix before that frontier remains very large.
- Local common-prefix growth is a useful correlation signal, but it must stay semantically separate from actual provider cache hit/miss claims.
- Expensive reconcile or storage latency may be a later optimization target, but it should not be mixed into Cache Effect Verification.

## UNKNOWN

- Which exact host/history projection stage creates the compact `21:4a852496` representation.
- Why the frontier often advances by two conversational messages per distinct natural turn.
- Whether the separate B_START `HOST_PREFIX @0` family reset is normal host-prefix evolution or another local stability phenomenon.
- Which host/provider layer produced the external caching indication observed by the user.
- Whether authoritative provider cached-input/token metrics are exposed anywhere accessible to SimCore without adding new network/provider coupling.
- How stable the observed large reusable-prefix window remains across additional natural C/B_START/B_CONTINUE/B_END sequences.

---

## Current v0.63.49 Live Gate

Target release:

```text
v0.63.49 — Cache Effect Verification
```

Primary validation sequence after applying v0.63.49 and performing one update reload if needed:

```text
C baseline
→ B_START
→ B_CONTINUE
→ B_END
→ C
```

Rules:

- no reload or regeneration between the five observed turns;
- use natural distinct user turns;
- user-side cache indication may be reported as external evidence, but SimCore must not translate it into provider HIT/MISS without authoritative provider telemetry;
- same-turn retry/regeneration remains a sanity check only.

Inspect especially:

```text
Cache effect
Cache topology
Cache break
History mutation
History alignment
History stabilization
Reconcile frontier
Frontier movement
Repeated break
Edit reconcile
Rebuild attribution
SimCore contribution
Deferred mirror
Broadcast / Frame / Continuity
```

Expected v0.63.49 history behavior:

```text
History alignment: OBSERVE_ONLY
History stabilization: OBSERVE_ONLY
request mutation NONE
persistent NONE
```

The exact compact target remains diagnostic-only:

```text
assistant/text 21:4a852496
```

Expected Cache effect states:

```text
BASELINE
REUSE_WINDOW_GROWING
REUSE_WINDOW_STABLE
REUSE_WINDOW_SHRINKING
PREFIX_COLLAPSE
```

Interpretation:

- `REUSE_WINDOW_GROWING` means the already-observed local common request prefix increased relative to the prior distinct natural request.
- `REUSE_WINDOW_STABLE` means the local reusable prefix did not materially move or the whole request projection is identical.
- `REUSE_WINDOW_SHRINKING` means the local common prefix frontier moved backward.
- `PREFIX_COLLAPSE` is reserved for a request where the common prefix falls to zero messages/chars.
- None of these states means provider HIT or MISS. They describe only the final request arrays already visible to SimCore.
- Frontier movement is representation-boundary telemetry, not cache-failure proof.

Desired natural-turn evidence:

```text
large common-prefix window remains present across distinct requests
Cache effect is usually GROWING or STABLE rather than COLLAPSE
compact frontier may continue moving without being repaired
History stabilization remains OBSERVE_ONLY
request/persistent mutation remains NONE
SimCore contribution remains NOT_FIRST_BREAK or NO_BREAK
Broadcast / Frame / Continuity remain PASS
Deferred Mirror strict mismatch safety remains unchanged
external cache indications, when present, correlate with the large reusable prefix
```

Provider cache remains `UNVERIFIED` unless authoritative gateway/provider usage telemetry is supplied.

---

## v0.63.49 Verification Scope

v0.63.49 intentionally **removes active history repair from the experiment**:

- active SimCore model requests only;
- scan only the already-built request for the frozen compact signature `assistant/text 21:4a852496`;
- report candidate count/range and observation cost;
- do not map the candidate back into raw chat;
- do not replace request message content;
- do not write visible chat;
- do not persist raw bodies or new history state;
- do not add network calls, provider directives, timers, or storage schema;
- derive Cache effect only from already-existing local topology/frontier telemetry;
- keep provider cache explicitly `UNVERIFIED` inside SimCore.

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

The variable B_END preamble/community output-quality issue, separate B_START `HOST_PREFIX` family reset, user-side history mutation, and request/output storage latency are outside v0.63.49.

---

## Next Candidate

If v0.63.49 confirms across multiple distinct natural sequences that the reusable local prefix remains large while external caching continues to occur, close the history-repair line of investigation and treat progressive history materialization as an observed host representation behavior rather than an active cache blocker.

A likely next isolated candidate is:

```text
v0.63.50 — Storage Latency Attribution
```

Only pursue it after Cache Effect Verification is closed. The target would be the already-visible `TURN_STORAGE` / `OUT_STORAGE` latency, with generation semantics and cache behavior frozen.

If v0.63.49 instead shows `PREFIX_COLLAPSE` or repeated reusable-window shrinkage that correlates with loss of external caching on distinct natural requests, investigate that exact boundary without re-enabling heuristic history repair.

---

## Maintenance Rule

After each release:

1. the release workflow must validate and deploy the production pair;
2. the same workflow must synchronize `product-manifest.json`, this production snapshot, and the guideline baseline;
3. it must build the versioned project-source ZIP artifact;
4. real long-chat validation determines VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN changes;
5. durable principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
6. historical conclusions are superseded explicitly rather than silently erased.
