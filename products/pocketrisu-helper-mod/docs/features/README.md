# 기능 모듈 인덱스

플러그인처럼 **기능 하나 = 폴더 하나**로 관리한다.

각 기능 폴더는 반드시:
```text
<feature>/
├─ README.md       # 현재 구현/검증
├─ UPSTREAM.md     # 미래 정식 PR dossier
└─ FAILURES.md     # CI/PR/review/deploy 실패 장부
```

새 기능은 코드를 먼저 만들고 나중에 분리하지 않는다. 먼저 Feature-ID/폴더를 만들고 그 경계 안에서 작업한다.

전체 PocketRisu PR 결과의 빠른 인덱스는 [`../../PR-HISTORY.md`](../../PR-HISTORY.md)에 두고, 상세 근거와 후속 작업은 각 Feature-ID dossier에 둔다.

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
- [large-doc backend adapter](server-phone/large-doc-backend-adapter/README.md)
- [safe updater](server-phone/safe-updater/README.md)

## 📱 양쪽/공통
- [last active chat restore](shared/restore-last-active-chat/README.md)
- [response notification](shared/response-notification/README.md)
- [plugin update fetch compatibility](shared/plugin-update-fetch/README.md)
- [V3 plugin targeted reload](shared/plugin-targeted-reload/README.md)
- [session/write-lock](shared/session-write-lock/README.md)
- [long-chat refresh stall](shared/long-chat-refresh-stall/README.md)
- [PR lifecycle automation](shared/pr-lifecycle-automation/README.md)

기능이 커지면 `DIAGNOSTICS.md`, `ROLLBACK.md`, `scripts/`를 추가한다. PR 준비/실패 기록은 `UPSTREAM.md`, `FAILURES.md`에 유지한다.
