# SimCore Diagnostic Copy Profiles — Frozen Design

Date: 2026-08-26
Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-03 COMPLETE · DOC_NOT_REQUIRED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-03`
Importance: `3 / MEDIUM`
Design difficulty: `2 / EASY`
Runtime class: `RUNTIME`
Design gate at selection: `NOW`
Doc Apply Class: `DOC_NOT_REQUIRED`
Open design questions: `0`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_COPY_WATCH_06401.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING_CONTRACT.md`
- `docs/SIMCORE_DIAGNOSTIC_QUICK_SUMMARY_DESIGN.md`
- `docs/SIMCORE_LIVE_EVIDENCE_PACKET_BUILDER_DESIGN.md`
- `products/simcore/tests/suites/diagnostic-copy.test.mjs`

---

## 1. Problem

The current SimCore diagnostic copy path is intentionally forensic and comprehensive. That is the correct default for debugging and repository evidence, but it creates two recurring operator frictions:

```text
ordinary inspection / sharing
→ full report is often much larger than needed

adjacent-turn comparison
→ operator must copy or manually preserve two separate reports
→ risk of losing which fact belonged to which observation
```

S-03 adds explicit copy profiles without changing diagnostic truth.

The feature must preserve the current proven copy transport contract and must not become a second diagnostic engine, evidence packet system, or history subsystem.

---

## 2. Product value

Primary goals:

```text
FULL_CURRENT
→ keep the exact current forensic copy behavior

COMPACT_CURRENT
→ copy one bounded current observation for routine inspection

COMPACT_PAIR
→ copy the immediately previous finalized diagnostic observation
  plus the current finalized diagnostic observation
  with independent identity and no field merging
```

Expected benefits:
- faster routine sharing;
- lower copy volume when the full forensic body is unnecessary;
- easier previous/current comparison;
- less manual relabeling of adjacent-turn diagnostics;
- preservation of the existing full-report escape hatch for forensic work.

---

## 3. Constitutional boundary

Canonical principle:

```text
COPY PROFILE
= PRESENTATION / SERIALIZATION POLICY
!= DIAGNOSTIC FACT PRODUCER
!= VALIDATOR
!= EVIDENCE CLASSIFIER
!= HISTORY RECONSTRUCTOR
```

Canonical flow:

```text
existing semantic/runtime/diagnostic owners
        ↓
coherent finalized diagnostic observation(s)
        ↓
profile formatter
        ↓
one immutable copy payload
        ↓
existing primary/fallback copy transport
```

A profile may omit detail.
A profile may not strengthen, reinterpret, or synthesize semantic facts.

---

## 4. Frozen v1 profile set

Exactly three profiles exist in S-03 v1:

```text
FULL_CURRENT
COMPACT_CURRENT
COMPACT_PAIR
```

No additional profile aliases are part of v1.

Explicitly excluded:

```text
EVIDENCE
RAW
DEBUG
CUSTOM
FULL_PAIR
HISTORY
WARNING_ONLY
PERFORMANCE_ONLY
```

Reason: v1 should solve the two concrete density/scope problems without creating a profile language or competing evidence product.

---

## 5. FULL_CURRENT contract

`FULL_CURRENT` is the compatibility/default profile.

Frozen requirement:

```text
FULL_CURRENT payload
= existing buildLastTurnDiagnosticReport-equivalent full report bytes
```

S-03 must not add a profile banner, wrapper, reordered sections, or new profile metadata inside the `FULL_CURRENT` payload merely to identify the selected profile.

Reason:
- existing copied diagnostic reports are already evidence artifacts;
- the diagnostic-copy permanent suite protects build-once / immutable payload transport behavior;
- profile introduction must not rewrite the full-copy semantic/presentation contract as a side effect.

The UI may show that `FULL_CURRENT` is selected, but the copied full-report body remains the existing report body.

---

## 6. COMPACT_CURRENT contract

`COMPACT_CURRENT` serializes one coherent current diagnostic observation.

Frozen semantic field budget:

```text
1. Observation
2. Runtime
3. Mode
4. Binding
5. Path
6. Warnings
7. Hotspot
8. Mirror
```

### 6.1 Observation

Contains bounded identity/context only:

```text
observation identity/digest
observation revision
capture kind when available
current/stale/unbound presentation context
visible user / assistant indices when available
```

No raw user or assistant body.

### 6.2 Runtime

Projects existing runtime facts only:

```text
runtime status
runtime generation
runtime epoch when already available
```

No DOM-derived runtime inference.

### 6.3 Mode

Projects the existing canonical Core runtime mode for the same observation.

