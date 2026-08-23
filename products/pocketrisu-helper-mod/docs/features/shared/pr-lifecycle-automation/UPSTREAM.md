# Upstream PR dossier — pr-lifecycle-automation

Feature-ID: `pr-lifecycle-automation`
Area: `shared`
PR status: `MERGED_LOCAL`
Isolation status: `CLEAN`
Deployment status: `NOT_APPLICABLE`

## Problem / motivation
과거 여러 개조가 한 branch/history에 섞여 정식 upstream PR로 기능 하나만 떼어내는 비용이 너무 커졌던 문제를 재발 방지한다.

## Minimal upstream scope
이 기능은 개인 포크/보조 레포의 개발 거버넌스다. upstream에 그대로 제출할 기능은 아니며, 필요하면 PR template/check 아이디어만 별도 제안한다.

## Dependencies
- helper repo feature dossiers
- GitHub PR/check metadata
- `safe-updater` for real device deployment

## Verification evidence
- helper repo lifecycle rollout: PR #161 squash-merged
- PocketRisu source fork Feature-ID guard: PR #3 squash-merged
- source PR #3 changed files: PR template + feature guard workflow only
- first real failure captured in `FAILURES.md`: concurrent direct-main update rejection → branch/PR strategy
- scheduled lifecycle watcher: activation is the next step

## Upstream pitch
현재는 upstream 코드 PR 대상이 아니라 **upstream PR을 깨끗하게 만들기 위한 로컬 개발 인프라**다.

## Review / PR state
- helper PR: https://github.com/hanmiyoo10-alt/-/pull/161 — MERGED
- source guard PR: https://github.com/hanmiyoo10-alt/PocketRisu/pull/3 — MERGED
- next action: activate PR lifecycle watcher and use it on the next feature PR.
