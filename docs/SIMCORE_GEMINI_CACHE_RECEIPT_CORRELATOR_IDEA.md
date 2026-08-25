# SimCore Gemini Cache Receipt Correlator — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · REQUEST/RECEIPT CORRELATION · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OPPORTUNITY_ANALYZER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Correlate one SimCore-observed main-model request with the authoritative Gemini/provider cache receipt that belongs to the same request.

The Correlator answers:

```text
Which provider/cache receipt belongs to this SimCore request?
How strong is the match?
Which fields are authoritative provider evidence?
Which fields are only local SimCore observations?
Is the match exact, heuristic, ambiguous, or unavailable?
```

The Correlator is not a cache controller and does not optimize prompts.

Its first duty is to avoid false attribution.

## 2. Constitutional boundary

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Correlator may join bounded telemetry from two evidence planes. It must never:

```text
rewrite model prose
rewrite user or assistant history
change prompt order automatically
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
pin or change provider routes
```

Cache correlation must remain observational.

## 3. Evidence planes remain independent

Do not collapse SimCore evidence and provider/cache evidence into one authority.

### Plane A — SimCore request observation

Potential bounded fields:

```text
local request sequence
request family / mode
request prepared timestamp
request dispatched/seen timestamp when available
assistant output completion timestamp
runtime generation/reload continuity
model family only if authoritatively observable
prompt/input token count only if authoritatively observable
Prefix Map identity / first-break result
Prompt Stability Manifest ABI identity
```

### Plane B — Usage Dashboard / approved cache receipt source

Potential bounded fields:

```text
requestId / request_id / id when present
createdAt / created_at / timestamp
model / route family when authoritative
input/prompt tokens
cached read tokens
cache write tokens
cache write 5m / 1h tokens
cached total when semantics are known
metric source
```

The Correlator joins these planes. It does not let either plane invent facts that belong to the other.

## 4. Reuse Usage Dashboard cache-fidelity semantics

Current Usage Dashboard evidence already uses conservative cache-receipt fidelity rules.

In particular, LLMGateway `cachedTokens` is promoted to explicit provider cache Read only when the object clearly looks like an LLMGateway log row:

```text
request identity
+
request timestamp
+
LLMGateway cache field
```

The recognized source marker is:

```text
llmgateway-log-cache-v1
```

The existing semantics also keep:

```text
gateway request HIT/replay
!=
provider prompt-cache token Read
```

and may treat cached total as `Read + Write` only when both meanings are known.

The Correlator must preserve this distinction. It must not weaken Usage Dashboard evidence fidelity merely to make matching easier.

## 5. Primary design rule — false match is worse than no match

Required posture:

```text
uncertain
→ UNVERIFIED / AMBIGUOUS
```

not:

```text
uncertain
→ pick the closest row and call it VERIFIED
```

A wrong request-to-receipt join would poison:

```text
Baseline Profile
Regression Sentinel
Regime Ledger
Opportunity Analyzer
```

Therefore the Correlator should optimize for precision before recall.

## 6. Correlation classes

Initial vocabulary:

```text
EXACT_ID
STRONG_BOUNDED_MATCH
HEURISTIC_MATCH
AMBIGUOUS
UNMATCHED
PENDING
EXPIRED_UNVERIFIED
```

### EXACT_ID

Use only when the same authoritative gateway/provider request identity is visible on both sides or when both sides can derive the same exact identity without mutating the request.

```text
SimCore request identity == receipt request identity
→ EXACT_ID
```

This is the preferred authority level.

### STRONG_BOUNDED_MATCH

Use only when there is no shared request ID but a narrow set of authoritative/bounded signals leaves exactly one plausible receipt.

Example conceptual evidence:

```text
exactly one Gemini receipt in the request's bounded time interval
same authoritative model family
compatible authoritative input-token count
no competing model request in the window
```

This is still not identical to `EXACT_ID`.

### HEURISTIC_MATCH

Multiple weaker signals suggest a likely match, but exact identity is unavailable.

This may support research diagnostics but must not be presented as provider-verified request identity.

### AMBIGUOUS

Two or more plausible receipts remain.

Do not choose one.

### UNMATCHED

No compatible receipt exists.

### PENDING

Request finished locally but the receipt source may not have surfaced the log row yet.

### EXPIRED_UNVERIFIED

A bounded correlation horizon elapsed without a defensible match.

## 7. Avoid opaque confidence scores

Do not begin with a black-box score such as:

```text
confidence = 0.87
```

Prefer explainable evidence flags:

```text
requestId exact: NO
time window unique: YES
model family exact: YES
input tokens compatible: YES
competing candidates: 0

class: STRONG_BOUNDED_MATCH
```

If a future numeric score is ever introduced, the discrete evidence class must remain primary and auditable.

## 8. Matching ladder

Recommended fail-closed order:

```text
1. exact shared request identity
   → EXACT_ID

2. no exact identity:
   filter to compatible provider/model family if authoritative

3. filter to bounded request time interval

4. use authoritative token counts / route evidence when available

5. require uniqueness

6. one strong unique candidate
   → STRONG_BOUNDED_MATCH

7. one weak likely candidate
   → HEURISTIC_MATCH

8. multiple candidates
   → AMBIGUOUS

9. none
   → PENDING or UNMATCHED
```

