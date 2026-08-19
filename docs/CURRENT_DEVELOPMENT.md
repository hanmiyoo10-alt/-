# SimCore Current Development Memory

> Living operational memory for the current SimCore investigation.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file records the current production state, verified evidence, supported hypotheses, unknowns, live validation gate, and next candidates.

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
- A fresh v0.63.45 control run immediately before v0.63.46 again reproduced the rolling compact assistant family: `@32 → @34`, with `21:4a852496 → 7876:ff111491` and then `21:4a852496 → 2845:79a7876f`.
- v0.63.46's History Materialization Gate stayed fail-open on every observed natural mode (`C`, `B_START`, `B_CONTINUE`, `B_END`) and on a same-turn retry because its exact current-user comparison returned `SKIPPED_CURRENT_USER_MISMATCH`; `slots 0/0`, `anchors 0`, `calibrators 0`, `Δchars +0`, and `persistent NONE` showed that repair never executed.
- v0.63.46 therefore passed its safety objective but did **not** exercise its repair path: no visible/persistent chat rewrite, no request-history replacement, and no observed Broadcast/Frame/Continuity regression occurred.
- While v0.63.46 remained skipped, the original compact assistant break reproduced at B_END: `assistant/text 21:4a852496 → assistant/text 2431:c388e5c5`, still `PRE_SIMCORE · CHAT_HISTORY`, with `PREEXISTING_REQUEST_MUTATION · HIGH`.
- A same B_END retry produced `100.0% · stable`, `last RETRY`, and `Cache break: NONE`; this is a same-request sanity check and is not evidence that natural-request prefix stability improved.
- The same retry changed output preamble handling from a prior unresolved/fail-open output to a clean compatible strip without changing the bound user/output turn, supporting treatment of the B_END preamble issue as a separate variable output/recovery phenomenon rather than proof of a cache-repair regression.
- Provider/gateway cache behavior remains `UNVERIFIED` without external cached-input/hit telemetry.

## SUPPORTED HYPOTHESES

- A host/request-history projection step before SimCore reconcile progressively materializes or re-projects historical conversation representations, producing the moving stable-prefix frontier.
- Exact current-user byte identity is not a valid alignment prerequisite in the real host path; host-side user projection can differ while still representing the same conversation turn.
- A bounded structural tail alignment anchored by role order and multiple exact substantial historical assistant calibrators can identify the same conversation suffix without trusting current-user body equality.
- If a uniquely proven alignment maps the known compact assistant signature to a canonical `# 응답` body and request-only replacement persists across later natural requests, the current repair boundary is likely correct.
- Better request-history stability may secondarily reduce expensive reconcile/rebuild churn, but that effect must be measured rather than assumed.

## UNKNOWN

- Which exact host/history projection stage initially creates the compact `21:4a852496` representation.
- Whether user-side history mutations such as the observed `@11 user→user` change belong to the same host materialization frontier or a separate projection rule.
- Whether v0.63.47 can derive one unique structural alignment with at least two exact assistant calibrators on real long-chat requests.
- Whether an `APPLIED` request-only replacement remains stable on the following **distinct natural request**, rather than being recreated as compact by the host.
- Whether the separate B_START `HOST_PREFIX @0` family reset is normal host-prefix evolution or another cache-stability target; it is not part of the current repair.
- Actual gateway/provider prompt-cache hit behavior.

---

## Current v0.63.47 Live Gate

Primary natural-turn validation sequence:

```text
B_START
→ B_CONTINUE
→ B_END
→ C
```

Rules:

- apply v0.63.47, then reload once if required for the update itself;
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

Desired alignment/stabilization outcomes:

```text
History alignment: RESOLVED_UNIQUE
History stabilization: APPLIED
```

Safe non-application outcomes remain valid evidence:

```text
NOT_NEEDED
SKIPPED_INSUFFICIENT_CALIBRATORS
SKIPPED_AMBIGUOUS_ALIGNMENT
SKIPPED_INCOMPLETE_ALIGNMENT
SKIPPED_UNSAFE_RAW_CANDIDATE
SKIPPED_*
```

Interpretation:

- `RESOLVED_UNIQUE` means the bounded request/raw conversation spines had one role-consistent tail offset supported by at least two exact substantial historical assistant calibrators.
- Current-user and historical-user exact matches are telemetry only and are not required for alignment acceptance.
- `APPLIED` means only the exact known compact assistant signature was mapped to a safe canonical `# 응답` body for the current request projection.
- Any ambiguity, missing calibration, role drift, incomplete mapping, or unsafe raw candidate must leave the request untouched.
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

## v0.63.47 Repair Scope

The repair remains intentionally narrow:

- active SimCore model requests only;
- exact known compact target `assistant/text 21:4a852496` only;
- request conversation spine bounded to 48 conversational slots;
- authoritative raw-chat spine bounded to 64 conversational slots;
- tail endpoint and user/assistant role order must align;
- at least two exact substantial historical assistant calibrators are required;
- exactly one valid spine offset is required;
- user body equality is telemetry, not an acceptance gate;
- mapped raw assistants are reduced to the canonical `# 응답` envelope before replacement;
- hard cap of 12 compact targets;
- request projection only; no visible chat rewrite;
- no persistent raw-body cache;
- no new network call, timer, or storage schema;
- ambiguity always fails open.

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

The variable B_END unresolved preamble/community quarantine and the separate B_START `HOST_PREFIX` family reset are explicitly outside v0.63.47.

---

## Next Candidate

If v0.63.47 obtains `RESOLVED_UNIQUE → APPLIED` and the following distinct natural requests retain the repaired prefix, the next candidate is:

```text
v0.63.48 — Cache Effect Verification
```

Its job is to quantify local prefix/frontier/rebuild effects and, if gateway telemetry is available, compare them with actual cached-input behavior without inferring provider hits from local evidence alone.

If v0.63.47 remains safely skipped, the next release must follow the observed alignment failure reason rather than broadening the repair heuristically.

---

## Maintenance Rule

After each release:

1. the release workflow must validate and deploy the production pair;
2. the same workflow must synchronize `product-manifest.json`, this production snapshot, and the guideline baseline;
3. it must build the versioned project-source ZIP artifact;
4. real long-chat validation determines VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN changes;
5. durable principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
6. historical conclusions are superseded explicitly rather than silently erased.
