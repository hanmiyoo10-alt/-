# Problem Attempt Ledger

문제 단위 풀이 기록을 보존하는 **append-oriented evidence ledger**입니다.

이 문서는 특정 문제에서 실제로 어떤 판단을 했고, 무엇이 맞거나 틀렸는지를 보존합니다. 반복 약점 여부는 `PATTERNS.md`에서 별도로 판단합니다.

## Entry schema

```text
Problem ID:
Date:
Subject / area:
Source ref:
Result: CORRECT | WRONG | PARTIAL | UNRESOLVED
Confidence before check: LOW | MEDIUM | HIGH

Problem demand summary:
User interpretation / approach:
Correct reasoning summary:

Error type:
Error mechanism:
Next-time cue:

Related pattern IDs:
Review state: NONE | QUEUED | REVIEWED | MASTERED_CHECK
Later evidence / resolution:
```

## 기록 원칙

- 문제 원문이나 해설 원문을 통째로 복사하지 않습니다.
- `User interpretation / approach`는 가능하면 사용자가 실제로 어떤 식으로 읽었는지 남깁니다.
- 틀렸을 때는 정답 자체보다 **오류가 발생한 판단 단계**를 기록합니다.
- 맞았더라도 우연히 맞았거나 근거가 불안정하면 그 사실을 남깁니다.
- 나중에 재평가가 바뀌어도 과거 시점 기록을 삭제하지 않고 후속 내용을 추가합니다.

## Entries

### AI-MATH-W3-3.1

Problem ID: AI-MATH-W3-3.1
Date: 2026-09-16
Subject / area: AI 수학 / 도함수와 미분 법칙
Source ref: `AI 수학 입문` 3주차 연습문제 3.1, 사용자 풀이 사진 `20260916_133912874.jpg`
Result: WRONG
Confidence before check: NOT_RECORDED

Problem demand summary: 곱 형태의 유리식 표현을 편한 방식으로 미분한 뒤 특정 점의 도함수 값을 계산한다.
User interpretation / approach: 곱의 미분법을 바로 쓰지 않고 식을 전개하여 `1 + u^-2 + u^-1 + u^-3` 형태로 만든 뒤 항별로 미분하고 `u=-1`을 대입했다. 전개 전략과 전개 결과는 맞았다.
Correct reasoning summary: `d(u^n)/du = n u^(n-1)`을 각 항에 적용하면 `J'(u) = -2u^-3 - u^-2 - 3u^-4`이고, `u=-1`을 대입하면 `J'(-1)=-2`이다.

Error type: CALC_PROCESS
Error mechanism: 마지막 항 `u^-3`을 미분하면서 계수를 `-3`이 아니라 `-4`로 적었다. 지수는 `-4`로 내려가는 것이 맞지만 앞의 계수는 원래 지수 `-3`이어야 한다. 이 한 단계 때문에 최종값을 `-3`으로 계산했다.
Next-time cue: 거듭제곱 미분 때 `원래 지수 → 앞의 계수`, `지수는 1 감소`를 두 동작으로 분리해 확인한다. 예: `u^-3 → -3u^-4`.

Related pattern IDs: none; 단일 사례이므로 패턴으로 승격하지 않음.
Review state: NONE
Later evidence / resolution: pending.

### AI-MATH-W3-3.2

Problem ID: AI-MATH-W3-3.2
Date: 2026-09-16
Subject / area: AI 수학 / 연쇄법칙
Source ref: `AI 수학 입문` 3주차 연습문제 3.2, 사용자 풀이 사진 `20260916_135115459.jpg`
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: `tan(sqrt(1+t^2))` 형태의 다층 합성함수를 연쇄법칙으로 미분한다.
User interpretation / approach: 바깥 `tan`, 가운데 제곱근, 안쪽 `1+t^2`의 세 층을 표시하고 각 층의 미분을 곱하려는 연쇄법칙 구조는 올바르게 잡았다. 다만 최종 식을 확정하지 못했고 `tan` 및 제곱근의 도함수 표현이 섞였다.
Correct reasoning summary: 바깥부터 미분하면 `sec^2(sqrt(1+t^2)) * (1/(2sqrt(1+t^2))) * 2t`이고, 정리하면 `F'(t) = t sec^2(sqrt(1+t^2)) / sqrt(1+t^2)`이다.

Error type: KNOWLEDGE_GAP
Error mechanism: 함수의 합성 구조와 연쇄법칙 적용 순서는 인식했지만 기본 도함수 `d(tan x)/dx = sec^2 x`, `d(sqrt{x})/dx = 1/(2sqrt{x})`를 정확히 꺼내 쓰지 못해 식이 섞였다.
Next-time cue: 연쇄법칙 문제에서는 층을 나눈 뒤 각 층 옆에 기본 도함수만 먼저 적는다: `tan → sec^2`, `sqrt{x} → 1/(2sqrt{x})`, `1+t^2 → 2t`. 그 다음 세 항을 곱한다.

Related pattern IDs: AI-MATH-P1
Review state: NONE
Later evidence / resolution: AI-MATH-W3-R5에서 `(tan x)'=sec^2 x`를 공식 힌트 없이 정확히 회수했다. 직접 실패 형태의 무힌트 교정 성공이 한 번 확인됨.

### AI-MATH-W3-3.3

Problem ID: AI-MATH-W3-3.3
Date: 2026-09-16
Subject / area: AI 수학 / 곱의 미분법, 지수함수·삼각함수 미분
Source ref: `AI 수학 입문` 3주차 연습문제 3.3, 사용자 풀이 사진 `20260916_135845068.jpg`
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: `e^theta`와 `(tan theta - theta)`의 곱을 곱의 미분법으로 미분한다.
User interpretation / approach: 전체 식을 두 인수로 나누고 곱의 미분법의 두 항 구조를 사용하려 했다. 다만 첫 항에서 `(e^theta)'`를 `e^theta`로 유지하지 못했고, 두 번째 항에서 `(tan theta)'`를 `sec^2 theta`로 바꾸지 못했다.
Correct reasoning summary: `g'(theta) = e^theta(tan theta - theta) + e^theta(sec^2 theta - 1)`. 필요하면 `sec^2 theta - 1 = tan^2 theta`를 써서 `e^theta(tan theta - theta + tan^2 theta)`로 정리할 수 있다.

Error type: KNOWLEDGE_GAP
Error mechanism: 곱의 미분법이라는 큰 구조는 인식했지만 기본 도함수 회수 단계에서 `(e^theta)' = e^theta`와 `(tan theta)' = sec^2 theta`를 정확히 유지하지 못했다. 특히 `tan` 도함수 오류는 3.2에 이어 다시 나타났다.
Next-time cue: 곱의 미분을 전개하기 전에 각 인수 위에 도함수를 따로 적는다: `e^theta -> e^theta`, `tan theta - theta -> sec^2 theta - 1`. 그 다음 `u'v + uv'`에 대입한다.