Do not use raw prompt text matching.

## 9. Time-window design

Timing is useful but not sufficient by itself.

Potential SimCore interval:

```text
request hook / prepared
→ assistant output committed
```

Potential receipt timestamp:

```text
LLMGateway log createdAt/timestamp
```

The exact tolerance must be derived from real gateway/log timing evidence rather than frozen at idea stage.

Do not assume receipt timestamps represent request start, response completion, or log insertion unless verified from the actual gateway schema.

Rule:

```text
time-only match
→ never EXACT_ID
```

## 10. Concurrency and competing requests

A long-chat environment may contain other model/gateway activity.

Therefore the Correlator must not assume:

```text
next gateway row
=
next SimCore main-model request
```

Potential competing sources may include:

```text
other plugins
background provider calls
tools or auxiliary model requests
retries
parallel tabs/chats
```

If multiple compatible receipts fall into the bounded window and no exact identity separates them:

```text
AMBIGUOUS
```

Do not force ordering-based selection.

## 11. Request identity handling and privacy

Request IDs are metadata, but they can create cross-system linkability.

Preferred privacy posture:

```text
raw requestId
→ use only ephemerally when required

longer-lived correlation state
→ retain normalized digest / bounded derived key when practical
```

Conceptual:

```text
correlationKey = HASH(normalized authoritative requestId)
```

only if both evidence planes can derive the same value without changing the provider request.

Do not inject a new correlation token into the model prompt merely to obtain a match.

Do not persist:

```text
raw prompt bodies
raw chat history
raw user/assistant text
full gateway log rows
```

## 12. Do not mutate requests for correlation by default

Forbidden default approach:

```text
add hidden text marker to prompt
add synthetic instruction containing correlation ID
rewrite current user text
```

That would alter prompt bytes and could itself damage Gemini implicit-cache behavior.

A future host-supported metadata field could be researched only if it is semantically/request-byte neutral and officially supported. That would be a separate host-integration design item.

## 13. No duplicated LLMGateway observer in SimCore by default

Usage Dashboard already owns an independent sanitized LLMGateway `/logs` observer and provider cache parsing.

Default architecture should not be:

```text
SimCore duplicates auth
+ SimCore polls /logs
+ SimCore copies provider parsers
```

That would duplicate:

```text
auth ownership
network traffic
parser maintenance
privacy surface
failure modes
```

Preferred first phase:

```text
manual / diagnostic correlation feasibility
```

Possible later supported integration:

```text
optional bounded read-only receipt surface
```

only as its own plugin-system / Usage Dashboard integration work item.

Usage Dashboard absence must leave SimCore at:

```text
CACHE_RECEIPT = UNVERIFIED
```

not degrade core runtime behavior.

## 14. Optional bounded receipt interface candidate

If a supported read-only bridge is later justified, the payload should be intentionally small.

Conceptual candidate:

```text
requestIdentityDigest
capturedAt
modelFamily
inputTokens
cachedReadTokens
cacheWriteTokens
cacheWrite5mTokens
cacheWrite1hTokens
metricSource
receiptSchemaVersion
```

No raw prompt/body/log payload.

Exact fields depend on verified gateway schema and should not be frozen from this idea document.

## 15. Correlation result shape

Conceptual sidecar result:

```text
correlationClass: EXACT_ID
requestIdentityDigest: ...
receiptSource: llmgateway-log-cache-v1
capturedAt: ...
inputTokens: 510000
cachedReadTokens: 441000
cacheWriteTokens: 0
modelFamily: gemini-...
```

Heuristic example:

```text
correlationClass: HEURISTIC_MATCH
signals:
- unique within bounded window
- same model family
- compatible token scale
request identity: UNVERIFIED
```

Ambiguous example:

```text
correlationClass: AMBIGUOUS
candidateCount: 2
provider cache evidence for this SimCore request: UNVERIFIED
```

## 16. State machine

Possible bounded lifecycle:

```text
LOCAL_REQUEST_SEEN
→ PENDING_RECEIPT
→ EXACT_ID
   or STRONG_BOUNDED_MATCH
   or HEURISTIC_MATCH
   or AMBIGUOUS
   or EXPIRED_UNVERIFIED
```

Correlation telemetry is operational metadata, not semantic Core state.

Do not add expensive SnapshotStore writes solely for receipt matching if a lighter telemetry owner is available.

## 17. Reload continuity

Cross-reload observer continuity may preserve a small pending correlation capsule only if:

```text
same chat/location
compatible schema
bounded TTL
no raw bodies
```

A reload must not convert a heuristic match into an exact one.

Runtime generation changes are local observer evidence only and do not prove provider cache reset or receipt identity change.

## 18. Prefix Map integration

After a receipt is correlated:

```text
Receipt Correlator
→ attaches authoritative Gemini cache result to request X

Prefix Map
→ explains request X's local first-break structure
```

