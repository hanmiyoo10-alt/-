# Tracked Patch Smoke Checkpoint — 2026-09-09

## Scope

Android ChatGPT + Remote Desktop Commander + server-phone Ubuntu PRoot 환경에서 existing tracked file을 실제 수정하고 Git diff/검증/원상복구까지 수행하는 최소 patch-level coding loop를 검증했다.

영구 작업 branch인 `server/work`는 직접 수정하지 않았다.

대상 disposable worktree:

```text
/root/nyang-worktrees/remote-write-smoke
```

대상 tracked file:

```text
README.md
```

## Initial state

```text
git status --short
→ no output
```

원본 SHA-256:

```text
37e90fae2932a1bc3d7bf6b732d02231c071d1659450ddca12eb3210f2a67514
```

## Mutation

README 끝에 정확히 다음 한 줄만 추가했다.

```text
remote desktop commander tracked patch smoke test
```

## Diff validation

```text
git diff --check
→ no output

git status --short
→ M README.md
```

`git diff -- README.md`는 README 마지막에 위 한 줄만 추가된 것을 보여줬다.

## Restoration

다음 형태로 tracked file을 HEAD 기준으로 복구했다.

```text
git restore --source=HEAD -- README.md
```

복구 후 SHA-256:

```text
37e90fae2932a1bc3d7bf6b732d02231c071d1659450ddca12eb3210f2a67514
```

원본과 복구 후 SHA-256이 동일했다.

최종 상태:

```text
git status --short
→ no output

git diff --check
→ no output
```

## Result

**PASS**

검증된 경로:

```text
Android ChatGPT
→ Remote Desktop Commander
→ remote service
→ server-phone Ubuntu PRoot
→ isolated Git worktree
→ tracked file edit
→ Git diff inspection
→ diff --check
→ exact restoration
→ clean working tree
```

이 결과로 일반 ChatGPT 모바일 채팅이 단순 read/write 수준을 넘어 기존 tracked file의 bounded patch를 수행하고, 변경 범위를 검토하고, 원본과 byte-equivalent 상태로 되돌리는 개발 루프가 성립함을 확인했다.

## Safety notes

- `server/work`는 직접 수정하지 않았다.
- git add/commit/push/merge/rebase/reset은 수행하지 않았다.
- device code, device ID, 계정 주소, token, session id는 기록하지 않았다.
- Desktop Commander의 기본 cwd는 repository root가 아니므로 이후에도 absolute path를 사용한다.

## Next gate

다음 검증은 최신 `origin/main`에서 named feature branch + dedicated worktree를 만들고, repository guideline/authority를 먼저 읽은 뒤 작은 실제 변경을 수행해 targeted validation과 local commit까지 확인하는 것이다.

push와 PR은 commit 검증 뒤 별도 단계로 유지한다.
