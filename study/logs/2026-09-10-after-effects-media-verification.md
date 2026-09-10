# 2026-09-10 After Effects 화면 녹화 검증 메모

## 목적

After Effects 기초 실습 중 Google Drive에 올린 화면 녹화를 실제 프레임으로 확인할 수 있는지 기록한다.

## 대상 영상

```text
파일: 화면 녹화 중 2026-09-10 140237.mp4
Drive 표시 크기: 301,604,286 bytes (약 301.6 MB)
상태: CONTENT_VERIFIED_FOR_PSRT_COMBINATION
```

초기에는 Drive 폴더에서 파일 존재와 메타데이터만 확인했고, 당시 사용 중이던 원본 파일 가져오기 경로의 268,435,456-byte 제한보다 파일이 커서 원본 다운로드가 거부되었다. 따라서 그 시점에는 영상 안의 After Effects 동작, 키프레임, P/S/R/T 조합 성공 여부를 확인했다고 기록하지 않았다.

이후 별도 Android Termux + rclone 경로를 구성해 원본을 실제로 확보하고 프레임을 검토하면서 아래의 제한된 범위는 검증 완료로 갱신했다.

## 초기 검증 경로

처음에는 다음 중 하나로 더 작은 증거를 확보하는 경로를 검토했다.

- 필요한 동작만 포함한 짧은 화면 녹화로 다시 올리기
- 해상도/비트레이트를 낮춰 256 MiB 미만으로 내보내기
- 키프레임과 Composition이 함께 보이는 스크린샷 또는 짧은 클립 올리기

실제 해결은 원본을 다른 전송 경로로 Android에 받아 프레임을 직접 추출하는 방식으로 진행됐다.

## 원격 처리 가능성 확인

Remote Desktop Commander의 연결 상태를 확인한 결과, 현재 온라인으로 보이는 두 장치는 모두 Android 환경이며 Windows 작업 PC는 온라인 장치로 확인되지 않았다.

따라서 당시 상태에서는 원격 장치에서 해당 Windows 화면 녹화 원본을 직접 잘라낼 수 없었다. 다만 원본 파일이 있는 Windows PC가 Remote Desktop Commander에 온라인으로 연결되면, 그 PC에서 `ffmpeg` 등으로 원본을 여러 짧은 클립으로 분할하거나 해상도/비트레이트를 낮춘 사본을 만든 뒤 256 MiB 제한 아래의 검증용 파일만 Drive에 올리는 경로도 대안으로 유지할 수 있다.

## Android 중계 우회 경로 확인

Windows PC를 추가로 연결하지 않아도, 연결된 Android 장치를 중계 지점으로 쓰는 가능성을 확인했다. Android 환경에서 `/storage/emulated/0/Download` 접근이 가능했고, 이후 메인 Android의 Termux 네이티브 환경에 `rclone`과 `ffmpeg`를 설치해 이 우회 경로를 실제로 사용했다.

비로그인 다운로드 가능한 링크로 직접 HTTP 접근하는 방식도 검토했지만, 당시 Drive 파일은 비로그인 직접 다운로드 시 Google 로그인 화면으로 리디렉션되어 사용할 수 없었다.

## CLI / Skill / Git 대안 점검

- **CLI:** 실제 해결 경로가 됐다. Android Termux의 `rclone`로 Drive 원본을 받고, `ffmpeg`로 메타데이터 확인 및 프레임 추출을 수행했다.
- **Skill:** Skill 자체는 파일 전송 한도를 우회하는 전송 수단은 아니다. 다만 `Drive 원본 찾기 → 로컬 다운로드 → 프레임/검증용 클립 생성 → 검토` 절차가 반복된다면 별도 workflow로 묶을 수 있다.
- **Git:** 영상 원본은 Git 저장소에 넣지 않는다. 기준 저장소는 public이고, 학습 화면 녹화 같은 비공개 원본을 Git 전송 우회로로 사용하지 않는다.

## CLI 경로 실행 상태

초기 Android의 Ubuntu/PRoot 환경에는 `rclone 1.60.1`과 `ffmpeg 6.1.1`을 설치했으나, 브라우저 OAuth handoff와 환경 혼선 때문에 안정적인 검증 경로로 마무리되지 않았다.