No mode inference from visible prose or prompt bytes.

### 6.4 Binding

Projects the canonical diagnostic binding result from the frozen observation binding contract.

No profile-private freshness enum.

### 6.5 Path

A bounded compound line/group made only from already-produced applicable path facts, such as:

```text
request hook / Core handshake
edit origin / edit reconcile
prior/output representation
output disposition
broadcast lifecycle when materially applicable
```

Rules:
- omit non-applicable noise;
- never rerun validators or reconcile logic;
- never parse rendered diagnostic text to reconstruct missing facts;
- maximum v1 target: 6 bounded path facts.

### 6.6 Warnings

Projects:

```text
finalized ordinary warning count
bounded canonical warning/reason IDs when already available
```

Maximum optional IDs: `6`.

Compatibility diagnostics do not silently increment ordinary warning count.

### 6.7 Hotspot

Projects already-observed local SimCore timing facts only.

Preferred compact form:

```text
request hotspot · duration
output hotspot · duration
```

when available.

No new timing pass and no attribution of model/provider wait to SimCore.

### 6.8 Mirror

Projects the existing Deferred Mirror result for the same observation.

No additional Fresh read, retry, or Mirror interpretation.

---

## 7. Relationship to S-02 Quick Summary

`COMPACT_CURRENT` deliberately shares the semantic meanings of these six S-02 fields:

```text
Runtime
Mode
Binding
Warnings
Hotspot
Mirror
```

But S-03 does not depend on S-02 runtime/UI implementation.

Canonical rule:

```text
same observation
+ same underlying owner fact
→ S-02 panel projection and S-03 compact copy must be semantically conformant
```

If a shared pure bounded projection helper exists when both are later implemented, reuse it.
Do not create one formatter that parses the rendered output of the other.

S-03 adds `Observation` and bounded `Path` because copied text needs enough identity/context to stand outside the panel.

---

## 8. COMPACT_PAIR contract

`COMPACT_PAIR` serializes exactly two independently coherent finalized observations:

```text
PREVIOUS
CURRENT
```

Each observation uses the `COMPACT_CURRENT` semantic field budget.

Frozen output structure:

```text
=== SimCore Diagnostic Copy · COMPACT_PAIR ===

--- PREVIOUS OBSERVATION ---
<compact previous>

--- CURRENT OBSERVATION ---
<compact current>

=== End SimCore Diagnostic Copy ===
```

Exact whitespace may be implementation detail, but the two observation boundaries and labels are mandatory.

---

## 9. Pair identity and non-merge rule

The strongest S-03 invariant is:

```text
PREVIOUS facts remain PREVIOUS
CURRENT facts remain CURRENT
```

Forbidden:

```text
previous request timing
+ current warning count
+ current Mirror result
→ one apparent observation
```

Each side must retain its own:

```text
observation identity
observation revision
runtime generation
binding/currentness context
turn indices where available
```

A pair is useful precisely because two observations may legitimately differ.

Surface Conformance applies within each observation identity, not across the two observations.

---

## 10. Previous-observation definition

`PREVIOUS` means:

```text
the immediately preceding finalized diagnostic observation
for the same chat/location scope
that was retained by the bounded diagnostic presentation lifecycle
```

It does NOT mean:

```text
nearest older assistant message found by rescanning history
nearest report by wall-clock timestamp
previous report pasted by the user
arbitrary older diagnostic specimen
```

The relation is based on finalized observation sequence, not prose similarity.

---

## 11. Bounded pair-retention design

S-03 may require a minimal in-memory observation retention seam when implemented later.

Frozen maximum:

```text
2 finalized bounded diagnostic observation projections per active chat/location scope
```

Conceptual state:

```text
previousFinalizedObservation
currentFinalizedObservation
```

Permissions:

```text
bounded in-memory presentation retention  ALLOWED
SnapshotStore write                      FORBIDDEN
Core/Session semantic write              FORBIDDEN
pluginStorage persistence                FORBIDDEN
Host chat write                          FORBIDDEN
raw user body retention                  FORBIDDEN
raw assistant body retention             FORBIDDEN
Fresh body retention                     FORBIDDEN
network                                   FORBIDDEN
```

The retained objects contain only the bounded diagnostic facts needed by the profile contract.

This is presentation/diagnostic copy memory, not semantic chat state.

---

## 12. Reload / scope-change behavior

The two-slot pair memory is not persisted.

Therefore after plugin reload/update/new generation:

```text
no defensible previous retained observation
→ COMPACT_PAIR unavailable until two finalized observations exist
```

