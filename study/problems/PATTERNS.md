# Error & Success Patterns

여러 문제에서 반복되는 **오류 구조와 유효한 교정 cue**의 현재 권위 문서입니다.

개별 문제 기록은 `LEDGER.md`가 책임집니다. 이 문서는 반복 구조만 승격해서 보존합니다.

## Pattern states

```text
CANDIDATE
ACTIVE
IMPROVING
STABLE
REVIEW_REQUIRED
DISMISSED
```

## Pattern schema

```text
Pattern ID:
Scope:
Pattern:
State:
Confidence: LOW | MEDIUM | HIGH
First observed:
Last observed:
Evidence problem IDs:
Typical trigger:
Failure mechanism:
Correction cue:
Success evidence:
Review trigger:
Related strategy IDs:
Notes:
```

## 해석 원칙

좋은 패턴 표현은 좁고 행동 가능해야 합니다.

좋은 예:

```text
선지의 표현이 지문과 다른 단어로 바뀌면 의미 동치 여부 확인을 생략하는 경향이 반복됨.
Correction cue = 핵심 명사를 지문 표현으로 역번역한 뒤 범위가 같은지 확인.
```

피할 예:

```text
언어 감각이 약함.
```

패턴은 사람 전체에 대한 평가가 아니라 **특정 판단 과정에서 재현되는 구조**를 기록합니다.

## Patterns

### AI-MATH-P1

Pattern ID: AI-MATH-P1  
Scope: AI 수학 / 기본 도함수 회수, 특히 삼각함수  
Pattern: 함수 구조나 적용해야 할 미분법은 인식하지만, 실제 전개 단계에서 기본 도함수 공식을 원함수와 혼동하거나 완전한 식으로 회수하지 못하는 오류가 반복됨. 직접 반복 확인된 시작 사례는 `(tan x)' = sec^2 x` 회수 실패였고, 이후 `sec` 도함수에서도 유사한 병목이 나타났다.  
State: IMPROVING  
Confidence: MEDIUM  
First observed: 2026-09-16, AI-MATH-W3-3.2  
Last observed: 2026-09-16, AI-MATH-W3-3.5  
Evidence problem IDs: AI-MATH-W3-3.2, AI-MATH-W3-3.3, AI-MATH-W3-3.4, AI-MATH-W3-3.5  
Typical trigger: 연쇄법칙이나 곱의 미분법 안에서 여러 기본 도함수를 동시에 꺼내야 할 때.  
Failure mechanism: 상위 구조 판단에 주의를 쓰는 동안 기본 도함수 공식을 검증 없이 바로 적어 원함수와 도함수를 혼동하거나, `sec u -> sec u tan u`처럼 필요한 한 층의 공식을 끝까지 쓰지 못한다.  
Correction cue: 큰 미분법을 적용하기 전에 각 기본 함수 옆에 도함수만 먼저 짧게 적는다. 예: `tan -> sec^2`, `sec -> sec tan`, `e^x -> e^x`, `sqrt{x} -> 1/(2sqrt{x})`.  
Success evidence: AI-MATH-W3-3.4에서 이전 두 문제에서 실패했던 `tan -> sec^2`를 cue 이후 정확히 회수했다. AI-MATH-W3-3.5에서는 곱의 미분 안에서 `e^x -> e^x`, `cos -> -sin`, `sin -> cos`를 정확히 회수하고 접선 문제까지 완결했다.  
Review trigger: 다음 문제에서 기본 함수 도함수가 다시 등장할 때, 별도 힌트 없이 정확히 회수되는지 확인. 특히 아직 직접 성공 확인이 없는 `sec -> sec tan`을 다시 점검한다.  
Related strategy IDs: none  
Notes: 기본 도함수 회수는 연속해서 개선 증거가 생겼지만 `sec` 도함수는 아직 직접 재검증되지 않았다. 따라서 `IMPROVING` 상태를 유지한다.
