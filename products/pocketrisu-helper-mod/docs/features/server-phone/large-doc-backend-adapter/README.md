# Feature-ID: SERVER-LARGE-DOC-BACKEND-ADAPTER

상태: **DESIGN_NEEDED**

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

## PocketRisu 이식 원칙

- 원본 large-doc-editor 기능과 개발 흐름을 유지한다.
- 원본 server.py 전체를 PocketRisu core에 복붙해 합치지 않는다.
- document session/chunk/path-validation 같은 필요한 핵심 로직만 독립 adapter/service로 포팅한다.
- Usage/DevPass bridge adapter와 별도 Feature-ID/서비스 경계를 유지한다.
- 외부 네트워크에 `:8765`를 직접 노출하지 않는다.
- PocketRisu server가 localhost 경계를 통해 접근하는 구성을 우선한다.

## 1차 최소 범위

처음에는 read-only로 한정한다.

1. INSPECT_ONLY: PocketRisu backend에서 필요한 문서 use-case와 workspace 경계 확인.
2. 파일 목록: `/api/files` 상당 기능.
3. 문서 열기: `/api/open` 상당 기능.
4. chunk 읽기: `GET /api/chunk` 상당 기능.
5. path traversal, unknown session, oversized request, source change 검증.

다음 단계에서만 쓰기 기능을 연다:
- chunk update
- explicit save

## 비범위

- Usage Dashboard/DevPass 기능과 하나의 거대한 backend로 통합.
- 임의 filesystem 전체 노출.
- 외부 bind로 변경.
- 자동 저장 의미 변경.
- PocketRisu DB/save 최적화와 결합.
- 서버폰 Android 알림.
- PM2 또는 runtime manager 변경.

## 안전 불변식

- workspace 밖 경로는 접근할 수 없어야 한다.
- write/save는 read-only 연동이 검증되기 전 활성화하지 않는다.
- source가 외부에서 바뀐 경우 덮어쓰지 않고 충돌로 중단한다.
- 기존 large-doc-editor의 독립 기능을 깨지 않는다.
- PocketRisu core 장애와 large-doc adapter 장애를 별개로 진단할 수 있어야 한다.

## 다음 액션

구현 전 PocketRisu 현재 server/API/plugin nativeFetch 경계를 INSPECT_ONLY로 조사하고, 가장 좁은 adapter 위치를 결정한다. 그 전에는 runtime code를 수정하지 않는다.
