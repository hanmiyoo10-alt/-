# 분석 재개 및 빌드 자동화

기준 브랜치 fortune-golf-apk. tools/fortune/analysis_env.py는 Python 3.12+와 gh CLI를 사용한다.

## 환경 복구
```sh
python3 tools/fortune/analysis_env.py restore ./ghidra-runtime --parts
```
고정 Release ghidra-toolchain-34213335872의 모든 64MiB 분할본을 다운로드하고 각 조각과 결합 파일의 SHA256을 검사한다. 안전한 tar 추출 후 doctor가 통과해야 목적지로 이동한다. 기존 디렉터리는 덮어쓰지 않는다. GitHub 연결이 허용된 Linux x86_64 환경이 필요하다. 네트워크 정책을 우회하지 않으며 다운로드가 차단되면 실패로 종료한다.

## 분석 상태 보존
Ghidra 프로젝트를 닫은 다음 프로젝트와 분석 파일이 들어 있는 디렉터리를 지정한다.
```sh
python3 tools/fortune/analysis_env.py checkpoint ./analysis ./private-backups/checkpoint.zip --note '다음: Probe 8 실행 결과의 ARM/SVC 문맥 확인'
python3 tools/fortune/analysis_env.py verify ./private-backups/checkpoint.zip
```
각 파일의 해시와 재개 메모를 ZIP에 포함한다. 출력은 입력 폴더 밖에 두며 기존 파일 덮어쓰기·잠금 파일·심볼릭 링크는 거부한다. 백업은 원본 게임을 포함할 수 있어 공개 저장소로 자동 전송하지 않는다. 생성 후 기존 비공개 보관 경로로 저장해야 지속 보존된다. verify는 압축 해제 없이 무결성과 재개 메모를 확인한다.

## 현재 재개 지점
Probe 7 CI 34239421969는 성공했다. 첫 실행 종료 경로의 null framebuffer 해제를 건너뛴다. 실기기 개선 여부는 미확인이다.
Probe 8은 이에 ARM engine 오류 당시 PC/LR 및 SVC category/resume/register 문맥을 추가한다. engine PC는 엔진이 오류를 보고했을 때의 레지스터 값이며 항상 faulting instruction이라고 단정하지 않는다. SVC resume는 서비스 반환 주소이며 실제 메모리 접근 명령어 주소와 구분한다.
기존 timer/native 문맥과 원본 오류 문자열도 유지한다. 성공 경로는 바꾸지 않고 오류는 FatalError로 감싼다.

## 빌드 캐시
setup-node npm 캐시와 rust-cache의 root/wie-app target 캐시를 추가한다. 캐시 적중·시간 단축은 후속 빌드에서 확인해야 한다. Gradle 캐시는 이번 변경에 포함하지 않는다.

## 검증 범위
로컬: checkpoint 왕복, 덮어쓰기 거부, 활성 lock 거부, 변조 감지 통과. 복구는 다운로드 가능한 환경에서 추가 실행 확인이 필요하다. 이번 세션의 Ghidra 실복구 완료를 의미하지 않는다.
ARM 패치는 고정 소스 치환 대상이 정확히 한 번 존재함을 확인한다. Rust 컴파일과 회귀 테스트는 APK workflow가 수행한다.
