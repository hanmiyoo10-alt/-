# 포켓리스 보조 개조 작업 루틴

이 문서는 **새 채팅/새 작업에서도 같은 방식으로 안전하게 이어가기 위한 고정 루틴**이다.

원칙: 채팅은 작업 공간이고, 이 제품 루트는 장기 기억이며, **기능 하나 = 작업 단위 = PR 후보 단위 = 배포 단위**로 취급한다.

## 0. 작업 시작 — 항상 먼저 읽기

1. `CURRENT.md`
2. `ROADMAP.md`
3. 이번 작업의 `docs/features/<영역>/<기능>/README.md`
4. 같은 기능 폴더의 `UPSTREAM.md`
5. 같은 기능 폴더의 `FAILURES.md`
6. 필요할 때 `docs/decisions.md` / `docs/history.md`

확인: 담당 기기, 정확한 `Feature-ID`, 현재 상태, 직전 **다음 한 단계**. 실제 상태가 애매하면 `INSPECT_ONLY`부터.

## 1. 기능 경계 고정 — 코드보다 먼저

`docs/features/<영역>/<Feature-ID>/`를 작업 단위로 한다.

최소 구조:
```text
<feature>/
├─ README.md
├─ UPSTREAM.md
└─ FAILURES.md
```

- 한 PR/branch에 Feature-ID 하나.
- 다른 기능이 필요하면 숨겨서 같이 넣지 않고 `Dependencies`에 기록하고 prerequisite 기능/PR로 분리.
- 공통 helper가 독립 가치/테스트를 가지면 별도 `shared/<feature>`.
- 과거 mixed 개조는 지금 억지 history rewrite하지 않는다. `UPSTREAM.md`에 분리 상태를 기록하고 정식 PR 때 최신 upstream base에 그 기능만 재적용.
- 앞으로는 “섞고 나중에 분리” 금지. **처음부터 분리**.

## 2. 작업 전 — 안전 범위

`INSPECT_ONLY → 백업 → 수정 → 검증`

- 한 번에 한 문제 축.
- 메인폰 터널/알림과 서버폰 코드/DB 진단 분리.
- 같은 파일을 두 경로에서 동시에 수정 금지.
- 예상과 다른 출력이면 수정 중단 후 원인 확인.
- 수정 전 `UPSTREAM.md`의 Minimal upstream scope와 맞는지 확인.

## 3. 작업 중 — 증거

수정 파일/함수/서비스, rollback anchor, PID/uptime, 로그 시각/timezone, 성능 전후, syntax/build/test, 실제 재현, persistence 재시작 검증을 기록한다. 확정 못한 원인은 `가능성 / 추정 / 조사 중`.

## 4. 기능 문서 갱신

### README.md
상태, 현재 동작, 검증, 실패/함정, rollback, **다음 한 단계**.

### UPSTREAM.md
실제 변경 범위, 의존성, local-only wiring, upstream 설명, 테스트 근거, 분리 상태.

### FAILURES.md
CI/PR/review/merge/deploy 실패를 시간순으로 기록. 성공해도 지우지 않는다.

## 5. Branch / commit / PR

- branch: `feat/<Feature-ID>` 또는 `feat/<Feature-ID>-<설명>`
- PR body: `Feature-ID: <Feature-ID>` 정확히 한 줄
- unrelated cleanup/format/refactor 혼합 금지
- 다른 Feature-ID가 섞이면 자동 merge 대상 제외

정식 upstream PR은 mixed 개인 branch를 그대로 올리지 않는다. 최신 upstream base → 기능 `UPSTREAM.md` → 필요한 hunk/commit만 재적용 → dependency 별도 PR → upstream 검증 순서.

## 6. PR 실패 → 기록 → 피드백 → 재시도

`PR_OPEN → VALIDATING → FAILED | CHANGES_REQUESTED | GREEN`

실패하면:
1. failed workflow/job/check 확인
2. 확정 사실/추정 원인 분리
3. `FAILURES.md` 중복 없이 기록
4. `UPSTREAM.md` PR status/next action 갱신
5. PR에 짧은 피드백
6. 코드 실패는 무작정 rerun 금지
7. infra timeout/cancel처럼 명확할 때만 제한적 rerun
8. 수정 후 같은 검증 통과해야 `GREEN`

review의 changes requested도 실패 장부에 남긴다.

## 7. GREEN 이후 merge / 배포

자동 merge 후보 조건: Feature-ID 하나, 기능 폴더 존재, required checks 성공, conflict 없음, changes requested 없음, 검증 근거, 최신 실패 해결/재검증, 숨은 dependency 없음.

통과: `GREEN → MERGED → DEPLOY_READY`.

실제 서버폰 자동 배포 최종 흐름:
`MERGED → safe-updater 감지 → backup → compatibility check → apply → syntax/build → runit/health → persistence sanity → success`

실패: `FAILURES.md 기록 → rollback → rollback verify → 메인폰 notification`.

- GitHub Actions가 서버폰에 임의 SSH하는 push deployment는 기본 설계로 사용하지 않음.
- 서버폰 **pull-based safe-updater**가 구현/검증된 뒤 실제 자동 배포 활성화.
- 그 전에는 `DEPLOY_READY`까지만 자동 진행.
- 서버폰 Android notification 금지.

## 8. 작업 종료 — 기억 동기화

1. 기능 `README.md`
2. 기능 `UPSTREAM.md`
3. 실패가 있으면 `FAILURES.md`
4. `CURRENT.md`
5. `ROADMAP.md`
6. 큰 완료/결정이면 history/decisions
7. CI

## 9. 외부 아이디어

`바로 포팅 가능 / 설계 필요 / 보류`로 분류. 구현하기로 하면 먼저 독립 Feature-ID를 만든다. 기존 feature에 억지로 끼워 넣지 않는다.

확인: upstream 중복, custom save/session/plugin 충돌, hide/pagehide full flush 회귀, targeted V3 reload 퇴행, 서버폰 Android 알림 추가 여부.

## 10. 고정 가드레일

- runit 유지, PM2 금지.
- 서버폰 Android 알림 금지.
- passive reconnect watcher와 적극 watchdog 분리.
- `flushServerDbKeepalive()` no-op 유지.
- hide/pagehide full DB flush 금지.
- `sqlite3` CLI 의존 금지; Node + `better-sqlite3`.
- incremental hash / selective clone / opaque ETag 무심코 제거 금지.
- V3 targeted reload 전체 reload 회귀 금지.
- 비밀/DB/snapshot/log/backup 원본 커밋 금지.

## 11. 레포 자동 검증

`ci/validate_docs.py`와 Actions가 필수 문서, 기능별 `README.md/UPSTREAM.md/FAILURES.md`, Feature-ID 일치, 비밀파일/패턴, 링크, CURRENT 다음 단계, PR lifecycle을 검사한다.

## 12. 한 줄 루틴

> **Feature-ID 고정 → 읽기 → INSPECT_ONLY → 백업 → 한 기능만 수정 → 검증 → 실패 기록/피드백 → GREEN → merge → DEPLOY_READY → safe-updater 배포 → 기능 문서/CURRENT/ROADMAP 동기화**