Do not rescan full chat history solely to manufacture a previous diagnostic observation.

A location/chat scope change clears the old pair relation for the newly active scope.

If an implementation can defensibly retain prior bounded observations through an already-existing diagnostic lifecycle surface without new persistence, that may be reused, but S-03 does not authorize new persistent history.

---

## 13. Pair availability / failure rule

If `CURRENT` is unavailable:

```text
copy profile build fails
```

If `COMPACT_PAIR` is selected but `PREVIOUS` is unavailable:

```text
PAIR SOURCE UNAVAILABLE
→ no partial pair copied
→ no silent downgrade to COMPACT_CURRENT
→ no duplicate CURRENT pretending to be PREVIOUS
```

The UI may expose a bounded operation result such as:

```text
PROFILE_SOURCE_UNAVAILABLE
```

This is an operation/UI result only, not a SimCore runtime warning.

---

## 14. Profile selection UI contract

S-03 v1 requires one small profile selector associated with the existing diagnostic copy action.

Frozen behavior:

```text
default = FULL_CURRENT
selection changes only the next copy payload formatter
```

No persistent preference in v1.

Allowed implementation shapes:
- compact select/menu next to copy;
- small menu opened from the existing copy control;
- equivalent bounded local diagnostic-panel control.

Not authorized:

```text
new settings page
pluginStorage preference
Core setting
floating copy widget
keyboard-global shortcut system
```

Exact visual styling is implementation detail.

---

## 15. Copy-action snapshot rule

A profile selection does not authorize mixed-time reads.

For `FULL_CURRENT` / `COMPACT_CURRENT`:

```text
copy action
→ select/capture one coherent current observation instance
→ format once
→ copy immutable payload
```

For `COMPACT_PAIR`:

```text
copy action
→ select retained PREVIOUS + CURRENT finalized instances as one pair snapshot
→ format each independently
→ concatenate once
→ copy immutable pair payload
```

Do not format one half, wait for a later runtime event, then format the other half.

---

## 16. Existing copy transport must remain authoritative

The v0.64.2 Diagnostic Copy Resilience contract remains intact.

Canonical transport:

```text
build selected payload exactly once
→ primary clipboard write
→ if transport fails, bounded fallback copies the exact same already-built bytes
```

Required invariant:

```text
primary payload bytes == fallback payload bytes
```

No profile may rebuild between primary and fallback attempts.

S-03 does not create another clipboard implementation.

---

## 17. Copy failure vocabulary

Existing transport outcomes remain conceptually authoritative:

```text
COPIED_PRIMARY
COPIED_FALLBACK
REPORT_BUILD_FAILED
CLIPBOARD_WRITE_FAILED
```

S-03 may add only narrowly scoped pre-transport/profile operation states when needed, such as:

```text
PROFILE_UNSUPPORTED
PROFILE_SOURCE_UNAVAILABLE
```

These do not become Core warnings and do not change runtime/output commit behavior.

Unknown profile IDs must fail closed rather than silently mapping to another profile.

The normal initialized UI default is `FULL_CURRENT`; `PROFILE_UNSUPPORTED` is for invalid/internal invocation, not ordinary missing user preference.

---

## 18. Relationship to S-04 Live Evidence Packet Builder

S-03 must not create an `EVIDENCE` copy profile.

Canonical distinction:

```text
S-03 Diagnostic Copy Profiles
= alternate density/scope views of diagnostic observations

S-04 Live Evidence Packet Builder
= bounded evidence-transfer object
= explicit evidence qualifiers + classification handoff
```

S-03 output never independently emits:

```text
Classification: CLASSIFICATION_PENDING
Repository disposition: REVIEW_REQUIRED
Blocker status: NOT_ASSESSED
```

merely to resemble an evidence packet.

A future UI may place the S-04 action near S-03 controls, but S-04 remains a separate operation/schema and may not be redefined as a profile.

---

## 19. Relationship to full diagnostic / forensic evidence

`COMPACT_CURRENT` and `COMPACT_PAIR` are convenience surfaces.

They are not guaranteed to contain every forensic fact needed to classify a defect.

Canonical operator rule:

```text
compact copy is sufficient for routine comparison

meaningful anomaly / ambiguous attribution
→ inspect FULL_CURRENT + required RAW/neighbor context
→ preserve evidence under normal repo workflow
```

Compact omission does not mean a hidden field is healthy or irrelevant.

---

## 20. Surface Conformance obligation

For the same observation identity:

```text
panel
FULL_CURRENT
COMPACT_CURRENT / corresponding COMPACT_PAIR half
```

