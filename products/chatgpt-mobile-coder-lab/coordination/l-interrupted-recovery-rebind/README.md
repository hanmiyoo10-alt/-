# MCL L interrupted recovery rebind

Coordination-only recovery after `ABANDONED_LEASE_RELEASE`.

Flow: classify -> release -> fresh holder cleanup -> reacquire -> generation-bound
D-014/HANDOFF_READY -> preservation proof -> holder absent.

WSL `flock`+`cat` is process-death released. Discovery is current-lineage only.
Cleanup/publication re-read coordination; publication uses journaled admission main.
No source/index/ref/PR mutation or holder claim.

The fixed L session-evidence admission runs the exact repository-owned
`mcl-l-rdc-session-evidence.v2` source with the same WSL Node runtime that is
executing this recovery owner (`process.execPath`) and the fixed public
`inspect` operation. It does not translate the source path to Windows or launch
Windows Node. The session owner may exit 0 for PASS or 3 for bounded semantic
UNKNOWN; both receipts are passed to the existing #3491 composition, which keeps
UNKNOWN fail-closed. Any other exit or invalid JSON is an execution failure.
No caller runtime, path, process, session, or command selector is exposed.
