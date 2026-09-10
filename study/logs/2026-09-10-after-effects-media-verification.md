# 2026-09-10 After Effects 화면 녹화 검증 메모

## 목적

After Effects 기초 실습 중 Google Drive에 올린 화면 녹화를 실제 프레임으로 확인할 수 있는지 기록한다.

## 현재 미검증 영상

```text
파일: 화면 녹화 중 2026-09-10 140237.mp4
Drive 표시 크기: 301,604,286 bytes (약 301.6 MB)
상태: CONTENT_UNVERIFIED
```

Drive 폴더에서 파일 존재와 메타데이터는 확인했지만, 현재 사용 중인 원본 파일 가져오기 경로의 268,435,456-byte 제한보다 파일이 커서 원본 다운로드가 거부되었다. 따라서 이 영상 안의 After Effects 동작, 키프레임, P/S/R/T 조합 성공 여부는 아직 확인했다고 기록하지 않는다.

## 다음 검증 경로

다음 중 하나로 더 작은 증거를 확보한 뒤 다시 확인한다.

- 필요한 동작만 포함한 짧은 화면 녹화로 다시 올리기
- 해상도/비트레이트를 낮춰 256 MiB 미만으로 내보내기
- 키프레임과 Composition이 함께 보이는 스크린샷 또는 짧은 클립 올리기

검증 전에는 기존 학습 진척을 유지하되, 이 새 영상이 증명하려던 단계는 완료로 승격하지 않는다.

## 원격 처리 가능성 확인

Remote Desktop Commander의 연결 상태를 확인한 결과, 현재 온라인으로 보이는 두 장치는 모두 Android 환경이며 Windows 작업 PC는 온라인 장치로 확인되지 않았다.

따라서 현재 상태에서는 원격 장치에서 해당 Windows 화면 녹화 원본을 직접 잘라낼 수 없다. 다만 원본 파일이 있는 Windows PC가 Remote Desktop Commander에 온라인으로 연결되면, 그 PC에서 `ffmpeg` 등으로 원본을 여러 짧은 클립으로 분할하거나 해상도/비트레이트를 낮춘 사본을 만든 뒤 256 MiB 제한 아래의 검증용 파일만 Drive에 올리는 경로를 사용할 수 있다.

이 경로는 원본을 다시 녹화하지 않고도 검증 가능한 작은 증거를 만드는 대안으로 유지한다.

## Android 중계 우회 경로 확인

Windows PC를 추가로 연결하지 않아도, 이미 연결된 Android 장치를 중계 지점으로 쓰는 가능성을 확인했다. 현재 원격 Android 환경에서는 `/storage/emulated/0/Download` 경로 접근이 가능하고 `termux-setup-storage`도 존재한다.

따라서 사용자가 Google Drive 앱에서 문제의 MP4를 Android의 일반 `Download` 폴더로 직접 내려받을 수 있다면, Remote Desktop Commander가 그 로컬 파일을 찾아 후속 처리하는 경로가 성립할 가능성이 높다.

현재 원격 Android에는 `ffmpeg` 실행 파일이 확인되지 않았다. 실제 영상 분할/재인코딩을 하려면 먼저 해당 장치에 `ffmpeg`를 설치하거나 동등한 로컬 영상 처리 도구를 사용할 필요가 있다. 설치는 사용자 승인 후에만 수행한다.

또 다른 우회는 파일을 일시적으로 비로그인 다운로드 가능한 링크로 공개한 뒤 직접 HTTP로 가져오는 방식이지만, 현재 Drive 파일은 비로그인 직접 다운로드 시 Google 로그인 화면으로 리디렉션되어 이 경로는 현재 상태로는 사용할 수 없다.

## CLI / Skill / Git 대안 점검

연결된 Android 원격 환경에서 현재 확인되는 CLI는 `git`, `curl`, `python3`이며 `rclone`, `ffmpeg`, `gdown`, `git-lfs`는 설치되어 있지 않다.

- **CLI:** 가장 유력한 우회다. Android Termux에 `rclone`을 설치하고 Google Drive를 OAuth로 한 번 인증하면, Drive connector의 256 MiB 다운로드 제한과 다른 경로로 301.6 MB 원본을 Android 로컬 저장소에 받을 수 있다. 이후 `ffmpeg`를 설치해 짧은 검증용 클립으로 분할할 수 있다. 인증/설치는 사용자 승인 후 진행해야 한다.
- **Skill:** Skill 자체는 파일 전송 한도를 우회하는 전송 수단이 아니다. 다만 위 CLI 경로가 안정화되면 `Drive 원본 찾기 → 로컬 다운로드 → 분할 → 검증용 클립 생성` 절차를 반복 가능한 skill/workflow로 묶는 것은 가능하다.
- **Git:** 이 영상 원본을 Git 저장소에 넣는 방식은 사용하지 않는다. 기준 저장소는 public이고, 학습 화면 녹화 같은 비공개 원본을 Git에 올리는 것은 저장소의 민감/비공개 자료 비저장 원칙과 맞지 않는다. `git-lfs`도 현재 설치되어 있지 않으며, 설치 여부와 무관하게 이 목적의 전송 우회로로 삼지 않는다.

현재 가장 현실적인 무-PC 우회 후보는 `Android Termux + rclone + ffmpeg` 경로다.

## CLI 경로 실행 상태

사용자 승인 후 Android의 Ubuntu/PRoot 환경에 `rclone 1.60.1`과 `ffmpeg 6.1.1` 설치를 완료했다. Google Drive용 `schooldrive` remote를 생성했고, 현재 남은 단계는 OAuth 인증 토큰 발급이다.

온라인으로 보이는 두 원격 세션은 모두 같은 Samsung `SM-G998N` 모델과 같은 Download 경로를 보고해 동일 단말의 중복 세션일 가능성이 있다. 사용자 요청에 따라 두 번째 온라인 세션에서 rclone OAuth 로컬 인증 URL을 브라우저로 열도록 시도했다. 인증 성공 여부는 아직 확인되지 않았다.

## 메인 Android 장치 추가 연결

사용자가 별도 메인 Android 장치에서 Remote Desktop Commander 기기 인증을 완료했고, 서버에서 새 온라인 장치로 나타나는 것을 확인했다. 기존 중복 의심 세션과는 별개의 장치임도 시스템 정보로 확인했다.

해당 장치에는 Termux와 Node.js가 이미 준비되어 있고 원격 명령 실행이 가능하다. `rclone`과 `ffmpeg` 설치를 시작했으나, 패키지 설치 완료 여부는 아직 검증되지 않았다. 계정 주소, 기기 ID, 인증 코드 등 민감하거나 개인적인 연결 정보는 이 공개 기록에 저장하지 않는다.
