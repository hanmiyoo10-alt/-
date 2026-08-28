# SimCore v0.64.9 — Operator Release Card / Live Diagnostic Capture Guide Adjunct

Date: 2026-08-28
Status: **DESIGN FROZEN · v0.64.9 UI-ONLY ADJUNCT AUTHORIZED · IMPLEMENTATION NOT STARTED**
Parent runtime design: `docs/SIMCORE_06409_SESSION_TRANSPORT_ROOT_RESOLUTION_ACTIVATION.md`
Parent production: `v0.64.8 — Output-Complete Telemetry Checkpoint Repair`
Target runtime release: `v0.64.9 — Session Transport Root Resolution`
Class: `OPERATOR_UX / DIAGNOSTIC_GUIDANCE / NON_SEMANTIC`

---

## 1. Decision

Add one operator-facing **Update Notes / Live Test Guide** surface inside the existing SimCore diagnostic panel.

The goal is to let the operator answer, without returning to repository docs:

```text
What changed in this plugin version?
What is the exact live experiment for this version?
When should I copy and submit a diagnostic?
When should I stop instead of continuing the experiment?
What control should I collect after an anomaly?
```

This adjunct is explicitly allowed to ship with v0.64.9 because it supports the active live-evidence transaction, but it must remain mechanically isolated from the Session Transport Root Resolution repair.

The transport repair can PASS/FAIL independently of this UI.
The UI can fail/omit without changing Core runtime semantics or the transport verdict.

---

## 2. Scope amendment to the base v0.64.9 design

The base v0.64.9 activation says the release may only change session-transport root discovery/selection/claim and bounded diagnostics around that transport.

This document is a narrow later design amendment and supersedes that sentence **only enough to authorize the operator-panel adjunct defined here**.

Still forbidden:

```text
Core semantic changes
new prompt semantics
new persistent state
new Host storage
new network fetch
new timer/polling
new top-level Host UI registration
new provider/cache claim
new automatic live-gate mutation
new experiment automation
```

The original v0.64.9 transport contract, frozen semantic owners, live gate, release ordering, and failure routing remain authoritative and unchanged.

---

## 3. UI placement — reuse existing SimCore panel

Current production registers exactly two top-level SimCore UI parts:

```text
Risuai.registerButton({ name: 'SimCore', ... }, openPanel)
Risuai.registerSetting('SimCore', openPanel, ...)
```

The existing panel topbar already contains:

```text
최근 2턴 진단 복사
닫기
```

The new operator surface must be implemented **inside that existing panel**, for example:

```text
최근 2턴 진단 복사 | 업데이트 내역 | 닫기
```

Canonical button label:

```text
업데이트 내역
```

The button toggles an inline bounded card/section in the already-open panel.

Do not register another `Risuai.registerButton`, `registerSetting`, container, hook, or persistent UI part.

Required invariant:

```text
simcoreUiParts count before adjunct = 2
simcoreUiParts count after adjunct  = 2
```

This prevents an operator-help feature from changing reload-safety UI lifecycle topology.

---

## 4. Release Card content model

The panel card is a compiled, bounded point-in-time operator note packaged with the plugin release.

Conceptual shape:

```text
Operator Release Card

Current version
- version
- release name
- one-line purpose

이번 업데이트
- 2–4 short bullets

이번 버전 실험
- named live scenario
- exact ordered steps
- stop/continue conditions

진단을 올려야 하는 경우
- mandatory captures
- immediate anomaly captures
- optional control captures

최근 업데이트
- current + previous 2 releases
- max 3 short bullets per release
```

This is not a release authority database.
It must not claim current GitHub publication/live-pass state beyond the immutable facts compiled into the installed plugin.

---

## 5. Bounded static data contract

Preferred implementation is one tiny frozen object or equivalent pure constants.

Example conceptual data:

```text
version: 0.64.9
name: Session Transport Root Resolution
scenario: 06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT

summary:
- distinguish WINDOW vs GLOBAL_THIS sessionStorage surface
- use bounded real checkpoint fallback when eligible
- expose root-attributed checkpoint/continuity diagnostics

recent:
- 0.64.9 Session Transport Root Resolution
- 0.64.8 Output-Complete Telemetry Checkpoint Repair
- 0.64.7 Cross-Reload Cache Observer Continuity
```

Bounds:

```text
recent release entries <= 3
summary bullets <= 4
bullets per historical entry <= 3
no full changelog body
no release evidence bodies
no raw diagnostic examples longer than needed for operator recognition
```

The repository history remains the durable detailed release record.

