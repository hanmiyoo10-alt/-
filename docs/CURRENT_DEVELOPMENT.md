# SimCore Current Development Memory

> Living operational memory for the current SimCore investigation.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file records the current production state, verified evidence, supported hypotheses, unknowns, live validation gate, and next candidates.

---

<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.53`
- Release: `Boundary-Normalized Envelope Recovery`
- Release branch: `release-simcore`
- Release commit: `3659464f17b60a0ba200172d7b49c8af32075706`
- Release blob: `793d466b7c5ee9bfa7528b43ca44c6b914dc125f`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `BOUNDARY_NORMALIZED_ENVELOPE_RECOVERY_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

## VERIFIED

### Cache / history remains observational

- History stabilization remains `OBSERVE_ONLY`; request mutation and persistent mutation remain `NONE`.
- The compact historical assistant frontier continues to move while externally observed caching can be either hit or miss.
- Host Prefix Attribution has shown both severe reset-correlated misses and later misses with a perfectly stable system @0 / same family. Therefore host-prefix reset is not required for every external miss.
- Genuine user edits and `MANUAL_EDIT_REBUILT` can coexist with an external cache hit.
- Local reusable-prefix telemetry is not provider HIT/MISS telemetry. Provider cache remains internally `UNVERIFIED`.

### v0.63.52 Edit Origin Attribution positive control succeeded

In runtime `mt13xe18-bkr7rf`, the user explicitly hand-edited assistant @1839 before the next request.

The following B_START request @1840 reported:

```text
Edit reconcile: MANUAL_EDIT_REBUILT · 4.753 s
Prior representation: EXACT
canonical 2340:ee3d3fd1
fresh 2340:ee3d3fd1
Edit origin: USER_EDIT_CANDIDATE
current 2338:4593cc89
match NONE
Edit delta: vs canonical -2 · vs fresh -2
```

This is a confirmed positive-control case: a real hand edit is correctly separated from ordinary exact carryover.

### v0.63.52 unedited B_END isolated the output failure

The next B_END request @1842 entered with no preceding representation drift or user edit:

```text
Edit reconcile: SAME_FAST · 1.0 ms
Prior representation: EXACT
Edit origin: NONE
current == prior FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

Its output then produced a new failure entirely on the output side:

```text
Preamble provenance: THOUGHTS_COMPAT
chars 4252
lines 58
action UNRESOLVED
candidates 1

after output:
HOST_RAW 11328:a5b433
CANONICAL 11321:e4e197
FRESH_CHAT 7074:e57b8dc
CANONICAL↔FRESH Δchars -4247
Deferred mirror: OUTPUT_MISMATCH
setChat 0
Envelope recovery: FRESH_MISMATCH
```

The unique response-envelope offset was `4252`. The raw suffix size implied by `HOST_RAW chars - envelope offset` is `7076`, while `FRESH_CHAT` was `7074` chars. The difference is exactly two characters.

This does **not** prove the two characters are CR/LF, but it strongly motivates a bounded boundary-normalization test. The failure cannot be attributed to the user edit because the B_END request entered `SAME_FAST / EXACT / Edit origin NONE`.

### Deferred Mirror strict safety is correct

- The failing B_END correctly remained `OUTPUT_MISMATCH` and `setChat 0`.
- v0.63.53 must not weaken Deferred Mirror identity/location/staleness or fingerprint acceptance gates.
- Fresh chat is confirmation evidence only. Its body must never be copied into canonical output by the new recovery path.

### v0.63.53 implementation boundary

v0.63.53 extends the existing Fresh-Confirmed Envelope Recovery only after the exact suffix fingerprint fails.

For one unique `THOUGHTS_COMPAT` response suffix that already satisfies the existing frame + Knowledge gate:

```text
exact HOST_RAW suffix fingerprint
→ if FRESH_EXACT: existing FRESH_CONFIRMED_SUFFIX
→ else generate at most two trailing-character variants
→ only CR or LF may be removed
→ compare variant fingerprints with the already-read FRESH_CHAT fingerprint
→ exact variant match: BOUNDARY_CONFIRMED_SUFFIX
→ otherwise: existing FRESH_MISMATCH
```

The bounded variant check:

- removes at most two trailing characters;
- accepts only `\r` / `\n` characters;
- stores only fingerprints, lengths, delta and boundary-kind telemetry;
- retains no candidate or variant body;
- adds no chat/storage/network/timer read;
- performs no request mutation or persistent mutation;
- preserves the existing exact `FRESH_CONFIRMED_SUFFIX` path.

New diagnostics include:

```text
Envelope recovery: ... · policy BOUNDARY_CONFIRMED_SUFFIX ...
Envelope boundary: RAW_SUFFIX N → NORMALIZED M · Δchars -1/-2 · TRAILING_* · FRESH_EXACT
```

---

## SUPPORTED HYPOTHESES

- The v0.63.52 B_END mismatch is consistent with a host/output boundary normalization difference near the end of the unique `# 응답` suffix because the inferred raw suffix was 7076 chars and Fresh was 7074 chars.
- If v0.63.53 reports `BOUNDARY_CONFIRMED_SUFFIX` with `Δchars -2` and a CR/LF-only kind, the boundary-normalization hypothesis is strongly supported.
- If v0.63.53 still reports `FRESH_MISMATCH`, the mismatch is not explained by the narrow two-character trailing CR/LF hypothesis and the strict failure behavior should remain.
- COMMUNITY structural warnings may be independent of the preamble representation problem. They must not be silently cleared merely because envelope representation recovery succeeds.

