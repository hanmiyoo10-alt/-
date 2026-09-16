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
State: CANDIDATE  
Confidence: MEDIUM  
First observed: 2026-09-16, AI-MATH-W3-3.2  
Last observed: 2026-09-16, AI-MATH-W3-R3  
Evidence problem IDs: AI-MATH-W3-3.2, AI-MATH-W3-3.3, AI-MATH-W3-3.4, AI-MATH-W3-3.5, AI-MATH-W3-R3  
Typical trigger: 연쇄법칙이나 곱의 미분법 안에서 여러 기본 도함수를 동시에 꺼내야 할 때.  
Failure mechanism: 상위 구조 판단에 주의를 쓰는 동안 기본 도함수 공식을 검증 없이 바로 적어 원함수와 도함수를 혼동하거나, `sec u -> sec u tan u`처럼 필요한 한 층의 공식을 끝까지 쓰지 못한다.  
Correction cue: 큰 미분법을 적용하기 전에 각 기본 함수 옆에 도함수만 먼저 짧게 적는다. 예: `tan -> sec^2`, `sec -> sec tan`, `e^x -> e^x`, `sqrt{x} -> 1/(2sqrt{x})`.  
Success evidence: AI-MATH-W3-3.4에서 `tan -> sec^2`를 cue 이후 정확히 회수했다. AI-MATH-W3-3.5에서는 문제 제시 때 기본 도함수 공식이 함께 제공된 상태에서 `e^x -> e^x`, `cos -> -sin`, `sin -> cos`를 정확히 적용하고 접선 문제까지 완결했다. AI-MATH-W3-R3에서는 공식 힌트 없이 `(cos y)'=-sin(y)y'`를 정확히 적용했다. 다만 반복 실패가 직접 확인된 `tan -> sec^2`와 `sec -> sec tan`의 무힌트 성공은 아직 확인되지 않았다.  
Review trigger: 다음 문제에서 `tan` 또는 `sec` 기본 도함수가 다시 등장할 때, 별도 힌트 없이 정확히 회수되는지 확인한다.  
Related strategy IDs: none  
Notes: 이전 `IMPROVING` 판정은 cue-assisted 성공을 개선 증거로 과하게 해석한 면이 있어 `CANDIDATE`로 조정했다. R3에서 `cos -> -sin`의 무힌트 성공이 생겼지만, 패턴의 직접 반복 실패 대상인 `tan`/`sec`이 아직 미검증이므로 상태는 유지한다.

### AI-MATH-P2

Pattern ID: AI-MATH-P2  
Scope: AI 수학 / 음함수 미분에서 종속변수 `y`가 함수 안쪽에 들어간 합성함수, 특히 `e^y`  
Pattern: `y=y(x)`인 상황에서 함수 안쪽의 종속변수 `y`를 그대로 보존하지 못하거나 내부 미분 `y'`를 붙이지 않는 오류가 반복되었다. 직접 실패가 반복된 형태는 `e^y`를 `e^x`처럼 바꾸거나 `d(e^y)/dx = e^y y'`의 `y'`를 누락하는 경우였다.  
State: IMPROVING  
Confidence: MEDIUM  
First observed: 2026-09-16, AI-MATH-W3-3.7  
Last observed: 2026-09-16, AI-MATH-W3-R4  
Evidence problem IDs: AI-MATH-W3-3.7, AI-MATH-W3-R1, AI-MATH-W3-R2, AI-MATH-W3-R3, AI-MATH-W3-R4  
Typical trigger: 음함수 미분에서 `g(y)`가 나오고, 특히 `x g(y)`처럼 곱의 미분과 연쇄법칙을 동시에 적용해야 할 때.  
Failure mechanism: 미분 변수 `x`에 주의를 두면서 원래 식의 내부 변수 `y`를 `x`로 정규화해버리거나, `g(y)`를 합성함수로 보지 않아 내부 미분 `y'`를 누락한다.  
Correction cue: 미분 전에 함수 안쪽 변수를 먼저 확인하고 원래 식을 그대로 복사한다. `e^x -> e^x`, `e^y -> e^y y'`; 일반적으로 `g(y) -> g'(y)y'`. 그 뒤 곱의 미분을 적용한다.  
Success evidence: AI-MATH-W3-R2에서는 명시적 cue 뒤 `sin(y)`를 보존하고 `(sin y)'=cos(y)y'`를 정확히 적용했다. AI-MATH-W3-R3에서는 공식 힌트 없이 `cos(y)`를 보존하고 `(cos y)'=-sin(y)y'`를 정확히 적용했으며, 곱의 미분까지 맞게 수행했다. AI-MATH-W3-R4에서는 직접 실패 형태였던 `e^y`가 다시 등장했을 때 공식 힌트 없이 `e^y + x e^y y' + y' = 0`에서 `y' = -e^y/(x e^y + 1)`까지 정확히 완결했다.  
Review trigger: 같은 날 즉시 반복보다 간격을 둔 다음 음함수 문제에서 `e^y` 또는 다른 `g(y)`가 다시 나올 때, 별도 힌트 없이 내부 변수 보존과 `y'` 부착이 유지되는지 확인한다.  
Related strategy IDs: none  
Notes: 두 번의 `e^y` 관련 실패 뒤 cue-assisted `sin(y)` 성공, 무힌트 `cos(y)` 성공, 이어 직접 실패 형태인 `e^y`의 무힌트 완전 정답이 확인되어 개선 증거가 강화되었다. 다만 직접 성공은 아직 한 번이므로 `STABLE`로 올리지 않고 `IMPROVING`을 유지한다.
