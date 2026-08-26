# SYS-47 — User Handoff Card — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-47
Idea          = User Handoff Card
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 1 / VERY EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct upstream contract:
- `docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md`

Related frozen designs:
- `docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md`
- `docs/SIMCORE_SYS48_GATE_BLOCKED_REASON_SURFACE_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`

---

## 1. Problem

SimCore work is intentionally strict about identity, scope, gate state, mutation boundaries, verification, evidence, and stop conditions.

Those internal controls are useful to the repository/operator, but a user handoff has a different job.

The user normally needs to know only the bounded practical facts:

```text
What are we doing?
Why is this the legitimate current work?
Do you need anything from me?
What exactly should I do or return?
What will not be changed in this task?
Where does this task stop?
What happens after that stop?
```

Without a frozen projection contract, two opposite failures are possible.

```text
UNDER-SPECIFIED HANDOFF
→ "test this" / "send results" / "we'll do the next thing"
→ user cannot tell which exact action/evidence is required
→ later review cannot distinguish missing evidence from a failed experiment

OVER-SPECIFIED HANDOFF
→ internal gate vocabulary, RT matrices, bundle rules, authority maps, and repository mechanics are dumped into the user instruction
→ the actual action is buried
→ internal implementation detail is mistaken for a user obligation
```

A third failure is more dangerous:

```text
HANDOFF DRIFT
→ internal task card says one objective/scope/gate/stop condition
→ user-facing message silently describes a different task
```

SYS-47 defines one compact **User Handoff Card** as a safe projection from the current Canonical Task Card and other already-authoritative specialized handoff surfaces.

It does not invent work state.

---

## 2. Core invariant

```text
TASK_CARD_READY or faithfully blocked task state
+ user-relevant authoritative facts
→ one bounded user-facing handoff projection

User Handoff Card
!= Canonical Task Card
!= roadmap
!= global NEXT authority
!= task scheduler
!= gate engine
!= permission system
!= live-gate semantic experiment authority
!= evidence classifier
!= close receipt
!= repository writer
```

The card answers:

> What does the user need to understand or do for this bounded task, without contradicting the internal task contract?

It does not answer:

> Is the task authorized independently of its source authorities?

and it does not answer:

> Did the task or live gate pass?

---

## 3. SYS-46 is the canonical internal source

This dependency is constitutional.

```text
SYS-46 Canonical Task Card
= internal transaction contract

SYS-47 User Handoff Card
= user-relevant projection of that contract
```

SYS-47 must not mint a competing:

```text
Work ID
objective ID
work type
gate state
scope boundary
mutation boundary
stop condition
```

If a corresponding SYS-46 field exists and is material to the handoff, SYS-47 consumes it.

If an internal field is not user-relevant, SYS-47 may omit it.

Omission is allowed.
Contradiction is not.

Frozen projection rule:

```text
internal detail may be hidden for clarity
semantic meaning may not be changed for convenience
```

---

## 4. Card creation / use point

A User Handoff Card is useful when at least one of these is true:

```text
1. user action is required before the task can continue;
2. user decision/selection is required;
3. the task is blocked on a user-visible gate and the reason/next review event should be clear;
4. a substantive repository task has just been selected and the user benefits from a concise scope/stop summary;
5. work is being handed between chats/sessions and the practical next action must remain stable.
```

It is not required for every conversational acknowledgment or tiny implementation update.

Do not create repository noise by persisting a separate handoff artifact for every chat message.

The v1 value is the **projection contract/template** and prospective procedural use.

---

## 5. User-action posture vocabulary

Every handoff resolves exactly one user-action posture:

```text
NO_USER_ACTION
USER_ACTION_REQUIRED
USER_DECISION_REQUIRED
WAITING_ON_GATE_OR_EXTERNAL
```

### `NO_USER_ACTION`

The user does not need to perform an action for the bounded task to continue or close.

The handoff may simply summarize what is being done and where it stops.

### `USER_ACTION_REQUIRED`