Related pattern IDs: AI-MATH-P1
Review state: NONE
Later evidence / resolution: AI-MATH-W3-R5에서 `(tan x)'=sec^2 x`를 공식 힌트 없이 정확히 회수했다. 단순 기본함수 형태에서 무힌트 성공이 생겼으며, 복합 구조 안에서의 유지 여부는 추후 확인 대상이다.

### AI-MATH-W3-3.4

Problem ID: AI-MATH-W3-3.4
Date: 2026-09-16
Subject / area: AI 수학 / 다층 연쇄법칙
Source ref: `AI 수학 입문` 3주차 연습문제 3.4, 사용자 풀이 사진 `Scanned_20260916-1407.jpg`
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: `tan^2 x + e^(sec(x^2))`를 항별로 다층 연쇄법칙을 적용해 미분한다.
User interpretation / approach: 첫 항에서 `tan x -> sec^2 x`를 정확히 회수하고 제곱의 바깥 미분과 결합하려 했다. 둘째 항에서도 `e^( ) -> sec( ) -> x^2`의 층 구조를 표시해 연쇄법칙 적용 방향은 맞게 잡았다. 다만 `sec(x^2)`의 도함수를 `sec(x^2)tan(x^2) * 2x`로 명확히 완성하지 못해 최종 식의 표기가 꼬였다.
Correct reasoning summary: `f'(x) = 2 tan x sec^2 x + e^(sec(x^2)) * sec(x^2) * tan(x^2) * 2x`이다.

Error type: KNOWLEDGE_GAP
Error mechanism: 다층 합성 구조는 인식했지만 가운데 기본 함수 `sec`의 도함수 `sec u tan u`를 완전한 식으로 회수하지 못했다. 반면 이전 두 문제에서 반복 실패했던 `tan -> sec^2`는 이번 문제에서 정확히 사용했다.
Next-time cue: 다층 합성함수는 각 층을 먼저 한 줄짜리 미분표로 바꾼 뒤 곱한다: `e^u -> e^u`, `sec v -> sec v tan v`, `x^2 -> 2x`.

Related pattern IDs: AI-MATH-P1
Review state: NONE
Later evidence / resolution: 당시 `tan -> sec^2` 적용 성공은 문제 제시 과정의 직접 cue 이후 나온 cue-assisted 실행 증거였으므로 무힌트 회수 성공으로 보지 않는다. 이후 AI-MATH-W3-R5에서 `tan`과 `sec` 도함수를 둘 다 공식 힌트 없이 정확히 회수했다.

### AI-MATH-W3-3.5

Problem ID: AI-MATH-W3-3.5
Date: 2026-09-16
Subject / area: AI 수학 / 곱의 미분법, 접선의 방정식
Source ref: `AI 수학 입문` 3주차 연습문제 3.5, 사용자 풀이 사진 `20260916_141349792.jpg`
Result: CORRECT
Confidence before check: NOT_RECORDED

Problem demand summary: 주어진 곡선을 미분해 `(0,1)`에서의 접선 기울기를 구하고 접선의 방정식을 완성한다.
User interpretation / approach: `e^x cos x`에 곱의 미분법을 적용하고 `sin x`를 미분한 뒤, `x=0`을 대입해 기울기 `2`를 구했다. 이어 점 `(0,1)`을 사용해 접선을 `y=2x+1`로 완성했다.
Correct reasoning summary: `y' = e^x(cos x - sin x) + cos x`, 따라서 `y'(0)=2`이고 접선은 `y-1=2(x-0)`, 즉 `y=2x+1`이다.

Error type: none
Error mechanism: none
Next-time cue: 현재 흐름을 유지한다: 미분식 완성 → 접점의 x값 대입 → 점기울기식으로 접선 작성.

Related pattern IDs: AI-MATH-P1
Review state: NONE
Later evidence / resolution: 문제 제시 때 `(e^x)'=e^x`, `(cos x)'=-sin x`, `(sin x)'=cos x` 공식과 곱의 미분 힌트가 제공된 상태에서 정확히 적용한 cue-assisted 성공이다. 따라서 기본 도함수의 독립 회수 성공으로는 세지 않는다.

### AI-MATH-W3-3.6

Problem ID: AI-MATH-W3-3.6
Date: 2026-09-16
Subject / area: AI 수학 / 음함수 미분, 곱의 미분, 접선 기울기 조건
Source ref: `AI 수학 입문` 3주차 연습문제 3.6, 사용자 풀이 사진 `20260916_142041361.jpg`
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 음함수로 주어진 곡선에서 접선 기울기가 `-1`인 점을 모두 찾는다.
User interpretation / approach: `y`를 `x`의 함수로 보고 음함수 미분에서 `y'`를 붙여야 한다는 방향은 인식했고, 미분 결과에 기울기 조건 `y'=-1`을 연결하려 했다. 다만 `x^2y^2`와 `xy`를 미분할 때 각각 곱의 미분의 한 항을 빠뜨려 `2xy^2`와 `y` 항이 누락되었고, 그 결과 `xy=1/2`라는 잘못된 조건으로 진행했다.
Correct reasoning summary: `d(x^2y^2)/dx = 2xy^2 + 2x^2yy'`, `d(xy)/dx = y + xy'`이므로 `2xy^2 + 2x^2yy' + y + xy' = 0`. 따라서 곡선 위에서는 `y' = -(2xy^2+y)/(2x^2y+x) = -y/x`로 정리할 수 있고, `y'=-1`이면 `y=x`. 이를 원래 식에 대입하면 `x^4+x^2=2`, 따라서 `x=±1`이고 점은 `(1,1)`, `(-1,-1)`이다. (`2xy+1=0`은 원래 곡선을 만족하지 않아 약분에 문제없다.)

Error type: CALC_PROCESS
Error mechanism: 음함수 미분에서 `y` 쪽 미분에 집중하면서, `x^2y^2`와 `xy`가 모두 두 인수의 곱이라는 사실을 끝까지 적용하지 못해 각 항의 `x` 쪽 미분 성분을 누락했다. 이전 문제에서 곱의 미분법 자체를 사용한 성공 증거가 있으므로 현재는 개념 부재보다 혼합 구조에서의 절차 누락으로 기록한다.
Next-time cue: `x`와 `y(x)`가 곱으로 섞이면 먼저 블록을 둘로 나눈다: `(x^2)(y^2)`, `(x)(y)`. 각 블록마다 반드시 `A'B + AB'` 두 항을 모두 쓴 뒤 `y'`를 모은다.

Related pattern IDs: none; 단일 음함수 사례이므로 새 패턴으로 승격하지 않음.
Review state: NONE
Later evidence / resolution: 3.7에서 두 곱을 각각 두 항으로 펼치려는 구조는 전이되었지만, 당시 문제 제시에서 `A'B+AB'`를 직접 cue로 제공한 상태였으므로 독립 전이 성공으로 보지는 않는다. `e^y` 연쇄법칙 적용 실패도 남아 있어 완전 교정 성공은 미확인 상태였다.

