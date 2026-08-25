# SimCore Diagnostic Quick Summary Design

Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-02 COMPLETE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-02`
Legacy starter-menu alias: `S1`
Importance: `5 / VERY HIGH`
Design difficulty: `1 / VERY EASY`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_DIAGNOSTIC_UX_PREIMPLEMENTATION_CLOSE_2026-08-25.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING_CONTRACT.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_ENVELOPE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`

---

## 1. Problem

The existing SimCore diagnostic report is intentionally detailed because it serves forensic long-chat debugging. During ordinary inspection, however, the operator often needs to answer only six immediate questions:

```text
Is SimCore active?
What mode is this observation in?
Is this observation defensibly bound/current?
How many finalized warnings belong to it?
What request phase dominated local SimCore time?
What did Deferred Mirror do?
```

Reading the full diagnostic to answer those six questions is safe but unnecessarily expensive for routine inspection.

S-02 defines one compact read-only summary at the top of the existing diagnostic panel. It does not replace the detailed diagnostic and does not create new diagnostic truth.

---

## 2. Product value

Primary value:

```text
open diagnostic panel
→ understand current operational posture in one glance
→ inspect full detail only when needed
```

Expected benefits:
- faster everyday long-chat inspection;
- faster detection of stale/unbound diagnostic views;
- immediate visibility of warning count and request hotspot;
- easier comparison of repeated healthy turns;
- no reduction in forensic detail because the full diagnostic remains unchanged below the summary.

---

## 3. Frozen surface decision

S-02 v1 is:

```text
DIAGNOSTIC_PANEL_HEADER
```

It is NOT:

```text
floating widget
chat-screen badge
toast
second diagnostic panel
separate dashboard
copied-report profile
```

Reason:
- `S-01 MINI_WARNING_WIDGET_V1` already owns the future out-of-panel exceptional warning surface;
- `S-03 Diagnostic Copy Profiles` owns future copy-density choices;
- S-02 should remain a compact enhancement of the existing panel only.

The summary is visible whenever the diagnostic panel is open, including healthy observations. It is not hidden when healthy.

---

## 4. Constitutional boundary

Canonical flow:

```text
existing semantic/runtime/diagnostic owners
        ↓
one coherent Diagnostic observation instance
        ↓
read-only Quick Summary projection
        ↓
existing detailed diagnostic panel remains authority/detail surface
```

Canonical principle:

```text
QUICK SUMMARY
= SHALLOW PROJECTION
!= VALIDATOR
!= HEALTH ENGINE
!= STATE OWNER
```

S-02 must never determine whether a warning exists, whether a mode is valid, whether Mirror may write, or whether the request is healthy.

---

## 5. One-observation rule

All summary fields shown together must come from one coherent `observationInstance` under the frozen Diagnostic Observation Identity / Revision / Binding contract.

Forbidden:

```text
Mode from panel-open snapshot
+ Warnings from later output
+ Hotspot from newer request probe
+ Mirror from another recapture
→ one apparently current summary
```

Correct rule:

```text
one observationIdentity + one observationRevision
→ one Quick Summary
```

If a newer observation is needed, create/consume the newer observation according to the existing diagnostic lifecycle contract. Never field-merge observations.

---

## 6. Frozen v1 information budget

S-02 has exactly six semantic summary fields.

```text
Runtime
Mode
Binding
Warnings
Hotspot
Mirror
```

No aggregate `Health`, `Score`, `Severity`, or `PASS/FAIL` field is added.

Reason:

```text
Warnings 0
!= proof that every diagnostic subject is healthy

Binding CURRENT_BOUND
!= proof that every semantic validator passed

Mirror COMMITTED
!= whole-turn health verdict
```

A synthesized health verdict would create a new authority and is therefore out of scope.

---

## 7. Field contracts

### 7.1 Runtime

Meaning: existing runtime activity state for the observation.

Preferred compact values:

```text
ACTIVE
INACTIVE
UNAVAILABLE
```

Rules:
- project existing runtime status only;
- do not derive runtime activity from DOM presence or panel availability;
- do not include output commit status as a second hidden dimension in this field;
- if runtime status cannot be defensibly observed, show `UNAVAILABLE`.

### 7.2 Mode

Meaning: current Core runtime mode attached to the same observation.

Allowed canonical values when applicable:

