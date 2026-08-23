# local-usage / DevPass / bridge

상태: **ACTIVE / 세부 복원 필요**

## 담당
📱 서버폰 중심. 메인폰은 SSH local forwarding으로 접근.

## 원칙
- bridge와 PocketRisu core 서버를 별도 구성요소로 본다.
- bridge port가 살아 있다고 core 정상으로 판단하지 않는다.
- reconnect watcher의 서버 복구 신호는 core health 사용.
- bridge token 실제 값 커밋 금지.

추후 각 bridge 역할, health, log 위치, boot/runit 관계를 상세 보강한다.
