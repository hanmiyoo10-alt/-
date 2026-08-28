# SimCore v0.64.11 — Bounded Telemetry Capsule Compaction Implementation Evidence

Date: 2026-08-28 KST
Status: **IMPLEMENTED IN RELEASE AUTHORING · PR1/R2.4 DRY QUALIFICATION PENDING**
Release work item: `#704`
Design authority: `docs/SIMCORE_06411_BOUNDED_TELEMETRY_CAPSULE_COMPACTION_ACTIVATION.md`
Production parent: `v0.64.10 e43ace74241984f21f69299eff690d0c4f483381`
Production blob: `b7d76bd03a435356eeea6948968b0d33ac564ae7`
Intent: `simcore-v0.64.11-intent-01`
Release id: `simcore-v0.64.11-new-01`

## 1. Trigger

Real v0.64.10 long-chat evidence proved the Host-local surface itself usable but three consecutive telemetry capsules were rejected before Host-local `setItem` because the common serialized capsule exceeded the frozen `16,384`-character bound:

```text
44,660
40,291
59,965
```

Classification:

```text
FIX / RUNTIME_TELEMETRY_EXPORT_SHAPE / LIVE_GATE_BLOCKING
HOST_SURFACE_PROVEN / HOST_WRITE_NOT_REACHED / TEST_COVERAGE_GAP_CONFIRMED
```

The fix does not increase the durable capsule cap.

## 2. Implementation shape

The v0.64.10 rich same-generation observer implementations remain unchanged. v0.64.11 adds a bounded adapter layer after module definition and before outer runtime startup.

The adapter wraps only the exported tracker constructors and telemetry capture surface.

### Runtime prompt handoff

- retains at most `64` leading line summaries;
- summaries retain line length + fixed-size FNV-1a hash only;
- retains whole prompt char count and fixed-size whole hash;
- no raw prompt line/body is persisted;
- imported compact state affects exactly the first new-generation observation;
- same full identity may report `EXACT_IDENTITY`;
- mismatch inside retained prefix reports `LINE_BOUND`;
- mismatch after the retained prefix reports `PREFIX_FLOOR`;
- the next same-generation observation uses the unchanged rich tracker again.

### Request topology handoff

- retains at most `64` leading `(role, kind, chars, hash)` signatures;
- keeps exact previous total message/char counts and bounded scalar identity facts;
- system0 handoff retains only first `8` and last `8` 512-char block hashes plus exact total chars/block count;
- a mismatch beyond 64 retained signatures reports `PREFIX_FLOOR` and does not claim an exact first change;
- matching retained system0 edges with changed full signature reports `INTERIOR_CHANGED_UNLOCALIZED / BOUNDED`;
- the next same-generation request returns to the unchanged rich topology tracker.

### Cache trajectory guard

If the first post-reload topology result is `PREFIX_FLOOR`, the existing imported cache-candidate state is returned unchanged with:

```text
SKIPPED_BOUNDED_REOBSERVE
```

No regression/divergence/floor mutation is performed from deliberately incomplete topology evidence.

### Capsule assembly

Engineering component bounds remain:

```text
prompt      4,096 chars
topology    6,144 chars
trajectory  2,048 chars
reserve     2,048 chars
whole       16,384 chars authoritative
```

`captureCompact()` serializes each component for budget attribution, assembles the complete metadata-only capsule, then serializes that complete capsule once for the authoritative whole-capsule check. The prepared encoded value is carried as a non-enumerable runtime-only property and reused by the existing publisher so the complete capsule is not serialized again on the publish path.

If any required component is ineligible/oversize/failed or the complete capsule exceeds `16,384`, `captureCompact()` returns no capsule and diagnostics classify `COMPACTION_FAILED`; SESSION/HOST_LOCAL publication is not attempted by the outer checkpoint. Core output remains committed.

## 3. Frozen transport and authority

Unchanged:

```text
MEMORY -> SESSION -> HOST_LOCAL
one Host-local mailbox key
10-minute TTL
exact location match
one runtime-scoped Host store acquisition
one boot mailbox read
matching consume-before-adopt
foreign location non-destructive
consume failure -> no adoption
provider cache UNVERIFIED
```

