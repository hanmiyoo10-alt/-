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
기존 병목:
1. whole stripped DB recursive hash
2. whole DB stringify/parse clone
3. patch apply
4. cache/mutation/save
5. full encode + MD5 ETag

개선:
- top-level compositional hash cache
- zero-op fast path
- top-level branch clone
- opaque revision ETag
- pluginCustomStorage direct-child incremental hash/selective clone
- third-level lazy subchild hash/selective clone
- copy/move의 `path`와 `from` 모두 추적

검증:
- hash MATCH=YES
- DEEP_REPLACE / MULTI_SUBCHILD / CHILD_ROOT_FALLBACK / COPY_MOVE atomicity 검증
- Hash mismatch 없음
- warning/error 없음
- BackgroundPersist commit 성공
- restart 후 plugin/character state 보존

대표 성능:
- 개선 전 큰 patch 약 1.1~1.8s
- depth3 hash+clone 반복 측정 total 약 **287ms**
- 작은 plugin patch 약 39~71ms

cleanup:
- PatchTiming/PatchShape 제거
- dead MD5 helper 제거
- `node --check` + clean restart 검증

## reconnect watcher
메인폰 passive watcher 구축.
- 2회 fail → DOWN
- 2회 success → recovered UP
- DOWN→UP에만 메인폰 notification
- 초기 UP은 무알림
- 자동복구/서비스 재시작 안 함

실전 `state=down → state=up recovered=1` 및 Android 알림 성공.

## 2026-08-23 새고/탭 복귀 조사
- 초장기챗 새고 시 reconnect watcher가 health DOWN→UP 감지.
- 서버 PID 유지.
- 해당 시각 SSH 단절 로그 없음.
- `/api/health` 초경량.
- `/api/session` 등록 관찰.
- session store 약 7.1KB / 87 entries.
- 10초대 정체 원인은 아직 미확정.

또한 직접 새고 없이 다른 Firefox 탭에서 복귀 후 논리 session boot가 다시 보이는 사례 조사 중.
