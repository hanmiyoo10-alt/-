# Local Usage Dashboard 5.83 — In-Plugin Release Notes & Diagnostic Guidance Design

Status: **DESIGN READY — IMPLEMENTATION NOT STARTED**

Tracking: #643

Candidate product version: `3.0.0-alpha.5.83`

Expected unchanged components unless implementation evidence proves otherwise:

- Engine `1.6.23`
- Manager `1.3.0`
- Snapshot contract `1`
- Recent Request contract `1`

## 1. Product goal

5.83 should make each installed release self-explanatory without creating a second updater or a second diagnostics system.

The user should be able to answer two questions from inside the plugin:

1. **What changed in this installed version?**
2. **What should I additionally observe or write down if I send Diagnostics for the next version?**

The feature is therefore a small physical-validation handoff, not a changelog browser and not automatic diagnosis.

## 2. Existing surfaces reused

The current product already has:

- a Settings surface with Runtime/Update controls;
- Runtime Diagnostics with Basic and Detailed views;
- `요약 복사`;
- `전체 Diagnostics 복사`;
- `JSON 내보내기`.

5.83 reuses these surfaces and does not introduce a new navigation root, floating-widget mode, network endpoint, bridge endpoint, or persistence subsystem.

## 3. User experience

### 3.1 Entry point

Add a manual button in Settings near Runtime & Update / Diagnostics access:

`업데이트 내역`

The button controls one inline panel. It is never auto-opened.

Required accessibility relationship:

- button: `aria-expanded="false|true"`
- button: `aria-controls="release-notes-panel"`
- panel: stable id `release-notes-panel`
- closed panel: `hidden`

### 3.2 Current-release panel

5.83 v1 shows **only the currently installed release**.

Panel shape:

```text
3.0.0-alpha.5.83
In-Plugin Release Notes & Diagnostic Guidance

이번 업데이트
• ...
• ...

다음 진단 때 확인하면 좋은 것
• ...
• ...

[진단 제출 가이드 복사]
```

No remote history and no older-release list are required in 5.83.

### 3.3 Diagnostic guidance copy

`진단 제출 가이드 복사` copies a small static template derived from release metadata.

Expected semantic shape:

```text
Local Usage Dashboard v3.0.0-alpha.5.83
Release: In-Plugin Release Notes & Diagnostic Guidance

다음 진단 때 확인:
- <diagnostic hint>
- <diagnostic hint>

문제/관찰 한 줄: [직접 작성]
재현 행동: [직접 작성]
필요하면 Runtime Diagnostics > 전체 Diagnostics 복사를 함께 첨부
```

The new copy action does **not** silently append Full Diagnostics, exported JSON, tokens, request identifiers, account identifiers, or inferred recommendations.

Existing Diagnostics copy/export buttons retain their current behavior and remain the evidence source when detailed logs are needed.

## 4. Release metadata authority

The current release spec is the authoring authority.

Starting with 5.83, the current release spec adds:

```json
{
  "highlights": [
    "short human-authored release highlight"
  ],
  "diagnosticHints": [
    "short human-authored physical-observation hint"
  ]
}
```

`releaseTitle` remains the title authority.

### 4.1 Bounds

Fail closed during materialization/regression if:

- `highlights` has fewer than 1 or more than 5 entries;
- `diagnosticHints` has fewer than 1 or more than 5 entries;
- an entry is not a string;
- an entry is empty after trimming;
- an entry exceeds 160 UTF-16 code units;
- metadata contains line-break payload intended to escape the list/template shape.

The implementation may use a stricter equivalent normalization if tests prove the behavior.

### 4.2 Shipped representation

Materialization writes normalized current-release metadata into a static in-plugin constant next to product identity, conceptually:

```js
const RELEASE_NOTES = Object.freeze({
  version: VERSION,
  title: 'In-Plugin Release Notes & Diagnostic Guidance',
  highlights: Object.freeze([...]),
  diagnosticHints: Object.freeze([...]),
});
```

This is build/materialization-time data, not runtime-fetched data.

The 5.83 design does **not** require a `product-manifest.json` format bump. The product manifest remains product/component authority; the release spec remains release-note authoring authority.

## 5. Runtime ownership

Expected narrow ownership:

- `00-runtime-core.part.js`
  - generated `RELEASE_NOTES` constant beside `VERSION`.
- `50-dashboard-context.part.js`
  - pure HTML/text rendering helpers for release notes and diagnostic guidance.
- `60-settings-runtime.part.js`
  - button open/close and clipboard binding using existing idempotent Settings binding style.
- `.github/usage-dashboard/releases/5.83.json`
  - `releaseTitle`, `highlights`, `diagnosticHints`.
- 5.83 materializer
  - bounded metadata normalization + product version update.
- `p48-release-notes-diagnostic-guidance.cjs`
  - feature and safety regression.

Do not move this feature into:

- Engine;
- Bridge Manager;
- request ledger;
- bridge I/O;
- refresh scheduler;
- lifecycle scheduler;
- floating widget.

## 6. State and lifecycle rules

The panel's open state is intentionally **DOM-only**.

Do not add:

- `releaseNotesSeenVersion`;
- unread/read flags;
- persisted panel-open state;
- update pop-up timers;
- delayed badge removal;
- background release-note polling.

