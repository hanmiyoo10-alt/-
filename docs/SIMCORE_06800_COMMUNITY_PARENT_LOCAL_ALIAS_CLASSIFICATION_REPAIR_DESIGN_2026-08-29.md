# SimCore v0.68.0 — Community Parent-Local Alias Classification Repair Design

Date: 2026-08-29 KST

Status: **DESIGN SELECTED · CONDITIONALLY FROZEN · IMPLEMENTATION BLOCKED UNTIL v0.67 TERMINAL LIVE-STATE CONVERGENCE · NO RUNTIME CHANGE**

Planned version:

```text
0.68.0
```

Planned release name:

```text
Community Parent-Local Alias Classification Repair
```

Release type:

```text
QUALITY / CONTRACT MINI
NOT AN M2 ARCHITECTURE CHECKPOINT ADVANCE
```

Expected durable architecture checkpoint after v0.67 closes:

```text
M2-5 remains current
```

Primary evidence:

- `docs/SIMCORE_06800_COMMUNITY_PARENT_LOCAL_ALIAS_ROOT_CAUSE_2026-08-29.md`
- `docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_WATCH_2026-08-28.md`
- `docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_RECURRENCE_2026-08-28.md`
- `docs/SIMCORE_POST_06600_DEFERRED_WATCH_TRIAGE_2026-08-29.md`
- exact v0.67 `release-simcore/plugins/simcore/latest.js`

---

## 1. Selection decision

The next proposed SimCore runtime version is:

```text
v0.68.0
Community Parent-Local Alias Classification Repair
```

Reason for selection:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
→ recurrence high-confidence
→ root owner still unproven
→ no safe runtime repair contract yet

MANUAL_EDIT_REBUILT 40.224s
→ high-severity WATCH
→ one more comparable multi-tens-second specimen required for FIX promotion

B_START closure wording
→ state remains safe
→ WATCH only

COMMUNITY platform diversity
→ recurrence proven
→ exact v0.67 source now proves root owner and failure mechanism
→ narrow repair contract available
```

The selection rule is evidence-first: choose the deferred defect that is now safely attributable, not merely the most visually severe symptom.

---

## 2. Root cause frozen for design

Exact v0.67 Community classifier behavior:

```text
exact PLATFORM_FAMILIES first
→ if no exact match, parentLocalAliasInfo fallback
```

Fallback currently does:

```text
whole header text
→ split on / or |
→ only first segment is used for parent-identity predicates
→ whole text is used for generic communitySignal
```

For the recurrent live label:

```text
맘스홀릭 / 예비맘·육아 수다방
```

this yields:

```text
namePart = 맘스홀릭
parent identity predicates = all false
communitySignal = true
alias result = null
```

Structure then correctly receives an unknown platform and reports only two recognized groups.

Frozen ownership conclusion:

```text
Community classifier = repair owner
Structure             = judge only, no semantic change
Reaction              = unchanged
Representation        = unchanged
Edit Reconcile        = unchanged
```

---

## 3. Repair objective

Recognize an explicit parent/local community descriptor after a separator without broadening arbitrary substring classification.

Target positive case:

```text
[맘스홀릭 / 예비맘·육아 수다방]
→ key    맘카페
→ group  학부모/지역
→ source alias-parent-local
```

Then the known three-section specimen becomes:

```text
더쿠       -> 여초
맘스홀릭…  -> 학부모/지역
에펨코리아 -> 남초

