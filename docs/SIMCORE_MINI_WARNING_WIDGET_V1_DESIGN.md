# SimCore MINI_WARNING_WIDGET_V1 — Frozen Product Design

Date: 2026-08-26
Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-01 COMPLETE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-01`
Importance: `4 / HIGH`
Design difficulty: `2 / EASY`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_DIAGNOSTIC_UX_COMPLETENESS_AUDIT_2026-08-25.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING_CONTRACT.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_ENVELOPE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_QUICK_SUMMARY_DESIGN.md`
- `docs/SIMCORE_GUIDELINES.md`

---

## 1. Purpose

SimCore already records finalized output warnings in the diagnostic system, but ordinary long-chat use can continue for many turns without the operator opening the diagnostic panel.

The product problem is therefore not missing warning semantics. It is warning discoverability.

S-01 freezes one deliberately small product surface:

```text
current finalized output has a real SimCore warning
→ show one compact non-blocking floating badge
→ click/tap opens the existing diagnostic panel
→ next clean current output removes the badge
```

The widget is an exceptional notification surface only.

It is not a dashboard, warning center, validator, severity engine, incident history, or second diagnostic system.

---

## 2. Frozen v1 product identity

Canonical v1 shape:

```text
MINI_WARNING_WIDGET_V1
= FIXED_COMPACT_FLOATING_BADGE
= HIDDEN_WHEN_HEALTHY
= CURRENT_OUTPUT_ONLY
= CLICK_TO_EXISTING_DIAGNOSTIC
= ONE_NODE
= NO_TIMER
= NO_POLLING
= NO_PERSISTENCE
```

The badge is visible only when the latest defensibly-current finalized output owns one or more ordinary SimCore warnings.

It is absent in the healthy state.

---

## 3. Warning authority

The widget consumes the existing finalized warning authority.

Canonical flow:

```text
existing validators / output processing
        ↓
finalized current-output warning set (`lastCore.issues`-equivalent authority)
        ↓
current-output observation/binding
        ↓
warning occurrence projection
        ↓
MINI_WARNING_WIDGET_V1
```

The widget may not:

```text
rerun Structure
rerun Reaction
parse assistant prose for defects
parse diagnostic text to reconstruct warnings
promote Compatibility diagnostics into warnings
invent severity
change commit/quarantine decisions
```

If the widget disagrees with the finalized warning authority, the widget is wrong.

---

## 4. Trigger contract

Show or update the badge only when all are true:

```text
1. output processing is finalized
2. the output is defensibly the current output for the active chat/location
3. finalized ordinary warning count > 0
4. the exact output-warning occurrence has not already produced the same surface transition
```

Do not trigger:

```text
on request preparation
before output finalization
from stale panel/copy observations
from historical output callbacks
from Compatibility diagnostics alone
from a warning-looking string in rendered output
```

A warning on a later current output is a new occurrence even if its warning code/text is identical to an earlier occurrence.

---

## 5. Frozen occurrence identity

The widget needs at-most-once presentation per exact output-warning occurrence while still allowing rerolls/replacements and later outputs to surface independently.

Conceptual occurrence key:

```text
locationKeyDigest
+ runtimeGeneration
+ currentAssistantOutputIndex
+ trusted current-output identity/fingerprint
+ normalizedWarningSetDigest
```

Where a canonical `CURRENT_OUTPUT` diagnostic `observationInstance` is available, implementation may use its exact-instance identity as the bounded current-output component instead of reconstructing an equivalent tuple privately.

### Warning-set digest

`normalizedWarningSetDigest` is derived only from the finalized bounded warning identities/messages already owned by the warning authority.

Rules:
- deterministic ordering;
- bounded input;
- no raw assistant body;
- no user body;
- digest is dedupe metadata only, not warning authority.

### Fail-closed identity rule

If the runtime cannot establish a defensible current output occurrence:

```text
DO NOT surface a new warning badge from ambiguous/stale data
```

The diagnostic panel remains the authority.

This prevents a stale warning from being attached to an unrelated current output.

---

## 6. Surface state machine

Exactly four internal presentation states are sufficient for v1:

```text
HIDDEN
WARNING_CURRENT
QUARANTINE_CURRENT
UNAVAILABLE
```

`UNAVAILABLE` is an implementation/UI capability state and is not shown as a warning badge.

