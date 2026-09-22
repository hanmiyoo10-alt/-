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

### E-2026-09-10-008 — P/S/R/T 조합을 대용량 화면 녹화에서 직접 검증

```text
Entry ID: E-2026-09-10-008
Date: 2026-09-10
Subject / scope: After Effects / 기본 Transform 조합
Status: OBSERVED
Observation: 301,604,286-byte 화면 녹화 원본을 Google Drive에서 Android 중계 장치로 내려받아 원본 크기 일치를 확인한 뒤 실제 프레임을 추출했다. 추출 프레임에서 한 Shape Layer의 Position / Scale / Rotation / Opacity 네 Layer Transform 모두 애니메이션 스톱워치가 활성화되어 있고 같은 짧은 구간에 복수 키프레임이 배치된 것을 확인했다. 연속 샘플에서는 사각형의 위치·크기·회전 상태가 달라지고 Opacity가 0%인 시점도 확인됐다.
Context: 단독 P/S/R/T와 Hold까지 익힌 뒤, 교수 흐름의 자유 Transform 조합 단계를 화면 녹화로 증명하려던 과정. 원본은 기존 Drive connector의 256 MiB 제한을 초과해 별도 rclone 경로로 확보했다.
Result: P/S/R/T 네 기본 Transform을 한 짧은 구간에서 함께 키프레임으로 구성한 사실을 실제 영상 프레임으로 검증했다.
Interpretation: 기본 Transform 조합 단계는 완료로 승격할 수 있으며, 다음에는 키프레임 타이밍 변형과 교수 예제의 원위치 복귀/Opacity 처리 또는 레퍼런스 응용으로 넘어가는 것이 적절하다.
Confidence: HIGH
Related memory IDs: E-2026-09-10-003, E-2026-09-10-005, E-2026-09-10-006, E-2026-09-10-007
Follow-up trigger: 동일 조합을 별도 안내 없이 다시 만들거나, 키프레임 간격을 바꿔 속도 차이를 의도적으로 재현하는지 확인.
Resolution / later evidence: 대용량 원본의 바이트 크기 일치, ffprobe 메타데이터 확인, 접촉시트 및 고해상도 프레임 검토로 P/S/R/T 동시 키프레임 구성을 확인함. 기술 검증 세부는 study/logs/2026-09-10-after-effects-media-verification.md 참조.
```

### E-2026-09-10-009 — P/S/R/T 조합의 키프레임 간격 변화로 속도 차이 재확인

```text
Entry ID: E-2026-09-10-009
Date: 2026-09-10
Subject / scope: After Effects / 조합 모션 타이밍
Status: OBSERVED
Observation: `화면 녹화 중 2026-09-10 155706.mp4`를 실제 프레임으로 검토했다. P/S/R/T 조합 모션의 끝 키프레임들을 뒤쪽으로 옮긴 뒤 재생한 구간에서, 사각형이 이전보다 긴 시간에 걸쳐 위치·크기·회전 상태를 변화시키는 것이 확인됐다. 기존 최종값이 Position 오른쪽 이동, Scale 150%, Rotation 90° 등으로 크게 잡혀 있어 화면상 변화가 과장되게 커지는 모습도 함께 확인됐다.
Context: P/S/R/T 자유 조합 단계 검증 직후, 같은 값 변화에서 키프레임 간격만 넓혀 속도 차이를 다시 체감하는 연습.
Result: 키프레임 간격을 넓히면 같은 Transform 변화가 더 느린 시간축으로 재생된다는 점을 조합 모션에서도 재확인했다.
Interpretation: 단독 Position 연습에서 익힌 `키프레임 간격 = 속도` 개념을 여러 Transform이 동시에 적용된 경우에도 연결할 수 있다. 과장된 화면 크기 변화는 오류라기보다 현재 조합의 큰 Scale/Position/Rotation 최종값이 동시에 보간된 결과다.
Confidence: HIGH
Related memory IDs: E-2026-09-10-003, E-2026-09-10-008
Follow-up trigger: 교수 예제의 24초 부근 원위치 복귀/Opacity 처리에서 시작 상태를 복사해 되돌리는 흐름을 적용하는지 확인.
Resolution / later evidence: Drive 원본 175,386,030 bytes를 직접 내려받아 ffprobe와 다중 시점 프레임 접촉시트 및 고해상도 프레임으로 확인함.
```

