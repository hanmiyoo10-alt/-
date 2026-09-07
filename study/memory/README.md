# Study Long-Term Memory

`study/memory/`는 공부 대화와 학습 기록에서 장기적으로 재사용할 가치가 있는 정보를 보존하는 **공부 전용 장기기억 시스템**입니다.

이 구조는 SimCore의 Living Authority Map, Current-State Snapshot, Historical-vs-Living 분리, append-only ledger 원칙을 공부용으로 축소해 가져옵니다.

## 핵심 원칙

```text
대화/공부 기록
→ 후보 기억 포착
→ 근거 축적 및 검증
→ 장기기억 승격
→ 현재 스냅샷에 필요한 부분만 투영
```

장기기억은 채팅 내용을 무조건 복사하는 저장소가 아닙니다.

```text
한 번 언급됨 != 영구 사실
추측 != 학습 성향
현재 전략 != 영원한 전략
오래된 기록 != 현재 상태
```

## Authority map

| 질문 | 권위 문서 |
| --- | --- |
| 검증 전 기억 후보는 어디에 있는가? | `INBOX.md` |
| 실제 관찰과 사건 이력은 어디에 있는가? | `LEDGER.md` |
| 비교적 안정적인 학습 특성은 어디에 있는가? | `PROFILE.md` |
| 현재/과거 공부 전략과 변경 이유는 어디에 있는가? | `STRATEGIES.md` |
| 지금 당장 알아야 할 현재 상태는 어디서 보는가? | `CURRENT.md` |
| 개별 문제/오답의 실제 증거는 어디에 있는가? | `../problems/LEDGER.md` |
| 반복 오류 패턴의 문제 단위 근거는 어디에 있는가? | `../problems/PATTERNS.md` |

`CURRENT.md`는 편의를 위한 current-only projection입니다. 원본 권위를 대체하지 않습니다.

## 기억 계층

### 1. Candidate memory

`INBOX.md`

아직 장기기억으로 확정하면 안 되는 관찰, 가설, 사용자가 한 번 말한 선호 등을 둡니다.

### 2. Evidence memory

`LEDGER.md`

학습 결과, 반복 실수, 공부법 실험 결과 등 시간축을 가진 관찰을 append-only로 보존합니다.

문제 단위 세부 증거는 `study/problems/LEDGER.md`가 소유합니다. 장기기억 ledger는 필요한 경우 그 문제 ID나 패턴 ID를 근거로 참조합니다.

기존 기록이 나중에 틀린 것으로 밝혀져도 삭제하지 않고 `DISMISSED` 또는 후속 기록으로 해소합니다.

### 3. Durable memory

`PROFILE.md`

여러 번 확인되었거나 사용자가 명시적으로 현재 사실이라고 확정한, 비교적 안정적인 학습 특성을 보존합니다.

문제 패턴이 생겼다는 이유만으로 자동 승격하지 않습니다. 서로 다른 문제에서 충분히 반복되고 학습 의사결정에 재사용할 가치가 있을 때만 승격합니다.

### 4. Strategy memory

`STRATEGIES.md`

공부법과 의사결정을 보존합니다. 전략이 바뀌면 과거 전략을 지우지 않고 `SUPERSEDED` 관계를 남깁니다.

문제 패턴에서 나온 교정 cue가 반복적으로 효과를 보이면 전략의 근거로 사용할 수 있습니다.

### 5. Current projection

`CURRENT.md`

새 세션이 빠르게 재개할 수 있도록 현재 목표, 활성 과목, 최근 핵심 패턴, 바로 다음 행동만 짧게 보여줍니다.

## Problem-memory integration

```text
study/problems/LEDGER.md
= 문제 단위 실제 기록

study/problems/PATTERNS.md
= 반복 오류/성공 구조

study/memory/LEDGER.md
= 학습 전반의 관찰 근거

study/memory/PROFILE.md / STRATEGIES.md
= 충분히 검증된 장기 해석
```

승격 흐름은 다음을 기본으로 합니다.

```text
문제 1회 기록
→ problems/LEDGER
→ 반복되면 problems/PATTERNS
→ 재검증/전이 확인
→ 필요하면 memory/LEDGER
→ 충분한 근거가 있을 때만 PROFILE / STRATEGIES
```

## Promotion rule

기억 후보가 `PROFILE.md` 또는 `STRATEGIES.md`로 승격되려면 다음 중 하나 이상을 만족해야 합니다.

1. 사용자가 명시적으로 현재 사실/방침이라고 확인했다.
2. 서로 다른 시점의 관찰에서 반복되었다.
3. 실제 결과가 가설을 뒷받침했다.
4. 이후 공부 의사결정에 반복적으로 영향을 줄 만큼 중요하다.

불확실하면 승격하지 않습니다.

## Freshness rule

장기기억도 낡을 수 있습니다.

각 durable memory는 필요할 때 다음 상태 중 하나로 해석합니다.

```text
CURRENT
REVIEW_REQUIRED
SUPERSEDED
UNRESOLVED
```

오래되었다는 이유만으로 자동 폐기하지 않고, 현재 학습 맥락에서 여전히 적용되는지를 확인합니다.

## Public repository boundary

이 저장소는 public이므로 기본적으로 다음 정보는 기록하지 않습니다.

- 실명, 연락처, 계정 정보 등 개인식별정보
- 비밀번호, 토큰, 인증정보
- 공개할 의도가 확인되지 않은 민감한 개인 정보

학습 성향, 전략, 오답 패턴처럼 공부에 직접 필요한 정보만 최소한으로 기록합니다. 구체적인 개인 성적 이력 등 공개 범위가 애매한 정보는 자동으로 장기기억에 넣지 않습니다.

## 업데이트 순서

```text
1. 관찰 발생
2. INBOX 또는 LEDGER에 먼저 기록
3. 근거 검토
4. PROFILE / STRATEGIES 승격 또는 수정
5. CURRENT를 필요한 만큼 동기화
```

절대 `CURRENT.md`를 먼저 고치고 그것을 근거로 원본 기억을 바꾸지 않습니다.

## v1 목표

v1은 자동화보다 **기억의 경계와 권위**를 먼저 정확히 세우는 단계입니다.

자동 추출, 임베딩 검색, CI 검사, 벡터 DB 등은 실제 기록량이 커져 수동 운용 비용이 생길 때 별도 단계로 검토합니다.
