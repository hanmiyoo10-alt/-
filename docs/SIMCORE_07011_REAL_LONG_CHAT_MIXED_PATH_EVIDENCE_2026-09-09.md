# SimCore v0.70.11 Real Long-Chat Mixed-Path Evidence

Date: 2026-09-09
Tracking: #1972
Runtime version: `0.70.11`
Release: `Operator Release Card Metadata Repair`
Generation: `mttz5h6b-pkiclo`
Runtime boot: `2026-09-09T10:47:39.059Z`
Classification: **REAL LONG CHAT EVIDENCE · NONRUNTIME**

## 1. Scope

This packet preserves one same-generation long-chat sequence containing:

- ordinary Mode C execution;
- a forward Mode C continuation;
- reroll / repeat-send of the same request;
- Mode C to Mode A transition;
- Mode A to Mode C source handoff;
- a genuine one-character manual edit followed by the next request.

The packet is evidence only. It does not mutate runtime or release authority.
Separate-topic findings remain owned by their existing issues.
## 2. Specimen matrix

| Specimen | Turn | Mode | Request | Output | Key path |
| --- | --- | --- | ---: | ---: | --- |
| S1 | @3208 -> @3209 | C | 1.039 s | 290 ms | ordinary control |
| S2 | @3210 -> @3211 | C | 225 ms | 221 ms | forward continuation |
| S2R | reroll @3210 -> @3211 | C | 97 ms | 317 ms | repeat-send / reroll |
| S3 | @3212 -> @3213 | A | 323 ms | 238 ms | mode transition + alias recurrence |
| S4 | @3214 -> @3215 | C | 1.065 s | 215 ms | new-source handoff |
| S5 | @3216 -> @3217 | C | 399 ms | 257 ms | genuine manual edit control |

All supplied diagnostics report:

```text
runtime ACTIVE
output COMMITTED
binding BOUND
mirror COMMITTED
stale drops 0
hook cleanup NAMED
Warnings 0
Compatibility diagnostics 0
```

Frame continuity and frame guard remain PASS throughout the supplied sequence.
## 3. v0.70.11 release-specific live-gate coverage

The release design requires three live checks.

### 3.1 Operator card identity

**NOT_EXERCISED in this packet.**

No supplied specimen opens or copies the SimCore update/operator release card.
Therefore this packet does not prove that the visible card shows:

```text
version = 0.70.11
name = Operator Release Card Metadata Repair
scenario = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
no historical v0.69 State Reconcile / Kernel Inversion body
```

Issue #1657 must remain open until that release-specific UI check is durably proven.

### 3.2 Ordinary long-chat control

**PASS FOR OBSERVED RUNTIME CONTROLS.**

Ordinary request/output/binding/mirror/hook behavior remained stable and committed.
The known separate #1660 output-hygiene defect recurred in S3 and is not claimed repaired by v0.70.11.
### 3.3 Scope control

**PASS FOR OBSERVED SCOPE.**

The packet shows no new storage/network/timer/schema behavior attributable to v0.70.11.
The release does not claim a #1660 repair, and the observed recurrence is kept under #1660.

Release-specific terminal disposition:

```text
OPERATOR_CARD_IDENTITY = NOT_EXERCISED
ORDINARY_LONG_CHAT_CONTROL = PASS_FOR_OBSERVED_CONTROLS
SCOPE_CONTROL = PASS_FOR_OBSERVED_SCOPE
V07011_REAL_LONG_CHAT_GATE = INCOMPLETE
R2.8_HUMAN_EVIDENCE = NOT_AUTHORIZED_BY_THIS_PACKET
LIVE_PASS = NOT_CLAIMED
```

## 4. FIX recurrence: visible `internal:` alias

S3 RAW assistant @3213 visibly contains:

```text
┣ internal: playful member dynamic, deflect conflict with bright compliance ┫
```

The same diagnostic reports `Preamble provenance: THOUGHTS_COMPAT / STRIPPED`, `Warnings: 0`, and `Compatibility diagnostics: 0`.
This is a second distinct live recurrence of the alias family first confirmed under v0.70.10.

Disposition:

```text
OWNER = #1660
CLASSIFICATION = FIX
VISIBLE_OUTPUT_CONTAMINATION = CONFIRMED
V07011_RECURRENCE = CONFIRMED
EXACT_INLINE_INTERNAL_MEMO_V1_REGRESSION = NOT_CLAIMED
BLIND_GLOBAL_INTERNAL_STRIP = NOT_AUTHORIZED
ADVANCEMENT_HOLD = YES UNTIL RESOLVED OR EVIDENCE_RECLASSIFIED
```

The later C outputs in this packet do not reproduce the alias, but negative controls do not close the confirmed recurrence.

## 5. Reroll / repeat-send control

S2R reports:

```text
Pre snapshot = REPEAT-SEND / READ HIT
Edit reconcile = SAME_SNAPSHOT
Prior representation = EXACT
Cache topology = STABLE 61/61 messages
Cache integrity = STABLE
Cache break = NONE
History mutation = NONE
SimCore contribution = NO_BREAK
```