### E-2026-09-10-010 — AE 첫 학습일 종료 상태와 24초 복귀 미완료 구간 확정

```text
Entry ID: E-2026-09-10-010
Date: 2026-09-10
Subject / scope: After Effects / 일일 학습 마감
Status: OBSERVED
Observation: 하루 동안 영어 UI 전환, Composition/Shape Layer, Align/Anchor Point, Position/Scale/Rotation/Opacity 단독 키프레임, 키프레임 간격에 따른 속도 변화, Easy Ease, Speed Graph, Hold Keyframe, P/S/R/T 자유 조합, 조합 모션의 키프레임 간격 변화까지 실제 조작 및 화면 증거로 확인했다. 마지막 화면 녹화 `화면 녹화 중 2026-09-10 163504.mp4`에서는 Composition Duration이 30초로 변경되어 있고 24초에 Opacity 100% 키프레임이 생성된 것을 확인했다. 그러나 24초의 Position/Scale/Rotation은 약 `1577,542 / 150% / 90°`로 남아 있어 정상 원위치 복귀는 아직 완료되지 않았다. 녹화 마지막 0초 상태도 약 `1577,542 / 150% / 90° / 0%`로 보여 시작 키프레임 상태 재확인이 필요하다.
Context: 교수 2주차 흐름의 기본 Transform 반복 연습을 마무리하고 다음 학습일 재개 지점을 고정하는 과정.
Result: 오늘의 기본 조작 학습은 다수 항목에서 검증됐지만, `24초 원위치 복귀` 단계는 미완료 상태로 남겼다. 상세 최신 검토는 `study/logs/2026-09-10-after-effects-24s-return-review.md`가 소유한다.
Interpretation: 다음 학습일에는 24초에서 Position `960,540`, Scale `100%`, Rotation `0°`, Opacity `100%`를 맞춘 뒤 0초 시작 상태를 확인하고 재생으로 원상복귀를 검증해야 한다. 이 필수 검증이 끝나기 전에는 24초 복귀를 완료로 간주하지 않는다.
Confidence: HIGH
Related memory IDs: E-2026-09-10-003, E-2026-09-10-005, E-2026-09-10-006, E-2026-09-10-007, E-2026-09-10-008, E-2026-09-10-009
Follow-up trigger: 다음 AE 세션 시작 시 24초 P/S/R/T 정상값과 0초 시작 상태를 화면에서 확인하고 전체 복귀 재생을 검증한다.
Resolution / later evidence: OPEN — 다음 학습일 검증 대기.
```

### E-2026-09-17-001 — After Effects 2주차 재연습 시작

```text
Entry ID: E-2026-09-17-001
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차
Status: OBSERVED
Observation: 사용자는 2주차 After Effects 실습이 매우 어렵게 느껴졌다고 보고했고, 오늘 해당 주차를 다시 연습하기로 했다.
Context: 2주차 자료에는 컴포지션 설정, 도형 생성/정렬/기준점, Position·Rotation·Opacity 키프레임, Hold Keyframe, 이미지·음원 배치, 렌더링까지 여러 조작이 한 세션에 연결되어 있다.
Result: 아직 실제 재연습 성과는 관찰 전이며, 어려움의 정확한 병목은 미확정이다.
Interpretation: 전체 완성작을 한 번에 재현하기보다 키프레임의 '시작값 → 시간 이동 → 끝값' 원리를 작은 동작별로 분리해 연습하면 병목을 더 정확히 찾을 수 있다는 가설을 세운다.
Confidence: MEDIUM
Related memory IDs: P-001
Follow-up trigger: Position, Rotation, Opacity를 각각 독립적으로 재현한 뒤 어느 단계에서 막히는지와 도움 없이 반복 가능한지를 관찰한다.
Resolution / later evidence: 미확정. 오늘 재연습 결과로 후속 기록한다.
```

