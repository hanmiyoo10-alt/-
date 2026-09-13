# PocketRisu 화면 꺼짐 방지

Feature-ID: `keep-screen-awake`
상태: **IMPLEMENTATION_PR**

## 목표
PocketRisu 문서가 휴대폰 화면에 보이는 동안 브라우저의 Screen Wake Lock을 요청해 시스템 화면 타임아웃으로 표시가 꺼지는 것을 막는다.

## 현재 구현
- 로컬 구현 PR: `hanmiyoo10-alt/PocketRisu#9` (DRAFT).
- 앱 시작점 `src/main.ts`에서 화면 wake-lock owner를 한 번 설치한다.
- 문서가 `visible`일 때 `navigator.wakeLock.request("screen")`을 요청한다.
- 문서가 숨겨지면 보유 중인 lock을 해제한다.
- 다시 보이면 lock을 재요청한다.
- 브라우저/전원 정책이 요청을 거부한 경우 이후 pointer/keyboard 사용자 입력에서 재시도한다.
- Screen Wake Lock API가 없는 브라우저에서는 앱 동작을 방해하지 않고 no-op 한다.

## 상태 / 효과 흐름
```text
PocketRisu app boot
→ installScreenWakeLock()
→ document visibility / user interaction
→ navigator.wakeLock.request("screen")
→ browser display wake-lock state
→ unit/build checks + 실제 메인폰 화면 타임아웃 검증
```

## 명시적 범위 밖
- 기존 `keepSessionAlive` 설정 의미 변경 없음. 해당 설정은 session/audio keepalive 경로이며 화면 wake lock의 owner가 아니다.
- Android native `WakeLock`/`FLAG_KEEP_SCREEN_ON` 추가 없음.
- 잠금 화면, OS 보안 정책, 백그라운드 제약 우회 없음.
- 서버폰 서비스/runit/DB/save 경로 변경 없음.

## 검증 상태
- 소스 단위 테스트 추가: 최초 획득, hidden 해제/visible 재획득, 최초 거부 후 사용자 입력 재시도, API 미지원 no-op.
- PR #9의 `pnpm check`, build, test, compatibility test 결과는 아직 다음 검증 단계에서 확인해야 한다.
- 실제 메인폰에서 시스템 화면 타임아웃을 넘겨도 화면이 유지되는지 실기기 검증은 아직 하지 않았다.
- Screen Wake Lock은 브라우저 지원 및 secure context 정책의 영향을 받으므로 실기기 성공 전에는 `VERIFIED`로 간주하지 않는다.

## Rollback
`src/main.ts`의 `installScreenWakeLock()` wiring과 `src/ts/screenWakeLock.ts`를 제거하면 기존 화면 동작으로 돌아간다. DB/schema/persistence migration은 없다.

## 다음 한 단계
PR #9의 required checks를 확인한 뒤, 메인폰에서 PocketRisu를 foreground로 둔 채 시스템 화면 타임아웃을 넘기는 실제 검증을 수행한다.
