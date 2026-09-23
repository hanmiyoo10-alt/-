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
Ubuntu private repository-support root: /root/.local/lib/mcl-detached-owner-runtime/repository
Ubuntu client: /root/.local/bin/mcl-detached-owner-runtime
Private Unix socket: /root/.local/run/mcl-detached-owner-runtime/control.sock

No TCP or HTTP listener exists.

## Installed private support bundle

The first #2812 live activation exposed #2819: installing only the two runtime JavaScript files broke their reviewed repository-relative dependency resolution.

The repaired installer preserves the runtime source semantics instead of teaching the runtime an ambient or caller-selected repository path. It derives the source repository root only from the reviewed installer location and copies one fixed allowlist of twenty repository support files plus the runtime client and service into the private repository-support root above. The runtime and service keep their original repository-relative locations inside that private tree.

The installed layout never uses ambient /root/nyang-repo, NODE_PATH, a symlink search path, a recursive repository copy, or a caller-selected source/support root. Installed bundle entries are restrictive regular non-symlink files. The launcher and runit service point only to the fixed private entrypoints.

install-s-termux.sh --check verifies the complete installed bundle identity. --apply replaces only the fixed managed bundle/wrappers and leaves the service disabled. --activate first requires the installed bundle to match the reviewed source bytes, then enables exactly the fixed runit service.

The install contract runs both installed runtime and service modules from the private test layout as an import smoke proof without starting a socket or service. This specifically guards the #2819 failure mode.

The failed first live installation remains a preserved natural fixture. Repaired live activation belongs to #2821 postmerge → #2812 EXPERIMENT_CLOSE and must not be attempted from an unmerged repair candidate.

V1 proves only control-connection independence. It does not prove survival of Termux process loss, Android force-stop, reboot, host loss, supervisor hard loss or arbitrary process killing.

Refs #2759 #2745 #2746 #2750 #2577 #2775 #2698 #2706 #2812 #2819 #2820 #2821.
