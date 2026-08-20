# SimCore Current Development Memory

> Living operational memory for the current SimCore investigation.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file records the current production state, verified evidence, supported hypotheses, unknowns, live validation gate, and next candidates.

---

<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.52`
- Release: `Edit Origin Attribution`
- Release branch: `release-simcore`
- Release commit: `ffe91cb5b1ad52fd3d07e0f2d4bc08128dd4bd8f`
- Release blob: `ebe92ad509ef6e7efd9b5be1327dc7745701c14b`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `OUTPUT_ENVELOPE_RECOVERY_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

### History / cache line through v0.63.50

- The repeatedly tracked request-prefix break occurs before SimCore in `CHAT_HISTORY`; SimCore reports `NOT_FIRST_BREAK`.
- Historical assistant slots repeatedly appear first as `assistant/text 21:4a852496` and later as substantially larger assistant text.
- v0.63.46 / v0.63.47 / v0.63.48 repair attempts all failed open under their respective safety gates. No persistent or visible-chat history rewrite was performed.
- v0.63.49 intentionally moved History stabilization to `OBSERVE_ONLY`; request mutation, added chars, persistent mutation, provider routing, network, and timers remained unchanged.
- External cache observations can coexist with the moving compact frontier. Therefore `21:4a852496` is a repeatable projection-boundary symptom, not a sufficient cache-failure condition.
- v0.63.49 also captured one externally observed cache loss coincident with `PREFIX_COLLAPSE`, `PRE_SIMCORE · HOST_PREFIX · @0`, and a cache-family reset. That was a strong correlation, not provider-causation proof.

### v0.63.50 Host Prefix Reset Attribution validation

- v0.63.50 successfully established and compared the system-@0 sketch without retaining raw system bodies.
- In the completed natural same-runtime sequence the system prefix stayed exactly stable at `system/text 1277:bdfcdec7`, family `dec26894`.
- The rolling compact frontier still moved `@20 → @22 → @24`, with reusable local prefix growth approximately `87,891 → 92,288 → 96,654 chars`.
- External cache observation did **not** map one-to-one to that frontier: early distinct requests in the family were externally uncached, while the later B_END request externally cached even though the compact frontier persisted and advanced.
- Therefore a host-prefix reset is **not necessary for every externally observed cache miss**, and the prior v0.63.49 host-prefix reset must remain one observed cache-loss mechanism/correlation rather than a universal explanation.
- Provider cache remains `UNVERIFIED` internally because SimCore still receives no authoritative cached-input/token counter.
- History stabilization remained `OBSERVE_ONLY`, request mutation `NONE`, persistent mutation `NONE`, and SimCore remained `NOT_FIRST_BREAK` throughout.

### Output-envelope failure promoted to primary target

- A real v0.63.50 B_END produced a unique `# 응답` envelope after a `THOUGHTS_COMPAT` preamble of about 2K chars, but full Structure safety did not accept the suffix because COMMUNITY shape was independently invalid.
- That turn reported `Preamble provenance ... action UNRESOLVED · policy WARNING`, `Deferred mirror: OUTPUT_MISMATCH`, and a large canonical↔fresh representation difference.
- Strict Deferred Mirror correctly blocked `setChat` on the mismatch. This guard must not be weakened.
- The same turn separately reported COMMUNITY structural warnings and state quarantine. Those warnings are **not automatically equivalent** to the preamble problem and must be isolated after envelope recovery is proven.

### v0.63.51 implementation boundary

- Fresh chat is not available during the synchronous Recovery pass. It first becomes available in the existing Deferred Mirror fresh-chat read.
- v0.63.51 therefore does not add a second host read or broaden initial Structure acceptance.
- When initial Recovery sees exactly one `# 응답` suffix after a `THOUGHTS_COMPAT` prefix, and that suffix already has intact Frame + Knowledge, it records only a bounded memory-only candidate fingerprint/length/offset.
- If and only if Deferred Mirror later reads a fresh assistant body whose fingerprint exactly equals that candidate fingerprint, the current in-memory canonical output fingerprint and mirrored portable state are promoted to that fresh-confirmed suffix representation.
- The confirmation path retains existing location, output-index, runtime-epoch, supersession, and freshness guards.
- No candidate body is retained. Persistent snapshot schema, request bytes/order, provider policy, and network surface are unchanged.
- A failed exact comparison remains `OUTPUT_MISMATCH` and keeps `setChat` blocked.

---

## SUPPORTED HYPOTHESES

- PocketRisu/host output processing can expose one raw handler representation while later fresh chat contains a different saved/display representation.
- A unique `THOUGHTS_COMPAT` raw prefix plus an exact fresh-chat match to the precomputed response-suffix fingerprint is strong enough evidence to reconcile representation identity without weakening Structure rules.
- COMMUNITY block-shape failure may remain after the preamble representation is successfully reconciled; if so, it is an independent structural-compatibility problem suitable for a later isolated release.
- The rolling compact history frontier remains observational background evidence and should not be reactivated as a repair target merely because external cache behavior varies.
- Storage latency remains a separate later performance candidate and should not be mixed into output-envelope correctness work.

---

## UNKNOWN

