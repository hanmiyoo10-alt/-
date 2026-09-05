# SimCore Next Runtime Version Design Lane — 2026-09-05

Date: 2026-09-05 KST
Status: **DESIGN LANE DEFINED · VERSION NOT RESERVED · IMPLEMENTATION NOT STARTED**
Classification: **SIMCORE · NEXT RUNTIME DESIGN · SEPARATE FROM R2.11**

## 1. Decision

The next SimCore runtime version will be designed in a lane that is completely separate from Release System R2.11.

R2.11 remains a non-runtime release-system implementation transaction. The next runtime release must not be bundled into, implemented inside, deployed by, or justified merely by R2.11.

```text
R2.11 = release-system / non-runtime
next runtime version = plugin/runtime product lane
shared transaction = FORBIDDEN
```

A design-only runtime lane may exist while R2.11 is being prepared or implemented, but runtime source mutation/release activation should remain serialized behind the active R2.11 transaction unless a later explicit authority proves the two write scopes are safely disjoint and separately controlled.

## 2. Current runtime authority

At design-lane creation:

```text
production = 0.70.6 Manual Edit Redundant Prune Elision
validation = LIVE_PASS
lifecycle = REAL_RELEASE_LIVE_PASS
checkpoint = M2-6
release-simcore = e2552d7f93456652c94d9df37b0c253f12f2d900
production blob = 83714d78537906fc9f2060c06c9e4ce349568a19
latest.js == install.js = VERIFIED
```

No later runtime version is currently reserved or authorized by this document.

`0.70.7` is only the obvious monotonic candidate if production remains 0.70.6 when a future runtime design is frozen. The version identity must be re-checked immediately before design freeze and again before implementation authorization.

## 3. Selection rule

Do not choose the next release by version number first.

Use this sequence:

```text
fresh production evidence
→ classify active WATCH / DEFER / FIX / BLOCKER candidates
→ select exactly one bounded runtime problem
→ inspect exact deployed owner and call path
→ prove whether the problem is SimCore-actionable
→ freeze one-purpose design
→ only then reserve the next monotonic runtime version
```

If no candidate has sufficient evidence for a safe bounded repair, do not manufacture a runtime release.

## 4. Current candidate ranking

### Candidate A — repeated output-storage latency

