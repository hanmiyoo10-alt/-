# SimCore Host Handshake Attribution Contract — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · CLAIM-SCOPED HANDSHAKE ATTRIBUTION · FAIL-CLOSED PRESERVED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_HOST_HISTORY_OBSERVATION_AUTHORITY_MAP_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Define the exact evidence required before SimCore may attribute a Core handshake miss to one of several candidate boundaries.

Natural evidence already proves one transient production miss:

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

The event matters because handshake absence prevents SimCore activation for that request, but the current evidence does not establish a root cause.

This contract therefore answers:

```text
What does NOT FOUND prove directly?
What evidence is required for a scanner-defect claim?
What evidence is required for a host-composition candidate claim?
When must attribution remain UNKNOWN_EXTERNAL?
What bounded evidence should be captured on a future recurrence?
```

It does not authorize a runtime repair.

## 2. Frozen safety rule

The current fail-closed behavior is correct and remains frozen:

```text
current request handshake NOT FOUND
→ do not inherit prior-turn ACTIVE state
→ SimCore runtime inactive for that request
→ output path bypassed under the existing contract
```

Forbidden:

```text
previous request was ACTIVE
→ assume current request is ACTIVE
```

A transient external/observation anomaly must never cause stale activation authority to carry forward.

## 3. Current production scanner boundary

`release-simcore` v0.64.7 remains runtime authority.

The current scanner uses the exact request `messages` array delivered to the request hook.

Core handshake grammar remains:

```text
<SIMCORE_CORE_SWITCH>1</SIMCORE_CORE_SWITCH>
```

with whitespace tolerance through the existing `HANDSHAKE_RE`.

The scanner:

```text
inspectPromptMessages(messages)
→ scans non-empty delivered message text in order
→ tests each message directly
→ maintains a 512-character previous-tail/current-head bridge
   so a marker split across adjacent host messages can still match
→ after handshake activation, captures bounded config
→ stops once the authoritative </Core_Ruleset> boundary is observed
```

Existing diagnostic probe records at least:

```text
handshake FOUND / NOT FOUND
promptProbeActive
scannedMessages
scannedChars
totalMessages
```

Therefore the scanner result is a deterministic claim over the received scan surface.

It is not a claim about unseen host composition stages.

## 4. Canonical observation terminology

Use the following narrow terms.

```text
SCAN_RESULT_FOUND
SCAN_RESULT_NOT_FOUND
RECEIVED_SURFACE
SOURCE_RULESET
HOST_COMPOSITION_BOUNDARY
SCANNER_IMPLEMENTATION
EXTERNAL_UNKNOWN
```

Do not use generic wording such as `host lost it` or `scanner broke` until evidence reaches the corresponding gate below.

## 5. Canonical attribution classes

A future handshake specimen may be classified only as one of:

```text
HANDSHAKE_FOUND_NORMAL
HANDSHAKE_MISS_UNATTRIBUTED
RECEIVED_SURFACE_ABSENCE_CONFIRMED
HOST_COMPOSITION_CHANGE_CANDIDATE
SOURCE_RULESET_MISSING_CANDIDATE
SIMCORE_SCANNER_DEFECT_CANDIDATE
SIMCORE_SCANNER_DEFECT_CONFIRMED
UNKNOWN_EXTERNAL
```

These are research/diagnostic attribution classes, not runtime mode states and not severity levels.

## 6. `HANDSHAKE_FOUND_NORMAL`

Required evidence:

```text
request hook SEEN
+ inspectPromptMessages active=true
```

Meaning:

```text
valid handshake was found on the received scan surface
```

It does not prove every upstream composition layer was stable.

## 7. `HANDSHAKE_MISS_UNATTRIBUTED`

Required evidence:

```text
request hook SEEN
+ inspectPromptMessages active=false
```

Meaning:

```text
SimCore scanner did not find a valid handshake in the surface it inspected
```

This is the canonical classification for the existing v0.64.2 specimen.

It does NOT establish:

```text
marker definitely absent from every raw host representation
host composition defect
source ruleset defect
scanner defect
preset/toggle defect
provider/cache behavior
```

## 8. `RECEIVED_SURFACE_ABSENCE_CONFIRMED`

This is stronger than ordinary `SCAN_RESULT_NOT_FOUND`.

It requires an independent authoritative view of the SAME received request representation showing that no valid handshake token exists under the accepted grammar.

Acceptable future evidence could be:

```text
a bounded test fixture containing the exact hook-message representation
or
an approved host/request diagnostic surface that exposes the exact same request instance
```

Do not create a second permanent runtime full-message scanner solely to prove this class.

If independent same-request evidence is unavailable:

```text
SCAN_RESULT_NOT_FOUND
→ HANDSHAKE_MISS_UNATTRIBUTED
```

not `RECEIVED_SURFACE_ABSENCE_CONFIRMED`.

## 9. `SIMCORE_SCANNER_DEFECT_CANDIDATE`

A miss alone is insufficient.

Candidate evidence requires:

```text
same exact received message representation
+ accepted valid handshake marker is demonstrably present
+ current production inspectPromptMessages returns active=false
```

The strongest first gate should be a deterministic fixture reproducing the received message shape.

Useful dimensions include:

```text
marker wholly inside one message
marker split across two adjacent messages
whitespace variants accepted by HANDSHAKE_RE
message content accessor shape
empty/non-text rows around marker
Core_Ruleset close placement
```

Do not promote from timing correlation or same-runtime recurrence alone.

## 10. `SIMCORE_SCANNER_DEFECT_CONFIRMED`

Requires deterministic reproduction against production-equivalent scanner behavior.

Canonical proof:

```text
fixture/input contains a valid handshake under the frozen grammar
→ expected active=true
→ current production-equivalent scanner returns active=false
→ defect reproduces deterministically
```

Then:

```text
classification = FIX CANDIDATE / SIMCORE_OWNED
```

A later runtime mini must still follow normal SimCore workflow and must preserve fail-closed behavior for genuinely absent handshakes.

## 11. `HOST_COMPOSITION_CHANGE_CANDIDATE`

This class means a host-facing request representation changed in a way plausibly relevant to handshake availability.

Minimum useful paired evidence:

```text
affected request
+ nearest healthy request(s)
+ same runtime generation if possible
+ same location/chat scope
+ request hook SEEN on both
+ handshake NOT FOUND on affected request
+ handshake FOUND on healthy request
+ bounded request topology / prompt placement differences
```

Stronger evidence:

```text
independent same-request received-surface evidence confirms marker absence
+ source/preset/toggle configuration was externally unchanged
+ SimCore scanner passes equivalent static marker fixtures
```

Even then the word remains:

```text
CANDIDATE
```

unless external host provenance proves the exact composition mechanism.

Do not label PocketRisu/RisuAI defective merely from this classification.

## 12. `SOURCE_RULESET_MISSING_CANDIDATE`

This class is reserved for evidence that the expected source Core Ruleset itself lacked or disabled the canonical handshake before host request composition.

It requires direct evidence from the configured ruleset/source surface.

A request-hook `NOT FOUND` alone cannot establish it.

Possible future discriminator:

```text
same externally verified source/preset snapshot
→ canonical handshake absent/disabled at source
```

If source configuration cannot be observed authoritatively, remain `UNKNOWN_EXTERNAL`.

## 13. `UNKNOWN_EXTERNAL`

Use when observations establish a miss but cannot distinguish:

```text
source ruleset state
host request composition
host message projection
external toggle/preset timing
another unseen boundary
```

`UNKNOWN_EXTERNAL` is a valid precise result.

It is preferable to a false attribution.

## 14. Scanner-negative evidence that matters

The current scanner implementation already narrows several hypotheses.

Because it:

```text
scans delivered messages incrementally
uses the accepted HANDSHAKE_RE
bridges adjacent-message boundaries with 512 characters
```

one simple split-message explanation is already defended against in current production.

However this does not eliminate all scanner hypotheses such as:

```text
unexpected host message content shape
text accessor incompatibility
unmodeled multi-part content representation
future grammar/source change
```

Those require direct reproducible evidence before promotion.

## 15. Paired-request evidence packet

On the next natural recurrence, preserve the affected request and nearest healthy neighbor(s) with bounded fields:

```text
version
runtime generation
location/chat digest
request user index
hook SEEN / unavailable
handshake FOUND / NOT FOUND
prompt scan ms
scannedMessages / totalMessages
scannedChars
runtime prompt placement/identity when available
request topology family
host-prefix sketch/delta
telemetry continuity
current mode result
output BYPASSED / COMMITTED
whether reload occurred between specimens
externally known preset/toggle continuity, if actually known
```

Do not retain raw full prompts/history by default.

## 16. Same-runtime recovery semantics

Existing v0.64.2 evidence proves:

