# ROADMAP

기준: 2026-08-23

## P0

### 전화/이어폰 알림 무한소리 — TODO
- 메인폰 notification relay 호출 옵션 INSPECT_ONLY.
- notification ID / `--alert-once` / sound 중복 조건 확인.
- 전화 실검증.
- 이어폰 실검증.

### 안전 자동 PocketRisu updater — TODO
1. upstream fetch
2. 현재 개조/데이터 백업
3. 호환성·충돌 검사
4. 안전 판정 시 재확인 없이 진행 가능
5. safe apply
6. syntax/build/health/service 검증
7. 실패 시 자동 rollback
8. 성공/실패 알림은 메인폰 relay 전용
9. 서버폰 Android 알림 금지

금지: 단순 주기적 `git pull`.

## P1 — 조사 중

### 초장기챗 새고/복귀 health 정체
- 새고 때 실제 DB read/encode/serialize 경로 찾기.
- Node event-loop 정체 여부 최소 계측.
- 알려진 worker structured clone / chunk-store CDC+hash+SQLite commit과 관계 확인.

### Firefox 탭 복귀와 논리 session boot
- `sessionInitialized` 전체 참조 확인.
- JS runtime 재생성 vs session init 실패 재시도 구분.
- write-lock takeover 실제 영향 확인.

## P2 — 운영 안정화

### reconnect watcher 장기 검증
- 실제 서버폰 재부팅 사례에서 1회 알림 확인.
- 메인폰 자체 재부팅 때 불필요 복구 알림 여부 관찰.
- 필요 시 초기 boot suppression 추가.

### DB/save 남은 병목 — HOLD
- Worker launch 전 structured clone.
- worker result 후 synchronous chunk-store CDC/hash/SQLite commit.

## P3 — 문서 보강
- 각 기능의 실제 수정 파일 목록 최신화.
- rollback anchor 최신화.
- local-usage/DevPass/bridge 상세 문서화.
- Termux:Boot 전체 부팅 순서 문서화.
- simresume 전체 스크립트 의미 보강.
