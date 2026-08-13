# 냥냥냥 Update Channel

 플러그인 자동 업데이트용 공개 배포 저장소입니다.

이 저장소에는 **배포에 필요한 완성된 플러그인 JS만** 둡니다. 개발 소스, Termux/Bridge 도구, 개인 설정, API Key, 세션/쿠키, Bridge Token, 개인 조직·프로젝트 ID는 올리지 않습니다.

## 배포 구조

각 플러그인은 고정 경로를 사용합니다.

```text
plugins/
  devpass/
    latest.js
  simcore/
    latest.js
    install.js
  <other-plugin>/
    latest.js
```

 `//@update-url`은 각 플러그인의 `latest.js` raw HTTPS 주소를 가리킵니다. 버전이 올라가도 파일 경로는 바꾸지 않고, JS 내부의 `//@version`만 갱신합니다.

SimCore update URL:

```text
https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/simcore/latest.js
```

## 원칙

- Release artifact only
- Stable update URL
- No secrets or credentials
- 업데이트 전 syntax/버전 검증
- 문제가 생기면 이전 안정 버전으로 롤백 가능하게 관리

이 저장소는 개인용 플러그인 배포 채널입니다.
