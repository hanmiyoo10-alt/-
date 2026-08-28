# 작업 이력

## 기본 운영 구조
- 메인폰/서버폰 역할 분리.
- 서버폰 PocketRisu runit 유지.
- 메인폰 SSH forwarding으로 core/bridge 접근.
- 서버폰 Android 알림 금지.
- INSPECT_ONLY 우선 규칙 정립.

## 마지막 활성 채팅 복원 계열
재진입 시 마지막 사용 채팅 복귀 경험 개선. 상세 diff는 소스 포크 기준으로 추후 보강.

## 응답 알림 계열
서버 이벤트를 메인폰 Android notification으로 relay. 후속 이슈로 전화/이어폰/Discord 상황의 무한 sound 문제 발견.

## V3 plugin targeted reload
전체 reload 대신 필요한 V3 plugin 경로 중심 reload. DB/save 축과 별개.

## DB/save `/api/patch` 최적화
기존 병목: whole hash, whole clone, patch apply, persist, full encode+MD5. top-level compositional hash, zero-op fast path, branch clone, opaque ETag, pluginCustomStorage depth-3 incremental hash/selective clone을 적용. synthetic hash/atomicity, BackgroundPersist, restart persistence 검증. 큰 patch 약 1.1~1.8s → 반복 측정 약 287ms.

## reconnect watcher
메인폰 passive watcher. 2회 fail → DOWN, 2회 success → recovered UP, DOWN→UP만 메인폰 notification. 실전 성공.

## 2026-08-23 새고/탭 복귀 조사
초장기챗 새고 시 health DOWN→UP 관찰. 서버 PID 유지, 해당 시각 SSH 단절 없음, `/api/health` 초경량, `/api/session` 등록 관찰. 원인 미확정. 직접 새고 없이 Firefox 탭 복귀 후 논리 session boot 재등록 사례도 조사 중.

## 2026-08-23 기능 분리 / PR lifecycle 도입
과거 개조를 정식 upstream PR로 떼어내려다 mixed history 때문에 분리 비용이 너무 컸던 경험을 반영해, 앞으로는 처음부터 Feature-ID 단위로 분리하는 운영 계약을 도입.

- 기능마다 `README.md`, `UPSTREAM.md`, `FAILURES.md` 의무화.
- PR/CI/review/deploy 실패 기능별 누적.
- Feature-ID 하나가 green일 때만 personal fork auto-merge 후보.
- 실제 서버폰 자동 배포는 pull-based `safe-updater` 검증 뒤 활성화.
- 정식 upstream PR은 최신 upstream base에서 기능 dossier 기준 최소 diff로 재구성.

## 2026-08-29 local backend 기능 PocketRisu 연동 설계
기존 Usage Dashboard/DevPass bridge와 large-doc-editor를 없애거나 하나의 backend로 합치지 않고, 각각의 독립 기능/릴리스 흐름을 유지한 채 PocketRisu server-side adapter 두 개로 연결하는 방향을 확정했다.

INSPECT_ONLY에서 확인한 근거:
- PocketRisu server는 `model-jobs.cjs`, `request-logs.cjs` 같은 독립 `registerRoutes` module 패턴을 이미 사용.
- NodeOnly browser -> server 인증은 `src/ts/storage/nodeStorage.ts`가 서버-issued JWT와 session id로 소유.
- V3 `nativeFetch`는 민감 header를 실을 수 있지만 경고 경계가 있어, raw DevPass bridge token을 browser/plugin에 두지 않는 server-side adapter가 더 안전.
- 기존 `/api/read|write|list`는 PocketRisu 자체 KV/storage 경계라 large-doc workspace 접근에 재사용하지 않음.

확정 구조:
- `SERVER-LOCAL-USAGE-BRIDGE`: PocketRisu `local-usage-adapter.cjs` -> server-phone localhost `:39117`; 1차 health + snapshot read-only, raw bridge credential browser 비노출.
- `SERVER-LARGE-DOC-BACKEND-ADAPTER`: PocketRisu `large-doc-adapter.cjs` -> server-phone localhost `:8765`; 1차 files/open/chunk read-only, workspace absolute path 비노출.
- 둘 모두 dependency 장애를 PocketRisu core health와 분리.
- large-doc write/save는 read-only 검증 뒤 active-session/write-lock + `SOURCE_CHANGED` 409 보존을 전제로 별도 단계.
- 즉시 Python/bridge 로직을 Node core로 재작성하지 않고 기존 backend를 reference implementation으로 사용. 운영상 extra process가 실제 부담으로 확인될 때만 contract-compatible 선택 포팅을 별도 Feature-ID/단계로 검토.

상세 설계:
- `docs/features/server-phone/local-usage-bridge/DESIGN.md`
- `docs/features/server-phone/large-doc-backend-adapter/DESIGN.md`
