# Failure ledger — main-ssh-tunnel

Feature-ID: `main-ssh-tunnel`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-09-12 — POST_DEPLOY_VERIFY / runtime supervision gap

Observed:
- main-phone localhost PocketRisu path became unreachable;
- core SSH forward process was absent;
- `sv status` reported `runsv not running` for `pocketrisu-ssh-tunnel`;
- central Termux `runsvdir` / `service-daemon` process was absent while some already-running `runsv` children survived;
- server-phone PocketRisu and sshd remained healthy;
- main-phone TCP reachability to the server SSH port remained available.

Interpretation:
- failure is isolated to main-phone service supervision, not server code or basic network reachability;
- exact cause of central `runsvdir` death is `UNKNOWN`;
- Android phantom-process behavior is only a hypothesis and is not recorded as causal proof.

Recovery evidence:
- starting only the core service's `runsv` restored the SSH forward and localhost `/api/health`;
- repeated stability check remained healthy;
- broad server/service restarts were not required.

Follow-up:
- issue #2048 tracks incident evidence;
- isolated hardening PR adds a core-only supervisor guard and preserves explicit operator `down`.

### 2026-09-12 — CI / product validator baseline blocker

Observed:
- PR #2060 was updated to current `main`; exact diff remains only six `main-ssh-tunnel` files;
- branch protection `Required` check passes;
- `PocketRisu helper docs` workflow fails;
- failure set matches current-main baseline errors in unrelated Feature-IDs.

Disposition:
- do not weaken or bypass `validate_docs.py`;
- do not mix unrelated feature-document repairs into PR #2060;
- baseline validator debt is tracked separately in issue #2064;
- merge remains blocked by product-policy GREEN despite branch-protection Required being green.
