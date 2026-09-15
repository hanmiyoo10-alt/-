# Study Memory Ledger

시간축을 가진 학습 관찰을 보존하는 **append-only evidence memory**입니다.

`PROFILE.md`의 안정적 특성이나 `STRATEGIES.md`의 현재 전략을 직접 결정하지 않습니다. 이 문서는 그 판단에 사용할 수 있는 관찰 근거를 남깁니다.

## 기록 원칙

```text
관찰 발생
→ 가능한 한 구체적으로 기록
→ 필요하면 후속 관찰 추가
→ 나중에 해석이 바뀌어도 원 기록은 삭제하지 않음
```

한 번의 좋은/나쁜 결과만으로 일반적인 학습 성향을 확정하지 않습니다.

## 상태

```text
OBSERVED
HYPOTHESIS
CONFIRMED_PATTERN
DISMISSED
REGRESSION_CONTROL
```

- `OBSERVED`: 실제로 관찰된 결과
- `HYPOTHESIS`: 관찰에서 나온 설명 가설
- `CONFIRMED_PATTERN`: 반복 관찰로 패턴성이 충분히 확인됨
- `DISMISSED`: 후속 근거로 초기 해석이 기각됨
- `REGRESSION_CONTROL`: 앞으로도 유지되는지 확인할 가치가 있는 좋은 패턴/성과

## Entry schema

```text
Entry ID:
Date:
Subject / scope:
Status:
Observation:
Context:
Result:
Interpretation:
Confidence:
Related memory IDs:
Follow-up trigger:
Resolution / later evidence:
```

## Entries

### E-2026-09-07-001 — 패턴 분류 접근의 반복 효과

```text
Entry ID: E-2026-09-07-001
Date: 2026-09-07
Subject / scope: 여러 과목에 걸친 학습 방식
Status: CONFIRMED_PATTERN
Observation: 사용자는 문제나 출제의 패턴을 체크하고 분류하기 시작했을 때 역사, 수학, 영어 등 서로 다른 과목에서 학습 성과가 좋아졌던 경험을 보고했다.
Context: 과거 학습 경험을 바탕으로 PSAT 공부법을 논의하는 과정.
Result: 패턴 인식/분류가 한 과목에만 국한되지 않고 반복적으로 유효했던 것으로 보고됨.
Interpretation: 새로운 과목에서도 무작정 반복하기보다 문제 구조와 유형을 먼저 분류하는 접근이 높은 재사용 가치를 가질 가능성이 큼.
Confidence: HIGH
Related memory IDs: P-001, S-PSAT-001
Follow-up trigger: PSAT 문제풀이에서 패턴 분류가 실제 정확도/속도 개선으로 이어지는지 관찰.
Resolution / later evidence: 현재 확인된 반복 패턴으로 유지.
```

### E-2026-09-07-002 — 표현이 달라진 동일 의미 판별의 어려움

```text
Entry ID: E-2026-09-07-002
Date: 2026-09-07
Subject / scope: 언어 기반 문제풀이
Status: OBSERVED
Observation: 사용자는 같은 의미를 다른 단어나 표현으로 바꾸어 제시했을 때 대응 관계를 찾는 부분이 어렵다고 직접 설명했다.
Context: 국어/영어 경험과 PSAT 언어논리 접근을 연결해 논의하는 과정.
Result: 단순 어휘 암기보다 의미 보존 여부, 표현 변환, 동치관계 판별이 병목 후보로 드러남.
Interpretation: 언어논리에서 선지와 지문 사이의 표현 변환을 명시적으로 추적하는 훈련이 중요할 수 있음.
Confidence: MEDIUM
Related memory IDs: P-002, S-PSAT-002
Follow-up trigger: 실제 PSAT 오답에서 동의표현/재진술/범주변환 때문에 틀리는 사례가 반복되는지 확인.
Resolution / later evidence: 추가 문제풀이 근거 필요.
```

### E-2026-09-14-001 — AI 프로그래밍 공부 시작