### HIDDEN

```text
current finalized warnings = 0
OR no current warning occurrence exists
→ badge absent
```

### WARNING_CURRENT

```text
current finalized warnings > 0
→ one compact badge visible
```

### QUARANTINE_CURRENT

Use only when an existing canonical output-processing result explicitly establishes that unsafe output/state was quarantined/rejected under the already-owned Structure/state-commit path.

The widget must not infer quarantine from warning wording.

If ordinary warnings exist but no explicit canonical quarantine fact is available:

```text
render WARNING_CURRENT
```

Never guess QUARANTINE.

### UNAVAILABLE

```text
DOM/mainDom surface unavailable
OR owned widget creation/update fails
→ no badge
→ existing diagnostics/runtime continue
```

UNAVAILABLE must never recursively create a new SimCore warning.

---

## 7. Frozen visible content

### Ordinary warning

Compact v1 copy:

```text
⚠ SimCore · N
```

where `N` is the finalized ordinary warning count for the current occurrence.

### Explicit quarantine

Compact v1 copy:

```text
⚠ SimCore · 구조 경고
```

A small count may remain available to accessibility text/detail projection, but the visual quarantine label does not need to expose every warning.

### Content exclusions

Never place these in the floating badge:

```text
raw user text
raw assistant body
COMMUNITY content
Knowledge content
system prompt
full warning messages
exception stacks
fingerprints
reason chains
semantic-owner chains
```

The existing diagnostic panel owns details.

---

## 8. Interaction contract

The badge is:

```text
non-modal
non-blocking
clickable/tappable
keyboard-activatable
focusable only through ordinary user navigation
never auto-focused
```

User activation:

```text
current badge click/tap/keyboard activate
→ open the existing SimCore diagnostic panel
```

The widget does not create a new warning-detail page.

If the occurrence becomes stale between pointer-down and activation:

```text
open the existing diagnostic panel normally
→ do not claim that its current detail still corresponds to the old badge
```

No stale occurrence data is injected into the panel.

A future dedicated historical warning-detail system is out of scope.

---

## 9. Accessibility contract

The badge must remain usable without relying on color alone.

Required conceptual accessibility behavior:

```text
interactive element semantics = button-equivalent
accessible name = bounded warning state + count
keyboard activation = Enter/Space-equivalent supported by host element semantics
visible text/icon = sufficient without color
no forced focus
```

Example accessible name:

```text
SimCore warning, 3 warnings, open diagnostics
```

For quarantine:

```text
SimCore structure warning, open diagnostics
```

Exact localization wording is presentation detail; semantic content is frozen.

---

## 10. Placement and visual budget

The widget uses the established local plugin floating-widget family only as a host/UI reference; SimCore does not depend on Usage Dashboard code.

Frozen placement class:

```text
viewport fixed
bottom-right
safe inset from chat controls
clamped within viewport
single compact badge
no full-width overlay
```

Frozen visual budget:
- one line in ordinary state;
- bounded width;
- no expanding warning list;
- no modal overlay;
- no drag handle;
- no persistent dock/coordinates;
- no animation required for correctness.

Exact pixel spacing, radius, font size, and z-index value are implementation-time visual constants, not open semantic design questions.

Implementation must verify the badge does not cover the primary send/input controls in the supported host layout.

---

## 11. Currentness and lifecycle

The badge represents only the latest current warning occurrence.

Canonical transitions:

```text
clean output
→ HIDDEN

warning output A
→ WARNING_CURRENT(A)

same A re-observed
→ no duplicate transition/node

warning output B
→ update same node to occurrence B

clean output C
→ remove/hide badge

reload/new runtime generation
→ old occurrence cannot remain current
→ badge removed unless a new current occurrence is established in the new generation
```

The widget does not retain a historical warning after a newer clean output.

Reason:

```text
current badge
→ current diagnostic panel
```

A stale badge would imply a relation the current last-turn diagnostic surface may no longer represent.

---

## 12. Resource ownership and cleanup

At most one SimCore warning-widget DOM node exists.

Preferred owner:

```text
small SimCore UI/presentation helper
```

The helper owns only:

```text
node create/update/hide/remove
current occurrence key in bounded memory
event listener lifecycle
presentation state
```

It does not own warning semantics or diagnostic capture.

