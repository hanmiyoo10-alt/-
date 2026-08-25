# PocketRisu PR history ledger

목적: `hanmiyoo10-alt`가 PocketRisu 관련 저장소에 올린 PR의 결과를 한곳에서 빠르게 찾고, 상세 내용은 각 Feature-ID dossier로 연결한다.

기록 원칙:
- upstream `PocketRisu/PocketRisu` PR과 개인 fork `hanmiyoo10-alt/PocketRisu` PR을 모두 기록한다.
- 단순 open/closed만 적지 않고 실제 결과(merged, reimplemented, partial adoption, hold, superseded)를 적는다.
- 코드 실패와 아키텍처 방향 전환을 구분한다.
- 새 리뷰/CI/머지/보류 결과가 생기면 이 ledger와 해당 기능의 `UPSTREAM.md`/`FAILURES.md`를 함께 갱신한다.

## Official upstream PRs — PocketRisu/PocketRisu

| PR | 날짜 | 기능 | 결과 | 핵심 결과 / 의미 | Dossier |
|---|---|---|---|---|---|
| #60 `feat: restore last active chat after reload` | 2026-08-14 → 2026-08-23 | restore-last-active-chat | **MERGED** | 마지막 활성 캐릭터/채팅 복원 기능이 upstream에 직접 병합됨. | `docs/features/shared/restore-last-active-chat/UPSTREAM.md` |
| #61 `feat: add native Termux response notifications` | 2026-08-14 → 2026-08-23 | response-notification | **MERGED** | localhost Termux native notification 경로가 upstream에 병합됨. 이후 전화/이어폰 무한 sound 문제는 별도 `audio-notification`으로 분리. | `docs/features/shared/response-notification/OFFICIAL-PR.md` |
| #62 `fix: reload updated V3 plugins in isolation` | 2026-08-16 → 2026-08-23 | plugin-targeted-reload | **CLOSED / REIMPLEMENTED UPSTREAM** | maintainer가 진단/ownership 설계를 승인. 외부 PR merge 대신 현재 develop 위에서 재구현하여 `a55c4eef`로 반영, v1.11.0 예정이라고 명시. | `docs/features/shared/plugin-targeted-reload/UPSTREAM.md` |
| #67 `perf: skip empty patches and avoid full DB encode for patch ETag` | 2026-08-23 → 2026-08-24 | db-save-optimization Stage A | **PARTIAL ADOPTION / CLOSED** | empty-patch early return은 `e3a63daa`로 채택. opaque revision ETag는 `/api/read`/409의 content-MD5 ETag와 혼용 위험 때문에 보류/상위 revision 모델로 이관. | `docs/features/server-phone/db-save-optimization/UPSTREAM.md` |
| #68 `perf: cache compositional DB patch hash` | 2026-08-23 → 2026-08-24 | db-save-optimization Stage B | **MERGED** | compositional hash cache가 `7159bf9f`로 develop에 병합. maintainer 독립 검증에서 reference `calculateHash()`와 bit-identical 확인. | `docs/features/server-phone/db-save-optimization/UPSTREAM.md` |
| #69 `perf: clone only touched DB patch branches` | 2026-08-23 → 2026-08-24 | db-save-optimization Stage C | **MERGED** | selective clone이 `7e0e61af`로 병합. atomicity/copy deep-copy/path+from 보장 검토 완료; follow-up `e3a63daa`에서 root handling/invariant 보강. | `docs/features/server-phone/db-save-optimization/UPSTREAM.md` |
| #73 `perf(db-save-optimization): optimize plugin storage child patching` | 2026-08-24 → 2026-08-25 | db-save-optimization Stage D | **CLOSED / SUPERSEDED BY ARCHITECTURE** | 코드 정합성은 maintainer 검증에서 재확인됐지만, plugin storage lazy 전환이 `develop`의 `f0d4eee3`로 반영되면서 최적화 대상 경로가 제거됨. 코드 실패가 아니라 아키텍처 supersede로 미병합 종료. 종료 뒤 작성자는 새 방향을 찾았으며 추후 새 PR로 다시 제안하겠다고 명시했으므로, 후속 PR은 기존 Stage D 재개가 아니라 새 아키텍처 기준의 별도 제안으로 추적한다. | `docs/features/server-phone/db-save-optimization/STAGE-D-HOLD.md` |

