# Firefox inactive preset lazy hydration

Feature-ID: `firefox-inactive-preset-lazy-hydration`
Area: `shared`
Status: **LIVE_INITIAL_PASS / DATA_SAFE / MEMORY_EFFECT_UNPROVEN / UI_SMOKE_PENDING**

## 목적
Android Firefox LMKD 회수를 줄이기 위해, client reactive runtime이 항상 보유하는 `botPresets` 전체 full object를 줄인다.

현재 목표는 **활성 prompt preset 하나만 full-hydrate하고 inactive preset은 metadata stub으로 유지**하는 것이다.

## 배경
2026-10-13 17:24 LMKD 재현에서:
- active chat은 84 messages뿐이었다.
- active-chat background dehydrate threshold 200에 미달하여 기존 memory guard는 no-op이었다.
- 그럼에도 PocketRisu Gecko tab은 LMKD 회수 직전 RSS 약 470.6MB였다.
- 복원된 PocketRisu-correlated tab13은 PSS 약 488MB / RSS 약 388MB / swap PSS 약 177MB였다.

즉 long active chat만 줄여서는 LMKD class를 충분히 막지 못한다.

## 현재 v1.14 저장본 크기
- full DB JSON: 약 146.0MB.
- chats stub 추정 client shape: 약 39.1MB.
- `botPresets`: 약 24.58MB.
- `plugins`: 약 8.92MB.
- `modules`: 약 2.28MB.
- chats-stripped `characters`: 약 1.12MB.

Prompt preset:
- count: 99.
- active index: `botPresetsId=97`.
- active preset: 약 467KB.
- inactive 98 presets: 약 24.11MB.
- active full + inactive metadata stub 가상 계산: 약 629KB.

이론적 serialized reduction:
- `botPresets` 약 24.58MB → 약 0.63MB.

## 필수 안전 경계
lazy hydration은 다음 semantics를 보존해야 한다.

1. active preset generation/request path는 항상 full object.
2. preset list는 inactive metadata만으로 이름/ID/아이콘을 표시 가능해야 함.
3. inactive preset 선택 시 full object를 먼저 hydrate한 뒤 `botPresetsId` 전환.
4. inactive preset edit/settings 진입 전 hydrate.
5. copy / duplicate / delete / reorder / import / export 전에 필요한 대상 full hydrate.
6. prompt diff / compare는 양쪽 대상 hydrate.
7. save/patch는 stub을 실제 preset 데이터로 오인하여 덮어쓰면 안 됨.
8. server DB format은 바꾸지 않음.
9. active preset 변경 중 실패하면 기존 active full preset을 보존하고 fail closed.
10. metadata stub과 full preset을 식별할 명시적 marker 필요.

## out of scope
- plugin lazy hydration.
- module lazy hydration.
- active-chat background dehydrate 변경.
- Firefox sound keep-alive.
- server DB schema migration.
- Android native memory policy 조정.
- forced reload/save.

## 검증 목표
1. initial client `botPresets` retained payload 대폭 감소.
2. active preset generation 정상.
3. inactive preset 선택 → hydrate → generation 정상.
4. edit/copy/delete/reorder/import/export/diff regression tests.
5. failed hydration에서 데이터 손실/잘못된 save 없음.
6. svelte-check/build PASS.
7. real-device tab PSS/RSS before/after 비교.
8. natural LMKD recurrence 빈도 감소 관찰.

## 다음 한 단계
현재 v1.14 source에서 botPreset read/write/edit/copy/delete/reorder/import/export/diff 호출면을 INSPECT_ONLY로 맵핑하고, hydration owner를 어디에 둘지 설계한다.


## INSPECT_ONLY source map

Current active selection:
- `db.botPresetsId`.
- `getActiveBotPreset()` returns `db.botPresets[botPresetsId]`.
- `changeToPreset(index)` reads the selected array element as a full preset and copies it into top-level DB fields.

