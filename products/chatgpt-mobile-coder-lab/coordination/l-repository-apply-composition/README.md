# MCL L prepared repository apply composition v1

This coordinator closes one narrow automation gap for ordinary L repository work.

It starts only after the existing L repository owner has already created the exact create-only feature workspace and remote ref for a current L / L D-013/D-014 transaction.

It does not replace the workspace holder, the L repository owner, D-013, D-014, Git, pull-request, merge, release, runtime, or production authorities.

## Fixed flow

current open packet + exact posted D-014 + active exact L/L D-013
+ existing L workspace state PREPARED
+ bounded L-owner request / patch / non-closing PR request
→ canonical non-closing PR authoring preflight
→ existing workspace-holder lifecycle
→ existing L repository-owner apply
→ existing D-013 release owner
→ fresh packet / #2352 released-state readback
→ existing workspace-holder release
→ D-014 COMPLETE publication
→ bounded result

The holder capability is process-local. It is not a CLI field, request field, output field, Git artifact, issue/PR payload, D-014 field, or reusable file.

## Public operation

node mcl-l-repository-apply-composition.cjs apply --packet '#N' --manifest <manifest> --request <request.json> --patch <patch.diff> --pr-request <pr.json> --apply

The caller cannot select repository, route, executor, branch, worktree, holder identity, environment map, Git command, executable, PR number, merge strategy, retry count, cleanup action, runtime target, release target, or production target.

## Admission

Before holder or source effect, the coordinator requires current open packet state, exact manifest comment identity, exact L/L active coordination evidence, PREPARED workspace state, exact request/path binding, absent holder state, and canonical non-closing PR preflight PASS. After validation, the request, patch, and PR request are copied into one private bounded snapshot directory; the L owner consumes only those snapshots, never the caller-controlled paths.

Coordination currentness is re-read and revalidated twice after the initial admission snapshot: immediately before holder acquisition and again immediately before the L-owner source effect. Each refresh replaces only the private packet/#2352 evidence files after the fresh binding is proven. A released, changed, conflicting, or otherwise stale lease/packet state therefore blocks before the next effect boundary.

## Source effect boundary

All source mutation remains inside the existing device-ops/l-repository-owner apply operation. The composition adds no second Git writer.

## Coordination convergence

After exact L-owner PASS, the coordinator uses the existing D-013 release owner, records that owner's exact release generation/evidence identity, then re-reads packet and #2352 only to prove the lease is absent. It releases the holder through the existing holder owner and only then publishes D-014 COMPLETE.

D-014 completion publication is exactly-once aware. The coordinator checks for an exact existing receipt before posting, verifies exact readback after a successful acknowledgement, and if the write acknowledgement is lost it performs one exact-comment readback before deciding that publication is unproven. It never retries by time or posts a second semantic variant.

## Failure semantics

Failure never becomes cleanup authority. L-owner non-PASS preserves lease and holder. D-013 release failure preserves holder and publishes no COMPLETE. Holder-release failure publishes no COMPLETE. No reset, rebase, stash, clean, force push, reapply, latest-wins, elapsed-time takeover, or automatic retry rule is added.

## Output

Successful output contains only bounded packet, manifest, commit, PR, completion, release-evidence and next-action identifiers. All authority flags remain false.

## Validation

Focused coordinator tests plus existing workspace-holder, L repository-owner, D-013 and D-014 contracts, source syntax, and git diff --check must pass.

Refs #3524 #3525 #3491 #3481 #3473 #2352.
