# Feature-ID: SERVER-LOCAL-USAGE-BRIDGE

# local-usage / DevPass / bridge

상태: **ACTIVE SOURCE / POCKETRISU ADAPTER DESIGN_READY / IMPLEMENTATION_NOT_STARTED**

상세 설계: [`DESIGN.md`](DESIGN.md)

## 담당
📱 서버폰 중심. 메인폰은 SSH local forwarding으로 접근.

## 원칙
- bridge와 PocketRisu core 서버를 별도 구성요소로 본다.
- bridge port가 살아 있다고 core 정상으로 판단하지 않는다.
- reconnect watcher의 서버 복구 신호는 core health 사용.
- bridge token 실제 값 커밋 금지.

## PocketRisu backend 연동 결정 — 2026-08-29

기존 Usage Dashboard / DevPass bridge 기능과 원본 프로젝트는 그대로 유지한다. PocketRisu 연동을 위해 원본 전체를 합치거나 대체하지 않고, 필요한 기능만 별도 adapter/service 경계로 이식한다.

현재 확인된 source surface:
- `plugins/usage-dashboard/runtime-src/bridge-engine/70-http-diagnostics.part.mjs`
- 기본 bridge: `127.0.0.1:39117`
- bridge manager: `127.0.0.1:39119`
- 인증 경계: `X-DevPass-Bridge-Key` / 호환 `X-Local-Bridge-Key`
- 대표 read API: `/health`, `/snapshot`, `/activity`, `/analytics`, `/orgs`, `/usage-scopes`, `/analytics-scopes`
- plugin 호출 경계: `Risuai.nativeFetch(...)`

### 2026-08-29 INSPECT_ONLY 결과
- PocketRisu server는 `model-jobs.cjs`, `request-logs.cjs`처럼 독립 module의 `registerRoutes(app, ...)` 패턴을 이미 사용한다.
- NodeOnly browser -> PocketRisu server 인증은 `src/ts/storage/nodeStorage.ts`가 서버-issued JWT와 `x-session-id`로 소유한다.
- V3 `nativeFetch`는 민감 header 사용을 허용하지만 경고한다. bridge credential을 browser에 두기보다 server-side adapter가 소유하는 쪽을 채택한다.
- PocketRisu 자체 `/api/request-logs/usage`는 PocketRisu provider telemetry이며 DevPass/credits/org bridge contract와 별개다.

### 확정된 1차 구조
```text
메인폰 Firefox -> 기존 PocketRisu 연결 -> 서버폰 PocketRisu :6001
                                      -> local-usage-adapter.cjs
                                      -> 127.0.0.1:39117 bridge
```

브라우저는 raw bridge token을 받지 않는다. PocketRisu adapter는 arbitrary proxy가 아니라 exact allowlist route만 제공한다.

### 1차 최소 범위
1. 런타임 INSPECT_ONLY: 서버폰 bridge listener/token-file ownership 확인. token 값은 출력/기록하지 않는다.
2. `GET /api/local-usage/health`.
3. `GET /api/local-usage/snapshot` (`profile=light|full`, bounded `creditsOrgId`만 허용).
4. bridge timeout/auth/bad-response를 PocketRisu core health와 분리.
5. 이후 필요성이 입증될 때만 activity/analytics/org/scope read API 추가.

### 비범위
- 원본 usage-dashboard 제거/대체.
- bridge와 PocketRisu core의 프로세스 통합.
- browser에 raw bridge credential 노출.
- bridge-manager 자동 sync/adopt/restart/update.
- 서버폰 Android 알림.
- PM2 도입 또는 runit 체계 변경.
- runtime code 자동 수정/배포.

추후 각 bridge 역할, health, log 위치, boot/runit 관계를 상세 보강한다.