### AI-MATH-W3-3.7

Problem ID: AI-MATH-W3-3.7
Date: 2026-09-16
Subject / area: AI 수학 / 음함수 미분, 곱의 미분, 연쇄법칙, 접선과 절편
Source ref: `AI 수학 입문` 3주차 연습문제 3.7, 사용자 풀이 사진 `20260916_142942714.jpg`
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 음함수 곡선을 미분해 `(0,1)`에서의 접선 기울기를 구하고, 접선의 `x`절편을 계산한다.
User interpretation / approach: `xe^y`와 `ye^x`를 곱으로 보고 미분 항을 여러 개로 펼치려 했고, 이후 `y'`를 정리해 접선 기울기와 절편까지 구하려 했다. 그러나 `e^y`와 `e^x`를 구분하지 못하고 `d(e^y)/dx = e^y y'`를 적용하지 않아 `y'=-(1+x+y)` 형태로 진행했다. 그 결과 `(0,1)`에서 기울기를 `-2`로 계산했고, 마지막 절편 계산에서도 부호가 뒤집혔다.
Correct reasoning summary: `d(xe^y)/dx = e^y + x e^y y'`, `d(ye^x)/dx = y'e^x + ye^x`이므로 `e^y + x e^y y' + y'e^x + ye^x = 0`. 따라서 `y' = -(e^y + y e^x)/(x e^y + e^x)`. `(0,1)`에서 `y'=-(e+1)`이고 접선은 `y=1-(e+1)x`; 따라서 `x`절편은 `1/(e+1)`이다.

Error type: KNOWLEDGE_GAP
Error mechanism: 곱의 미분의 외형은 이전 문제보다 더 충실하게 펼쳤지만, `y`가 `x`의 함수인 상태에서 `e^y`를 미분할 때 원함수 `e^y`를 유지하고 내부 미분 `y'`를 곱해야 한다는 연쇄법칙이 적용되지 않았다. 별도로 접선식에서 `0=-2x+1`이라면 `x=1/2`인데 `-1/2`로 적은 부호 계산 실수도 있었다.
Next-time cue: 음함수에서 지수함수가 나오면 변수부터 확인한다. `e^x -> e^x`, `e^y -> e^y y'`. 그 다음에만 곱의 미분 `A'B + AB'`를 적용한다. 절편은 마지막에 원식에 대입해 부호를 한 번 검산한다.

Related pattern IDs: none; 이 형태의 `e^y` 연쇄법칙 오류는 현재 한 사례이므로 새 패턴으로 승격하지 않음.
Review state: NONE
Later evidence / resolution: AI-MATH-W3-R4에서 `e^y`가 직접 다시 등장했을 때 공식 힌트 없이 원래 지수 `y`를 보존하고 `e^y y'`를 정확히 적용해 최종 도함수까지 맞혔다. 직접 실패 형태의 무힌트 교정 성공이 한 번 확인됨.

### AI-MATH-W3-R1

Problem ID: AI-MATH-W3-R1
Date: 2026-09-16
Subject / area: AI 수학 / 3주차 복습, 음함수 미분·곱의 미분·연쇄법칙
Source ref: 3주차 복습 문제 `x e^y + y = 2`, 사용자 풀이 사진 `20260916_162629551.jpg`
Result: WRONG
Confidence before check: NOT_RECORDED

Problem demand summary: `x e^y + y = 2`를 `x`에 대해 미분하고 `y'`를 정리한다.
User interpretation / approach: 문제의 `x e^y`를 풀이 첫 줄에서 `x e^x`로 바꿔 적은 뒤, `e^x + x e^x + y' = 0`으로 미분하여 `y' = -e^x(x+1)`을 얻었다. 곱의 미분 두 항 구조는 사용했지만 원래 지수 변수 `y`를 보존하지 못했다.
Correct reasoning summary: 원래 식을 그대로 두고 미분하면 `e^y + x e^y y' + y' = 0`. 따라서 `y'(x e^y + 1) = -e^y`이고 `y' = -e^y/(x e^y + 1)`이다.

Error type: KNOWLEDGE_GAP
Error mechanism: `y=y(x)`인 음함수 상황에서 지수에 들어간 종속변수 `y`를 미분 변수 `x`로 바꿔 적어 원래 함수 구조가 먼저 변형되었다. 이는 3.7에서 `e^y`에 내부 미분 `y'`를 붙이지 못한 오류와 같은 핵심 병목으로, `e^y`를 `x`에 대한 합성함수로 보존·처리하는 단계가 불안정하다.
Next-time cue: 미분하기 전 원래 식의 지수 변수를 먼저 확인하고 그대로 복사한다. `e^x -> e^x`, `e^y -> e^y y'`. 그 뒤에 곱의 미분을 적용한다.

Related pattern IDs: AI-MATH-P2
Review state: NONE
Later evidence / resolution: 3.7과 R1에서 같은 오류 구조가 반복되어 AI-MATH-P2 후보 패턴 승격 근거가 됨. 이후 R4에서는 같은 `x e^y + y = constant` 구조를 공식 힌트 없이 정확히 미분해 직접 교정 성공이 확인됨.

### AI-MATH-W3-R2

Problem ID: AI-MATH-W3-R2
Date: 2026-09-16
Subject / area: AI 수학 / 3주차 복습, 음함수 미분·곱의 미분·연쇄법칙
Source ref: 3주차 복습 문제 `x sin(y) + y = 1`, 사용자 풀이 사진 `20260916_163501189.jpg`
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: `x sin(y) + y = 1`을 `x`에 대해 미분하고 `y'`를 정리한다.
User interpretation / approach: 원래 식의 `sin(y)`를 그대로 보존했고, `x sin(y)`에 곱의 미분을 적용해 `sin(y) + x cos(y)y' + y' = 0`을 정확히 얻었다. 이어 `(x cos(y) + 1)y' = -sin(y)`까지도 정확히 정리했다. 다만 마지막 분수 표기에서 분모를 `x(cos(y)+1)`처럼 적어 바로 앞 줄의 `x cos(y)+1`과 불일치했다.
Correct reasoning summary: `sin(y) + x cos(y)y' + y' = 0`, 따라서 `(x cos(y)+1)y' = -sin(y)`이고 `y' = -sin(y)/(x cos(y)+1)`이다.

Error type: CALC_PROCESS
Error mechanism: 음함수 합성함수 처리와 곱의 미분은 맞았고, 오류는 마지막 식을 분수 형태로 옮기는 과정에서 괄호 범위를 넓혀 `+1`까지 `x`의 곱으로 묶은 대수 표기 단계에서 발생했다.
Next-time cue: `y'`를 분수로 옮기기 직전 한 줄의 계수를 그대로 분모로 복사한다. 이번 경우 분모는 `(x cos(y)+1)` 전체이며 `x(cos(y)+1)`로 바꾸지 않는다.

