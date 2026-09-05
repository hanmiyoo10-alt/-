# SimCore v0.70.7 Implementation Authorization

Date: 2026-09-05 KST
Status: **IMPLEMENTATION AUTHORIZED · FROZEN DESIGN · RUNTIME OBSERVABILITY MINI**
Classification: **SIMCORE · v0.70.7 · IMPLEMENTATION AUTHORIZATION**

## 1. Operator authorization

The operator explicitly approved proceeding with the already-frozen SimCore runtime release:

```text
Version: 0.70.7
Release: Output Snapshot Set Cost Attribution
```

Canonical design authority:

- `docs/SIMCORE_07007_OUTPUT_SNAPSHOT_SET_COST_ATTRIBUTION_DESIGN_2026-09-05.md`

The design was frozen and version-reserved in PR #1528.

## 2. Fresh authority readback

Implementation authorization is bound to exact current authority:

```text
main = ed69c63fd33a6ae51a2e2fd02f4765d913df8d51
production = 0.70.6 Manual Edit Redundant Prune Elision
production validation = LIVE_PASS
checkpoint = M2-6
release-simcore = e2552d7f93456652c94d9df37b0c253f12f2d900
production blob = 83714d78537906fc9f2060c06c9e4ce349568a19
R2.11 = IMPLEMENTATION CLOSED / QUALIFIED / NORMAL PATH ACTIVE
```

Fresh production source readback confirms the frozen design seam remains exact:

```text
SnapshotStore.save
  -> one JSON.stringify(state)
  -> awaited backend.set(key, payload)
  -> metrics serializeMs / setMs / optional pruneMs

SnapshotStore.saveTurn
  -> already records metric.payloadChars = payload.length

ordinary out save
  -> awaited this.store.save('out', outIndex, result.state, { prune: false, metric: outMetric })
  -> outSerializeMs = outMetric.serializeMs
  -> outSetMs = outMetric.setMs
  -> outPruneMs = 0
```

No source contradiction with the frozen design was observed.

## 3. Authorized implementation scope

Implementation may do only the frozen v0.70.7 attribution work:

1. advance metadata/runtime/host/operator-card identity from 0.70.6 to 0.70.7 / `Output Snapshot Set Cost Attribution`;
2. in ordinary `SnapshotStore.save()`, expose `metric.payloadChars = payload.length` from the already-created serialized payload;
3. propagate exact ordinary-output `outPayloadChars` from that metric;
4. derive a pure diagnostic-only set-ms-per-1K-chars value only for finite non-negative set time and positive payload chars;
5. render one bounded output-snapshot-set diagnostic line carrying payload chars, serialize time, set time, normalized cost, `PLUGIN_STORAGE_SET_ITEM`, inline-prune-disabled disposition, and exact confidence;
6. add deterministic builder/regression/fixture coverage and validation profile 0.70.7;
7. preserve R2.11 profile-driven validation inventory behavior so no R2.9 manual release-identity census row is added.

## 4. Frozen prohibitions

This authorization does not permit:

```text
second JSON.stringify
new storage read/write/key scan
new await/yield/timer/worker/retry
storage compression or format/schema change
state field removal
out-save deferral
pluginStorage replacement
retention redesign
manual-edit semantic change
mirror redesign
provider/cache claim or optimization
release-system redesign
R2.11 modification beyond normal successor-profile validation
```

The authoritative ordinary out save must remain awaited and `OUT_STORAGE` must remain exactly `outSetMs`.

## 5. Required validation

Before publication, candidate qualification must prove at minimum:

```text
latest.js == install.js
metadata/runtime/host/operator card = 0.70.7
parent production = exact v0.70.6 production
SnapshotStore.save JSON.stringify count unchanged
backend set count/order/await unchanged
payloadChars = existing payload.length
outPayloadChars = exact serialized out-state char length
ratio finite only when eligible; otherwise n/a/unresolved
ordinary out save prune:false unchanged
persistent schema / prompt compiler / community classifier unchanged
protected side-effect marker counts unchanged
R2.11 profile inventory accepts exact 0.70.7 profile without a new manual R2.9 identity-census row
```

## 6. Release workflow

The authorized sequence is:

```text
dedicated v0.70.7 implementation branch
-> exact-head static/permanent CI
-> implementation evidence merged to main
-> candidate request / immutable candidate
-> exact approval
-> Permanent Release to release-simcore
-> production readback
-> publication evidence
-> HUMAN real-long-chat Stage A/B/C
-> terminal classification and LIVE_PASS close
-> final main continuity synchronization
```

Any anomaly must be preserved immediately and classified `WATCH / DEFER / FIX / BLOCKER` before advancement.

## 7. Disposition

```text
V07007_DESIGN = FROZEN
V07007_VERSION = RESERVED
OPERATOR_APPROVAL = YES
FRESH_SOURCE_PREFLIGHT = PASS
IMPLEMENTATION_AUTHORIZATION = EXECUTABLE
NEXT = DEDICATED v0.70.7 IMPLEMENTATION BRANCH
```
