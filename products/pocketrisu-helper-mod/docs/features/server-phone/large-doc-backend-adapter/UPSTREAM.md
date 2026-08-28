# Upstream / PR notes — SERVER-LARGE-DOC-BACKEND-ADAPTER

상태: **HOLD — design first**

## 현재 판단

이 기능은 현재 personal PocketRisu modification 후보이며, official upstream PR 후보로 확정되지 않았다.

기존 `plugins/termux/large-doc-editor/server.py`에서 검증된 document-session/chunk/workspace 경계를 참고하되, PocketRisu current architecture에 맞는 좁은 adapter가 실제로 필요한지 먼저 조사한다.

## PR 후보가 되기 위한 조건

1. PocketRisu current server/API/plugin boundary INSPECT_ONLY 완료.
2. 장문/대형 문서 use-case가 기존 기능으로 해결되지 않는다는 근거 확보.
3. read-only `files/open/chunk` 최소 slice로 독립 가능.
4. filesystem/workspace 경계 테스트 포함.
5. 기존 DB/save optimization, plugin storage, Usage/DevPass bridge와 결합하지 않음.

## PR decomposition

- PR 1 후보: read-only document adapter only.
- PR 2 후보: explicit chunk write/save, PR 1 검증 후에만.

원본 large-doc-editor 자체 변경과 PocketRisu adapter 변경은 동일 PR에 섞지 않는다.