Related pattern IDs: AI-MATH-P2
Review state: NONE
Later evidence / resolution: `sin(y)`에 대해 `cos(y)y'`를 cue 이후 정확히 적용해, 종속변수 합성함수에 내부 미분을 붙이는 구조의 성공 증거가 생겼다. 다만 cue-assisted이고 마지막 대수 정리 실수가 있어 완전한 무힌트 전이 성공으로 보지는 않음.

### AI-MATH-W3-R3

Problem ID: AI-MATH-W3-R3
Date: 2026-09-16
Subject / area: AI 수학 / 3주차 복습, 음함수 미분·곱의 미분·연쇄법칙
Source ref: 3주차 복습 문제 `x cos(y) + y = 2`, 사용자 풀이 사진 `20260916_164051277.jpg`
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 공식 힌트 없이 `x cos(y) + y = 2`를 `x`에 대해 미분하고 `y'`를 정리한다.
User interpretation / approach: 원래 식의 `cos(y)`를 그대로 보존하고, `x cos(y)`에 곱의 미분을 적용해 `cos(y) - x sin(y)y' + y' = 0`을 정확히 얻었다. 이어 `-y'(x sin(y)-1) = -cos(y)`까지도 올바르게 정리했다. 다만 마지막 분수로 옮길 때 음수를 한 번 더 붙여 `-cos(y)/(x sin(y)-1)`로 적었다.
Correct reasoning summary: `cos(y) - x sin(y)y' + y' = 0`, 따라서 `y'(1-x sin(y))=-cos(y)`. 그러므로 `y'=-cos(y)/(1-x sin(y))`, 동치로 `y'=cos(y)/(x sin(y)-1)`이다.

Error type: CALC_PROCESS
Error mechanism: 음함수에서 종속변수 `y`를 보존하고 `(cos y)'=-sin(y)y'`를 적용하는 핵심 연쇄법칙과 곱의 미분은 무힌트로 정확했다. 오류는 이미 올바른 식 `-y'(x sin(y)-1)=-cos(y)`에서 양변의 음수를 나누는 마지막 대수 부호 처리에서 발생했다.
Next-time cue: 마지막에 `y'`를 고립시킬 때는 분자·분모 부호를 동시에 바꾸면 같은 식이라는 점을 이용해 한 형태만 유지한다. 예: `-cos/(1-a) = cos/(a-1)`.

Related pattern IDs: AI-MATH-P1, AI-MATH-P2
Review state: NONE
Later evidence / resolution: P2의 핵심 메커니즘인 `g(y)`의 내부 변수 보존과 `y'` 부착이 공식 힌트 없이 다른 함수 `cos(y)`에서 전이되었다. P1 관점에서도 `cos -> -sin`은 무힌트로 정확히 회수했지만, 반복 실패가 있었던 `tan -> sec^2`와 `sec -> sec tan`의 무힌트 확인은 아직 남아 있다.

### AI-MATH-W3-R4

Problem ID: AI-MATH-W3-R4
Date: 2026-09-16
Subject / area: AI 수학 / 3주차 복습, 음함수 미분·곱의 미분·연쇄법칙
Source ref: 3주차 복습 문제 `x e^y + y = 3`, 사용자 풀이 사진 `20260916_164733273.jpg`
Result: CORRECT
Confidence before check: NOT_RECORDED

Problem demand summary: 공식 힌트 없이 `x e^y + y = 3`을 `x`에 대해 미분하고 `y'`를 정리한다.
User interpretation / approach: 원래 식의 `e^y`를 그대로 보존했고, `x e^y`에 곱의 미분과 연쇄법칙을 결합해 `e^y + x e^y y' + y' = 0`을 정확히 얻었다. 이어 `(x e^y + 1)y' = -e^y`로 묶고 `y' = -e^y/(x e^y + 1)`까지 정확히 정리했다.
Correct reasoning summary: `d(x e^y)/dx = e^y + x e^y y'`이므로 `e^y + x e^y y' + y' = 0`. 따라서 `(x e^y + 1)y' = -e^y`, 최종적으로 `y' = -e^y/(x e^y + 1)`이다.

Error type: none
Error mechanism: none
Next-time cue: 현재 흐름을 유지한다. 원래 내부 변수 `y`를 보존한 뒤 `e^y -> e^y y'`, 그 다음 곱의 미분과 `y'` 정리를 순서대로 수행한다.

Related pattern IDs: AI-MATH-P2
Review state: NONE
Later evidence / resolution: 직접 실패가 반복되었던 `e^y` 형태에서 공식 힌트 없이 완전한 정답이 확인되었다. P2의 개선을 지지하는 직접 성공 증거지만, 한 번의 성공만으로 안정적 습득으로 확정하지는 않는다.

### AI-MATH-W3-R5

Problem ID: AI-MATH-W3-R5
Date: 2026-09-16
Subject / area: AI 수학 / 3주차 복습, 기본 삼각함수 도함수 회수
Source ref: 3주차 복습 문제 `f(x)=tan x + sec x`, 사용자 풀이 사진 `20260916_165324665.jpg`
Result: CORRECT
Confidence before check: NOT_RECORDED

Problem demand summary: 공식 힌트 없이 `tan x`와 `sec x`의 기본 도함수를 각각 회수해 합의 도함수를 구한다.
User interpretation / approach: `(tan x)'=sec^2 x`를 정확히 썼고, `(sec x)'=sec x tan x` 구조도 정확히 회수해 최종적으로 `f'(x)=sec^2 x + sec x tan x`를 얻었다. 사진의 두 번째 항은 `sec tan x`처럼 변수 표기가 압축되어 보이지만 문맥과 구조상 `sec x tan x`를 의도한 것으로 판단한다.
Correct reasoning summary: 합의 미분법과 기본 도함수 `(tan x)'=sec^2 x`, `(sec x)'=sec x tan x`를 적용하면 `f'(x)=sec^2 x + sec x tan x`이다.

Error type: none
Error mechanism: none
Next-time cue: 현재 회수 흐름을 유지하되, 삼각함수 곱에서는 각 함수의 입력 변수를 모두 적어 `sec x tan x`처럼 표기를 명확히 한다.

Related pattern IDs: AI-MATH-P1
Review state: NONE
Later evidence / resolution: P1에서 직접 반복 실패가 있었던 `tan -> sec^2`와 `sec -> sec tan`을 둘 다 공식 힌트 없이 정확히 회수한 첫 직접 무힌트 성공 사례. 한 번의 성공만으로 안정적 습득으로 확정하지는 않는다.


### AI-PROG-W2-E1

