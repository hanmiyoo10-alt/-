# SimCore live evidence — v0.65.0 Subgate A reload adoption closure

Date: 2026-08-28

Status: **PER-PACKET REVIEW COMPLETE · SUBGATE A PASS · SUBGATE B NOW AUTHORIZED BUT NOT YET COMPLETE**

Review completion: `DIAG_REVIEW_COMPLETE_FINDING_PRESERVED`

## Scope

This record reviews three consecutive operator-supplied v0.65.0 packets around one same-tab refresh:

```text
Packet A  pre-refresh fresh natural checkpoint  @2264 -> @2265
REFRESH   same-tab operator boundary
Packet B  first post-refresh natural request     @2266 -> @2267
Packet C  second same-generation natural request @2268 -> @2269
```

The review follows the per-packet field-sweep rule in `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md` and does not promote local `PASS`, `COMMITTED`, or `ADOPTED` labels beyond their actual scope.

Production remains v0.65.0 on `release-simcore`; this document is evidence only and changes no runtime, release, or production artifact.

---

# Packet A — fresh pre-refresh checkpoint

## Identity / binding

```text
Version: 0.65.0
Captured: 2026-08-28T15:05:34.834Z
Runtime boot: 2026-08-28T13:03:29.861Z
generation mtcypydh-c8k8co
request @2264
output @2265
Mode C
CURRENT TURN
ACTIVE / COMMITTED
BOUND
mirror COMMITTED
stale 0
hooks NAMED
```

Classification: `EXPECTED / HEALTHY`.

The generation is the same pre-refresh generation previously observed. This packet is therefore a fresh pre-refresh checkpoint, not post-refresh evidence.

## Request/session path

```text
Request total 954 ms
handshake 654 ms
Session load COLD_INIT
character 631 ms
Post-handshake 301 ms
Pre snapshot FORWARD / SKIPPED
```

The request is a clean forward natural request. `COLD_INIT` plus the 631 ms character fetch is a session/performance observation inside the still-existing runtime generation; it does not prove a runtime reload because the boot/generation identity did not change.

No correctness consequence is visible.

## Edit / representation / mirror

```text
Edit reconcile SAME_FAST
snapshot UNCHANGED
Prior representation EXACT
canonical 3867:bc2f10b4
fresh     3867:bc2f10b4
Edit origin NONE
shape FRESH_EXACT_CARRYOVER

HOST_RAW 5823:b9770d4
CANONICAL 3200:8912ffc
FRESH_CHAT 3200:8912ffc
match CANONICAL
CANONICAL <-> FRESH EXACT
Deferred mirror COMMITTED
```

Classification: `EXPECTED / HEALTHY`.

This is a valid ordinary exact-carryover control before refresh.

## Output / envelope

```text
output handler 522 ms
output storage 469 ms / 89.8%
Warnings 0
Compatibility diagnostics 0
THOUGHTS_COMPAT stripped by SILENT_COMPAT
Envelope recovery NOT_APPLICABLE
Safe-envelope reconcile NOT_APPLICABLE
```

The storage hotspot is observable but no output correctness defect follows from it.

## Cache/history

```text
Prompt prefix BASELINE
Cache topology BASELINE
Cache integrity BASELINE
History mutation BASELINE
Host prefix BASELINE
Runtime identity tiers BASELINE
Cache trajectory BASELINE / FAMILY_RESET
SimCore contribution BASELINE
provider cache UNVERIFIED
```

This packet starts a new local cache-observer baseline despite remaining in the same userscript generation. The simultaneous `Session load: COLD_INIT` provides context, but this single packet does not prove a defect or exact cause for the observer reset.

Bounded classification:

```text
INTRA_GENERATION_OBSERVER_BASELINE_RESET
= OBSERVATION ONLY
= NO CORRECTNESS FAILURE PROVEN
```

## Telemetry / reload eligibility

```text
Telemetry continuity FRESH / host-local-incompatible
Host-local boot INCOMPATIBLE
COMPACT_V2 4173/16384 OK
prompt 1423/4096
topology 1987/6144
trajectory 450/2048
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
host 29 ms
total 30 ms
Diagnostic age 11.981 s
```

`host-local-incompatible` and `boot INCOMPATIBLE` are the boot disposition of the already-running generation, not a statement that the current 4173-character v0.65.0 write is incompatible.

The current packet created a fresh eligible current-version Host-local checkpoint only seconds before the operator refresh.

## Mode / frame / evidence / chronology

