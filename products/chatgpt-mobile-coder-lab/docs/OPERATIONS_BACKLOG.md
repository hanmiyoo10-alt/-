# Operations Backlog — ChatGPT Mobile Coder Lab

Date opened: 2026-09-12
Status: **OPTIONAL HARDENING / NOT CORE BLOCKERS**

## Purpose

The Mobile Coder Lab core goal is complete. This file keeps remaining operational improvements separate so an unfinished hardening item cannot silently downgrade the proven core remote-coding result.

## Preserved completed baseline

- Server phone Remote Desktop Commander read/search/write/test/Git/PR loop: PASS.
- Server phone isolated runit service restart and persisted-session recovery: PASS.
- Real Android reboot → Termux:Boot → runit → Remote Desktop Commander → ChatGPT tool delivery: PASS.
- Main phone isolated-worktree remote read/write execution: PASS.
- Main phone and server phone simultaneous independent Git commit/push execution: PASS.
- Repository-wide common rule prefers authorized remote execution when it is the appropriate safe surface.

## Backlog

### B1 — Main-phone persistence symmetry and long-duration channel soak

Verify main-phone bridge behavior across reboot/reconnect if that device is expected to provide unattended availability, and run longer-lived channel observations on both phones when useful. Server-phone reboot persistence is already proven and must not be reopened without contrary evidence.

### B2 — Narrower remote filesystem authority

Evaluate whether the server-phone execution surface can be constrained from broad `/root` reach toward coding repository/worktree paths without breaking required Git/test workflows. Treat this as least-privilege hardening, not as a prerequisite for the already-proven coding loop.

### B3 — Repeated repository-owned rule/test discovery coverage

During future real feature work, keep verifying that each worker discovers repository common rules, product-specific authority, and applicable tests before mutation. Add automation only if repeated evidence shows it materially improves reliability.

### B4 — Optional account-session identity checkpoint

The operating environment uses different ChatGPT accounts on the two phones. If a stronger evidence claim is ever required, capture account/session-specific proof separately without storing private account identifiers, tokens, session IDs, or authentication material in Git.

### B5 — Smoke asset cleanup policy

Decide which historical smoke PRs, remote branches, and disposable worktrees should remain as durable evidence and which may be closed or deleted. Cleanup must preserve referenced checkpoint evidence and must not touch unrelated active worktrees.

## Completion semantics

No item in this file blocks the Mobile Coder Lab core completion state. Each item becomes required only when separately promoted by current authority or an explicit new goal.