### E-2026-09-17-002 — 2주차 연습 기준 파일 확인

```text
Entry ID: E-2026-09-17-002
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차
Status: OBSERVED
Observation: 사용자가 오늘 재연습에 사용할 After Effects 프로젝트 파일을 Drive의 `영상편집실습/중간고사/2주차/2주차 연습` 폴더에 업로드했고, 파일 존재를 확인했다.
Context: 확인된 파일명은 `2주차 연습용_망!.aep`이다.
Result: 오늘 2주차 재연습에서 동일 프로젝트를 기준본으로 사용할 수 있는 상태다.
Interpretation: 이후 도움과 복습 기록은 이 파일을 기준으로 연결하면 세션 간 연속성을 유지하기 쉽다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-001
Follow-up trigger: 해당 프로젝트에서 실제로 막히는 조작과 수정 결과를 관찰해 후속 기록한다.
Resolution / later evidence: 기준 파일 확인 완료. 학습 성과 자체는 아직 미확정이다.
```

### E-2026-09-17-003 — Position 애니메이션 재생 문제 진단 시작

```text
Entry ID: E-2026-09-17-003
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Position 키프레임
Status: OBSERVED
Observation: 사용자는 정사각형 수정 후 프로젝트를 갱신했다고 보고했지만, 재생 시 네모가 움직이지 않는다고 보고했다.
Context: Drive에서 확인되는 프로젝트는 아직 수정 전과 같은 revision 및 수정 시각으로 보여 최신 로컬 변경이 반영되었는지는 확인되지 않았다. 재생 문제와 키프레임 문제를 분리하기 위해 CTI를 0초에서 2초까지 직접 스크럽해 도형 이동 여부를 확인하도록 안내했다.
Result: 원인은 아직 미확정이다. 스크럽 시 이동하면 Preview/화면 갱신 문제, 스크럽해도 이동하지 않으면 Position 키프레임 상태 문제로 좁힐 수 있다.
Interpretation: After Effects의 Caps Lock이 켜져 있으면 Composition 패널 이미지 갱신이 중지되어 실제 시간 진행과 화면 움직임이 분리되어 보일 수 있으므로 우선 확인할 가치가 있다.
Confidence: MEDIUM
Related memory IDs: E-2026-09-17-001, E-2026-09-17-002
Follow-up trigger: 사용자가 CTI 수동 스크럽 시 네모가 움직이는지 확인하면 원인을 Preview 계열 또는 키프레임 계열로 분기한다.
Resolution / later evidence: 미확정.
```

### E-2026-09-17-004 — Position 키프레임 정상, Preview 계열로 원인 축소

```text
Entry ID: E-2026-09-17-004
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Position 키프레임·Preview
Status: OBSERVED
Observation: 사용자는 CTI를 손으로 0초에서 2초까지 스크럽하면 네모가 실제로 움직이고, Caps Lock은 켜져 있지 않다고 확인했다.
Context: 같은 Drive 연습 폴더에 새 수정본 `2주차 연습용_망!1.aep`도 별도 파일로 업로드된 것을 확인했다.
Result: Position 키프레임과 시간에 따른 위치 변화 자체는 동작한다. 재생 시 움직이지 않는 현상은 키프레임 생성 실패보다는 Preview/재생 설정 또는 입력 포커스 계열로 범위가 좁혀졌다.
Interpretation: 다음 진단은 Preview 패널에서 Spacebar 단축키의 비디오 포함 여부와 기본 설정을 확인하고, 필요하면 Preview 설정을 Reset하는 순서가 적절하다. 정확한 Preview 원인은 아직 확정하지 않는다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-003
Follow-up trigger: Preview 패널을 기본값으로 복원한 뒤 Spacebar 재생에서 CTI와 Composition 화면이 함께 갱신되는지 확인한다.
Resolution / later evidence: 키프레임 계열 문제 가능성은 낮아졌고 Preview 계열 진단으로 전환한다.
```

