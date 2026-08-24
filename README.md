# 냥냥냥 Update Channel

플러그인 자동 업데이트와 개발·검증·릴리즈 운영을 함께 관리하는 저장소입니다.

## Plugin operational hub

이 저장소는 **하나의 canonical `main`**을 유지하면서 Plugin Control Plane이 각 프로젝트를 별도 운영 뷰로 분류합니다. 중앙 뷰는 버전이나 배포 상태를 복제하지 않고 각 프로젝트의 기존 authority를 읽습니다.

| Project | Source scope | Production / status authority | Operational view |
| --- | --- | --- | --- |
| Local Usage Dashboard | `plugins/usage-dashboard/` | `release-usage-dashboard` + `.github/usage-dashboard/releases/` | `plugin:usage-dashboard` |
| SimCore | `plugins/simcore/` | `product-manifest.json` + `release-simcore` | `plugin:simcore` |
| DevPass | `plugins/devpass/` | declared `plugins/devpass/latest.js` update channel; missing authority remains `UNKNOWN` | `plugin:devpass` |
| Termux Large Doc Editor | `plugins/termux/large-doc-editor/` | prototype evidence only; no production authority | `plugin:termux-large-doc-editor` |

`plugins/_template/`은 template scope, `plugins/test-a/`와 `plugins/test-b/`는 test-fixture scope로 분류하며 운영 플러그인으로 취급하지 않습니다.

PR은 changed path로 자동 분류하고, 이슈는 명시적인 Plugin 필드만 사용합니다. 애매한 상태는 추측하지 않고 `scope:unclassified`로 남깁니다. 실시간 상태는 `main`에 계속 커밋하지 않고 plugin별 mutable status issue에서 갱신합니다.

설계: `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_DESIGN.md`

## 배포 구조

각 RisuAI 업데이트 채널은 고정 경로를 사용합니다. 실제 production authority는 프로젝트별 계약을 따르며, 단순히 `main`에 파일이 있다고 해서 모든 프로젝트가 같은 배포 방식을 사용하는 것은 아닙니다.

```text
plugins/
  devpass/
  simcore/
    latest.js
    install.js
  usage-dashboard/
    latest.js
  termux/
    large-doc-editor/
```

`//@update-url`을 사용하는 플러그인은 각 프로젝트의 고정 raw HTTPS 경로를 유지합니다. 버전 값과 production 상태는 각 프로젝트의 실제 release authority에서만 판단합니다.

## 공통 원칙

- One integration truth, multiple operational views
- Stable update paths where applicable
- No secrets or credentials
- 업데이트 전 프로젝트별 syntax / contract / regression 검증
- UNKNOWN 또는 미확인 상태를 임의의 값으로 만들지 않음
- 문제 발생 시 프로젝트별 기존 안정 release authority를 기준으로 복구

이 저장소는 개인용 플러그인·도구 개발 및 배포 채널입니다.