One concrete user action or bounded action sequence is required.

Examples:
- perform the current real-long-chat validation experiment;
- provide a diagnostic copy named by the gate authority;
- inspect/confirm a bounded externally visible result when repository tooling cannot establish it.

### `USER_DECISION_REQUIRED`

The repository authorities leave a genuine choice that only the user should make.

Examples:
- choose between two separately legitimate future product directions;
- decide whether to reprioritize the active bounded design sweep.

Do not use this posture when the repository already determines the next action and the assistant is merely reluctant to proceed.

### `WAITING_ON_GATE_OR_EXTERNAL`

No immediate user action is useful because the work is waiting on a named gate, future checkpoint, external receipt, or other authoritative event.

This posture must consume the real blocking reason; it cannot be used as vague "wait" language.

---

## 6. Handoff-definition state vocabulary

Exactly five v1 definition states:

```text
USER_HANDOFF_DRAFT
USER_HANDOFF_READY
USER_HANDOFF_BLOCKED
USER_HANDOFF_STALE
USER_HANDOFF_SUPERSEDED
```

### `USER_HANDOFF_DRAFT`

The projection is still being prepared and must not be treated as the canonical user instruction.

### `USER_HANDOFF_READY`

The handoff faithfully projects the current task/gate authority and contains enough information for its selected user-action posture.

Important:

```text
USER_HANDOFF_READY
!= task authorization
!= gate open
!= implementation PASS
!= live PASS
```

### `USER_HANDOFF_BLOCKED`

Use when a truthful user-facing instruction cannot be produced without guessing.

Examples:
- canonical task identity is unresolved;
- user action depends on conflicting gate authorities;
- a required specialized handoff source is missing;
- the internal card itself is `TASK_CARD_BLOCKED` and no safe blocked explanation can be projected.

### `USER_HANDOFF_STALE`

Use when a source task/gate/production state materially changed after the handoff was prepared.

A stale handoff must not remain the active instruction merely because the user has not yet responded.

### `USER_HANDOFF_SUPERSEDED`

Use when a later legitimate task card/handoff replaces the prior instruction.

Do not silently reinterpret the old user action as if it had always referred to the new task.

---

## 7. v1 handoff schema

A full User Handoff Card contains exactly eight semantic sections.

The rendered chat form may omit sections that are explicitly `NONE` or not material, but the projection review must still resolve them.

### 7.1 Task identity

User-facing fields:

```text
Task / short title
Work ID when useful
Current handoff state
User-action posture
```

Rules:
- use the SYS-46 Work ID/title when one exists;
- do not expose internal objective IDs or WT codes unless they help the user understand a technical handoff;
- do not create a friendlier but semantically different task name.

### 7.2 What we are doing

One or two sentences maximum.

This is a plain-language projection of the bounded objective.

Requirements:
- state one primary objective;
- preserve the task's current stage: design / implementation / release / live review / docs-only application / etc.;
- do not imply implementation when the transaction is design-only;
- do not imply release when the transaction stops before publication.

### 7.3 Why now / current posture

One short explanation of why this is the legitimate current action or why it cannot proceed now.

Sources:
- current selection authority;
- SYS-46 gate posture;
- SYS-48 blocked reason when gated;
- current production/live-gate authority when material.

This section must not manufacture urgency or importance.

### 7.4 What I will do

A bounded summary of assistant/operator-owned work.

Examples:

```text
- update the frozen design document and living idea ledgers on main
- implement only the frozen M2-3 slice on the dedicated work branch
- review returned live evidence and classify PASS/WATCH/FIX/BLOCKER
```

Do not list internal maintenance steps that do not help the user understand responsibility unless those steps affect what the user should expect.

### 7.5 What you need to do

This field is controlled by the user-action posture.

#### NO_USER_ACTION

```text
User action: NONE
```

Do not ask for confirmation merely to continue already-authorized work.

#### USER_ACTION_REQUIRED

Give exactly one bounded action unit.

