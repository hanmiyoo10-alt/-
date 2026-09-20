# Probe 6: 시작 오류 진단

사용자가 1000014768.mp4가 Probe 5 실행 영상임을 확인했다. 주소 4와 0 오류는 시작 단계에서 남아 있다.

고정 WIE 소스의 KtfWIPICContext::call_function과 MC_knlSetTimer 콜백에 오류 문맥을 추가했다. 오류창에 native target/args와 timer/callback/param을 16진수로 표시한다. 원래 오류 문자열도 유지하되 오류 변형은 FatalError로 감싼다. 성공한 호출의 인자와 반환값, 타이머 예약 동작은 바꾸지 않는다. 오류를 무시하거나 잘못된 콜백을 성공으로 처리하지 않는다.

MC_knlUnsetTimer는 기반 코드에서 stub이다. 게임이 이를 호출했는지, 이번 오류와 연결되는지는 미확인이다. 이 진단판에서는 취소 의미를 추측하여 바꾸지 않았다.

Probe 5의 BMP RGB565 패치와 DB 구현을 유지한다. 제품명 Fortune Golf Probe 6, 패키지 io.hanmiyoo.fortunegolf.probe6, 버전 0.1.6.

검증: 고정 소스에서 치환 대상이 각각 한 번 존재함을 assert하고, 로컬 임시 소스 트리에서 apply.py가 성공하는 것을 확인했다. 이 확인은 Rust 컴파일 또는 실제 게임 실행 검증이 아니다. Rust 테스트/Clippy와 APK 생성은 기존 Actions 게이트에서 수행한다.

실기기에서 timer 문맥이 있으면 해당 콜백 주소를 기존 Ghidra 분석과 대조한다. native 문맥만 있으면 타이머 이외의 호출 경로를 조사한다. 원인 수정판이 아니라 진단판이다.
