# 메인폰 SSH core tunnel

상태: **ACTIVE**

## 목적
메인폰 Firefox의 localhost 접속을 서버폰 PocketRisu/bridge 서비스로 전달.

## 담당
📱 메인폰

## 원칙
메인 localhost health 실패를 바로 서버 코드 문제로 결론내리지 않는다.

진단 순서:
1. SSH runit service
2. tunnel log
3. 서버 sshd 도달성
4. 서버 PocketRisu service
5. Node event-loop/코드

`No route to host`, `Connection refused`, forwarded target refusal을 서로 구분한다.

실제 LAN IP/Termux user는 이 제품 문서에 기록하지 않는다.
