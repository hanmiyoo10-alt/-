# Local Model Lab — Current State

## Status

- lifecycle: `research-product-root`
- validation: `BOOTSTRAP`
- production authority: none
- release authority: none
- runtime authority: none
- current priority: `TEACHER_CONTRACT_AND_BACKBONE_SELECTION`

## Objective

외부 API에 의존하지 않는 하나의 로컬 모델을 만든다.

Target capability set:

```text
semantic embedding
+ contextual chunk embedding
+ reranking
+ calibrated judging
```

## Teacher plan

| Teacher | Intended supervision |
| --- | --- |
| Voyage-4-large | semantic geometry, retrieval ranking |
| Voyage-context-4 | context-aware chunk representation |
| Voyage reranker | pairwise/listwise relevance ordering |
| Jev | structured decision, probability, calibration |

Teacher 서비스 이름과 API 세부 버전은 실제 데이터 생성 시점의 공식 문서와 계정 가용성을 다시 확인한다.

## Student target

초기 가설:

- shared transformer backbone
- embedding head
- contextual embedding mode
- rerank/scalar head
- judge head
- 1024-d primary embedding target
- optional Matryoshka-compatible dimensions
- local-only inference

Base model, parameter count, tokenizer, exact context length, training framework는 아직 `UNASSIGNED`이다.

## Training stages

```text
Stage 1: semantic retrieval distillation
Stage 2: contextual embedding distillation
Stage 3: reranker distillation
Stage 4: Jev-style decision/calibration distillation
Stage 5: joint anti-forgetting finetune
```

## Open decisions

1. encoder-only vs decoder-derived/shared backbone
2. 1B / 2B / 4B class target
3. direct-vector regression 비중 vs relation/ranking distillation 비중
4. contextual chunk input contract
5. reranker candidate packing strategy
6. Jev label schema
7. dataset licensing / teacher-output usage-contract review
8. benchmark suite and Korean-heavy evaluation set

## Safety / authority

- API keys are never committed.
- API availability does not itself prove training/distillation rights.
- provider terms applicable at the time of dataset generation must be reviewed.
- generated teacher data must record provenance without recording secrets.
- this document does not create production or release authority.
