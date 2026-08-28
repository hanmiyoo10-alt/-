# SimCore Diagnostic Review Standard

Status: `ACTIVE OPERATIONAL STANDARD · NON_RUNTIME · NR_DOC_ONLY`
Design authority: `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD_DESIGN_2026-08-27.md`

Purpose: define the day-to-day procedure for reviewing one or more copied SimCore diagnostics without losing visible semantic anomalies, cross-turn effects, retry/reroll controls, edit/reload boundaries, scoped subsystem states, or attribution evidence.

This standard is review procedure only. It does not replace runtime diagnostics, anomaly-family authority, SYS-16 recurrence classification, SYS-21 forensic classification consistency, live-gate authority, Deferred/Anomaly Watch disposition, or release authority.

---

## 1. Primary rule

```text
RAW user intent
+ visible assistant output
+ exact diagnostic binding
+ all related neighboring packets
+ operator actions
+ changed facts
+ unchanged facts
→ one bounded Diagnostic Review Episode
```

Never interpret these as global semantic correctness:

```text
Warnings: 0
Stability: PASS
Continuity summary: PASS
Frame sequence: PASS
Cache topology: STABLE
Cache break: NONE
SimCore contribution: NO_BREAK
Runtime status: ACTIVE
output COMMITTED
```

Every such field is scoped to the subsystem/claim it owns.

A release-level or episode-level verdict must never replace review of each supplied diagnostic packet. Every packet is an independent observation surface that must be completely swept before its facts are aggregated into a wider conclusion.

---

## 2. Review episode boundary

One review episode contains every available packet belonging to one bounded operational sequence, including when applicable:

```text
ordinary request → output
request → output → next turn
request → anomalous first generation → same-input retry/reroll
prior output → genuine manual edit → next request
pre-reload packet → refresh/reload → first new-generation request → second new-generation request
B_END → direct post-B_END C
```

Rules:
- same user/assistant indices do not make packets duplicates;
- retry/reroll is a control observation, not a second independent natural recurrence;
- do not omit earlier packets merely because the latest packet looks healthy;
- do not merge unrelated chats/runtime generations merely because version/mode match;
- preserve known physical/operator actions explicitly.

---

## 3. Mandatory review order

### 3.1 BIND every packet

Record:

```text
capture time
SimCore version
runtime boot / generation / epoch
probe context
user index → assistant index
mode / stored mode
request/output binding
action type = ordinary / retry / reroll / manual edit / refresh / reload / other
```

Unknown physical actions remain unknown unless operator evidence resolves them.

### 3.2 READ the current user input first

Before reading reassuring diagnostic status lines, summarize the current request's bounded semantic intent.

Do not substitute the previous turn's topic for the current turn's intent.

### 3.3 READ the visible output semantically

Ask:
- does the output answer the current input?
- does the opening frame belong to the current request?
- does previous-turn material dominate or replay?
- does the response eventually recover into the current request?
- is requested scope, chronology, structure, mode, or lifecycle visibly violated?

Visible truth may establish a symptom that no diagnostic field directly encodes.

### 3.4 SWEEP every supplied packet field-by-field

This step is mandatory **for each diagnostic packet individually** before cross-packet aggregation or release-level judgment.

Do not review only fields relevant to the current release gate. Do not stop after finding one expected PASS or one obvious anomaly. The point of the diagnostic is that independent subsystem claims can disagree, reveal secondary findings, or provide controls for later attribution.

For every packet, explicitly inspect the following surfaces when present:

```text
A. identity / binding
   version
   capture time
   boot / generation / epoch
   probe context
   request hook / handshake
   mode / stored mode
   request user ↔ output assistant binding
   Stability / stale / hooks / UI parts

B. request path / timing
   request timing
   handshake breakdown
   session load
   post-handshake breakdown
   onSend breakdown
   pre snapshot
   turn storage
   request hotspot

C. edit / representation / mirror
   Edit reconcile
   Prior representation
   Edit origin
   Edit delta / shape / boundary
   output provenance
   output representation
   representation ownership
   output mirror / deferred mirror
   envelope recovery / safe-envelope reconcile

D. output path / timing
   output timing
   handler breakdown
   output process
   output hotspot
   hook activity
   diagnostic age

E. warning / compatibility / preamble
   Warnings count + detail
   Compatibility diagnostics + detail
   Preamble provenance / action / policy / candidates

F. prompt / cache / history
   Prompt prefix
   Cache posture
   Cache topology / integrity / break / effect
   Host prefix attribution / delta
   History mutation / alignment / stabilization
   Reconcile frontier / movement
   Repeated break
   Representation correlation
   Mutation attribution
   Rebuild attribution
   Local exposure proxy
   Runtime identity tiers
   SimCore contribution
   Cache placement / cadence / trajectory
   cache topology cost
   provider cache status

G. telemetry / reload handoff
   Telemetry continuity
   Telemetry capsule + component budgets + precision
   Handoff precision
   Session surface
   Host-local transport
   Telemetry checkpoint

H. mode / lifecycle / recurrence
   Runtime prompt size/lines
   Broadcast lifecycle / end authority / closure / terminal coverage
   Short-C source lock
   Summary scope
   Template recurrence / guidance / history match
   Request lineage
   Source handoff

I. frame / evidence / chronology
   RAW frame continuity / regression
   Continuity summary
   Calendar transition
   Frame sequence / frame guard
   Evidence shape / boundary / mode / fences
   Narrative clock
   Post-B_END handoff
   Current-time authority
   Narrative tail coverage
   Visible chronology
   Stored broadcast

J. RAW semantic control
   직전 턴 RAW user vs assistant
   최근 턴 RAW user vs assistant
   current input intent vs current visible output
   previous-turn frame vs current-output frame
   any retry/reroll/edit/reload action supplied by operator
```

For every reviewed surface, classify the local observation as one of:

```text
EXPECTED / HEALTHY
ANOMALOUS / CONTRADICTORY
CONTROL / ATTRIBUTION EVIDENCE
NOT_EXERCISED / UNAVAILABLE
NOT_APPLICABLE
UNRESOLVED
```

The reviewer does not need to repeat every healthy line verbatim in chat, but must actually evaluate every applicable surface before issuing `DIAG_REVIEW_COMPLETE_*`.

Important consequences:

```text
one packet can contain:
- a release-gate PASS signal,
- an unrelated WATCH finding,
- a timing hotspot,
- and a semantic anomaly
at the same time.
```

Therefore:

```text
release verdict != packet review
packet review != one-field verdict
healthy latest packet != earlier packet reviewed
```

If any material surface is not yet understood, use `DIAG_REVIEW_NEEDS_CONTEXT` rather than silently omitting it.

### 3.5 ORDER and COMPARE all related packets

Only after the individual packet sweep is complete, compare adjacent packets on these axes:

```text
A. turn / request identity
B. operator action
C. user-intent summary
D. output semantic-frame summary
E. runtime generation / epoch
F. edit / representation state
G. history mutation / stabilization
H. cache topology / break / trajectory
I. runtime prompt identity tiers
J. lifecycle / frame / chronology
K. telemetry handoff state
L. warnings / compatibility diagnostics
M. timing / hotspot changes
```

For material axes use only:

```text
CHANGED
UNCHANGED
UNRESOLVED
NOT_APPLICABLE
```

UNCHANGED facts are first-class attribution evidence.

### 3.6 INTERPRET subsystem status only after RAW/packet/sequence review

Examples:

```text
Warnings: 0
!= no anomaly

Continuity summary: PASS
!= visible semantic correctness

Cache topology: STABLE
!= identical semantic generation

SimCore contribution: NO_BREAK
!= provider/model health

output COMMITTED
!= correct content
```

Likewise, one DEGRADED/MISMATCH/SLOW field is not automatically a global defect.

### 3.7 BUILD controls

Identify available controls:

```text
same-input retry/reroll
neighbor healthy turn
next-turn inheritance
manual-edit positive control
pre/post reload boundary
same-runtime invariant comparison
cross-runtime comparison
```

Then keep separate:

```text
observable symptom
vs
attribution maturity
```

Default attribution is `UNPROVEN` unless evidence supports stronger wording.

### 3.8 HAND OFF ownership

After the episode is understood:
- SYS-16 owns independent recurrence classification;
- SYS-21 owns forensic classification consistency;
- live-gate authority owns PASS/PENDING/FAIL effect;
- Deferred Ledger / Anomaly Watch own durable disposition where applicable.

This standard does not auto-promote severity and does not authorize runtime repair.

---

## 4. Same-index repeated packet rule

```text
same user/assistant indices
!= duplicate packet
!= same visible generation
!= independent natural recurrence
```

Resolve using:

```text
RAW visible content
fingerprints
Pre snapshot
operator action
edit reconcile
output provenance
runtime identity
```

A same-input retry that materially changes semantic framing while history/cache/runtime-prompt identities remain invariant is meaningful sequence evidence even when the retry diagnostic itself is healthy.

---

## 5. Manual-edit rule

```text
diagnostic AMBIGUOUS_CHANGE / NEW_VISIBLE_REPRESENTATION
+ operator confirms intentional manual edit
+ fingerprints/reconcile path are compatible
→ physical action = CONFIRMED_USER_EDIT
```

