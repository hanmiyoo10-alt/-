# MCL L interrupted recovery composition v1

mcl-l-interrupted-recovery is a read-only composition owner for the L
interrupted-implementation recovery path.

It validates one bounded mcl-l-rdc-session-evidence.v1 receipt, maps that
receipt into the existing generic EFFECT_RECOVERY_EVIDENCE vocabulary, and
delegates the final disposition to the existing pure canonical-main
effect-recovery.v1 classifier.

It does not collect Windows process data itself and does not perform recovery
effects.

## Public surface

The owner accepts one bounded JSON document on stdin:

~~~sh
node products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery/mcl-l-interrupted-recovery.cjs < request.json
~~~

No CLI packet, PID, session, process, path, repository, lease, holder, Git,
timeout, age, timestamp, retry, or takeover selector exists.

## Input

The JSON document contains exactly:

- schemaVersion=1;
- mode=MCL_L_INTERRUPTED_RECOVERY_COMPOSITION;
- recoveryFacts: generic recovery evidence without sessionState and without a
  locators.session field;
- sessionEvidence: one bounded L Windows session-evidence receipt;
- sessionEvidenceLocator: the bounded locator for that receipt;
- sourceRefs: 1..16 bounded provenance refs.

The L session receipt must use:

~~~text
schema=mcl-l-rdc-session-evidence.v1
executor=L
owner=mcl-l-rdc-session-evidence
details=withheld
authority=<all five false>
~~~

Only these semantic forms are admitted:

~~~text
PASS / ABSENT  / SOLE_RDC_COMMAND_SESSION
PASS / PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT
UNKNOWN / UNKNOWN / <bounded uppercase reason>
~~~

Anything else fails closed.

## Mapping

The composition intentionally has no generic LIVE mapping:

~~~text
L PASS / ABSENT  -> generic sessionState=ABSENT
L PASS / PRESENT -> generic sessionState=UNKNOWN
L UNKNOWN        -> generic sessionState=UNKNOWN
~~~

Therefore another observed RDC command session can never become current-operation
ownership or same-session resume authority through this owner.

An exact ABSENT result is also not abandonment by itself. The existing generic
classifier still requires current packet, D-013, D-014, holder, workspace,
dirty-scope, Git, remote branch, PR and release-eligibility evidence.

Only the existing generic core can classify SAME_SESSION_RESUME,
ABANDONED_LEASE_RELEASE, CLEAN_ABORT, NEEDS_REVIEW, BLOCKED, UNKNOWN or CONFLICT.

## Authority boundary

Even a generic ABANDONED_LEASE_RELEASE result is classification only.

This owner never releases or reacquires D-013, cleans or recreates a holder,
edits or pushes source, creates or updates a PR, runs Git, controls a process or
RDC session, or changes network, device, runtime, security, release or production
state.

The output grants no repository, device, execution, merge, release, production,
runtime or security authority.

Any later effect must use the existing effect owner with fresh exact identity.

## Relationship to #3473

For the current interrupted #3473 transaction:

- PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT maps to generic UNKNOWN and
  preserves the holder/session authority blocker;
- only a fresh exact ABSENT receipt can unlock the generic core abandonment
  branch, and only when every other required recovery fact is exact.

This packet therefore adds evidence composition, not takeover authority.

## Validation

~~~sh
node --check products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery/mcl-l-interrupted-recovery.cjs
node --test products/chatgpt-mobile-coder-lab/coordination/l-interrupted-recovery/tests/test-mcl-l-interrupted-recovery.cjs
node --test products/chatgpt-mobile-coder-lab/device-ops/l-rdc-session-evidence/tests/test-mcl-l-rdc-session-evidence.cjs
node --test .github/plugin-control-plane/canonical-main/work-harness/effect-recovery/tests/effect-recovery-contract.cjs
git diff --check
~~~

Refs #3481 #3486 #3473 #2792.