```text
Entry ID: E-2026-09-14-001
Date: 2026-09-14
Subject / scope: AI 프로그래밍입문 / Python / Colab
Status: OBSERVED
Observation: 사용자가 AI 프로그래밍 공부를 시작한다고 명시했고, Google Drive의 `학교_전공공부/AI 프로그래밍입문`에서 1주차 Python 입문 자료와 변수·연산자 자료를 확인했다.
Context: 새 공부 주제를 기존 PSAT 흐름과 분리해 시작하는 과정.
Result: 현재 확인된 초반 범위는 Colab 사용, Python 기본 자료형, 변수, `input()`과 형 변환, 기본 연산자이다.
Interpretation: 과목별 실제 실습 증거를 쌓기 전까지 기존 학습 전략의 전이를 확정하지 않고, 실행 전 결과 예측과 오류 원인 분류를 시험한다.
Confidence: HIGH
Related memory IDs: NONE
Follow-up trigger: 실제 Colab 코드 실습에서 어떤 오류/혼동이 반복되는지 확인하거나, 사용자가 언급한 오후 4:57 Colab 자료가 식별될 때 갱신한다.
Resolution / later evidence: 초기 진입 상태. 추가 실습 근거 필요.
```

### E-2026-09-14-002 — 오후 4:57 Colab 노트북 식별

```text
Entry ID: E-2026-09-14-002
Date: 2026-09-14
Subject / scope: AI 프로그래밍입문 / Colab source locator
Status: OBSERVED
Observation: Google Drive의 `코랩` 폴더에서 `Untitled1.ipynb`가 2026-09-14 16:57 KST에 마지막 수정된 것으로 확인되어 사용자가 지정한 `오후 4:57` 자료와 일치했다.
Context: 2주차 폴더가 비어 있어 실제 실습 자료의 위치를 다시 추적한 과정.
Result: `Untitled1.ipynb`에는 변수, 사칙연산, `input()`, `int()`, 문자열 출력, 몫/나머지, 누적 대입 등 초반 수업 범위를 직접 시행착오로 연습한 기록이 존재한다.
Interpretation: 현재 AI 프로그래밍 실습 증거를 볼 때는 1주차 PDF뿐 아니라 `코랩/Untitled1.ipynb`를 우선 확인해야 한다. 개별 실수는 아직 durable 약점으로 일반화하지 않는다.
Confidence: HIGH
Related memory IDs: E-2026-09-14-001
Follow-up trigger: 노트북의 시행착오에서 같은 오류 구조가 여러 번 반복되는지 분류하고, 다른 문제에서도 재현되는지 확인한다.
Resolution / later evidence: `오후 4:57` 자료 식별 문제는 해소됨.
```

### E-2026-09-14-003 — 현재 경계: 문자열 리터럴과 이스케이프 조합

```text
Entry ID: E-2026-09-14-003
Date: 2026-09-14
Subject / scope: AI 프로그래밍입문 / 현재 숙련 경계
Status: OBSERVED
Observation: 사용자는 `Untitled1.ipynb`의 마지막 문자열 출력 문제 이전 범위는 이제 대체로 수월하게 풀 수 있다고 직접 확인했다. 마지막 문제에서는 `print('It's really hot!', ...)`처럼 작은따옴표 문자열 내부의 apostrophe가 먼저 문자열 경계를 깨뜨렸고, 같은 문제 안에 `\n`, `\t`, 경로의 역슬래시, 내부 따옴표가 동시에 등장했다.
Context: 노트북 마지막 시행착오를 역추적하며 현재 막힌 지점을 분리하는 과정.
Result: 계산/변수/input/int/기본 연산 자체보다 `STRING_LITERAL_BOUNDARY`와 `ESCAPE_SEQUENCE`가 결합되는 순간이 현재 첫 명확한 병목으로 보인다.
Interpretation: 이스케이프 문자 전반을 약점으로 일반화하지 않는다. 먼저 따옴표 경계와 문자열 내부/외부를 안정적으로 구분한 뒤 `\n`, `\t`, `\\`를 각각 분리 연습하고 새 예제로 전이를 확인한다.
Confidence: HIGH
Related memory IDs: E-2026-09-14-002
Follow-up trigger: 따옴표만 있는 문제, `\n`만 있는 문제, `\\`만 있는 문제를 각각 풀고 조합 문제에서도 안정적으로 해결되는지 확인한다.
Resolution / later evidence: 현재 병목 후보로 유지. 반복 증거 전에는 durable 약점으로 승격하지 않음.
```