이후 별도 메인 Android 장치를 Remote Desktop Commander에 연결했고, 그 장치의 **Termux 네이티브 환경**에서 `rclone 1.75.1-termux`와 `ffmpeg 8.1.2` 설치 완료를 실제 실행으로 확인했다.

사용자 화면의 `root@localhost:...#` 프롬프트는 Ubuntu/PRoot의 root 환경이고, 최종적으로 사용한 rclone 설정·다운로드 표면은 Termux 앱 사용자 환경이었다. 두 환경은 HOME과 rclone 설정 경로가 다르므로, 이후 작업도 동일 환경으로 통일한다.

OAuth 인증 자료가 터미널/대화 출력에 노출된 적이 있으므로 실제 토큰, 계정 주소, 기기 식별자 등 민감 정보는 이 공개 기록에 저장하지 않는다.

## 실제 Drive 접근 및 원본 확보 검증

메인 Android 원격 세션을 다시 연결한 뒤 Termux 네이티브 환경에서 다음을 확인했다.

```text
rclone remote 이름: schooldrive
Drive 접근 테스트: 성공
대상 파일 조회: 성공
Drive 파일 크기: 301,604,286 bytes
Android 로컬 사본 크기: 301,604,286 bytes
```

Drive 접근 테스트는 저장 용량 정보만 요청하는 읽기 작업으로 성공 여부를 확인했고, 대상 폴더에서는 정확한 파일명과 크기가 조회됐다. 이후 원본을 Android의 검증용 Download 하위 폴더로 복사했고 로컬 `stat` 결과가 Drive 표시 크기와 정확히 일치했다.

`ffprobe`로 확인한 로컬 원본 메타데이터는 다음과 같다.

```text
video codec: H.264
frame size: 1918 x 1030
frame rate: 30 fps
duration: 약 285.18초
```

이 검증은 원본 Drive 파일을 수정하거나 삭제하지 않고 로컬 사본만 사용했다.

## 실제 프레임 검증 결과

전체 녹화에서 10초 간격 접촉시트를 만들고, 후반 Transform 실습 구간에는 2초 간격 접촉시트와 고해상도 개별 프레임을 추가로 추출해 확인했다.

고해상도 프레임에서는 한 Shape Layer의 Layer Transform 아래 `Position`, `Scale`, `Rotation`, `Opacity` 네 항목 모두 애니메이션 스톱워치가 활성화되어 있었고, 같은 짧은 타임라인 구간에 복수 키프레임이 배치된 상태가 확인됐다. 별도 프레임에서는 Position 좌표, Scale 값, Rotation 각도, Opacity 값이 서로 다른 상태로 나타났고, 접촉시트의 연속 샘플에서도 사각형의 위치·크기·회전이 달라지는 것이 보였다.

특히 Opacity는 0%인 시점이 확인됐고, 선택된 레이어의 바운딩 박스는 남아 있지만 실제 Stroke는 보이지 않는 상태여서 값 변화와 화면 상태가 일치했다.

따라서 이 영상이 증명하려던 범위인 **P/S/R/T 네 기본 Transform을 한 짧은 구간에서 함께 키프레임으로 구성한 사실**은 검증 완료로 본다.

다만 이 상태 라벨은 4분 45초 전체 녹화의 모든 동작을 프레임 단위로 전수 검증했다는 뜻은 아니다. 현재 검증 범위는 `대상 원본 확보의 무결성 + P/S/R/T 조합 구간의 실제 프레임 확인`에 한정한다.

## 현재 결론

```text
DRIVE_ACCESS = VERIFIED
LOCAL_COPY_BYTE_MATCH = VERIFIED
VIDEO_DECODING = VERIFIED
PSRT_COMBINATION = VERIFIED
FULL_RECORDING_EXHAUSTIVE_REVIEW = NOT_CLAIMED
```

학습 진척 기준으로는 P/S/R/T 자유 조합 단계를 완료로 승격할 수 있다. 다음 단계는 키프레임 간격 변화로 조합 모션의 속도를 다시 의도적으로 바꿔 보거나, 교수 예제의 원위치 복귀/Opacity 처리와 레퍼런스 응용으로 넘어가는 것이다.
