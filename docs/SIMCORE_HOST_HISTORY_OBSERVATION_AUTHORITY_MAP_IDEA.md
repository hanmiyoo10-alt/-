# SimCore Host / History Observation Authority Map — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · HOST/HISTORY CLAIM-SCOPED OBSERVATION AUTHORITY · OBSERVE-ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_NEXT_FOCUS_AFTER_DIAGNOSTIC_UX_CLOSE_2026-08-25.md`
- `docs/SIMCORE_HOST_HISTORY_WATCH_06402.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define a claim-scoped observation-authority map for SimCore host/history resilience research.

The current WATCH evidence includes two different families:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
PRE_SIMCORE_HOST_HISTORY_FRONTIER
```

Both involve information crossing a host/request boundary, but neither currently proves a narrow runtime defect owned by SimCore.

The first research task is therefore not to repair history or handshake behavior. It is to answer:

```text
What does SimCore know directly?
What does SimCore only observe through a host-facing surface?
What can SimCore derive mechanically from those observations?
What remains external / unverified?
Which claims are forbidden because the evidence cannot support them?
```

This map is epistemic/architectural research only.

It does not authorize:

```text
history rewriting
request normalization to force stability
handshake fallback from prior-turn state
new semantic state
new SnapshotStore schema
new network calls
new polling/timers
provider-cache claims
host blame
runtime implementation
release-simcore deployment
```

## 2. Constitutional and architecture boundary

Existing Contracts v2 / machine-readable architecture already freeze:

```text
runtime may observe host state
core must not call host directly

history stabilization = OBSERVE_ONLY
TAIL_AFTER_CURRENT_USER = frozen
provider cache = UNVERIFIED
```

Current runtime ownership includes:

```text
runtime-host
= host API adapter

runtime-topology
= request topology signatures + host-prefix sketches

runtime-cache
= runtime prompt-cache observation / identity
= no request mutation

runtime-cache-candidates
= bounded cache-trajectory observation
= no request mutation

runtime-mirror
= Fresh host observation + strict identity/location/staleness gates

runtime-probe
= diagnostic rendering / summarization
```

Therefore host/history resilience research must remain on the runtime/observability side of the architecture boundary.

It must not migrate external uncertainty into Core semantic authority.

## 3. Core rule — authority is claim-scoped

Canonical invariant:

```text
ONE OBSERVATION
DOES NOT HAVE ONE UNIVERSAL AUTHORITY LEVEL

AUTHORITY
= observation source
+ exact claim being made
+ bounded derivation path
```

Example:

```text
request hook payload does not contain the Core handshake
```

may be strong evidence for:

```text
"SimCore's received scan surface did not expose the handshake"
```

but weak/insufficient evidence for:

```text
"the host never inserted the handshake anywhere"
"the prompt preset was broken"
"PocketRisu/RisuAI dropped the handshake"
```

Likewise:

```text
first changed request slot occurs before SIMCORE_RUNTIME
```

may strongly support:

```text
"SimCore was not the first observed prefix break"
```

but does not prove:

```text
"the host intentionally mutated history"
"the provider cache missed"
"the changed compact assistant slot came from one specific host subsystem"
```

## 4. Observation authority classes

Use a small conceptual vocabulary.

```text
LOCAL_OWNED
HOST_OBSERVED
LOCAL_DERIVED
EXTERNAL_UNVERIFIED
UNAVAILABLE
```

### `LOCAL_OWNED`

A fact is generated/owned inside SimCore and can be stated directly within that scope.

Examples:

```text
runtime generation
hook registered / hook callback observed
SimCore compiled runtime-prompt identity
SimCore runtime placement contract
local request/output probe identity
whether SimCore itself mutated a request/history surface
```

`LOCAL_OWNED` does not grant authority over external host internals.

### `HOST_OBSERVED`

The fact is the value returned/delivered by a supported host-facing surface at one observation moment.

Examples:

```text
host current indices returned to runtime-host
host getChat snapshot returned to SimCore
request messages delivered to a SimCore hook
Fresh chat observation returned through runtime-mirror
```

Canonical wording:

```text
"the host-facing API/hook exposed X at this observation moment"
```

Not:

```text
"X is the host's complete durable internal truth"
```

### `LOCAL_DERIVED`

A deterministic bounded conclusion produced from owned/observed facts.

Examples:

