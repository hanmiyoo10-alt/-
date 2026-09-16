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
Later evidence / resolution: pending.

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
Later evidence / resolution: pending.

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
Later evidence / resolution: `tan -> sec^2` 회수는 성공하여 AI-MATH-P1의 첫 성공 증거로 사용.

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
Later evidence / resolution: `e^x -> e^x`와 삼각함수 기본 도함수를 곱의 미분 안에서 정확히 회수한 성공 사례. AI-MATH-P1 개선 증거로 추가.

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
Later evidence / resolution: 3.7에서 두 곱을 각각 두 항으로 펼치려는 구조는 전이되었지만, `e^y`의 연쇄법칙 적용 실패로 완전한 교정 성공까지는 확인되지 않음.

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