recognized distinct groups = 3
```

No diversity requirement is relaxed.

---

## 4. Slice A — descriptor-aware parent/local alias classification

### 4.1 Exact-family authority remains first

Do not reorder or weaken `PLATFORM_FAMILIES`.

```text
exact rule matched
→ exact result remains authoritative
→ alias fallback not consulted
```

### 4.2 Existing first-segment heuristics remain

Keep current narrow first-segment rules for regional mom/parent aliases.

Do not replace them with a generic `includes('맘')` rule.

### 4.3 Add bounded descriptor evidence

Directional implementation:

```text
segments = header split on /, |, ｜
name segment = segments[0]
descriptor segments = segments[1..]
```

A descriptor may establish parent/local identity only if the same bounded descriptor contains both:

```text
A. strong parent/audience token
AND
B. community-shaped token
```

Strong parent/audience token examples allowed by the design:

```text
예비맘
육아맘
엄마 / 엄마들
어머님 / 어머님들
학부모 / 학부모들
bounded standalone 맘 / 맘들
```

Community-shaped token remains bounded to the existing concept family, such as:

```text
모여라
모임
카페
소통
수다 / 수다방
커뮤니티
게시판 / 자유게시판
정보방
사랑방
놀이터
라운지
톡
방
```

Target descriptor:

```text
예비맘·육아 수다방
→ parent token YES
→ community token YES
→ descriptorParentCommunity YES
```

Final alias condition:

```text
existingFirstSegmentParentIdentity
OR descriptorParentCommunity
```

combined with the existing community-shaped safety requirement.

### 4.4 False-positive controls

At minimum require negative fixtures for:

```text
맘스터치 / 자유게시판
게임홀릭 / 수다방
```

These must not become `학부모/지역` merely because one token superficially resembles the target.

Also preserve exact-family precedence when a known exact platform contains descriptive text.

---

## 5. Slice B — classifier version and bounded history migration

Current production:

```text
COMMUNITY_CLASSIFIER_VERSION = 2
```

v0.68 target:

```text
COMMUNITY_CLASSIFIER_VERSION = 3
```

Reason:

A previously unknown platform can become recognized as canonical `맘카페`. Existing reaction maxima for recent visible history must not start from a false zero floor.

Reuse the existing bounded migration owner:

```text
Session.migrateCommunityClassifierIfNeeded
```

Frozen migration bounds remain:

```text
ALIAS_BACKFILL_ASSISTANT_LIMIT = 12
ALIAS_BACKFILL_MESSAGE_LIMIT   = 48
```

Required behavior:

```text
v2 state + recent target alias history
→ bounded scan
→ target sections classified alias-parent-local
→ reaction maxima reconstructed into canonical key 맘카페
→ classifierVersion becomes 3
→ second migration call idempotently skips
```

Forbidden:

```text
new persistent key/schema
unbounded history scan
raw-body retention
new storage surface
cross-family reaction-max inheritance
```

The existing `communityAliasRepairStats` receipt remains the observability surface.

---

## 6. Slice C — Structure contract stays unchanged

Structure must continue to judge exactly the existing requirements.

Preserve:

```text
three COMMUNITY sections where required
three recognized distinct platform groups
unknown platform warning when classifier truly returns no group
separator/title/comment/reaction checks
quarantine/state-commit behavior
```

The repair succeeds by supplying the correct Community classification, not by suppressing Structure warnings.

Required regression:

```text
[더쿠 / 스퀘어]
[맘스홀릭 / 예비맘·육아 수다방]
[에펨코리아 / 포텐터진 게시판]

→ groups = 여초, 학부모/지역, 남초
→ distinct group count = 3
→ no unknown-platform warning
→ no platform-diversity warning
```

---

## 7. Frozen non-goals

v0.68 does not include:

```text
PARTIAL_PREVIOUS_TURN_REPLAY repair
provider/model generation steering
MANUAL_EDIT_REBUILT latency optimization
B_START closure-expression heuristic repair
Reaction grammar changes
COMMUNITY section-count changes
diversity requirement relaxation
new generated-platform prompt selection policy
PRE_SIMCORE cache/history engineering
provider-cache work
M2-6 architecture work
Kernel/State/Request Pipeline refactor
R2.6 activation/status convergence
release-system/repository-system redesign
```

R2.6 administrative convergence remains a separate control-plane task and must not be hidden inside a runtime version.

---

## 8. Static / differential acceptance matrix

### 8.1 Identity / artifact

After implementation is authorized:

```text
metadata version = 0.68.0
SIMCORE_RUNTIME_VERSION = 0.68.0
HOST_COMPAT_VERSION = 0.68.0
latest.js == install.js
node syntax PASS
```

### 8.2 Positive classifier controls

```text
맘스홀릭 / 예비맘·육아 수다방
→ key 맘카페
→ group 학부모/지역
→ source alias-parent-local
```

Also preserve current parent/local positives already accepted by v0.67.

### 8.3 Negative classifier controls

```text
맘스터치 / 자유게시판
→ not parent/local alias

게임홀릭 / 수다방
→ not parent/local alias
```

No generic `맘` substring classification.

### 8.4 Exact-family precedence

All current exact `PLATFORM_FAMILIES` mappings remain byte/decision-equivalent except release identity adjacency required by the build.

### 8.5 Structure integration

Known recurrent three-platform fixture:

```text
unknown platform warnings = 0
recognized groups = 3 distinct
Structure safe result otherwise unchanged
```

Malformed/actually unknown platforms must still warn.

### 8.6 Migration

```text
classifier v2 -> v3 bounded migration PASS
target alias backfill PASS
maxima canonical key = 맘카페
idempotent second run PASS
assistant/message scan caps unchanged
no state schema delta
```

### 8.7 Frozen unrelated regressions

Permanent suites must retain:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT
Deferred Mirror guards
Output Compat
Bootstrap Migration
Output Finalize
Broadcast lifecycle
Frame / Time / Continuity
Evidence / Lineage / Handoff / Recurrence
Summary Scope
Reaction semantics
Host-local telemetry
persistent Core schema
```