```text
handshake FOUND / NOT FOUND on the received scan surface
common-prefix length
first changed request slot
break zone CHAT_HISTORY / CURRENT_USER / SIMCORE_RUNTIME
host-prefix sketch SAME_FAMILY
SimCore contribution NOT_FIRST_BREAK
probe/visible index relation
```

Derived authority cannot exceed its inputs.

### `EXTERNAL_UNVERIFIED`

A claim concerns an external internal cause or authority not exposed by current evidence.

Examples:

```text
why the host assembled one history slot differently
which host subsystem compacted/replaced a message
provider cache hit/miss
whether an unseen host prompt layer contained a marker
exact browser/UI durability state beyond the API snapshot
```

Default action:

```text
preserve as UNKNOWN / UNVERIFIED
```

### `UNAVAILABLE`

The required observation source did not produce usable evidence.

Do not reinterpret absence of evidence as negative external evidence.

## 5. Host/request observation planes

Keep these planes distinct.

```text
HOST INTERNAL COMPOSITION
        ↓ unseen unless exposed
HOST API / REQUEST-HOOK SURFACE
        ↓
runtime-host / runtime-hooks
        ↓
LOCAL OBSERVERS
runtime-topology / runtime-cache / runtime-probe
        ↓
BOUNDED DERIVED CLAIMS
        ↓
diagnostics / repo evidence
```

The boundary between:

```text
HOST INTERNAL COMPOSITION
and
HOST API / REQUEST-HOOK SURFACE
```

is especially important.

SimCore may observe the latter without proving the former.

## 6. Request-hook authority

A request hook callback establishes directly:

```text
the hook executed
+ this is the request representation delivered to that hook
```

Within that delivered representation SimCore may deterministically scan for:

```text
Core handshake markers
runtime prompt placement / identity
message roles/kinds
bounded topology signatures
```

But request-hook evidence alone does not prove:

```text
which host stage created each message
whether an earlier hidden layer contained different content
why a message was omitted/replaced
what the provider ultimately cached internally
```

This distinction is the basis for handshake attribution.

## 7. Handshake authority map

Natural v0.64.2 evidence:

```text
Request hook: SEEN
Core handshake: NOT FOUND
Runtime status: INACTIVE · output BYPASSED
```

followed by same-runtime recovery:

```text
Request hook: SEEN
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
```

The direct/derived claims supported are:

```text
LOCAL_OWNED
→ runtime/hooks remained alive

HOST_OBSERVED
→ one affected request representation was delivered to the hook

LOCAL_DERIVED
→ the scanner did not find a valid Core handshake in that received scan surface
→ fail-closed inactive behavior occurred

LOCAL_OWNED / HOST_OBSERVED
→ a later same-runtime request again exposed a valid handshake
```

Not established:

```text
EXTERNAL_UNVERIFIED
→ whether the host omitted the handshake before hook delivery
→ whether another host composition boundary changed the scan surface
→ whether preset/toggle state briefly changed externally
→ whether the SimCore scanner itself has a recurrent defect
```

Therefore canonical interpretation remains:

```text
TRANSIENT OBSERVED HANDSHAKE MISS
CAUSE UNESTABLISHED
FAIL-CLOSED BEHAVIOR CORRECT
```

## 8. History-frontier authority map

Natural v0.64.2 recurrence established:

```text
break owner: PRE_SIMCORE
break zone: CHAT_HISTORY
shape: SAME_SLOT_CHANGED
host prefix: STABLE / SAME_FAMILY
history alignment: OBSERVE_ONLY
history stabilization: OBSERVE_ONLY
request mutation: NONE
Representation correlation: NO_MATCH
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

and the first-change frontier moved forward across natural requests while the reusable prefix window grew.

Supported claims:

```text
HOST_OBSERVED
→ compared request representations differed in a history slot

LOCAL_DERIVED
→ earliest observed difference was before the SimCore runtime block
→ host system-prefix sketch remained stable in the compared family
→ observed break frontier moved forward with conversation growth
→ SimCore's observer performed no request/history mutation
→ SimCore was not the first observed break
```

Not established:

```text
EXTERNAL_UNVERIFIED
→ exact host subsystem responsible for the changed compact slot
→ intent/reason for the change
→ provider cached-token outcome
→ user-visible correctness failure
```

This preserves the existing classification:

```text
HOST_HISTORY_PREFIX_BREAK / COMPACT_ASSISTANT_SIGNATURE
= RECURRENT OBSERVATION
= EXTERNAL OWNER UNESTABLISHED
= OBSERVE_ONLY
```

## 9. `first break` is not `root cause`

Freeze this distinction.

```text
FIRST_BREAK
= earliest difference visible in the compared request representations

