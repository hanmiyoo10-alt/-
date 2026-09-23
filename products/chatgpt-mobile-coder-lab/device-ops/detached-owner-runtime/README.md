# MCL detached fixed-owner runtime v1

Phase 8.6.6 S-only continuity runtime for #2812.

## Boundary

The runtime preserves the lifetime of one already-authorized fixed repository implementation owner after the invoking Chat/RDC control connection disappears. It does not create effect authority.

Public operations are exactly start-fixed and inspect. V1 has no cancel, kill, retry, takeover, cleanup, arbitrary command, arbitrary executable, arbitrary repository/worktree, log streaming, retention, merge, release, production or recovery surface.

Exactly one stage owner is supported: MCL_KNOWN_OWNER_REPOSITORY_IMPLEMENTATION_V1. Exactly two reviewed validation profiles remain supported: mcl:d014-completion-set:v1 and repo:validation-continuation:v1.

## Identity and storage

Run identity is delegated to the merged #2746 continuity owner. It binds packet, phase, the lowercase continuity owner identity, semantic request digest and the exact relevant fixed-owner implementation identity. Lease id, manifest id, holder identity, PID/session identity, Chat/RDC identity, time, current-main SHA and physical worktree identity are excluded.

Continuity state lives only under the target worktree Git administrative directory at execution-continuity/<runId>. Immutable semantic activation bytes live under activation/. Current D-013/D-014 guard bytes live under attempts/1/ so a separately authorized future rebind can retain the same semantic run identity. State uses generation plus previous-record-digest CAS. Effects use the deterministic #2746 effect key.

## Checkpoints

The runtime reuses the existing checkpoint vocabulary: WORKSPACE_READY, SOURCE_MUTATION_COMPLETE, VALIDATION_PASS, COMMIT_CREATED, PUSH_COMPLETE, REMOTE_HEAD_VERIFIED, PR_CREATED, COORDINATION_RELEASED and FINISHED.

The fixed owner emits these only through an internal typed IPC sink and waits for the runtime persistence acknowledgement before the next effect boundary. Stdout and stderr are never parsed to infer checkpoints.

Inspect delegates resume disposition to the pure #2746 classifier. A supervisor-owned live child may project OWNER_STILL_RUNNING. Exact FINISHED plus final receipt may project ALREADY_FINISHED. Known child death with ambiguous effect truth routes to NEEDS_RECOVERY_INSPECT. Supervisor restart without exact child ownership preserves liveness UNKNOWN.

## S placement

Termux runit service: /data/data/com.termux/files/usr/var/service/mcl-detached-owner-runtime
Ubuntu runtime: /root/.local/lib/mcl-detached-owner-runtime
Ubuntu client: /root/.local/bin/mcl-detached-owner-runtime
Private Unix socket: /root/.local/run/mcl-detached-owner-runtime/control.sock

No TCP or HTTP listener exists.

install-s-termux.sh --check is read-only. --apply installs a disabled service. --activate enables it. #2812 IMPLEMENTATION_PR must not apply or activate the real S service. The first real install and disconnect proof belong to postmerge EXPERIMENT_CLOSE under fresh device authority.

V1 proves only control-connection independence. It does not prove survival of Termux process loss, Android force-stop, reboot, host loss, supervisor hard loss or arbitrary process killing.

Refs #2759 #2745 #2746 #2750 #2577 #2775 #2698 #2706 #2812.
