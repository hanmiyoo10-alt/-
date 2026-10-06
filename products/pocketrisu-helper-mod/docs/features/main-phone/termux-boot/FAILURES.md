# Failure ledger — termux-boot

Feature-ID: `termux-boot`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-10-07 — POST_DEPLOY_VERIFY / M reboot does not preserve required PocketRisu transport stack

Observed:
- physical M reboot completed;
- Termux:Boot tracer ran after boot;
- legacy `20-pocketrisu-ssh-tunnel` recorded shared `runsvdir=ready` and tunnel ready;
- RDC guard/anchor started and survived;
- later PocketRisu/Tailscale supervision was missing while S PocketRisu server and sshd remained healthy;
- M localhost PocketRisu path was unavailable until existing fixed Tailscale and PocketRisu launchers were replayed.

Recovery:
- existing `32-mcl-m-tailscale-supervisor-guard` restored Tailscale;
- existing `21-pocketrisu-core-supervisor-guard` restored guard/anchor, tunnel run state, and localhost HTTP 200 / ready;
- no global service-tree restart, server restart, Android network reset, or broad watchdog was used.

Attribution:
- Termux:Boot non-execution is rejected;
- post-boot selective Termux child/supervision loss is proven;
- exact kill cause remains `UNKNOWN`;
- shape is consistent with #3231 phantom-process trimming but current-incident causal evidence is absent.

Repair owner:
- #3306 retires only legacy `20` from active Boot through a reversible exact-identity move;
- `21` remains the narrow PocketRisu tunnel supervisor bootstrap;
- no live retirement occurs before merge/postmerge convergence.

### 2026-10-07 — PR_REVIEW / #3308 inherited HOME can redirect production operation

Observed:
- first canonical #3306 candidate #3308 reached exact head `b96b68cd4b0b0ce785317e06217263b211e3a5b6`;
- Codex review identified a valid P2: production `HOME_DIR` inherited caller `$HOME`;
- an alternate wrapper/shell could therefore inspect or retire a mirrored tree while leaving the real Termux Boot entry active.

Disposition:
- #3308 was parked closed/unmerged with branch/head preserved;
- the first D-014 COMPLETE receipt remains transaction-convergence evidence only;
- IMPLEMENTATION_PR review acceptance remained incomplete.

Correction:
- production home is fixed to `/data/data/com.termux/files/home`;
- mismatched inherited HOME fails closed before path inspection;
- relocation exists only under explicit synthetic test mode;
- regression coverage proves a fake inherited HOME cannot redirect production operation.

Refs #3306 #3308 #3309.

### 2026-10-07 — IMPLEMENTATION_PR / r2 special Git mode blocked by L owner

Observed:
- r2 D-013/D-014 binding and create-only L workspace preparation passed on exact protected main;
- fresh source passed 17/17 focused contract checks, PocketRisu docs validation, and `git diff --check` before mutation;
- r2 patch staging created the two new shell paths as Git mode `100755`;
- reviewed L repository owner failed closed at `SPECIAL_MODE_DENIED` before commit, push, or PR;
- exact five-path staged residue digest is `f14514b9a0e4bf5341ea9d7f8bd621b8d073c17767c5931263fb68f45a46c63d` and remains preserved in the r2 worktree.

Disposition:
- r2 D-013 lease released at generation 842;
- r2 holder stale-cleaned after lease release;
- D-014 BLOCKED receipt `d317c37b2c0d53381c20230a631e14a84e8865435f5028ae903d98dd05394288`;
- do not reset, chmod, clean, or reuse the r2 workspace.

r3 correction:
- fresh isolated r3 branch/worktree/lease/manifest;
- new shell files tracked as ordinary `100644`;
- scripts invoked explicitly through `sh`, so repository executable mode is unnecessary;
- all production-home pinning and narrow-effect boundaries are preserved.