---

## UNKNOWN

- Whether the next naturally occurring unresolved B_END reproduces the 7076→7074 two-character boundary difference.
- Whether those two characters are actually CR/LF.
- Whether successful boundary recovery yields `CANONICAL↔FRESH EXACT` while COMMUNITY warnings/quarantine remain.
- Whether COMMUNITY `1/2`, platform `6/3`, and separator warnings are a truly independent Structure/Community issue.
- Whether a future representation mismatch will exercise `REPRESENTATION_DRIFT_CORRELATED`; v0.63.52 already verified the genuine-edit positive control.
- The authoritative provider cache layer and cached-token counts remain unknown to SimCore.

---

## Current v0.63.53 Live Gate

Target release:

```text
v0.63.53 — Boundary-Normalized Envelope Recovery
```

After the one reload needed to apply the update, use natural same-runtime turns. Do not force a malformed output.

A compact useful sequence is:

```text
C
→ B_START
→ B_CONTINUE
→ B_END
→ C
```

Additional B_CONTINUE turns are fine. A normal turn with `Envelope recovery: NOT_APPLICABLE` is not a failure; the special path is exercised only when a compatible unresolved `THOUGHTS_COMPAT` suffix occurs.

Inspect especially:

```text
Preamble provenance
Envelope recovery
Envelope boundary
Deferred mirror
Output provenance
Output representation
Warnings / Compatibility diagnostics
Edit reconcile / Prior representation / Edit origin on the following request
```

### Desired boundary-recovery evidence

```text
Preamble provenance:
THOUGHTS_COMPAT · candidates 1

Envelope recovery:
RECOVERED
· policy BOUNDARY_CONFIRMED_SUFFIX
· source HOST_RAW_SUFFIX
· confirmation FRESH_EXACT
· persistent NONE

Envelope boundary:
RAW_SUFFIX N → NORMALIZED N-1/N-2
· Δchars -1/-2
· TRAILING_LF / TRAILING_CRLF / TRAILING_LF_LF / related CR/LF-only kind
· FRESH_EXACT

Output representation:
CANONICAL↔FRESH Δchars +0 · EXACT
```

Deferred Mirror should then be `COMMITTED` only because the recovered fingerprint is exactly the Fresh fingerprint. The mirror gate itself remains unchanged.

### Safe failure evidence

If no allowed CR/LF-only variant matches Fresh:

```text
Envelope recovery: FRESH_MISMATCH
Envelope boundary: NOT_APPLICABLE
Deferred mirror: OUTPUT_MISMATCH
setChat 0
```

This is a correct safe failure, not a regression.

### COMMUNITY interpretation

If envelope recovery succeeds but warnings still show:

```text
COMMUNITY blocks 1/2
platform sections 6/3
separator mismatch
state quarantine
```

then promote Community Structural Compatibility to the next isolated release target. Do not weaken Structure acceptance inside v0.63.53.

---

## Current Hard Freeze

```text
Broadcast End Authority
Broadcast lifecycle / modes
Frame
Continuity
Evidence
Lineage
Source Handoff
Reaction
Recurrence
Structure acceptance / COMMUNITY quarantine
TAIL_AFTER_CURRENT_USER
compiler tiers
Deferred Mirror strict gates
Edit Origin Attribution semantics
History stabilization OBSERVE_ONLY
Host Prefix Attribution
Cache trajectory
provider cache UNVERIFIED
persistent schema
network / timers / provider routing
```

---

## Next Candidates

1. **If BOUNDARY_CONFIRMED_SUFFIX succeeds and COMMUNITY warnings persist:** isolate Community Structural Compatibility / grouping recovery in a later release.
2. **If boundary recovery fails with the same ~2-char size delta:** add diagnostics that identify boundary character class without retaining raw bodies; do not broaden normalization blindly.
3. **If future mismatch → next request reports REPRESENTATION_DRIFT_CORRELATED:** consider a separate representation fast-reconcile release only after repeated evidence.
4. Cache work remains frozen unless real provider cached-token telemetry becomes available.
