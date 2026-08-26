# SimCore Host Capability Receipt — Frozen Design

Date: 2026-08-26
Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-07 COMPLETE · DOC_NOT_REQUIRED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-07`
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
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING_CONTRACT.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_COPY_PROFILES_DESIGN.md`
- `docs/SIMCORE_LIVE_EVIDENCE_PACKET_BUILDER_DESIGN.md`
- `docs/SIMCORE_IDEA_SPACE_CLASSIFICATION_2026-08-26.md`
- production `release-simcore` v0.64.7 runtime-host / runtime-hooks / runtime-telemetry implementation

---

## 1. Problem

SimCore depends on several Host and browser surfaces, but current diagnostics mostly report the semantic result of operations rather than a single bounded answer to:

```text
Which Host/browser surfaces were actually present in this runtime?
Which ones were naturally exercised?
Which attempts succeeded or failed?
Which capabilities were never exercised and therefore remain unknown operationally?
```

Without a dedicated receipt, operators can accidentally over-read a downstream failure as proof that a capability is absent, or infer unsupported Host/provider internals from indirect symptoms.

S-07 defines one bounded read-only **Host Capability Receipt** for diagnostics.

It does not create Host capability, test Host mutation paths, or infer provider internals.

---

## 2. Product / debugging value

Primary value:

```text
open diagnostic
→ inspect one bounded Host Capability Receipt
→ distinguish exposed surface from actual use outcome
→ avoid false attribution
→ know which branch was NOT_EXERCISED
```

Examples:

```text
Clipboard API surface PRESENT
+ last natural copy use FAILED
→ transport/use failure, not proof API is absent

sessionStorage surface ABSENT
→ continuity fallback was unavailable in this runtime

request hook surface PRESENT
+ registration/use SUCCEEDED
→ host request-hook path was actually exercised
```

The receipt is evidence about SimCore-visible Host/browser capability only.
It is not a browser/device/provider inventory.

---

## 3. Constitutional boundary

Canonical principle:

```text
HOST CAPABILITY RECEIPT
= BOUNDED OBSERVATION / PRESENTATION
!= CAPABILITY PROBER
!= HOST VALIDATOR
!= PROVIDER DETECTOR
!= PERMISSION ESCALATOR
!= SEMANTIC OWNER
```

Canonical flow:

```text
existing Host/browser surfaces
+ existing naturally occurring SimCore operations/results
        ↓
bounded capability observation
        ↓
one receipt attached to a coherent diagnostic observation
        ↓
panel / FULL diagnostic projection
```

If the receipt disagrees with an actual owner-produced operation result, the receipt is wrong.

---

## 4. No synthetic probe rule

S-07 must never perform a side-effecting operation solely to discover capability.

Forbidden capability tests:

```text
write/delete a probe chat message
call setChat with synthetic content
write/delete a pluginStorage probe key
write a clipboard test payload
create/remove sessionStorage probe data
register a disposable Host hook only to test registration
open/close Host UI solely as a capability test
perform a network request
```

The strongest rule is:

```text
DO NOT MUTATE THE HOST TO LEARN WHETHER HOST MUTATION IS POSSIBLE
```

S-07 may consume:

```text
bounded surface-presence checks without invocation
existing operation success/failure already produced by normal SimCore behavior
existing hook-registration outcomes
existing copy telemetry
existing runtime-telemetry transport outcomes
```

No polling or background re-probing is allowed.

---

## 5. Two-dimensional row model

A capability row keeps **surface exposure** separate from **observed use**.

### Surface state

```text
PRESENT
ABSENT
UNKNOWN
```

Meaning:

```text
PRESENT
= the required callable/property surface was defensibly observed to exist

ABSENT
= the required callable/property surface was defensibly observed not to exist

UNKNOWN
= presence could not be safely established
```

### Use state

```text
SUCCEEDED
FAILED
NOT_EXERCISED
NOT_APPLICABLE
UNKNOWN
```

Meaning:

```text
SUCCEEDED
= a normal SimCore operation using this capability succeeded

FAILED
= a normal operation attempted the capability and failed

NOT_EXERCISED
= the surface may exist, but no qualifying operation was observed in this receipt scope

NOT_APPLICABLE
= the capability does not apply to the current host/runtime context

UNKNOWN
= an attempt/evidence existed but the bounded result cannot safely distinguish outcome
```

