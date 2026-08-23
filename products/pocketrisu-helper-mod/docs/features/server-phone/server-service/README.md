# 서버폰 PocketRisu runit service

상태: **ACTIVE**

## 담당
📱 서버폰

서비스: `$PREFIX/var/service/pocketrisu`

stdout/stderr는 `$HOME/pocketrisu-service.log` 계열, application `logger.*`는 `save/logs.db` 계열을 구분한다.

## 재시작 판정
누적 로그의 `HTTP server is running.`만으로 현재 재시작을 판단하지 않는다.

정확히:
- `sv status` PID
- run duration
- 현재 시각 기동 로그

같은 PID + duration 증가면 서버 프로세스 재시작 아님.