---

## 9. Builder mutation envelope

The eventual v0.68 builder must start from the exact live-complete v0.67 production bytes.

Expected runtime mutation envelope:

```text
1. version identity 0.67.0 -> 0.68.0
2. Community classifier version 2 -> 3
3. bounded descriptor-aware parent/local alias predicate
4. current release/operator-card metadata
5. only version-sensitive regression bridges required by the existing release workflow
```

No Structure semantic mutation should be necessary.

Fail closed if implementation requires:

```text
relaxing distinct-family count
changing Reaction grammar
new persistent state field
new network/timer/host surface
unbounded migration
broad platform taxonomy rewrite
prompt-generation steering changes
```

---

## 10. Real long-chat acceptance plan

Static/differential evidence is primary because the target label is generated nondeterministically.

### Stage A — ordinary Community continuity

At least one natural Mode C/COMMUNITY request after publication:

```text
Version 0.68.0
binding BOUND
output COMMITTED
mirror COMMITTED when exact/safe
Structure/Frame continuity healthy
no new Community classifier fault
```

An ordinary Mode A sanity specimen is useful but not a separate mandatory gate if permanent regressions are clean.

### Stage B — target alias when naturally available

If a natural output contains:

```text
맘스홀릭 / 예비맘·육아 수다방
```

preserve the packet as direct live positive evidence and require:

```text
no 알 수 없는 플랫폼 warning
recognized distinct groups includes 학부모/지역
no diversity warning attributable to that section
```

Do not force repeated generations solely to obtain the label. Deterministic static integration fixtures are authority for the exact target classifier branch.

### Stage C — migration observation when naturally visible

On first v0.68 session using pre-v3 state, preserve bounded classifier migration receipt if exposed:

```text
classifierVersion 3
bounded assistant/messages scan
no bootstrap/state corruption
```

If the existing state is already fresh/no migration is needed, `NOT_EXERCISED` is not a failure.

---

## 11. Implementation gate

Design may be selected now, but implementation must not begin until the current release completes the mandatory product lifecycle.

Required unlock:

```text
v0.67 real-long-chat evidence accepted
+
v0.67 validation_status -> LIVE_PASS
+
durable checkpoint -> M2-5 through normal state convergence
+
CURRENT_DEVELOPMENT / manifest terminal sync complete
+
exact final v0.67 release-simcore source re-read confirms Community classifier shape unchanged from this design audit
+
no newly promoted blocker invalidates the repair boundary
→ v0.68 implementation may be authorized
```

Current state:

```text
06800_DESIGN_SELECTED             = YES
06800_DESIGN_CONDITIONALLY_FROZEN = YES
06800_IMPLEMENTATION_AUTHORIZED   = NO
```

---

## 12. Deferred/WATCH attention during v0.68

Keep visible but separate:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
→ HIGH investigation priority
→ >=3 natural specimens
→ generation/result variability remains plausible
→ no runtime repair until owner proven

06600_GENUINE_EDIT_REBUILD_LATENCY_40_224S
→ high-severity performance WATCH
→ next comparable recurrence promotes FIX investigation

B_START_OPEN_SCENE_CLOSURE_EXPRESSION
→ WATCH
→ state/lifecycle harm still unproven

PRE_SIMCORE cache/history
→ WATCH
→ provider cache UNVERIFIED

R2.6 activation/status convergence
→ release-system FIX
→ separate transaction
```

A newly promoted BLOCKER may reorder work, but unrelated repairs must not be bundled into v0.68.

---

## 13. Workflow

After implementation authorization:

```text
main design/evidence authority
→ dedicated v0.68 runtime branch
→ exact live-complete v0.67 production-source builder
→ Community classifier + v3 migration implementation
→ static/differential proof
→ permanent CI
→ append-only candidate materialization
→ exact approval
→ release-simcore publication
→ real long-chat validation
→ terminal main docs/state sync
```

`release-simcore` remains runtime/deployment authority and `main` remains design/evidence/admin authority.

`latest.js` and `install.js` must remain byte-identical.

---

## 14. Design verdict

```text
NEXT_PROPOSED_VERSION
= v0.68.0

NAME
= Community Parent-Local Alias Classification Repair

TYPE
= QUALITY / CONTRACT MINI

ROOT CAUSE
= Community parentLocalAliasInfo descriptor-boundary miss

REPAIR OWNER
= Community

STRUCTURE
= JUDGE UNCHANGED

CLASSIFIER VERSION
= 2 -> 3

M2 CHECKPOINT
= REMAINS M2-5

IMPLEMENTATION
= BLOCKED UNTIL v0.67 TERMINAL LIVE-STATE CONVERGENCE
```
