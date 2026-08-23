# 주요 결정 기록

## D-001 메인폰/서버폰 책임 분리
UI/알림/터널은 메인폰, 코드/DB/서비스/로그는 서버폰.

## D-002 서버폰 Android 알림 금지
사용자 알림은 메인폰만.

## D-003 runit 유지
PM2 도입하지 않음.

## D-004 reconnect watcher는 passive observer
적극 복구 watchdog과 분리.

## D-005 hide/pagehide DB full flush 금지
`flushServerDbKeepalive()` no-op 정책 유지, `/api/db/flush` 강제 금지.

## D-006 DB patch는 incremental hash + selective clone
전체 DB hash/clone 반복을 피함.

## D-007 ETag는 opaque revision
매 patch마다 content MD5 계산하지 않음.

## D-008 과거 mixed history는 즉시 재작성하지 않음
이미 섞인 과거 개조는 지금 억지로 history rewrite/cherry-pick 분해하지 않는다. 기능별 dossier를 만들고 정식 PR 준비 때 최신 upstream base에서 최소 diff로 재구성.

## D-009 안전 updater는 검증 후 자동 진행 가능
backup, compatibility check, verify, rollback 전제. naive `git pull` 금지.

## D-010 앞으로는 Feature-ID 단위로 처음부터 분리
새 작업은 `1 Feature-ID = 1 기능 폴더 = 1 branch/PR 후보 = 1 배포 단위`. “일단 섞고 나중에 분리” 금지.

## D-011 PR/CI/review/deploy 실패를 영구 기록
실패는 해당 기능 `FAILURES.md`에 남기고 `UPSTREAM.md` next action과 PR feedback에 반영. 성공해도 삭제하지 않음.

## D-012 green-only merge/deploy
checks/review/conflict/기능 경계를 통과하지 못하면 자동 merge/deploy 금지. 실제 서버폰 자동 배포는 검증된 pull-based `safe-updater`만 담당.
