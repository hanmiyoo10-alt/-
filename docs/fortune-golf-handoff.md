# 포춘골프 작업 인계 및 전체 기록 안내

대상: 컴투스 포춘골프3D 원본의 Android 실행 개선. 작업 브랜치: `fortune-golf-apk`.
사용자 요청에 따라 이전 진행 내용과 재개에 필요한 정보를 모은 문서다. 확인한 사실과 가설을 구분하며, 전체 대화 원문을 옮긴 것은 아니다.

## 기존 파일 안내

- [Android 작업 안내](../fortune-golf-android/README.md)
- [시작 오류 조사](fortune-golf-startup-investigation.md)
- [레코드 DB 패치 이력](fortune-golf-record-probe-v2.md)
- [DB 구현](../fortune-probe/startup_database.rs) 및 [패치 적용 도구](../fortune-probe/apply.py)
- [APK 빌드](../.github/workflows/fortune-golf-apk.yml)
- [Ghidra 환경 기록](ghidra-analysis-environment.md)
- [Ghidra 실제 원본 분석 확인](ghidra-local-verification-20260908.md)
- [Thumb 시작점 설정 스크립트](../fortune-probe/ghidra/PrepareFortune.java)
- [Ghidra 환경 빌드](../.github/workflows/ghidra-environment.yml), [전달](../.github/workflows/ghidra-transfer.yml), [JDK](../.github/workflows/ghidra-jdk.yml)

## 목표와 범위

사용자는 추억의 원본을 개인 스마트폰에서 터치로 즐기고 싶어 한다. 현재 우선순위는 포춘골프 하나의 호환성을 고치는 것이다. 크로스워드·크아BnB2007·간호사타이쿤의 별도 APK 구상은 후순위다. 초기에 만든 청춘 골프 웹 프로토타입은 원본 에뮬레이션과 별개다. Termux의 포켓리스 서버 6001과 웹게임 서버 8080을 구분해 사용한 이력이 있다.

원본은 240×320, 버전 01.00.02, AID 0102B4ED, PID PD003507로 기록되어 있다. ZIP 안 JAR에 441,968바이트 ARM/Thumb 네이티브 바이너리가 들어 있다. 단순 J2ME 클래스 변환만으로 해결되는 대상이 아니다.

## 오류와 패치의 진행 순서

1. 최초: `Unimplemented: 4: stub`.
2. Probe 1: 없는 DB 확인 처리 후, 레코드 DB 생성/open 미구현에 도달.
3. Probe 2: 고정 길이 레코드 DB 생성·열기·읽기·쓰기 구현.
4. Probe 3: listRecords 슬롯 7 및 select/update 성공 반환값 조정.
5. Probe 4: deleteDatabase 슬롯 2 구현.
6. Probe 4 첫 실행: 흰 화면 뒤 `Invalid memory access; address: 4`, `EventQueue.getNextEvent([I)V`.
7. 같은 앱 재실행: 타이틀 메뉴 표시. OK 입력으로 다음 화면 이동.
8. 현재: 배경은 표시되지만 글자·로고·메뉴에 줄무늬, 자홍색 블록, 겹침이 남음. 실제 라운드와 저장 완료는 검증하지 못함.

각 단계의 스크린샷은 사용자가 제공했다. 메뉴 진입은 성공했지만 완전한 게임 실행 성공을 뜻하지 않는다.

## 기반 및 빌드 근거

- WIE 기반: `dlunch/wie`의 `1ed8710956e727629e67db762ddc1e6bd6151a1f`.
- ABI 참고: `mirusu400/libwipi`의 `a6633ddb9f5a4510b237b7b8059ea0dafa1e4585`, `spec/wipi-1.2.1/api.csv`.
- Probe 4 빌드: Actions run `34112774992`, job `101712574914`, 기존 기록상 테스트 11개 통과.
- 설치 이름 `Fortune Golf Probe 4`, 패키지 `io.hanmiyoo.fortunegolf.probe4`, 버전 `0.1.4`.
- CI 임시 디버그 서명으로 업데이트 충돌이 생길 수 있어 당시 Probe마다 패키지를 구분했다.

MC_DB는 마스터 벡터 4, 스트림/파일 계층은 벡터 6이다. 같은 인터페이스로 간주하면 안 된다. 슬롯 8(sort), 9(getAccessMode), 12(listDBs)는 아직 미지원이다. 현재 레코드 구현의 mode 1, 짧은 쓰기 zero padding 등은 호환성 확인이 더 필요하다.

## 그래픽 조사 결과와 가설

이전 로컬 검사에서 .bmp 이름 파일 62개가 디코딩되었다. 실제 형식은 8bpp BMP 53개, 4bpp BMP 5개, PNG 4개였다. 43개 이미지에서 자홍색 픽셀이 확인되었다. 이 사실만으로 투명색 규칙을 확정하지 않는다.

WIE의 디코딩 경로가 32비트 ARGB 버퍼를 만드는 반면, 게임이 일부 경로에서 16비트 픽셀을 기대할 수 있다는 가설이 있다. 관련 소스는 graphics/image.rs, graphics/framebuffer.rs 및 wie-backend/src/canvas.rs다.

Ghidra에서 0x152c04 함수를 디컴파일했다. 16비트 포인터, 2×2 평균 연산, 마스크 0xf81f와 0x7c0이 확인된다. 여기서 0xf81f는 채널 평균용 마스크이며 투명색 비교의 증거가 아니다. 이 함수가 손상된 메뉴 렌더링 경로에서 실제 호출되는지는 아직 미확인이다.

첫 실행 오류도 별개로 남아 있다. EventQueue는 타이머 콜백도 실행하므로 스택 이름만 보고 큐 자체 문제로 단정하면 안 된다.

## Ghidra 재개 정보

- ghidra-cli 0.2.2, 소스 커밋 `10019ba1f3b54c9edcca8ec644a30e16fb7b7c79`.
- Ghidra 12.1.3, JDK 21.
- BinaryLoader, base 0x100000, ARM:LE:32:v5t, TMode=1.
- 진입점 0x100000 및 0x10131c를 명시해야 시작 함수가 분석된다.
- 로컬 CLI에서 0x10131c와 0x152c04 디컴파일 성공.
- inline Java bridge 실행은 지원되지 않았으므로 파일 기반 analyzeHeadless 스크립트를 사용했다.
- 대용량 전달은 잘린 파일이 생긴 이력이 있다. 64MiB 이하 청크, ZIP CRC와 합친 파일 SHA 검증으로 복구했다.
- 원본 포함 비공개 분석 백업 파일명: `fortune-ghidra-checkpoint.zip`. 이 공개 브랜치에는 원본 바이너리와 디컴파일 본문을 넣지 않았다.

## 다음 작업

1. 16비트 처리 함수와 실제 이미지 로딩/메뉴 그리기 사이 호출 관계를 추적한다.
2. stride, 픽셀 형식, 마스크/투명 처리 계약을 확인한 뒤 최소 호환 패치를 만든다.
3. 타이틀과 메뉴 화면을 비교하고, 첫 실행 오류와 실제 라운드·저장을 별도로 검증한다.
4. 검증된 변경을 이 브랜치에 계속 기록한다. 화면 깨짐 수정이나 새 APK가 완료된 것으로 표기하지 않는다.
