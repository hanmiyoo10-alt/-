# SimCore Current Development Memory

> Living operational memory for the current SimCore investigation.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file records the current production state, verified evidence, supported hypotheses, unknowns, live validation gate, and next candidates.

---

<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.50`
- Release: `Host Prefix Reset Attribution`
- Release branch: `release-simcore`
- Release commit: `8dcc55c27cb8d6137728a03cbd03942237910c93`
- Release blob: `3551f7fd85949a5309acb7a6da11a06ae44bc3f4`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `HOST_PREFIX_RESET_ATTRIBUTION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

### History representation line

- The investigated rolling prompt-prefix break repeatedly occurs before SimCore in `CHAT_HISTORY`; SimCore reports `NOT_FIRST_BREAK` for that break.
- Historical assistant slots repeatedly appear first as the exact compact signature `assistant/text 21:4a852496` and later as substantially larger assistant text.
- v0.63.45 proved one tracked assistant representation change already existed before reconcile: `PRE_RECONCILE == POST_RECONCILE == FINAL` with `Rebuild attribution: PREEXISTING_REQUEST_MUTATION · HIGH`.
- Frontier progression can occur with `SAME_FAST` / `SAME_HOST_FAST`; `MANUAL_EDIT_REBUILT` is not required to generate the rolling history representation change.
- v0.63.46 stayed fail-open because exact current-user comparison produced `SKIPPED_CURRENT_USER_MISMATCH`; no request repair executed and persistent mutation stayed `NONE`.
- v0.63.47 stayed fail-open because body/calibrator-derived alignment produced `NO_CANDIDATE` / `SKIPPED_INSUFFICIENT_CALIBRATORS`; no request repair executed and persistent mutation stayed `NONE`.
- v0.63.48 turn-ordinal alignment also stayed fail-open. Natural turns reported `History alignment: ROLE_DRIFT`, only the endpoint role matched (`1/N`), and `targets 0/1`; no compact target was mapped or replaced.
- During v0.63.48, the compact assistant frontier still advanced naturally `@24 → @26 → @28`, yet the local reusable prefix stayed large and grew from about `382,389 chars / 86.4%` to `394,679 / 87.4%`.
- External cache indications were observed on distinct v0.63.48 B_START/B_CONTINUE/B_END requests while that compact frontier remained. Therefore the rolling `21:4a852496` frontier does **not by itself** prevent useful cache reuse.
- v0.63.49 intentionally removed active history repair. Across the verified run, `History alignment: OBSERVE_ONLY`, `History stabilization: OBSERVE_ONLY`, request mutation `NONE`, `Δchars +0`, and persistent mutation `NONE` remained intact.

### v0.63.49 Cache Effect Verification

- First v0.63.49 C request was a local topology baseline and the user externally observed no cache reuse on that first request.
- The next natural C request externally cached while SimCore reported `REUSE_WINDOW_STABLE`, `401,942 / 461,256 chars`, `87.1%`, with the first break still in `PRE_SIMCORE · CHAT_HISTORY @32`.
- The following B_START externally cached while SimCore reported `REUSE_WINDOW_GROWING`, `406,679 / 463,663 chars`, `87.7%`, frontier `@34`, movement `+2 msgs / +4,737 chars`.
- The following B_CONTINUE externally cached while SimCore reported `REUSE_WINDOW_GROWING`, `413,815 / 469,098 chars`, `88.2%`, frontier `@36`, movement `+2 msgs / +7,136 chars`.
- A later natural B_CONTINUE was the decisive contrast: the user externally observed cache loss exactly when SimCore reported `PREFIX_COLLAPSE`, `0/67 messages`, `0/480,523 chars`, `0.0%`, `Cache break: PRE_SIMCORE · HOST_PREFIX · @0 system→system`, and `FAMILY_RESET`.
- That reset changed system @0 from `system/text 287332:947b1559` to `system/text 294359:aa650b09`, a size delta of `+7,027 chars`, while `Edit reconcile: SAME_FAST` and `SimCore contribution: NOT_FIRST_BREAK` remained unchanged.
- On the next natural B_END request, external caching returned. SimCore simultaneously showed a newly established large reusable window inside the new family: `362,941 / 415,867 chars`, `87.3%`, `REUSE_WINDOW_GROWING`.
- The v0.63.49 sequence therefore separates two phenomena operationally: rolling `CHAT_HISTORY` materialization can coexist with external cache reuse, while the one observed external cache loss coincided with a complete message-level `HOST_PREFIX @0` collapse and cache-family reset.
- This is a **strong observed correlation**, not proof that the host-prefix reset caused provider cache loss. SimCore still has no authoritative provider cached-token counter and must keep provider cache `UNVERIFIED`.
- Broadcast lifecycle, Broadcast End Authority, Frame, Continuity, request placement, and strict Deferred Mirror safety remained intact during the v0.63.49 run. The B_END `OUTPUT_MISMATCH` remained safely blocked from `setChat` and is a separate output-representation issue.