### E-2026-09-17-005 — 정사각형 수정 성공, Position 키프레임 1개 추가 확인

```text
Entry ID: E-2026-09-17-005
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / 도형·Position
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!2.aep`에서 Rectangle Path Size가 250×250으로 확인되어 정사각형 수정은 성공했다. Position에는 약 0초, 1.93초, 2초의 세 키프레임이 존재하며, 2초 직전 키프레임 하나가 추가되어 있다.
Context: 사용자는 Preview 문제를 해결해 Spacebar 재생이 동작한다고 확인한 뒤 최신 프로젝트를 다시 업로드했다. 최신 파일에서는 레이어 Scale도 약 100.8% 수준의 정적 값으로 저장되어 있다.
Result: 도형 제약과 기본 Position 애니메이션은 재현 가능해졌다. 다만 현재 연습 목표가 0초→2초 두 점 이동이라면 중간 키프레임을 제거하고 Scale을 100%로 되돌리는 편이 더 단순한 기준본이 된다.
Interpretation: 키프레임 원리 자체보다 연습 중 속성이나 키프레임을 의도치 않게 추가·변경하지 않고 상태를 관리하는 정밀 조작이 현재 확인할 가치가 있는 다음 포인트다. 단일 세션이므로 일반적 약점으로 확정하지 않는다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-003, E-2026-09-17-004
Follow-up trigger: Position을 두 키프레임으로 정리하고 Scale 100% 상태를 확인한 뒤 Rotation을 추가해 회전 축과 키프레임 생성 흐름을 관찰한다.
Resolution / later evidence: 정사각형 수정 성공. Position 중간 키프레임 정리와 Scale 복원은 미확정이다.
```

### E-2026-09-17-006 — Position 정리 대부분 성공, 종료 키프레임 시점만 재조정 필요

```text
Entry ID: E-2026-09-17-006
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Position 정리
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!3.aep`에서 Rectangle Path Size는 250×250, 레이어 Scale은 100%·100%, Position Y는 시작과 끝 모두 538로 확인됐다. Position 키프레임 수도 두 개로 정리됐다. 다만 남은 두 번째 Position 키프레임의 시점은 2초가 아니라 약 1.93초다.
Context: 직전 연습본에는 약 0초, 1.93초, 2초의 Position 키프레임 세 개가 있었고, 사용자는 중간 키프레임을 삭제해 두 점 애니메이션으로 정리하려 했다.
Result: 정사각형, Scale, 수평 이동, 키프레임 개수 정리는 성공했다. 삭제 과정에서 2초 키프레임을 제거하고 1.93초 키프레임을 남긴 것으로 보여 종료 시점만 2초로 옮기면 현재 Position 연습 목표를 충족한다.
Interpretation: 현재 핵심 원리 이해는 확보되고 있으며, 남은 이슈는 키프레임 선택·시점 배치의 정밀 조작이다. 단일 세션 관찰이므로 일반적 약점으로 승격하지 않는다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-005
Follow-up trigger: 두 번째 Position 키프레임을 정확히 2초로 이동한 뒤 재생 결과를 확인하고 Rotation 연습으로 넘어간다.
Resolution / later evidence: Scale 및 수평 이동 정리 완료. 종료 키프레임 시점은 미확정이다.
```

### E-2026-09-17-007 — Position 기본 연습 완료 확인