Problem ID: AI-PROG-W2-E1
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / 문자열·이스케이프
Source ref: 2주차 PDF Exercise 1, current uploaded week-2 assignment Colab
Result: WRONG
Confidence before check: NOT_RECORDED

Problem demand summary: PDF 예시와 동일한 5줄의 문자열을 출력하며 큰따옴표·작은따옴표·리터럴 역슬래시·리터럴 `\n`/`\t`·Windows식 경로를 정확히 표현한다.
User interpretation / approach: 하나의 `print()` 안에 여러 문자열을 콤마로 나열하고, 줄을 이어 쓰기 위해 역슬래시를 직접 사용했다. 문자열 내부의 큰따옴표는 일부 구간에서 이스케이프했지만, `What's`의 apostrophe와 리터럴 역슬래시 구간은 아직 분리되지 않았다.
Correct reasoning summary: 괄호 안에서는 줄 연속용 역슬래시가 필요하지 않다. PDF와 동일한 여러 줄 출력은 여러 번의 `print()`를 쓰는 것이 가장 단순하다. 문자열 안에서 실제 줄바꿈/탭이 아니라 문자 `\n`/`\t` 자체를 보여주려면 `\\n`/`\\t`를 쓰고, 경로의 역슬래시도 `\\`로 출력한다. 작은따옴표 문자열 안의 apostrophe는 `\'`로 처리하거나 바깥 따옴표 종류를 바꾼다.

Error type: KNOWLEDGE_GAP
Error mechanism: 줄 연속용 `\`와 문자열 안에서 출력할 역슬래시를 같은 역할로 취급했고, `print()` 인자 구분 콤마와 줄 연속 문법이 겹치면서 `SyntaxError`가 발생했다. 또한 `What's`가 작은따옴표 문자열의 경계를 닫는 문제와 `\n`/`\t`가 실제 제어문자로 해석되는 문제도 남아 있었다.
Next-time cue: 먼저 “파이썬 문법용 따옴표/역슬래시”와 “화면에 출력할 따옴표/역슬래시”를 분리해 본다. 출력할 `\` 하나는 코드에서 `\\`, 출력할 `\n`은 코드에서 `\\n`이다. 여러 줄은 우선 `print()`를 줄별로 하나씩 쓴다.

Related pattern IDs: none; 동일 학습 경계의 반복 증거지만 아직 별도 문제 패턴으로 승격하지 않음.
Review state: QUEUED
Later evidence / resolution: A second saved attempt was observed at 2026-09-20 22:18 KST. The user correctly moved toward literal `\\n`, `\\t`, and doubled path backslashes, and added a self-note about escape usage. Execution still ends in `SyntaxError` because `\\n` is being used outside a string as if it were a source-code line break, commas/separate `print()` calls are missing, and `He said "What's there?"` is left outside a quoted string. Exercise 1 remains QUEUED until the user's own Colab executes successfully.


### AI-PROG-W2-E1-R1

Problem ID: AI-PROG-W2-E1-R1
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 1 재시도
Source ref: current uploaded week-2 assignment Colab, execution count 3
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: PDF Exercise 1의 5줄 출력과 문자·공백까지 맞춘다.
User interpretation / approach: 문자열 안에 실제 줄바꿈 `\n`, 리터럴 `\\n`/`\\t`, apostrophe escape, 경로의 doubled backslash를 함께 적용했다. 실행은 성공했다.
Correct reasoning summary: 현재 출력은 다섯 줄 모두 내용상 맞지만 4번째 줄 `Newline character...` 앞에 공백 한 칸이 추가된다. 원인은 `print()`의 두 인자 사이에 콤마가 있어 기본 구분자 `sep=' '`가 삽입되기 때문이다.

Error type: CARELESS
Error mechanism: 세 번째 줄까지의 문자열 묶음과 네 번째·다섯 번째 줄 문자열 묶음 사이에 콤마를 둬서 `print()`가 인자 사이에 공백을 자동 삽입했다.
Next-time cue: 출력 예시를 맞출 때는 실행 성공 뒤 각 줄의 맨 앞/맨 뒤 공백까지 비교한다. 이번에는 해당 콤마를 제거해 인접 문자열을 이어 붙이거나 줄별 `print()`를 사용한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: SyntaxError는 해소되었고 escape/quote 처리도 성공했다. 정확한 출력 일치를 위한 선행 공백 1칸 제거만 남음.


### AI-PROG-W2-E1-R2

Problem ID: AI-PROG-W2-E1-R2
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 1 최종 재검증
Source ref: current uploaded week-2 assignment Colab, execution count 4
Result: CORRECT
Confidence before check: NOT_RECORDED

Problem demand summary: PDF Exercise 1의 5줄 출력을 문자열·따옴표·리터럴 역슬래시·경로 표기까지 정확히 재현한다.
User interpretation / approach: 이전 시도의 콤마를 제거해 `print()` 인자 사이 자동 공백을 없애고, 문자열 안의 실제 줄바꿈 `\n`, 리터럴 `\\n`/`\\t`, apostrophe escape, Windows 경로 역슬래시를 함께 사용했다.
Correct reasoning summary: 최신 실행 결과가 PDF 예시의 다섯 줄과 정확히 일치한다.

Error type: none
Error mechanism: none
Next-time cue: 출력 문제에서는 실행 성공만 보지 말고 문자열 경계, 리터럴 역슬래시, 앞뒤 공백까지 예시와 비교한다.

Related pattern IDs: none
Review state: REVIEWED
Later evidence / resolution: 이전 SyntaxError와 선행 공백 오류가 모두 해소되었고, 실행 count 4에서 정확한 출력 일치 확인. Exercise 1 완료.


### AI-PROG-W2-E2

Problem ID: AI-PROG-W2-E2
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 2 원리금 계산
Source ref: 2주차 PDF Exercise 2, current uploaded week-2 assignment Colab, execution count 5
Result: WRONG
Confidence before check: NOT_RECORDED

Problem demand summary: 원금 money, 연이율 rate, 기간 year를 입력받아 `total = money * (1 + rate) ** year`를 계산하고 소수 둘째 자리까지 출력한다.
User interpretation / approach: 세 입력을 받으려 했고, 원리금 값을 별도 변수에 담아 출력하려 했다. 다만 `input()`을 `print()`로 감싼 뒤 그 반환값을 `int()`로 변환했고, 계산식은 단리 형태 `money * 0.05 * rate`에 가까운 식을 사용했다.
Correct reasoning summary: `input()` 자체가 문자열을 반환하므로 숫자 변환은 `int(input(...))` 또는 `float(input(...))`처럼 직접 감싼다. 이자율 0.03은 정수가 아니므로 `float`가 필요하다. 기간은 정수로 받고, PDF 공식 그대로 복리 계산 `money * (1 + rate) ** year`를 사용한다. 출력은 f-string의 `:.2f`로 소수 둘째 자리까지 맞춘다.

Error type: KNOWLEDGE_GAP
Error mechanism: `print()`의 반환값이 `None`이라는 점을 몰라 `int(print(input(...)))`가 `int(None)`이 되어 TypeError가 발생했다. 또한 입력 변수의 의미와 자료형(rate은 float) 및 PDF의 복리 공식이 코드에 정확히 반영되지 않았다.
Next-time cue: 입력 문제에서는 먼저 각 변수의 자료형을 정한다: 원금 숫자, 이자율 실수, 기간 정수. 그 다음 `input → 형변환 → 계산 → 출력` 순서를 지킨다. `print()`는 값을 받는 함수가 아니라 화면에 보여주는 함수다.

Related pattern IDs: none; 단일 문제 증거이므로 패턴 승격하지 않음.
Review state: QUEUED
Later evidence / resolution: current execution stops at first input conversion with TypeError. corrected rerun pending.


### AI-PROG-W2-E2-R1

Problem ID: AI-PROG-W2-E2-R1
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 2 재시도
Source ref: current uploaded week-2 assignment Colab, execution count 7
Result: WRONG
Confidence before check: NOT_RECORDED

Problem demand summary: 원금, 연이율, 기간을 입력받아 복리 원리금을 계산하고 소수 둘째 자리까지 출력한다.
User interpretation / approach: 이전의 `print(input())` 구조를 제거해 `int(input(...))` 형태로 수정했다. 원금 입력 3500000은 정상 통과했으나, 이자율 0.03 입력에서 `int('0.03')` 변환이 실패했다.
Correct reasoning summary: 이자율은 소수이므로 `float(input(...))`를 사용해야 한다. 이후 계산은 PDF 공식 `money * (1 + rate) ** year`를 그대로 사용하고, 결과 출력은 `print(f'...{total:.2f}...')` 형태로 작성한다.

Error type: KNOWLEDGE_GAP
Error mechanism: 입력값의 자료형을 값의 성격에 맞게 구분하지 않아 소수 이자율에 `int()`를 사용했다. 또한 현재 계산식 `0 + O*0.05*e`와 마지막 `f(print(...))`는 PDF 요구와 여전히 다르다.
Next-time cue: 입력 전에 변수별 자료형부터 정한다: 원금=int 또는 float, 이자율=float, 기간=int. 그 다음 PDF 식을 변수명 그대로 옮긴다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: `print(input())` 오류는 교정됨. 이자율 형변환, 복리 공식, f-string 출력은 아직 교정 대기.


### AI-PROG-W2-E2-R2

Problem ID: AI-PROG-W2-E2-R2
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 2 재시도 2
Source ref: current uploaded week-2 assignment Colab, execution count 9
Result: WRONG
Confidence before check: NOT_RECORDED

Problem demand summary: 원금, 연이율, 기간을 입력받아 복리 원리금 `money * (1 + rate) ** year`를 계산하고 소수 둘째 자리까지 출력한다.
User interpretation / approach: 원금은 int, 이자율은 float, 기간은 int로 형변환하여 세 입력을 모두 정상적으로 받았다. 계산 단계에서 `total = money(1+rate)*year`를 사용했다.
Correct reasoning summary: 숫자 변수와 괄호 사이의 곱셈은 반드시 `*`를 써야 하며, 복리 기간 적용은 단순 곱셈 `* year`가 아니라 거듭제곱 `** year`이다. 따라서 `total = money * (1 + rate) ** year`가 맞다. 출력도 변수명을 문자열로 쓰지 말고 f-string에서 `{year}`, `{total:.2f}`로 삽입해야 한다.

Error type: CALC_PROCESS
Error mechanism: 수학 표기에서 생략 가능한 곱셈 기호를 파이썬 코드에서도 생략해 `money(...)`가 함수 호출로 해석되었다. 또한 복리의 지수 `year`를 곱셈으로 처리했다.
Next-time cue: 수학식을 파이썬으로 옮길 때 생략된 곱셈 기호를 모두 복원하고, 거듭제곱은 `**`인지 확인한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: 입력 형변환 단계는 모두 교정 성공. 계산식과 최종 f-string 출력 교정 대기.


### AI-PROG-W2-E2-R3

Problem ID: AI-PROG-W2-E2-R3
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 2 재시도 3
Source ref: current uploaded week-2 assignment Colab, execution count 13
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 원금, 연이율, 기간을 입력받아 복리 원리금을 계산하고 소수 둘째 자리까지 출력한다.
User interpretation / approach: 입력 자료형을 int/float/int로 올바르게 구분했고, 복리 계산식도 `total = money * (1 + rate) ** year`로 정확히 수정했다. 마지막 출력에서 f-string을 사용하려 했으나 `f'{print('...')}` 형태로 중첩해 SyntaxError가 발생했다.
Correct reasoning summary: f-string은 문자열 자체 앞에 `f`를 붙이고, 문자열 내부에서 변수는 `{year}`, `{total:.2f}`처럼 넣는다. 따라서 `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')`가 맞다.

