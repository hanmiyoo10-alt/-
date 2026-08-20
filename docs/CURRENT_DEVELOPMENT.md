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
- Primary optimization target: `EDIT_ORIGIN_ATTRIBUTION_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

### Cache / history line remains observational

- The repeatedly tracked compact historical assistant signature `assistant/text 21:4a852496` continues to roll forward in request history, while real external cache observations can be either hit or miss.
- v0.63.49 moved History stabilization to `OBSERVE_ONLY`; request mutation and persistent mutation remain `NONE`.
- v0.63.50 Host Prefix Attribution showed one prior external cache loss correlated with a `HOST_PREFIX @0` reset/family reset, but later long-chat evidence proved host-prefix reset is not required for every external miss.
- In the latest v0.63.51 sequence, system @0 remained exactly stable at `294359:aa650b09`, cache family `36c710af`, and local reusable prefix stayed roughly 86.9–87.6% while external cache observations changed from misses to later hits.
- A genuine user edit followed by `MANUAL_EDIT_REBUILT` also coexisted with an external cache hit. Therefore neither rolling history frontier movement nor manual-edit rebuild is a sufficient cache-failure condition.
- Provider cache remains internally `UNVERIFIED`; do not infer HIT/MISS from local prefix topology alone.

### v0.63.51 Fresh-Confirmed Envelope Recovery validation

- v0.63.51 introduced no observed regression in normal `SILENT_COMPAT` / `SAFE_ENVELOPE_COMPAT` output handling.
- Normal turns continued to show `CANONICAL↔FRESH Δchars +0 · EXACT`, Deferred Mirror `COMMITTED`, and zero warnings where expected.
- The special v0.63.51 fresh-confirmation path was **not exercised** in the observed sequence: `Envelope recovery: NOT_APPLICABLE` on all shared turns.
- Therefore the release is safe so far but its target unresolved-THOUGHTS case remains unverified rather than failed.
- Deferred Mirror strict mismatch blocking remained intact.

### v0.63.51 representation/reconcile evidence promoted to primary target

Within one same-runtime sequence (`mt10we13-u7hpfn`), two ordinary B_CONTINUE outputs produced small canonical↔fresh mismatches:

```text
CANONICAL 4154 vs FRESH 4150 · Δ -4 · OUTPUT_MISMATCH
CANONICAL 4183 vs FRESH 4182 · Δ -1 · OUTPUT_MISMATCH
```

Both Deferred Mirror runs correctly blocked `setChat`.

The following requests then entered the expensive `MANUAL_EDIT_REBUILT` path:

```text
Δ -4 predecessor → next Edit reconcile MANUAL_EDIT_REBUILT · 4.486 s
Δ -1 predecessor → next Edit reconcile MANUAL_EDIT_REBUILT · 2.848 s
```

Separately, the user explicitly confirmed a real hand edit of the preceding B_END output. The next C request also produced:

```text
Edit reconcile: MANUAL_EDIT_REBUILT · 2.652 s
```

This is the decisive distinction: `MANUAL_EDIT_REBUILT` is a reconcile path, not proof that the user edited the visible output. Genuine user edits and prior-output representation divergence can converge on the same path.

### v0.63.52 implementation boundary

- v0.63.52 does **not** change `MANUAL_EDIT_REBUILT`, `SAME_FAST`, snapshot repair, output recovery, or mirror acceptance semantics.
- It reuses the existing bounded memory-only Deferred Mirror provenance ledger. No new chat read, storage read, network request, timer, or persistent field is added.
- At the next request, the current visible previous-assistant fingerprint is compared with the previous turn's recorded canonical / host-raw / fresh fingerprints for the same output slot and location.
- The classifier reports:
  - `NONE`
  - `USER_EDIT_CANDIDATE`
  - `REPRESENTATION_DRIFT_CORRELATED`
  - `AMBIGUOUS_CHANGE`
  - `UNKNOWN`
- `REPRESENTATION_DRIFT_CORRELATED` requires a prior `OUTPUT_MISMATCH`, a rebuilt current turn, and exact carryover of the prior `FRESH_CHAT` fingerprint.
- `USER_EDIT_CANDIDATE` requires a prior exact representation followed by a rebuilt current visible body that no longer matches that exact generation representation. The name deliberately remains a candidate, not proof of user intent.
- Diagnostics also report prior representation, current match target, and character-count deltas versus prior canonical/fresh fingerprints. Raw bodies and edit bodies are not retained; text boundary localization is intentionally `n/a` in this release.

---

## SUPPORTED HYPOTHESES

- Small prior `CANONICAL↔FRESH` divergences may cause the next request to see the fresh/display representation as different from the session's trusted canonical representation, thereby entering the same expensive rebuild path used for genuine edits.
- If v0.63.52 reports `REPRESENTATION_DRIFT_CORRELATED` on a future `MANUAL_EDIT_REBUILT`, that will strongly support a host representation-carryover explanation without claiming that the host itself is defective.
- If genuine hand edits report `USER_EDIT_CANDIDATE`, the classifier will have a useful positive-control baseline.
- Only after this distinction is repeatedly verified should a future release consider a representation-specific fast reconcile path.
- COMMUNITY structural compatibility remains a separate output-format candidate and must not be mixed into edit-origin attribution.

---

## UNKNOWN

- Whether the previously observed `Δ -4` / `Δ -1` mismatch pattern will naturally recur under v0.63.52.
- Whether the next visible assistant after such a mismatch exactly matches the prior `FRESH_CHAT` fingerprint.
- Whether all genuine manual edits classify as `USER_EDIT_CANDIDATE` or some are ambiguous because the preceding turn was already divergent.
- What exact host normalization produces the small fresh/canonical differences; v0.63.52 intentionally does not retain prior bodies to inspect character-level boundaries.
- Whether the v0.63.51 `Fresh-Confirmed Envelope Recovery` target case will recur naturally.
- Whether malformed COMMUNITY grouping remains independently reproducible after exact envelope handling.
- The authoritative provider-cache layer and cached-token counts remain unknown to SimCore.

---

## Current v0.63.52 Live Gate

Target release:

```text
v0.63.52 — Edit Origin Attribution
```

Use natural same-runtime turns after the one reload needed to apply the update. No forced edit or cache break is required.

A short useful sequence is:

```text
C
→ B_START
→ B_CONTINUE
→ B_CONTINUE
→ B_END
→ C
```

Additional natural turns are fine. If the user intentionally hand-edits an assistant output, explicitly record that fact next to the following diagnostic so it can serve as a positive control.

Inspect especially:

```text
Edit reconcile
Prior representation
Edit origin
Edit delta
Deferred mirror
Output provenance
Output representation
Envelope recovery
Warnings / Compatibility diagnostics
```

### Expected normal case

```text
Edit reconcile: SAME_FAST ...
Prior representation: EXACT ...
Edit origin: NONE ... match CANONICAL or FRESH_CHAT
```

No reconcile behavior should change.

### Desired representation-drift evidence

After a prior output such as:

```text
Deferred mirror: OUTPUT_MISMATCH
Output representation: CANONICAL↔FRESH Δchars -N · DIFFERENT
```

if the next request rebuilds and its visible assistant exactly matches the prior fresh fingerprint, expect:

```text
Edit reconcile: MANUAL_EDIT_REBUILT
Prior representation: OUTPUT_MISMATCH
Edit origin: REPRESENTATION_DRIFT_CORRELATED
match FRESH_CHAT
Edit delta: ... shape FRESH_EXACT_CARRYOVER
```

This is correlation evidence only. v0.63.52 must still perform the existing rebuild.

### Genuine hand-edit positive control

If the preceding output was exact and the user explicitly edits it before the next request, expect:

```text
Edit reconcile: MANUAL_EDIT_REBUILT
Prior representation: EXACT
Edit origin: USER_EDIT_CANDIDATE
match NONE
```

If a genuine edit happens after a prior mismatch, `AMBIGUOUS_CHANGE` is acceptable and safer than overclaiming user origin.

---

## v0.63.52 Verification Scope

v0.63.52 changes diagnostics/attribution only:

- existing reconcile behavior is unchanged;
- existing Deferred Mirror provenance fingerprints are reused;
- no output body is retained for edit attribution;
- no request/output content is rewritten by the attribution code;
- no extra host read or persistent storage operation is added;
- Fresh-Confirmed Envelope Recovery remains unchanged;
- Deferred Mirror mismatch blocking remains unchanged;
- Structure and COMMUNITY quarantine remain unchanged;
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
Recovery acceptance
Fresh-Confirmed Envelope Recovery
Deferred Mirror identity/location/staleness guards
Deferred Mirror strict mismatch block
MANUAL_EDIT_REBUILT / SAME_FAST behavior
History stabilization mutation policy / OBSERVE_ONLY
Host Prefix Attribution behavior
Persistent storage schema
Network policy
Provider-cache policy
```

