# Feature-ID: SERVER-LARGE-DOC-BACKEND-ADAPTER

상태: **DESIGN_READY / READ_ONLY_FIRST / IMPLEMENTATION_NOT_STARTED**

상세 설계: [`DESIGN.md`](DESIGN.md)

## 목적

기존 `plugins/termux/large-doc-editor` 기능은 독립 프로젝트/기능으로 유지하면서, PocketRisu backend에 필요한 대형 문서 처리 기능만 별도 adapter/service 경계로 이식한다.

## source evidence

원본 backend:
- `plugins/termux/large-doc-editor/server.py`
- localhost bind: `127.0.0.1`
- 기본 port: `8765`
- workspace-scoped 파일 접근
- 허용 확장자: `.txt`, `.md`, `.log`, `.json`
- session 기반 chunk 읽기/수정/저장

확인된 API:
- `GET /api/files`
- `POST /api/open`
- `GET /api/chunk`
- `POST /api/chunk`
- `POST /api/save`

원본은 요청 크기 제한, workspace 경계, source-changed 충돌 처리(`SOURCE_CHANGED`)를 이미 가진다.

## 2026-08-29 INSPECT_ONLY 결과

PocketRisu 현재 경계를 조사해 1차 adapter 위치를 확정했다.

- `server/node/server.cjs`는 독립 route module 등록 패턴을 이미 가진다.
- `src/ts/storage/nodeStorage.ts`가 NodeOnly authenticated same-origin 요청을 소유한다.
- 기존 `/api/read`, `/api/write`, `/api/list`는 PocketRisu 자체 KV/storage 경계이며 arbitrary host filesystem editor로 재사용하면 안 된다.
- 따라서 large-doc은 별도 `server/node/large-doc-adapter.cjs` 경계가 맞다.

## 확정된 1차 구조

```text
메인폰 Firefox -> 기존 PocketRisu 연결 -> 서버폰 PocketRisu :6001
                                      -> large-doc-adapter.cjs
                                      -> 127.0.0.1:8765 large-doc-editor
                                      -> configured workspace
```

첫 단계에서는 Python 기능을 즉시 Node로 재작성하지 않는다. 기존 backend를 reference implementation으로 유지한 채 adapter contract부터 검증한다. 이후 extra process가 실제 운영 부담으로 확인될 때만 동일 contract를 지키는 Node-native port를 별도 단계로 검토한다.

## 1차 최소 범위

처음에는 read-only로 한정한다.

1. 런타임 INSPECT_ONLY: 서버폰에서 large-doc service 실행 여부와 workspace ownership 확인.
2. `GET /api/large-doc/files` — 원본 `workspace` 절대경로는 browser에 전달하지 않는다.
3. `POST /api/large-doc/open` — relative path + suffix allowlist.
4. `GET /api/large-doc/chunk` — opaque session + bounded index.
5. path traversal, absolute path, unknown session, timeout, malformed dependency response 검증.

다음 단계에서만 쓰기 기능을 연다:
- chunk update
- explicit save
- PocketRisu active-session/write-lock guard
- `SOURCE_CHANGED` 409 보존

## 비범위

- Usage Dashboard/DevPass 기능과 하나의 거대한 backend로 통합.
- 기존 PocketRisu `/api/read|write|list`에 arbitrary filesystem 의미 추가.
- 임의 filesystem 전체 노출.
- 외부 bind로 변경.
- 자동 저장 의미 변경.
- PocketRisu DB/save 최적화와 결합.
- 서버폰 Android 알림.
- PM2 또는 runtime manager 변경.

## 안전 불변식

- workspace 밖 경로는 접근할 수 없어야 한다.
- browser가 workspace root/absolute path를 지정할 수 없어야 한다.
- write/save는 read-only 연동이 검증되기 전 활성화하지 않는다.
- source가 외부에서 바뀐 경우 덮어쓰지 않고 충돌로 중단한다.
- large-doc session은 PocketRisu DB에 영속화하지 않는다. dependency restart 시 reopen한다.
- 기존 large-doc-editor의 독립 기능을 깨지 않는다.
- PocketRisu core 장애와 large-doc adapter 장애를 별개로 진단할 수 있어야 한다.

## 다음 액션

runtime code를 수정하기 전 서버폰에서 `:8765` service/workspace 상태를 INSPECT_ONLY로 확인한다. 이후 personal fork의 이 Feature-ID 전용 branch에서 read-only adapter + isolated tests만 구현한다.
