# Firefox inactive preset lazy hydration

Feature-ID: `firefox-inactive-preset-lazy-hydration`
Area: `shared`
Status: **DESIGN / EVIDENCE_READY**

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