```text
Entry ID: E-2026-09-17-007
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Position 기본 연습
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!4.aep`에서 Rectangle Path Size 250×250, 레이어 Scale 100%·100%, Position 키프레임 두 개가 각각 0초와 정확히 2초에 존재하며, 좌표는 약 (948, 538)에서 (573, 538)로 확인됐다.
Context: 직전 연습본에서 두 번째 Position 키프레임이 약 1.93초에 남아 있어 정확히 2초로 옮기도록 교정한 뒤 다시 업로드한 결과를 확인했다.
Result: 정사각형 유지, Scale 기본값, 수평 이동, 0초→2초 두 점 Position 애니메이션이라는 현재 미니 연습 목표를 모두 충족했다.
Interpretation: Position의 '시작값 → 시간 이동 → 끝값' 흐름은 이번 세션에서 실제 프로젝트 구조로 검증됐다. 다음 관찰은 Rotation에서 동일한 키프레임 원리를 독립적으로 재현하는지에 둔다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-005, E-2026-09-17-006
Follow-up trigger: Rotation 키프레임을 설정하고 회전 중심 및 재생 결과를 확인한다.
Resolution / later evidence: Position 기본 연습 완료. Rotation·Opacity는 아직 미확정이다.
```

### E-2026-09-17-008 — Rotation 기본 연습 완료 확인

```text
Entry ID: E-2026-09-17-008
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Rotation 기본 연습
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!5.aep`에서 Rotation Z에 두 키프레임이 존재하며, 첫 키는 0초에서 0°, 두 번째 키는 정확히 2초에서 360°로 확인됐다. 기존 Position 키프레임도 0초와 2초의 두 점 상태를 유지한다.
Context: Position 기본 연습 완료 후 같은 0초→2초 구간에 Rotation을 추가해 한 바퀴 회전하도록 설정한 결과를 프로젝트 구조에서 확인했다.
Result: 0초→2초 동안 왼쪽 이동과 1회전이 동시에 적용되는 구성으로 확인됐다. Rectangle Path 250×250 및 Scale 100% 상태도 유지된다.
Interpretation: Position에 이어 Rotation에서도 '시작값 → 시간 이동 → 끝값' 키프레임 흐름을 같은 시간 구간에 재현했다. 다음 관찰은 Opacity에서 같은 원리를 값 변화와 반복 복사에 적용하는지에 둔다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-007
Follow-up trigger: Opacity 키프레임으로 100→0 또는 점멸 패턴을 만들고 키프레임 복사·붙여넣기 흐름을 확인한다.
Resolution / later evidence: Position·Rotation 기본 연습 완료. Opacity는 아직 미확정이다.
```

### E-2026-09-17-009 — Opacity 기본 페이드 연습 완료 확인

```text
Entry ID: E-2026-09-17-009
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Opacity 기본 연습
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!6.aep`에서 Opacity에 두 키프레임이 존재하며, 첫 키는 0초에서 100%, 두 번째 키는 정확히 1초에서 0%로 확인됐다. 기존 Position 0초→2초와 Rotation 0°→360° 키프레임 데이터는 직전 연습본과 동일하게 유지됐다.
Context: Position과 Rotation 기본 연습 완료 후 같은 레이어에서 Opacity를 100→0으로 설정한 결과를 프로젝트 구조에서 확인했다.
Result: 0초→1초 동안 투명도가 100%에서 0%로 감소하는 기본 페이드가 구성됐고, 앞서 만든 이동·회전 애니메이션은 손상되지 않았다.
Interpretation: Position, Rotation, Opacity 세 기본 Transform 속성에서 '시작값 → 시간 이동 → 끝값' 키프레임 흐름을 각각 재현했다. 다음 관찰은 Opacity 키프레임 쌍을 복사·붙여넣기해 반복 점멸 패턴을 만드는 단계다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-007, E-2026-09-17-008
Follow-up trigger: Opacity의 100→0 키프레임 쌍을 복사해 뒤 구간에 붙여넣고 반복 패턴의 시점·값을 확인한다.
Resolution / later evidence: Position·Rotation·Opacity 기본 키프레임 연습 완료. Opacity 반복 복사는 아직 미확정이다.
```

### E-2026-09-17-010 — Opacity 키프레임 쌍 복사 성공

```text
Entry ID: E-2026-09-17-010
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Opacity 반복 복사
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!7.aep`에서 Opacity 키프레임이 네 개로 늘었고, 시점·값은 0초 100%, 1초 0%, 4초 100%, 5초 0%로 확인됐다.
Context: 직전 연습본의 0초 100% → 1초 0% 두 키프레임을 선택해 복사한 뒤 뒤쪽 시간에 붙여넣는 연습을 수행했다.
Result: 복사된 키프레임 쌍은 값 순서 100%→0%와 쌍 내부 1초 간격을 그대로 보존했다. 원본 쌍의 마지막 키프레임 1초와 복사본 첫 키프레임 4초 사이에는 3초 간격이 있다.
Interpretation: 다중 키프레임 선택과 복사·붙여넣기 자체는 성공했다. 연속 반복을 만들려면 붙여넣기 기준 시점을 의도한 주기에 맞춰 배치하는 단계가 다음 확인 포인트다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-009
Follow-up trigger: 수업 의도에 맞춰 연속 점멸을 만들 경우 복사본의 시작 시점을 조정하고, Hold Keyframe 단계에서는 보간이 갑작스러운 전환으로 바뀌는지 확인한다.
Resolution / later evidence: Opacity 키프레임 복사·붙여넣기 성공. 연속 반복 간격과 Hold 적용은 아직 미확정이다.
```

