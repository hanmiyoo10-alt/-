# ROADMAP

기준: 2026-08-23

## 완료 — legacy upstream PR rebuild 준비

과거 여러 개조가 Git history에서 섞여 정식 PR 분리가 어려웠던 기능 중 다음 5개는 `PR_READY_REBUILD` 상태까지 사전 분해 조사 완료:

- `restore-last-active-chat`
- `response-notification`
- `plugin-targeted-reload`
- `session-write-lock`
- `db-save-optimization`

완료 기준:
- 기능별 독립 `UPSTREAM.md` rebuild recipe.
- `Minimal upstream scope / Dependencies / Verification evidence / Upstream pitch` 명시.
- 명시적 out-of-scope 경계.
- 최신 upstream에서 다시 만드는 테스트/순서.
- 기능별 독립 helper PR.
- 첫 CI 실패와 수정/재검증 성공을 각 `FAILURES.md`에 영구 기록.

정식 upstream PR 시에는 옛 mixed commit을 억지로 쪼개지 않고 **최신 official upstream + Feature-ID 하나**로 rebuild한다.

특기:
- `db-save-optimization`은 staged upstream PR series로 제출 후보를 나눈다.
- `plugin-targeted-reload` rebuild에서 persistence-order 변경이 별도로 필요하면 새 Feature-ID `plugin-update-persistence-order`로 분리한다.

## 진행 중 — DB/save 정식 upstream staged PR series

- A `PocketRisu/PocketRisu#67`: OPEN — empty patch fast path + opaque patch ETag.
- B `hanmiyoo10-alt/PocketRisu#5`: DRAFT / READY — compositional server DB patch hash cache.
- C `#6`: DRAFT / READY — top-level selective clone.
- D `#7`: DRAFT / READY — pluginCustomStorage direct-child hash/selective clone.
- E `#8`: DRAFT / READY — depth-3 lazy subchild hash/selective clone.

고정 순서: `A 결과 → latest develop 재검사 → B → 재검사 → C → D → E`.
중복 구현, upstream 구조 변경, 의미 있는 충돌이 발견된 단계는 억지 포팅하지 않고 `SKIP/HOLD`로 기록한다.
Worker pre-launch structured clone과 chunk-store CDC/hash/SQLite commit은 이 series 범위 밖이며 별도 Feature-ID 전까지 HOLD.

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
