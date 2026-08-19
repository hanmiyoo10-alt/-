# SimCore Current Development Memory

> Living operational memory for the current SimCore investigation.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file records the current production state, verified evidence, supported hypotheses, unknowns, live validation gate, and next candidates.

---

<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.48`
- Release: `History Turn-Ordinal Alignment`
- Release branch: `release-simcore`
- Release commit: `113158245ea2ad6072210bbdd45c9e83358fbe24`
- Release blob: `505ae6a623353560e652d1519970e3ff14c55bf8`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `HISTORY_ALIGNMENT_STABILIZATION_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

- The investigated prompt-prefix first break repeatedly occurs before SimCore in `CHAT_HISTORY`; SimCore reports `NOT_FIRST_BREAK` for that break.
- Historical assistant slots repeatedly appear first as the exact compact signature `assistant/text 21:4a852496` and later as substantially larger assistant text.
- v0.63.45 observed a tracked assistant break with identical `PRE_RECONCILE`, `POST_RECONCILE`, and `FINAL` full fingerprints and classified it `PREEXISTING_REQUEST_MUTATION · HIGH`; therefore `reconcileManualEdit` did not create that observed representation change.
- Frontier progression can occur with `SAME_FAST` / `SAME_HOST_FAST`; `MANUAL_EDIT_REBUILT` is not required to generate the rolling history representation change.
- A fresh v0.63.45 control run immediately before v0.63.46 reproduced the compact family at `@32 → @34` with the same `21:4a852496 → full assistant` shape.
- v0.63.46 stayed fail-open on all observed natural modes and a same-turn retry because exact current-user comparison produced `SKIPPED_CURRENT_USER_MISMATCH`; repair never executed and persistent mutation stayed `NONE`.
- v0.63.46 therefore passed safety but did not exercise its repair path; while skipped, the original compact assistant break still reproduced as `PRE_SIMCORE · CHAT_HISTORY`.
- v0.63.47 removed current-user equality, but real long-chat validation still produced `History alignment: NO_CANDIDATE` on `C`, `B_START`, `B_CONTINUE`, and `B_END`, with `alignment candidates 0`, `anchors 0`, and `calibrators 0`.
- v0.63.47 consequently reported `SKIPPED_INSUFFICIENT_CALIBRATORS`, `slots 0/1`, `Δchars +0`, `persistent NONE`, and approximately `2–4 ms` stabilization cost; the repair path again never executed.
- During that same v0.63.47 natural sequence, the original compact assistant frontier reproduced cleanly at `@16 → @18 → @20`: `21:4a852496 → 4346:f379d075`, then `→ 6997:02c0f0fc`, then `→ 2494:3f8dc763`.
- v0.63.47 B_CONTINUE and B_END again classified the tracked representation as `PREEXISTING_REQUEST_MUTATION · HIGH`; B_END did so even while `MANUAL_EDIT_REBUILT` occurred, reinforcing that reconcile reacts to an already-divergent request rather than creating the tracked break.
- v0.63.47 passed its safety objective: Broadcast/Frame/Continuity remained valid, no visible/persistent history rewrite occurred, and Deferred Mirror strict mismatch handling remained unchanged.
- Large local common prefixes still exist on natural requests despite the rolling frontier (for example the observed v0.63.47 B_START retained about 85.9% / 363,662 chars before the first break). This is local prefix evidence only, not proof of provider cache reuse.
- Same-turn retry `100% STABLE` observations remain sanity checks and are not evidence of natural-request cache improvement.
- Provider/gateway cache behavior remains `UNVERIFIED` without external cached-input/hit telemetry.

## SUPPORTED HYPOTHESES

- A host/request-history projection step before SimCore reconcile progressively materializes or re-projects historical conversation representations, producing the moving stable-prefix frontier.
- Exact current-user byte identity is not a valid alignment prerequisite in the real host path.
- Exact substantial historical assistant body identity is also not a reliable alignment prerequisite: v0.63.47 found zero exact calibrators even while request/raw conversation structure clearly continued.
- The authoritative current host user identified by `sendIndex` and the final request conversational user can serve as structural endpoints; mapping backward by conversation ordinal and strict role sequence may identify the corresponding raw assistant without body equality.
- If v0.63.48 obtains a structurally proven ordinal mapping, replaces the known compact target request-only, and the following distinct natural request retains that repair, the current repair boundary is likely correct.
- Better request-history stability may secondarily reduce expensive reconcile/rebuild churn, but that effect must be measured rather than assumed.

## UNKNOWN