```text
Broadcast CLOSED / mode C
Short-C source lock ON
Request lineage CHAIN
Source handoff NEW SOURCE
Evidence DUAL
root fence APPLIED
source fence APPLIED
RAW frame 79/8/1103 -> 79/8/1104
Frame sequence PASS
Frame guard PASS
Narrative 2032-05-18 14:00 -> 17:00
```

The current user asked only `[커뮤니티] 연기 반응`; the visible output remains a community reaction to the current film/performance source and does not replay an unrelated prior turn.

Packet A verdict:

```text
clean natural pre-refresh request = PASS
exact carryover = PASS
semantic result = PASS
current-version bounded Host write = PASS
refresh eligibility = PASS at capture time
new blocker = NONE
```

---

# Boundary evidence

Operator sequence identifies a same-tab refresh between Packet A and Packet B.

Runtime evidence independently shows:

```text
before: boot 2026-08-28T13:03:29.861Z / generation mtcypydh-c8k8co
after:  boot 2026-08-28T15:06:17.830Z / generation mtd33vja-616y70
```

Transport alone does not prove physical same-tab identity; the episode combines the operator boundary fact with the changed generation and post-boundary Host-local adoption as required by the Host-local contract.

---

# Packet B — first post-refresh natural request

## Identity / binding

```text
Version 0.65.0
Captured 2026-08-28T15:10:10.164Z
Runtime boot 2026-08-28T15:06:17.830Z
generation mtd33vja-616y70
request @2266
output @2267
Mode C
CURRENT TURN
ACTIVE / COMMITTED
BOUND
mirror COMMITTED
stale 0
hooks NAMED
```

Classification: `EXPECTED / HEALTHY`.

The runtime generation changed across the operator-observed refresh while release identity stayed 0.65.0.

## Request/session path

```text
Request total 4.510 s
handshake 980 ms
Session load COLD_INIT
character 947 ms
onSend 494 ms
post-onSend 3.035 s
Request hotspot POST_ONSEND 3.035 s / 67.3%
Pre snapshot FORWARD / SKIPPED
```

Correctness is healthy, but this packet exposes a substantial first-post-refresh request-side performance cost. The telemetry topology observer itself costs only 4 ms, so the packet does not support attributing the 3.035 s post-onSend delay to compact telemetry restoration.

Classification:

```text
FIRST_POST_REFRESH_POST_ONSEND_LATENCY
= PERFORMANCE OBSERVATION
= CAUSE UNPROVEN
= NOT A GATE FAILURE
```

## Edit / representation / mirror

```text
Edit reconcile SAME_FAST
snapshot UNCHANGED
Prior representation UNAVAILABLE
Edit origin NONE
shape NEW_VISIBLE_REPRESENTATION

HOST_RAW 3260:149e261
CANONICAL 2883:6ea7199
FRESH_CHAT 2883:6ea7199
match CANONICAL
CANONICAL <-> FRESH EXACT
Deferred mirror COMMITTED
```

The prior Representation ledger is unavailable on this new runtime generation. That is expected for memory-only provenance state and means Packet B is not the post-refresh exact-carryover acceptance specimen.

The committed current output representation itself is exact and healthy.

## Output / envelope

```text
output handler 435 ms
output storage 367 ms
Warnings 0
Compatibility diagnostics 0
THOUGHTS_COMPAT 377 chars / 10 lines stripped SILENT_COMPAT
Envelope recovery NOT_APPLICABLE
Safe-envelope reconcile NOT_APPLICABLE
```

No visible envelope/preamble defect remains.

## Cache/history and bounded handoff precision

```text
Prompt prefix >=34.4% / HANDOFF_LINE_BOUND
Cache topology COMMON_PREFIX 15/46
70554/123398 chars
first change @15 assistant->assistant
Cache integrity DEGRADED
Cache break PRE_SIMCORE / CHAT_HISTORY
Host prefix BASELINE
History mutation @15 / SAME_SLOT_CHANGED
History attribution NOT_APPLICABLE
Rebuild attribution NO_PRIOR_FRONTIER_WINDOW / LOW
Runtime tiers BASELINE
SimCore contribution NOT_FIRST_BREAK
Cache trajectory OBSERVING
```

The first post-refresh prompt line deliberately reports a lower-bound handoff result rather than false exactness. This matches the compact-handoff contract.

The first cache break is before SimCore. No provider-cache conclusion is permitted.

The imported topology is `COMPLETE_PREFIX`, so the current message-level frontier is available within the bounded handoff contract; history causal attribution remains limited on this first new-generation observation.

## Telemetry / adoption

