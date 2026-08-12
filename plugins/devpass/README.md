# DevPass update channel

이 폴더는 DevPass 플러그인의 RisuAI 자동 업데이트용 고정 경로입니다.

최종 배포 파일은 `latest.js` 하나를 사용합니다.

고정 업데이트 URL:

```text
https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/devpass/latest.js
```

배포 원칙:

- 기존 안정 동작을 유지한 릴리스만 `latest.js`로 승격
- `//@version` 증가 후 배포
- API Key, 세션/쿠키, Bridge Token, 개인 조직·프로젝트 ID 등 비밀값 금지
- localhost HTTP `//@update-url` 사용 금지
- 업데이트 URL은 위 GitHub HTTPS 주소로 고정
