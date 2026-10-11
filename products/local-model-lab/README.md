# Local Model Lab

완전 로컬에서 동작하는 검색/리랭킹/판정 모델을 연구하고 구현하기 위한 독립 제품·연구 루트입니다.

## Goal

최종 목표는 외부 API 없이 로컬에서 다음 네 가지 능력을 하나의 모델 또는 하나의 로컬 패키지로 제공하는 것입니다.

1. `Voyage-4-large` 계열의 강한 범용 semantic retrieval
2. `Voyage-context-4` 계열의 document-aware contextual chunk embedding
3. Voyage reranker 계열의 query-document 정밀 ranking
4. Jev 계열의 structured/calibrated decision

외부 API는 최종 runtime dependency가 아니라 teacher-data 생성 및 비교 실험의 입력원으로만 취급합니다.

## Planned local interface

```text
embed_query(query) -> vector
embed_document(document) -> vector
context_embed(document) -> chunk vectors
rerank(query, candidates) -> ranked candidates
judge(query, candidate, context?) -> calibrated decisions
```

## Repository boundary

- Canonical root: `products/local-model-lab/`
- Current state: `products/local-model-lab/CURRENT.md`
- Product locator: `products/local-model-lab/product.json`
- Architecture: `products/local-model-lab/docs/ARCHITECTURE.md`
- Teacher-stack config: `products/local-model-lab/config/teacher-stack.json`

이 루트는 현재 **research-product-root**입니다. 아직 production, deployment, release authority를 만들지 않습니다.

## Security / data rule

API key, credential, session token, private user payload, 원본 민감 로그를 Git에 저장하지 않습니다.
Teacher API 사용 시 키는 환경 변수나 Git 밖의 secret store에서만 공급합니다.

## First milestone

1. teacher contract 고정
2. synthetic/query-document corpus 설계
3. Voyage/Jev teacher-output 수집기 구현
4. 10K~100K sample pilot dataset 생성
5. candidate local backbone 비교
6. multi-stage distillation baseline 학습
7. retrieval/rerank/calibration benchmark 구축