Full-object consumers:
- `changeToPreset(index)`.
- `copyPreset(index)`.
- prompt diff modal.
- preset export/download.
- editor open.
- duplicate.
- reorder path spreads each preset object.
- active preset generation reads `db.botPresets[db.botPresetsId]`.

Critical save hazard:
- `saveCurrentPreset()` reconstructs only the active preset from top-level settings.
- every inactive `db.botPresets[i]` is otherwise preserved as-is in the array.
- therefore replacing inactive entries in `DBState.db.botPresets` with metadata stubs and then performing an ordinary botPreset save would persist those stubs over the authoritative full preset data.

Design consequence:
- client-only stubbing inside `DBState.db.botPresets` is unsafe unless the save layer/server has explicit knowledge of stubs.
- safer owner is likely the server read/patch boundary, analogous to chat stripping:
  1. server remains authoritative for full inactive presets;
  2. initial client read receives active full preset + inactive metadata stubs;
  3. on-demand preset endpoint returns a full preset by stable id;
  4. preset save/patch must merge untouched inactive authoritative preset bodies instead of persisting stubs;
  5. selection/edit/copy/diff/export hydrate the target first;
  6. hydration failure must leave the prior active preset and server data untouched.

This remains DESIGN only. No source mutation until the merge/persistence contract is specified and tested.


## 구현 후보
source branch:
- `feat/firefox-inactive-preset-lazy-hydration`
- commit: `d6a68402558949a0fd550e6e7beb5f86a8ee65d8`
- parent: `fef7d4b0888c6a9280e50335bcca4ad6c943ca33`
- one Feature-ID only.
- unrelated `generic_mock_bridge.cjs` untouched.

Server:
- `dbCache` remains the browser-facing stripped view.
- new authoritative preset side-store keeps full prompt presets by stable id.
- initial `/api/read` keeps the active preset full and replaces inactive presets with metadata stubs.
- stub metadata: `id/name/image/folderId/_presetStub`.
- `GET /api/preset-content/:presetId` hydrates a full preset on demand.
- patch persist, background persist and full-write fallback reassemble inactive stubs from authoritative full bodies before writing disk.
- missing authoritative body fails closed instead of persisting a stub.
- after successful disk commit the preset side-store is rebuilt from the exact full snapshot.

Client:
- async hydration deduplicated by preset id.
- after fetch, target slot is re-resolved by stable id so reorder races cannot hydrate the wrong index.
- stub metadata edits override the returned full body.
- hydration transition is suppressed from botPreset dirty tracking through the Svelte apply tick.
- existing synchronous `changeToPreset()` remains synchronous and refuses an unhydrated stub as defense in depth.
- selection/editor/copy/export/diff/bound-preset activation/preset-chain generation hydrate before requiring full preset data.
- a hydrated preset remains full for the rest of the browser session.
- partial local backup hydrates every preset first or aborts; server-backed full/settings backups stay authoritative and need no client-side hydrate-all.

## 구현 검증
Feature-owned:
- preset side-store pure tests: **7/7 PASS**.
- client preset hydration tests: **6/6 PASS**.
- NodeStorage preset endpoint tests: **3/3 PASS**.
- existing botPreset ID/reorder tests: **13/13 PASS**.
- real server integration: **4/4 PASS**:
  1. active full + inactive stubs on initial read;
  2. hydrate inactive preset by stable id;
  3. metadata patch preserves inactive full body on disk;
  4. full-write fallback carrying stubs preserves full bodies.
- `node --check server/node/server.cjs`: PASS.
- `svelte-check`: **0 errors**, existing 4 a11y warnings.
- production build: PASS.
- full server suite: **158/158 PASS**.
- compatibility suite: **125/125 PASS**, 5 skipped.

Broad client-suite baseline control:
- exact-base worktree at `fef7d4b0` reproduces the same remaining 84 failures seen in the candidate isolated run.
- 83 are Node v26 localStorage-environment failures in Gemini context-cache tests.
- 1 is the pre-existing 5s huge-lorebook timeout on this device.
- jobRecovery broad-run timeout disappears when isolated and also passes on exact base.
- no unrelated code was changed to manufacture a green full-client result.

