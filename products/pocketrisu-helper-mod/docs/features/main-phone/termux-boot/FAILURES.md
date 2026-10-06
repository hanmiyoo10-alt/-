# Failure ledger - termux-boot

Feature-ID: `termux-boot`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-10-07 - POST_DEPLOY_VERIFY / M reboot did not preserve PocketRisu transport stack

Observed:

- physical M reboot completed;
- server-phone PocketRisu remained HTTP 200 / ready and server sshd remained running;
- M RDC returned;
- M PocketRisu localhost path remained unavailable;
- M Tailscale target supervision/daemon and PocketRisu tunnel supervision were absent when inspected;
- replaying only the existing fixed Tailscale and PocketRisu launchers restored Tailscale online, tunnel run, guard/anchor identities, and M localhost HTTP 200 / ready.

Further attribution:

- Termux:Boot tracer proves the boot framework ran.
- legacy `20-pocketrisu-ssh-tunnel` boot ledger proves it recreated the shared Termux service supervisor and reported tunnel ready during this reboot.
- PocketRisu guard started at the same boot epoch and later disappeared.
- RDC guard/anchor started shortly after boot and survived.
- current evidence therefore rejects "Termux:Boot never ran".
- the exact initiating process-kill cause remains `UNKNOWN`.
- the shape is consistent with #3231 phantom-process trimming, but no current-incident ActivityManager kill evidence exists.

Repair decision:

- do not add another watchdog.
- retire only the device-only legacy `20` Boot entry.
- preserve the already-reviewed dedicated `21` PocketRisu guard/anchor.
- preserve M RDC/Tailscale owners.
- do not alter Android phantom policy.

Status: `FAILURE -> RECOVERED / REPAIR CANDIDATE #3306`

### IMPLEMENTATION_PR gate

No live M retirement is allowed before merge/postmerge. Candidate failure or review feedback must be appended here rather than erased.
