# MCL L interrupted-recovery rebind invoker

This directory is the fixed L invocation surface for the already-reviewed
interrupted-recovery rebind owner.

It does not own the recovery algorithm. The transaction remains owned by:

`products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery-rebind/**`.

## Public invocation

The public CLI accepts **no arguments**:

```text
node products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery-rebind-invoke/mcl-l-interrupted-recovery-rebind-invoke.cjs
```

Any caller argument fails closed.

The invoker requires #3561 to be native OPEN, lifecycle `IN_PROGRESS`, and
interaction stage `EXPERIMENT_CLOSE`. It then delegates in-process to the
existing owner with one repository-source-fixed semantic request only:

```text
operation = apply
target = #3473
explicit apply confirmation = present
```

The caller cannot select a packet, target, repository, route, executor, branch,
worktree, lease, manifest, holder, process, session, command, shell, timeout,
retry, signal, Git primitive, workflow or fallback.

## Ownership boundary

The invoker does not reconstruct D-013 release/reacquire, holder cleanup,
recovery D-014 publication, dirty-byte preservation, session admission,
classification, replay/lost-ack handling, Git state or PR state.

All of those remain inside the existing recovery owner.

The invoker adds no child-process launcher, shell, eval, environment forwarding,
dynamic owner path or alternate transport.

## Public receipt

The receipt is intentionally smaller than the underlying owner result. It may
contain only the fixed target, bounded recovery state/generations/rebind
manifest/holder state, next legal action, withheld details and false authority
flags.

Raw holder claims, holder digests, arbitrary argv, environment, stdout/stderr,
process/session identity, credentials and tokens are never projected.

## Validation

```text
node --test products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery-rebind-invoke/tests/test-mcl-l-interrupted-recovery-rebind-invoke.cjs
node --test products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery-rebind/tests/test-mcl-l-interrupted-recovery-rebind.cjs
```