## SUPPORTED HYPOTHESES

- A host/request-history projection step before SimCore progressively materializes or re-projects historical conversation representations, producing the moving `CHAT_HISTORY` frontier.
- The exact compact `21:4a852496` assistant representation is a repeatable boundary symptom, not a reliable cache-failure condition.
- Useful cache reuse can coexist with a moving history frontier when the large earlier request prefix remains unchanged.
- The more important cache-stability boundary is now the leading host-owned system prefix, especially a request where message-level common prefix collapses at `@0` and cache family changes.
- The observed `+7,027` system @0 size shift may represent a localized inserted/removed/generated host section or a broader system-prompt reconstruction. v0.63.49 cannot distinguish those shapes because topology hashes only whole messages.
- A message-level `@0` break does **not** prove that the first characters of the giant system message changed. The system message may still share a very large internal head and/or tail. v0.63.50 exists to measure that distinction.
- Storage latency (`TURN_STORAGE` / `OUT_STORAGE`) remains a possible later optimization target, but it must not be mixed into host-prefix attribution.

## UNKNOWN

- Which exact host-side component creates the `HOST_PREFIX @0` family reset.
- Whether the observed system @0 change is localized insertion/removal, localized replacement, or widespread reconstruction.
- How many leading/trailing characters of system @0 remain identical across a message-level family reset.
- Whether every future external cache loss will correlate with `HOST_PREFIX @0` collapse, or the v0.63.49 event was only one cache-loss mechanism.
- Which host/provider layer produced the user-visible cache indication.
- Whether authoritative provider cached-input/token metrics can be observed without adding new provider/network coupling.
- Why the rolling history frontier often advances by two conversational messages.

---

## Current v0.63.50 Live Gate

Target release:

```text
v0.63.50 — Host Prefix Reset Attribution
```

Primary validation sequence after applying v0.63.50 and performing one update reload if needed:

```text
C baseline
→ B_START
→ B_CONTINUE
→ B_CONTINUE
→ B_END
→ C
```

The exact mode sequence is not itself causal; use natural distinct turns. The goal is to observe ordinary reusable-prefix growth and, if it naturally recurs, another `HOST_PREFIX @0` reset.

Rules:

- no reload or regeneration between observed turns;
- no artificial retry as primary evidence;
- keep external cache indication separate from SimCore-local telemetry;
- do not infer provider HIT/MISS from local topology alone;
- do not deliberately force a host-prefix reset.

Inspect especially:

```text
Cache effect
Cache topology
Cache break
Host prefix attribution
Host prefix delta
Cache trajectory
History mutation
History alignment
History stabilization
Frontier movement
SimCore contribution
Runtime identity
Deferred mirror
Broadcast / Frame / Continuity
```

Expected observer-only safety:

```text
History alignment: OBSERVE_ONLY
History stabilization: OBSERVE_ONLY
request mutation NONE
persistent NONE
provider cache UNVERIFIED
raw system bodies NOT RETAINED
```

Expected Host prefix attribution states:

```text
BASELINE
STABLE
DELTA_LOCALIZED
WIDESPREAD
UNAVAILABLE
```

When system @0 changes, `Host prefix delta` reports only bounded hash-derived structure:

```text
prev system signature → current system signature
Δchars
head ≥ N chars
tail ≥ N chars
changed prev ≤ N chars
changed current ≤ N chars
family old→new · RESET_CORRELATED / SAME_FAMILY
```

