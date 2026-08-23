# 서버 연결 복구 watcher

상태: **DONE / ACTIVE**

## 목적
서버폰 재부팅/연결 단절 후 정상화되면 **메인폰에만** 복구 notification 1회.

## 담당
📱 메인폰

## 현재 상태 머신
- 시작 `unknown`
- 2회 연속 success → initial `up`, 알림 없음
- 2회 연속 fail → `down`
- down에서 2회 연속 success → recovered `up`, 알림 1회

주기 5초, curl timeout 3초.

## 중요한 설계
passive observer다. SSH/PocketRisu 서비스를 재시작하지 않는다. 적극 복구 watchdog을 재사용하지 않는다.

## 검증
`watcher=started` → `state=up initial=1` → 실전 `state=down` → `state=up recovered=1` 및 메인폰 Android 알림 성공.

초장기챗 새고 중 health timeout도 감지한 사례가 있어 event-loop 정체 조사에 단서가 됨.