Current disposition:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
confidence = repeated direct timing evidence
correctness impact = none observed
performance impact = material in some turns
next-release suitability = HIGHEST CURRENT RUNTIME CANDIDATE
```

Existing long-chat evidence repeatedly shows output storage as a dominant or substantial output-side span while correctness, continuity, frame, edit reconciliation, and mirror invariants remain healthy.

This is the strongest current runtime-design candidate because it is:

- repeated rather than one-off;
- locally measurable;
- independent from provider-cache inference;
- already preserved as a separate WATCH across multiple releases;
- potentially reducible without altering generation semantics if an exact redundant or avoidable storage owner is proven.

However, **latency evidence alone does not authorize an optimization**.

The next design pass must first split the output-storage path enough to answer:

```text
Which exact operation owns the delay?
```

Possible owner classes to distinguish:

```text
serialization / payload preparation
chat set/write API
store prune / retention
mirror/checkpoint persistence
a host-side opaque wait
other bounded output-finalize storage work
```

If the dominant cost is an opaque host API wait with no safe SimCore-side reduction, preserve the WATCH or DEFER it rather than forcing a patch.

### Candidate B — cache observer / prompt-accounting cold-path program

Current disposition:

```text
historical 0.70.2 design = preserved
provider cache = UNVERIFIED
PRE_SIMCORE / CHAT_HISTORY first break = observed in cache diagnostics
current runtime promotion = NOT AUTOMATIC
```

The old Cache Observer Cold-Path Attribution design remains useful technical evidence, but its historical version identity is not reusable as current runtime authority.

Any revived cache release must receive a fresh monotonic version identity and must stay separate from output-storage work.

Provider cache hit/miss, billing cache use, or billed cached-token savings must not be inferred from local warm/cold timing.

### Candidate C — semantic / continuity anomaly watches

Examples remain preserved in `SIMCORE_ANOMALY_WATCH.md`.

These do not currently outrank output-storage latency for a new patch unless natural recurrence upgrades one to a direct active FIX/BLOCKER.

One-off or already-mitigated historical anomalies must not be used as filler for the next version.

## 5. Preferred next design shape

If fresh evidence still supports Candidate A, the preferred design sequence is two-stage and fail-closed:

### Stage A — output-storage owner attribution

First prove the exact cost owner with bounded diagnostics or existing timings.

Preferred objective:

```text
OUT_STORAGE total
→ bounded exact sub-owner accounting
→ one repeatable dominant owner or MIXED/UNRESOLVED
```

No semantic optimization is allowed in the attribution stage unless the exact deployed source already proves a redundant operation whose removal is independently safe and can be frozen as one narrow release.

### Stage B — single-owner optimization

Only after a repeatable owner is proven:

```text
one owner
one causal mechanism
one bounded change
one measurable success condition
```

Examples of acceptable future design forms:

```text
redundant same-key storage operation removal
unnecessary duplicate serialization elimination
safe prune elision with exact overwrite provenance
avoidable local pre-write copy removal
```

Examples of unacceptable broadening:

```text
rewrite all persistence
change edit semantics
change representation reconciliation
change provider/cache behavior
change Community/prompt semantics
change release-system architecture
```

## 6. Frozen safety boundaries

Any next runtime design must preserve unless direct contrary evidence requires a separate design:

```text
Core / Prompt semantic behavior
Broadcast lifecycle / modes
Frame
Continuity
Evidence
Lineage
Source Handoff
Reaction
Recurrence
Structure / COMMUNITY acceptance
TAIL_AFTER_CURRENT_USER
Deferred Mirror strict gates
Edit Origin genuine-user-edit semantics
Representation fast paths
persistent schema
network/provider routing
provider cache = UNVERIFIED
```

The design must also preserve:

```text
latest.js == install.js
one authoritative production release path through release-simcore
no hidden background worker / polling / retry
no release-system redesign inside the runtime patch
```

## 7. Version reservation rule

Do not reserve `0.70.7` today as immutable authority.

At future design freeze:

```text
if production still = 0.70.6
and no other runtime release has been authorized/published
→ candidate version may be 0.70.7

else
→ choose the next fresh monotonic version from then-current production
```

The release name should describe the exact proven owner, not a broad theme such as “performance improvements.”

## 8. Activation sequence after R2.11

Once R2.11 reaches its own durable non-runtime closure, the next runtime lane should proceed:

```text
1. fresh main + release-simcore readback
2. fresh long-chat evidence triage
3. exact deployed-source owner inspection
4. freeze one-purpose next-runtime design
5. record implementation authorization separately
6. dedicated runtime implementation branch
7. static/permanent CI
8. normal release-simcore publication transaction
9. real long-chat validation
10. main docs / long-term continuity synchronization
```

R2.11 completion does not itself authorize this runtime implementation.

## 9. Current disposition

```text
NEXT_RUNTIME_DESIGN_LANE = OPEN / DESIGN-ONLY
NEXT_RUNTIME_VERSION = NOT RESERVED
PREFERRED_FIRST CANDIDATE = REPEATED_OUT_STORAGE_LATENCY
PROVIDER_CACHE = SEPARATE / UNVERIFIED
R2.11 COUPLING = FORBIDDEN
RUNTIME IMPLEMENTATION = NOT STARTED
RELEASE-SIMCORE MUTATION = NONE
```

The next concrete runtime-design action is therefore not “build 0.70.7.”

It is:

```text
collect/re-read fresh output-storage evidence
→ inspect exact deployed output-storage owner path
→ decide ATTRIBUTION-FIRST vs directly-proven narrow optimization
→ freeze one-purpose runtime design
```