ROOT_CAUSE
= mechanism that caused that difference to exist
```

SimCore may own the first-break calculation without owning the root cause.

Therefore:

```text
PRE_SIMCORE first break
!= host defect proven

SIMCORE_RUNTIME first break
!= SimCore defect automatically proven
```

A SimCore-runtime first break may be expected volatile behavior, declared prompt change, or defect depending on separate evidence.

## 10. `host` is not one authority

Avoid using `host` as a single black-box actor.

Conceptually distinguish:

```text
HOST_REQUEST_COMPOSITION
HOST_CHAT_SNAPSHOT_API
HOST_CURRENT_INDICES_API
HOST_OUTPUT_CALLBACK
HOST_FRESH_CHAT_SURFACE
HOST_UI_VISIBLE_STATE
```

Current APIs may expose some of these surfaces but not their internal production mechanisms.

Therefore a future finding should name the narrowest observed surface available.

Preferred:

```text
HOST_CHAT_SNAPSHOT_BOUNDARY_CANDIDATE
HOST_REQUEST_COMPOSITION_BOUNDARY_CANDIDATE
```

Avoid:

```text
HOST_BROKEN
RISU_HISTORY_BUG
```

without direct external evidence.

## 11. Host snapshot freshness boundary

Diagnostic UX research already established a related principle:

```text
fresh host getChat call
!= proof that the host itself returned the newest durable UI truth
```

This Host/History map adopts the same epistemic rule without reopening Diagnostic UX research.

A host API return is authoritative for:

```text
what that API returned at that observation moment
```

not automatically for:

```text
all unseen host state
all UI branches
all durable history state
```

## 12. SimCore-owned negative evidence

Negative evidence is valuable when it rules out SimCore-owned mechanisms.

Examples:

```text
request mutation = NONE
history stabilization = OBSERVE_ONLY
SimCore contribution = NOT_FIRST_BREAK
runtime hooks alive
same-runtime recovery without reload
Representation correlation = NO_MATCH
```

These may support narrow conclusions such as:

```text
SIMCORE_REQUEST_MUTATION_NOT_OBSERVED
SIMCORE_NOT_FIRST_BREAK
REPRESENTATION_NOT_CORRELATED
RUNTIME_RELOAD_NOT_REQUIRED_FOR_RECOVERY
```

They must not be upgraded into a complete external root-cause claim.

## 13. Forbidden attribution shortcuts

Reject:

```text
handshake missing
→ host bug

handshake missing once
→ scanner bug

history slot changed
→ host deliberately rewrote history

PRE_SIMCORE break
→ provider cache miss

provider cache read low
→ history-frontier mechanism proven

same-runtime recovery
→ original cause resolved/known

host getChat snapshot differs
→ durable chat rewind proven
```

The correct default when the causal bridge is absent is:

```text
UNKNOWN / EXTERNAL_UNVERIFIED
```

## 14. Evidence ladder for future natural recurrences

For a future handshake/history anomaly, prefer paired local evidence.

```text
A. affected request
B. nearest healthy previous/next request
C. same runtime generation if possible
D. same location/chat scope
E. same preset/toggle when externally known
```

Preserve bounded fields only:

```text
runtime generation
request/output indices
hook seen/not-seen
handshake found/not-found
prompt scan stats
runtime prompt presence/placement identity
request topology summary
first-break zone/slot
host-prefix sketch/delta
history slot fingerprints/lengths
Representation correlation
telemetry continuity
SimCore request mutation flag
```

Do not retain raw full prompts/history solely for this research.

## 15. Observation claim matrix

Conceptual examples:

| Claim | Required authority | Current status |
|---|---|---|
| Hook executed | LOCAL_OWNED | available |
| Handshake present in received scan surface | HOST_OBSERVED + LOCAL_DERIVED | available per request |
| Host never inserted handshake | external internal proof | unavailable |
| First changed request slot | HOST_OBSERVED + LOCAL_DERIVED | available |
| First break precedes SimCore block | LOCAL_DERIVED | available |
| SimCore mutated request history | LOCAL_OWNED mutation path | currently negative evidence: none |
| Exact host component caused history change | external provenance | unavailable |
| Provider cache hit/miss | provider/gateway authoritative receipt | unverified unless separately correlated |
| Host snapshot equals durable visible UI truth | stronger host/UI evidence | not guaranteed |

This table is claim guidance, not a runtime schema.

## 16. Relationship to cache research

Host/history resilience and Gemini cache research overlap in request-prefix evidence but remain different questions.

```text
Host/History Resilience
= what request/history observation changed and what can be attributed safely?

