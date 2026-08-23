# 메인폰 Termux:Boot

상태: **ACTIVE / 문서 보강 필요**

## 목적
메인폰 재부팅 후 runit/SSH tunnel 등 PocketRisu 접속 기반 자동 복구.

확인된 Boot 축:
- wake lock
- Termux services 시작
- `runsvdir $PREFIX/var/service` 존재 보장
- SSH tunnel `sv up`
- localhost health 대기

`pocketrisu-reconnect-watch`도 service directory에서 runsvdir 감독을 받는다.

주의: 메인폰 부팅 직후 watcher가 tunnel보다 먼저 fail을 보면 부팅 자체를 복구 이벤트로 볼 가능성이 있어 실제 사례를 먼저 관찰한다.
