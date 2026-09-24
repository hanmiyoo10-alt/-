# MCL published-progress recovery inspector

This directory adapts current Mobile Coder Lab evidence into the pure published-progress recovery classifier.

The public operation is fixed to one packet number:

node mcl-published-progress-recovery-inspect.cjs inspect --packet #N --format agent-view

The caller cannot select a repository, host, worktree, branch, PR, process, session state, executable, or command.

The adapter reads the current packet, D-013 ledger, D-014 manifest, workspace-holder identity, the reviewed RDC session-evidence owner, clean Git state, exact local/remote/open-PR head identity, exact PR changed files, descendant proof from the lease base, and the existing read-only D-013 release planner.

Only PASS/ABSENT from the reviewed session owner becomes normalized ABSENT. PRESENT never becomes takeover authority.

The adapter is read-only. It has no lease release/reacquire, holder claim/takeover, Git write, PR write, merge, device, release, or production effect.