---

## 6. v0.64.9 simple update notes

The v0.64.9 card should explain the release in user-facing language, not internal implementation prose.

Canonical semantic content:

```text
v0.64.9 — Session Transport Root Resolution

• sessionStorage를 WINDOW / GLOBAL_THIS 두 경로에서 구분해서 확인
• 실제 체크포인트는 사용 가능한 경로에 쓰고 필요할 때 한 번만 대체 경로 시도
• 진단에 Session surface / 실제 저장 root / memory 상태를 함께 표시
• 세션 저장이 확인된 경우에만 새로고침 실험 진행
```

Previous release summaries may be similarly compact:

```text
v0.64.8
• 정상 출력 완료 뒤 telemetry checkpoint 추가
• checkpoint 결과를 Last Turn Diagnostic에 표시

v0.64.7
• reload 경계를 위한 memory + session telemetry handoff 도입
• provider cache는 계속 UNVERIFIED
```

Do not copy the full plugin header changelog into the panel.

---

## 7. v0.64.9 exact live test card

The card must expose the actual v0.64.9 live gate in operator order.

### Step 1 — install/update sanity

```text
v0.64.9 설치/업데이트
→ 새로고침하지 말고 자연 요청 1회
→ 응답 후 진단 확인
```

Required fields to inspect:

```text
Version: 0.64.9
Runtime boot / generation
Session surface
Telemetry checkpoint
Warnings / Compatibility
RAW current input/output semantic fit
```

### Step 2 — pre-refresh decision

Positive precondition:

```text
Telemetry checkpoint
SESSION WRITTEN via WINDOW
or
SESSION WRITTEN via GLOBAL_THIS
```

If positive:

```text
현재 진단을 1개 복사해서 pre-refresh baseline으로 보존
→ 같은 탭 새로고침 진행 가능
```

Stop conditions:

```text
SESSION UNAVAILABLE
SESSION FAILED
SESSION OVERSIZE
Session surface relation/roots unresolved in a way that prevents WRITTEN
unexpected semantic/runtime regression
```

If a stop condition appears:

```text
새로고침하지 않음
→ 현재 진단 전문 복사
→ 운영자에게 제출
```

### Step 3 — first natural request after refresh

After ordinary same-tab full refresh:

```text
자연 요청 1회
→ 진단 복사
```

Expected:

```text
new runtime generation
Telemetry continuity: ADOPTED · via session · root WINDOW|GLOBAL_THIS
compatible observer state restored where eligible
provider cache UNVERIFIED
normal visible response semantics healthy
```

### Step 4 — second natural request after refresh

Without retry/edit/reroll between the two post-refresh turns:

```text
자연 요청 1회 더
→ 진단 복사
```

Expected:

```text
no repeated adoption of old capsule
trajectory continues
new OUTPUT_COMMIT checkpoint is SESSION WRITTEN
no artificial second BASELINE reset
```

Recommended normal submission packet for v0.64.9:

```text
A. pre-refresh WRITTEN diagnostic
B. first post-refresh diagnostic
C. second post-refresh diagnostic
```

---

## 8. Diagnostic capture policy — three classes

The panel should divide capture advice into three simple classes.

### 8.1 REQUIRED

Capture even when everything looks healthy if the active release test calls for it.

Canonical triggers:

```text
FIRST_NATURAL_AFTER_UPDATE
PRE_BOUNDARY_BASELINE
FIRST_NATURAL_AFTER_BOUNDARY
SECOND_NATURAL_AFTER_BOUNDARY
NAMED_POSITIVE_CONTROL when the release contract explicitly asks for one
```

For v0.64.9 this means the three-packet pre/first/second refresh sequence after the precondition is satisfied.

### 8.2 IMMEDIATE

Capture **before doing another operator action** whenever any of these occurs:

```text
visible output does not answer the current RAW input
previous-turn semantic frame appears to replay in a new response
visible chronology/mode/structure looks wrong despite PASS lines
Stability != PASS when PASS was expected
output != COMMITTED
binding unexpectedly not BOUND
mirror unexpectedly not COMMITTED
stale drops > 0
new or unexpected Warnings
new or unexpected Compatibility diagnostic with possible visible effect
target release field has an unexpected value
runtime version/generation is not what the experiment expects
Telemetry continuity/checkpoint contradicts the current test phase
manual edit routes through an unexpected reconcile path
same logical turn appears with materially different visible content/fingerprint
cache/history/runtime identity changes materially without an expected operator/host boundary
required diagnostic field for the named gate is absent
```

