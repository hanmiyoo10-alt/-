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

## 남은 별도 병목 — HOLD
- Worker launch 전 structured clone
- worker result 후 synchronous chunk-store CDC/hash/SQLite commit