### E-2026-09-17-011 — Opacity 반복 간격 교정 성공

```text
Entry ID: E-2026-09-17-011
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Opacity 반복 간격
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!8.aep`에서 Opacity 키프레임 네 개의 시점·값이 0초 100%, 1초 0%, 2초 100%, 3초 0%로 확인됐다.
Context: 직전 연습본에서는 복사된 두 키프레임이 4초와 5초에 있어 원본 쌍과 3초 공백이 있었고, 연속 1초 주기가 되도록 복사본의 시점을 조정했다.
Result: Opacity 값 순서 100%→0%→100%→0%와 각 인접 키프레임 사이 1초 간격이 모두 성립한다. 기존 Position·Rotation 데이터도 유지된다.
Interpretation: Opacity 키프레임 복사 후 주기 배치까지 의도한 반복 구조로 정리했다. 현재 키프레임 보간은 Hold로 전환된 상태로 확인되지 않으므로, 다음 단계에서 Hold Keyframe 적용 후 갑작스러운 전환 여부를 별도로 검증한다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-009, E-2026-09-17-010
Follow-up trigger: 네 Opacity 키프레임에 Toggle Hold Keyframe을 적용하고 재생 시 값이 구간 사이에서 보간되지 않고 다음 키에서 즉시 전환되는지 확인한다.
Resolution / later evidence: Opacity 연속 반복 시점 배치 완료. Hold 적용은 아직 미확정이다.
```

### E-2026-09-17-012 — Opacity Hold Keyframe 적용 확인

```text
Entry ID: E-2026-09-17-012
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Opacity Hold Keyframe
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!9.aep`에서 Opacity 네 키프레임의 시점·값은 0초 100%, 1초 0%, 2초 100%, 3초 0%로 유지되며, 직전 `망!8` 대비 네 키프레임 각각의 보간 상태 플래그가 동일하게 Hold 상태로 변경된 것이 프로젝트 구조에서 확인됐다.
Context: `망!8`에서 연속 1초 간격의 Opacity 반복을 만든 뒤 네 키프레임 전체에 Toggle Hold Keyframe을 적용했다.
Result: 값과 시점은 그대로 보존된 채 Opacity 보간이 Hold로 전환됐다. 기존 Position·Rotation 데이터에는 변화가 없다.
Interpretation: 기본 페이드, 키프레임 복사, 반복 간격 정리, Hold 전환까지 Opacity 연습 흐름을 실제 프로젝트 구조에서 모두 재현했다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-009, E-2026-09-17-010, E-2026-09-17-011
Follow-up trigger: 재생 화면에서 0~1초 100%, 1~2초 0%, 2~3초 100%처럼 구간 값이 유지되다가 키프레임 순간에 즉시 전환되는지 체감 확인한다.
Resolution / later evidence: Opacity 반복 및 Hold 적용 완료. 재생 체감 확인만 남음.
```