No network, polling, timer, queue, backoff, localStorage, IndexedDB, second mailbox key, Core semantic persistence, raw-body persistence or M2-3 ownership movement is added.

## 4. Diagnostics

New bounded attribution surfaces:

```text
Telemetry capsule: COMPACT_V2 · current/16,384 chars
  · prompt current/4,096
  · topology current/6,144
  · trajectory current/2,048
  · prompt precision ...
  · topology precision ...

Handoff precision: prompt ... · topology ...
```

A prompt `LINE_BOUND` / `PREFIX_FLOOR` result is rendered with `>=` rather than as an exact percentage.

The operator card is updated to v0.64.11 / v0.64.10 / v0.64.9 and requires a valid `COMPACT_V2` capsule within the whole cap plus `HOST_LOCAL WRITTEN` before refresh.

## 5. Permanent regression

New required `batch-a` suite:

```text
bounded-telemetry-capsule
```

It uses a long-chat-shaped control:

```text
80 prompt lines
70 request messages
300,000-char system0
```

and proves:

- prompt handoff <=64 summaries and <=4,096 chars;
- topology handoff <=64 signatures and <=6,144 chars;
- system0 edge sketch <=8 head + <=8 tail hashes;
- no raw prompt/request/system body retained in handoff;
- whole compact capsule <=16,384 chars;
- complete capsule authoritative serialization occurs once before and through publication;
- disabled browser session can fall through to one Host-local write;
- prompt first-reload `PREFIX_FLOOR` returns to exact same-generation observation next request;
- topology first-reload `PREFIX_FLOOR` skips trajectory mutation exactly once;
- interior system0 change with matching retained edges is not falsely localized;
- component oversize produces `COMPACTION_FAILED` rather than a partial capsule;
- no new network/storage/timer surface exists in the adapter.

v0.64.11 compatibility wrappers keep the v0.64.10 Host-local and reload controls active and replace only the operator-card version contract.

## 6. R2.4 first genuine use

The PR1 contains exactly one candidate request:

```text
products/simcore/releases/candidate-requests/simcore-v0.64.11-intent-01.json
```

Therefore active R2.4 `GATE_PR1_DRY` must execute the self-contained builder under the canonical single-file temp packaging and run candidate `batch-a` against ephemeral v0.64.11 runtime bytes before PR1 can merge.

The dry result creates no candidate ref, candidate commit, receipt, spec shadow, release id, approval or production mutation.

## 7. Runtime/resource audit

Pre-PR audit classification:

```text
BLOCKER = NONE known before executable qualification
FIX = NONE runtime known before executable qualification
WATCH = compact prompt comparison uses transient line splitting on the first imported observation only
       NON_PERSISTENT / BOUNDED_BY_EXISTING_PROMPT_INPUT / NON_BLOCKING
```

The adapter holds only one compact prompt state and one compact topology state per tracker generation. Retained arrays are hard-capped at 64 prompt summaries, 64 topology signatures, and 8+8 system0 hashes. No unbounded Map/Set, timer, observer, retry queue or background task is added.

The existing rich same-generation trackers already retain full current prompt/topology metadata; v0.64.11 does not expand their same-generation retention contract.

## 8. Tooling incident carried forward

The previously recorded accidental empty `tmp-never-create` artifact was immediately removed by commit `5397a9893e51dac819bad0ccdd551f2208b999c1`.

Classification remains:

```text
FIX / TOOLING_CALL_MISROUTE / NON_RUNTIME / PRODUCTION_UNCHANGED / CLOSED
```

It is unrelated to v0.64.11 runtime behavior but remains preserved as release-authoring evidence.

## 9. Qualification state

Current state before PR1 CI:

```text
runtime builder: IMPLEMENTED
candidate request: ACTIVE intent-01
required regression: REGISTERED
R2.4 PR1 dry qualification: PENDING
SimCore Verify / Required: PENDING
candidate durable materialization: NOT STARTED
exact approval: NOT STARTED
production: unchanged v0.64.10
live gate: not started
```