The reroll replacement output committed normally and Deferred Mirror also committed.
## 6. Genuine manual-edit control

Before S5, the visible prior assistant representation was manually edited by one character.
S5 correctly reports:

```text
Edit origin = USER_EDIT_CANDIDATE
Edit delta = -1
Edit reconcile = MANUAL_EDIT_REBUILT
snapshot = UPDATED
manual edit commit = 143 ms / confidence EXACT
retention = INLINE_PRUNE_SKIPPED / SAME_OUT_KEY_OVERWRITE
```

This is a positive control for genuine user editing.
It does not fall into the old false representation-drift fast-reconcile path.

Disposition:

```text
GENUINE_USER_EDIT_CLASSIFICATION = PASS
MANUAL_EDIT_REBUILD_PATH = PASS
FALSE_REPRESENTATION_RECONCILE = NOT_OBSERVED
NEW_EDIT_CORRECTNESS_FIX = NONE
```

## 7. Mode, source, Evidence, and frame controls

S3 transitions C to A without continuity failure.
S4 transitions A to C and reports `Source handoff: NEW SOURCE`.
S4 additionally reports:

```text
Evidence mode = DUAL
root fence = APPLIED / NORMALIZED
source fence = APPLIED / TRANSFORMED
delta = 18
Continuity summary = PASS
Frame sequence = PASS
Frame guard = PASS
Visible chronology = PASS_OR_NOT_APPLICABLE
```

No Evidence/Lineage/Handoff/Frame correctness regression is established by this packet.

## 8. Cache/history observation

Forward requests after S1 repeatedly observe a PRE_SIMCORE chat-history break moving through assistant slots:

```text
S2 frontier @29 / common prefix 90.9%
S3 frontier @31 / common prefix 91.1%
S4 frontier @33 / common prefix 91.0%
S5 frontier @35 / common prefix 91.3%
```

The diagnostics simultaneously report `request mutation NONE` and `SimCore contribution NOT_FIRST_BREAK`.
The reroll S2R returns to `Cache topology STABLE`, `Cache break NONE`, and `History mutation NONE`.

Disposition: **DEFER** for host/provider causality. Provider cache remains `UNVERIFIED`.
## 9. Performance WATCH evidence

### 9.1 Turn storage

```text
28,528 chars -> 541 ms
28,674 chars -> 145 ms
28,674 chars ->  29 ms  reroll
29,067 chars -> 272 ms
28,578 chars -> 982 ms
28,671 chars -> 205 ms
```

This strengthens #1626.
Correctness remained intact; payload size alone does not explain the variance.
No host-internal or reroll causality is claimed.

### 9.2 Host-local telemetry OUTPUT_COMMIT set

```text
4,784 chars -> 125 ms
4,698 chars ->  51 ms
4,692 chars -> 127 ms  reroll
4,687 chars -> 103 ms
5,115 chars ->  71 ms
4,870 chars ->  98 ms
```

All samples report acquire `0`, residual `0`, exact API attribution, and `HOST_LOCAL WRITTEN`.
This strengthens #1588 as a variance WATCH but does not reproduce the prior multi-second spike.

## 10. Final disposition

```text
v0.70.11 ordinary mixed-path runtime controls = PASS FOR OBSERVED CONTROLS
reroll / repeat-send control = PASS
genuine manual edit control = PASS
mode/source/evidence/frame controls = PASS FOR OBSERVED CONTROLS
#1660 internal: alias = FIX / RECURRENCE CONFIRMED / ADVANCEMENT-HOLDING
#1588 host-local telemetry latency = WATCH
#1626 turn-storage variance = WATCH
cache/history PRE_SIMCORE mutation causality = DEFER
provider cache = UNVERIFIED
new correctness FIX beyond #1660 = NONE OBSERVED
new BLOCKER beyond #1660 = NONE OBSERVED
operator card identity check = NOT_EXERCISED
v0.70.11 real-long-chat gate = INCOMPLETE
LIVE_PASS = NOT CLAIMED
```

Next legal step for the current v0.70.11 release gate is the explicit operator-card identity check defined by the release design.
That check must remain separate from any #1660 runtime repair.

No next runtime version is authorized by this packet.

## 11. Post-merge documentation validation incident

The first documentation-sync PR for this packet passed PR CI but failed merged-main MAIN_HEALTH.

```text
PR = #1973
first merged main = a4d73a3dafce175dcf57389ded03303486d46e8f
PR SimCore CI = 34348254716 / PASS
merged-main SimCore CI = 34348365241 / FAIL
GATE_REGRESSION = FAIL
reason = PERMANENT_REGRESSION_FAIL
stderr = closure-integrity: active human current-state prose duplicates version literal
```

Root cause: active human prose in `CURRENT_DEVELOPMENT.md` repeated the current version literal even though the machine-managed production snapshot exclusively owns that identity.

Classification:

```text
FIX = DOCS_AUTHORITY_DUPLICATION
runtime impact = NONE
release-simcore impact = NONE
production bytes impact = NONE
repair = make active human current-state prose identity-free
```

The repair is validated with the dedicated `closure-integrity` suite before the follow-up PR.