A unit may contain ordered steps when the authoritative experiment itself is sequential.

The action must state:

```text
ACTION
RETURN / RESULT NEEDED
```

Do not add optional speculative tests.

#### USER_DECISION_REQUIRED

State:

```text
DECISION
OPTIONS / BOUNDARY
WHAT THE DECISION CHANGES
```

Only present options that are actually legitimate under current authority.

#### WAITING_ON_GATE_OR_EXTERNAL

State:

```text
NO USEFUL ACTION NOW
BLOCKING FACT
RE-REVIEW EVENT
```

Do not ask the user to manufacture evidence or perform irrelevant activity merely to fill the wait.

### 7.6 What this task will not do

A short scope guard projected from SYS-46 `OUT OF SCOPE` and forbidden mutation surfaces.

Default: one to three bullets.

Prioritize exclusions that prevent plausible misunderstanding.

Examples:

```text
- no runtime/plugin code change in this design transaction
- no release-system redesign in the runtime implementation transaction
- no provider/backend claim from local telemetry
```

Do not dump every internal exclusion.

### 7.7 Stop / return condition

State the point where the current task or user handoff ends.

Examples:

```text
- stop after design freeze and living-doc synchronization; implementation remains separate
- stop after static/CI verification; release is a later transaction
- return the named live evidence; classification happens only after review
```

This must remain consistent with the Canonical Task Card normal stop condition.

### 7.8 After this

One bounded consequence or next-review statement.

Examples:

```text
- after this design freezes, recompute the remaining system-idea edge
- if the live gate closes PASS, M2-3 becomes the next physical architecture checkpoint
- if evidence is insufficient or anomalous, preserve/classify it before any repair decision
```

Rules:
- this is not a permanent global NEXT authority;
- conditional wording must preserve the condition;
- do not promise a future action that current gates do not authorize.

---

## 8. Compact rendering contract

A user-facing handoff should normally be compact enough to scan in one view.

Preferred ordering:

```text
NOW
YOU
BOUNDARY
STOP / AFTER
```

Conceptual compact form:

```text
[Task] <ID / title>
Now: <what we are doing + why now>
You: <NONE / one action / one decision / waiting reason>
Boundary: <most important non-goals>
Stop: <current transaction edge>
After: <one conditional or bounded next consequence>
```

This is a rendering suggestion, not a second schema.

Avoid:
- long internal status dumps;
- entire authority lists;
- RT-01..RT-12 matrices;
- full verification plans unless the user must perform them;
- duplicate detailed live-gate instructions already owned by SYS-19.

---

## 9. Constitutional boundary with SYS-19 Live-Gate Handoff Packet

This distinction is mandatory.

```text
SYS-47
= generic user-facing task projection

SYS-19
= specialized semantic instruction packet for a real live-gate experiment
```

When a task requires a live-gate experiment:

```text
SYS-46 internal task card
→ SYS-47 says that user action is required
→ SYS-19 supplies the exact experiment + evidence-return semantics
```

SYS-47 may summarize:

```text
"Run the current v0.64.7 cross-reload continuity live-gate experiment and return the bounded evidence named by the current live-gate handoff."
```

But if the exact step sequence is material, SYS-47 must reference/consume SYS-19 rather than rewrite an independent sequence from memory.

Reason:
- one semantic experiment authority;
- less handoff drift;
- one place to update when the live-gate contract changes.

`USER_HANDOFF_READY` must never substitute for `HANDOFF_READY` or live PASS semantics owned by SYS-19/review authorities.

---

## 10. Boundary with SYS-48 Gate-Blocked Reason Surface

For a blocked/gated task:

```text
SYS-48
= why blocked + re-review event + premature-action guard

SYS-47
= projects the user-relevant portion of that explanation
```

SYS-47 must not calculate a new unlock event.

Example:

```text
Internal gate:
POST_M2_3

SYS-48:
blocked because physical M2-3 has not closed
re-review after authoritative M2-3 closure

SYS-47:
"Nothing useful is required from you for this item now. It stays parked until M2-3 closes; we will re-evaluate it after that checkpoint."
```