Important:

```text
Use FAILED
!= Surface ABSENT
```

A failed operation must not erase evidence that the API surface was present.

---

## 6. Evidence-source vocabulary

Every non-UNKNOWN row must say how it was established.

Frozen source classes:

```text
SURFACE_CHECK
EXISTING_OPERATION_RESULT
EXISTING_REGISTRATION_RESULT
EXISTING_RUNTIME_TELEMETRY
NOT_OBSERVED
```

Rules:
- `SURFACE_CHECK` may inspect bounded function/property presence only; it must not invoke the capability.
- `EXISTING_OPERATION_RESULT` consumes a result already produced by normal SimCore behavior.
- `EXISTING_REGISTRATION_RESULT` covers normal lifecycle hook/UI registration attempts.
- `EXISTING_RUNTIME_TELEMETRY` covers already-owned bounded transport observations such as v0.64.7 sessionStorage continuity transport.
- `NOT_OBSERVED` supports `NOT_EXERCISED`/`UNKNOWN`; it is never evidence of absence.

Do not invent provider/backend source classes.

---

## 7. Frozen v1 capability IDs

S-07 v1 uses exactly these bounded capability IDs.

### Host API family

```text
HOST_CURRENT_INDICES_READ
HOST_CHAT_READ
HOST_CHARACTER_READ
HOST_CHAT_WRITE
HOST_PLUGIN_STORAGE_READ
HOST_PLUGIN_STORAGE_WRITE
HOST_BEFORE_REQUEST_HOOK
HOST_OUTPUT_HOOK
HOST_UNLOAD_HOOK
HOST_UI_REGISTRATION
HOST_UI_CONTAINER
```

### Browser/local-runtime family

```text
BROWSER_SESSION_STORAGE
BROWSER_CLIPBOARD_PRIMARY
BROWSER_CLIPBOARD_FALLBACK
```

No provider/network/cache capability IDs exist in S-07 v1.

New IDs require a later explicit design revision rather than ad-hoc formatter additions.

---

## 8. Capability semantics

### 8.1 HOST_CURRENT_INDICES_READ

Surface:

```text
getCurrentCharacterIndex
+ getCurrentChatIndex
```

`PRESENT` means the required Host callables are exposed.
`SUCCEEDED` means a normal SimCore current-index read succeeded.

Do not infer chat identity correctness merely from this capability.

### 8.2 HOST_CHAT_READ

Surface:

```text
getChatFromIndex
```

This is the Host read surface used for bounded current/Fresh chat observation.

Receipt claims only read-surface presence/use.
It does not claim that a returned chat body is canonical, trusted, or semantically current; those remain Representation/diagnostic-binding concerns.

### 8.3 HOST_CHARACTER_READ

Surface:

```text
getCharacter
```

Presence/use says only that character metadata access was available/exercised.
No character-card semantic correctness claim is implied.

### 8.4 HOST_CHAT_WRITE

Surface:

```text
setChatToIndex
```

S-07 must never invoke this solely as a probe.

A natural existing Mirror/write operation may supply `SUCCEEDED`/`FAILED` evidence when already available.

Capability presence does not authorize a write.

### 8.5 HOST_PLUGIN_STORAGE_READ / WRITE

Read surface conceptually covers existing `getItem` / `keys` access.
Write surface conceptually covers existing `setItem` / `removeItem` access.

Do not create a probe key.
Use only presence checks or results from normal SnapshotStore/storage work.

A storage operation failure does not by itself classify the whole Host as unhealthy.

### 8.6 HOST_BEFORE_REQUEST_HOOK / HOST_OUTPUT_HOOK

These represent the normal Host hook registration/exercise paths currently routed through `runtime-hooks`.

Each row distinguishes:

```text
surface exposed
registration succeeded/failed
hook naturally exercised or not
```

The v1 receipt may encode registration/use details as bounded notes/reason IDs while retaining the single row Use state.

Do not register a second handler for testing.

### 8.7 HOST_UNLOAD_HOOK

Represents the normal unload lifecycle registration used for cleanup/telemetry handoff.

No synthetic unload is triggered.

### 8.8 HOST_UI_REGISTRATION