Error type: KNOWLEDGE_GAP
Error mechanism: f-string의 역할을 `f(...)` 또는 `f'{print(...)}`처럼 함수 호출과 섞어 이해해 문자열 리터럴 경계가 깨졌다.
Next-time cue: f-string은 함수가 아니라 문자열 문법이다. 먼저 `f'문자열'` 틀을 만들고, 변수만 `{ }` 안에 넣는다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: 입력과 복리 계산식은 교정 완료. 출력 f-string 한 줄 교정만 남음.


### AI-PROG-W2-E2-R4

Problem ID: AI-PROG-W2-E2-R4
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 2 재시도 4
Source ref: current uploaded week-2 assignment Colab, execution count 16
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 복리 원리금을 계산하고 f-string으로 연도와 소수 둘째 자리 결과를 출력한다.
User interpretation / approach: 입력 자료형과 복리 계산식은 정확히 완성했다. 이후 f-string에서 변수를 중괄호에 넣어야 한다는 점까지 스스로 메모했지만, `print(f'('{year}...`처럼 문자열 시작 직후 괄호를 따로 열고, 소수점 형식도 `{total\2f}`처럼 작성했다.
Correct reasoning summary: f-string 전체 문장은 하나의 문자열 리터럴이어야 하며 변수는 문자열 내부 중괄호에 둔다. 소수 둘째 자리 형식은 역슬래시가 아니라 콜론을 써서 `{total:.2f}`로 표현한다. 최종 형태는 `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')`이다.

Error type: KNOWLEDGE_GAP
Error mechanism: f-string의 세 요소인 `f'...'`, 변수 삽입 `{변수}`, 형식 지정 `:{형식}`을 각각 이해하기 시작했지만 한 문장 안에서 결합하는 문법이 아직 불안정하다.
Next-time cue: f-string은 먼저 `print(f'문장')` 뼈대를 만든 뒤, 필요한 변수 자리만 `{year}`, `{total:.2f}`로 교체한다. 소수점 형식은 `:.2f`이며 `\2f`가 아니다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: 입력과 계산식은 완료. 최종 출력 한 줄의 정확한 f-string 문법만 남음.