### E-2026-09-17-013 — 원 Shape Layer 생성 및 중앙 배치 확인

```text
Entry ID: E-2026-09-17-013
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Ellipse Shape Layer
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!10_원 copy.aep`에서 새 `Shape Layer 1`이 기존 `모양 레이어 1`과 별도 레이어로 존재하고, 새 레이어의 Ellipse Size는 225×225로 확인됐다. 레이어 Position과 Vector Position을 합산한 실제 도형 중심은 1920×1080 컴포지션의 정확한 중앙인 (960, 540)이다. 새 원 레이어에는 키프레임 데이터가 없다.
Context: 기존 네모 애니메이션을 유지한 채 레이어 선택을 해제하고 Ellipse Tool로 정원을 만든 뒤 화면 중앙 정렬을 수행했다.
Result: 원은 정원 비율을 유지하며 새 Shape Layer로 분리되어 있고, 시각적 중심이 컴포지션 중앙에 놓였다. 기존 네모 레이어의 전체 `LIST Layr` 블록은 직전 `망!9`와 바이트 단위로 동일해 기존 Position·Rotation·Opacity Hold 애니메이션이 보존됐다.
Interpretation: 새 도형 생성 시 기존 애니메이션 레이어를 건드리지 않고 별도 Shape Layer를 만드는 흐름과 화면 중앙 배치를 재현했다. 다만 메인 AEP 레이어 구조에서는 Anchor Point가 독립 속성으로 노출되지 않아 앵커 십자표시가 도형 중앙에 있는지는 이 파일 구조만으로 확정하지 않는다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-012
Follow-up trigger: AE 화면에서 새 원 레이어의 Anchor Point 표시가 원 중심에 있는지 시각 확인한 뒤 다음 도형 연습으로 진행한다.
Resolution / later evidence: 원 생성·별도 레이어·정원 크기·화면 중앙 배치 및 기존 네모 애니메이션 보존 확인. 앵커의 정확한 시각 위치는 별도 확인 필요.
```

### E-2026-09-17-014 — 삼각형 생성 성공, 원과 같은 Shape Layer에 합쳐짐

```text
Entry ID: E-2026-09-17-014
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Polygon·Shape Layer 분리
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!11_삼.aep`에서 Polystar Path의 Points 값은 3.0으로 확인되어 삼각형 생성 자체는 성공했다. 그러나 새 Polystar 그룹과 기존 Ellipse 그룹이 모두 같은 `Shape Layer 1`의 Contents 안에 존재하며, 별도의 새 Shape Layer는 생성되지 않았다.
Context: 직전 `망!10_원 copy.aep`의 원 레이어를 유지한 채 Polygon Tool로 삼각형을 새 도형 레이어에 만들려는 단계였다.
Result: 삼각형 도형 규칙은 맞지만 레이어 분리 목표는 미완료다. 두 도형이 같은 Shape Layer에 들어간 상태에서 레이어 기준점/정렬이 다시 계산되어 원과 삼각형을 각각 독립적으로 중앙 정렬하기 어렵다. 기존 네모 애니메이션 레이어의 `LIST Layr` 블록은 직전 파일과 바이트 단위로 동일해 손상되지 않았다.
Interpretation: Polygon Tool 사용과 Points=3 설정은 재현했지만, 새 도형을 만들기 전에 모든 레이어 선택을 완전히 해제하는 단계가 누락된 것으로 보인다. 단일 사례이므로 일반적 학습 성향으로 승격하지 않는다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-013
Follow-up trigger: `Shape Layer 1 > Contents`에서 이번에 추가한 `Polystar 1`만 삭제하고, 타임라인 빈 공간을 클릭해 모든 레이어 선택을 해제한 뒤 Polygon Tool로 삼각형을 새 Shape Layer에 다시 만든다. Points=3과 중앙 배치를 다시 확인한다.
Resolution / later evidence: 삼각형 모양 생성은 성공. 별도 Shape Layer 생성과 독립 중앙 배치는 미완료.
```

