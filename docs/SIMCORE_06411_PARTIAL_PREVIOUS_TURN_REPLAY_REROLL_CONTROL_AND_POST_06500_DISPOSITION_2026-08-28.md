# SimCore v0.64.11 PARTIAL_PREVIOUS_TURN_REPLAY — reroll control and post-v0.65.0 disposition

Date: 2026-08-28

Status: **RECURRENCE CONFIRMED · SAME-INPUT REROLL CLEARS · PRE-M2-3 BASELINE · NON-BLOCKING FOR v0.65.0 · POST-v0.65.0 REASSESSMENT REQUIRED**

## Purpose

This addendum records the operator's follow-up control for the v0.64.11 natural `PARTIAL_PREVIOUS_TURN_REPLAY` specimen at user `@2240` → assistant `@2241`, and fixes the release-planning disposition before the combined v0.65.0 identity-convergence + M2-3 release.

It is authoritative over the earlier provisional line in `SIMCORE_PARTIAL_PREVIOUS_TURN_REPLAY_RECURRENCE_2026-08-27.md` that said the current specimen's reroll-clear control had not yet been provided.

## Natural specimen recap

The natural @2240 input requested only 2031 platform-by-platform metrics for:

```text
YouTube
Instagram
COSMIC communication app
TikTok
CSW stock
```

The first @2241 generation answered those requested domains, then appended broad annual-career sections inherited from the immediately preceding rerolled @2239 response frame:

```text
music / album
acting
variety
ambassador / other personal activity
```

This is a semantic/frame-level `PARTIAL_PREVIOUS_TURN_REPLAY` specimen rather than a byte-identical replay.

The first-generation diagnostic was locally healthy:

```text
Stability: PASS
binding BOUND
out COMMITTED
mirror COMMITTED
Warnings: 0
Compatibility diagnostics: 0
CANONICAL <-> FRESH exact
Telemetry capsule COMPACT_V2 OK
HOST_LOCAL WRITTEN
```

Therefore healthy local representation and telemetry signals do not exclude semantic previous-turn replay.

## Same-input reroll control

The operator then rerolled/regenerated the same @2240 request.

Operator observation:

```text
same @2240 input
first generation: partial previous-turn replay present
reroll: normal / current-input-focused response
```

The reroll did not reproduce the preceding broad annual-career suffix.

Classification of this control:

```text
control class: SAME_INPUT_REROLL_OR_REGEN
symptom clearance on reroll: YES
new independent natural recurrence: NO
family support: STRONGER
root-cause proof: NO
```

This matches the already-preserved family pattern in which a natural first generation can partially reuse the preceding response frame while a same-input reroll clears the symptom.

## Updated family posture

With this control, the current bounded family posture is:

```text
family: PARTIAL_PREVIOUS_TURN_REPLAY
independent natural specimens: >= 3
recurrence: CONFIRMED
symptom confidence: HIGH
same-input reroll clearance: OBSERVED AGAIN
reproducible on demand: NOT PROVEN
root cause: UNPROVEN
provider/model cause: UNPROVEN
SimCore request/history mutation cause: UNPROVEN
severity: NOT DERIVED
runtime FIX authority: NONE
```

Do not infer provider/model randomness merely from reroll variability. The supported wording remains generation/result variability under preserved or comparable request/runtime state unless narrower evidence is captured.

## Relationship to v0.65.0

The combined v0.65.0 release is already planned to contain:

```text
Subgate A
- runtime identity convergence
- host-local reload-continuity closure

Subgate B
- M2-3 Edit Reconcile ownership extraction
```

This replay family predates M2-3 and therefore must **not** be pulled into v0.65.0 as an assumed M2-3 bug or mandatory repair merely because another specimen was observed immediately before that release.

Current release disposition:

```text
v0.65.0 scope expansion for replay repair: NO
v0.65.0 blocker: NO
preserve as pre-M2-3 baseline: YES
post-v0.65.0 natural reassessment: REQUIRED
```

The correct comparison after v0.65.0 is before/after behavior, not simple presence/absence.

## Post-v0.65.0 interpretation rules

If the same family is observed after v0.65.0:

### Case A — same occasional shape and reroll still clears

```text
natural first generation partially reuses prior response frame
current requested content still appears
same-input reroll clears
Warnings / representation remain otherwise healthy
```

Disposition:

```text
M2-3 regression attribution: NOT PROVEN
v0.65.0 release failure: NO, by this fact alone
separate replay investigation: CONTINUE
narrow later repair candidate: YES, after attribution work
```

### Case B — frequency or severity materially worsens after v0.65.0

Examples:

```text
replay occurs repeatedly across neighboring natural turns
replay consumes most/all of the response
current input is substantially ignored
reroll no longer clears
new edit-reconcile / representation anomalies co-occur consistently
```

Disposition:

```text
promote to active regression investigation
compare M2-3 ownership path directly
consider blocking further M2 advancement until attribution is resolved
```

### Case C — no recurrence in the v0.65.0 validation window

Disposition:

```text
family remains RECURRENCE_CONFIRMED historically
not "fixed"
no v0.65.0 fix claim
continue low-cost watch in later long-chat operation
```

Absence in one validation window cannot erase the pre-existing recurrence evidence.

## Evidence to preserve on the next occurrence

On a future natural recurrence, before editing/reloading if possible preserve:

```text
1. current user input
2. immediately preceding assistant output
3. anomalous first output
4. first-generation diagnostic
5. same-input reroll output
6. reroll diagnostic
7. generation ID / runtime identity
8. whether any edit/reload occurred between first generation and reroll
```

The highest-value semantic comparison remains:

```text
which sections/categories belong to the current input
which sections/categories came only from the immediately preceding response frame
where in the response the replay starts/stops
whether the reroll removes exactly those prior-frame sections
```

## Planning conclusion

The practical sequencing is:

```text
finish v0.65.0 identity + M2-3 combined release
→ close Subgate A
→ validate Subgate B
→ retain PARTIAL_PREVIOUS_TURN_REPLAY as pre-M2-3 baseline
→ reassess with post-update natural evidence
→ only then decide whether a dedicated narrow replay investigation/repair should precede later M2 work
```

This avoids contaminating a mechanically scoped ownership release with an un-attributed semantic-generation repair while ensuring the recurrent symptom is not forgotten.

## References

- `docs/SIMCORE_PARTIAL_PREVIOUS_TURN_REPLAY_RECURRENCE_2026-08-27.md`
- `docs/SIMCORE_06500_COMBINED_IDENTITY_M2_3_RELEASE_DECISION_2026-08-28.md`
- `docs/SIMCORE_06500_IMPLEMENTATION_ACTIVATION_OWNERSHIP_SCOPE_2026-08-28.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
