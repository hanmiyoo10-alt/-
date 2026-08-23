# 전화/이어폰/Discord 알림 무한소리

상태: **TODO**

## 증상
메인폰에서 전화 수신, 이어폰 연결 상태, Discord 관련 상황에서 notification sound가 반복되는 사례.

## 우선 범위
1. 전화
2. 이어폰

## 담당
📱 메인폰

서버폰 Android notification 문제로 접근하지 않는다.

## 조사 순서
1. relay의 `termux-notification` 실제 옵션 INSPECT_ONLY
2. notification ID 재사용 확인
3. `--alert-once` 적용 위치 확인
4. relay 중복 호출 여부 확인
5. 오디오 route 변화와 재alert 분리
6. 최소 수정
7. 전화 실검증
8. 이어폰 실검증

reconnect notification은 sound 없이 구성한 상태.