- Whether the v0.63.51 fresh-confirmation path will naturally exercise on the next comparable B_END/output-representation event.
- Whether every unresolved `THOUGHTS_COMPAT` case has a fresh saved representation equal to the unique response suffix.
- Whether COMMUNITY 1-block / 6-section output remains after successful envelope confirmation.
- Whether a remaining COMMUNITY mismatch is model formatting, host transformation, or a recoverable grouping compatibility issue.
- Why the host occasionally presents different raw and fresh representations for the same output.
- The authoritative provider-cache layer and cached-token counts remain unknown to SimCore.

---

## Current v0.63.51 Live Gate

Target release:

```text
v0.63.51 — Fresh-Confirmed Envelope Recovery
```

Use one natural same-runtime sequence after the one update/reload needed to apply the release:

```text
C baseline
→ B_START
→ B_CONTINUE
→ B_END
→ C
```

Additional natural B_CONTINUE turns are fine. Do not reload/regenerate between observed turns.

Inspect especially:

```text
Preamble provenance
Envelope recovery
Deferred mirror
Output provenance
Output representation
Warnings / Compatibility diagnostics
COMMUNITY structure warnings
state quarantine
Broadcast lifecycle / End Authority
Frame / Continuity
History stabilization
Host prefix attribution
Cache effect
```

### Expected unaffected turns

When no special recovery candidate exists:

```text
Envelope recovery: NOT_APPLICABLE
Deferred mirror: COMMITTED
```

Normal existing `THOUGHTS_COMPAT` cases already accepted by `SILENT_COMPAT` / `SAFE_ENVELOPE_COMPAT` should continue to behave as before.

### Desired decisive recovery evidence

For a reproduction of the v0.63.50 unresolved-prefix family:

```text
Envelope recovery: RECOVERED
source HOST_RAW_SUFFIX
confirmation FRESH_EXACT
persistent NONE

Output provenance:
match FRESH_CONFIRMED_SUFFIX

Output representation:
CANONICAL↔FRESH Δchars +0 · EXACT

Preamble provenance:
action STRIPPED
policy FRESH_CONFIRMED_SUFFIX
```

The confirmation may allow the normal Deferred Mirror commit because fresh chat itself proved the candidate identity. It must not manufacture or rewrite response body text.

### Required fail-open evidence

If the fresh body does not equal the candidate fingerprint:

```text
Envelope recovery: FRESH_MISMATCH
Deferred mirror: OUTPUT_MISMATCH
setChat 0
```

Any ambiguous/multiple envelope, missing Frame/Knowledge, short candidate, non-THOUGHTS prefix, location mismatch, stale runtime, or superseded mirror remains ineligible.

### COMMUNITY separation rule

If envelope recovery succeeds but warnings still show malformed COMMUNITY grouping, keep state quarantine and treat that as a separate problem. Do **not** broaden envelope recovery to repair COMMUNITY structure.

---

## v0.63.51 Verification Scope

v0.63.51 changes only output-representation reconciliation:

- initial Recovery safety remains fail-open;
- exactly one THOUGHTS-compatible response suffix may emit a memory-only candidate fingerprint;
- candidate requires intact Frame + Knowledge and a bounded minimum body length;
- existing Deferred Mirror fresh read performs the exact confirmation;
- confirmation updates only current representation identity / existing mirrored portable state;
- raw candidate body is not retained;
- no new request mutation, visible output-body rewrite, provider inference, host read, network request, persistent schema, or timer path is introduced;
- History stabilization remains `OBSERVE_ONLY`;
- Host Prefix Attribution remains observational;
- provider cache remains `UNVERIFIED`.

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
Structure acceptance rules
COMMUNITY structural rules
Runtime placement / TAIL_AFTER_CURRENT_USER
Compiler tier semantics
Deferred Mirror identity/location/staleness guards
Deferred Mirror strict non-confirmed mismatch block
History stabilization mutation policy / OBSERVE_ONLY
Host Prefix Attribution behavior
Persistent storage schema
Network policy
Provider-cache policy
```

---

## Next Candidate

If v0.63.51 successfully converts an unresolved THOUGHTS-compatible raw-prefix case to exact fresh-confirmed representation **and** COMMUNITY structural warnings remain independently reproducible, the next isolated candidate is:

```text
v0.63.52 — Community Structural Compatibility
```

That release should determine whether one COMMUNITY block containing the expected total platform sections can be deterministically split into the required block grouping without inventing or rewriting community content.

If v0.63.51 instead reports `FRESH_MISMATCH`, follow the observed representation boundary rather than weakening the exact fingerprint gate.

If no unresolved-prefix event naturally occurs, keep v0.63.51 in observation until exercised; absence of the event is not a failure.

Storage latency remains a later performance candidate after output correctness is stable.

---

## Maintenance Rule

After each release:

1. the release workflow validates and deploys the production pair;
2. production identity is synchronized to `product-manifest.json` and guideline baseline;
3. `CURRENT_DEVELOPMENT.md` is manually refreshed when real long-chat evidence changes the operational conclusion;
4. a versioned project-source ZIP is built from the final durable-memory state;
5. durable principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
6. historical conclusions are superseded explicitly rather than silently erased.