Example:

```text
correlation: EXACT_ID
Gemini cached ratio: 86%
Prefix Map first break: PRE_SIMCORE · CHAT_HISTORY
SimCore stable: CACHE_SHADOW
```

The Prefix Map must not infer cache tokens; the Correlator must not infer first-break ownership.

## 19. Baseline Profile integration

Baseline Profile should admit cache samples only when correlation quality meets its admission policy.

Likely initial posture:

```text
EXACT_ID
→ trusted candidate sample

STRONG_BOUNDED_MATCH
→ research/possibly trusted after live validation

HEURISTIC_MATCH
→ diagnostic-only by default

AMBIGUOUS / UNMATCHED
→ do not learn provider cache baseline
```

Do not allow a heuristic mismatch to poison the learned normal baseline.

## 20. Sentinel integration

The Cache Regression Sentinel should require both:

```text
provider cache receipt
+
defensible request correlation
```

before making strong request-specific provider-cache claims.

Examples:

```text
receipt exists
but correlation AMBIGUOUS
→ SENTINEL: UNVERIFIED_FOR_THIS_REQUEST
```

```text
EXACT_ID
+ established baseline collapse
+ Prefix Map first break SIMCORE stable
→ strong CACHE_ABI_REGRESSION_CANDIDATE evidence chain
```

## 21. Regime Ledger integration

A CACHE_REGIME boundary should not be confirmed from loosely matched receipt data.

Preferred evidence:

```text
repeated exact/strong correlated receipts
+
Baseline Profile establishes new stable level
+
transition attribution evidence
```

One heuristic correlation cannot create a regime boundary.

## 22. Opportunity Analyzer integration

The Analyzer should include correlation quality in its confidence axis.

Example:

```text
large apparent cache loss
+ SIMCORE-owned first break
+ receipt correlation HEURISTIC only
→ opportunity remains evidence-limited
```

Exact provider matching raises confidence but still does not override correctness/safety/risk boundaries.

## 23. Diagnostics

Compact healthy example:

```text
Gemini receipt: EXACT_ID · Read 441k / Input 510k · source llmgateway-log-cache-v1
```

Pending:

```text
Gemini receipt: PENDING · provider evidence not correlated yet
```

Ambiguous:

```text
Gemini receipt: AMBIGUOUS · 2 candidate gateway rows · cache result UNVERIFIED for this request
```

No receipt source:

```text
Gemini receipt: UNVERIFIED · no approved receipt source
```

Do not surface noisy per-turn warnings merely because correlation is unavailable.

## 24. Required future fixtures

A future implementation/prototype should prove at least:

```text
1. same exact requestId on both planes
   → EXACT_ID

2. unique receipt in bounded time/model/token context
   → STRONG_BOUNDED_MATCH, not EXACT_ID

3. weak unique candidate
   → HEURISTIC_MATCH

4. two plausible receipts
   → AMBIGUOUS, no forced choice

5. no receipt yet
   → PENDING

6. horizon elapsed
   → EXPIRED_UNVERIFIED

7. gateway request HIT present but provider cached Read absent
   → semantics remain distinct

8. generic object with cachedTokens but no log-row identity/timestamp shape
   → do not promote to authoritative LLMGateway cache Read

9. Usage Dashboard absent
   → SimCore core behavior unchanged, receipt UNVERIFIED

10. no raw prompt/body retention

11. no prompt correlation marker injected

12. reload preserves only bounded compatible pending metadata

13. heuristic match never upgrades itself merely because cache ratio looks plausible

14. Baseline Profile rejects ambiguous provider samples

15. Sentinel refuses strong provider claim when correlation is ambiguous

16. Renderer boundary unchanged
```

## 25. Non-goals

```text
duplicating Usage Dashboard's full gateway observer
provider cache management
explicit Gemini cache resources
prompt rewriting
history rewriting
synthetic cache warming
provider routing changes
forcing every request to have a receipt
opaque ML matching model
```

## 26. Recommended research order

```text
v0.64.7 real-long-chat close
→ capture several paired SimCore diagnostics + Usage Dashboard receipts manually
→ verify whether the same gateway requestId is observable on both planes
→ if yes: design exact requestIdentityDigest path
→ if no: characterize timing/model/token uniqueness and ambiguity rate
→ prototype correlation offline / diagnostic-only
→ decide whether optional bounded read-only receipt bridge is justified
→ only then connect Baseline/Sentinel live paths
```

Do not build plugin IPC before proving that the correlation problem actually requires it.

## 27. Current classification

```text
GEMINI_CACHE_RECEIPT_CORRELATOR
= HIGH VALUE
= LOW SEMANTIC RISK IF OBSERVATION-ONLY
= REQUEST/RECEIPT EVIDENCE JOIN
= PRECISION-FIRST / FAIL-CLOSED
= IDEA / DESIGN CANDIDATE

runtime mutation:
NONE today

prompt byte mutation:
NONE

renderer responsibility change:
NONE

provider authority:
ONLY THROUGH APPROVED RECEIPT EVIDENCE
```
