# SimCore v0.70.9 Implementation Authorization

Date: 2026-09-06 KST
Status: **IMPLEMENTATION AUTHORIZED · DEDICATED #1589 REPAIR · RUNTIME**
Release: **v0.70.9 Inline Planning Marker Hygiene Guard**
Classification: **VISIBLE OUTPUT HYGIENE / OUTPUT COMPAT MINI**

## 1. Authority

Frozen design:

- `docs/SIMCORE_07009_INLINE_PLANNING_MARKER_HYGIENE_GUARD_DESIGN_2026-09-06.md`
- design PR `#1599`
- design merge `5cbb25ab71225a6b9451b69f898d368bfd26f947`

Primary incident:

- tracking `#1589`

Operator authorization:

```text
IMPLEMENT v0.70.9 = YES
```

The operator explicitly authorized implementation after the design freeze.

## 2. Fresh pre-implementation authority

At authorization capture:

```text
main = 2017aaad81d43392e4f1d2b2dc22283f9fa8b3f1
production version = 0.70.8
production release = Repeat-Send Representation Rewind Guard
release-simcore commit = 01010564649a033e02a0658a167f5f38a6a23632
production latest/install blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
latest.js == install.js = VERIFIED
validation = PENDING_REAL_LONG_CHAT
major checkpoint = M2-6
```

The current production live gate remains v0.70.8 `PENDING_REAL_LONG_CHAT`. v0.70.9 is nevertheless authorized as the dedicated repair for #1589, a visible-output hygiene FIX found during the v0.70.8 long-chat path. This authorization does not close or rewrite the v0.70.8 human evidence record.

## 3. Exact implementation boundary

Authorized runtime change is limited to the frozen Output Compat repair:

```text
standalone physical line
+ outside Markdown fenced code
+ exact case-sensitive key internal_memo:
+ exact ┣ ... ┫ reserved delimiters
+ one-line non-empty payload <= 512 UTF-16 code units
+ no embedded right delimiter
-> strip reserved marker line before envelope canonicalization
-> emit bounded non-payload diagnostic provenance when stripped
```

Reserved grammar identity:

```text
INLINE_INTERNAL_MEMO_V1
```

The implementation must remain fence-aware and line-oriented. It must preserve ordinary prose, inline code, fenced code, blockquotes, inline occurrences, malformed/wrong-key forms, empty payloads, and payloads over 512 code units.

## 4. Frozen owner and required regression

Primary owner:

```text
Output Compat / visible-output hygiene
```

Permanent executable regression must exercise the production owner and include at least:

1. exact observed standalone marker stripped;
2. two separated valid markers both stripped;
3. ``` fenced marker preserved;
4. ~~~ fenced marker preserved;
5. inline marker text preserved;
6. blockquoted marker preserved;
7. ordinary `internal_memo` prose preserved;
8. malformed/wrong-key marker preserved;
9. payload > 512 preserved;
10. existing THOUGHTS_COMPAT preamble behavior unchanged;
11. ordinary no-marker output byte-equivalent;
12. `latest.js == install.js`;
13. node syntax / Contracts / active SimCore required verifier PASS.

## 5. Frozen non-goals

No authorization is granted for:

```text
#1545 CURRENT_DEVELOPMENT documentation drift repair
#1546 Community alias repair
#1556 repeat-send pre-snapshot performance work
stale same-head child run selection FIX
storage latency optimization
provider/cache work
Representation/Edit Reconcile changes
Frame/Time/Broadcast/Community changes
release/repository system restructuring
persistent schema changes
new Host/network/storage/timer/retry/polling/background-worker surfaces
```

Blind global keyword stripping is forbidden.

## 6. Mandatory sequence

```text
1. durable authorization record on main
2. fresh main + release-simcore/source preflight
3. dedicated v0.70.9 implementation branch
4. frozen-scope Output Compat implementation + direct-owner regression
5. static/permanent CI qualification
6. implementation evidence on qualified exact head
7. implementation merge to main
8. fresh append-only candidate/release transaction
9. exact approval + Permanent Release
10. direct release-simcore readback, latest.js == install.js
11. real long-chat three-lens validation
12. #1589 evidence close/reclassification
13. main continuity/long-term documentation synchronization
```

Any anomaly is preserved before repair and classified `WATCH / DEFER / FIX / BLOCKER`.

## 7. Current disposition

```text
V07009_DESIGN = FROZEN
V07009_IMPLEMENTATION_AUTHORIZED = YES
V07009_IMPLEMENTATION = NOT YET STARTED
TARGET = #1589 ONLY
OWNER = OUTPUT_COMPAT
PRODUCTION = v0.70.8 UNCHANGED
release-simcore MUTATION BY THIS AUTH RECORD = NONE
```