- Which exact host/history projection stage initially creates the compact `21:4a852496` representation.
- Whether user-side history mutations belong to the same host materialization frontier or a separate projection rule.
- Whether the bounded request conversation spine is always an endpoint-aligned role suffix of the authoritative raw-chat spine in the real long-chat path.
- Whether v0.63.48 reaches `RESOLVED_TURN_ORDINAL → APPLIED` on the known compact target.
- Whether an `APPLIED` request-only replacement remains stable on the following **distinct natural request**, rather than being recreated as compact by the host.
- Whether the separate B_START `HOST_PREFIX @0` family reset is normal host-prefix evolution or another cache-stability target; it is outside the current repair.
- Actual gateway/provider prompt-cache hit behavior.

---

## Current v0.63.48 Live Gate

Primary natural-turn validation sequence:

```text
B_START
→ B_CONTINUE
→ B_END
→ C
```

Rules:

- apply v0.63.48, then reload once if required for the update itself;
- no reload or regeneration between the four validation turns;
- use natural distinct user turns; same-turn retry/regeneration observations do not establish cache improvement.

Inspect especially:

```text
History alignment
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

Desired alignment/stabilization outcome:

```text
History alignment: RESOLVED_TURN_ORDINAL
History stabilization: APPLIED
```

Expected success telemetry shape:

```text
endpoint SEND_INDEX
role matches N/N
targets mapped/targets
body equality NOT_REQUIRED
persistent NONE
```

Safe non-application outcomes remain valid evidence:

```text
NOT_NEEDED
SKIPPED_ENDPOINT_ROLE
SKIPPED_HOST_SUFFIX_SHORT
SKIPPED_ROLE_DRIFT
SKIPPED_TARGET_NOT_MAPPABLE
SKIPPED_UNSAFE_RAW_CANDIDATE
SKIPPED_NONSTRING_SLOT
SKIPPED_*
```

Interpretation:

- `RESOLVED_TURN_ORDINAL` means the current raw user is anchored by authoritative `sendIndex`, the request endpoint is its final conversational user, and the bounded request spine maps to the raw suffix with full role-order agreement.
- Current-user and historical assistant body equality are **not required** for v0.63.48 alignment.
- `APPLIED` means only the exact known compact assistant signature was mapped by ordinal position to a safe canonical raw `# 응답` body for the current request projection.
- Any endpoint mismatch, role drift, short raw suffix, unmappable target, or unsafe raw candidate must leave the request untouched.
- The strongest success evidence is not the `APPLIED` turn itself but the **next distinct natural request** no longer showing the same compact→full slot as the first prefix break.

Desired natural-turn evidence:

```text
21:4a852496 rolling break disappears or sharply decreases
frontier stops moving because of that compact assistant family
PRE_SIMCORE CHAT_HISTORY first break moves later or becomes NONE
persistent mutation remains NONE
alignment/stabilization cost remains bounded and small
Broadcast / Frame / Continuity remain PASS
Deferred Mirror strict mismatch safety remains unchanged
```

Provider cache remains `UNVERIFIED` unless gateway/provider telemetry is supplied.

---

## v0.63.48 Repair Scope

The repair remains intentionally narrow:

- active SimCore model requests only;
- exact known compact target `assistant/text 21:4a852496` only;
- request conversation spine bounded to 48 conversational slots;
- authoritative raw-chat spine bounded to 64 conversational slots;
- authoritative raw endpoint is the current user identified by `sendIndex`;
- request endpoint is the final conversational user before the runtime tail;
- suffix offset is determined only by bounded endpoint-aligned conversation ordinal;
- user/assistant role order must match across the complete bounded request spine;
- request/raw body equality is not used as an alignment acceptance condition;
- mapped raw assistants are reduced to the canonical `# 응답` envelope before replacement;
- hard cap of 12 compact targets;
- request projection only; no visible chat rewrite;
- no persistent raw-body cache;
- no new network call, timer, or storage schema;
- any structural uncertainty fails open.

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

The variable B_END unresolved preamble/community quarantine, separate B_START `HOST_PREFIX` family reset, and user-side history mutation are explicitly outside v0.63.48.

---

## Next Candidate

If v0.63.48 obtains `RESOLVED_TURN_ORDINAL → APPLIED` and the following distinct natural requests retain the repaired prefix, the next candidate is:

```text
v0.63.49 — Cache Effect Verification
```

Its job is to quantify local prefix/frontier/rebuild effects and, if gateway telemetry is available, compare them with actual cached-input behavior without inferring provider hits from local evidence alone.

If v0.63.48 remains safely skipped or applies but the host recreates the compact representation on the next distinct request, the next release must follow that observed failure boundary rather than broadening the repair heuristically.

---

## Maintenance Rule

After each release:

1. the release workflow must validate and deploy the production pair;
2. the same workflow must synchronize `product-manifest.json`, this production snapshot, and the guideline baseline;
3. it must build the versioned project-source ZIP artifact;
4. real long-chat validation determines VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN changes;
5. durable principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
6. historical conclusions are superseded explicitly rather than silently erased.