---

## Next Candidate

If v0.63.52 repeatedly distinguishes:

```text
genuine hand edit → USER_EDIT_CANDIDATE
prior fresh mismatch carryover → REPRESENTATION_DRIFT_CORRELATED
```

then the next isolated candidate is a narrowly gated representation fast reconcile, tentatively:

```text
v0.63.53 — Representation Fast Reconcile
```

It must only be considered after evidence shows that the current visible assistant is exactly a previously observed generation-time fresh representation and not an arbitrary user edit. Deferred Mirror safety must remain strict.

If v0.63.52 instead produces ambiguous or non-fresh carryover, do not optimize the rebuild path; improve attribution first.

If the unresolved THOUGHTS-compatible envelope case or independent COMMUNITY structural failure reappears, keep those as separate correctness tracks rather than folding them into edit reconciliation.

Storage latency remains a later performance candidate after output correctness and edit-origin attribution are stable.

---

## Maintenance Rule

After each release:

1. the release workflow validates and deploys the production pair;
2. production identity is synchronized to `product-manifest.json` and guideline baseline;
3. `CURRENT_DEVELOPMENT.md` is manually refreshed when real long-chat evidence changes the operational conclusion;
4. a versioned project-source ZIP is built from the final durable-memory state;
5. durable principles are promoted to `SIMCORE_GUIDELINES.md` only when warranted;
6. historical conclusions are superseded explicitly rather than silently erased.
