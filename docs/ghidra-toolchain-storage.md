# Ghidra 실행 환경 보관

사용자 요청에 따라 hanmiyoo10-alt/- 저장소의 Releases를 실행 파일 보관 위치로 사용한다. 코드와 분석 기록은 fortune-golf-apk 브랜치를 계속 사용한다.

## 포함 범위

Ghidra 12.1.3, Temurin JDK 21 실물 파일, ghidra-cli 0.2.2(소스 커밋 10019ba1f3b54c9edcca8ec644a30e16fb7b7c79), 상대 경로 실행기, 각 구성요소 라이선스, doctor/import/decompile 검증 보고서를 묶는다. Linux x86_64용이다.

## 찾기

https://github.com/hanmiyoo10-alt/-/releases 에서 ghidra-toolchain-<run-id> 태그를 확인한다. 기존 만료되는 Actions artifact 외에 Release assets로 저장한다. workflow 성공과 실제 asset 목록을 확인해야 보관 완료로 판단한다.

## 복구

전체 ghidra-linux-x64.tar.gz와 SHA256SUMS를 받거나, 모든 partNNN 파일과 두 체크섬 파일을 받는다. 작은 파일 경로는 64MiB 청크를 사용한다.

```sh
sha256sum -c PARTS-SHA256SUMS
cat ghidra-linux-x64.tar.gz.part* > ghidra-linux-x64.tar.gz
sha256sum -c SHA256SUMS
mkdir -p ghidra-runtime
tar -xzf ghidra-linux-x64.tar.gz -C ghidra-runtime
./ghidra-runtime/run-ghidra doctor
```

전체 파일을 받았으면 앞의 PARTS 검사와 cat은 생략한다. 프로젝트는 --projects-dir로 별도 경로를 지정한다. Scratch가 비어 있으면 먼저 이 Release를 복구한다. 설치 파일이 없다는 이유로 처음부터 도구를 다시 조사하지 않는다.

원본 게임 바이너리와 게임 분석 프로젝트는 이 도구 배포 묶음에 포함하지 않는다. 기존 fortune-ghidra-checkpoint.zip을 별도로 복구한다.