Gemini Cache Research
= what effect did that structure have on actual provider cached-token reuse?
```

A `PRE_SIMCORE` first break is useful input to cache attribution, but it does not itself prove provider cache behavior.

Do not restart broad cache research from this map.

## 17. Relationship to M2

M2-3 remains a separate active ownership workstream.

This research must not change M2-3 behavior or dependency scope.

If future host/history work eventually needs runtime implementation:

```text
host-facing observation remains Runtime-owned
semantic Core modules do not gain host dependencies
Edit Reconcile consumes existing bounded host/representation facts only
```

No host/history feature should be mixed into mechanical M2 ownership extraction.

## 18. Runtime cost boundary

This authority map does not justify additional per-request work.

Default future constraints:

```text
reuse existing hook payload
reuse existing topology fingerprints
reuse existing prompt identity/placement facts
reuse existing current indices / host snapshots already needed
zero new network calls
zero history mutation
zero second full-history scan by default
zero raw-history persistence
```

If a future discriminator requires new work, prove why existing evidence is insufficient first.

## 19. Candidate next research slices

After this authority map, do not immediately create a large Host Resilience framework.

Prefer one narrow follow-up based on strongest existing evidence.

### Candidate A — Handshake Attribution Contract

Define exact paired-request evidence needed to distinguish:

```text
HANDSHAKE_ABSENT_FROM_RECEIVED_SURFACE
SCAN_SURFACE_INCOMPLETE_CANDIDATE
SIMCORE_SCANNER_DEFECT_CANDIDATE
HOST_COMPOSITION_CHANGE_CANDIDATE
UNKNOWN_EXTERNAL
```

without weakening fail-closed semantics.

### Candidate B — Host-History Frontier Claim Contract

Freeze what `PRE_SIMCORE / CHAT_HISTORY / SAME_SLOT_CHANGED` can and cannot mean, plus recurrence/regime rules for the marching frontier.

### Candidate C — Host Observation Recurrence Matrix

Use existing natural samples to determine whether handshake and history-frontier anomalies share any defensible context discriminator.

Do not assume they are one mechanism merely because both cross a host boundary.

## 20. Recommended next slice

Highest-value next slice:

```text
SIMCORE_HOST_HANDSHAKE_ATTRIBUTION_CONTRACT
```

Reason:

```text
handshake miss affected runtime activation for one request
fail-closed behavior was correct
same-runtime recovery is directly proven
cause remains unresolved
paired evidence requirements are already listed in the WATCH ledger
```

This is narrower and more correctness-adjacent than expanding the already-recurrent history-prefix observation.

The Host-History Frontier contract should follow after handshake attribution or when a new natural frontier specimen adds information.

## 21. Promotion rules

This research remains WATCH/design-only until one of these occurs:

```text
recurrent handshake miss with paired request-composition evidence
recurrent host/history behavior with user-visible correctness impact
direct evidence of a SimCore-owned scanner/comparator defect
host API evidence that invalidates a frozen assumption
```

Only then consider a narrow implementation design.

Do not promote merely because external behavior remains unexplained.

## 22. Current classification

```text
SIMCORE_HOST_HISTORY_OBSERVATION_AUTHORITY_MAP
= HIGH VALUE HOST/HISTORY RESEARCH FOUNDATION
= CLAIM-SCOPED AUTHORITY
= LOCAL_OWNED / HOST_OBSERVED / LOCAL_DERIVED / EXTERNAL_UNVERIFIED
= FIRST_BREAK != ROOT_CAUSE
= HOST API RETURN != COMPLETE HOST INTERNAL TRUTH
= NEGATIVE SIMCORE EVIDENCE PRESERVED
= OBSERVE-ONLY
= NO HISTORY MUTATION
= NO HANDSHAKE FALLBACK
= NO PROVIDER CACHE CLAIM

next recommended slice:
SIMCORE_HOST_HANDSHAKE_ATTRIBUTION_CONTRACT

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
