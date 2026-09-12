# Two-Phone Concurrent Remote Execution Checkpoint

Date: 2026-09-12
Status: **PASS — TWO PHYSICAL ANDROID DEVICES EXECUTED REMOTE GIT WORK CONCURRENTLY**

## Scope

This checkpoint records a bounded concurrency proof using the main Android phone and the server Android phone as separate Remote Desktop Commander execution surfaces for the same GitHub repository.

The stronger claim that two distinct ChatGPT login accounts independently initiated the two legs is **not re-proven by this single tool session**. Existing account architecture remains context; account identity requires account-specific evidence.

## Shared base and isolation

Both feature branches were created from the same observed `origin/main` base:

```text
9bcf36c95f11a72c0cef4eb53eaf6185890cb0e8
```

Main phone leg:

```text
branch: mainphone/two-phone-architecture-20260912
worktree: /data/data/com.termux/files/home/nyang-worktrees/two-phone-architecture-20260912
changed file: products/chatgpt-mobile-coder-lab/docs/architecture.md
```

Server phone leg:

```text
branch: server/two-phone-decision-20260912
worktree: /root/nyang-worktrees/two-phone-decision-20260912
changed file: products/chatgpt-mobile-coder-lab/docs/decisions.md
```

The main-phone pre-existing active repository remained on `chore/add-codex-cli` with its existing untracked `package-lock.json`. The server permanent repository remained on `server/work`.

## Failed timing attempts preserved as evidence

Two earlier attempts proved independent execution but did not overlap in time. They were not counted as concurrency PASS.

The successful attempt staged one bounded follow-up change on each device before entering a shared absolute-time barrier.

## Barrier proof

Before release, both remote processes were observed alive and blocked waiting for the same target epoch.

```text
main phone waiting: 2026-09-12T12:50:53Z
server phone waiting: 2026-09-12T12:51:40Z
shared release target: 2026-09-12T12:53:09Z
```

Observed execution:

```text
MAIN_RELEASE   2026-09-12T12:53:09Z
MAIN_DONE      2026-09-12T12:53:12Z
SERVER_RELEASE 2026-09-12T12:53:09Z
SERVER_DONE    2026-09-12T12:53:15Z
```

Therefore both physical devices were executing their independent commit/push path concurrently for at least the interval `12:53:09Z` through `12:53:12Z`.

Verified push heads after the concurrent leg:

```text
main phone: ca704dc75fcfdf849b6b0e92c6d9071caa652a01
server phone: 72cd39c0edf27fd789d5bc03ed987e696bac6c92
```

## GitHub PR proof

The two branches were published as separate pull requests:

```text
#2111 — docs: map two-phone remote execution surfaces
#2112 — docs: generalize remote bridge to both phones
```

Each PR changed exactly one file and the file sets did not overlap. Both initial PR heads passed `Plugin Control Plane — PR observe`, `Usage Dashboard Durable Release Reconciler`, and `SimCore CI`; unrelated release workflows skipped as expected.

PR #2111 merged first. That advanced `main`, so GitHub correctly blocked the stale #2112 merge with a required-status expectation. No bypass was used. The server feature branch merged latest `origin/main` normally, the final delta versus latest main remained exactly `docs/decisions.md`, CI reran successfully, and #2112 then merged.

Merge commits:

```text
#2111: 8ad0d20740fecc98dc2b7883e9781ddccb9295b9
#2112: 564b78c0b0fc4afc355e75223b54179027de486d
```

## Conclusion

The repository now has direct evidence that the main phone and server phone can act as separate authorized remote execution surfaces at the same time while preserving branch/worktree isolation, exact push SHA verification, PR separation, and repository protection gates.

This checkpoint intentionally stops short of claiming fresh proof of two distinct ChatGPT account identities. That is a separate authentication/session-level claim.
