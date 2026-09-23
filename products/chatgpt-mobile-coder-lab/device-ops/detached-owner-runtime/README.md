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

The fixed owner emits these only through an internal typed IPC sink and waits for runtime persistence acknowledgement before the next effect boundary. Stdout and stderr are never parsed to infer checkpoints.

Inspect delegates resume disposition to the pure #2746 classifier. A supervisor-owned live child may project OWNER_STILL_RUNNING. Exact FINISHED plus final receipt may project ALREADY_FINISHED. Known child death with ambiguous effect truth routes to NEEDS_RECOVERY_INSPECT. Supervisor restart without exact child ownership preserves liveness UNKNOWN.

## Split S control topology

The first two live #2812 activations proved two different PRoot-specific failure modes:

1. #2819: a standalone installed runtime lost its repository-relative support tree;
2. #2823: a stable PRoot-owned service could hold a socket FD without publishing a pathname Unix socket reachable by a separate client.

The selected V1 repair therefore never uses a pathname Unix socket across the PRoot boundary.

```text
S-Termux public client
  -> fixed Termux-host pathname UDS
  -> direct Termux-host transport front
  -> fixed persistent PRoot stdin/stdout semantic worker
  -> existing RuntimeSupervisor
  -> existing fixed repository implementation owner
```

Termux host owns only local transport and the exact PRoot worker process lifetime. PRoot retains semantic input parsing, activation/runId derivation, worktree and Git-admin access, immutable activation materialization, RuntimeSupervisor state, fixed owner child identity and all checkpoint/effect/final-receipt semantics.

## Fixed placement

- public client: /data/data/com.termux/files/home/.local/bin/mcl-detached-owner-runtime
- host private library: /data/data/com.termux/files/home/.local/lib/mcl-detached-owner-runtime
- host control directory: /data/data/com.termux/files/home/.local/run/mcl-detached-owner-runtime
- host control socket: /data/data/com.termux/files/home/.local/run/mcl-detached-owner-runtime/control.sock
- Termux runit service: /data/data/com.termux/files/usr/var/service/mcl-detached-owner-runtime
- PRoot private repository-support root: /root/.local/lib/mcl-detached-owner-runtime/repository

The host control directory is owner-only and the socket is mode 0600. No TCP, HTTP or abstract socket listener exists.

## Public client and internal modes

Inspect constructs only the existing bounded packet+runId request on the Termux host and sends it to the fixed host socket.

Start-fixed does not read semantic source files or materialize continuity state on the Termux host. The host client launches one fixed short-lived PRoot prepare helper using the existing runtime source and the same public start-fixed arguments. That helper validates the existing manifest/handoff/request/patch/validation/PR contracts, derives the exact worktree and Git-admin identity, materializes the existing immutable activation bundle, and returns only the semantic start request.

The host socket payload therefore contains no caller file paths, tokens, raw environment, holder claim, repository path or worktree path.

The prepare-only mode and persistent stdio-worker mode are internal environment-owned entrypoints. They are not public commands and do not widen the public start-fixed|inspect CLI.

## Persistent PRoot worker

The Termux host front launches exactly one fixed proot-distro Ubuntu worker and keeps it across sequential public client connections. The worker owns one RuntimeSupervisor instance and receives one bounded JSON request line per operation over stdin, returning one bounded JSON response line over stdout.

The host front uses a half-close-safe Unix server so a client may finish its request side before the asynchronous worker response arrives.

Worker loss never becomes semantic retry. The host front does not respawn a failed worker inside the same process, and a future runit restart cannot infer OWNER_STILL_RUNNING for a prior nonterminal semantic run without the existing exact evidence.

## Installed private support bundle

The installer derives the source repository root only from its reviewed repository-relative location. It copies one fixed allowlist of twenty support files plus the runtime client/service into the private PRoot repository-support root, preserving original repository-relative paths.

Separately it installs the self-contained Termux host front and the fixed public host client wrapper. The runit service directly supervises the Termux host front; only that front owns the PRoot worker.

The installed layout never uses ambient /root/nyang-repo, NODE_PATH, a symlink search path, a recursive repository copy or a caller-selected source/support root. Installed bundle entries are restrictive regular non-symlink files.

install-s-termux.sh --check validates both the host and PRoot halves. --apply replaces only the fixed managed bundle/wrappers and leaves the service disabled. --activate first requires the complete installed split identity, then enables exactly the fixed runit service.

The install contract imports the installed runtime, service and host modules without starting a socket/service. Runtime contract tests cover the host half-close path, fixed persistent worker reuse, prepare-only semantic request projection and worker-loss fail-closed behavior.

## Failure-domain claim ceiling

V1 proves only control-connection independence after the split transport is live-proven. It does not prove survival of Termux process loss, Android force-stop, reboot, host loss, supervisor hard loss or arbitrary process killing.

Refs #2759 #2745 #2746 #2750 #2577 #2775 #2698 #2706 #2812 #2819 #2820 #2821 #2823 #2825 #2833 #2835 #2836.
