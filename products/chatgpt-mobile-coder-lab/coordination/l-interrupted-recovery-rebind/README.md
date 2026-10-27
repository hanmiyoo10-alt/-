# MCL L interrupted recovery rebind

Coordination-only recovery after `ABANDONED_LEASE_RELEASE`.

Flow: classify -> release -> fresh holder cleanup -> reacquire -> generation-bound
D-014/HANDOFF_READY -> preservation proof -> holder absent.

WSL `flock`+`cat` is process-death released. Discovery is current-lineage only.
Cleanup/publication re-read coordination; publication uses journaled admission main.
No source/index/ref/PR mutation or holder claim.
