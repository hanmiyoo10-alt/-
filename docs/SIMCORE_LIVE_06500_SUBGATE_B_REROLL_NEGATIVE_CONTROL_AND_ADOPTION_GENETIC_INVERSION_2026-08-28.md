# SimCore live evidence — v0.65.0 Subgate B reroll negative control + adoption/genetic semantic inversion

Date: 2026-08-28

Status: **PER-PACKET REVIEW COMPLETE · REPRESENTATION-DRIFT CONTROL NOT EXERCISED · NEW SEMANTIC CONTRADICTION PRESERVED · ROOT CAUSE UNPROVEN · NO RUNTIME CHANGE**

Review completion: `DIAG_REVIEW_COMPLETE_FINDING_PRESERVED`

## Scope

This episode reviews three operator-supplied v0.65.0 diagnostics from the same runtime generation:

```text
Packet A  natural request          @2274 -> @2275
Packet B  same-input reroll        @2274 -> @2275
Packet C  next natural request     @2276 -> @2277
```

Runtime generation for all three:

```text
boot       2026-08-28T15:06:17.830Z
generation mtd33vja-616y70
Version    0.65.0
```

The review follows `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`: every packet is swept independently before aggregation. Local `PASS`, `Warnings: 0`, `EXACT`, `COMMITTED`, `ADOPTED`, or `NO_BREAK` labels are not treated as global semantic correctness.

The episode contains two distinct findings:

1. the attempted M2-3 representation-drift reroll control remains a **healthy negative control** because no `CANONICAL != FRESH_CHAT` state was produced;
2. the reroll output introduces a **visible semantic contradiction** by treating adopted children as if they biologically inherited the parents' genes, and the next natural output repeats that false genetic-inheritance framing.

These must not be collapsed into one cause.

---

# Packet A — first natural @2274 -> @2275

## A. Identity / binding

```text
Captured 2026-08-28T16:13:31.502Z
Version 0.65.0
CURRENT TURN
request @2274 -> assistant @2275
Mode C
ACTIVE / COMMITTED
BOUND
mirror COMMITTED
stale 0
hooks NAMED
```

Classification: `EXPECTED / HEALTHY`.

## B. Request path / timing

```text
request total 586 ms
handshake 30 ms
LOCATION_REUSE
onSend 546 ms
turn storage 544 ms
request hotspot TURN_STORAGE 544 ms / 93.0%
Pre snapshot FORWARD / SKIPPED
```

The request path is a normal forward natural request. Storage dominates request-side cost but no correctness failure follows from this packet.

## C. Edit / representation / mirror

```text
Edit reconcile SAME_FAST
snapshot UNCHANGED
Prior representation EXACT
canonical 2998:4c601b56
fresh     2998:4c601b56
Edit origin NONE
shape FRESH_EXACT_CARRYOVER

HOST_RAW   5824:ee912c2
CANONICAL  2868:c5ab301
FRESH_CHAT 2868:c5ab301
match CANONICAL
CANONICAL <-> FRESH EXACT
Deferred mirror COMMITTED
```

Classification: `EXPECTED / HEALTHY`.

This is a valid same-generation exact-carryover control.

## D/E. Output path / warnings / preamble

```text
output handler 772 ms
OUT_STORAGE 651 ms / 84.3%
Warnings 0
Compatibility diagnostics 0
THOUGHTS_COMPAT 2954 chars / 41 lines
STRIPPED / SILENT_COMPAT
Envelope recovery NOT_APPLICABLE
Safe-envelope reconcile NOT_APPLICABLE
```

No envelope or compatibility defect is visible.

## F. Prompt / cache / history

```text
Prompt prefix 35.4%
Cache topology COMMON_PREFIX 23/54
81514/136811 chars
Cache integrity DEGRADED
Cache break PRE_SIMCORE / CHAT_HISTORY @23
Host prefix STABLE / HIGH
History mutation @23 SAME_SLOT_CHANGED
Representation correlation NO_MATCH
Mutation attribution NO_PROVENANCE_MATCH / LOW
Rebuild attribution PREEXISTING_REQUEST_MUTATION / HIGH
Runtime stable/slow SAME
SimCore contribution NOT_FIRST_BREAK
Cache trajectory ESTABLISHED
provider cache UNVERIFIED
```

The cache/history observer sees a pre-SimCore history mutation family. Because the first break is explicitly `PRE_SIMCORE`, Host prefix is stable, Edit is `SAME_FAST`, and Representation is exact, this packet does not prove an M2-3 edit-reconcile regression.