Most important rule:

```text
visible semantic anomaly
+ Warnings: 0
= STILL CAPTURE IMMEDIATELY
```

### 8.3 CONTROL

Controls are collected only **after the original specimen has been preserved**.

Examples:

```text
same-input retry/reroll
intentional manual edit
one natural follow-up turn
repeat boundary only when the release plan explicitly asks for it
```

Rules:

```text
anomalous first generation
→ copy diagnostic first
→ only then retry/reroll if useful

same-input retry
!= second independent natural recurrence

manual edit
→ note the exact operator edit if known
→ preserve the next diagnostic
```

---

## 9. Operator action annotation

When submitting diagnostics, the card should ask the operator to state the physical action in one short line when material.

Recommended labels:

```text
자연 요청
새로고침
동일 입력 재생성
손수정: <짧은 실제 변경>
모드 변경
플러그인 업데이트 직후 첫 요청
```

This reduces later ambiguity between:

```text
natural recurrence
retry/reroll control
manual edit
reload boundary
ordinary next turn
```

The plugin itself must not try to infer or persist every operator action merely for this card.

---

## 10. Submission completeness guidance

The card should explicitly say:

```text
진단은 중간을 자르지 말고 전체 복사
RAW 직전 턴 / 최근 턴 포함 상태 그대로 전달
여러 로그가 한 실험 시퀀스면 가능하면 같이 전달
이상 응답이 나오면 재생성 전에 먼저 원본 진단 저장
```

Do not tell the operator to remove apparently irrelevant fields.
The review standard depends on neighboring and unchanged evidence as well as obvious failure fields.

---

## 11. Current observation helper inside the card

The card may show a tiny **Current observation** summary derived only from already-existing bounded runtime probes.

For v0.64.9 preferred fields are:

```text
Version
Runtime generation
Session surface summary
last Telemetry checkpoint disposition/root
last Telemetry continuity disposition/root
Warnings count
Compatibility count
```

No additional Host/storage operation may be performed to populate this summary.

The card is allowed to derive one non-authoritative operator hint from those existing facts.

Example:

```text
SESSION WRITTEN
→ 권장: pre-refresh 진단 복사 후 새로고침 단계 진행 가능

SESSION UNAVAILABLE / FAILED / OVERSIZE
→ 권장: 새로고침 중지, 현재 진단 제출

Telemetry continuity ADOPTED via session
→ 권장: 첫 post-refresh 진단 저장 후 자연 요청 1회 더
```

The hint must be labeled as guidance, not as a live-gate PASS/FAIL authority.

---

## 12. No automatic experiment execution

The Update Notes card must never:

```text
automatically refresh the page
automatically send a user request
automatically retry/reroll
automatically edit chat
automatically copy diagnostics on every turn
automatically mark a release PASS/FAIL
automatically write GitHub/repository state
```

It only displays bounded guidance and existing observation facts.

Human/operator action remains explicit.

---

## 13. No new runtime hot-path work

The release card exists only when the operator opens the existing SimCore panel.

Forbidden:

```text
per-request changelog formatting
per-output test-plan formatting
background state machine
polling
timer
network fetch
history scan
pluginStorage read/write
sessionStorage read/write solely for the card
new diagnostic observer
```

Preferred flow:

```text
normal runtime unchanged
→ operator opens existing SimCore panel
→ pure bounded card formatter runs once
→ existing bounded probe values are projected
→ operator closes/toggles card
```

The only always-present cost should be tiny static constants/functions loaded with the plugin.

---

## 14. UI failure isolation

The operator card must not be able to break the existing diagnostic panel.

Preferred design:

```text
buildOperatorReleaseCardHtml(existing bounded facts)
→ pure formatter
→ escape all displayed strings
→ if formatter fails, render/omit only the release-card section
→ existing diagnostics/copy/close remain usable
```

No release-card failure may:

```text
add Core warnings
change output status
change runtime mode/state
change reload telemetry
prevent Last Turn Diagnostic copy
prevent panel close
```

---

## 15. Existing UI lifecycle invariants

Permanent invariants for this adjunct:

```text
Risuai.registerButton count unchanged
Risuai.registerSetting count unchanged
simcoreUiParts remains 2 in the ordinary initialized runtime
onUnload UI cleanup loop unchanged in ownership
no new unregister path required
showContainer remains the existing panel path
```

The `Reload safety: ... UI parts 2 ...` baseline should therefore remain unchanged solely because of this feature.

---

## 16. Static maintenance contract for future releases

The release card should become a small mandatory release-maintenance surface after first implementation.

