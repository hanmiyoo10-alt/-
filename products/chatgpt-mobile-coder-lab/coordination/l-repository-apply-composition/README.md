# MCL L prepared apply composition v1

Completes one PREPARED `L / L` repository transaction by composing existing holder, L repository-owner, D-013 and D-014 owners. Adds no new Git/PR/lease/holder/merge/runtime/release/production primitive.

Public operations:
`apply --packet '#N' --manifest <m> --request <r> --patch <p> --pr-request <pr> --apply`
`finalize --packet '#N' --manifest <m> --apply`

Apply requires current exact packet/manifest/lease binding, PREPARED workspace, holder absence, bounded request/patch/PR preflight, fresh binding before holder acquisition and again before source effect. Source mutation stays inside the L owner.

After source PASS: persist activation, recheck holder, release D-013, prove readback generation, persist release evidence, release holder, then publish D-014 COMPLETE.

Finalize owns only the published/released/holder-absent suffix. If release persistence was missed, it recovers exact release proof from current #2352 lastRelease or bounded historical release-run evidence, then persists it. Finalization requires exact persisted manifest-comment identity. Byte-identical completion duplicates converge deterministically. Terminal activation remains replay evidence so stdout/ack loss can return the existing completion without source/lease/holder effects.

No reset/rebase/stash/clean/force-push/reapply/latest-wins/time takeover/automatic retry. Authority flags remain false.

Refs #3524 #3525 #3491 #3481 #3473 #2352.
