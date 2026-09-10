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

### E-2026-09-10-003 — After Effects 기초 모션 실습 완료

```text
Entry ID: E-2026-09-10-003
Date: 2026-09-10
Subject / scope: After Effects / 타이포그래피 모션그래픽 기초
Status: OBSERVED
Observation: 사용자는 After Effects를 처음 사용하는 상태에서 Composition과 Shape Layer를 만들고, Position / Scale / Opacity 키프레임, Easy Ease, Graph Editor의 Speed Graph 조절을 순서대로 직접 실습했다.
Context: 50초~1분 10초 분량의 가로형 타이포그래피 기반 모션그래픽 중간고사 과제를 준비하는 과정. 주제 후보로 “집 가고 싶다”를 검토 중이다.
Result: 오브젝트 이동, 확대·축소, 페이드 인·아웃을 키프레임으로 만들었고, Easy Ease와 Speed Graph를 적용했을 때 속도감이 달라지는 것을 직접 확인했다.
Interpretation: 현재는 복잡한 효과보다 기본 Transform 애니메이션과 타이밍 조절을 실제 텍스트 모션으로 전이하는 단계가 적절하다.
Confidence: HIGH
Related memory IDs: 없음
Follow-up trigger: Rotation과 Text Layer / Text Animator를 익힌 뒤 실제 과제 콘티에 기본 모션을 적용하는지 확인.
Resolution / later evidence: 상세 세션 기록은 study/logs/2026-09-10-after-effects-basics.md 참조.
```

### E-2026-09-10-004 — 오늘의 AE 목표를 레퍼런스 따라 만들기로 구체화

```text
Entry ID: E-2026-09-10-004
Date: 2026-09-10
Subject / scope: After Effects / 오늘 실습 목표
Status: OBSERVED
Observation: 사용자는 Google Drive에 있는 것으로 예상되는 오징어게임 관련 영상 파일을 레퍼런스로 삼아, 오늘 After Effects에서 그 영상의 모션을 따라 만들어보는 것을 목표로 정했다.
Context: Position / Scale / Opacity / Easy Ease / Speed Graph 기초 실습 직후, 실제 레퍼런스 복제로 학습 단계를 올리는 시점.
Result: 오늘 세션의 다음 작업은 레퍼런스 영상을 확보한 뒤 장면을 분해하고, 이미 익힌 Transform 키프레임과 속도 조절을 이용해 재현하는 것으로 구체화됨.
Interpretation: 단순 기능별 연습에서 실제 모션 역설계와 재현 중심 실습으로 넘어가는 단계다.
Confidence: HIGH
Related memory IDs: E-2026-09-10-003
Follow-up trigger: Google Drive에서 레퍼런스 파일을 찾고, 첫 장면의 타이밍·텍스트·Transform 요소를 분해해 실제로 재현하기 시작했는지 확인.
Resolution / later evidence: 파일 위치와 정확한 영상 내용은 아직 확인 전.
```

### E-2026-09-10-005 — Rotation 단위 혼동을 화면 증거로 교정

```text
Entry ID: E-2026-09-10-005
Date: 2026-09-10
Subject / scope: After Effects / Rotation 기본 조작
Status: OBSERVED
Observation: Rotation 실습의 첫 화면 녹화에서 2초 키프레임 값이 `90x+0°`로 입력되어, 1초 중간값이 `45x+0°`로 나타나는 90회전 애니메이션이 만들어졌다. 이어 올린 두 번째 화면 녹화에서는 2초 값을 `0x+90°`로 고쳐 사각형이 가로에서 세로로 90도 회전하는 것을 확인했다.
Context: 교수 수업 흐름에 맞춰 Position → Scale → Rotation → Opacity를 기본 도형으로 다시 반복하는 과정.
Result: AE Rotation의 왼쪽 `x` 값은 회전 횟수(revolutions), 오른쪽 `°` 값은 추가 각도라는 차이를 실제 오류와 수정으로 확인했고, Rotation 두 키프레임 동작을 정상 재현했다.
Interpretation: 숫자 `90`을 입력할 때는 `90x`가 아니라 `0x+90°`가 되어야 한다는 단위 구분을 다음 Rotation 작업의 즉시 점검 항목으로 두는 것이 유용하다.
Confidence: HIGH
Related memory IDs: E-2026-09-10-003
Follow-up trigger: 다음 Rotation 작업에서 `x`와 `°` 필드를 혼동하지 않고 원하는 각도를 독립적으로 설정하는지 확인.
Resolution / later evidence: 두 번째 화면 녹화에서 `0x+90°`와 두 Rotation 키프레임, 사각형의 90도 회전을 확인함.
```