For each future SimCore release, the release build/fixture should verify:

```text
card current version == SIMCORE_RUNTIME_VERSION
card current release name matches release intent
card named live scenario matches the release contract when a live gate exists
card has a bounded current summary
card has a bounded experiment/capture plan
recent list <= 3 releases
no stale current version inside the current section
no network URL fetch is used for card content
```

This prevents the button from becoming a stale second current-state authority.

Historical entries are informational only and need not duplicate every repository release.

---

## 17. Permanent verification requirements

Minimum fixture/static coverage when implemented:

```text
1. existing top-level SimCore UI registration count unchanged
2. panel contains one `업데이트 내역` control
3. control toggles only an inline panel section
4. no new Host UI part registration
5. no network/timer/polling/storage write introduced
6. release-card formatter is pure with respect to Host/runtime semantics
7. all dynamic text is escaped
8. current version equals SIMCORE_RUNTIME_VERSION
9. current release name/scenario match v0.64.9 release intent
10. recent release entries <= 3
11. v0.64.9 instructions contain pre-refresh stop on UNAVAILABLE/FAILED/OVERSIZE
12. v0.64.9 instructions require pre-refresh WRITTEN before refresh
13. first post-refresh capture is required
14. second post-refresh capture is required
15. anomaly instructions say capture before retry/reroll/edit
16. same-input retry is explicitly not natural recurrence
17. visible semantic anomaly remains capture-worthy even with Warnings 0
18. card does not mutate/pass-fail the live gate
19. existing Last Turn Diagnostic copy remains functional
20. existing panel close remains functional
21. ordinary initialized `simcoreUiParts` count remains 2
22. latest.js == install.js
23. v0.64.9 session transport tests remain independently passing
24. frozen semantic owner regression remains passing
```

---

## 18. Relationship to Diagnostic Review Standard

This card is an **operator capture guide**, not a replacement for review.

Canonical separation:

```text
Operator Release Card
= when/what to capture

SimCore Diagnostic Review Standard
= how the captured episode is reviewed

SYS-16 / SYS-21 / live-gate authorities
= how recurrence/classification/gate effect is decided
```

The card should preserve the standard's critical rules:

```text
RAW input/output must be preserved
neighboring packets matter
unchanged facts are evidence
PASS/Warn 0 are scoped signals
retry/reroll is a control
reload proof requires boundary evidence
```

---

## 19. v0.64.9 operator quick card — canonical compact text

A compact implementation may render approximately:

```text
SimCore v0.64.9 — Session Transport Root Resolution

이번 업데이트
• WINDOW / GLOBAL_THIS sessionStorage 경로 구분
• 실제 checkpoint root와 fallback 결과 표시
• 세션 저장 성공 후에만 reload 실험 진행

이번 실험
1. 업데이트 후 새로고침 없이 자연 요청 1회
2. SESSION WRITTEN이면 진단 저장 → 같은 탭 새로고침
3. 첫 자연 요청 → 진단 저장 (ADOPTED via session 확인)
4. 두 번째 자연 요청 → 진단 저장 (재채택/reset 없음 확인)

여기서 멈추고 바로 진단 올리기
• SESSION UNAVAILABLE / FAILED / OVERSIZE
• 현재 입력과 응답 의미가 안 맞음
• 예상 밖 Stability/binding/mirror/warning/compatibility
• 필요한 진단 필드가 없음

이상 응답 발생 시
원본 진단 먼저 저장 → 그 다음에만 동일 입력 재생성
```

The exact presentation may be visually polished but must preserve these semantics.

---

## 20. Final verdict

```text
feature: Operator Release Card / Live Diagnostic Capture Guide
status: DESIGN FROZEN
implementation target: v0.64.9 adjunct
placement: existing SimCore diagnostic panel only
new top-level UI parts: 0
normal simcoreUiParts expected: 2 unchanged
network: NONE
storage write for card: NONE
timer/polling: NONE
Core semantic authority: NONE
live-gate authority: NONE
current update history: current + previous 2 releases, bounded
capture policy: REQUIRED / IMMEDIATE / CONTROL
key operator rule: preserve anomaly before retry/edit/reload continuation
```

Related authority:

- `docs/SIMCORE_06409_SESSION_TRANSPORT_ROOT_RESOLUTION_ACTIVATION.md`
- `docs/SIMCORE_LIVE_06408_PRE_REFRESH_SESSION_UNAVAILABLE_2026-08-28.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md`
- production `plugins/simcore/latest.js` existing `openPanel` / UI registration path
