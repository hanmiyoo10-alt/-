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

## D-008 Git 분리 강행 안 함
현재 소스 포크에 섞인 개조를 억지로 재분리하지 않고 이 제품 루트에서 기능별 논리 분리.

## D-009 안전 updater는 검증 후 자동 진행 가능
사전 backup, compatibility check, verify, rollback이 전제. naive `git pull` 금지.