Cleanup occurs on:

```text
next clean current output
plugin unload/reload
UI disable/replacement
location/chat scope change when current occurrence no longer applies
```

No append-per-warning DOM behavior is allowed.

---

## 13. Host / permission failure behavior

The floating badge may require supported main DOM access.

If required host permission/capability is unavailable:

```text
widget = UNAVAILABLE
runtime semantics = unchanged
diagnostics = unchanged
output processing = unchanged
```

A UI exception is swallowed/bounded as UI-only operational failure.

It may be locally debug-loggable if an existing bounded diagnostic mechanism supports that without recursively adding ordinary warnings.

Forbidden reaction to widget failure:

```text
fail output commit
add Core warning
retry generation
write chat history
write SnapshotStore
network request
poll for DOM availability
```

---

## 14. No configuration subsystem in v1

Frozen v1:

```text
widget enabled by default when the surface capability is available
no position persistence
no drag/dock
no severity filters
no warning-category filters
no auto-dismiss duration
no pluginStorage preference schema
no Core/SnapshotStore preference field
```

A future ON/OFF preference may be separately designed if real use proves it necessary.

It is not part of S-01 v1.

---

## 15. Relationship to S-02 Diagnostic Quick Summary

Keep the surfaces distinct.

```text
S-01 MINI_WARNING_WIDGET_V1
= outside-panel exceptional signal
= hidden when healthy
= warning occurrence only

S-02 Diagnostic Quick Summary
= inside-panel orientation header
= visible whenever panel is open
= six shallow diagnostic facts
```

S-01 must not grow Mode/Binding/Hotspot/Mirror fields.
S-02 must not become an always-visible floating dashboard.

---

## 16. Relationship to Diagnostic Observation infrastructure

S-01 does not require implementing the entire speculative Diagnostic Observation research stack.

It consumes only the minimum current-output identity/binding data necessary to prove:

```text
this finalized warning belongs to this current output occurrence
```

If a small shared comparator/projection helper already exists when S-01 is implemented, reuse it.

Do not instantiate:

```text
global diagnostic registry
persistent observation history
Diagnostic Event Bus
second freshness engine
```

solely for the widget.

---

## 17. Relationship to Compatibility diagnostics

Compatibility diagnostics remain excluded from S-01 v1.

Canonical rule:

```text
ordinary finalized warning set > 0
→ badge eligible

Compatibility diagnostics only
+ ordinary warnings = 0
→ badge hidden
```

A later compatibility event may receive its own product design only if natural evidence proves notification value.

---

## 18. State / persistence / network permission table

```text
Core semantic write             FORBIDDEN
Session semantic write          FORBIDDEN
SnapshotStore write             FORBIDDEN
Host chat write                 FORBIDDEN
new persistent schema           FORBIDDEN
raw body retention              FORBIDDEN
network call                    FORBIDDEN
polling                         FORBIDDEN
interval                        FORBIDDEN
auto-dismiss timer              FORBIDDEN
background task                 FORBIDDEN
persistent warning history      FORBIDDEN
```

Allowed:

```text
one bounded in-memory occurrence key
one owned floating DOM node
one bounded listener set
read-only finalized warning/current-output facts
existing diagnostic-panel open action
```

---

## 19. Implementation placement decision

S-01 does not justify a new semantic SimCore module.

Preferred physical implementation when stabilization later selects it:

```text
small UI-only helper local to existing SimCore UI/diagnostic surface
```

If current file cohesion requires a named internal module, the only acceptable responsibility is presentation lifecycle, e.g. conceptually:

```text
warning-widget
= UI helper / presentation only
```

It must not import or own semantic domain policy.

Do not combine S-01 implementation with M2-3, Store changes, release-system changes, or broad Diagnostic UX infrastructure.

---

## 20. Static / permanent verification plan

A later implementation must prove at least:

```text
1. clean finalized output
   → no badge

2. one ordinary warning
   → one badge / count 1

3. multiple ordinary warnings
   → one badge / bounded count N

4. same exact occurrence observed repeatedly
   → one node / no duplicate transition

5. later output with same warning content
   → new occurrence allowed

6. same output index replaced/rerolled with different trusted output identity
   → treated as a distinct occurrence when current

7. Compatibility diagnostics only
   → no badge

8. explicit canonical quarantine result
   → QUARANTINE_CURRENT presentation

9. no explicit quarantine fact
   → never infer quarantine from message text

10. stale/non-current callback
    → no new badge transition

11. next clean current output
    → badge removed

12. runtime generation changes
    → old badge retired

13. location/chat scope changes
    → old badge retired

14. click/tap/keyboard activation
    → existing diagnostic panel opens

15. activation never injects stale warning data into panel

16. widget never auto-focuses

17. DOM/mainDom unavailable
    → fail silent / output healthy

18. widget helper throws
    → output healthy

19. one DOM node maximum

20. listener lifecycle bounded and cleaned up

21. no polling/interval/timer

22. no persistent state/preferences/history

23. no raw-body retention

24. no network/chat/storage writes

25. existing diagnostic warning count remains semantic authority

26. Surface Conformance preserves same warning occurrence meaning

27. latest.js == install.js for any runtime release

28. all protected SimCore regression suites remain PASS
```

No second test harness is authorized.

---

## 21. Natural live validation plan

After eventual implementation/deployment, do not damage a production long chat merely to generate a warning.

Wait for a natural warning occurrence.

When one appears, verify:

```text
badge appears exactly once for current occurrence
badge count/state matches diagnostic warning authority
chat remains immediately usable
click opens existing diagnostic panel
panel details correspond to the defensibly-current occurrence when still current
next clean output removes badge
reload/update/unload leaves no orphan node
```

If no natural warning occurs:

```text
LIVE = NOT_EXERCISED
STATIC/PERMANENT FIXTURES may still PASS
```

Absence of a natural warning is not a reason to manufacture semantic corruption.

---

## 22. Release / implementation sequencing

This frozen design does not change current production sequencing.

When the later stabilization phase selects S-01 for implementation, use the normal SimCore runtime workflow:

```text
main frozen design/evidence
→ dedicated work branch
→ narrow UI-only implementation
→ static/permanent CI
→ release-simcore deployment
→ natural real-long-chat validation
→ main evidence / durable-memory synchronization
```

`latest.js` and `install.js` remain identical.

S-01 must be one-primary-goal work and must not be mixed with architecture or release-system restructuring.

---

## 23. Explicitly deferred ideas

Not part of S-01 v1:

```text
warning history center
persistent unread count
resolved notification popup
auto-dismiss toast timer
drag/dock
position persistence
warning severity taxonomy
warning category filters
Compatibility diagnostic notifications
multi-plugin notification framework
push/OS notifications
background monitoring
historical badge → exact old diagnostic navigation
```

These are not open S-01 design questions. They are separate future ideas requiring evidence before promotion.

---

## 24. Design completion checklist

```text
problem / user value                  FROZEN
surface shape                         FROZEN
warning authority                     FROZEN
trigger timing                        FROZEN
occurrence identity                   FROZEN
warning/quarantine fallback           FROZEN
current/stale lifecycle                FROZEN
visible content                       FROZEN
interaction                           FROZEN
accessibility                         FROZEN
host/permission failure               FROZEN
resource cleanup                      FROZEN
state/persistence/network boundaries  FROZEN
relationship to S-02                  FROZEN
relationship to diagnostic contracts FROZEN
verification plan                     FROZEN
natural live gate                     FROZEN
implementation sequencing             FROZEN
non-goals/deferred                    FROZEN

OPEN DESIGN QUESTIONS                 0
```

---

## 25. Final verdict

```text
S-01 MINI_WARNING_WIDGET_V1
= DESIGN FROZEN
= PARKED FOR STABILIZATION
= FIXED_COMPACT_FLOATING_BADGE
= HIDDEN_WHEN_HEALTHY
= CURRENT_FINALIZED_WARNING_AUTHORITY ONLY
= EXACT CURRENT OUTPUT OCCURRENCE DEDUPE
= WARNING / EXPLICIT-QUARANTINE PRESENTATION ONLY
= CLICK_TO_EXISTING_DIAGNOSTIC
= FAIL-SILENT UI
= ONE NODE / NO TIMER / NO POLLING / NO PERSISTENCE
= IMPLEMENTATION NONE
= RUNTIME CHANGE NONE
```

Under the SimCore idea-design freeze policy, S-01 work stops here until the later stabilization/implementation phase explicitly selects it.