## 배포 전 남은 gate
- current live service still runs the pre-feature server process until controlled restart.
- predeploy database integrity check must complete.
- create database rollback snapshot.
- restart runit service and verify health.
- main-phone Firefox reload once.
- verify initial preset count: 1 full active + inactive stubs.
- measure database transfer size and Gecko tab PSS/RSS before/after.
- smoke inactive selection, generation, edit/copy/export/diff and persistence.
- verify disk still holds full inactive preset bodies after save/restart.



## 2026-10-13 live initial A/B

Deployment:
- source commit: `d6a68402558949a0fd550e6e7beb5f86a8ee65d8`.
- rollback snapshot: `migration-backup/pre-preset-lazy-1791886614565.bin`, logical size 142,275,655 bytes.
- predeploy SQLite `quick_check`: risuai/logs/request-logs/model-jobs all `ok`.
- controlled service restart: PID 12649 → 12656.
- server health after restart: `ready`.
- main-phone core SSH tunnel remained healthy.

Client reload:
- new lifecycle boot at 19:22:48 KST.
- bootId `ead19939`.
- `navType=back_forward`.
- `pageshow.persisted=false`.
- writer session prefix `ffda6f58`.
- post-reload patch generations 1 and 2 both committed successfully.
- no 423 / `Session deactivated` observed.

Authoritative data safety:
- predeploy snapshot presets: 99.
- current disk presets after reload/save: 99.
- disk `_presetStub` count: 0.
- changed preset hashes vs predeploy snapshot: 0.
- missing preset IDs: 0.
- therefore client stubs did not leak into authoritative disk state and no preset body was overwritten.

Strip result on the live v1.14 database:
- active preset index: 97.
- client full preset count: 1.
- client inactive stub count: 98.
- full `botPresets` JSON: 24,579,229 bytes.
- stripped `botPresets` JSON: 630,510 bytes.
- reduction: 23,948,719 bytes / **97.43%** for the preset array.

Live hydrate route:
- production `GET /api/preset-content/:presetId` smoke with an internally generated short-lived JWT: HTTP 200.
- target inactive preset: index 0, `사육푸스`.
- response: 8,372 bytes.
- decoded ID matched.
- full `mainPrompt` and `regex` present.
- returned object was not a stub.
- JWT secret/token were not printed or persisted outside the normal server secret.

Firefox observation after reload:
- no Firefox process death/LMKD event in the first >10 minutes.
- process set remained stable.
- total Firefox RSS peaked near 1.48 GB immediately after reload, then fell to ~954 MB by 19:33.
- largest Gecko child `tab19` remained large; Android PSS records after reload: ~730 MB → 715 MB → 569 MB.
- pre-reload same PID had cached-state PSS records ~110–148 MB.
- these values are **not apples-to-apples** because Android state changed from cached-style state 17 to service state 10 and the exact URL↔PID mapping is still unproven.
- therefore this feature has **not yet demonstrated a Gecko PSS/RSS reduction**, despite the 97.43% preset payload reduction.
- static reinspection found no path that eagerly hydrates all 98 inactive presets during ordinary list rendering. Full hydration occurs only at explicit full-data consumers.

Current interpretation:
- protocol/data-safety goal: PASS.
- client preset payload reduction: PASS.
- first >10 min no-LMKD observation: PASS but not sufficient long-term proof.
- memory-effect goal: UNPROVEN.
- do not claim this feature solves LMKD yet.
- next suspected retained-memory owners remain plugins/modules/other Gecko state if live UI smoke also passes.

Remaining live gate:
1. actual Firefox UI selects one inactive preset, exercising the real client hydration path.
2. switch back to the original active preset.
3. verify server disk still has 99 full presets, 0 stubs, unchanged bodies except intentional selection metadata if any.
4. verify patch persistence and no 423.
5. then continue natural-use LMKD observation.