### E-2026-09-17-015 — 삼각형 별도 Shape Layer 분리 및 중앙 배치 성공

```text
Entry ID: E-2026-09-17-015
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / Polygon·Shape Layer 분리 교정
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!12_삼.aep`에서 삼각형은 새 `Shape Layer 2`의 `Polystar 1`로 존재하고, 기존 원은 별도 `Shape Layer 1`의 `Ellipse 1`로 유지된다. Polystar Path의 Points 값은 3.0이다. 삼각형의 레이어 Position, Vector Position, Rotation, Outer Radius로 계산한 시각적 바운딩 박스 중심은 약 (960.000003, 539.999997)로 1920×1080 컴포지션 중앙과 일치한다.
Context: 직전 `망!11_삼.aep`에서 원과 삼각형이 같은 Shape Layer에 합쳐진 것을 확인한 뒤 Polystar만 삭제하고, 모든 레이어 선택을 해제한 상태에서 삼각형을 다시 생성해 중앙 정렬했다.
Result: 삼각형이 원과 독립된 Shape Layer로 분리됐고 Points=3 및 중앙 배치가 모두 확인됐다. 기존 원 레이어와 네모 애니메이션 레이어는 별도 레이어로 유지된다.
Interpretation: 새 도형 생성 전에 레이어 선택을 해제해야 독립 Shape Layer가 생성된다는 교정 절차를 이번 재시도에서 성공적으로 적용했다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-013, E-2026-09-17-014
Follow-up trigger: 다음 도형 또는 미디어 배치 단계에서도 새 레이어 생성이 필요한 경우 작업 전 선택 상태를 확인한다.
Resolution / later evidence: 삼각형 생성, 별도 Shape Layer 분리, Points=3, 중앙 배치 완료.
```

### E-2026-09-17-016 — PNG 이미지 소스 및 레이어 추가 확인

```text
Entry ID: E-2026-09-17-016
Date: 2026-09-17
Subject / scope: After Effects / 영상편집실습 2주차 / PNG 미디어 배치
Status: OBSERVED
Observation: 최신 연습본 `2주차 연습용_망!13_사진.aep`에서 새 PNG 소스 `오징어게임.png`가 프로젝트에 포함됐고 소스 크기는 900×900으로 확인됐다. 컴포지션에는 직전 파일보다 `LIST Layr`가 하나 추가되어 총 네 개의 메인 레이어가 존재하며, 새 이미지 레이어에는 키프레임 `ldat`가 없다.
Context: 삼각형 연습 완료 후 Project 패널의 PNG 이미지를 타임라인에 드래그하고 위치·크기 등 추가 변형은 하지 않는 단계였다.
Result: PNG 미디어가 새 레이어로 추가됐고, 직전 `망!12_삼.aep`의 삼각형·원·네모 세 `LIST Layr` 블록은 최신 파일에서도 바이트 단위로 동일하게 유지되어 기존 도형 및 애니메이션 데이터가 보존됐다.
Interpretation: 정적 이미지 소스를 타임라인에 새 레이어로 추가하면서 기존 Shape Layer 작업을 건드리지 않는 흐름을 재현했다.
Confidence: HIGH
Related memory IDs: E-2026-09-17-015
Follow-up trigger: 다음 미디어 배치 단계에서 MP3 등 오디오 소스를 타임라인에 추가하고 기존 이미지·도형 레이어가 유지되는지 확인한다.
Resolution / later evidence: PNG 이미지 소스 추가, 새 레이어 생성, 기존 도형·애니메이션 보존 확인 완료.
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