```text
miss
→ later same-runtime recovery
```

This supports:

```text
runtime hooks did not require reload to recover
persistent total runtime failure is unlikely for that session
```

It does NOT support:

```text
scanner innocence proven
host guilt proven
cause automatically resolved
```

The recovered request is a control, not a root-cause witness.

## 17. Recurrence semantics

One repeat of `NOT FOUND` should not automatically create a FIX.

Useful recurrence requires context compatibility.

Prefer comparison under:

```text
same runtime generation
same location/chat
same request family where possible
same externally known preset/toggle state
```

Then classify:

```text
repeated NOT FOUND + no distinguishing evidence
→ WATCH / RECURRENT_UNATTRIBUTED

repeated NOT FOUND + received-surface absence evidence
→ HOST_COMPOSITION/SOURCE candidate depending upstream evidence

marker present + scanner false negative reproducible
→ SIMCORE scanner FIX candidate
```

## 18. Bounded future observability candidate

If natural recurrence proves current diagnostics are insufficient, the lowest-cost candidate is to expose metadata already known during the existing scanner pass rather than adding another scan.

Potential scanner-owned fields:

```text
markerFoundMessageIndex
markerFoundVia = DIRECT | ADJACENT_BOUNDARY | NONE
scanTermination = CORE_RULESET_CLOSE | END_OF_MESSAGES
lastScannedMessageIndex
```

These would be diagnostic metadata only.

They must be produced inside the existing scanner pass.

Forbidden solely for handshake attribution:

```text
second full request scan
raw prompt retention
persistent per-request handshake ledger
network observer
polling
history rewrite
```

No implementation is authorized by this idea document.

## 19. Attribution decision table

| Evidence | Allowed conclusion |
|---|---|
| hook SEEN + scanner FOUND | `HANDSHAKE_FOUND_NORMAL` |
| hook SEEN + scanner NOT FOUND only | `HANDSHAKE_MISS_UNATTRIBUTED` |
| exact same request independently shown marker-absent | `RECEIVED_SURFACE_ABSENCE_CONFIRMED` |
| received surface marker-absent + paired healthy request + composition/topology change | `HOST_COMPOSITION_CHANGE_CANDIDATE` |
| source Ruleset directly shown marker-absent/disabled | `SOURCE_RULESET_MISSING_CANDIDATE` |
| same input marker-present + scanner false negative | `SIMCORE_SCANNER_DEFECT_CANDIDATE` |
| deterministic production-equivalent reproduction | `SIMCORE_SCANNER_DEFECT_CONFIRMED` |
| causal bridge unavailable | `UNKNOWN_EXTERNAL` / unattributed WATCH |

## 20. Promotion gate

Promote to a SimCore runtime FIX only when evidence establishes a SimCore-owned scanner defect or another narrow SimCore-owned boundary.

```text
scanner defect confirmed
→ FIX candidate

host/source candidate only
→ WATCH / external-boundary research

unattributed recurrence
→ WATCH

state corruption/core authority violation
→ BLOCKER according to normal repository rules
```

Do not weaken the handshake requirement as a workaround for uncertainty.

## 21. Relationship to Host / History Authority Map

The parent Authority Map remains the broad epistemic contract.

This document narrows only one claim family:

```text
Core handshake presence / absence / attribution
```

It does not reopen Diagnostic UX or Gemini cache architecture.

## 22. Candidate next slice

After this contract, the next Host / History research slice should normally be:

```text
HOST_HISTORY_FRONTIER_CLAIM_CONTRACT
```

because the PRE_SIMCORE / CHAT_HISTORY marching-frontier family has repeated natural evidence and now needs the same claim-scoped treatment.

Alternative:

```text
if a new natural handshake miss arrives first
→ use this contract immediately
→ preserve paired evidence
→ do not create more broad handshake architecture
```

## 23. Current classification

```text
SIMCORE_HOST_HANDSHAKE_ATTRIBUTION_CONTRACT
= HIGH VALUE
= CORRECTNESS-ADJACENT OBSERVABILITY
= CLAIM-SCOPED
= FAIL-CLOSED PRESERVING
= PAIRED-EVIDENCE FIRST
= NO PRIOR-TURN ACTIVE FALLBACK
= NO SECOND FULL REQUEST SCAN BY DEFAULT
= NO RAW PROMPT RETENTION
= NO HOST BLAME WITHOUT PROVENANCE
= IDEA / RESEARCH ONLY

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
