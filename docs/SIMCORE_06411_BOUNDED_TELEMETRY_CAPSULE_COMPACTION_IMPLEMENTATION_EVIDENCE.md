# SimCore v0.64.11 — Bounded Telemetry Capsule Compaction Implementation Evidence

Date: 2026-08-28 KST
Status: **IMPLEMENTED ON WORK BRANCH · PR/CI PENDING · BLOCKER REPAIR**
Release work item: `#683`
Design authority: `docs/SIMCORE_06411_BOUNDED_TELEMETRY_CAPSULE_COMPACTION_ACTIVATION.md`
Live failure authority: `docs/SIMCORE_LIVE_06410_HOST_LOCAL_CAPSULE_OVERSIZE_2026-08-28.md`
Production parent: `e43ace74241984f21f69299eff690d0c4f483381`
Production blob: `b7d76bd03a435356eeea6948968b0d33ac564ae7`

## Trigger

v0.64.10 real long-chat produced a valid committed output but its metadata-only telemetry capsule serialized to 77,697 characters. Browser SESSION was unavailable and Host-local transport was usable, but the common frozen 16,384-character durable capsule limit correctly prevented the write.

Classification:

```text
RUNTIME_TELEMETRY_CAPSULE_OVERSIZE
= BLOCKER / FIX / LIVE_REPRODUCED / DO_NOT_REFRESH
```

The repair does **not** raise the 16,384-character cap.

## Runtime implementation

Builder:

```text
products/simcore/tooling/build-06411-bounded-telemetry-capsule-compaction.py
```

The builder applies only to the exact v0.64.10 product shape and keeps `latest.js == install.js`.

### Rich observer preservation

The existing same-generation creators are retained under internal `*Rich` names and wrapped rather than rewritten semantically:

```text
createRuntimePromptCacheTrackerRich
createRequestTopologyTrackerRich
createCacheCandidateTrackerRich
```

Without a compact imported handoff, wrapper `observe()` delegates directly to the rich implementation. The compaction therefore does not replace ordinary same-generation observation.

### Runtime prompt handoff v2

Dedicated `exportHandoffState()` retains only:

```text
version / disposition / exact key
prompt chars
full bounded FNV identity
real line count
<=64 leading line summaries
optional bounded compiler-tier identity
precision label
```

Each line summary contains only:

```text
line chars
fixed-size hash
bounded reason code
```

Raw prompt lines and the dense per-character prefix hash array are not persisted.

Component budget:

```text
<=4,096 serialized chars
```

First post-reload comparison is truthfully labeled `EXACT_IDENTITY`, `LINE_BOUND`, or `PREFIX_FLOOR`. A floor result carries `prefixIsFloor=true`; the diagnostic uses `>=... HANDOFF_LINE_FLOOR` rather than presenting the floor as exact.

The first natural request also seeds the untouched rich tracker with the current prompt. The next natural request therefore returns to the ordinary exact same-generation path.

### Request topology handoff v3

Dedicated `exportHandoffState()` retains:

```text
exact key
prior time / total messages / total chars
current-user index / runtime index / leading-system count
<=64 compact (role, kind, chars, hash) tuples
full request/family fingerprints
bounded system0 edge sketch
```

System0 handoff retains only:

```text
total chars
block size
total block count
first <=8 head hashes
first <=8 tail-side hashes from the existing tail sketch
```

No raw message/system body is persisted.

Component budget:

```text
<=6,144 serialized chars
```

If the complete prior request is represented (<=64 signatures), the first post-reload observer can recover exact message-level prefix semantics. When the prior request exceeds 64 signatures and all retained signatures match, the result is `PREFIX_FLOOR`; no exact change frontier is fabricated.

If changed full system0 identity has matching retained edges but unretained interior blocks exist, Host prefix is reported as:

```text
INTERIOR_CHANGED_UNLOCALIZED / confidence BOUNDED
```

### Cache trajectory guard

The rich cache-trajectory owner remains unchanged. A thin wrapper intercepts only:

```text
continuitySource = HANDOFF_COMPACT_V3
precision = PREFIX_FLOOR
```

and returns a non-mutating snapshot with:

```text
guard = SKIPPED_BOUNDED_REOBSERVE
lastObservation = SKIPPED_BOUNDED_REOBSERVE
```

The imported trajectory is therefore not mutated as if a compact lower bound were an exact regression/divergence frontier. Once the topology wrapper observes the first real current request it discards the compact handoff and the second natural request resumes the rich exact trajectory path.

## Checkpoint budgets and failure isolation

`checkpointRuntimeTelemetry()` now requests only the two dedicated handoff exports plus the existing bounded trajectory export.

Before capsule capture or durable I/O it serializes each component for accounting:

```text
runtime prompt <= 4,096
request topology <= 6,144
cache trajectory <= 2,048
whole capsule <= existing 16,384 authority
```