This is the decisive Subgate A packet:

```text
Telemetry continuity:
ADOPTED
via host-local
from 0.65.0
age 1m 24.1s
topology RESTORED
runtime-prefix RESTORED
trajectory RESTORED
handoff prompt LINE_BOUND
topology COMPLETE_PREFIX

Host-local transport:
API PRESENT
store USABLE
clear REMOVE
boot CONSUMED

COMPACT_V2 4033/16384 OK
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
```

Classification:

```text
CURRENT_VERSION_HOST_LOCAL_ADOPTION = LIVE PROVEN
CONSUME_BEFORE_ADOPT = LIVE PROVEN BY boot CONSUMED + ADOPTED
TTL = PASS / 1m24.1s < 10m
TOPOLOGY RESTORE = PASS
RUNTIME_PREFIX RESTORE = PASS
TRAJECTORY RESTORE = PASS
POST_ADOPTION FRESH CHECKPOINT = PASS
```

## Mode / frame / semantics

```text
Broadcast CLOSED / C
Template recurrence FIRST / family C
Request lineage CHAIN
Frame 79/8/1104 -> 79/8/1105
Frame sequence PASS
Frame guard PASS
Narrative 17:00 -> 18:00
```

User @2266 asks for community reactions to Siwoo's blond long hair, prior purple-hair comparison, grey-zone fit, and back/shoulder musculature while using the bow.

Assistant @2267 directly covers all those requested axes. No partial previous-turn replay is visible.

Packet B verdict:

```text
first post-refresh semantics = PASS
Host-local compatible adoption = PASS
one-shot consume = PASS
bounded precision truthfulness = PASS
fresh post-adoption checkpoint = PASS
new correctness blocker = NONE
performance watch = first-post-refresh post-onSend 3.035 s
```

---

# Packet C — second natural request in the same new generation

## Identity / binding

```text
Runtime boot 2026-08-28T15:06:17.830Z
generation mtd33vja-616y70
request @2268
output @2269
Mode C
LOCATION_REUSE
ACTIVE / COMMITTED
BOUND
mirror COMMITTED
```

The generation is identical to Packet B. There was no second refresh/runtime boot.

## Request/session path

```text
Request total 270 ms
handshake 19 ms
Session load LOCATION_REUSE
onSend 247 ms
Pre snapshot FORWARD / SKIPPED
Request hotspot TURN_STORAGE 244 ms
```

The large first-post-refresh request delay is not repeated here.

## Edit / representation / mirror — exact same-generation recovery

```text
Edit reconcile SAME_FAST
snapshot UNCHANGED
Prior representation EXACT
canonical 2883:6ea71992
fresh     2883:6ea71992
Edit origin NONE
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
CANONICAL <-> FRESH EXACT
Deferred mirror COMMITTED
```

This is the required second-request return to exact same-generation representation observation and is also a valid M2-3 ordinary exact-carryover control after Subgate A closure.

## Output / envelope

```text
output handler 484 ms
output storage 422 ms
Warnings 0
Compatibility diagnostics 0
THOUGHTS_COMPAT stripped SILENT_COMPAT
```

No output correctness regression is visible.

## Cache/history — exact same-generation observation resumed

```text
Prompt prefix 58.2% / other
(no HANDOFF_LINE_BOUND marker)
Cache topology COMMON_PREFIX 17/48
73406/126353 chars
frontier @15 -> @17
+2 messages / +2852 chars
Cache trajectory ESTABLISHED
floor 15 msgs / 70554 chars
frontier 17 msgs / 73406 chars
Runtime stable/slow SAME
volatile/full CHANGED as expected with current runtime content
Host prefix STABLE / HIGH
SimCore contribution NOT_FIRST_BREAK
provider cache UNVERIFIED
```

This is strong evidence that the handoff precision was a first-post-refresh boundary condition, not a persistent precision downgrade. The second request resumes ordinary same-generation topology/trajectory tracking and advances the observed frontier.

The PRE_SIMCORE/CHAT_HISTORY mutation family remains present:

```text
History mutation @17 SAME_SLOT_CHANGED
Representation correlation NO_MATCH
Mutation attribution NO_PROVENANCE_MATCH / LOW
Rebuild attribution PREEXISTING_REQUEST_MUTATION / HIGH
```

Because the edit path is `SAME_FAST`, prior representation is exact, Host prefix is stable, and `SimCore contribution: NOT_FIRST_BREAK`, this remains a separate history/cache observation and is not evidence of an M2-3 edit-reconcile regression.

## Why `Telemetry continuity: ADOPTED` still appears

