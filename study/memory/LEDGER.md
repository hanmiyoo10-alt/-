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