### E-2026-09-10-006 — Opacity 단독 재연습을 화면 녹화로 재확인

```text
Entry ID: E-2026-09-10-006
Date: 2026-09-10
Subject / scope: After Effects / Opacity 기본 조작 재연습
Status: OBSERVED
Observation: 새 화면 녹화에서 Shape Layer의 Layer Transform Opacity에 0초 `100%`, 1초 `0%` 키프레임이 잡혀 있고, 재생 구간에서 사각형 선이 점차 사라지는 변화가 확인됐다.
Context: 교수 수업 흐름에 맞춰 Position → Scale → Rotation → Opacity를 기본 도형으로 다시 반복하는 과정.
Result: Opacity 두 키프레임으로 100%에서 0%로 변하는 기본 페이드 아웃을 다시 만들었고, 이번 재연습 기준으로 Position / Scale / Rotation / Opacity 네 기본 Transform을 모두 한 번씩 다시 확인했다.
Interpretation: 기본 P/S/R/T 단독 조작 재연습은 완료된 것으로 보고, 다음 단계는 교수 흐름의 Toggle Hold Keyframe과 기본 Transform 조합 연습이 적절하다.
Confidence: HIGH
Related memory IDs: E-2026-09-10-003, E-2026-09-10-005
Follow-up trigger: Hold keyframe을 일반 보간과 비교해 보고, P/S/R/T를 자유 조합한 짧은 모션을 스스로 구성하는지 확인.
Resolution / later evidence: `화면 녹화 중 2026-09-10 132957.mp4`에서 두 Opacity 키프레임과 1초 지점 `0%`, 재생 중 페이드 변화를 확인함.
```

### E-2026-09-10-007 — Hold Keyframe의 불연속 전환을 화면 녹화로 확인

```text
Entry ID: E-2026-09-10-007
Date: 2026-09-10
Subject / scope: After Effects / Toggle Hold Keyframe
Status: OBSERVED
Observation: `화면 녹화 중 2026-09-10 134025.mp4`에서 Opacity 시작 키프레임에 Hold를 적용한 뒤 재생했고, 사각형이 중간값으로 서서히 희미해지지 않고 앞 상태를 유지하다가 다음 키프레임 시점에서 즉시 사라지는 전환이 확인됐다.
Context: 교수 2주차 흐름에서 Opacity 기본 재연습 다음 단계로 `Toggle Hold Keyframe`의 보간 생략을 확인하는 과정.
Result: 일반 Opacity 보간의 점진적 페이드와 Hold 적용 후의 불연속 전환 차이를 실제 화면에서 비교할 수 있게 됐다.
Interpretation: Hold는 앞 키프레임 값을 다음 키프레임 직전까지 유지하고, 다음 키프레임에서 값이 즉시 바뀌는 기능으로 이해하면 된다.
Confidence: HIGH
Related memory IDs: E-2026-09-10-006
Follow-up trigger: P/S/R/T를 자유 조합하는 짧은 구간에서 Hold와 일반 보간을 의도에 맞게 구분해 사용하는지 확인.
Resolution / later evidence: 최신 화면 녹화에서 Hold 적용 메뉴 조작과 재생 중 즉시 사라지는 결과를 확인함.
```