Represents the existing button/setting registration surface.

A UI registration failure is a UI capability outcome only and must not be promoted into Core/runtime semantic failure.

### 8.9 HOST_UI_CONTAINER

Represents existing diagnostic container show/hide support.

Opening the normal diagnostic panel may naturally exercise this surface.
S-07 does not open a hidden container solely for testing.

### 8.10 BROWSER_SESSION_STORAGE

Represents same-tab browser `sessionStorage` availability used by v0.64.7 telemetry handoff.

S-07 consumes the existing telemetry transport result where available.

Allowed conclusions:

```text
surface PRESENT / ABSENT / UNKNOWN
existing continuity transport use SUCCEEDED / FAILED / NOT_EXERCISED
```

Forbidden conclusion:

```text
browser storage generally persistent
provider cache available
cache hit occurred
```

### 8.11 BROWSER_CLIPBOARD_PRIMARY

Represents `navigator.clipboard.writeText`.

Surface presence and actual copy outcome remain separate.
S-07 never writes a test payload.

Use evidence comes only from an explicit user diagnostic-copy action or another already-authorized copy path.

### 8.12 BROWSER_CLIPBOARD_FALLBACK

Represents the existing bounded browser-local fallback copy path.

Do not run fallback unless the real copy operation naturally routes there.

A fallback `SUCCEEDED` result is evidence only for that actual copy attempt.

---

## 9. Receipt shape

Conceptual v1 receipt:

```text
Host Capability Receipt
Observation: <observationInstance>
Runtime generation: <id>

<capabilityId>
  Surface: PRESENT | ABSENT | UNKNOWN
  Use: SUCCEEDED | FAILED | NOT_EXERCISED | NOT_APPLICABLE | UNKNOWN
  Source: <sourceClass>
  Reason: <bounded reasonId or NONE>
```

The receipt is fixed-order for deterministic inspection.

Recommended order is the capability-ID order frozen in §7.

No aggregate `Host Health`, `Compatibility Score`, or `PASS/FAIL` is allowed.

---

## 10. Observation identity / scope

The receipt must be attached to one coherent diagnostic `observationInstance` under the frozen Identity / Revision / Binding contract.

Canonical rule:

```text
receipt presentation identity
= exact diagnostic observation instance
```

Runtime-lifetime facts such as successful hook registration may be projected into multiple later observations, but the receipt must label them as runtime-scoped facts rather than pretending they were freshly re-tested for every turn.

Presentation-only reformatting does not create a new observation revision.

A runtime generation change invalidates prior-generation current capability receipt claims.

---

## 11. Runtime-scoped vs action-scoped facts

S-07 explicitly separates two fact lifetimes.

### Runtime-scoped

Examples:

```text
hook registration outcome
UI registration outcome
Host callable presence snapshot
sessionStorage surface availability
```

These may be retained in bounded memory for the active runtime generation.

### Action-scoped

Examples:

```text
last actual clipboard primary result
last actual fallback result
last actual chat-write/mirror result
```

Action-scoped facts must retain enough bounded occurrence identity to avoid presenting a stale prior action as if it happened on the current observation.

If occurrence relation cannot be established:

```text
Use = NOT_EXERCISED or UNKNOWN
```

rather than silently carrying the old action outcome forward.

---

## 12. Currentness / stale discipline

Capability presence may be runtime-scoped, but action outcomes are not automatically current forever.

Forbidden:

```text
clipboard succeeded 20 turns ago
→ every later receipt says clipboard Use SUCCEEDED as a current-action fact
```

Allowed:

```text
Surface PRESENT
Use NOT_EXERCISED
```

until a qualifying action attached to the current receipt scope occurs.

Historical runtime-scoped facts may still be shown as such while the runtime generation remains the same.

---

## 13. Failure and weak-state behavior

S-07 fails diagnostically, not semantically.

If one capability cannot be observed:

```text
Surface UNKNOWN
Use UNKNOWN or NOT_EXERCISED
```

If the receipt builder itself fails:

```text
omit/degrade Host Capability Receipt
existing diagnostic panel/report continues
Core/output processing unchanged
```

Receipt failures must not:

```text
append ordinary Core warnings
block output commit
retry Host calls
retry generation
write storage/chat
open UI automatically
```

---

## 14. Provider / cache boundary