A Settings rerender or refresh may close the panel. That is acceptable for v1 and avoids a new storage write or persisted state surface.

Bindings should use the existing replacement pattern (`element.onclick = ...`) so rerender/rebind cannot accumulate event listeners.

## 7. I/O and performance contract

Opening or closing Release Notes must cause:

- network requests: `0`
- bridge calls: `0`
- CLI calls: `0`
- refresh enqueue: `0`
- scheduler work: `0`
- storage writes: `0`
- new timers: `0`

Copying the diagnostic guidance may perform only the existing clipboard write path.

The runtime footprint is bounded to:

- small static strings;
- one hidden/visible inline DOM block;
- existing Settings button handler ownership.

No new collection loop or retained unbounded history is allowed.

## 8. Privacy and truthfulness

Release Notes and diagnostic hints are human-authored repository metadata.

They must not:

- infer account state from Diagnostics;
- claim a problem exists merely because a metric is unknown;
- expose tokens or raw identifiers;
- contain automatically generated account-specific text;
- invent source truth.

If a future release has no useful observation hint, the release should still provide a short truthful hint such as verifying READY/Health and the changed UI behavior rather than inventing telemetry.

## 9. Regression design — P48

Add `p48-release-notes-diagnostic-guidance.cjs` and register it in the full registry.

P48 should prove at least:

1. Current installed product version, release title, highlights, and diagnostic hints match the current resolved release spec.
2. Metadata count/type/length bounds fail closed.
3. The button and panel have explicit accessibility linkage.
4. The panel renders current release only.
5. Opening/closing has no persistence, refresh, bridge, network, timer, or scheduler path.
6. Guidance copy contains version/title, all current diagnostic hints, manual observation/reproduction placeholders, and the existing Full Diagnostics instruction.
7. Guidance copy does not contain token keys or raw identifier surfaces.
8. Existing `요약 복사`, `전체 Diagnostics 복사`, and `JSON 내보내기` remain present and unchanged in authority.
9. Plugin module registry remains 24 modules in the same order unless an independently justified modularization change is approved.
10. Engine `1.6.23` bytes remain unchanged for 5.83 unless a separate Engine requirement is discovered and explicitly approved.
11. Full Usage Dashboard registry GREEN.
12. Runtime Audit Standard review finds no new OOM/leak/CPU/async/event-loop/resource-lifecycle blocker.

P48 should be current-release/spec-driven rather than freezing only literal 5.83 wording, so future releases cannot accidentally ship stale Release Notes metadata.

## 10. Suggested 5.83 authoring content

Initial highlights should describe the feature itself, for example:

- 플러그인 안에서 현재 버전의 간단한 업데이트 내역을 확인할 수 있음.
- 다음 진단 제출 때 확인하면 좋은 항목을 현재 버전 기준으로 함께 안내함.
- 진단 제출 가이드를 복사할 수 있으며 기존 Diagnostics 수집 방식은 변경하지 않음.

Initial diagnostic hints should focus on the feature's own physical acceptance, for example:

- 업데이트 내역 버튼이 정상적으로 열리고 닫히는지 확인.
- 표시되는 버전/제목/업데이트 항목이 실제 설치 버전과 맞는지 확인.
- 진단 제출 가이드 복사가 동작하고 열기/복사만으로 새로고침이 발생하지 않는지 확인.
- 문제가 있으면 Runtime Diagnostics의 상태와 전체 Diagnostics를 함께 첨부.

Exact product wording may be shortened during implementation, but it must remain human-authored and source-of-truth aligned.

## 11. Physical acceptance after deployment

The release is not physically accepted until a real PocketRisu device confirms:

1. Product `3.0.0-alpha.5.83` is installed.
2. Engine `1.6.23` and Manager `1.3.0` remain healthy unless intentionally changed.
3. `업데이트 내역` opens/closes on the phone without layout overflow.
4. Version/title/highlights are correct for 5.83.
5. Diagnostic hints are concise and useful.
6. `진단 제출 가이드 복사` produces readable text.
7. Open/close/copy does not trigger a refresh or alter sync state.
8. Existing Basic/Detailed/Full Diagnostics still work.
9. READY / Health / active errors / failures remain plausible after normal use.

Deployment completion and physical acceptance remain separate states.

## 12. Explicit non-goals

5.83 does not add:

- historical changelog browsing;
- runtime GitHub fetch;
- remote release-notes API;
- automatic update popup;
- unread badge;
- seen-version persistence;
- automatic issue upload;
- automatic Diagnostics attachment;
- AI diagnosis;
- recommendation inference from telemetry;
- new Engine/Manager protocol;
- E15 or release-control generation changes.

## 13. Future history expansion threshold

Only add release history if real use demonstrates that current-release-only notes are insufficient.

If history is later added, prefer a small bounded static list generated at materialization time. Do not introduce runtime GitHub/network fetch merely to display old changelog entries.

## 14. Bottom line

5.83 is intentionally small:

```text
current release spec
  -> bounded human-authored highlights + diagnostic hints
  -> materialized static RELEASE_NOTES
  -> Settings update-notes panel
  -> optional guidance copy
  -> existing Runtime Diagnostics for actual evidence
```

The feature should improve the quality of physical feedback without adding another updater, another collector, or another lifecycle owner.
