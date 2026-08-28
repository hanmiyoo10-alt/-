# local-usage / DevPass / bridge

상태: **ACTIVE / 세부 복원 필요**

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

### 이식 원칙
- 원본 Usage Dashboard 기능/릴리스 흐름은 유지한다.
- PocketRisu backend에는 필요한 조회·인증 로직만 좁게 포팅한다.
- bridge 자체와 PocketRisu server를 하나의 거대한 backend로 합치지 않는다.
- browser에 bridge credential을 불필요하게 오래 노출하지 않는 server-side adapter를 우선 검토한다.
- 실제 credential 값, LLMGateway 세션/쿠키/config 내용은 커밋하지 않는다.

### 1차 최소 범위
1. INSPECT_ONLY: PocketRisu에서 server-side/local bridge 접근 경계 확인.
2. `/health` 연결 확인.
3. 인증된 `/snapshot` read-only adapter 확인.
4. 실패/timeout/auth 오류가 PocketRisu core health와 분리되어 처리되는지 검증.
5. 이후 필요성이 입증될 때만 `/activity`, `/analytics`, org/scope 조회를 단계적으로 추가.

### 비범위
- 원본 usage-dashboard 제거/대체.
- bridge와 PocketRisu core의 프로세스 통합.
- 서버폰 Android 알림.
- PM2 도입 또는 runit 체계 변경.
- runtime code 자동 수정/배포.

추후 각 bridge 역할, health, log 위치, boot/runit 관계를 상세 보강한다.