Do not keep the physical action unresolved after reliable operator clarification.

Operator evidence does not override contradictory machine evidence about what SimCore did after the edit.

---

## 6. Retry / reroll rule

```text
natural first generation anomalous
+ same-input retry clears
→ SYMPTOM_CLEARANCE_CONTROL

natural first generation anomalous
+ same-input retry reproduces
→ CONTROLLED_REPRODUCTION_EVIDENCE
```

Neither case alone creates a second independent natural recurrence.

If state/history/runtime invariants remain unchanged while output semantics change, preserve those invariants because they narrow attribution.

Use bounded wording such as:

```text
generation/result variability under the same preserved request/runtime state
```

Do not infer provider/model internals without direct evidence.

---

## 7. Reload / runtime-boundary rule

Cross-reload claims require all applicable boundary evidence:

```text
pre-boundary packet/state
+ explicit refresh/runtime reload action
+ changed runtime boot/generation
+ first natural post-boundary request
+ second natural post-boundary request when continuation proof is required
```

Same-generation stability is useful baseline evidence but cannot establish cross-reload continuity.

`Telemetry continuity: FRESH · no-compatible-handoff` alone does not prove failed handoff unless compatible pre-boundary/reload preconditions are established.

---

## 8. Semantic-prefix replay rule

When a new response looks suspiciously similar to the previous response, compare semantic frames rather than requiring byte identity.

Review:

```text
previous user intent
previous output opening frame / major categories
current user intent
current first-generation output opening frame / major categories
same-input retry output frame if available
```

Canonical observable shape:

```text
new user turn
→ first generation reuses a large previous-turn response frame / semantic prefix
→ current requested material may appear later
→ same-input retry may clear the replay
```

Exact family/recurrence ownership remains outside this standard.

---

## 9. Timing rule

Always inspect request/output hotspots and unusual reconcile/storage/load costs, but preserve:

```text
slow != wrong
fast != correct
hotspot correlation != causality
```

Timing becomes a correctness finding only when evidence establishes a correctness consequence or an owning contract defines a blocking threshold.

---

## 10. Review triggers

The following require explicit review/preservation, not automatic defect classification:

```text
RAW input/output semantic mismatch despite healthy diagnostics
previous-turn semantic frame appearing in a new response
same-input retry materially changing semantics
same indices with different visible fingerprints/content
manual edit followed by unexpected reconcile path
runtime generation changed but expected handoff absent
same generation presented as cross-reload proof
visible chronology contradiction despite state-protection PASS
scoped PASS line contradicting stronger RAW-visible evidence
History mutation NONE while output behavior changes materially
runtime identity SAME while output behavior changes materially
cache STABLE/NO_BREAK while semantic anomaly appears
new independent natural specimen resembling a preserved family
required diagnostic surface missing for a named live-gate step
one packet contains a secondary anomaly outside the active release gate
packet-level field contradiction hidden by an otherwise healthy episode summary
```

---

## 11. Review completion states

```text
DIAG_REVIEW_COMPLETE_NO_NEW_FINDING
DIAG_REVIEW_COMPLETE_FINDING_PRESERVED
DIAG_REVIEW_NEEDS_CONTEXT
DIAG_REVIEW_BLOCKED
```

These are review-completeness states only; they are not runtime severity labels.

A `DIAG_REVIEW_COMPLETE_*` state is forbidden until **every supplied packet has completed the per-packet field sweep in §3.4** and every material contradiction or unavailable surface has been dispositioned.

Precedence:

```text
BLOCKED
> NEEDS_CONTEXT
> COMPLETE_FINDING_PRESERVED
> COMPLETE_NO_NEW_FINDING
```

---

## 12. Daily shorthand

```text
1. BIND every packet.
2. READ current input before diagnostic status.
3. READ visible output for semantic/structural correctness.
4. SWEEP every applicable field of every packet; do not gate-cherry-pick.
5. ORDER all related packets; never latest-only.
6. COMPARE adjacent packets on fixed axes.
7. RECORD what changed AND what stayed invariant.
8. INTERPRET PASS/STABLE/COMMITTED only within subsystem scope.
9. USE retry/edit/reload/neighbor observations as controls, not shortcuts.
10. SEPARATE symptom from attribution.
11. HAND recurrence/classification/gate effects to owning authorities.
12. PRESERVE suspicious or useful new evidence before moving on.
```

Operational motto:

> Do not ask only “what does the diagnostic say?” Ask “does every field in this packet, the RAW content, and the surrounding sequence tell the same story?”
