# 기능 모듈 인덱스

플러그인처럼 **기능 하나 = 폴더 하나**로 관리한다.

## 📱 메인폰
- [SSH core tunnel](main-phone/main-ssh-tunnel/README.md)
- [notification relay](main-phone/main-notification-relay/README.md)
- [reconnect watcher](main-phone/reconnect-watch/README.md)
- [전화/이어폰 알림 sound](main-phone/audio-notification/README.md)
- [Termux:Boot](main-phone/termux-boot/README.md)
- [simresume](main-phone/simresume/README.md)

## 📱 서버폰
- [PocketRisu runit service](server-phone/server-service/README.md)
- [DB/save optimization](server-phone/db-save-optimization/README.md)
- [local-usage / bridge](server-phone/local-usage-bridge/README.md)
- [safe updater](server-phone/safe-updater/README.md)

## 📱 양쪽/공통
- [last active chat restore](shared/restore-last-active-chat/README.md)
- [response notification](shared/response-notification/README.md)
- [V3 plugin targeted reload](shared/plugin-targeted-reload/README.md)
- [session/write-lock](shared/session-write-lock/README.md)
- [long-chat refresh stall](shared/long-chat-refresh-stall/README.md)

기능이 커지면 해당 폴더에 `DIAGNOSTICS.md`, `ROLLBACK.md`, `scripts/`를 추가한다.
