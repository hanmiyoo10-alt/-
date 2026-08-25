# Feature PR / Deploy Lifecycle

목적은 지금의 개조 관리와 동시에, 나중에 PocketRisu upstream 정식 PR을 만들 때 다시 분리하느라 고생하지 않게 하는 것이다.

## 핵심 계약

`1 Feature-ID = 1 기능 폴더 = 1 PR 후보 = 1 배포 단위`

```text
docs/features/<area>/<feature-id>/
├─ README.md
├─ UPSTREAM.md
└─ FAILURES.md
```

전체 PocketRisu PR의 빠른 결과 인덱스는 `PR-HISTORY.md`에 유지한다. 상세 근거는 각 Feature-ID dossier가 canonical이며, ledger와 dossier가 충돌하면 실제 GitHub 상태를 재확인해 둘 다 갱신한다.

## Lifecycle

`IDEA → ACTIVE/INVESTIGATE → VERIFIED_LOCAL → PR_READY → PR_OPEN → VALIDATING → FAILED|CHANGES_REQUESTED|GREEN → MERGED → DEPLOY_READY → DEPLOYED → POST_DEPLOY_VERIFIED → UPSTREAM_CANDIDATE`

## 실패도 산출물

실패한 PR/check/deploy는 채팅에만 남기지 않는다. `FAILURES.md`에 stage, PR/commit, failed check/job, 로그 사실, 원인 확정/추정, 피드백/수정, 재검증, rollback을 기록한다.

## 자동 PR feedback / history tracking

대상은 공식 upstream `PocketRisu/PocketRisu`와 개인 포크 `hanmiyoo10-alt/PocketRisu`의 PocketRisu 관련 PR.

새 PR 또는 의미 있는 상태 변화가 확인되면:
1. `PR-HISTORY.md`의 해당 PR 결과를 추가/갱신한다.
2. 해당 Feature-ID의 `UPSTREAM.md` 또는 `FAILURES.md`에 리뷰·CI·머지·보류·재구현·부분채택 결과를 기록한다.
3. 코드 결함과 architecture/superseded 판단을 구분한다.
4. 동일 사실을 중복 append하지 않는다.
5. runtime code나 실제 서버 배포를 PR 기록 자동화가 임의로 변경하지 않는다.

개인 포크의 새 feature PR은 PR body에 `Feature-ID: <id>` 한 개가 있고 해당 기능 폴더가 존재해야 한다.

실패 시 failed job/log 확인 → `FAILURES.md` 기록 → `UPSTREAM.md` 갱신 → 필요 시 PR comment 피드백 → 코드 실패 자동 merge 금지.

성공 시 required checks green + conflict 없음 + changes requested 없음 + 기능 경계 통과일 때만 개인 포크 auto-merge 후보.

## 기능 분리 위반

Feature-ID 0/2개 이상, 두 기능 동시 구현, unrelated cleanup/refactor 혼합, 숨은 dependency, “나중에 분리” 전제 mixed commit은 자동 merge 금지. 필요하면 prerequisite 기능을 별도 PR로 만든다.

## 배포

실제 서버폰 배포는 `safe-updater`가 pull-based agent로 완성된 뒤 활성화한다. 필수: merge SHA 확인 → backup → compatibility → apply → syntax/build → runit restart → `/api/health` → persistence sanity → 실패 rollback/health → 메인폰 notification.

GitHub Actions가 서버폰 SSH key를 들고 직접 들어가는 push deployment는 기본 설계로 쓰지 않는다.

## 정식 upstream PR

개인 mixed history를 그대로 보내지 않는다. upstream 최신 base에서 새 branch를 만들고 `UPSTREAM.md` 기준 최소 diff만 재구성한다. dependency는 별도 PR, upstream test/build 수행, personal-only Termux/notify/auth wiring 제외. 정식 PR review 실패도 다시 `FAILURES.md`로 회수한다.