```text
B_START
B_CONTINUE
B_END
C
```

Weak states use existing applicability semantics rather than guessing:

```text
NOT_APPLICABLE
UNAVAILABLE
```

Do not infer Mode by parsing prompt bytes, visible prose, or Broadcast wording.

### 7.3 Binding

Meaning: canonical diagnostic binding state from the frozen Identity / Revision / Binding contract.

Machine vocabulary:

```text
CURRENT_BOUND
PROBE_AHEAD
PROBE_BEHIND
NO_REQUEST_CONTEXT
UNBOUND
UNAVAILABLE
```

This field is the only Quick Summary field allowed to make a direct request/output binding claim.

Human labels may be shortened visually, but machine meaning must remain one of the canonical states above.

Do not introduce `STALE`, `PANEL_STALE`, or private Quick Summary binding enums as new machine states.

### 7.4 Warnings

Meaning: count of the finalized warning set belonging to the same observation.

Authority:

```text
existing finalized warning result / lastCore.issues-equivalent observation fact
```

Compact form:

```text
0
1
2
...
```

Rules:
- count only ordinary finalized SimCore warnings already owned by existing output processing;
- do not include Compatibility diagnostics by default;
- do not rerun Structure/Reaction/other validators;
- do not invent warning severity;
- if the observation does not defensibly contain a finalized warning set, show `—` / `UNAVAILABLE` according to the existing observation contract rather than assuming 0.

### 7.5 Hotspot

Meaning: the already-observed dominant local SimCore request phase for this observation.

Compact presentation:

```text
<PHASE> · <duration>
```

Example:

```text
EDIT_RECONCILE · 12.0s
```

Rules:
- consume the existing request-hotspot/timing result;
- do not rescan history or recalculate timings solely for the summary;
- do not create performance budgets or regression severity here;
- duration is compact human presentation only;
- if no request-specific timing applies, show `—` / `NOT_EXERCISED` / `UNAVAILABLE` as supported by the observation.

S-02 does not parse a rendered `Request hotspot:` text line to recover semantics. Future implementation must project the underlying bounded timing fact directly.

### 7.6 Mirror

Meaning: existing Deferred Mirror outcome attached to the same observation.

Examples may include existing canonical results such as:

```text
COMMITTED
OUTPUT_MISMATCH
BLOCKED / SKIPPED / NOT_EXERCISED
UNAVAILABLE
```

Exact future displayed values must preserve the actual owner-produced result vocabulary; S-02 does not create a replacement Mirror enum.

Rules:
- no additional Fresh read;
- no retry;
- no mirror write;
- no reinterpretation of Output Compat policy;
- display only the already-produced bounded Mirror result.

---

## 8. Context / stale-display rule

Binding and observation lifecycle are distinct. A historical observation may originally have had `CURRENT_BOUND` and later become stale-displayable after a new turn.

Therefore S-02 requires one non-semantic **context marker** around the six fields.

Human presentation classes:

```text
CURRENT VIEW
STALE VIEW
UNBOUND VIEW
UNAVAILABLE VIEW
```

These are presentation labels only, not new machine enums.

Canonical derivation:

```text
CURRENT VIEW
= observation lifecycle is current/active
  AND binding = CURRENT_BOUND

STALE VIEW
= observation lifecycle says the displayed instance is stale/superseded/historical

UNBOUND VIEW
= current display exists but binding cannot be defensibly established

UNAVAILABLE VIEW
= required observation source is unavailable
```

Important:
- lifecycle may change how the old observation is presented;
- lifecycle must not rewrite the historical `Binding` result stored for that observation;
- an old `CURRENT_BOUND` observation cannot regain currentness by mutating identity fields.

If the panel remains open across a new turn, the Quick Summary must not continue claiming `CURRENT VIEW` merely because its original binding was current.

S-02 does not add polling. Lifecycle changes should be driven only by existing/future bounded diagnostic lifecycle events or explicit recapture/reopen behavior.

---

## 9. Compact layout contract

Semantic layout order is frozen:

```text
[context marker]
Runtime · Mode · Binding
Warnings · Hotspot · Mirror
```

Example, format only:

```text
CURRENT VIEW
Runtime ACTIVE · Mode C · Binding CURRENT_BOUND
Warnings 0 · Hotspot EDIT_RECONCILE 1.0ms · Mirror COMMITTED
```