must not disagree on any semantic fact they all claim to represent.

Profile-specific omission is allowed.
Profile-specific semantic strengthening is forbidden.

Examples:

```text
panel Binding = PROBE_BEHIND
compact copy = CURRENT_BOUND
→ FORBIDDEN

panel warning count = 0
compact copy warning count = 1
→ FORBIDDEN

FULL_CURRENT observation A
PAIR CURRENT observation B
→ not automatically a conformance defect if identities differ and are explicit
```

---

## 21. Unknown / weak-state discipline

Compact profiles preserve weak states.

Allowed:

```text
UNKNOWN
UNAVAILABLE
UNATTRIBUTED
NOT_APPLICABLE
NOT_EXERCISED
UNBOUND
```

Forbidden readability upgrades:

```text
UNAVAILABLE → NONE
UNATTRIBUTED → guessed cause
NOT_EXERCISED → PASS
UNBOUND → CURRENT
```

If a compact field cannot be defensibly projected, show the applicable weak state or omit the optional subfield according to the profile contract.

---

## 22. Raw-content and privacy boundary

S-03 adds no new raw-content surface.

`COMPACT_CURRENT` and `COMPACT_PAIR` must not contain:

```text
raw user body
raw assistant body
system prompt
full COMMUNITY block
full Knowledge block
full Fresh body
full Host chat objects
```

`FULL_CURRENT` preserves only whatever the already-authorized existing full diagnostic report contains; S-03 does not broaden that report's raw-content budget.

Two-slot retention never stores raw bodies.

---

## 23. Resource / performance contract

S-03 must be cheap and event-driven.

Forbidden:

```text
polling
intervals
background profile building
per-turn serialization of all three profiles
history rescans for pair reconstruction
network
persistent diagnostic history
second validator pass
second timing pass
```

Preferred behavior:

```text
finalized observation event
→ update bounded previous/current projection references

explicit copy action
→ build only selected profile
```

No payload is prebuilt merely because a diagnostic panel is open.

---

## 24. State / persistence / Host permission table

```text
Core semantic state write        FORBIDDEN
Session semantic write           FORBIDDEN
SnapshotStore write              FORBIDDEN
persistent profile preference    FORBIDDEN
persistent diagnostic history    FORBIDDEN
Host chat write                  FORBIDDEN
new history scan                 FORBIDDEN
new Fresh read                   FORBIDDEN
network                          FORBIDDEN
polling / timer                  FORBIDDEN
```

Allowed:

```text
one ephemeral selected profile UI value
up to two bounded finalized observation projections
local formatter objects/strings during explicit copy
existing clipboard/fallback transport
```

---

## 25. Failure isolation

S-03 is an observability/presentation feature.

If profile selection, pair retention, compact formatting, or copy transport fails:

```text
runtime/output processing remains unchanged
Core/Session/SnapshotStore remain unchanged
existing diagnostic panel remains usable
FULL_CURRENT remains available unless the existing full report builder itself fails
```

Profile failure must not append an ordinary Core warning merely because copy UI failed.

---

## 26. Future permanent verification plan

When S-03 is selected for runtime implementation, minimum verification includes:

### FULL_CURRENT compatibility

```text
1. FULL_CURRENT default
   → exact existing full report payload

2. primary copy success
   → payload built once

3. primary fail / fallback success
   → same immutable FULL bytes

4. report builder failure
   → no clipboard/fallback attempt with partial payload
```

### COMPACT_CURRENT

```text
5. healthy current C observation
   → all eight semantic fields/sections defensible

6. B_START / B_CONTINUE / B_END
   → Mode matches owner fact

7. stale/unbound observation
   → no false current claim

8. warning count N
   → same finalized warning count as full/panel

9. Compatibility-only diagnostics
   → ordinary warning count unchanged

10. hotspot present
    → same underlying timing fact; no new timer pass

11. Mirror result present
    → same owner result; no Fresh retry/read

12. compact formatter failure
    → runtime/panel healthy
```

### COMPACT_PAIR

```text
13. two consecutive finalized observations
    → PREVIOUS = older exact instance
    → CURRENT = newer exact instance

14. previous/current have different modes
    → each remains attached to its own identity

15. previous warning / current clean
    → no warning carryover

16. previous clean / current warning
    → no backward warning injection

17. previous/current different runtime generations when defensibly retained by existing lifecycle
    → generation difference explicit
    → no identity collapse

18. only one finalized observation available
    → PROFILE_SOURCE_UNAVAILABLE
    → no partial copy

19. reload/new generation with no retained previous
    → pair unavailable
    → no history scan

20. chat/location scope changes
    → old pair not reused for new scope

21. pair formatter builds both halves from one pair snapshot
    → no mixed-time update

22. primary/fallback transport
    → exact same pair payload bytes
```