If a required component is absent, unrepresentable, or over budget:

```text
serialization = COMPACTION_FAILED
SESSION = SKIPPED
HOST_LOCAL = SKIPPED
Core output remains committed
```

The existing `runtime-telemetry` whole-capsule serializer remains the final 16,384-character authority.

## Transport contract unchanged

v0.64.11 does not change:

```text
MEMORY -> SESSION -> HOST_LOCAL priority
one Host-local mailbox key
10-minute TTL
exact location guard
one Host store acquisition per generation
one boot read
consume-before-adopt
foreign-location non-destructive behavior
SESSION success -> HOST_LOCAL NOT_NEEDED
```

No new localStorage, IndexedDB, network, timer, polling, queue, background writer, or second Host-local key is introduced.

## Diagnostics

The Last Turn Diagnostic gains bounded attribution for:

```text
Telemetry capsule: COMPACT_V2 · total/16,384
prompt component /4,096
topology component /6,144
trajectory component /2,048
Handoff precision: prompt ... · topology ...
```

Prompt `PREFIX_FLOOR` is rendered with `>=`/`HANDOFF_LINE_FLOOR` semantics.

The existing in-panel update card is updated to v0.64.11 and the live scenario:

```text
06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

No new top-level UI registration is added.

## Permanent regression

Added required golden suite:

```text
bounded-telemetry-capsule
```

Files:

```text
products/simcore/tests/suites/bounded-telemetry-capsule-v06411.test.mjs
products/simcore/tests/fixtures/bounded-telemetry-capsule/case.json
```

The suite is registered in `batch-a` and, while production is still v0.64.10, builds the actual v0.64.11 bytes from `ctx.source` inside a temporary directory before running behavior checks. Thus PR CI exercises builder anchors and candidate syntax before PR1 merge.

Executable stress shape includes:

```text
runtime prompt >=45,000 chars and >64 lines
system0 >=350,000 chars
request >64 signatures
established cache trajectory
```

It calls the actual tracker exports and actual telemetry capsule capture, asserting:

```text
prompt export <=4,096
request topology export <=6,144
trajectory export <=2,048
complete serialized capsule <=16,384
SESSION unavailable -> exactly one HOST_LOCAL WRITTEN
Host-local boot read/consume remains one-shot
first post-reload topology >64 -> PREFIX_FLOOR
PREFIX_FLOOR -> SKIPPED_BOUNDED_REOBSERVE
second natural request -> compact continuity source absent / rich path resumed
```

## Runtime audit lens

Using `docs/SIMCORE_PRE_RELEASE_RUNTIME_AUDIT_PROMPT.md` as the standing audit lens:

- Memory pressure: compact durable arrays are hard-count bounded; rich state lifetime is unchanged.
- Retained references: compact handoff is discarded after first natural request; no new long-lived raw chat body owner is added.
- CPU: compact prompt hashing is O(prompt chars) only at checkpoint/export and first compact comparison; request signature work already exists on natural request. No polling/background loop is added.
- Async/race: no new async owner is introduced; output checkpoint remains best-effort telemetry after successful product output.
- Event-loop starvation: no timer or repeated retry path is added.
- Error handling: unrepresentable/oversize component fails closed for durable telemetry while leaving the product output committed.

No new runtime BLOCKER was identified from this static implementation audit before CI. Estimates remain static-analysis estimates until candidate CI and live evidence.

## Tooling anomaly preserved

During release-work setup, one incorrect GitHub write call created an empty root file `tmp-never-create` directly on `main`.

It was immediately removed. Cleanup commit:

```text
5397a9893e51dac819bad0ccdd551f2208b999c1
```

Classification:

```text
R2_06411_TOOL_CALL_MISROUTE
= FIX / TOOLING_CALL_MISROUTE / NON_RUNTIME / PRODUCTION_UNCHANGED / CLOSED
```

The file never touched `release-simcore`, plugin bytes, product manifest, or live evidence. Subsequent blocked writes to a nonexistent branch caused no repository mutation.

## Frozen surfaces

This work does not authorize changes to:

```text
Representation / Edit / Recovery
Broadcast / Frame / Time
Evidence / Lineage / Handoff / Recurrence / Summary
Structure / COMMUNITY / Reaction
provider cache authority
M2-3 ownership extraction
release-system R2.4 design or publisher authority
```

Provider cache remains `UNVERIFIED`.

## Qualification state

At document creation:

```text
implementation branch = runtime/simcore-v0-64-11-bounded-capsule
PR1 = PENDING
SimCore Verify = PENDING
SimCore Required = PENDING
R2.4 dry preflight = PENDING
candidate = NOT CREATED
release-simcore = v0.64.10 unchanged
real long-chat = NOT STARTED
```