Another example:

```text
STALE VIEW
Runtime ACTIVE · Mode B_END · Binding CURRENT_BOUND
Warnings 0 · Hotspot SAME_FAST 0.8ms · Mirror COMMITTED
```

The second example is intentionally possible: `Binding CURRENT_BOUND` describes what that old observation originally established, while `STALE VIEW` describes its current display lifecycle.

Exact typography, colors, spacing, icons, localization, and responsive wrapping are implementation/visual details and are not semantic authority.

---

## 10. Interaction contract

S-02 v1 adds no new required interaction.

```text
summary header
→ read-only

full detailed diagnostic
→ remains immediately below / available in existing panel
```

No new:

```text
click-to-expand system
hover tooltips required for correctness
navigation router
copy button
refresh engine
floating badge
```

A future implementation may use existing panel controls, but S-02 does not invent a new interaction framework.

---

## 11. Relationship to S-01 warning widget

Keep the two ideas strictly separate.

```text
S-01 MINI_WARNING_WIDGET_V1
= exceptional out-of-panel notification
= hidden when healthy
= warning occurrence only

S-02 Diagnostic Quick Summary
= in-panel everyday orientation
= visible when panel is open
= six shallow observation fields
```

S-02 must not become an always-visible chat-screen dashboard.
S-01 must not expand into the six-field Quick Summary.

Both may consume the same authoritative warning observation when applicable, but they remain separate surfaces.

---

## 12. Relationship to S-03 Diagnostic Copy Profiles

S-02 does not alter copied diagnostic output.

Future S-03 design may decide whether a copy profile includes an equivalent compact summary projection.

If it does, Surface Conformance requires the copy projection to preserve the semantics of the exact observation instance it represents.

S-03 may not retroactively change S-02 field meanings.

---

## 13. Relationship to Diagnostic Observation Envelope

S-02 should consume only the minimum bounded fields needed for its six projections.

It does not authorize eagerly implementing every optional field in the conceptual DiagnosticObservationEnvelope.

Preferred future shape:

```text
existing owner facts
→ minimum bounded observation/envelope projection
→ Quick Summary formatter
```

No dynamic envelope registry/service is required.

---

## 14. State / persistence / Host boundaries

S-02 permission table:

```text
Core semantic state write      FORBIDDEN
Session semantic write         FORBIDDEN
SnapshotStore write            FORBIDDEN
new persistent schema          FORBIDDEN
raw chat/body retention        FORBIDDEN
Fresh body retention           FORBIDDEN
Host chat write                FORBIDDEN
new Fresh read                 FORBIDDEN
network call                   FORBIDDEN
polling / interval             FORBIDDEN
background task                FORBIDDEN
```

Allowed:

```text
bounded in-memory presentation object for the currently displayed observation
existing panel DOM/rendering work when implemented later
existing owner-produced enums/counts/timings/results
```

---

## 15. Failure behavior

Quick Summary failure must be non-authoritative and fail safe.

If one field is unavailable:

```text
show the canonical weak state / —
keep the rest of the defensible same-observation fields
```

If observation binding is unavailable or inconsistent:

```text
do not guess CURRENT
→ UNBOUND VIEW / UNAVAILABLE VIEW
```

If the summary formatter itself fails:

```text
summary may be omitted
existing detailed diagnostic panel must still work
runtime/output processing must remain unaffected
```

A presentation failure is not a Core warning and must not recursively append to `lastCore.issues`.

---

## 16. Anti-scope rules

Do not expand S-02 into:

```text
health score
traffic-light whole-system validator
new severity taxonomy
second warning parser
performance budget engine
second Mirror interpretation layer
always-visible status dashboard
history timeline
raw-body preview
new diagnostic persistence
new DiagnosticManager
background freshness watcher
```

If later user need justifies one of these, classify it as a separate idea/work item.

---

## 17. Future implementation verification

When S-02 is later selected for implementation, minimum static/fixture coverage must include:

```text
1. healthy current C observation
   → CURRENT VIEW
   → Runtime ACTIVE
   → Mode C
   → Binding CURRENT_BOUND
   → Warnings 0
   → existing hotspot projected
   → existing Mirror result projected

2. B_START / B_CONTINUE / B_END observations
   → exact canonical Mode projection

3. finalized warning set length N
   → Warnings N
   → Compatibility diagnostics alone do not increment N

4. request hotspot present
   → same underlying hotspot identity/duration as detailed diagnostic
   → no new timing pass

5. Mirror result present
   → same owner-produced outcome as detailed diagnostic
   → no additional Fresh read

6. panel observation becomes stale after a newer turn
   → context marker becomes STALE VIEW
   → old observation identity/binding is not rewritten

7. PROBE_AHEAD
   → no CURRENT VIEW claim

8. PROBE_BEHIND
   → no CURRENT VIEW claim

9. NO_REQUEST_CONTEXT
   → request-specific fields use defensible N/A/NOT_EXERCISED states

10. UNBOUND / UNAVAILABLE
    → no guessed values or nearest-observation merge

11. two different observation instances available
    → all six fields come from one selected instance only

12. summary and detailed panel for EXACT_INSTANCE
    → semantic conformance PASS

13. presentation-only wording/layout change
    → no observation revision bump

14. summary formatter failure
    → detailed diagnostic still works
    → runtime/output unaffected

15. no raw user/assistant/Fresh bodies retained by summary machinery

16. no SnapshotStore semantic writes

17. no timers/polling/network additions

18. no copy-path semantic change solely from S-02

19. no new warning authority/severity

20. latest.js == install.js if runtime bytes are eventually changed

21. existing diagnostic-copy and v0.64.7 cache-continuity regression controls remain PASS
```

Reuse the existing permanent SimCore harness. Do not create a second test system.

---

## 18. Future live-validation obligation

S-02 is a runtime product UI change if implemented inside the plugin, so normal SimCore release/live workflow applies later.

A normal healthy long-chat can directly exercise the primary surface without manufacturing corruption.

Minimum live proof after future deployment:

```text
open diagnostic on healthy current turn
→ summary appears once at panel top
→ six fields match the detailed diagnostic
→ chat remains fully usable

keep/revisit an older panel observation across a natural later turn when supported
→ no false CURRENT VIEW claim

open/recapture current diagnostic
→ current observation is shown coherently
```

If a natural warning occurs, additionally verify the warning count agrees with the detailed diagnostic. Absence of a natural warning does not block the basic S-02 live close; warning-specific branch may remain `NOT_EXERCISED` because warning semantics are independently protected.

Do not intentionally corrupt production chat state solely to trigger a warning or stale failure case.

---

## 19. Future implementation sequencing

Current phase remains design-only.

```text
NOW
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ STOP
```

When stabilization/implementation phase later selects S-02:

```text
re-read actual production Diagnostic UX surface
→ dedicated work branch
→ minimum projection/header implementation only
→ static + existing harness CI
→ release-simcore if plugin bytes change
→ real long-chat UI validation
→ main evidence/status synchronization
```

Do not combine S-02 implementation with:

```text
S-01 warning widget
S-03 copy profiles
Diagnostic Snapshot Freshness repair
M2-3/M2-4 ownership extraction
release-system restructuring
```

unless a separately documented hard dependency is proven at implementation time.

---

## 20. Open design questions

```text
NONE
```

All design questions required for this bounded v1 are resolved.

---

## 21. Final frozen contract

```text
S-02 DIAGNOSTIC QUICK SUMMARY

SURFACE
= existing diagnostic panel header only

CORE FIELDS
= exactly 6
  Runtime
  Mode
  Binding
  Warnings
  Hotspot
  Mirror

CONTEXT
= presentation marker required
  CURRENT VIEW / STALE VIEW / UNBOUND VIEW / UNAVAILABLE VIEW
  derived from existing lifecycle + binding semantics
  not a new machine enum

SOURCE
= one coherent observationInstance only

HEALTH SCORE
= FORBIDDEN

WARNING AUTHORITY
= existing finalized warning set only

HOTSPOT
= existing bounded timing/hotspot fact only

MIRROR
= existing owner-produced result only
= no new Fresh read / interpretation

INTERACTION
= read-only v1

COPY CHANGES
= NONE

PERSISTENCE
= NONE

RAW DATA RETENTION
= NONE

POLLING / NETWORK
= NONE

IMPLEMENTATION NOW
= NONE

DESIGN STATUS
= FROZEN

PARKING STATUS
= PARKED FOR STABILIZATION
```