## G. Telemetry / handoff

```text
Telemetry continuity ADOPTED via host-local
from 0.65.0
boot CONSUMED
COMPACT_V2 4609/16384 OK
prompt 1413/4096
topology 2324/6144
trajectory 559/2048
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
```

`ADOPTED` is retained boot provenance from the already-proven same generation, not a new mailbox adoption.

## H/I. Mode / frame / chronology

```text
Broadcast CLOSED / mode C
Short-C source lock ON
Request lineage INLINE
Source handoff NEW SOURCE
frame 79/11/1108 -> 79/12/1109
RAW regression NONE
Frame sequence PASS
Frame guard PASS
Narrative 2032-06-05 14:00 -> 2032-07-25 10:00
Evidence ROOT_ONLY / safe root fence
```

The user asked for article/community reaction to the couple becoming parents of adopted male/female twins, names `한이우` and `한리우`, the wife's surname being used, and rumors that the twins resemble the parents.

The visible response directly answers those axes.

Crucially, this first generation still preserves the non-biological relationship in visible community text, e.g. it explicitly frames the resemblance as occurring despite no blood/genetic relation. No biological-inheritance contradiction is required to explain Packet A.

Packet A semantic verdict:

```text
current-request relevance  PASS
adoption/non-biological fact preserved in visible output  YES
representation drift       NOT PRESENT
new semantic contradiction NOT OBSERVED in the bounded target family
```

---

# Packet B — same-input reroll @2274 -> @2275

Operator action: **same-input reroll**.

## A/B. Identity / action path

```text
Captured 2026-08-28T16:15:32.272Z
same boot / same generation
same request index @2274
same assistant slot @2275
Pre snapshot REPEAT-SEND / READ HIT / 622 ms
```

This independently confirms that Packet B is a reroll control, not a second natural recurrence.

Request timing:

```text
request total 1.262 s
edit 587 ms
onSend 650 ms
PRE_LOAD 622 ms / 49.2%
```

The reroll path is slower than the ordinary forward request but no correctness defect is established from timing alone.

## C. Edit / representation / mirror

```text
Edit reconcile SAME_SNAPSHOT / 587 ms
snapshot UNCHANGED
Prior representation EXACT
canonical 2998:4c601b56
fresh     2998:4c601b56
Edit origin NONE
shape FRESH_EXACT_CARRYOVER

HOST_RAW   6072:1ceac8a
CANONICAL  3004:f05ddf6
FRESH_CHAT 3004:f05ddf6
match CANONICAL
CANONICAL <-> FRESH EXACT
Deferred mirror COMMITTED
```

Two facts must be kept separate:

```text
first natural @2275 body fingerprint = 2868:c5ab301
rerolled @2275 body fingerprint      = 3004:f05ddf6
```

The generation result changed, as expected for a reroll, but the rerolled visible result itself converged exactly between Canonical and Fresh.

Therefore:

```text
same-input reroll occurred                       YES
new generation result differs from prior result YES
OUTPUT_MISMATCH                                 NO
REPRESENTATION_DRIFT_CORRELATED                 NOT EXERCISED
REPRESENTATION_FAST_RECONCILED                  NOT EXERCISED
```

This is a **healthy representation negative control**.

`SAME_SNAPSHOT` is observed specifically on this repeat-send path while `snapshot UNCHANGED`, `Edit origin NONE`, and exact carryover remain intact. This packet alone does not justify treating `SAME_SNAPSHOT` as an edit regression.

## D/E. Output / warning / preamble

```text
output handler 662 ms
OUT_STORAGE 565 ms / 85.3%
Warnings 0
Compatibility diagnostics 0
THOUGHTS_COMPAT stripped SILENT_COMPAT
```

No local warning exposes the semantic defect described below.

## F. Cache / history — unusually clean reroll control

```text
Prompt prefix 100.0% stable
Cache topology STABLE 54/54
136811/136811 chars
Cache integrity STABLE
Cache break NONE
History mutation NONE
Representation correlation NONE
Mutation attribution NONE
Runtime tiers all SAME
SimCore contribution NO_BREAK
Cache trajectory ESTABLISHED / last RETRY
provider cache UNVERIFIED
```

This is strong attribution evidence against a visible SimCore cache/history break being required for the semantic defect.

## G. Telemetry

