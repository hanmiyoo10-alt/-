# MCL L interrupted recovery rebind

Coordination-only recovery for an L IMPLEMENTATION_PR classified
`ABANDONED_LEASE_RELEASE`.

Flow: classify -> D-013 release -> fresh-ledger holder cleanup -> reacquire ->
generation-bound D-014/HANDOFF_READY -> dirty-preservation proof -> holder absent.

Fixed WSL `flock`+`cat` provides process-death-released serialization. Activation
discovery is current-lineage only; cleanup/publication re-read fresh coordination.
No source/index/ref/PR mutation or holder claim belongs here.