The block granularity is `512` characters. `head ≥` and `tail ≥` are guaranteed matching lower bounds from block hashes; changed spans are corresponding upper bounds. No raw system body is retained.

Change-shape labels:

```text
INSERTION_LIKE
REMOVAL_LIKE
REPLACEMENT_LIKE
SIZE_SHIFT_LOCALIZED
LOCALIZED_CHANGE
WIDESPREAD_CHANGE
```

Interpretation:

- `STABLE` means system @0 is identical at the existing whole-message signature level.
- `DELTA_LOCALIZED` means at least 75% of the shorter system @0 is covered by matching head/tail blocks, allowing the changed middle span to be bounded without retaining content.
- `WIDESPREAD` means the matching head/tail coverage is insufficient to call the change localized.
- `INSERTION_LIKE` / `REMOVAL_LIKE` are structural size/shape classifications only; they do not identify the semantic source of the changed section.
- `RESET_CORRELATED` means the system @0 change coincided locally with a request-family identity change. It does not claim provider-cache causation.
- External cache loss plus `PREFIX_COLLAPSE` plus a localized host-prefix delta would justify a later **source-attribution** release; it would still not justify mutating the host prompt automatically.

Desired decisive evidence:

```text
normal cached turns:
  Host prefix attribution STABLE
  Cache effect GROWING/STABLE

natural reset turn, if one appears:
  Cache effect PREFIX_COLLAPSE
  Cache break PRE_SIMCORE · HOST_PREFIX · @0
  Host prefix attribution DELTA_LOCALIZED or WIDESPREAD
  Host prefix delta identifies bounded head/tail/change shape
  family RESET_CORRELATED

next natural turn:
  observe whether a large reusable prefix and external caching recover inside the new family
```

Provider cache remains `UNVERIFIED` unless authoritative gateway/provider usage telemetry is supplied.

---

## v0.63.50 Verification Scope

v0.63.50 is an attribution-only release:

- inspect only request system message `@0` when present;
- build memory-only 512-character FNV-1a block hashes from both head and tail;
- retain lengths/hashes only, never raw system message bodies;
- compare the current system @0 sketch against the previous same-chat request sketch;
- preserve v0.63.49 whole-request topology and Cache effect telemetry;
- preserve v0.63.49 `OBSERVE_ONLY` history behavior;
- do not change request content, message order, current-user placement, or runtime prompt placement;
- do not write visible chat or new persistent history state;
- do not add provider directives, network requests, timers, or new storage calls;
- do not claim provider cache hit/miss.

The request-topology refreshless handoff accepts the prior v1 shape and emits v2 with the optional system @0 hash sketch. Upgrading from v0.63.49 may therefore make the first v0.63.50 host-prefix attribution observation `BASELINE`; subsequent distinct turns provide the comparison.

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
History stabilization mutation policy / OBSERVE_ONLY
Persistent storage schema
Network policy
Timer policy
Provider-cache policy
```

The variable output-envelope/Deferred-Mirror mismatch issue and request/output storage latency are separate backlogs and must not be mixed into v0.63.50.

---

## Next Candidate

If v0.63.50 captures another `HOST_PREFIX @0` reset and localizes the changed system region, the next isolated candidate is:

```text
v0.63.51 — Host Prefix Source Attribution
```

That release should identify which host-generated prefix component corresponds to the bounded changed region without re-enabling history repair or changing provider/cache policy.

If v0.63.50 instead shows that system @0 is internally mostly stable even during message-level `PREFIX_COLLAPSE`, revise the topology model before attempting any repair. A whole-message hash break would then be too coarse to represent the provider-reusable prefix accurately.

Only after the cache-stability boundary is sufficiently explained should storage latency become the primary optimization target.

---

## Maintenance Rule

After each release:

1. the release workflow must validate and deploy the production pair;
2. the same workflow must synchronize `product-manifest.json`, this production snapshot, and the guideline baseline;
3. it must build the versioned project-source ZIP artifact;
4. real long-chat validation determines VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN changes;
5. durable principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
6. historical conclusions are superseded explicitly rather than silently erased.