```text
COMPACT_V2 4603/16384 OK
HOST_LOCAL WRITTEN
boot provenance CONSUMED / ADOPTED retained
```

Telemetry remains healthy and unrelated to the semantic contradiction.

## H/I. Frame / chronology

```text
frame 79/11/1108 -> 79/12/1109
Frame sequence PASS
Frame guard PASS
Narrative 2032-06-05 14:00 -> 2032-07-28 14:00
```

The changed reroll date remains within the user's broad `7월 말` boundary and does not by itself establish a chronology defect.

## J. RAW semantic finding — adoption -> genetic inheritance inversion

The user source says the couple **became parents** of twins encountered through the adoption storyline. The immediately preceding established world state also treats the children as adopted/non-biological.

The rerolled visible community response nevertheless introduces biological-inheritance claims, including statements equivalent to:

```text
father's + mother's genes were inherited
parents' genes explain the children's appearance
```

Examples in the visible output explicitly refer to `아빠/엄마 유전자 그대로 물려받았으면` and `차시우 유전자에 한미우 유전자면`.

That is not merely extra detail. It contradicts the adoption/non-biological relationship already present in the source episode.

Bounded classification:

```text
ADOPTION_TO_GENETIC_INHERITANCE_SEMANTIC_INVERSION
symptom evidence: DIRECT / VISIBLE OUTPUT
first observed in this episode: SAME-INPUT REROLL
representation state: EXACT
Warnings: 0
cache break: NONE
SimCore contribution: NO_BREAK
provider/model cause: UNPROVEN
SimCore cause: UNPROVEN
M2-3 ownership cause: UNPROVEN
```

The `<Knowledge>` block in Packet B does **not** preserve a false genetic-parentage statement. It records that the twins resemble the parents and that the public reacts to the surname/parenthood story. Therefore persistent semantic state corruption is **not observed** from this packet.

Packet B verdict:

```text
representation reroll control = HEALTHY NEGATIVE CONTROL
semantic output              = CONTRADICTORY
state corruption             = NOT OBSERVED
```

---

# Packet C — next natural request @2276 -> @2277

## A/B. Identity / request path

```text
Captured 2026-08-28T16:17:12.933Z
same boot / same generation
request @2276 -> assistant @2277
Mode C
LOCATION_REUSE
request total 279 ms
Pre snapshot FORWARD / SKIPPED
TURN_STORAGE 252 ms / 90.3%
```

This is a new natural request after the rerolled @2275.

## C. Edit / representation / mirror

```text
Edit reconcile SAME_FAST
snapshot UNCHANGED
Prior representation EXACT
canonical 3004:f05ddf6
fresh     3004:f05ddf6
Edit origin NONE
shape FRESH_EXACT_CARRYOVER

HOST_RAW   5202:af36d55
CANONICAL  2321:5489464
FRESH_CHAT 2321:5489464
EXACT
Deferred mirror COMMITTED
```

This proves the rerolled @2275 representation was cleanly adopted as the current canonical/Fresh prior representation. There is still no representation mismatch.

## D/E. Output / preamble

```text
output handler 807 ms
OUT_STORAGE 736 ms / 91.2%
Warnings 0
Compatibility diagnostics 1
Thoughts compatibility preamble stripped by SAFE_ENVELOPE_COMPAT
```

The compatibility event is locally handled and does not explain the semantic contradiction.

## F. Cache / history

```text
COMMON_PREFIX 25/56
84189/138461 chars
Cache integrity DEGRADED
PRE_SIMCORE / CHAT_HISTORY @25
Host prefix STABLE
History mutation @25 SAME_SLOT_CHANGED
Representation correlation NO_MATCH
Mutation attribution NO_PROVENANCE_MATCH / LOW
SimCore contribution NOT_FIRST_BREAK
```

The pre-SimCore history mutation family returns on the new natural request, but there is still no direct provenance link from that observer event to the semantic contradiction.

Do not infer causality from adjacency.

## G. Telemetry

```text
COMPACT_V2 4432/16384 OK
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
```

Healthy.

## H/I. Frame / chronology

```text
frame 79/12/1109 -> 79/12/1110
Frame sequence PASS
Frame guard PASS
Narrative 2032-07-28 14:00 -> 16:00
```

Healthy for the requested immediate community follow-up.

## J. RAW semantic recurrence inside the same episode

Current user intent:

```text
people say the twins' names are already pretty
if they resemble the parents' childhood appearance, their looks are already assured
```