Packet C still renders:

```text
Telemetry continuity ADOPTED / via host-local / age 1m24.1s
Host-local boot CONSUMED
Handoff precision LINE_BOUND / COMPLETE_PREFIX
```

This does **not** establish a second adoption.

The Host-local contract permits at most one mailbox read per runtime generation and explicitly forbids a read on every request. `boot CONSUMED` and the continuity/handoff fields are generation-level boot provenance retained for diagnostics.

Packet C has:

```text
same generation as Packet B
Session load LOCATION_REUSE
no new boot
ordinary exact prompt/topology observation resumed
fresh current checkpoint written
```

Therefore the bounded interpretation is:

```text
one boot adoption occurred in generation mtd33vja-616y70
its provenance remains displayed on later requests
no repeated mailbox adoption is evidenced
```

Current checkpoint remains healthy:

```text
COMPACT_V2 4124/16384 OK
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
```

## Mode / frame / semantics

```text
Frame 79/8/1105 -> 79/9/1106
RAW regression NONE
Frame sequence PASS
Frame guard PASS
Narrative 2032-05-18 18:00 -> 2032-05-20 10:30
```

User @2268 asks for community reactions that the already-hyped blockbuster is now exploding further at the box office and looks headed for another ten-million-admission result.

Assistant @2269 directly renders that requested box-office reaction. No replay or source substitution is visible.

Packet C verdict:

```text
second same-generation request = PASS
exact representation recovery = PASS
normal forward request = PASS
fresh bounded checkpoint = PASS
re-adoption/reset = NOT EVIDENCED
semantic result = PASS
```

---

# Cross-packet Subgate A verdict

The ordered live sequence is now complete:

```text
PRE-REFRESH
Version 0.65.0
clean natural request
COMPACT_V2 4173/16384 OK
HOST_LOCAL WRITTEN

BOUNDARY
operator same-tab refresh
runtime generation changed

FIRST POST-REFRESH
Version 0.65.0
ADOPTED via host-local
from 0.65.0
age 1m24.1s
boot CONSUMED
topology/runtime-prefix/trajectory RESTORED
HANDOFF_LINE_BOUND truthfully reported
fresh COMPACT_V2 4033 checkpoint written

SECOND POST-REFRESH
same generation retained
LOCATION_REUSE
Prior representation EXACT
FRESH_EXACT_CARRYOVER
ordinary prompt/topology observation resumed
frontier advanced
fresh COMPACT_V2 4124 checkpoint written
```

Final classification:

```text
06500_SUBGATE_A_IDENTITY_AND_DURABLE_RELOAD_HANDOFF
= PASS
= LIVE PROVEN
= SAME_TAB_OPERATOR_EPISODE
= HOST_LOCAL ADOPTED
= ONE_SHOT CONSUMED
= TTL PASS
= FIRST_REQUEST BOUNDED PRECISION TRUTHFUL
= SECOND_REQUEST EXACT SAME_GENERATION RECOVERY PROVEN
```

The previous v0.64.11 runtime identity split is closed by the real v0.65.0 episode: the capsule written by v0.65.0 is accepted by a new v0.65.0 generation.

# Subgate B status

Subgate A passing now authorizes M2-3 live acceptance work. It does not by itself complete Subgate B.

Already available from this episode:

```text
ordinary C binding/output/mirror stability = PASS
normal exact carryover SAME_FAST / Edit origin NONE = PASS
post-refresh exact carryover = PASS
no visible Frame/Continuity/Community/Representation regression in supplied episode
```

Still requires current-version acceptance evidence where not already independently preserved:

```text
representation-drift correlated control
  -> REPRESENTATION_FAST_RECONCILED
  -> snapshot UNCHANGED

genuine user hand edit
  -> USER_EDIT_CANDIDATE
  -> MANUAL_EDIT_REBUILT

remaining required mode/subsystem controls per the frozen v0.65.0 acceptance plan
```

Do not declare the whole v0.65.0 live gate closed until those Subgate B requirements are satisfied or current authority shows they have already been separately proven.

# Separate observations, not blockers

```text
FIRST_POST_REFRESH_POST_ONSEND_LATENCY = WATCH / 3.035 s / cause unproven
INTRA_GENERATION_OBSERVER_BASELINE_RESET = OBSERVATION ONLY
PRE_SIMCORE_CHAT_HISTORY_FRONTIER = existing separate watch / SimCore NOT_FIRST_BREAK
provider cache = UNVERIFIED
```

None of these observations invalidates the Subgate A proof above.
