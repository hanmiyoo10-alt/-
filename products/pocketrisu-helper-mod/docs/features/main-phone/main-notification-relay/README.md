# 메인폰 Android notification relay

상태: **ACTIVE**

## 목적
서버 이벤트를 사용자가 실제 보는 메인폰 Android notification으로 변환.

## 원칙
- 서버폰 Android notification 금지.
- 메인폰 `termux-notification` 사용.
- notification relay와 SSH core tunnel은 별도 축으로 진단.

## 현재 활용
- PocketRisu 응답 완료 알림.
- 서버 연결 복구 알림.

후속 문제: 전화/Discord/이어폰 상황에서 sound 반복. `audio-notification` 모듈에서 처리.