## Personal fork PRs — hanmiyoo10-alt/PocketRisu

| PR | 날짜 | 기능 | 결과 | 핵심 결과 / 의미 | Dossier |
|---|---|---|---|---|---|
| #1 `fix: make plugin updates cache-safe and prerelease-aware` | 2026-08-17 | plugin-update-fetch | **MERGED_LOCAL** | cache bypass + prerelease-aware version 비교의 첫 구현. 실제 모바일 runtime에서 update button이 사라지는 호환 문제를 발견해 #2로 즉시 후속 보강. | `docs/features/shared/plugin-update-fetch/UPSTREAM.md` |
| #2 `fix: make plugin update fetch resilient on mobile runtimes` | 2026-08-17 → 2026-08-18 | plugin-update-fetch | **MERGED_LOCAL** | metadata fetch를 `Range + no-store → no-store GET → plain GET`, full download를 `no-store → plain GET` 순으로 fallback하도록 보강. #1의 실제 모바일 runtime 실패를 회수한 안정화 PR. | `docs/features/shared/plugin-update-fetch/UPSTREAM.md`, `FAILURES.md` |
| #3 `ci: enforce one Feature-ID per feature PR` | 2026-08-23 | pr-lifecycle-automation | **MERGED_LOCAL** | source fork에 Feature-ID PR boundary guard/PR template 계약 도입. 이후 기능별 PR 분리의 기준점. | `docs/features/shared/pr-lifecycle-automation/UPSTREAM.md` |
| #4 `perf: skip empty patches and avoid full DB encode for patch ETag` | 2026-08-23 | db-save-optimization Stage A local | **OPEN HISTORICAL / SUPERSEDED** | official #67 제출 전 정확한 upstream-ready 검증 브랜치. official 결과가 나온 뒤 historical validation artifact로만 유지. | `docs/features/server-phone/db-save-optimization/UPSTREAM.md` |
| #5 `perf(db-save-optimization): cache compositional DB patch hash` | 2026-08-23 | db-save-optimization Stage B local | **OPEN DRAFT / SUPERSEDED BY #68** | upstream #68이 merge되어 더 이상 merge 대상 아님. | `docs/features/server-phone/db-save-optimization/UPSTREAM.md` |
| #6 `perf(db-save-optimization): clone only touched DB patch branches` | 2026-08-23 | db-save-optimization Stage C local | **OPEN DRAFT / SUPERSEDED BY #69** | upstream #69이 merge되어 더 이상 merge 대상 아님. | `docs/features/server-phone/db-save-optimization/UPSTREAM.md` |
| #7 `perf(db-save-optimization): optimize plugin storage child patching` | 2026-08-23 → 현재 | db-save-optimization Stage D local | **OPEN DRAFT / SUPERSEDED FALLBACK** | official #73의 검증 ancestry. upstream plugin storage lazy 전환 `f0d4eee3`가 실제로 landed해 현재 경로에서는 대상 hot path가 사라짐. 향후 방향이 다시 바뀔 때만 검증된 fallback 설계로 참고. | `docs/features/server-phone/db-save-optimization/STAGE-D-HOLD.md` |
| #8 `perf(db-save-optimization): optimize deep plugin storage patching` | 2026-08-23 → 현재 | db-save-optimization Stage E local | **OPEN DRAFT / SUPERSEDED FALLBACK** | Stage D 이후 depth-3 fallback 설계. 현재 upstream 구조에서는 plugin storage가 per-key KV로 이동해 대상 경로가 사라졌으므로 활성 merge 후보가 아님. | `docs/features/server-phone/db-save-optimization/STAGE-D-HOLD.md` |

## Current totals (snapshot: 2026-08-26)

- Official upstream PRs found: **7**
  - merged directly: **4** (#60, #61, #68, #69)
  - reimplemented upstream: **1** (#62)
  - partial adoption / closed: **1** (#67)
  - architecture-superseded / closed: **1** (#73)
- Personal fork PRs found: **8**
  - merged local: **3** (#1, #2, #3)
  - historical/superseded open artifacts: **5** (#4, #5, #6, #7, #8)

이 snapshot 이후의 결과는 자동 watcher가 의미 있는 상태 변화가 있을 때 갱신한다.