Unknown unlock remains unknown.

```text
unknown unlock
!= user should try random actions
```

---

## 11. Boundary with SYS-08 Work-Item Close Receipt

```text
SYS-47
= forward-looking practical handoff

SYS-08
= point-in-time close record after work
```

At task close, a final chat response may summarize a SYS-08 result for the user, but SYS-47 must not rewrite the close receipt or act as evidence.

The handoff `After this` field is a planned/conditional consequence.
The close receipt `NEXT` is the reviewed point-in-time close result.

They may differ legitimately if evidence or an anomaly changed the task outcome.

That difference must be explained rather than hidden.

---

## 12. Boundary with SYS-50 and SYS-51

### SYS-50

A user should not have to understand the bundling rule matrix.

If SYS-50 finds a split requirement, SYS-47 projects the practical result:

```text
"These changes must be handled as separate work items, so this task will cover X only; Y remains separate."
```

Do not expose `BUNDLE_SPLIT_REQUIRED` unless the token itself is useful in a technical handoff.

### SYS-51

The user handoff does not list every close-step surface.

It may say:

```text
"I will close the repository evidence/current-state records after verification."
```

while SYS-51 remains the authority for which RT surfaces must actually be evaluated.

---

## 13. Evidence / claim honesty

A User Handoff Card must preserve the difference between:

```text
what will be checked
what has already been proven
what is still unknown
```

Forbidden examples:

```text
"CI will prove the live behavior is correct"
"the cache is working, just send one screenshot"
"release is ready" when publication/genuine-release proof is still pending
```

Preferred:

```text
"Static/CI checks will verify the bounded implementation contract; real long-chat correctness remains a separate live proof."
```

or:

```text
"The live result will be classified only after the returned diagnostic/evidence is reviewed."
```

SYS-47 creates no new proof class.

---

## 14. Scope-change behavior during a handoff

If the user asks for an adjacent change while a task is active, the handoff must not silently absorb it.

Frozen behavior:

```text
adjacent request appears
→ compare against current Canonical Task Card
→ if inside the existing bounded objective, continue
→ if material second objective / forbidden mutation, preserve as separate idea/work
→ current handoff remains scoped to original card
```

If the current task is intentionally reprioritized or replaced:

```text
old handoff → USER_HANDOFF_SUPERSEDED
new legitimate task card → new handoff
```

This protects the user's own scope intent from becoming accidental bundling.

---

## 15. Freshness / invalidation

Review or invalidate a User Handoff Card when any of these materially changes:

```text
Canonical Task Card becomes STALE/SUPERSEDED/BLOCKED
gate/selection posture changes
production/live-gate identity changes
user-action requirement changes
specialized SYS-19 live handoff changes
scope/mutation boundary changes
stop condition changes
new anomaly changes the legitimate next operation
```

A handoff that says "run this test" after the gate already closed is stale.
A handoff that says "no user action" after a new legitimate live evidence requirement appears is stale.

---

## 16. Persistence / repository-noise rule

The v1 implementation is a document contract/template, conceptually:

```text
docs/SIMCORE_USER_HANDOFF_CARD_TEMPLATE.md
```

Actual rendered handoffs normally live in the work chat or the natural bounded task artifact.

Do not create one permanent repository file for every routine user-facing update.

Persist a dedicated handoff instance only when durable user action/decision continuity materially matters, for example:

```text
cross-session live experiment instructions
high-risk multi-step external action
long-lived gate waiting state where stale instruction risk is high
handoff between distinct operators/chats where the exact action must survive
```

For normal design/implementation transactions, the frozen template + Canonical Task Card + close receipt are sufficient repository memory.

---

## 17. v1 examples

### 17.1 Design-only system idea

