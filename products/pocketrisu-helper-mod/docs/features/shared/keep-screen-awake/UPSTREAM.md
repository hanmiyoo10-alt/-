# Upstream PR dossier — keep-screen-awake

Feature-ID: `keep-screen-awake`
Area: `shared`
PR status: `LOCAL_DRAFT_PR_OPEN`
Isolation status: `CLEAN`
Deployment status: `NOT_READY`

## Problem / motivation
휴대폰에서 PocketRisu를 foreground로 두고 읽거나 응답을 기다리는 동안 시스템 화면 타임아웃으로 화면이 꺼질 수 있다. 화면이 보이는 동안만 display wake lock을 유지하는 독립 기능이 필요하다.

## Local implementation
- PR: `hanmiyoo10-alt/PocketRisu#9`
- Branch: `feat/keep-screen-awake`
- Base: `main`

## Minimal upstream scope
- `src/main.ts`: app-lifetime wake-lock owner 설치.
- `src/ts/screenWakeLock.ts`: Screen Wake Lock lifecycle.
- `src/ts/screenWakeLock.test.ts`: lifecycle regression coverage.

## Dependencies
없음. DB schema, settings UI, i18n, server runtime, notification relay에 의존하지 않는다.

## Explicit exclusions
- 기존 `keepSessionAlive` 설정 재사용/의미 확장 금지.
- Android native wake lock 도입 없음.
- hidden/background 상태에서 lock을 강제로 유지하지 않음.
- OS lock screen 또는 보안 정책 우회 없음.

## Verification evidence
구현 branch diff는 세 파일로 한정되어 있다. 자동 검증은 PR #9 required checks가 담당하며, 실제 화면 유지 성공은 메인폰 실기기 timeout 검증이 추가로 필요하다.

## Upstream pitch
공식 upstream 제안 여부는 로컬 실기기 검증 후 결정한다. 공식 제안을 준비한다면 Screen Wake Lock을 독립 capability로 설명하고, unsupported/denied 환경에서 no-op 하는 graceful degradation을 유지한다.

## Review / PR state
- local PR #9: DRAFT.
- official `PocketRisu/PocketRisu` PR: `NOT_PREPARED`.
- next action: PR #9 checks 확인 후 메인폰 real-device validation.