S-07 must not claim anything about provider internals.

Forbidden receipt claims include:

```text
provider cache HIT/MISS
server prompt cache available
gateway retained prefix
PocketRisu backend latency cause
network transport healthy
model provider identity inferred from behavior
```

`BROWSER_SESSION_STORAGE PRESENT` means only the browser-local surface was observed.

`HOST_BEFORE_REQUEST_HOOK SUCCEEDED` means only the Host hook path was observed.

Provider Cache Receipt Integration remains separate `M-09` and requires trustworthy external evidence.

---

## 15. Relationship to diagnostic surfaces

Frozen v1 presentation targets:

```text
existing detailed diagnostic panel
FULL_CURRENT diagnostic report
```

These surfaces must represent the same receipt semantics when they represent the same exact observation instance.

S-07 does not automatically expand the frozen S-03 compact-profile field budget.

Therefore:

```text
COMPACT_CURRENT / COMPACT_PAIR
→ may omit the Host Capability Receipt in S-03 v1
```

Omission is capability-limited presentation, not semantic disagreement.

A future explicit S-03 revision may add a bounded Host line if real operator use justifies it.

---

## 16. Relationship to S-04 Live Evidence Packet

S-07 does not become an evidence packet.

S-04 may later include a few S-07 facts only when materially relevant and already present in the same coherent observation.

S-04 still owns evidence qualifiers and classification handoff.
S-07 never emits WATCH / DEFER / FIX / BLOCKER / PASS.

---

## 17. State / persistence / Host permission table

```text
Core semantic state write       FORBIDDEN
Session semantic write          FORBIDDEN
SnapshotStore semantic write    FORBIDDEN
new pluginStorage key           FORBIDDEN
Host chat write for probing     FORBIDDEN
clipboard write for probing     FORBIDDEN
sessionStorage write for probing FORBIDDEN
new hook registration for probing FORBIDDEN
network                         FORBIDDEN
polling / interval              FORBIDDEN
raw body retention              FORBIDDEN
provider metadata inference     FORBIDDEN
```

Allowed future implementation memory:

```text
bounded runtime-generation capability presence/result facts
bounded registration outcomes
bounded last qualifying operation metadata already produced by normal behavior
```

No persistent capability history is authorized.

---

## 18. Resource / performance contract

S-07 is diagnostic-only and bounded.

Preferred implementation:

```text
normal runtime setup/actions
→ record tiny bounded outcomes where those actions already occur

explicit diagnostic capture/render
→ optional constant-size surface-presence snapshot
→ build receipt once
```

Forbidden:

```text
per-turn capability enumeration solely for S-07
repeated Host probing
background watchdog
history scan
network detection
provider fingerprinting
```

The capability list is fixed-size v1, so receipt construction must remain O(1) with respect to chat length.

---

## 19. Future implementation placement

S-07 should reuse existing runtime boundaries.

Preferred ownership:

```text
runtime-host / runtime-hooks / existing runtime telemetry
→ produce bounded operation/presence facts

diagnostic presentation helper
→ assemble receipt
```

Do not create a new semantic `HostManager` or generic capability service.

If a tiny shared pure receipt formatter is useful, it may exist as diagnostic/runtime presentation glue only.

No module may gain authority to invoke arbitrary Host operations through S-07.

---

## 20. Permanent/static verification plan

When implementation is later selected, minimum coverage must prove:

```text
1. callable Host read surface present
   → Surface PRESENT
   → no invocation solely from the presence check

2. callable absent
   → Surface ABSENT
   → Use not upgraded to FAILED unless a real attempt occurred

3. normal current-index read succeeds
   → corresponding Use SUCCEEDED

4. normal operation fails with callable still present
   → Surface PRESENT + Use FAILED

5. chat-write surface present but never naturally used in receipt scope
   → PRESENT + NOT_EXERCISED
   → no synthetic write

6. pluginStorage read/write presence
   → no probe key created

7. beforeRequest registration success
   → bounded registration/use fact
   → no duplicate handler

8. output hook registration success
   → bounded registration/use fact
   → no duplicate handler

9. unload hook registration
   → no synthetic unload

10. UI registration failure
    → bounded UI capability failure only
    → runtime semantics unaffected

11. sessionStorage unavailable
    → ABSENT / appropriate use state
    → no provider/cache inference

12. sessionStorage existing telemetry transport succeeds
    → capability receipt projects the owner-produced outcome
    → no extra sessionStorage transaction

13. Clipboard primary surface present + actual copy succeeds
    → PRESENT + SUCCEEDED

14. Clipboard primary present + actual copy fails + fallback succeeds
    → primary PRESENT + FAILED
    → fallback observed SUCCEEDED

15. no copy action occurred
    → clipboard use NOT_EXERCISED
    → no test payload written

16. old action outcome cannot masquerade as current observation outcome

17. runtime generation changes
    → old current receipt retired

18. panel and FULL_CURRENT for EXACT_INSTANCE
    → semantic conformance

19. compact S-03 profile omission
    → not a conformance failure

20. missing receipt source
    → UNKNOWN, never guessed

21. no aggregate Host health score

22. no Core warnings from receipt-builder failure

23. no new persistent schema/key

24. no polling/network/history scan

25. no raw user/assistant/Fresh body retention

26. no provider cache HIT/MISS claim

27. latest.js == install.js for eventual runtime release
```

Reuse the existing SimCore permanent harness; do not create a second testing system.

---

## 21. Future live-validation obligation

S-07 is runtime diagnostic behavior, so eventual implementation follows the normal SimCore release/live workflow.

Minimum natural live proof:

```text
open diagnostic in a normal healthy runtime
→ receipt renders once
→ naturally exercised Host read/hook surfaces show defensible states
→ unexercised mutation/clipboard branches do not claim success

perform an ordinary diagnostic copy when naturally useful
→ clipboard receipt agrees with actual copy outcome

reload/update naturally
→ new runtime generation does not present prior generation as current
```

Do not deliberately corrupt chat/storage or trigger dangerous writes solely for validation.

Branches not naturally exercised may remain `NOT_EXERCISED` when static/permanent fixtures cover them.

---

## 22. Anti-scope / forbidden expansion

Do not expand S-07 into:

```text
generic Host compatibility scanner
feature auto-polyfill layer
permission escalator
browser fingerprint collector
provider detector
network monitor
cache hit/miss guesser
Host performance benchmark
persistent capability history
support matrix downloaded from the internet
second runtime-host abstraction
```

Each would be a separate idea requiring its own evidence and authority boundary.

---

## 23. Doc Apply verdict

Freeze-time classification:

```text
DOC_NOT_REQUIRED
```

Reason:
- this frozen design already provides the capability IDs, state vocabulary, source classes, privacy boundaries, verification rules, and Host/provider anti-overclaim contract;
- a separate pre-runtime Host capability dictionary/checklist would duplicate the same durable-memory contract;
- recording a current Host capability baseline before runtime implementation would risk manufacturing current-runtime facts that have not been captured by the receipt.

Therefore no additional R_PREP document is queued for S-07.

---

## 24. Implementation sequencing

Current phase:

```text
DESIGN FROZEN
→ DOC_NOT_REQUIRED
→ RUNTIME IMPLEMENTATION PARKED FOR STABILIZATION
→ STOP
```

Later, when runtime implementation is explicitly selected:

```text
main frozen design/evidence
→ dedicated work branch
→ bounded runtime diagnostic implementation
→ permanent/static CI
→ release-simcore deployment
→ real long-chat validation
→ main evidence / durable-memory synchronization
```

Do not combine S-07 runtime implementation with M2-3, release-system restructuring, provider-cache integration, or broad Host abstraction work.

---

## 25. Final frozen verdict

```text
S-07 HOST CAPABILITY RECEIPT
= RUNTIME DIAGNOSTIC OBSERVATION

SURFACE
= PRESENT / ABSENT / UNKNOWN

USE
= SUCCEEDED / FAILED / NOT_EXERCISED / NOT_APPLICABLE / UNKNOWN

SYNTHETIC SIDE-EFFECT PROBES
= FORBIDDEN

PROVIDER INTERNAL CLAIMS
= FORBIDDEN

PERSISTENCE
= NONE

DOC APPLY CLASS
= DOC_NOT_REQUIRED

OPEN DESIGN QUESTIONS
= 0

RUNTIME IMPLEMENTATION
= PARKED FOR STABILIZATION
```
