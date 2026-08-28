# EDITOR-ASYNC-TOKEN-COUNT-ISOLATION

## Status

`DESIGN_NEEDED`

## Problem / evidence

`seto-sama/PocketRisu-Kei@ae05122d6f7423a285e74d1e07fe245ac1847236` consolidates multiple editor token counters into one component that debounces `tokenizeAccurate` work and drops stale asynchronous completions by generation identity. The source notes that accurate tokenization performs full CBS expansion plus encoding, so running it directly on each keystroke or independently in many editor surfaces can create avoidable UI work.

Evidence is external and code-level (`MEDIUM`), not yet reproduced on PocketRisu.

## Minimal safe scope

First slice only:

1. identify one existing PocketRisu editor surface that already displays an expensive asynchronous derived token count;
2. extract or introduce one shared read-only token-count owner for that surface and one adjacent equivalent surface;
3. debounce work and reject stale async completions;
4. preserve existing visibility/mounting behavior so hidden bulk editors do not acquire new work.

Do not add new token-count UI merely to justify this abstraction.

## Ownership boundaries

- browser/client UI only;
- tokenizer/CBS expansion remains owned by the existing tokenizer implementation;
- no DB mutation, server protocol, device/runtime, plugin storage, or deployment changes;
- derived token count is disposable UI state, never persistence authority.

## Mechanism

A shared token-count owner receives a source string and optional presentation metadata. On source change it immediately advances an invocation generation, cancels any pending debounce timer, and schedules tokenization after a short bounded delay. Completion updates UI only if the captured generation still equals the current generation. Component/effect teardown cancels pending timers; any already-running async completion becomes harmless because its generation can no longer own the displayed state.

If a list/editor uses lazy disclosure or conditional mounting, preserve that boundary. Do not instantiate tokenization work for closed entries solely because the shared component exists.

## Compatibility / invariants

- editing remains synchronous and never waits for tokenization;
- stale async results never replace counts for newer input;
- navigation/unmount cannot cause delayed visible updates;
- hidden or closed large-list entries must not tokenize without an existing user-visible reason;
- current tokenizer semantics, including CBS expansion and provider-independent count semantics, are not changed by this feature;
- no persistence/save behavior changes;
- all PocketRisu storage, V3 plugin, runit, server-phone, and keepalive guardrails remain untouched.

## Validation / acceptance

Before `READY_TO_PORT`:

- inventory concrete PocketRisu owner(s) and prove tokenization is materially asynchronous/expensive enough to justify the shared boundary;
- rapid typing test: older completion resolves after newer input and is discarded;
- debounce test: burst edits result in bounded tokenization calls;
- teardown test: pending work after navigation/destruction does not update UI;
- bulk/hidden test: closed lorebook or equivalent entries do not tokenize because unrelated data changes;
- semantic parity test: final stable count matches the existing accurate-tokenizer result.

Acceptance for an implementation PR: no count correctness regression, no new hidden-list tokenization, no persistence changes, and easy full revert.

## Risk / blast radius

`LOW` if constrained to derived UI state. Main risk is a performance regression from accidentally broadening mount/reactivity scope or a confusing stale count from incorrect invocation ownership.

## Rollback / fallback

Revert the shared component/use-site change and restore the previous local count display. No migration or persisted-state rollback is required.

## Dependencies

- confirm PocketRisu-owned token-count surfaces on the intended implementation base;
- reproduce/measure current editor tokenization cost;
- preserve lazy/visibility ownership for large editor collections.

## PR decomposition

1. **Measurement/owner confirmation** — code inventory and targeted reproduction/benchmark; no behavior change.
2. **Isolated shared owner + race tests** — one or two equivalent editor surfaces only.
3. **Optional follow-up adoption** — migrate additional existing token-count surfaces only when each has equivalent mounting/visibility semantics.

No implementation is authorized until dependency and evidence gates are resolved.