### negative boundaries

```text
23. no raw bodies retained in two-slot memory
24. no SnapshotStore/pluginStorage writes
25. no network/polling/timers
26. no second diagnostic validator
27. no EVIDENCE profile
28. S-04 evidence packet schema/behavior unchanged
29. S-02 shared semantic fields conform when both surfaces exist
30. existing diagnostic-copy permanent suite remains PASS
31. Surface Conformance fixtures added/extended only in existing harness when implementation exposes the needed surfaces
32. latest.js == install.js for runtime release
```

Do not create a second test harness.

---

## 27. Future live-validation obligation

S-03 changes runtime diagnostic UI/copy behavior when implemented, so normal SimCore release/live validation applies.

Minimum live proof after deployment:

```text
FULL_CURRENT
→ copy normal current diagnostic
→ body matches existing expected full format

COMPACT_CURRENT
→ copy same current observation
→ shared facts match panel/full diagnostic

COMPACT_PAIR
→ after two natural finalized turns
→ copy pair
→ PREVIOUS and CURRENT labels/indices/modes/binding remain distinct
→ no field carryover

primary clipboard or bounded fallback
→ copy remains usable
```

No intentional state corruption is required.

A natural warning is useful but not mandatory for the basic live close because warning-count semantics remain fixture-protected.

---

## 28. Future implementation placement

S-03 does not justify a new semantic domain module.

Preferred future placement:

```text
existing diagnostic presentation/copy surface
+ small pure profile formatter/projection helper
+ bounded two-slot observation presentation retention
```

If a named internal module is used, its responsibility must remain presentation-only, e.g. conceptually:

```text
diagnostic-copy-profile
= select bounded observation projection(s)
+ format selected profile
```

It must not own runtime semantics, validation, history reconstruction, or evidence classification.

---

## 29. Implementation sequence — later only

When stabilization selects S-03:

```text
main frozen design/evidence
→ dedicated work branch
→ expose/reuse bounded diagnostic observation projection
→ preserve FULL_CURRENT exact builder behavior
→ add COMPACT_CURRENT formatter
→ add bounded two-slot previous/current retention
→ add COMPACT_PAIR formatter
→ add profile selector
→ extend existing diagnostic-copy / surface-conformance fixture coverage
→ static + permanent CI
→ release-simcore deployment
→ real long-chat validation
→ main documentation / durable-memory sync
```

Do not combine S-03 with:
- M2-3 physical extraction;
- release-system restructuring;
- SnapshotStore evolution;
- S-04 runtime implementation;
- S-01 warning widget implementation.

---

## 30. DOC APPLY review

Freeze-time classification:

```text
DOC APPLY CLASS = DOC_NOT_REQUIRED
```

Reason:
- this frozen design itself contains the full profile vocabulary, field budgets, pair identity rules, transport compatibility, failure behavior, and verification plan;
- a second profile field matrix/checklist document would duplicate this authority rather than enable an independently useful pre-runtime workflow;
- the useful product effect still requires runtime diagnostic copy UI/formatting behavior.

Therefore there is no separate S-03 R_PREP document transaction now.

---

## 31. Explicit non-goals

S-03 v1 does not provide:

```text
arbitrary historical diagnostic picker
N-turn history export
raw chat export
custom field builder
user-authored profile definitions
profile persistence/settings
repo writer
incident classifier
Evidence Packet replacement
automatic fixture creation
performance budget engine
new warning severity
new diagnostic truth
```

Any future demand for these is a separate idea/work item.

---

## 32. Frozen verdict

```text
S-03 Diagnostic Copy Profiles

Runtime Class: RUNTIME
Importance: 3
Difficulty: 2
Design Gate: NOW

Profiles:
- FULL_CURRENT
- COMPACT_CURRENT
- COMPACT_PAIR

FULL_CURRENT
= existing full-report bytes / compatibility default

COMPACT_CURRENT
= one observation / eight bounded semantic fields

COMPACT_PAIR
= previous + current finalized observations
= independent identities
= no field merge
= bounded two-slot in-memory presentation retention only

Evidence profile
= FORBIDDEN / S-04 remains separate

Runtime implementation
= PARKED FOR STABILIZATION

Doc Apply Class
= DOC_NOT_REQUIRED

OPEN DESIGN QUESTIONS
= 0

DESIGN FROZEN
= YES
```
