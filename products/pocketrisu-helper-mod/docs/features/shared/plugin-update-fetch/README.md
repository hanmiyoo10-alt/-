# Plugin update fetch compatibility

Feature-ID: `plugin-update-fetch`
Area: `shared`
Status: `VERIFIED_LOCAL / HISTORICAL`

## 목적
PocketRisu 플러그인 업데이트 확인/다운로드가 브라우저·서비스워커 캐시 때문에 stale metadata를 읽지 않도록 하고, 모바일 localhost runtime에서 `Range` 또는 `Request.cache` 동작이 호환되지 않을 때도 업데이트 UI가 사라지지 않도록 fallback을 제공한다.

## Historical source PRs
- `hanmiyoo10-alt/PocketRisu#1` — cache-safe fetch + prerelease-aware version comparison
- `hanmiyoo10-alt/PocketRisu#2` — real mobile runtime fallback hardening

두 PR은 Feature-ID guard 도입 전의 연속 작업이다. #1의 실제 모바일 runtime 문제를 #2가 회수했으므로 현재 historical behavior reference는 #2까지 포함한 상태다.

## 핵심 동작
- metadata URL cache busting
- prerelease-aware version ordering
- metadata fetch fallback: `Range + no-store` → full `no-store` GET → plain GET
- plugin full download fallback: `no-store` → plain GET
- existing query parameter 보존

## 경계
V3 runtime targeted reload는 별도 Feature-ID `plugin-targeted-reload`이다. DB/save, response notification, session logic과 섞지 않는다.