```text
Task: SYS-47 User Handoff Card
Now: Freeze the handoff projection contract on main and synchronize the living idea ledgers.
You: NONE.
Boundary: No runtime/plugin/release change; no application of the frozen template in this transaction.
Stop: Design FROZEN + living-doc sync.
After: Recompute the remaining open system-design edge.
```

### 17.2 Runtime implementation before release

```text
Task: M2-3 Edit Reconcile extraction
Now: Implement only the frozen M2-3 ownership extraction on its dedicated work branch.
You: NONE unless a separately named live/control action becomes required.
Boundary: No release publication and no release-system redesign in this implementation transaction.
Stop: implementation + required static/CI verification + evidence close.
After: publication/live proof remain separate transactions under their own authority.
```

### 17.3 Current v0.64.7 live gate

Generic SYS-47 projection:

```text
Task: 06407 reload-cache continuity live close
Now: The runtime is frozen at v0.64.7 pending the declared real-long-chat close.
You: USER_ACTION_REQUIRED — follow the current SYS-19 live-gate handoff and return the bounded first/second post-boundary evidence it requests.
Boundary: Do not infer provider/backend cache truth from local telemetry and do not start M2-3 before this gate is classified.
Stop: evidence returned to the work chat for repository review.
After: PASS can open M2-3; WATCH/FIX/BLOCKER follow their reviewed dispositions.
```

The exact live experiment sequence remains in SYS-19/current live-gate authority.

### 17.4 Gated future item

```text
Task: M-08 Snapshot Schema Inventory Generator
Now: Parked under POST_M2_3.
You: WAITING_ON_GATE_OR_EXTERNAL — no useful action now.
Boundary: Do not pull the work forward before physical M2-3 closure.
Stop: no current transaction starts.
After: re-review after authoritative M2-3 closure.
```

---

## 18. Hard boundaries

SYS-47 must never become:

```text
second Canonical Task Card
second CURRENT_DEVELOPMENT
second live-gate semantic authority
auto task scheduler
background reminder system
permission/authorization layer
GitHub/repository writer
automatic gate opener
automatic PASS/WATCH/FIX/BLOCKER classifier
provider/backend inference layer
full evidence packet
raw diagnostic archive
second close receipt
requirement to ask the user for confirmation on every task
```

It is a bounded communication projection only.

---

## 19. Verification plan for later NR_DOC_ONLY application

When `SIMCORE_USER_HANDOFF_CARD_TEMPLATE.md` is materialized, verify at least:

```text
1. a ready SYS-46 card projects the same Work ID/objective meaning without creating a new identity
2. internal-only objective/WT/authority details can be omitted without changing semantic meaning
3. one design-only task clearly says NO_USER_ACTION and no runtime/application work
4. one runtime implementation handoff keeps publication/release-system work out of scope
5. one current live-gate handoff routes exact experiment semantics to SYS-19 rather than duplicating them
6. one POST_M2_3 item consumes SYS-48 blocked reason/re-review event rather than inventing an unlock
7. USER_HANDOFF_READY is never described as task authorization or PASS
8. "what will be checked" remains distinct from "what is already proven"
9. a material scope expansion requires task-card review/split rather than silent handoff widening
10. stale production/gate/user-action identity makes the handoff STALE
11. routine chat updates do not generate one permanent repository file each
12. no plugin/runtime/release/CI/repository-writer behavior changes
```

No real long-chat validation is required solely for SYS-47.

---

## 20. Unified classification freeze verdict

Design inspection confirms the provisional classification:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 1
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful v1 is a human-facing projection contract/template;
- all semantic facts remain owned by existing task/gate/evidence authorities;
- no executable generator is required for the core value;
- no runtime, CI, release, repository-writer, or automation surface is required.

A future generator/chat formatter may be considered separately only if it consumes reviewed task-card fields and does not infer semantic state.

---

## 21. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-47 here.

Materialization of the template or durable handoff instances is separate NR application work after the active system-design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
SimCore production = v0.64.7 Cross-Reload Cache Observer Continuity
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
current live gate = PENDING_REAL_LONG_CHAT
```