### AI-PROG-W2-E2-R5

Problem ID: AI-PROG-W2-E2-R5
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 2 재시도 5
Source ref: current uploaded week-2 assignment Colab, execution count 18
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 복리 원리금을 계산하고 f-string으로 연도와 소수 둘째 자리 결과를 출력한다.
User interpretation / approach: 입력 자료형과 복리 계산식은 정확하다. 소수점 형식 지정이 콜론 기반이라는 점도 반영해 `{total: .2f}`까지 접근했다. 다만 최종 출력이 `print(f'('{year}...` 형태라 f-string 문자열이 `f'('`에서 먼저 닫혀 SyntaxError가 발생했다.
Correct reasoning summary: 전체 출력 문장이 하나의 f-string 문자열 안에 있어야 한다. 정확한 형태는 `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')`이다. PDF 예시와 정확히 맞추려면 `{total: .2f}`처럼 콜론 뒤 공백을 두지 않고 `{total:.2f}`를 사용한다.

Error type: KNOWLEDGE_GAP
Error mechanism: f-string 바깥 괄호와 문자열 내부 문자 괄호의 경계를 혼동해 문자열을 조기에 닫았다.
Next-time cue: 먼저 `print(f'문장')` 전체 뼈대를 쓴 뒤, 변수 위치만 `{year}`, `{total:.2f}`로 바꾼다. f-string 시작 직후 별도 `(`를 넣지 않는다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: 입력/계산식/형식지정 개념은 대부분 교정됨. 최종 f-string 경계 한 줄만 남음.


### AI-PROG-W2-E2-R6

Problem ID: AI-PROG-W2-E2-R6
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 2 최종 재검증
Source ref: current uploaded week-2 assignment Colab, execution count 24
Result: CORRECT
Confidence before check: NOT_RECORDED

Problem demand summary: 원금, 연이율, 기간을 입력받아 복리 원리금을 계산하고 소수 둘째 자리까지 출력한다.
User interpretation / approach: 원금은 int, 이자율은 float, 기간은 int로 입력받고 `total = money * (1 + rate) ** year`를 계산했다. 마지막 출력도 `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')` 형태로 완성했다.
Correct reasoning summary: PDF 예시 입력 3500000, 0.03, 3에서 `3년 후의 원리금은 3824544.50원 입니다.`가 출력되어 요구사항과 일치한다.

Error type: none
Error mechanism: none
Next-time cue: 현재 흐름을 유지한다: `input → 자료형 변환 → 공식 그대로 계산 → f-string으로 변수/형식 지정`.

Related pattern IDs: none
Review state: REVIEWED
Later evidence / resolution: 이전의 input/형변환/곱셈·거듭제곱/f-string 오류가 모두 교정되었고 execution count 24에서 정상 실행과 예시값 일치를 확인했다.


### AI-PROG-W2-E3

Problem ID: AI-PROG-W2-E3
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 3 BMI 계산
Source ref: 2주차 PDF Exercise 3, current uploaded week-2 assignment Colab, execution count 29
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 사용자로부터 키 height와 몸무게 weight를 실수형으로 입력받아 `bmi = weight / (height**2)`로 계산하고, 예시 형식으로 BMI를 소수 둘째 자리까지 출력한다.
User interpretation / approach: 몸무게 95를 int, 키 1.82를 float로 입력받고 `BMI = weigh / (heigh**2)`를 계산했다. 계산 결과 28.68은 정확하다. 출력은 `(당신의 28.68=입니다.)` 형태로 작성했다.
Correct reasoning summary: 계산식은 맞다. PDF는 키와 몸무게를 모두 실수형으로 입력받으라고 하므로 몸무게도 `float(input(...))`로 받는 편이 요구에 정확하다. 출력은 `당신의 BMI= 28.68입니다.` 형식에 맞게 `print(f'당신의 BMI= {BMI:.2f}입니다.')`처럼 작성한다.

Error type: OUTPUT_FORMAT
Error mechanism: 계산값 자체는 맞았지만 출력 문자열에서 라벨 `BMI`와 등호 위치가 바뀌고 불필요한 괄호가 들어갔다. 또한 문제 요구의 '실수형 입력'을 몸무게에는 int로 적용했다.
Next-time cue: 계산 문제는 값이 맞은 뒤 문제 예시의 라벨·기호·공백과 입력 자료형 요구까지 비교한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: 계산 결과 28.68은 정확. 몸무게 자료형과 출력 문구 교정 후 재검증 필요.


### AI-PROG-W2-E3-R1

Problem ID: AI-PROG-W2-E3-R1
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 3 재시도
Source ref: current uploaded week-2 assignment Colab, execution count 30
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 키와 몸무게를 실수형으로 입력받아 BMI를 계산하고 PDF 예시 형식으로 소수 둘째 자리까지 출력한다.
User interpretation / approach: BMI 공식과 소수 둘째 자리 f-string 출력은 유지했고, 출력 문구에 `BMI=` 라벨을 추가했다. 실행 결과는 `(당신의 BMI=28.68입니다.)`로 정상 출력된다.
Correct reasoning summary: 수치 계산은 정확하다. PDF 요구에 맞추려면 몸무게도 `float(input(...))`로 받고, 출력은 불필요한 괄호 없이 `당신의 BMI= 28.68입니다.`처럼 등호 뒤 공백까지 맞춘다.

Error type: OUTPUT_FORMAT
Error mechanism: 계산은 맞지만 문제 요구의 입력 자료형과 예시 출력 문자열을 완전히 일치시키는 마지막 검증이 남았다.
Next-time cue: 실행 성공 뒤 문제에서 요구한 자료형과 예시의 라벨·괄호·공백을 한 번 더 비교한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: 계산 및 f-string 숫자 형식은 교정됨. 몸무게 float 변환과 출력 괄호/공백만 남음.


### AI-PROG-W2-E3-R2

Problem ID: AI-PROG-W2-E3-R2
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 3 재시도 2
Source ref: current uploaded week-2 assignment Colab, latest saved cell
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 키와 몸무게를 실수형으로 입력받아 BMI를 계산하고 PDF 예시 형식으로 출력한다.
User interpretation / approach: 출력 문자열을 `당신의 BMI= {BMI:.2f}입니다.` 형태로 수정해 괄호와 공백 문제를 고쳤다. 다만 몸무게 입력은 여전히 `int(input(...))`이고 최신 셀은 아직 실행되지 않았다.
Correct reasoning summary: 몸무게도 `float(input(...))`로 바꾸고, 예시 입력으로 셀을 실행해 `당신의 BMI= 28.68입니다.`가 실제 출력되는지 확인해야 완료다.

