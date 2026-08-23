# 아키텍처

```text
📱 메인폰
Firefox / PocketRisu
Android 알림
Termux + runit
   │
   │ SSH local forwarding
   ▼
📱 서버폰
Termux sshd
PocketRisu Node
DB / save / bridge
```

## 메인폰 책임
- 실제 UI 사용/재현.
- SSH forwarding.
- Android notification relay.
- Termux:Boot.
- reconnect watcher.

## 서버폰 책임
- PocketRisu 소스/DB/save.
- Node 서버.
- local-usage/DevPass/bridge.
- 서버 로그.
- runit `pocketrisu`.

## health 의미
`GET /api/health`는 DB/disk/external network probe 없는 초경량 readiness endpoint.

따라서 timeout 시 endpoint 자체보다 SSH 전달 경로, Node event loop 정체, 서버 프로세스 상태를 분리해서 본다.

## 알림
Android 알림은 메인폰 전용. 서버폰은 직접 notification을 만들지 않는다.
