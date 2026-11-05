# Local Model Lab Architecture

## 1. Target

이 프로젝트는 외부 teacher API의 능력을 로컬 student로 증류하는 것을 목표로 한다.

```text
                    Local Student
                         |
       +-----------------+------------------+
       |                 |                  |
   embedding         reranking            judge
       |                 |                  |
 semantic/context    relevance         decisions
```

최종 runtime은 teacher API를 호출하지 않는다.

## 2. Teacher capability decomposition

### Semantic teacher

Voyage-4-large 계열 신호:

- query/document similarity structure
- positive / hard-negative ordering
- multilingual semantic retrieval behavior

주 학습 목표는 raw vector 숫자의 완전 복제가 아니라 teacher가 만드는 관계와 순위 구조를 보존하는 것이다.

### Context teacher

Voyage-context-4 계열 신호:

- 동일 chunk의 isolated embedding과 document-conditioned embedding 차이
- antecedent/reference resolution이 필요한 chunk의 표현 변화
- long-document retrieval ordering

### Reranker teacher

Voyage reranker 계열 신호:

- query + candidate pair relevance
- candidate ordering
- hard-negative discrimination

Contextual reranking 실험에서는 주변 문맥이 target 자체의 relevance를 대신하지 않도록 input contract를 분리한다.

### Decision teacher

Jev 계열 신호:

- relevance
- answer usefulness
- context dependency
- contradiction
- keep/drop
- calibrated probability / confidence

정확한 schema는 pilot dataset 결과로 확정한다.

## 3. Proposed student modes

```text
<embed_query>
<embed_document>
<context_embed>
<rerank>
<judge>
```

하나의 shared backbone을 기본 가설로 두되, multi-head가 성능을 훼손하면 adapter 또는 partial expert 분리를 허용한다.

## 4. Proposed objective

```text
L_total =
  w_retrieval * L_contrastive
+ w_semantic  * L_teacher_similarity
+ w_context   * L_contextual_distillation
+ w_rerank    * L_ranking
+ w_judge     * L_decision
+ w_calib     * L_calibration
```

초기에는 모든 loss를 동시에 최적화하지 않는다.

## 5. Curriculum

```text
S1 semantic retrieval
 -> S2 contextual embeddings
 -> S3 reranking
 -> S4 judging/calibration
 -> S5 joint finetune + forgetting checks
```

각 단계 사이에 이전 capability regression을 측정한다.

## 6. Data record draft

```json
{
  "query": "...",
  "document_id": "...",
  "target_chunk": "...",
  "surrounding_context": "...",
  "positives": [],
  "hard_negatives": [],
  "teacher": {
    "semantic": {},
    "context": {},
    "rerank": {},
    "judge": {}
  }
}
```

실제 raw API response를 그대로 영구 저장하지 않고 필요한 학습 신호만 schema화하는 방향을 우선 검토한다.

## 7. Evaluation

최소 평가 축:

- Recall@5 / Recall@20
- MRR@10
- nDCG@10
- Korean retrieval
- multilingual retrieval
- long-document retrieval
- coreference/context-dependent retrieval
- hard-negative reranking
- calibration error / Brier score
- capability regression across training stages

## 8. Non-goals for bootstrap

- release channel 생성
- production model 선언
- 임의의 성능 수치 기입
- 확인되지 않은 provider contract 가정
- API key 또는 private corpus 저장