The user does **not** introduce biological heredity or genes.

The assistant directly answers the requested reaction, but multiple visible comments again convert resemblance into biological inheritance, using claims equivalent to:

```text
parents' genes were strongly inherited
these genes make appearance guaranteed
father's height/build genes will be inherited
```

This is the same semantic contradiction family introduced by the rerolled Packet B.

Because Packet C is a new natural request, the episode now shows:

```text
correct first natural generation
→ same-input reroll introduces adoption/genetic contradiction
→ next natural request repeats the genetic-inheritance framing
```

This is **not** a second independent natural recurrence of the family, because Packet C is directly downstream of the rerolled contradictory response and the user's current request still discusses resemblance. It is nevertheless direct evidence that the false biological framing can survive into the next natural generation without being present in the new input.

The Packet C `<Knowledge>` block again avoids asserting biological inheritance; it records appearance expectations derived from resemblance. Persistent Knowledge corruption remains unobserved.

Packet C semantic verdict:

```text
current-request relevance               PASS
visible adoption/genetic contradiction  PRESENT
contradiction carried into next natural YES
Knowledge-state corruption              NOT OBSERVED
```

---

# Cross-packet conclusions

## 1. M2-3 representation-drift control

The attempted reroll sequence does **not** exercise the intended mismatch branch:

```text
Packet A prior EXACT -> output EXACT
Packet B reroll prior EXACT -> rerolled output EXACT
Packet C prior EXACT -> output EXACT
```

Therefore:

```text
06500_M2_3_REPRESENTATION_DRIFT_CONTROL_ATTEMPT_2
= HEALTHY NEGATIVE CONTROL
= REROLL CONFIRMED
= OUTPUT_MISMATCH NOT TRIGGERED
= REPRESENTATION_DRIFT_CORRELATED NOT EXERCISED
= REPRESENTATION_FAST_RECONCILED NOT EXERCISED
= NO M2_3 REGRESSION PROVEN
```

This attempt cannot close the required natural mismatch -> Fresh exact carryover acceptance case.

## 2. New semantic anomaly family

The per-packet RAW review catches a separate finding that all local structural/representation diagnostics miss:

```text
ADOPTION_TO_GENETIC_INHERITANCE_SEMANTIC_INVERSION
= DIRECT VISIBLE CONTRADICTION
= FIRST APPEARS ON SAME-INPUT REROLL
= REPEATED ON NEXT NATURAL FOLLOW-UP
= WARNINGS 0
= REPRESENTATION EXACT
= MIRROR COMMITTED
= STATE/KNOwLEDGE CORRUPTION NOT OBSERVED
= PROVIDER/MODEL CAUSE UNPROVEN
= SIMCORE CAUSE UNPROVEN
= M2-3 ATTRIBUTION UNPROVEN
= CURRENT DISPOSITION WATCH
= CURRENT M2-3 BLOCKER NO
= RUNTIME FIX AUTHORITY NONE
```

The existing `GENERATION_SEMANTIC_EXCURSION` family concerns abandoning an explicit requested source/scene boundary and generating unrelated content. This episode instead keeps the requested topic but inverts a factual relationship from adoption/non-biological resemblance into genetic inheritance. Keep the families separate unless later evidence shows a common cause.

## 3. Why local PASS fields are insufficient

During the contradictory reroll Packet B:

```text
Warnings 0
Cache topology STABLE 100%
Cache break NONE
History mutation NONE
Runtime identity SAME
SimCore contribution NO_BREAK
CANONICAL == FRESH EXACT
mirror COMMITTED
Frame PASS
Telemetry OK
```

Yet the visible output is semantically wrong.

This is a direct positive example for the diagnostic-review rule that subsystem health cannot substitute for RAW semantic review.

## 4. Subgate B state after this episode

```text
ordinary exact carryover              LIVE PASS / multiple specimens
same-input reroll exact convergence   LIVE PASS / negative control
natural OUTPUT_MISMATCH -> fast reconcile NOT YET EXERCISED
genuine hand edit                     STILL REQUIRED for v0.65.0 acceptance episode
new M2-3 regression                   NOT PROVEN
separate semantic watch               OPEN / NON-BLOCKING at current evidence
```

Do not force repeated rerolls indefinitely to manufacture `OUTPUT_MISMATCH`. The mismatch control should be accepted only when the natural prerequisite state actually appears.

Release-simcore is unchanged by this evidence record.