Error type: REQUIREMENT_GAP
Error mechanism: 출력 형식 수정은 완료했지만 문제의 실수형 입력 요구 한 항목과 실행 검증 단계가 남았다.
Next-time cue: 코드를 고친 뒤 반드시 실행하고, 문제의 자료형 요구까지 체크한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: output code corrected; weight float conversion and rerun pending.


### AI-PROG-W2-E3-R3

Problem ID: AI-PROG-W2-E3-R3
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 3 재검증
Source ref: current uploaded week-2 assignment Colab, execution count 32
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 키와 몸무게를 실수형으로 입력받아 BMI를 계산하고 예시 형식으로 출력한다.
User interpretation / approach: BMI 계산식과 출력 문구를 정확히 고쳤고, 예시 입력 95와 1.82에서 `당신의 BMI= 28.68입니다.`가 실제로 출력되었다.
Correct reasoning summary: 계산과 출력은 맞다. 다만 PDF가 키와 몸무게를 모두 실수형으로 입력받으라고 명시하므로 몸무게 입력도 `float(input(...))`로 바꿔야 요구사항을 완전히 충족한다.

Error type: REQUIREMENT_GAP
Error mechanism: 예시값 95가 정수로도 입력 가능해 실행은 성공하지만, 코드가 소수 몸무게 입력을 허용하지 않아 문제의 실수형 입력 요구를 완전히 만족하지 못한다.
Next-time cue: 예시값이 정수처럼 보여도 문제 문구에서 요구한 자료형을 우선한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: execution count 32에서 계산/출력 성공 확인. weight float conversion만 남음.

### AI-PROG-W2-E4

Problem ID: AI-PROG-W2-E4
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 4 문자열 숫자 변환
Source ref: 2주차 PDF Exercise 4, current uploaded week-2 assignment Colab, execution count 33
Result: WRONG
Confidence before check: NOT_RECORDED

Problem demand summary: 문자열 `dogs='367'`, `cats='195'`를 숫자로 변환해 강아지가 고양이보다 몇 마리 더 많은지 계산하고 `강아지가 고양이보다 172마리 더 많다`를 출력한다.
User interpretation / approach: 두 문자열 변수 선언은 정확히 했고 문장 출력도 시도했지만, 두 값을 숫자로 변환하거나 차이를 계산하지 않아 출력에 172가 들어가지 않았다.
Correct reasoning summary: `int(dogs) - int(cats)`로 차이 172를 계산한 뒤 f-string 등으로 결과를 문장 안에 넣는다.

Error type: KNOWLEDGE_GAP
Error mechanism: 문자열 변수 선언과 출력 문장은 만들었지만, 문제 핵심인 문자열→정수 변환과 뺄셈 단계를 연결하지 않았다.
Next-time cue: 문자열로 주어진 숫자를 계산해야 하면 먼저 `int(...)` 또는 `float(...)` 변환이 필요한지 확인한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: current output omits the numeric difference; correction pending.


### AI-PROG-W2-E4-R1

Problem ID: AI-PROG-W2-E4-R1
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 4 재시도
Source ref: current uploaded week-2 assignment Colab, execution count 38
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 문자열 `dogs='367'`, `cats='195'`를 숫자로 변환해 차이 172를 계산하고 문장에 실제 숫자를 출력한다.
User interpretation / approach: `difference = int(dogs) - int(cats)`로 문자열 변환과 뺄셈은 정확히 수행했다. 출력에서 `'강아지가 고양이보다 int(difference)마리 더 많다'`를 사용했다.
Correct reasoning summary: 따옴표 안의 `int(difference)`는 코드가 아니라 문자 그대로 출력된다. 이미 `difference`는 정수이므로 `print(f'강아지가 고양이보다 {difference}마리 더 많다')`처럼 f-string으로 변수 값을 삽입하면 PDF 목표 출력 `강아지가 고양이보다 172마리 더 많다`가 된다.

Error type: OUTPUT_FORMAT
Error mechanism: 계산 표현과 문자열 안 텍스트의 경계를 혼동해 변수 표현을 문자열 리터럴 내부에 그대로 적었다.
Next-time cue: 계산된 변수 값을 문장 안에 넣을 때는 f-string의 `{변수}`를 사용한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: string-to-int conversion and difference calculation are correct; only value interpolation remains.


### AI-PROG-W2-E3-R4

Problem ID: AI-PROG-W2-E3-R4
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 3 최신 코드 수정
Source ref: current uploaded week-2 assignment Colab, latest saved source
Result: PARTIAL
Confidence before check: NOT_RECORDED

Problem demand summary: 키와 몸무게를 모두 실수형으로 입력받아 BMI를 계산하고 예시 형식으로 출력한다.
User interpretation / approach: 몸무게 입력을 `float(input(...))`로 수정해 코드 요구사항은 모두 충족하는 형태가 되었다.
Correct reasoning summary: 최신 소스는 요구사항에 맞다. 다만 현재 셀의 `execution_count = 32`와 출력은 이전 int 버전 실행 때부터 유지된 것으로 확인되므로, 최신 float 버전을 다시 실행해 성공 결과를 새로 남겨야 완료로 판정할 수 있다.

Error type: VERIFICATION_GAP
Error mechanism: Colab은 코드 수정 후에도 이전 실행 출력과 execution count를 유지할 수 있으므로, 저장된 코드와 표시된 출력이 동일 실행에서 나온 것인지 분리해 확인해야 한다.
Next-time cue: 코드 수정 후 반드시 해당 셀을 다시 실행하고 execution count가 갱신됐는지 확인한다.

Related pattern IDs: none
Review state: QUEUED
Later evidence / resolution: latest code corrected; rerun evidence pending.

### AI-PROG-W2-E4-R2

Problem ID: AI-PROG-W2-E4-R2
Date: 2026-09-20
Subject / area: AI 프로그래밍입문 / 2주차 / Exercise 4 최종 재검증
Source ref: current uploaded week-2 assignment Colab, execution count 42
Result: CORRECT
Confidence before check: NOT_RECORDED

Problem demand summary: 문자열 숫자 두 개를 숫자로 변환해 차이를 계산하고 문장에 실제 결과를 출력한다.
User interpretation / approach: `difference = int(dogs) - int(cats)`로 172를 계산하고 `print(f'강아지가 고양이보다 {difference}마리 더 많다')`로 출력했다.
Correct reasoning summary: 문자열→정수 변환, 뺄셈, f-string 값 삽입이 모두 맞으며 실제 출력도 `강아지가 고양이보다 172마리 더 많다`로 PDF 목표와 일치한다.

Error type: none
Error mechanism: none
Next-time cue: 문자열 숫자 계산은 `int/float 변환 → 계산 → f-string 삽입` 순서로 확인한다.

Related pattern IDs: none
Review state: REVIEWED
Later evidence / resolution: execution count 42에서 정상 실행 및 목표 출력 일치 확인.
