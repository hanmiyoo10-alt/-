# Failure ledger — termux-boot

Feature-ID: `termux-boot`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-10-07 — POST_DEPLOY_VERIFY / M reboot does not preserve required PocketRisu transport stack

Observed:
- physical M reboot completed;
- Termux:Boot tracer ran after boot;
- legacy `20-pocketrisu-ssh-tunnel` recorded `runsvdir=ready` and tunnel ready;
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
- `21` remains the canonical narrow PocketRisu tunnel supervisor bootstrap;
- no live retirement occurs before merge/postmerge convergence.
