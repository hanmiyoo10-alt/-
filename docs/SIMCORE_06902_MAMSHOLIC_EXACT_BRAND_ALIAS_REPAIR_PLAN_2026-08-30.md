# SimCore v0.69.2 MamsHolic Exact Brand Alias Repair

Date: 2026-08-30 KST

Status: **DESIGN FROZEN · IMPLEMENTATION AUTHORIZED · PREFLIGHT PASS**

Classification: **POST-M2 QUALITY / COMMUNITY CLASSIFIER MINI**

## Release identity

```text
Target version: 0.69.2
Release name: MamsHolic Exact Brand Alias Repair
Release class: QUALITY / COMMUNITY CLASSIFIER MINI
Major checkpoint: M2-6 unchanged
Parent production: v0.69.1 LIVE_PASS
release-simcore parent: 5dc5ec1099c6097a6a0e46effeb826889a4741c3
parent latest/install blob: de764f2c98174aa7f8ae8dc356d83aa6851b3745
```

Root evidence:

`docs/SIMCORE_06901_LIVE_MAMSHOLIC_GENERIC_DESCRIPTOR_ALIAS_GAP_2026-08-30.md`

User authorization: the user explicitly requested that this be handled now as a separate mini release.

## Frozen change

Add one exact/anchored known-brand family before generic fallback:

```js
{ key: '맘스홀릭', group: '학부모/지역', re: /^맘스홀릭(?=$|[\s\-–—/:|·])/i },
```

The canonical reaction/state key remains the existing `맘카페` family semantics only where canonicalization already applies; this exact brand family's group is `학부모/지역` and its source is `exact`.

Required positive fixtures:

```text
맘스홀릭
맘스홀릭 / 자유게시판
맘스홀릭 / 육아 이야기
```

Required preservation controls:

```text
맘카페 / 자유게시판 -> existing exact family remains exact
네이버 카페 / 자유게시판 -> existing exact family remains exact
맘스홀릭 / 예비맘·육아 수다방 -> still recognized
맘스터치 / 자유게시판 -> unknown
게임홀릭 / 수다방 -> unknown
```

## Frozen non-goals

Do not change:

- generic `맘` matching or broaden substring recognition;
- `COMMUNITY_CLASSIFIER_VERSION` (remains 3);
- migration/backfill caps or schema;
- Structure diversity semantics;
- Reaction grammar;
- Prompt / v0.70 Current Task Primacy Guard;
- State Reconcile / Kernel / Session / Representation / Edit / Mirror;
- M2 architecture or checkpoint;
- release-system R2.x.

## Static acceptance

Require:

```text
metadata/runtime/HOST identity = 0.69.2
latest.js == install.js
node syntax PASS
exact 맘스홀릭 recognition PASS
generic-descriptor target warning input now contributes 학부모/지역
negative false-positive controls PASS
COMMUNITY_CLASSIFIER_VERSION remains 3
ALIAS_BACKFILL_ASSISTANT_LIMIT remains 12
ALIAS_BACKFILL_MESSAGE_LIMIT remains 48
M2-6 architecture frozen
all permanent SimCore CI PASS
```

## Live acceptance

After publication, one natural Mode C turn is sufficient for the runtime health gate.

If a natural `[맘스홀릭 / 자유게시판]` specimen appears, direct absence of unknown-platform/diversity warning is bonus positive evidence. Do not force generations solely to obtain the label; deterministic fixtures are classifier authority.

## Disposition

```text
06902_DESIGN = FROZEN
06902_IMPLEMENTATION_AUTHORIZED = YES
06902_OWNER = COMMUNITY
06902_M2_CHECKPOINT = M2-6 UNCHANGED
07000_PROMPT_WORK = SEPARATE / NOT MIXED
```
