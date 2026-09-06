# 포춘골프 원본 실행용 Android 빌드

이 브랜치는 WIE 오픈소스 에뮬레이터의 Android 테스트 APK를 빌드합니다.
포춘골프 원본 ZIP은 저장소나 APK에 포함하지 않습니다. 휴대폰에서 직접 선택합니다.

## 스마트폰 설치
1. 이 저장소 Actions에서 Fortune Golf APK 실행을 엽니다.
2. 성공한 실행의 Artifacts에서 fortune-golf-emulator-apk를 다운로드하고 압축을 풉니다.
3. APK를 설치한 후 앱 추가에서 보유한 컴투스포춘골프3D.zip을 선택합니다.

현재는 실행 호환성 검증을 위한 WIE 테스트 앱입니다.
APK 빌드 성공은 포춘골프의 3D 화면, 소리, 저장이 정상이라는 뜻이 아닙니다.
오류가 발생하면 메시지와 화면을 기록해 주세요.

## 빌드
전용 브랜치 fortune-golf-apk의 빌드 설정 변경 시 GitHub Actions가 실행됩니다.
PC나 Termux 서버는 필요하지 않습니다.
원본 소스: https://github.com/dlunch/wie
고정 버전: 1ed8710956e727629e67db762ddc1e6bd6151a1f
결과는 debug 서명된 ARM64 APK입니다. 재빌드 시 서명 키가 바뀔 수 있어
기존 앱에 덮어쓰기 설치가 안 될 수 있습니다. 삭제하면 앱 저장 데이터도 사라질 수 있습니다.
이 단계에서는 자동 업데이트나 완전한 게임 호환성을 보장하지 않습니다.
