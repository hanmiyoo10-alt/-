# DB/save 성능 최적화

상태: **DONE**

## 기존 `/api/patch` 병목
1. recursive whole stripped DB hash
2. whole DB JSON clone
3. patch apply
4. mutation/save
5. full encode + MD5 ETag

## 적용
- top-level compositional hash cache
- zero-op fast path
- top-level branch clone
- opaque revision ETag
- pluginCustomStorage direct-child incremental hash/selective clone
- third-level lazy subchild hash cache
- third-level selective clone
- copy/move `path` + `from` 추적

## 검증
hash MATCH, atomicity/원본 불변, 실제 BackgroundPersist, restart persistence 모두 확인.

대표 큰 patch:
- 개선 전 약 1.1~1.8s
- 최종 반복 측정 약 **287ms**

작은 plugin patch 약 39~71ms.

임시 PatchTiming/PatchShape와 dead MD5 helper 제거 후 `node --check` + clean restart 검증.

## 정식 upstream staged PR series — IN PROGRESS
- Stage A: official `PocketRisu/PocketRisu#67` — OPEN / mergeable / review·check 대기.
- Stage B: local draft `hanmiyoo10-alt/PocketRisu#5` — compositional DB patch hash cache.
- Stage C: local draft `#6` — top-level selective clone.
- Stage D: local draft `#7` — pluginCustomStorage direct-child hash/clone.
- Stage E: local draft `#8` — depth-3 lazy subchild hash/selective clone.

모든 B~E는 직전 단계 위 **1 clean commit**으로 분리되어 있고, 공식 단계가 merge/reimplement/reject될 때마다 최신 `develop`을 다시 검사한 뒤 다음 단계만 rebase/rebuild한다. 중복되거나 구조 충돌이 생긴 단계는 건너뛴다.

## 남은 별도 병목 — HOLD
- Worker launch 전 structured clone
- worker result 후 synchronous chunk-store CDC/hash/SQLite commit
